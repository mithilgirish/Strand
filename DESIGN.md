---
name: Refined Neo-Brutalist
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#414755'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#ba0034'
  on-secondary: '#ffffff'
  secondary-container: '#e51245'
  on-secondary-container: '#fffbff'
  tertiary: '#006b27'
  on-tertiary: '#ffffff'
  tertiary-container: '#008733'
  on-tertiary-container: '#f7fff2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#ffdada'
  secondary-fixed-dim: '#ffb3b5'
  on-secondary-fixed: '#40000c'
  on-secondary-fixed-variant: '#920027'
  tertiary-fixed: '#72fe88'
  tertiary-fixed-dim: '#53e16f'
  on-tertiary-fixed: '#002107'
  on-tertiary-fixed-variant: '#00531c'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
typography:
  display:
    fontFamily: Outfit
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style
This design system merges the raw, unapologetic honesty of Neo-Brutalism with the surgical precision of high-end consumer technology interfaces. The brand personality is bold, structural, and intellectual. It prioritizes clarity over decoration, using stark contrast and heavy strokes to define a rigid hierarchy.

The visual style is characterized by "floating paper" surfaces, aggressive weight contrasts, and a complete absence of gradients or traditional "soft" shadows. It evokes a sense of confidence and utility, designed for power users who appreciate both avant-garde aesthetics and functional rigor.

## Colors
The palette is built on a foundation of absolute extremes: `#FFFFFF` and `#000000`. This high-contrast base ensures maximum legibility and structural definition. 

Accents are derived from vibrant, high-saturation spectrums. They are used exclusively as solid fills for interactive elements, status indicators, or category markers.
- **Primary (Vibrant Blue):** Used for primary actions and focused states.
- **Secondary (San Francisco Pink):** Used for highlights and expressive callouts.
- **Tertiary (Neon Green):** Used for success states and growth metrics.
- **Surface:** All containers use a pure white background to maintain the "paper" aesthetic against the stark black borders.

## Typography
The typographic system relies on aggressive weight differentiation. **Outfit** is utilized for headings to provide a geometric, modern tech feel, while **Inter** handles body copy and UI labels with systematic precision.

Headlines should be set with tight letter-spacing and heavy weights (700+) to compete with the thick borders of the UI. Body text remains neutral to ensure readability within dense layouts. Use uppercase labels for utility text to reinforce the architectural feel of the design.

## Layout & Spacing
The layout follows a rigid 12-column grid system for desktop and a 4-column grid for mobile. All dimensions and spacing increments are strictly derived from a 4px baseline grid.

Generous internal padding is a hallmark of this system, preventing the heavy 3px borders from feeling cramped. Content blocks should be separated by large vertical gutters to allow the "floating paper" elements room to breathe. Components should snap to the grid, maintaining a boxy, structural alignment across all breakpoints.

## Elevation & Depth
Depth is communicated through "Hard Shadows"—solid black offsets with zero blur. This creates a tactile, physical stacking effect reminiscent of layered cardstock.

- **Level 0 (Floor):** Pure white or light gray background.
- **Level 1 (Default Card):** 3px black border, 4px x 4px solid black shadow.
- **Level 2 (Hover/Active):** 3px black border, 8px x 8px solid black shadow. The element appears to lift further off the page.
- **Level 3 (Pressed):** 3px black border, 0px shadow (the element flattens against the surface).

There are no blurs, no transparencies, and no gradients. Every layer is opaque and clearly defined by its stroke.

## Shapes
While the system is rooted in Brutalism, it adopts an "Apple-inspired" refinement by avoiding jaggedness. Elements use a consistent `0.25rem` (4px) corner radius. This slight softening prevents the UI from feeling hostile while maintaining the overall rectangular, structural theme. 

Large containers and cards should use `rounded-lg` (8px) to emphasize their scale, while buttons and inputs remain at the base `soft` (4px) setting.

## Components
### Buttons
Primary buttons are solid fills of Primary Blue or Neutral Black with white text. They must feature a 3px black border and the signature 4px hard shadow. On hover, the shadow increases to 8px; on click, the shadow disappears and the button "sinks."

### Input Fields
Inputs use a white background, 3px black border, and 16px internal padding. Labels are placed above the field in `label-bold` style. The focus state replaces the 3px black border with a 3px Primary Blue border.

### Cards
Cards are the primary container. They always feature a 3px black stroke and a hard shadow. Header sections within cards are separated by a 3px horizontal stroke.

### Chips & Tags
Chips are rectangular with the base 4px border-radius. They use high-saturation fills (Pink or Green) with black text for maximum "pop" against the white background.

### Checkboxes & Radios
These are oversized and strictly geometric. Checkboxes are squares; Radio buttons are circles. Both use 3px strokes and solid black fills when selected.