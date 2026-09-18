# Proposal — STOCK-V1-E01-SCHEMA-DESIGN-001

## 1. Metadata and authorization boundary

- **Status:** APPROVED AND CLOSED — proposal decisions approved by Franco on 2026-07-20
- **Task:** `STOCK-V1-E01-SCHEMA-DESIGN-001/P01-APPROVAL-CLOSE`
- **Package:** `STOCK-V1-E01-SCHEMA-DESIGN-001`
- **Date:** 2026-07-20
- **Owner:** Backend/Data Architect — Stock E01
- **Selected model:** `openai/gpt-5.6-sol`
- **Approver:** Franco
- **Approval date:** 2026-07-20
- **Language:** Professional technical English
- **Authorization effect:** None
- **Current write authority:** This proposal file only
- **Implementation write set:** `∅`
- **Ownership lifecycle:** `reserved → editing → review → released`

This artifact closes the isolated documentary proposal and its nine proposal-level decisions for the E01 schema-design package. It does not select a final schema and does not authorize schema edits, migrations, database work, implementation, commands, SPEC, or progression to another artifact. Every downstream artifact and protected gate remains blocked until its own evidence and explicit approval exist.

## 2. Purpose, problem, and need for isolation

E01 must eventually translate the approved Stock V1 domain, UX, and architecture directions into a reviewable persistence design for Stock-controlled Article eligibility, company-scoped identities, deposits and custody, actionable position scope, hybrid traceability, quantity semantics, compatibility, and the opening boundary.

The current repository is not final Stock truth. It combines a modified local Prisma schema, a candidate chain of untracked migrations, existing soft references, backend-backed operational slices, and prototype/local Stock behavior. Treating any one of those as the final model would risk hidden business decisions, fabricated history, cross-company ambiguity, or accidental authorization of implementation.

An isolated package is therefore required to:

1. preserve the approved decisions without reopening them;
2. separate schema design from schema application, migration design, and production adoption;
3. make every proposal-level business or architecture decision visible, reviewable, and explicitly approved by Franco;
4. prevent current repository shape from becoming authority by inertia;
5. provide independent DB/domain and governance review before each approval boundary; and
6. keep E02 and all operational integrations blocked until E01 has separately approved evidence.

## 3. Authority hierarchy and frozen governing evidence

Authority is applied in this order:

1. current repository governance and Franco's explicit approval boundaries;
2. the approved Stock domain baseline (`DR-01`–`DR-16`);
3. the approved Stock UX baseline (`UXD-01`–`UXD-12`);
4. the accepted Stock architecture baseline (`A-01`–`A-12`);
5. accepted Cajas Option A for Stock transactions;
6. the approved and closed `STOCK-V1-SDD-001` planning chain; and
7. the Candidate Local Planning Baseline Manifest v1 as read-only planning evidence only.

Fresh T00 immediately before creation recorded branch `master`, HEAD `4a25cf63a1dd8ddd2696f0d6601ad078cef5e37e`, absent target and package directory, absent `.git/index.lock`, and the following exact working-tree blobs:

| Governing artifact | Frozen Git blob |
| --- | --- |
| `knowledge/specs/STOCK-V1-SDD-001/PROPOSAL.md` | `37a55267e3342fcf74128b5a597ada4aa62cf74b` |
| `knowledge/specs/STOCK-V1-SDD-001/SPEC.md` | `a45230fec13b359dd90d5e64ad358563419f150a` |
| `knowledge/specs/STOCK-V1-SDD-001/DESIGN.md` | `457d0eb2f7222b3c45aa3fb7752dc962d7344c03` |
| `knowledge/specs/STOCK-V1-SDD-001/TASKS.md` | `d4810235020b429a338ca6a867469a3cbbca1699` |
| `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` | `926476e1d5e275768296329e099e32e04069224e` |
| `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` | `95d8d986e7dc426b48a7b4480966a558a54d52ed` |
| `knowledge/architecture/ADR-STOCK-CORE-PERSISTENCE.md` | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` |
| `knowledge/architecture/ADR-STOCK-EFFECTS-RESERVATIONS-PROJECTIONS.md` | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` |
| `knowledge/architecture/ADR-STOCK-AUTHORIZATION-AUDIT.md` | `82c30231d56293d5ee98bf27fe3758237d0bd495` |
| `knowledge/architecture/ADR-STOCK-OPERATIONAL-INTEGRATION-ADOPTION.md` | `8277cb1710de84fd000f3487e91b709ca8a28244` |
| `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` |

Fresh approval-close T00 reverified the same branch, HEAD, governing blobs, and Candidate Local Planning Baseline Manifest v1, with this proposal at expected pre-write blob `a549d001222dbffe64245af9a7b4fe5f52653c63`, no visible overlap, and no `.git/index.lock`.

Any change to a frozen source, approval status, package inventory, owner, branch/worktree, or material scope makes this evidence stale. Work must stop and return to fresh T00, independent review, and explicit human re-baselining. Dependency or review completion never grants authority by implication.

## 4. Inherited approved decisions — closed and not reopened

This package inherits all approved decisions exactly as governing constraints:

- **`DR-01`–`DR-16`:** Stock-controlled Articles only; approved quantity vocabulary; one Stock unit per Article with configurable fractions and no general conversion engine; explicit reservation/release and no oversubscription; dispatch/transit, Consumption, Return, Transfer, count/correction, linked reversal, hybrid traceability, multiple deposits plus transit, bounded Cajas inclusion, receipt boundary, dated reconciled opening position, and financial separation.
- **`UXD-01`–`UXD-12`:** the approved information architecture, hierarchical hybrid position presentation, quantity/status hierarchy, durable detail/history, contextual source ownership, complete state semantics, critical-action review and retry behavior, responsive transformation, WCAG 2.2 AA expectations, and inherited Cajas labels and placement boundaries.
- **`A-01`–`A-12`:** normalized operational identities; conceptual actionable grain by company, Article, deposit/custody, and applicable traceability; hybrid traceability; explicit reservations separate from append-only physical/disposition evidence; maintained reconstructible projections; conditional atomic claims; semantic uniqueness; linked correction/reversal; provider-neutral capability boundary; explicit multi-company enforcement and evidence/audit separation; synchronous one-transaction critical integration; and dated reconciled opening positions with bounded-slice adoption.
- **Cajas Option A:** explicit reservation commitments plus append-only Stock transactions with server-owned current availability projections.

These decisions are inputs, not alternatives. This proposal must not narrow, broaden, rename, reinterpret, or replace them. Exact persistence artifacts remain undecided.

## 5. Candidate Local Planning Baseline Manifest v1

The candidate baseline is an indivisible, hash-pinned, read-only planning source. It is not live database truth, migration authority, proof of applied migrations, proof of replayability, or approval of any current shape as the final Stock schema.

| Candidate artifact | Frozen Git blob |
| --- | --- |
| `prisma/schema.prisma` | `6678c6fb9751af53bcd005c5e28301457c7fbcdd` |
| `prisma/migrations/20260629110404_add_seguimiento_entry/migration.sql` | `b581f601de5a7a4f6202802ce49b0c2f016b38cf` |
| `prisma/migrations/20260701142201_add_digital_receipts/migration.sql` | `13303a3441dc05f0a3bf21141ab95f515a3beb51` |
| `prisma/migrations/20260703113000_add_user_module_view_preference_history/migration.sql` | `4a912a81d594cbf7a2946f1a319356b4312df7da` |
| `prisma/migrations/20260703133500_add_internal_notifications_mentions/migration.sql` | `103ac42339500283b9b44a1a6f482773e45cbed4` |
| `prisma/migrations/20260707091809_add_remito_unificado/migration.sql` | `c9abfdd7e5e5c0bd47d4a1eacae0788d8e5525e6` |
| `prisma/migrations/20260707163042_add_consumo_devolucion/migration.sql` | `f52b13783b210ba117249cac1d6aadb125adcb82` |
| `prisma/migrations/20260707173000_add_presupuesto_core/migration.sql` | `91160e74ca1f9cf90378382042f33b8c441f912b` |
| `prisma/migrations/20260707192335_rename_internal_notification_index/migration.sql` | `65ae443a50cd0ee9608b27177ef647fd452f5d40` |
| `prisma/migrations/20260707193000_add_invoice_payment_core/migration.sql` | `6b22d04a196715be7aa098cb954a4d72df1b1322` |
| `prisma/migrations/20260708014500_add_surgery_archive_fields/migration.sql` | `96f9892bb005c3578b049f5e695cf37c9fcd3e58` |
| `prisma/migrations/20260714215000_add_item_trace_lot_expiration/migration.sql` | `229d28a6224cafa114cfb68c5c59fe7f346c4cd6` |

The manifest contains exactly one schema blob and eleven candidate migration blobs. If any blob, path, count, ordering evidence, tracked/untracked state, branch/worktree, or relevant upstream source changes, the complete manifest becomes stale. No member may be silently substituted, omitted, or refreshed in isolation. A new read-only verification and Franco-approved re-baseline are required before further documentary use.

No claim is made here about Prisma validation/generation, clean replay, actual database state, migration application history, drift, data quality, compatibility, or production readiness.

## 6. Cajas provenance disposition

The historical Cajas blob `5f470c58113c8990ea8bd83aaa811730f9417a55` is retained as unverifiable provenance only because earlier Stock ADR references recorded it. It is not the current source hash and cannot govern this package.

The current authoritative working-tree source for `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` is `4e0bab03137a51d8dede83ee2e68b8c3d6001bef`. Its accepted Option A is inherited without reopening. The provenance difference authorizes neither reconciliation nor file modification.

## 7. Approved D-01–D-07 package decision register

Franco approved the following seven package-governance decisions before this proposal was created:

| ID | Approved decision | Fixed disposition |
| --- | --- | --- |
| `D-01` | Owner and model | Backend/Data Architect — Stock E01 using `openai/gpt-5.6-sol`. |
| `D-02` | Independent reviewers | One DB/domain reviewer and one SDD/governance reviewer, both read-only and no-fix; reviewers do not inherit writer authority. |
| `D-03` | Isolated package and chain | Use `knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/` and progress only through separately approved `PROPOSAL.md`, `SPEC.md`, `DESIGN.md`, and `TASKS.md`. |
| `D-04` | Baseline treatment | Use Candidate Local Planning Baseline Manifest v1 only as an indivisible hash-pinned read-only planning source, subject to complete staleness/re-baseline rules. |
| `D-05` | Cajas disposition | Treat `5f470c…` as unverifiable historical provenance only; use current `4e0bab…` as the governing Cajas source; do not reopen Option A. |
| `D-06` | Exclusions | Keep schema, migrations, seed, DB, Auth/permissions/RLS, Cirugías, APIs/services/validators/UI, shared types/store, worklog, dependencies, production, and implementation outside this proposal. |
| `D-07` | Decision boundary | The proposal may frame later schema questions but may not choose a final model, table, field, relation, constraint, index, enum, migration, implementation, or protected-gate outcome. |

These rows govern package procedure only. They are not `G-SCHEMA`, implementation approval, or a substitute for the approved proposal baseline in §17.

## 8. In scope

This proposal includes only:

1. package identity, authority, provenance, and authorization boundaries;
2. inherited approved decision inventory;
3. candidate-baseline treatment and staleness rules;
4. approved proposal-level schema decision families that a separately authorized SPEC must translate into requirements;
5. alternatives/recommendation discipline without selecting final schema artifacts;
6. sequential documentary chain, reviewers, gates, and stop conditions;
7. acceptance criteria, evidence expectations, and risks; and
8. the explicit `U-01`–`U-09` baseline approved by Franco, without dispatching SPEC.

## 9. Explicit exclusions and non-scope

This proposal does not select, modify, authorize, or execute:

- `prisma/schema.prisma`, any model, table, field, relation, key, constraint, index, enum, mapping, or generated client;
- any migration, migration SQL, migration lock, seed, import, backfill, bootstrap, opening-position creation, reconciliation write, database command, provider change, environment, secret, or productive data access;
- Auth provider/session behavior, permissions, capabilities, role mappings, RLS, security implementation, or audit persistence;
- Cirugías, Surgery/Record, Expediente, Ficha CX, Cajas workflow, Preparation, Remittance, Consumption, Return, or other owning-flow behavior;
- APIs, routes, Server Actions, services, repositories, validators, integrations, queues, caches, jobs, or transaction implementation;
- UI, components, forms, browser behavior, responsive implementation, or accessibility implementation;
- shared/global types, Zustand/store, localStorage, mocks, or prototype state;
- worklog, handoff files, dependencies, package installation, build, tests, typecheck, Prisma commands, network access, Git mutation, deployment, production, or APPLY;
- costing, valuation, prices as Stock truth, billing, accounting, collection, commercial, tax, fiscal, replenishment, or purchasing optimization; or
- automatic progression to SPEC, DESIGN, TASKS, schema work, migration work, E02, or any implementation package.

Every path other than this proposal remains read-only or forbidden under the originating Task Brief.

## 10. Approved proposal baseline and future SPEC obligations

A separately authorized SPEC must translate the following approved proposal baseline into testable requirements without treating the current schema or this proposal as a selection of models, tables, fields, relations, constraints, indexes, enums, migrations, storage, or algorithms:

### 10.1 Article and Stock eligibility

Preserve one shared Article identity and a distinct company-specific Stock eligibility/applicability decision. SPEC must define lifecycle, company applicability, unit/fraction policy, traceability applicability, and historical interpretation without assuming that current Article-like fields or soft codes establish this boundary.

### 10.2 Company scope and integrity

Company-specific Stock eligibility, actionable scope, and every protected Stock reference must remain explicit and enforceable without redefining the approved shared Article identity or turning shared catalog identity into shared company Stock.

### 10.3 Deposit, custody, and transit

Deposit, transit, and external custody are distinct business concepts. SPEC must preserve their different lifecycle and conservation meanings while keeping detailed internal-location expansion outside V1. This distinction does not select separate or shared persistence structures.

### 10.4 Actionable position grain

Define how the approved company + Article + deposit/custody + applicable traceability grain can be represented without converting the UX hierarchy into persistence ownership or allowing Article-level aggregates to become mutable truth.

### 10.5 Hybrid traceability lifecycle

For lot-managed Stock, business lot equivalence is scoped by company + Article + normalized business lot code. An expiration discrepancy blocks automatic equivalence and requires linked review/correction evidence; it must not silently split, merge, overwrite, or normalize accepted history. Identified Boxes/equipment retain stable identified-unit history. Configuration changes apply prospectively only when the affected unit has no pending reservation, assignment, custody, or disposition. SPEC must preserve fungible, conditional lot/expiration, and identified-unit lifecycles without selecting exact traceability artifacts.

### 10.6 Soft-reference compatibility

Every existing soft Article, Box, lot, serial, document, or operation reference must receive exactly one source-domain-owned compatibility disposition: **deterministically mappable**, **descriptive snapshot only**, **unresolved legacy**, or **incompatible/rejected**. Automation may collect or propose evidence only; it cannot accept a mapping or change the disposition. No historical relationship may be invented, and coexistence must not create dual Stock truth.

### 10.7 Quantities and conservation

Each Stock-controlled Article has an approved decimal scale from 0 through 4. Arithmetic and comparisons are exact decimal operations at the Article's approved scale; inputs with excess precision are rejected, and critical operations never round implicitly. SPEC must also express conservation by checkpoint family: opening and accepted receipt establish accountable scope; reservation/release reclassify availability without changing physical company quantity; dispatch transfers accountable quantity into transit/external custody; Consumption and Return allocate each shared dispatched remainder exactly once; Transfer dispatch/receipt conserves company total through transit; count observation has no Stock effect; and correction/reversal changes truth only through bounded linked evidence. These rules must preserve non-negative eligible availability, position compatibility, identified-unit exclusivity, and no double counting without choosing E02 storage, projection folds, or algorithms.

### 10.8 Opening boundary

The accepted confirmation checkpoint governs the Stock effect prospectively. An operation created before the effective opening boundary but accepted after it produces its approved post-boundary effect at acceptance and is never backdated into pre-boundary Stock history. Unresolved legacy references are excluded from operational Stock immediately and retained read-only according to the owning source domain's retention policy. SPEC must preserve one dated reconciled opening position, post-boundary evidence, and explicit cross-boundary behavior without creating opening data, choosing a production slice, or authorizing historical backfill.

## 11. Alternatives and recommendation policy

The proposal phase identified decision questions, option families, drivers, incompatibilities, and evidence requirements. Franco approved the proposal-level baseline in §17. This closure still does not designate a final schema recommendation.

If separately dispatched, SPEC must treat §17 as accepted input and may not reopen it by implication. DESIGN may compare concrete schema alternatives only within a separately approved SPEC and may recommend a direction for Franco; it cannot accept that recommendation on Franco's behalf. No artifact may use implementation convenience, current Prisma shape, prototype behavior, or reviewer opinion as silent approval. Approval and closure of this proposal do not dispatch or authorize SPEC.

## 12. Sequential documentary and approval chain

The only permitted chain is:

```text
PROPOSAL
→ independent read-only/no-fix review
→ Franco approval
→ SPEC
→ independent read-only/no-fix review
→ Franco approval
→ DESIGN
→ independent DB/domain read-only/no-fix review
→ independent SDD/governance read-only/no-fix review
→ Franco approval
→ TASKS
→ independent readiness review
→ Franco decision on G-SCHEMA
```

Each arrow is a stop boundary. No phase starts automatically. Review confirms evidence only; it cannot fix the writer's artifact, approve for Franco, dispatch the next phase, or satisfy any protected gate. `TASKS` and readiness may request `G-SCHEMA`; they cannot grant it.

## 13. Protected gates and non-transitivity

All protected gates are separate, evidence-bearing, scope-specific, expiring, human-approved, and currently blocked:

| Gate | Controls | Current effect |
| --- | --- | --- |
| `G-SCHEMA` | Final model/table/field/relation/key/constraint/index/enum choices and any schema-file write | Blocked; this proposal supplies no decision or write authority. |
| `G-MIGRATION` | Migration, seed/import/backfill, bootstrap/opening/reconciliation write, provider or data operation | Blocked and serial after separately approved schema evidence. |
| `G-AUTH` | Provider/session/identity architecture or productive Auth behavior | Blocked and independent of E01 schema design. |
| `G-PERMISSIONS` | Capability vocabulary, grants/roles, exceptional authority, RLS/security policy, permission matrix | Blocked; no role or mapping is invented here. |
| `G-CIRUGIAS` | Surgery/Record, Expediente, Ficha CX, Cajas placement, sensitive hooks/store/types/components | Blocked; no sensitive-flow work is in E01 proposal scope. |
| `G-PRODUCTION` | Productive data, opening, deployment, cutover, live repair, writer routing, rollout/rollback | Blocked; requires a dated go/no-go for an exact slice/environment. |
| `G-APPLY` | Any implementation or mutation of code, configuration, data, or protected files | Blocked; requires a separate post-readiness Task Brief and explicit Franco dispatch. |

Approval of one gate never approves another. Approval of PROPOSAL, SPEC, DESIGN, TASKS, a review, a dependency, or `G-SCHEMA` does not imply `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, or `G-APPLY`. A changed hash, scope, owner, path, environment, command set, dependency, or material risk expires the affected evidence and approval.

## 14. Required reviewers and no-fix contract

### DB/domain reviewer

An independent reviewer must verify inherited decision fidelity, identity and grain questions, company integrity, traceability lifecycle, quantity/conservation obligations, compatibility risks, and opening-boundary honesty. The reviewer is read-only and no-fix.

### SDD/governance reviewer

A separate independent reviewer must verify provenance, scope, package chain, decision visibility, non-transitive gates, authorization language, exclusions, and absence of hidden implementation choices. The reviewer is read-only and no-fix.

Reviewers must report `PASS`, `PASS WITH CONCERNS`, or `FAIL` with evidence. They must not edit this artifact, alter an approved decision, broaden scope, reinterpret Franco's approval, or authorize the next phase. Any required correction returns to the writer under a new exact authorization and fresh T00.

## 15. Acceptance criteria and required evidence

This proposal is approved and closed only while:

1. the original proposal task created exactly this file and this approval-close task modified only this file;
2. status records `APPROVED AND CLOSED`, Franco, 2026-07-20, and authorization effect `None`;
3. all frozen governing and candidate-baseline hashes are recorded exactly;
4. the candidate baseline contains exactly one schema blob and eleven migration blobs and is explicitly not live truth;
5. `5f470c…` and `4e0bab…` have the distinct Cajas provenance dispositions stated in §6;
6. `DR-01`–`DR-16`, `UXD-01`–`UXD-12`, `A-01`–`A-12`, and Cajas Option A remain inherited and closed;
7. `D-01`–`D-07` match Franco's approved package-governance slate;
8. scope and exclusions preserve the exact proposal-only boundary;
9. all eight schema decision families express the approved `U-01`–`U-09` baseline without selecting a final artifact or implementation;
10. the sequential chain, two reviewer classes, no-fix rule, and Franco boundaries are explicit;
11. all seven protected gates remain separate, blocked, and non-transitive;
12. exactly nine rows, `U-01` through `U-09`, are visibly approved by Franco with no unresolved alternative or ambiguity;
13. no final model, table, field, relation, key, constraint, index, enum, migration, algorithm, command, or implementation choice appears; and
14. final validation reports section count, approved-decision count, final Git blob, and whitespace result.

Evidence for review consists of this artifact, the frozen hash tables, the exact created-path inventory, a scoped diff, a whitespace check, and the independent reviewers' reports. Tests, build, typecheck, Prisma, database, network, and production evidence are neither required nor authorized for this phase.

## 16. Risks and mandatory stop conditions

| Risk | Proposal control |
| --- | --- |
| Current Prisma shape becomes final by inertia | Baseline is read-only planning evidence, never authority or recommendation. |
| Existing soft references become physical Stock truth | Require compatibility classification and prohibit invented relationships. |
| Company/catalog ownership is silently reinterpreted | Preserve shared Article identity plus company-specific Stock eligibility exactly as approved. |
| UX hierarchy becomes schema hierarchy | Treat UX presentation and persistence grain as distinct concerns. |
| Transit/custody is collapsed into a normal deposit | Preserve distinct deposit, transit, and external-custody concepts in future requirements. |
| Hybrid traceability reinterprets accepted history | Apply approved equivalence, discrepancy-review, stable-history, and prospective-change rules. |
| Quantity views double-count custody or disposition | Apply approved exact-decimal and checkpoint-family conservation obligations before design. |
| Opening adoption fabricates history | Preserve the dated reconciled boundary and prohibit backfill by inference. |
| Cajas Option A is reopened or its old hash governs | Inherit current accepted source and retain the old hash as provenance only. |
| Documentary approval is mistaken for implementation approval | Repeat empty implementation write set and separate all protected gates. |

Stop immediately if any frozen hash or source status drifts; target overlap appears; another path, command, dependency, or environment is needed; a governing source conflicts; an inherited decision would be reopened; a reviewer attempts a fix; or a new business, architecture, schema, migration, Auth, permission, Cirugías, production, or implementation choice is required. Stopping preserves all downstream states as blocked and creates no substitute assumption.

## 17. Approved proposal decision register — Franco, 2026-07-20

Franco approved `U-01`–`U-09` exactly according to the reviewed slate on 2026-07-20, with the recorded clarifications for source-domain ownership, decimal scale, and source-domain retention. These decisions are closed proposal inputs. They contain no remaining option or implied implementation selection.

| ID | Approved decision | Fixed baseline and boundary |
| --- | --- | --- |
| `U-01` | Shared Article identity plus company-specific Stock eligibility/applicability. | Preserve normalized shared Article identity, explicit company Stock scope, and `DR-01`; do not redesign the catalog by implication. **APPROVED by Franco — 2026-07-20.** |
| `U-02` | Deposit, transit, and external custody are distinct business concepts. | Preserve multiple deposits plus transit, distinct custody meanings, and no detailed internal-location expansion; no persistence structure is selected. **APPROVED by Franco — 2026-07-20.** |
| `U-03` | Lot equivalence is company + Article + normalized business lot code. | Any expiration discrepancy blocks automatic equivalence and requires linked review/correction evidence; accepted history is never silently merged, split, or overwritten. **APPROVED by Franco — 2026-07-20.** |
| `U-04` | Identified-unit history is stable; configuration changes are prospective. | A change is allowed only when no reservation, assignment, custody, or disposition is pending; preserve Cajas Option A and avoid full composition Stock expansion. **APPROVED by Franco — 2026-07-20.** |
| `U-05` | Every soft-reference family receives one of four compatibility dispositions: deterministically mappable, descriptive snapshot only, unresolved legacy, or incompatible/rejected. | The source domain owns the disposition. Automation is evidence-only and cannot accept mappings; no invented identity, fabricated history, or dual Stock truth is allowed. **APPROVED by Franco — 2026-07-20.** |
| `U-06` | Each Article has an approved decimal scale from 0 through 4; arithmetic is exact decimal. | Reject excess precision and prohibit implicit rounding in critical operations; preserve one Stock unit per Article and no general conversion engine. **APPROVED by Franco — 2026-07-20.** |
| `U-07` | Conservation is defined by checkpoint family. | Opening/receipt establish accountable scope; reserve/release reclassify availability without changing physical company quantity; dispatch moves accountable quantity to transit/external custody; Consumption/Return allocate each shared dispatched remainder once; Transfer conserves company total through transit; count is observational; correction/reversal requires bounded linked evidence. E02 storage, projection folds, and algorithms remain unselected. **APPROVED by Franco — 2026-07-20.** |
| `U-08` | The accepted confirmation checkpoint governs the post-boundary Stock effect prospectively. | A pre-boundary-created operation accepted after the boundary is effective at acceptance and is never backdated; preserve dated opening truth and prohibit invented history. **APPROVED by Franco — 2026-07-20.** |
| `U-09` | Unresolved legacy is excluded from operational Stock immediately and retained read-only under the owning source domain's retention policy. | Preserve one authoritative Stock truth; unresolved legacy cannot remain actionable or become a parallel writer. **APPROVED by Franco — 2026-07-20.** |

**Approved proposal decision count:** 9. **Unresolved proposal decision count:** 0.

This approval closes the proposal decision register only. SPEC remains blocked and undispatched; any future SPEC requires its own exact Task Brief, fresh T00, exclusive ownership, independent review, and explicit Franco authorization. Reviewers may identify omissions or conflicts but may not revise these approved rows.

## 18. Explicit no-authorization statement

Creation, review, approval, or closure of this proposal authorizes no SPEC, schema, migration, seed, database access, data change, Auth, permission, RLS, Cirugías/Expediente/Cajas workflow change, API, service, validator, UI, shared type/store change, dependency, command, implementation, production action, or APPLY.

It does not satisfy `G-SCHEMA` or any other gate; it does not dispatch SPEC; it does not unblock E02 or an operational package; and it does not make the Candidate Local Planning Baseline Manifest v1 live truth. The implementation write set remains `∅` and every downstream artifact and protected gate remains blocked pending its own exact Task Brief, fresh T00, exclusive ownership, independent evidence, and explicit Franco approval.
