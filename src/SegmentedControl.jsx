import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSpringPill } from './motion/useSpringPill';

/**
 * Computes where the pill *wants* to be, in container-local px.
 * The springs handle how it gets there.
 */
function computeTarget(rects, selected, hovered, cfg) {
  const sel = rects[selected];
  if (!sel) return null;

  // Baseline target is just the selected segment.
  let left = sel.left;
  let right = sel.right;

  // ── HOVER ATTRACTION ─────────────────────────────────────
  // Moves the TARGET, never the physics. The springs chase this the
  // same way they chase a click, so hover and selection interrupt
  // each other for free — no separate hover animation exists.
  if (hovered != null && hovered !== selected && rects[hovered]) {
    const h = rects[hovered];
    // Distance to reach across, measured edge-to-edge. Sign = direction.
    // This is layout-derived, not a tunable: hoverAttraction only sets
    // what FRACTION of it we take.
    const gap = h.left > sel.right ? h.left - sel.right : h.right - sel.left;
    const pull = gap * cfg.hoverAttraction;

    // hoverLean splits the pull between the two edges:
    // 0 = leading edge only (pure stretch), 1 = both edges (pure slide).
    if (gap > 0) {
      right += pull;                 // leading edge stretches out
      left  += pull * cfg.hoverLean; // trailing edge leans along
    } else {
      left  += pull;
      right += pull * cfg.hoverLean;
    }
  }

  return { left, right };
}

export default function SegmentedControl({ options, value, onChange, config, equalWidths }) {
  const trackRef = useRef(null);
  const pillRef = useRef(null);
  const itemRefs = useRef([]);

  const [rects, setRects] = useState([]);
  const [hovered, setHovered] = useState(null);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const base = track.getBoundingClientRect();
    setRects(
      itemRefs.current.map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left - base.left, right: r.right - base.left };
      })
    );
  }, []);

  useLayoutEffect(measure, [measure, options, equalWidths]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);

  const selected = options.indexOf(value);
  // Recomputed on every render (selection or hover change). The hook reads
  // it through a ref, so a new target never restarts the motion.
  const target = rects.length ? computeTarget(rects, selected, hovered, config) : null;

  useSpringPill({ pillRef, target, config });

  return (
    <div
      className={`sc-track${equalWidths ? ' is-equal' : ''}`}
      role="radiogroup"
      ref={trackRef}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="sc-pill" ref={pillRef} aria-hidden="true" />
      {options.map((opt, i) => (
        <button
          key={opt}
          ref={(el) => (itemRefs.current[i] = el)}
          type="button"
          role="radio"
          aria-checked={opt === value}
          className={`sc-option${opt === value ? ' is-selected' : ''}`}
          onMouseEnter={() => setHovered(i)}
          onFocus={() => setHovered(i)}
          onBlur={() => setHovered(null)}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
