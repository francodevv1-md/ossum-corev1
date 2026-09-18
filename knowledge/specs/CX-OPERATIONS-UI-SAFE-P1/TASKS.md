# Tasks — CX-OPERATIONS-UI-SAFE-P1

Status: ready for serialized implementation
Change: `CX-OPERATIONS-UI-SAFE-P1`
Based on: `PROPOSAL.md` → `DESIGN.md` → `SPEC.md`
Implementation mode: UI-only, client-side, read-only derivations

---

## 1. Global Guardrails

These rules apply to every task below.

- Preserve the current six-stage macro-timeline resolver, stage order, status transitions, navigation, sorting, selection, row actions, coordinator-management actions, and existing API behavior.
- Create no persisted action, area, owner, novelty, priority, assignment, filter, saved view, localStorage key, audit event, or network mutation.
- Do not add dependencies or change build/test configuration.
- Do not use a synthetic fixture actor as an input to a display derivation or an ownership label.
- Reuse current CX/preparation/secondary-status maps. Do not add a competing semantic color map.
- A derived value is advisory copy only. Every rendered action/area value retains `Derivada ·` in visible and accessible text.
- Run the Diagnose cycle before fixing any failing test, typecheck, build, UI loop, or browser regression. Do not apply blind fixes.

### Zero-touch files and trees

`prisma/**`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`, `src/app/api/**`, `src/lib/services/**`, `src/lib/validators/**`, Auth/permission files, migrations, fixtures/import scripts, and canonical documentation.

### Required lock protocol

Before a writer starts: verify no active overlapping ownership, declare each listed lock as `reserved`, then set it to `editing`. At review set it to `review`; release it only after that task's validation/handoff. A collision with an active lock stops the task and is escalated to the Orchestrator.

The repository contains broad unrelated working-tree changes. Each implementation task must inspect a path-limited diff before and after its work; it must neither format nor reconcile unrelated changes.

---

## 2. Serialization and Ownership Matrix

All implementation writers are serialized. No task below is parallelizable.

| Order | Task | Owner | Lock / owned files | Dependency |
| --- | --- | --- | --- | --- |
| T0 | Lock and compatibility preflight | Implementation lead, read-only | Lock record only | None |
| T1 | Shared derivation contract | UI domain/helper implementer | New helper/shared components and their tests | T0 |
| T2 | Coordinator adoption | Coordinator UI implementer | `src/components/coordinadores/CoordinatorInboxView.tsx`, `src/app/coordinadores/page.tsx`, focused tests | T1 |
| T3 | Cirugías list and presets | Cirugías UI implementer | `src/app/cirugias/page.tsx`, `src/hooks/useCirugiasFilters.ts`, approved `src/components/cirugias/*`, focused tests | T2 |
| T4 | Active expediente presentation | Expediente UI implementer | approved `src/components/expediente/*`, focused tests | T3 |
| T5 | Final QA and scope review | QA/reviewer, read-only | No source writer lock | T4 released |
| T6 | Release/report | Implementation lead, docs/operational only | Lock record and handoff only | T5 passed |

### Lock register

| Lock ID | Scope | Holder task | Status at plan creation |
| --- | --- | --- | --- |
| CXO-L0 | Task execution lock record | T0–T6 | planned |
| CXO-L1 | `src/lib/cx-operations-derived.ts`, `src/components/cx-operations/**`, focused new tests | T1 | planned |
| CXO-L2 | `src/components/coordinadores/CoordinatorInboxView.tsx`, `src/app/coordinadores/page.tsx`, their focused tests | T2 | planned |
| CXO-L3 | `src/app/cirugias/page.tsx`, `src/hooks/useCirugiasFilters.ts`, `src/components/cirugias/CirugiasToolbar.tsx`, `ActiveFilterChips.tsx`, `CirugiasTable.tsx`, `CirugiaRow.tsx`, new CX list components, related tests | T3 | planned |
| CXO-L4 | `src/components/expediente/ExpedienteFullView.tsx`, `ExpedienteHeader.tsx`, `expediente-header.model.ts`, `ExpedienteMacroTimeline.tsx`, `ExpedienteStatusChips.tsx`, `ExpedienteReferencesStrip.tsx`, focused tests | T4 | planned |

No task may expand a lock to `src/lib/store.ts`, `src/types/index.ts`, API/service/validator trees, schema, Auth, fixtures, or imports. Such a need is a stop condition, not an implementation detail.

---

## 3. Task T0 — Lock and Compatibility Preflight

**Mode:** read-only / implementation preparation
**Owner:** Implementation lead
**Files written:** none

### Goal

Verify that the planned inputs still exist, declare the task locks, and confirm the scope can remain UI-only before any source edit.

### Steps

1. Declare CXO-L0 through CXO-L4 as `reserved`; record task ID, agent role, selected model, owned paths, and status in the implementation handoff/worklog mechanism selected by the Orchestrator.
2. Check current imports and signatures for `CoordinatorCase`, `getIncidentReasons`, coordinator bucket/subgroup helpers, `useCirugiasFilters`, `CirugiasToolbar`, `ExpedienteFullView`, and `buildExpedienteHeaderModel`.
3. Confirm list/expediente surfaces can construct coordinator input from data already present in their component trees. No API, store, or type-contract edit may be proposed to obtain an input.
4. Confirm current document/consumption/invoice predicates used by the list are callable from the existing Cirugías page and can be passed as booleans to the shared derivation only for finalized rule 7.
5. Record a path-limited baseline diff for every CXO lock scope.

### Validation

- `git status --short` and path-limited `git diff -- <owned paths>` recorded as baseline.
- A lock collision check reports no active overlapping writer.
- The preflight maps every requested capability to T1–T5 below.

### Stop and escalate

- Any input needs a schema, API, store, type-contract, persistence, or domain-rule change.
- A listed file is already actively locked.
- `visibleNumber` and the established legacy display fallback are both unavailable in a required surface.

---

## 4. Task T1 — Shared CX Operations Derivation and Presentation Primitives

**Mode:** implementation
**Owner:** UI domain/helper implementer
**Lock:** CXO-L1 → `editing`

### Files

Create only:

- `src/lib/cx-operations-derived.ts`
- `src/components/cx-operations/CxAttentionMarker.tsx`
- `src/components/cx-operations/CxOperationsDerivedSummary.tsx`
- `src/__tests__/unit/cx-operations-derived.test.ts`
- `src/__tests__/components/CxAttentionMarker.test.tsx`
- `src/__tests__/components/CxOperationsDerivedSummary.test.tsx`

### Implementation

1. Create the sole Phase-1 pure derivation source. It accepts `CoordinatorCase | null` plus explicit existing closure booleans (`documentationIncomplete`, `consumptionAbsent`, `invoiceAbsent`) and returns attention reasons, one action label, and one area label.
2. Call existing `getIncidentReasons(entry)` directly. Do not reproduce its conditions, inspect text, use actor names, import a Zustand store, call an API, or mutate input.
3. Implement the exact ordered rules from SPEC §6.3, including coordination-incident precedence, urgency-only fallthrough, finalization rule 7 before rule 8, and exact unavailable fallbacks.
4. Keep `Derivada ·` as a rendering concern in the new summary primitive, including accessible labels; do not include the prefix in the domain label returned by the helper.
5. `CxAttentionMarker` renders nothing for missing entry or an empty reasons array. When it renders, use outlined/non-status treatment, visible `Atención: {first reason}`, alert icon, readable wrapped reason text, and an `aria-label` containing all ordered reasons. It must not use `aria-live` or hover-only disclosure.
6. `CxOperationsDerivedSummary` renders informational text only, never a button or mutation. It presents `Próxima acción (derivada)` and `Área sugerida (derivada)` with the prefix in visible and accessible copy.

### Required tests

- Every ordered rule 1–10, first-match behavior, first incident precedence, urgency-only fallthrough, rule-7 closure variants, and exact fallbacks.
- Empty/no-input attention renders no marker; multi-reason attention retains all reasons and accessible order.
- Summary exposes the advisory prefix and is not rendered as an actionable control.
- Static purity review: no store/API/persistence import in the helper.

### Validation commands

```powershell
npm run typecheck
npx vitest run src/__tests__/unit/cx-operations-derived.test.ts src/__tests__/components/CxAttentionMarker.test.tsx src/__tests__/components/CxOperationsDerivedSummary.test.tsx
git diff --check -- src/lib/cx-operations-derived.ts src/components/cx-operations src/__tests__/unit/cx-operations-derived.test.ts src/__tests__/components/CxAttentionMarker.test.tsx src/__tests__/components/CxOperationsDerivedSummary.test.tsx
```

### Stop and rollback

- Stop if calling `getIncidentReasons` requires changing coordinator helper semantics.
- Revert only the T1 owned additions if validation fails and no minimal UI-only correction is evidenced by Diagnose.
- Release CXO-L1 only after the helper contract and test suite are accepted; T2–T4 consume it without forking it.

---

## 5. Task T2 — Coordinator Surface Adoption

**Mode:** implementation
**Owner:** Coordinator UI implementer
**Lock:** CXO-L2 → `editing`
**Depends on:** T1 complete and CXO-L1 released/reviewed

### Files

Modify only:

- `src/components/coordinadores/CoordinatorInboxView.tsx`
- `src/app/coordinadores/page.tsx`

Create only focused coordinator component tests under `src/__tests__/components/`.

### Implementation

1. Remove the local `getNextActionLabel` and `getGlobalNextActionLabel` implementations. Import and consume T1's helper; do not create an equivalent local branch.
2. Keep existing `CoordinatorCase` construction, buckets, subgroups, incident inputs, cards, controls, assignment flows, and action callbacks unchanged.
3. Replace only the duplicated next-action display reading in `/coordinadores` and `/coordinadores/mi-bandeja` with the shared derived summary/label. Include the derived area where layout permits, preserving action controls as controls and derived data as informational copy.
4. Preserve existing incident reason chips and their data source. Do not turn document, invoice, or consumption gaps into attention.
5. Use the existing case reference hierarchy where these cards render a case identifier: prefer `visibleNumber`; retain the current legacy display fallback only when absent; do not display a technical ID as the intended primary identifier.

### Required tests and manual QA

- Both surfaces render shared `Derivada ·` action/area copy for coordinator, logistics, and finalized examples.
- No duplicated `getNextActionLabel`/`getGlobalNextActionLabel` remains.
- Existing manage, tracking, logistics, expediente, sharing, and coordinator-assignment controls retain their callbacks.
- Attention with no reasons is absent; urgency-only does not override a bucket-specific derived action.

### Validation commands

```powershell
npm run typecheck
npx vitest run src/__tests__/unit/cx-operations-derived.test.ts src/__tests__/components/CxAttentionMarker.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinadoresPage.test.tsx
git diff --check -- src/components/coordinadores/CoordinatorInboxView.tsx src/app/coordinadores/page.tsx src/__tests__/components
```

If a named focused test does not exist, create it in this task; do not silently omit coverage.

### Stop and rollback

- Stop if coordinator adoption needs to change coordinator assignment, bucket/subgroup derivation, permissions, or a server contract.
- Roll back only CXO-L2 paths if a diagnosed regression cannot be fixed within presentation scope.

---

## 6. Task T3 — Cirugías Presets, List Reading, and Attention

**Mode:** implementation
**Owner:** Cirugías UI implementer
**Lock:** CXO-L3 → `editing`
**Depends on:** T2 released

### Files

Modify only:

- `src/app/cirugias/page.tsx`
- `src/hooks/useCirugiasFilters.ts`
- `src/components/cirugias/CirugiasToolbar.tsx`
- `src/components/cirugias/ActiveFilterChips.tsx`
- `src/components/cirugias/CirugiasTable.tsx`
- `src/components/cirugias/CirugiaRow.tsx`

Create only:

- `src/components/cirugias/CxOperationPresets.tsx`
- focused Cirugías/preset tests under `src/__tests__/components/` and `src/__tests__/unit/`.

Do not edit any dialogs, `useCirugiaActions.ts`, `useCirugiaSelection.ts`, `src/lib/store.ts`, constants, types, APIs, or server code.

### Implementation

1. Add only the permitted transient filter state to `useCirugiasFilters`: selected preset and `needsAttention`. Extend `clearFilters` so both reset with all existing filters. Do not persist either state.
2. Define a pure preset descriptor map in the feature-owned code and test it against the existing hook clauses. Each descriptor must call only the already available setter/value from SPEC §6.4:
   - Needs attention: derived helper reasons length > 0.
   - Urgent: `setUrgenteFilter(true)`.
   - No CX date: `setSinFechaCx(true)`.
   - Preparation pending: `setPrepFilters(["Sin preparar", "Congelado con faltantes"])`.
   - Documentation incomplete: `setDocFilters(["Incompleta"])`.
   - Without PR: `setConPrFilter("sin")`.
   - Without consumption: `setConConsumoFilter("sin")`.
   - Without invoice: `setConFacturaFilter("sin")`.
3. Applying a second preset removes the values set by the prior preset before applying the new one. Other existing manually applied filters remain AND-composed. Do not change sort, selected surgery, row identity, navigation, or persisted view preferences.
4. Build the existing `CoordinatorCase` input in `CirugiasPage` from already available store selectors and current coordinator helper functions. Apply `needsAttention` after the existing hook filtering and before sorting. A case whose coordinator input cannot be constructed is excluded from this preset, not inferred as attention.
5. Place `CxOperationPresets` in the existing list toolbar. Below `sm`, labels must wrap or scroll without truncation, and preset feedback/clear remain keyboard reachable.
6. Render `Preset: {label}` alongside the existing active-filter feedback. Its individual clear action must reset the selected preset and only its transient/preset-set values; global clear must reset all filters as before.
7. In list rows, preserve this reading order: primary CX reference plus patient, `Estado CX`, `Preparación`, attention marker, neutral secondary signals. Use `visibleNumber` as the primary value; only the established legacy fallback may be used when missing. Do not let a derived block displace the identifier/patient; it may move to a secondary line on narrow width.
8. Render attention only from a constructible coordinator entry. The list may render derived action/area compactly, with the mandatory advisory prefix; unavailable fallback is allowed only if that derived block is intentionally shown.

### Required tests and manual QA

- Predicate equivalence for every preset against the current hook predicate, including the exact `Needs attention` source rule.
- AND composition with a separately selected existing filter; second-preset replacement; individual clear; global clear; zero persistence effect.
- No attention marker for no input/empty reasons, and reason accessible text for multiple incidents.
- `visibleNumber` wins; legacy fallback and `CX sin número visible` behavior meet the SPEC.
- Existing Cirugías table actions, double-click expediente navigation, status actions, sorting, selection, empty result behavior, and column preferences remain unchanged.
- Browser QA desktop and below `sm`: controls, focus, active feedback, clear behavior, normal/urgent/selected rows, no-incident/multi-incident/urgent-only rows, and an empty preset result.

### Validation commands

```powershell
npm run typecheck
npx vitest run src/__tests__/components/CirugiasTable.test.tsx src/__tests__/unit/cx-operations-derived.test.ts src/__tests__/unit/cx-operation-presets.test.ts src/__tests__/components/CxOperationPresets.test.tsx src/__tests__/components/CirugiaRow.test.tsx
git diff --check -- src/app/cirugias/page.tsx src/hooks/useCirugiasFilters.ts src/components/cirugias src/__tests__/unit src/__tests__/components
```

### Stop and rollback

- Stop if correct preset replacement requires a new persisted setting, localStorage key, Zustand slice, API parameter, or a change to filter semantics outside the listed predicates.
- Stop if list attention needs a new coordinator input not available through current selectors/helpers.
- Revert only CXO-L3 paths if a diagnosed regression is not resolvable within this scope. Never modify `store.ts` or a source contract to force completion.

---

## 7. Task T4 — Active Expediente Timeline, Identity, and Derived Reading

**Mode:** implementation
**Owner:** Expediente UI implementer
**Lock:** CXO-L4 → `editing`
**Depends on:** T3 released

### Files

Modify only:

- `src/components/expediente/ExpedienteFullView.tsx`
- `src/components/expediente/ExpedienteHeader.tsx`
- `src/components/expediente/expediente-header.model.ts`
- `src/components/expediente/ExpedienteMacroTimeline.tsx`
- `src/components/expediente/ExpedienteStatusChips.tsx`
- `src/components/expediente/ExpedienteReferencesStrip.tsx`

Create only focused expediente component/unit tests. Do not modify the legacy standalone expediente page, `expediente-macro-timeline.ts`, tabs, action callbacks, business rules, API calls, or server-backed availability behavior.

### Implementation

1. Keep `buildMacroTimelineModel` and `resolveMacroTimelineKey` unchanged. In the active expediente path, show exactly its six existing stages and its existing current result.
2. Render the exact Argentine date (`DD/MM/YYYY`) near the timeline when valid. If absent/invalid, render exactly `Fecha CX sin definir`; contextual copy may complement it but cannot replace it.
3. Make the header model/reading hierarchy prefer `surgery.visibleNumber` as the primary CX reference. Only use the established `CX {surgery.id}` legacy fallback when visible number is absent; if neither is usable, show `CX sin número visible`. Keep expediente/PR/NR/FV/authorization/administrative references secondary.
4. Preserve existing CX and preparation maps. Ensure rendered semantic text clearly says `Estado CX: {value}` and `Preparación: {value}`, with CX shown first and more prominent. Keep documentation, consumption, invoice, and collection chips neutral/secondary.
5. Construct a `CoordinatorCase` only from the active expediente's existing surgery, history, logistics, box, and coordinator helper inputs. Provide explicit existing closure booleans for rule 7. If it cannot be constructed, render no attention marker; when the derived block is intentionally rendered, use T1's unavailable fallbacks.
6. Add the shared attention marker and derived summary to the active header/operational zone in this order: macro timeline plus exact date, status families, attention, derived action/area, neutral signals/references. Do not change header actions or turn the summary into a control.
7. Make the timeline horizontally scrollable below `sm` while retaining all six readable labels and order. Attention reasons must wrap and remain readable without hover. Preserve keyboard behavior and do not add `aria-live`.

### Required tests and manual QA

- Macro resolver/stage order regression: no data in this phase advances or changes the current stage.
- Valid date, missing date, and invalid date renderings.
- Identifier priority/fallback and secondary-reference order.
- Status hierarchy and non-color semantic text; neutral secondary indicators.
- No-input and multi-reason attention; derived helper ordered output and accessible advisory prefix.
- Existing header action callbacks, tabs, current server-backed `correo`/`novedades` availability handling, and legacy page exclusion remain intact.
- Browser QA desktop and narrow mobile: all timeline labels, long patient/institution/references, readable reason wrapping, and no derived-data write on interaction.

### Validation commands

```powershell
npm run typecheck
npx vitest run src/__tests__/unit/expediente-macro-timeline.test.ts src/__tests__/components/ExpedienteFullView.test.tsx src/__tests__/components/ExpedienteHeader.test.tsx src/__tests__/components/ExpedienteMacroTimeline.test.tsx src/__tests__/unit/cx-operations-derived.test.ts
git diff --check -- src/components/expediente src/__tests__/unit src/__tests__/components
```

### Stop and rollback

- Stop if implementation would modify the macro resolver, status maps, endpoint calls, contracts, or existing expediente actions.
- Stop if the active path lacks required coordinator input and supplying it would need a store/API/type change.
- Revert only CXO-L4 paths if a diagnosed regression cannot be corrected as presentation-only work.

---

## 8. Task T5 — Final QA and Independent Scope Review

**Mode:** QA / review, read-only
**Owner:** QA/reviewer
**Depends on:** T1–T4 released

### Files

None. No source changes are permitted. Document failures for the owning task; do not fix them during review.

### Automated validation

```powershell
npm run typecheck
npm test
npm run build
git diff --check -- src/lib/cx-operations-derived.ts src/components/cx-operations src/app/cirugias/page.tsx src/hooks/useCirugiasFilters.ts src/components/cirugias src/components/expediente src/components/coordinadores src/app/coordinadores/page.tsx src/__tests__
git diff --name-only
```

### Mandatory review checks

1. Map every acceptance group to evidence: timeline (AC-TIM-01–04), status/priority/attention (AC-STA-01–04 and AC-PRI-01–03), derivation (AC-DER-01–06), filters (AC-FLT-01–08), identity (AC-ID-01–04), accessibility/responsiveness (AC-A11Y-01–04 and AC-RSP-01–04), and guardrails (AC-GRD-01–06).
2. Inspect final changed paths for prohibited schema, migration, API, service, adapter, validator, Auth/permission, fixture/import, persistence, localStorage, store, type, or status-domain modifications.
3. Inspect the helper for purity and confirm both coordinator surfaces consume it rather than retaining local action labels.
4. Browser QA at desktop and below `sm` for all eight presets, preset replacement, individual/global clear, empty results, keyboard reachability, selected/urgent rows, no/multiple/urgency-only attention, missing coordinator, missing availability, transit, finalized incomplete/complete closure, and unavailable coordinator input.
5. Browser QA active expediente for six timeline stages, valid/missing dates, CX/reference hierarchy, status family separation, accessible attention reasons, advisory derived block, and unchanged actions/tabs.
6. Confirm no console errors/warnings and no click writes an action, area, novelty, priority, assignment, or status.

### Failure handling

If automated validation fails, report Reproduce / Scope / Evidence before returning the issue to the owning task. A QA reviewer does not change source. If scope review finds a boundary violation, stop the release and escalate to the Orchestrator/Franco as applicable.

---

## 9. Task T6 — Release Locks and Handoff

**Mode:** operational/docs
**Owner:** Implementation lead
**Depends on:** T5 passed

### Steps

1. Mark CXO-L0 through CXO-L4 `released` in the visible lock record.
2. Confirm task-local diffs and final review evidence are attached to the implementation handoff.
3. Produce the required Caveman handoff and Engram session summary.

### Release stop condition

Do not release a failed validation as complete. Keep the affected task lock in `review` and return a Diagnose-formatted failure to its owner.

---

## 10. Coverage Map

| Spec area | Implementation task | Validation owner |
| --- | --- | --- |
| Shared attention/action/area contract and fallbacks | T1 | T1, T5 |
| Coordinator duplicate action-label removal | T2 | T2, T5 |
| Presets, active feedback, clear/replacement, list attention | T3 | T3, T5 |
| List CX/preparation/attention/identifier reading | T3 | T3, T5 |
| Active expediente timeline/date/identity/status/derived reading | T4 | T4, T5 |
| Accessibility and responsive behavior | T1, T3, T4 | T5 browser QA |
| No writes, no contract change, serial sensitive-file ownership | T0–T6 | T5 scope review |

## Recommended First Implementation Task

**T0 — Lock and Compatibility Preflight.** It is the mandatory no-write gate that validates current inputs and prevents an unsafe Cirugías/Expediente ownership collision before T1 establishes the shared contract.
