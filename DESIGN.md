---
name: Industrial Glass Design System
themes:
  - light
  - dark

# ─────────────────────────────────────────────
# FONTS
# Primary  : Outfit       — UI chrome, headlines, labels, body
# Mono     : JetBrains Mono — data values, serial numbers, code
# Source   : Google Fonts (both)
# ─────────────────────────────────────────────
fonts:
  primary: Outfit
  mono: JetBrains Mono

# ─────────────────────────────────────────────
# COLOR TOKENS  (light / dark)
# ─────────────────────────────────────────────
colors:
  light:
    background:                '#f7f9fb'
    on-background:             '#191c1e'
    surface:                   '#f7f9fb'
    surface-dim:               '#d8dadc'
    surface-bright:            '#ffffff'
    surface-container-lowest:  '#ffffff'
    surface-container-low:     '#f2f4f6'
    surface-container:         '#eceef0'
    surface-container-high:    '#e6e8ea'
    surface-container-highest: '#e0e3e5'
    on-surface:                '#191c1e'
    on-surface-variant:        '#45464d'
    inverse-surface:           '#2d3133'
    inverse-on-surface:        '#eff1f3'
    outline:                   '#76777d'
    outline-variant:           '#c6c6cd'
    surface-tint:              '#565e74'
    # Primary — deep slate; authority + contrast on light canvas
    primary:                   '#0f172a'
    on-primary:                '#ffffff'
    primary-container:         '#131b2e'
    on-primary-container:      '#7c839b'
    inverse-primary:           '#bec6e0'
    # Secondary — forest emerald; "Pass", ready, active states
    secondary:                 '#006c49'
    on-secondary:              '#ffffff'
    secondary-container:       '#6cf8bb'
    on-secondary-container:    '#00714d'
    # Tertiary — crimson; "Fail", danger, stop controls
    tertiary:                  '#c0000c'
    on-tertiary:               '#ffffff'
    tertiary-container:        '#ffdad7'
    on-tertiary-container:     '#ef4444'
    error:                     '#ba1a1a'
    on-error:                  '#ffffff'
    error-container:           '#ffdad6'
    on-error-container:        '#93000a'
    surface-variant:           '#e0e3e5'

  dark:
    background:                '#111111'
    on-background:             '#f5f5f5'
    surface:                   '#111111'
    surface-dim:               '#111111'
    surface-bright:            '#262626'
    surface-container-lowest:  '#0a0a0a'
    surface-container-low:     '#171717'
    surface-container:         '#1c1c1c'
    surface-container-high:    '#262626'
    surface-container-highest: '#333333'
    on-surface:                '#f5f5f5'
    on-surface-variant:        '#a3a3a3'
    inverse-surface:           '#f5f5f5'
    inverse-on-surface:        '#283044'
    outline:                   '#525252'
    outline-variant:           '#404040'
    surface-tint:              '#e5e5e5'
    # Primary — light grey/white; interactive, active, data, "backlit" glass
    primary:                   '#e5e5e5'
    on-primary:                '#171717'
    primary-container:         '#f5f5f5'
    on-primary-container:      '#262626'
    inverse-primary:           '#a3a3a3'
    # Secondary — emerald; "Pass", system-ready, safe parameters
    secondary:                 '#4edea3'
    on-secondary:              '#003824'
    secondary-container:       '#00a572'
    on-secondary-container:    '#00311f'
    # Tertiary — muted crimson; "Fail", critical alert, stop
    tertiary:                  '#ffb3ad'
    on-tertiary:               '#68000a'
    tertiary-container:        '#ffd0cc'
    on-tertiary-container:     '#bb1c25'
    error:                     '#ffb4ab'
    on-error:                  '#690005'
    error-container:           '#93000a'
    on-error-container:        '#ffdad6'
    surface-variant:           '#333333'

# ─────────────────────────────────────────────
# TYPOGRAPHY SCALE  (theme-independent)
# ─────────────────────────────────────────────
typography:
  display-lg:
    fontFamily:    Outfit
    fontSize:      48px
    fontWeight:    '700'
    lineHeight:    '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily:    Outfit
    fontSize:      32px
    fontWeight:    '600'
    lineHeight:    '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily:    Outfit
    fontSize:      24px
    fontWeight:    '600'
    lineHeight:    '1.2'
  headline-md:
    fontFamily:    Outfit
    fontSize:      24px
    fontWeight:    '500'
    lineHeight:    '1.3'
  body-lg:
    fontFamily:    Outfit
    fontSize:      18px
    fontWeight:    '400'
    lineHeight:    '1.6'
  body-md:
    fontFamily:    Outfit
    fontSize:      16px
    fontWeight:    '400'
    lineHeight:    '1.5'
  label-caps:
    fontFamily:    Outfit
    fontSize:      12px
    fontWeight:    '700'
    lineHeight:    '1'
    letterSpacing: 0.08em
    textTransform: uppercase
  mono-data:
    fontFamily:    JetBrains Mono
    fontSize:      14px
    fontWeight:    '500'
    lineHeight:    '1.5'
    letterSpacing: 0.02em

# ─────────────────────────────────────────────
# SHAPE / RADIUS
# ─────────────────────────────────────────────
rounded:
  none:    0
  sm:      0.125rem    # inputs, small controls
  DEFAULT: 0.25rem     # standard elements
  md:      0.375rem    # buttons
  lg:      0.5rem      # cards, glass panels
  xl:      0.75rem     # large containers
  full:    9999px      # pills, status indicators

# ─────────────────────────────────────────────
# SPACING  (4 px baseline unit)
# ─────────────────────────────────────────────
spacing:
  unit:          4px
  gutter:        24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1440px

# ─────────────────────────────────────────────
# GLASS CONSTANTS  (reference values for both themes)
# ─────────────────────────────────────────────
glass:
  light:
    blur:       blur(24px)
    fill:       'rgba(255, 255, 255, 0.60)'
    border-top: '1px solid rgba(255, 255, 255, 0.90)'
    border-bot: '1px solid rgba(15,  23,  42,  0.08)'
    shadow:     '0 4px 24px rgba(15, 23, 42, 0.04), 0 1px 4px rgba(15, 23, 42, 0.06)'
  dark:
    blur:       blur(12px)
    fill:       'rgba(255, 255, 255, 0.05)'
    border-top: '1px solid rgba(255, 255, 255, 0.30)'
    border-bot: '1px solid rgba(0,   0,   0,   0.40)'
    shadow:     '0 4px 20px rgba(0, 0, 0, 0.50)'
---

## Brand & Style

This design system serves precision-critical professional environments — industrial QA dashboards, control consoles, site-intelligence platforms — where clarity, speed of reading, and aesthetic authority are non-negotiable.

The personality is **clinical confidence**: capable, calibrated, and unfussy. The interface should feel like a high-grade instrument panel that happens to live on a screen.

The visual language is **Glassmorphic Tactile Minimalism** — frosted layers over structural surfaces, subtle skeuomorphic depth, and a strict geometric grid. In light mode this reads as an airy clean-room terminal; in dark mode it reads as a heavy, illuminated control console. Both modes share the same component architecture; only the depth treatment and color intent differ.

---

## Font Choice: Outfit + JetBrains Mono

**Outfit** is the primary font across all UI roles in both themes. Its geometric construction — near-circular bowls, consistent stem weights, optical precision — directly mirrors the "milled from a single block" aesthetic of the design system. The uppercase variant with tracked spacing reads exactly like engraved industrial placards. Outfit also offers a clean numerical form, critical for dashboards where figures must be immediately readable at a glance. Both source design systems converged on Outfit independently, confirming it as the correct choice for this context.

**JetBrains Mono** handles all data-class content: sensor readings, serial numbers, timestamps, threshold values, and any machine-generated output. Its monospaced grid keeps columnar data perfectly aligned, its zero-slash disambiguates `0` from `O` in IDs, and its ligature set adds subtle sophistication to operator tokens (`>=`, `!=`, `→`). Together these two fonts cover every role the system requires without redundancy.

No third font is needed. Resist the temptation to introduce a serif display face — it undermines the industrial register.

---

## Colors

The palette operates on a shared semantic vocabulary across both themes. **Primary** anchors authority and interactive action. **Secondary (emerald)** is the universal signal for "Pass / Ready / Active." **Tertiary (crimson)** is "Fail / Danger / Stop" — always. These semantic roles must never be inverted.

### Light Theme

The base canvas is clinical off-white (`#F7F9FB`), not pure white — pure white is too harsh under glass layers. Primary is deep slate (`#0F172A`) which provides industrial contrast. Glass overlays use 60% white fill with 24px blur, keeping the surface airy. Shadows are highly diffused with very low opacity (`rgba(15, 23, 42, 0.04)`) to avoid a "dirty" appearance.

### Dark Theme

The foundation is a deep charcoal grey (`#111111`), evoking a physical console in a low-light environment. Primary shifts to light grey (`#E5E5E5`) to represent digital connectivity and active data flow. Glass layers use 5% white fill with 12px blur — less blur than light mode because the dark canvas itself provides depth. Neon glow effects amplify the "backlit" LED quality of interactive elements.

### Status Semantics (both themes)

| State      | Light                     | Dark                      |
|------------|---------------------------|---------------------------|
| Pass / OK  | `secondary` `#006C49`     | `secondary` `#4EDEA3`     |
| Fail / Alert | `tertiary` `#C0000C`    | `tertiary` `#FFB3AD`      |
| Active / Data | `primary` `#0F172A`   | `primary` `#E5E5E5`       |
| Neutral    | `outline` `#76777D`       | `outline` `#525252`       |

---

## Typography

Outfit runs across all levels. Headlines use tighter tracking and heavier weights to anchor the light-toned pages and give "structural weight" in dark mode. Labels and data identifiers should always be set in `label-caps` style — uppercase with `0.08em` letter-spacing — to mimic industrial placard engraving.

`mono-data` (JetBrains Mono 14px/500) is the exclusive style for any value that comes from a sensor, system, or API. Never mix Outfit and JetBrains Mono in the same line unless they occupy visibly distinct label/value roles.

For mobile, scale `display-lg` and `headline-lg` down by ~25% using the `headline-lg-mobile` token rather than letting them wrap.

---

## Layout & Spacing

A strict **4px baseline unit** governs all spacing. No arbitrary margins or padding.

| Breakpoint | Columns | Gutters | Outer Margin |
|------------|---------|---------|--------------|
| Desktop    | 12      | 24px    | 40px         |
| Tablet     | 8       | 16px    | 24px         |
| Mobile     | 4       | 16px    | 16px         |

Content is organized into **Modules**, not a continuous scroll. A Module mimics a physical hardware rack unit: a bounded container with 24px internal padding, its own glass surface, and a defined header area. This containment strategy reinforces the "control panel" mental model and allows the glass depth effects room to breathe.

On mobile, Modules stack vertically. Reduce backdrop-blur values by 50% on mobile to maintain rendering performance while preserving the aesthetic intent.

---

## Elevation & Depth

Both themes share the same elevation stack, but the implementation inverts.

### Light Theme — Depth through light

| Level | Description | Implementation |
|-------|-------------|---------------|
| 0 — Floor | Base canvas | `background: #F7F9FB` |
| 1 — Surface | Raised neutral panels | `surface-container` + shadow `0 4px 24px rgba(15,23,42,0.04)` |
| 2 — Glass | Frosted overlay containers | `rgba(255,255,255,0.60)` + `backdrop-filter: blur(24px)` |
| 3 — Interactive | Buttons, active chips | Milled edge + elevated shadow |

**The Milled Edge** (light mode signature): every card and button carries a `1px` top-aligned white inner highlight and a `1px rgba(15,23,42,0.08)` bottom border. This creates the impression the component was machined from a single block of material and light is catching the upper bevel.

### Dark Theme — Depth through glow

| Level | Description | Implementation |
|-------|-------------|---------------|
| 0 — Floor | Dark console base | `background: #111111` (subtle brushed-metal texture optional) |
| 1 — Panel | Raised module surface | `surface-container-low` + `0 4px 20px rgba(0,0,0,0.50)` + 1px `rgba(255,255,255,0.20)` border |
| 2 — Glass | Frosted glass container | `rgba(255,255,255,0.05)` + `backdrop-filter: blur(12px)` |
| 3 — Interactive | Active / hover elements | Cyan or secondary glow + specular border pair |

**Specular Highlight** (dark mode signature): every glass container has `1px solid rgba(255,255,255,0.30)` on the top and left edges, and `1px solid rgba(0,0,0,0.40)` on the bottom and right edges, simulating physical light striking a beveled surface.

---

## Shapes

Shape language is disciplined and "engineered." The base radius (`0.25rem`) avoids the playfulness of fully rounded corners while escaping the harshness of 90° angles — it mimics the chamfered edge of precision-machined aluminum.

| Element type | Radius token | Value |
|-------------|-------------|-------|
| Inputs, small controls | `rounded-sm` | 2px |
| Standard buttons, chips | `rounded-md` | 6px |
| Cards, glass panels | `rounded-lg` | 8px |
| Status pips, full pills | `rounded-full` | 9999px |
| **Critical override** — Error alerts, Stop buttons | `rounded-none` | **0px** — sharp corners communicate urgency |

---

## Components

### Buttons

**Light — Primary:** Solid `primary` fill (`#0F172A`), white text, milled edge (1px white inner highlight top). Hover lifts shadow. Active removes the highlight and applies a subtle inset shadow.

**Light — Secondary/Ghost:** Frosted glass fill, `outline` border at 1px, `on-surface` text. Hover increases glass opacity slightly.

**Dark — Primary:** Linear gradient from a lighter grey tint down to the base `primary` (`#E5E5E5`). 1px `rgba(255,255,255,0.30)` top highlight. Active state: remove highlight, apply `inset 0 4px 4px rgba(0,0,0,0.40)` inner shadow, add light grey outer glow `0 0 12px rgba(229,229,229,0.40)`.

**Dark — Secondary/Ghost:** Glass fill, specular border pair, `on-surface` text.

**Shared rule:** A button's label always uses `label-caps` typography and sentence-case copy ("Run analysis", not "RUN ANALYSIS"). The label states the exact outcome, not a system operation.

### Cards / Glass Modules

Both themes: `rounded-lg` radius, 24px internal padding, defined header row with `label-caps` module title.

**Light:** `rgba(255,255,255,0.60)` fill, `blur(24px)`, milled edge pair, diffused drop shadow. Data points within the card are separated by 1px `outline-variant` dividers.

**Dark:** `rgba(255,255,255,0.05)` fill, `blur(12px)`, specular border pair, `0 4px 20px rgba(0,0,0,0.50)` outer shadow. Data separators are "etched" — a 1px dark line with a 1px lighter shadow beneath it to simulate an engraved groove.

### Input Fields

**Light:** Background `surface-container-low`, subtle inset shadow `inset 0 2px 4px rgba(15,23,42,0.06)` creates a "hollowed-out" effect. Border `outline-variant`. Focus: border shifts to `primary`.

**Dark:** Background `#0A0A0A` (deeper than floor), inset shadow `inset 0 2px 6px rgba(0,0,0,0.60)`. Text and caret render in `primary` light grey for a screen-glow effect. Focus ring: 1px light grey border + faint `0 0 8px rgba(229,229,229,0.25)` glow.

### Status Indicators / Chips

Small circular "LED pip" (8–10px) using a radial gradient from the center color outward to a transparent edge, simulating a physical indicator bulb.

**Pass / OK:** Secondary emerald with outer glow `0 0 6px rgba(78,222,163,0.50)` in dark, solid `#006C49` in light.

**Fail / Alert:** Tertiary crimson with outer glow `0 0 6px rgba(255,179,173,0.50)` in dark, solid `#C0000C` in light.

**Label chips** (text-based): `label-caps` text, 1.5px border, `rounded-full`, no fill — they read as technical classification tags.

### Gauges & Progress

Background track: recessed in both themes (inset shadow). Track color: `surface-container-highest` (light) / `surface-container-low` (dark).

Active bar: thick stroke (6–8px) in `secondary` (pass range) or `tertiary` (danger range). In dark mode the active bar carries a "neon tube" glow: `0 0 8px` in the bar's color at 60% opacity.

Threshold markers: fine 1px vertical tick marks using `mono-data` labels below.

### Lists & Tables

Rows separated by 1px `outline-variant` lines at 40% opacity — present as visual rhythm, not as heavy dividers. Alternate row tinting is discouraged; it competes with the glass layer. Use hover highlight (`surface-container-high` in light, `surface-container` in dark) to indicate interactivity instead.

Column headers: always `label-caps`. Data cells: `mono-data` for numeric values, `body-md` for descriptive content.

---

## Theme Switching

Implement via a CSS `data-theme` attribute on `<html>` or `<body>`. All color tokens are CSS custom properties. The glass constants, shadows, and glow values should also be custom properties so they flip with the theme. Typography, spacing, and radius tokens are theme-independent and declared once.

```css
:root[data-theme="light"] {
  --color-background:    #f7f9fb;
  --color-primary:       #0f172a;
  --glass-fill:          rgba(255, 255, 255, 0.60);
  --glass-blur:          blur(24px);
  /* ... */
}

:root[data-theme="dark"] {
  --color-background:    #111111;
  --color-primary:       #e5e5e5;
  --glass-fill:          rgba(255, 255, 255, 0.05);
  --glass-blur:          blur(12px);
  /* ... */
}
```

Respect `prefers-color-scheme` as the default before any user override. Avoid animating theme switches on low-motion settings.