---
name: Luminous Navigation Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#bdc2ff'
  on-secondary: '#131e8c'
  secondary-container: '#2f3aa3'
  on-secondary-container: '#a8afff'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff516a'
  on-tertiary-container: '#5b0017'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#bdc2ff'
  on-secondary-fixed: '#000767'
  on-secondary-fixed-variant: '#2f3aa3'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
This design system is a high-fidelity, dark-mode evolution centered on depth, clarity, and "luminous" interaction. It targets modern SaaS, technology, and navigation-heavy platforms that require long-session comfort without sacrificing visual impact.

The style is **Glassmorphic-Modern**. It leverages deep atmospheric backgrounds and semi-transparent surface layers to create a sense of infinite space. The emotional response should be one of focused calm—like a high-end cockpit or a premium workstation. Visual interest is driven by subtle glows, vibrant indigo accents that pop against the void, and meticulously balanced contrast levels that ensure WCAG AA accessibility while maintaining a sophisticated "tech-noir" aesthetic.

## Colors
The palette is built on a foundation of **Deep Navy (#0f172a)** for the primary canvas to provide better visual depth than pure black. Surfaces use **Charcoal Slate (#1e293b)**, while interactive containers utilize a lighter **Slate (#334155)** to suggest elevation.

The **Indigo Accent (#6366f1)** is the hero color. In this dark context, it is treated as a light source. Primary actions should utilize this color with a subtle outer glow (drop-shadow) to simulate luminosity. Secondary accents and success states use a brighter **Indigo-Slate (#818cf8)** to maintain harmony. Text contrast is prioritized using **Off-White (#f8fafc)** for headlines and **Muted Slate (#94a3b8)** for supporting copy to reduce eye strain.

## Typography
The system uses **Plus Jakarta Sans** exclusively to maintain a friendly yet precise character. The typeface's wide apertures and modern geometric construction ensure excellent legibility against dark backgrounds, where "halonation" (text appearing to bleed) can often occur with thinner, more traditional fonts.

- **Headlines:** Use Bold (700) or ExtraBold (800) weights with tighter letter-spacing for a confident, editorial feel.
- **Body Text:** Use Regular (400) weight. Avoid pure white text on dark backgrounds; instead, use the defined off-white to prevent "visual vibration."
- **Labels:** Use SemiBold (600) for UI micro-copy and buttons to ensure they remain distinct from body content.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy with a 12-column structure for desktop. 

- **Safe Zones:** Use 48px side margins on desktop and 16px on mobile. 
- **Vertical Rhythm:** A strict 4px baseline grid governs all spacing. Use 16px (md) for standard component padding and 24px (lg) for section spacing.
- **Grouping:** Related elements should use 8px (sm) gaps, while distinct sections should use 40px (xl) to create breathing room, which is essential in dark UI to prevent a "cluttered" feel.

## Elevation & Depth
Elevation in this system is conveyed through **Tonal Layering and Glows** rather than traditional heavy shadows.

- **Level 0 (Canvas):** Deep Navy (#0f172a).
- **Level 1 (Cards/Sidebars):** Charcoal Slate (#1e293b) with a subtle 1px border of #334155 to define edges.
- **Level 2 (Modals/Popovers):** Slate (#334155) with a soft, expansive indigo-tinted shadow (`0 20px 25px -5px rgba(0, 0, 0, 0.3)`).
- **Glassmorphism:** For top navigation and floating elements, use a backdrop blur of 12px with a 60% opaque background of the level it sits upon.
- **Inner Glow:** Interactive elements should use a very faint inner highlight (0.5px top border) to catch the "light" from above.

## Shapes
The shape language is **Rounded**, favoring 0.5rem (8px) for standard components like input fields and small cards. 

- **Large Containers:** Use `rounded-lg` (16px) to soften the structure of the dashboard.
- **Buttons/Chips:** Use `rounded-xl` (24px) or full pill-shaping to distinguish interactive triggers from static layout containers.
- **Consistency:** Maintain a nested radius approach—inner elements should have a radius 4px smaller than their parent container to maintain visual harmony.

## Components
### Buttons
- **Primary:** Background #6366f1, Text #f8fafc. Apply a 10px blur indigo drop-shadow on hover to create a "bloom" effect.
- **Secondary:** Transparent background with a 1.5px border of #334155. Hover state fills the background with a 10% opacity indigo tint.

### Input Fields
- **Default:** Background #1e293b, Border #334155, Text #f8fafc.
- **Focus:** Border #6366f1 with a 2px outer glow (ring) of the same color at 30% opacity.

### Cards
- Always use a 1px border (#334155) to ensure separation between the surface and the canvas. For interactive cards, the border should transition to #6366f1 on hover.

### Chips & Badges
- Use semi-transparent fills (e.g., Indigo at 15% opacity) with high-contrast text to keep them legible but secondary to primary buttons.

### Navigation Links
- Default state: Text #94a3b8.
- Active/Hover state: Text #f8fafc with a small 4px indigo dot or vertical line indicator to signify the current location.