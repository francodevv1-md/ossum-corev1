# Spec — CX-OPERATIONS-UI-SAFE-P1

Status: specified  
Change: `CX-OPERATIONS-UI-SAFE-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Phase: UI-safe, read-only CX operations presentation and filtering  
Artifact chain: PROPOSAL → DESIGN → **SPEC** → TASKS → APPLY

---

## 1. Summary

Deliver an additive UI-only operations reading layer for existing surgery/expediente data. The phase makes the established macro timeline easier to read, preserves the hierarchy of CX status over preparation and neutral completion signals, surfaces transient filter presets, and displays advisory attention, next-action, and area readings derived solely from current UI inputs.

No data meaning changes. Every new reading is either an existing value or a deterministic, client-side derivation. `CX-####` remains the primary operational case reference.

## 2. Objective

Help an operator scan and prioritize existing cases without creating a task, assignment, priority, novelty, ownership, status, queue, or saved-view domain model. The delivery must be verifiable by rendered behavior, source predicates, and absence of writes or contract changes.

## 3. Scope and Traceability

| Requested outcome | Spec coverage | Verification |
| --- | --- | --- |
| Derived next action and responsible area | §§6.3, 7.2; AC-DER-01–06 | Ordered-rule unit tests and rendered derived copy |
| Readable timeline | §§5.1, 7.1; AC-TIM-01–04 | Existing resolver regression tests and date states |
| Priority presentation | §§5.3, 7.3; AC-PRI-01–03 | Rendered text/label tests; no case-priority mutation |
| CX/preparation/status separation | §§5.2, 7.3; AC-STA-01–04 | Component/browser inspection, non-color assertions |
| Existing-data filter presets | §§6.4, 7.4; AC-FLT-01–08 | Predicate-equivalence and clear/composition tests |
| CX-#### hierarchy | §§5.4, 7.5; AC-ID-01–04 | Identifier rendering tests |
| Accessibility, responsive, loading, empty states | §§8–9; AC-A11Y-01–04, AC-RSP-01–04 | Component and browser QA |
| UI-only/no contract change | §§4, 10; AC-GRD-01–06 | Final diff and interaction review |

## 4. Explicit Non-Goals

The following requests or interpretations are declared out of scope rather than silently approximated:

1. No Prisma schema, migration, seed, fixture, import, database, API route, API payload, server service, adapter-contract, validator, Auth, permission, role, multi-company, or audit-policy modification.
2. No persisted `nextAction`, `responsibleArea`, `priority`, `pendingNovelty`, assignment, owner, incident, task, SLA, escalation, saved view, or filter setting.
3. No status-family rename, transition, ordering, resolver, or workflow modification for CX, preparation, documentation, consumption, invoicing, collections, or Seguimiento.
4. No free-text inference from notes, history, patient, institution, administrative references, or synthetic fixtures.
5. No mapping of synthetic actors (`coordinador`, `deposito`, `ingresos`) to an owner, user, permission principal, area, or assignment.
6. No new dependency, new endpoint, API request, mutation, localStorage key, Zustand slice, persistence mechanism, sorting behavior, navigation behavior, or selection behavior.
7. No change to existing expediente actions, coordinator assignment/management flows, or status mutations.

## 5. Existing Data and Presentation Rules

### 5.1 Macro timeline and date

The existing `buildMacroTimelineModel` / `ExpedienteMacroTimeline` derivation is reused without alteration.

| Rule | Required rendering | Data source | Fallback |
| --- | --- | --- | --- |
| Stages | Show exactly, in current order: `Sin autorizar`, `Autorizado`, `Pendiente`, `Tránsito`, `Realizada`, `Finalizada`. | Existing macro-timeline model | None; do not add/remove/reorder stages. |
| Current stage | Show only the existing derived current stage. | Existing macro-timeline resolver | Do not derive from document, invoice, collection, urgency, or attention data. |
| Valid date | Show exact `DD/MM/YYYY` using the existing Argentine formatter; optional contextual text may precede it. | `surgery.date` + existing formatter | Exact date remains visible even with contextual copy. |
| Missing/invalid date | Show `Fecha CX sin definir`. | Missing/invalid existing date | Do not fabricate a relative or estimated date. |

### 5.2 Status-family hierarchy

The row and expediente reading order is: primary identity → `Estado CX` → `Preparación` → attention (when source-backed) → neutral completion signals/references.

| Family | Source | Required visual/textual treatment |
| --- | --- | --- |
| Estado CX | Existing CX state and `CX_STATE_COLORS` | First/largest status-family chip; text `Estado CX: {value}`; current map unchanged. |
| Preparación | Existing preparation state and `PREP_STATE_COLORS` | Separate second family, lower emphasis than CX; text `Preparación: {value}`. |
| Attention | §6.1 source only | Outlined alert marker, not a status chip; text starts `Atención:`. |
| Documentation, consumption, invoice | Existing display maps/models | Compact neutral secondary signals after CX/preparation; retain current labels/maps. |

No chip, icon, tint, border, or position may make an attention marker appear to be an `Estado CX` or `Preparación` state.

### 5.3 Priority presentation

| Concept | Permitted source | Rule |
| --- | --- | --- |
| Surgery urgency | `surgery.urgente === true` | Retain existing urgency indicator and visible `Urgente` text. |
| Seguimiento priority | Existing priority of a Seguimiento note only where that note is already rendered | Retain note-level `Alta`, `Media`, or `Baja` treatment. |
| Case-level priority | None | Must not be displayed, calculated, persisted, or inferred. A note priority never becomes surgery priority. |

### 5.4 Identifier and reference hierarchy

1. Render `visibleNumber` as the primary operational identifier when the current UI contract supplies it (for example, `CX-####`).
2. Only when `visibleNumber` is absent, use the current legacy display fallback: `CX {surgery.id}`.
3. Show `Exp. {expedienteNumber}`, PR, NR, FV, authorization, and `referenciasAdministrativas` as secondary labels/references.
4. If neither a visible number nor the current legacy display fallback is usable, render `CX sin número visible`.
5. Never label, promote, or synthesize a backend technical ID as an operational identifier.

## 6. Derived-Display Contract

All derived values are client-side, pure, advisory display values. They are not assignment, ownership, permission, SLA evidence, audit evidence, or a write target. A single pure helper is required as the sole Phase-1 source, recommended as `src/lib/cx-operations-derived.ts`.

The helper must receive already available UI data, must be deterministic for equal inputs, and must not import a store, call an API, mutate input, parse free text, or create a persistence side effect.

### 6.1 Attention marker

`attentionReasons` is exactly the existing `getIncidentReasons(entry)` result, in its existing order:

1. `SLA vencido` — `entry.sla.tone === "overdue"`.
2. `Próxima a vencer` — `entry.sla.tone === "warning"`, unless overdue.
3. `Sin asignar` — existing `hasAssignedCoordinator(entry.surgery)` is false.
4. `Sin disponibilidad` — `entry.materialAvailabilityDefined` is false.
5. `Urgente` — `entry.surgery.urgente` is true.

Rules:

- When a target cannot construct the current coordinator entry from existing UI inputs, render no marker and do not substitute another signal.
- When `attentionReasons` is empty, render no marker.
- Do not infer attention from document/financial incompletion, free text, Seguimiento priority, a synthetic actor, or a missing field other than the listed sources.
- When present, render `Atención: {first reason}` and expose all reasons accessibly as specified in §8.1.

### 6.2 Derived labels

Every supplied action/area result is visibly prefixed `Derivada ·` (or the exact equivalent `Derived ·` if localized consistently). The prefix remains present in responsive layouts and cannot be hidden as decorative copy.

### 6.3 Ordered next-action and area table

Evaluate these rules top-to-bottom. Return the first match only. Existing document, consumption, and invoice predicates are used only at rule 7.

| Priority | Predicate from existing UI inputs | Next action | Area |
| --- | --- | --- | --- |
| 1 | `attentionReasons` contains `SLA vencido`, `Próxima a vencer`, or `Sin asignar` | `Resolver coordinación y fecha` | `Coordinación` |
| 2 | `attentionReasons` contains `Sin disponibilidad` | `Definir disponibilidad material` | `Preparación/Logística` |
| 3 | `entry.bucket === "autorizado"` and subgroup is `null` or `nueva-asignacion` | `Tomar y coordinar caso` | `Coordinación` |
| 4 | `entry.bucket === "autorizado"` and subgroup is `pendiente-coordinar` | `Coordinar fecha y material` | `Coordinación` |
| 5 | `entry.bucket === "autorizado"` and subgroup is `programada-sin-preparar`, `congelada`, or `congelada-con-faltantes` | `Preparar y confirmar material` | `Preparación/Logística` |
| 6 | `entry.bucket === "transito"` | `Verificar logística y entrega` | `Preparación/Logística` |
| 7 | `entry.bucket === "finalizado"` and existing list predicates find incomplete documentation, absent consumption, or absent invoice | `Completar cierre administrativo` | `Administración` |
| 8 | `entry.bucket === "finalizado"` | `Revisar cierre y documentación` | `Administración` |
| 9 | Resolvable entry with no prior match | `Revisar seguimiento del caso` | `Coordinación` |
| 10 | No usable coordinator entry/input | `Acción derivada no disponible` | `Área derivada no disponible` |

Rule interpretation:

- Preserve the attention-reason order in §6.1. A coordination incident at rule 1 outranks material availability at rule 2.
- `Urgente` alone does not replace a specific bucket/subgroup action; it falls through to rules 3–9.
- `Administración` is a display category only and appears only in rules 7–8.
- Synthetic actors are never an input.

### 6.4 Transient filter presets

Presets orchestrate existing filter setters and, only for `Needs attention`, one non-persisted derived predicate. They are mutually replacing at the preset layer: applying a second preset replaces values set by the first preset. Separately applied existing filters remain AND-composed. `clearFilters` clears the preset selection and transient attention predicate. No preset is saved.

| Preset | Exact source predicate | Required filter action | Active feedback |
| --- | --- | --- | --- |
| `Needs attention` | `getIncidentReasons(entry).length > 0` | Set transient `needsAttention = true`; filter already displayed rows through shared helper. | `Preset: Needs attention` |
| `Urgent` | `surgery.urgente === true` | Existing `setUrgenteFilter(true)`. | Existing urgent filter feedback + `Preset: Urgent` |
| `No CX date` | `!surgery.date || surgery.date === ""` | Existing `setSinFechaCx(true)`. | Existing `Sin fecha CX` feedback + preset label |
| `Preparation pending` | `preparationState` is `Sin preparar` or `Congelado con faltantes` | Existing `setPrepFilters(["Sin preparar", "Congelado con faltantes"])`. | Existing prep feedback + preset label |
| `Documentation incomplete` | Existing document predicate: missing checklist or status `Incompleta` | Existing `setDocFilters(["Incompleta"])`. | Existing document feedback + preset label |
| `Without PR` | `!s.prNumber && getPresupuestosBySurgeryId(s.id).length === 0` | Existing `setConPrFilter("sin")`. | Existing `Sin PR` feedback + preset label |
| `Without consumption` | `!getConsumoBySurgeryId(s.id)` | Existing `setConConsumoFilter("sin")`. | Existing `Sin consumo` feedback + preset label |
| `Without invoice` | `!s.facturado && !getComprobantesBySurgeryId(s.id).find(c => c.type === "FV")` | Existing `setConFacturaFilter("sin")`. | Existing `Sin factura` feedback + preset label |

The descriptor map defining this table must be pure and tested against the corresponding existing `useCirugiasFilters.filterData` clauses. Presets do not change sort order, selected surgery, row identity, navigation, or persisted view preferences.

## 7. Surface-Specific Requirements

### 7.1 Expediente

1. Target only the active path `CirugiasPage → ExpedienteFullView → ExpedienteHeader`; do not target the legacy standalone expediente page.
2. Preserve current header actions, tabs, status behavior, and timeline resolver.
3. Render in this order: macro timeline + exact date → CX/preparation families → attention marker when source-backed → derived action/area block → neutral signals and secondary references.
4. The derived block contains labels `Próxima acción (derivada)` and `Área sugerida (derivada)` plus the §6.3 values/fallbacks.

### 7.2 Cirugías list

1. Provide preset controls and active-preset feedback in the list toolbar.
2. Keep list row priority: primary CX identifier + patient, Estado CX, Preparación, attention marker, then neutral signals.
3. Derived action/area may be shown only where it fits without displacing the CX identifier or patient. It remains compact and retains its derived label.
4. A no-input case must not show an invented attention marker; action/area may use the mandatory unavailable fallback only when the target intentionally renders the derived block.

### 7.3 Coordinator surfaces

1. Target `/coordinadores` and `/coordinadores/mi-bandeja` only for replacement of duplicated next-action display copy.
2. Retain existing buckets, subgroups, incident inputs, controls, assignment flows, and actions.
3. Consume the shared derivation; do not fork/reimplement local next-action logic.
4. Existing action controls remain controls. The derived reading is informational and must not be styled or worded as an available action button.

### 7.4 Loading and empty results

- Existing loading behavior remains unchanged; this phase must not introduce a new request, loading source, spinner contract, or false completion state.
- While a target surface is in its existing loading state, do not render a derived no-data/no-attention conclusion based on incomplete inputs.
- A list result empty after a preset uses the existing empty-result surface and retains reachable active-preset/filter feedback plus existing clear behavior.
- An empty attention-reasons array means “no marker”, not a new empty-state message.

### 7.5 Responsive behavior

| Width/context | Requirement |
| --- | --- |
| Desktop list | Derived readings remain compact and never displace primary CX identifier/patient. |
| Below `sm` toolbar | Presets wrap or scroll horizontally without truncating labels; active feedback and clear behavior stay reachable. |
| Below `sm` row/card | First visible payload includes CX reference, patient, Estado CX, Preparación, and attention when present. Derived action/area may move to a following line. |
| Below `sm` timeline | Keep the six-stage order and readable labels; use horizontal scrolling rather than reducing labels below readable size. |
| Any narrow width | Attention reasons wrap as text; their cause cannot rely on hover-only UI. |

## 8. Accessibility Requirements

### 8.1 Semantic, text, and accessible names

1. Color is supplemental only. Every state shown by color includes stable visible text: `Estado CX`, `Preparación`, `Atención`, `Urgente`, or its existing note-priority label.
2. The attention marker includes an alert icon and visible `Atención` text; it has an `aria-label` containing all reasons in order, for example `Atención: SLA vencido; Sin disponibilidad`.
3. If visual layout truncates a reason list, its full text remains exposed through an accessible name or description.
4. Timeline semantics include stage label and positional/dot/connector treatment; color alone cannot identify its state.
5. Derived values expose their `Derivada ·` prefix in their accessible name as well as rendered copy.
6. Do not use `aria-live`; these are static readings, not newly announced alerts.

### 8.2 Keyboard and contrast

- Preset controls and clear behavior remain keyboard reachable using the existing toolbar interaction patterns.
- Focus indication must remain visible after any new control/marker presentation.
- Reuse existing CX/preparation/status color maps and design tokens. Do not add a competing semantic color map or hard-coded palette.
- Existing foreground/background contrast must be maintained; do not communicate a state only through tint, border, dot color, or icon.

## 9. Data, Side-Effect, and Contract Boundaries

### 9.1 Read-only source boundary

| Reading | Inputs allowed | Inputs forbidden |
| --- | --- | --- |
| Timeline | Existing macro timeline model and surgery date | New resolver inputs or status changes |
| Attention | Existing coordinator entry and `getIncidentReasons` | Free text, financial/document gaps, fixture actors |
| Next action/area | Existing coordinator bucket/subgroup/incident inputs; existing closure booleans at rule 7 | Owner/user identity, assignments, API-derived new data |
| Presets | Existing hook setters/predicates and helper lookup inputs | New query params, API calls, persisted saved view |
| Identifier hierarchy | Current `visibleNumber`, current legacy fallback, existing references | Backend-ID promotion or generated replacement identifier |

### 9.2 No-contract-change assertion

Implementation is conformant only if it satisfies all of the following:

- Existing API requests, response shapes, server services, adapters, validators, store contracts, schema, Auth/permissions, and status transitions remain unchanged.
- No newly rendered control performs a network mutation or state write for action, area, priority, novelty, assignment, ownership, or status.
- The pure display helper has no store/API imports and no side effects.
- The only new transient UI state permitted is selected preset plus `needsAttention`; both are cleared by existing clear-filter behavior and are not persisted.
- No localStorage key, server preference, saved view, audit event, or database record is created by this phase.

## 10. Guardrails, Ownership, and Stop Conditions

### 10.1 File and implementation boundaries

Serial implementation must respect the Design ownership plan:

1. Shared derivation and focused tests first.
2. Cirugías presets/list second, with a single writer and explicit lock for `src/app/cirugias/page.tsx`, `src/hooks/useCirugiasFilters.ts`, and every edited `src/components/cirugias/*` file.
3. Expediente presentation only after the Cirugías writer releases required shared ownership.
4. Coordinator adoption consumes the helper and does not fork it.
5. QA is read-only after all writers release locks.

Zero touch: `prisma/**`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`, `src/app/api/**`, `src/lib/services/**`, `src/lib/validators/**`, Auth/permissions, fixtures/imports, migrations, and canonical documentation.

### 10.2 Stop and escalate

Stop implementation and escalate when:

- a target surface cannot build an existing coordinator entry without a contract, API, store, or domain change;
- a requested label requires free-text inference, a new persisted field, or new semantics;
- `visibleNumber` and the current legacy fallback are both unavailable for a required primary identifier;
- a preset cannot be shown as an exact existing predicate;
- a critical/high-risk file is already locked, or scope expands beyond presentation/tests;
- the proposed behavior contradicts this SPEC, DESIGN, or PROPOSAL.

## 11. Acceptance Criteria

### Timeline

**AC-TIM-01 — Existing macro stage is preserved.** The expediente renders exactly the six existing stages in their current order, with the same existing resolver output. No document, invoice, collection, urgency, preset, or attention condition changes the current stage.

**AC-TIM-02 — Exact date remains readable.** With a valid surgery date, the timeline zone renders the existing Argentine `DD/MM/YYYY` exact date. Contextual copy, if present, complements and does not replace it.

**AC-TIM-03 — Missing date is explicit.** With absent or invalid date input, the UI renders exactly `Fecha CX sin definir` and does not render a fabricated relative date.

**AC-TIM-04 — Timeline remains usable on mobile.** At narrow width, all six stage labels retain their order and readable text through horizontal scrolling if necessary; the implementation does not collapse, reorder, or color-code-only the stages.

### Status, priority, and attention

**AC-STA-01 — CX is the primary status family.** A rendered case presents `Estado CX: {value}` before and with greater visual emphasis than the separate `Preparación: {value}` family, using their current maps unchanged.

**AC-STA-02 — Attention is not a status.** When attention has reasons, it renders as an outlined marker with alert icon and `Atención: {first reason}` text, visually distinct from both CX and preparation chips.

**AC-STA-03 — No source means no attention marker.** A case with unavailable coordinator input or an empty `getIncidentReasons(entry)` result renders no attention marker and does not infer one from free text, missing documents, consumption, invoice, or synthetic actors.

**AC-STA-04 — Secondary signals remain neutral.** Documentation, consumption, and invoicing retain their existing neutral maps/labels and do not become CX/preparation/attention statuses.

**AC-PRI-01 — Existing urgency is readable.** A surgery with `urgente === true` displays the existing urgency treatment plus the text `Urgente`.

**AC-PRI-02 — Seguimiento priority stays note-scoped.** Existing `Alta`/`Media`/`Baja` priority appears only on its already rendered Seguimiento note and is never promoted to a surgery-level priority.

**AC-PRI-03 — No case priority is created.** No screen, helper, action, API call, or persisted state creates, computes, writes, or labels a case-level priority in this phase.

### Derived next action and area

**AC-DER-01 — One shared deterministic derivation.** A pure helper is the only Phase-1 source for attention/action/area display derivation. It calls existing `getIncidentReasons`, has no store/API imports or mutations, and returns identical output for identical input.

**AC-DER-02 — Ordered rules select one result.** For each resolvable coordinator entry, the helper evaluates §6.3 top-to-bottom and returns only the first matching next action and area.

**AC-DER-03 — Incident precedence is preserved.** `SLA vencido`, `Próxima a vencer`, or `Sin asignar` selects `Resolver coordinación y fecha` / `Coordinación` before `Sin disponibilidad`; urgency alone falls through to applicable bucket/subgroup rules.

**AC-DER-04 — Closure mapping is restricted.** `Administración` is returned only by finalized-case rules 7–8; incomplete documentation, absent consumption, or absent invoice participates only in rule 7 with the existing predicate semantics.

**AC-DER-05 — All derived copy is explicitly advisory.** Every shown action/area result includes `Derivada ·` or an equivalent prefix and is not rendered as an owner, assignment, SLA commitment, audit fact, or write-capable action.

**AC-DER-06 — Fallback is deterministic.** No usable coordinator input returns exactly `Acción derivada no disponible` and `Área derivada no disponible` when that derived block is rendered; it does not fabricate a result.

### Filter presets

**AC-FLT-01 — Every preset has an existing predicate.** Each preset in §6.4 maps to the listed existing setter/predicate or the sole transient `needsAttention` predicate; no new query/API data source is used.

**AC-FLT-02 — Attention preset is source-equivalent.** `Needs attention` returns exactly rows whose constructible coordinator entry yields `getIncidentReasons(entry).length > 0`; a row without constructible input is not included by inference.

**AC-FLT-03 — Existing preset setters remain authoritative.** Urgent, no date, preparation, documentation, PR, consumption, and invoice presets invoke their specified existing setter/value and produce the same result as the corresponding current filter-hook clause.

**AC-FLT-04 — Presets provide active feedback.** Applying a preset makes its `Preset: {label}` feedback visible alongside existing filter feedback and leaves clear behavior reachable.

**AC-FLT-05 — Presets compose predictably.** A manually selected existing filter AND-composes with an active preset. Applying a second preset replaces only the first preset's values, without changing sort, selection, navigation, or row identity.

**AC-FLT-06 — Clear resets transient preset state.** Existing `clearFilters` clears selected-preset feedback and `needsAttention` as well as existing filters; no residual preset predicate remains.

**AC-FLT-07 — Presets are not persisted.** Applying, replacing, clearing, or navigating with a preset creates no saved view, backend preference, localStorage key, audit event, or database record.

**AC-FLT-08 — Empty results preserve existing behavior.** A preset resulting in zero rows uses the current empty-result surface and retains active-filter feedback plus clear behavior; it creates no special inferred empty state.

### Identifier hierarchy

**AC-ID-01 — Visible CX number is primary.** When supplied, `visibleNumber` / `CX-####` is the primary list and expediente identifier, ahead of patient-adjacent references and administrative numbers.

**AC-ID-02 — Legacy fallback is constrained.** Only when `visibleNumber` is absent, the current `CX {surgery.id}` legacy display fallback may be used.

**AC-ID-03 — References are secondary.** Expediente number, PR, NR, FV, authorization, and administrative references render as secondary labels/references and do not replace the case identifier.

**AC-ID-04 — Technical IDs are not promoted.** With no usable visible number or legacy fallback, the UI displays `CX sin número visible`; it does not expose or synthesize a backend technical ID as the operational identifier.

### Accessibility and responsive behavior

**AC-A11Y-01 — No color-only semantics.** CX, preparation, attention, urgency, note priority, and timeline states each have stable textual labels in addition to any color, tint, icon, dot, or border treatment.

**AC-A11Y-02 — Attention exposes all reasons.** An attention marker has an accessible name containing all reasons in source order, and a visually truncated list still exposes full accessible text.

**AC-A11Y-03 — Derived reading remains named.** The accessible names for next action and area retain their derived/advisory prefix; `aria-live` is not used.

**AC-A11Y-04 — Controls remain operable.** Preset and clear controls remain keyboard reachable with visible focus under existing toolbar interaction patterns.

**AC-RSP-01 — Toolbar remains usable below `sm`.** Preset controls wrap or horizontally scroll without truncating labels, while active feedback and clear remain reachable.

**AC-RSP-02 — Essential row data stays first.** At narrow widths, the first visible row/card payload retains CX reference, patient, Estado CX, Preparación, and attention where present; action/area may move below.

**AC-RSP-03 — Reasons do not require hover.** Attention reasons wrap as readable text and are not available solely in a hover tooltip.

**AC-RSP-04 — No false loading conclusion.** Existing loading behavior is preserved, and an incomplete existing loading input does not produce a no-attention/no-data derived conclusion.

### Guardrails and no-contract change

**AC-GRD-01 — No write behavior.** No UI action in this phase writes next action, area, priority, novelty, assignment, owner, incident, status, or filter state beyond existing transient filter behavior.

**AC-GRD-02 — No backend/domain contract change.** Final diff contains no schema, migration, seed, fixture/import, database, API, server service, adapter contract, validator, Auth/permission, role, multi-company, or audit-policy change.

**AC-GRD-03 — Existing operational actions retain behavior.** Expediente actions, coordinator assignment/management controls, status transitions, navigation, sorting, selection, and current API behavior remain unchanged.

**AC-GRD-04 — No synthetic ownership.** Synthetic fixture actors do not appear as mapped owners, responsible areas, permission principals, or derivation inputs.

**AC-GRD-05 — Existing maps/resolvers remain unchanged.** Macro timeline resolver/stage order and existing CX/preparation/secondary-status maps are reused, not modified or replaced.

**AC-GRD-06 — Sensitive work is serialized.** Implementation acquires and releases required file locks per the design sequence; no concurrent writer edits the sensitive Cirugías page/filter/component chain.

## 12. Verification Plan

### 12.1 Automated tests

1. Shared derivation: test every §6.3 rule, first-match ordering, first incident precedence, urgency-only fallthrough, unavailable-input fallback, and exact copy.
2. Attention marker: empty/no-input cases render no marker; multi-reason cases expose all source reasons; free text and secondary completion data do not create attention.
3. Preset descriptors: each is equivalent to its current filter predicate; test AND composition, replacement, clear reset, and no persisted effect.
4. Timeline: existing resolver stage outputs/order are unchanged; valid and missing-date rendering meet §5.1.
5. Identifier: visible number wins; legacy fallback works only when necessary; references remain secondary; unavailable identifier copy is correct.
6. Accessibility: assert visible semantic text and accessible names without depending on CSS color classes.

### 12.2 Browser QA

At desktop and narrow mobile widths, verify:

- Each preset, active feedback, result count, individual existing filter removal, and global clear.
- No incident, multiple incidents, urgency-only, missing coordinator, missing availability, transit, finalized/incomplete closure, finalized complete closure, and unavailable coordinator input.
- CX/preparation/attention distinction in normal, urgent, and selected cases.
- Timeline with exact valid date, contextual complement if supplied, and missing date.
- Long patient/institution/reference values and all timeline labels.
- Keyboard reachability, non-hover attention reason visibility, and no-color-only readings.
- No interaction writes derived data, changes a status, or alters coordinator assignment.

### 12.3 Final diff review

Confirm implementation changes only approved UI/test/helper files, that the shared derivation is pure, and that no prohibited source tree or contract described in AC-GRD-02 was changed.

## 13. Readiness for Tasks

This specification is ready for `sdd-tasks`. Task decomposition must preserve the serial lock sequence in §10.1 and assign each task a narrow file list, validation command set, and handoff. Any task that discovers a missing input or a need for persistence/API/domain semantics must stop rather than expand scope.
