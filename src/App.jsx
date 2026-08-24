import { useEffect, useState } from 'react';
import SegmentedControl from './SegmentedControl';
import CodePreview from './CodePreview';
import MotionCurve from './MotionCurve';
import { Section, FloatingWindow } from './Inspector';
import { DEFAULT_MOTION, LAYOUT, PRESETS, RANGES, dampingRatio } from './motion/config';
import './App.css';

const OPTIONS = ['Day', 'Week', 'Month', 'Year'];

// Table of contents. One entry today; the rail exists so adding the next
// study is a data change, not a layout change.
const STUDIES = [{ id: 'segmented', label: 'Segmented control' }];

const THEME_ORDER = ['system', 'light', 'dark'];
const THEME_LABEL = { system: 'Auto', light: 'Light', dark: 'Dark' };

function ThemeIcon({ mode }) {
  if (mode === 'light') {
    return (
      <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="2.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 .9v1.6M7 11.5v1.6M1.6 7h1.5M10.9 7h1.5M3.2 3.2l1.1 1.1M9.7 9.7l1.1 1.1M10.8 3.2 9.7 4.3M4.3 9.7 3.2 10.8"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M11.6 8.6A5.1 5.1 0 0 1 5.4 2.4a5.2 5.2 0 1 0 6.2 6.2Z"
              fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 1.9a5.1 5.1 0 0 1 0 10.2Z" fill="currentColor" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1.2" y="2.2" width="11.6" height="9.6" rx="1.6"
            fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.6 2.4v9.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

const LABELS = {
  stiffness: 'Stiffness',
  damping: 'Damping',
  mass: 'Mass',
  widthStiffness: 'Width stiffness',
  widthDamping: 'Width damping',
  hoverAttraction: 'Hover attraction',
  hoverLean: 'Hover lean',
  stretch: 'Stretch',
  maxStretch: 'Max stretch (px)',
};

/**
 * Typable value box. Keeps a local draft while focused so half-typed
 * input ("0.", "", "-") doesn't get clamped out from under you.
 * Commits live whenever the draft is a valid in-range number,
 * and clamps to the slider range on blur / Enter.
 */
function NumberField({ id, value, range, onChange }) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Follow external changes (presets, slider drags) unless we're typing.
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = (raw) => {
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) {
      setDraft(String(value)); // reject garbage, snap back
      return;
    }
    const clamped = Math.min(range.max, Math.max(range.min, n));
    onChange(clamped);
    setDraft(String(clamped));
  };

  return (
    <input
      id={id}
      type="number"
      className="row-input"
      value={draft}
      min={range.min}
      max={range.max}
      step={range.step}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { setFocused(false); commit(e.target.value); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const n = Number(raw);
        if (raw.trim() !== '' && !Number.isNaN(n) && n >= range.min && n <= range.max) {
          onChange(n);
        }
      }}
    />
  );
}

export default function App() {
  const [value, setValue] = useState('Day');
  const [config, setConfig] = useState(DEFAULT_MOTION);
  const [activePreset, setActivePreset] = useState('precise');
  const [equalWidths, setEqualWidths] = useState(LAYOUT.equalWidths);
  const [openSec, setOpenSec] = useState({ motion: true, curve: true, code: true });
  const [popped, setPopped] = useState({});
  const [navOpen, setNavOpen] = useState(true);
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
    };
    apply();
    if (theme !== 'system') return undefined;
    mq.addEventListener('change', apply);          // keep following the OS
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const toggleSec = (id) => setOpenSec((o) => ({ ...o, [id]: !o[id] }));
  const detach = (id) => setPopped((p) => ({ ...p, [id]: true }));
  const redock = (id) => setPopped((p) => { const n = { ...p }; delete n[id]; return n; });

  const setParam = (key, next) => {
    setConfig((c) => ({ ...c, [key]: next }));
    setActivePreset(null);
  };

  const applyPreset = (key) => {
    setConfig(PRESETS[key].values);
    setActivePreset(key);
  };

  const zeta = dampingRatio(config);
  const zetaW = dampingRatio({
    stiffness: config.widthStiffness,
    damping: config.widthDamping,
    mass: config.mass,
  });

  // Section bodies are declared once and rendered either in the dock or in
  // a floating window — never both, so there is no duplicated state.
  const sections = [
    {
      id: 'motion',
      title: 'Parameters',
      body: (
        <>
          <div className="presets">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                className={`preset${activePreset === key ? ' is-active' : ''}`}
                onClick={() => applyPreset(key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="rows">
            {Object.keys(RANGES).map((key) => (
              <div className="row" key={key}>
                <label className="row-label" htmlFor={`f-${key}`}>{LABELS[key]}</label>
                <input
                  type="range"
                  aria-label={LABELS[key]}
                  min={RANGES[key].min}
                  max={RANGES[key].max}
                  step={RANGES[key].step}
                  value={config[key]}
                  onChange={(e) => setParam(key, Number(e.target.value))}
                />
                <NumberField
                  id={`f-${key}`}
                  value={config[key]}
                  range={RANGES[key]}
                  onChange={(n) => setParam(key, n)}
                />
              </div>
            ))}
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={equalWidths}
              onChange={(e) => setEqualWidths(e.target.checked)}
            />
            Equal segment widths
          </label>
        </>
      ),
    },
    {
      id: 'curve',
      title: 'Curve',
      body: (
        <>
          <MotionCurve config={config} />
          <dl className="stats">
            <div className="stat">
              <dt>ζ position</dt>
              <dd>{zeta.toFixed(2)}</dd>
              <dd className="stat-note">
                {zeta < 0.95 ? 'overshoots' : zeta > 1.05 ? 'no overshoot, slow tail' : 'critical'}
              </dd>
            </div>
            <div className="stat">
              <dt>ζ width</dt>
              <dd>{zetaW.toFixed(2)}</dd>
              <dd className="stat-note">{zetaW < 0.95 ? 'wobbles' : 'settles clean'}</dd>
            </div>
          </dl>
        </>
      ),
    },
    { id: 'code', title: 'Live Code', body: <CodePreview config={config} /> },
  ];

  return (
    <main className={`page${navOpen ? '' : ' is-nav-collapsed'}`}>
      <nav className="sidebar">
        <div className="nav-head">
          <button
            type="button"
            className="nav-toggle has-tip"
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            aria-label={navOpen ? 'Collapse navigation' : 'Expand navigation'}
            data-tip={navOpen ? 'Collapse navigation' : 'Expand navigation'}
          >
            <PanelIcon />
          </button>
        </div>

        <div className="nav-brand">
          <h1 className="nav-title">Interaction Playground</h1>
          <p className="nav-tagline">
            My hands-on space to tune interactions, compare behaviors, and
            understand the code behind them.
          </p>
        </div>

        <p className="nav-label">Studies</p>

        <ul className="nav-list">
          {STUDIES.map((st) => (
            <li key={st.id}>
              <button type="button" className="nav-item is-active" aria-current="page">
                <span className="nav-text">{st.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="nav-foot">
          <p className="nav-note">
            Visual design in progress — the interface styling is still being
            iterated. Motion behavior is the focus for now.
          </p>

          <button
            type="button"
            className="nav-theme has-tip tip-up"
            onClick={() =>
              setTheme((t) => THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length])
            }
            data-tip={`Theme: ${THEME_LABEL[theme]}`}
            aria-label={`Theme: ${THEME_LABEL[theme]}. Click to change.`}
          >
            <ThemeIcon mode={theme} />
          </button>
        </div>
      </nav>

      <div className="main">
        <header className="masthead">
          <h2 className="masthead-title">Segmented control</h2>
          <p className="masthead-sub">
            Exploring continuous selection motion, elastic stretch, and spring response.
          </p>
        </header>

        <div className="stage">
          <SegmentedControl
            options={OPTIONS}
            value={value}
            onChange={setValue}
            config={config}
            equalWidths={equalWidths}
          />
        </div>
      </div>

      <aside className="dock">
        {sections.map((s) => (
          <Section
            key={s.id}
            title={s.title}
            open={openSec[s.id]}
            popped={!!popped[s.id]}
            onToggle={() => toggleSec(s.id)}
            onDetach={() => detach(s.id)}
          >
            {s.body}
          </Section>
        ))}
      </aside>

      {sections.filter((s) => popped[s.id]).map((s, i) => (
        <FloatingWindow
          key={s.id}
          title={s.title}
          initial={{ x: 120 + i * 30, y: 110 + i * 30 }}
          onClose={() => redock(s.id)}
        >
          {s.body}
        </FloatingWindow>
      ))}
    </main>
  );
}
