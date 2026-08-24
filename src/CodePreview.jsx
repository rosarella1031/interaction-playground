import { useEffect, useRef, useState } from 'react';

/**
 * A condensed, live restatement of the motion model — not the source.
 * Symbols are shortened for a narrow column but the logic is the real one:
 *   s = position   v = velocity   a = acceleration
 *   x = centre spring   w = width spring   e = stretch
 * Compare against useSpringPill.js (integrator + stretch) and
 * SegmentedControl.jsx (hover). `keys` drives the change highlight.
 */
function buildLines(c) {
  return [
    { keys: [], code: '// spring step · dt = 1/240s' },
    { keys: [], code: 'a  = (-k*(s - target) - c*v) / m' },
    { keys: [], code: 'v += a*dt ;  s += v*dt' },
    { keys: ['stiffness', 'damping', 'mass'],
      code: `x: k=${c.stiffness}  c=${c.damping}  m=${c.mass}` },
    { keys: ['widthStiffness', 'widthDamping', 'mass'],
      code: `w: k=${c.widthStiffness}  c=${c.widthDamping}  m=${c.mass}` },

    { keys: [], sep: true, code: '// stretch · from velocity' },
    { keys: ['stretch', 'maxStretch'],
      code: `e = clamp(vx*${c.stretch}, ±${c.maxStretch})` },
    { keys: ['stretch', 'maxStretch'], code: 'w += abs(e) ;  x += e/2' },

    { keys: [], sep: true, code: '// hover · shifts the target' },
    { keys: ['hoverAttraction'], code: `pull = gap*${c.hoverAttraction}` },
    { keys: ['hoverAttraction', 'hoverLean'],
      code: `near += pull ;  far += pull*${c.hoverLean}` },
  ];
}

const KEYWORDS = /^(?:const|let|return)$/;

/**
 * Deliberately conservative tokenizer. Local identifiers stay the default
 * ink — only things that carry meaning get colour: keywords, call targets,
 * properties, numbers, strings, comments. Operators stay near-neutral.
 */
function tokenize(src) {
  const out = [];
  const push = (cls, text) => { if (text) out.push([cls, text]); };
  let i = 0;

  while (i < src.length) {
    const rest = src.slice(i);

    const com = rest.match(/^\/\/.*/);
    if (com) { push('com', com[0]); break; }

    const str = rest.match(/^(['"`])(?:\\.|(?!\1).)*\1/);
    if (str) { push('str', str[0]); i += str[0].length; continue; }

    const ws = rest.match(/^\s+/);
    if (ws) { push('txt', ws[0]); i += ws[0].length; continue; }

    const num = rest.match(/^\d+(?:\.\d+)?/);
    if (num) { push('num', num[0]); i += num[0].length; continue; }

    const id = rest.match(/^[A-Za-z_$][\w$]*/);
    if (id) {
      const name = id[0];
      const after = rest.slice(name.length);
      const prev = out.length ? out[out.length - 1][1].slice(-1) : '';
      let cls = 'txt';
      if (KEYWORDS.test(name)) cls = 'kw';
      else if (after.startsWith('(')) cls = 'fn';
      else if (/^\s*:/.test(after)) cls = 'var';
      else if (prev === '.') cls = 'var';
      push(cls, name);
      i += name.length;
      continue;
    }

    push('pun', src[i]);
    i += 1;
  }
  return out;
}

function Code({ src }) {
  return tokenize(src).map(([cls, text], i) =>
    cls === 'txt' ? text : <span key={i} className={`tok-${cls}`}>{text}</span>
  );
}

/** Which params changed recently — stays lit while you drag, fades after. */
function useFlashKeys(config, hold = 550) {
  const prev = useRef(config);
  const timers = useRef({});
  const [flash, setFlash] = useState({});

  useEffect(() => {
    const changed = Object.keys(config).filter((k) => config[k] !== prev.current[k]);
    prev.current = config;
    if (!changed.length) return;

    setFlash((f) => {
      const next = { ...f };
      changed.forEach((k) => { next[k] = true; });
      return next;
    });
    changed.forEach((k) => {
      clearTimeout(timers.current[k]);
      timers.current[k] = setTimeout(() => {
        setFlash((f) => { const next = { ...f }; delete next[k]; return next; });
      }, hold);
    });
  }, [config, hold]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  return flash;
}

export default function CodePreview({ config }) {
  const flash = useFlashKeys(config);
  const lit = (keys) => keys.length > 0 && keys.some((k) => flash[k]);

  return (
    <pre className="cp-block">
      {buildLines(config).map((line, i) => (
        <div
          key={i}
          className={`cp-line${line.sep ? ' is-sep' : ''}${lit(line.keys) ? ' is-lit' : ''}`}
        >
          <Code src={line.code} />
        </div>
      ))}
    </pre>
  );
}
