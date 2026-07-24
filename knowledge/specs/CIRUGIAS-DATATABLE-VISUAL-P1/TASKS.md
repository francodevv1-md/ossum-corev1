# TASKS.md — CIRUGIAS-DATATABLE-VISUAL-P1

Status: ready
Change: `CIRUGIAS-DATATABLE-VISUAL-P1`
Phase: A + B — UI-pure presentational polish of the Cirugías data table
Artifact store: hybrid (filesystem + Engram)

> Status note (2026-06-25): this file remains the original execution plan. The latest implemented UI outcomes already reflected in the project are: 4 separate date columns (`Fecha CX`, `Fecha probable`, `Fecha logística`, `Fecha envío`), explicit/dominant `Fecha CX` without relative primary text, canonical logistics date from `surgery.fechaEnvioMaterial`, canonical shipping date from `logistics.fechaEnvioMateriales`, reordered operational columns, and browser-QA-driven header/date hierarchy refinements.

---

## Reference

- Exploration: `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/EXPLORATION.md`
- Proposal: `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/PROPOSAL.md`
- Spec: `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/SPEC.md` (acceptance criteria AC-A1 … AC-CROSS-06)
- Design: `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/DESIGN.md` (component contracts, insertion points, className maps, test plan, §9 implementation sequencing)
- Root rules: `AGENTS.md` §9.2/§9.3 (one task / one owner / file locks), §9.5/§9.6 (approval boundaries, stop/escalate), §10 (sensitive files), §11 (prohibitions), §12 (quality gates), §13 (handoff)

All line numbers below are verified against the on-disk files per DESIGN §6 (file-by-file design) and §8 (test design). The 4-slice plan follows DESIGN §9 "Implementation Sequencing" verbatim.

---

## Guardrails for all tasks

- No edit to `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`.
- No edit to any file under `src/app/api/**`, `src/lib/validators/**`, or `src/lib/services/**`.
- No edit to `src/components/cirugias/dialogs/**` (incl. `NewSurgeryDialog.tsx`) — locked by another session. Zero touch (AC-CROSS-05).
- No edit to `src/hooks/useCirugia*.ts` — `useCirugiaActions.ts`, `useCirugiasFilters.ts`, `useCirugiaSelection.ts` stay read-only consumers (their outputs — `filters.clearFilters`, `filters.hasActiveFilters`, `actions.openNewSurgeryDialog` — are already available and only passed through).
- No new dependency in `package.json` / lockfile (AGENTS.md §11).
- No schema, migration, auth, multi-company, or provider change (AGENTS.md §5/§11).
- No Prisma format/generate, no build pipeline change, no Tailwind CDN.
- No new Zustand slice, no new localStorage key, no new persistence. `circuitProgressMap` is transient computation (`useMemo`).
- No business logic change: every item READS existing component state; none mutates behavior, validation, or persistence (SPEC §6.10).
- `formatDate()` is preserved byte-for-byte — `formatContextualDate()` is an additive wrapper only (AC-CROSS-01).
- Existing constants in `cirugias.constants.ts` are not modified; only additive entries (`CELL_BASE`, `circuitProgress` column key) are inserted (AC-CROSS-01).
- Emerald / shadcn / blue / red / amber / sky / muted-foreground Tailwind tokens only — no mockup hex palette (SPEC §11, design system guardrail).
- Urgency className priority is inviolable: **Selected > Urgent > Zebra > Base** (AC-B7-02). Zebra is table-level CSS; Selected and Urgent are direct `<tr>` className and win via CSS specificity — no explicit `isEven` override is added.
- The Urgente column stays toggleable (AC-B7 / D2) — never removed. Column badge rendering is unchanged.
- One task = one owner = one scope = one set of files = one handoff (AGENTS.md §9.2).

---

## File Ownership & Locks

Locks follow the lifecycle `reserved` → `editing` → `review` → `released` (AGENTS.md §9.3). Each task below declares the locks it acquires; locks are released only in T8.

### Critical files (AGENTS.md §10 — Lock obligatorio)

| Lock ID | File | Touched by slices |
|---|---|---|
| L1 | `src/components/cirugias/CirugiasTable.tsx` | Slice 1, Slice 2, Slice 4 |
| L2 | `src/components/cirugias/CirugiaRow.tsx` | Slice 1, Slice 3, Slice 4 |
| L3 | `src/lib/cirugias.constants.ts` | Slice 1, Slice 4 |

### High-risk files (AGENTS.md §10 — coordinar ownership)

| Lock ID | File | Touched by slices |
|---|---|---|
| L4 | `src/app/cirugias/page.tsx` | Slice 2, Slice 4 |
| L5 | `src/lib/formatters.ts` | Slice 3 |

### New files (no existing lock conflict)

| File | Created by slice |
|---|---|
| `src/components/cirugias/CirugiasEmptyState.tsx` | Slice 2 |
| `src/components/cirugias/CircuitProgressCell.tsx` | Slice 4 |
| `src/lib/circuit-progress.ts` | Slice 4 |

### Forbidden files — ZERO TOUCH

| File / tree | Reason |
|---|---|
| `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`, `src/types/index.ts` | AGENTS.md §10 / §11 + change brief |
| `src/app/api/**` | no backend changes |
| `src/lib/services/**`, `src/lib/validators/**` | no service/validator changes |
| `src/hooks/useCirugia*.ts` | hooks consumed read-only; not edited |
| `src/components/cirugias/dialogs/**` (incl. `NewSurgeryDialog.tsx`) | external lock — another session (AC-CROSS-05) |
| `src/components/cirugias/CirugiaActionsCell.tsx` | Phase C only (out of scope) — unchanged |
| `src/components/cirugias/CirugiaStatusCell.tsx`, `CirugiaPreparationCell.tsx`, `CirugiaOperationalBadges.tsx` | unchanged (self-contained sizing) |
| `src/components/cirugias/CirugiasToolbar.tsx` | Phase C only (out of scope) — unchanged |

### Slice → lock matrix

| Slice | Locks held | Lifecycle |
|---|---|---|
| Slice 1 (T2) | L1, L2, L3 | reserved → editing → review |
| Slice 2 (T3) | L1, L4 | reserved → editing → review |
| Slice 3 (T4) | L2, L5 | reserved → editing → review |
| Slice 4 (T5) | L1, L2, L3, L4 | reserved → editing → review |

Slices are executed strictly sequentially (one writer per critical file at a time). The matrix intentionally re-acquires shared locks (L1, L2) across slices because those files are touched by more than one slice — the lock is released between slices and re-reserved at the start of the next owning slice.

---

## Suggested slice / task order

1. **T1** — Declare ownership locks (prerequisite for all)
2. **T2** — Slice 1: A1 + A2 + A3 (zebra, solid header, consistent row height)
3. **T3** — Slice 2: A4 (rich empty state)
4. **T4** — Slice 3: B6 (contextual date)
5. **T5** — Slice 4: B5 + B7 (mini-stepper + urgency row tint)
6. **T6** — Test finalization (4 new test files)
7. **T7** — Validation gate (`tsc --noEmit` + `npm test`)
8. **T8** — Release locks + Caveman handoff + Engram session summary

> No two slices edit the same critical file concurrently. Slices 1–4 are sequential; T6 writes only new test files (no shared critical-source lock with the slices). T7 and T8 touch no source files.

---

## Task T1 — Declare ownership locks

### Goal

Declare and record the ownership locks (L1–L5) over the critical and high-risk files before any edit, per AGENTS.md §9.3/§10 and DESIGN §9. This is a prerequisite for every implementation slice.

### Files

- None edited. Lock record declared in the task handoff / worklog (and Engram if used).

### Dependencies

- None.

### Acceptance criteria

- AC-CROSS-06 — File locks for critical files are declared before edits.

### Tasks

- [ ] Declare L1 over `src/components/cirugias/CirugiasTable.tsx` (status `reserved`).
- [ ] Declare L2 over `src/components/cirugias/CirugiaRow.tsx` (status `reserved`).
- [ ] Declare L3 over `src/lib/cirugias.constants.ts` (status `reserved`).
- [ ] Declare L4 over `src/app/cirugias/page.tsx` (status `reserved`).
- [ ] Declare L5 over `src/lib/formatters.ts` (status `reserved`).
- [ ] Record agent role, selected LLM, owned files, and status for each lock.
- [ ] Confirm no other task/session holds an overlapping file (especially `NewSurgeryDialog.tsx` and `dialogs/` — external lock) before moving any lock to `editing`.

### Validation

- Lock declarations visible in the handoff / worklog before the first code edit.
- L1–L5 file sets are pairwise disjoint with the dialog lock scope held by the other session.

### Stop / escalate

- Another task already holds any of L1–L5 → stop and escalate to Orchestrator (AGENTS.md §9.3/§9.4).
- A dialog file overlaps with the intended scope → stop; the dialog lock is external and untouchable.

---

## Task T2 — Slice 1: A1 + A2 + A3 (scannability CSS)

### Goal

Apply the three low-risk CSS-only scannability items in a single pass over the two table-shell/cell files, plus the additive `CELL_BASE` constant. Combining them avoids re-locking `CirugiasTable.tsx` and `CirugiaRow.tsx` across multiple slices (DESIGN §9 rationale).

Covers items: **A1** (zebra striping), **A2** (solid header background), **A3** (consistent row height).

### Files

- `src/lib/cirugias.constants.ts` (L3 lock → `editing`) — ADD `CELL_BASE` constant (DESIGN §4.5 / §6.1 change C1).
- `src/components/cirugias/CirugiasTable.tsx` (L1 lock → `editing`) — zebra CSS on `<table>` (T1), solid header on `<thead>` row (T2).
- `src/components/cirugias/CirugiaRow.tsx` (L2 lock → `editing`) — replace per-cell `px-2.5 py-1.5` with `CELL_BASE` on standard cells (R5).

### Dependencies

- T1 (locks L1, L2, L3 declared).

### Acceptance criteria

- AC-A1-01 — Zebra alternates row backgrounds on unselected rows via a single table-level CSS selector.
- AC-A1-02 — Selection and urgency override zebra (Selection and Urgency are NOT added here — they are added in Slice 4; this slice only establishes the table-level zebra CSS and verifies the override model holds by CSS specificity, not by adding the urgency classes).
- AC-A2-01 — Header background is solid and opaque.
- AC-A2-02 — Header change is a single className replacement.
- AC-A3-01 — Standard cells enforce consistent min-height via `CELL_BASE`.
- AC-A3-02 — Special cells (status, prep, badges, actions, circuit) are excluded from `CELL_BASE`.

### Tasks

- [ ] **C1 — `cirugias.constants.ts` (L3):** After the `NON_SORTABLE_KEYS` constant (DESIGN §4.5), ADD:
  ```ts
  /** Shared base className for standard table cells. Enforces consistent min-height and alignment. */
  export const CELL_BASE = "px-2.5 py-1.5 min-h-[34px] align-middle"
  ```
  Do NOT modify any existing constant.
- [ ] **T1 — `CirugiasTable.tsx` (L1):** On the `<table>` element className (DESIGN §5.2 / §6.2 change T1), append the zebra selector:
  - Before: `className="w-full text-sm border-collapse"`
  - After: `className="w-full text-sm border-collapse [&_tbody_tr:nth-child(even)]:bg-muted/15"`
- [ ] **T2 — `CirugiasTable.tsx` (L1):** On the `<thead>` `<tr>` className (DESIGN §5.3 / §6.2 change T2), replace the translucent header background with solid:
  - Before: `border-b bg-muted/40`
  - After: `border-b bg-muted`
  - No other header attribute (sticky positioning, z-index, border-bottom class, column widths) is changed.
- [ ] **R5 — `CirugiaRow.tsx` (L2):** Import `CELL_BASE` from `@/lib/cirugias.constants`. Replace `"px-2.5 py-1.5"` (or its equivalent hardcoded padding string) on every **standard** `<td>` cell in `renderCell()` with `CELL_BASE` per the DESIGN §5.1 application matrix. Use `cn(CELL_BASE, "...extra classes...")` when other Tailwind classes must be preserved (e.g. `whitespace-nowrap text-[11px]` on the `date` cell).
- [ ] Confirm excluded (no `CELL_BASE`) cells: `CirugiaStatusCell`, `CirugiaPreparationCell`, `CirugiaOperationalBadges` (the 3 composite `<td>`), `CirugiaActionsCell`, and the dedicated CircuitProgressCell case (added later in Slice 4 — not yet present, so no exclusion action needed in this slice). Date cell RECEIVES `CELL_BASE` (it is a standard plain-text cell with an extra `<span>` inside added later in Slice 3) (AC-A3-02).
- [ ] Confirm the zebra CSS selector is the SINGLE source of truth for zebra — do NOT add any per-row `isEven` prop, index, or condition. Zebra override by selection (added in Slice 4) relies on CSS specificity, not explicit conditionals (AC-A1-02).

### Validation

- `npx tsc --noEmit` clean (run collectively in T7; this slice can do a local check).
- Existing `src/__tests__/components/CirugiasTable.test.tsx` assertions still pass: row count line 130, selection class `bg-primary/5` line 225, empty-state regex line 170 (unchanged in this slice).
- Browser QA: even rows alternate subtly; header is solid during horizontal scroll; row heights appear uniform (R6 — visual rhythm may shift slightly; verify per AC-A3-01).

### Stop / escalate

- A `<td>` cell is ambiguous in the `CELL_BASE` application matrix → stop and surface to the spec owner; do not guess.
- Applying `CELL_BASE` to a self-contained badge cell renders incorrectly (height shift) → exclude that cell and note it (DESIGN §5.1 special-cell rule).
- Scope expands to urgency, date, or circuit columns → stop; those are Slices 3 and 4.

---

## Task T3 — Slice 2: A4 (rich empty state)

### Goal

Replace the plain `<td colSpan>` empty-state block in `CirugiasTable.tsx` with a new illustrated `CirugiasEmptyState` component, wire the three new optional props (`onClearFilters`, `onNewSurgery`, `hasActiveFilters`), and pass the callbacks through from `page.tsx`. Isolated change — replaces a dead-end block; no other slice touches empty-state logic.

### Files (new)

- `src/components/cirugias/CirugiasEmptyState.tsx` (no lock conflict — new file)

### Files (modified)

- `src/components/cirugias/CirugiasTable.tsx` (L1 lock → `editing`) — replace empty-state block (T3), add 3 optional props to interface (T4).
- `src/app/cirugias/page.tsx` (L4 lock → `editing`) — pass `onClearFilters`, `onNewSurgery`, `hasActiveFilters` props (P3, partial).

### Dependencies

- T1 (locks L1, L4 declared).
- T2 (Slice 1 done) — recommended so that the `CirugiasTable.tsx` interface is edited once per slice and L1 is not concurrently held.

### Acceptance criteria

- AC-A4-01 — Rich empty state renders with icon, message, and conditional CTAs.
- AC-A4-02 — Existing empty-state test assertion continues to pass (regex `/No se encontraron cirugías/` matches).

### Tasks

- [ ] **Create `CirugiasEmptyState.tsx` (DESIGN §4.1):**
  - Interface (matches SPEC §9.1):
    ```ts
    interface CirugiasEmptyStateProps {
      onClearFilters?: () => void;
      onNewSurgery?: () => void;
      hasActiveFilters: boolean;
    }
    ```
  - Render `<tr><td colSpan={100}>` with `FolderSearch` icon (lucide-react, existing dep), the primary message `"No se encontraron cirugías con los filtros aplicados"` verbatim, conditional `hasActiveFilters` secondary hint text `"Probá ajustar o limpiar los filtros"` + `"Limpiar filtros"` button (renders only when `hasActiveFilters === true && onClearFilters` provided), and the always-available `"Nueva cirugía"` CTA button (renders only when `onNewSurgery` provided).
  - Use existing `Button` (shadcn/ui), `muted-foreground` tokens. No hex, no mockup palette.
- [ ] **T3 — `CirugiasTable.tsx` (L1):** Replace the empty-state block (DESIGN §6.2 change T3):
  - Before: `<tr><td colSpan={columns.length} ...>No se encontraron cirugías con los filtros aplicados</td></tr>`
  - After: `<CirugiasEmptyState onClearFilters={props.onClearFilters} onNewSurgery={props.onNewSurgery} hasActiveFilters={props.hasActiveFilters} />`
  - Import `CirugiasEmptyState` from `./CirugiasEmptyState`.
- [ ] **T4 — `CirugiasTable.tsx` interface (L1):** ADD the three optional props to `CirugiasTableProps`: `onClearFilters?: () => void`, `onNewSurgery?: () => void`, `hasActiveFilters: boolean`. (`circuitProgressMap` is added in Slice 4 — do NOT add it now.)
- [ ] **P3 (partial) — `page.tsx` (L4):** Pass the new props to `<CirugiasTable>`:
  - `onClearFilters={filters.clearFilters}` (already exists in `useCirugiasFilters()`)
  - `onNewSurgery={actions.openNewSurgeryDialog}` (already exists in `useCirugiaActions()`)
  - `hasActiveFilters={filters.hasActiveFilters}` (already exists in `useCirugiasFilters()`)
  - Do NOT add `circuitProgressMap` here — that is Slice 4.
- [ ] Confirm the message text `"No se encontraron cirugías con los filtros aplicados"` is byte-identical to the previous inline string so the regex at `CirugiasTable.test.tsx` line 170 still matches (AC-A4-02).
- [ ] Confirm `onClearFilters` / `onNewSurgery` buttons render ONLY when their callbacks are provided; the component never crashes on `undefined` callbacks (guards with optional chaining / conditional rendering).

### Validation

- `npx tsc --noEmit` clean (local check; full gate in T7).
- `src/__tests__/components/CirugiasTable.test.tsx` line 170 regex `/No se encontraron cirugías/` still matches.
- Browser QA: empty filtered view shows icon + message + filter hint (when filters active) + Nueva cirugía CTA.

### Stop / escalate

- `filters.clearFilters`, `filters.hasActiveFilters`, or `actions.openNewSurgeryDialog` is not exposed by the hooks → stop and escalate (would require editing `src/hooks/useCirugia*.ts`, which is forbidden).
- A different message string is demanded → stop (would break the existing test regex; needs spec update + Franco approval).

---

## Task T4 — Slice 3: B6 (contextual date)

### Goal

Add the additive `formatContextualDate()` function in `formatters.ts` and switch the `"date"` cell rendering in `CirugiaRow.tsx` to display the relative label with a variant-colored `<span>` and a native tooltip showing the exact formatted date. Isolated to the date cell — no prop threading, no other cell changes.

### Files (modified)

- `src/lib/formatters.ts` (L5 lock → `editing`) — ADD `formatContextualDate()` + `ContextualDateVariant`/`ContextualDateResult` types.
- `src/components/cirugias/CirugiaRow.tsx` (L2 lock → `editing`) — import `formatContextualDate` + type, add `DATE_VARIANT_CLASSES` constant at module scope, replace `"date"` case in `renderCell()`.

### Dependencies

- T1 (locks L2, L5 declared).
- T3 (Slice 2 done) — recommended so L2 is not held concurrently by two slices.

### Acceptance criteria

- AC-B6-01 — Date cell displays relative label with correct color variant.
- AC-B6-02 — Exact date is accessible via tooltip.
- AC-CROSS-01 — `formatDate` is preserved unchanged; `formatContextualDate` is additive only.

### Tasks

- [ ] **F1 — `formatters.ts` (L5):** After the existing `formatDateTime` function (DESIGN §4.4 / §6.4), ADD:
  - `export type ContextualDateVariant = "today" | "tomorrow" | "yesterday" | "overdue" | "soon" | "neutral"`
  - `export interface ContextualDateResult { text: string; variant: ContextualDateVariant }`
  - `export function formatContextualDate(date: string): ContextualDateResult` — parse `date + "T00:00:00"` (same pattern as `formatDate`), compare calendar days vs `new Date()`, return:
    - diff 0 → `{ text: "Hoy", variant: "today" }`
    - diff 1 → `{ text: "Mañana", variant: "tomorrow" }`
    - diff -1 → `{ text: "Ayer", variant: "yesterday" }`
    - diff < -7 → `{ text: "Vencida hace ${N}d", variant: "overdue" }`
    - diff ∈ (-7, 0) → `{ text: "Hace ${N}d", variant: "overdue" }`
    - diff ∈ [2, 3] → `{ text: "En ${N}d", variant: "soon" }`
    - else → `{ text: formatDate(date), variant: "neutral" }`
    - empty/invalid date → `{ text: "—", variant: "neutral" }` (try/catch)
  - `formatDate` must remain byte-for-byte identical (AC-CROSS-01).
- [ ] **R6 — `CirugiaRow.tsx` (L2):** Add the private `DATE_VARIANT_CLASSES` constant at module scope (DESIGN §5.5):
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
- [ ] **R6 — `CirugiaRow.tsx` (L2):** Replace the `"date"` case in `renderCell()` (DESIGN §6.3 change R6) so it computes `formatContextualDate(s.date)`, wraps `ctxDate.text` in `<span className={DATE_VARIANT_CLASSES[ctxDate.variant]} title={formatDate(s.date)}>` inside the existing `<td className={cn(CELL_BASE, "whitespace-nowrap text-[11px]")}>` (the `CELL_BASE` application already exists from Slice 1; keep it).
- [ ] Confirm `formatDate` is still imported and used ONLY for the `title` tooltip and the `"neutral"` fallback inside `formatContextualDate`. No other call site loses its `formatDate` import (AC-CROSS-01).
- [ ] Confirm no other column/case in `renderCell()` is touched in this slice.

### Validation

- `npx tsc --noEmit` clean (local check; full gate in T7).
- `formatDate` diff: zero bytes changed (verified by `git diff` — only additions in `formatters.ts`).
- Browser QA: today's surgery shows "Hoy" (blue bold), tomorrow "Mañana" (sky), past "Vencida hace Nd"/"Hace Nd" (amber); hovering shows `DD/MM/YYYY` tooltip.

### Stop / escalate

- `formatDate` would need to be modified (not wrapped) → stop (AC-CROSS-01 violation).
- A "soon" threshold other than `≤ 3 days` is requested → stop and escalate to spec owner (SPEC §6.7.1 defines the thresholds).
- Date comparison would require a server-side clock story → stop and escalate (GPT-027F.5A scope; client-side `new Date()` is the accepted prototype behavior per R5).

---

## Task T5 — Slice 4: B5 + B7 (mini-stepper + urgency tint)

### Goal

Combine the two information-hierarchy items that both modify `CirugiaRow.tsx` props and rendering in a single pass: **B5** (7-dot circuit progress mini-stepper with a new pure function, a new column key, and the prop-threading pipeline) and **B7** (row-level urgency tint with the className priority contract and sticky-cell background update). Combining avoids re-locking `CirugiaRow.tsx` twice (DESIGN §9 rationale).

### Files (new)

- `src/lib/circuit-progress.ts` (no lock conflict — new file)
- `src/components/cirugias/CircuitProgressCell.tsx` (no lock conflict — new file)

### Files (modified)

- `src/lib/cirugias.constants.ts` (L3 lock → `editing`) — ADD `circuitProgress` to `CIRUGIAS_COLUMNS`, `DEFAULT_VISIBLE_COLS`, `NON_SORTABLE_KEYS` (C2, C3, C4).
- `src/app/cirugias/page.tsx` (L4 lock → `editing`) — ADD `circuitProgressMap` `useMemo` (P2) + pass `circuitProgressMap` prop (P3, remainder).
- `src/components/cirugias/CirugiasTable.tsx` (L1 lock → `editing`) — ADD `circuitProgressMap?` interface prop (T4 remainder), thread `circuitProgress` + `rowIndex` to `CirugiaRow` (T5/T7), add imports (T6).
- `src/components/cirugias/CirugiaRow.tsx` (L2 lock → `editing`) — ADD `circuitProgress?` + `rowIndex?` props (R2), update `stickyCellClasses` for `isUrgent` (R3/R4), update `<tr>` className for urgency (R7), add `"circuitProgress"` case to `renderCell()` (R8), imports (R1), destructuring (R9).

### Dependencies

- T1 (locks L1, L2, L3, L4 declared).
- T2 (Slice 1 — `CELL_BASE` exists and is applied to standard cells; `CIRUGIAS_COLUMNS` already structured for the new insertion).
- T3 (Slice 2 — `CirugiasTable.tsx` interface already has the A4 props; Slice 4 adds one more prop).
- T4 (Slice 3 — `formatContextualDate` exists in `formatters.ts`; the date cell already renders contextually; Slice 4 must not undo that).

### Acceptance criteria

- AC-B5-01 — Mini-stepper renders 7 dots with correct done/current/pending states.
- AC-B5-02 — `getCircuitProgress` is a pure function with no store coupling.
- AC-B5-03 — New column is wired into column constants.
- AC-B7-01 — Urgent rows show red tint with red left border; sticky cells get `bg-red-50/60`.
- AC-B7-02 — ClassName priority follows Selected > Urgent > Zebra > Base.
- AC-CROSS-01 — `cirugias.constants.ts` receives only additive entries.

### Tasks

#### B5 — Mini-stepper core

- [ ] **Create `src/lib/circuit-progress.ts` (DESIGN §4.3):**
  - `export interface CircuitStage { key: "cx" | "pr" | "nr" | "consumo" | "doc" | "fact" | "cobro"; done: boolean; current: boolean }`
  - `export function getCircuitProgress(surgery, getPresupuestosBySurgeryId, getRemitosBySurgeryId, getConsumoBySurgeryId, getDocStatus, getResumenCobranzaBySurgeryId): CircuitStage[]` — pure, no `useOrtoTrackStore` import, no React hooks. Stage logic per SPEC §6.6.1: `cx` always done; `pr`/`nr`/`consumo` via helper result length/definedness; `doc` done when `getDocStatus` ∈ `{"Completa", "Apta para facturar"}`; `fact` done when `surgery.facturado === true`; `cobro` done when `getResumenCobranzaBySurgeryId(...).totalCobrado > 0`. `current` = first stage where `done === false`; if all done, no stage is `current`.
  - Returns exactly 7 stages in fixed order `cx → pr → nr → consumo → doc → fact → cobro`.
- [ ] **Create `src/components/cirugias/CircuitProgressCell.tsx` (DESIGN §4.2):**
  - Interface `CircuitProgressCellProps { stages: CircuitStage[] }`.
  - Renders its own `<td className="px-2 py-1.5">` wrapper (self-contained sizing — does NOT receive `CELL_BASE`, AC-A3-02).
  - 7 horizontal dots (`Dot` sub-component) connected by thin `Connector` lines, ordered by `STAGE_ORDER`. Done = `bg-emerald-500`; current = `bg-blue-500 ring-2 ring-blue-500/30 animate-pulse`; pending = `border border-muted-foreground/30 bg-transparent`. Connector color follows the LEFT dot (`bg-emerald-400` if done else `bg-muted-foreground/20`).
  - `min-w-[120px]` on the flex container for column-width parity (SPEC §6.6.2).
  - No tooltip required (deferred — optional per SPEC §6.6.3).
- [ ] **C2 — `cirugias.constants.ts` (L3):** Insert `{ key: "circuitProgress", label: "Circuito" }` in `CIRUGIAS_COLUMNS` BEFORE the `actions` entry (DESIGN §7.1). Do not modify existing entries.
- [ ] **C3 — `cirugias.constants.ts` (L3):** Add `circuitProgress: true` to `DEFAULT_VISIBLE_COLS` before `actions: true` (DESIGN §7.2).
- [ ] **C4 — `cirugias.constants.ts` (L3):** Append `"circuitProgress"` to `NON_SORTABLE_KEYS` (DESIGN §7.3).
- [ ] **P2 — `page.tsx` (L4):** Add the `circuitProgressMap` `useMemo` (DESIGN §6.5 change P2) iterating `store.surgeries` (full unfiltered list, per DESIGN §3.1 scope decision). Call `getCircuitProgress(s, store.getPresupuestosBySurgeryId, store.getRemitosBySurgeryId, store.getConsumoBySurgeryId, store.getDocStatus, store.getResumenCobranzaBySurgeryId)`. Dependencies: `[store.surgeries, store.getPresupuestosBySurgeryId, store.getRemitosBySurgeryId, store.getConsumoBySurgeryId, store.getDocStatus, store.getResumenCobranzaBySurgeryId]` (stable Zustand method refs — recompute only when surgery data changes).
- [ ] **P3 (remainder) — `page.tsx` (L4):** Pass `circuitProgressMap={circuitProgressMap}` to `<CirugiasTable>`.
- [ ] **T4 (remainder) — `CirugiasTable.tsx` interface (L1):** ADD `circuitProgressMap?: Record<string, CircuitStage[]>` to `CirugiasTableProps`. Import `CircuitStage` type from `@/lib/circuit-progress` (use `import type`).
- [ ] **T5/T7 — `CirugiasTable.tsx` (L1):** In the body `props.data.map((s, idx) => ...)`, pass `circuitProgress={props.circuitProgressMap?.[s.id]}` and `rowIndex={idx}` to `<CirugiaRow>` (DESIGN §6.2 changes T5/T7). Import `CircuitProgressCell`-adjacent types only if needed by the row.
- [ ] **R1 — `CirugiaRow.tsx` (L2):** ADD imports: `CELL_BASE` (already from Slice 1), `CircuitProgressCell`, type `CircuitStage` from `@/lib/circuit-progress`.
- [ ] **R2 — `CirugiaRow.tsx` (L2):** ADD `circuitProgress?: CircuitStage[]` and `rowIndex?: number` to `CirugiaRowProps`.
- [ ] **R8 — `CirugiaRow.tsx` (L2):** ADD the `"circuitProgress"` case to `renderCell()`:
  ```tsx
  case "circuitProgress":
    if (!circuitProgress) return null
    return <CircuitProgressCell key="circuitProgress" stages={circuitProgress} />
  ```
  Renders only when `circuitProgress` prop is provided and the key is visible.
- [ ] **R9 — `CirugiaRow.tsx` (L2):** Add `circuitProgress, rowIndex` to the destructured props.

#### B7 — Urgency row tint

- [ ] **R3 — `CirugiaRow.tsx` (L2):** Update `stickyCellClasses` signature to accept `isUrgent?: boolean` (5th param, default `false`), and update the background line (DESIGN §5.7):
  ```ts
  isSelected ? "bg-primary/5" : isUrgent ? "bg-red-50/60" : "bg-background"
  ```
- [ ] **R4 — `CirugiaRow.tsx` (L2):** Update ALL `stickyCellClasses` call sites to pass `s.urgente` as the 5th argument.
- [ ] **R7 — `CirugiaRow.tsx` (L2):** Update the `<tr>` className `cn()` (DESIGN §5.6) to enforce priority **Selected > Urgent > Zebra > Base**:
  ```tsx
  <tr className={cn(
    isSelected && "bg-primary/5 border-l-[3px] border-l-primary",
    s.urgente && !isSelected && "bg-red-50/40 border-l-[3px] border-l-red-400",
    "border-l-[3px] border-l-transparent",
    "group hover:bg-muted/30 transition-colors cursor-pointer",
  )}>
  ```
  Zebra (table-level CSS from Slice 1) is auto-overridden by the direct tr className via specificity — no `isEven` conditional is added (AC-B7-02).
- [ ] Confirm `stickyStateCellClasses` (the separate function for the status cell) is NOT changed — the status cell has its own solid colored background (DESIGN §5.7 note).
- [ ] Confirm the Urgente column rendering (badge column) is unchanged — column stays toggleable (D2 / AC-B7). Do NOT remove the column or its badge.

### Validation

- `npx tsc --noEmit` clean (local check; full gate in T7).
- Existing `CirugiasTable.test.tsx`: `columnOrder` factory (`CIRUGIAS_COLUMNS.map(c => c.key)`) auto-includes the new `circuitProgress` key — no test logic change required. `createTableProps()` factory provides no default for `circuitProgressMap` (optional, `undefined` is handled gracefully by the component).
- Browser QA: 7 dots render per row with correct done/current/pending colors; urgent rows show red tint + red left border; selected urgent rows show selection tint winning (blue); targeted Circuit column appears before Actions; disabling the Circuito column hides the dots but keeps urgency tint active.
- Performance spot check (prototype scale ~50–200 records): no perceptible render lag from the `useMemo` loop (R1 mitigation).

### Stop / escalate

- Adding Devolución / Comparativa stages to the stepper is demanded → stop (D1 decision + SPEC §6.6.1; requires backend helpers, GPT-027F.5A scope).
- The `circuitProgressMap` `useMemo` dependencies would require importing or modifying the Zustand store file (`src/lib/store.ts`) → stop and escalate (forbidden file; AGENTS.md §10/§11).
- A store helper signature (`getPresupuestosBySurgeryId`, etc.) doesn't match the `getCircuitProgress` parameter contract → stop and escalate (would require modifying `store.ts`).
- Urgency must be re-routed through a Zustand selector or new store slice → stop (would write to the store; SPEC §10 forbids new persistence).
- The persisted Zustand column-visibility config hides the new `circuitProgress` column for existing users → this is the accepted R4 behavior (Spec R4; `useColumnVisibility` validates from `CIRUGIAS_COLUMNS`); do NOT auto-enable or force-show — escalate only if Franco requests otherwise.

---

## Task T6 — Test finalization (4 new test files)

### Goal

Establish the regression net for the new pure function, two new components, and the additive date formatter. All test files are ADDITIVE (new) — no existing test file is modified. Follow the existing Vitest + jsdom pattern under `src/__tests__/` (DESIGN §8.2).

### Files (new)

- `src/__tests__/unit/circuit-progress.test.ts`
- `src/__tests__/components/CircuitProgressCell.test.tsx`
- `src/__tests__/components/CirugiasEmptyState.test.tsx`
- `src/__tests__/unit/formatContextualDate.test.ts`

### Dependencies

- T2 (Slice 1 — `CELL_BASE` exists), T3 (Slice 2 — `CirugiasEmptyState` exists), T4 (Slice 3 — `formatContextualDate` exists), T5 (Slice 4 — `getCircuitProgress` + `CircuitProgressCell` exist).

### Acceptance criteria

- AC-CROSS-04 — Four new test files exist with meaningful coverage.

### Tasks

- [ ] **`circuit-progress.test.ts` (DESIGN §8.2.1):** Cover at minimum:
  - Returns exactly 7 stages in fixed order.
  - `cx` always `done: true`.
  - `pr`/`nr`/`consumo` done when helpers return non-empty/defined; pending when empty/`undefined`.
  - `doc` done for `"Completa"` and `"Apta para facturar"`; not done for `"Incompleta"`.
  - `fact` done when `surgery.facturado === true`.
  - `cobro` done when `totalCobrado > 0`; not done when `0`.
  - `current` flag = first non-done stage; no `current` when all done.
  - Pure: receives mock functions via params (no `useOrtoTrackStore` import inside the function under test). Use `vi.fn()` mock helpers (empty array / single item / `undefined` / specific doc strings / cobranza with zero/positive total).
- [ ] **`CircuitProgressCell.test.tsx` (DESIGN §8.2.2):** Cover at minimum:
  - Renders 7 dots (query by the dot className, e.g. `size-2.5 rounded-full`).
  - Done dots have `bg-emerald-500`.
  - Current dot has `bg-blue-500` and `animate-pulse`.
  - Pending dots have `border` and no fill color class.
  - Connector colors: done→done emerald (`bg-emerald-400`), pending-transition muted.
- [ ] **`CirugiasEmptyState.test.tsx` (DESIGN §8.2.3):** Cover at minimum:
  - Renders the primary message `"No se encontraron cirugías con los filtros aplicados"`.
  - `hasActiveFilters=true` + `onClearFilters` provided → renders hint + `"Limpiar filtros"` button.
  - `hasActiveFilters=false` → no filter hint, no clear button.
  - `hasActiveFilters=true` + `onClearFilters` not provided → hint renders, no button.
  - `onNewSurgery` provided → renders `"Nueva cirugía"` CTA; not provided → no CTA.
  - Clicking `"Limpiar filtros"` calls `onClearFilters`; clicking `"Nueva cirugía"` calls `onNewSurgery`. Use `vi.fn()` + `fireEvent.click`.
- [ ] **`formatContextualDate.test.ts` (DESIGN §8.2.4):** Cover at minimum:
  - Today → `{ text: "Hoy", variant: "today" }`.
  - Tomorrow → `{ text: "Mañana", variant: "tomorrow" }`.
  - Yesterday → `{ text: "Ayer", variant: "yesterday" }`.
  - 2 days ago → `{ text: "Hace 2d", variant: "overdue" }`.
  - 8 days ago → `{ text: "Vencida hace 8d", variant: "overdue" }` (N > 7).
  - 2 days future → `{ text: "En 2d", variant: "soon" }`.
  - 10 days future → `{ text: formatDate(<date>), variant: "neutral" }`.
  - Empty string → `{ text: "—", variant: "neutral" }`; invalid date → graceful fallback.
  - Construct test date strings dynamically from `new Date()` (no `vi.useFakeTimers()`); keep tests deterministic for a given run.
- [ ] Confirm NO existing test file is modified — additive only.

### Validation

- All four new test files pass via `npm test` (collectively run in T7).
- Existing test files (`CirugiasTable.test.tsx`, `cirugias-estado-prep-separation.test.ts`, `cirugia-creation.test.ts`, `post-creation-actions.test.ts`) remain unchanged and still pass.

### Stop / escalate

- A test would require importing/editing a forbidden file (`src/lib/store.ts`, `src/types/index.ts`, etc.) → stop and escalate (DESIGN guardrails G3/G4).
- A Vitest / jsdom config change is required → stop and escalate (build pipeline / config change out of scope; Vitest already configured per existing `vitest.config.ts`).

---

## Task T7 — Validation gate (TypeScript + Vitest)

### Goal

Run the AGENTS.md §12 quality gate: TypeScript clean + the new and existing Vitest tests pass. No build. No migrations. No Prisma.

### Files

- None edited.

### Dependencies

- T2, T3, T4, T5 (all 4 code slices complete), T6 (tests written).

### Acceptance criteria

- AC-CROSS-01 — Blocked source trees are not modified (verified by diff inspection).
- AC-CROSS-02 — All existing test assertions pass unchanged.
- AC-CROSS-03 — TypeScript compiles clean with no errors.
- AC-CROSS-04 — Four new test files pass.
- AC-CROSS-05 — `NewSurgeryDialog.tsx` and all dialog files untouched.

### Tasks

- [ ] Run `npx tsc --noEmit` — must be clean (zero errors) across the new files, edited files, and new tests.
- [ ] Run `npm test` — both the 4 new test files (T6) and the pre-existing Cirugías/AI tests must pass.
- [ ] Inspect `git diff` / `git status` to confirm NO file under `prisma/**`, `src/lib/db.ts`, `src/lib/store.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`, `src/types/index.ts`, `src/app/api/**`, `src/lib/services/**`, `src/lib/validators/**`, `src/hooks/useCirugia*.ts`, or `src/components/cirugias/dialogs/**` was modified (AC-CROSS-01 / AC-CROSS-05).
- [ ] Confirm `package.json` + lockfile have NO new dependency added.
- [ ] Confirm `formatDate` is byte-for-byte unchanged in `formatters.ts` (additive diff only) (AC-CROSS-01).
- [ ] Confirm `cirugias.constants.ts` diff is additive only (no existing entry modified) (AC-CROSS-01).
- [ ] Confirm no hex / mockup palette colors introduced — only Tailwind classes from the existing theme.

### Validation

- `tsc --noEmit` exit code 0.
- `npm test` exit code 0 (existing + new tests).
- Diff scope matches exactly: 3 new source files + 6 modified source files + 4 new test files; nothing else.

### Stop / escalate

- `tsc` or `npm test` fails → run the Diagnose cycle (Reproduce / Scope / Evidence / Hypothesis / Minimal Fix / Validate / Regression Check / Handoff, AGENTS.md §13 Diagnose rule) BEFORE applying any fix. Do not apply blind fixes.
- A minimal fix would require touching a forbidden tree or adding a dependency → stop and escalate (AGENTS.md §11).
- An existing test assertion breaks (lines 130, 170, 225 of `CirugiasTable.test.tsx` or any other) → Diagnose first; the change set is supposed to preserve them verbatim (AC-CROSS-02). Escalate if a legitimate behavior break is found.

---

## Task T8 — Release locks + handoff

### Goal

Release L1–L5, generate the Caveman-format handoff, update the worklog if applicable, and save the Engram session summary.

### Files

- None edited (handoff / worklog / Engram only).

### Dependencies

- T7 (validation gate passed).

### Acceptance criteria

- AC-CROSS-06 (locks released) and AGENTS.md §12/§13 satisfied.

### Tasks

- [ ] Move L1, L2, L3, L4, L5 to status `released`.
- [ ] Generate the handoff in Caveman format (Done / Changed / Files / Validations / Risks / Next) per AGENTS.md §13.
- [ ] Update the worklog if the project maintains one for this change.
- [ ] Save the Engram `mem_session_summary` (Goal / Instructions / Discoveries / Accomplished / Next Steps / Relevant Files) — mandatory per the Engram session-close protocol.
- [ ] Declare open risks for the future:
  - **R1** 7-store-lookups-per-row performance — mitigated via `useMemo`; flagged for GPT-027F.5A backend helpers.
  - **R4** persisted Zustand column visibility hides the new `circuitProgress` column for existing users — graceful, discoverable.
  - **R6** row min-height visual rhythm shift — verified by browser QA; if oddities remain, flag for Phase C density toggle.
  - **R7** new components have zero prior coverage — mitigated by the 4 new test files.

### Validation

- Locks show `released` in the handoff.
- Handoff contains Done / Changed / Files / Validations / Risks / Next.
- Engram session summary saved.

### Stop / escalate

- Any Phase C / Phase D item (density toggle, min-widths, primary action differentiation, date grouping with sticky headers) is requested during handoff → do NOT start it; flag as a separate future proposal requiring Franco approval post GPT-027F.0A/0B.
- Adding Devolución / Comparativa to the stepper, or a server-side clock for contextual dates, is requested → defer to GPT-027F.5A+ (D1 + SPEC §6.7.1 note).

---

## Validation Plan (post all slices)

After T2–T6 are complete, T7 runs the consolidated gate:

1. **`npx tsc --noEmit`** — zero errors. Verifies AC-CROSS-03.
2. **`npm test`** — all new and existing Vitest tests pass. Verifies AC-CROSS-02 + AC-CROSS-04.
3. **Diff inspection** — verify the forbidden-trees list (AC-CROSS-01 / AC-CROSS-05) and that `formatDate` + existing `cirugias.constants.ts` entries are additive-only.
4. **Browser QA** (recommended, not in the automated gate): zebra rhythm, solid header during horizontal scroll, consistent row heights, empty state with CTA + filter hint, 7-dot stepper with correct done/current/pending colors, contextual date labels + tooltips, urgency tint + selection override.

No build step is required (no `next build` in this gate). No Prisma format/generate. No migrations. (AGENTS.md §12.)

---

## Stop Conditions / Escalation

Stop and escalate to the Orchestrator (or surface to Franco where an approval boundary applies — AGENTS.md §9.5) if ANY of the following occurs:

1. **Scope expands** beyond the 7 approved items (A1, A2, A3, A4, B5, B6, B7) — e.g., Phase C (density toggle, min-widths, primary action), Phase D (date grouping), or any backend/business-logic change.
2. **Critical-file overlap** appears — another task/session is editing a file in L1–L5 or the dialog lock scope concurrently (AGENTS.md §9.3/§9.4).
3. **Approval boundary crossed** — schema, auth, storage, multi-company, provider, business rule, or destructive change (AGENTS.md §9.5).
4. **A forbidden file must be touched** to complete a task — any of: `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`, `src/types/index.ts`, `src/app/api/**`, `src/lib/services/**`, `src/lib/validators/**`, `src/hooks/useCirugia*.ts`, `src/components/cirugias/dialogs/**`.
5. **A new dependency must be installed** (AGENTS.md §11).
6. **An existing behavior must change** — any mutation of validation, persistence, auto-apply, store writes, or the `formatDate` implementation (SPEC §6.10 / AC-CROSS-01).
7. **`tsc` or `npm test` fails** — escalate through the Diagnose cycle (AGENTS.md §13) before any fix; never apply blind fixes (AGENTS.md §13 Diagnose rule).
8. **A business rule or circuit-stage decision is unclear** — e.g., whether Devolución/Comparativa belong in the stepper (D1 settles this for now: excluded). Escalate rather than improvise.
9. **Franco approval gap** — any decision that reaches an approval boundary in §9.5 without prior approval must pause for Franco.

Escalation output via the AGENTS.md §9.6 prompt template:

```md
# AGENT TASK — OSSUM COR
## Task ID / Name
## Objective
## Agent Role — sdd-tasks
## Selected LLM — opencode-go/glm-5.1
## Mode — implementation
## Scope
## Allowed files — see File Ownership & Locks above
## Forbidden files — see Forbidden files table above
## Allowed commands
## Forbidden commands
## Dependencies / Related agents
## Validation required
## Output format — Caveman handoff
## Stop and escalate if — see list above
```
