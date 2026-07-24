# TASKS.md — EXPEDIENTE-FICHA-CX-UNIFIED-P1

Status: ready  
Change: `EXPEDIENTE-FICHA-CX-UNIFIED-P1`  
Phase: UI-only surgery-detail unification  
Artifact store: hybrid (filesystem + Engram)

---

## Reference

- Proposal: `knowledge/specs/EXPEDIENTE-FICHA-CX-UNIFIED-P1/PROPOSAL.md`
- Spec: `knowledge/specs/EXPEDIENTE-FICHA-CX-UNIFIED-P1/SPEC.md` (AC-01 … AC-10)
- Design: `knowledge/specs/EXPEDIENTE-FICHA-CX-UNIFIED-P1/DESIGN.md` (verified anchors, file plan, slices, validation matrix)
- Root rules: `AGENTS.md` §9.2/§9.3/§9.4/§9.5/§10/§11/§12/§13

This plan follows DESIGN §13/§14 and keeps one writer per owned file set at a time.

---

## Guardrails for all tasks

- No edit to `prisma/**`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`, `src/lib/cirugias.constants.ts`, `src/lib/cirugias.utils.ts`.
- No edit to `src/app/api/**`, `src/lib/services/**`, `src/lib/validators/**`, `src/hooks/useCirugia*.ts`.
- No edit to `src/app/cirugias/page.tsx`.
- No backend, auth, schema, migration, permission, multi-company, or workflow change.
- No new dependency in `package.json` / lockfile.
- `FichaCirugia.tsx` is read-only for this change; it remains the canonical edit/detail surface.
- `CircuitProgressCell.tsx` and `src/lib/circuit-progress.ts` are visual references only; do not reuse their semantic model.
- The macro timeline is display-only and limited to the six approved stages.
- `Preparación` substates and `Apta para facturar` stay subordinate in chips, never as top-level timeline stages.
- One task = one owner = one scope = one set of files = one handoff.

---

## File Ownership & Locks

Locks use `reserved` → `editing` → `review` → `released`.

### High-risk source locks

| Lock ID | File / scope | Notes |
|---|---|---|
| L1 | `src/components/expediente/ExpedienteFullView.tsx` | shell owner; tabs attachment; callback threading |
| L2 | `src/components/expediente/ExpedienteHeader.tsx` | main redesign target |
| L3 | `src/components/expediente/ResumenExpediente.tsx` | duplication-removal surface |

### Additive new-file ownership

| Lock ID | File / scope | Notes |
|---|---|---|
| N1 | `src/components/expediente/ExpedienteMacroTimeline.tsx` | new pure presentational helper |
| N2 | `src/components/expediente/ExpedienteStatusChips.tsx` | new pure presentational helper |
| N3 | `src/components/expediente/ExpedienteReferencesStrip.tsx` | new pure presentational helper |
| N4 | `src/components/expediente/expediente-header.model.ts` | new pure display-model builder |
| N5 | `src/components/expediente/expediente-macro-timeline.ts` | new pure macro mapping helper |

### Explicitly unchanged / zero-touch files

| File | Rule |
|---|---|
| `src/components/expediente/FichaCirugia.tsx` | read-only; `Editar ficha` must navigate here, not duplicate it |
| `src/components/cirugias/CirugiaActionsCell.tsx` | reference only; no edit in this change |
| `src/components/cirugias/CircuitProgressCell.tsx` | visual precedent only; no semantic reuse |
| `src/app/cirugias/page.tsx` | no ownership change required |

### Slice → lock matrix

| Slice | Locks held | Notes |
|---|---|---|
| Slice 0 / T1 | L1, L2, L3, N1, N2, N3, N4, N5 | declaration only |
| Slice 1 / T2 | N1, N2, N3, N4, N5 | additive helpers only |
| Slice 2 / T3 | L1 | shell + tabs attachment |
| Slice 3 / T4 | L2, N1, N2, N3, N4, N5 | ficha structure + timeline/chips/refs integration |
| Slice 4 / T5 | L2 | action consolidation in header |
| Slice 5 / T6 | L3 | `Resumen` de-duplication |
| Slice 6 / T7 | L1, L2, L3 | polish + regression fixes only if strictly needed |

Slices are strictly sequential. If another task/session already owns L1, L2, or L3, stop and escalate.

---

## Suggested slice / task order

1. **T1** — Declare locks and confirm no overlap
2. **T2** — Create pure helper files under `src/components/expediente/**`
3. **T3** — Update `ExpedienteFullView.tsx` shell, tabs attachment, and `onEditFicha`
4. **T4** — Refactor `ExpedienteHeader.tsx` into unified ficha + integrate model/timeline/chips/refs
5. **T5** — Consolidate top actions inside `ExpedienteHeader.tsx`
6. **T6** — Simplify `ResumenExpediente.tsx`
7. **T7** — Polish, validate scenarios, regression check
8. **T8** — Final verification, lock release, Caveman handoff, Engram summary

---

## Task T1 — Declare ownership locks

### Goal

Reserve the expediente file set before implementation begins.

### Files

- None edited.

### Tasks

- [ ] Declare L1 for `src/components/expediente/ExpedienteFullView.tsx`.
- [ ] Declare L2 for `src/components/expediente/ExpedienteHeader.tsx`.
- [ ] Declare L3 for `src/components/expediente/ResumenExpediente.tsx`.
- [ ] Declare N1–N5 for the new helper files under `src/components/expediente/**`.
- [ ] Record task, agent role, selected model, owned files, and initial status `reserved`.
- [ ] Confirm no overlapping lock exists on any expediente file in this slice chain.

### Validation

- Lock declaration is visible before first edit.
- L1/L2/L3 ownership is explicit and non-overlapping.

### Stop / escalate

- Another agent/session owns L1, L2, or L3.
- Scope expands to forbidden files or backend/auth/schema work.

---

## Task T2 — Slice 1: create pure expediente helpers

### Goal

Land additive helper files first so the structural refactor stays smaller and easier to review.

### Files (new)

- `src/components/expediente/ExpedienteMacroTimeline.tsx`
- `src/components/expediente/ExpedienteStatusChips.tsx`
- `src/components/expediente/ExpedienteReferencesStrip.tsx`
- `src/components/expediente/expediente-header.model.ts`
- `src/components/expediente/expediente-macro-timeline.ts`

### Dependencies

- T1.

### Tasks

- [ ] Implement `expediente-macro-timeline.ts` as a pure mapper from current display inputs to the six approved macro stages only.
- [ ] Implement `ExpedienteMacroTimeline.tsx` as a pure 6-step presentational component using expediente-specific stage keys and labels.
- [ ] Implement `ExpedienteStatusChips.tsx` as a pure chip row for `Estado CX`, `Preparación`, `Documentación`, `Facturación`, and applicable `Consumo` / `Cobranza`.
- [ ] Implement `ExpedienteReferencesStrip.tsx` as a compact references/admin renderer for PR / NR / FV / Cobro / Expediente / `referenciasAdministrativas[]`.
- [ ] Implement `expediente-header.model.ts` as a pure display-model builder for identity, chips, references, and alerts.
- [ ] Keep all helpers display-only: no store reads, no writes, no business-rule mutation, no new action semantics.

### Validation

- Helper files compile with typed props/interfaces.
- Timeline helper exposes only the approved six stages.
- No helper imports forbidden files.

### Stop / escalate

- Mapping requires changing business rules or adding new top-level states.
- Helper design requires editing `src/lib/circuit-progress.ts` or shared critical files.

---

## Task T3 — Slice 2: update `ExpedienteFullView.tsx`

### Goal

Make the ficha + tab strip read as one shell and wire `Editar ficha` to the existing `Cirugía` tab.

### Files

- `src/components/expediente/ExpedienteFullView.tsx`

### Dependencies

- T1.
- T2 recommended if the header will consume a prepared model.

### Tasks

- [ ] Add `onEditFicha={() => setExpTab("cirugia")}` and pass it into `ExpedienteHeader`.
- [ ] Keep `onGeneratePR` aligned with the existing presupuesto action (`onOpenPresupuestoDialog(surgery)`).
- [ ] If using the helper model approach, compute/passthrough the macro/header display model here.
- [ ] Change the ficha/tabs wrapper classes so header + tab strip share one continuous shell.
- [ ] Keep current tab ownership, visible/overflow tab split, and `Cirugía` tab label unchanged.
- [ ] Preserve tab content components and routing behavior.

### Explicit handling

- `ExpedienteFullView.tsx` is shell-only in this redesign; it must not absorb header business/display complexity that belongs in the header/model helpers.

### Validation

- `Editar ficha` callback can switch to `Cirugía` without adding a new editing surface.
- Tabs remain attached visually to the ficha and function as before.

### Stop / escalate

- The shell change requires altering tab model semantics or `EXPEDIENTE_TABS` source data.
- The change would force edits in `src/app/cirugias/page.tsx`.

---

## Task T4 — Slice 3: refactor `ExpedienteHeader.tsx` into the unified ficha

### Goal

Transform the compact header into the five-zone unified `Ficha de CX` surface.

### Files

- `src/components/expediente/ExpedienteHeader.tsx`
- `src/components/expediente/ExpedienteMacroTimeline.tsx`
- `src/components/expediente/ExpedienteStatusChips.tsx`
- `src/components/expediente/ExpedienteReferencesStrip.tsx`
- `src/components/expediente/expediente-header.model.ts`
- `src/components/expediente/expediente-macro-timeline.ts`

### Dependencies

- T2.
- T3 recommended.

### Tasks

- [ ] Replace the current three-strip composition with five ordered zones: utility, identity, operational, actions, references/admin.
- [ ] Move top identity to the ficha: `ID CX`, `Paciente`, `DNI`, `Médico`, `Institución`, `Cliente / financiador`, `Fecha CX`, `Clasificación`, `Coordinador`, `Vendedor`, `Instrumentador`, `Urgente`, optional `Expediente #`.
- [ ] Keep `Paciente` and `ID CX` as the dominant anchors.
- [ ] Mount the macro timeline in the operational zone.
- [ ] Mount status chips in the operational zone.
- [ ] Move `pendiente principal` into the operational zone.
- [ ] Add the balanced `Sin autorización` alert treatment inside the operational zone.
- [ ] Mount the compact references/admin strip inside the lowest-weight zone.
- [ ] Reuse existing callbacks and existing display signals; no new server/state logic.

### Explicit handling

- `ExpedienteHeader.tsx` is the main refactor target and owns the ficha layout orchestration.
- New helper components under `src/components/expediente/**` stay small and presentational; `ExpedienteHeader.tsx` remains the composition layer, not the data-source layer.

### Validation

- One dominant ficha exists before entering any tab.
- Timeline/chips/alert/reference zones are visually ordered per spec.
- No duplicate second action bar is introduced during this slice.

### Stop / escalate

- The refactor needs new data not already available in `ExpedienteFullView`.
- The timeline cannot be resolved without redefining product/business state semantics.

---

## Task T5 — Slice 4: consolidate top actions in `ExpedienteHeader.tsx`

### Goal

Reduce the top action surface to the approved trio while preserving existing expediente actions under the correct hierarchy.

### Files

- `src/components/expediente/ExpedienteHeader.tsx`

### Dependencies

- T4.

### Tasks

- [ ] Keep only three top entries: `Editar ficha`, PR-slot action, `Más acciones`.
- [ ] Wire `Editar ficha` to `onEditFicha` and verify it selects the `Cirugía` tab.
- [ ] Use the second slot for `Generar PR` when no PR exists; allow adaptive `Ver PR` behavior in the same slot when PR already exists.
- [ ] Move current secondary actions (`Remitir NR`, `Cargar consumo`, `Autorizar FV`, notes, docs, state/date changes, suspend/cancel/recover, print/export) under `Más acciones`.
- [ ] Avoid a competing second action system.

### Explicit handling

- `FichaCirugia.tsx` stays unchanged; `Editar ficha` navigates to it, never duplicates its form.

### Validation

- Top action row matches the approved hierarchy.
- PR exists vs no PR exists is coherent and stays in one slot.
- Secondary actions remain reachable.

### Stop / escalate

- Product requests a new top-level action outside the approved trio.
- Implementing the PR slot requires backend/state changes.

---

## Task T6 — Slice 5: simplify `ResumenExpediente.tsx`

### Goal

Remove duplicated identity/status/reference payload so `Resumen` becomes a digest, not a second header.

### Files

- `src/components/expediente/ResumenExpediente.tsx`

### Dependencies

- T4.

### Tasks

- [ ] Remove the opening full identity grid (`Datos principales`) from the summary-start payload.
- [ ] Remove the repeated administrative references card from the summary-start payload.
- [ ] Remove the repeated `Estado operativo` card from the summary-start payload.
- [ ] Remove the repeated standalone pending card when its blocker is already surfaced in the ficha.
- [ ] Preserve digest content: highlighted legend, comprobantes overview, cobranza/FV detail, latest notes, optional narrative blocker detail when it adds net-new information.
- [ ] Ensure `Resumen` starts with legend and/or comprobantes, not a second identity card.

### Explicit handling

- `ResumenExpediente.tsx` must be explicitly reduced; visual softening without content removal does not satisfy the spec.

### Validation

- `Resumen` no longer replays patient/status/admin opening cards.
- Useful digest content remains.

### Stop / escalate

- After de-duplication, `Resumen` would become empty or lose required comprobantes/notes context.

---

## Task T7 — Slice 6: polish + validation gate

### Goal

Run the required regression and manual UI checks after all slices land.

### Files

- `src/components/expediente/ExpedienteFullView.tsx` (only if polish is strictly needed)
- `src/components/expediente/ExpedienteHeader.tsx` (only if polish is strictly needed)
- `src/components/expediente/ResumenExpediente.tsx` (only if polish is strictly needed)

### Dependencies

- T2–T6.

### Tasks

- [ ] Run TypeScript validation.
- [ ] Run build validation if the repo task flow supports it.
- [ ] Manually validate the active `CirugiasPage -> ExpedienteFullView` flow only.
- [ ] Verify long-name wrapping does not push `ID CX`, actions, or macro timeline out of view.
- [ ] Verify unauthorized + urgent variants remain balanced.
- [ ] Verify tab overflow/dropdown still works with the attached shell.

### Scenario matrix

- [ ] Unauthorized case → `Sin autorización` visible; ficha still reads as a normal case shell.
- [ ] Authorized scheduled case → macro stage resolves to `Pendiente`.
- [ ] Transit/preparation nuance → macro stays `Tránsito`; preparation stays only in chips.
- [ ] Realizada + `Apta para facturar` → macro stays `Realizada`; `Apta para facturar` remains subordinate.
- [ ] Finalized/invoiced/charged mix → references and cobranza render without creating fake macro stages.
- [ ] Missing optional identity fields → layout remains stable.
- [ ] Long names → wrapping stable.
- [ ] PR exists vs no PR exists → second slot coherent.
- [ ] `Editar ficha` → switches to `Cirugía` tab.
- [ ] `Resumen` → no repeated identity/status/admin opening card.

### Validation

- `npx tsc --noEmit`
- project build command if applicable
- manual browser QA on the expanded expediente flow

### Stop / escalate

- Validation reveals the need for non-trivial product-rule changes.
- Fix requires touching forbidden files or changes outside expediente scope.

---

## Task T8 — Final verification / handoff

### Goal

Close the change with explicit verification, lock release, and compressed handoff.

### Files

- No source change required.

### Tasks

- [ ] Confirm AC-01 … AC-10 against the implemented UI.
- [ ] Move L1/L2/L3/N1/N2/N3/N4/N5 to `review`, then `released`.
- [ ] Update worklog/handoff if the implementation task requires it.
- [ ] Save Engram observations for key decisions/discoveries.
- [ ] Save Engram session summary before declaring done.
- [ ] Produce final Caveman handoff using `Done / Changed / Files / Validations / Risks / Next`.

### Validation

- Acceptance criteria reviewed explicitly.
- Lock lifecycle closed.
- Handoff present and Caveman-formatted.

### Stop / escalate

- Any AC remains partially satisfied.
- A critical unresolved ambiguity remains around macro mapping or top action behavior.
