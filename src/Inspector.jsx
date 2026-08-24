import { useRef, useState } from 'react';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function Chevron({ open }) {
  return (
    <svg className={`chev${open ? ' is-open' : ''}`} width="10" height="10"
         viewBox="0 0 10 10" aria-hidden="true">
      <path d="M3.5 1.5 L7 5 L3.5 8.5" fill="none" stroke="currentColor"
            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetachIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <path d="M4.5 1H10v5.5M10 1 5.5 5.5" fill="none" stroke="currentColor"
            strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7v3H1V3h3" fill="none" stroke="currentColor"
            strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One collapsible section of the docked inspector. */
export function Section({ title, open, popped, onToggle, onDetach, children }) {
  return (
    <section className="sec-block">
      <div className="sec-head">
        <button
          type="button"
          className="sec-toggle"
          onClick={onToggle}
          aria-expanded={open && !popped}
          disabled={popped}
        >
          <Chevron open={open && !popped} />
          <span className="sec-title">{title}</span>
        </button>

        <button
          type="button"
          className="sec-detach has-tip tip-right"
          onClick={onDetach}
          data-tip={`Open ${title} in a window`}
          aria-label={`Open ${title} in a window`}
        >
          <DetachIcon />
        </button>
      </div>

      {popped
        ? <p className="sec-detached">Detached</p>
        : open && <div className="sec-body">{children}</div>}
    </section>
  );
}

/**
 * Draggable panel. Pointer capture on the header keeps the stream flowing
 * even when the cursor outruns the window, and position is clamped so it
 * can never be dragged out of reach.
 */
export function FloatingWindow({ title, initial, onClose, children }) {
  const [pos, setPos] = useState(initial);
  const drag = useRef(null);
  const ref = useRef(null);

  const down = (e) => {
    if (e.target.closest('button')) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e) => {
    if (!drag.current) return;
    const w = ref.current?.offsetWidth ?? 340;
    setPos({
      x: clamp(e.clientX - drag.current.dx, 8, window.innerWidth - w - 8),
      y: clamp(e.clientY - drag.current.dy, 8, window.innerHeight - 48),
    });
  };

  const up = (e) => {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="fwin" ref={ref} style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
      <div
        className="fwin-head"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <span className="sec-title">{title}</span>
        <button type="button" className="fwin-close has-tip tip-right" onClick={onClose}
                data-tip={`Dock ${title}`} aria-label={`Dock ${title}`}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" fill="none"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="fwin-body">{children}</div>
    </div>
  );
}
