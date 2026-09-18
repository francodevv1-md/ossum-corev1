---
name: Clinical Precision
colors:
  surface: '#f6faff'
  surface-dim: '#d2dbe4'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf5fe'
  surface-container: '#e6eff8'
  surface-container-high: '#e0e9f2'
  surface-container-highest: '#dbe4ed'
  on-surface: '#141d23'
  on-surface-variant: '#424752'
  inverse-surface: '#293138'
  inverse-on-surface: '#e9f2fb'
  outline: '#727784'
  outline-variant: '#c2c6d4'
  surface-tint: '#115cb9'
  primary: '#003f87'
  on-primary: '#ffffff'
  primary-container: '#0056b3'
  on-primary-container: '#bbd0ff'
  inverse-primary: '#acc7ff'
  secondary: '#006e25'
  on-secondary: '#ffffff'
  secondary-container: '#80f98b'
  on-secondary-container: '#007327'
  tertiary: '#722b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#983c00'
  on-tertiary-container: '#ffc2a7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#acc7ff'
  on-primary-fixed: '#001a40'
  on-primary-fixed-variant: '#004491'
  secondary-fixed: '#83fc8e'
  secondary-fixed-dim: '#66df75'
  on-secondary-fixed: '#002106'
  on-secondary-fixed-variant: '#00531a'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb694'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f6faff'
  on-background: '#141d23'
  surface-variant: '#dbe4ed'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  h3:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  table-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar-width: 260px
  sidebar-collapsed: 64px
  drawer-width: 480px
---

## Brand & Style

The design system is engineered for the high-stakes environment of orthopedic surgery and traumatology. The brand personality is rooted in **precision, reliability, and clinical efficiency**. It avoids decorative elements in favor of a "tools-first" philosophy, where every pixel serves an operational purpose.

The visual style follows a **Corporate/Modern** aesthetic, emphasizing clarity and information density. It utilizes a structured hierarchy to guide users through complex surgical workflows without causing cognitive overload. The emotional response is one of calm control and professional confidence—mirroring the environment of a sterile operating theater. Focus is placed on "operational depth," allowing users to drill down from high-level scheduling to granular inventory consumption with minimal friction.

## Colors

The color strategy for this design system is bifurcated to distinguish between operational and financial contexts immediately. 

- **Surgical/Operational Core:** Built on a foundation of Primary Blue (#0056b3) and Soft Gray (#f8f9fa) to maintain a sterile, clinical feel.
- **Accounting & Finance:** Utilizes Primary Green (#28a745) to signal commercial and completion states, creating a mental modal shift for the user.

**Operational Language (Status):**
The system uses a comprehensive color vocabulary for status tracking. These are not merely decorative; they are functional indicators. Surgery statuses move from warm/neutral (Unauthorized/Pending) to deep blues (Action) and finally greens (Completion). Preparation statuses include high-visibility oranges for "frozen with missing items" to ensure logistical bottlenecks are identified at a glance.

## Typography

This design system standardizes on **Inter** to maximize legibility in high-density data environments. The typography system prioritizes a compact vertical rhythm to ensure more rows are visible in surgical tables without sacrificing clarity.

- **Headlines:** Reserved for page titles and major drawer headings, using semi-bold weights.
- **Body:** The default is 14px, but the "table-data" tier (13px) is the workhorse of the system, optimized for multi-column ERP views.
- **Label-Caps:** Used for table headers and small metadata tags to provide structural contrast against data values.

## Layout & Spacing

The layout utilizes a **fluid grid system** designed to expand across widescreen monitors common in hospital administrative offices. It is built on a 4px baseline grid to allow for the "visual density" required by surgical ERPs.

- **Primary Shell:** Features a collapsible sidebar on the left. When expanded (260px), it shows full labels; when collapsed (64px), it shows only high-contrast icons.
- **Side Drawers:** Used for "Surgical Case" details. Instead of navigating away from a list, clicking a row opens a 480px right-aligned drawer, maintaining the user's context.
- **Multi-Tabbed Views:** Inside drawers and detail pages, content is organized into horizontal tabs to reduce vertical scrolling and group related surgical data (Items, Staff, Consumption, Implants).

## Elevation & Depth

To maintain a clean, clinical look, this design system minimizes the use of heavy shadows. Depth is primarily conveyed through **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Levels:** The background uses Soft Gray (#f8f9fa). White (#FFFFFF) is reserved for active "Cards" or "Work Areas."
- **Borders:** Elements are defined by 1px solid borders in a light gray (#dee2e6). This creates a "blueprint" feel that emphasizes structure.
- **Drawers and Modals:** These use a soft, ambient shadow (0px 4px 20px rgba(0,0,0,0.08)) to indicate they are temporary layers sitting above the main operational grid.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional balance—avoiding the clinical coldness of sharp 90-degree corners while remaining more serious and "engineered" than pill-shaped consumer interfaces.

- **Buttons & Inputs:** Use the standard 0.25rem (4px) radius.
- **Badges:** Utilize a slightly larger relative radius (rounded-lg) to distinguish them from interactive buttons.
- **Status Indicators:** Small circular pips or thin vertical bars on the left edge of table rows to provide color-coding without overwhelming the text.

## Components

The component library focuses on high-density information display and rapid action.

- **Dense Tables:** The centerpiece of the ERP. They feature sticky headers, internal scrolling, and "Action Menus" (three-dot vertical) in the final column. Row height is capped at 40px.
- **Color-Coded Badges:** Status indicators use the specific surgery/preparation colors defined in the color section. They use a "Light" background (10-15% opacity of the hex) with "Deep" colored text for maximum readability.
- **Collapsible Sidebars:** Navigation includes internal scrolling to handle many modules. Hover states use Primary Blue (#0056b3) at low opacity.
- **Side Drawers:** These transition from the right, containing multi-tabbed views. They allow for "Case Management" without losing the filtered state of the master list.
- **Input Fields:** Use a subtle inset shadow or 1px border. Validation states (error/success) must use the specific status colors (#dc3545 for error).
- **Multi-tabbed Detail Views:** Horizontal pill-style tabs used within drawers to switch between "Patient Info," "Surgical Kit," and "Logistics."