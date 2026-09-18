# TASKS — CAJAS-UX-SDD-PROPOSAL-001

Status: **synchronized with Franco-approved DG-01–DG-07 and CD-01–CD-10 and the verified 154-requirement/70-scenario baseline; no presentation execution, production work, APPLY, or implementation is authorized**
Change: `CAJAS-UX-SDD-PROPOSAL-001`
Language: English
Sources: Franco-approved `PROPOSAL.md` (`6c4f5e238f0db1af2033b63772be3cfec4aa1fe2`); independently verified `SPEC.md` (`8480bb90fc0a85b8e4f950126bae170d2410103b`), `DESIGN.md` (`01f1dad68dc7316690c04e96cecb7cfeab5496f7`), and approved `DECISIONS-CD01-CD10.md` (`5fa640ebf8fee9bb01d138c52a0b483aab401e49`); approved DG decisions Engram #2816, #2817, #2824, #2826, #2827, #2828, #2836, and aggregate closure #2837; four independently accepted Cajas ADR directions listed in §4
Artifact chain: PROPOSAL → SPEC → DESIGN → **TASKS** → APPLY

---

## 1. Execution status and non-authorization notice

This document decomposes possible future work. Creating this plan does **not** authorize any task in it.

Two execution lanes are deliberately separated:

1. **Presentation-only lane (`Pxx`)** — an optional, separately approved prototype that may demonstrate the specified interactions with feature-owned in-memory illustrative data. It is never a production source of truth, writes no `localStorage`, does not replace the current `/cajas` implementation, and cannot be accepted as server-backed completion of the SPEC.
2. **Server-backed production lane (`Bxx`)** — required for a conforming product implementation, but entirely blocked. DG-01–DG-07 now provide approved product behavior; they do not select or authorize architecture, schema/data, technical capability mapping, security/access implementation, Stock transaction/accounting design, sensitive Surgery/Record source placement, exact files, Task Briefs, or APPLY.

No schema, migration, API, service, Auth, permission, multi-company, security, stock-accounting, or sensitive Surgery/Record work is approved or executable by this artifact. The blocked production packages are placeholders for coverage and sequencing only; each has an intentionally empty write set and must be replaced by an approved TASKS amendment with exact files before execution.

`TR01` is a temporary documentation-reconciliation activity authorized only to amend this `TASKS.md`. It is not a production package, does not join the permanent 22-ID inventory, and authorizes neither the optional presentation lane nor any implementation or APPLY activity. Its exclusive conceptual ownership of this file exists only for the amendment and must be released at handoff.

---

## 2. Global execution contract

### 2.1 One owner, one scope, one file set, one handoff

- One task has one owner, one declared lock, one exclusive file set, and one Caveman handoff.
- `Agent Role` and `Selected LLM` are explicit per-task selections, made for that task's risk and scope under the task-based model policy in `AGENTS.md`; they do not establish permanent role-to-model assignments.
- A writer may edit only its task's allowlist. “Related” files are not implicitly allowed.
- Existing dirty work is preserved. Before every future lock transition, recheck `git status`, a path-limited diff, file provenance, and active writers.
- Lock lifecycle is `planned` → `reserved` → `editing` → `review` → `released`.
- A task may move to `editing` only after its dependencies pass, its approval gate is evidenced, and no active lock overlaps.
- A failed task remains in `review`; it is not released as complete. Diagnose applies before any fix.

### 2.2 Global forbidden files unless a later Franco-approved production amendment explicitly names them

- `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.ts`, `src/lib/db.ts`.
- `src/lib/store.ts`, `src/types/index.ts`, `src/data/mock-boxes.ts`, and all existing mock/store persistence contracts.
- Auth, permission, security, multi-company, and provider files.
- `src/app/api/**`, `src/lib/services/**`, and `src/lib/validators/**`.
- `src/app/cirugias/page.tsx`, `src/components/cirugias/**`, `src/hooks/useCirugiaActions.ts`, `src/hooks/useCirugiasFilters.ts`, `src/hooks/useCirugiaSelection.ts`, and every sensitive Surgery/Record or Expediente path listed in `AGENTS.md`.
- Package manifests, lockfiles, build/test configuration, canonical Knowledge, and the verified `PROPOSAL.md`, `SPEC.md`, and `DESIGN.md`.

The presentation lane has no exception to this list. The production lane remains blocked until a later approved amendment creates explicit, minimal exceptions.

### 2.3 Global forbidden behavior

- No new dependency, database command, migration, generate, seed, destructive Git operation, commit, stash, reset, checkout, or mass formatting.
- No implementation of formula editing, capability mapping, permissions, Stock checkpoints, availability changes, or audit/transaction behavior without an approved exact-file replacement task and every applicable protected approval. No invented role taxonomy, automatic billing/commercial/accounting effect, incident workflow, legacy Districorr migration, mass import, or production example creation.
- No financial cash, treasury, till, collection, payment, or reconciliation capability.
- No mock, Zustand, browser storage, URL state, or presentation fixture may become the final source of truth.
- No task may infer cardinality beyond approved `MULTI-01`–`MULTI-10`: multiple identified Boxes per Surgery/Record, one active Surgery/Record per identified Box, multiple independent non-overlapping dispatches/remittances and partial returns within that operation, cumulative dispatch bounded by controlled/reserved composition, retained undispatched reservation and operation linkage while accounting/differences remain, reviewed redispatch as new evidence, and reuse only after operation end with current condition `Disponible`.

### 2.4 Shared stop and rollback conditions

Stop the active task, preserve its scoped diff, keep its lock in `review`, and escalate if:

1. an overlapping active writer or unclear provenance appears;
2. a file outside the allowlist is needed;
3. work would expand or reinterpret an approved DG-01–DG-07 rule, or would select a protected implementation choice in §4;
4. schema, migration, Auth, technical capability/permission mapping, multi-company, security, Stock transaction/accounting design, or sensitive Surgery/Record source placement is implicated without its own approved Task Brief;
5. a new dependency or config change is needed;
6. current behavior cannot be preserved with an additive vertical slice;
7. presentation data risks being mistaken for production truth;
8. a validation fails — run Diagnose before proposing a minimal owner-scoped fix; or
9. rollback would require touching unrelated dirty work. Roll back only files owned by the active task.

### 2.5 Global task handoff

Every task ends with:

```text
Done:
Changed:
Files:
Validations:
Risks:
Next:
```

---

## 3. Phase and dependency map

| Phase | Tasks | Status | Parallelism |
| --- | --- | --- | --- |
| 0 — Read-only preflight | `T00`, `T01` | **completed read-only; locks released**; evidence is historical and must be refreshed before any future writer | Executed sequentially: `T00` → `T01` |
| 1 — Decisions and production feasibility | `D01`, `D02` | **completed read-only; locks released**; D01 informed Franco's later DG closure and D02 found conditional feasibility without selecting architecture | Executed after `T01`; neither authorized implementation |
| 2 — Optional presentation-only vertical slices | `P01`–`P07` | **planned and non-reservable**; not approved or executed; optional separate lane; 154/70 coverage requires a future exact-file presentation amendment before approval | Provisional only; no lock may be reserved from this version |
| 3 — Independent presentation QA and handoff | `Q01`, `H01` | **planned / dependency-blocked**; not approved | Sequential: `Q01` → `H01` |
| 4 — Server-backed production | `B01`–`B09` | **BLOCKED; non-executable placeholders** | Order is provisional; exact parallelism requires an approved TASKS amendment |

The presentation lane does not unblock or substitute for the production lane. Production may proceed without presentation work once its own gates are approved.

---

## 4. Closed product decisions and protected implementation gates

DG-01–DG-07 are **CLOSED and approved by Franco** as product decisions. Closure means future work must conform to the behavior below; it does not mean that any behavior has been implemented or that a production package, protected file, or APPLY phase is approved.

| Decision | Approved product contract | Implementation choices still protected |
| --- | --- | --- |
| `DG-01` | Exact public labels: `Caja`, `Contenido esperado`, `Caja identificada`, `Control de preparación`, `Contenido despachado`, `Disponible`, `Con diferencias`; technical “snapshot” is not public copy. | Copy centralization and source placement. |
| `DG-02` | `Contenido esperado` is edited only in Articles/Stock through direct confirmed saves; every save creates a future-only version while open preparations and history retain their version. | Schema, persistence, technical validation/conflict mechanism, API, and exact editor files. |
| `DG-03` | Historical results remain immutable; differences close individually; `Recontrolar caja` becomes available only after all close; only a clean successful re-control changes current condition to `Disponible`. | Record model, transaction/concurrency design, API, audit storage, and exact UI files. |
| `DG-04` | `MULTI-01`–`MULTI-10` govern multiple Boxes, active-operation exclusivity, independent bounded dispatches, partial returns, retained linkage, redispatch as new evidence, and bounded reuse. | Relationship/schema representation, locking, remittance/return technical contracts, and sequencing mechanism. |
| `DG-05` | Current read access; Articles/Stock edit capability; operational preparation/control/re-control capability; existing dispatch/return permissions; no mandatory two-person rule; audit; visible disabled explanation plus server rejection. | Auth changes, role mapping, capability implementation, permission matrix, security design, and audit mechanism. |
| `DG-06` | Articles/Stock owns masters; a Surgery/Record section exactly labeled `Cajas` hosts operation actions; existing Remittance/Return flows are contextualized; `/cajas` remains search/summary; active-operation Stock history is read-only. | Exact route/component/files and every sensitive Surgery/Record refactor. |
| `DG-07` | `STOCK-01`–`STOCK-10` define reservation/release, evidence-only control, dispatch success/failure, return/consumption/review outcomes, explicit added/replacement movements, and atomic/audited/idempotent effects with no automatic billing/accounting. | Stock schema/ledger, transaction/idempotency mechanism, replenishment, provider, APIs, migration, and exact files. |

CD-01–CD-10 are also **CLOSED and approved by Franco** as conceptual product decisions. They add `RESERVATION-01`–`RESERVATION-07`, `DISPATCH-06`–`DISPATCH-08`, `MULTI-07`–`MULTI-10`, `RETURN-13`–`RETURN-19`, `ACCOUNTING-01`–`ACCOUNTING-05`, `FRESHNESS-01`–`FRESHNESS-03`, and `COMPANY-01`–`COMPANY-03`. CD-08 reuses `RESOLUTION-01`–`RESOLUTION-05` and scenarios `DG03-01`–`DG03-02`; it creates no `CD08-*` identifiers. CD-10 leaves the exact business owner and conceptual capability for difference resolution pending; no current role or technical capability mapping may be inferred.

The following ADRs are recorded as **ACCEPTED directions only**: `ADR-CAJAS-CORE-PERSISTENCE.md` Option A (`48258985953127836170550a000159e5641083b4`), `ADR-CAJAS-STOCK-TRANSACTIONS.md` Option A (`4e0bab03137a51d8dede83ee2e68b8c3d6001bef`), `ADR-CAJAS-AUTHORIZATION.md` Option A (`ca772cb8034a2e55be6e43855dd79a1e2ddfa651`), and `ADR-CAJAS-OPERATIONAL-INTEGRATIONS.md` Option A (`bee2397680d7ab1cf64fdf4b1edc85f2b63377b3`). Their acceptance supplies directional architecture input; it does not select exact models, fields, routes, payloads, source files, transaction boundaries, role/capability mappings, technical contracts, orchestrator ownership, migration steps, or commands, and it does not authorize schema, Auth, permissions, Cirugías/Expediente, implementation, production, or APPLY.

The remaining gates are the protected choices above plus exact Task Briefs and files, independent verification, and separate Franco approval for each protected scope and APPLY. A task must stop rather than reinterpret a DG/CD contract or select one of those choices implicitly.

---

## 5. Phase 0 — Read-only preflight

### Task `T00` — Recheck provenance, dirty worktree, and lock availability

- **Lifecycle status:** **COMPLETED / PASS / RELEASED** on 2026-07-18 (Engram #2782 and #2784). This historical PASS does not cover the subsequently amended SPEC/DESIGN/TASKS hashes; its preflight must be repeated under a future separately approved writer task.
- **Agent Role:** Implementation lead.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** Strong repository inspection; low-risk read-only.
- **Mode:** read-only / preflight.
- **Objective and scope:** Revalidate verified artifacts, current branch/worktree, target-path absence or provenance, current Cajas/Stock ownership, and active locks immediately before any future work.
- **Traceability:** SPEC §§15.3–16; DESIGN §§17–18; all requirements/scenarios as scope guard.
- **Dependencies:** Separate Franco approval to execute this read-only task.
- **Lock:** `CAJAS-UX/T00-PREFLIGHT`; Agent Role `Implementation lead`; Selected LLM `openai/gpt-5.6-sol`; flow `planned → reserved → review → released`; no `editing` state because there are no writes.
- **Owned/allowed files:** no writes; read `AGENTS.md`, this SDD directory, scoped Git status/diff, current Cajas/Stock code, and visible lock/worklog records only.
- **Forbidden files:** all files for modification.
- **Allowed commands:** `git status --short`, path-limited `git diff`, `git diff --name-only`, `git branch --show-current`, `git rev-parse HEAD`, and `git hash-object` limited to `PROPOSAL.md`, `SPEC.md`, `DESIGN.md`, `DECISIONS-CD01-CD10.md`, `TASKS.md`, and the four accepted Cajas ADRs; read/search/glob.
- **Forbidden commands:** build, tests, install, format, Prisma/DB, Git mutation, browser mutation.
- **Validation:** historical execution recorded artifact hashes/provenance, path-limited baseline status, and no visible overlapping writer. A future rerun must verify the approved 154/70 DG/CD baseline, accepted-direction-only ADR hashes, and all protected implementation gates in §4 rather than treating DG-01–DG-07 or CD-01–CD-10 as open or technically authorizing.
- **Output/handoff:** Caveman preflight report with exact dirty paths relevant to future locks.
- **Stop/escalate:** target path changed unexpectedly, artifact verification no longer applies, active writer exists, or provenance is unclear.

### Task `T01` — Reconcile planned boundaries with current repository contracts

- **Lifecycle status:** **COMPLETED / PASS / RELEASED** on 2026-07-18 (Engram #2788). It confirmed that isolated presentation boundaries were viable, production required amendment/approvals, and the existing lifecycle-like Box mock/store could not be product truth.
- **Agent Role:** Repo/contracts analyst.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** Strong code and contract reasoning.
- **Mode:** read-only / discovery.
- **Objective and scope:** Confirm whether the file boundaries below remain realistic without choosing persistence, endpoint, permission, stock, or Surgery-host architecture. Identify existing contracts that must not be reused as product truth, especially the lifecycle-like `Box` mock/store shape.
- **Traceability:** `SCOPE-01`–`SCOPE-05`, `VOCAB-01`–`VOCAB-04`; scenarios `BOX-01`, `DETAIL-01`–`DETAIL-04`; DESIGN §§2–4, 14, 17.
- **Dependencies:** `T00` passed and lock released.
- **Lock:** `CAJAS-UX/T01-CONTRACT-AUDIT`; Agent Role `Repo/contracts analyst`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → review → released`; no writes.
- **Owned/allowed files:** no writes; read current `/cajas`, Stock/Articles surfaces, shared UI conventions, existing tests, package scripts, and narrowly relevant server contracts only.
- **Forbidden files:** all modifications; broad repository exploration unrelated to Cajas/Articles/Stock/Surgery evidence.
- **Allowed commands:** read/search/glob and path-limited Git inspection.
- **Forbidden commands:** build, tests, install, format, DB/Prisma, Git mutation.
- **Validation:** produce a boundary table: reusable presentation convention, legacy/prototype-only contract, sensitive dependency, and unresolved approval need.
- **Output/handoff:** Caveman report; recommendation is limited to “boundary still viable / amendment needed,” never a product or architecture decision.
- **Stop/escalate:** correct boundaries require modifying a sensitive contract, expanding an approved DG rule, or selecting a protected implementation choice.

---

## 6. Phase 1 — Approval-gated decision and architecture discovery

### Task `D01` — Prepare the seven-decision review packet without resolving it

- **Lifecycle status:** **COMPLETED / RELEASED** on 2026-07-18 (Engram #2798). The neutral packet supported Franco's later approvals in Engram #2816, #2817, #2824, #2826, #2827, #2828, #2836, and aggregate closure #2837; D01 itself did not make or implement those decisions.
- **Agent Role:** Product/domain analyst.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** High-reasoning product decision support.
- **Mode:** read-only / decision preparation.
- **Objective and scope:** Gather representative cases, alternatives, consequences, and questions for `DG-01`–`DG-07`. Do not recommend a default that silently becomes a rule and do not edit SDD artifacts.
- **Traceability:** historical decision packet now maps to SPEC §17.1, DESIGN §§15.1 and 17.1–17.2, and every approved-decision family summarized in §4.
- **Dependencies:** `T01` released.
- **Lock:** `CAJAS-UX/D01-DEFERRED-DECISIONS`; Agent Role `Product/domain analyst`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → review → released`; no repository writes.
- **Owned/allowed files:** no writes; read verified SDD artifacts and narrowly relevant product evidence approved by Franco.
- **Forbidden files:** all modifications, especially schema, Auth, permissions, stock, Cirugías/Expediente, and canonical Knowledge.
- **Allowed commands:** read-only inspection only.
- **Forbidden commands:** all write, build, test, install, DB, and Git mutation commands.
- **Validation:** execution produced seven separate neutral decision records labeled open at that time, with Franco as approver and downstream production blocked. Their later status is the approved/closed baseline in §4, not implementation completion.
- **Output/handoff:** Caveman review packet in the task handoff mechanism selected by the orchestrator.
- **Stop/escalate:** evidence is insufficient, representative cases conflict, or a decision would be inferred.

### Task `D02` — Produce a production feasibility and approval-boundary assessment

- **Lifecycle status:** **COMPLETED / RELEASED** on 2026-07-18 (Engram #2800 and #2803). Result: production is conditionally feasible, but no architecture was selected and no production package was unblocked.
- **Agent Role:** Backend/data/security architect.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** Highest-risk architecture and approval-boundary review.
- **Mode:** read-only / architecture discovery.
- **Objective and scope:** Assess required server truth, immutable evidence, concurrency/stale protection, auditability, company scope, existing-access behavior, remittance integration, and stock boundaries. Present alternatives; do not select schema/API/provider/permission architecture.
- **Traceability:** `VOCAB-03`–`VOCAB-04`, `PREP-10`, `CONTROL-01`–`CONTROL-06`, `CHANGE-01`–`CHANGE-06`, `DISPATCH-01`–`DISPATCH-08`, `RETURN-10`–`RETURN-19`, `STATE-03`–`STATE-07`, `FORMULA-02`–`FORMULA-05`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-01`–`MULTI-10`, `RESERVATION-01`–`RESERVATION-07`, `ACCOUNTING-01`–`ACCOUNTING-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-05`–`CAPABILITY-06`, `HOST-01`–`HOST-05`, `STOCK-01`–`STOCK-10`; all applicable baseline, `DG01-01`–`DG07-04`, `CD01-01`–`CD07-02`, `CD09-01`–`CD10-02`, and reused `DG03-01`–`DG03-02` scenarios; DESIGN §§3.3, 7.4, 8–12, 15, 17.
- **Dependencies:** `T01` released; may run in parallel with `D01`.
- **Lock:** `CAJAS-UX/D02-PRODUCTION-FEASIBILITY`; Agent Role `Backend/data/security architect`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → review → released`; no writes.
- **Owned/allowed files:** no writes; narrowly read relevant schema, API/service/validator conventions, remittance/consumption/return evidence, Auth context, and tests.
- **Forbidden files:** all modifications and all database/provider operations.
- **Allowed commands:** read/search/glob, path-limited Git inspection.
- **Forbidden commands:** tests, build, install, format, Prisma/DB/generate/migrate/seed, Git mutation.
- **Validation:** assessment identified server-truth and immutable-evidence gaps; soft `boxId`/`itemId` references; absent Article/Stock/Box server models; incomplete control/remittance evidence; and inconsistent role contracts. It explicitly requires separate approvals for architecture, schema/migration, Auth/capability mapping/permissions/security, multi-company, Stock transaction/accounting design, Remittance/Return contracts, sensitive Surgery placement, and dependencies.
- **Output/handoff:** Caveman assessment with alternatives, risks, and a list of Task Briefs/ADRs/spec amendments required before `B01`–`B09` can be rewritten as executable tasks.
- **Stop/escalate:** any production contract can only be assessed by modifying or running sensitive systems.

### Phase 1 gate

DG-01–DG-07 were later closed by Franco, independently of D01/D02 execution. No production task proceeds until Franco has also approved the necessary architecture path, ADRs, exact Task Briefs/files, protected technical boundaries, verified TASKS replacement, and APPLY. Completion of D01/D02 and closure of DG-01–DG-07 do **not** approve implementation.

---

## 7. Phase 2 — Optional presentation-only lane

This lane requires its own explicit approval. It demonstrates interaction and accessibility only. Its data is illustrative, in-memory, feature-owned, and visibly labeled as presentation data. It must not import `useOrtoTrackStore`, write browser storage, call production APIs, mutate Stock, or mount inside sensitive Surgery/Record files.

`P01`–`P07` retain their original candidate file boundaries and lifecycle status **planned / non-reservable** for planning continuity, but **none may reserve a lock from this synchronized artifact**. Before optional execution, a separate exact-file amendment must prove full 154/70 coverage of the approved DG-01–DG-07 and CD-01–CD-10 behaviors—especially versioned formula editing, reservation commitment/release, difference closure/re-control, bounded multiple dispatches/partial returns/reuse, ownership-neutral shared Consumption/Return accounting, freshness/company denial, capability-denied states, approved host ownership, and conceptual Stock checkpoints—without creating server effects or sensitive-host writes. Independent verification and separate Franco approval for presentation execution are required for that amendment.

### Task `P01` — Define presentation-only vocabulary, types, and deterministic view model

- **Agent Role:** Frontend domain-model implementer.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** React/TypeScript pure presentation-model implementation.
- **Mode:** implementation, presentation-only.
- **Objective and scope:** Add feature-local types, exact approved concept labels, illustrative non-concept helper copy, pure comparison/result derivations, and deterministic fixture builders. No persistence or production contract.
- **Traceability:** `SCOPE-01`–`SCOPE-05`, `VOCAB-01`–`VOCAB-04`, `LIST-03`–`LIST-07`, `DETAIL-02`–`DETAIL-09`, `PREP-03`–`PREP-08`, `RETURN-01`–`RETURN-19`, `FORMULA-01`–`FORMULA-05`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-01`–`MULTI-10`, `RESERVATION-01`–`RESERVATION-07`, `ACCOUNTING-01`–`ACCOUNTING-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`; applicable DG/CD scenarios, with CD-08 reusing `DG03-01`–`DG03-02`; DESIGN §§3, 6.2, 7.2–7.4, 8–9, 11.1–11.4, 12.
- **Dependencies:** `T01` historical PASS; future exact-file presentation amendment independently verified; explicit presentation-lane approval. Approved concept labels are exact; only helper/example copy remains illustrative.
- **Lock:** `CAJAS-UX/P01-PRESENTATION-MODEL`; Agent Role `Frontend domain-model implementer`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → editing → review → released`.
- **Owned/allowed files:** create only `src/features/boxes/presentation/boxes-copy.ts`, `boxes-presentation.types.ts`, `boxes-presentation-model.ts`, and `src/__tests__/unit/boxes-presentation-model.test.ts`.
- **Forbidden files:** every other file; global types/store/mock data; APIs/services/validators/schema.
- **Allowed commands:** focused Vitest for the owned test, typecheck, scoped `git diff --check`, path-limited status/diff.
- **Forbidden commands:** full build, install, format-all, DB/Prisma, Git mutation.
- **Validation:** pure-model tests cover unit-derived counts, neutral no-result handling, formula/traceability separation, difference kinds, return outcome preview, and no automatic effect; static check confirms no store/API/browser-storage import.
- **Output/handoff:** Caveman with explicit “presentation-only, non-production” warning.
- **Stop/rollback:** stop if feature-local modeling would expand approved cardinality, capability, Stock, or formula-version rules, or choose their technical implementation; roll back only the four owned additions.

### Task `P02` — Build shared context, evidence, state, and accessibility primitives

- **Agent Role:** Frontend design-systems/accessibility implementer.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** Accessible reusable UI implementation.
- **Mode:** implementation, presentation-only.
- **Objective and scope:** Create reusable context labels, immutable-looking snapshot reader, operational state frame, and concise accessible feedback primitives without data fetching or business mutations.
- **Traceability:** `VOCAB-01`–`VOCAB-04`, `CONTROL-05`–`CONTROL-06`, `DISPATCH-04`, `RETURN-11`, `STATE-01`–`STATE-07`, `ACCESS-02`–`ACCESS-09`; scenarios `STATE-01`–`STATE-04`, `ACCESS-02`–`ACCESS-04`; DESIGN §§3, 12–14 (`BoxesContextHeader`, `SnapshotReader`, `OperationalStateFrame`, `AccessibleActionFeedback`).
- **Dependencies:** `P01` released.
- **Lock:** `CAJAS-UX/P02-SHARED-UI`; Agent Role `Frontend design-systems/accessibility implementer`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → editing → review → released`.
- **Owned/allowed files:** create only `src/components/boxes/BoxesContextHeader.tsx`, `SnapshotReader.tsx`, `OperationalStateFrame.tsx`, `AccessibleActionFeedback.tsx`, and matching new tests `src/__tests__/components/boxes-shared-primitives.test.tsx`.
- **Forbidden files:** every other file.
- **Allowed commands:** focused test, typecheck, scoped diff check/status.
- **Forbidden commands:** build, install, format-all, DB/Prisma, Git mutation.
- **Validation:** semantic labels, non-color meaning, accessible names/live summaries, denied/error/empty/refreshing/stale distinctions, no editable snapshot controls.
- **Output/handoff:** Caveman.
- **Stop/rollback:** stop if a primitive needs Auth roles, transport semantics, or persistence; roll back owned additions only.

### Task `P03` — Implement the B0 Boxes discovery slice

- **Agent Role:** Frontend discovery-surface implementer.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** React responsive discovery UI implementation.
- **Mode:** implementation, presentation-only.
- **Objective and scope:** Build the unmounted B0 index component: Articles/Stock context, SKU-grouped results, nested direct unit match, two scoped unit-result summaries, search/filter/clear, responsive cards/table, and all list states.
- **Traceability:** `SCOPE-01`–`SCOPE-02`, `LIST-01`–`LIST-08`, `STATE-01`–`STATE-05`, `ACCESS-01`–`ACCESS-09`; scenarios `BOX-01`–`BOX-05`, `STATE-01`–`STATE-02`, `STATE-04`, `ACCESS-01`–`ACCESS-04`; DESIGN §§4.1, 6, 12–14.
- **Dependencies:** `P02` released.
- **Lock:** `CAJAS-UX/P03-B0`; Agent Role `Frontend discovery-surface implementer`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → editing → review → released`.
- **Owned/allowed files:** create only `src/components/boxes/BoxesOperationalIndex.tsx`, `BoxDiscoveryControls.tsx`, `BoxSkuResultGroup.tsx`, `UnitResultSummary.tsx`, and `src/__tests__/components/BoxesOperationalIndex.test.tsx`.
- **Forbidden files:** current `src/app/cajas/page.tsx`, all data/store/server/sensitive files, and every non-owned component.
- **Allowed commands:** focused component test, typecheck, scoped diff check/status.
- **Forbidden commands:** build, install, format-all, DB/Prisma, Git mutation.
- **Validation:** all five BOX scenarios; counts derive from units; no-result is not a third status; catalog-empty/no-match/error/denied/loading/refreshing differ; keyboard, labels, focus, and mobile structure.
- **Output/handoff:** Caveman.
- **Stop/rollback:** stop if replacing `/cajas` or obtaining real data is required; roll back only owned additions.

### Task `P04` — Implement B1/B2 master, versioned-formula, and physical-unit detail slices

- **Agent Role:** Frontend detail-surface implementer.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** React responsive detail and evidence-reader UI implementation.
- **Mode:** implementation, presentation-only.
- **Objective and scope:** Build unmounted Box SKU detail, version-aware `Contenido esperado` reading and direct-confirmation presentation in Articles/Stock context, physical-unit collection/detail, Articles/Stock referral, and chronological evidence reader. The editor is presentation-only and creates no durable version.
- **Traceability:** `SCOPE-03`–`SCOPE-05`, `DETAIL-01`–`DETAIL-09`, `FORMULA-01`–`FORMULA-05`, `MULTI-04`–`MULTI-10`, `FRESHNESS-02`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-02`, `CAPABILITY-01`–`CAPABILITY-02`, `CAPABILITY-05`–`CAPABILITY-06`, `HOST-01`, `HOST-04`–`HOST-05`, `INCIDENT-02`–`INCIDENT-04`, `STATE-01`–`STATE-07`, `ACCESS-01`–`ACCESS-09`; applicable DETAIL, DG02, DG04–DG06, CD04, CD09–CD10, STATE, and ACCESS scenarios; DESIGN §§7–8, 12–14.
- **Dependencies:** `P02` released; may run in parallel with `P03` because file sets do not overlap.
- **Lock:** `CAJAS-UX/P04-B1-B2`; Agent Role `Frontend detail-surface implementer`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → editing → review → released`.
- **Owned/allowed files:** create only `src/components/boxes/BoxSkuDetail.tsx`, `ExpectedFormulaReader.tsx`, `PhysicalUnitCollection.tsx`, `PhysicalUnitDetail.tsx`, `OperationEvidenceTimeline.tsx`, and `src/__tests__/components/BoxDetails.test.tsx`.
- **Forbidden files:** every other file; no durable formula save, server contract, or Box-local unit-creation form.
- **Allowed commands:** focused test, typecheck, scoped diff check/status.
- **Forbidden commands:** build, install, format-all, DB/Prisma, Git mutation.
- **Validation:** all DETAIL scenarios; DG-02 future-only version/cancel/failure presentation; formula never exposes physical traceability; SKU/code remain paired; evidence is chronological/read-only; notes claim no resolution; capability denial, responsive, and accessibility states.
- **Output/handoff:** Caveman.
- **Stop/rollback:** stop if operation cardinality, formula editing, or Stock creation behavior must be decided; roll back owned additions only.

### Task `P05` — Implement O1/O2 preparation, control, and re-control presentation

- **Agent Role:** Senior frontend preparation-workflow implementer.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** High-reasoning React checkpoint-state presentation implementation.
- **Mode:** implementation, presentation-only.
- **Objective and scope:** Build unmounted operation-context presentation components for selecting multiple eligible physical units, expected-versus-actual comparison, explicit acknowledgement, complete control review, immutable controlled evidence, post-control history, individual difference closure, and explicit `Recontrolar caja`. State is injected by props and callbacks; no persistence, reservation, or sensitive host integration.
- **Traceability:** `PREP-01`–`PREP-10`, `CONTROL-01`–`CONTROL-06`, `CHANGE-01`–`CHANGE-06`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-01`–`MULTI-02`, `RESERVATION-01`–`RESERVATION-07`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-01`–`CAPABILITY-06`, `HOST-02`, `HOST-05`, `STOCK-01`–`STOCK-02`, `STATE-01`–`STATE-07`, `ACCESS-01`–`ACCESS-09`; applicable PREP, CHANGE, DG03–DG07, CD01–CD02, CD08–CD10, STATE, and ACCESS scenarios; DESIGN §§9, 12–14.
- **Dependencies:** `P03` and `P04` both completed, reviewed, and released. `P05` must not reserve or edit before both locks are released, even though it does not import their source.
- **Lock:** `CAJAS-UX/P05-O1-O2`; Agent Role `Senior frontend preparation-workflow implementer`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → editing → review → released`.
- **Owned/allowed files:** create only `src/components/boxes/operation/OperationContextHeader.tsx`, `PhysicalUnitSelector.tsx`, `CompositionComparator.tsx`, `DifferenceAcknowledgement.tsx`, `CheckpointReview.tsx`, `ChangeHistoryComparison.tsx`, `RecontrolGate.tsx`, and `src/__tests__/components/BoxPreparationControl.test.tsx`.
- **Forbidden files:** every other file, including all Cirugías/Expediente/remittance files and server contracts.
- **Allowed commands:** focused test, typecheck, scoped diff check/status.
- **Forbidden commands:** build, install, format-all, DB/Prisma, Git mutation.
- **Validation:** all PREP/CHANGE scenarios; multiple-box/exclusivity presentation; matching/difference paths; failed confirmation; draft-vs-snapshot honesty; individual closure and explicit clean re-control; immutable prior evidence; denied/stale UI blocks; conceptual evidence-only control; desktop and `412x915`; keyboard/touch/announcements.
- **Output/handoff:** Caveman with explicit note that callbacks simulate outcomes and prove no durable evidence.
- **Stop/rollback:** stop if a real confirmation, user identity, permission, or host placement is needed; roll back owned additions only.

### Task `P06` — Implement O3/O4 dispatch and exception-return presentation

- **Agent Role:** Senior frontend dispatch/return-workflow implementer.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** High-reasoning React dispatch/return presentation implementation.
- **Mode:** implementation, presentation-only.
- **Objective and scope:** Build unmounted dispatch gate/review and return-by-exception components, including separate dispatch evidence, partial-return accounting, exception drafts, one optional note with non-categorical attention indication, predicted result, success/failure presentation, reuse blocking, and conceptual approved Stock checkpoint summaries with no real downstream effect.
- **Traceability:** `DISPATCH-01`–`DISPATCH-08`, `RETURN-01`–`RETURN-19`, `INCIDENT-01`, `INCIDENT-03`–`INCIDENT-04`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-03`–`MULTI-10`, `ACCOUNTING-01`–`ACCOUNTING-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-01`–`CAPABILITY-06`, `HOST-02`–`HOST-05`, `STOCK-03`–`STOCK-10`, `STATE-01`–`STATE-07`, `ACCESS-01`–`ACCESS-09`; applicable DISPATCH, RETURN, DG03–DG07, CD03–CD10 (CD-08 via `DG03-01`–`DG03-02`), STATE, and ACCESS scenarios; DESIGN §§10–14.
- **Dependencies:** `P05` released because dispatch consumes the controlled-presentation contract; shared files remain untouched.
- **Lock:** `CAJAS-UX/P06-O3-O4`; Agent Role `Senior frontend dispatch/return-workflow implementer`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → editing → review → released`.
- **Owned/allowed files:** create only `src/components/boxes/operation/DispatchHandoffReview.tsx`, `ReturnExceptionEditor.tsx`, `SimpleIncidentNote.tsx`, `ReturnReviewAndResult.tsx`, and `src/__tests__/components/BoxDispatchReturn.test.tsx`.
- **Forbidden files:** every other file, especially remittance/consumption/devolución server or Expediente files.
- **Allowed commands:** focused test, typecheck, scoped diff check/status.
- **Forbidden commands:** build, install, format-all, DB/Prisma, Git mutation.
- **Validation:** every dispatch/return scenario; separate dispatches and partial returns; no repeated unchanged entry; both sides of replacement; traceability retention; outcome preview; failure preservation; no false snapshot; exact conceptual Stock checkpoint/no-effect summaries; no real Stock, billing, accounting, or automatic-resolution action; reuse gate; capability states; accessibility/responsiveness.
- **Output/handoff:** Caveman.
- **Stop/rollback:** stop if actual remittance issuance, stock selection, persistence, or `With differences` resolution is required; roll back owned additions only.

### Task `P07` — Integrate an isolated presentation harness and vertical-slice tests

- **Agent Role:** Frontend presentation-integration implementer.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** React/Next.js isolated presentation integration.
- **Mode:** implementation, presentation-only.
- **Objective and scope:** Mount the completed components only in a clearly labeled non-production presentation route with deterministic in-memory fixtures. Provide navigation among B0/B1/B2/O1–O4 demonstrations without changing `/cajas` or any operation host.
- **Traceability:** all 154 requirements and all 70 scenarios as presentation evidence only; DESIGN §§4–18.
- **Dependencies:** `P03`, `P04`, `P05`, and `P06` released; explicit approval for a presentation route.
- **Lock:** `CAJAS-UX/P07-HARNESS`; Agent Role `Frontend presentation-integration implementer`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → editing → review → released`.
- **Owned/allowed files:** create only `src/app/cajas/presentacion/page.tsx`, `src/features/boxes/presentation/boxes-presentation-fixtures.ts`, and `src/__tests__/integration/boxes-presentation-flow.test.tsx`.
- **Forbidden files:** current `/cajas` page, layouts/navigation, stores, browser storage, APIs, sensitive hosts, and every existing source file.
- **Allowed commands:** focused integration test, typecheck, scoped diff check/status; browser execution is reserved for `Q01`.
- **Forbidden commands:** build, install, format-all, DB/Prisma, Git mutation.
- **Validation:** route visibly states “illustrative/presentation-only”; no network or storage write; each screen is reachable; failures/stale/success are deterministic simulated states; source scan confirms no production API/store/localStorage import.
- **Output/handoff:** Caveman.
- **Stop/rollback:** stop if the route can be mistaken for production, needs navigation changes, or requires a sensitive host; remove only the three owned additions on rollback.

---

## 8. Phase 3 — Independent presentation validation and handoff

### Task `Q01` — Independent technical, browser, accessibility, and scope review

- **Lifecycle status:** **PLANNED / DEPENDENCY-BLOCKED**; no lock may be reserved until an independently verified and separately approved presentation amendment is implemented and `P07` is released.
- **Agent Role:** Independent QA/reviewer, with a different owner from `P01`–`P07`.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** Independent technical, browser, accessibility, and scope verification.
- **Mode:** QA / review / read-only.
- **Objective and scope:** Independently verify the presentation lane against every requirement/scenario while preserving the explicit limitation that it is not server-backed completion.
- **Traceability:** all SPEC requirements/scenarios; DESIGN §18.
- **Dependencies:** `P07` released.
- **Lock:** `CAJAS-UX/Q01-PRESENTATION-QA`; Agent Role `Independent QA/reviewer`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → review → released`; no writes.
- **Owned/allowed files:** no writes; read only SDD artifacts and `P01`–`P07` allowlisted files.
- **Forbidden files:** all modifications; QA does not fix failures.
- **Allowed commands:** focused tests, typecheck, lint, build, scoped `git diff --check`, browser QA at desktop and `412x915`, accessibility inspection, path-limited Git review. Full test suite only after focused gates pass.
- **Forbidden commands:** install, format, DB/Prisma, Git mutation, production data/session mutation.
- **Validation:** run all focused tests; inspect full requirement/scenario matrix; keyboard-only and touch-sized controls; focus, names, announcements, non-color meaning, long identifiers, page scrolling; confirm no network/storage write and no forbidden-file diff.
- **Output/handoff:** Caveman PASS/FAIL evidence. Failures return to the owning task under Diagnose; `Q01` makes no edits.
- **Stop/escalate:** any scope leak, false production implication, inaccessible checkpoint, or requirement without evidence.

### Task `H01` — Release locks and produce the presentation handoff

- **Lifecycle status:** **PLANNED / DEPENDENCY-BLOCKED**; no lock may be reserved until `Q01` passes under a separately approved presentation lane.
- **Agent Role:** Docs/handoff owner.
- **Selected LLM:** `openai/gpt-5.6-sol`.
- **Task class:** Low-risk technical documentation and operational handoff.
- **Mode:** docs / operational.
- **Objective and scope:** Release presentation locks and record what was demonstrated, what remains blocked, and why it is not production completion.
- **Traceability:** SPEC §§15–16; DESIGN §§17–19.
- **Dependencies:** `Q01` passed.
- **Lock:** `CAJAS-UX/H01-HANDOFF`; Agent Role `Docs/handoff owner`; Selected LLM `openai/gpt-5.6-sol`; `planned → reserved → editing → review → released`.
- **Owned/allowed files:** create only `knowledge/worklog/HANDOFF_CAJAS_UX_PRESENTATION_<approved-date>.md`; Engram summary is operational memory, not a repository file.
- **Forbidden files:** all other repository files, especially SDD sources and canonical Knowledge.
- **Allowed commands:** path-limited status/diff and scoped `git diff --check` only.
- **Forbidden commands:** build, tests, install, format, DB/Prisma, Git mutation.
- **Validation:** all `P*` locks released; handoff lists requirement/scenario evidence, DG-01–DG-07 as approved product inputs, protected implementation gates, production blockers, and exact presentation-only limitations.
- **Output/handoff:** Caveman plus mandatory Engram session summary.
- **Stop/escalate:** `Q01` is not PASS, a lock remains active, or the report would imply production readiness.

---

## 9. Phase 4 — Blocked server-backed production packages

The packages below are **not executable tasks**. They exist so no production responsibility or requirement is hidden. For each package:

- **Lock status:** `blocked` only; it may not transition to `reserved`.
- **Owned/allowed files:** **none**.
- **Forbidden files:** all repository files for modification.
- **Allowed commands:** none until an approved replacement task exists.
- **Forbidden commands:** all implementation/validation commands.
- **Required substitution fields:** every replacement task must declare separate explicit `Agent Role` and `Selected LLM` fields selected for that task under the task-based model policy. The replacement lock record/template must repeat both fields. A role or model class without an explicit selected LLM is insufficient.
- **Output/handoff:** an approved TASKS amendment must replace the package with explicit Agent Role, explicit Selected LLM, exact owner, task class, mode, file allowlist, commands, validations, rollback, and model-bearing lock flow before approval or execution.

### Package `B01` — Approved persistence and immutable-evidence foundation

- **Role / suggested model-task class:** Backend/data architect and DB implementer / highest-risk backend model.
- **Mode:** blocked architecture/schema implementation.
- **Objective/scope:** Establish approved server truth for compound SKU/formula versions/unit identity, active-operation assignment, selected composition, controlled/re-control records, change and difference-resolution history, per-dispatch evidence, partial-return/shared-disposition accounting, current condition, company scope, and return evidence without rewriting history. D02 found these server models and immutable domain records absent; `AuditEvent` alone is insufficient.
- **Traceability:** `SCOPE-01`, `SCOPE-03`, `VOCAB-02`–`VOCAB-04`, `CONTROL-01`–`CONTROL-06`, `CHANGE-01`–`CHANGE-06`, `DISPATCH-03`–`DISPATCH-08`, `RETURN-10`–`RETURN-19`, `INCIDENT-03`, `FORMULA-02`–`FORMULA-05`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-01`–`MULTI-10`, `RESERVATION-01`–`RESERVATION-07`, `ACCOUNTING-01`–`ACCOUNTING-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-05`, `STOCK-10`; applicable PREP, CHANGE, DISPATCH, RETURN, DG02–DG04, DG05-01, DG07-04, and CD scenarios; DESIGN §§3, 7–12, 15, 17.
- **Dependencies/gates:** DG-02–DG-05 and DG-07 are approved product inputs, not implementation authorization. Still required: approved architecture/ADR; exact schema/migration and audit/concurrency Task Briefs; company-scope design; rollback plan; independent amendment verification; Franco approval.
- **Validation required after amendment:** migration safety, company scope, audit/history immutability, no snapshot rewrite, rollback plan, focused service tests, Prisma format/generate only if explicitly authorized.
- **Stop/escalate:** any unapproved cardinality, stock effect, migration, provider, or historical rewrite.

### Package `B02` — Server-backed Box catalog, formula-version, and physical-unit contracts

- **Role / suggested model-task class:** Backend API/service implementer / high-risk server model.
- **Mode:** blocked backend implementation.
- **Objective/scope:** Provide company-scoped B0/B1/B2 reads and the authorized direct-confirmation contract for future-only `Contenido esperado` versions, including search, filters, unit-derived summaries, units, operation history, cancellation/failure, stale rejection, and no historical rewrite. D02 found no dedicated server Article/Stock/Box model or endpoint.
- **Traceability:** `LIST-01`–`LIST-08`, `DETAIL-01`–`DETAIL-09`, `FORMULA-01`–`FORMULA-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-01`–`CAPABILITY-02`, `CAPABILITY-05`–`CAPABILITY-06`, `HOST-01`, `HOST-04`–`HOST-05`, `INCIDENT-02`–`INCIDENT-04`, `STATE-01`–`STATE-07`; BOX, DETAIL, DG01, DG02, DG05, DG06, CD09, CD10, and applicable STATE scenarios; DESIGN §§6–8, 12, 15, 17.
- **Dependencies/gates:** `B01`; DG-01, DG-02, DG-04–DG-06 are approved product inputs. Still required: approved API/read-write/validator architecture, technical formula validation and conflict rules, access/capability mapping, company scope, audit design, exact files, verified amendment, and Franco approval.
- **Validation required after amendment:** company isolation, no financial scope, no invented third result, no formula traceability, error/denied/refresh semantics, focused route/service/validator tests.
- **Stop/escalate:** Box-only registry, role invention, source duplication, or local/mock fallback proposed as final.

### Package `B03` — Server-backed preparation, control, history, and stale protection

- **Role / suggested model-task class:** Backend domain/security implementer / highest-risk transactional model.
- **Mode:** blocked backend implementation.
- **Objective/scope:** Implement approved multi-box physical selection and reservation, exclusive active-operation assignment, difference acknowledgement/closure, complete control and explicit re-control, immutable history, dispatch eligibility, evidence-only control effects, audit, authorization rejection, and conflict-safe confirmation.
- **Traceability:** `PREP-01`–`PREP-10`, `CONTROL-01`–`CONTROL-06`, `CHANGE-01`–`CHANGE-06`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-01`–`MULTI-02`, `RESERVATION-01`–`RESERVATION-07`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-01`–`CAPABILITY-02`, `CAPABILITY-04`–`CAPABILITY-06`, `HOST-02`, `HOST-05`, `STOCK-01`–`STOCK-02`, `STOCK-05`, `STOCK-10`, `STATE-03`, `STATE-06`–`STATE-07`; applicable PREP, CHANGE, STATE-03, DG03–DG07, CD01–CD02, CD08–CD10 scenarios; DESIGN §§9, 12.2–12.4, 15, 17.
- **Dependencies/gates:** `B01`; DG-03–DG-07 are approved product inputs. Still required: approved operation/server and Stock transaction architecture; exact capability mapping; security/multi-company, Stock, audit/idempotency, and Surgery Task Briefs; exact files; independent amendment verification; Franco approval.
- **Validation required after amendment:** transactional tests, stale-write rejection, complete re-control, prior evidence retention, traceability ownership, company/surgery scope, audit evidence.
- **Stop/escalate:** silent merge, client-authoritative snapshot, permission inference, any Stock effect beyond the approved checkpoints or without protected technical approval, or sensitive host edit without lock/approval.

### Package `B04` — Remittance issuance and definitive dispatch integration

- **Role / suggested model-task class:** Remittance/backend integration implementer / highest-risk transactional model.
- **Mode:** blocked backend integration.
- **Objective/scope:** Gate each remittance issuance on the relevant latest successful control, freeze separate definitive dispatch evidence only after successful issuance, and atomically/idempotently apply `Despachado` / `En tránsito`; failure creates neither dispatch evidence nor movement and retains the reservation/control evidence. D02 found only partial remittance patterns and no approved Box evidence gate.
- **Traceability:** `CHANGE-04`–`CHANGE-06`, `DISPATCH-01`–`DISPATCH-08`, `MULTI-03`–`MULTI-04`, `MULTI-07`–`MULTI-10`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-03`, `CAPABILITY-05`–`CAPABILITY-06`, `HOST-02`–`HOST-03`, `STOCK-03`–`STOCK-04`, `STOCK-10`, `STATE-03`, `STATE-06`–`STATE-07`; applicable CHANGE, DISPATCH, STATE-03, DG04–DG07, CD03–CD04, CD09–CD10 scenarios; DESIGN §10, §§12.3–12.4, 15, 17.
- **Dependencies/gates:** `B03`; DG-04–DG-07 are approved product inputs. Still required: approved Remittance cardinality/transaction/idempotency contract, capability mapping, Stock design, separate Remittance/Surgery Task Briefs, exact files, independent amendment verification, and Franco approval.
- **Validation required after amendment:** no bypass, no snapshot on failed issuance, controlled evidence retained, stale protection, company/surgery scope, existing remittance regression tests.
- **Stop/escalate:** remittance rule/cardinality invention, sensitive overlap, or dispatch evidence created before successful issuance.

### Package `B05` — Server-backed Return evidence and ownership-neutral shared disposition accounting

- **Role / suggested model-task class:** Return/backend domain implementer / highest-risk transactional model.
- **Mode:** blocked backend implementation.
- **Objective/scope:** Confirm partial/final Returns against the relevant immutable dispatch, persist exceptions/note and linked evidence, calculate the two specified results, retain operation linkage, and conceptually coordinate Return and Consumption against one shared pending balance without double disposition. Return retains Return ownership and Consumption retains Consumption ownership. The orchestrator, technical contract, exact transaction boundary, storage, and algorithms remain unselected; this package does not assign them. D02 found the current return contract mutates Remittance data and does not supply this immutable model.
- **Traceability:** `RETURN-01`–`RETURN-19`, `INCIDENT-01`–`INCIDENT-04`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-03`–`MULTI-10`, `ACCOUNTING-01`–`ACCOUNTING-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-03`, `CAPABILITY-05`–`CAPABILITY-06`, `HOST-02`–`HOST-03`, `STOCK-06`–`STOCK-10`, `STATE-03`, `STATE-06`–`STATE-07`; RETURN, STATE-03, DG03–DG07, CD04–CD10 scenarios, with CD-08 reusing `DG03-01`–`DG03-02`; DESIGN §§8, 9.6, 11–12, 15, 17.
- **Dependencies/gates:** `B04`; DG-03–DG-07 and CD-01–CD-10 are approved product inputs. Still required: approved Return and Consumption technical contracts preserving separate ownership, selected orchestrator/transaction boundary, Stock transaction/ledger and idempotency design, capability mapping, exact Task Briefs/files, independent amendment verification, and Franco approval.
- **Validation required after amendment:** unchanged default, partial/final accounting, all exception types, replacement pairing, traceability, note attention rule, immutable history, difference closure/re-control gate, reuse blocking, failure/stale preservation, exact Stock checkpoint effects, and no automatic billing/commercial/accounting side effect.
- **Stop/escalate:** any Stock/availability effect beyond `STOCK-06`–`STOCK-10` or without protected technical approval, any automatic commercial/accounting effect, third result, incident workflow, or invented resolution path.

### Package `B06` — Production B0/B1/B2 frontend binding

- **Role / suggested model-task class:** Frontend integration implementer / React-Next.js production model.
- **Mode:** blocked frontend implementation.
- **Objective/scope:** Bind approved server reads to `/cajas` and approved detail routes, replacing legacy lifecycle presentation without reusing legacy mock/store truth.
- **Traceability:** `SCOPE-01`–`SCOPE-05`, `VOCAB-01`–`VOCAB-04`, `LIST-01`–`LIST-08`, `DETAIL-01`–`DETAIL-09`, `FORMULA-01`–`FORMULA-05`, `MULTI-04`–`MULTI-10`, `FRESHNESS-02`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-02`, `CAPABILITY-01`–`CAPABILITY-02`, `CAPABILITY-06`, `HOST-01`, `HOST-04`–`HOST-05`, `INCIDENT-02`–`INCIDENT-04`, `STATE-01`–`STATE-07`, `ACCESS-01`–`ACCESS-09`; BOX, DETAIL, DG01, DG02, DG04–DG06, CD04, CD09–CD10, STATE, and ACCESS scenarios; DESIGN §§4, 6–8, 12–15, 17.
- **Dependencies/gates:** `B02`; DG-01, DG-02, DG-04–DG-06 are approved product inputs. Still required: exact route/component allowlist, current `/cajas` provenance, technical capability binding, independently verified amendment, and Franco approval.
- **Validation required after amendment:** focused tests, typecheck, server-state integration, mobile/keyboard/a11y, no store/localStorage/mock final source, legacy rollback path.
- **Stop/escalate:** approved labels would be changed, route ownership is unclear, or the current page has an active writer.

### Package `B07` — Production O1/O2 operation-host frontend binding

- **Role / suggested model-task class:** Senior frontend workflow integrator / high-risk React integration model.
- **Mode:** blocked sensitive frontend implementation.
- **Objective/scope:** Mount preparation/control/re-control in the separately approved Surgery/Record host and bind it to `B03` without duplicating operation ownership.
- **Traceability:** `PREP-01`–`PREP-10`, `CONTROL-01`–`CONTROL-06`, `CHANGE-01`–`CHANGE-06`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-01`–`MULTI-02`, `RESERVATION-01`–`RESERVATION-07`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-01`–`CAPABILITY-06`, `HOST-02`, `HOST-05`, `STOCK-01`–`STOCK-02`, `STOCK-05`, `STATE-01`–`STATE-07`, `ACCESS-01`–`ACCESS-09`; PREP, CHANGE, DG03–DG07, CD01–CD02, CD08–CD10, STATE, and ACCESS scenarios; DESIGN §§9, 12–15, 17.
- **Dependencies/gates:** `B03`; DG-01 and DG-03–DG-07 are approved product inputs. Still required: explicit sensitive Surgery/Record Task Brief, exact files and host contract, technical capability binding, file locks, independent amendment verification, and Franco approval.
- **Validation required after amendment:** focused integration tests, stale/failure preservation, complete keyboard/mobile journey, no optimistic false checkpoint, existing Surgery/Record regression suite and browser QA.
- **Stop/escalate:** exact host unresolved, sensitive lock overlap, or UI would become source of critical truth.

### Package `B08` — Production O3/O4 remittance and return frontend binding

- **Role / suggested model-task class:** Senior frontend workflow integrator / high-risk React integration model.
- **Mode:** blocked sensitive frontend implementation.
- **Objective/scope:** Bind definitive dispatch review and exception return to approved remittance/return contracts in the approved host, preserving all failure/stale/access states.
- **Traceability:** `DISPATCH-01`–`DISPATCH-08`, `RETURN-01`–`RETURN-19`, `INCIDENT-01`–`INCIDENT-04`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-03`–`MULTI-10`, `ACCOUNTING-01`–`ACCOUNTING-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `CAPABILITY-01`–`CAPABILITY-06`, `HOST-02`–`HOST-05`, `STOCK-03`–`STOCK-10`, `STATE-01`–`STATE-07`, `ACCESS-01`–`ACCESS-09`; DISPATCH, RETURN, DG03–DG07, CD03–CD10 (CD-08 via `DG03-01`–`DG03-02`), STATE, and ACCESS scenarios; DESIGN §§10–15, 17.
- **Dependencies/gates:** `B04`, `B05`, `B07`; DG-01 and DG-03–DG-07 are approved product inputs. Still required: explicit Remittance/Return/Surgery host Task Briefs and exact files, technical capability/Stock bindings, locks, independent amendment verification, and Franco approval.
- **Validation required after amendment:** complete desktop/mobile/keyboard path, failed issuance/return, stale conflict, accessible announcements, no invented effect/resolution, existing remittance/return regression suite.
- **Stop/escalate:** host/cardinality/effect unresolved or sensitive file overlap.

### Package `B09` — Independent production verification and release

- **Role / suggested model-task class:** Independent QA/security/accessibility reviewer / highest-assurance testing model.
- **Mode:** blocked QA/review and docs handoff.
- **Objective/scope:** Verify all production slices, permissions under approved existing rules, company isolation, immutable evidence, stale protection, responsive/accessibility behavior, rollback, and scope exclusions.
- **Traceability:** all 154 requirements, all 70 scenarios, SPEC §§15–18, DESIGN §§15–19.
- **Dependencies/gates:** `B01`–`B08` released; all approved replacement tasks and migrations deployed only in the authorized environment.
- **Validation required after amendment:** focused and full tests, typecheck, lint, build, migration verification if approved, browser QA desktop/`412x915`, keyboard/touch/a11y, cross-company/security tests, path-limited scope review, no forbidden downstream effects.
- **Stop/escalate:** any boundary violation, cross-company disclosure/write, stale overwrite, snapshot mutation, accessibility blocker, forbidden scope, or unexplained regression. QA makes no fixes.

---

## 10. Requirement coverage matrix — all 154 requirements

“Candidate presentation owner” means observable, simulated evidence only and remains non-executable pending the exact-file amendment required by §7. “Blocked production owner” is a responsibility placeholder with an empty write set until `B01`–`B09` are replaced by independently verified, Franco-approved tasks.

| SPEC requirements | Count | Candidate presentation owner | Blocked production owner | DESIGN sections |
| --- | ---: | --- | --- | --- |
| `SCOPE-01`–`SCOPE-05` | 5 | `P01`, `P03`, `P04`, `P07` | `B01`, `B02`, `B06`, `B09` | §§1–4, 6–8, 17 |
| `VOCAB-01`–`VOCAB-04` | 4 | `P01`, `P02`, `P04`–`P06` | `B01`–`B08` | §§3, 7–11, 14–15 |
| `LIST-01`–`LIST-08` | 8 | `P03` | `B02`, `B06`, `B09` | §§4.1, 6, 12, 15 |
| `DETAIL-01`–`DETAIL-09` | 9 | `P04` | `B02`, `B06`, `B09` | §§7–8, 14–15 |
| `PREP-01`–`PREP-10` | 10 | `P01`, `P05` | `B01`, `B03`, `B07`, `B09` | §§9, 12, 14–15 |
| `CONTROL-01`–`CONTROL-06` | 6 | `P02`, `P05` | `B01`, `B03`, `B07`, `B09` | §§3.3, 9, 14–15 |
| `CHANGE-01`–`CHANGE-06` | 6 | `P05` | `B01`, `B03`, `B04`, `B07`, `B09` | §§9.5–9.7, 10.1, 14–15 |
| `DISPATCH-01`–`DISPATCH-05` | 5 | `P02`, `P06` | `B01`, `B04`, `B08`, `B09` | §§10, 14–15 |
| `RETURN-01`–`RETURN-12` | 12 | `P01`, `P06` | `B01`, `B05`, `B08`, `B09` | §§11, 14–15 |
| `INCIDENT-01`–`INCIDENT-04` | 4 | `P04`, `P06` | `B02`, `B05`, `B06`, `B08`, `B09` | §§8.2, 11.3–11.4, 14–15 |
| `STATE-01`–`STATE-07` | 7 | `P02`–`P07` | `B02`–`B09` | §§12, 14–15 |
| `ACCESS-01`–`ACCESS-09` | 9 | `P02`–`P07`, `Q01` | `B06`–`B09` | §§13–15 |
| `FORMULA-01`–`FORMULA-05` | 5 | `P01`, `P04`, `P07`, `Q01` | `B01`, `B02`, `B06`, `B09` | §§7.4, 14–15, 17 |
| `RESOLUTION-01`–`RESOLUTION-05` | 5 | `P01`, `P05`, `P06`, `P07`, `Q01` | `B01`, `B03`, `B05`, `B07`–`B09` | §§3.3, 9.5–9.7, 11.4, 12.2, 14–15, 17 |
| `MULTI-01`–`MULTI-10` | 10 | `P01`, `P04`–`P07`, `Q01` | `B01`, `B03`–`B09` | §§4–5, 8–12, 14–15, 17 |
| `CAPABILITY-01`–`CAPABILITY-06` | 6 | `P02`, `P04`–`P07`, `Q01` | `B02`–`B09` | §§6.3, 7.4, 9–12, 14–15, 17 |
| `HOST-01`–`HOST-05` | 5 | `P03`–`P07`, `Q01` | `B02`–`B09` | §§1, 4–5, 8–11, 14–15, 17 |
| `STOCK-01`–`STOCK-10` | 10 | `P05`–`P07`, `Q01` (conceptual/no-effect evidence only) | `B01`, `B03`–`B05`, `B07`–`B09` | §§9.1, 9.4, 10.3–10.4, 11.4–12.4, 14–15, 17 |
| `RESERVATION-01`–`RESERVATION-07` | 7 | `P01`, `P05`, `P07`, `Q01` (conceptual/no-effect evidence only) | `B01`, `B03`, `B07`, `B09` | §§9.1, 9.5, 12.4, 15.2, 17 |
| `DISPATCH-06`–`DISPATCH-08` | 3 | `P06`, `P07`, `Q01` (conceptual/no-effect evidence only) | `B01`, `B04`, `B08`, `B09` | §§10.1–10.4, 12.4, 15.2, 17 |
| `RETURN-13`–`RETURN-19` | 7 | `P01`, `P06`, `P07`, `Q01` (conceptual/no-effect evidence only) | `B01`, `B05`, `B08`, `B09` | §§8.2, 11.1–11.5, 12.4, 15.2, 17 |
| `ACCOUNTING-01`–`ACCOUNTING-05` | 5 | `P01`, `P06`, `P07`, `Q01` (ownership-neutral conceptual evidence only) | `B01`, `B05`, `B08`, `B09` | §§11.1–11.5, 12.2, 12.4, 15.2, 17 |
| `FRESHNESS-01`–`FRESHNESS-03` | 3 | `P01`, `P02`, `P04`–`P07`, `Q01` (simulated state evidence only) | `B01`–`B09` | §§12.1, 12.3, 15.2, 17 |
| `COMPANY-01`–`COMPANY-03` | 3 | `P01`, `P02`, `P04`–`P07`, `Q01` (simulated denial/audit copy only) | `B01`–`B09` | §§9.6, 12.1, 12.4, 15.2, 17 |
| **Total** | **154** |  |  |  |

No requirement is orphaned. No presentation task may claim server, authorization, persistence, transaction, audit, idempotency, Stock, or multi-company guarantees assigned to blocked production packages.

---

## 11. Scenario coverage matrix — all 70 scenarios

| SPEC scenarios | Count | Candidate presentation/validation owner | Blocked production owner | DESIGN sections |
| --- | ---: | --- | --- | --- |
| `BOX-01`–`BOX-05` | 5 | `P03`, `P07`, `Q01` | `B02`, `B06`, `B09` | §6 |
| `DETAIL-01`–`DETAIL-04` | 4 | `P04`, `P07`, `Q01` | `B02`, `B06`, `B09` | §§7–8 |
| `PREP-01`–`PREP-06` | 6 | `P05`, `P07`, `Q01` | `B01`, `B03`, `B07`, `B09` | §9 |
| `CHANGE-01`–`CHANGE-03` | 3 | `P05`, `P07`, `Q01` | `B01`, `B03`, `B04`, `B07`, `B09` | §§9.5–9.7 |
| `DISPATCH-01`–`DISPATCH-03` | 3 | `P06`, `P07`, `Q01` | `B01`, `B04`, `B08`, `B09` | §10 |
| `RETURN-01`–`RETURN-07` | 7 | `P06`, `P07`, `Q01` | `B01`, `B05`, `B08`, `B09` | §11 |
| `STATE-01`–`STATE-04` | 4 | `P02`–`P07`, `Q01` | `B02`–`B09` | §12 |
| `ACCESS-01`–`ACCESS-04` | 4 | `P02`–`P07`, `Q01` | `B06`–`B09` | §13 |
| `DG01-01` | 1 | `P01`–`P07`, `Q01` | `B02`, `B06`–`B09` | §§3–15 |
| `DG02-01`–`DG02-02` | 2 | `P01`, `P04`, `P07`, `Q01` | `B01`, `B02`, `B06`, `B09` | §§7.4, 14–15, 17 |
| `DG03-01`–`DG03-02` | 2 | `P01`, `P05`–`P07`, `Q01` | `B01`, `B03`, `B05`, `B07`–`B09` | §§9.5–9.7, 11.4, 12.2, 14–15, 17 |
| `DG04-01`–`DG04-02` | 2 | `P01`, `P04`–`P07`, `Q01` | `B01`, `B03`–`B09` | §§8–12, 14–15, 17 |
| `DG05-01`–`DG05-02` | 2 | `P02`, `P04`–`P07`, `Q01` | `B02`–`B09` | §§6.3, 7.4, 9–12, 14–15, 17 |
| `DG06-01`–`DG06-02` | 2 | `P03`–`P07`, `Q01` | `B02`–`B09` | §§1, 4–5, 8–11, 14–15, 17 |
| `DG07-01`–`DG07-04` | 4 | `P05`–`P07`, `Q01` (conceptual/no-effect evidence only) | `B01`, `B03`–`B05`, `B07`–`B09` | §§9.1, 9.4, 10.3–12.4, 14–15, 17 |
| `CD01-01`–`CD01-02` | 2 | `P05`, `P07`, `Q01` (conceptual/no-effect evidence only) | `B01`, `B03`, `B07`, `B09` | §§9.1, 12.4, 15.2, 17 |
| `CD02-01`–`CD02-02` | 2 | `P05`, `P07`, `Q01` (conceptual/no-effect evidence only) | `B01`, `B03`, `B07`, `B09` | §§9.5, 12.4, 15.2, 17 |
| `CD03-01`–`CD03-02` | 2 | `P06`, `P07`, `Q01` (conceptual/no-effect evidence only) | `B01`, `B04`, `B08`, `B09` | §§10.1–10.4, 12.4, 15.2, 17 |
| `CD04-01`–`CD04-02` | 2 | `P04`, `P06`, `P07`, `Q01` | `B01`, `B04`–`B06`, `B08`, `B09` | §§8.2, 10.2–11.1, 15.2, 17 |
| `CD05-01`–`CD05-02` | 2 | `P06`, `P07`, `Q01` | `B01`, `B05`, `B08`, `B09` | §§8.2, 11.1–11.5, 12.4, 15.2, 17 |
| `CD06-01`–`CD06-03` | 3 | `P06`, `P07`, `Q01` (ownership-neutral conceptual evidence only) | `B01`, `B05`, `B08`, `B09` | §§11.1–11.5, 12.2, 12.4, 15.2, 17 |
| `CD07-01`–`CD07-02` | 2 | `P06`, `P07`, `Q01` | `B01`, `B05`, `B08`, `B09` | §§11.2–11.4, 12.4, 15.2, 17 |
| CD-08 reuses `DG03-01`–`DG03-02` | 0 new | `P05`–`P07`, `Q01` | `B01`, `B03`, `B05`, `B07`–`B09` | §§9.6, 11.4, 15.2, 17 |
| `CD09-01`–`CD09-02` | 2 | `P02`, `P04`–`P07`, `Q01` (simulated state evidence only) | `B01`–`B09` | §§12.1, 12.3, 15.2, 17 |
| `CD10-01`–`CD10-02` | 2 | `P02`, `P04`–`P07`, `Q01` (simulated denial/audit copy only) | `B01`–`B09` | §§9.6, 12.1, 12.4, 15.2, 17 |
| **Total** | **70** |  |  |  |

No scenario is orphaned. Simulated success/failure/stale/Stock-checkpoint states in `Pxx` are design evidence, not proof of transactional or authorization behavior.

---

## 12. Lock register

| Lock | Owner task | Agent Role | Selected LLM | Exclusive file set | Current lifecycle status |
| --- | --- | --- | --- | --- | --- |
| `CAJAS-UX/T00-PREFLIGHT` | `T00` | Implementation lead | `openai/gpt-5.6-sol` | no writes | `released` after PASS; future writers require a fresh preflight |
| `CAJAS-UX/T01-CONTRACT-AUDIT` | `T01` | Repo/contracts analyst | `openai/gpt-5.6-sol` | no writes | `released` after PASS |
| `CAJAS-UX/D01-DEFERRED-DECISIONS` | `D01` | Product/domain analyst | `openai/gpt-5.6-sol` | no writes | `released`; later DG closure is recorded separately |
| `CAJAS-UX/D02-PRODUCTION-FEASIBILITY` | `D02` | Backend/data/security architect | `openai/gpt-5.6-sol` | no writes | `released`; conditional feasibility only |
| `CAJAS-UX/P01-PRESENTATION-MODEL` | `P01` | Frontend domain-model implementer | `openai/gpt-5.6-sol` | candidate feature-local presentation model + one unit test | `planned`; non-reservable pending exact-file amendment |
| `CAJAS-UX/P02-SHARED-UI` | `P02` | Frontend design-systems/accessibility implementer | `openai/gpt-5.6-sol` | candidate shared Boxes primitives + one component test | `planned`; non-reservable pending exact-file amendment |
| `CAJAS-UX/P03-B0` | `P03` | Frontend discovery-surface implementer | `openai/gpt-5.6-sol` | candidate B0 components + focused test | `planned`; non-reservable pending exact-file amendment |
| `CAJAS-UX/P04-B1-B2` | `P04` | Frontend detail-surface implementer | `openai/gpt-5.6-sol` | candidate B1/B2 components + focused test | `planned`; non-reservable pending exact-file amendment |
| `CAJAS-UX/P05-O1-O2` | `P05` | Senior frontend preparation-workflow implementer | `openai/gpt-5.6-sol` | candidate preparation/control components + focused test | `planned`; non-reservable pending exact-file amendment |
| `CAJAS-UX/P06-O3-O4` | `P06` | Senior frontend dispatch/return-workflow implementer | `openai/gpt-5.6-sol` | candidate dispatch/return components + focused test | `planned`; non-reservable pending exact-file amendment |
| `CAJAS-UX/P07-HARNESS` | `P07` | Frontend presentation-integration implementer | `openai/gpt-5.6-sol` | candidate isolated presentation route, fixtures, integration test | `planned`; non-reservable pending exact-file amendment |
| `CAJAS-UX/Q01-PRESENTATION-QA` | `Q01` | Independent QA/reviewer | `openai/gpt-5.6-sol` | no writes | `planned / dependency-blocked`; waits for an approved amended presentation lane |
| `CAJAS-UX/H01-HANDOFF` | `H01` | Docs/handoff owner | `openai/gpt-5.6-sol` | candidate one-file worklog handoff | `planned / dependency-blocked`; waits for `Q01` PASS |
| `CAJAS-UX/B01`–`B09` | blocked packages | required in each future substitution | required in each future substitution | empty write sets | `blocked` |

Temporary amendment record (not part of the 22-ID inventory): `TR01` revalidated baseline blob `657f230ce45825105bf92a0f756dff6e473b39e8`, held exclusive conceptual ownership of this `TASKS.md` only through `reserved → editing → review`, and is recorded `released` at this handoff. It created no implementation-path lock or authority.

If a future verified presentation amendment retains these boundaries, `P03` and `P04` are the only implementation tasks that may be proposed for parallel execution, and only under separate non-overlapping locks after `P02` is released. `P05` must wait for both. All later operation tasks remain serialized. No current `Pxx` lock may be reserved, and no blocked production package is parallelizable, until the applicable approved amendment says otherwise.

---

## 13. Exact phase gates

1. **Gate G0 — provenance:** historical `T00` PASS is recorded, but a fresh separately authorized preflight must verify current artifact hashes, dirty paths, and no active writer before any future write lock.
2. **Gate G1 — boundary viability:** `T01` PASS/released; legacy mock/store contracts are not selected as final truth. Recheck if relevant repository contracts change.
3. **Gate GP — optional presentation amendment and approval:** exact files and full 154/70 simulated coverage are independently verified, then Franco separately authorizes presentation execution. This TASKS reconciliation does not satisfy that gate. Without both, skip `P01`–`H01`.
4. **Gate GP-QA:** `Q01` PASS; otherwise return only the failure to the owning `Pxx` task under Diagnose.
5. **Gate GB-D:** **satisfied only as a product-decision input** by Franco's approval of DG-01–DG-07 and CD-01–CD-10; it does not satisfy any technical, presentation-execution, production, or APPLY gate.
6. **Gate GB-A:** the four accepted ADR directions are directional input only. Exact company/security/capability mapping, Stock transaction, persistence, integration, orchestration, technical-contract, and transaction boundaries remain unselected and require their own approved technical decisions/briefs without expanding DG/CD behavior.
7. **Gate GB-TB:** separate Task Briefs and Franco approvals for schema/migrations, Auth/permissions/security, multi-company, Stock accounting, remittance, and sensitive Surgery/Record files as applicable.
8. **Gate GB-AMEND:** replace `B01`–`B09` placeholders with exact executable tasks that each declare separate explicit Agent Role and Selected LLM fields, repeat both in their lock record/template, and define non-overlapping file allowlists; independently verify the amendment before approval or execution.
9. **Gate GB-APPLY:** Franco separately approves APPLY. Only then may the first amended production task reserve a lock.
10. **Gate GB-RELEASE:** independent production QA passes before locks, migration/release, or handoff are declared complete.

---

## 14. Task counts, blocked tracks, and recommended next task

- **Completed read-only discovery/decision tasks:** 4 (`T00`, `T01`, `D01`, `D02`), all released; no implementation was performed.
- **Candidate optional presentation implementation tasks:** 7 (`P01`–`P07`), none executed and none reservable until an exact-file 154/70 amendment is independently verified and separately approved for presentation execution.
- **Independent QA/handoff tasks:** 2.
- **Blocked production packages:** 9 (`B01`–`B09`), all with empty write sets until an approved amendment.
- **Total planned tasks/packages:** 22.
- **Reconciled baseline:** 154 requirements and 70 scenarios; the 32-requirement/19-scenario delta is fully allocated without adding a production package. CD-08 contributes no new scenario IDs because it reuses `DG03-01`–`DG03-02`.

The recommended first task before any future writer is a separately authorized refresh of **`T00 — Recheck provenance, dirty worktree, and lock availability`** against the current synchronized artifact hashes. It is read-only, detects active-writer conflicts, and protects the existing broad dirty worktree before any reservation or implementation decision.

No implementation task in this document has been run. The first possible presentation writer remains blocked by Gate GP. Every production writer and all APPLY activity remain blocked by Gates GB-A, GB-TB, GB-AMEND, and GB-APPLY even though DG-01–DG-07, CD-01–CD-10, and four ADR directions are approved. This reconciliation authorizes no presentation execution, production work, schema/Auth/permissions/multi-company work, sensitive Cirugías/Expediente change, implementation, or APPLY.

### External documentation risk / follow-up

SPEC §16.3 still contains a stale scope-guard reference to `MULTI-01`–`MULTI-06`; the approved requirement baseline and this TASKS guard use `MULTI-01`–`MULTI-10`. This is registered only as an external documentation follow-up. TR01 does not edit SPEC, does not treat the stale reference as resolved, and does not authorize another documentation change.
