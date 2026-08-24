# Interaction Playground

A hands-on space to tune interactions, compare behaviors, and read the code behind them.

Currently one study: a **segmented control** exploring continuous selection
motion, elastic stretch, and spring response.

## Run

```bash
npm install
npm run dev
```

## What it does

Adjust a slider → the spring curve redraws → the control responds → the code
block updates, all at once. The preview is pinned so it never scrolls out of
view while you tune.

- **Parameters** — 9 live motion values, draggable or typed
- **Curve** — the real spring response, plotted by importing the same
  integrator the control uses (not an easing approximation)
- **Live Code** — a condensed restatement of the motion model with the
  current values inlined; the line that changed briefly highlights

Each panel collapses, or detaches into a draggable window.

## Motion model

Everything lives in [`src/motion/config.js`](src/motion/config.js) — no motion
value is hard-coded anywhere else.

The pill is sprung as **centre + width** rather than left + right edge. Same
two degrees of freedom, but tuned separately: position keeps a slightly
underdamped spring so arrival reads as a settle, while width uses a faster,
critically damped one so the pill takes its shape early and spends the travel
sliding rather than morphing. That also makes narrow→wide and wide→narrow
transitions read the same.

Position and velocity live in refs, so a new target only swaps the goalposts —
the springs keep their current motion. Rapid clicks bend the existing curve
instead of restarting it, and there is no animation object to cancel.

Stretch is driven by velocity rather than distance, so it builds mid-flight,
decays as the spring slows, and is exactly zero at rest.

## Layout

```
nav  │  pinned preview  │  inspector dock
```

## Stack

React 19 + Vite. No animation library — the integrator is ~40 lines in
[`src/motion/useSpringPill.js`](src/motion/useSpringPill.js).
