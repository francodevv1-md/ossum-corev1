# Specification — STOCK-V1-E01-SCHEMA-DESIGN-001

## 1. Metadata and authority boundary

- **Status:** SPECIFIED — documentary requirements only; pending independent review and Franco approval
- **Task:** `STOCK-V1-E01-SCHEMA-DESIGN-001/S01-SPEC`
- **Package:** `STOCK-V1-E01-SCHEMA-DESIGN-001`
- **Date:** 2026-07-20
- **Owner:** Backend/Data Architecture Specification Writer — Stock E01
- **Selected model:** `openai/gpt-5.6-sol`
- **Language:** Professional technical English
- **Normative terms:** **MUST** and **MUST NOT** express verifiable obligations inside the approved baseline; they grant no implementation authority.
- **Authorization effect:** None
- **Current write authority:** This specification file only
- **Implementation write set:** `∅`
- **Ownership lifecycle:** `reserved → editing → review → released`

This specification translates the approved E01 proposal, `CORE-001`–`CORE-014`, `U-01`–`U-09`, inherited Stock decisions, and accepted Cajas Option A into verifiable requirements. It does not select a schema implementation. It does not authorize `DESIGN.md`, `TASKS.md`, schema, migrations, database work, commands, implementation, E02, production, or any protected gate.

## 2. Frozen provenance and staleness

Fresh T00 immediately before creation verified branch `master`, HEAD `4a25cf63a1dd8ddd2696f0d6601ad078cef5e37e`, absent target, no `.git/index.lock`, no visible target overlap, and zero mismatches across the following exact working-tree blobs.

| Governing artifact | Verified Git blob |
| --- | --- |
| `knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/PROPOSAL.md` | `04c4716fae030ee1e7a993e7151b13998bb14195` |
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

Candidate Local Planning Baseline Manifest v1 was also reverified as one indivisible, read-only planning source:

| Candidate artifact | Verified Git blob |
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

The candidate manifest is not live database truth, migration authority, replay evidence, production readiness, or a recommendation. The historical Cajas blob `5f470c58113c8990ea8bd83aaa811730f9417a55` remains unverifiable provenance only; the governing Cajas source is the verified `4e0bab…` blob above. Any drift in a frozen source, candidate member, branch, target inventory, ownership, approval, or material scope makes this specification stale and requires work to stop for fresh T00 and explicit human re-baselining.

## 3. Interpretation boundaries

1. **Shared Article** means the approved catalog identity shared across companies; it does not imply shared company Stock.
2. **Company Stock eligibility** means the company-specific decision that a shared Article participates in Stock-controlled behavior.
3. **Actionable position scope** means company + Article + deposit/custody + applicable traceability. It is conceptual and selects no key or storage representation.
4. **Identified unit** means a Box or equipment identity whose lifecycle must remain distinguishable from fungible quantity.
5. **Accepted checkpoint** means the approved business confirmation that governs a Stock consequence. It is not a technical transaction, endpoint, or record choice.
6. **Accepted evidence** means historically attributable evidence of an approved consequence. It is not an event-sourcing or table prescription.
7. **Operational Stock** means the single authoritative post-opening Stock truth for an activated bounded scope; unresolved legacy is not operational Stock.
8. **Exact decimal** means base-10 quantity arithmetic and comparison at the Article-approved scale without implicit critical rounding. It selects no language or database numeric type.

## 4. Normative requirements

### 4.1 Governance, authority, and provenance

#### E01-GOV-001 — Approved baseline fidelity
This specification and every later E01 artifact MUST preserve `CORE-001`–`CORE-014`, `U-01`–`U-09`, `DR-01`–`DR-16`, `UXD-01`–`UXD-12`, `A-01`–`A-12`, and Cajas Option A without reopening, narrowing, broadening, or renaming their meaning.

#### E01-GOV-002 — Documentary authority only
Acceptance of this specification MUST NOT authorize DESIGN, TASKS, schema choices, schema-file writes, migrations, database operations, commands, implementation, E02, or production action.

#### E01-GOV-003 — Frozen-source authority
Requirements MUST be interpreted from the frozen governing sources, while the candidate manifest MUST remain read-only planning evidence and MUST NOT become authority by resemblance or inertia.

#### E01-GOV-004 — Provenance and staleness
Any mismatch in a frozen blob, manifest membership, branch, target inventory, ownership, approval, or material scope MUST make the evidence stale and MUST stop progression until fresh verification and explicit human re-baselining.

#### E01-GOV-005 — No inferred authorization
Dependency completion, review, proposal approval, specification approval, or approval of one protected gate MUST NOT imply dispatch or approval of another artifact, command, change, or gate.

### 4.2 CORE-001–CORE-014

#### E01-CORE-001 — Controlled Article eligibility
Only a shared Article explicitly eligible for Stock in the applicable company MUST participate in that company's operational Stock positions or effects; eligibility in one company MUST NOT imply eligibility in another.

#### E01-CORE-002 — Operational identity integrity
Company, shared Article, deposit/custody context, and applicable identified unit MUST retain stable operational identity; copied labels, free text, soft references, or opaque supplemental evidence MUST NOT be the sole authoritative identity.

#### E01-CORE-003 — Company-scoped actionable grain
Every actionable position MUST be scoped by company, Article, deposit/custody, and only the traceability dimension applicable to that Article.

#### E01-CORE-004 — Derived compatible aggregates
Article-level and company-level totals MUST be derived only from compatible scoped positions and MUST NOT replace the actionable grain or combine incompatible scope, unit, traceability, custody, or disposition.

#### E01-CORE-005 — Multiple deposits and explicit non-deposit contexts
Each company MUST support multiple deposits and explicit transit and external-custody contexts; V1 MUST NOT require detailed internal-bin management.

#### E01-CORE-006 — Hybrid traceability
Article+deposit traceability MUST apply throughout V1; lot/expiration MUST apply only where relevant; identified-unit identity MUST apply to Boxes and equipment; non-applicable dimensions MUST NOT be fabricated.

#### E01-CORE-007 — Traceability continuity
Applicable lot, expiration, serial, identified-unit, label, and source facts attached to accepted evidence MUST remain historically interpretable after later configuration or label changes.

#### E01-CORE-008 — Exclusive physical identity
An identified unit MUST remain distinguishable from fungible quantity and MUST NOT be simultaneously actionable in incompatible positions, active reservations, assignments, custody contexts, or dispositions.

#### E01-CORE-009 — One Stock unit
Each Stock-controlled Article MUST use one Stock quantity unit; fractions MUST be accepted only under that Article's approved scale, and V1 MUST NOT introduce a general unit-conversion engine.

#### E01-CORE-010 — Quantity vocabulary
Current Stock interpretation MUST distinguish on hand, reserved, available, in transit/external custody, under review, and applicable final disposition.

#### E01-CORE-011 — Availability meaning
Available quantity or units MUST exclude active reservations, transit/external custody, under-review material, and consumed, damaged, or missing disposition.

#### E01-CORE-012 — No double counting
No quantity or identified unit MUST contribute twice to the same current usable total or appear simultaneously in contradictory current dispositions.

#### E01-CORE-013 — Origin ceiling
Cumulative dispatch, Consumption, Return disposition, and unresolved quantity MUST NOT exceed the approved originating quantity except through a separately approved, bounded, linked correction path.

#### E01-CORE-014 — Location conservation
A completed internal Transfer MUST preserve company total; an incomplete Transfer MUST remain explicitly in transit or unresolved and MUST NOT appear simultaneously as available at origin and destination.

### 4.3 Approved U-01–U-09 refinements

#### E01-ELIG-001 — Shared identity and company applicability
The shared Article identity and each company's Stock eligibility decision MUST remain distinct, and the eligibility lifecycle MUST preserve the company, applicability interval or boundary, approved quantity policy, traceability applicability, and historical interpretation without redesigning the catalog.

#### E01-LOC-001 — Distinct location and custody semantics
Deposit, transit, and external custody MUST remain distinct business concepts with different lifecycle and conservation meanings; none MUST be silently treated as an ordinary deposit merely for aggregation or compatibility.

#### E01-LOT-001 — Lot equivalence scope
For lot-managed Stock, automatic business-lot equivalence MUST require the same company, shared Article, and normalized business lot code.

#### E01-LOT-002 — Expiration discrepancy review
An expiration discrepancy within a candidate equivalent lot MUST block automatic equivalence and MUST require linked review/correction evidence; it MUST NOT silently merge, split, overwrite, or normalize accepted history.

#### E01-UNIT-001 — Stable identified-unit lifecycle
An identified unit MUST retain one stable, historically interpretable lifecycle across eligible position, reservation, assignment, custody, dispatch, disposition, review, correction, and reversal states as applicable.

#### E01-UNIT-002 — Prospective configuration only
An identified-unit configuration change MUST apply prospectively and MUST be rejected while any reservation, assignment, custody, or disposition is pending; it MUST NOT reinterpret accepted history or expand V1 into full composition Stock.

#### E01-COMP-001 — Exactly one compatibility disposition
Every existing soft Article, Box, lot, serial, document, or operation reference MUST receive exactly one disposition: `deterministically mappable`, `descriptive snapshot only`, `unresolved legacy`, or `incompatible/rejected`.

#### E01-COMP-002 — Source-domain ownership
The owning source domain MUST own and retain its compatibility disposition and retention decision; Stock MUST NOT silently accept, revise, or erase that source-owned classification.

#### E01-COMP-003 — Automation evidence ceiling
Automation MUST be limited to collecting or proposing evidence and MUST NOT accept a mapping, change a disposition, invent identity, or establish Stock truth.

#### E01-COMP-004 — No fabricated or dual truth
Compatibility treatment MUST NOT invent historical relationships, fabricate movements, or permit legacy, source-domain, frontend, local, or compatibility paths to become a second operational Stock writer.

#### E01-COMP-005 — Unresolved legacy exclusion
An `unresolved legacy` reference MUST be excluded immediately from operational Stock and MUST remain read-only under the owning source domain's retention policy; it MUST NOT remain actionable or contribute to operational quantity.

#### E01-QTY-001 — Per-Article scale
Every Stock-controlled Article MUST have one approved decimal scale from 0 through 4 that governs all operational quantities for that Article.

#### E01-QTY-002 — Exact arithmetic
Addition, subtraction, comparison, conservation, and boundary validation MUST use exact decimal semantics at the Article-approved scale.

#### E01-QTY-003 — Excess precision rejection
An input carrying more fractional digits than the Article-approved scale MUST be rejected without Stock effect.

#### E01-QTY-004 — No implicit critical rounding
A critical Stock operation MUST NOT round, truncate, or coerce excess precision implicitly; any future explicit conversion or rounding rule remains outside this baseline and separately gated.

### 4.4 Conservation, history, and opening boundary

#### E01-CONS-001 — Accountable-scope establishment
For each compatible actionable scope, accepted opening quantity and accepted receipt quantity MUST establish accountable quantity without double counting: `accountable established = accepted opening + accepted receipts + accepted inbound corrections`, bounded by their own causal scope.

#### E01-CONS-002 — Reservation reclassification
Reservation and release MUST reclassify availability without changing physical company quantity: `available = eligible on hand − active reserved − under review`, while transit/external custody remains outside available and company physical quantity is unchanged by reserve/release alone.

#### E01-CONS-003 — Dispatch custody transfer
Accepted dispatch MUST remove the affected scope from origin availability and place the same accountable scope into transit or external custody exactly once; it MUST NOT create or destroy company quantity.

#### E01-CONS-004 — Shared dispatched remainder
For each dispatch, `remaining accountable = dispatched − accepted Consumption − accepted Return dispositions`; Consumption and Return MUST allocate each quantity or identified unit at most once, and the remainder MUST stay explicit and unavailable.

#### E01-CONS-005 — Transfer conservation
For each internal Transfer, `company total before dispatch = origin remainder + in-transit/unresolved + accepted destination quantity` across its checkpoints, subject only to explicit linked discrepancy/correction evidence.

#### E01-CONS-006 — Count neutrality
A count observation MUST have zero Stock effect; any resulting difference MUST remain evidence only until a separate justified, reviewed, linked correction is accepted.

#### E01-CONS-007 — Linked correction and reversal
A correction or reversal MUST create new bounded evidence linked to the original accepted evidence and MUST preserve the original; it MUST NOT destructively rewrite history, exceed reversible scope, or repair only a current total.

#### E01-CONS-008 — Conservation safety conditions
Every checkpoint interpretation MUST preserve non-negative eligible availability, identified-unit exclusivity, compatible-scope isolation, origin ceilings, and no double counting.

#### E01-CONS-009 — E02 boundary
These equations and invariants MUST remain behavioral acceptance criteria and MUST NOT select E02 storage, projections, folds, locking, isolation, idempotency, reconstruction, or reconciliation algorithms.

#### E01-HIST-001 — Causal continuity
Accepted opening, receipt, reservation lifecycle, dispatch, custody, Consumption, Return, Transfer, count, correction, and reversal evidence MUST remain attributable to company, cause, applicable Article or identified unit, quantity/unit, scope, effective checkpoint, actor, and source context as applicable.

#### E01-HIST-002 — Company-consistent links
Every protected reference and every causal, correction, reversal, compatibility, or source link MUST remain company-consistent; a cross-company link MUST be rejected without creating an effect or revealing protected foreign-company facts.

#### E01-HIST-003 — Accepted-history immutability
Later labels, eligibility, traceability configuration, compatibility review, or correction MUST NOT erase or reinterpret the facts that governed an already accepted consequence.

#### E01-OPEN-001 — Honest dated opening
Each activated bounded scope MUST begin with one dated, reconciled opening position and MUST NOT infer or fabricate pre-boundary receipt, dispatch, Transfer, Consumption, Return, or correction history.

#### E01-OPEN-002 — Accepted checkpoint governs
The accepted confirmation checkpoint MUST govern Stock effect time prospectively across the opening boundary; document creation time alone MUST NOT govern the effect.

#### E01-OPEN-003 — Cross-boundary operation
An operation created before the effective opening boundary but accepted after it MUST produce its approved post-boundary effect at acceptance and MUST NOT be backdated into pre-boundary Stock history.

#### E01-OPEN-004 — One operational truth
At and after activation, only the accepted opening plus post-boundary accepted evidence MUST govern operational Stock for the bounded scope; pre-boundary source history and unresolved legacy MUST remain read-only according to source-domain ownership.

### 4.5 Negative requirements and non-goals

#### E01-NEG-001 — No schema selection
This specification MUST NOT select or prescribe final Prisma models, tables, fields, relations, keys, constraints, indexes, enums, mappings, generated artifacts, or physical naming.

#### E01-NEG-002 — No migration or data action
This specification MUST NOT select or authorize migrations, SQL, seeds, imports, backfills, bootstrap, opening creation, reconciliation writes, database access, provider changes, or environment operations.

#### E01-NEG-003 — No E02 mechanism
This specification MUST NOT select storage, projection, fold, locking, isolation, idempotency, concurrency, atomicity, replay, repair, or reconstruction algorithms or primitives.

#### E01-NEG-004 — No adjacent-system design
This specification MUST NOT define Auth, permissions, capabilities, roles, RLS, Cirugías/Expediente/Cajas workflow, APIs, routes, services, validators, repositories, UI, shared types, store, or local-state implementation.

#### E01-NEG-005 — No unsupported Stock expansion
E01 MUST NOT introduce detailed internal locations, universal traceability, a general unit-conversion engine, full Box-composition Stock, valuation, costing, accounting, billing, fiscal behavior, replenishment, purchasing optimization, or warehouse-management scope.

#### E01-NEG-006 — No mutable aggregate truth
Article totals, company totals, compatibility views, candidate balances, and projections MUST NOT become editable or alternate Stock truth and MUST NOT combine incompatible scopes.

#### E01-NEG-007 — No invented history
Current repository shape, soft references, prototype/local data, or plausible totals MUST NOT be used to invent identity, traceability, movements, opening evidence, or historical continuity.

#### E01-NEG-008 — No command or automatic progression
Creation, review, or approval of this file MUST NOT authorize commands, Git mutation, tests, build, Prisma operations, network access, another artifact, or automatic progression.

### 4.6 Protected gates, reviewers, and stop conditions

#### E01-GATE-001 — G-SCHEMA blocked
`G-SCHEMA` MUST remain blocked; no final model, table, field, relation, key, constraint, index, enum, mapping, or schema-file write is approved here.

#### E01-GATE-002 — G-MIGRATION blocked
`G-MIGRATION` MUST remain blocked and MUST NOT inherit authority from E01 documentary approval or any future schema decision.

#### E01-GATE-003 — G-AUTH blocked
`G-AUTH` MUST remain blocked and independent of E01 schema-design requirements.

#### E01-GATE-004 — G-PERMISSIONS blocked
`G-PERMISSIONS` MUST remain blocked; no capability vocabulary, grants, roles, exceptional authority, RLS policy, or permission matrix is approved here.

#### E01-GATE-005 — G-CIRUGIAS blocked
`G-CIRUGIAS` MUST remain blocked; no Surgery/Record, Expediente, Ficha CX, Cajas placement, hook, store, type, component, or sensitive-flow change is approved here.

#### E01-GATE-006 — G-PRODUCTION blocked
`G-PRODUCTION` MUST remain blocked; no productive data, opening, cutover, deployment, repair, writer routing, rollout, or rollback is approved here.

#### E01-GATE-007 — G-APPLY blocked
`G-APPLY` MUST remain blocked; no code, configuration, data, protected-file, or implementation mutation is approved here.

#### E01-GATE-008 — Non-transitivity
The seven gates MUST remain separate, evidence-bearing, scope-specific, expiring, and human-approved; passing any artifact, review, dependency, or one gate MUST NOT pass another gate.

#### E01-REV-001 — Independent reviewers
One independent DB/domain reviewer and one separate SDD/governance reviewer MUST review this specification read-only and no-fix before Franco's decision.

#### E01-REV-002 — Review evidence and verdict
Each reviewer MUST report `PASS`, `PASS WITH CONCERNS`, or `FAIL` with evidence and MUST NOT approve for Franco, dispatch the next phase, broaden scope, or inherit writer authority.

#### E01-REV-003 — Corrections return to writer
A reviewer MUST NOT edit this artifact; any required correction MUST return to the writer under fresh exact authorization, exclusive ownership, and fresh T00.

#### E01-STOP-001 — Mandatory stop
Work MUST stop if a frozen source, hash, status, target, ownership, branch/worktree, approval, or material scope drifts; overlap or source conflict appears; another file, command, dependency, or environment becomes necessary; a reviewer attempts a fix; or an unapproved product, architecture, schema, migration, Auth, permission, Cirugías, production, E02, or implementation decision is required.

## 5. Verifiable Given/When/Then scenarios

### 5.1 Authority, provenance, identity, and company isolation

#### E01-SCN-001 — Documentary approval grants no implementation authority
**Given** this specification is created, reviewed, or approved
**When** a downstream artifact, command, schema change, migration, database action, E02 mechanism, or implementation is proposed
**Then** it remains unauthorized until its own exact brief, evidence, gates, and Franco approval exist.

#### E01-SCN-002 — Frozen evidence drift stops progression
**Given** any governing blob, candidate-manifest member, branch, target inventory, owner, approval, or material scope differs from the frozen baseline
**When** E01 progression is evaluated
**Then** the evidence is stale and work stops for fresh T00 and explicit human re-baselining without substituting a candidate artifact.

#### E01-SCN-003 — Company eligibility is independent
**Given** one shared Article is Stock-eligible in company A but not in company B
**When** each company requests an operational Stock position or effect
**Then** company A may use its eligible scope while company B receives no actionable position or Stock consequence, and the shared Article identity remains unchanged.

#### E01-SCN-004 — Eligibility change preserves history
**Given** a shared Article has accepted company-scoped Stock history under one approved unit, scale, and traceability policy
**When** its future company eligibility or applicability configuration changes
**Then** the change applies only to its approved prospective boundary and prior accepted evidence remains interpretable under the facts that governed it.

#### E01-SCN-005 — Cross-company reference is rejected
**Given** an operation authorized for company A references a company-B deposit, identified unit, compatibility decision, source link, correction, or reversal
**When** company consistency is evaluated
**Then** the reference is rejected with no Stock effect and no protected company-B fact is disclosed.

#### E01-SCN-006 — Soft labels are not identity
**Given** two operational objects share a copied label or legacy code but lack established authoritative identity equivalence
**When** an actionable position or historical link is requested
**Then** the copied value alone does not establish identity, equivalence, or Stock truth.

### 5.2 Position scope, custody, and hybrid traceability

#### E01-SCN-007 — Actionable grain remains explicit
**Given** one eligible Article exists in multiple deposits, custody contexts, or applicable traceability slices
**When** a Stock consequence or actionable quantity is evaluated
**Then** company, Article, deposit/custody, and applicable traceability are explicit and an Article aggregate is not mutated as truth.

#### E01-SCN-008 — Incompatible aggregates stay isolated
**Given** positions differ by company, Stock unit, deposit/custody, traceability applicability, or disposition
**When** an Article or company total is derived
**Then** only compatible scopes contribute, each contribution is counted once, and incompatible scopes remain separately interpretable.

#### E01-SCN-009 — Deposit, transit, and external custody differ
**Given** material moves from a company deposit into transit and later remains with an external custodian
**When** its lifecycle and conservation state are interpreted
**Then** deposit, transit, and external custody remain distinct, unavailable for contradictory reuse, and none is silently represented as an ordinary deposit.

#### E01-SCN-010 — Non-applicable traceability is not fabricated
**Given** one fungible Article has no lot applicability and one Box is identified-unit managed
**When** their positions are interpreted
**Then** the fungible Article carries no invented lot or serial while the Box retains exclusive identified-unit history.

#### E01-SCN-011 — Lot equivalence succeeds only within scope
**Given** two lot observations have the same company, shared Article, normalized business lot code, and no expiration discrepancy
**When** automatic business-lot equivalence is evaluated
**Then** they may be treated as equivalent for that scope without changing accepted source facts.

#### E01-SCN-012 — Expiration discrepancy blocks automatic equivalence
**Given** two candidate-equivalent lot observations have an expiration discrepancy
**When** automatic equivalence is evaluated
**Then** equivalence is blocked, linked review/correction evidence is required, and accepted history is neither merged, split, overwritten, nor silently normalized.

#### E01-SCN-013 — Identified-unit conflict is exclusive
**Given** an identified unit already has a pending reservation, assignment, custody, or disposition
**When** an incompatible position, claim, or configuration change is attempted
**Then** the attempt is rejected and the existing stable lifecycle remains historically interpretable.

#### E01-SCN-014 — Identified-unit reconfiguration is prospective
**Given** an identified unit has no pending reservation, assignment, custody, or disposition
**When** an approved configuration change becomes effective
**Then** it governs prospectively without rewriting prior facts or implying full Box-composition Stock.

### 5.3 Compatibility and legacy

#### E01-SCN-015 — Each soft reference has exactly one disposition
**Given** a legacy Article, Box, lot, serial, document, or operation reference is assessed
**When** compatibility review completes
**Then** its owning source domain retains exactly one of the four approved dispositions and no fifth or simultaneous disposition is accepted.

#### E01-SCN-016 — Automation cannot accept mapping
**Given** automation proposes strong evidence for a deterministic mapping
**When** no source-domain-owned acceptance exists
**Then** the proposal remains evidence only and creates no accepted mapping, disposition change, identity, movement, or operational Stock truth.

#### E01-SCN-017 — Descriptive snapshot remains non-actionable
**Given** a soft reference is classified `descriptive snapshot only`
**When** operational Stock is calculated or a Stock action is requested
**Then** the snapshot may explain source history but does not contribute quantity, identity, or write authority.

#### E01-SCN-018 — Unresolved legacy is excluded immediately
**Given** a source-owned reference is classified `unresolved legacy` at the opening boundary
**When** operational Stock becomes active
**Then** the reference is excluded immediately from operational Stock and remains read-only under the source domain's retention policy.

#### E01-SCN-019 — Incompatible reference is rejected without fabrication
**Given** a legacy reference is classified `incompatible/rejected`
**When** coexistence or import is considered
**Then** it cannot establish Stock identity or history, cannot write operational Stock, and no plausible relationship or balancing movement is invented.

### 5.4 Quantity precision and current vocabulary

#### E01-SCN-020 — Scale zero rejects a fraction
**Given** an Article has approved decimal scale 0
**When** quantity `1.5` is submitted to a critical Stock operation
**Then** the input is rejected without rounding, truncation, conversion, or Stock effect.

#### E01-SCN-021 — Scale four uses exact arithmetic
**Given** an Article has approved decimal scale 4 and compatible quantities `1.2345` and `0.0005`
**When** they are added and compared at a checkpoint
**Then** the exact result is `1.2350` at scale 4 without binary approximation or implicit rounding.

#### E01-SCN-022 — Excess precision is rejected
**Given** an Article has approved decimal scale 2
**When** quantity `3.141` is submitted
**Then** the entire critical input is rejected and is not silently changed to `3.14` or `3.15`.

#### E01-SCN-023 — Quantity vocabulary does not double count
**Given** on-hand material includes active reservations and under-review material while other material is in external custody
**When** current Stock is interpreted
**Then** on hand, reserved, available, transit/external custody, under review, and final dispositions remain distinct and no scope contributes twice to usable Stock.

### 5.5 Checkpoint conservation

#### E01-SCN-024 — Opening and receipt establish accountable scope
**Given** one compatible scope has accepted opening quantity 10 and later accepted receipt quantity 4
**When** accountable established quantity is evaluated before other effects
**Then** it is exactly 14 for that scope and neither cause is counted twice or merged with an incompatible scope.

#### E01-SCN-025 — Reserve and release do not move physical quantity
**Given** on-hand quantity 10, under-review quantity 1, and no prior reservation
**When** quantity 3 is reserved and later quantity 1 of that reservation is released
**Then** physical company quantity is unchanged, active reserved becomes 2, and available becomes exactly 7.

#### E01-SCN-026 — Dispatch transfers custody once
**Given** quantity 5 is dispatch-eligible at an origin deposit
**When** dispatch of quantity 3 is accepted
**Then** origin availability decreases by 3, transit/external custody increases by 3, company quantity is conserved, and the same quantity is not usable at both scopes.

#### E01-SCN-027 — Consumption and Return share one remainder
**Given** a dispatch has accountable quantity 10, accepted Consumption 4, and accepted Return dispositions 3
**When** another disposition is evaluated
**Then** the shared remaining accountable quantity is exactly 3, prior scopes cannot be allocated again, and any excess attempt has no effect.

#### E01-SCN-028 — Completed Transfer conserves company total
**Given** an internal Transfer dispatches quantity 6 from origin
**When** destination accepts quantity 6
**Then** transit clears for that accepted scope, destination gains 6, origin remains reduced by 6, and company total is unchanged.

#### E01-SCN-029 — Incomplete Transfer remains explicit
**Given** an internal Transfer dispatches quantity 6 and destination accepts only observed quantity 5
**When** checkpoint conservation is evaluated
**Then** quantity 5 is at destination, quantity 1 remains transit/unresolved, the discrepancy stays explicit, and no quantity appears available twice.

#### E01-SCN-030 — Count observation has zero effect
**Given** a physical count differs from operational Stock
**When** the count observation is accepted but no separate correction is accepted
**Then** the difference remains attributable observation evidence and operational Stock is unchanged.

#### E01-SCN-031 — Linked correction preserves original evidence
**Given** an accepted effect contains an evidenced bounded error and retains correctable scope
**When** a correction or reversal is accepted
**Then** new linked evidence changes only the bounded scope, the original remains unchanged, and no current total is repaired without causal evidence.

#### E01-SCN-032 — Origin ceiling prevents over-accounting
**Given** prior dispatch, Consumption, Return, and unresolved allocations exhaust an originating quantity
**When** another allocation is attempted without an approved linked correction
**Then** the attempt is rejected, availability stays non-negative, and no partial or duplicate disposition is created.

#### E01-SCN-033 — Equations do not choose E02 mechanisms
**Given** all checkpoint equations and safety invariants are accepted as requirements
**When** storage, projection folds, locks, isolation, idempotency, replay, or reconciliation algorithms are requested
**Then** those choices remain unselected and blocked for E02 or another separately authorized design.

### 5.6 Opening boundary and history continuity

#### E01-SCN-034 — Opening position is honest
**Given** a bounded company/Article/deposit/traceability scope is reconciled at an approved effective boundary
**When** its opening position is later accepted under separate authority
**Then** one dated starting cause governs the scope and no pre-boundary receipt, dispatch, Transfer, Consumption, Return, or correction is fabricated.

#### E01-SCN-035 — Pre-boundary creation accepted post-boundary
**Given** an operation was created before the opening boundary and remains unaccepted at that boundary
**When** its approved confirmation is accepted after the boundary
**Then** its Stock effect occurs prospectively at acceptance and is never backdated into pre-boundary Stock history.

#### E01-SCN-036 — Later configuration does not rewrite accepted history
**Given** accepted evidence records its company, cause, scope, Article or identified unit, quantity/unit, traceability, actor, source, and effective checkpoint as applicable
**When** labels, eligibility, traceability configuration, or compatibility disposition later changes
**Then** the accepted evidence remains historically interpretable under its original governing facts.

#### E01-SCN-037 — Opening plus post-boundary evidence is the sole truth
**Given** an operational scope is active and legacy source history remains available for reference
**When** current operational Stock is determined
**Then** only accepted opening plus post-boundary accepted effects govern it, while legacy history remains read-only and cannot become a parallel writer.

### 5.7 Negative scope, gates, reviewers, and stop behavior

#### E01-SCN-038 — Hidden design choice is rejected
**Given** a proposed E01 statement names a final model, table, field, relation, key, constraint, index, enum, mapping, migration, algorithm, API, service, UI, Auth, permission, or Cirugías choice
**When** specification conformance is reviewed
**Then** the statement fails this specification and cannot be treated as an approved requirement or recommendation.

#### E01-SCN-039 — Candidate repository shape is not selected
**Given** the current Prisma schema, candidate migrations, soft references, local state, or plausible balance resembles a future solution
**When** schema or historical truth is inferred from that resemblance
**Then** the inference is rejected and the candidate remains read-only planning evidence without authority.

#### E01-SCN-040 — All seven gates remain blocked and non-transitive
**Given** PROPOSAL or SPEC is approved, a review passes, a dependency completes, or one protected gate later passes
**When** `G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, and `G-APPLY` are evaluated
**Then** each remains independently blocked unless its own current evidence and explicit Franco approval exist, and no approval propagates transitively.

#### E01-SCN-041 — Reviewers are read-only and no-fix
**Given** the DB/domain reviewer and the separate SDD/governance reviewer inspect this specification
**When** either finds an omission, conflict, drift, or hidden choice
**Then** the reviewer reports an evidenced verdict without editing, approving for Franco, dispatching DESIGN, or inheriting writer authority; correction returns under fresh authorization and T00.

#### E01-SCN-042 — Stop condition preserves blocked state
**Given** overlap, source conflict, drift, another required file/command/environment, reviewer fix attempt, or an unapproved decision appears
**When** the writer detects it
**Then** work stops without substitute assumptions, all downstream artifacts and gates remain blocked, and no mutation outside this file occurs.

#### E01-SCN-043 — Unsupported expansion remains out of scope
**Given** a request would add detailed bins, universal traceability, unit conversion, full Box-composition Stock, finance, accounting, billing, tax, replenishment, purchasing optimization, or warehouse management
**When** it is evaluated against E01
**Then** it is rejected as outside scope and no aggregate, candidate balance, or local state becomes alternate Stock truth.

## 6. Direct traceability matrix — CORE and U decisions

| Source | Direct requirement IDs | Direct scenario IDs |
| --- | --- | --- |
| `CORE-001` | `E01-CORE-001`, `E01-ELIG-001` | `E01-SCN-003`, `E01-SCN-004` |
| `CORE-002` | `E01-CORE-002` | `E01-SCN-005`, `E01-SCN-006` |
| `CORE-003` | `E01-CORE-003` | `E01-SCN-007` |
| `CORE-004` | `E01-CORE-004` | `E01-SCN-008` |
| `CORE-005` | `E01-CORE-005`, `E01-LOC-001` | `E01-SCN-009` |
| `CORE-006` | `E01-CORE-006` | `E01-SCN-010`, `E01-SCN-011` |
| `CORE-007` | `E01-CORE-007`, `E01-HIST-003` | `E01-SCN-012`, `E01-SCN-036` |
| `CORE-008` | `E01-CORE-008`, `E01-UNIT-001` | `E01-SCN-013`, `E01-SCN-014` |
| `CORE-009` | `E01-CORE-009`, `E01-QTY-001` | `E01-SCN-020`–`E01-SCN-022` |
| `CORE-010` | `E01-CORE-010` | `E01-SCN-023` |
| `CORE-011` | `E01-CORE-011`, `E01-CONS-002` | `E01-SCN-023`, `E01-SCN-025` |
| `CORE-012` | `E01-CORE-012`, `E01-CONS-008` | `E01-SCN-008`, `E01-SCN-023`, `E01-SCN-032` |
| `CORE-013` | `E01-CORE-013`, `E01-CONS-004` | `E01-SCN-027`, `E01-SCN-032` |
| `CORE-014` | `E01-CORE-014`, `E01-CONS-005` | `E01-SCN-028`, `E01-SCN-029` |
| `U-01` | `E01-CORE-001`, `E01-ELIG-001` | `E01-SCN-003`, `E01-SCN-004` |
| `U-02` | `E01-CORE-005`, `E01-LOC-001` | `E01-SCN-009`, `E01-SCN-026`, `E01-SCN-029` |
| `U-03` | `E01-LOT-001`, `E01-LOT-002` | `E01-SCN-011`, `E01-SCN-012` |
| `U-04` | `E01-CORE-008`, `E01-UNIT-001`, `E01-UNIT-002` | `E01-SCN-013`, `E01-SCN-014` |
| `U-05` | `E01-COMP-001`–`E01-COMP-004` | `E01-SCN-015`–`E01-SCN-017`, `E01-SCN-019` |
| `U-06` | `E01-CORE-009`, `E01-QTY-001`–`E01-QTY-004` | `E01-SCN-020`–`E01-SCN-022` |
| `U-07` | `E01-CONS-001`–`E01-CONS-009` | `E01-SCN-024`–`E01-SCN-033` |
| `U-08` | `E01-OPEN-001`–`E01-OPEN-004` | `E01-SCN-034`, `E01-SCN-035`, `E01-SCN-037` |
| `U-09` | `E01-COMP-002`, `E01-COMP-005`, `E01-OPEN-004` | `E01-SCN-018`, `E01-SCN-037` |

Coverage is direct for all `14/14` CORE requirements and `9/9` approved U decisions. No row relies solely on an indirect governance scenario.

## 7. Requirement-to-scenario completeness matrix

| Requirement family | Requirement IDs | Verifying scenario IDs |
| --- | --- | --- |
| Authority/provenance | `E01-GOV-001`–`E01-GOV-005` | `E01-SCN-001`, `E01-SCN-002`, `E01-SCN-039`, `E01-SCN-040` |
| Core eligibility and identity | `E01-CORE-001`–`E01-CORE-002`, `E01-ELIG-001` | `E01-SCN-003`–`E01-SCN-006` |
| Grain, aggregates, and custody | `E01-CORE-003`–`E01-CORE-005`, `E01-LOC-001` | `E01-SCN-007`–`E01-SCN-009` |
| Traceability and identified units | `E01-CORE-006`–`E01-CORE-008`, `E01-LOT-001`–`E01-LOT-002`, `E01-UNIT-001`–`E01-UNIT-002` | `E01-SCN-010`–`E01-SCN-014`, `E01-SCN-036` |
| Compatibility | `E01-COMP-001`–`E01-COMP-005` | `E01-SCN-015`–`E01-SCN-019`, `E01-SCN-037` |
| Units, precision, and vocabulary | `E01-CORE-009`–`E01-CORE-012`, `E01-QTY-001`–`E01-QTY-004` | `E01-SCN-020`–`E01-SCN-023`, `E01-SCN-025`, `E01-SCN-032` |
| Origin and location conservation | `E01-CORE-013`–`E01-CORE-014`, `E01-CONS-001`–`E01-CONS-009` | `E01-SCN-024`–`E01-SCN-033` |
| History and company-consistent links | `E01-HIST-001`–`E01-HIST-003` | `E01-SCN-005`, `E01-SCN-031`, `E01-SCN-036` |
| Opening boundary | `E01-OPEN-001`–`E01-OPEN-004` | `E01-SCN-034`–`E01-SCN-037` |
| Negative requirements | `E01-NEG-001`–`E01-NEG-008` | `E01-SCN-001`, `E01-SCN-033`, `E01-SCN-038`, `E01-SCN-039`, `E01-SCN-043` |
| Protected gates | `E01-GATE-001`–`E01-GATE-008` | `E01-SCN-001`, `E01-SCN-040`, `E01-SCN-042` |
| Review and stop | `E01-REV-001`–`E01-REV-003`, `E01-STOP-001` | `E01-SCN-041`, `E01-SCN-042` |

Every normative requirement appears in this matrix, and every `E01-SCN-001`–`E01-SCN-043` scenario appears in this matrix. Scenarios contain exactly one **Given**, one **When**, and one **Then**.

## 8. Review obligations and acceptance boundary

### DB/domain reviewer

The independent DB/domain reviewer must verify direct fidelity to all CORE/U rows; shared Article versus company eligibility; identity and actionable grain; distinct deposit/transit/external custody semantics; lot and identified-unit lifecycle; exact precision; checkpoint equations; compatibility ownership; opening honesty; company consistency; and absence of E02 or physical-schema selection.

### SDD/governance reviewer

The separate SDD/governance reviewer must verify metadata, frozen provenance, staleness, stable IDs, exact Given/When/Then structure, no orphan requirement or scenario, direct `14/14` CORE and `9/9` U traceability, negative requirements, seven blocked non-transitive gates, no-authorization language, no-fix behavior, and mandatory stop conditions.

Both reviewers are read-only and no-fix. Their verdicts provide evidence only. Franco alone may approve this specification, and that approval would close only this documentary phase. DESIGN remains blocked until its own explicit dispatch, fresh T00, exclusive ownership, review contract, and authorization exist.

## 9. Explicit no-authorization statement

Creation, review, approval, or closure of this specification authorizes no DESIGN, TASKS, final schema choice, `prisma/schema.prisma` write, migration, seed, import, backfill, opening creation, reconciliation write, database access, provider change, Auth, permission, RLS, Cirugías/Expediente/Cajas workflow change, API, service, validator, repository, UI, shared type/store change, E02 mechanism, dependency, command, Git mutation, implementation, production action, or APPLY.

All seven protected gates remain blocked and non-transitive. The implementation write set remains `∅`.
