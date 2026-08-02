---
name: Solviax
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  data-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1280px
---

## Brand & Style

The brand personality is authoritative yet approachable, positioning itself as a high-utility tool for travelers who prioritize precision. The design system follows a **Modern Corporate** aesthetic with a heavy emphasis on **Airy Minimalism**. It aims to evoke a sense of clarity and "organized adventure," reducing the cognitive load of complex meteorological data through generous whitespace and a systematic information hierarchy.

The UI should feel lightweight and expansive, borrowing the high-end editorial feel of modern travel platforms while maintaining the rigorous functional standards of a data-driven SaaS. Every interaction should feel intentional, using subtle transitions to guide the user from high-level planning to granular weather insights.

## Colors

The palette is anchored in **Deep Indigo**, used for primary actions and navigation to establish institutional trust. **Sky Blue** serves as the functional accent, primarily used for weather-related data points, active states, and selection highlights to maintain a thematic link to the atmosphere.

**Success Green** and **Alert Yellow** are reserved strictly for semantic feedback—indicating "ideal" conditions versus "cautionary" weather windows. The background architecture utilizes a layered "Off-White" approach (#F8FAFC), which prevents screen fatigue and allows the vibrant primary colors to stand out as clear calls to action.

## Typography

This design system uses **Inter** exclusively to ensure maximum legibility across dense data tables and map overlays. 

- **Display & Headlines:** Use tight letter spacing and semi-bold weights to create a strong visual anchor.
- **Body Text:** Standardized at 16px for optimal readability. 
- **Data Labels:** Small, medium-weight labels are used for coordinates, temperatures, and timestamps.
- **Numerical Data:** While not a true monospace, Inter's tabular figures should be utilized for weather metrics to ensure vertical alignment in lists and comparison views.

## Layout & Spacing

The system follows a **Fluid Grid** model with a mobile-first philosophy. On mobile devices, a 4-column grid is used with 16px margins. As the viewport scales to desktop, the system transitions to a 12-column grid with a maximum content width of 1280px.

Spacing is based on a 4px baseline grid to ensure mathematical harmony. Elements like weather cards and map overlays use "Floating Containers"—they do not always snap to the grid edges but maintain a consistent 16px or 24px internal padding. Map views should occupy the full background where possible, with UI controls appearing as floating "islands" to maintain the sense of an expansive, airy interface.

## Elevation & Depth

Depth is conveyed through **Ambient Shadows** and **Tonal Layering** rather than heavy borders.

- **Level 0 (Background):** Map interface or #F8FAFC.
- **Level 1 (Cards):** Pure white surfaces with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)).
- **Level 2 (Overlays/Modals):** Increased shadow spread (0px 10px 30px rgba(0,0,0,0.08)) and a 1px soft gray border (#E2E8F0) to ensure separation from Level 1 containers.
- **Glassmorphism:** Use backdrop blurs (20px) on mobile navigation bars and top search headers to maintain a sense of location context while the user interacts with menus.

## Shapes

The design system uses a "Rounded" language to feel approachable and modern. 

- **Standard Elements:** Buttons, input fields, and small chips use a 0.5rem (8px) radius.
- **Main Containers:** Large cards and search panels use `rounded-xl` (1.5rem / 24px) to mimic the friendly, premium feel of high-end travel apps.
- **Progress Bars:** Fully pill-shaped (999px) to indicate fluid movement and weather trends.

## Components

### Buttons
Primary buttons are Deep Indigo with white text. Secondary buttons use a Sky Blue ghost style (transparent background with a 1px Sky Blue border). The default state features the 0.5rem corner radius.

### Search Cards
Search interfaces should be floating "islands" with `rounded-xl` corners. They feature minimalist input fields without heavy borders, using bottom-aligned labels and Sky Blue icons.

### Weather Indicators
- **Progress Bars:** Used for "Rain Probability." The track is a soft gray (#F1F5F9) and the fill is Sky Blue.
- **Chips:** Small, rounded badges used for "Best Time to Visit" or "Warning" indicators. They use a light background tint of the semantic color (e.g., Success Green at 10% opacity) with high-contrast text.

### Map Overlays
Map controls (Zoom, Recenter, Layers) are small, white circular buttons with subtle shadows. Tooltips on the map are white with a 0.5rem radius and a small directional "beak."

### Lists & Navigation
Mobile navigation is a bottom-fixed bar with clear, 24px line-art icons. Desktop navigation moves to the top, utilizing a simplified horizontal layout to keep the focus on the map and data results.