# Theme Specification

Authoritative list of CSS variables and what each one controls. The canonical source is `packages/theme-store/src/types.ts` (`THEME_VAR_NAMES`). If this doc ever disagrees with that file, trust the file.

## Contents

1. [OKLCH quickstart](#oklch-quickstart)
2. [Base colors](#base-colors)
3. [Brand colors](#brand-colors)
4. [Status colors](#status-colors)
5. [Chart colors](#chart-colors)
6. [Rainbow colors (regions)](#rainbow-colors-regions)
7. [Radius](#radius)

## OKLCH quickstart

OKLCH stands for **O**k **L**ightness **C**hroma **H**ue. It's perceptually uniform — two colors with the same L look equally bright to the eye, which is why it beats HSL for accessible pairing.

Syntax: `oklch(L% C H)` or `oklch(L% C H / A)` for alpha.

- **L (lightness)** — `0%` black, `100%` white. Body text and background should differ by ≥ 50 percentage points.
- **C (chroma)** — saturation. `0` is neutral (grey). Status colors typically land between `0.15` and `0.25`.
- **H (hue)** — angle on the color wheel: 0 red, 70 orange, 140 green, 220 blue, 290 purple, 330 pink.

Hex and named colors work too — OKLCH is just recommended for maintainability.

## Base colors

The canvas. Should feel calm — low chroma, high contrast between background and foreground.

| Variable | Purpose |
|----------|---------|
| `--background` | Main page background |
| `--foreground` | Main text color |
| `--border` | Dividers, table rules, card outlines |
| `--input` | Form field borders (usually === `--border`) |
| `--muted` | Subtle surface — subdued panels, hover backgrounds |
| `--muted-foreground` | Secondary text, captions |
| `--accent` | Hover/selection surface (often === `--muted`) |
| `--accent-foreground` | Text on `--accent` |
| `--card` | Card backgrounds (often === `--background`) |
| `--card-foreground` | Text on cards |
| `--popover` | Tooltip/dropdown backgrounds |
| `--popover-foreground` | Text on popovers |

## Brand colors

These express the personality of the theme. `--primary` is used for buttons, links, key emphasis.

| Variable | Purpose |
|----------|---------|
| `--primary` | Primary buttons, key interactive elements |
| `--primary-foreground` | Text on `--primary` (usually high-contrast) |
| `--secondary` | Secondary buttons, subdued actions |
| `--secondary-foreground` | Text on `--secondary` |
| `--ring` | Focus ring color |

## Status colors

The most important variables for a status page. Every incident, maintenance, and uptime badge flows through these.

| Variable | Meaning | Default hue range |
|----------|---------|-------------------|
| `--success` | Operational / healthy | Green (`~140-160`) |
| `--warning` | Degraded performance | Yellow/orange (`~70-90`) |
| `--destructive` | Outage / error | Red (`~20-30`) |
| `--info` | Under monitoring / informational | Blue (`~240-260`) |

Hard requirements:

- Each must be visibly distinct even without color vision. A rule of thumb: if all four converge into "yellowish" when desaturated, you need to separate lightness too.
- Contrast against `--background` must pass WCAG AA for icon-sized elements (≥ 3:1).
- `--destructive` in dark mode often needs to be lighter (higher L) than its light-mode counterpart — a saturated dark red burns. See `openstatus.ts` for the typical delta (L 57.7% → 70.4%).

## Chart colors

Used on the public monitor pages to differentiate response-time percentiles (p50, p75, p95, p99, max).

| Variable | Purpose |
|----------|---------|
| `--chart-1` | Usually lowest percentile — often maps to `--success` hue |
| `--chart-2` | Next up |
| `--chart-3` | Middle |
| `--chart-4` | Next up |
| `--chart-5` | Slowest percentile — often warmer |

Pick a sequence that reads as an ordered ramp (all blueish → reddish) or as five clearly distinct categories. Mixing the two looks muddy.

## Rainbow colors (regions)

Optional. Used on the regional map to color 17 monitoring regions distinctly. Variables: `--rainbow-1` through `--rainbow-17`.

Most themes should **not** override these — the default set is carefully tuned to remain distinguishable across 17 hues. Only override if:

1. You have a cohesive 17-step palette (rare).
2. The default clashes heavily with your theme's base (e.g., high-saturation maximalist themes).

For the default values, see `apps/status-page/src/app/globals.css`.

## Radius

| Variable | Purpose |
|----------|---------|
| `--radius` | Base border-radius for buttons, cards, inputs |

Default is `0rem` (sharp). `OPENSTATUS_ROUNDED_THEME` sets it to `0.625rem` as an example. Pick a value that matches the vibe — sharp for technical/brutalist, rounded for friendly/playful.
