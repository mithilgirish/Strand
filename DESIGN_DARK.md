---
name: Refined Neo-Brutalist Dark
colors:
  surface: '#11131a'
  surface-dim: '#11131a'
  surface-bright: '#373940'
  surface-container-lowest: '#0c0e14'
  surface-container-low: '#191b22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#c2c6d5'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#8c909e'
  outline-variant: '#424753'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e69'
  primary-container: '#005bc1'
  on-primary-container: '#c9d9ff'
  inverse-primary: '#005bc0'
  secondary: '#ffb3b5'
  on-secondary: '#680019'
  secondary-container: '#ba0034'
  on-secondary-container: '#ffc7c8'
  tertiary: '#80da88'
  on-tertiary: '#003911'
  tertiary-container: '#076e2a'
  on-tertiary-container: '#92ee99'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#ffdada'
  secondary-fixed-dim: '#ffb3b5'
  on-secondary-fixed: '#40000c'
  on-secondary-fixed-variant: '#920027'
  tertiary-fixed: '#9bf7a2'
  tertiary-fixed-dim: '#80da88'
  on-tertiary-fixed: '#002107'
  on-tertiary-fixed-variant: '#00531c'
  background: '#11131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin: 24px
  stroke_width: 3px
---

## Brand & Style
The design system operates on a "Refined Neo-Brutalism" philosophy. It balances the raw, structural integrity of traditional brutalism—heavy strokes, high contrast, and functional honesty—with the sophisticated polish required for modern digital products. 

The aesthetic is characterized by architectural precision, using thick borders and vibrant accent fills to create a "tactile paper" effect. It targets a confident, tech-forward audience that values clarity over decoration. The interface should feel intentional, rhythmic, and high-energy, evoking a sense of structural reliability and creative boldness.

## Colors
The color palette is optimized for high-contrast dark mode utility. Surfaces are built on a foundation of deep charcoal, allowing the 3px pure white strokes to define the structural boundaries of the UI.

- **Primary & Accents:** High-saturation fills (Blue, Pink, Green) are used as functional highlights. In dark mode, these colors act as vibrant "stickers" or "inlays" against the dark background.
- **Stroke/Border:** A constant `#ffffff` is used for all component boundaries and separators to maintain the neo-brutalist "line-art" feel.
- **Hierarchy:** Depth is achieved through shifts between the `#121212` canvas and `#1e1e1e` cards, rather than through subtle gradients.

## Typography
Typography is treated as a structural element. **Outfit** provides a geometric, confident voice for headings, while **Inter** ensures maximum legibility for functional copy and data.

All text is inverted for the dark theme, using pure white for headings and high-contrast light gray for body text. Headings should be set with tight tracking to reinforce the compact, brutalist aesthetic. Labels and metadata utilize uppercase Inter for a "technical" or "utility" feel.

## Layout & Spacing
The layout follows a **12-column fluid grid** with strict adherence to an 8px rhythmic spacing system. 

Margins and gutters are kept generous to balance the heavy 3px strokes. Elements should align strictly to the grid to maintain the "architectural" feel. Spacing is used to group related functions within the 3px borders, creating a clear nested hierarchy. On mobile, margins reduce to 16px, and the grid collapses to 4 columns.

## Elevation & Depth
In this design system, depth is not conveyed through shadows or blurs, but through **hard-edged offsets and strokes**.

- **Stacked Sheets:** Components appear elevated by adding a hard, 100% opacity black shadow (offset 4px or 8px) behind a card with a white stroke. This creates a "cut-out" or "sticker" effect.
- **Inners:** Active or pressed states use "Inner Borders"—a slight darkening of the surface color or a subtle inner shadow to simulate the element being pressed into the page.
- **Tonal Layers:** The canvas (`#121212`) is the lowest level. Surface containers (`#1e1e1e`) sit atop it, always defined by a white border.

## Shapes
The shape language is strictly **Sharp (0px)**. 

All buttons, cards, inputs, and containers must have 90-degree corners. This reinforces the Neo-Brutalist commitment to structural honesty and geometric precision. Roundedness is only permitted for specific functional icons or circular avatars, never for structural UI containers.

## Components

- **Buttons:** Primary buttons use a high-saturation fill (e.g., Blue #005bc1) with a 3px white stroke and a hard black shadow. Secondary buttons are transparent with white text and a 3px white stroke. Labels are bold and uppercase.
- **Cards:** Background color `#1e1e1e` with a `#ffffff` 3px border. Cards should use a hard 4px or 8px black shadow to denote interactivity.
- **Input Fields:** Dark backgrounds (`#121212`) with a 3px white border. Focus states are indicated by a 4px offset shadow in the Primary Blue color.
- **Chips/Tags:** Small, sharp-edged rectangles with high-saturation fills. Text should be black when on bright fills and white when on dark fills to ensure accessibility.
- **Lists:** Separated by 3px white horizontal rules. List items should have a distinct hover state that fills the background with a subtle gray or a primary accent.
- **Checkboxes/Radios:** Square (0px radius) with 3px strokes. Checked states use the Primary Blue fill with a white checkmark icon.