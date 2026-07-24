# TASKS — COORDINATION-INTERACTIVE-METRICS-001

Status: **planned; implementation not authorized**
Change: `COORDINATION-INTERACTIVE-METRICS-001`
Language: English; visible UI labels/examples and executor handoffs are Spanish
Based on: approved `PROPOSAL.md` → normative `SPEC.md` → approved `DESIGN.md`

---

## 1. Execution contract

### 1.1 Authorization and mandatory order

This artifact defines a future APPLY sequence; it does **not** authorize APPLY. After separate Franco/orchestrator authorization, execute strictly:

```txt
T0 read-only preflight
  → T1 read-path representation
  → T2 pure snapshot/predicate pipeline
  → T3 personal-inbox presentation and state
  → T4 integration/security regression
  → T5 final quality and browser QA gate
```

No implementation or test writer may run in parallel. Each task starts only after its predecessor passes, publishes a Spanish Caveman handoff, and releases or explicitly transfers every shared lock. This serialization is mandatory because `src/types/index.ts` → `src/lib/api/surgery-adapter.ts` → `CoordinatorCase`/filter derivation → personal-inbox state/UI is one dependent chain.

### 1.2 Global invariant and forbidden scope

Every task SHALL preserve:

- the server-authorized current company, production personal subject, resolved coordinator contact ID, active-case bucket contract, and one-surgery/one-row identity;
- ownership when the resolved assignment timestamp is missing or malformed: timestamp quality changes only the explicit SLA-basis classification and never changes `resolved` ownership or personal-inbox membership;
- read-only filtering: client predicates narrow one accepted authorized snapshot and never become a tenant or permission boundary;
- stable metric counts from the unfiltered accepted base snapshot, one captured `evaluationNow`, exact AND semantics, and separate draft/applied state; and
- the existing distinction among blocked/access, initial loading, initial error, same-context refresh, true empty, contradictory filtered empty, normal filtered empty, and populated state.

All tasks forbid:

- `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.ts`, schema generation/push/reset/migrate/seed, backfill, fixture/data repair, or any database read/write introduced for this change;
- Auth, guards, permissions, company membership, assignment writes, domain transitions, notifications, audit policy, persisted preferences, providers, dependencies, package manifests, lockfiles, or build configuration;
- `AvailabilityRequest`, **`Pedir disponibilidad`**, request permissions/lifecycle, or any command launched from a metric, modal, chip, row, or empty state;
- `Panel global`, preview-only component behavior, Expediente, Cirugías pages/hooks, unrelated dashboards, broad refactors, or case-action redesign;
- Prisma from React, unrestricted contact/global fetches, per-case/N+1 requests, inferred timestamps, duplicate persistence, or use of `Surgery.createdAt`, authorization date, history, probable date, array order, `isPrimary`, label, or recency as the overdue basis;
- `npm install`, dependency updates, Git write/clean/reset/checkout/stage/commit commands, formatting unrelated files, or absorbing/reverting unrelated dirty work; and
- source fixes by read-only QA tasks. Any failed validation follows Diagnose and returns to the owning task.

If implementation discovers that assignment `createdAt` is not already persisted/serialized, that a persisted assignment row actually lacks database `createdAt`, or that any approved filter requires new persistence/schema/migration, stop immediately and escalate to Franco. There is no schema or migration contingency in this plan.

### 1.3 Dirty-tree baseline and provenance protocol

The repository is heavily dirty and several anticipated paths are untracked. Dirty or untracked status does not grant ownership. The following SHA-256 values were captured read-only on **2026-07-20** and are planning anchors, not permission to overwrite work.

#### Normative artifact baselines

| Status | Path | SHA-256 |
| --- | --- | --- |
| `??` | `knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/PROPOSAL.md` | `669259133bca1080f5e4134b32e3168bac6e8f3ee291f87f8f346964f65c0739` |
| `??` | `knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/SPEC.md` | `5910d7ce1eafb19fb7d77589191e00dad672f6f974c092febeb8db47f5daaa64` |
| `??` | `knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/DESIGN.md` | `cf9462ba4d3329bc0e5d19508df2b5281267b24dcfe6d110a4dbd5b471b971ed` |

These three files are read-only during APPLY. A changed hash requires SDD reconciliation before T0 may pass.

#### Anticipated owned-path baselines

| Status | Path | SHA-256 / expected state |
| --- | --- | --- |
| ` M` | `src/types/index.ts` | `234af69cd65edf40fcf6b27c7a85702ddbb73606a70e9f2a23b12d6efa9d7b95` |
| ` M` | `src/lib/api/surgery-adapter.ts` | `1cfc4ac75728902c9d6ae1a831616bed375376d4c507c20b749624e2a0f5ca18` |
| `??` | `src/components/coordinadores/coordinator-queue.helpers.ts` | `5e956cb6ee3b44fe54021b124d4e4f1c763a10cdd7905ad6fbfb4617618f5af0` |
| absent | `src/components/coordinadores/coordination-filtering.ts` | `<absent>` |
| absent | `src/components/coordinadores/CoordinationMetricFilters.tsx` | `<absent>` |
| absent | `src/components/coordinadores/CoordinationAdvancedFilters.tsx` | `<absent>` |
| `??` | `src/components/coordinadores/CoordinatorInboxView.tsx` | `00aab76633c3e470873eceba2db6fefc62bb6023fca760218fa882bc119e803c` |
| `??` | `src/components/coordinadores/CoordinationSecondaryFilters.tsx` | `2839d2805da487002732cc868b9fb941ec4fc092b698b08b945502928662a7db` |
| `??` | `src/components/coordinadores/coordination-ui-state.ts` | `8df455fb8dafc1f912d6f4faffe90828b41ca4b457fce81b14453448c5a73de6` |
| `??` | `src/components/coordinadores/CoordinationStateSurface.tsx` | `04b1a53441d698894d6cd41e2bd29d7f5eb2bd5f18b2ac81c0f1ea25b3aaeb21` |
| `??` | `src/hooks/useCoordinationView.ts` | `19b64024fadd340523901a0b45a9c00305dd6d8335b8bd215aa8c828704ec3a1` |
| `??` | `src/__tests__/unit/backend-active-surgeries-adapter.test.ts` | `c56ce9c264baad8f8aeb180c778dfb72c84ca36c3ad8efe41be88c803b4cf0b5` |
| `??` | `src/__tests__/unit/coordinator-queue.helpers.test.ts` | `1a64c5b2c466cca99b5c0ee61355036aaa8a612a369db6188c575beb8b94810d` |
| absent | `src/__tests__/unit/coordination-filtering.test.ts` | `<absent>` |
| `??` | `src/__tests__/unit/coordination-ui-state.test.ts` | `d86f91dcba93db8e3756fdcffd15fbc749a2b8fc733b4a6f047cef68113f6976` |
| `??` | `src/__tests__/unit/useCoordinationView.test.tsx` | `d41a788c1fa19a8d481708feee476de8b701c9806145daf8a29c9d4ee83dc815` |
| `??` | `src/__tests__/components/CoordinatorInboxView.test.tsx` | `7be3604c70684d139db5c4ce266c76c743e5cf9be2dca5ab95c54d2b6f61bc07` |
| `??` | `src/__tests__/components/CoordinationStateSurface.test.tsx` | `23c87fe90e9c1d7565b38ae29da034f8c91e288030978c12c4e34875d92558e1` |
| absent | `src/__tests__/components/CoordinationMetricFilters.test.tsx` | `<absent>` |
| absent | `src/__tests__/components/CoordinationAdvancedFilters.test.tsx` | `<absent>` |
| `??` | `src/__tests__/unit/coordination-view.service.test.ts` | `d4c11d5899717e044028200694eece4a6aa3086f80cf70d3ca2458e21072ebd0` |
| `??` | `src/__tests__/unit/coordination-view-route.test.ts` | `4051e2747bdf9dbaa582d78adcf95de3381f9c2aaa47390a23d54b49eab95bff` |
| `??` | `src/__tests__/unit/surgery-coordinator-read-model.test.ts` | `d8af826a184254de6271afc58371ad56212bb9f905405be21c312c87c591b482` |
| `??` | `src/__tests__/unit/surgery.service-coordinator-read.test.ts` | `d3133f820ac8e70e657893b148bd0e9ffdb6167cbc9e9a5ec021774fab4d4d96` |

#### Read-only server-boundary anchors

These paths are not expected or authorized for implementation edits. T0/T4 may inspect them and SHALL prove they remain unchanged:

| Status | Path | SHA-256 |
| --- | --- | --- |
| ` M` | `src/lib/services/surgery.service.ts` | `1dcc3f6cd15486d9b05d7e62b08293ff5ab33a009000ffca8be48640f5d66d7e` |
| `??` | `src/lib/services/surgery-coordinator-read-model.ts` | `ba1daea17ef43b130a7e54bf177d180e863e6727ceab23ace8e972c08de89fe1` |
| `??` | `src/lib/services/coordination-view.service.ts` | `336899359b42cb28a4c450e1de1ceaa28d4caeffd4e10e0e121d708f5b4eb42e` |
| `??` | `src/app/api/companies/[companyId]/coordination/view/route.ts` | `000fdccf4f86332c818e2ef0d692d14a55cf41b1f1107ef90e6621a8fce94610` |
| `??` | `src/lib/api/coordination-view.ts` | `67efb12ae79abefa7335dd30349f43cf4291bd5e043e98b493f3ce66f20694d3` |

Before every task, the executor SHALL:

1. publish the task declaration from this artifact;
2. record `git status --short --untracked-files=all` and a path-limited diff for every owned/read-anchor path;
3. recompute SHA-256 for every dirty/untracked owned path and compare it with the prior accepted handoff baseline;
4. identify provenance and obtain explicit owner release for every pre-existing dirty/untracked path; absent planned paths must still be absent before creation;
5. store baseline/delta evidence outside the repository in the approved orchestration record; create no lock/evidence file in the repo;
6. reserve the exact lock, then move it visibly through `reserved → editing → review → released` (`read-only` tasks omit `editing`); and
7. compare only task-owned deltas with the accepted baseline and report unrelated changes separately.

Unknown provenance, active overlap, changed hash after reservation, an unexpectedly existing planned-new path, or a needed edit outside the task allowlist is an immediate stop. Never restore a path to the hash above: preserve the accepted current owner baseline and add only the scoped delta.

### 1.4 Lock register

| Lock | Holder | Exact ownership | Initial state |
| --- | --- | --- | --- |
| `CIM-L0` | T0 | read-only artifacts/current-tree evidence and ownership reconciliation | planned |
| `CIM-L1` | T1 | shared Surgery types, productive adapter/hydration, focused adapter test | planned |
| `CIM-L2` | T2 | `CoordinatorCase`/active-base integration, pure filtering module, pure tests | planned |
| `CIM-L3` | T3 | productive personal-inbox filters/state/hook and focused component/controller tests | planned |
| `CIM-L4` | T4 | test-only read-path, integration, isolation, and no-write regression files | planned |
| `CIM-L5` | T5 | read-only final diff, quality gates, and authenticated browser QA | planned |

Locks are exclusive and serialized. `CIM-L1` transfers its accepted read shape to `CIM-L2`; `CIM-L2` transfers the pure contract to `CIM-L3`; `CIM-L3` releases before `CIM-L4`. No concurrent writer may touch `src/types/index.ts`, the surgery adapter/service chain, Coordination helpers/components/hook/tests, `src/lib/store.ts`, either Coordination page, Cirugías hooks, or schema. `src/lib/store.ts` and both Coordination pages are not expected to change; needing them is a stop.

### 1.5 Validation and handoff rules

- Run only commands listed by the active task. All Git commands are read-only.
- No task may run a Prisma/database command, data script, migration, install, or production command.
- Focused tests precede broad quality gates. A failed test/typecheck/lint/build uses Diagnose: Reproduce / Scope / Evidence / Hypothesis / Minimal Fix / Validate / Regression Check / Handoff.
- T4/T5 report source failures to T1–T3; they do not widen their write scope.
- Every task ends in Spanish Caveman: `Done / Changed / Files / Validations / Risks / Next`.
- A lock reaches `released` only after path-limited diff review, hash/delta reconciliation, validation, and accepted handoff.

---

## 2. T0 — Current-tree, ownership, no-schema, and file-plan preflight

### Task declaration

- **Task ID / Name:** `COORDINATION-INTERACTIVE-METRICS-001-T0 / Read-only implementation preflight`
- **Owner role:** Implementation lead / repository preflight reviewer
- **Selected model:** `openai/gpt-5.6-sol` (default; orchestrator may replace before APPLY)
- **Mode:** `read-only`
- **Depends on:** separate APPLY authorization; no active writer on anticipated paths
- **Scope:** reconcile dirty/untracked provenance and hashes; verify the approved timestamp/filter fields and exact authorized personal-inbox graph still exist; freeze the exact T1–T4 allowlists without modifying source.
- **Allowed files:** read `PROPOSAL.md`, `SPEC.md`, `DESIGN.md`, every baseline/read-anchor path in §1.3, direct imports required to verify ownership, and package scripts; write none.
- **Forbidden files/actions:** every repository write, database access, server/browser execution, Auth/permission inspection beyond static imports, schema/migration commands, and any attempt to repair current code.
- **Output:** external preflight evidence plus Spanish Caveman handoff.
- **Expected handoff:** unchanged normative hashes; provenance/owner release for all anticipated dirty/untracked paths; exact file plan; no-schema proof; go/stop for T1.

### Work and validations

1. Recompute all §1.3 statuses/hashes and path-limited diffs. Record current owner/provenance and explicit release. If any hash changed, treat the new bytes as unknown until reconciled; do not overwrite them.
2. Confirm statically that `SurgeryContactAssignment.createdAt` and assignment ID are already selected, serialized as ISO, returned by the company-scoped Coordination read, and currently dropped/rejected only at the productive adapter/hydration boundary.
3. Confirm the singular server-authorized `coordinatorAssignment` resolution remains available independently from `coordinatorAssignments[]`; timestamp parsing must not recompute ownership.
4. Confirm `visibleNumber`, canonical surgery date/CX state, institution ID/label, payer/client ID/label, and existing bounded material-availability derivation are already available. Freeze ID-first/authorized-label-fallback behavior; no lookup is permitted.
5. Confirm active base can reuse exact personal contact filtering plus `getCoordinatorBucket()` with `bucket !== null && bucket !== "finalizado"`, and dedupe by `backendId` then existing hydrated ID.
6. Confirm the repository's existing Radix dialog primitive satisfies the permitted dependency-free modal path and that `Panel global`/preview imports can remain untouched.
7. Freeze the exact test names below. An unexpected collision requires provenance and explicit transfer; it cannot be silently reused.

Allowed commands:

```powershell
git status --short --untracked-files=all
git diff --name-only
git diff -- knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/PROPOSAL.md knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/SPEC.md knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/DESIGN.md src/types/index.ts src/lib/api/surgery-adapter.ts src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/services/coordination-view.service.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/lib/api/coordination-view.ts
git ls-files --others --exclude-standard -- knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/PROPOSAL.md knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/SPEC.md knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001/DESIGN.md src/types/index.ts src/lib/api/surgery-adapter.ts src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/services/coordination-view.service.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/lib/api/coordination-view.ts
git diff --check -- knowledge/specs/COORDINATION-INTERACTIVE-METRICS-001
```

Static file/content searches and SHA-256 calculation are allowed only for the stated paths. No test, server, browser, Prisma, or data command runs in T0.

### Exit and stop gates

`CIM-L0: reserved → review → released`. Release only when T1–T4 paths are safe to reserve and no approved requirement needs schema, migration, service/route/Auth/permission changes, unrestricted lookup, new dependency, new business rule, or `Panel global`/preview/Cirugías/Expediente work.

Stop for unknown dirty ownership, changed normative artifacts, missing server timestamp/ID, ownership coupled to timestamp validity in an unfixable bounded adapter, unavailable filter data, inability to reuse active eligibility, or any required edit outside the planned chain.

**SPEC/scenarios:** BOUND-01–06, BASE-01–03, RPATH-01–05; M-7, S-7; SPEC §§12–13.

---

## 3. T1 — Preserve assignment identity/timestamp quality through productive hydration

### Task declaration

- **Task ID / Name:** `COORDINATION-INTERACTIVE-METRICS-001-T1 / Productive assignment read representation`
- **Owner role:** Backend read-model / adapter implementer
- **Selected model:** `openai/gpt-5.6-sol` (default; orchestrator may replace before APPLY)
- **Mode:** `implementation/testing`
- **Depends on:** T0 passed; `CIM-L0` released; `CIM-L1` reserved with accepted baselines
- **Scope:** carry already-returned assignment identity and timestamp quality plus authorized institution/client IDs through the productive adapter/hydration representation without changing server selection, authorization, ownership, or persistence.
- **Allowed files:** exactly:
  - `src/types/index.ts`
  - `src/lib/api/surgery-adapter.ts`
  - `src/__tests__/unit/backend-active-surgeries-adapter.test.ts`
- **Read-only evidence:** server-boundary anchors in §1.3 and their existing focused tests.
- **Forbidden files:** every other path, especially surgery/Coordination services/routes/client, store, hooks, UI/helpers, schema/migrations/data, Auth/permissions, packages, and docs.
- **Output:** code/tests and Spanish Caveman handoff.
- **Expected handoff:** exact valid/missing/invalid client representation, independent ownership preservation, authorized ID propagation, path-limited diff, and zero persistence/security changes.

### Implementation requirements

1. Add only read-only `Surgery`/adapter shapes needed for `assignmentId`, exact `contactId`, and `slaBasis: valid | missing | invalid`, with bounded diagnostic codes from DESIGN §4.2–4.3. Preserve institution/client stable IDs already present in the authorized response.
2. Parse assignment identity separately from timestamp quality. Retain an identity-valid row when `createdAt` is absent or malformed; reject only structurally unusable identity.
3. Accept only explicit-offset ISO/RFC 3339 instants (`T` plus `Z` or numeric offset) that parse to finite epoch milliseconds. Date-only/browser-local interpretation is invalid.
4. Hydrate `coordinatorAssignmentState` and `coordinadorContactId` from the existing singular server-authorized resolution independently from timestamp-valid rows. Timestamp quality cannot turn `resolved` into `none`/`ambiguous`.
5. Keep exact subject-row association possible. Never select another row by order, primary, label, or recency, and never use any fallback timestamp.
6. Preserve `institutionId`/`payerContactId` only when already returned; do not query or infer them.

Focused tests SHALL cover valid explicit-offset ISO, missing, malformed, date-only, ownership surviving invalid/missing timestamps, identity-invalid row rejection, singular server resolution independence, multiple same-contact rows remaining diagnosable, assignment ID association, ID propagation, and no fallback to Surgery/history/authorization/probable dates.

Allowed commands:

```powershell
git status --short --untracked-files=all -- src/types/index.ts src/lib/api/surgery-adapter.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts
git diff -- src/types/index.ts src/lib/api/surgery-adapter.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts
npx vitest run src/__tests__/unit/backend-active-surgeries-adapter.test.ts
npm run typecheck
git diff --check -- src/types/index.ts src/lib/api/surgery-adapter.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts
```

### Exit and stop gates

`CIM-L1: reserved → editing → review → released`. Exit requires identity-valid rows and authorized ownership to survive every timestamp quality, with no server/persistence change. Stop if the wire response lacks the approved fields, persisted rows are found without database `createdAt`, ownership cannot remain independent, or a server/service/route/store/schema/Auth edit is needed.

**SPEC/scenarios:** BOUND-02–04, RPATH-01–05; M-5, M-6, S-7; SPEC §12.1 and §12.5.

---

## 4. T2 — Build one pure base-snapshot, predicate, count, option, and AND pipeline

### Task declaration

- **Task ID / Name:** `COORDINATION-INTERACTIVE-METRICS-001-T2 / Pure coordination filtering pipeline`
- **Owner role:** Domain derivation implementer
- **Selected model:** `openai/gpt-5.6-sol` (default; orchestrator may replace before APPLY)
- **Mode:** `implementation/testing`
- **Depends on:** T1 passed; `CIM-L1` released; `CIM-L2` reserved
- **Scope:** construct the immutable accepted personal-inbox base snapshot and centralized pure predicates/counts/options/chips/contradiction/result conjunction. No React, store, API, dialog, or command dependency in the new module.
- **Allowed files:** exactly:
  - `src/components/coordinadores/coordinator-queue.helpers.ts`
  - `src/components/coordinadores/coordination-filtering.ts` (create; must be absent at reservation)
  - `src/__tests__/unit/coordinator-queue.helpers.test.ts`
  - `src/__tests__/unit/coordination-filtering.test.ts` (create; must be absent at reservation)
- **Forbidden files:** every other source/test path, including types/adapter, UI/state/hook/store/pages, server/API/Auth/permission, schema/migrations/data, packages, and docs.
- **Output:** pure code/tests and Spanish Caveman handoff.
- **Expected handoff:** frozen pure API with explicit `now`, stable counts, exact AND semantics, diagnostics, and full predicate boundary evidence.

### Implementation requirements

1. Extend `CoordinatorCase` only as needed to expose the resolved subject's `AssignmentSlaBasis`; associate rows by exact authorized resolved contact ID. Zero row is `resolved_assignment_row_missing`; several unusably ambiguous same-contact rows are `multiple_resolved_assignment_rows`. Missing/invalid bases remain in the active personal base and are diagnostic only.
2. Normalize one `CoordinationBaseSnapshot` only after a successful exact-context read: exact personal subject, existing `filterCoordinatorCasesByContactId()`, existing non-final active bucket (`bucket !== null && bucket !== "finalizado"`), deterministic order, dedupe by backend/stable surgery identity, one captured `evaluationNow`, counts/options/diagnostic aggregates from the same cases.
3. Implement exact metric predicates:
   - **`Poner fecha`**: active resolved base case with no valid canonical CX date;
   - **`Fuera de plazo`**: `Poner fecha`, valid exact resolved assignment basis, future-safe elapsed instant `>= 172_800_000` ms;
   - **`Coordinadas`**: valid canonical CX date only;
   - **`En tránsito`**: exact canonical CX state **`En tránsito`** only.
4. Compute four counts from the unfiltered base before any selected metric/advanced predicate. Filter operations never recapture time or recount a filtered set.
5. Implement a selected-metric `ReadonlySet` and applied-advanced conjunction with `every`; zero selected metrics is identity. Preserve order and one row.
6. Implement pure contradiction detection for at least `Poner fecha + Coordinadas`, `Fuera de plazo + Coordinadas`, and `Poner fecha/Fuera de plazo + active surgery-date range`. Contradiction derives from definitions, not current rows.
7. Implement advanced predicates exactly: NFKC/trim/case-fold contiguous CX substring over visible CX only; ID-first exact institution/client identity with deterministic authorized-label fallback; inclusive Gregorian `YYYY-MM-DD` surgery/availability ranges without `Date`; exact canonical CX state; missing/invalid case dates do not match active ranges.
8. Build institution/client options only from the accepted authorized base, deduplicated by `kind + value`, deterministically sorted, with no placeholder/lookup. Build normalized applied values, range validation, exact active count (maximum six), and one removable chip per logical field/range.
9. Do not use the generic SLA/history helper for overdue and do not inspect preparation, logistics, material, request, or notification facts except the approved existing material-availability date read value.

Focused tests SHALL cover SPEC §12.1–4 completely: active/ineligible/deduped base; valid/missing/invalid/duplicate SLA basis; future, malformed, missing, one millisecond before, exact and after 48 hours, explicit offsets; all four metrics; zero through four selected metrics; every advanced predicate; stable counts; contradictions/normal no-match; date-only validity/inclusivity/time-zone independence; deterministic options; maximum-six count/chips; independent removal; and one-row identity.

Allowed commands:

```powershell
git status --short --untracked-files=all -- src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts
git diff -- src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts
npx vitest run src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts
npm run typecheck
git diff --check -- src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts
```

### Exit and stop gates

`CIM-L2: reserved → editing → review → released`. Exit requires pure dependency-free functions and all focused tests green. Stop if active eligibility needs a second lifecycle model, exact AND/stable counts/one-row identity cannot be preserved, a filter needs unavailable or unrestricted data, instant/date-only arithmetic cannot remain separate, or any UI/store/API/schema/business-rule edit is needed.

**SPEC/scenarios:** BASE-01–03, METRIC-01–06, INT-02–07, ADV-01–09, MODAL-07–09, SCALE-01–04; M-2–M-8, I-1–I-5, A-2–A-3, A-8–A-9.

---

## 5. T3 — Replace productive personal-inbox metrics and filters with accessible transactional UI

### Task declaration

- **Task ID / Name:** `COORDINATION-INTERACTIVE-METRICS-001-T3 / Personal-inbox metrics, modal, chips, and loaded states`
- **Owner role:** Frontend/Coordination UI implementer
- **Selected model:** `openai/gpt-5.6-sol` (default; orchestrator may replace before APPLY)
- **Mode:** `implementation/testing`
- **Depends on:** T2 passed; `CIM-L2` released; `CIM-L3` reserved
- **Scope:** consume the accepted read shape and pure pipeline in production **`Mi bandeja`**; replace legacy passive metrics/quick/secondary filters with four metric toggles, compact advanced dialog, chips, transactional state, explicit empty states, and context-safe refresh behavior.
- **Allowed files:** exactly:
  - `src/components/coordinadores/CoordinationMetricFilters.tsx` (create; must be absent)
  - `src/components/coordinadores/CoordinationAdvancedFilters.tsx` (create; must be absent)
  - `src/components/coordinadores/CoordinatorInboxView.tsx`
  - `src/components/coordinadores/CoordinationSecondaryFilters.tsx` (remove from productive graph; delete only if T0 proves no other live consumer)
  - `src/components/coordinadores/coordination-ui-state.ts`
  - `src/components/coordinadores/CoordinationStateSurface.tsx`
  - `src/hooks/useCoordinationView.ts` only if accepted context/snapshot metadata is required
  - `src/__tests__/components/CoordinationMetricFilters.test.tsx` (create; must be absent)
  - `src/__tests__/components/CoordinationAdvancedFilters.test.tsx` (create; must be absent)
  - `src/__tests__/components/CoordinatorInboxView.test.tsx`
  - `src/__tests__/components/CoordinationStateSurface.test.tsx`
  - `src/__tests__/unit/coordination-ui-state.test.ts`
  - `src/__tests__/unit/useCoordinationView.test.tsx` only if the hook changes
- **Forbidden files:** every other path, especially preview components, `Panel global`, pages, store, case actions/dialogs, pure/read-path files, server/API/Auth/permissions, schema/migrations/data, packages, and docs.
- **Output:** production personal UI/tests and Spanish Caveman handoff.
- **Expected handoff:** exact labels/interactions/state transitions, accessibility evidence, path-limited diff, and confirmation that existing actions/permissions/global/preview behavior remain untouched.

### Implementation requirements

1. Render exactly **`Poner fecha`**, **`Fuera de plazo`**, **`Coordinadas`**, and **`En tránsito`** as operable buttons from stable snapshot counts. Remove summary **`Pendientes`**, **`SLA vencido`**, **`Sin disponibilidad`**, and the legacy **`Mi bandeja`**/**`Vence hoy`**/**`Vencidas`**/**`Sin fecha`** strip from the productive personal graph.
2. Each metric toggles only itself, keeps zero-count operable, exposes explicit `aria-pressed`, has an accessible label containing Spanish label/count, and belongs to **`Filtros por métricas de coordinación`**. Selected state uses more than color.
3. Own separate in-memory states for `selectedMetrics`, `appliedAdvanced`, and dialog `draft/errors`; no Zustand persistence, URL, cookie, local storage, server preference, or write.
4. **`Más filtros`** opens the repository's existing accessible dialog with only CX, surgery-date range, Institución, Cliente, availability-date range, and Estado. Use authorized snapshot options only. Do not add workflow/action/preparation/logistics controls.
5. Open/reopen copies applied to draft. Draft edits have no external effect. Valid **`Aplicar`** atomically commits all draft values and closes. Invalid ranges remain open, preserve applied results, show specific Spanish inline errors, associate/announce them, and focus the first invalid range. Cancel/Escape/non-apply close discards draft.
6. Dialog **`Limpiar`** immediately clears draft and all applied advanced filters while preserving metrics. Global **`Limpiar filtros`** clears metrics and advanced values. Chip removal clears one logical applied value only; a range chip removes both bounds.
7. Show exact trigger count **`Más filtros · N`** excluding metrics and one concise external chip per active logical field. Reopening reflects chip removals. Specific remove names follow **`Quitar filtro Institución: Hospital Italiano`**.
8. Derive visible results only through T2's AND pipeline. Preserve active contradictory selections and show **`Los filtros seleccionados se contradicen`** before normal filtered-empty. Show **`No hay resultados con estos filtros`** for a non-contradictory no-match. True empty remains **`No tenés casos asignados en esta etapa.`** without clear action.
9. Build/replace one accepted base snapshot only for `controller.hasSuccessfulData` at the exact trust context. Same-context refresh preserves the complete last accepted display, then atomically replaces cases/counts/options/accepted time. Actor/company/mode/surface/subject change invalidates snapshot, selections, applied filters, chips, draft, options, rows, and stale announcements before protected new-context data renders.
10. Keep loading/blocked/error states from showing zero metrics or filtered-empty copy. Add one concise polite aggregate live region; do not announce every row or duplicate announcements.
11. Desktop and `412x915`: compact four-button layout, no clipped labels/page overflow, wrapping chips, `44x44` targets, viewport-bounded centered dialog, independently scrollable body, reachable title/actions, and first representative result no later than the second viewport.
12. Do not alter or grant existing case actions. No filter interaction may call an API, navigate to an action, or inspect `AvailabilityRequest`.

Focused tests SHALL cover M-1, I-1–I-5, A-1/A-4–A-8, and S-1–S-5: exact/legacy labels, accessible toggle states, stable count rendering, transactional draft/apply/cancel/Escape/clear, range errors, chip/count synchronization, distinct empty-state precedence, refresh/context reset, focus trap/restore, one live announcement, no row announcements, target/layout contracts, and no `Panel global`/preview changes.

Allowed commands:

```powershell
git status --short --untracked-files=all -- src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx
git diff -- src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx
npx vitest run src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx
npm run typecheck
git diff --check -- src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx
```

If `useCoordinationView.ts` remains unchanged, omit its test from the edited allowlist but still run the existing test read-only. Do not make a no-op edit merely to claim ownership.

### Exit and stop gates

`CIM-L3: reserved → editing → review → released`. Exit requires productive personal behavior only, green focused tests, and unchanged action/permission/global/preview boundaries. Stop if the UI requires store persistence, page/global/preview/action changes, new dialog dependency, unrestricted lookup, mutation, unavailable data, or weakened context invalidation/access behavior.

**SPEC/scenarios:** BOUND-01, BOUND-03, BOUND-05–06, INT-01–09, MODAL-01–09, STATE-01–06, RESP-01–03, A11Y-01–05; M-1/M-8, I-1–I-5, A-1/A-4–A-8, S-1–S-5.

---

## 6. T4 — Test-only read-path, integration, isolation, and no-write regression

### Task declaration

- **Task ID / Name:** `COORDINATION-INTERACTIVE-METRICS-001-T4 / Integration and security regression`
- **Owner role:** QA/security test implementer
- **Selected model:** `openai/gpt-5.6-sol` (default; orchestrator may replace before APPLY)
- **Mode:** `testing/implementation; production source read-only`
- **Depends on:** T3 passed; `CIM-L3` released; `CIM-L4` reserved
- **Scope:** strengthen existing focused server/read-path tests and run the full Coordination chain to prove timestamp association, company/personal isolation, no writes/requests, and forbidden-scope absence. Do not fix production source.
- **Allowed files to edit:** exactly:
  - `src/__tests__/unit/coordination-view.service.test.ts`
  - `src/__tests__/unit/coordination-view-route.test.ts`
  - `src/__tests__/unit/surgery-coordinator-read-model.test.ts`
  - `src/__tests__/unit/surgery.service-coordinator-read.test.ts`
- **Allowed read-only files:** T1–T3 paths, §1.3 server anchors, existing Coordination permission/personal-resolver tests, `package.json`, and normative artifacts.
- **Forbidden files:** every production source file and every other test/doc/config/data path; especially schema/migrations/Auth/permissions/services/routes/adapter/UI/store/packages.
- **Output:** tests/evidence and Spanish Caveman handoff.
- **Expected handoff:** end-to-end read association and isolation proof, no-write/network proof, final-scope manifest, failures returned to the owning task.

### Verification requirements

1. Prove persisted `assignmentId`/ISO `createdAt` survive surgery projection → serializer → Coordination response unchanged and remain associated with the exact resolved subject row.
2. Exercise valid/missing/malformed client timestamp outcomes through adapter/base/predicate integration: the case retains resolved ownership/base membership; only valid exact-row time can satisfy overdue; diagnostic classes remain distinguishable.
3. Prove no primary/order/recency/label/fallback source is consulted and no timestamp or field is fabricated.
4. Prove current-company/personal subject scope, foreign similarly labeled institution/client exclusion, one-row identity, and context replacement remain intact. Client filters never widen authorization.
5. Spy on fetch/mutation/persistence boundaries for metric toggle, draft edit/apply/cancel/clear, chip removal, and global clear: no POST/PUT/PATCH/DELETE, per-case/N+1/global lookup, store-persisted preference, domain write, or `AvailabilityRequest` coupling.
6. Review the complete task diff and source import graph for zero schema/migration/seed/backfill/Auth/permission/notification/request/action/global/preview/Cirugías/Expediente/dependency changes.

Allowed commands:

```powershell
git status --short --untracked-files=all -- src/types/index.ts src/lib/api/surgery-adapter.ts src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/services/coordination-view.service.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/lib/api/coordination-view.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts
git diff -- src/types/index.ts src/lib/api/surgery-adapter.ts src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/services/coordination-view.service.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/lib/api/coordination-view.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts
npx vitest run src/__tests__/unit/surgery.service-coordinator-read.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx
npm run typecheck
git diff --check -- src/types/index.ts src/lib/api/surgery-adapter.ts src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts
```

Static source/import searches are allowed for prohibited mutations/fallbacks/imports. No server, browser, Prisma, database, or source-write command runs in T4.

### Exit and stop gates

`CIM-L4: reserved → editing → review → released`. Test-only edits are allowed; production source is read-only. Any source defect is handed back in Diagnose format to T1, T2, or T3, which must re-reserve its lock; T4 reruns only after that lock is released again. Stop for cross-company disclosure, stale-context display, ownership loss on invalid time, any write/request coupling, forbidden path delta, schema/migration need, or inability to prove exact read association.

**SPEC/scenarios:** all BOUND/RPATH/SCALE requirements; M-5–M-8, A-9, S-3, S-6, S-7; SPEC §12.5–6 and §12.8–9.

---

## 7. T5 — Independent full quality gates and authenticated browser QA

### Task declaration

- **Task ID / Name:** `COORDINATION-INTERACTIVE-METRICS-001-T5 / Final verification and browser gate`
- **Owner role:** Independent QA/reviewer
- **Selected model:** `openai/gpt-5.6-sol` (default; orchestrator may replace before APPLY)
- **Mode:** `QA/review; read-only`
- **Depends on:** T4 passed; every writer lock released; `CIM-L5` reserved; a compatible already-installed Playwright/playwright-cli browser tool is available; and the approved local DEV target is either safely preexisting or can be started under the temporary lifecycle authorization below
- **Scope:** run focused and broad quality gates, review final diff/traceability, and perform authenticated desktop/mobile browser QA without editing source or persisted/domain data; optionally own one temporary loopback DEV server solely for this QA.
- **Allowed files:** read normative artifacts, T1–T4 paths, `package.json`/package scripts, and final diff. The exact write allowlist is ignored `.next/**` produced by the approved gates/server plus exactly one uniquely named, secret-free server log under `C:\Users\franc\AppData\Local\Temp\opencode`; no other repository, temp, browser, or persistent write is allowed.
- **Forbidden:** all source/test/doc/env/config/manifest/lockfile, persistent-browser-profile, persisted-data, DB, Auth, or browser-profile writes; source fixes; schema/Prisma/database/data commands; installs; server modification or any server lifecycle outside the exact temporary authorization below; Git writes; production environment; destructive or mutation-capable browser actions.
- **Output:** final evidence and Spanish Caveman handoff with explicit pass/fail per gate.
- **Expected handoff:** complete requirement/scenario trace, focused/broad command results, browser evidence, network no-write evidence, final-scope audit, residual risks, and recommendation only—never APPLY authorization.

### Automated gates

Run in order:

```powershell
npx vitest run src/__tests__/unit/surgery.service-coordinator-read.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx
npm run typecheck
./node_modules/.bin/eslint.cmd src/types/index.ts src/lib/api/surgery-adapter.ts src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts
npm test
npm run build
git status --short --untracked-files=all
git diff --name-only
git diff -- src/types/index.ts src/lib/api/surgery-adapter.ts src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/services/coordination-view.service.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/lib/api/coordination-view.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts
git diff --check -- src/types/index.ts src/lib/api/surgery-adapter.ts src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinationMetricFilters.tsx src/components/coordinadores/CoordinationAdvancedFilters.tsx src/components/coordinadores/CoordinatorInboxView.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/coordination-ui-state.ts src/components/coordinadores/CoordinationStateSurface.tsx src/hooks/useCoordinationView.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/coordination-filtering.test.ts src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/useCoordinationView.test.tsx src/__tests__/components/CoordinationMetricFilters.test.tsx src/__tests__/components/CoordinationAdvancedFilters.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts
npm run lint
git diff --check
```

The path-scoped ESLint invocation is blocking with **zero errors**; warnings are non-blocking but SHALL be reported. It must use only the already-installed local executable shown above and must not install or resolve a missing package. The path-scoped `git diff --check` is also blocking, but Git omits untracked content: use `git status --short --untracked-files=all`/`git ls-files --others --exclude-standard` to identify every untracked T1–T4 allowlist file and inspect its content directly against the same whitespace-error classes before passing the scoped gate. Any in-scope lint error or whitespace defect fails T5.

The global `npm run lint` and global `git diff --check` still run and are reported as an informational external baseline, partitioned explicitly into findings inside and outside the T1–T4 allowlist. Findings wholly outside scope do not fail T5 when both exact scoped gates pass; they are never repaired or absorbed. Any in-scope finding remains blocking. Focused/full tests, TypeScript, build, security/final-scope review, and browser QA remain blocking. Any relevant failure returns to its owner under Diagnose and requires rerunning all downstream gates.

### Browser QA gate

The only allowed target is the approved local DEV personal **`Mi bandeja`** under `http://127.0.0.1:3000`. Before login, prove locally that the listener/target is non-production without printing configuration values, and assert that navigation never leaves the loopback origin. If no compatible already-installed Playwright/playwright-cli tool is available without installation, browser QA remains **BLOCKED** and T5 cannot pass.

#### Temporary local DEV server lifecycle authorization (Franco option B)

This is operational authorization for T5 browser QA only. It is not APPLY, source/test/doc/data, DB, Auth, environment, dependency, or production authorization, and it does not relax any automated gate or the post-authentication read-only browser boundary.

1. First inspect `package.json` and record that its `dev` wrapper expands to `next dev -p 3000 2>&1 | tee dev.log`. That wrapper is incompatible with this Windows lifecycle, writes repository `dev.log`, violates the exact write allowlist, and **MUST NOT** be executed. Neither `npm run dev` nor any package-script, `npm`, `npx`, PATH-resolved, install-capable, or substitute command is authorized for the server spawn. Do not edit the script or package files.
2. Before any spawn, from the repository root, require `Test-Path -LiteralPath C:\Users\franc\AppData\Local\Temp\opencode -PathType Container` to return true; fail closed if the literal path is absent or is not a directory. Resolve exactly one current `npm.cmd` application without executing it, derive its sibling `node.exe`, and require the canonical Node path to be absolute, existing, a file, and identical to the current `node.exe` application resolution; multiple or mismatched resolutions fail closed. Resolve the exact local Next CLI JS entrypoint at `.\node_modules\next\dist\bin\next`, require its canonical path to be absolute and an existing file, and prove with an ordinal case-insensitive path comparison that it is below the canonical repository `node_modules\next` directory. The canonical repository root must equal the process working directory. Reject either path if it contains a double quote or cannot be represented by the exact quoting below. Do not execute `npm`, resolve/install a missing runtime or package, use `.cmd`/shell/package wrappers for spawn, or create a fallback directory, log parent, wrapper, temporary script, or second temp artifact. Inspect the inherited environment without printing values or secrets; do not add, remove, override, or persist any environment variable or load a different env file. Fail closed for an unexpected or ambiguous runtime/entrypoint, working directory, inherited environment, bind, or target.
3. Inspect `127.0.0.1:3000` immediately before any spawn and identify the owning PID without broad process termination. If a listener already exists—or appears during the final pre-spawn race check—classify it as preexisting, record that T5 does not own it, do not spawn or later kill it, and use it only after proving the bind is loopback-only and the target is the approved safe local DEV environment. Otherwise browser QA is **BLOCKED**.
4. Only when the listener is absent after the final race check may T5 use the following PowerShell 5.1 API-level recipe in memory. The sole executable is the validated absolute `node.exe`; its fixed argument vector is the validated absolute Next CLI entrypoint, `dev`, `--hostname`, `127.0.0.1`, `--port`, `3000`. No element may come from user input, credentials, environment values, or server output. Build the fixed `Arguments` string as one double-quoted validated entrypoint followed literally by ` dev --hostname 127.0.0.1 --port 3000`; compare it to that exact expected string before spawn and fail closed if quoting or equality cannot be proven. Pass no command string to `cmd.exe`, PowerShell, or any shell and grant no substitute-command authority.

   Use `System.Diagnostics.ProcessStartInfo` literally with `FileName = <validated absolute node.exe>`, `WorkingDirectory = <validated canonical repository root>`, the fixed validated `Arguments` string above, `UseShellExecute = $false`, `CreateNoWindow = $true`, `RedirectStandardOutput = $true`, and `RedirectStandardError = $true`. Create exactly one new GUID-named log directly under the verified external parent with `System.IO.File::Open(..., FileMode.CreateNew, FileAccess.Write, FileShare.Read)`, wrap its UTF-8 `StreamWriter` with `System.IO.TextWriter::Synchronized`, instantiate one `System.Diagnostics.Process`, and assign that exact `ProcessStartInfo` to its `StartInfo`. Attach two in-memory `Register-ObjectEvent` handlers to that Process object's `OutputDataReceived` and `ErrorDataReceived` events. Each handler may only write its non-null `Data` line to the same synchronized writer and flush it; it must not echo, return, transform, or persist the line elsewhere. Invoke the instance method `$process.Start()` and require true, record `$process.Id`, UTC start time, and executable identity as the root identity, verify that executable identity equals the validated Node path, then call `$process.BeginOutputReadLine()` and `$process.BeginErrorReadLine()`. No static convenience start, redirection operator, tee, second stream file, transcript, temporary script, or second artifact is allowed. The event subscriptions/jobs, process object, writer, and file stream remain in memory and are cancelled/unregistered/removed, flushed, closed, and disposed in `finally`, after bounded process exit and asynchronous stream drain; handler/writer disposal failure fails T5.
5. Wait with a bounded timeout for both a healthy approved loopback response and a listener owned by the recorded root process or one of its recursively verified descendants. During spawn/readiness, use read-only `Get-CimInstance -ClassName Win32_Process` snapshots of `ProcessId`, `ParentProcessId`, `CreationDate`, and `ExecutablePath` to recursively traverse parent relationships from the recorded root PID; retain a dynamic union of every descendant ever observed while that root identity remains T5-owned. For the root and every descendant, record PID plus process creation/start time and executable identity where available; compare identity on every later observation. A reused PID, missing/changed identity that prevents an unambiguous match, wildcard/non-loopback bind, foreign PID, production-like target, process exit, timeout, unexpected redirect/origin, command drift, or environment anomaly fails closed; do not continue to login/browser QA. Inspect only the minimum readiness/error log lines and redact any sensitive value from evidence.
6. Browser login and credential handling remain exactly as specified below. The ephemeral browser context is created only after server safety/readiness passes, and the automated gates remain mandatory.
7. Use `finally` cleanup on every success, failure, timeout, or interruption path: close the ephemeral browser/context first. If and only if T5 spawned the server, recursively refresh parent relationships immediately before termination and repeatedly during bounded cleanup, adding newly verified descendants to the dynamic owned union while the recorded root identity is alive. Terminate only identity-matched leaves before their parents; refresh and repeat until the owned descendant tree is quiescent, then terminate the identity-matched root. Never terminate a PID whose recorded start time/executable identity no longer matches, a PID with ambiguous ownership, or any preexisting/foreign process. Wait boundedly for every ever-observed owned identity to exit, continue refreshing until no verified owned process remains, and verify `127.0.0.1:3000` has no listener. PID reuse, inability to enumerate or prove an identity, a newly observed ambiguous process, incomplete dynamic-tree shutdown, or residual listener fails T5 and must be escalated without broad kill commands. If a foreign/preexisting listener was used, leave it untouched and verify only that no T5-owned server process exists. Finally drain/cancel both redirected streams, unregister and remove both in-memory event handlers/jobs, then flush, close, and dispose the synchronized writer, underlying writer/file stream, and Process object; cleanup is not complete until these operations succeed.

The one external server log is lifecycle evidence only: it must contain no intentionally supplied secret, must not be copied into the repository, and must not be included verbatim in broad output. Apart from ignored `.next/**` and that one unique log, no persistent browser evidence/profile, repository `dev.log`, source/test/doc/env file, package file, other temp artifact, database, Auth state, data, or Git state may be written by this authorization.

Franco explicitly authorizes T5 to read `C:\Users\franc\AppData\Local\Temp\opencode\ossum-ezequiel-dev-credentials.txt` **only in-process** to log in as **Ezequiel DEV**. Credential contents must never be printed, read back, logged, hashed, copied, persisted, interpolated into command-line arguments, or placed in a repository/temp copy. Do not change/reset the password, invite a user, or perform any Auth admin operation. Use a fresh ephemeral in-memory browser profile/context only; prohibit persistent profiles, storage-state save/load, tracing, video, password-bearing screenshots, and cookie/localStorage/sessionStorage dumps. Close the context after QA and discard all cookies/storage.

After login, interactions are limited to read-only feature filters, refresh, and safe navigation. Do not click case actions or issue mutation methods. Identify the authentication request separately, then exclude only that request from feature no-write evidence; reset or mark the post-login audit boundary so every subsequent `POST`/`PUT`/`PATCH`/`DELETE` fails the gate. Any `AvailabilityRequest` call fails the gate regardless of method. Use only in-memory assertions and sanitized textual evidence in the external orchestration record; do not persist screenshots, snapshots, traces, videos, browser profiles/state, or any browser artifact.

At desktop and exactly `412x915`, verify and record sanitized assertions:

1. exactly the four approved labels/counts; legacy metrics/quick filters absent; all buttons operable with visible focus and correct `aria-pressed`/accessible names;
2. cumulative AND, stable counts under toggles/modal/chips, one row per surgery, explicit contradiction, normal filtered empty, true empty distinction, and global/individual clear boundaries;
3. compact **`Más filtros`** dialog with only approved fields; draft isolation; apply/cancel/Escape/clear; invalid-range announcement/focus; focus trap/restore; exact active count/chips/remove names;
4. inclusive date-only behavior under the test browser time zone, exact state behavior, authorized institution/client options, and missing-date exclusions;
5. no clipped labels, horizontal page overflow, unreachable dialog actions, or target under `44x44`; chips wrap and first representative result begins no later than the second viewport;
6. concise aggregate live announcements with no per-row announcement duplication;
7. initial loading/refresh/error/blocked/true-empty/filtered-empty precedence where safely reproducible without changing Auth or data; same-context refresh retains honest prior display;
8. post-login feature network audit: no POST/PUT/PATCH/DELETE, no request per case, no unrestricted/global contact fetch, and no `AvailabilityRequest` request; separately identify the authentication request and exclude only it from the feature no-write result; and
9. unchanged `Panel global`, preview-only graph, existing case actions, and permission boundary by static diff plus safe navigation only—do not invoke mutation actions.

### Exit and stop gates

`CIM-L5: reserved → review → released`. The gate passes only when all relevant tests, TypeScript, scoped zero-error lint, scoped tracked-plus-untracked whitespace inspection, build, final-diff/security review, desktop/mobile browser checks, and any T5-owned server cleanup pass. Global lint/diff-check findings wholly outside scope are informational under the partition rule above. Stop and retain a failed/BLOCKED recommendation for missing browser prerequisites; unsafe/preexisting target; unexpected bind, command, environment, or process ownership; incomplete owned-tree/listener cleanup; any credential leakage/persistence path; overflow/a11y/state defect; relevant command failure; in-scope lint/whitespace defect; unexpected post-login request/write; any `AvailabilityRequest`; tenant/subject leak; forbidden diff; changed server anchor; or schema/migration/Auth/permission/dependency need. QA does not fix source.

**SPEC/scenarios:** complete verification of BOUND-01–06, BASE-01–03, RPATH-01–05, METRIC-01–06, INT-01–09, ADV-01–09, MODAL-01–09, STATE-01–06, RESP-01–03, A11Y-01–05, SCALE-01–04; M-1–M-8, I-1–I-5, A-1–A-9, S-1–S-7.

---

## 8. Requirement and scenario traceability

| SPEC requirements / scenarios | Implemented or gated by | Primary evidence |
| --- | --- | --- |
| BOUND-01–06 | T0, T3, T4, T5 | personal-only graph, no-command tests, final forbidden-diff audit |
| BASE-01–03 | T0, T2, T3, T5 | accepted-base normalization, active helper reuse, dedupe/state tests |
| RPATH-01–05 | T0, T1, T4, T5 | service→DTO→response→adapter→basis tests; unchanged server anchors |
| METRIC-01–06 | T2, T3, T5 | pure predicate/clock-boundary/stable-count tests and rendered counts |
| INT-01–09 | T2, T3, T5 | conjunction, toggle, removal, contradiction, and empty-state tests/QA |
| ADV-01–09 | T2, T3, T5 | normalization/identity/date-range tests and modal QA |
| MODAL-01–09 | T2, T3, T5 | reducer/component tests and keyboard/mobile dialog QA |
| STATE-01–06 | T3, T4, T5 | controller/state tests, context invalidation, refresh/browser checks |
| RESP-01–03; A11Y-01–05 | T3, T5 | component assertions plus desktop/`412x915` browser gate |
| SCALE-01–04 | T2, T4, T5 | pure module, one-snapshot tests, network/import audit |
| M-1 | T3, T5 | exact labels and legacy-summary absence |
| M-2–M-4 | T2, T5 | exact metric predicate tests |
| M-5–M-6 | T1, T2, T4, T5 | timestamp parsing/association and 48-hour/no-fallback tests |
| M-7 | T0, T2, T5 | active personal-base exclusion tests |
| M-8 | T2, T3, T5 | stable counts through interaction/refresh |
| I-1–I-5 | T2, T3, T5 | AND, contradiction, clear boundaries, one-row tests/QA |
| A-1 | T3, T5 | approved modal fields only |
| A-2–A-3 | T2, T5 | inclusive date-only/missing availability tests |
| A-4–A-8 | T2, T3, T5 | validation, transaction, clear, count/chips tests/QA |
| A-9 | T0, T2, T4, T5 | authorized option construction and foreign-company regression |
| S-1–S-5 | T3, T5 | state/controller/a11y/responsive tests and browser QA |
| S-6 | T3, T4, T5 | no-write/no-request spies and browser network evidence |
| S-7 | T0, T1, T4, T5 | exact read-path association and no-persistence final audit |

No SPEC requirement or acceptance scenario is intentionally deferred. A scenario that cannot be verified within the exact allowlists is a stop condition, not permission to expand scope.

---

## 9. Readiness and escalation summary

The first future APPLY task is **T0**, but only after explicit separate authorization. The expected implementation is schema-free and migration-free. The permitted source delta is bounded to productive read hydration, pure personal-inbox derivation, and personal-inbox presentation/tests.

Return to Franco/SDD review without implementation continuation if any task finds:

- missing persistence/serialization or actual persisted rows without assignment `createdAt`;
- a need for schema, migration, seed, backfill, data repair, dependency, or new persistence;
- ownership that cannot survive missing/invalid timestamp quality;
- unavailable approved fields or an unrestricted/cross-company lookup requirement;
- inability to reuse active personal/company eligibility, exact AND, stable counts, one-row identity, or instant/date-only separation;
- Auth, permission, assignment-write, lifecycle, notification, availability-request, action, global/preview, Expediente, Cirugías, store-persistence, or business-rule changes; or
- dirty-path overlap, unknown provenance, changed reserved baseline, or any unlisted write.

This TASKS artifact authorizes no source edit, test edit, browser execution, database action, or APPLY by itself.
