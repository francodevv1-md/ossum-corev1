# Design — CIRUGIAS-DATATABLE-VISUAL-P1

Status: designed
Change: `CIRUGIAS-DATATABLE-VISUAL-P1`
Workspace: `E:/OSSUM_COR_PROJECT`
Artifact chain: EXPLORATION → PROPOSAL → SPEC → **DESIGN** → TASKS → APPLY
Phase: A + B — UI-pure presentational polish

---

## 1. Design Summary

This design translates the SPEC.md into precise technical decisions for 7 visual-polish items (A1–A4 + B5–B7). Every change is additive, presentational, and reads existing component state. Zero business logic, zero backend, zero auth, zero dialog-file changes. The component tree stays `page.tsx → CirugiasTable → CirugiaRow → sub-cells`. Three new presentational files are created, one new pure-function file, two constant additions, and one additive function in an existing file. Six existing files receive targeted modifications.

All design decisions trace to SPEC.md acceptance criteria (AC-A1 through AC-CROSS-06). File-lock requirements from SPEC.md §14 are carried forward: critical files (`CirugiasTable.tsx`, `CirugiaRow.tsx`, `cirugias.constants.ts`) require explicit ownership lock before any edit.

---

## 2. Component Tree — Before → After

### Before (current)

```
page.tsx
  └─ CirugiasTable (table shell)
       ├─ <thead> — column headers
       ├─ <tbody>
       │   ├─ CirugiaRow (× N surgeries)
       │   │   ├─ CirugiaStatusCell        ← "state" col
       │   │   ├─ CirugiaPreparationCell   ← "preparationState" col
       │   │   ├─ CirugiaOperationalBadges ← "doc"/"consumo"/"facturado" cols (composite)
       │   │   └─ CirugiaActionsCell       ← "actions" col
       │   │   └─ inline <td> cells        ← other 15 columns (plain text/badges)
       │   └─ <td colSpan> plain text      ← empty state (no surgeries match)
       └─ floating scroll buttons
```

### After (this change)

```
page.tsx
  └─ CirugiasTable (table shell + circuitProgressMap + empty state callbacks)
       ├─ <thead className="...bg-muted...">  ← A2: solid(was bg-muted/40)
       ├─ <tbody>
       │   ├─ CirugiaRow (× N surgeries)
       │   │   ├─ CirugiaStatusCell              ← unchanged
       │   │   ├─ CirugiaPreparationCell         ← unchanged
       │   │   ├─ CirugiaOperationalBadges       ← unchanged
       │   │   ├─ CircuitProgressCell            ← B5: NEW — 7-dot stepper
       │   │   ├─ CirugiaActionsCell             ← unchanged
       │   │   ├─ date <td> — contextual date    ← B6: formatContextualDate
       │   │   ├─ standard <td> cells + CELL_BASE ← A3: min-h enforcement
       │   │   └─ <tr> className — urgency tint  ← B7: bg-red-50/40 when urgent
       │   └─ CirugiasEmptyState                 ← A4: NEW — rich empty state
       └─ floating scroll buttons                ← unchanged
```

**New leaf components:** `CirugiasEmptyState`, `CircuitProgressCell`
**New pure function files:** `src/lib/circuit-progress.ts`
**New constant:** `CELL_BASE` (in cirugias.constants.ts)
**New additive function:** `formatContextualDate` (in formatters.ts)
**New column key:** `"circuitProgress"` (in CIRUGIAS_COLUMNS, DEFAULT_VISIBLE_COLS, NON_SORTABLE_KEYS)

---

## 3. Data Flow

### 3.1 circuitProgress computation and prop threading (B5)

```
page.tsx
  │  useMemo(() => {
  │    for each surgery in store.surgeries (or filtered):
  │      getCircuitProgress(
  │        s,
  │        store.getPresupuestosBySurgeryId,   // (id: string) => Presupuesto[]
  │        store.getRemitosBySurgeryId,        // (id: string) => Remito[]
  │        store.getConsumoBySurgeryId,        // (id: string) => Consumo | undefined
  │        store.getDocStatus,                 // (id: string) => string
  │        store.getResumenCobranzaBySurgeryId // (id: string) => ResumenCobranzaSurgery
  │      ) → CircuitStage[]
  │    produces: Record<string, CircuitStage[]>  // surgeryId → stages
  │  }, [store.surgeries, store])
  │
  ├─ circuitProgressMap passed to CirugiasTable
  │    new prop: circuitProgressMap?: Record<string, CircuitStage[]>
  │
  └─ CirugiasTable → CirugiaRow
       │  lookup: circuitProgressMap[surgery.id] → CircuitStage[] | undefined
       │  new prop: circuitProgress?: CircuitStage[]
       │
       └─ CirugiaRow → CircuitProgressCell
            prop: stages: CircuitStage[]
            (only when "circuitProgress" column is visible)
```

**Store function stability:** Zustand methods have stable references — they do not change across renders. This means `getCircuitProgress` receives stable function references and the `useMemo` dependency on `store` changes only when surgery data changes (new surgery created, state changed, etc.), which is the correct re-computation trigger.

**Scope decision:** The `useMemo` iterates `store.surgeries` (the full unfiltered list), not `filtered` (filtered list). Rationale: circuit progress is an intrinsic property of the surgery record, not of the current filter view. Computing on all surgeries avoids re-computation when filters change but surgery data doesn't. At prototype scale (~50–200 records), the performance difference is negligible.

### 3.2 Date formatting flow (B6)

```
CirugiaRow.tsx — "date" case in renderCell()
  │
  ├─ import { formatDate, formatContextualDate } from "@/lib/formatters"
  │
  ├─ formatContextualDate(s.date)
  │    → { text: string, variant: ContextualDateVariant }
  │
  ├─ Variant → Tailwind color class mapping:
  │    today    → "text-blue-600 font-semibold"
  │    tomorrow → "text-sky-500"
  │    overdue  → "text-amber-600"
  │    yesterday → "text-muted-foreground"
  │    soon     → "text-foreground"
  │    neutral  → "text-muted-foreground"
  │
  └─ <td> renders:
       <span className={variantColorClass} title={formatDate(s.date)}>
         {result.text}
       </span>
```

**formatDate preservation:** `formatDate` is imported as before and called only for:
1. The `title` attribute (native tooltip — exact date)
2. Fallback in `formatContextualDate` for the `neutral` variant

**Why not a memo for dates?** The cell renders `formatContextualDate(s.date)` synchronously on every render of CirugiaRow, which compares `s.date` with `new Date()`. Client-side clock differences across renders are expected (the label may change when a new day starts). Memoization per-surgery would require invalidating all memos at midnight — overengineering for prototype.

### 3.3 Urgency propagation (B7)

```
CirugiaRow.tsx
  │
  ├─ const isUrgent = s.urgente   (already available from surgery prop)
  │
  ├─ <tr> className:
  │    cn(
  │      isSelected && "bg-primary/5 border-l-[3px] border-l-primary",          // Priority 1
  │      isUrgent && !isSelected && "bg-red-50/40 border-l-[3px] border-l-red-400", // Priority 2
  │      "hover:bg-muted/30 transition-colors"                                    // Priority 4 (base)
  │      // Priority 3 (zebra) via table-level CSS nth-child — auto-overridden
  │      // by direct tr classNames (Priority 1 and 2 always win).
  │    )
  │
  └─ Sticky cells:
       stickyCellClasses(isSticky, isSelected, isLastLeft, isRight, isUrgent?)
         → isUrgent && !isSelected → "bg-red-50/60"
         → isSelected               → "bg-primary/5"
         → otherwise                → "bg-background"
```

**Zebra override model:** CSS specificity ensures direct `<tr>` className always beats table-level `[&_tbody_tr:nth-child(even)]` selector. No explicit `isEven` prop needed. No rowIndex prop needed for sticky cells (they always use solid backgrounds).

---

## 4. Component Design — Detailed Specifications

### 4.1 CirugiasEmptyState (NEW — A4)

**File:** `src/components/cirugias/CirugiasEmptyState.tsx`

**Interface (matches SPEC.md §9.1):**
```ts
interface CirugiasEmptyStateProps {
  onClearFilters?: () => void;
  onNewSurgery?: () => void;
  hasActiveFilters: boolean;
}
```

**Rendering:**

```tsx
"use client"
import { FolderSearch } from "lucide-react"  // empty state icon
import { Button } from "@/components/ui/button"

export function CirugiasEmptyState({
  onClearFilters,
  onNewSurgery,
  hasActiveFilters,
}: CirugiasEmptyStateProps) {
  return (
    <tr>
      <td colSpan={100} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
          {/* Icon */}
          <FolderSearch className="size-10 text-muted-foreground/40" />

          {/* Primary message — preserves existing test regex */}
          <p className="text-sm text-muted-foreground">
            No se encontraron cirugías con los filtros aplicados
          </p>

          {/* Secondary hint — only when filters are active */}
          {hasActiveFilters && (
            <>
              <p className="text-xs text-muted-foreground/70">
                Probá ajustar o limpiar los filtros
              </p>
              {onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </>
          )}

          {/* Always-available CTA */}
          {onNewSurgery && (
            <Button variant="default" size="sm" onClick={onNewSurgery}>
              Nueva cirugía
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
```

**Design decisions:**
- `colSpan={100}` — safe upper bound; the component is wrapped in a `<tr>` inside `<tbody>`. Using a large fixed number avoids computing column count inside the component (keeps it dumb).
- `FolderSearch` icon from lucide-react — already a project dependency. Represents "searching but not finding".
- Both buttons only render when their callbacks are provided (optional props).
- `hasActiveFilters` controls secondary text + "Limpiar filtros" visibility.
- Styling uses existing `muted-foreground` tokens — no hex, no mockup palette.
- Message text "No se encontraron cirugías con los filtros aplicados" is verbatim from current line 232 of CirugiasTable.tsx → preserves test regex.

---

### 4.2 CircuitProgressCell (NEW — B5)

**File:** `src/components/cirugias/CircuitProgressCell.tsx`

**Interface (matches SPEC.md §9.2):**
```ts
import type { CircuitStage } from "@/lib/circuit-progress"

interface CircuitProgressCellProps {
  stages: CircuitStage[];
}
```

**Rendering — 7 horizontal dots with connectors:**

```tsx
"use client"
import { cn } from "@/lib/utils"
import type { CircuitStage } from "@/lib/circuit-progress"

// Stage display order (left → right)
const STAGE_ORDER: CircuitStage["key"][] = ["cx", "pr", "nr", "consumo", "doc", "fact", "cobro"]

function Dot({ stage }: { stage: CircuitStage }) {
  return (
    <span
      className={cn(
        "inline-block size-2.5 rounded-full shrink-0 transition-colors",
        stage.done && "bg-emerald-500",
        stage.current && !stage.done && "bg-blue-500 ring-2 ring-blue-500/30 animate-pulse",
        !stage.done && !stage.current && "border border-muted-foreground/30 bg-transparent",
      )}
    />
  )
}

function Connector({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "inline-block w-3 h-px shrink-0",
        done ? "bg-emerald-400" : "bg-muted-foreground/20",
      )}
    />
  )
}

export function CircuitProgressCell({ stages }: CircuitProgressCellProps) {
  // Build ordered array from known stage keys
  const stageMap = new Map(stages.map(s => [s.key, s]))

  return (
    <td className="px-2 py-1.5">
      <div className="flex items-center gap-0 min-w-[120px] h-5">
        {STAGE_ORDER.map((key, i) => {
          const stage = stageMap.get(key)
          if (!stage) return null
          return (
            <React.Fragment key={key}>
              <Dot stage={stage} />
              {i < STAGE_ORDER.length - 1 && (
                <Connector done={stage.done} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </td>
  )
}
```

**Design decisions:**
- Self-contained `<td>` — the cell renders its own `<td>` wrapper (matching the pattern of `CirugiaStatusCell`, `CirugiaPreparationCell`, and `CirugiaActionsCell` which all render `<td>`).
- Does NOT receive `CELL_BASE` — self-manages height (compact ~20px dot line + py-1.5).
- `React.Fragment` keyed on stage key — avoids array index keys.
- `min-w-[120px]` on the flex container — ensures column width is compact but accommodates 7 dots + 6 connectors.
- Connector color follows the LEFT dot: if the left dot is done, connector is emerald; if pending, connector is muted. This creates a continuous visual flow where the line color progresses with the circuit.
- Pulse animation on current dot via Tailwind `animate-pulse` — already available in the Tailwind theme (no new animations needed).
- Tooltip showing stage name is NOT included (SPEC.md §6.6.3 says "optional, design-phase decision" — defer to implementation phase; if requested, use shadcn/ui Tooltip on each dot with stage name from a lookup map).

---

### 4.3 getCircuitProgress (NEW — B5)

**File:** `src/lib/circuit-progress.ts`

**Types:**
```ts
export interface CircuitStage {
  key: "cx" | "pr" | "nr" | "consumo" | "doc" | "fact" | "cobro";
  done: boolean;
  current: boolean;
}
```

**Function signature (matches SPEC.md §9.3):**
```ts
import type { Surgery, Presupuesto, Remito, Consumo } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"

export function getCircuitProgress(
  surgery: Surgery,
  getPresupuestosBySurgeryId: (id: string) => Presupuesto[],
  getRemitosBySurgeryId: (id: string) => Remito[],
  getConsumoBySurgeryId: (id: string) => Consumo | undefined,
  getDocStatus: (id: string) => string,
  getResumenCobranzaBySurgeryId: (id: string) => ResumenCobranzaSurgery,
): CircuitStage[] {
  const stages: Omit<CircuitStage, "current">[] = [
    { key: "cx",     done: true },
    { key: "pr",     done: getPresupuestosBySurgeryId(surgery.id).length > 0 },
    { key: "nr",     done: getRemitosBySurgeryId(surgery.id).length > 0 },
    { key: "consumo", done: getConsumoBySurgeryId(surgery.id) !== undefined },
    { key: "doc",    done: (() => {
      const status = getDocStatus(surgery.id)
      return status === "Completa" || status === "Apta para facturar"
    })() },
    { key: "fact",   done: surgery.facturado === true },
    { key: "cobro",  done: getResumenCobranzaBySurgeryId(surgery.id).totalCobrado > 0 },
  ]

  // Compute `current` — first stage where done === false
  let currentSet = false
  return stages.map(s => {
    if (!s.done && !currentSet) {
      currentSet = true
      return { ...s, current: true }
    }
    return { ...s, current: false }
  })
}
```

**Design decisions:**
- Pure function — no imports from `useOrtoTrackStore`, no React hooks. Fully testable with mock functions.
- Returns always 7 stages (cx, pr, nr, consumo, doc, fact, cobro) in fixed order.
- `cx` always `done: true` because surgery existence is the prerequisite for rendering the row.
- Stage helpers are function parameters, not the store itself — follows the pattern established by `getFacturacionStatus()` in `cirugias.utils.ts` (line 22-35: receives `getDocStatus` and `resumenCobranza` as params).
- `current` is computed in a second pass — the first stage where `done === false` gets `current: true`. If all 7 are done, no stage is `current`.
- File created standalone (`circuit-progress.ts`) rather than appended to `cirugias.utils.ts` — keeps concerns separated (circuit logic vs general surgery utilities). SPEC.md §6.6.1 allows either; choosing separate file for cleaner test isolation.

**Type imports needed:**
- `Surgery` — already imported in page.tsx from `@/types`
- `Presupuesto`, `Remito`, `Consumo` — defined in `@/types` (lines 236, 214, 296)
- `ResumenCobranzaSurgery` — defined in `@/lib/cobros.utils` (line 143)

---

### 4.4 formatContextualDate (ADDITIVE — B6)

**File:** `src/lib/formatters.ts`

**Additive change — appended after existing `formatDateTime` function (line 32).**

**Types:**
```ts
export type ContextualDateVariant = "today" | "tomorrow" | "yesterday" | "overdue" | "soon" | "neutral"

export interface ContextualDateResult {
  text: string
  variant: ContextualDateVariant
}
```

**Function:**
```ts
export function formatContextualDate(date: string): ContextualDateResult {
  if (!date) return { text: "—", variant: "neutral" }

  try {
    const target = new Date(date + "T00:00:00")  // same parsing as formatDate
    const today = new Date()
    // Normalize to calendar dates (ignore time)
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const diffDays = Math.round((targetDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return { text: "Hoy", variant: "today" }
    if (diffDays === 1) return { text: "Mañana", variant: "tomorrow" }
    if (diffDays === -1) return { text: "Ayer", variant: "yesterday" }
    if (diffDays < -7) return { text: `Vencida hace ${Math.abs(diffDays)}d`, variant: "overdue" }
    if (diffDays < 0) return { text: `Hace ${Math.abs(diffDays)}d`, variant: "overdue" }
    if (diffDays <= 3) return { text: `En ${diffDays}d`, variant: "soon" }

    // Fallback to flat date format
    return { text: formatDate(date), variant: "neutral" }
  } catch {
    return { text: date, variant: "neutral" }
  }
}
```

**Design decisions:**
- Date parsing uses `date + "T00:00:00"` — exact same pattern as `formatDate()` line 20. This handles the `YYYY-MM-DD` format consistently and avoids timezone issues (treated as local midnight).
- Calendar-day comparison via `getFullYear()/getMonth()/getDate()` — avoids DST issues with `setHours(0,0,0,0)`.
- "Vencida hace Nd" for >7 days overdue, "Hace Nd" for 1–7 days overdue. Matches SPEC.md §6.7.1.
- "En Nd" for +2 to +3 days. Matches SPEC.md §6.7.1.
- `formatDate` is called as fallback for neutral text — existing function, unchanged.
- Types exported alongside the function for use in tests and CirugiaRow.

---

### 4.5 CELL_BASE constant (ADDITIVE — A3)

**File:** `src/lib/cirugias.constants.ts`

**Added after the `NON_SORTABLE_KEYS` constant (line 188), before the FILTER OPTIONS section (line 191):**

```ts
/** Shared base className for standard table cells. Enforces consistent min-height and alignment. */
export const CELL_BASE = "px-2.5 py-1.5 min-h-[34px] align-middle"
```

**Design decision:** Placed after `NON_SORTABLE_KEYS` because both are column-related constants. The existing constants use `as const` on arrays and plain `const` on strings — `CELL_BASE` follows the same pattern (plain `const` string).

---

## 5. Styling Design

### 5.1 CELL_BASE application matrix (A3)

Which cells in `CirugiaRow.tsx`'s `renderCell()` switch receive `CELL_BASE`:

| Column key | Cell type | Receives CELL_BASE? | Rationale |
|---|---|---|---|
| `id` | Plain text | YES | Standard cell |
| `prNumber` | Plain text | YES | Standard cell |
| `expedienteNumber` | Plain text | YES | Standard cell |
| `state` | CirugiaStatusCell | NO | Self-contained sizing (badge) |
| `date` | Plain text (with contextual wrapper) | YES | Standard cell, B6 adds a `<span>` inside |
| `patient` | Plain text + Tooltip | YES | Standard cell |
| `surgeon` | Plain text + Tooltip | YES | Standard cell |
| `institution` | Plain text + Tooltip | YES | Standard cell |
| `coordinadorCx` | Plain text | YES | Standard cell |
| `clientOs` | Plain text + Tooltip | YES | Standard cell |
| `classification` | Plain text | YES | Standard cell |
| `urgente` | Badge or empty | YES | Standard cell (empty when not urgent) |
| `provincia` | Plain text | YES | Standard cell |
| `vendedor` | Plain text | YES | Standard cell |
| `instrumentador` | Plain text | YES | Standard cell |
| `preparationState` | CirugiaPreparationCell | NO | Self-contained sizing (badge) |
| `doc` / `consumo` / `facturado` | CirugiaOperationalBadges | NO | Self-contained sizing (3 composite cells) |
| `circuitProgress` (NEW) | CircuitProgressCell | NO | Self-contained sizing (compact dot line) |
| `actions` | CirugiaActionsCell | NO | Self-contained sizing (button + dropdown) |

**Application pattern in CirugiaRow.tsx:** Replace individual `"px-2.5 py-1.5"` on each standard cell with `CELL_BASE` constant. The exact string value is identical to the current hardcoded classes on most cells — `CELL_BASE` formalizes and centralized it.

For example, current `date` cell:
```tsx
// Before:
className="px-2.5 py-1.5 whitespace-nowrap text-[11px]"
// After:
className={cn(CELL_BASE, "whitespace-nowrap text-[11px]")}
```

### 5.2 Zebra striping CSS (A1)

**Location:** `CirugiasTable.tsx`, `<table>` element, line 164.

**Before:**
```tsx
<table className="w-full text-sm border-collapse">
```

**After:**
```tsx
<table className="w-full text-sm border-collapse [&_tbody_tr:nth-child(even)]:bg-muted/15">
```

**Specificity behavior:**
- Table-level selector targets `tbody tr:nth-child(even)` → specificity: `(0,0,2)` (two type selectors + one pseudo-class)
- Direct `<tr>` className via `cn()` → specificity: `(0,1,0)` (one class selector)
- Result: Direct `<tr>` classNames always win. Selection (`bg-primary/5`) and urgency (`bg-red-50/40`) applied directly on `<tr>` override zebra automatically. No conditional logic needed.

**Visual verification:** Even rows (0-indexed: 2nd, 4th, 6th…) get `bg-muted/15` unless overridden by selection or urgency. Odd rows get no background (base/transparent).

### 5.3 Solid header (A2)

**Location:** `CirugiasTable.tsx`, `<thead>` `<tr>`, line 166.

**Before:**
```tsx
<tr className="border-b bg-muted/40">
```

**After:**
```tsx
<tr className="border-b bg-muted">
```

**Design decision:** Single className change — `bg-muted/40` → `bg-muted`. The sticky `<th>` elements already use `bg-muted` individually (line 179: `isStickyLeft && "sticky z-20 bg-muted"`), so the solid header row background is consistent with sticky header cells. No other header attribute changes.

### 5.4 Urgency visual classes (B7)

| Element | Not urgent, not selected | Urgent, not selected | Selected (wins over urgent) |
|---|---|---|---|
| `<tr>` | `hover:bg-muted/30 border-l-transparent` | `bg-red-50/40 border-l-red-400` | `bg-primary/5 border-l-primary` |
| Sticky cell (left) | `bg-background` | `bg-red-50/60` | `bg-primary/5` |
| Sticky cell (right) | `bg-background` | `bg-red-50/60` | `bg-primary/5` |

**Note:** `border-l-[3px]` is already applied to all rows (line 298–299: `border-l-[3px] border-l-primary` for selected, `border-l-[3px] border-l-transparent` for base). The urgency change only overrides the border color to `border-l-red-400` when urgent and not selected.

### 5.5 Date color variant classes (B6)

Applied to the `<span>` wrapping the contextual date text inside the date `<td>`:

| Variant | className | Example text |
|---|---|---|
| `today` | `text-blue-600 font-semibold` | "Hoy" |
| `tomorrow` | `text-sky-500` | "Mañana" |
| `yesterday` | `text-muted-foreground` | "Ayer" |
| `overdue` | `text-amber-600` | "Vencida hace 10d" |
| `soon` | `text-foreground` | "En 2d" |
| `neutral` | `text-muted-foreground` | "24/06/2026" (formatted by formatDate) |

The variant-to-className map is defined as a constant inside CirugiaRow.tsx (not exported — private to the component):
```ts
const DATE_VARIANT_CLASSES: Record<ContextualDateVariant, string> = {
  today: "text-blue-600 font-semibold",
  tomorrow: "text-sky-500",
  yesterday: "text-muted-foreground",
  overdue: "text-amber-600",
  soon: "text-foreground",
  neutral: "text-muted-foreground",
}
```

### 5.6 ClassName priority contract — implementation detail (B7)

Applied in `CirugiaRow.tsx` `<tr>` className:

```tsx
<tr className={cn(
  // Priority 1: Selected (highest visual prominence)
  isSelected && "bg-primary/5 border-l-[3px] border-l-primary",
  // Priority 2: Urgent (only when not selected — suppressed by Priority 1)
  isUrgent && !isSelected && "bg-red-50/40 border-l-[3px] border-l-red-400",
  // Priority 3: Zebra — table-level CSS (automatically overridden by Priority 1 & 2)
  // Priority 4: Base
  "border-l-[3px] border-l-transparent",           // base left border (transparent)
  "group hover:bg-muted/30 transition-colors",      // hover + group for sticky cells
  "cursor-pointer",                                 // clickable
)}
```

**How zebra override works without explicit condition:**
1. Table CSS: `[&_tbody_tr:nth-child(even)]:bg-muted/15` applies `bg-muted/15` to even rows
2. Direct `<tr>` receives `cn()` output. If `isSelected=true`, the `<tr>` gets `bg-primary/5` as a direct class → CSS specificity: class on element beats descendant selector → `bg-primary/5` wins
3. If `isUrgent=true && !isSelected`, the `<tr>` gets `bg-red-50/40` as a direct class → same specificity win → `bg-red-50/40` wins
4. If neither, the `<tr>` has no background class → table-level CSS takes effect: zebra on even rows, transparent on odd rows

### 5.7 Sticky cell className logic update (B7)

Current `stickyCellClasses` function signature (line 53-58):
```ts
function stickyCellClasses(isSticky: boolean, isSelected: boolean, isLastLeft: boolean, isRight: boolean): string
```

**Updated signature:**
```ts
function stickyCellClasses(
  isSticky: boolean,
  isSelected: boolean,
  isLastLeft: boolean,
  isRight: boolean,
  isUrgent?: boolean,  // NEW — optional for B7
): string
```

**Updated body:**
```ts
function stickyCellClasses(isSticky, isSelected, isLastLeft, isRight, isUrgent = false) {
  if (!isSticky) return ""
  return cn(
    "sticky z-10",
    // Background: priority Selected > Urgent > Base
    isSelected ? "bg-primary/5" : isUrgent ? "bg-red-50/60" : "bg-background",
    // Hover effect
    isSelected ? "group-hover:bg-primary/8" : "group-hover:bg-muted/30",
    isLastLeft && "shadow-[2px_0_4px_rgba(0,0,0,0.06)]",
    isRight && "shadow-[-2px_0_4px_rgba(0,0,0,0.06)]",
  )
}
```

**Call sites updated:** All calls to `stickyCellClasses` in `CirugiaRow.tsx` receive `isUrgent` as 5th argument. The `isUrgent` value is `s.urgente` (derived from surgery prop — always available).

**`stickyStateCellClasses` — NO CHANGE:** The `stickyStateCellClasses` function (line 78-88) is for `CirugiaStatusCell` which has its own solid colored background from `CX_STATE_CELL_COLORS`. It does NOT need `isUrgent` because the status cell's background already covers scrolled content and urgency is not a status-based concept.

---

## 6. File-by-File Design

### 6.1 `src/lib/cirugias.constants.ts` — MODIFY

**Lock level:** Critical (§10) — requires explicit ownership lock before any edit.

| Change ID | Location | Operation | Details |
|---|---|---|---|
| C1 | After line 188 | ADD | `export const CELL_BASE = "px-2.5 py-1.5 min-h-[34px] align-middle"` |
| C2 | `CIRUGIAS_COLUMNS` array (line 176, before `actions`) | ADD | `{ key: "circuitProgress", label: "Circuito" }` — inserted before `actions` so Circuito column appears before Actions |
| C3 | `DEFAULT_VISIBLE_COLS` object (line 184) | ADD | `circuitProgress: true` — added before `actions: true` (consistent key order) |
| C4 | `NON_SORTABLE_KEYS` array (line 188) | ADD | `"circuitProgress"` appended to the array |

**C2 detail — exact insertion point:**
Current CIRUGIAS_COLUMNS ends with:
```ts
  { key: "facturado", label: "Fact" },
  { key: "actions", label: "Acciones" },
```
After:
```ts
  { key: "facturado", label: "Fact" },
  { key: "circuitProgress", label: "Circuito" },
  { key: "actions", label: "Acciones" },
```

**C4 detail — exact append:**
Current `NON_SORTABLE_KEYS = ["actions", "doc", "facturado", "consumo", "coordinadorCx"]`
After: `NON_SORTABLE_KEYS = ["actions", "doc", "facturado", "consumo", "coordinadorCx", "circuitProgress"]`

**C3 detail — exact insertion:**
Current `DEFAULT_VISIBLE_COLS` ends with `...facturado: true, actions: true }`
After: `...circuitProgress: true, actions: true }`

**Columns count:** Goes from 20 → 21 columns. `columnOrder` factory in test at line 89 auto-includes via `CIRUGIAS_COLUMNS.map(c => c.key)`.

---

### 6.2 `src/components/cirugias/CirugiasTable.tsx` — MODIFY

**Lock level:** Critical (§10) — requires explicit ownership lock before any edit.

| Change ID | Location | Operation | Details |
|---|---|---|---|
| T1 | `<table>` className (line 164) | MODIFY | Append ` [&_tbody_tr:nth-child(even)]:bg-muted/15` to className string |
| T2 | `<thead>` `<tr>` className (line 166) | MODIFY | Replace `bg-muted/40` → `bg-muted` |
| T3 | Empty state block (lines 229–235) | REPLACE | Replace `<td colSpan>` plain text with `<CirugiasEmptyState>` component |
| T4 | `CirugiasTableProps` interface (lines 31–58) | ADD properties | `circuitProgressMap?: Record<string, CircuitStage[]>` + `onClearFilters?: () => void` + `onNewSurgery?: () => void` + `hasActiveFilters: boolean` |
| T5 | `CirugiaRow` JSX call (lines 200–227) | ADD props | `circuitProgress={props.circuitProgressMap?.[s.id]}` + `rowIndex={idx}` — injected from `.map((s, idx) => ...)` |
| T6 | Imports (line 1–8) | ADD imports | `import { CirugiasEmptyState } from "./CirugiasEmptyState"` + `import type { CircuitStage } from "@/lib/circuit-progress"` |
| T7 | `CirugiaRow` call | MODIFY | Add `rowIndex` and `circuitProgress` to props passed |

**T1 — exact className:**
Before: `className="w-full text-sm border-collapse"`
After: `className="w-full text-sm border-collapse [&_tbody_tr:nth-child(even)]:bg-muted/15"`

**T3 — replacement block:**
```tsx
// Before (lines 229-235):
{props.data.length === 0 && (
  <tr>
    <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground text-sm">
      No se encontraron cirugías con los filtros aplicados
    </td>
  </tr>
)}

// After:
{props.data.length === 0 && (
  <CirugiasEmptyState
    onClearFilters={props.onClearFilters}
    onNewSurgery={props.onNewSurgery}
    hasActiveFilters={props.hasActiveFilters}
  />
)}
```

**T4 — new prop types added to interface:**
```ts
interface CirugiasTableProps {
  // ... existing props ...
  // NEW (Phase A — A4):
  onClearFilters?: () => void
  onNewSurgery?: () => void
  hasActiveFilters: boolean
  // NEW (Phase B — B5):
  circuitProgressMap?: Record<string, CircuitStage[]>
}
```

**T5 — CirugiaRow call update:**
```tsx
// Before (line 200-201):
{props.data.map((s) => (
  <CirugiaRow key={s.id} ... />

// After:
{props.data.map((s, idx) => (
  <CirugiaRow
    key={s.id}
    // ... all existing props ...
    circuitProgress={props.circuitProgressMap?.[s.id]}
    rowIndex={idx}
  />
```

**`rowIndex` design note:** Passed as a prop to CirugiaRow for future use (SPEC.md §9.6). Currently not consumed for zebra logic (CSS nth-child handles it) or sticky cell logic (solid backgrounds always cover zebra). The prop is additive and causes no behavior change.

---

### 6.3 `src/components/cirugias/CirugiaRow.tsx` — MODIFY

**Lock level:** Critical (§10) — requires explicit ownership lock before any edit.

| Change ID | Location | Operation | Details |
|---|---|---|---|
| R1 | Imports (lines 2–11) | ADD imports | `import { CELL_BASE } from "@/lib/cirugias.constants"` + `import { formatContextualDate } from "@/lib/formatters"` + `import type { ContextualDateVariant } from "@/lib/formatters"` + `import { CircuitProgressCell } from "./CircuitProgressCell"` + `import type { CircuitStage } from "@/lib/circuit-progress"` |
| R2 | `CirugiaRowProps` interface (lines 21–46) | ADD properties | `circuitProgress?: CircuitStage[]` + `rowIndex?: number` |
| R3 | `stickyCellClasses` function (lines 53–71) | MODIFY signature + body | Add `isUrgent?: boolean` parameter (5th param, default false). Update background logic: `isSelected ? "bg-primary/5" : isUrgent ? "bg-red-50/60" : "bg-background"` |
| R4 | All `stickyCellClasses` call sites | MODIFY | Pass `s.urgente` as 5th argument |
| R5 | Standard `<td>` cells | MODIFY | Replace `"px-2.5 py-1.5"` with `CELL_BASE` on all standard cells per matrix in §5.1 |
| R6 | Date cell (`case "date"`, lines 188–193) | REPLACE | Render contextual date with variant color + tooltip |
| R7 | `<tr>` className (lines 294–300) | MODIFY | Add urgency className condition per §5.6 |
| R8 | `renderCell` switch | ADD case | `case "circuitProgress"` → render `<CircuitProgressCell stages={circuitProgress} />` (only when `circuitProgress` prop is provided and key is visible) |
| R9 | Destructuring | MODIFY | Add `circuitProgress, rowIndex` to destructured props |

**R5 — CELL_BASE application example (date cell):**
```tsx
// Before (line 190):
<td key="date" className="px-2.5 py-1.5 whitespace-nowrap text-[11px]">
  {formatDate(s.date)}
</td>

// After:
<td key="date" className={cn(CELL_BASE, "whitespace-nowrap text-[11px]")}>
  {/* B6 logic here — see R6 */}
</td>
```

**R6 — contextual date cell (replaces lines 188-193):**
```tsx
case "date": {
  const ctxDate = formatContextualDate(s.date)
  const variantClass = DATE_VARIANT_CLASSES[ctxDate.variant]
  return (
    <td key="date" className={cn(CELL_BASE, "whitespace-nowrap text-[11px]")}>
      <span className={variantClass} title={formatDate(s.date)}>
        {ctxDate.text}
      </span>
    </td>
  )
}
```

The `DATE_VARIANT_CLASSES` constant is defined at module scope in CirugiaRow.tsx (above the component function):
```ts
const DATE_VARIANT_CLASSES: Record<ContextualDateVariant, string> = {
  today: "text-blue-600 font-semibold",
  tomorrow: "text-sky-500",
  yesterday: "text-muted-foreground",
  overdue: "text-amber-600",
  soon: "text-foreground",
  neutral: "text-muted-foreground",
}
```

**R8 — circuitProgress cell:**
```tsx
case "circuitProgress":
  if (!circuitProgress) return null
  return <CircuitProgressCell key="circuitProgress" stages={circuitProgress} />
```

**R7 — updated `<tr>` className:**
```tsx
<tr
  className={cn(
    // Priority 1: Selected
    isSelected && "bg-primary/5 border-l-[3px] border-l-primary",
    // Priority 2: Urgent (only if not selected)
    s.urgente && !isSelected && "bg-red-50/40 border-l-[3px] border-l-red-400",
    // Priority 3: Zebra — table-level CSS nth-child (auto-overridden by Priority 1 & 2)
    // Priority 4: Base
    "border-l-[3px] border-l-transparent",
    "group hover:bg-muted/30 transition-colors cursor-pointer",
  )}
  onClick={() => onSelect(s.id)}
  onDoubleClick={() => onOpenExpediente(s.id)}
>
```

---

### 6.4 `src/lib/formatters.ts` — MODIFY (additive only)

**Lock level:** Not listed in AGENTS.md §10 critical files, but is classified as "high risk" in SPEC.md §14. Requires ownership coordination.

| Change ID | Location | Operation | Details |
|---|---|---|---|
| F1 | After line 32 (end of file) | ADD | `ContextualDateVariant` type, `ContextualDateResult` interface, `formatContextualDate()` function — exact code from §4.4 |

**Additive guarantee:** The existing `formatDate` (lines 17–28), `formatCurrency`, `formatNumberAR`, and `formatDateTime` are untouched — zero bytes changed.

---

### 6.5 `src/app/cirugias/page.tsx` — MODIFY

**Lock level:** High risk (§10) — requires ownership coordination.

| Change ID | Location | Operation | Details |
|---|---|---|---|
| P1 | Imports (lines 1–38) | ADD imports | `import { getCircuitProgress } from "@/lib/circuit-progress"` + `import type { CircuitStage } from "@/lib/circuit-progress"` (may be `import type` only) |
| P2 | After `facturacionStatusFor` useMemo (lines 61–63) | ADD useMemo | Compute `circuitProgressMap` for all store.surgeries |
| P3 | `CirugiasTable` JSX render (lines 207–234) | ADD props | `circuitProgressMap={circuitProgressMap}` + `onClearFilters={filters.clearFilters}` + `onNewSurgery={actions.openNewSurgeryDialog}` + `hasActiveFilters={filters.hasActiveFilters}` |

**P2 — circuitProgressMap useMemo:**
```ts
const circuitProgressMap = useMemo(() => {
  const map: Record<string, CircuitStage[]> = {}
  for (const s of store.surgeries) {
    map[s.id] = getCircuitProgress(
      s,
      store.getPresupuestosBySurgeryId,
      store.getRemitosBySurgeryId,
      store.getConsumoBySurgeryId,
      store.getDocStatus,
      store.getResumenCobranzaBySurgeryId,
    )
  }
  return map
}, [store.surgeries, store.getPresupuestosBySurgeryId, store.getRemitosBySurgeryId, store.getConsumoBySurgeryId, store.getDocStatus, store.getResumenCobranzaBySurgeryId])
```

**Design decision — `store.surgeries` vs `filtered`:** Computed on full `store.surgeries` array, not `filtered` (see rationale in §3.1). Zustand store methods are stable references, but listing them explicitly as dependencies improves clarity and avoids the broad `store` dependency that would recompute on any store change.

**P3 — new CirugiasTable props:**
```tsx
<CirugiasTable
  // ... all existing props unchanged ...
  circuitProgressMap={circuitProgressMap}
  onClearFilters={filters.clearFilters}
  onNewSurgery={actions.openNewSurgeryDialog}
  hasActiveFilters={filters.hasActiveFilters}
/>
```

**`filters.clearFilters`**: Already exists in `useCirugiasFilters()` hook — called from CirugiasToolbar line 162. Type: `() => void`.

**`filters.hasActiveFilters`**: Already exists in `useCirugiasFilters()` hook — used in CirugiasToolbar line 139. Type: `boolean`.

**`actions.openNewSurgeryDialog`**: Already exists in `useCirugiaActions()` hook — used in CirugiasToolbar line 172. Type: `() => void`.

---

### 6.6 New files — CREATE

| File | Phase | Size estimate | Lock status |
|---|---|---|---|
| `src/components/cirugias/CirugiasEmptyState.tsx` | A | ~40 lines | No lock conflict (new) |
| `src/components/cirugias/CircuitProgressCell.tsx` | B | ~60 lines | No lock conflict (new) |
| `src/lib/circuit-progress.ts` | B | ~50 lines | No lock conflict (new) |

---

## 7. Column Wiring — Exact Changes

### 7.1 CIRUGIAS_COLUMNS

Current (20 entries, line 156–177):
```ts
export const CIRUGIAS_COLUMNS = [
  { key: "id", label: "ID CX" },
  { key: "prNumber", label: "PR Nº" },
  { key: "expedienteNumber", label: "Expediente" },
  { key: "state", label: "Estado CX" },
  { key: "date", label: "Fecha CX" },
  { key: "patient", label: "Paciente" },
  { key: "surgeon", label: "Médico" },
  { key: "institution", label: "Institución" },
  { key: "coordinadorCx", label: "Coordinador" },
  { key: "clientOs", label: "Cliente / OS" },
  { key: "classification", label: "Clasificación" },
  { key: "urgente", label: "Urgente" },
  { key: "provincia", label: "Provincia" },
  { key: "vendedor", label: "Vendedor" },
  { key: "instrumentador", label: "Instrumentador" },
  { key: "preparationState", label: "Preparación" },
  { key: "doc", label: "Doc" },
  { key: "consumo", label: "Consumo" },
  { key: "facturado", label: "Fact" },
  { key: "actions", label: "Acciones" },
] as const
```

After (21 entries — insert `circuitProgress` before `actions`):
```ts
  // ... first 19 entries unchanged ...
  { key: "facturado", label: "Fact" },
  { key: "circuitProgress", label: "Circuito" },   // ← NEW
  { key: "actions", label: "Acciones" },
] as const
```

**Why before `actions`:** The Actions column is always rightmost (sticky right). The Circuit column is informational — it belongs in the data section, not between data and actions. Inserting before `actions` keeps the logical grouping.

### 7.2 DEFAULT_VISIBLE_COLS

Current (line 179–185):
```ts
export const DEFAULT_VISIBLE_COLS: Record<string, boolean> = {
  id: true, prNumber: true, expedienteNumber: true, state: true, date: true,
  patient: true, surgeon: true, institution: true, coordinadorCx: false, clientOs: true,
  classification: true, urgente: true, provincia: false, vendedor: false,
  instrumentador: false, preparationState: true, doc: true,
  consumo: true, facturado: true, actions: true,
}
```

After:
```ts
export const DEFAULT_VISIBLE_COLS: Record<string, boolean> = {
  id: true, prNumber: true, expedienteNumber: true, state: true, date: true,
  patient: true, surgeon: true, institution: true, coordinadorCx: false, clientOs: true,
  classification: true, urgente: true, provincia: false, vendedor: false,
  instrumentador: false, preparationState: true, doc: true,
  consumo: true, facturado: true, circuitProgress: true, actions: true,   // ← NEW entry
}
```

**Default visible: `true`** — SPEC.md §6.6.2: "Default visible: true".

### 7.3 NON_SORTABLE_KEYS

Current (line 188):
```ts
export const NON_SORTABLE_KEYS = ["actions", "doc", "facturado", "consumo", "coordinadorCx"]
```

After:
```ts
export const NON_SORTABLE_KEYS = ["actions", "doc", "facturado", "consumo", "coordinadorCx", "circuitProgress"]
```

**Reason:** Circuit progress is computed from 7 different store fields — sorting by circuit progress would require a complex multi-key sort. Deferred to backend phase. For now, it's non-sortable like other composite columns (`doc`, `facturado`, `consumo`).

---

## 8. Test Design

### 8.1 Existing tests — zero changes required

| Test file | Reason unchanged |
|---|---|
| `src/__tests__/components/CirugiasTable.test.tsx` | Message regex line 170 still matches "No se encontraron cirugías" (verbatim in CirugiasEmptyState). Selection class `bg-primary/5` line 225 unchanged. Row count line 130 unchanged. `createTableProps()` at line 62 — new optional props (`circuitProgressMap`, `onClearFilters`, `onNewSurgery`, `hasActiveFilters`) have no default, but TS won't error because existing tests don't access them. `columnOrder` factory line 89 auto-includes new column via `CIRUGIAS_COLUMNS.map(c => c.key)`. |
| `src/__tests__/unit/cirugias-estado-prep-separation.test.ts` | Asserts on `CX_STATE_COLORS`, `CX_STATE_CELL_COLORS`, `PREP_STATE_CELL_COLORS` — none changed. |
| `src/__tests__/unit/cirugia-creation.test.ts` | Surgery creation logic only — not visual. |
| `src/__tests__/unit/post-creation-actions.test.ts` | Post-creation actions — not visual. |

**Note on CirugiasTable.test.tsx optional props:** The `createTableProps()` factory at line 62 does not include `circuitProgressMap`, `onClearFilters`, `onNewSurgery`, or `hasActiveFilters`. Since these are new optional props without defaults, TypeScript will NOT error on them being missing — they'll be `undefined`. The component handles `undefined` gracefully (conditional rendering, optional chaining).

### 8.2 New test files — structure and mock data

#### 8.2.1 `src/__tests__/unit/circuit-progress.test.ts`

**Mock data shapes:**
```ts
const mockSurgery: Surgery = {
  id: "cx-001",
  facturado: false,
  // ... minimal surgery fields
}

// Store helpers as mock functions
const emptyArray = vi.fn(() => [])
const singleItem = vi.fn(() => [{ id: "pr-1" }])
const undefinedFn = vi.fn(() => undefined)
const docIncompleta = vi.fn(() => "Incompleta")
const docCompleta = vi.fn(() => "Completa")
const docApta = vi.fn(() => "Apta para facturar")
const cobroZero = vi.fn(() => ({ totalCobrado: 0 }))
const cobroPositivo = vi.fn(() => ({ totalCobrado: 50000 }))
```

**Test cases (minimum 8):**
1. All stages pending (except cx) — empty helpers, not facturado
2. CX always done
3. Only PR done → pr.done=true, rest false
4. Doc "Completa" → doc.done=true
5. Doc "Apta para facturar" → doc.done=true
6. Doc "Incompleta" → doc.done=false
7. facturado=true → fact.done=true
8. totalCobrado > 0 → cobro.done=true
9. All stages done → current=false on all stages
10. First non-done is current → correct `current` flag
11. Returns exactly 7 stages

#### 8.2.2 `src/__tests__/components/CircuitProgressCell.test.tsx`

**Mock data:**
```ts
const allDone: CircuitStage[] = [
  { key: "cx", done: true, current: false },
  { key: "pr", done: true, current: false },
  { key: "nr", done: true, current: false },
  { key: "consumo", done: true, current: false },
  { key: "doc", done: true, current: false },
  { key: "fact", done: true, current: false },
  { key: "cobro", done: true, current: false },
]

const mixedState: CircuitStage[] = [
  { key: "cx", done: true, current: false },
  { key: "pr", done: true, current: false },
  { key: "nr", done: false, current: true },
  // ... remaining 4 pending
]
```

**Test cases (minimum 5):**
1. Renders 7 dots (query all `size-2.5 rounded-full` spans)
2. Done dots have `bg-emerald-500` class
3. Current dot has `bg-blue-500` and `animate-pulse` class
4. Pending dots have `border` class and no fill color
5. Connectors between done → done are emerald (`bg-emerald-400`)
6. Connectors between done → pending use correct color

#### 8.2.3 `src/__tests__/components/CirugiasEmptyState.test.tsx`

**Test cases (minimum 6):**
1. Renders primary message "No se encontraron cirugías con los filtros aplicados"
2. `hasActiveFilters=true` + `onClearFilters` provided → renders "Probá ajustar" + "Limpiar filtros" button
3. `hasActiveFilters=false` → no filter hint, no clear button
4. `hasActiveFilters=true` + `onClearFilters` not provided → renders hint text but no button
5. `onNewSurgery` provided → renders "Nueva cirugía" CTA
6. `onNewSurgery` not provided → no CTA button
7. Clicking "Limpiar filtros" calls `onClearFilters`
8. Clicking "Nueva cirugía" calls `onNewSurgery`

**Mock approach:** Use `vi.fn()` for callbacks, `fireEvent.click()` from `@testing-library/react`.

#### 8.2.4 `src/__tests__/unit/formatContextualDate.test.ts`

**Test cases (minimum 10):**
1. Today's date → `{ text: "Hoy", variant: "today" }`
2. Tomorrow → `{ text: "Mañana", variant: "tomorrow" }`
3. Yesterday → `{ text: "Ayer", variant: "yesterday" }`
4. 2 days ago → `{ text: "Hace 2d", variant: "overdue" }`
5. 8 days ago → `{ text: "Vencida hace 8d", variant: "overdue" }` (N > 7)
6. 2 days future → `{ text: "En 2d", variant: "soon" }`
7. 10 days future → `{ text: "DD/MM/YYYY", variant: "neutral" }` (calls formatDate)
8. Empty string → `{ text: "—", variant: "neutral" }`
9. Invalid date → graceful fallback
10. Same-day edge: exactly today at different times → still "Hoy"

**Date mocking approach:** Instead of mocking `Date`, construct the test date string dynamically using `new Date()`:
```ts
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
```
This avoids `vi.useFakeTimers()` complexity while keeping tests deterministic for a given run.

---

## 9. Implementation Sequencing

### Recommended slice order with rationale:

```
Slice 1: A1 + A2 + A3 (together — all in CirugiasTable.tsx + CirugiaRow.tsx)
  ∟ A1: Zebra CSS (table className, 1 line)
  ∟ A2: Solid header (thead tr className, 1 line)
  ∟ A3: CELL_BASE constant + application (cirugias.constants.ts + CirugiaRow.tsx)
  Rationale: All 3 touch CirugiasTable.tsx and CirugiaRow.tsx. Combining avoids
  re-locking the same files across multiple slices. A3's CELL_BASE constant is
  defined in cirugias.constants.ts but only consumed in CirugiaRow.tsx.
  Risk: Low. All CSS-only changes. Existing tests pass unchanged.
  Validations: npx tsc --noEmit, existing test suite, browser QA for zebra + header.

Slice 2: A4 — Empty state (standalone)
  ∟ New file: CirugiasEmptyState.tsx
  ∟ CirugiasTable.tsx: replace empty state block, add props
  ∟ page.tsx: pass onClearFilters, onNewSurgery, hasActiveFilters
  Rationale: Isolated change — replaces a dead-end <td> block. No other slice
  touches empty state logic.
  Risk: Low. New component with no downstream dependencies.
  Validations: existing CirugiasTable.test.tsx line 170 regex still passes.
  New test file: CirugiasEmptyState.test.tsx.

Slice 3: B6 — Contextual date (standalone)
  ∟ formatters.ts: add formatContextualDate (additive)
  ∟ CirugiaRow.tsx: update "date" case in renderCell
  Rationale: Isolated to date cell only. No prop threading needed (s.date already
  available). formatters.ts change is additive-only (formatDate preserved).
  Risk: Low. Pure function with clear interface.
  Validations: TypeScript, new test file formatContextualDate.test.ts.
  Browser QA for date color variants.

Slice 4: B5 + B7 (together — both add props to CirugiaRow)
  ∟ B5: circuit-progress.ts (new), CircuitProgressCell.tsx (new),
         cirugias.constants.ts (new column), page.tsx (useMemo),
         CirugiasTable.tsx (prop threading), CirugiaRow.tsx (cell render)
  ∟ B7: CirugiaRow.tsx (tr className + stickyCellClasses update)
  Rationale: Both slices modify CirugiaRow.tsx props and rendering. B5 adds the
  circuitProgress prop path; B7 modifies the tr className and sticky cell logic.
  Combining avoids re-locking CirugiaRow.tsx twice.
  Risk: Medium for B5 (new data pipeline), Medium for B7 (className priority).
  But combined risk is still manageable — no backend, no business logic.
  Validations: TypeScript, unit tests (circuit-progress.test.ts),
  component test (CircuitProgressCell.test.tsx), existing CirugiasTable.test.tsx.
  Browser QA for stepper dots + urgency tint interaction.

Test finalization:
  ∟ All 4 new test files written and passing
  ∟ Existing 4 test files verified passing
  ∟ npx tsc --noEmit clean
```

**Total implementation phases:** 4 code slices + 1 test finalization pass.

### File lock coordination per slice:

| Slice | Files locked | Lock status lifecycle |
|---|---|---|
| Slice 1 | `CirugiasTable.tsx` (critical), `CirugiaRow.tsx` (critical), `cirugias.constants.ts` (critical) | reserved → editing → review → released |
| Slice 2 | `CirugiasTable.tsx` (critical), `page.tsx` (high risk) | reserved → editing → review → released |
| Slice 3 | `formatters.ts` (high risk), `CirugiaRow.tsx` (critical) | reserved → editing → review → released |
| Slice 4 | `CirugiasTable.tsx` (critical), `CirugiaRow.tsx` (critical), `cirugias.constants.ts` (critical), `page.tsx` (high risk) | reserved → editing → review → released |

**Dialog files — zero touch, external lock respected:** `NewSurgeryDialog.tsx` and all files under `src/components/cirugias/dialogs/` are owned by another session. No design decision requires touching them. The lock is fully respected.

---

## 10. Guardrails Checklist

Verify against AGENTS.md §5/§11 prohibitions and SPEC.md §11 guardrails:

| # | Guardrail | Status | Evidence |
|---|---|---|---|
| G1 | No `prisma/schema.prisma` touched | ✅ PASS | No design references Prisma |
| G2 | No `src/lib/db.ts` touched | ✅ PASS | No design references db.ts |
| G3 | No `src/lib/store.ts` touched | ✅ PASS | No design references store.ts |
| G4 | No `src/types/index.ts` touched | ✅ PASS | Types are imported, not modified |
| G5 | No `src/app/api/**` touched | ✅ PASS | No API route changes |
| G6 | No `src/lib/validators/**` touched | ✅ PASS | No validator changes |
| G7 | No `src/lib/services/**` touched | ✅ PASS | No service changes |
| G8 | No `NewSurgeryDialog.tsx` or `dialogs/` touched | ✅ PASS | Zero references to dialog files |
| G9 | No new dependencies installed | ✅ PASS | All imports from existing deps (lucide-react, shadcn/ui, react) |
| G10 | No backend/DB/auth changes | ✅ PASS | UI-pure presentational only |
| G11 | `formatDate` preserved byte-for-byte | ✅ PASS | `formatContextualDate` is additive — `formatDate` unchanged |
| G12 | No business logic changes | ✅ PASS | Reads state, never mutates |
| G13 | No new Zustand slices or localStorage keys | ✅ PASS | No store writes. circuitProgress computed transiently via useMemo |
| G14 | Emerald/shadcn design system only | ✅ PASS | All colors use existing Tailwind classes (emerald, blue, red, amber, sky, muted-foreground). No hex, no mockup palette |
| G15 | Existing test assertions preserved | ✅ PASS | Lines 170, 225, 130 of CirugiasTable.test.tsx unaffected |
| G16 | No Prisma format/generate, no migrations | ✅ PASS | No Prisma changes |
| G17 | No Cirugías refactor beyond additive presentation | ✅ PASS | Additive: new sub-components, new constants, new functions. No restructuring |

---

## 11. Caveman Handoff

```text
Done:
- DESIGN.md generated from SPEC.md for CIRUGIAS-DATATABLE-VISUAL-P1
- Component tree diagram (before → after) with all 7 items mapped
- Data flow diagrams: circuitProgress computation+threading, date formatting, urgency propagation
- Detailed component design: CirugiasEmptyState, CircuitProgressCell, getCircuitProgress, formatContextualDate, CELL_BASE
- Styling design: CELL_BASE application matrix (16 columns mapped), zebra CSS specificity analysis, urgency className priority implementation, date variant color map
- File-by-file change design with exact ADD/DELETE/MODIFY/REPLACE annotations for 6 files
- Column wiring specification: CIRUGIAS_COLUMNS (new entry before actions), DEFAULT_VISIBLE_COLS, NON_SORTABLE_KEYS
- Test design: 4 new test files (circuit-progress, CircuitProgressCell, CirugiasEmptyState, formatContextualDate) with mock data shapes and minimum test cases
- Implementation sequencing: 4 slices (A1+A2+A3, A4, B6, B5+B7) with file lock coordination and rationale
- Guardrails checklist: 17 items verified, all PASS
- File lock requirements carried forward: critical files locked per slice, dialog files zero-touch respected

Changed:
- Created: knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/DESIGN.md (this file)

Files:
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/SPEC.md — input (unchanged)
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/PROPOSAL.md — input (unchanged)
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/EXPLORATION.md — input (unchanged)
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/DESIGN.md — output (this artifact)
- src/components/cirugias/CirugiasTable.tsx — read-only (design reference)
- src/components/cirugias/CirugiaRow.tsx — read-only (design reference)
- src/lib/cirugias.constants.ts — read-only (design reference)
- src/lib/formatters.ts — read-only (design reference)
- src/lib/cirugias.utils.ts — read-only (design reference)
- src/app/cirugias/page.tsx — read-only (design reference)

Validations:
- All design decisions trace to SPEC.md acceptance criteria (AC-A1 through AC-CROSS-06)
- Component interfaces match SPEC.md §9 exactly
- ClassName priority contract (Selected > Urgent > Zebra > Base) diagrammed with CSS specificity explanation
- File lock requirements from SPEC.md §14 carried forward into implementation sequencing
- Zero touch to NewSurgeryDialog.tsx and dialog files — external lock respected
- All 17 guardrails from SPEC.md §11 verified PASS
- New file count: 3 source files (CirugiasEmptyState, CircuitProgressCell, circuit-progress.ts) + 4 test files
- Modified file count: 6 source files (CirugiasTable, CirugiaRow, cirugias.constants, formatters, page.tsx, and technically cirugias.types if CircuitStage type is imported)
- No new dependencies, no backend changes, no Prisma, no auth, no API

Risks:
- R1 (7-store-lookups performance): mitigated by useMemo per surgery in page.tsx, computing on full store.surgeries not filtered
- R4 (persisted column visibility): new circuitProgress column won't appear for users with saved Zustand config — useColumnVisibility already validates from CIRUGIAS_COLUMNS (graceful handling)
- R6 (min-height visual rhythm shift): CELL_BASE applies min-h-[34px] consistently; browser QA required after Slice 1
- R7 (new component coverage): 4 new test files with minimum 29 test cases total mitigate regression risk
- Slice 4 combining B5+B7: higher complexity but avoids re-locking CirugiaRow.tsx; combined TypeScript check at end validates interaction

Next:
- sdd-tasks: Generate TASKS.md with 4 implementation slices, file lock declarations, exact file-by-file commands
- Then sdd-apply: Execute slices in order, lock critical files before editing, validate at each slice boundary
```
