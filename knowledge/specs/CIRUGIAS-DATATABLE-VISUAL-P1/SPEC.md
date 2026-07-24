# Spec — CIRUGIAS-DATATABLE-VISUAL-P1

Status: specified
Change: `CIRUGIAS-DATATABLE-VISUAL-P1`
Workspace: `E:/OSSUM_COR_PROJECT`
Artifact store: hybrid (filesystem + Engram)
Phase: A + B — UI-pure presentational polish over existing component state

---

## 1. Summary

Visual polish of the Cirugías data table across two phases: Phase A (scannability — zebra striping, solid header, consistent row height, rich empty state) and Phase B (information hierarchy — mini-stepper circuit progress, contextual relative dates, urgency row tint). All 7 items are UI-pure presentational layers over existing component state. No business logic, no backend, no database, no auth, no permissions, no API routes, no validators, no services, no providers, and no NewSurgeryDialog or dialog-file changes. This spec defines precise behavior, acceptance criteria, visual states, className contracts, component prop interfaces, and test requirements for all items.

---

## 2. Objective

Improve scannability and information hierarchy of the Cirugías data table — the operational cockpit where coordinators sort, scan, and act on surgeries — without crossing the active sequence prohibitions in AGENTS.md §5/§11. Every item reads existing component state; none introduces new validation passes, new API calls, new persistence, new auto-apply paths, or new behavior mutations. The table stays at `page.tsx → CirugiasTable → CirugiaRow → sub-cells`.

---

## 3. In Scope

### Phase A — Escaneabilidad inmediata

| Item | Description | Risk |
|------|-------------|------|
| A1 | Zebra striping — alternating row backgrounds via CSS nth-child | Low |
| A2 | Solid header background — `bg-muted` replacing `bg-muted/40` | Low |
| A3 | Consistent row height — `min-h-[34px]` via shared `CELL_BASE` constant | Low |
| A4 | Rich empty state — illustrated `CirugiasEmptyState` component with CTA + filter hint | Low |

### Phase B — Jerarquía informativa

| Item | Description | Risk |
|------|-------------|------|
| B5 | Mini-stepper de progreso del circuito — 7-dot `CircuitProgressCell` + `getCircuitProgress()` pure function | Medium |
| B6 | Fecha contextual — relative labels (Hoy, Mañana, Ayer, Vencida hace Nd, En Nd) with color variants + exact-date tooltip | Low |
| B7 | Urgente como tinte de fila — row-level red tint with className priority Selected > Urgent > Zebra > Base | Medium |

### Cross-cutting

- New presentational sub-components: `CirugiasEmptyState.tsx`, `CircuitProgressCell.tsx`.
- New pure function files: `circuit-progress.ts` (or appended to `cirugias.utils.ts`), `formatContextualDate()` in `formatters.ts`.
- New column key `"circuitProgress"` in `CIRUGIAS_COLUMNS`, `DEFAULT_VISIBLE_COLS`, `NON_SORTABLE_KEYS`.
- New test files for `getCircuitProgress()`, `CircuitProgressCell`, `CirugiasEmptyState`, and `formatContextualDate()`.
- Ownership lock declaration over critical files before any edit (AGENTS.md §9.3/§10).

---

## 4. Out of Scope

- **Phase C:** density toggle, min-widths per column, primary action differentiation.
- **Phase D:** date grouping with sticky headers.
- **NewSurgeryDialog.tsx** and any dialog files — another session owns them. Zero touch.
- Any business logic, Prisma, backend, auth, permissions, API routes, validators, services, or providers.
- `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`.
- Devolución and Comparativa stages in the mini-stepper — require complex `stockItems` lookups, deferred to GPT-027F.5A+.
- Any new dependencies — AGENTS.md §11 prohibition active.
- Any change to `formatDate()` — preserved as-is; `formatContextualDate()` is additive.
- Any backend foundation work — prohibited by AGENTS.md §5/§11 while GPT-027F.0A/0B are open.

---

## 5. Franco-Approved Decisions

Three decisions approved by Franco and embedded in every item's product rules:

### D1 — Mini-stepper de 7 dots (CX → PR → NR → Consumo → Doc → Fact → Cobro)

Devolución and Comparativa are excluded from the visual stepper. They require complex store lookups (`comparativa.utils.ts` needs `stockItems`) and are intermediate quality-control steps not always present. The 7-stage simplification aligns with Districorr's principle: the circuit adapts without disappearing. Backend helpers can add these stages in GPT-027F.5A+.

### D2 — Urgente: columna toggleable + tinte de fila como comportamiento base

The column is the registro (what was declared at creation); the row tint is the señal operativa (what catches the eye during scanning). Both coexist. The column stays in `CIRUGIAS_COLUMNS` and `DEFAULT_VISIBLE_COLS`; the row tint is always active when `s.urgente === true`.

### D3 — Fecha contextual reemplaza fecha plana en "Fecha CX", con tooltip mostrando fecha exacta

Relative dates (Hoy, Mañana, Ayer, Vencida hace Nd, En Nd) are the natural language of Districorr's operational rhythm. The exact date remains accessible via tooltip. The existing `formatDate` function is preserved — `formatContextualDate` is an additive function that wraps it.

---

## 6. Product Rules

### 6.1 Phase boundary

- This spec defines Phase A + Phase B only. All items are UI-pure, presentational, and approval-safe under the active sequence prohibitions.
- Any item that changes business logic, validation behavior, data model, schema, auth, providers, or API routes is excluded (see §4 Out of Scope).

### 6.2 A1 — Zebra striping

- Alternating row backgrounds apply to even-indexed rows within `<tbody>` via a table-level CSS selector on `<table>` in `CirugiasTable.tsx`.
- The CSS selector uses Tailwind arbitrary selector: `[&_tbody_tr:nth-child(even)]:bg-muted/15`.
- Zebra applies ONLY to unselected, non-urgent rows. Selected rows use `bg-primary/5` which wins via direct `<tr>` className specificity. Urgent rows use `bg-red-50/40` which also wins via direct `<tr>` className specificity.
- The className priority contract (§6.9) governs all interactions.
- Zebra must NOT be applied via a per-row prop or index — the table-level CSS selector is the single source of truth for zebra.
- Sticky cells with solid backgrounds (`bg-background` / `bg-primary/5`) will not show the zebra pattern through them — this is intentional and acceptable (sticky cells must cover scrolled content).

### 6.3 A2 — Solid header background

- The `<thead>` row className in `CirugiasTable.tsx` changes from `bg-muted/40` to `bg-muted`.
- The solid `bg-muted` background must cover scrolled table content when the header is sticky.
- No other header styling (sticky positioning, z-index, border-bottom) is modified.
- This is a single className change — no new components, no new constants, no conditional logic.

### 6.4 A3 — Consistent row height

- A shared `CELL_BASE` constant string is defined with the value `"px-2.5 py-1.5 min-h-[34px] align-middle"`.
- `CELL_BASE` is applied to all non-special `<td>` elements in `CirugiaRow.tsx`.
- Special cells that self-manage their own height and must NOT receive `CELL_BASE`:
  - `CirugiaStatusCell` (status badge — self-contained sizing)
  - `CirugiaPreparationCell` (preparation badge — self-contained sizing)
  - `CirugiaOperationalBadges` (composite 3-`<td>` badges — self-contained sizing)
  - `CirugiaActionsCell` (action button + dropdown — self-contained sizing)
  - `CircuitProgressCell` (mini-stepper dots — compact, self-contained sizing)
  - Date cell (single-line text, `CELL_BASE` applies normally)
  - All other plain-text `<td>` cells (paciente, profesional, institución, etc.) get `CELL_BASE`.
- `CELL_BASE` is defined in `src/lib/cirugias.constants.ts` and imported by `CirugiaRow.tsx`.
- After implementation, rows may shift visual rhythm slightly — browser QA verification is required (see risk R6 in PROPOSAL.md).

### 6.5 A4 — Rich empty state

- When `surgeryList` is empty (after filtering), `CirugiasTable.tsx` renders `CirugiasEmptyState` instead of the current plain `<td colSpan>` text.
- `CirugiasEmptyState` is a presentational component with the following interface:

```ts
interface CirugiasEmptyStateProps {
  onClearFilters?: () => void;
  onNewSurgery?: () => void;
  hasActiveFilters: boolean;
}
```

- Visual content:
  - Icon: empty-folder or search illustration (from lucide-react, already a dependency).
  - Message: "No se encontraron cirugías con los filtros aplicados" (preserves existing test regex at `CirugiasTable.test.tsx` line 170).
  - When `hasActiveFilters === true`: secondary text "Probá ajustar o limpiar los filtros" + "Limpiar filtros" button (calls `onClearFilters`).
  - Always: "Nueva cirugía" CTA button (calls `onNewSurgery`).
- Both `onClearFilters` and `onNewSurgery` are optional — the component renders the button only when the corresponding callback is provided.
- Styling uses existing shadcn/ui primitives and emerald/secondary/muted design tokens. No mockup palette, no hardcoded hex values.
- The existing test assertion `screen.getByText(/No se encontraron cirugías/)` MUST continue to pass — the message text is preserved.

### 6.6 B5 — Mini-stepper de progreso del circuito

#### 6.6.1 Data source and computation

- The circuit is computed by `getCircuitProgress()`, a pure function with no store coupling.
- Signature:

```ts
interface CircuitStage {
  key: 'cx' | 'pr' | 'nr' | 'consumo' | 'doc' | 'fact' | 'cobro';
  done: boolean;
  current: boolean;
}

function getCircuitProgress(
  surgery: Surgery,
  getPresupuestosBySurgeryId: (id: string) => Presupuesto[],
  getRemitosBySurgeryId: (id: string) => Remito[],
  getConsumoBySurgeryId: (id: string) => Consumo | undefined,
  getDocStatus: (id: string) => string,
  getResumenCobranzaBySurgeryId: (id: string) => ResumenCobranzaSurgery
): CircuitStage[];
```

- Stage computation logic:
  - `cx` — always `done: true` (surgery exists).
  - `pr` — `done` when `getPresupuestosBySurgeryId(surgery.id).length > 0`.
  - `nr` — `done` when `getRemitosBySurgeryId(surgery.id).length > 0`.
  - `consumo` — `done` when `getConsumoBySurgeryId(surgery.id)` is not `undefined`.
  - `doc` — `done` when `getDocStatus(surgery.id)` is `"Completa"` or `"Apta para facturar"`.
  - `fact` — `done` when `surgery.facturado === true`.
  - `cobro` — `done` when `getResumenCobranzaBySurgeryId(surgery.id).totalCobrado > 0`.
- The `current` stage is the first stage in order where `done === false`. If all stages are done, no stage is `current`.
- Devolución and Comparativa are excluded — they are not part of the `CircuitStage.key` union and are not computed.
- `getCircuitProgress` is defined in a new file `src/lib/circuit-progress.ts` (or appended to `src/lib/cirugias.utils.ts`).
- Computation is memoized per surgery in `page.tsx` via `useMemo` and passed as `circuitProgress` prop through `CirugiasTable` → `CirugiaRow` → `CircuitProgressCell`.

#### 6.6.2 Column wiring

- New column key `"circuitProgress"` added to:
  - `CIRUGIAS_COLUMNS` array in `src/lib/cirugias.constants.ts`.
  - `DEFAULT_VISIBLE_COLS` array.
  - `NON_SORTABLE_KEYS` array.
- Column label: `"Circuito"`.
- Column width: compact, ~120px (fits 7 dots with connectors).
- Not sticky — flows with the table body.
- Default visible: `true`.

#### 6.6.3 CircuitProgressCell component

- New file: `src/components/cirugias/CircuitProgressCell.tsx`.
- Purely presentational — receives `CircuitStage[]` props, no store access, no side effects.
- Interface:

```ts
interface CircuitProgressCellProps {
  stages: CircuitStage[];
}
```

- Visual: 7 horizontal dots connected by thin lines, each dot corresponding to one `CircuitStage.key`.
  - **Done**: solid emerald dot (`bg-emerald-500`), connecting line emerald.
  - **Current**: solid blue filled dot (`bg-blue-500`) with subtle pulse ring animation, connecting line up to this dot is emerald, after is muted.
  - **Pending**: muted outline dot (`border border-muted-foreground/30`), connecting line muted.
- Stage labels are not displayed inside the cell — dots only. A tooltip on hover may show the stage name (optional, design-phase decision).
- Width ~120px, height self-contained (not receiving `CELL_BASE`).

### 6.7 B6 — Fecha contextual

#### 6.7.1 formatContextualDate function

- New function added to `src/lib/formatters.ts` (additive — `formatDate` is preserved unchanged).
- Signature:

```ts
type ContextualDateVariant = 'today' | 'tomorrow' | 'yesterday' | 'overdue' | 'soon' | 'neutral';

interface ContextualDateResult {
  text: string;
  variant: ContextualDateVariant;
}

function formatContextualDate(date: string): ContextualDateResult;
```

- Logic:
  1. Parse `date` as `YYYY-MM-DD` (existing format used by surgery `date` field).
  2. Compare with `new Date()` at render time (client-side clock — acceptable for prototype, server clock deferred to GPT-027F.5A+).
  3. Compute difference in calendar days (ignoring time):
     - Same day → `{ text: "Hoy", variant: "today" }`
     - Tomorrow → `{ text: "Mañana", variant: "tomorrow" }`
     - Yesterday → `{ text: "Ayer", variant: "yesterday" }`
     - Past (>1 day ago) → `{ text: "Vencida hace Nd" if >7d else "Hace Nd", variant: "overdue" }`
     - Future within 3 days → `{ text: "En Nd", variant: "soon" }`
     - Future >3 days or past ambiguous → `{ text: formatDate(date), variant: "neutral" }`
  4. `formatDate` is called as fallback for the neutral variant text — existing function, unchanged.

- Export both `ContextualDateVariant` and `ContextualDateResult` types alongside the function.

#### 6.7.2 Date cell rendering

- In `CirugiaRow.tsx`, the `"date"` column cell switches from calling `formatDate` directly to calling `formatContextualDate` and rendering the result.
- Rendering contract:
  - The cell displays the `text` from `formatContextualDate`.
  - A `<span>` wraps the text with a Tailwind color class mapped from `variant`:
    - `today` → `text-blue-600 font-semibold`
    - `tomorrow` → `text-sky-500`
    - `overdue` → `text-amber-600`
    - `yesterday` → `text-muted-foreground`
    - `soon` → `text-foreground`
    - `neutral` → `text-muted-foreground`
  - The entire `<span>` carries a `title` attribute (native tooltip) showing the exact formatted date via `formatDate(date)`.
- The cell still receives `CELL_BASE` from A3 (plain-text cell).

### 6.8 B7 — Urgente como tinte de fila

#### 6.8.1 Row className logic

- When `s.urgente === true`, the `<tr>` in `CirugiaRow.tsx` receives urgency classes.
- The className priority contract (§6.9) governs precedence.
- Urgent classNames:
  - `bg-red-50/40` — subtle red background tint.
  - `border-l-[3px] border-l-red-400` — red left border accent.
- The urgency tint is ALWAYS active when `s.urgente === true` — it is not toggleable and does not depend on the Urgente column being visible.

#### 6.8.2 Sticky cell update for urgent rows

- Sticky cells (first columns: checkbox, paciente) have `stickyCellClasses` that normally use `bg-background` or `bg-primary/5`.
- For urgent rows, sticky cells must use `bg-red-50/60` — a slightly stronger red to be opaque and cover scrolled content while still conveying urgency.
- The `stickyCellClasses` function or conditional in `CirugiaRow.tsx` receives an `isUrgent` parameter.
- When `isSelected && isUrgent`, selection wins — sticky cells use `bg-primary/5`.

#### 6.8.3 Urgente column preservation

- The Urgente column remains in `CIRUGIAS_COLUMNS` and `DEFAULT_VISIBLE_COLS`.
- The column's badge rendering is unchanged.
- Users can toggle the column off via the column selector — the row tint remains active regardless.

### 6.9 ClassName priority contract

Row-level background classNames follow a strict priority. The `<tr>` className must be computed with this precedence (highest wins):

```
Selected > Urgent > Zebra > Base
```

Implementation in `CirugiaRow.tsx` (`cn()` call):

```tsx
<tr className={cn(
  // Priority 1: Selected
  isSelected && "bg-primary/5 border-l-[3px] border-l-primary",
  // Priority 2: Urgent (only if not selected)
  isUrgent && !isSelected && "bg-red-50/40 border-l-[3px] border-l-red-400",
  // Priority 3: Zebra — applied at table level via CSS nth-child (see A1).
  //   Table-level CSS is always behind direct tr className in specificity,
  //   so both Selected and Urgent override zebra automatically.
  // Priority 4: Base (default)
  "hover:bg-muted/30 transition-colors"
)}>
```

Zebra is NOT applied as a per-row className — the table-level CSS selector in `CirugiasTable.tsx` handles it. Since CSS specificity gives direct `tr` classNames precedence over table-level descendant selectors, Selected and Urgent automatically win over zebra without explicit conditionals.

### 6.10 No behavior change

- No user flow changes, no new submits, no new API calls, no new persistence, no new auto-apply paths.
- No validation behavior is modified.
- The existing `formatDate` function is preserved in its entirety.
- The existing Urgente badge in its column is preserved in its entirety.
- All Zustand store reads remain read-only — no new writes, no new slices, no new persistence keys.

---

## 7. Required User Experience

### 7.1 Data table scannability (Phase A)

When the coordinator opens the Cirugías data table, rows alternate between white and a subtle muted background (zebra striping), creating a visual rhythm that helps track horizontally across columns. The header row has a solid background that cleanly separates it from the body — content never bleeds through during horizontal scroll. Every row occupies a consistent height regardless of its content type (badges, plain text, actions), giving the table a uniform, predictable grid. When no surgeries match the current filters, an illustrated empty state appears with a clear message, a "Limpiar filtros" button (when filters are active), and a "Nueva cirugía" call-to-action.

### 7.2 Circuit progress visibility (Phase B — B5)

Each surgery row displays a compact mini-stepper of 7 dots representing the core circuit stages (CX, PR, NR, Consumo, Doc, Fact, Cobro). Completed stages show as solid green dots connected by green lines; the current active stage pulses in blue; and pending stages appear as muted outlines. The coordinator can scan the column vertically to quickly identify surgeries at different stages of the circuit without expanding the expediente.

### 7.3 Contextual date awareness (Phase B — B6)

The "Fecha CX" column no longer shows a flat `DD/MM/YYYY` date. Instead, it displays a human-readable relative label: "Hoy" in blue bold for today's surgeries, "Mañana" in sky blue, "Ayer" or "Vencida hace Nd" in amber for overdue surgeries, and "En Nd" for upcoming ones. Hovering over any date reveals the exact formatted date in a native tooltip. The coordinator can instantly assess the temporal urgency of each surgery without mentally computing date differences.

### 7.4 Urgency row signal (Phase B — B7)

Surgeries marked as urgent receive a subtle red tint across the entire row with a red left border accent. The Urgente badge column remains visible and toggleable, but the row-level tint provides an immediate visual signal during scanning — the coordinator does not need to locate the Urgente column to identify urgent surgeries. When a row is selected, the selection highlight (blue tint) takes visual precedence over the urgency tint.

---

## 8. Visual States

### 8.1 A1 — Zebra striping states

| State | Condition | className applied | Source |
|-------|-----------|-------------------|--------|
| Zebra (even) | Even row index, not selected, not urgent | `bg-muted/15` | Table-level CSS `[&_tbody_tr:nth-child(even)]:bg-muted/15` in `CirugiasTable.tsx` |
| Zebra overridden by Selected | Even row, selected | `bg-primary/5` | Direct `<tr>` className wins via specificity |
| Zebra overridden by Urgent | Even row, urgent | `bg-red-50/40` | Direct `<tr>` className wins via specificity |
| Base (odd) | Odd row, not selected, not urgent | transparent (default) | No zebra on odd rows |

### 8.2 A2 — Solid header states

| State | Condition | className |
|-------|-----------|-----------|
| Normal | Always | `bg-muted` |
| Sticky + scrolling | Header is sticky, body scrolls beneath | `bg-muted` (solid, covers scrolled content) |

No conditional states — the header is always solid.

### 8.3 A3 — Row height states

| Cell type | Height rule | className |
|-----------|-------------|-----------|
| Standard cells (text, date) | Enforced min-height | `CELL_BASE` = `px-2.5 py-1.5 min-h-[34px] align-middle` |
| Special cells (status, prep, badges, actions, circuit) | Self-managed | No `CELL_BASE` — component controls own height |
| All cells combined in a row | Row height = max(cell heights) | Consistent rhythm via `min-h-[34px]` on standard cells |

### 8.4 A4 — Empty state states

| State | Trigger | Rendered content |
|-------|---------|-----------------|
| No results, no filters | `surgeryList.length === 0 && !hasActiveFilters` | Icon + "No se encontraron cirugías con los filtros aplicados" + "Nueva cirugía" CTA |
| No results, active filters | `surgeryList.length === 0 && hasActiveFilters` | Icon + message + "Probá ajustar o limpiar los filtros" + "Limpiar filtros" button + "Nueva cirugía" CTA |
| Results present | `surgeryList.length > 0` | Empty state NOT rendered — normal table body shown |

### 8.5 B5 — Mini-stepper dot states

| Dot state | Condition | Visual |
|-----------|-----------|--------|
| Done | `stage.done === true` | Solid emerald dot (`bg-emerald-500`), emerald connecting line to next dot |
| Current | `stage.current === true` (first not-done) | Solid blue dot (`bg-blue-500`) with subtle pulse ring, emerald line from prev, muted line to next |
| Pending | `stage.done === false && stage.current === false` | Muted outline dot (`border border-muted-foreground/30`), muted connecting line |

### 8.6 B6 — Contextual date variant states

| Variant | Trigger (relative to today) | Text | Text color class |
|---------|----------------------------|------|-----------------|
| `today` | Same calendar day | "Hoy" | `text-blue-600 font-semibold` |
| `tomorrow` | +1 day | "Mañana" | `text-sky-500` |
| `yesterday` | -1 day | "Ayer" | `text-muted-foreground` |
| `overdue` | -Nd (past, N days ago) | "Hace Nd" or "Vencida hace Nd" (if N>7) | `text-amber-600` |
| `soon` | +2 to +3 days | "En Nd" | `text-foreground` |
| `neutral` | >3 days future or fallback | `formatDate(date)` (DD/MM/YYYY) | `text-muted-foreground` |

All variants carry a `title` attribute with the exact formatted date from `formatDate(date)`.

### 8.7 B7 — Urgent row tint states

| State | Condition | Row className | Sticky cell className |
|-------|-----------|---------------|----------------------|
| Not urgent | `s.urgente === false` | Base (zebra/selected applies normally) | `bg-background` or `bg-primary/5` |
| Urgent, not selected | `s.urgente === true && !isSelected` | `bg-red-50/40 border-l-[3px] border-l-red-400` | `bg-red-50/60` |
| Urgent, selected | `s.urgente === true && isSelected` | `bg-primary/5 border-l-[3px] border-l-primary` (selection wins) | `bg-primary/5` |
| Urgent, even row, not selected | `s.urgente === true && !isSelected && isEven` | `bg-red-50/40` (urgent wins over zebra) | `bg-red-50/60` |

---

## 9. Component Interfaces

### 9.1 CirugiasEmptyState

```ts
// src/components/cirugias/CirugiasEmptyState.tsx
interface CirugiasEmptyStateProps {
  /** Called when user clicks "Limpiar filtros". Rendered only when provided + hasActiveFilters is true. */
  onClearFilters?: () => void;
  /** Called when user clicks "Nueva cirugía". Rendered only when provided. */
  onNewSurgery?: () => void;
  /** Whether any filter is currently active. Controls secondary text + "Limpiar filtros" button visibility. */
  hasActiveFilters: boolean;
}
```

### 9.2 CircuitProgressCell

```ts
// src/components/cirugias/CircuitProgressCell.tsx
interface CircuitStage {
  key: 'cx' | 'pr' | 'nr' | 'consumo' | 'doc' | 'fact' | 'cobro';
  done: boolean;
  current: boolean;
}

interface CircuitProgressCellProps {
  stages: CircuitStage[];
}
```

### 9.3 getCircuitProgress

```ts
// src/lib/circuit-progress.ts
function getCircuitProgress(
  surgery: Surgery,
  getPresupuestosBySurgeryId: (id: string) => Presupuesto[],
  getRemitosBySurgeryId: (id: string) => Remito[],
  getConsumoBySurgeryId: (id: string) => Consumo | undefined,
  getDocStatus: (id: string) => string,
  getResumenCobranzaBySurgeryId: (id: string) => ResumenCobranzaSurgery
): CircuitStage[];
```

### 9.4 formatContextualDate

```ts
// src/lib/formatters.ts (additive)
type ContextualDateVariant = 'today' | 'tomorrow' | 'yesterday' | 'overdue' | 'soon' | 'neutral';

interface ContextualDateResult {
  text: string;
  variant: ContextualDateVariant;
}

function formatContextualDate(date: string): ContextualDateResult;
```

### 9.5 CELL_BASE constant

```ts
// src/lib/cirugias.constants.ts (additive)
export const CELL_BASE = "px-2.5 py-1.5 min-h-[34px] align-middle";
```

### 9.6 Props threading contract

New props flow through the existing component tree:

```
page.tsx
  → CirugiasTable
    props: {
      // ... existing
      circuitProgressMap?: Record<string, CircuitStage[]>;  // surgeryId → stages
      onClearFilters?: () => void;                           // A4
      onNewSurgery?: () => void;                             // A4
      hasActiveFilters: boolean;                             // A4
    }
    → CirugiaRow
      props: {
        // ... existing
        circuitProgress?: CircuitStage[];   // B5 — undefined if column hidden
        isUrgent: boolean;                  // B7 — already exists as s.urgente
        isSelected: boolean;                // already exists
        rowIndex: number;                   // existing — needed for zebra awareness (odd/even detection for sticky cell logic, not zebra itself)
      }
```

Zebra (`isEven`) is NOT passed as a prop — the table-level CSS selector handles it. `rowIndex` is used only for sticky cell edge cases where even/odd awareness is needed for the cell background.

---

## 10. Persistence and Internal Boundaries

- Phase A + B introduces no persistence. All items are presentational and read existing in-component or store state.
- No server-side boundary is added, modified, or invoked. No API routes are touched.
- No new Zustand slice, no new localStorage key, no new client-side store is introduced.
- `page.tsx` computes `circuitProgress` via `useMemo` — this is transient computation, not persisted state.
- Internal boundaries to validators, services, providers, and types are respected: Phase A + B components must not import or call into `src/lib/validators/**`, `src/lib/services/**`, or `src/app/api/**` beyond what the current implementation already does.
- `src/lib/formatters.ts` receives an additive function (`formatContextualDate`) — the existing `formatDate` is preserved byte-for-byte.

---

## 11. Guardrails

- No touch to `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`, `src/app/api/**`, validators, services, providers.
- No new dependencies installed — AGENTS.md §11 prohibition active.
- No schema, migration, or auth changes — AGENTS.md §5/§11 prohibitions active.
- No Cirugías refactor beyond additive presentation. Prefer small presentational sub-components over restructuring.
- No touch to `NewSurgeryDialog.tsx` or any dialog files — another session owns them. Zero touch.
- Ownership lock required on all critical/high-risk files before any edit, per AGENTS.md §10 and §9.3. The lock declares task, agent role, selected model, owned files, and status (`reserved` → `editing` → `review` → `released`).
- No two agents may write to the same critical file at the same time — AGENTS.md §9.3.
- Emerald/shadcn design system only — no mockup palettes, no hardcoded hex values.
- `formatDate` is preserved — `formatContextualDate` is an additive wrapper. Never modify `formatDate`'s implementation.
- Existing test assertions must pass unchanged (see §13 Test Requirements).
- No Prisma format/generate, no build pipeline changes, no Tailwind CDN.
- If scope expands, a critical-file overlap appears, or an approval boundary is crossed, the implementer must stop and escalate per AGENTS.md §9.5/§9.6.

---

## 12. Acceptance Criteria

### AC-A1-01 — Zebra striping alternates row backgrounds on unselected rows

On the Cirugías data table, even-indexed rows (within `<tbody>`) display a `bg-muted/15` background. Odd rows display no additional background. The zebra pattern is applied via a single table-level CSS selector `[&_tbody_tr:nth-child(even)]:bg-muted/15` in `CirugiasTable.tsx` — no per-row prop or index is used.

### AC-A1-02 — Selection and urgency override zebra

When a row is selected (`isSelected === true`), its background is `bg-primary/5` regardless of zebra. When a row is urgent and not selected (`isUrgent === true && !isSelected`), its background is `bg-red-50/40` regardless of zebra. The table-level CSS selector does not override direct `<tr>` classNames because CSS specificity gives direct classNames precedence.

### AC-A2-01 — Header background is solid and opaque

The `<thead>` row in `CirugiasTable.tsx` uses `bg-muted` (solid) instead of the previous `bg-muted/40` (40% opacity). No content from the table body is visible through the header during horizontal scroll.

### AC-A2-02 — Header change is a single className replacement

The change from `bg-muted/40` to `bg-muted` is the ONLY modification to the `<thead>` element. No other header attributes (sticky positioning, z-index, border-bottom, column widths) are changed.

### AC-A3-01 — Standard cells enforce consistent min-height

All non-special `<td>` elements in `CirugiaRow.tsx` receive the `CELL_BASE` constant (`"px-2.5 py-1.5 min-h-[34px] align-middle"`). Every row in the table has a minimum height of 34px contributed by these standard cells.

### AC-A3-02 — Special cells are excluded from CELL_BASE enforcement

Cells rendered by `CirugiaStatusCell`, `CirugiaPreparationCell`, `CirugiaOperationalBadges`, `CirugiaActionsCell`, and `CircuitProgressCell` do NOT receive `CELL_BASE` — they self-manage their own height. The row height is determined by the tallest cell; rhythm is maintained because standard cells enforce the consistent minimum.

### AC-A4-01 — Rich empty state renders with icon, message, and conditional CTAs

When `surgeryList` is empty, `CirugiaTable.tsx` renders `CirugiasEmptyState` instead of a plain `<td colSpan>`. The component displays an icon, the message "No se encontraron cirugías con los filtros aplicados", and conditional buttons: "Limpiar filtros" only when `hasActiveFilters === true` and `onClearFilters` is provided; "Nueva cirugía" only when `onNewSurgery` is provided.

### AC-A4-02 — Existing empty-state test assertion continues to pass

The test at `CirugiasTable.test.tsx` line 170 (`screen.getByText(/No se encontraron cirugías/)`) continues to match because the message text is preserved verbatim in `CirugiasEmptyState`.

### AC-B5-01 — Mini-stepper renders 7 dots with correct done/current/pending states

The `CircuitProgressCell` component renders exactly 7 dots (cx, pr, nr, consumo, doc, fact, cobro). Each dot displays the correct visual state: done stages are emerald solid, the first non-done stage is blue with a pulse animation, and all subsequent stages are muted outlines. The `getCircuitProgress()` function computes these states correctly using only the 5 provided store-helper functions.

### AC-B5-02 — getCircuitProgress is a pure function with no store coupling

`getCircuitProgress()` receives all data via its function parameters (surgery, 5 store-helpers). It does not import `useOrtoTrackStore`, does not call Zustand hooks, and produces deterministic output for the same inputs. The function is defined in `src/lib/circuit-progress.ts` and is testable in isolation.

### AC-B5-03 — New column is wired into column constants

The key `"circuitProgress"` is present in `CIRUGIAS_COLUMNS`, `DEFAULT_VISIBLE_COLS`, and `NON_SORTABLE_KEYS`. The column is visible by default (~120px width) and cannot be sorted. The column label reads "Circuito".

### AC-B6-01 — Date cell displays relative label with correct color variant

The "Fecha CX" column renders the relative label from `formatContextualDate(date).text` wrapped in a `<span>` with the Tailwind color class matching the variant: "Hoy" → blue bold, "Mañana" → sky, overdue → amber, neutral → muted-foreground. The `formatContextualDate` function is added to `src/lib/formatters.ts` and `formatDate` is preserved unchanged.

### AC-B6-02 — Exact date is accessible via tooltip

The date cell's `<span>` carries a `title` attribute showing the exact formatted date from `formatDate(date)` (e.g., "24/06/2026"). Hovering over the relative label displays the native browser tooltip with the exact date.

### AC-B7-01 — Urgent rows show red tint with red left border

When `s.urgente === true` and the row is not selected, the `<tr>` receives `bg-red-50/40` and `border-l-[3px] border-l-red-400`. Sticky cells in urgent rows receive `bg-red-50/60` to remain opaque while conveying urgency.

### AC-B7-02 — ClassName priority follows Selected > Urgent > Zebra > Base

When a row is both selected and urgent, selection classes (`bg-primary/5`) are applied — urgency classes are suppressed. When a row is urgent but not selected, urgency classes (`bg-red-50/40`) are applied — zebra is suppressed. When a row is neither selected nor urgent, zebra applies on even rows. The priority is enforced via conditional `cn()` logic in `CirugiaRow.tsx`.

### AC-CROSS-01 — Blocked source trees are not modified

No file under `prisma/`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`, `src/app/api/`, `src/lib/validators/`, or `src/lib/services/` is modified. `src/lib/formatters.ts` receives only an additive function — `formatDate` is not modified. `src/lib/cirugias.constants.ts` receives only additive constants — existing constants are not modified. `src/lib/circuit-progress.ts` is a new file. `src/lib/cirugias.utils.ts` may receive `getCircuitProgress` if the design phase elects to append rather than create a new file.

### AC-CROSS-02 — All existing test assertions pass unchanged

The 4 existing test files — `CirugiasTable.test.tsx`, `cirugias-estado-prep-separation.test.ts`, `cirugia-creation.test.ts`, `post-creation-actions.test.ts` — pass all assertions without modification. Specifically: `CirugiasTable.test.tsx` line 170 regex still matches, line 225 `toHaveClass("bg-primary/5")` still passes, line 130 row count assertion still passes.

### AC-CROSS-03 — TypeScript compiles clean with no errors

`npx tsc --noEmit` produces zero errors. All new components, functions, and interfaces are properly typed and exported.

### AC-CROSS-04 — New test files exist with meaningful coverage

Four new test files exist:
- `src/__tests__/unit/circuit-progress.test.ts` — covers all 7 stages, edge cases (no stages done, all stages done, empty helpers).
- `src/__tests__/components/CircuitProgressCell.test.tsx` — covers done/current/pending dot rendering and 7-dot count.
- `src/__tests__/components/CirugiasEmptyState.test.tsx` — covers with-filters, without-filters, CTA click, missing optional callbacks.
- `src/__tests__/unit/formatContextualDate.test.ts` — covers all 6 variants, edge dates, and `formatDate` fallback.

### AC-CROSS-05 — NewSurgeryDialog.tsx and all dialog files are untouched

Zero bytes changed in `NewSurgeryDialog.tsx` and any file under `src/components/cirugias/dialogs/`. The file lock held by the other session is fully respected.

### AC-CROSS-06 — File locks for critical files are declared before edits

Before any edit to a critical or high-risk file (per AGENTS.md §10), an ownership lock is declared with: task ID, agent role, selected model, owned files, and status (`reserved`). The lock follows the lifecycle: `reserved` → `editing` → `review` → `released`.

---

## 13. Test Requirements

### 13.1 Existing tests — must pass unchanged

These test files must pass all existing assertions without any modification:

| Test file | Reason safe | Validated assertion |
|-----------|-------------|---------------------|
| `src/__tests__/components/CirugiasTable.test.tsx` | Message text preserved; selection class preserved; row count unchanged | Lines 170, 225, 130 |
| `src/__tests__/unit/cirugias-estado-prep-separation.test.ts` | No change to CX_STATE_COLORS or CX_STATE_CELL_COLORS | Color class assertions |
| `src/__tests__/unit/cirugia-creation.test.ts` | Surgery creation logic, not visual | All |
| `src/__tests__/unit/post-creation-actions.test.ts` | Post-creation actions, not visual | All |

**Note:** `CirugiasTable.test.tsx`'s `createTableProps()` factory MAY need a `circuitProgress` mock prop if the prop is added to the `CirugiasTableProps` interface. The factory should provide an empty default (`{}`) or optional prop so existing tests compile without changes to test logic. The `columnOrder` factory auto-includes new columns via `CIRUGIAS_COLUMNS.map(c => c.key)` — no explicit update needed.

### 13.2 New test files required

| Test file | Type | Coverage target |
|-----------|------|----------------|
| `src/__tests__/unit/circuit-progress.test.ts` | Unit | `getCircuitProgress()` — all 7 stages, edge cases (no stages done, all done, empty helpers) |
| `src/__tests__/components/CircuitProgressCell.test.tsx` | Component | Render done/current/pending dots, dot count = 7, prop passthrough |
| `src/__tests__/components/CirugiasEmptyState.test.tsx` | Component | Render with/without filters, CTA click handlers, missing optional callbacks |
| `src/__tests__/unit/formatContextualDate.test.ts` | Unit | All 6 ContextualDateVariants, edge dates (today, tomorrow, yesterday, far future, far past), `formatDate` fallback |

### 13.3 Test constraints

- No mocking of `useOrtoTrackStore` beyond existing patterns in the test suite.
- Visual snapshot tests are NOT required (Jest DOM assertions are sufficient).
- Animation/pulse tests for the CircuitProgressCell current dot may use `toHaveClass` assertions on the pulse ring element.

---

## 14. File Lock Requirements

Per AGENTS.md §10 and §9.3, the following files require explicit ownership lock before any edit. The lock must declare: task ID, agent role, selected model, owned files, and status.

### Critical files (Lock obligatorio / muy alto riesgo)

| File | Lock required for | Phase |
|------|-------------------|-------|
| `src/components/cirugias/CirugiasTable.tsx` | A1 zebra CSS, A2 solid header, A4 empty state, B5 column wiring, B5 circuitProgress prop threading | A + B |
| `src/components/cirugias/CirugiaRow.tsx` | A3 CELL_BASE, B6 date cell, B7 urgency className + sticky cells, B5 circuit cell render | A + B |
| `src/lib/cirugias.constants.ts` | B5 column key, DEFAULT_VISIBLE_COLS, NON_SORTABLE_KEYS, CELL_BASE constant | B (+ A3 constant) |
| `src/components/cirugias/CirugiaActionsCell.tsx` | NONE — Phase C only, out of scope | — |
| `src/components/cirugias/CirugiaOperationalBadges.tsx` | A3 height normalization only (low impact, may not need changes) | A |

### High-risk files (coordinar ownership por carpeta)

| File | Lock required for | Phase |
|------|-------------------|-------|
| `src/app/cirugias/page.tsx` | B5 circuitProgress computation + empty state callbacks | B |
| `src/lib/formatters.ts` | B6 add `formatContextualDate` (additive only) | B |

### New files (no existing lock conflict)

| File | Phase |
|------|-------|
| `src/components/cirugias/CirugiasEmptyState.tsx` | A |
| `src/components/cirugias/CircuitProgressCell.tsx` | B |
| `src/lib/circuit-progress.ts` | B |

### Files with external lock — ZERO TOUCH

| File | Locked by | Reason |
|------|-----------|--------|
| `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` | Other session | Another agent owns this file |
| Any file under `src/components/cirugias/dialogs/` | Other session | Dialog lock scope |

---

## 15. Success Criteria

From PROPOSAL.md §Success criteria, all 10 items are encoded in acceptance criteria above:

1. ✅ AC-A1-01/02, AC-A2-01/02, AC-A3-01/02, AC-A4-01/02 — Phase A items visually verified.
2. ✅ AC-B5-01/02/03 — Phase B mini-stepper renders 7 dots with correct states.
3. ✅ AC-B6-01/02 — Fecha contextual displays relative labels with color variants and tooltip.
4. ✅ AC-B7-01 — Urgent rows show red tint while column remains toggleable.
5. ✅ AC-CROSS-02 — All existing test assertions pass unchanged.
6. ✅ AC-CROSS-04 — New test files exist with meaningful coverage.
7. ✅ AC-CROSS-03 — TypeScript compiles clean.
8. ✅ AC-CROSS-01 — No Prisma format/generate, no migration, no schema change, no auth change.
9. ✅ AC-CROSS-06 — File locks declared and respected.
10. ✅ AC-CROSS-05 — NewSurgeryDialog.tsx and dialog files untouched.

---

## 16. Implementation Notes for Next Phase (sdd-design)

- **Component tree change:** Two new leaf cells (`CirugiasEmptyState`, `CircuitProgressCell`) mount under `CirugiasTable`. One new pure function file (`circuit-progress.ts`). One new additive function in `formatters.ts`. One new constant in `cirugias.constants.ts`.
- **Data flow for circuitProgress:** `page.tsx` calls `getCircuitProgress()` per surgery inside `useMemo`, producing `Record<string, CircuitStage[]>`. This map is passed to `CirugiasTable` which looks up per-surgery stages when rendering `CirugiaRow`. `CirugiaRow` passes stages to `CircuitProgressCell`.
- **Sticky cell className logic for B7:** The existing `stickyCellClasses` pattern in `CirugiaRow.tsx` must accept `isUrgent` and `isSelected` to compute the correct background. When `isSelected`, selection bg wins. When `isUrgent && !isSelected`, `bg-red-50/60`. Otherwise, `bg-background`.
- **New column wiring in CIRUGIAS_COLUMNS:** The design phase must specify the exact column definition object: `{ key: "circuitProgress", label: "Circuito", defaultVisible: true, sortable: false, width: 120 }` (or equivalent field names matching the existing `CIRUGIAS_COLUMNS` structure).
- **Zebra CSS placement:** The `[&_tbody_tr:nth-child(even)]:bg-muted/15` selector goes on the `<table>` element's className in `CirugiasTable.tsx`. The design phase should verify the exact className string against the existing `<table>` JSX.
- **CELL_BASE application pattern:** The design phase should specify exactly which `<td>` render cases in `CirugiaRow.tsx`'s `renderCell()` switch receive `CELL_BASE` and which do not.
- **Testing strategy detail:** The design phase should map each test file to its coverage scope and define mock data shapes for `CircuitStage[]` and `ContextualDateResult`.
- **No Prisma, no migrations, no backend, no auth, no dialog changes** — these prohibitions carry forward into design and tasks.
- **Design system:** Use existing shadcn/ui + emerald tokens. Do NOT introduce any hex color values or new CSS custom properties. All colors must be Tailwind classes from the existing theme.

---

## Caveman Handoff

```text
Done:
- SPEC.md written for CIRUGIAS-DATATABLE-VISUAL-P1 covering all 7 items (A1-A4, B5-B7)
- 15 acceptance criteria (at least 2 per item + 6 cross-cutting)
- Visual state tables for all 7 items (zebra, header, height, empty, stepper dots, date variants, urgent tint)
- Component interface definitions for CirugiasEmptyState, CircuitProgressCell, getCircuitProgress, formatContextualDate, CELL_BASE
- ClassName priority contract: Selected > Urgent > Zebra > Base
- Three Franco-approved decisions (D1, D2, D3) referenced throughout product rules
- File lock requirements table mapped per AGENTS.md §10
- Test requirements: 4 existing files preserved, 4 new test files specified
- Out of scope declarations: Phase C/D, NewSurgeryDialog, backend/DB/auth, Devolución/Comparativa

Changed:
- Created: knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/SPEC.md

Files:
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/SPEC.md — specification artifact (this file)
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/PROPOSAL.md — input (unchanged)
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/EXPLORATION.md — input (unchanged)
- knowledge/specs/NUEVA-CIRUGIA-IA-UX-P1/SPEC.md — format reference (unchanged)

Validations:
- Format follows NUEVA-CIRUGIA-IA-UX-P1/SPEC.md pattern (header, summary, scope, product rules, UX, states, interfaces, persistence, guardrails, ACs, tests, locks, implementation notes, caveman)
- All 7 items have ≥2 acceptance criteria (A1=2, A2=2, A3=2, A4=2, B5=3, B6=2, B7=2) + 6 cross-cutting = 21 total
- Three Franco decisions (D1, D2, D3) referenced in dedicated §5 and cross-referenced in product rules
- File lock requirements map all critical/high-risk files per AGENTS.md §10
- Out of scope explicitly declares Phase C/D, NewSurgeryDialog, backend/DB/auth, Devolución/Comparativa
- 10 success criteria from PROPOSAL.md mapped to acceptance criteria
- AGENTS.md §5/§11 prohibitions confirmed: UI-pure, no backend/DB/auth, no new dependencies

Risks:
- R1: Mini-stepper 7-store-lookups-per-row — useMemo mitigation in page.tsx, flagged for backend phase
- R4: Persisted Zustand column visibility may not show new circuitProgress column — useColumnVisibility handles gracefully
- R6: Row min-height visual rhythm shift — needs browser QA after implementation
- R7: Zero regression coverage for new components — 4 new test files specified in §13.2

Next:
- Proceed to sdd-design for CIRUGIAS-DATATABLE-VISUAL-P1 (generate DESIGN.md from this spec)
```
