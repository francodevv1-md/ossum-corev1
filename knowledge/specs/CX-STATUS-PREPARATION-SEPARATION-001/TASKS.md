# TASKS — CX-STATUS-PREPARATION-SEPARATION-001

Status: ready for serialized APPLY, subject to the preflight and stop gates below
Change: `CX-STATUS-PREPARATION-SEPARATION-001`
Language: English
Based on: approved `PROPOSAL.md` → `DESIGN.md` → `SPEC.md`

---

## 1. Global execution contract

### Frozen rule

- General CX status and preparation status are independent dimensions.
- `scheduled`, raw general `preparing`, and legacy general/displayed `En preparación` normalize at the read boundary to general `Pendiente`.
- `En preparación` is exclusively the preparation label for `prepStatus: "preparing"`.
- A preparation update writes only `prepStatus`; it cannot change `cxStatus`, invoke a CX transition, or execute a surgery.
- No task may inspect, remap, repair, seed, import, query, or mutate historical persisted data. No schema, migration, Prisma generation, or dependency change is allowed. The sole live database write is T2's approved, user-requested `{ prepStatus }` transaction.

### Required task declaration and lock protocol

Every executor must publish a declaration before writing: task ID/name, agent role, selected LLM, mode, scope, exact allowed files, forbidden files, allowed commands, forbidden commands, validation, output format, expected handoff, and stop conditions.

- Re-run T0 through T9 strictly in order. T0 is mandatory again after this amendment because prior T0 found no prep-only boundary and unowned dirty sensitive paths. Start a writer only after its predecessor is green and has released its lock.
- Before writing, confirm no overlapping active lock; record `reserved → editing → review → released` with task, role, model, and exact owned paths.
- One task owns each shared/sensitive path at a time. A later task may reuse a path only after an explicit ownership transfer and release.
- Preserve unrelated dirty work. Record `git status --short` and a path-limited baseline diff before and after each writer task; do not format or reconcile unrelated changes.
- The only permitted commands are read-only repository inspection plus the task's named validation commands. No migration, Prisma, data, install, Git-write, server/browser automation, or destructive command is permitted.
- Any failed test, typecheck, build, or lint requires the Diagnose cycle before a minimal scoped correction. QA/review does not fix source.

### Absolute forbidden scope for every implementation task

- `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.ts`, Prisma generation, and all database/historical-persisted-data inspection or mutation, except T2's scoped live `{ prepStatus }` update.
- Auth, permissions, multi-company policy, audit policy, provider/storage configuration, package manifests, dependencies, and unrelated circuit behavior.
- New general CX statuses, new preparation statuses, inferred historical state, or a preparation-driven CX transition/execution.
- Archive rewrites. Canonical documentation is forbidden except the narrowly conditional, doc-only T8 allowlist.

### Shared stop-and-escalate conditions

Stop the active task and escalate to the Orchestrator/Franco if an active lock overlaps; an exact caller/route cannot be confirmed; a safe preparation-only request needs an unapproved API architecture, Auth, permission, multi-company, audit-policy, schema, or persisted-data change; source evidence needs a new CX state/transition; or any work would inspect or alter persisted `cxStatus = preparing`.

### Lock register

| Lock | Holder | Owned scope | Initial status |
| --- | --- | --- | --- |
| CSP-L0 | T0 (re-run) | Reconciled preflight evidence and visible lock record only | planned |
| CSP-L1 | T1 | types, adapter, validator, contract tests | planned |
| CSP-L2 | T2 | surgery service, route/client/callers confirmed by T0, mutation tests | planned |
| CSP-L3 | T3 | shared status logic, local store/mock state | planned |
| CSP-L4 | T4 | Cirugías list/filter/selector consumers | planned |
| CSP-L5 | T5 | expediente/Ficha/header/timeline consumers | planned |
| CSP-L6 | T6 | coordinator, boards, and automation consumers | planned |
| CSP-L7 | T7 | fixture and focused regression tests | planned |
| CSP-L8 | T8 | conditional current-document correction only | planned |
| CSP-L9 | T9 | read-only QA/review | planned |

---

## 2. T0 — Re-run ownership reconciliation and prep-contract preflight

**Task declaration:** Role: implementation lead. Model: `openai/gpt-5.6-terra`. Mode: read-only. Depends on: none. Output: Spanish Caveman handoff.

**Scope and allowed files:** No source writes. Read the three SDD artifacts and inspect only the Design/SPEC inventory, existing `/status` route/service/validator/auth-guard chain, proposed `/preparation` paths, preparation callers, tests, and path-limited diffs.

**Forbidden:** All repository writes, including lock-file creation unless the Orchestrator supplies an approved visible lock mechanism; schema/data/Prisma/Auth changes; browser/server automation.

**Work:**

1. Record baseline status/diffs, reconcile prior dirty-path evidence, and declare CSP-L0 through CSP-L9 as `reserved` without taking over another owner's work.
2. Reconfirm `/status` is CX-transition-only. Confirm the new `/preparation` route can reuse its auth context, mutation roles, company guard, error envelope, and audit convention without modifying them.
3. Confirm and reserve exact preparation callers, new route, focused body validator, client helper, service, and non-colliding tests. Confirm all paths; do not edit them.
4. Confirm test ownership and current non-archive T8 candidates without collisions.

**Validation:** `git status --short`; path-limited `git diff -- <anticipated paths>`; source search for general `En preparación` / `preparing`, `/status`, preparation callers, `getApiAuthContext`, `requireCompanyMutationAccess`, and audit conventions.

**Stop:** Any active collision, inability to reuse existing route conventions, or required unapproved scope expansion. Do not start T1 until CSP-L0 is released with exact T2/T7 allowlists.

---

## 3. T1 — Freeze UI contracts and read-boundary normalization

**Task declaration:** Role: backend/domain contract implementer. Model: `openai/gpt-5.6-terra`. Mode: implementation. Depends on: T0 released. Output: Spanish Caveman handoff.

**Allowed files:**

- `src/types/index.ts`
- `src/lib/api/surgery-adapter.ts`
- `src/lib/validators/surgery.validator.ts`
- mapper/validator focused test files confirmed by T0, including `src/__tests__/unit/backend-active-surgeries-adapter.test.ts` when applicable

**Forbidden:** Every other file, especially services, routes, client helpers, UI, store/mock files, schema/migrations/data, canonical docs, and dependencies.

**Work:** Separate `SurgeryState` from `PreparationState`; map `scheduled`, raw general `preparing`, and legacy general `En preparación` to general `Pendiente`; map only explicit `prepStatus: preparing` to preparation `En preparación`; retain raw diagnostic status only as non-driving read data. Keep `scheduled` valid for server CX semantics, reject general writes of `preparing`, and accept preparation `preparing` only in `PREP_STATUS`.

**Validation:** Focused mapper/validator tests for SPEC AC-02 through AC-05; `npm run typecheck`; `git diff --check -- <CSP-L1 paths>`.

**Stop:** Any need to accept deprecated general `preparing` on write, infer preparation from general input, change schema/data, or alter a caller outside this allowlist. Release CSP-L1 before T2.

---

## 4. T2 — Establish the preparation-only mutation boundary

**Task declaration:** Role: backend mutation-boundary implementer. Model: `openai/gpt-5.6-terra`. Mode: implementation. Depends on: T1 released. Output: Spanish Caveman handoff.

**Allowed files:**

- `src/lib/services/surgery.service.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/preparation/route.ts`
- `src/lib/api/validators/surgery-preparation-route.validator.ts`
- `src/lib/api/surgery-preparation-client.ts`
- preparation action caller(s) confirmed by T0
- focused service/route/client tests confirmed by T0

**Forbidden:** Every file not confirmed in T0, including types/adapter/validator, general-status UI actions, schema/migrations/data, Auth/permission/audit-policy files, docs, and dependencies.

**Work:** Create `PATCH .../preparation`, a focused body validator accepting exactly `{ prepStatus, source? }`, `updateSurgeryPrepStatus`, and `updateSurgeryPreparation`. Reuse existing `/status` auth/guard/error/audit conventions without changing them. The service writes exactly `{ prepStatus }`, emits only `surgery.prep_status_changed`, and never calls CX transition/execution services. Preserve `/status`, `updateSurgeryCxStatus`, and `scheduled → performed` unchanged.

**Validation:** Focused success/failure tests proving AC-05, AC-06, AC-06a, AC-06b, and AC-09: body allowlist, guard reuse, company/non-archived scope, prep-only audit, no CX/execution side effect, and no `/status` fallback; `npm run typecheck`; `git diff --check -- <CSP-L2 paths>`.

**Stop:** The new route/client cannot reuse existing conventions without an unapproved architecture decision, an Auth/permission/multi-company/audit-policy file needs modification, or work needs schema, historical data, or a `/status` change. Release CSP-L2 before T3.

---

## 5. T3 — Correct shared status logic and local prototype boundary

**Task declaration:** Role: shared-status/domain implementer. Model: `openai/gpt-5.6-terra`. Mode: implementation. Depends on: T2 released. Output: Spanish Caveman handoff.

**Allowed files:**

- `src/lib/shared-constants.ts`
- `src/lib/constants.ts`
- `src/lib/cirugias.constants.ts`
- `src/lib/statusHelpers.ts`
- `src/lib/cirugias.utils.ts`
- `src/lib/store.ts`
- `src/data/mock-surgeries.ts`
- focused shared-status/local-store tests confirmed by T0

**Forbidden:** UI components/hooks/pages, adapter/types/validator/service/route/client paths, schema/migrations/data, docs, dependencies, and all files outside the list.

**Work:** Remove general `En preparación` values, labels, colors, pipeline membership, macro-state inputs, and general transition assumptions. Establish preparation-only labels/colors/options and explicit preparation predicates. Convert local prototype/mock general `En preparación` to general `Pendiente` plus explicit `preparationState` where intended. Ensure local `updatePreparation` modifies only preparation state and never delegates to a general status change.

**Validation:** Focused status/local-state tests for vocabulary exclusivity and local mutation independence; `npm run typecheck`; `git diff --check -- <CSP-L3 paths>`.

**Stop:** The required correction needs a new status, changes an approved transition, changes server data, or conflicts with T1/T2 contracts. Release CSP-L3 before any UI consumer starts.

---

## 6. T4 — Update Cirugías list, filters, and general-status controls

**Task declaration:** Role: Cirugías UI implementer. Model: `openai/gpt-5.6-terra`. Mode: implementation. Depends on: T3 released. Output: Spanish Caveman handoff.

**Allowed files:**

- `src/components/cirugias/dialogs/ChangeStateDialog.tsx`
- `src/components/cirugias/CirugiasToolbar.tsx`
- `src/components/cirugias/CirugiaRow.tsx`
- `src/components/cirugias/CirugiaPreparationCell.tsx`
- `src/components/cirugias/ResumenRapido.tsx`
- `src/hooks/useCirugiasFilters.ts`
- `src/hooks/useCirugiaActions.ts`
- focused Cirugías component/hook tests confirmed by T0

**Forbidden:** `src/app/cirugias/page.tsx`, expediente/coordinator/board files, shared-status paths, store/mock paths, backend/API paths, schema/migrations/data, docs, and dependencies.

**Work:** Make Estado CX selectors, state filters, presets, active-filter feedback, KPIs, and row badges operate only on general values. Make preparation controls, cells, filters, and messages use `preparationState`; a `Pendiente` + `En preparación` case must match preparation, never a removed general value. A general action sends only `cxStatus`; a preparation action uses T2 and sends only `prepStatus`.

**Validation:** Focused filter/list/selector tests for AC-07 and AC-08; `npm run typecheck`; `git diff --check -- <CSP-L4 paths>`.

**Stop:** A needed change overlaps an active lock, requires page/store/API contract work, or exposes `En preparación` as a general selector/filter/preset. Release CSP-L4 before T5.

---

## 7. T5 — Update Ficha/header and macro-timeline consumers

**Task declaration:** Role: Expediente UI implementer. Model: `openai/gpt-5.6-terra`. Mode: implementation. Depends on: T4 released. Output: Spanish Caveman handoff.

**Allowed files:**

- `src/components/expediente/ExpedienteHeader.tsx`
- `src/components/expediente/expediente-header.model.ts`
- `src/components/expediente/ExpedienteFullView.tsx`
- `src/components/expediente/FichaTabContent.tsx`
- `src/components/expediente/FichaCirugia.tsx`
- `src/components/expediente/ExpedientePreview.tsx`
- `src/components/expediente/ExpedientePreviewStatusChips.tsx`
- `src/components/expediente/ExpedientePreviewSummary.tsx`
- `src/components/expediente/expediente-macro-timeline.ts`
- focused expediente tests confirmed by T0

**Forbidden:** Cirugías UI/hooks, coordinator/board/automation files, backend/API paths, shared constants/store/types, schema/migrations/data, docs, and dependencies.

**Work:** Render general CX and preparation as explicit independent fields/chips. General badge, selector, header default, model, preview, and timeline never show `En preparación`; preparation presentation may. Remove any header action or macro condition that preselects/matches `En preparación` as general state without adding a macro stage or changing execution behavior.

**Validation:** Focused header/model/timeline tests for AC-08 and scheduled/deprecated rendering; `npm run typecheck`; `git diff --check -- <CSP-L5 paths>`.

**Stop:** A correction requires refactoring an unlisted Cirugías path, changing timeline stage semantics, new backend data, or a new general transition. Release CSP-L5 before T6.

---

## 8. T6 — Correct coordinator, board, and automation derivations

**Task declaration:** Role: operational-derivation implementer. Model: `openai/gpt-5.6-terra`. Mode: implementation. Depends on: T5 released. Output: Spanish Caveman handoff.

**Allowed files:**

- `src/components/coordinadores/coordinator-queue.helpers.ts`
- `src/components/coordinadores/CoordinatorInboxView.tsx`
- `src/app/coordinadores/page.tsx`
- `src/app/tablero/page.tsx`
- `src/app/tableros-operativos/page.tsx`
- `src/app/estadisticas/page.tsx`
- `src/app/logistica/page.tsx`
- `src/lib/automations.ts`
- focused coordinator/board/automation tests confirmed by T0

**Forbidden:** All prior task scopes, other pages, schema/migrations/data, docs, dependencies, and Auth/permission changes.

**Work:** Replace mixed general predicates/buckets/counts with general `Pendiente` and explicit preparation predicates where operationally needed. Remove `state === "En preparación"` and the generic `Autorizada → En preparación → En tránsito` chain. Do not invent a successor general state; return no generic next state where no approved successor exists.

**Validation:** Focused coordinator/board/automation tests proving separate two-input derivation and no preparation-triggered general transition/execution; `npm run typecheck`; `git diff --check -- <CSP-L6 paths>`.

**Stop:** A queue/automation needs new domain policy, changed permissions, a new lifecycle state, or persisted-data interpretation. Release CSP-L6 before T7.

---

## 9. T7 — Align fixtures and complete focused regression coverage

**Task declaration:** Role: QA test implementer. Model: `openai/gpt-5.6-terra`. Mode: testing/implementation. Depends on: T6 released. Output: Spanish Caveman handoff.

**Allowed files:** Only local fixtures and focused tests confirmed by T0, anticipated to include `src/__tests__/unit/cirugias-estado-prep-separation.test.ts`, `src/__tests__/unit/backend-active-surgeries-adapter.test.ts`, `src/__tests__/unit/expediente-macro-timeline.test.ts`, `src/__tests__/unit/expediente-header.model.test.ts`, `src/__tests__/components/ExpedienteHeader.test.tsx`, `src/__tests__/components/ExpedienteFullView.test.tsx`, `src/__tests__/components/CirugiasTable.test.tsx`, and the T1–T6 focused test files. Fixture paths must be confirmed before edit.

**Forbidden:** Production source, schema/migrations/data/persisted data, docs, dependencies, and any fixture not explicitly confirmed as local/test-only.

**Work:** Replace stale mixed-state test/local-fixture representations with general `Pendiente` plus explicit preparation state. Keep deprecated values only in named mapper-normalization cases. Cover vocabulary exclusivity, all normalization rows, write rejection/acceptance, cross-field mutation independence, filters/KPIs/timeline/coordinator separation, and scheduled execution regression.

**Validation:** Run the focused suite; `npm run typecheck`; focused source scan with allowed results limited to preparation vocabulary, explicit legacy-normalization coverage, and historical/archive references; `git diff --check -- <CSP-L7 paths>`.

**Stop:** Test completion needs a production source edit outside the owning task, any DEV/production data access, or an assertion exposes a contract conflict. Release CSP-L7 before T8.

---

## 10. T8 — Conditional current-document conflict correction

**Task declaration:** Role: documentation implementer. Model: `openai/gpt-5.6-terra`. Mode: docs. Depends on: T7 released and no active documentation lock. Output: Spanish Caveman handoff.

**Allowed files:** Only after T0 confirms they are current and implementation-facing: `knowledge/domain/SURGERY_EXPEDIENTE.md`, `knowledge/specs/COORDINADOR-VIEW-MAPPING-DESIGN/DESIGN.md`, plus a specifically named current non-archive conflicting spec discovered by the T7 scan.

**Forbidden:** All application/test/data/schema files, all archive files, ADRs, canonical documents not specifically confirmed above, and dependencies.

**Work:** Correct only statements that define `En preparación` as a general CX status: make general `Pendiente` plus independent preparation explicit, or mark an obsolete coordinator rule superseded. Preserve historical/archive evidence and do not imply data-migration approval.

**Validation:** Path-limited review against SPEC §§2–3 and 7; focused non-archive source/document scan; `git diff --check -- <CSP-L8 paths>`.

**Stop:** The document is not current authority, correction requires a broader canonical decision, or any non-doc change is requested. If no safe confirmed conflict remains, record T8 as skipped rather than widening scope. Release CSP-L8 before T9.

---

## 11. T9 — Independent final QA and scope review

**Task declaration:** Role: QA/reviewer. Model: `openai/gpt-5.6-terra`. Mode: QA/review, read-only. Depends on: T7 and T8 released/skipped. Output: Spanish Caveman handoff.

**Allowed files:** No writes. Read only T0–T8 owned paths and the three SDD artifacts.

**Forbidden:** All modifications, migrations, Prisma/data commands, installs, Git writes, and browser/server automation outside an approved non-production manual QA session.

**Verification:**

1. Review the final diff and lock history against AC-01 through AC-11; verify no prohibited path or persisted-data work entered the diff.
2. Run focused tests, then `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check`. Report unrelated pre-existing failures separately; use Diagnose before proposing any fix.
3. In approved non-production manual/browser QA at desktop and narrow viewport, verify `scheduled` + `preparing` renders `Estado CX: Pendiente` and `Preparación: En preparación`; each filter family acts independently; no Estado CX selector exposes `En preparación`; and a preparation action leaves the general badge and execution state unchanged.
4. Re-run the prohibited general-state source scan and confirm every remaining match is an allowed preparation label/mapping, explicit normalization case, or historical/archive reference.

**Stop:** Any boundary violation, cross-field mutation, generic transition, unexpected write, data/schema touch, or security/policy regression. QA does not fix source; return the failure to its owning task in Diagnose format.

---

## 12. Executor order and readiness

1. T0 — compatibility preflight and locks.
2. T1 — types, adapter, validator, normalization.
3. T2 — preparation-only mutation boundary.
4. T3 — shared status logic and local prototype boundary.
5. T4 — Cirugías UI consumers.
6. T5 — Ficha/timeline consumers.
7. T6 — coordinator, boards, and automation.
8. T7 — local fixtures and focused regression tests.
9. T8 — conditional doc-only conflict correction.
10. T9 — read-only QA/review.

**Blocked/deferred:** Persisted `cxStatus = preparing` inspection, data remapping, backfill, and every schema/migration action require a separate approved plan and Franco approval. They are not implementation tasks in this change.

**Recommended first APPLY task:** **T0 — Re-run ownership reconciliation and prep-contract preflight.** It reconciles the prior blocker, reserves the new route/service/client/validator/test ownership, and confirms reuse of existing auth/tenant/role/audit conventions before T1 changes the contract.
