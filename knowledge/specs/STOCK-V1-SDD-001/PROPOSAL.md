# Proposal — STOCK-V1-SDD-001

Status: **PROPOSED — documentary execution-plan only**
Change: `STOCK-V1-SDD-001`
Language: Professional technical English; public UI labels may remain in Spanish
Owner task: `STOCK-V1-SDD-001/P01-PROPOSAL`
Authorization effect: **None for APPLY, implementation, schema, migration, Auth, permissions, Cirugías, production, or protected-file changes**
Artifact chain: **PROPOSAL → independent verification → SPEC → independent verification → DESIGN → independent verification → TASKS → independent verification → Franco T4 approval**

---

## 1. Proposal purpose and boundary

This proposal creates one bounded documentary change identity for translating the already approved Stock V1 domain and UX blueprints and the accepted Stock/Cajas architecture directions into a future execution-plan package.

It is a bridge, not a new product or architecture decision. It preserves the approved source decisions, defines the documentary sequence and planning boundaries, and names future implementation package families only so later artifacts can organize dependencies, gates, evidence, and approval requests.

This proposal does not authorize implementation. Creating, verifying, approving, or closing any artifact in this package—including Franco's future T4 approval of `TASKS.md`—does not authorize `APPLY`, code changes, schema changes, migrations, Auth or permission changes, Cirugías changes, production work, data operations, or rollout. Every such activity remains subject to its own explicit Task Brief, ownership lock, applicable protected gate, and Franco approval.

---

## 2. Problem statement

Stock V1 now has three approved layers of direction:

1. a closed domain baseline covering `DR-01`–`DR-16`;
2. a closed UX baseline covering `UXD-01`–`UXD-12`; and
3. accepted architecture directions covering `A-01`–`A-12`, together with inherited Cajas Option A.

Those sources deliberately do not select exact implementation artifacts. Without a single bridge package, later planning could fragment the approved behavior, silently reopen closed choices, merge unrelated approval boundaries, or turn planning language into premature authority for schema, security, sensitive Surgery/Record work, migration, or production changes.

`STOCK-V1-SDD-001` solves only that documentary coordination problem. It must turn the approved baselines into a verifiable `SPEC`, `DESIGN`, and `TASKS` package while keeping all implementation and protected work blocked.

---

## 3. Frozen source hierarchy and provenance

### 3.1 Authority rule

This package follows `AGENTS.md` and current Knowledge governance. Within its bounded evidence set:

1. repository governance and workflow rules control authorization, ownership, sequencing, and protected work;
2. accepted ADRs control the architecture directions they expressly decide;
3. the approved Stock domain blueprint controls `DR-01`–`DR-16` and the inherited domain baseline;
4. the approved Stock UX blueprint controls `UXD-01`–`UXD-12` and the inherited observable UX baseline; and
5. this SDD package may only derive requirements, design obligations, verification evidence, and planning dependencies from those sources.

This proposal cannot reconcile a future source conflict by inventing a choice. Any substantive conflict, provenance change, or need to narrow or expand an approved decision is a stop condition for Franco/the orchestrator.

### 3.2 Frozen approved sources

The following working-tree blob hashes were verified before this artifact was created and are frozen as the provenance baseline for this package:

| Source | Frozen working-tree blob | Source status inherited by this package |
| --- | --- | --- |
| `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` | `926476e1d5e275768296329e099e32e04069224e` | **APPROVED AND CLOSED** — `DR-01`–`DR-16` approved by Franco on 2026-07-19 |
| `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` | `95d8d986e7dc426b48a7b4480966a558a54d52ed` | **APPROVED AND CLOSED** — `UXD-01`–`UXD-12` approved by Franco on 2026-07-20 |
| `knowledge/architecture/ADR-STOCK-CORE-PERSISTENCE.md` | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` | **ACCEPTED** — `A-01`–`A-03` approved by Franco on 2026-07-20 |
| `knowledge/architecture/ADR-STOCK-EFFECTS-RESERVATIONS-PROJECTIONS.md` | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` | **ACCEPTED** — `A-04`–`A-08` approved by Franco on 2026-07-20 |
| `knowledge/architecture/ADR-STOCK-AUTHORIZATION-AUDIT.md` | `82c30231d56293d5ee98bf27fe3758237d0bd495` | **ACCEPTED** — `A-09`–`A-10` approved by Franco on 2026-07-20; productive Auth remains independently blocked |
| `knowledge/architecture/ADR-STOCK-OPERATIONAL-INTEGRATION-ADOPTION.md` | `8277cb1710de84fd000f3487e91b709ca8a28244` | **ACCEPTED** — `A-11`–`A-12` approved by Franco on 2026-07-20 |
| `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` | **ACCEPTED** — Cajas Option A approved by Franco on 2026-07-19 |

These are working-tree provenance identifiers, not a claim about Git ancestry. Every later artifact phase must reverify all seven hashes before writing. Any mismatch blocks that phase until the changed source is independently reviewed and the package provenance is explicitly re-baselined under human approval.

---

## 4. Inherited decisions that are not reopened

### 4.1 Domain baseline

All `DR-01`–`DR-16` decisions are inherited exactly as approved. In particular, later artifacts must preserve the bounded Stock-controlled Article scope; explainable quantity/effect vocabulary; one Stock unit per Article; reservation, dispatch, Consumption, Return, Transfer, count/correction, reversal, traceability, deposit, Cajas, supplier-receipt, opening-position, and financial-separation boundaries.

### 4.2 UX baseline

All `UXD-01`–`UXD-12` decisions are inherited exactly as approved. Later artifacts must preserve surface ownership, hierarchical hybrid results, explicit quantity hierarchy, compact attention-first index direction, durable detail/history, bounded supplier-receipt and Transfer journeys, count/correction separation, honest critical-action/retry behavior, the `Atención` lens as a view rather than a state, responsive transformation, and partial/offline honesty.

### 4.3 Architecture baseline

All `A-01`–`A-12` decisions are inherited exactly as accepted:

- normalized relational operational identities, conceptual actionable position grain, and hybrid traceability;
- explicit reservation commitments distinct from append-only physical/disposition evidence;
- maintained server-owned projections that remain reconstructible and reconciliable from accepted evidence;
- scope-local conditional acceptance, semantic uniqueness, and linked correction/reversal evidence;
- centralized provider-neutral capability policy with Stock adapters, explicit backend multi-company enforcement, and separation between immutable domain evidence and correlated transversal audit;
- synchronous modular orchestration in one database transaction for accepted business confirmations with mandatory Stock effects; and
- dated reconciled opening positions with bounded-slice adoption and no fabricated history.

These are architecture constraints, not permission to choose their exact implementation.

### 4.4 Inherited Cajas direction

Cajas Option A remains accepted and is not reopened: explicit reservation commitments plus append-only Stock movements/transactions, with server-owned current availability projections for the approved Cajas checkpoints. This package must preserve Cajas checkpoint, partial-accounting, identified-unit, no-double-effect, atomicity, auditability, idempotency, and no-automatic-financial-effect obligations without expanding into full Box-composition Stock.

No later artifact in this package may reopen `DR-01`–`DR-16`, `UXD-01`–`UXD-12`, `A-01`–`A-12`, or Cajas Option A. A requested change requires a separate decision process, not reinterpretation inside this package.

---

## 5. In-scope documentary outcome

This change may produce exactly four serially authored planning artifacts under `knowledge/specs/STOCK-V1-SDD-001/`:

1. `PROPOSAL.md` — this bridge, provenance freeze, authorization boundary, and future planning-family map;
2. `SPEC.md` — normative, testable behavior and failure/denial scenarios derived from the frozen decisions;
3. `DESIGN.md` — technical contracts, boundaries, dependency rules, validation strategy, and stop conditions at sufficient planning depth, without implementation authority; and
4. `TASKS.md` — separately bounded future planning packages, dependencies, approval gates, ownership requirements, validation evidence, and stop/escalation rules.

Each artifact has one exclusive writer, one file, an explicit lock lifecycle, and an independent read-only verification before the next artifact may begin. Later artifacts may increase precision only within approved decisions; they may not add product rules or silently decide reserved technical details.

---

## 6. Explicit non-scope and non-decisions

This proposal and its documentary package do not select or authorize:

- final database tables, models, fields, relations, keys, constraints, indexes, enums, partitions, or storage layouts;
- migration files, migration order, seed/backfill/import behavior, opening-position creation, reconciliation execution, provider change, or production data mutation;
- exact endpoints, routes, Server Actions, commands, payloads, status codes, services, repositories, validators, queues, caches, or source files;
- final algorithms, SQL predicates, lock primitives, isolation levels, projection folds, replay/repair mechanisms, idempotency-key encodings, or transaction APIs;
- Auth provider/session architecture, productive Auth, final role names, capability identifiers, role-to-capability mappings, permission matrices, RLS policies, emergency overrides, or audit-storage details;
- exact UI routes, components, forms, breakpoints, visual implementation, or sensitive Surgery/Record, Expediente, Ficha CX, or Cirugías placement/refactor;
- full Box-composition Stock, universal traceability, detailed warehouse/bin management, procurement optimization, replenishment, costing, valuation, billing, accounting, collections, commercial, tax, or fiscal behavior;
- historical movement fabrication, global cutover, rollout, deployment, feature flags, live repair, or rollback execution; or
- implementation files, implementation commands, tests against an implementation, `APPLY`, or production changes.

If `SPEC`, `DESIGN`, or `TASKS` cannot be completed without choosing one of these reserved details, work must stop and request the applicable decision or gate.

---

## 7. Required documentary sequence and T4 boundary

The only permitted sequence is:

```text
PROPOSAL
→ independent read-only verification
→ SPEC
→ independent read-only verification
→ DESIGN
→ independent read-only verification
→ TASKS
→ independent read-only verification
→ Franco T4 approval
→ STOP
```

Rules for this sequence:

1. No artifact may be drafted before the prior artifact passes independent verification.
2. Verification must recheck source hashes, inherited decision coverage, internal consistency, authorization wording, protected gates, and absence of hidden decisions.
3. A failed verification returns only the owned artifact for a bounded documentary correction and reverification.
4. Franco T4 approval may approve the documentary execution decomposition and its future approval requests only.
5. Franco T4 approval never authorizes `APPLY`, implementation, schema, migration, Auth, permissions, Cirugías, production data work, deployment, or rollout.
6. After T4 approval, the package stops. Any future implementation family requires a new explicit dispatch, exact Task Brief, exclusive ownership, fresh path-specific preflight, all applicable gate approvals, and a separate explicit `G-APPLY` authorization.

---

## 8. Future implementation package families — planning map only

The future `TASKS.md` must organize possible implementation work into exactly the following planning families. These family names define coverage and dependency review only. They are not tasks ready for execution, do not allocate files, and do not choose an implementation.

| Family | Planning concern | Boundary retained |
| --- | --- | --- |
| `E00` | Governance, frozen provenance, environment/preflight evidence, locks, gate register, and validation matrix | Documentary/read-only until all later approvals exist; no product or technical choice |
| `E01` | Stock-controlled Article eligibility, company/deposit/custody identities, actionable position scope, and hybrid traceability | No final schema, field, identifier format, or migration choice |
| `E02` | Stock evidence, explicit reservation lifecycle, maintained projections, conditional claims, semantic uniqueness, and linked correction foundations | No final record shape, algorithm, lock, transaction API, or repair mechanism |
| `E03` | Provider-neutral authorization boundary, multi-company enforcement coverage, immutable domain evidence versus transversal audit, and anti-bypass verification | No provider, role, capability identifier/mapping, RLS, middleware, or audit-store choice |
| `E04` | Stock index, position detail, causal history, attention/read states, hybrid responsive presentation, and accessibility | No exact route, component, query contract, or visual implementation choice |
| `E05` | Supplier physical receipt, including the separately protected exceptional no-PO path | No permission owner, endpoint, persistence artifact, or production intake choice |
| `E06` | Preparation reservation/release integration and minimum approved Cajas identified-unit effects | No Cirugías placement/refactor, full Box-composition Stock, or widened Cajas behavior |
| `E07` | Remittance successful-dispatch integration and mandatory atomic Stock consequence | No endpoint/service/file ownership or transaction implementation choice |
| `E08` | Consumption and Return validation/disposition integration, partial accounting, and unresolved outcomes | No new business disposition, cardinality, or owning-flow redesign |
| `E09` | Transfer dispatch/receipt checkpoints and transit reconciliation | No one-step transfer, exact workflow host, or technical coordination mechanism choice |
| `E10` | Inventory count observation, separate correction/reversal review, causal history, and projection reconciliation controls | No direct balance editing, exact approval mapping, or repair algorithm choice |
| `E11` | Dated opening position, bounded-slice adoption, shadow/readiness/stabilization evidence, one-writer cutover controls, and routing rollback planning | No opening data creation, migration execution, production cutover, deployment, or rollback execution |

Dependencies, slices, exact task count, allowed files, commands, validation commands, rollback plans, and owners remain for future `TASKS.md` and subsequent separately approved Task Briefs. `TASKS.md` must keep each family blocked rather than presenting it as dispatched.

---

## 9. Protected gates

Every future artifact and package family must preserve the following independent gates. One gate never implies another.

| Gate | Protected boundary | Minimum effect of the gate in this package |
| --- | --- | --- |
| `G-SCHEMA` | Any final data-model or schema change | Remains blocked pending an exact schema Task Brief, reviewed design evidence, file lock, and Franco approval |
| `G-MIGRATION` | Migration, seed, import, backfill, reconciliation write, opening-position creation, provider/data change, or production data operation | Remains blocked independently from schema approval and requires its own plan, evidence, rollback, and Franco approval |
| `G-AUTH` | Auth provider/session/productive-auth behavior or identity architecture | Remains blocked; the Stock ADR does not close the controlling Auth decision |
| `G-PERMISSIONS` | Capability vocabulary, role/grant mappings, permission matrix, RLS/security enforcement, or exceptional-action authority | Remains blocked independently from Auth and requires explicit human approval |
| `G-CIRUGIAS` | Any sensitive Surgery/Record, Expediente, Ficha CX, Cirugías, hook, store, type, or related refactor/placement change | Remains blocked pending a specific Task Brief, exact scope, exclusive lock, and Franco approval |
| `G-PRODUCTION` | Productive data, cutover, deployment, rollout, live repair/reconciliation, monitoring activation, or writer-routing change | Remains blocked until prior technical gates, bounded runbook evidence, and explicit Franco go/no-go approval |
| `G-APPLY` | Any implementation or mutation phase | Remains blocked after T4; requires a separate explicit implementation dispatch and Franco approval after all applicable gates pass |

No documentary wording, family ordering, task checkbox, ADR acceptance, artifact verification, or T4 approval may be interpreted as satisfying these gates.

---

## 10. Planning constraints for later artifacts

Later artifacts must:

1. preserve company isolation, server authority, source-domain ownership, explainability, historical integrity, no-double-effect behavior, and no automatic financial effect;
2. distinguish normative behavior from illustrative Spanish UI copy and from reserved implementation details;
3. define failures, denials, stale conflicts, retries, unknown outcomes, and no-partial-success evidence without inventing mechanisms;
4. keep domain evidence distinct from transversal audit while preserving required correlation;
5. keep reservations distinct from physical/disposition effects and projections derived from accepted evidence;
6. preserve one authoritative writer per future bounded adoption slice and prohibit dual Stock truth;
7. include independent validation and regression obligations at planning level without running implementation tests during this documentary package;
8. keep exact owners/files/commands out of `PROPOSAL`, `SPEC`, and `DESIGN` unless a later approved artifact explicitly requires a non-implementation documentary ownership statement;
9. record unresolved technical questions as blocked decisions rather than silently selecting answers; and
10. stop if compliance would require any unapproved product, architecture, schema, Auth, permission, Cirugías, migration, production, or implementation decision.

---

## 11. Risks and proposal-level controls

| Risk | Documentary control |
| --- | --- |
| Closed decisions are reopened during specification | Trace every normative requirement to frozen `DR`, `UXD`, `A`, or Cajas sources and reject new alternatives |
| Planning language is mistaken for implementation authority | Repeat the no-authorization boundary in every artifact and keep all `E00`–`E11` families blocked |
| A technical detail becomes a hidden decision | Maintain explicit non-decisions and stop whenever exact tables, fields, endpoints, roles, capabilities, algorithms, or files are required |
| Schema and migration approvals are conflated | Preserve `G-SCHEMA` and `G-MIGRATION` as independent gates |
| Auth and permission work are conflated or productive Auth is implied | Preserve `G-AUTH` and `G-PERMISSIONS` independently and retain the controlling Auth block |
| Stock planning widens into sensitive Cirugías refactoring | Preserve source-domain ownership and enforce `G-CIRUGIAS` before any placement or refactor decision |
| Cajas Option A or approved checkpoints drift | Treat Cajas direction as inherited and require explicit cross-artifact traceability |
| Existing prototype, soft references, or dirty implementation paths are treated as final truth | Treat them only as future preflight evidence; require fresh path-specific checks before any dispatch |
| T4 approval is misread as APPLY approval | Require an explicit stop after T4 and a separate `G-APPLY` decision |
| Adoption planning becomes production authorization | Keep `E11` documentary and preserve `G-MIGRATION` plus `G-PRODUCTION` |

---

## 12. Proposal acceptance conditions

This proposal is acceptable for independent verification only when all of the following are true:

1. Its status is `PROPOSED — documentary execution-plan only` and its authorization effect is explicitly none.
2. All seven source paths, hashes, and approved/accepted statuses match the frozen provenance table.
3. The purpose and problem are limited to bridging approved sources into one documentary execution-plan identity.
4. `DR-01`–`DR-16`, `UXD-01`–`UXD-12`, `A-01`–`A-12`, and Cajas Option A are inherited without reopening, narrowing, or expansion.
5. Scope and non-scope clearly prohibit final tables, fields, endpoints, roles, capabilities, algorithms, and implementation files.
6. The only package artifacts are serial `PROPOSAL`, `SPEC`, `DESIGN`, and `TASKS`, each independently verified before progression.
7. The sequence ends at Franco T4 approval and explicitly states that T4 never authorizes `APPLY` or implementation.
8. Future implementation coverage is represented by exactly twelve planning families, `E00` through `E11`, with no execution-ready task, file allocation, or hidden technical choice.
9. `G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, and `G-APPLY` remain explicit, independent, and blocked.
10. Constraints, risks, stop conditions, and later-artifact obligations preserve company isolation, historical truth, source ownership, Cajas behavior, no-double-effect behavior, and financial separation.
11. Only `knowledge/specs/STOCK-V1-SDD-001/PROPOSAL.md` is created by `P01`.
12. No code, schema, Auth, permission, Cirugías, worklog, test, build, Prisma, database, browser, dependency, or Git mutation is performed.

Passing these conditions authorizes only the orchestrator to request independent read-only verification of this proposal. It does not authorize `SPEC.md` until that verification passes, and it never authorizes implementation.

---

## 13. Stop and escalation conditions

Stop and return to Franco/the orchestrator if:

- any frozen path or hash changes;
- an approved/accepted source status is contradicted;
- another writer overlaps the owned artifact;
- a later artifact needs a file outside its exact one-file ownership;
- a requirement would change any `DR`, `UXD`, `A`, or Cajas Option A decision;
- final tables, fields, endpoints, roles, capabilities, algorithms, or implementation files must be selected;
- any protected gate would need to be treated as approved by implication; or
- implementation, migration, productive access, data mutation, Cirugías work, rollout, or `APPLY` is requested without its separate authorization.

---

## 14. Proposal gate statement

`STOCK-V1-SDD-001` is proposed solely as the documentary execution-plan bridge for already approved Stock V1 decisions. It introduces no new product, architecture, security, data, UI, or implementation decision.

If this proposal passes independent verification, only serial drafting of `SPEC.md` may be requested. Every later transition remains independently verified. The package ends at Franco T4 approval, and T4 approval never authorizes `APPLY` or implementation.
