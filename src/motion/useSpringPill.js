import { useEffect, useRef } from 'react';

// Fixed physics substep. Independent of display refresh rate so the
// same numbers feel the same on 60Hz and 120Hz.
const SUBSTEP = 1 / 240;
const MAX_FRAME = 1 / 20; // clamp after tab-switches

const REST_POS = 0.1;  // px
const REST_VEL = 0.5;  // px/s

// ── SPRING MOVEMENT ──────────────────────────────────────────
// One damped-oscillator step: stiffness pulls toward the target,
// damping resists velocity, mass divides both.
//
// ── VELOCITY HANDLING ────────────────────────────────────────
// s.vel is read in, mutated, and left in place — never zeroed here.
// That single fact is what makes interruption work (see below).
export function stepSpring(s, target, dt, stiffness, damping, mass) {
  const a = (-stiffness * (s.pos - target) - damping * s.vel) / mass;
  s.vel += a * dt;
  s.pos += s.vel * dt;
}

/**
 * Springs the pill as CENTER + WIDTH rather than left edge + right edge.
 *
 * Same two degrees of freedom, but they can now be tuned separately —
 * which is the point. Position keeps a slightly underdamped spring so
 * arrival still reads as a settle; width gets its own faster, critically
 * damped spring so the pill takes its target shape early and spends most
 * of the travel sliding rather than morphing.
 *
 * That also makes transitions direction-consistent: the width response
 * has the same shape whether a segment is growing or shrinking, so
 * narrow -> wide no longer reads as more "liquid" than wide -> narrow.
 *
 * Writes straight to the DOM each frame — no React re-render in the loop.
 */
export function useSpringPill({ pillRef, target, config }) {
  const targetRef = useRef(target);
  const configRef = useRef(config);

  // ── INTERRUPTION / RAPID SWITCHING ─────────────────────────
  // pos+vel live in refs, so they survive every render. A click only
  // swaps the target; the springs keep their current position AND
  // velocity, so the new motion bends out of the old one instead of
  // restarting from zero. Nothing here needs a "cancel previous
  // animation" step — there is no animation object to cancel.
  const centerRef = useRef({ pos: 0, vel: 0 });
  const widthRef = useRef({ pos: 0, vel: 0 });

  const rafRef = useRef(0);
  const initedRef = useRef(false);

  // Latest target/config visible to the loop without re-subscribing it.
  targetRef.current = target;
  configRef.current = config;

  useEffect(() => {
    let last = performance.now();
    let acc = 0;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frame = (now) => {
      rafRef.current = requestAnimationFrame(frame);

      const t = targetRef.current;
      const cfg = configRef.current;
      const C = centerRef.current;
      const W = widthRef.current;

      if (!t || t.right <= t.left) { last = now; return; }

      // Target arrives as edges; the springs work in centre + width.
      const tCenter = (t.left + t.right) / 2;
      const tWidth = t.right - t.left;

      // First valid layout: snap into place, don't animate in.
      if (!initedRef.current) {
        C.pos = tCenter; W.pos = tWidth;
        C.vel = 0; W.vel = 0;
        initedRef.current = true;
      }

      const dt = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;

      if (reduced) {
        C.pos = tCenter; W.pos = tWidth; C.vel = 0; W.vel = 0;
      } else {
        // ── SPRING MOVEMENT ────────────────────────────────────
        // Two independent springs. Centre uses stiffness/damping
        // (underdamped, slight overshoot); width uses widthStiffness/
        // widthDamping (stiffer, critically damped) so shape settles
        // before position does. mass is shared by both.
        acc += dt;
        while (acc >= SUBSTEP) {
          stepSpring(C, tCenter, SUBSTEP, cfg.stiffness, cfg.damping, cfg.mass);
          stepSpring(W, tWidth, SUBSTEP, cfg.widthStiffness, cfg.widthDamping, cfg.mass);
          acc -= SUBSTEP;
        }
      }

      // ── VELOCITY HANDLING ──────────────────────────────────
      // Hard-stop once both amplitude and velocity are below the
      // visible threshold, otherwise the spring rings forever at
      // sub-pixel magnitude and the rAF loop never goes quiet.
      const settled =
        Math.abs(C.pos - tCenter) < REST_POS && Math.abs(C.vel) < REST_VEL &&
        Math.abs(W.pos - tWidth) < REST_POS && Math.abs(W.vel) < REST_VEL;
      if (settled) {
        C.pos = tCenter; W.pos = tWidth; C.vel = 0; W.vel = 0;
      }

      // ── STRETCH CALCULATION ────────────────────────────────
      // Driven by current velocity, not by distance — so it builds
      // mid-flight, decays as the spring slows, and is exactly zero
      // at rest. Pushing the leading edge out by `extra` == shifting
      // the centre by extra/2 and widening by |extra|, which leaves
      // the trailing edge where it is. Sign of C.vel picks the edge.
      let extra = C.vel * cfg.stretch;
      extra = Math.max(-cfg.maxStretch, Math.min(cfg.maxStretch, extra));

      const width = Math.max(0, W.pos + Math.abs(extra));
      const center = C.pos + extra / 2;

      const el = pillRef.current;
      if (el) {
        el.style.transform = `translate3d(${center - width / 2}px, 0, 0)`;
        el.style.width = `${width}px`;
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pillRef]);
}
