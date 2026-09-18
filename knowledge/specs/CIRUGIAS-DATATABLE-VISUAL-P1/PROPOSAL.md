# Proposal — CIRUGIAS-DATATABLE-VISUAL-P1

Status: proposed  
Change: `CIRUGIAS-DATATABLE-VISUAL-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)  
Exploration: `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/EXPLORATION.md`

---

## Summary

Visual polish of the Cirugías data table across two phases: **Phase A** (scannability — zebra striping, solid header, consistent row height, rich empty state) and **Phase B** (information hierarchy — mini-stepper circuit progress, contextual relative dates, urgency row tint). All changes are UI-pure presentational layers over existing component state. No business logic, no backend, no database, no auth, no permissions, and no NewSurgeryDialog changes.

---

## Why this change

The Cirugías data table is the operational cockpit of OSSUM COR — coordinators spend most of their time here sorting, scanning, and acting on surgeries. At 11px density across 20 columns and 39 source files (~6,000+ lines of functional code), the current table sacrifices scannability and information hierarchy for raw data density. Rows blend together (no zebra), headers are translucent (content bleeds through during horizontal scroll), empty states give no guidance, and critical operational signals (circuit progress, relative dates, urgency) are buried in flat text or isolated badges.

This change adds visual structure without touching business logic. Every item reads existing component state — no new validation passes, no new API calls, no new persistence, and no new auto-apply paths. The phase split deliberately keeps high-value/low-risk visual items in Phase A (immediate, low-test-impact) and defers the higher-complexity information hierarchy items to Phase B (which introduce new components and a new computed data pipeline).

---

## Approved scope

### Phase A — Escaneabilidad inmediata

| Item | Description | Risk | Approach |
|---|---|---|---|
| A1 | Zebra striping — alternating row backgrounds via `even:bg-muted/15` | Low | CSS nth-child on `<table>`, selection overrides via specificity |
| A2 | Solid header background — replace `bg-muted/40` with `bg-muted` | Low | Single className change in `CirugiasTable.tsx` thead |
| A3 | Consistent row height — `min-h-[34px]` on all `<td>` via shared `CELL_BASE` constant | Low | `CELL_BASE` constant applied to non-special cells in `CirugiaRow` |
| A4 | Rich empty state — illustrated component with CTA + filter hint | Low | New `CirugiasEmptyState.tsx` component, `onClearFilters` + `onNewSurgery` optional props |

### Phase B — Jerarquía informativa

| Item | Description | Risk | Approach |
|---|---|---|---|
| B5 | Mini-stepper de progreso del circuito — 7 dots (CX → PR → NR → Consumo → Doc → Fact → Cobro) | Medium | New `CircuitProgressCell.tsx` + `getCircuitProgress()` pure function, computed in `page.tsx`, passed as prop |
| B6 | Fecha contextual — relative labels (Hoy, Mañana, Ayer, Vence en Nd) with color variants + exact-date tooltip | Low | New `formatContextualDate()` in `formatters.ts`, applied to date cell in `CirugiaRow` |
| B7 | Urgente como tinte de fila — row-level red tint (`bg-red-50/40`), column stays toggleable | Medium | Tr className logic + sticky cell background update in `CirugiaRow` |

### Out of scope (postergado)

- **Phase C:** toggle de densidad, min-widths por columna, acción primaria diferenciada.
- **Phase D:** agrupación por fecha con headers pegajosos.
- **NewSurgeryDialog.tsx** and any dialog files — another session owns them. Zero touch.
- Any business logic, Prisma, backend, auth, permissions, API routes, validators, services, or providers.
- Devolución and Comparativa stages in the mini-stepper (require complex `stockItems` lookups, deferred to backend phase).

---

## Three decisions approved by Franco

### D1 — Mini-stepper de 7 dots (CX → PR → NR → Consumo → Doc → Fact → Cobro)

Devolución and Comparativa are excluded from the visual stepper because they require complex store lookups (`comparativa.utils.ts` needs stockItems) and are intermediate quality-control steps not always present. The 7-stage simplification aligns with Districorr's principle: **the circuit adapts without disappearing**. When backend helpers for Devolución and Comparativa are available (GPT-027F.5A+), they can be added as additional dots. See EXPLORATION.md §B5 lines 115-126 for the data-source analysis.

### D2 — Urgente: columna toggleable + tinte de fila como comportamiento base

The column is the **registro** (what got declared at creation), the row tint is the **señal operativa** (what catches the eye during scanning). Both coexist. The column stays in `CIRUGIAS_COLUMNS` and `DEFAULT_VISIBLE_COLS`; the row tint is always active when `s.urgente === true`. This aligns with Districorr's concept: urgency is declared, identified, and registered.

### D3 — Fecha contextual reemplaza fecha plana en "Fecha CX", con tooltip mostrando fecha exacta

Relative dates (Hoy, Mañana, Ayer, Vencida hace Nd, En Nd) are the natural language of Districorr's operational rhythm of time cuts (08:15, 10:30, 13:00, 16:30). The exact date remains accessible via tooltip. The existing `formatDate` function in `formatters.ts` is preserved — `formatContextualDate` is an additive function that wraps it.

---

## Implementation direction

### Architecture principle

All changes are additive and presentational. No existing behavior is modified. The component tree stays:

```
page.tsx → CirugiasTable → CirugiaRow → sub-cells (StatusCell, PreparationCell, OperationalBadges, ActionsCell, +new CircuitProgressCell)
```

### Phase A approach

- **A1 (Zebra):** Table-level CSS selector `[&_tbody_tr:nth-child(even)]:bg-muted/15` on `<table>` className in `CirugiasTable.tsx`. Selection override (`bg-primary/5`) wins via direct tr className specificity.
- **A2 (Solid header):** Replace `bg-muted/40` with `bg-muted` on `<thead> <tr>` className in `CirugiasTable.tsx`.
- **A3 (Consistent row height):** Add a `CELL_BASE` Tailwind constant string (`px-2.5 py-1.5 min-h-[34px] align-middle`) applied to all non-special `<td>` in `CirugiaRow.tsx`. Special cells (status, badges, actions, preparation) self-manage height.
- **A4 (Rich empty state):** New `CirugiasEmptyState.tsx` component with `onClearFilters?: () => void`, `onNewSurgery?: () => void`, `hasActiveFilters: boolean` props. Renders icon + message + conditional "Limpiar filtros" button + "Nueva cirugía" CTA. `CirugiasTable.tsx` renders it instead of the plain `<td colSpan>` text. Existing test assertion (`screen.getByText(/No se encontraron cirugías/)`) continues to pass.

### Phase B approach

- **B5 (Mini-stepper):** New pure function `getCircuitProgress(surgery, getPresupuestos, getRemitos, getConsumo, getDocStatus, getResumenCobranza): CircuitStage[]` in a new file `src/lib/circuit-progress.ts` or `src/lib/cirugias.utils.ts`. Computed once per surgery with `useMemo` in `page.tsx`, passed as `circuitProgress` prop through `CirugiasTable` → `CirugiaRow` → new `CircuitProgressCell.tsx`. New column key `"circuitProgress"` added to `CIRUGIAS_COLUMNS`, `DEFAULT_VISIBLE_COLS`, and `NON_SORTABLE_KEYS`. Visual: 7 horizontal dots with emerald done / blue pulse current / muted outline pending. Width: ~120px compact.
- **B6 (Fecha contextual):** New `formatContextualDate(date: string): { text: string; variant: ContextualDateVariant }` function in `src/lib/formatters.ts`. Logic: compare `YYYY-MM-DD` with `new Date()`, return label + variant (overdue → amber, today → blue bold, tomorrow → sky, soon → neutral, neutral → muted-foreground). Applied in `CirugiaRow.tsx` date cell render, wrapped in a `<span>` with tooltip showing the exact formatted date.
- **B7 (Urgente row tint):** When `s.urgente === true`, apply `bg-red-50/40 border-l-[3px] border-l-red-400` to `<tr>`. Sticky cells get `bg-red-50/60` via `stickyCellClasses` update (must cover scrolled content). Selection wins over urgent; urgent wins over zebra. ClassName priority: Selected > Urgent > Zebra > Base.

### File lock and ownership

Per AGENTS.md §10, the following files are critical/high-risk and require explicit ownership lock before edits:

| File | Lock level | Phase | Impact |
|---|---|---|---|
| `src/components/cirugias/CirugiasTable.tsx` | Critical (§10) | A + B | Header bg, empty state, zebra CSS, new column wiring, circuitProgress prop threading |
| `src/components/cirugias/CirugiaRow.tsx` | Critical (§10) | A + B | Tr className, sticky cell logic, date cell, circuit cell, height normalization |
| `src/lib/cirugias.constants.ts` | Critical (§10) | B | New column key, DEFAULT_VISIBLE_COLS, NON_SORTABLE_KEYS |
| `src/components/cirugias/CirugiaActionsCell.tsx` | Critical (§10) | None | Phase C only (out of scope) — no touch |
| `src/components/cirugias/CirugiaOperationalBadges.tsx` | Critical (§10) | A | Height normalization only (low impact) |
| `src/app/cirugias/page.tsx` | High risk (§10) | B | Wire circuitProgress + empty state callbacks |
| `src/lib/formatters.ts` | — | B | Add `formatContextualDate`, preserve `formatDate` |

**New files** (no existing lock conflict):
- `src/components/cirugias/CirugiasEmptyState.tsx`
- `src/components/cirugias/CircuitProgressCell.tsx`
- `src/lib/circuit-progress.ts` (or appended to `cirugias.utils.ts`)

### Constraints

1. Do **NOT** touch `NewSurgeryDialog.tsx` or any dialog files — another session owns them.
2. No business logic changes — every item reads existing state, never mutates behavior.
3. No Prisma, backend, auth, permissions, API routes, validators, services, or providers.
4. Preserve all existing test assertions (see Test Impact below).
5. Follow AGENTS.md §10 file lock sensitivity — lock critical files before editing.

---

## Expected repo impact

### Files modified

| File | Phase | Changes |
|---|---|---|
| `src/components/cirugias/CirugiasTable.tsx` | A, B | A1 zebra CSS, A2 solid header, A4 empty state replacement, B5 circuitProgress column wiring |
| `src/components/cirugias/CirugiaRow.tsx` | A, B | A3 CELL_BASE constant, B6 date cell rewrite, B7 urgent className + stickyCellClasses update, B5 circuit cell render |
| `src/lib/cirugias.constants.ts` | B | Add `"circuitProgress"` to CIRUGIAS_COLUMNS, DEFAULT_VISIBLE_COLS, NON_SORTABLE_KEYS |
| `src/lib/formatters.ts` | B | Add `formatContextualDate()` function |
| `src/app/cirugias/page.tsx` | B | Compute `circuitProgress` per surgery, pass empty state callbacks |

### Files added

| File | Phase | Purpose |
|---|---|---|
| `src/components/cirugias/CirugiasEmptyState.tsx` | A | Rich empty state component with icon, message, CTA, filter hint |
| `src/components/cirugias/CircuitProgressCell.tsx` | B | 7-dot mini-stepper presentational component |
| `src/lib/circuit-progress.ts` | B | Pure `getCircuitProgress()` function |

### Test impact

**Files that need updates:**

- `src/__tests__/components/CirugiasTable.test.tsx` — `createTableProps()` may need `circuitProgress` prop. Line 170 regex still matches. Lines 130, 225 unchanged. `columnOrder` factory auto-includes new column.
- `src/__tests__/unit/cirugias-estado-prep-separation.test.ts` — Asserts on CX_STATE_COLORS and CX_STATE_CELL_COLORS are untouched → safe.
- `src/__tests__/unit/cirugia-creation.test.ts` — Surgery creation logic, not visual → safe.
- `src/__tests__/unit/post-creation-actions.test.ts` — Post-creation actions, not visual → safe.

**New test files needed:**

- `src/__tests__/unit/circuit-progress.test.ts` — Unit tests for `getCircuitProgress()` pure function (all 7 stages, edge cases).
- `src/__tests__/components/CircuitProgressCell.test.tsx` — Render tests for visual states (done/current/pending).
- `src/__tests__/components/CirugiasEmptyState.test.tsx` — Render tests for with/without filters, CTA click.
- `src/__tests__/unit/formatContextualDate.test.ts` — Unit tests for relative date variants (Hoy, Mañana, Ayer, overdue, soon).

---

## Risks and open design points

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Mini-stepper performance** — 7 store lookups per row in large datasets | Medium (prototype-scale low) | Medium — page render lag | `useMemo` per surgery in `page.tsx`. Flagged for backend phase where DB queries replace in-memory lookups. |
| R2 | **21st column increases horizontal density** — already 20 columns at 11px density | Medium | Low — extra scroll width | Column is compact (~120px). Column visibility is configurable — users can hide it. `DEFAULT_VISIBLE_COLS` honors existing Zustand persistence. |
| R3 | **Zebra vs sticky cell visual break** — sticky cells have solid bg, covering zebra pattern | Low | Low — minor cosmetic inconsistency | This is intentional and acceptable. Sticky cells need solid backgrounds to cover scrolled content. Non-sticky cells still show zebra rhythm. |
| R4 | **DEFAULT_VISIBLE_COLS addition for persisted users** — users with saved Zustand column visibility may not see new `circuitProgress` column | Low | Low — column hidden until user toggles it on | `useColumnVisibility` hook (line 44-45) already validates all keys from CIRUGIAS_COLUMNS — new keys are recognized but not auto-visible for existing configs. This is acceptable; the column appears for new configs and is discoverable in the column selector. |
| R5 | **Fecha contextual is client-side relative** — "Hoy" depends on `new Date()` at render time; no server clock | Low | Low — prototype environment | App runs in single timezone (Argentina). Acceptable for prototype. Server-side clock will be addressed in backend phase. |
| R6 | **Row min-height may shift visual rhythm** — enforcing `min-h-[34px]` may inflate or deflate some rows unexpectedly | Low | Medium — QA verification needed | Browser QA after implementation to verify all cell types (badges, buttons, text) render at consistent height. |
| R7 | **No regression net for new components** — CircuitProgressCell and CirugiasEmptyState are new with zero existing coverage | Medium | Medium — bugs may slip through | New test files required (see Test Impact section). Unit tests for `getCircuitProgress()` and `formatContextualDate()` provide pure-function coverage. |

---

## Dependencies

### Internal (this repo)

| Dependency | Status | Blocker? |
|---|---|---|
| EXPLORATION.md completed | ✅ Done | No — input artifact for this proposal |
| `useOrtoTrackStore` helpers for circuit stages | ✅ Exist: `getPresupuestosBySurgeryId`, `getRemitosBySurgeryId`, `getConsumoBySurgeryId`, `getDocStatus`, `getResumenCobranzaBySurgeryId` | No |
| `useColumnVisibility` hook graceful handling of unknown keys | ✅ Confirmed (line 44-45 validates from CIRUGIAS_COLUMNS) | No |
| Existing test assertions preserved | ✅ Identified in EXPLORATION.md | Yes — must pass before merge |
| File lock on NewSurgeryDialog.tsx (another session) | 🔒 Locked by other session | Yes — zero touch allowed |

### External

| Dependency | Status | Blocker? |
|---|---|---|
| Franco approval of three decisions (D1-D3) | ✅ Approved | No — captured in this proposal |
| Franco approval of Phase A + Phase B scope | ✅ Approved | No — base for this proposal |
| GPT-027F.0A/0B sequence prohibitions (AGENTS.md §5/§11) | ⚠️ Active — no backend/DB/auth | No — this change is UI-pure, respects all prohibitions |

### Deferred to future

| Item | When |
|---|---|
| Devolución and Comparativa in circuit stepper | GPT-027F.5A+ (backend helpers available) |
| Server-side clock for contextual dates | GPT-027F.5A (backend foundation) |
| DB-queried circuit stages (vs in-memory store lookups) | GPT-027F.5A (backend foundation) |
| Phase C (density toggle, min-widths, primary action) | Post-Backend Foundation |
| Phase D (date grouping with sticky headers) | Post-Backend Foundation |

---

## Success criteria

1. Phase A items visually verified: zebra rows alternate on unselected rows, header is solid, all rows have consistent height, empty state shows icon + CTA + filter hint.
2. Phase B mini-stepper renders 7 dots with correct done/current/pending states per surgery.
3. Fecha contextual displays relative labels with correct color variants and exact date in tooltip.
4. Urgent rows show red tint while the column remains toggleable.
5. All existing test assertions pass unchanged.
6. New test files exist with meaningful coverage for `getCircuitProgress()`, `formatContextualDate()`, `CircuitProgressCell`, and `CirugiasEmptyState`.
7. TypeScript compiles clean with no errors.
8. No Prisma format/generate, no migration, no schema change, no auth change.
9. File locks for critical files are declared and respected per AGENTS.md §9.3/§10 before any edit.
10. `NewSurgeryDialog.tsx` and all dialog files are untouched.

---

## Proposed next steps

The SDD artifact chain for this change is:

1. **✅ EXPLORATION.md** — Done. Read-only exploration of component tree, store helpers, feasibility, and test impact.
2. **✅ PROPOSAL.md** — This artifact. Scope, decisions, risks, dependencies, and implementation direction.
3. **➡️ `sdd-spec`** — Generate `SPEC.md` from this proposal. Define precise behavior, acceptance criteria, visual states, className contracts, component props/interfaces, and test requirements for all 7 items. No code yet — spec-level precision only.
4. **➡️ `sdd-design`** — Generate `DESIGN.md` from the spec. Define component tree changes, data flow for `circuitProgress` prop threading, `formatContextualDate` interface, sticky cell className logic for urgent rows, and new column wiring in `CIRUGIAS_COLUMNS`.
5. **➡️ `sdd-tasks`** — Generate `TASKS.md` from the design. Sequence individual implementation slices (e.g., A1-A3 together as one slice since they share `CirugiasTable.tsx` + `CirugiaRow.tsx`, A4 separately, B6 independently, B5 + B7 together since both touch `CirugiaRow.tsx`). Each slice includes file lock declarations per AGENTS.md §9.3.
6. **➡️ `sdd-apply`** — Execute the tasks, respecting file locks, maintaining existing tests, adding new tests, and validating at each slice.

**Proceed to `sdd-spec` for CIRUGIAS-DATATABLE-VISUAL-P1.** No code changes until spec is written and reviewed.

---

## Caveman handoff

```text
Done:
- PROPOSAL.md written for CIRUGIAS-DATATABLE-VISUAL-P1
- Three Franco-approved decisions captured (D1: 7-dot stepper, D2: urgent column+tint, D3: contextual date with tooltip)
- Phase A (4 items) + Phase B (3 items) scoped with implementation approaches
- Risk assessment (7 risks) + dependencies (internal/external/deferred) documented
- Test impact mapped (4 existing test files preserved, 4 new test files needed)
- File lock sensitivity table per AGENTS.md §10

Changed:
- Created: knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/PROPOSAL.md

Files:
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/PROPOSAL.md — proposal artifact
- knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/EXPLORATION.md — input (unchanged)

Validations:
- EXPLORATION.md reviewed — all findings incorporated
- Existing PROPOSAL.md format (NUEVA-CIRUGIA-IA-UX-P1, MAIL-V1-ETAPA3-GMAIL-REAL) — followed
- AGENTS.md §10 file lock sensitivity — mapped per file
- AGENTS.md §5/§11 prohibitions — confirmed no violations (UI-pure, no backend/DB/auth)

Risks:
- R1: Mini-stepper 7-store-lookups-per-row — useMemo mitigation, flagged for backend
- R4: Persisted Zustand column visibility may not show new column — acceptable, discoverable
- R6: Row min-height visual rhythm shift — needs browser QA
- R7: Zero regression coverage for new components — new test files required

Next:
- Proceed to sdd-spec for CIRUGIAS-DATATABLE-VISUAL-P1
```
