# Design — CX-STATUS-PREPARATION-SEPARATION-001

Status: designed
Change: `CX-STATUS-PREPARATION-SEPARATION-001`
Phase: contract alignment and presentation-safe normalization only

---

## 1. Objective and invariant

Implement the approved dual-dimension contract without altering the Prisma schema or any persisted record:

1. General CX status and preparation status are independent dimensions.
2. `En preparación` is a preparation-only UI label, corresponding to preparation value `preparing`.
3. A preparation update must neither send, derive, persist, nor display a general CX-status transition.
4. A legacy/prototype general value `En preparación` (or raw general `preparing`) is rendered and filtered as general `Pendiente`; preparation remains independently visible when supplied.
5. `scheduled` remains a valid server general CX status for server transition and execution semantics, but its current general UI presentation normalizes to `Pendiente`, never to `En preparación`.

The server remains authoritative for general CX transitions. Preparation is server-authoritative through the narrow prep-only contract in §3.1. This work changes contracts, adapters, local/prototype behavior, and documentation; it does not reinterpret, inspect, remap, or bulk-mutate historical database values.

## 2. Frozen vocabulary and boundary mapping

### 2.1 Server general CX vocabulary

The existing validator vocabulary remains the server contract:

| Raw `cxStatus` | General UI label | Phase-1 behavior |
| --- | --- | --- |
| `unauthorized` | `Sin autorizar` | Valid general status. |
| `authorized` | `Autorizada` | Valid general status. |
| `pending` | `Pendiente` | Valid general status and normalization target. |
| `scheduled` | `Pendiente` | Valid server general status; preserve its meaning and transition eligibility while normalizing its current UI presentation. Do not map it to preparation. |
| `performed` | `Realizada` | Valid general status. |
| `finalized` | `Finalizada` | Valid general status. |
| `suspended` | `Suspendida` | Valid general status. |
| `cancelled` | `Cancelada` | Valid general status. |

`preparing` is not added to `CX_STATUS`, `CxStatus`, `CX_STATUS_TRANSITIONS`, or a general-status API input. A write attempting `cxStatus: "preparing"` continues to fail validation.

### 2.2 Preparation vocabulary

| Raw `prepStatus` | Preparation UI label |
| --- | --- |
| `null` / absent | `Sin preparar` |
| `preparing` | `En preparación` |
| `frozen` | `Congelado` |
| `frozen_with_missing` | `Congelado con faltantes` |
| `shipped` | `Enviado` |
| `delivered` | `Entregado` |
| `returned` | `Retirado` |

The UI preparation type, labels, selectors, colors, and filters must include `En preparación` only in this vocabulary. Existing local `LogisticsState` values remain a separate logistics vocabulary and must not be used as a general CX vocabulary.

### 2.3 Read-boundary normalization for deprecated general values

| Read input location | Raw value | Resulting general UI state | Preparation UI state | Persistence |
| --- | --- | --- | --- | --- |
| API adapter `cxStatus` / legacy `status` | `scheduled` | `Pendiente` | Map only `prepStatus` independently | None |
| API adapter `cxStatus` / legacy `status` | `preparing` or `En preparación` | `Pendiente` | Map only `prepStatus` independently; use `Sin preparar` when absent | None |
| Local mock/fixture/store general `state` | `En preparación` | `Pendiente` | Preserve its explicit `preparationState`; otherwise `Sin preparar` | None |
| API adapter `prepStatus` | `preparing` | Leave general state derived only from `cxStatus`; no change | `En preparación` | None |

`backendCxStatus` may retain the raw response for diagnostic/read compatibility, but it must not drive a selector, filter, badge, macro state, automation, or client mutation as `preparing`. The normalization is deliberately read-only: no client-side PATCH, automatic repair, audit event, seed rewrite, or database write follows it.

## 3. Design boundaries

### 3.1 Approved preparation-only mutation contract

The approved write boundary is new and explicit: `PATCH /api/companies/{companyId}/surgeries/{surgeryId}/preparation`. The existing `/status` route MUST NOT be reused: its `status` payload delegates to `updateSurgeryStatus`/`updateSurgeryCxStatus`, validates a CX transition, and writes `cxStatus`.

| Layer | Frozen contract |
| --- | --- |
| Authorization and tenant | Reuse the existing surgery-status route convention unchanged: `getApiAuthContext(request, companyId)`, `SURGERY_STATUS_MUTATION_ROLES`, and `requireCompanyMutationAccess`. Pass only server-derived `{ companyId, actorUserId, source, module: "surgery" }` to the service. |
| Request | JSON `{ prepStatus: PrepStatus, source?: string }`; `prepStatus` is required. Reject `companyId`, `actorUserId`, `cxStatus`, `status`, `metadata`, and unknown fields. Validate JSON/body before service invocation and accept only existing `PREP_STATUS`. |
| Service | Add `updateSurgeryPrepStatus(prisma, context, surgeryId, prepStatus)`. It validates prep status; scopes reads/writes by `id`, `companyId`, and `archivedAt: null`; and transactionally updates data exactly `{ prepStatus }`. It MUST NOT call `validateCxStatusTransition`, `updateSurgeryCxStatus`, `updateSurgeryStatus`, or `executeScheduledSurgery`, or read/write `cxStatus`, execution fields, Remitos, or any other Surgery field. |
| Audit | Create exactly one existing-policy audit event, `surgery.prep_status_changed`, with old/new values containing only `prepStatus`; never create a CX-status audit event. |
| Client | Add dedicated `updateSurgeryPreparation(companyId, surgeryId, { prepStatus, source? })`, calling only `/preparation` with `PATCH`. It has no `cxStatus`/`status` parameter or fallback and reconciles the returned surgery without optimistically changing general state. |
| Response/errors | Return `ok(updatedSurgery)`. Retain established error handling for invalid JSON/body/fields, missing/invalid or unchanged prep status, auth/role denial, company scope, missing/archived surgery, and unexpected failures. No error path may fall back to `/status` or a local-only mutation. |

This is only the live, user-requested update of the existing `prepStatus` field. It requires no schema change, migration, seed/import, persisted-data inspection, historical remap, backfill, or automatic repair.

### In scope

- General/preparation type separation and explicit adapter normalization.
- General and preparation labels, colors, selectors, filters, list/KPI derivations, Ficha models, coordinator queues, automations, local fixtures, and focused tests.
- Current authoritative, implementation-facing documentation that presents `En preparación` as a general CX state.

### Explicit non-goals

- `prisma/schema.prisma`, migrations, Prisma generation, seeds, imports, database inspection, historical-data reads/writes, backfills, or environment inspection. The sole live write authorized by this design is the user-requested `{ prepStatus }` update in §3.1.
- Persisted-data remapping of any `cxStatus = preparing` record.
- Auth, authorization, multi-company policy, audit-policy, dependency, or unrelated UI redesign changes. The new route reuses—not changes—the existing surgery-status auth, role, tenant, error, and audit conventions.
- Inventing a CX transition from `prepStatus`, shipping, delivery, return, or historical signals.

## 4. Implementation phases and file-layer inventory

All implementation edits to sensitive Cirugías files must be serialized under an explicit ownership lock and a Task Brief. The inventory below is exact for the audited source surfaces; SPEC/TASKS must turn each row into owned file tasks and perform a final repository search for newly introduced references.

### Phase A — Contracts, mapper, and server guardrails

| Layer | Target files | Required change |
| --- | --- | --- |
| Shared UI type | `src/types/index.ts` | Remove `En preparación` from `SurgeryState`; do not add a new general display status; add `En preparación` to `PreparationState`. Do not collapse the two fields in `Surgery`. |
| API mapper | `src/lib/api/surgery-adapter.ts` | Map raw `scheduled`, general `preparing`, and general `En preparación` to `Pendiente`; map `prepStatus: preparing` to preparation `En preparación`. Preserve separate raw `backendCxStatus`; never infer `cxStatus` from prep. |
| Validator and server contract | `src/lib/validators/surgery.validator.ts` | Keep `scheduled` in `CX_STATUS`, keep `preparing` only in `PREP_STATUS`, and make labels/tests reflect that distinction. No accepting or normalizing deprecated general `preparing` on writes. |
| Service mutation boundary | `src/lib/services/surgery.service.ts` | Add `updateSurgeryPrepStatus` as §3.1 defines. It writes only `prepStatus`, is company-scoped and audited, and does not call CX transition or execution services. Keep `updateSurgeryCxStatus`, `updateSurgeryStatus`, and `executeScheduledSurgery` unchanged. |
| API route/client contract | New `src/app/api/companies/[companyId]/surgeries/[surgeryId]/preparation/route.ts`, focused route validator/client helper, and preparation callers confirmed by re-run T0 | Implement §3.1 without modifying or overloading existing `/status`. A preparation action sends only `prepStatus`; a CX action uses its existing CX-only contract. |

The exact client caller and test files are confirmed by the re-run T0 ownership reconciliation. If this narrow route cannot reuse the existing status-route conventions without broader architecture work, stop and escalate rather than overload the CX-status PATCH.

### Phase B — General status UI, filters, list derivations, and selectors

| Layer | Target files | Required change |
| --- | --- | --- |
| General constants/colors/pipeline | `src/lib/shared-constants.ts`, `src/lib/constants.ts`, `src/lib/cirugias.constants.ts`, `src/lib/statusHelpers.ts` | Remove general `En preparación`; do not introduce a new general display status; put `En preparación` in preparation labels/colors/options only. Rebuild pipeline membership around general `Pendiente` plus explicit preparation predicates rather than a mixed state list. |
| General selector | `src/components/cirugias/dialogs/ChangeStateDialog.tsx`, `src/components/expediente/ExpedienteHeader.tsx`, `src/hooks/useCirugiaActions.ts` | General-status controls offer only general values and initialize from the current general status, not `En preparación`. Preparation controls use the preparation action/path. |
| List and filters | `src/components/cirugias/CirugiasToolbar.tsx`, `src/hooks/useCirugiasFilters.ts`, `src/components/cirugias/CirugiaRow.tsx`, `src/components/cirugias/CirugiaPreparationCell.tsx`, `src/components/cirugias/ResumenRapido.tsx`, `src/lib/cirugias.utils.ts` | `stateFilters` and KPIs operate only on general values; `prepFilters` owns `En preparación`. Rewrite preparation KPI/pending messages to evaluate `preparationState`, never `state === "En preparación"`. |
| Legacy local state and fixtures | `src/lib/store.ts`, `src/data/mock-surgeries.ts` | Replace mock/prototype general `En preparación` with `Pendiente` and retain/set a separate preparation value. Ensure `updatePreparation` changes only `preparationState`; do not use `changeSurgeryStatus`. |
| Boards and analytics | `src/app/tablero/page.tsx`, `src/app/tableros-operativos/page.tsx`, `src/app/estadisticas/page.tsx`, `src/app/logistica/page.tsx` | Replace general-state counts, series, alert predicates, and buckets with general `Pendiente`/other existing CX values or preparation-specific predicates, according to the label being shown. |

### Phase C — Ficha, derived macro state, coordinator derivations, and automations

| Layer | Target files | Required change |
| --- | --- | --- |
| Ficha/header and derived model | `src/components/expediente/ExpedienteHeader.tsx`, `src/components/expediente/expediente-header.model.ts`, `src/components/expediente/ExpedienteFullView.tsx`, `src/components/expediente/FichaTabContent.tsx`, `src/components/expediente/FichaCirugia.tsx`, `src/components/expediente/ExpedientePreview.tsx`, `src/components/expediente/ExpedientePreviewStatusChips.tsx`, `src/components/expediente/ExpedientePreviewSummary.tsx` | Render two independent chips/fields. General badges never show `En preparación`; preparation badges may. Remove header actions that preselect `En preparación` as a general change. |
| Macro timeline | `src/components/expediente/expediente-macro-timeline.ts` | Remove `En preparación` as a general state condition. Any preparation-sensitive display must read `preparationState` explicitly and must not create a general status transition or a new macro stage. |
| Coordinator selectors/queues | `src/components/coordinadores/coordinator-queue.helpers.ts`, `src/components/coordinadores/CoordinatorInboxView.tsx`, `src/app/coordinadores/page.tsx` | Derive buckets from general CX status and preparation signals separately: delivery/return signals may classify the operational queue but must not rewrite general status. Remove predicates that require `state === "En preparación"`. |
| Local automation | `src/lib/automations.ts` | Remove the `Autorizada → En preparación → En tránsito` general-state chain. A generic CX automation must not advance based on preparation. If a safe successor general transition is not separately approved, return no next state rather than inventing one. |

### Phase D — fixtures, tests, and current documentation

| Layer | Target files | Required change |
| --- | --- | --- |
| Unit/component tests | `src/__tests__/unit/cirugias-estado-prep-separation.test.ts`, `src/__tests__/unit/backend-active-surgeries-adapter.test.ts`, `src/__tests__/unit/expediente-macro-timeline.test.ts`, `src/__tests__/unit/expediente-header.model.test.ts`, `src/__tests__/components/ExpedienteHeader.test.tsx`, `src/__tests__/components/ExpedienteFullView.test.tsx`, `src/__tests__/components/CirugiasTable.test.tsx` | Replace stale mixed-state fixtures/assertions and add the mapping and independence matrix in section 5. |
| Service/API tests | `src/__tests__/unit/surgery-execution.service.test.ts`, surgery validator/service/API tests discovered in SPEC | Assert `scheduled` can still execute only through the existing delivered-Remito guard; assert prep updates do not change `cxStatus`, do not invoke CX transition validation, and preserve tenant/audit behavior. |
| Current documentation | `knowledge/domain/SURGERY_EXPEDIENTE.md`, `knowledge/specs/COORDINADOR-VIEW-MAPPING-DESIGN/DESIGN.md`, current non-archive specs found by final search | Correct the obsolete general-state vocabulary; preserve archive files as history. |

## 5. Required test matrix

1. **Vocabulary exclusivity:** no general type, constant, selector, filter option, color map, pipeline list, or automation input contains `En preparación`; preparation equivalents do.
2. **Adapter — scheduled:** `{ cxStatus: "scheduled", prepStatus: null }` maps to `{ state: "Pendiente", preparationState: "Sin preparar" }` and preserves `backendCxStatus: "scheduled"`.
3. **Adapter — preparation:** `{ cxStatus: "scheduled", prepStatus: "preparing" }` maps to `{ state: "Pendiente", preparationState: "En preparación" }`.
4. **Adapter — deprecated general value:** raw `{ cxStatus: "preparing" }` and legacy `{ status: "En preparación" }` map to general `Pendiente`, do not produce a write, and do not derive a preparation value when none exists.
5. **Validator:** `validateCxStatus("preparing")` rejects; `validatePrepStatus("preparing")` accepts; `scheduled` remains accepted as CX.
6. **Mutation independence:** `/preparation` changes only `prepStatus`; `cxStatus`, CX audit, execution eligibility, and general UI state remain unchanged. It rejects `cxStatus`/`status` and never calls CX transition/execution services.
7. **Route boundary:** existing `/status` stays CX-only; `/preparation` reuses existing auth/company/role conventions and emits only the preparation audit action.
8. **Filters, KPI, timeline, and coordinator:** a case with general `Pendiente` plus preparation `En preparación` matches only preparation filtering and preparation metrics; it does not match a removed general value. Queue/timeline behavior is asserted from the two inputs separately.
9. **Regression — execution:** `scheduled → performed` still requires a delivered Remito, records its approved audit/time semantics, and is not triggered by any preparation update.
10. **Fixture scan:** focused source search has no runtime general-state comparison, literal, or expected general vocabulary for `En preparación`; allowed results are preparation labels/mappings, historical/archive references, and explicitly named legacy-normalization cases.

## 6. Persisted-data deferral

This design authorizes no persisted-data inspection or mutation. A separate, Franco-approved inspection-only task must first examine DEV and production independently for persisted `cxStatus = preparing`, including counts, company distribution, related `prepStatus`, audit history, and active workflow use. Only after an evidence-based safe-data plan, dry-run/rollback/audit criteria, company isolation validation, and another explicit Franco approval may a later task propose a remap.

Until then, an anomalous persisted raw value is handled only at the read boundary as general `Pendiente`; no implementation may infer prior general CX history from preparation, logistics, Remito, or return data.

## 7. Readiness and stop conditions

This design is ready for SPEC/TASKS once the next phase assigns serialized ownership for the sensitive Cirugías files and verifies the API route/client inventory.

Stop and escalate instead of implementing if:

- a schema, migration, seed, persisted-data inspection, or data mutation is needed;
- the new `/preparation` endpoint cannot reuse existing surgery-status auth, role, tenant, error-envelope, and audit conventions without an unapproved change;
- source evidence requires a new general CX status or a transition rule not approved here; or
- a raw persisted `cxStatus = preparing` needs anything beyond the read-only normalization defined above.
