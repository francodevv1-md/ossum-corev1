# Spec — CX-STATUS-PREPARATION-SEPARATION-001

Status: specified
Change: `CX-STATUS-PREPARATION-SEPARATION-001`
Language: English
Phase: contract alignment and read-boundary normalization; no persisted-data change
Artifact chain: PROPOSAL → DESIGN → **SPEC** → TASKS → APPLY

---

## 1. Purpose

This specification operationalizes the approved separation between the general CX lifecycle and the preparation/material lifecycle.

`En preparación` is exclusively the UI label for `prepStatus: "preparing"`. It is never a general CX state, a general CX transition target, a general status filter value, or a general-state presentation outcome.

General CX status and preparation status are independent values. A preparation action updates only preparation. It must not mutate, infer, persist, display, or otherwise cause a general `cxStatus` transition.

This phase makes no Prisma schema change and performs no persisted-data inspection, remap, repair, migration, seed, import, or database mutation.

## 2. Frozen contract

### 2.1 General CX status

The existing server CX validator vocabulary remains authoritative:

| Raw server `cxStatus` | Required general UI state/label | Rule |
| --- | --- | --- |
| `unauthorized` | `Sin autorizar` | General CX state. |
| `authorized` | `Autorizada` | General CX state. |
| `pending` | `Pendiente` | General CX state and normalization target. |
| `scheduled` | `Pendiente` | Preserve as a valid raw server CX value and its existing server transition/execution semantics; do not render or classify it as preparation. |
| `performed` | `Realizada` | General CX state. |
| `finalized` | `Finalizada` | General CX state. |
| `suspended` | `Suspendida` | General CX state. |
| `cancelled` | `Cancelada` | General CX state. |

`preparing` MUST NOT be added to a general type, `CX_STATUS`, general label/color map, general selector, general filter, transition table, general API input, or general action payload.

`validateCxStatus("preparing")` continues to reject. `scheduled` continues to be accepted by the existing CX contract even though its Phase-1 presentation is `Pendiente`.

### 2.2 Preparation status

| Raw `prepStatus` | Required preparation UI label |
| --- | --- |
| `null` / absent | `Sin preparar` |
| `preparing` | `En preparación` |
| `frozen` | `Congelado` |
| `frozen_with_missing` | `Congelado con faltantes` |
| `shipped` | `Enviado` |
| `delivered` | `Entregado` |
| `returned` | `Retirado` |

`En preparación` MAY appear only in this preparation family, including its preparation type, labels, colors, preparation selector, preparation filter, preparation fixture, preparation test, and explicit legacy-normalization case. A logistics vocabulary remains separate and cannot become a general CX vocabulary.

### 2.3 Read-boundary normalization

Normalization applies only while mapping a read response or a local prototype/mock representation into the UI model. It has no write side effect.

| Read input | General UI state | Preparation UI state | Required side effect |
| --- | --- | --- | --- |
| `cxStatus: "scheduled"` | `Pendiente` | Derive only from `prepStatus`; `Sin preparar` if absent | None |
| `cxStatus: "preparing"` | `Pendiente` | Derive only from `prepStatus`; `Sin preparar` if absent | None |
| legacy general `status` / local general `state`: `"En preparación"` | `Pendiente` | Preserve an explicit preparation value only; otherwise `Sin preparar` | None |
| `prepStatus: "preparing"` with any valid general status | Derive only from `cxStatus` | `En preparación` | None |

The adapter MAY retain raw `backendCxStatus` for read compatibility or diagnostics. It MUST NOT use raw `preparing` as the source for a general badge, filter, selector, macro state, automation, transition, or client write.

No normalization may issue a PATCH, create an audit event, repair a fixture or database record at runtime, or derive a missing preparation value from a deprecated general value.

## 3. Observable functional requirements

### 3.1 Listing, badges, and derived displays

1. Every list, row, summary, board, KPI, coordinator bucket, and Ficha-derived display must read general and preparation values as separate dimensions.
2. General CX rendering must never show `En preparación`. A mapped `scheduled`, deprecated raw general `preparing`, or legacy general `En preparación` must visibly render as `Pendiente`.
3. When preparation is `preparing`, the case may show `Preparación: En preparación` independently alongside its general CX state; it must not replace or visually masquerade as the general state.
4. A missing preparation value renders `Sin preparar`; it does not cause a CX state inference.
5. Macro timeline and coordinator/board derivations may consume both dimensions explicitly, but preparation must not add a general macro stage or rewrite the general CX state.

### 3.2 Filters and aggregate counts

1. The Estado CX filter exposes only general CX UI values. It has no `En preparación` option and cannot accept that value through presets, saved local state, URL/local input, or an internal general-filter setter.
2. `stateFilters`, general KPIs, general pipeline membership, general counts, and general coordinator predicates operate only on general UI state.
3. Preparation filters own `En preparación`. A case with general `Pendiente` and preparation `En preparación` matches the preparation filter/metric, not a removed general-state filter/metric.
4. Any operation preset or derived bucket that needs preparation must use an explicit preparation predicate combined with a general predicate where needed; it must not use `state === "En preparación"` or an equivalent mixed-state list.
5. Active-filter feedback must identify the family accurately: a preparation filter is presented as preparation, not Estado CX.

### 3.3 General-status selector and actions

1. A general-status selector initializes from and offers only the general CX state vocabulary in §2.1's UI presentation.
2. No selector option, quick action, default selection, dialog state, transition path, automation input/output, or client convenience action may set general state to `En preparación` or raw `preparing`.
3. A general-status action sends only `cxStatus`; it must not send, synthesize, or overwrite `prepStatus`.
4. Existing approved `scheduled → performed` execution behavior, including its delivered-Remito guard and audit/time semantics, remains unchanged. A preparation update must not execute a surgery or change execution eligibility.

### 3.4 Preparation display, filter, and action

1. Preparation controls initialize from and expose only the preparation vocabulary in §2.2.
2. The explicit preparation-only endpoint is `PATCH /api/companies/{companyId}/surgeries/{surgeryId}/preparation`. Existing `/status` remains CX-transition-only and MUST NOT be reused or expanded.
3. Its body is exactly `{ prepStatus: PrepStatus, source?: string }`; reject identity fields, `cxStatus`, `status`, `metadata`, and unknown fields. It reuses existing `getApiAuthContext`, `SURGERY_STATUS_MUTATION_ROLES`, and `requireCompanyMutationAccess` unchanged.
4. `updateSurgeryPrepStatus` validates `PREP_STATUS`, scopes by surgery/company/non-archived state, transactionally writes exactly `{ prepStatus }`, and creates only `surgery.prep_status_changed` with prep old/new values. It never calls CX transition/execution services or reads/writes CX/execution fields.
5. Dedicated `updateSurgeryPreparation(companyId, surgeryId, { prepStatus, source? })` calls only `/preparation`, exposes no CX parameter/fallback, and reconciles the response without an optimistic general-status change.
6. Established error behavior covers invalid JSON/body/fields, missing/invalid or unchanged prep status, auth/role denial, company scope, missing/archived surgery, and unexpected errors. No failure may fall back to `/status` or local-only mutation.
7. If this narrow route cannot reuse existing auth/guard/error/audit conventions without unapproved architecture, Auth, permission, multi-company, audit-policy, or schema work, stop and escalate.

### 3.5 Adapters, local state, and fixtures

1. The surgery API adapter maps general values and `prepStatus` independently per §2.3.
2. Shared UI types must represent general and preparation states separately; they must not collapse the fields into a union that includes `En preparación` as general state.
3. Local store/mock/fixture cases previously modeled with general `En preparación` must be represented as general `Pendiente` plus explicit `preparationState: "En preparación"` when that preparation condition is intended.
4. Local `updatePreparation` behavior must change only preparation state and may not delegate to a general `changeSurgeryStatus` path.
5. Fixtures exercising legacy general input may retain `En preparación` or `preparing` only at an explicit mapper-normalization boundary and must assert the normalized general result.

### 3.6 Negative requirements

The implementation MUST NOT:

- create a generic `En preparación` entry in CX types, constants, colors, status menus, status chips, transition tables, API request bodies, automations, macro states, general filters, or general fixtures;
- create an implicit sequence such as `Autorizada → En preparación → En tránsito` in general CX state;
- infer a general state or a general transition from `prepStatus`, shipping, delivery, return, material availability, or historic signals;
- convert an incoming deprecated general value into a client or server write;
- substitute preparation state into a general CX badge, KPI, count, bucket, selector, or timeline stage; or
- accept `cxStatus: "preparing"` on a write.

## 4. Required implementation surfaces

TASKS must confirm exact imports/callers before editing and assign one owner at a time for shared or sensitive files. The anticipated surfaces are:

| Workstream | Required outcome | Design inventory |
| --- | --- | --- |
| Contract and mapper | Separate type vocabularies; read-only normalization; reject general `preparing` writes. | `src/types/index.ts`, `src/lib/api/surgery-adapter.ts`, `src/lib/validators/surgery.validator.ts` |
| Mutation boundary | New explicit `/preparation` route, focused validator/client helper, and prep-only service; existing `/status` stays unchanged and CX-only. | `src/lib/services/surgery.service.ts`, new `surgeries/[surgeryId]/preparation/route.ts`, focused validator/client helper, UI caller inventory confirmed by re-run T0 |
| General UI and filtering | General-only labels, controls, filters, KPIs, and pipeline logic. | `src/lib/shared-constants.ts`, `src/lib/constants.ts`, `src/lib/cirugias.constants.ts`, `src/lib/statusHelpers.ts`, list/filter/dialog/action surfaces |
| Preparation UI and local data | Preparation-only controls/filters and separated mock/store state. | preparation cells/controls, `src/lib/store.ts`, `src/data/mock-surgeries.ts` |
| Ficha, timeline, coordinator, boards, automations | Independent rendering/derivations and no preparation-driven general transition. | Design Phase B/C inventory |
| Tests and documentation | Focused independence/normalization tests and current implementation-facing documentation correction. | Design Phase D inventory |

Sensitive Cirugías, store, types, services, validators, route, and coordinator work must use explicit ownership locks. Contract/mapper/server guardrails must be complete and green before dependent UI actions; UI consumers must not invent an API contract while that inventory is unresolved.

## 5. Acceptance criteria

**AC-01 — Vocabulary exclusivity.** `En preparación` occurs only in preparation vocabulary or explicitly named legacy-normalization coverage. No runtime general-state type, constant, selector, filter, color map, pipeline list, automation, or transition input/output contains it.

**AC-02 — Scheduled presentation.** `{ cxStatus: "scheduled", prepStatus: null }` maps to `{ state: "Pendiente", preparationState: "Sin preparar" }` while retaining raw `backendCxStatus: "scheduled"` when the adapter exposes it.

**AC-03 — Independent preparation presentation.** `{ cxStatus: "scheduled", prepStatus: "preparing" }` maps to `{ state: "Pendiente", preparationState: "En preparación" }`; neither field is derived from the other.

**AC-04 — Deprecated general normalization.** Raw `{ cxStatus: "preparing" }` and legacy `{ status: "En preparación" }` map to general `Pendiente`, perform no write, and do not create `En preparación` preparation state when no explicit preparation source exists.

**AC-05 — Validator boundary.** General `preparing` is rejected on write; preparation `preparing` is accepted on the preparation path; `scheduled` remains a valid CX server value.

**AC-06 — Mutation independence.** A successful preparation update changes only `prepStatus`; `cxStatus`, CX transition validation, CX audit semantics, execution eligibility, and general UI state remain unchanged. A general CX update changes only `cxStatus` and does not overwrite preparation.

**AC-06a — Prep-only HTTP boundary.** `/preparation` accepts only `{ prepStatus, source? }`, reuses existing surgery-status auth/company/role guards, calls only `updateSurgeryPrepStatus`, and rejects `status`, `cxStatus`, identity fields, metadata, and unknown fields. `/status` remains CX-only.

**AC-06b — Service/audit immutability.** The prep transaction writes exactly `{ prepStatus }`, is scoped by id/company/non-archived state, creates only `surgery.prep_status_changed` with prep values, and never invokes CX transition/execution behavior.

**AC-07 — Filter and aggregate separation.** A `Pendiente` + `En preparación` case is returned by a preparation filter/metric only when its preparation predicate matches. It cannot be returned through a removed Estado CX `En preparación` value, and general count/pipeline logic classifies it as `Pendiente`.

**AC-08 — Display and selector separation.** List, Ficha/header, row, macro timeline, coordinator, board, and selector behavior never display `En preparación` as Estado CX. Preparation display may use it with explicit preparation labeling.

**AC-09 — No generic transition path.** No UI action, adapter, automation, or server/client helper creates a general transition to/from `En preparación`/`preparing`; preparation updates do not execute a surgery.

**AC-10 — Fixture and source scan.** Focused searches and tests find no runtime general-state comparison, literal, expected general vocabulary, or transition path for `En preparación`. Allowed matches are preparation labels/mappings, explicitly named legacy-normalization cases, and historical/archive references.

**AC-11 — No schema or historical-data change.** The final implementation diff contains no `prisma/schema.prisma` edit, migration, Prisma generation, seed/import, database inspection, historical persisted-data remap/backfill/mutation, or automatic repair. The sole allowed live write is the authenticated `/preparation` transaction that updates `{ prepStatus }` under AC-06b.

## 6. Verification plan

### 6.1 Automated verification

1. Mapper tests for every row in §2.3, including raw-value retention where supported and absence of writes.
2. Validator and service/API tests for general-write rejection, `/preparation` body allowlist, auth/guard reuse, preparation-write acceptance, company scope/audit preservation, and strict cross-field independence.
3. List/filter/KPI tests proving general and preparation predicates/counts are separate.
4. Component/model tests for list row, Ficha/header, selector, macro timeline, and coordinator derivations using both `Pendiente` + `En preparación` and deprecated general inputs.
5. Automation tests proving no preparation-triggered general transition or execution occurs.
6. Fixture tests and a focused source scan for prohibited generic-state usages, with documented allowed-match categories from AC-10.
7. Existing execution regression tests proving `scheduled → performed` remains protected by the delivered-Remito guard and is unrelated to preparation changes.

### 6.2 Manual/browser verification

At desktop and narrow viewport sizes, verify a case whose raw CX state is `scheduled` and preparation is `preparing` renders `Estado CX: Pendiente` and `Preparación: En preparación`; filter it independently by each family; verify no Estado CX selector option is `En preparación`; and confirm a preparation action does not change the general badge or trigger execution.

### 6.3 Final review

Review the final diff, request/response payloads, general and preparation action call chains, and focused source search. Confirm that all edited sensitive files had serialized ownership and that no prohibited schema or persisted-data work was introduced.

## 7. Explicit non-goals and deferred persisted data

This design/docs amendment performs no persisted-data mutation. The future endpoint is limited to a live user-requested update of existing `prepStatus`; it does not authorize historical data mutation. This change does not authorize:

- schema changes, migrations, Prisma generation, seeds, imports, database investigation, historical-data writes, backfills, remaps, or data repair; the sole allowed live write is the scoped `/preparation` transaction of §3.4;
- DEV or production inspection of records whose persisted `cxStatus` is `preparing`;
- an interpretation of historical general CX state from `prepStatus`, logistics, Remito, delivery, return, or audit signals;
- Auth, authorization, permission, multi-company, audit-policy, provider, dependency, or unrelated UI redesign changes; or
- new general CX/preparation statuses or unrelated lifecycle transitions.

Persisted historical `cxStatus = preparing` is explicitly deferred. A later, separate, Franco-approved inspection-only task must examine DEV and production independently, then a separately approved safe-data plan must define evidence, dry run, rollback, auditability, company isolation, and validation before any remap is proposed. Until then, this change handles anomalous raw data only through the read-boundary normalization in §2.3.

## 8. Stop conditions and task readiness

Stop and escalate instead of widening the change if implementation requires schema, migration, database inspection/mutation, Auth/permissions/multi-company/audit-policy change, a new general CX state/transition, or an API architecture decision not already approved by the Design.

Before implementation, TASKS must re-run T0 ownership reconciliation: prior T0 found dirty sensitive paths and no prep-only boundary. It must reserve the new route/validator/client/service/test paths and confirm the UI caller. Only then may the serialized work begin.
