// ─────────────────────────────────────────────────────────────
// ALL MOTION PARAMETERS LIVE HERE.
// Nothing else in the app hard-codes a motion value.
// ─────────────────────────────────────────────────────────────

// Layout, not motion — but it changes how the motion reads, so it lives
// alongside the knobs. true  = every segment the same width (iOS default;
//                              all transitions become pure translation)
//                     false = each segment sized to its label
export const LAYOUT = {
  equalWidths: true,
};

export const DEFAULT_MOTION = {
  // — Spring (drives each edge of the pill independently) —
  stiffness: 480,   // higher = faster pull to target
  damping: 37,      // lower = more overshoot / ringing
  mass: 1,          // higher = heavier, more lag and overshoot

  // — Width spring (how fast the pill takes its target shape) —
  // Deliberately stiffer and critically damped, so the pill stops
  // morphing early and spends the travel sliding. Soften these to get
  // the liquid feel back; they are what makes narrow -> wide and
  // wide -> narrow read the same.
  widthStiffness: 1100,
  widthDamping: 66,

  // — Hover attraction —
  // 0 = ignore hover. 1 = leading edge reaches the hovered option.
  hoverAttraction: 0.10,
  // How much the *far* edge follows the near edge (0 = pure stretch,
  // 1 = pure slide). Keeps hover reading as a lean, not a jump.
  hoverLean: 0.45,

  // — Velocity stretch (the squash/stretch during travel) —
  // Seconds of travel added to the leading edge.
  // 0.003 @ 3000px/s ≈ 9px of stretch.
  stretch: 0.003,
  maxStretch: 9,    // px ceiling, keeps it restrained
};

// Presets for comparing behaviors. Each one is a full override.
export const PRESETS = {
  precise: {
    label: 'Precise',
    values: { stiffness: 480, damping: 37, mass: 1, widthStiffness: 1100, widthDamping: 66, hoverAttraction: 0.10, hoverLean: 0.45, stretch: 0.003, maxStretch: 9 },
  },
  snappy: {
    label: 'Snappy',
    values: { stiffness: 620, damping: 42, mass: 1, widthStiffness: 1400, widthDamping: 75, hoverAttraction: 0.10, hoverLean: 0.5, stretch: 0.002, maxStretch: 7 },
  },
  loose: {
    label: 'Liquid',
    values: { stiffness: 140, damping: 13, mass: 1.2, widthStiffness: 140, widthDamping: 13, hoverAttraction: 0.32, hoverLean: 0.25, stretch: 0.030, maxStretch: 34 },
  },
  critical: {
    label: 'No overshoot',
    values: { stiffness: 480, damping: 43.9, mass: 1, widthStiffness: 1100, widthDamping: 66, hoverAttraction: 0.10, hoverLean: 0.45, stretch: 0.000, maxStretch: 0 },
  },
};

// Slider ranges for the tuning panel.
export const RANGES = {
  stiffness:       { min: 40,  max: 900,  step: 5 },
  damping:         { min: 4,   max: 80,   step: 0.5 },
  mass:            { min: 0.3, max: 4,    step: 0.05 },
  widthStiffness:  { min: 40,  max: 2000, step: 10 },
  widthDamping:    { min: 4,   max: 120,  step: 0.5 },
  hoverAttraction: { min: 0,   max: 1,    step: 0.01 },
  hoverLean:       { min: 0,   max: 1,    step: 0.01 },
  stretch:         { min: 0,   max: 0.02, step: 0.0005 },
  maxStretch:      { min: 0,   max: 40,   step: 1 },
};

// Damping ratio, for reading how bouncy the current settings are.
// < 1 underdamped (overshoots), 1 critical, > 1 overdamped.
export const dampingRatio = ({ damping, stiffness, mass }) =>
  damping / (2 * Math.sqrt(stiffness * mass));
