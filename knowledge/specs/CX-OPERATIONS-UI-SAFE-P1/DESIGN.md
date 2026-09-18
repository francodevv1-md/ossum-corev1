# Design — CX-OPERATIONS-UI-SAFE-P1

Status: designed  
Change: `CX-OPERATIONS-UI-SAFE-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact chain: PROPOSAL → **DESIGN** → SPEC → TASKS → APPLY  
Phase: UI-safe, read-only CX operations presentation and filtering

---

## 1. Design Summary and Non-Negotiable Boundary

This phase improves the operational reading of existing surgery/expediente data. It makes the current six-step macro timeline more human-readable, establishes one display-only derivation for attention, next action, and responsible area, makes the `CX-####` reference primary, and exposes explainable list presets.

It is a presentation and client-side derived-data change only. It must not change Prisma/schema/migrations, API routes or contracts, server services/adapters, Auth, permissions, roles, multi-company policy, audit policy, fixture/import data, or existing status-transition behavior. It creates no persisted priority, novelty, action, area, assignment, saved view, or queue state.

`Estado CX` remains the dominant status family. `Preparación` remains a separate, subordinate operational family. Documentation, consumption, invoicing, and collections stay neutral secondary indicators. A displayed derived result is advisory only, never an owner, permission subject, SLA commitment, or audit fact.

## 2. Target Surfaces and Component/Data Flow

### 2.1 Target surfaces

| Surface | Phase-1 treatment | Explicitly not changed |
| --- | --- | --- |
| `CirugiasPage → CirugiasToolbar → CirugiasTable/CirugiaRow` | Preset controls, active-preset feedback, primary CX reference, family-separated signals, compact attention/action/area reading where row density permits. | Data contract, row actions, status mutations, column persistence contract. |
| `CirugiasPage → ExpedienteFullView → ExpedienteHeader` | Keep the implemented macro timeline; add exact-date/contextual reading and the derived operations block. Reinforce identity/reference hierarchy. | Timeline resolver/stage order, header actions, tabs, expediente domain state. |
| `/coordinadores` and `/coordinadores/mi-bandeja` | Replace duplicated next-action labels with the shared display derivation; retain current bucket/subgroup/incident inputs and actions. | Coordinator assignment and management flows. |

The active expediente path is `CirugiasPage → ExpedienteFullView`; the legacy standalone expediente page is not a target.

### 2.2 Recommended additive display boundary

Create one pure, client-safe helper, recommended as `src/lib/cx-operations-derived.ts`. It receives an already-built `CoordinatorCase` (or its existing fields) plus existing document/consumption/invoice presence booleans when needed. It must not import the Zustand store, call APIs, mutate objects, or inspect free text.

```txt
existing store selectors
  └─ current CoordinatorCase construction
       (bucket, subgroup, SLA, availability, urgency)
       └─ deriveCxOperationsDisplay(entry)
            ├─ attentionReasons[]
            ├─ nextActionLabel
            └─ responsibleAreaLabel
                 ├─ coordinator cards
                 ├─ surgery-list attention predicate / row model
                 └─ expediente operations block

existing filter state + preset action
  └─ useCirugiasFilters / page composition
       └─ filtered rows (AND with existing active filters)
```

The helper is the sole Phase-1 source for these display derivations. `getIncidentReasons(entry)` remains the source for attention reasons; the new helper calls it rather than recreating its conditions. The current local `getNextActionLabel` and `getGlobalNextActionLabel` must be removed/replaced only after tests prove the shared helper contract.

### 2.3 Presentation components

Recommended additive components, subject to the implementation task's exact file ownership:

- `CxOperationsDerivedSummary`: label/value group for `Atención`, `Próxima acción (derivada)`, and `Área sugerida (derivada)`; usable in expediente and coordinator cards.
- `CxAttentionMarker`: compact marker with an accessible reason list; renders nothing when `attentionReasons` is empty.
- `CxOperationPresets`: list-toolbar control only; it orchestrates existing setters and a transient `needsAttention` predicate. It does not save a view.

The already-existing `ExpedienteMacroTimeline` and `buildMacroTimelineModel` are reused unchanged. The design does not alter their six stages or resolver precedence.

## 3. Locked Display Rules

### 3.1 Timeline and date

- Render the existing six stages, in the existing order: `Sin autorizar`, `Autorizado`, `Pendiente`, `Tránsito`, `Realizada`, `Finalizada`.
- The current derived stage is the only current stage. No document, invoice, collection, or priority condition may advance it.
- When `surgery.date` is valid, show the exact existing Argentine formatted date (`DD/MM/YYYY`) beside/below the timeline. A contextual complement (for example, `Hoy` or `Mañana`) may precede it, but cannot replace it.
- When date is absent or invalid, render `Fecha CX sin definir`; do not manufacture a relative date.

### 3.2 Identifier and reference hierarchy

1. Primary: `visibleNumber` rendered as `CX-####` when supplied by the current contract.
2. Legacy fallback only: the current surgery display identifier (`surgery.id`) rendered as `CX {id}` when `visibleNumber` is absent.
3. Secondary: `Exp. {expedienteNumber}`, PR, NR, FV, authorization and `referenciasAdministrativas`.
4. Never label or promote a backend technical ID as the operational identifier. If a source only supplies a technical ID and lacks a current legacy display fallback, render `CX sin número visible` and log no client-side substitute.

### 3.3 Priority and status-family semantics

| Concept | Source | Visual treatment | Required text |
| --- | --- | --- | --- |
| Estado CX | Existing state + `CX_STATE_COLORS` | Largest/first labeled chip; existing map unchanged. | `Estado CX: {value}` |
| Preparación | Existing preparation state + `PREP_STATE_COLORS` | Separate second chip/family; smaller or lower emphasis than CX. | `Preparación: {value}` |
| Attention | `getIncidentReasons(entry)` only | Outlined marker with alert icon and text; never presented as a status chip. | `Atención: {first reason}` |
| Surgery urgency | `surgery.urgente` | Existing urgent badge/icon + `Urgente` text. | `Urgente` |
| Seguimiento priority | Existing rendered note priority only | Preserve current note-level `Alta`/`Media`/`Baja` visual treatment. | Existing note label |
| Documentation/consumption/invoicing | Existing display maps/models | Neutral compact chips after CX/preparation. | Existing labels |

No case-level priority field or algorithm is introduced. A note priority never becomes a surgery priority.

## 4. Exact Derived Contract

### 4.1 Attention marker

`attentionReasons` is exactly `getIncidentReasons(entry)`, preserving its existing order:

1. `SLA vencido` when `entry.sla.tone === "overdue"`.
2. `Próxima a vencer` when `entry.sla.tone === "warning"` and it is not overdue.
3. `Sin asignar` when existing `hasAssignedCoordinator(entry.surgery)` is false.
4. `Sin disponibilidad` when `entry.materialAvailabilityDefined` is false.
5. `Urgente` when `entry.surgery.urgente` is true.

If the entry cannot be constructed from the existing coordinator inputs on a target surface, no attention marker is shown. If the array is empty, no marker is shown. No free-text history, Seguimiento note, synthetic fixture actor, or missing financial/document field may be inferred as attention in this phase.

### 4.2 Derived next action and responsible area

The shared helper evaluates the following ordered table top-to-bottom and returns the first match. The label shown in the UI is prefixed by `Derivada ·`; fallback labels are mandatory.

| Priority | Existing predicate | Next action label | Responsible area |
| --- | --- | --- | --- |
| 1 | `attentionReasons` includes `SLA vencido`, `Próxima a vencer`, or `Sin asignar` | `Resolver coordinación y fecha` | `Coordinación` |
| 2 | `attentionReasons` includes `Sin disponibilidad` | `Definir disponibilidad material` | `Preparación/Logística` |
| 3 | `entry.bucket === "autorizado"` and subgroup is `null` or `nueva-asignacion` | `Tomar y coordinar caso` | `Coordinación` |
| 4 | `entry.bucket === "autorizado"` and subgroup is `pendiente-coordinar` | `Coordinar fecha y material` | `Coordinación` |
| 5 | `entry.bucket === "autorizado"` and subgroup is `programada-sin-preparar`, `congelada`, or `congelada-con-faltantes` | `Preparar y confirmar material` | `Preparación/Logística` |
| 6 | `entry.bucket === "transito"` | `Verificar logística y entrega` | `Preparación/Logística` |
| 7 | `entry.bucket === "finalizado"` and documentation is incomplete, consumption is absent, or invoice is absent according to existing list predicates | `Completar cierre administrativo` | `Administración` |
| 8 | `entry.bucket === "finalizado"` | `Revisar cierre y documentación` | `Administración` |
| 9 | Any resolvable case not matching above | `Revisar seguimiento del caso` | `Coordinación` |
| 10 | No usable coordinator entry/input can be derived | `Acción derivada no disponible` | `Área derivada no disponible` |

Rule 1 retains the incident order above; if both coordination and material incidents exist, the first incident reason drives the label. Urgency alone is an attention reason but does not displace a more specific bucket/subgroup action: it reaches rules 3–9. This prevents `Urgente` from becoming a synthetic assignment.

`Administración` appears only in rules 7–8. It is a display category for existing closure/document/invoice signals, not a new financial owner. Synthetic actors (`coordinador`, `deposito`, `ingresos`) are never inputs to this mapping.

## 5. Preset Contract

Presets are transient, composable filters. Applying one updates only existing filter setters plus the one display-only `needsAttention` predicate. Applying a second preset replaces the first preset's values; manually added filters remain AND-composed according to the current hook. `clearFilters` also clears the transient attention predicate and selected-preset label. No preset is saved.

| Preset label | Exact predicate/source | Filter-state action | Active feedback |
| --- | --- | --- | --- |
| `Needs attention` | `getIncidentReasons(entry).length > 0` | `needsAttention = true`; page filters existing displayed rows with the shared helper. | `Preset: Needs attention` |
| `Urgent` | `surgery.urgente === true` | `setUrgenteFilter(true)` | Existing `Urgente` chip + `Preset: Urgent` |
| `No CX date` | `!surgery.date || surgery.date === ""` | `setSinFechaCx(true)` | Existing `Sin fecha CX` chip + preset label |
| `Preparation pending` | `preparationState` is `Sin preparar` or `Congelado con faltantes` | `setPrepFilters(["Sin preparar", "Congelado con faltantes"])` | Existing prep chips + preset label |
| `Documentation incomplete` | Current document predicate: missing checklist or checklist status `Incompleta` | `setDocFilters(["Incompleta"])` | Existing `Doc: Incompleta` chip + preset label |
| `Without PR` | `!s.prNumber && getPresupuestosBySurgeryId(s.id).length === 0` | `setConPrFilter("sin")` | Existing `Sin PR` chip + preset label |
| `Without consumption` | `!getConsumoBySurgeryId(s.id)` | `setConConsumoFilter("sin")` | Existing `Sin consumo` chip + preset label |
| `Without invoice` | `!s.facturado && !getComprobantesBySurgeryId(s.id).find(c => c.type === "FV")` | `setConFacturaFilter("sin")` | Existing `Sin factura` chip + preset label |

The values in this table must be defined once as a pure preset descriptor map and tested against the corresponding current `useCirugiasFilters.filterData` clauses. A preset does not change sorting, navigation, result identity, or selected surgery.

## 6. Layout, Accessibility, and Responsive Rules

### 6.1 Desktop

- List row order: primary `CX-####` + patient, then `Estado CX`, `Preparación`, attention marker, neutral secondary signals. Derived next action/area must remain compact and cannot displace the patient or CX reference.
- Expediente operational zone order: timeline + exact date → CX/preparation family chips → attention marker → derived action/area → neutral secondary chips/references.
- In coordinator cards, retain the current action controls; replace only the duplicated action text with the shared `Derivada ·` reading.

### 6.2 Mobile

- At widths below `sm`, toolbar presets become horizontally scrollable or wrap without truncating their labels; clear feedback remains reachable.
- A surgery row/card keeps `CX-####`, patient, Estado CX, Preparación, and attention marker in its first visible payload. Derived action/area may move to the next line.
- The six-step timeline stays horizontal with labels; if labels cannot remain legible, use a horizontally scrollable timeline region rather than shrinking labels below readable size or changing stage order.
- Attention reasons wrap as text chips; never rely on hover-only tooltips to reveal the cause.

### 6.3 Color and non-color access

- Reuse existing CX/preparation/status maps; do not introduce a competing domain color map.
- Color is supplementary. Every semantic indicator includes a stable text label; attention includes an alert icon plus `Atención`; priority includes `Urgente`/note priority text; timeline state includes label and dot/connector position.
- Use sufficient foreground/background contrast from existing design tokens/maps. Do not convey state exclusively with tint, dot color, or border color.
- The attention marker must expose `aria-label` with all reasons (for example, `Atención: SLA vencido; Sin disponibilidad`). If reasons are visually truncated, provide an accessible full text description.
- Do not use `aria-live`; these are derived static readings, not alerts announced on every render.

## 7. File Boundaries, Locks, and Serial Implementation

### 7.1 Planned implementation ownership

| Serial task | Owned files/folders | Lock level | Constraint |
| --- | --- | --- | --- |
| 1. Shared derivation + tests | New `src/lib/cx-operations-derived.ts`; new focused unit test | New file | No store/API imports; establish contract before UI consumption. |
| 2. Cirugías presets/list | `src/app/cirugias/page.tsx`, `src/hooks/useCirugiasFilters.ts`, `src/components/cirugias/*`, related tests | High/critical | Single writer; no concurrent expediente/coordinator writer. |
| 3. Expediente presentation | `src/components/expediente/*`, focused tests | High risk | Starts only after task 2 releases any shared helper contract and confirms no `page.tsx` change is needed. |
| 4. Coordinator adoption | `src/components/coordinadores/*`, `src/app/coordinadores/page.tsx`, focused tests | High risk | Starts after task 1; must consume, not fork, shared derivation. |
| 5. QA | Read-only tests/build/browser QA/diff review | Read-only | Starts after all writers release locks. |

Task 2 must hold explicit locks for the sensitive `src/app/cirugias/page.tsx`, `src/hooks/useCirugiasFilters.ts`, and every edited `src/components/cirugias/*` file. No task may edit `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`, API, validators, auth/permission, fixtures, or migrations. The broad existing working tree is unrelated and must not be formatted, reconciled, or included in this work.

## 8. Test and QA Plan

### 8.1 Unit/component tests

1. Shared derivation: each ordered action/area rule; first incident reason wins; urgency-only reaches bucket action; no-input fallback; all fallback text exact.
2. Attention: no marker for empty `getIncidentReasons`; marker contains all source reasons and no free-text inference.
3. Presets: each descriptor yields the same result as its current hook predicate; presets AND-compose with a manually applied filter; applying/replacing/clearing restores all state including `needsAttention`.
4. Timeline: existing macro resolver outputs/stage order remain unchanged; valid dates display exact date; missing date shows `Fecha CX sin definir`.
5. Identity: visible `CX-####` wins; legacy fallback works; refs are secondary; technical IDs are not introduced as primary UI copy.
6. Accessibility: labels/reasons are present in rendered text and accessible name, independent of CSS color classes.

### 8.2 Browser QA matrix

- Desktop and narrow mobile: preset application, result count, active feedback, individual filter removal, and global clear.
- Cases with no incident, multiple incidents, urgent-only incident, missing coordinator, missing availability, transit, and finalized closure signals.
- CX/preparation/attention distinction under normal, urgent, and selected-row states.
- Timeline with date, today/tomorrow contextual complement, and missing date.
- Long patient/institution/reference names and all six timeline labels.
- Confirm every derived surface is read-only: no click writes action, area, novelty, priority, assignment, or status.
- Final `git diff` review confirms only approved UI/test files and no schema/API/Auth/permission/fixture/import change.

## 9. Readiness and Escalation

This design is ready for the SPEC phase. There is no unresolved persistent semantic: all new labels are explicitly derived, transient, and have deterministic fallbacks.

Escalate and stop implementation if the current surface cannot build a `CoordinatorCase` without changing an API/store/domain contract; if a requested signal requires text inference or a new persisted field; if `visibleNumber` is not available through the existing UI contract and the legacy display fallback is also absent; or if a required sensitive file is already locked by another owner.
