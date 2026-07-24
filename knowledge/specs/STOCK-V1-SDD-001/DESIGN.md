# Design — STOCK-V1-SDD-001

Status: **DESIGNED — documentary execution-plan only; every future implementation package BLOCKED**
Change: `STOCK-V1-SDD-001`
Owner task: `STOCK-V1-SDD-001/D01-DESIGN`
Language: Professional technical English; inherited public UI labels may remain in Spanish
Authorization effect: **None for TASKS, APPLY, implementation, schema, migration, Auth, permissions, Cirugías, production, data mutation, or protected-file changes**
Design inventory: **12 blocked future package families (`E00`–`E11`), 127 requirements, 60 scenarios, 7 independent protected gates, and an empty write set for every future implementation package**

---

## 1. Purpose, authority, and boundary

This DESIGN turns the verified `STOCK-V1-SDD-001/SPEC.md` into a documentary execution plan. It maps approved behavior to future package families, dependency and ownership rules, protected approvals, conceptual integration boundaries, validation responsibilities, rollback and observability obligations, and stop conditions.

It inherits architecture already accepted in `A-01`–`A-12` and Cajas Option A. It does not reopen those decisions and does not select their reserved implementation details. In particular, this DESIGN does not define a final table, column, endpoint, payload, status code, role, capability identifier, role mapping, algorithm, lock primitive, isolation level, route, component, source file, migration, provider, or production procedure.

The package sequence remains:

```text
verified PROPOSAL
→ verified SPEC
→ this DESIGN
→ independent read-only DESIGN verification
→ separately dispatched TASKS
→ independent read-only TASKS verification
→ Franco T4 approval
→ STOP
```

Neither this DESIGN nor later T4 approval authorizes implementation. Every future writer requires a fresh `T00` preflight, an exact Task Brief, exclusive ownership, applicable human-approved gates, and a separate explicit `G-APPLY` authorization.

---

## 2. Frozen provenance and phase preconditions

The following working-tree blobs were reverified before this file was created:

| Artifact | Required blob | Reverified blob | Result |
| --- | --- | --- | --- |
| `knowledge/specs/STOCK-V1-SDD-001/PROPOSAL.md` | `37a55267e3342fcf74128b5a597ada4aa62cf74b` | `37a55267e3342fcf74128b5a597ada4aa62cf74b` | Exact |
| `knowledge/specs/STOCK-V1-SDD-001/SPEC.md` | `a45230fec13b359dd90d5e64ad358563419f150a` | `a45230fec13b359dd90d5e64ad358563419f150a` | Exact |
| `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` | `926476e1d5e275768296329e099e32e04069224e` | `926476e1d5e275768296329e099e32e04069224e` | Exact |
| `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` | `95d8d986e7dc426b48a7b4480966a558a54d52ed` | `95d8d986e7dc426b48a7b4480966a558a54d52ed` | Exact |
| `knowledge/architecture/ADR-STOCK-CORE-PERSISTENCE.md` | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` | Exact |
| `knowledge/architecture/ADR-STOCK-EFFECTS-RESERVATIONS-PROJECTIONS.md` | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` | Exact |
| `knowledge/architecture/ADR-STOCK-AUTHORIZATION-AUDIT.md` | `82c30231d56293d5ee98bf27fe3758237d0bd495` | `82c30231d56293d5ee98bf27fe3758237d0bd495` | Exact |
| `knowledge/architecture/ADR-STOCK-OPERATIONAL-INTEGRATION-ADOPTION.md` | `8277cb1710de84fd000f3487e91b709ca8a28244` | `8277cb1710de84fd000f3487e91b709ca8a28244` | Exact |
| `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` | Exact |

Before this write, the package contained only `PROPOSAL.md` and `SPEC.md`; `DESIGN.md` was absent. The task grants exclusive write ownership of this file only. Any later hash, path, ownership, or source-status change invalidates this baseline and blocks progression until independent review and explicit human re-baselining.

---

## 3. Inherited architecture overview — not reopened

### 3.1 Core identities and actionable position

The future architecture must use normalized relational operational identities for company, Article, deposit/custody, and applicable identified physical unit. The conceptual actionable position grain is company + Article + deposit/custody + applicable traceability dimension. Article or company totals are derived compatible aggregates, never actionable replacement identities. Traceability remains hybrid: fungible quantity by default, lot/expiration where applicable, and identified-unit identity for Boxes and equipment.

This is inherited from `A-01`–`A-03`. Exact identity lifecycles, schema artifacts, key shapes, traceability equivalence, transit representation, and eligibility representation remain gated decisions.

### 3.2 Evidence, commitments, projections, concurrency, and correction

Explicit reservation commitments remain distinct from append-only physical/custody/disposition evidence. Server-owned maintained projections support current reads but remain reconstructible and reconciliable from accepted evidence. Critical fungible and identified-unit claims are conditionally accepted at scope-local authoritative boundaries. Semantic uniqueness is conceptually company + source operation + checkpoint + line/effect; transport attempt identifiers provide correlation only. Corrections and reversals append linked evidence and never rewrite accepted history.

This is inherited from `A-04`–`A-08` and Cajas Option A. Exact records, projection fold, lock/isolation mechanism, identity encoding, reconciliation query, repair mechanism, and corrective algorithm remain unselected.

### 3.3 Authorization, company isolation, evidence, and audit

Protected behavior uses a centralized provider-neutral server-side capability-policy boundary with Stock contextual adapters. Authentication, active company membership, applicable capability, resource-company consistency, and domain validity are distinct trusted checks. Every trusted entry point must use the same boundary. RLS or equivalent restrictions may only be separately approved defense in depth. Immutable Stock/domain evidence explains accepted Stock truth; correlated transversal `AuditEvent` data supplies permitted attribution and security context without replacing domain evidence.

This is inherited from `A-09`–`A-10`. Productive Auth, provider/session design, exact capability vocabulary, final role/grant mappings, exceptional-action authority, RLS policy, audit schema, redaction, retention, and denial-audit behavior remain blocked.

### 3.4 Operational transaction and adoption boundaries

For an accepted business confirmation with mandatory Stock effects, the owning-domain accepted result, immutable evidence, semantic correlation, every mandatory Stock consequence, and immediately authoritative projection consequence share one synchronous modular orchestration and one database transaction. Optional notifications, analytics, exports, email, and external integrations stay outside that critical transaction and cannot reinterpret or duplicate its outcome.

Adoption uses dated reconciled opening positions and explicit non-overlapping bounded slices. Each active slice has one authoritative Stock writer. Shadow paths are read/compare only. Projection rebuild derives from opening evidence plus accepted post-cutover evidence. Rollback means bounded routing/deployment recovery while preserving accepted truth, never deletion or concealment.

This is inherited from `A-11`–`A-12`. Exact orchestration placement, transaction API, dependency wiring, cutover key/order, opening representation, tolerances, writer-routing mechanism, deployment method, and runbook commands remain unselected.

### 3.5 Source-domain and UX ownership

Stock owns commitments, quantity/custody/disposition consequences, current projections, and causal Stock history. Articles, Preparation, Remittance, Consumption, Return, Purchases, Transfers, count/correction, and Surgery/Record Cajas retain their approved business ownership. The conceptual `/stock` surface reads operational positions and links to owners; it does not create parallel editable owner workflows. The UX remains hierarchical, causality-first, honest about freshness and failure, responsive, and WCAG 2.2 AA.

Exact routes, components, query contracts, forms, and sensitive Surgery/Record placement remain reserved.

---

## 4. Future package model and blocked state

The execution plan has exactly twelve future package families. A package family is a coverage and dependency boundary, not a dispatched task. Its current and post-T4 state is **BLOCKED**, and its current write set is **EMPTY**.

| Family | Design responsibility | Primary requirement group | Current write set | State |
| --- | --- | --- | --- | --- |
| `E00` | Governance, provenance, fresh preflight, locks, gate/evidence register, global validation matrix | `GOV-001`–`GOV-006`, `DOC-001`–`DOC-006` | `∅` | **BLOCKED** |
| `E01` | Stock eligibility; operational identities; actionable position and traceability scope | `CORE-001`–`CORE-014` | `∅` | **BLOCKED** |
| `E02` | Reservation/evidence foundations; projections; conditional claims; semantic uniqueness; correction/reversal | `EVID-001`–`EVID-017` | `∅` | **BLOCKED** |
| `E03` | Provider-neutral policy; company enforcement; evidence/audit separation; anti-bypass coverage | `AUTH-001`–`AUTH-010`, `NEG-008` | `∅` | **BLOCKED** |
| `E04` | Stock index, detail/history, state model, responsive transformation, accessibility | `UX-001`–`UX-023`, `NEG-005` | `∅` | **BLOCKED** |
| `E05` | Supplier physical receipt, including separately protected exceptional no-PO path | `FLOW-001`–`FLOW-003` | `∅` | **BLOCKED** |
| `E06` | Preparation reservation/release/replacement and minimum approved Cajas effects | `FLOW-004`–`FLOW-008`, `FLOW-030` | `∅` | **BLOCKED** |
| `E07` | Successful Remittance dispatch and shared critical-confirmation contract | `FLOW-009`–`FLOW-012`, `FLOW-025`–`FLOW-029` | `∅` | **BLOCKED** |
| `E08` | Consumption and Return validation, disposition, shared pending balance, partial Cajas accounting | `FLOW-013`–`FLOW-020` | `∅` | **BLOCKED** |
| `E09` | Transfer dispatch/receipt, transit, discrepancy, and conservation | `FLOW-021`, with `CORE-014` inherited from `E01` | `∅` | **BLOCKED** |
| `E10` | Count observation; separate correction/reversal review and projection reconciliation controls | `FLOW-022`–`FLOW-023`, reusing `EVID-015`–`EVID-017` from `E02` | `∅` | **BLOCKED** |
| `E11` | Opening position; bounded-slice adoption; shadow, reconciliation, stabilization, rollback planning | `FLOW-024`, `ADOPT-001`–`ADOPT-012` | `∅` | **BLOCKED** |

Cross-cutting negative requirements `NEG-001`–`NEG-004` and `NEG-006`–`NEG-007` constrain every applicable package and are validated by `E00`; financial neutrality additionally constrains `E05`–`E11`.

No family owns final files today. `TASKS.md`, if separately dispatched, may decompose these families but must preserve the family labels, blocked state, empty implementation write sets, dependency rules, gates, and traceability in this DESIGN.

---

## 5. Dependency DAG

### 5.1 Logical dependency graph

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

The arrows represent minimum evidence dependency, not authorization or automatic dispatch.

### 5.2 Required serial constraints

1. `E00` precedes every writer and is repeated as a fresh package-specific `T00` before each future write task.
2. `E01` precedes `E02`; evidence and projection design cannot finalize before approved identity and actionable-scope artifacts exist.
3. `E01` + `E02` + `E03` precede any mutating operational integration package (`E05`–`E10`).
4. `E06` precedes `E07` where dispatch consumes or transforms a Preparation reservation; this does not require the entire Cajas implementation to be complete when a separately approved non-Cajas slice proves independence.
5. `E07` precedes `E08` because Consumption and Return account against accepted dispatch evidence and its remaining balance.
6. `E04` may plan read-only presentation contracts earlier, but any mutating UX writer is serial after its owning server package and applicable authorization package.
7. `E11` is last. It requires implemented and independently validated candidate behavior for the selected bounded slice, plus all applicable technical and human gates; it never follows merely from documentary completion.
8. `G-SCHEMA` precedes any final schema writer; `G-MIGRATION` remains serial and independent after schema review. Schema approval does not approve migration.
9. `G-AUTH` and `G-PERMISSIONS` remain independent; productive Auth closure does not approve a permission matrix, and permission approval does not close productive Auth.
10. `G-PRODUCTION` follows all required technical gates and runbook evidence. `G-APPLY` remains required for every implementation/mutation dispatch and is never inferred from another gate.

### 5.3 Conditional parallelism

After `E00`, documentary or read-only exploration for `E01`, `E03`, and `E04` may proceed in parallel only with separate owners and no file overlap. After approved `E01`–`E03` foundations, `E05`, `E06`, `E09`, and `E10` may be candidate parallel streams only if fresh `T00` checks prove:

- disjoint exact file allowlists and no shared critical type, schema, policy, service, validator, API, or transaction chain;
- independent final validators;
- no simultaneous schema, Auth, permissions, multi-company, migration, or Cirugías writes;
- no shared source-domain confirmation path; and
- no unresolved architecture or business-rule dependency.

Otherwise they serialize. `E07` and `E08` serialize on the dispatch/accounting chain. Any `E06` Surgery/Record/Cajas placement work serializes under `G-CIRUGIAS`. `E11` never runs in parallel with another production writer or cutover/migration writer.

### 5.4 Dependency evidence required before downstream dispatch

A downstream Task Brief must cite the exact accepted upstream artifact/evidence, its hash, validator result, applicable gate approvals, and unresolved risks. A family status or completed checkbox is insufficient. Changed upstream evidence invalidates downstream preflight and requires revalidation.

---

## 6. Ownership, file categories, and lock strategy

### 6.1 One-owner rule

Every future task follows:

> one task = one accountable writer = one bounded scope = one exact write set = one validator handoff

The lock lifecycle is `reserved → editing → review → released`. A writer may not broaden its write set after `reserved`. A required additional file stops the task and returns it for a revised Task Brief and overlap review.

### 6.2 Future ownership categories — not final file lists

Implementation exploration may later discover exact paths, but a future Task Brief must assign each intended path to exactly one of these categories:

| Ownership category | Intended responsibility | Restrictions |
| --- | --- | --- |
| Governance/documentation | Package evidence, gate register, traceability, runbooks | Cannot authorize implementation or mutate product behavior |
| Persistence model | Final approved identity, evidence, reservation, projection, and integrity artifacts | Requires `G-SCHEMA`; exact paths remain undiscovered here |
| Migration/data operations | Migration, seed/import/backfill, opening, reconciliation writes, rollback data procedures | Requires `G-MIGRATION`; never bundled by implication with schema |
| Stock domain services | Stock-owned invariants, evidence, projections, conditional acceptance, correction/reversal | No frontend authority; exact service boundaries remain exploratory |
| Source-domain integration | Owner confirmation and mandatory Stock orchestration for receipt, Preparation, Remittance, Consumption, Return, Transfer, count | One owner per API/service/validator transaction chain; source ownership retained |
| Authorization/policy | Provider-neutral policy boundary, contextual adapters, company enforcement | Requires `G-AUTH` and/or `G-PERMISSIONS` as applicable; no invented mappings |
| Audit/observability | Correlation, operational metrics, alerts, reconciliation visibility | Must not replace immutable domain evidence or leak company data |
| Read/API contracts | Trusted server reads and command boundaries | Exact endpoint/Server Action choice reserved; anti-bypass coverage required |
| Stock presentation | Index, detail/history, honest states, responsive/accessibility implementation | No critical business logic or authority in components |
| Source-owned presentation | Receipt, Preparation, Remittance, Consumption, Return, Transfer, count/correction confirmations | Remains with owning workflow; `G-CIRUGIAS` applies where sensitive |
| Verification assets | DB/domain/concurrency/security/integration/UX/reconciliation validators and fixtures | Independent from production writer when required; no productive mutation |
| Production operations | Deployment, writer routing, monitoring activation, cutover/rollback execution | Requires `G-PRODUCTION` and separate `G-APPLY`; one active production writer |

These categories are exact enough for future ownership review but deliberately do not claim final paths. Exact path discovery belongs to a fresh read-only exploration and `T00` before each writer.

### 6.3 Shared and critical files

Any path classified by `AGENTS.md` as sensitive or high risk requires an explicit exclusive lock. A future discovery of shared foundational types, schema, DB bootstrap, policy utilities, common validators, domain constants, or a common API/service chain forces serialization and a named owner. No two writers may split one atomic owner/Stock transaction chain across simultaneous edits.

### 6.4 Current write-set declaration

| Scope | Authorized write set now |
| --- | --- |
| `D01-DESIGN` | `knowledge/specs/STOCK-V1-SDD-001/DESIGN.md` only |
| `E00`–`E11` implementation | `∅` |
| Schema, migrations, Auth, permissions, Cirugías, production, APPLY | `∅` |

---

## 7. Protected gate design

Each gate is independent, evidence-bearing, human-approved, and non-transitive. Approval must be recorded against an exact Task Brief, scope, source baseline, and write set. An ADR, documentary verification, dependency completion, or another gate never satisfies it implicitly.

| Gate | Trigger | Minimum evidence before human decision | Required human evidence | Current state |
| --- | --- | --- | --- | --- |
| `G-SCHEMA` | Any final model/table/field/relation/key/constraint/index/enum or schema-file write | Approved schema-specific Task Brief; exact proposed write set; identity/invariant mapping; compatibility impact; DB validation plan; rollback/forward-fix implications; exclusive lock | Franco's explicit approval naming scope and owned paths | **BLOCKED** |
| `G-MIGRATION` | Migration, seed, import, backfill, opening creation, reconciliation write, provider/data operation | Independently reviewed migration/data plan; source inventory; dry-run evidence; idempotency/restart behavior; backup/recovery and rollback plan; data owner sign-off; exact environment | Franco's explicit migration/data approval and, for productive data, go/no-go record | **BLOCKED** |
| `G-AUTH` | Provider/session/identity architecture or productive Auth behavior | Closed and approved controlling Auth decision; threat and session review; compatibility and rollback plan; exact paths/environment | Franco's explicit Auth approval | **BLOCKED** |
| `G-PERMISSIONS` | Capability vocabulary, role/grant mapping, exceptional authority, RLS/security policy, permission matrix | Reviewed action/resource inventory; least-privilege matrix; anti-bypass plan; denial/non-disclosure cases; audit sensitivity; separation from Auth | Franco's explicit security/permissions approval naming the matrix/version | **BLOCKED** |
| `G-CIRUGIAS` | Surgery/Record, Expediente, Ficha CX, Cajas placement, sensitive hooks/store/types/components | Specific Task Brief; exact paths; ownership and regression map; source-domain ownership proof; minimal-change plan; exclusive locks | Franco's explicit Cirugías/sensitive-surface approval | **BLOCKED** |
| `G-PRODUCTION` | Productive data, cutover, deployment, monitoring activation, live repair, writer routing, rollout/rollback | Passed technical validators; bounded-slice runbook; reconciled opening candidate; open-operation classification; tolerances; monitoring/alerts; last-safe-boundary and rollback evidence; operator/support readiness | Franco's explicit dated go/no-go for the exact slice/environment | **BLOCKED** |
| `G-APPLY` | Any implementation, mutation, command that writes code/config/data, or protected-file change | Fresh `T00`; exact Task Brief; all applicable gates approved; exclusive locks; commands and validators; rollback and handoff plan | Franco's explicit implementation dispatch for that task only | **BLOCKED** |

Gate evidence expires when its source hash, exact write set, environment, owner, dependency, or material risk changes. Expired evidence returns the task to `BLOCKED`; it is not grandfathered.

---

## 8. Conceptual transaction and integration boundaries

### 8.1 Critical acceptance envelope

For every applicable critical confirmation, the future implementation must preserve this conceptual order without this DESIGN selecting APIs or algorithms:

1. establish trusted actor and target-company context;
2. verify active membership, applicable approved policy decision, and resource-company consistency;
3. validate source-domain state, business rules, explicit actionable scope, freshness, and traceability;
4. establish semantic intent and reconcile any prior accepted outcome;
5. conditionally accept the affected fungible scope or identified unit at the authoritative boundary;
6. accept the owning-domain result/evidence and every mandatory Stock consequence in one database transaction;
7. accept required correlation/audit attribution and immediately authoritative projection consequences within that accepted boundary;
8. return one authoritative accepted, denied, validation-failed, conflict, or unknown-to-caller outcome; and
9. perform optional post-commit work separately, without changing the critical result.

Steps describe obligations, not a selected call graph or transaction API.

### 8.2 Owning operation boundaries

| Package | Owning confirmation | Mandatory same-transaction Stock obligation | Explicit exclusion |
| --- | --- | --- | --- |
| `E05` | Accepted physical supplier receipt | Cause-specific inbound evidence and authoritative position consequence | Purchase order/draft alone; denied no-PO path; financial effect |
| `E06` | Confirmed Preparation incorporation, replacement, or applicable release | Explicit reservation/release lifecycle and projection consequence | Browsing/provisional selection; control/re-control movement; inferred dispatch |
| `E07` | Successful Remittance issuance/approved dispatch | Dispatch evidence and transit/external-custody consequence | Failed/draft issuance; optional notification inside critical transaction |
| `E08` | Human-validated Consumption or Return disposition | Bounded consumed/available/review/damaged/missing consequence against shared dispatch remainder | Draft Return; inferred balancing; contradictory disposition |
| `E09` | Transfer dispatch or Transfer receipt | Checkpoint-specific origin/transit/destination consequence | Instant one-step move; hidden discrepancy |
| `E10` | Separately reviewed correction/reversal | Linked evidence and deterministic projection consequence | Count completion as correction; direct balance overwrite |
| `E11` | Separately authorized opening acceptance | One dated bounded opening cause and authoritative baseline projection | Historical movement fabrication; unapproved cutover |

The same all-or-nothing rule applies to Cajas minimum identified-unit effects without expanding to full Box-composition Stock. Source-domain invariants remain with their owners; Stock owns only its mandatory consequence. The orchestrator coordinates and must not absorb owner rules.

### 8.3 Failure boundaries

- Denial, company mismatch, validation failure, stale conflict, insufficient availability, incompatible unit claim, persistence failure, mandatory audit-attribution failure, or mandatory projection failure before commit leaves no partial accepted owner or Stock result.
- A lost response after commit is an unknown caller outcome. Reconciliation by semantic business identity precedes any re-execution.
- A duplicate semantic intent returns the accepted outcome without another effect. Conflicting reuse fails without rewriting evidence.
- Optional post-commit failure is observable separately and cannot roll back or duplicate the critical transaction.
- Failed post-acceptance read refresh preserves accepted evidence and presents stale/refreshing status rather than inviting blind resubmission.

---

## 9. Validation architecture

Validation is layered. Future exact frameworks, commands, fixtures, environments, and files must be selected only in separately approved Task Briefs. Every validator must produce attributable evidence tied to source hashes, environment, package, and gate.

### 9.1 Validator classes

| Validator | Responsibility | Minimum evidence |
| --- | --- | --- |
| `V-GOV` | Provenance, scope, locks, gates, non-goals, package traceability | Hash report; package inventory; lock/gate register; no-hidden-decision review; empty-write-set proof before dispatch |
| `V-DB` | Identity integrity, company scope, actionable grain, traceability continuity, constraints, projection persistence | Schema review under `G-SCHEMA`; isolated DB validation; invalid-reference and compatibility cases; no invented history |
| `V-DOM` | Domain invariants, cause semantics, quantity conservation, source ownership, correction/reversal | Requirement-level positive/negative tests; evidence and projection explanation; financial-neutrality assertions |
| `V-CONC` | Conditional acceptance, contention scope, semantic idempotency, retries, unknown outcomes | Simultaneous fungible/unit claims; changed transport IDs; conflicting reuse; repeat/reversal tests; no oversubscription/double effect |
| `V-APISEC` | Trusted entry points, identity/membership/policy/resource checks, safe denial, cross-company non-disclosure | Entry-point inventory; anti-bypass review; cross-company matrix; denied no-side-effect proof; provider-neutral contract evidence |
| `V-INT` | One transaction across owner acceptance and mandatory Stock effects | Failure injection for each mandatory stage; one-to-one source/effect correlation; optional-work separation; prior-evidence preservation |
| `V-UX` | Honest states, ownership, hierarchy, critical review, responsive transformation | State matrix; desktop/tablet/mobile evidence including `412x915`; no optimistic success; scope/freshness/partial/offline behavior |
| `V-A11Y` | WCAG 2.2 AA and operational accessibility | Keyboard/focus/announcement/name/relationship/contrast/reflow/zoom/non-color/target evidence; automated plus manual review |
| `V-REC` | Reconstruction, maintained-versus-rebuilt equality, reconciliation, bounded repair | Deterministic rebuild runs; divergence detection; unresolved-input report; safe-repeat proof; no accepted-history mutation |
| `V-CUT` | Opening, slice non-overlap, one writer, shadow, cross-boundary rule, stabilization, rollback | Slice manifest; source/effect reconciliation; writer-routing evidence; shadow no-write proof; tolerances; rollback rehearsal and go/no-go record |
| `V-OBS` | Correlation, metrics, alerts, failure visibility, audit/evidence separation | Correlation samples; dashboards/queries or equivalent evidence; alert tests; redaction/isolation review; operator runbook |
| `V-REG` | Cross-package and canonical-circuit regression | Relevant existing tests plus targeted regression map for Articles, Cajas, Preparation, Remittance, Consumption, Return, Transfers, count, and company isolation |

### 9.2 Database validation

Future `V-DB` evidence must show, as applicable:

- normalized operational identity and company-consistent relationships;
- actionable position separation across company, Article, deposit/custody, and applicable traceability;
- identified-unit exclusivity and fungible/identified-unit non-conflation;
- historical traceability continuity when current labels/configuration change;
- append-only accepted movement/disposition evidence and attributable reservation lifecycle;
- semantic uniqueness and conflicting-reuse rejection;
- linked correction/reversal integrity and bounded reversible scope;
- projection derivation without direct-balance truth; and
- isolation of fixtures and zero productive mutation unless separately authorized.

`V-DB` does not determine the schema; it validates a separately approved schema against inherited obligations.

### 9.3 Domain validation

`V-DOM` must cover controlled-Article eligibility; quantity vocabulary; availability exclusion; no double counting; origin ceilings; Transfer conservation; reservation/release distinction; cause-specific receipt/dispatch/Consumption/Return/Transfer/count/correction/opening semantics; Cajas minimum depth; immutable history; no fabricated history; and no automatic financial, billing, accounting, commercial, collection, tax, or fiscal consequence.

Each accepted consequence must be explainable by company, Article or physical identity, quantity/unit where applicable, cause, time, actor, and source context. Known owner operations must not be replaced by generic correction.

### 9.4 Concurrency, idempotency, and unknown outcomes

`V-CONC` must prove at least:

- concurrent fungible claims cannot produce oversubscription or negative eligible availability;
- concurrent identified-unit claims accept at most one compatible claimant;
- stale review cannot become accepted mutation;
- duplicate semantic intent across new request/session/tracing identities returns one accepted outcome;
- changed material intent under an accepted semantic identity conflicts;
- release cannot race into both availability and dispatch/disposition;
- partial and multi-checkpoint operations remain distinct without duplication;
- reversal retry cannot neutralize twice; and
- timeout/lost-response recovery reconciles accepted evidence before retry.

The exact contention harness and acceptance mechanism remain future choices.

### 9.5 API and security validation

`V-APISEC` must inventory every trusted route, Server Action, internal/background command, retry path, and cross-domain invocation actually selected later. For each, it must validate distinct authentication, active membership, approved capability, resource-company consistency, and domain checks; safe no-effect denial; no resource-existence leak; untrusted client/company identifiers; policy revalidation at confirmation; and equivalent policy coverage for internal calls.

It must also prove immutable domain evidence and transversal audit remain separate but correlatable. No validator may invent role labels, capabilities, mappings, or denial policy to make a test pass; missing approved security decisions block the package.

### 9.6 Integration validation

`V-INT` must inject failure before each mandatory acceptance stage and verify no partial owner/Stock outcome. It must validate accepted supplier receipt, Preparation reservation/release/replacement, Remittance dispatch, Consumption, Return, Transfer checkpoints, correction/reversal, and opening as applicable. Cajas cases include identified-unit reservation, bounded multiple dispatches, partial Return, shared pending balance, differences, replacements, re-control, no inferred control effect, and no whole-Box release while unresolved.

Optional work must be tested outside the critical transaction. A failed notification/export/email/analytics action cannot alter critical acceptance and its retry cannot duplicate the Stock effect.

### 9.7 UX, browser, responsive, and WCAG validation

`V-UX` and `V-A11Y` apply only after an authorized UI implementation and must include browser evidence. They cover:

- Article summary → deposit/custody → applicable lot/expiration or identified-unit hierarchy;
- explicit child scope for critical action;
- visible company, scope, unit, freshness, completeness, and aggregation meaning;
- `Disponible` primary with all required adjacent/non-zero buckets;
- durable detail/history and immutable linked correction/reversal presentation;
- exact inherited Cajas labels in Cajas context;
- initial loading, ready, empty, filtered empty, denied surface/action, validation error, load/action failure, stale/conflict, refreshing, partial, offline, submitting, accepted, and no-longer-applicable states;
- action-specific review/confirmation, no optimistic critical success, draft preservation, unknown-outcome reconciliation, and accepted-evidence redirect;
- desktop, tablet, and mobile transformation including representative `412x915`; and
- keyboard, visible focus, programmatic relationships and announcements, reflow/zoom, AA contrast, accessible names, non-color distinctions, and `44x44` targets or equivalent usable area.

### 9.8 Reconciliation and cutover validation

`V-REC` and `V-CUT` must validate one-to-one source confirmation/mandatory Stock consequence matching, except the explicit opening cause; deterministic projection equality; quantity and unit conservation; non-overlapping slices; shadow no-write behavior; one authoritative writer; legacy/local mutation disabled or outside active scope; explicit treatment for open and pre-date/post-confirmation cross-boundary operations; stabilization tolerances; and routing rollback that preserves accepted evidence.

No tolerance value, slice key, cutover rule, or rollout mechanism is selected here. Each requires a later approved plan. Expansion remains blocked whenever any approved tolerance is unmet.

---

## 10. Observability, shadow, and reconciliation design obligations

### 10.1 Correlation without ownership collapse

Future observability must correlate actor, company, source operation/checkpoint, semantic intent, owner evidence, mandatory Stock consequence, projection result, and permitted transversal audit. Correlation metadata cannot become business uniqueness by itself and audit cannot become Stock evidence.

### 10.2 Minimum observable conditions

Separately authorized implementations must make these conditions detectable within company-safe access:

- rejected cross-company or policy decisions without protected-resource leakage;
- stale/conflicting claims and contention outcomes;
- duplicate semantic attempts and conflicting semantic reuse;
- mandatory transaction rollback by failure class;
- unknown caller outcomes awaiting reconciliation;
- optional post-commit failures distinct from critical acceptance;
- maintained-versus-reconstructed projection divergence;
- source confirmation without matching consequence, or consequence without source/opening cause;
- unresolved dispatch, transit, review, count difference, and cross-boundary operation;
- shadow comparison differences without productive writes;
- writer-routing identity and any dual-write violation;
- stabilization tolerance breaches and paused expansion; and
- repair/rebuild/rollback execution and its attributable outcome.

Exact metric names, logs, traces, dashboards, thresholds, alert destinations, retention, and tools remain reserved. Sensitive identifiers and denial telemetry require `G-PERMISSIONS` evidence and company-safe access review.

### 10.3 Shadow mode

Shadow mode is candidate calculation and comparison only. It may read an approved bounded data set under an exact access plan, but it must not accept domain evidence, mutate productive Stock truth, activate a writer, alter owner behavior, or display accepted success to operators. A shadow discrepancy is evidence for review, not an automatic correction.

### 10.4 Reconciliation and repair

Reconciliation compares owner evidence, Stock evidence, opening cause, reservations, current projections, and traceability at the same explicit scope and effective boundary. Projection repair is reconstructive and safely repeatable; it preserves accepted evidence and exposes invalid input. If accepted facts are wrong, only a separately authorized linked correction/reversal path may change the resulting truth.

---

## 11. Rollback and recovery planning

### 11.1 Pre-acceptance rollback

Before productive opening acceptance or writer activation, a candidate slice may be abandoned because it has no productive Stock effect. Shadow artifacts remain non-authoritative evidence and must be handled under the approved data-access plan.

### 11.2 Post-acceptance recovery

After accepted opening or post-cutover effects exist, rollback must not delete, hide, rewrite, or duplicate them. Recovery options are limited conceptually to:

- pause affected critical confirmations;
- preserve readable accepted evidence and disclose current freshness/completeness;
- reconcile the bounded slice;
- rebuild a projection from accepted evidence;
- apply a separately authorized linked correction/reversal when accepted fact is wrong;
- forward-fix the implementation; or
- perform explicitly approved writer-routing/deployment recovery that preserves one authoritative path.

The exact selection and commands belong to a future approved runbook.

### 11.3 Required rollback record

Before any productive activation, the runbook must state the exact slice, effective boundary, active writer identity, last safe boundary, accepted effects since activation, open operations, reconciliation status, pause behavior, operator-visible truth, routing recovery constraints, validation after recovery, accountable owner, and Franco go/no-go evidence.

Rollback execution requires `G-PRODUCTION` and `G-APPLY`; this DESIGN authorizes neither.

---

## 12. Fresh `T00` preflight before every writer

Every future writer, including a documentary TASKS writer and each eventual implementation writer, requires a new `T00` immediately before reservation of its write lock. Prior `T00` evidence cannot be reused after source, branch/worktree, owner, path, dependency, gate, or environment change.

`T00` must record:

1. task/change identity and parent package (`E00`–`E11`);
2. exact repository/worktree and current baseline identifier;
3. hashes of `PROPOSAL.md`, `SPEC.md`, `DESIGN.md`, applicable TASKS artifact, frozen sources, and accepted upstream artifacts;
4. package directory inventory and expected artifact set;
5. exact writer identity, role, selected model, mode, and one-owner declaration;
6. exact allowed write paths and explicit forbidden paths;
7. current status/overlap evidence for every intended path and shared dependency;
8. lock state and lifecycle owner;
9. requirement/scenario rows assigned to the task;
10. upstream dependency evidence and validator results;
11. applicable gate list with recorded human approvals and evidence versions;
12. exact allowed and forbidden commands, environment, data-access level, and secret-handling boundary;
13. validation plan, independent validator, expected artifacts, rollback plan, and handoff format;
14. confirmation that no reserved product, schema, Auth, permission, Cirugías, algorithm, API, file, migration, or production decision is being inferred; and
15. stop/escalation conditions.

Any mismatch, overlap, stale approval, incomplete traceability, or need for an extra path returns the task to **BLOCKED** with an empty write set.

---

## 13. Future Task Brief template

Every future task must contain all fields below. Blank or inferred fields block dispatch.

```md
# AGENT TASK — OSSUM COR

## Task ID / Name
## Parent change and package (`E00`–`E11`)
## Objective
## Agent role
## Selected LLM
## Mode
## Human dispatcher and approval timestamp
## Fresh T00 identifier and evidence hashes
## Requirement IDs and scenario IDs owned
## Scope
## Explicit non-scope
## Upstream dependencies and accepted validator evidence
## Applicable gates (`G-*`) and exact human approval records
## Allowed files — exact paths, empty until approved
## Forbidden files
## Ownership category and lock lifecycle
## Related owners / overlap result
## Allowed commands
## Forbidden commands
## Environment and data-access boundary
## Transaction/integration boundary affected
## Security and company-isolation obligations
## Observability and audit/evidence obligations
## Validation architecture and exact required validators
## Independent reviewer/validator
## Rollback / forward-recovery plan
## Output format
## Expected handoff
## Risks and unresolved decisions
## Stop and escalate if
- provenance or upstream evidence changes
- scope or write set expands
- overlap or a shared critical chain appears
- a protected gate is absent, stale, or ambiguous
- a product/business/architecture/security decision is unclear
- migration, data mutation, destructive action, production work, or provider change is needed beyond approval
- an exact reserved implementation choice is required but unapproved
## Explicit authorization statement
This brief does not authorize any work beyond its exact approved write set and commands.
```

No Task Brief may start with a non-empty implementation write set until `T00`, all applicable gates, and explicit `G-APPLY` approval are complete.

---

## 14. Requirement and scenario traceability matrix

### 14.1 Accounting rule

The SPEC contains exactly 127 requirements:

| Requirement namespace | Count |
| --- | ---: |
| `GOV-001`–`GOV-006` | 6 |
| `CORE-001`–`CORE-014` | 14 |
| `EVID-001`–`EVID-017` | 17 |
| `AUTH-001`–`AUTH-010` | 10 |
| `FLOW-001`–`FLOW-031` | 31 |
| `UX-001`–`UX-023` | 23 |
| `ADOPT-001`–`ADOPT-012` | 12 |
| `NEG-001`–`NEG-008` | 8 |
| `DOC-001`–`DOC-006` | 6 |
| **Total** | **127** |

The SPEC contains exactly 60 balanced scenarios, `SCN-001`–`SCN-060`. The rows below account for every requirement and every scenario at least once. Cross-package reuse does not change the primary count.

### 14.2 Requirements/scenarios → package → gate → validator

| Trace group | Requirements | Scenarios | Primary package | Applicable protected gates | Primary validators |
| --- | --- | --- | --- | --- | --- |
| Governance and no-authorization | `GOV-001`–`GOV-006` | `SCN-052` | `E00` | `G-APPLY` | `V-GOV` |
| Documentary package discipline | `DOC-001`–`DOC-006` | `SCN-052` | `E00` | All gates remain independent | `V-GOV` |
| Eligibility and operational identity | `CORE-001`–`CORE-002` | `SCN-001`, `SCN-005` | `E01` | `G-SCHEMA`, `G-APPLY` | `V-DB`, `V-DOM`, `V-APISEC` |
| Actionable grain, aggregates, deposits | `CORE-003`–`CORE-005` | `SCN-002`, `SCN-033` | `E01` | `G-SCHEMA`, `G-APPLY` | `V-DB`, `V-DOM` |
| Hybrid traceability and unit exclusivity | `CORE-006`–`CORE-008` | `SCN-003`, `SCN-010` | `E01` | `G-SCHEMA`, `G-APPLY` | `V-DB`, `V-DOM`, `V-CONC` |
| Unit and quantity vocabulary | `CORE-009`–`CORE-012` | `SCN-004` | `E01` | `G-SCHEMA`, `G-APPLY` | `V-DB`, `V-DOM` |
| Origin ceiling and location conservation | `CORE-013`–`CORE-014` | `SCN-025`, `SCN-027`, `SCN-033`–`SCN-034` | `E01` with `E07`–`E09` | `G-SCHEMA`, `G-APPLY` | `V-DOM`, `V-INT`, `V-REC` |
| Reservation versus movement evidence | `EVID-001`–`EVID-003` | `SCN-008`, `SCN-012` | `E02` | `G-SCHEMA`, `G-APPLY` | `V-DB`, `V-DOM` |
| Projection derivation and reconciliation | `EVID-004`–`EVID-007` | `SCN-016`, `SCN-049` | `E02` | `G-SCHEMA`, `G-MIGRATION`, `G-APPLY` | `V-DB`, `V-REC`, `V-OBS` |
| Conditional acceptance and contention | `EVID-008`–`EVID-010` | `SCN-009`–`SCN-011` | `E02` | `G-SCHEMA`, `G-APPLY` | `V-CONC`, `V-DOM` |
| Semantic uniqueness and retry | `EVID-011`–`EVID-014` | `SCN-008`, `SCN-014`–`SCN-015` | `E02` | `G-SCHEMA`, `G-APPLY` | `V-CONC`, `V-INT` |
| Linked correction/reversal | `EVID-015`–`EVID-017` | `SCN-017`–`SCN-018`, `SCN-036` | `E02` with `E10` | `G-SCHEMA`, `G-PERMISSIONS`, `G-APPLY` | `V-DOM`, `V-CONC`, `V-INT` |
| Provider-neutral policy and entry points | `AUTH-001`–`AUTH-003` | `SCN-006` | `E03` | `G-AUTH`, `G-PERMISSIONS`, `G-APPLY` | `V-APISEC` |
| Resource consistency and safe denial | `AUTH-004`–`AUTH-008` | `SCN-005`–`SCN-006` | `E03` | `G-AUTH`, `G-PERMISSIONS`, `G-APPLY` | `V-APISEC`, `V-INT` |
| Evidence/audit separation and correlation | `AUTH-009`–`AUTH-010` | `SCN-006`, `SCN-037` | `E03` | `G-PERMISSIONS`, `G-SCHEMA`, `G-APPLY` | `V-APISEC`, `V-OBS`, `V-INT` |
| Supplier receipt | `FLOW-001`–`FLOW-003` | `SCN-019`–`SCN-021` | `E05` | `G-SCHEMA`, `G-PERMISSIONS`, `G-APPLY` | `V-DOM`, `V-APISEC`, `V-INT` |
| Preparation reservation/release/replacement | `FLOW-004`–`FLOW-007` | `SCN-007`–`SCN-013` | `E06` | `G-SCHEMA`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-APPLY` | `V-DOM`, `V-CONC`, `V-INT` |
| Preparation control neutrality | `FLOW-008` | `SCN-022` | `E06` | `G-CIRUGIAS`, `G-APPLY` | `V-DOM`, `V-INT`, `V-REG` |
| Dispatch and unresolved custody | `FLOW-009`–`FLOW-012` | `SCN-023`–`SCN-025` | `E07` | `G-SCHEMA`, `G-PERMISSIONS`, conditionally `G-CIRUGIAS`, `G-APPLY` | `V-DOM`, `V-CONC`, `V-INT` |
| Consumption | `FLOW-013`–`FLOW-014` | `SCN-026`–`SCN-027`, `SCN-030` | `E08` | `G-SCHEMA`, `G-PERMISSIONS`, conditionally `G-CIRUGIAS`, `G-APPLY` | `V-DOM`, `V-CONC`, `V-INT` |
| Return and shared partial accounting | `FLOW-015`–`FLOW-020` | `SCN-028`–`SCN-032` | `E08` | `G-SCHEMA`, `G-PERMISSIONS`, conditionally `G-CIRUGIAS`, `G-APPLY` | `V-DOM`, `V-CONC`, `V-INT` |
| Transfer checkpoints | `FLOW-021` | `SCN-033`–`SCN-034` | `E09` | `G-SCHEMA`, `G-PERMISSIONS`, `G-APPLY` | `V-DOM`, `V-INT`, `V-REC` |
| Count and separate correction | `FLOW-022`–`FLOW-023` | `SCN-035`–`SCN-036` | `E10` | `G-SCHEMA`, `G-PERMISSIONS`, `G-APPLY` | `V-DOM`, `V-APISEC`, `V-INT` |
| Opening position | `FLOW-024` | `SCN-046` | `E11` | `G-SCHEMA`, `G-MIGRATION`, `G-PERMISSIONS`, `G-PRODUCTION`, `G-APPLY` | `V-DOM`, `V-REC`, `V-CUT` |
| Atomic critical confirmation | `FLOW-025`–`FLOW-026` | `SCN-023`–`SCN-024`, `SCN-037` | `E07`, reused by `E05`–`E11` | `G-SCHEMA`, applicable domain gates, `G-APPLY` | `V-INT`, `V-CONC` |
| Unknown outcome and optional work | `FLOW-027`–`FLOW-029` | `SCN-015`, `SCN-038`–`SCN-039` | `E07`, reused by all critical packages | `G-APPLY` | `V-CONC`, `V-INT`, `V-UX` |
| Cajas minimum depth | `FLOW-030` | `SCN-025`, `SCN-030`–`SCN-032` | `E06` with `E07`–`E08` | `G-CIRUGIAS`, `G-SCHEMA`, `G-PERMISSIONS`, `G-APPLY` | `V-DOM`, `V-CONC`, `V-INT`, `V-REG` |
| Financial neutrality | `FLOW-031` | `SCN-051` | `E05`–`E11`, governed by `E00` | `G-APPLY` | `V-DOM`, `V-INT`, `V-REG` |
| Stock surface ownership | `UX-001`–`UX-002` | `SCN-053` | `E04` | conditionally `G-CIRUGIAS`, `G-APPLY` | `V-UX`, `V-REG` |
| Hierarchy and action scope | `UX-003`–`UX-004` | `SCN-002`–`SCN-003` | `E04` | `G-APPLY` | `V-UX`, `V-A11Y` |
| Scope, quantities, aggregation | `UX-005`–`UX-008` | `SCN-004`, `SCN-040`–`SCN-041`, `SCN-054` | `E04` | `G-APPLY` | `V-UX`, `V-A11Y` |
| Durable causal history | `UX-009`–`UX-011` | `SCN-016`–`SCN-018`, `SCN-055` | `E04` | `G-PERMISSIONS`, `G-APPLY` | `V-UX`, `V-APISEC`, `V-A11Y` |
| Attention and complete states | `UX-012`–`UX-013` | `SCN-040`–`SCN-043` | `E04` | `G-APPLY` | `V-UX`, `V-A11Y` |
| Critical review, confirmation, and success | `UX-014`–`UX-017` | `SCN-011`, `SCN-015`, `SCN-037`–`SCN-039` | `E04` plus owning flow package | `G-PERMISSIONS`, conditionally `G-CIRUGIAS`, `G-APPLY` | `V-UX`, `V-INT`, `V-CONC`, `V-A11Y` |
| Partial/offline honesty | `UX-018` | `SCN-041`–`SCN-042` | `E04` | `G-APPLY` | `V-UX`, `V-A11Y` |
| Responsive and mobile context | `UX-019`–`UX-020` | `SCN-044` | `E04` | `G-APPLY` | `V-UX`, `V-A11Y` |
| WCAG and target safety | `UX-021`–`UX-022` | `SCN-045`, `SCN-060` | `E04` | `G-APPLY` | `V-A11Y`, `V-UX` |
| Exact Cajas labels | `UX-023` | `SCN-056` | `E04` with `E06` | `G-CIRUGIAS`, `G-APPLY` | `V-UX`, `V-REG` |
| Explicit slices and opening boundary | `ADOPT-001`–`ADOPT-003` | `SCN-046`, `SCN-057` | `E11` | `G-MIGRATION`, `G-PRODUCTION`, `G-APPLY` | `V-REC`, `V-CUT` |
| One writer and shadow | `ADOPT-004`–`ADOPT-006` | `SCN-047`–`SCN-048` | `E11` | `G-MIGRATION`, `G-PRODUCTION`, `G-APPLY` | `V-CUT`, `V-OBS` |
| Cross-boundary and one-to-one reconciliation | `ADOPT-007`–`ADOPT-008` | `SCN-048`, `SCN-058` | `E11` | `G-MIGRATION`, `G-PRODUCTION`, `G-APPLY` | `V-REC`, `V-CUT`, `V-INT` |
| Repair and routing rollback | `ADOPT-009`–`ADOPT-010` | `SCN-049`–`SCN-050` | `E11` | `G-MIGRATION`, `G-PRODUCTION`, `G-APPLY` | `V-REC`, `V-CUT`, `V-OBS` |
| Stabilization and production boundary | `ADOPT-011`–`ADOPT-012` | `SCN-052`, `SCN-059` | `E11` | `G-PRODUCTION`, `G-APPLY` | `V-CUT`, `V-GOV`, `V-OBS` |
| No financial/warehouse/lifecycle expansion | `NEG-001`–`NEG-003` | `SCN-051` | `E00`, constraining all packages | `G-APPLY` | `V-GOV`, `V-DOM`, `V-REG` |
| No direct balance truth | `NEG-004` | `SCN-016`, `SCN-035`–`SCN-036`, `SCN-049` | `E02`, `E10`, `E11` | `G-SCHEMA`, `G-MIGRATION`, `G-APPLY` | `V-DOM`, `V-REC` |
| No source-journey duplication | `NEG-005` | `SCN-053`, `SCN-055` | `E04` | conditionally `G-CIRUGIAS`, `G-APPLY` | `V-UX`, `V-REG` |
| No hidden security decision | `NEG-006` | `SCN-006`, `SCN-021`, `SCN-052` | `E03`, governed by `E00` | `G-AUTH`, `G-PERMISSIONS`, `G-APPLY` | `V-GOV`, `V-APISEC` |
| No hidden technical decision | `NEG-007` | `SCN-052` | `E00` | Every applicable gate | `V-GOV` |
| No cross-company leakage | `NEG-008` | `SCN-005`–`SCN-006` | `E03` | `G-AUTH`, `G-PERMISSIONS`, `G-APPLY` | `V-APISEC`, `V-REG` |

### 14.3 Scenario-range completeness

For mechanical review, all scenario IDs are covered in contiguous ranges:

| Scenario range | Primary planning coverage |
| --- | --- |
| `SCN-001`–`SCN-006` | `E01`, `E03` |
| `SCN-007`–`SCN-018` | `E02`, `E06`, `E10` |
| `SCN-019`–`SCN-022` | `E05`, `E06` |
| `SCN-023`–`SCN-025` | `E07` |
| `SCN-026`–`SCN-032` | `E08` |
| `SCN-033`–`SCN-034` | `E09` |
| `SCN-035`–`SCN-036` | `E10` |
| `SCN-037`–`SCN-045` | `E03`, `E04`, `E07` cross-cutting validation |
| `SCN-046`–`SCN-050` | `E11` |
| `SCN-051`–`SCN-052` | `E00` and all-package boundaries |
| `SCN-053`–`SCN-056` | `E04`, `E06` |
| `SCN-057`–`SCN-059` | `E11` |
| `SCN-060` | `E04` |

This matrix is a planning allocation. Future TASKS must retain requirement-level and scenario-level identifiers and may split a row only if ownership and validation remain complete and non-overlapping.

---

## 15. Package exit evidence and handoff contracts

A future package cannot be called complete merely because code was written. Its exit evidence must include:

1. fresh `T00` and unchanged provenance report;
2. exact final write set and lock release record;
3. applicable gate approvals;
4. requirement/scenario coverage report with no orphan row;
5. validator results for every assigned `V-*` class;
6. no-partial/no-duplicate and company-isolation evidence where applicable;
7. observability and rollback evidence proportional to risk;
8. independent review result;
9. residual risks, unresolved decisions, and blocked downstream packages; and
10. Caveman handoff (`Done / Changed / Files / Validations / Risks / Next`).

Failure, inconclusive evidence, skipped validator, stale approval, or discovered scope expansion leaves the package **BLOCKED** and prevents downstream dispatch.

---

## 16. Stop and escalation rules

Stop immediately and return to Franco/the orchestrator if:

- a frozen path, hash, approval status, or governing source changes;
- another writer overlaps an owned or shared critical path;
- a task needs any file or command outside its exact brief;
- an upstream dependency or validator is missing, failed, stale, or ambiguous;
- a requirement would reopen, narrow, or expand `DR-01`–`DR-16`, `UXD-01`–`UXD-12`, `A-01`–`A-12`, or Cajas Option A;
- a final table, column, endpoint, role, capability, mapping, algorithm, lock/isolation primitive, route, component, migration, provider, cutover rule, tolerance, or source file must be selected without approval;
- a package would create a second Stock writer or split one mandatory owner/Stock outcome;
- Auth, permissions, multi-company, schema, migration, Cirugías, productive data, deployment, rollout, repair, rollback, or APPLY would be approved by implication;
- cross-company safety, historical truth, source ownership, evidence/audit separation, no-double-effect behavior, or financial neutrality cannot be proven; or
- a destructive or productive operation is requested without exact human go/no-go evidence.

Stopping preserves an empty write set for the blocked package. No workaround, placeholder decision, prototype convention, or operator convention may substitute for approval.

---

## 17. Design acceptance conditions

This DESIGN is ready only for independent read-only verification when all of the following remain true:

1. Proposal hash is `37a55267e3342fcf74128b5a597ada4aa62cf74b`, SPEC hash is `a45230fec13b359dd90d5e64ad358563419f150a`, and all seven frozen source hashes match §2.
2. The package contained only PROPOSAL and SPEC before this DESIGN write, and only DESIGN is created by D01.
3. The architecture overview inherits `A-01`–`A-12` and Cajas Option A without reopening or extending them.
4. Exactly `E00`–`E11` are defined, all remain **BLOCKED**, and every future implementation write set is `∅`.
5. The DAG, serial constraints, conditional parallelism, and one-owner/one-scope/one-write-set rule are coherent.
6. Ownership categories are defined without claiming final implementation paths.
7. `G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, and `G-APPLY` are explicit, independent, evidence-bearing, human-approved gates and remain blocked.
8. A-11 transaction boundaries and A-12 adoption boundaries are planned conceptually without choosing APIs, files, algorithms, or production procedures.
9. `V-GOV`, `V-DB`, `V-DOM`, `V-CONC`, `V-APISEC`, `V-INT`, `V-UX`, `V-A11Y`, `V-REC`, `V-CUT`, `V-OBS`, and `V-REG` cover future validation architecture.
10. All 127 requirements and all 60 scenarios are accounted for through package/gate/validator traceability.
11. Fresh `T00` is mandatory before every writer, and the future Task Brief template contains ownership, provenance, scope, gates, commands, validation, rollback, handoff, and stop fields.
12. Rollback, observability, shadow, reconciliation, one-writer cutover, stabilization, and escalation obligations preserve accepted evidence and prohibit fabricated history.
13. No hidden schema, API, Auth, permission, Cirugías, algorithm, file, migration, production, or rollout decision is introduced.
14. No tests, build, Prisma, database, browser, install, Git mutation, implementation, or other repository write is performed by D01.

Passing these conditions authorizes only independent read-only verification of this DESIGN. It does not authorize `TASKS.md` automatically, and it never authorizes implementation or `APPLY`.

---

## 18. Final gate statement

`STOCK-V1-SDD-001` remains a documentary execution-plan package. This DESIGN maps verified requirements to future blocked packages and validators while preserving all accepted product and architecture boundaries.

Every `E00`–`E11` package has state **BLOCKED** and write set `∅`. Every protected gate is **BLOCKED**. No implementation task is dispatched, no schema/Auth/permission/Cirugías/production choice is approved, no `TASKS.md` is authorized automatically, and `G-APPLY` remains unsatisfied.
