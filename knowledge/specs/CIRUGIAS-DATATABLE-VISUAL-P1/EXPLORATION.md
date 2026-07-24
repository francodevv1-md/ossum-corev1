# Exploration — CIRUGIAS-DATATABLE-VISUAL-P1

> Visual polish of the Cirugías data table. Phase A (scannability) + Phase B (information hierarchy). UI-pure, no business logic changes.

## Scope Confirmation

Approved by Franco. Phase A + Phase B, all items included.

**Phase A — Escaneabilidad inmediata:**
- A1: Zebra striping (alternating row backgrounds)
- A2: Solid header background (replace `bg-muted/40`)
- A3: Consistent row height (min-height enforcement)
- A4: Rich empty state (illustrated + CTA + filter hint)

**Phase B — Jerarquía informativa:**
- B5: Mini-stepper de progreso del circuito (compact stage indicator)
- B6: Fecha contextual (relative labels + date-status tint)
- B7: Urgente como tinte de fila (row-level urgency tint instead of isolated badge)

**Out of scope (postergado):**
- Phase C: toggle de densidad, min-widths, acción primaria diferenciada
- Phase D: agrupación por fecha con headers pegajosos

---

## Current Component Architecture

| File | Role |
|---|---|
| `src/app/cirugias/page.tsx` | Host page. Toolbar + Table + Expanded Expediente view. Delegates to hooks. |
| `src/components/cirugias/CirugiasToolbar.tsx` | 3 rows: SmartSurgerySearch, filter popovers, action bar + counter + "Nueva cirugía". |
| `src/components/cirugias/CirugiasTable.tsx` | Table shell: sticky column logic, sort icon, horizontal scroll buttons, empty state. |
| `src/components/cirugias/CirugiaRow.tsx` | One `<tr>` per surgery via `renderCell(key)` switch over 20 column keys. Sticky cell logic. |
| `src/components/cirugias/CirugiaStatusCell.tsx` | Estado CX protagonist — `CX_STATE_CELL_COLORS`. |
| `src/components/cirugias/CirugiaPreparationCell.tsx` | Softer subordinated badge — `PREP_STATE_CELL_COLORS`. |
| `src/components/cirugias/CirugiaOperationalBadges.tsx` | Composite 3 `<td>` for doc/consumo/fact — `NeutralBadge` (dot + text). |
| `src/components/cirugias/CirugiaActionsCell.tsx` | Contextual primary action + more-actions dropdown via `determinePrimaryAction`. |
| `src/lib/cirugias.constants.ts` | `CIRUGIAS_COLUMNS` (20 keys), color maps, `DEFAULT_VISIBLE_COLS`, `NON_SORTABLE_KEYS`. |
| `src/lib/formatters.ts` | `formatDate(date)` — flat `es-AR` date, no relative context. |
| `src/lib/businessRules.ts` | `canRemitirNR`, `canCargarConsumo`, `canAutorizarFV`, `canValidateConsumption`. |
| `src/lib/store.ts` | Zustand store with all surgery-related helpers. |

### Data flow:
`page.tsx` pulls from `useOrtoTrackStore` → filters/sorts → passes to `CirugiasTable` as `Surgery[]` + callback props for doc/consumo/fact/pr statuses. Table maps to `CirugiaRow` which dispatches to sub-cells.

---

## Phase A — Feasibility Analysis

### A1: Zebra striping

**Problem:** Rows use only `border-b`; at 11px density, rows blend. No visual rhythm.

**Solution:** Add `even:bg-muted/20` (or `even:bg-muted/15`) on the `<tr>` className in `CirugiaRow.tsx`.

**Conflict with sticky cells:** Sticky cells have their own backgrounds (`bg-background` / `bg-primary/5`). Zebra on the `<tr>` is behind sticky cells, so it won't show through them. This is acceptable — sticky columns already have solid bg that covers scrolled content. However, non-sticky cells will show zebra.

**Interaction with selection:** Selected rows use `bg-primary/5`. Zebra must not override selection. Approach: zebra only on unselected rows, or selection tint takes precedence. Use className conditional: `isSelected ? "bg-primary/5" : index % 2 === 0 ? "bg-muted/15" : ""`. Need to pass row index to `CirugiaRow` or use CSS `:nth-child(even)` on `tbody > tr:nth-child(even)` in `CirugiasTable.tsx`.

**Preferred approach:** CSS nth-child in `CirugiasTable.tsx` table-level className target. Cleaner — no prop changes needed. Can use `[&_tbody_tr:nth-child(even)]:bg-muted/15` on `<table>`. But selection override must win. Since selection is applied directly on `<tr>` via cn(), it overrides the table-level selector (specificity). ✅ Safe.

### A2: Solid header background

**Problem:** Header uses `bg-muted/40` (40% opacity). Content visible through during horizontal scroll.

**Solution:** Replace with `bg-muted` (solid) on `th` sticky header. Confirmed safe — sticky header needs solid bg to cover scrolled content.

**Files:** `CirugiasTable.tsx` thead/tr className.

### A3: Consistent row height

**Problem:** `py-1.5` inflates differently based on content (badges vs plain text vs buttons). Rhythm breaks.

**Solution:** Add `h-8` (32px) or `min-h-[32px]` on each `<td>` OR enforce on `<tr>`. Since `<tr>` height is determined by tallest `<td>`, applying `py-1.5` consistently + a `leading-tight` on text should stabilize. Alternatively, enforce `min-h-[34px]` on all `<td>` via a shared cell base class.

**Preferred approach:** Add a `CELL_BASE` className constant with `px-2.5 py-1.5 min-h-[34px] align-middle` applied to all non-special `<td>` in `CirugiaRow`. Special cells (status, badges, actions, preparation) self-manage height via their content.

### A4: Rich empty state

**Problem:** `<td colSpan>` with plain text. No guidance or CTA.

**Solution:** Create `src/components/cirugias/CirugiasEmptyState.tsx` — presentational component with:
- Icon (empty folder / search)
- Message: "No se encontraron cirugías con los filtros aplicados"
- If active filters: "Probá ajustar o limpiar los filtros" + "Limpiar filtros" button (needs `onClearFilters` prop)
- CTA: "Nueva cirugía" button (needs `onNewSurgery` prop)

**Props needed:** `onClearFilters?: () => void`, `onNewSurgery?: () => void`, `hasActiveFilters: boolean`.

**Test impact:** `CirugiasTable.test.tsx` line 170 checks `screen.getByText(/No se encontraron cirugías/)`. Since message text is preserved, regex still matches. ✅ Safe. New props added to `CirugiasTable` interface (optional).

---

## Phase B — Feasibility Analysis

### B5: Mini-stepper de progreso del circuito

This is the highest-value, most complex item.

#### Available data for stage computation

Circuit canonical: `Contactos → Cirugía → PR → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro`

| Stage | Data source | Helper | Return type |
|---|---|---|---|
| Cirugía (created) | always true (surgery exists) | — | — |
| Presupuesto (PR) | `getPresupuestosBySurgeryId(id).length > 0` / `s.prNumber` / `s.presupuestoId` | Store | `Presupuesto[]` |
| Remito (NR) | `getRemitosBySurgeryId(id).length > 0` | Store | `Remito[]` |
| Consumo | `getConsumoBySurgeryId(id)` exists | Store | `Consumo \| undefined` |
| Devolución | embedded in comparativa (`tieneDevoluciones`), NO dedicated store helper | `comparativa.utils.ts` | `boolean` (computed) |
| Comparativa | `getComparativaMaterialesBySurgery(presupuesto, remitos, consumo, stockItems)` — **complex, needs stockItems** | `comparativa.utils.ts` | `ComparativaResult` |
| Documentación | `getDocStatus(id)` | Store | `DocumentStatus` string |
| Facturación | `s.facturado` | Surgery field | `boolean` |
| Cobro | `getResumenCobranzaBySurgeryId(id)` → `totalCobrado > 0` or `saldoPendiente === 0` | Store | `ResumenCobranzaSurgery` |

**Critical finding:** Devolución and Comparativa stages require complex data composition (stockItems for comparativa). These two stages are NOT simple booleans.

**Proposed simplified circuit for the stepper (7 visible dots):**
1. CX (created) — always done
2. PR — has presupuesto
3. NR — has remito
4. Consumo — has consumo
5. Doc — docStatus is "Completa" or "Apta para facturar"
6. Fact — surg.facturado
7. Cobro — has cobranza with totalCobrado > 0

Devolución and Comparativa are folded into the Consumo→Doc transition (since they are intermediate quality-control steps, not always present). This keeps the stepper computable with existing store helpers without requiring stockItems injection.

**Initialization sequence:** The stepper needs store access. Since `CirugiaRow` currently receives all stage data as individual props (docStatus, consumoState, prId, facturacionStatus), the mini-stepper could either:
- (a) Receive a pre-computed `circuitStage` prop computed in `page.tsx` (keeps CirugiaRow dumb) ✅ PREFERRED
- (b) Access the store directly via `useOrtoTrackStore` (adds store coupling to row)

**Option (a) preferred:** Add a new computed function `getCircuitProgress(surgery, store)` in `src/lib/cirugias.utils.ts` or a new `src/lib/circuit-progress.ts` that returns a structured object:

```ts
interface CircuitStage {
  key: string         // "cx" | "pr" | "nr" | "consumo" | "doc" | "fact" | "cobro"
  done: boolean
  current: boolean    // is this the active stage (first not-done)
}

function getCircuitProgress(surgery, getPresupuestos, getRemitos, getConsumo, getDocStatus, getResumenCobranza): CircuitStage[]
```

This function is pure (no store coupling), testable in isolation. `page.tsx` computes it per surgery and passes `circuitProgress` prop to `CirugiasTable` → `CirugiaRow` → stepper component.

**Wait — the function receives store functions, not the store. This is already the pattern used by `getFacturacionStatus` in page.tsx.**

**Component design:**
- New file: `src/components/cirugias/CircuitProgressCell.tsx`
- Presentational: receives `CircuitStage[]` props, renders horizontal dots/segments with color states.
- New column key: `"circuitProgress"` added to `CIRUGIAS_COLUMNS` and `DEFAULT_VISIBLE_COLS`.
- `NON_SORTABLE_KEYS` gets `"circuitProgress"` added.
- Default visible: `true` (showcase the new feature).
- Not sticky (flows with the table).
- Width: compact, ~120px — fits 7 dots with connectors.

**Visual treatment:**
- Done: solid emerald dot + connecting line (emerald)
- Current: solid blue filled dot with subtle pulse ring
- Pending: muted outline dot + muted connector

#### Risks
- Performance: computing 7 store lookups per row for large datasets. Mitigate with useMemo in page.tsx. Current dataset is prototype-scale (Zustand + mock), so risk is low now but flagged for backend phase.
- Column count: adds a 21st column — increases horizontal density. Mitigated by being compact (~120px).
- `DEFAULT_VISIBLE_COLS` changes — persisted Zustand column visibility may not include the new key. Need to handle missing keys gracefully (already handled by `useColumnVisibility` hook line 44-45: validates all keys from CIRUGIAS_COLUMNS).

### B6: Fecha contextual

**Current:** `formatDate(s.date)` in `src/lib/formatters.ts` → flat `DD/MM/YYYY` string.

**Proposed:** New function `formatContextualDate(date: string): { text: string; variant: "neutral" | "today" | "tomorrow" | "yesterday" | "overdue" | "soon" }` in `src/lib/formatters.ts`.

**Logic:**
- Parse `date` as `YYYY-MM-DD` (existing format).
- Compare with today's date.
- If same day → "Hoy"
- If tomorrow → "Mañana"
- If yesterday → "Ayer"
- If past → "Hace Nd" or "Vencida hace Nd" (if difference > 7 days)
- If within 3 days future → "En Nd"
- Otherwise → fall back to `formatDate()` standard.

**Color/variant mapping** (applied in a new `DateContextualCell` or inline in `CirugiaRow`):
- `overdue` → amber/orange text
- `today` → blue bold
- `tomorrow` → sky
- `soon` → neutral
- `yesterday` → muted
- `neutral` → muted-foreground

**Note:** "today" is relative to `new Date()` at render time. The app doesn't have a server clock concept yet. Use `new Date()` client-side. Acceptable for prototype.

**Files:** `src/lib/formatters.ts` (add function), `CirugiaRow.tsx` (update `date` cell render).

### B7: Urgente como tinte de fila

**Problem:** `urgente` is an isolated badge in a column that's empty for non-urgent surgeries. Wastes horizontal space and doesn't communicate urgency at row level.

**Solution:** 
- Keep the column (opt-in, user can toggle) but make the badge secondary.
- Add row-level urgency: when `s.urgente === true`, apply `bg-red-50/40` (very subtle red tint) to the entire `<tr>` BEFORE zebra and selection overrides.
- Left border becomes red instead of transparent for urgent unselected rows.

**ClassName priority (highest wins):**
1. Selected: `bg-primary/5 border-l-[3px] border-l-primary`
2. Urgent: `bg-red-50/40 border-l-[3px] border-l-red-400`
3. Zebra (even): `bg-muted/15`
4. Base: hover:bg-muted/30

**Interaction with sticky cells:** Sticky cells use `bg-background` or `bg-primary/5`. For urgent rows, sticky cells need `bg-red-50/60` (slightly stronger to be opaque). The `stickyCellClasses` function in `CirugiaRow.tsx` needs an `isUrgent` parameter.

**Files:** `CirugiaRow.tsx` (tr className + stickyCellClasses update).

---

## Risk Assessment

| File | Lock sensitivity (AGENTS.md §10) | Risk level | Reason |
|---|---|---|---|
| `src/components/cirugias/CirugiasTable.tsx` | Critical | High | Header bg, empty state, zebra CSS, new column wiring |
| `src/components/cirugias/CirugiaRow.tsx` | Critical | High | Tr className, sticky cell logic, date cell, new circuit cell |
| `src/components/cirugias/CirugiaActionsCell.tsx` | Critical | Medium | Only if action styling changes (Phase C, out of scope) |
| `src/components/cirugias/CirugiaOperationalBadges.tsx` | Critical | Low | Height normalization only |
| `src/lib/cirugias.constants.ts` | Critical | Medium | New column key, DEFAULT_VISIBLE_COLS, NON_SORTABLE_KEYS |
| `src/lib/formatters.ts` | N/A | Low | Add new function, don't modify existing |
| `src/lib/cirugias.utils.ts` | N/A | Medium | New getCircuitProgress function |
| `src/app/cirugias/page.tsx` | N/A | Medium | Wire new props (circuitProgress, empty state callbacks) |
| `src/components/cirugias/CirugiasToolbar.tsx` | High risk | Low | Only if density toggle (Phase C, out of scope) |

**New files (no lock):**
- `src/components/cirugias/CirugiasEmptyState.tsx`
- `src/components/cirugias/CircuitProgressCell.tsx`

---

## Test Impact

### Files that may need updates:

1. **`src/__tests__/components/CirugiasTable.test.tsx`**
   - Line 170: `screen.getByText(/No se encontraron cirugías/)` — message text preserved → ✅ still matches regex.
   - Line 225: `toHaveClass("bg-primary/5")` — selection class preserved → ✅ still matches.
   - Line 130: `rows.length >= 3` — row count unchanged → ✅ still matches.
   - **New:** `createTableProps()` needs `circuitProgress` prop if added to interface. May need mock stages array.
   - `columnOrder` factory (line 89): `CIRUGIAS_COLUMNS.map(c => c.key)` — auto-includes new column → ✅ self-updating.

2. **`src/__tests__/unit/cirugias-estado-prep-separation.test.ts`**
   - Asserts on `CX_STATE_COLORS` and `CX_STATE_CELL_COLORS` class strings. We are NOT changing these → ✅ safe.

3. **`src/__tests__/unit/cirugia-creation.test.ts`** — surgery creation logic, not visual → ✅ safe.

4. **`src/__tests__/unit/post-creation-actions.test.ts`** — post-creation actions, not visual → ✅ safe.

### New test files needed:
- `src/__tests__/unit/circuit-progress.test.ts` — unit tests for `getCircuitProgress` pure function.
- `src/__tests__/components/CircuitProgressCell.test.tsx` — render tests for visual states.
- `src/__tests__/components/CirugiasEmptyState.test.tsx` — render tests.

---

## Open Questions for Franco

1. **Mini-stepper simplification:** Devolución and Comparativa stages are NOT computable with simple store lookups (Comparativa needs stockItems). Proposed to fold them into a 7-dot stepper (CX → PR → NR → Consumo → Doc → Fact → Cobro). **¿Estás de acuerdo con omitir Devolución y Comparativa del stepper por ahora?** Se pueden agregar cuando el backend tenga helpers dedicados.

2. **Urgente column:** ¿Mantener la columna "Urgente" toggleable (para usuarios que la quieren) o eliminarla y dejar solo el tinte de fila? Propuesta: **mantener ambas** — la columna como badge opcional + el tinte como comportamiento base.

3. **Fecha contextual vs la fecha plana:** ¿Reemplazar `formatDate` en la columna "Fecha CX" por la fecha contextual, o mostrar ambas (text relativo + fecha real en tooltip)? Propuesta: **reemplazar con contextual + tooltip mostrando la fecha exacta.**

---

## Handoff

### Done
- Read-only exploration of Cirugías data table component tree
- Verified all store helpers available for circuit stage computation
- Confirmed 7 stages computable with existing data (Devolución/Comparativa excluded)
- Identified all test files and impact lines
- Mapped risk per file per AGENTS.md §10 lock sensitivity

### Changed
- Created: `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/EXPLORATION.md`

### Files
- `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/EXPLORATION.md` — this exploration artifact

### Validations
- Grep-confirmed store helpers exist: getPresupuestosBySurgeryId, getRemitosBySurgeryId, getConsumoBySurgeryId, getDocStatus, getResumenCobranzaBySurgeryId
- Confirmed Devolución has no dedicated store helper (only embedded in comparativa)
- Confirmed comparativa requires stockItems (complex, deferred)
- Read CirugiasTable.test.tsx — identified 3 assertions to preserve

### Risks
- Mini-stepper adds 7 store lookups per row; prototype-scale safe but flagged for backend
- 21st column increases horizontal density; mitigated by compact width
- DEFAULT_VISIBLE_COLS addition requires graceful handling for users with persisted Zustand column visibility (already handled by useColumnVisibility validation)
- Row min-height may shift visual rhythm; needs browser QA verification

### Next
- Franco answers 3 open questions
- Launch `sdd-propose` to generate PROPOSAL.md from this exploration
- Then `sdd-spec` → `sdd-design` → `sdd-tasks` → `sdd-apply`