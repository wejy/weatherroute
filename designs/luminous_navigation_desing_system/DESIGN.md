---
name: Luminous Navigation
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
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
  xl: 32px
  container-padding: 20px
  floating-gap: 12px
---

## Brand & Style
The brand personality is optimistic, efficient, and technologically advanced. It is designed for active users who navigate complex information environments—specifically travel, logistics, or outdoor exploration. The UI must feel light and "airborne," evoking a sense of clarity and forward momentum.

The design style is a refined **Glassmorphism**. It utilizes translucent layers and background blurs to maintain a visual connection with underlying map data while ensuring legibility. By combining soft light/shadow play with high-contrast functional elements, the system achieves a state of "functional transparency" where the interface supports the content without obstructing the user's view of the terrain.

## Colors
The palette is anchored by a vibrant **Indigo Primary**, chosen for its high visibility against natural map colors (greens, tans, and blues). 

- **Primary (#4f46e5):** Used for critical actions, active states, and pathfinding markers.
- **Secondary (#06b6d4):** A bright Cyan used for secondary information like weather overlays or point-of-interest categories.
- **Surfaces:** Utilize high-transparency whites with a 20px-40px backdrop blur to create the glass effect.
- **Text/Icons:** Near-black or deep indigo is used for maximum contrast against light glass surfaces.

## Typography
**Plus Jakarta Sans** provides a contemporary, friendly, and geometric feel that remains highly legible in variable lighting conditions. 

Headlines use tight letter spacing and bold weights to anchor the floating UI panels. Body text is set with generous line heights to ensure readability over busy map backgrounds. Labels use a slightly increased letter spacing and semi-bold weights to differentiate them from interactive body text. All typography must maintain a contrast ratio of at least 4.5:1 against the glass containers.

## Layout & Spacing
The layout follows a **No Grid** philosophy for floating elements, prioritizing contextual placement and safe-area margins. 

- **Floating Panels:** UI elements "hover" over the map with a standard `floating-gap` of 12px between adjacent panels.
- **Margins:** On mobile, components maintain a 16px margin from the screen edge. On desktop, primary controls are grouped in the corners or a side-dock with a 24px-32px margin.
- **Safe Zones:** Top and bottom bars respect hardware notches and home indicators, transitioning from transparent to glass backgrounds as content scrolls.

## Elevation & Depth
Depth is the core of this design system, defined by three distinct tiers:

1.  **The Canvas (Level 0):** The map or data visualization layer.
2.  **Glass Panels (Level 1):** Elements like search bars, menus, and info cards. These use `backdrop-filter: blur(20px)` and a subtle 1px white inner-border (stroke) to simulate the edge of a glass pane. 
3.  **Active Focus (Level 2):** Primary buttons or active modal states. These use a slightly more opaque white or the Primary Indigo and a soft, diffused shadow (`0 10px 25px -5px rgba(0,0,0,0.1)`) to pull the element further toward the user.

Shadows are rarely used on level 1; instead, depth is created through the blur contrast and the 1px highlight border.

## Shapes
The system uses a **Rounded** language (Level 2). Standard containers and cards have a 0.5rem (8px) radius. Larger floating sheets and primary action containers use `rounded-lg` (16px) to appear softer and more approachable.

Buttons and high-frequency interaction points should use a slightly more generous radius than the containers they sit within to create a nested, organic feel.

## Components
- **Buttons:** Primary buttons are solid Indigo with white text. Secondary buttons use the glass surface with a 1px border. All buttons have a minimum height of 48px for touch-friendliness.
- **Floating Action Buttons (FAB):** Circular glass containers with centered Indigo icons, used for "re-center" or "add point" actions.
- **Cards:** Use the glass surface with `rounded-lg`. Content within should have 16px padding. Titles are `headline-md` and metadata is `label-sm`.
- **Search Bar:** A full-width glass pill (`rounded-xl`) with a search icon on the left. The background blur increases slightly when the input is focused.
- **Chips:** Small, highly rounded glass elements used for map filters (e.g., "Restaurants," "Parks"). When active, they flip to a solid Primary Indigo background.
- **Input Fields:** Bottom-aligned labels within glass containers. The active state is indicated by an Indigo bottom-border (2px).
- **Navigation Dock:** A floating glass bar at the bottom of the screen with haptic-enabled icons for core app sections.