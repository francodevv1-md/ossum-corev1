# HANDOFF — Visual Redesign Coordination Global UI (COORD-GLOBAL-UI-20260817)

## Done
Redesigned the presentation layer of all 3 target components under `src/components/coordinadores/` conforming strictly to the **OSSUM Dark Operational** theme tokens and layout conventions. No business logic, stores, permissions, or routing files were read or modified.

## Changed

### 1. `src/components/coordinadores/SituationFilterBar.tsx`
- **Container**: Applied `bg-[var(--op-secondary)]`, `p-2`, `rounded-xl`, and `border-[var(--op-border-subtle)]` as a dashboard panel wrapper.
- **Buttons**:
  - Replaced hardcoded borders and `bg-white` colors with responsive `.dark`-ready variables (`bg-[var(--op-surface)]`, border `var(--op-border-default)`).
  - Configured custom interactive state colors for each pill: `bg-[var(--op-[alert]-bg)]` and border `var(--op-[alert]-border)` matching situation danger (red), warning (amber), or info (blue).
  - Enforced `min-h-11` targets, focus-visible outline rings (`focus-visible:ring-[var(--op-primary-highlight)]`), and text truncations to maintain layout structure on mobile.

### 2. `src/components/coordinadores/CoordinatorCaseCard.tsx`
- **Structure**:
  - Reorganized layout into an adaptive grid (`xl:grid-cols-[1.3fr,1.3fr,1fr,auto]`) to support dense viewports.
  - Implemented card wrapping with `rounded-xl` and shadow levels (`shadow-2xs` to `shadow-xs`).
- **Typography & Fields**:
  - Set patient name as primary bold text with metadata items formatted using clear icons (`User`, `CalendarDays`).
  - Added specialized badges for case urgency (`urgente` text animated pulses), material availability, and SLA alerts.
  - Set custom actions with `min-h-11` sizes, styling tracking buttons under primary tone variables.

### 3. `src/components/coordinadores/CoordinatorBucketSection.tsx`
- **Shells & Sections**:
  - Styled `<details>` and `<summary>` wrappers with smooth background transition behaviors and specific accent indicators per operational bucket.
  - Placed inner cards inside uniform padding spaces, separating sections with standard divider colors.
  - Enhanced micro-interactions by rotating expand buttons when details are open (`group-open:rotate-180` / `group-open/sub:rotate-180`).

## TODO: wire
- No new markers left. All existing handlers/callbacks (`onOpenSeguimiento`, `onOpenGestion`, `onOpenLogistica`, `onOpenExpediente`, `onToggle`) are wired exactly as they were before, keeping the props API contract unchanged.

## Decisiones visuales
- **Consistent Tokens**: Exclusively used CSS variables such as `var(--op-surface)`, `var(--op-secondary)`, `var(--op-text-primary)`, `var(--op-text-secondary)`, `var(--op-border-default)`, and theme colors matching warning/success/danger/info.
- **Density**: Adopted compact font sizing (`text-[10px]` to `text-xs`) for auxiliary labels, tabular-numbers for counting figures, and bold layout markers to achieve high information density.
- **Interactions**: Enhanced state feedbacks by adding focus-rings and custom hover animations.

## Validación
- Ran Next.js production build (`npm run build`). Trace compilation completed successfully with zero TypeScript, JSX, or lint compilation issues, verifying complete code integration safety.
