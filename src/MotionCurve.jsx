import { useMemo } from 'react';
import { stepSpring } from './motion/useSpringPill';

// Same substep the real loop uses, and the same integrator (imported, not
// reimplemented) — so this is the actual response curve, not an easing
// approximation. Normalised 0 -> 1: a linear spring's shape is independent
// of amplitude, so one curve describes every travel distance.
const SUBSTEP = 1 / 240;
const SPAN_MS = 650;
const FPS = 60;

const W = 340;
const H = 148;
const PAD = { t: 16, r: 2, b: 20, l: 2 };

function trace(stiffness, damping, mass) {
  const s = { pos: 0, vel: 0 };
  const out = [];
  const frames = Math.round((SPAN_MS / 1000) * FPS);
  for (let f = 0; f <= frames; f++) {
    out.push(s.pos);
    let acc = 1 / FPS;
    while (acc >= SUBSTEP) {
      stepSpring(s, 1, SUBSTEP, stiffness, damping, mass);
      acc -= SUBSTEP;
    }
  }
  return out;
}

export default function MotionCurve({ config }) {
  const { posPts, widthPts, lo, hi } = useMemo(() => {
    const p = trace(config.stiffness, config.damping, config.mass);
    const w = trace(config.widthStiffness, config.widthDamping, config.mass);
    const all = p.concat(w);
    return {
      posPts: p,
      widthPts: w,
      lo: Math.min(0, ...all) - 0.03,
      hi: Math.max(1.06, ...all) + 0.03,
    };
  }, [config]);

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const x = (i, n) => PAD.l + (i / (n - 1)) * plotW;
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * plotH;

  const path = (pts) => pts.map((v, i) => `${i ? 'L' : 'M'}${x(i, pts.length).toFixed(1)},${y(v).toFixed(1)}`).join('');

  return (
    <figure className="curve">
      <svg viewBox={`0 0 ${W} ${H}`} className="curve-svg" role="img"
           aria-label="Spring response over 900 milliseconds">
        {/* target and origin references */}
        <line className="curve-target" x1={PAD.l} x2={W - PAD.r} y1={y(1)} y2={y(1)} />
        <line className="curve-base" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />

        <path className="curve-width" d={path(widthPts)} />
        <path className="curve-pos" d={path(posPts)} />
      </svg>

      <figcaption className="curve-key">
        <span className="key key-pos">position</span>
        <span className="key key-width">width</span>
        <span className="curve-span">0–{SPAN_MS}ms</span>
      </figcaption>
    </figure>
  );
}
