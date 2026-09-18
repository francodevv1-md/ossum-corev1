# Tasks — STOCK-V1-SDD-001

Status: **APPROVED AND CLOSED — T4 planning decomposition approved by Franco on 2026-07-20; all future packages remain BLOCKED**
Change: `STOCK-V1-SDD-001`
Owner task: `STOCK-V1-SDD-001/T01-TASKS`
Approval closure task: `STOCK-V1-SDD-001/T04-APPROVAL-CLOSE`
Approver: Franco
Approval date: `2026-07-20`
Disposition: **Close in place; keep live under `knowledge/specs/STOCK-V1-SDD-001/`; do not archive**
Language: Professional technical English; inherited public UI labels may remain in Spanish
Authorization effect: **None for APPLY, implementation, schema, migration, Auth, permissions, Cirugías, production, data mutation, protected-file changes, or commands**
Inventory: **12 future blocked packages, 127 requirements, 60 scenarios, 7 independent protected gates, 12 validator classes, and write set `∅` for every future package**

---

## 1. Purpose and non-authorization boundary

This TASKS artifact translates the verified DESIGN into twelve individually approvable future execution packages. It defines package objectives, dependency and ownership boundaries, protected approval requests, validation and rollback evidence, and handoff contracts. It does not dispatch, authorize, or execute any package.

Package identifiers in this artifact are an execution decomposition of the verified DESIGN responsibilities; they do not reopen `DR-01`–`DR-16`, `UXD-01`–`UXD-12`, `A-01`–`A-12`, or Cajas Option A. They do not select tables, fields, endpoints, role names, capability identifiers, mappings, algorithms, locks, isolation levels, routes, components, source files, migration operations, tolerances, providers, cutover mechanisms, or production commands.

Every package below has status **BLOCKED**, current write set `∅`, and no preapproved command. A package MUST NOT start automatically because an upstream package, protected gate, independent verification, checkbox, or T4 planning approval completes. Before any future work, the package requires its own exact Task Brief, a fresh package-specific `T00`, exclusive lock, all applicable Franco approvals, and—if any mutation is proposed—a separate explicit `G-APPLY` approval after T4.

---

## 2. Reverified provenance and package preflight

The following working-tree blobs were reverified before this file was created:

| Artifact | Required blob | Reverified blob | Result |
| --- | --- | --- | --- |
| `knowledge/specs/STOCK-V1-SDD-001/PROPOSAL.md` | `37a55267e3342fcf74128b5a597ada4aa62cf74b` | `37a55267e3342fcf74128b5a597ada4aa62cf74b` | Exact |
| `knowledge/specs/STOCK-V1-SDD-001/SPEC.md` | `a45230fec13b359dd90d5e64ad358563419f150a` | `a45230fec13b359dd90d5e64ad358563419f150a` | Exact |
| `knowledge/specs/STOCK-V1-SDD-001/DESIGN.md` | `457d0eb2f7222b3c45aa3fb7752dc962d7344c03` | `457d0eb2f7222b3c45aa3fb7752dc962d7344c03` | Exact |
| `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` | `926476e1d5e275768296329e099e32e04069224e` | `926476e1d5e275768296329e099e32e04069224e` | Exact |
| `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` | `95d8d986e7dc426b48a7b4480966a558a54d52ed` | `95d8d986e7dc426b48a7b4480966a558a54d52ed` | Exact |
| `knowledge/architecture/ADR-STOCK-CORE-PERSISTENCE.md` | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` | Exact |
| `knowledge/architecture/ADR-STOCK-EFFECTS-RESERVATIONS-PROJECTIONS.md` | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` | Exact |
| `knowledge/architecture/ADR-STOCK-AUTHORIZATION-AUDIT.md` | `82c30231d56293d5ee98bf27fe3758237d0bd495` | `82c30231d56293d5ee98bf27fe3758237d0bd495` | Exact |
| `knowledge/architecture/ADR-STOCK-OPERATIONAL-INTEGRATION-ADOPTION.md` | `8277cb1710de84fd000f3487e91b709ca8a28244` | `8277cb1710de84fd000f3487e91b709ca8a28244` | Exact |
| `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` | Exact |

Before the original T01 write, the package directory contained only `PROPOSAL.md`, `SPEC.md`, and `DESIGN.md`; `TASKS.md` was absent. Fresh T04 closure preflight reverified TASKS blob `3caa00017fca5a4f7a3456cb57c50c8d2f09a83c`, all ten source/baseline blobs above, exclusive ownership of this file, and no overlap. Existing unrelated working-tree changes do not grant ownership and were not modified.

Any changed path, blob, approval status, package inventory, ownership claim, or substantive governing source blocks verification and requires independent review plus explicit human re-baselining.

---

## 3. Universal package contract

The following contract applies independently to every future package.

### 3.1 State, dispatch, and ownership

- Current and post-T4 state: **BLOCKED**.
- Current implementation write set: `∅`.
- Current allowed commands: none.
- Dispatch: manual only; never automatic or dependency-triggered.
- Ownership: one task = one accountable owner = one bounded scope = one exact write set = one validator handoff.
- Model selection: task- and risk-based. Backend/DB/security/production work SHOULD use a model appropriate to critical invariants and evidence review; model identity never substitutes for owner, approval, or validation.
- A future package MAY be split into smaller briefs, but each child remains blocked and MUST preserve the package traceability, dependencies, gates, and independent validation.

### 3.2 Fresh `T00` required before every future task

A new `T00` MUST run immediately before reserving any future lock. It MUST record:

1. task, parent package, repository/worktree, branch/baseline, owner role, selected model, mode, and human dispatcher;
2. fresh hashes for PROPOSAL, SPEC, DESIGN, TASKS, all seven frozen sources, and every accepted upstream artifact or validator report;
3. current package-directory inventory and exact intended artifact inventory;
4. read-only exploration evidence identifying the exact proposed paths and shared dependency chain;
5. exact allowed and forbidden file paths, with overlap status for every intended/shared path;
6. lock owner and lifecycle `reserved → editing → review → released`;
7. assigned requirement/scenario rows and upstream dependency evidence;
8. all applicable gates, exact Franco approval records, scope/version/environment, and expiry check;
9. exact allowed and forbidden commands, environment, data-access level, secret boundary, and destructive/production classification;
10. validators, independent reviewer, expected evidence, rollback/forward-recovery plan, and Caveman handoff;
11. confirmation that no business, schema, Auth, permission, Cirugías, API, algorithm, file, migration, tolerance, provider, or production decision is being inferred; and
12. stop conditions.

Prior `T00` evidence is invalid after any source, branch/worktree, owner, path, dependency, gate, environment, risk, or command change. A mismatch returns the task to **BLOCKED** with write set `∅`.

### 3.3 Future Task Brief file and command rules

Every future Task Brief MUST contain exact allowed files, forbidden files, allowed commands, and forbidden commands. Those exact values are deliberately deferred until fresh read-only exploration and `T00`; this artifact creates no implementation allowlist and preapproves no command.

The brief MUST:

- name only the minimum exact paths needed for its approved ownership category;
- forbid all other paths, explicitly including unrelated schema, Auth, permission, Cirugías, production, package/dependency, environment, and worklog paths as applicable;
- reserve shared or critical paths exclusively and serialize their complete API/service/validator/transaction chain;
- list exact non-destructive validation commands separately from mutation commands;
- forbid installation, Git mutation, destructive data actions, provider changes, productive access, migration execution, deployment, and rollback unless each is expressly in scope and gated; and
- stop rather than add a file or command after dispatch.

### 3.4 Exit, rollback, evidence, and handoff

No package exits on code completion alone. Exit requires unchanged provenance, final exact write set, lock-release record, applicable approvals, requirement/scenario coverage, all assigned validator evidence, independent review, proportional observability and rollback evidence, residual risks, and downstream block status.

Rollback planning MUST identify the last safe boundary, preserve accepted evidence, avoid fabricated history and direct-balance repair, and distinguish pre-acceptance abandonment from post-acceptance forward recovery. Productive rollback or routing recovery requires `G-PRODUCTION` and a separate `G-APPLY`.

Every output MUST identify evidence hashes/locations and end with Caveman `Done / Changed / Files / Validations / Risks / Next`. A failed, skipped, stale, or inconclusive validator leaves the package **BLOCKED**.

---

## 4. Global dependency and order matrix

Dependencies express minimum accepted evidence, never authorization.

```text
E00
├─ E01 ── E02 ─┬─ E05 ───────────────┐
│              ├─ E06 ── E07 ── E08 ─┤
│              ├─ E09 ───────────────┤
│              └─ E10 ───────────────┤
├─ E03 ─────────┴───────────────┐     │
└───────────────────────────────┴─ E04│
                                      │
E01 + E02 + E03 + E04 + E05…E10 ── E11
```

| Package | Minimum upstream evidence before its own dispatch | Downstream unlocked for planning only |
| --- | --- | --- |
| `E00` governance/preflight | Verified documentary chain and fresh provenance | Read-only exploration for `E01`, `E03`, and `E04` |
| `E01` identity/core persistence | `E00` | `E02`; persistence prerequisites for integrations |
| `E02` evidence/reservations/projections/correction | `E00` + accepted `E01` evidence | Operational integrations `E05`–`E10` |
| `E03` authorization/multi-company/audit | `E00`; accepted persistence evidence where applicable | Protected reads and all mutating integrations |
| `E04` Stock UX/server binding plan | `E00` for read-only planning; owning server package plus `E03` before mutating UX | Operator-facing verification evidence |
| `E05` supplier receipt | `E00` + accepted `E01`–`E03` foundations | Selected-slice adoption evidence |
| `E06` Preparation/Cajas | `E00` + accepted `E01`–`E03` foundations | `E07` where dispatch consumes/transforms reservations |
| `E07` Remito | `E00` + accepted `E01`–`E03`; `E06` where reservation-dependent | `E08` dispatch accounting |
| `E08` Consumo/Devolución | Accepted `E07` dispatch evidence and shared remainder contract | Selected-slice adoption evidence |
| `E09` Transfer | `E00` + accepted `E01`–`E03` foundations | Selected-slice adoption evidence |
| `E10` count/correction | `E00` + accepted `E01`–`E03`; correction primitives from `E02` | Selected-slice adoption evidence |
| `E11` opening/adoption | Implemented and independently validated candidate behavior for the exact selected slice across applicable `E01`–`E10` packages | No automatic expansion; any next slice starts blocked |

Required order rules:

1. `E00` precedes every writer and is repeated as the fresh package-specific `T00`.
2. `E01` precedes `E02`; evidence and projection work cannot finalize before approved identity/actionable-scope artifacts.
3. `E01` + `E02` + `E03` precede any mutating operational integration in `E05`–`E10`.
4. `E06` precedes `E07` where dispatch consumes or transforms a Preparation reservation. A separately approved non-Cajas slice must prove independence.
5. `E07` precedes `E08` because Consumption and Return account against accepted dispatch evidence and its remaining balance.
6. `E04` may plan read-only presentation contracts earlier, but any mutating UX work follows its owning server package and `E03` authorization evidence.
7. `E11` is last and requires independently validated candidate behavior for the selected bounded slice plus all applicable gates. Migration/bootstrap, reconciliation, shadow, cutover, stabilization, and production operations remain `E11` sub-obligations or gate/evidence stages, not renumbered packages.
8. `G-SCHEMA` precedes a final schema writer; `G-MIGRATION` is separate and serial after schema review. Neither implies the other.
9. Every implementation package still requires separate `G-APPLY` after T4, even when all dependencies and other gates pass.

---

## 5. Parallelism and lock policy

Read-only exploration may run in parallel with separate owners and no write overlap. After `E00`, exploration for `E01`, `E03`, and `E04` may be candidate parallel streams.

Implementation MAY be parallel only when fresh `T00` proves disjoint exact paths, no shared critical type/schema/policy/service/validator/API/transaction chain, separate final validators, no simultaneous schema/Auth/permissions/multi-company/migration/Cirugías writes, and no unresolved business or architecture dependency.

Implementation MUST serialize when any of the following applies:

- a shared or critical file, foundational type, schema, policy utility, common validator, or transaction chain exists;
- Auth, permissions, multi-company enforcement, migrations, destructive/data operations, or sensitive Cirugías paths are involved;
- `E07` Remittance dispatch and `E08` Consumption/Return accounting share the dispatch remainder chain;
- `E06` Preparation/Cajas placement and `E07` dispatch share a Surgery/Record path;
- one mandatory owner confirmation plus Stock consequence could be split across writers; or
- `E11` production opening, writer routing, live reconciliation, repair, rollback, or stabilization is active.

After accepted `E01`–`E03` foundations, `E05`, `E06`, `E09`, and `E10` may be candidate parallel streams only when the conditions above hold. `E07` and `E08` serialize. Any `E06` sensitive placement serializes under `G-CIRUGIAS`. `E11` never runs beside another production, cutover, migration, or writer-routing mutation.

Every intended path has one lock owner. Locks use `reserved → editing → review → released`; scope cannot expand after reservation. Independent verification may read locked work but MUST NOT edit or fix writer-owned files. Production admits one writer for the exact active slice and checkpoint.

---

## 6. Protected gate matrix

All gates are independent, evidence-bearing, scoped, expiring, human-approved, and currently **BLOCKED**.

| Gate | Mandatory trigger | Minimum decision evidence | Required approval |
| --- | --- | --- | --- |
| `G-SCHEMA` | Final model/table/field/relation/key/constraint/index/enum or schema-file change | Schema-specific brief; exact paths; invariant/compatibility mapping; DB validation; rollback/forward-fix; exclusive lock | Franco explicitly names scope and paths |
| `G-MIGRATION` | Migration, seed/import/backfill, bootstrap write, opening creation, reconciliation write, provider/data operation | Independently reviewed plan; source inventory; dry run; repeat/restart behavior; backup/recovery; environment and owner | Franco explicitly approves the exact data operation; productive work also needs go/no-go |
| `G-AUTH` | Provider/session/identity architecture or productive Auth behavior | Approved controlling Auth decision; threat/session review; compatibility and rollback; exact environment/paths | Franco explicitly approves Auth scope |
| `G-PERMISSIONS` | Capability vocabulary, grants/roles, exceptional authority, RLS/security policy, permission matrix | Action/resource inventory; least-privilege matrix; anti-bypass and denial cases; audit sensitivity; separation from Auth | Franco explicitly approves matrix/version/scope |
| `G-CIRUGIAS` | Surgery/Record, Expediente, Ficha CX, Cajas placement, sensitive hooks/store/types/components | Specific brief; exact paths; ownership/regression map; minimal-change proof; locks | Franco explicitly approves sensitive scope |
| `G-PRODUCTION` | Productive data, deployment, opening, cutover, monitoring activation, live repair, writer routing, rollout/rollback | Passed validators; exact slice/runbook; opening reconciliation; cross-boundary rules; tolerances; observability; rehearsal; operator readiness | Franco issues dated go/no-go for exact slice/environment |
| `G-APPLY` | Any implementation or mutation of code/config/data/protected files | Post-T4 fresh `T00`; exact brief; all other applicable gates; locks; commands; validation; rollback; handoff | Franco explicitly dispatches that task only |

Gate approval expires when source hashes, write set, owner, environment, dependency, command set, or material risk changes. Approval of one gate never approves another.

---

## 7. Future package briefs

Each subsection defines one future planning package. None is dispatched by this artifact.

### 7.1 E00 — Governance and fresh implementation preflight

- **Objective:** Govern provenance, fresh preflight, locks, gate/evidence register, requirement allocation, and the global validation matrix before every future writer.
- **Owner/model guidance:** Repo Explorer or SDD Governance/Docs owner; choose a model suited to exact provenance and policy review; independent review is required.
- **Mode:** Read-only / docs / review. Any evidence-file mutation requires post-T4 `G-APPLY`.
- **Dependencies:** Verified TASKS and T4 planning closure; then a new package-specific preflight before each future task.
- **Coverage:** `GOV-001`–`GOV-006`, `DOC-001`–`DOC-006`, `NEG-001`–`NEG-003`, `NEG-006`–`NEG-007`; `SCN-051`–`SCN-052`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact hashes, inventory, owner, overlap, dependencies, gates, proposed paths/commands, validators, and no-hidden-decision proof.
- **Gates/Franco:** `G-APPLY` for any mutation; every other triggered gate remains separate. T4 is not implementation approval.
- **Future brief:** Exact paths/commands remain empty until fresh exploration; forbid every unlisted path/command and any implied protected mutation.
- **Validation:** `V-GOV`; provenance, inventory, locks, gates, traceability, empty-write-set, and non-authorization evidence.
- **Rollback/evidence/output:** Stale read-only evidence is discarded; produce a versioned preflight report and Caveman handoff.
- **Stop/escalate:** Any mismatch, overlap, stale approval, missing dependency, inferred decision, or requested mutation outside approval.
- **Autostart:** Prohibited.

### 7.2 E01 — Identity and core persistence

- **Objective:** Establish Stock-controlled Article eligibility, normalized operational identities, actionable position scope, deposits/custody, quantity vocabulary, and hybrid traceability foundations.
- **Owner/model guidance:** Backend/DB owner with independent DB/domain reviewer; model selection must reflect schema integrity and multi-company risk.
- **Mode:** Future schema design / implementation / DB validation; migration execution is a separate gated sub-stage.
- **Dependencies:** `E00`; it precedes `E02` and persistence-backed operational work.
- **Coverage:** `CORE-001`–`CORE-014`; `SCN-001`–`SCN-005`, `SCN-010`, `SCN-025`, `SCN-027`, `SCN-033`–`SCN-034`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact identity/invariant proposal, compatibility impact, DB baseline, path ownership, and isolated validation plan.
- **Gates/Franco:** Mandatory `G-SCHEMA`; `G-MIGRATION` for any migration/bootstrap/data operation; separate post-T4 `G-APPLY`.
- **Future brief:** Exact schema/type/migration paths and commands are deferred; forbid unapproved migration, seed/import/backfill, Auth, Cirugías, production, and all unlisted work.
- **Validation:** `V-DB`, `V-DOM`, `V-CONC`, `V-REC`; identity integrity, company scope, grain, traceability, exclusivity, quantity, and conservation evidence.
- **Rollback/evidence/output:** Record compatibility and schema forward/recovery implications; produce invariant mapping, validation evidence, final path inventory, and Caveman handoff.
- **Stop/escalate:** Any identity, field, constraint, traceability, migration/bootstrap, or compatibility choice lacks approval or overlap appears.
- **Autostart:** Prohibited.

### 7.3 E02 — Accepted Stock evidence, reservations, projections, and correction

- **Objective:** Establish reservation lifecycle, append-only accepted evidence, maintained/reconstructible projections, conditional claims, semantic uniqueness, retry behavior, and linked correction/reversal foundations.
- **Owner/model guidance:** Backend Stock Domain owner with independent DB/domain/concurrency reviewer; select a model suited to critical invariants.
- **Mode:** Future implementation / DB-domain-concurrency validation; no owning-flow or production rollout.
- **Dependencies:** `E00` + accepted `E01` identity/actionable-scope evidence.
- **Coverage:** `EVID-001`–`EVID-017`, `NEG-004`; `SCN-008`–`SCN-018`, `SCN-036`, `SCN-049`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; accepted `E01` hashes, exact evidence/projection ownership, semantic-intent inventory, contention environment, and reconstruction plan.
- **Gates/Franco:** `G-SCHEMA`; `G-MIGRATION` for migration/reconciliation writes; `G-PERMISSIONS` for protected correction/reversal authority; separate post-T4 `G-APPLY`.
- **Future brief:** Exact persistence/service/validator paths and commands are deferred; forbid direct balance truth, destructive history edits, invented algorithms/locks, production repair, and unlisted work.
- **Validation:** `V-DB`, `V-DOM`, `V-CONC`, `V-INT`, `V-REC`, `V-OBS`; reconstruction, contention, duplicate/conflict/retry, correction/reversal, and divergence evidence.
- **Rollback/evidence/output:** Never delete or rewrite accepted evidence; produce semantic/concurrency reports, projection explanation, recovery plan, and Caveman handoff.
- **Stop/escalate:** Lock/isolation, fold, uniqueness, correction, repair, or evidence semantics require an unapproved choice.
- **Autostart:** Prohibited.

### 7.4 E03 — Authorization, multi-company, and audit boundary

- **Objective:** Establish provider-neutral policy, distinct identity/membership/capability/resource checks, anti-bypass coverage, company isolation, and domain-evidence/transversal-audit separation and correlation.
- **Owner/model guidance:** Security/Authorization owner with independent security reviewer; model selection must fit access-control and disclosure risk.
- **Mode:** Future security design / implementation / adversarial validation.
- **Dependencies:** `E00`; accepted `E01`/`E02` artifacts where persistence and protected resources are involved; entry-point inventories from owning packages before completion.
- **Coverage:** `AUTH-001`–`AUTH-010`, `NEG-006`, `NEG-008`; `SCN-005`–`SCN-006`, `SCN-037`, `SCN-052`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; controlling Auth status, action/resource and entry-point inventories, proposed approved matrix, denial/non-disclosure cases, audit sensitivity, and anti-bypass plan.
- **Gates/Franco:** `G-AUTH` where provider/session/productive identity changes; mandatory `G-PERMISSIONS` for vocabulary/mappings/matrix/RLS/exception authority; `G-SCHEMA` if persistence changes; separate post-T4 `G-APPLY`.
- **Future brief:** Exact policy/adapter/audit/entry-point paths and commands are deferred; forbid invented roles/capabilities/mappings, implicit RLS authority, provider changes, productive access, and unlisted work.
- **Validation:** `V-APISEC`, `V-INT`, `V-OBS`, `V-REG`; distinct checks, anti-bypass, safe denial/no effect, non-disclosure, provider neutrality, correlation, and redaction evidence.
- **Rollback/evidence/output:** Security recovery cannot broaden access or erase accepted evidence; produce matrix/version, entry-point report, denial evidence, and Caveman handoff.
- **Stop/escalate:** Auth or permission decisions are unresolved, a bypass remains, or company-safe audit/telemetry cannot be proven.
- **Autostart:** Prohibited.

### 7.5 E04 — Stock UX and server binding plan

- **Objective:** Implement the Stock index, hierarchical position detail/history, complete state model, source-owned journey links, critical review bindings, responsive transformation, and WCAG 2.2 AA without client authority.
- **Owner/model guidance:** Frontend/UI owner with accessibility competence and independent browser/accessibility reviewer; select a model suited to React/Next.js operational UX.
- **Mode:** Future UI/server-binding implementation / browser QA / accessibility validation.
- **Dependencies:** Read-only planning may follow `E00`; mutating UX waits for `E03` and its owning server package (`E05`–`E11`).
- **Coverage:** `UX-001`–`UX-023`, `NEG-005`; `SCN-002`–`SCN-004`, `SCN-011`, `SCN-015`–`SCN-018`, `SCN-037`–`SCN-045`, `SCN-053`–`SCN-056`, `SCN-060`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact route/component/query ownership, accepted server contracts, full state matrix, responsive/a11y plan, and browser environment.
- **Gates/Franco:** `G-PERMISSIONS` for protected visibility/actions; conditionally `G-CIRUGIAS` for sensitive placement; separate post-T4 `G-APPLY`.
- **Future brief:** Exact UI/server-binding/test paths and commands are deferred; forbid client/local truth, business logic or Prisma in components, optimistic success, duplicated source journeys, and unlisted work.
- **Validation:** `V-UX`, `V-A11Y`, `V-APISEC`, `V-REG`; states, hierarchy, freshness, responsive/browser evidence including `412x915`, WCAG evidence, and exact Cajas labels.
- **Rollback/evidence/output:** UI recovery must preserve authoritative evidence and block unsafe actions; produce state/browser/a11y/source-link evidence and Caveman handoff.
- **Stop/escalate:** Server contract, visibility rule, route/component placement, or browser validation is absent or unapproved.
- **Autostart:** Prohibited.

### 7.6 E05 — Supplier receipt

- **Objective:** Integrate accepted physical supplier receipt, including the separately protected exceptional no-PO path, with atomic cause-specific inbound Stock consequences.
- **Owner/model guidance:** Purchases/Receipt source-domain Backend Integration owner with independent API/security/integration reviewer; model suited to transactional invariants.
- **Mode:** Future implementation / integration / regression validation.
- **Dependencies:** `E00` + accepted `E01`–`E03` foundations; `E04` only for owned presentation bindings.
- **Coverage:** `FLOW-001`–`FLOW-003`, reused `FLOW-025`–`FLOW-029`, `FLOW-031`; `SCN-019`–`SCN-021`, `SCN-037`–`SCN-039`, `SCN-051`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact receipt owner/Stock chain, no-PO authority status, semantic identity, source-state/failure map, and upstream validator hashes.
- **Gates/Franco:** `G-SCHEMA`, `G-PERMISSIONS`, and conditionally `G-AUTH` where triggered; separate post-T4 `G-APPLY`.
- **Future brief:** Exact receipt/API/service/validator/UI paths and commands are deferred; forbid PO/draft Stock effects, invented exceptional authority, financial effects, migration/production work, and split transaction ownership.
- **Validation:** `V-DOM`, `V-APISEC`, `V-INT`, `V-CONC`, `V-REG`; PO neutrality, accepted receipt, no-PO denial, atomic failure, retry, and financial neutrality.
- **Rollback/evidence/output:** Preserve accepted receipt evidence; pause/forward-fix instead of erasing truth; produce source/effect and failure-injection evidence plus Caveman handoff.
- **Stop/escalate:** Exceptional authority, source ownership, transaction boundary, or traceability input is unclear/unapproved.
- **Autostart:** Prohibited.

### 7.7 E06 — Preparation and Cajas

- **Objective:** Integrate confirmed Preparation reservation/release/replacement, evidence-only control/re-control, and minimum identified Cajas effects without full Box-composition Stock.
- **Owner/model guidance:** Preparation/Cajas source-domain Backend owner with sensitive-path ownership and independent Cajas/Cirugías reviewer; critical model recommended.
- **Mode:** Future implementation / integration / sensitive regression validation.
- **Dependencies:** `E00` + accepted `E01`–`E03`; it precedes `E07` where dispatch consumes/transforms its reservation.
- **Coverage:** `FLOW-004`–`FLOW-008`, `FLOW-030`–`FLOW-031`, reused `EVID-001`–`EVID-002`; `SCN-007`–`SCN-013`, `SCN-022`, `SCN-025`, `SCN-030`–`SCN-032`, `SCN-051`, `SCN-056`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact sensitive path map, current owner behavior, reservation lifecycle, selected Cajas slice, regression map, and exclusive locks.
- **Gates/Franco:** Mandatory `G-CIRUGIAS` for sensitive Surgery/Record/Cajas placement or files; `G-SCHEMA`, `G-PERMISSIONS`, and separate post-T4 `G-APPLY` where applicable.
- **Future brief:** Exact Preparation/Cajas/service/validator/presentation paths and commands are deferred; forbid broad Cirugías refactor, full composition, inferred control movement, financial effects, and unlisted work.
- **Validation:** `V-DOM`, `V-CONC`, `V-INT`, `V-APISEC`, `V-UX`, `V-REG`; provisional neutrality, reserve once, oversubscription, release/replacement, control neutrality, identified-unit and label evidence.
- **Rollback/evidence/output:** Preserve accepted Preparation/control evidence and never infer availability/movement; produce reservation/release and sensitive regression evidence plus Caveman handoff.
- **Stop/escalate:** Placement/business rules are unclear, sensitive scope expands, full composition is implied, or `G-CIRUGIAS` is absent/stale.
- **Autostart:** Prohibited.

### 7.8 E07 — Remito

- **Objective:** Integrate successful Remittance issuance/approved dispatch with atomic dispatch evidence, transit/external custody, unresolved remainder, and the shared critical-confirmation contract.
- **Owner/model guidance:** Remittance source-domain Backend Integration owner for the complete transaction chain with independent integration/concurrency reviewer; critical model recommended.
- **Mode:** Future implementation / integration / regression validation.
- **Dependencies:** `E00` + accepted `E01`–`E03`; `E06` where dispatch consumes/transforms Preparation/Cajas reservations; it precedes `E08`.
- **Coverage:** `FLOW-009`–`FLOW-012`, `FLOW-025`–`FLOW-029`, Cajas dispatch aspects of `FLOW-030`, `FLOW-031`; `SCN-023`–`SCN-025`, `SCN-037`–`SCN-039`, `SCN-051`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact owner/Stock transaction chain, eligibility/reservation semantics, semantic identities, source failure map, and upstream evidence.
- **Gates/Franco:** `G-SCHEMA`, `G-PERMISSIONS`, conditionally `G-CIRUGIAS`, and separate post-T4 `G-APPLY`.
- **Future brief:** Exact Remito/API/service/validator/UI paths and commands are deferred; forbid failed/draft dispatch effects, optional work inside critical transaction, financial effects, migration/production work, and split ownership.
- **Validation:** `V-DOM`, `V-CONC`, `V-INT`, `V-APISEC`, `V-REC`, `V-REG`; success/failure, multiple bounded dispatches, retry/unknown outcome, no partial effect, and prior-evidence preservation.
- **Rollback/evidence/output:** Preserve reservation/control and accepted dispatch evidence; produce one-to-one source/effect, remainder, failure-injection, and Caveman evidence.
- **Stop/escalate:** Dispatch eligibility, transaction ownership, semantic identity, or sensitive path is unclear/unapproved.
- **Autostart:** Prohibited.

### 7.9 E08 — Consumo and Devolución

- **Objective:** Integrate human-validated Consumption and Return dispositions against one shared dispatch remainder, including partial Cajas accounting and unresolved outcomes.
- **Owner/model guidance:** Consumption/Return source-domain Backend Integration owner for the selected chain with independent domain/concurrency reviewer; critical model recommended.
- **Mode:** Future implementation / integration / regression validation.
- **Dependencies:** Accepted `E07` dispatch evidence and `E01`–`E03` foundations; `E06` for applicable Cajas semantics.
- **Coverage:** `FLOW-013`–`FLOW-020`, reused `FLOW-025`–`FLOW-031`; `SCN-026`–`SCN-032`, `SCN-037`–`SCN-039`, `SCN-051`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact dispatch remainder/cardinality contract, owner/Stock chain, disposition set, semantic identities, and applicable Cajas evidence.
- **Gates/Franco:** `G-SCHEMA`, `G-PERMISSIONS`, conditionally `G-CIRUGIAS`, and separate post-T4 `G-APPLY`.
- **Future brief:** Exact Consumo/Devolución/API/service/validator/UI paths and commands are deferred; forbid draft Return availability, inferred balancing, contradictory disposition, whole-Box release, financial effects, and unlisted work.
- **Validation:** `V-DOM`, `V-CONC`, `V-INT`, `V-APISEC`, `V-REC`, `V-REG`; ceilings, either-order accounting, partials, bounded dispositions, replacements/differences, retry, and no-double-effect.
- **Rollback/evidence/output:** Preserve every accepted disposition; pause unsafe confirmations and reconcile/forward-fix; produce remainder/disposition and failure evidence plus Caveman handoff.
- **Stop/escalate:** Shared remainder/cardinality, disposition, replacement, or whole-Box semantics are unclear/unapproved.
- **Autostart:** Prohibited.

### 7.10 E09 — Transfer

- **Objective:** Integrate separate Transfer dispatch and receipt checkpoints, explicit transit, discrepancy visibility, and company-total conservation.
- **Owner/model guidance:** Transfer source-domain Backend Integration owner with independent domain/integration/reconciliation reviewer; model suited to checkpoint and conservation invariants.
- **Mode:** Future implementation / integration / regression validation.
- **Dependencies:** `E00` + accepted `E01`–`E03` foundations; `CORE-014` evidence from `E01`.
- **Coverage:** `FLOW-021`, `CORE-014`, reused `FLOW-025`–`FLOW-029`, `FLOW-031`; `SCN-033`–`SCN-034`, `SCN-037`–`SCN-039`, `SCN-051`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact two-checkpoint owner/Stock chains, transit scope, discrepancy handling, semantic identities, and conservation baseline.
- **Gates/Franco:** `G-SCHEMA`, `G-PERMISSIONS`, and separate post-T4 `G-APPLY` where applicable.
- **Future brief:** Exact Transfer/API/service/validator/UI paths and commands are deferred; forbid one-step transfer, hidden discrepancy, cross-company movement, migration/production work, and unlisted work.
- **Validation:** `V-DOM`, `V-INT`, `V-CONC`, `V-APISEC`, `V-REC`, `V-REG`; dispatch/receipt, transit, discrepancy, conservation, retry, and source/effect evidence.
- **Rollback/evidence/output:** Preserve both checkpoints and unresolved discrepancies; produce conservation/reconciliation and failure evidence plus Caveman handoff.
- **Stop/escalate:** Transit representation, checkpoint ownership, discrepancy behavior, or company scope is unclear/unapproved.
- **Autostart:** Prohibited.

### 7.11 E10 — Count and correction

- **Objective:** Integrate inventory count observation separately from justified reviewed correction/reversal, using linked evidence and projection reconciliation controls.
- **Owner/model guidance:** Count/Correction source-domain Backend owner with independent domain/security/reconciliation reviewer; model suited to historical-integrity controls.
- **Mode:** Future implementation / integration / regression validation.
- **Dependencies:** `E00` + accepted `E01`–`E03`; correction/reversal foundations from `E02`.
- **Coverage:** `FLOW-022`–`FLOW-023`, reused `EVID-015`–`EVID-017`, `NEG-004`, `FLOW-031`; `SCN-017`–`SCN-018`, `SCN-035`–`SCN-036`, `SCN-049`, `SCN-051`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact count owner, correction authority, known-cause routing, link/reversible scope, review evidence, and projection comparison plan.
- **Gates/Franco:** `G-SCHEMA`, `G-PERMISSIONS`, `G-MIGRATION` for reconciliation writes, and separate post-T4 `G-APPLY` where applicable.
- **Future brief:** Exact count/correction/service/validator/UI paths and commands are deferred; forbid count-as-correction, direct balance editing, generic adjustment replacing known causes, productive repair, and unlisted work.
- **Validation:** `V-DOM`, `V-APISEC`, `V-INT`, `V-CONC`, `V-REC`, `V-REG`; observation neutrality, separate review, reason/evidence, reversal bounds, retry, and projection reconciliation.
- **Rollback/evidence/output:** Preserve count and original accepted evidence; produce linked-correction/reversal and reconciliation evidence plus Caveman handoff.
- **Stop/escalate:** Correction authority, known cause, reversible scope, review, or repair mechanism is unclear/unapproved.
- **Autostart:** Prohibited.

### 7.12 E11 — Opening position and adoption

- **Objective:** Establish dated reconciled opening positions and bounded-slice adoption with shadow comparison, one writer, cross-boundary rules, reconciliation, stabilization, and truth-preserving routing rollback.
- **Owner/model guidance:** Backend/Data/Production owner for each separately bounded sub-stage with independent cutover/recovery reviewer; select models appropriate to migration and production risk; Franco remains go/no-go owner.
- **Mode:** Future opening/adoption planning, tooling, controlled migration, production activation, and stabilization in separately approved stages.
- **Dependencies:** Last package: accepted applicable `E01`–`E10` candidate behavior and independent verification evidence for the exact selected slice.
- **Coverage:** `FLOW-024`, `ADOPT-001`–`ADOPT-012`, `NEG-004`, reused `FLOW-025`–`FLOW-031`; `SCN-046`–`SCN-052`, `SCN-057`–`SCN-059`.
- **State/write set:** **BLOCKED**; `∅`; no commands approved.
- **Fresh T00/preconditions:** Universal `T00`; exact slice/effective boundary, reconciled opening, source inventory, migration/bootstrap and shadow plans, cross-boundary rules, one-writer routing, approved tolerances, observability, rollback rehearsal, support, and independent PASS evidence.
- **Gates/Franco:** Mandatory `G-MIGRATION`, `G-PRODUCTION`, and separate post-T4 `G-APPLY`; `G-SCHEMA`, `G-AUTH`, `G-PERMISSIONS`, and `G-CIRUGIAS` wherever triggered. Franco explicitly approves each exact stage/slice/environment.
- **Future brief:** Exact migration/bootstrap, reconciliation/shadow/cutover, production, monitoring, and rollback paths/commands are deferred; forbid fabricated history, automatic correction/expansion, dual writers, unlisted slices/commands, and destructive repair.
- **Validation:** `V-DOM`, `V-REC`, `V-CUT`, `V-OBS`, `V-INT`, `V-APISEC`, `V-REG`, `V-GOV`; opening, no-write shadow, one-to-one reconciliation, one writer, cross-boundary handling, tolerances, stabilization, and rollback rehearsal.
- **Rollback/evidence/output:** Pre-activation candidates may be abandoned; post-acceptance recovery never deletes/hides/rewrites accepted evidence. Produce slice/opening manifests, shadow/reconciliation/cutover/stabilization evidence, timed production record where approved, and Caveman handoff.
- **Stop/escalate:** Source meaning/tolerance/cutover rule is unapproved, evidence diverges, dual write appears, independent verification fails, productive safeguards are unavailable, or go/no-go is absent/stale.
- **Autostart:** Prohibited.

---

## 8. Verification and cutover sequence

For any future bounded slice, the only permissible high-level sequence is:

```text
fresh package T00
→ exact Task Brief
→ applicable protected approvals
→ separate G-APPLY
→ exclusive lock
→ bounded implementation
→ writer validation and evidence
→ lock review/release
→ independent verification
→ Franco production go/no-go where applicable
→ bounded opening / one-writer activation
→ reconciliation and stabilization
→ explicit close, pause, recovery, or separately planned next slice
```

Rules:

1. A writer cannot validate its own production readiness alone.
2. Each accepted source confirmation in the active slice must reconcile to exactly one mandatory Stock consequence; each consequence identifies one source cause or the explicit opening position.
3. Shadow paths remain read/compare only. Legacy/local mutation is disabled, read-only, or outside the slice before writer activation.
4. Open and pre-date/post-confirmation cross-boundary operations use the explicitly approved slice rule.
5. Expansion is prohibited until approved reconciliation, duplicate-suppression, projection-equality, unresolved-operation, and operator-visible failure tolerances pass.
6. Recovery preserves accepted evidence; direct balance edits and fabricated history are prohibited.

---

## 9. Requirement and scenario traceability

### 9.1 Requirement accounting

| Namespace | Count | Primary execution coverage | Required validator classes |
| --- | ---: | --- | --- |
| `GOV-001`–`GOV-006` | 6 | `E00` | `V-GOV`, `V-REG` |
| `CORE-001`–`CORE-014` | 14 | `E01`, reused by `E07`–`E09` | `V-DB`, `V-DOM`, `V-CONC`, `V-REC` |
| `EVID-001`–`EVID-017` | 17 | `E02`, with correction reuse by `E10` | `V-DB`, `V-DOM`, `V-CONC`, `V-INT`, `V-REC`, `V-OBS` |
| `AUTH-001`–`AUTH-010` | 10 | `E03`, completed across actual entry points | `V-APISEC`, `V-INT`, `V-OBS` |
| `FLOW-001`–`FLOW-003` | 3 | `E05` | `V-DOM`, `V-APISEC`, `V-INT` |
| `FLOW-004`–`FLOW-008` | 5 | `E06` | `V-DOM`, `V-CONC`, `V-INT`, `V-REG` |
| `FLOW-009`–`FLOW-012` | 4 | `E07` | `V-DOM`, `V-CONC`, `V-INT`, `V-REC` |
| `FLOW-013`–`FLOW-020` | 8 | `E08` | `V-DOM`, `V-CONC`, `V-INT`, `V-REC` |
| `FLOW-021` | 1 | `E09` | `V-DOM`, `V-INT`, `V-REC` |
| `FLOW-022`–`FLOW-023` | 2 | `E10` | `V-DOM`, `V-APISEC`, `V-INT`, `V-REC` |
| `FLOW-024` | 1 | `E11` | `V-DOM`, `V-REC`, `V-CUT` |
| `FLOW-025`–`FLOW-026` | 2 | `E07`, reused by `E05`–`E11` | `V-CONC`, `V-INT` |
| `FLOW-027`–`FLOW-029` | 3 | `E07`, reused by all critical packages | `V-CONC`, `V-INT`, `V-UX` |
| `FLOW-030` | 1 | `E06`, with `E07`–`E08` | `V-DOM`, `V-CONC`, `V-INT`, `V-REG` |
| `FLOW-031` | 1 | `E05`–`E11`, governed by `E00` | `V-GOV`, `V-DOM`, `V-INT`, `V-REG` |
| `UX-001`–`UX-023` | 23 | `E04`, with Cajas labels shared with `E06` | `V-UX`, `V-A11Y`, `V-APISEC`, `V-REG` |
| `ADOPT-001`–`ADOPT-012` | 12 | `E11` | `V-REC`, `V-CUT`, `V-OBS`, `V-GOV` |
| `NEG-001`–`NEG-008` | 8 | `E00`, specialized by `E02`–`E04`, `E10`, `E11` | `V-GOV`, `V-DOM`, `V-APISEC`, `V-REC`, `V-REG` |
| `DOC-001`–`DOC-006` | 6 | `E00` | `V-GOV` |
| **Total** | **127** | **No orphan requirement** | **All applicable classes** |

### 9.2 Scenario accounting

| Scenario range | Primary package evidence | Required validator classes |
| --- | --- | --- |
| `SCN-001`–`SCN-006` | `E01`, `E03` | `V-DB`, `V-DOM`, `V-APISEC`, `V-REG` |
| `SCN-007`–`SCN-018` | `E02`, `E06`, `E10` | `V-DOM`, `V-CONC`, `V-INT`, `V-REC` |
| `SCN-019`–`SCN-022` | `E05`, `E06` | `V-DOM`, `V-APISEC`, `V-INT`, `V-REG` |
| `SCN-023`–`SCN-025` | `E07` | `V-DOM`, `V-CONC`, `V-INT` |
| `SCN-026`–`SCN-032` | `E08` | `V-DOM`, `V-CONC`, `V-INT`, `V-REC` |
| `SCN-033`–`SCN-034` | `E09` | `V-DOM`, `V-INT`, `V-REC` |
| `SCN-035`–`SCN-036` | `E10` | `V-DOM`, `V-APISEC`, `V-INT`, `V-REC` |
| `SCN-037`–`SCN-045` | `E03`, `E04`, `E07` cross-cutting validation | `V-APISEC`, `V-INT`, `V-CONC`, `V-UX`, `V-A11Y` |
| `SCN-046`–`SCN-050` | `E11` | `V-REC`, `V-CUT`, `V-OBS` |
| `SCN-051`–`SCN-052` | `E00` and all-package boundaries | `V-GOV`, `V-DOM`, `V-REG` |
| `SCN-053`–`SCN-056` | `E04`, `E06` | `V-UX`, `V-A11Y`, `V-REG` |
| `SCN-057`–`SCN-059` | `E11` | `V-REC`, `V-CUT`, `V-OBS` |
| `SCN-060` | `E04` | `V-A11Y`, `V-UX` |
| **`SCN-001`–`SCN-060`** | **60 scenarios; no orphan scenario** | **All applicable classes** |

### 9.3 Validator ownership

Writer packages produce their assigned evidence. A separately owned independent verification stage reviews it; the reviewer MUST NOT fix writer-owned implementation files, approve gates by implication, or turn a failed/inconclusive result into package completion. `E10` remains the count/correction package and is not the reviewer identity. Validator meanings remain those fixed by DESIGN:

- `V-GOV`: provenance, scope, locks, gates, traceability, non-goals, and no hidden authorization.
- `V-DB`: identity, company scope, grain, traceability, integrity, projection persistence, and compatibility.
- `V-DOM`: invariants, causes, quantities, conservation, source ownership, correction/reversal, and financial neutrality.
- `V-CONC`: conditional acceptance, contention, semantic idempotency, conflict, retry, reversal, and unknown outcomes.
- `V-APISEC`: trusted entry points, distinct security checks, anti-bypass, denial, and non-disclosure.
- `V-INT`: one transaction, mandatory-stage failure injection, one-to-one source/effect correlation, and optional-work separation.
- `V-UX`: hierarchy, scope/freshness, honest states, critical review, no optimistic success, and responsive behavior.
- `V-A11Y`: WCAG 2.2 AA keyboard, focus, announcement, relationship, contrast, reflow/zoom, naming, non-color, and target evidence.
- `V-REC`: deterministic reconstruction, divergence, reconciliation, bounded repair, and accepted-history preservation.
- `V-CUT`: slices, opening, shadow, one writer, cross-boundary rules, stabilization, and rollback rehearsal.
- `V-OBS`: company-safe correlation, metrics/alerts, failure visibility, and audit/evidence separation.
- `V-REG`: canonical-circuit and cross-package regressions for Articles, Cajas, Preparation, Remittance, Consumption, Return, Transfers, count, and company isolation.

---

## 10. T4 approval and close record

The documentary sequence is:

```text
TASKS creation
→ independent read-only TASKS verification
→ Franco T4 approval of planning decomposition
→ documentary package closes
→ STOP
```

On `2026-07-20`, Franco approved exactly the independently verified planning decomposition recorded in this TASKS artifact. That approval closes T4 planning only. It dispatched no package, approved no implementation detail, and satisfied no protected gate.

All `E00`–`E11` packages remain **BLOCKED** with write set `∅` and no approved command. After T4, `G-APPLY` still requires, in this order, a separate exact Task Brief, fresh `T00`, exact path/command discovery, all applicable Franco approvals, exclusive ownership/lock, and Franco's explicit dispatch for that task. No package starts automatically, including preflight, independent verification, or production opening.

This approved package remains live in `knowledge/specs/STOCK-V1-SDD-001/` as the governing planning record. It is closed in place and MUST NOT move to `knowledge/archive/`.

---

## 11. Global stop and escalation conditions

Stop and return to Franco/the orchestrator if:

- any frozen path, hash, approval status, package inventory, owner, or governing source changes;
- another writer overlaps an intended or shared critical path;
- a task requires an unlisted file, command, environment, dependency, or data scope;
- an upstream artifact, validator, gate, lock, or approval is missing, failed, stale, ambiguous, or broader/narrower than the task;
- a requirement would reopen, narrow, or expand an approved domain, UX, architecture, or Cajas decision;
- a final schema, Auth, permission, API, algorithm, file, migration, tolerance, provider, cutover, or production choice is required without explicit approval;
- source ownership, one-transaction acceptance, one-writer adoption, company isolation, historical truth, evidence/audit separation, no-double-effect behavior, or financial neutrality cannot be proven;
- a destructive or productive operation is requested without exact human go/no-go and recovery evidence; or
- any wording would imply automatic dispatch or approval by dependency, verification, T4, or another gate.

Stopping preserves status **BLOCKED** and write set `∅`. No placeholder, prototype convention, role invention, operator convention, or technical assumption may substitute for approval.

---

## 12. TASKS acceptance conditions

This artifact is ready only for independent read-only verification when:

1. all ten provenance blobs in §2 remain exact and the package contained only PROPOSAL/SPEC/DESIGN before this write;
2. exactly twelve future package definitions exist, all **BLOCKED**, all with write set `∅`, no preapproved command, and explicit no-autostart language;
3. the package identities exactly preserve DESIGN: `E00` governance/fresh preflight; `E01` identity/core persistence; `E02` accepted evidence/reservations/projections/correction; `E03` authorization/multi-company/audit; `E04` Stock UX/server binding; `E05` supplier receipt; `E06` Preparation/Cajas; `E07` Remito; `E08` Consumo/Devolución; `E09` Transfer; `E10` count/correction; and `E11` opening position/adoption;
4. every package states objective, owner/model guidance, mode, dependencies, coverage, fresh T00/preconditions, gates/Franco approvals, deferred exact files/commands, validators, rollback/evidence, handoff, stops, and no-autostart;
5. the dependency/order matrix, conditional parallelism, exclusive locks, seven-gate matrix, verification/cutover sequence, and T4 semantics match DESIGN;
6. all 127 requirements and all 60 scenarios map to packages and validators with no orphan;
7. `G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, and `G-APPLY` remain separate and blocked;
8. every implementation package requires separate post-T4 `G-APPLY` after its exact brief, fresh T00, locks, and other applicable approvals;
9. no exact implementation allowlist, command, capability, role, endpoint, algorithm, tolerance, migration, production procedure, or hidden authorization is created; and
10. this phase creates only `knowledge/specs/STOCK-V1-SDD-001/TASKS.md` and performs no test, build, Prisma, DB, browser, install, worklog, protected-file, or Git mutation.

Passing these conditions confirms only the approved T4 close record in place. It never authorizes execution, satisfies a protected gate, or dispatches a future package.
