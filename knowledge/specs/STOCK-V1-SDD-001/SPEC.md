# Specification — STOCK-V1-SDD-001

Status: **SPECIFIED — documentary execution-plan only**
Change: `STOCK-V1-SDD-001`
Owner task: `STOCK-V1-SDD-001/S01-SPEC`
Language: Professional technical English; public UI labels and scenario examples may remain in Spanish
Authorization effect: **None for DESIGN, TASKS, APPLY, implementation, schema, migration, Auth, permissions, Cirugías, production, or protected-file changes**
Normative keywords: **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are interpreted as requirement strength within the approved product and architecture baseline; they do not authorize implementation.
Specification inventory: **127 normative requirements and 60 Given/When/Then scenarios**

---

## 1. Purpose and specification boundary

This specification translates the approved Stock V1 domain decisions `DR-01`–`DR-16`, UX decisions `UXD-01`–`UXD-12`, architecture decisions `A-01`–`A-12`, and inherited Cajas Option A obligations into verifiable behavior. It defines observable outcomes, denials, failures, invariants, and future validation obligations without selecting implementation artifacts.

This artifact is normative for the approved behavior only. Statements under **Future implementation validation** describe evidence that a separately authorized implementation would have to provide; they are not tests executed in this phase and do not authorize code, data, infrastructure, rollout, or production work.

The exclusive writer lock for this phase follows `reserved → editing → review → released` for this file only. No lock or authority is implied for any implementation path.

---

## 2. Frozen provenance

The phase started only after verifying the proposal and all seven frozen sources as working-tree blobs:

| Artifact | Verified working-tree blob |
| --- | --- |
| `knowledge/specs/STOCK-V1-SDD-001/PROPOSAL.md` | `37a55267e3342fcf74128b5a597ada4aa62cf74b` |
| `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` | `926476e1d5e275768296329e099e32e04069224e` |
| `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` | `95d8d986e7dc426b48a7b4480966a558a54d52ed` |
| `knowledge/architecture/ADR-STOCK-CORE-PERSISTENCE.md` | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` |
| `knowledge/architecture/ADR-STOCK-EFFECTS-RESERVATIONS-PROJECTIONS.md` | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` |
| `knowledge/architecture/ADR-STOCK-AUTHORIZATION-AUDIT.md` | `82c30231d56293d5ee98bf27fe3758237d0bd495` |
| `knowledge/architecture/ADR-STOCK-OPERATIONAL-INTEGRATION-ADOPTION.md` | `8277cb1710de84fd000f3487e91b709ca8a28244` |
| `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` |

Any later provenance mismatch requires independent review and explicit human re-baselining. This specification cannot resolve source conflicts by invention.

---

## 3. Interpretation rules

1. A **Stock effect** is the approved consequence of a business cause. Reservation and release are non-physical effects; accepted receipt, dispatch, Consumption, Return disposition, Transfer checkpoints, correction, reversal, and opening position are cause-specific physical, custody, or disposition evidence as applicable.
2. **Accepted evidence** means immutable domain evidence for an accepted consequence. It is not a database or event-sourcing term.
3. **Projection** means the server-owned current operational view derived from accepted evidence. It is not an independent source of truth.
4. **Actionable position scope** means company + Article + deposit/custody + applicable traceability dimension. It is conceptual and does not prescribe keys or storage.
5. **Atomic** means that the owning business confirmation and every mandatory Stock consequence have one accepted all-or-nothing outcome. The accepted A-11 direction requires one database transaction in a future implementation, but this specification selects no API, service, transaction primitive, or source file.
6. A **critical action** is any action that can accept a receipt, reservation/release, dispatch, Consumption, Return disposition, Transfer checkpoint, correction, reversal, opening position, or other privileged Stock consequence.
7. An **unknown outcome** is a caller-visible timeout or lost response for which acceptance is not yet known. It is not equivalent to failure.
8. **Cajas** means surgical/logistics Boxes, never treasury or financial cash boxes.

---

## 4. Normative requirements

### 4.1 Governance and scope

#### GOV-001 — Approved baseline preservation
The Stock V1 package MUST preserve all approved `DR-01`–`DR-16`, `UXD-01`–`UXD-12`, `A-01`–`A-12`, and Cajas Option A decisions without reopening, narrowing, or expanding them.

#### GOV-002 — Source-domain ownership
Stock MUST own commitments, custody/quantity consequences, disposition, projections, and causal Stock history, while Articles, Preparation, Remittance, Consumption, Return, Purchases, Transfers, count/correction, and Surgery/Record Cajas retain their approved business ownership.

#### GOV-003 — Server authority
Accepted Stock truth and critical effects MUST be server-authoritative; browser state, local storage, mock data, UI state, and read models MUST NOT become Stock writers or final truth.

#### GOV-004 — Explainability
Every accepted Stock consequence MUST identify a recognizable business cause and sufficient company, Article or physical identity, quantity/unit where applicable, effective time, actor, and relevant source context to explain the position.

#### GOV-005 — Progressive depth
Stock V1 MUST provide the approved minimum depth and MUST NOT imply universal traceability, full warehouse management, or full Box-composition Stock.

#### GOV-006 — No implementation implication
Specification acceptance, later DESIGN/TASKS verification, or future T4 approval MUST NOT be interpreted as `APPLY`, implementation, migration, production, or protected-gate approval.

### 4.2 Identity, position, quantity, and traceability

#### CORE-001 — Controlled Article eligibility
Only Articles explicitly designated as Stock-controlled MUST participate in Stock V1 effects or positions.

#### CORE-002 — Operational identity integrity
Company, Article, deposit/custody, and applicable identified physical units MUST have stable operational identity; copied labels, free text, soft legacy references, or opaque supplemental evidence MUST NOT be the sole authoritative identity.

#### CORE-003 — Company-scoped actionable grain
Every actionable position MUST be scoped by company, Article, deposit/custody, and the traceability dimension applicable to that Article.

#### CORE-004 — Derived aggregates
Article-level and company-level totals MUST be derived from compatible scoped positions and MUST NOT replace the actionable position grain or combine incompatible scopes.

#### CORE-005 — Multiple deposits and transit
Each company MUST support multiple deposits and an explicit transit/external-custody context; detailed internal-bin management is not required by V1.

#### CORE-006 — Hybrid traceability
Article+deposit traceability MUST apply throughout V1; lot/expiration MUST apply where relevant; serial/identified-unit identity MUST apply to Boxes and equipment; dimensions that are not applicable MUST NOT be fabricated.

#### CORE-007 — Traceability continuity
Applicable lot, expiration, serial, or identified-unit facts attached to accepted evidence MUST remain historically interpretable even if current master configuration or labels later change.

#### CORE-008 — Exclusive physical identity
An identified unit MUST remain distinguishable from fungible quantity and MUST NOT be simultaneously actionable in incompatible positions, active reservations, or dispositions.

#### CORE-009 — One Stock unit
Each Stock-controlled Article MUST use one Stock quantity unit; fractional quantities MUST be allowed only when configured for that Article; V1 MUST NOT offer a general unit-conversion engine.

#### CORE-010 — Quantity vocabulary
Current Stock views MUST distinguish on hand, reserved, available, in transit/external custody, under review, and applicable final disposition.

#### CORE-011 — Availability meaning
Available quantity or units MUST exclude active reservations, transit/external custody, and under-review material, and MUST NOT include consumed, damaged, or missing disposition.

#### CORE-012 — No double counting
No quantity or identified unit MAY contribute twice to the same current usable total or simultaneously appear in contradictory current dispositions.

#### CORE-013 — Origin ceiling
Cumulative dispatch, Consumption, Return disposition, and unresolved quantities MUST NOT exceed the approved originating quantity except through an explicit approved correction path.

#### CORE-014 — Location conservation
A completed internal Transfer MUST preserve company total; an incomplete Transfer MUST remain explicitly in transit or unresolved.

### 4.3 Evidence, reservations, projections, concurrency, and correction

#### EVID-001 — Separate reservation evidence
Reservation commitments and releases MUST remain conceptually distinct from append-only physical/custody/disposition evidence, even if a future implementation shares infrastructure.

#### EVID-002 — Reservation lifecycle attribution
Each reservation and release MUST remain attributable to its company, operation, actionable scope, actor, time, and lifecycle cause; ending a commitment MUST NOT erase its history.

#### EVID-003 — Append-only accepted movement evidence
Accepted physical/custody/disposition evidence MUST NOT be overwritten or deleted to change historical truth.

#### EVID-004 — Projection derivation
Every current projected quantity, custody, availability, or review condition MUST be explainable from accepted opening-position, reservation-lifecycle, movement/disposition, correction, and reversal evidence as applicable.

#### EVID-005 — Server-owned maintained projections
Operational projections MUST be maintained under the trusted server boundary and MUST NOT be directly mutated as independent Stock truth.

#### EVID-006 — Deterministic reconstruction
Reconstruction from the same accepted evidence under the same approved rules MUST yield the same current projection.

#### EVID-007 — Reconciliation visibility
A difference between maintained and reconstructed projections MUST be detectable and surfaced for reconciliation; it MUST NOT be silently normalized by editing a balance.

#### EVID-008 — Conditional fungible acceptance
A fungible reservation or disposition MUST be accepted only when eligible availability remains sufficient at the same authoritative scoped acceptance boundary.

#### EVID-009 — Conditional identified-unit acceptance
An identified-unit claim MUST be accepted only when the unit remains eligible and has no incompatible active claim or disposition at the authoritative acceptance boundary.

#### EVID-010 — Scope-local concurrency
Concurrency protection MUST apply at least to the affected actionable position for quantity-managed Stock and the affected physical identity for identified-unit Stock; exact locking or isolation mechanics remain reserved.

#### EVID-011 — Semantic uniqueness
Each intended consequence MUST have stable company-scoped semantic uniqueness based conceptually on source operation, approved checkpoint, and applicable line/effect identity.

#### EVID-012 — Transport neutrality
Request, tracing, browser, session, or delivery-attempt identifiers MAY correlate attempts but MUST NOT alone determine business uniqueness; a new attempt identity MUST NOT create a new logical consequence.

#### EVID-013 — Duplicate outcome
A repeated submission of the same semantic intent MUST resolve to the prior accepted outcome without duplicating reservation, release, movement, projection consequence, domain evidence, or accepted-success audit consequence.

#### EVID-014 — Conflicting reuse
Reuse of an accepted semantic identity with materially changed Article, quantity/unit, custody, traceability, checkpoint, or disposition intent MUST conflict and MUST NOT overwrite or append another accepted consequence.

#### EVID-015 — Linked correction and reversal
Correction or reversal MUST create new attributable evidence linked to the original accepted evidence, with its own semantic identity, cause, actor, time, and scope; the original MUST remain unchanged.

#### EVID-016 — Bounded reversal
A reversal MUST NOT neutralize more than the still-reversible scope or contradict accepted downstream evidence; an invalid simple reversal MUST fail or use a separately approved corrective path.

#### EVID-017 — Adjustment last resort
A generic correction MUST NOT replace a known Remittance, Consumption, Return, Transfer, receipt, release, reversal, or other specific owning operation.

### 4.4 Authorization, company isolation, and audit

#### AUTH-001 — Provider-neutral policy
Protected Stock behavior MUST use a centralized provider-neutral server-side capability-policy boundary with Stock-specific contextual adapters; Stock commands MUST NOT depend directly on provider claim names or final role labels.

#### AUTH-002 — Distinct trusted checks
For each protected read or command, the backend MUST independently establish authenticated internal identity, active target-company membership, applicable capability, resource-company consistency, and domain validity where applicable; passing one check MUST NOT imply another.

#### AUTH-003 — Complete entry-point coverage
Routes, server actions, internal/background commands, retries, and cross-domain calls MUST NOT bypass the same trusted authorization boundary.

#### AUTH-004 — Resource-company consistency
Every Article, deposit/custody context, identified unit, position, reservation, source operation, evidence link, correction, and reversal used by an operation MUST be consistent with the authorized company.

#### AUTH-005 — Authorization before mutation
Applicable identity, membership, capability, and resource-company checks MUST complete or be safely revalidated before accepted business mutation; persistence rejection alone MUST NOT be the primary authorization control.

#### AUTH-006 — Safe denial
A denied or cross-company operation MUST create no source success, reservation, release, movement, projection change, correction, reversal, opening position, accepted domain evidence, financial effect, or success audit, and MUST NOT disclose inaccessible resource existence.

#### AUTH-007 — UI is not enforcement
Visible, hidden, enabled, or disabled controls and client-supplied company/resource identifiers MUST NOT grant authority.

#### AUTH-008 — RLS defense in depth
RLS or equivalent persistence restrictions MAY add containment only under separate approval; they MUST NOT replace backend membership, capability, resource-company, or domain checks.

#### AUTH-009 — Evidence and AuditEvent separation
Immutable Stock/domain evidence MUST explain accepted Stock truth; a correlated transversal `AuditEvent` MUST provide permitted attribution/security context and MUST NOT substitute for a movement, reservation, position, source document, checkpoint, or accepted domain evidence.

#### AUTH-010 — Correlation and audit integrity
Accepted critical actions MUST support company-safe correlation among actor, company, command/outcome, source evidence, mandatory Stock consequence, and required transversal audit; failure to satisfy required audit attribution MUST NOT be reported as accepted success. Exact storage and consistency mechanics remain gated.

### 4.5 Operational checkpoints and Cajas obligations

#### FLOW-001 — Supplier order neutrality
A purchase order, draft receipt, or expected line MUST have no Stock effect.

#### FLOW-002 — Accepted supplier receipt
An accepted physical supplier receipt MUST create cause-specific inbound Stock evidence for the observed Article/quantity or unit, destination deposit, and applicable traceability.

#### FLOW-003 — Exceptional no-PO receipt
Receipt without a purchase order MUST remain a visibly exceptional, justified path requiring future separately approved capability and audit behavior; denial or failure MUST create no Stock effect.

#### FLOW-004 — Preparation reservation trigger
Only confirmed incorporation/selection of eligible material into an active Preparation MUST reserve Stock; browsing, opening, comparison, drafts, and provisional selection MUST NOT reserve.

#### FLOW-005 — No oversubscription
Confirmed fungible reservations MUST NOT exceed eligible availability, and one exclusive unit MUST NOT be reserved for incompatible active operations.

#### FLOW-006 — Explicit release
Release MUST be explicit, bounded to the still-undispatched commitment being ended, and recorded as non-physical reservation-lifecycle evidence.

#### FLOW-007 — Pre-dispatch replacement
A confirmed pre-dispatch replacement MUST coherently release the applicable prior reservation and reserve the replacement as one accepted outcome without oversubscription or inferred physical movement.

#### FLOW-008 — Preparation evidence neutrality
Preparation control and re-control MUST create their approved operational evidence only and MUST NOT duplicate reservation or infer dispatch, Return, Consumption, billing, commercial, or accounting effects.

#### FLOW-009 — Dispatch checkpoint
Only successful Remittance issuance/approved dispatch MUST commit dispatch evidence and move the affected material from availability into dispatched/transit/external custody.

#### FLOW-010 — Failed dispatch
Failed Remittance issuance MUST commit neither definitive dispatch evidence nor a dispatch Stock effect and MUST preserve previously valid reservation/control evidence.

#### FLOW-011 — Multiple Cajas dispatches
Multiple dispatches for one Cajas operation MUST be non-overlapping and cumulatively bounded by controlled/reserved composition; undispatched content MUST remain reserved.

#### FLOW-012 — Dispatched unresolved state
Dispatched material MUST remain explicitly unresolved in transit/external custody until accepted Consumption or Return disposition accounts for it.

#### FLOW-013 — Consumption validation
Consumption MUST be human-validated, linked to a specific Remittance/dispatch, may be partial, and MUST create the consumed disposition exactly once.

#### FLOW-014 — Consumption ceiling
Accepted Consumption MUST NOT exceed the remaining accountable dispatched quantity and MUST preserve applicable traceability.

#### FLOW-015 — Return draft neutrality
A Return draft, comparison, or unvalidated observation MUST NOT increase availability or silently balance Stock.

#### FLOW-016 — Return validation and bounded dispositions
Human-validated Return MUST classify each accepted quantity or identified unit only as available, under review, consumed, damaged, or missing as applicable.

#### FLOW-017 — Partial Return accounting
Each partial Return MUST reference one dispatch, affect only its confirmed portion, and leave unaccounted quantity visible and unavailable from contradictory reuse.

#### FLOW-018 — Shared pending balance
Consumption and Return MAY be confirmed in either order against one shared pending balance per dispatch; each quantity or unit MUST receive at most one disposition, including consumption classified during Return.

#### FLOW-019 — Cajas partial release boundary
A partial Cajas Return MUST NOT release an entire identified Box while content, differences, or another disposition remains pending; correctly returned material MAY become available only at its approved human-confirmed Return/re-control checkpoint.

#### FLOW-020 — Differences and replacement evidence
Missing, damaged, added, replacement, or unresolved Cajas content MUST remain unavailable/under review as applicable while unaffected components retain their accepted disposition; added/replacement sides MUST retain explicit identifiable evidence and MUST NOT be inferred as balancing entries or presumed custody.

#### FLOW-021 — Transfer checkpoints
A Transfer MUST use separate dispatch and receipt checkpoints with an explicit transit interval; dispatch MUST remove origin availability, receipt MUST establish accepted destination position, and discrepancies MUST remain explicit.

#### FLOW-022 — Count observation
Completing an inventory count MUST record physical observation evidence only and MUST NOT itself change current Stock.

#### FLOW-023 — Separate correction review
A remaining count difference MUST require a separate justified, reviewed, attributable correction linked to the count; rejection or failure MUST preserve count evidence and leave Stock unchanged.

#### FLOW-024 — Opening position
Initial adoption MUST use one explicit dated, reconciled, evidenced opening position for its bounded company/deposit/Article/traceability scope and MUST distinguish it from receipt, generic ingress, adjustment, Transfer, or reconstructed history.

#### FLOW-025 — Atomic critical confirmation
For every accepted business confirmation with a mandatory Stock effect, synchronous orchestration within one database transaction MUST give the source-domain accepted result, immutable evidence, semantic correlation, all mandatory Stock consequences, and immediately authoritative projection consequence one all-or-nothing accepted outcome. The exact transaction API and orchestration placement remain reserved.

#### FLOW-026 — No partial failure
Authorization, company-scope, stale, concurrency, validation, persistence, mandatory audit-attribution, or mandatory projection failure before acceptance MUST leave no partial accepted source result or Stock consequence.

#### FLOW-027 — Unknown outcome retry
After a timeout or lost response, the system MUST reconcile by stable business semantic identity before permitting re-execution; an already accepted outcome MUST return existing evidence, and an absent outcome MAY be retried safely.

#### FLOW-028 — Optional post-commit work
Failure of optional notifications, analytics, exports, email, or external integration MUST NOT reinterpret, duplicate, or roll back an accepted critical business-and-Stock outcome.

#### FLOW-029 — Read refresh after acceptance
If refresh fails after acceptance, the experience MUST show accepted evidence with honest stale/refreshing status and MUST NOT invite blind resubmission.

#### FLOW-030 — Cajas minimum depth
Stock V1 MUST preserve identified Boxes/equipment and the minimum approved reservation, dispatch, partial-accounting, Return, Consumption, difference, and release effects without claiming full Box-composition Stock.

#### FLOW-031 — Financial neutrality
No Stock or Cajas checkpoint MUST automatically create costing, valuation, invoice, billing, commercial, accounting, collection, payment, tax, or fiscal evidence.

### 4.6 Stock UX, states, responsive behavior, and accessibility

#### UX-001 — Stock operations index
The conceptual `/stock` entry MUST be an operational Stock-position index for discovery, scoped reading, attention, detail/history access, and links to owning workflows; it MUST NOT duplicate editable source-domain journeys.

#### UX-002 — Distinct journeys
Articles/Stock masters, supplier receipt, Transfer, count/correction, and opening position MUST remain distinct owned journeys linked from the Stock index as applicable.

#### UX-003 — Hierarchical hybrid results
Default results MUST use Article summary → deposit/custody → applicable lot/expiration or identified-unit hierarchy; direct lot/unit search MUST preserve and expose the Article parent.

#### UX-004 — Explicit child action scope
Critical actions MUST require an explicit actionable child scope and MUST NOT act on an ambiguous Article aggregate.

#### UX-005 — Visible scope and freshness
Stock reading and review contexts MUST keep active company, selected deposit/custody/filter scope, result unit, freshness, and completeness visible.

#### UX-006 — Quantity hierarchy and labels
For selection decisions, `Disponible` MUST be primary with adjacent `En existencia`, `Reservado`, `En tránsito / custodia externa`, and `En revisión`; applicable history/disposition MUST use `Consumido`, `Dañado`, and `Faltante` without hiding non-zero buckets.

#### UX-007 — Honest aggregation labels
Company totals, deposit subtotals, transit, lot slices, fungible quantities, and identified-unit counts MUST be labeled distinctly; filtered summaries MUST state whether they follow filtered or full-company scope.

#### UX-008 — Compact index strategy
The index MUST prioritize operational results and MUST NOT lead with large generic `Total`, `Bajo mínimo`, or `Sin stock` cards; any compact attention summary MUST name its aggregation unit and active scope.

#### UX-009 — Durable detail and history
Position, traceability, causal history, source references, and linked correction/reversal MUST use a durable reading context; dialogs MAY support bounded review/confirmation but MUST NOT be the only broad-history surface.

#### UX-010 — Cause-specific history
History MUST identify the known business cause rather than generic ingress/egress, retain applicable actor/time/scope/traceability/source/disposition context, and present original and linked correction/reversal together.

#### UX-011 — Accepted-history immutability cues
Accepted entries MUST appear read-only and MUST NOT offer destructive inline editing or deletion.

#### UX-012 — Attention lens
An `Atención` lens MAY collect approved underlying conditions such as stale/failure, pending transit, unresolved dispatch, review, count difference, or pending receipt, but MUST identify the condition and owning workflow and MUST NOT create a new Stock status.

#### UX-013 — Complete honest states
The experience MUST distinguish initial loading, ready, empty, filtered empty, denied surface, denied action, validation error, load error, action failure, stale/conflict, refreshing, partial data, offline, submitting, accepted success, and no-longer-applicable states without conflating them.

#### UX-014 — Critical review
Before critical confirmation, the experience MUST present the action/cause, company/source context, Article and quantity/unit or identified units, origin/destination where applicable, traceability, current and proposed consequence, unresolved consequences, and required justification/evidence.

#### UX-015 — Action-specific confirmation
Critical actions MUST require explicit review and a single unambiguous action-specific confirmation; browsing, filtering, and disclosure MUST NOT require confirmation.

#### UX-016 — No optimistic critical success
The experience MUST NOT claim accepted receipt, reservation/release, dispatch, Consumption, Return disposition, Transfer, correction, reversal, or opening position before authoritative accepted evidence exists.

#### UX-017 — Failure and retry honesty
Failure MUST preserve eligible draft/review input, show no accepted success, distinguish known failure from unknown outcome, and reconcile unknown outcomes before another confirmation.

#### UX-018 — Partial/offline honesty
Last successful data MAY remain as timestamped read-only context under `Datos parciales`, `Actualizando…`, or `Sin conexión`; critical confirmation MUST be blocked when currentness or completeness is insufficient, and no offline mutation or queued success is implied.

#### UX-019 — Responsive transformation
Desktop MUST support compact hierarchical inspection, tablet MUST preserve information order with disclosure, and mobile MUST use semantic cards/full-width detail preserving scope, `Disponible`, non-zero exceptions, causality, and confirmation context.

#### UX-020 — Mobile critical context
On mobile review, company/source context, quantity/unit or identified unit, proposed consequence, unresolved condition, and confirmation action MUST remain available without clipped micro-tables or hover-only interaction.

#### UX-021 — WCAG 2.2 AA
Future Stock UX MUST meet WCAG 2.2 AA, including keyboard operation, visible focus, programmatic relationships, appropriate announcements, reflow/zoom, applicable contrast, accessible names, and status distinctions not conveyed by color alone.

#### UX-022 — Target and task safety
Repeated and primary touch targets MUST provide at least a `44x44` CSS-pixel target or equivalent usable area; focus and announcements MUST support errors, conflicts, submitting, success, and changed availability without unexpected task-order changes.

#### UX-023 — Inherited Cajas labels
Within the approved Cajas context, the exact inherited public labels `Caja`, `Contenido esperado`, `Caja identificada`, `Control de preparación`, `Contenido despachado`, `Disponible`, `Con diferencias`, and `Recontrolar caja` MUST be preserved; this does not widen Cajas scope or select UI components.

### 4.7 Adoption, cutover, reconstruction, and rollback

#### ADOPT-001 — Bounded non-overlapping slices
Adoption MUST occur through explicit non-overlapping slices with declared company, deposit/custody, Article set, applicable traceability scope, and effective boundary as selected later under approval.

#### ADOPT-002 — Reconciled opening boundary
Each activated slice MUST begin from approved dated reconciled opening evidence and MUST distinguish pre-adoption owning-domain history from post-adoption Stock effects.

#### ADOPT-003 — No fabricated history
Legacy documents, prototype/local balances, mock data, and soft references MUST NOT be translated into invented supplier receipts, Remittances, Transfers, Consumption, Returns, corrections, traceability, or movement history.

#### ADOPT-004 — One authoritative writer
For each active slice and checkpoint, exactly one path MUST own the authoritative Stock write; source domains, frontend/local state, compatibility paths, and read models MUST NOT perform a second Stock write.

#### ADOPT-005 — Shadow read-only
Shadow calculations and compatibility comparisons MAY compare candidate results but MUST NOT create accepted Stock effects, mutate productive truth, or produce operator-visible accepted success.

#### ADOPT-006 — Anti-double-write cutover
Legacy/prototype/local mutation MUST be disabled, read-only, or outside the active slice before the new writer is activated; dual authoritative Stock truth is prohibited.

#### ADOPT-007 — Cross-boundary operations
Open operations crossing a cutover boundary and documents dated before but confirmed after it MUST follow an explicitly approved slice rule; they MUST NOT be silently backdated or treated by operator convention alone.

#### ADOPT-008 — One-to-one reconciliation
Within an active slice, every accepted source confirmation requiring Stock MUST reconcile to exactly one mandatory Stock consequence, and every mandatory Stock consequence MUST identify one accepted source cause or the explicit opening position.

#### ADOPT-009 — Evidence-based repair
Projection repair/rebuild MUST derive from opening evidence plus accepted post-cutover evidence, preserve accepted evidence, expose invalid/unresolved input, and MUST NOT edit source confirmations, invent movements, or convert unexplained differences into adjustments.

#### ADOPT-010 — Routing rollback preserves truth
Adoption rollback MUST mean bounded deployment/writer-routing recovery, not deletion or hiding of accepted Stock evidence; affected confirmations MAY be paused, but routing MUST NOT lose or duplicate post-cutover effects.

#### ADOPT-011 — Stabilization gate
Expansion to another slice MUST remain blocked until the active slice satisfies separately approved reconciliation, duplicate-suppression, projection-equality, unresolved-operation, and operator-visible failure tolerances.

#### ADOPT-012 — Production authorization boundary
Opening-position creation, migration, reconciliation execution, writer activation, stabilization, repair, rollout, and routing rollback MUST remain non-operative until their separate protected gates and Franco approvals pass.

### 4.8 Negative requirements and non-goals

#### NEG-001 — No financial scope
Stock V1 MUST NOT implement costing, valuation, COGS, accounting journals, billing, invoicing, collections, payments, commercial pricing consequences, tax, or fiscal behavior.

#### NEG-002 — No unsupported warehouse scope
Stock V1 MUST NOT imply detailed bins, picking waves, routes, carriers, replenishment, procurement optimization, manufacturing, or a full warehouse-management system.

#### NEG-003 — No unsupported lifecycle scope
Stock V1 MUST NOT create independent maintenance, sterilization, repair, quarantine, damage-management, or quality workflows beyond approved disposition visibility.

#### NEG-004 — No direct balance truth
Editable current quantity or direct projection replacement MUST NOT be the primary or alternate Stock truth.

#### NEG-005 — No source duplication
`/stock` MUST NOT create editable duplicates of Preparation, Remittance, Consumption, Return, Cajas, Purchase Order, or Surgery/Record workflows.

#### NEG-006 — No hidden security decision
This specification MUST NOT define final roles, capability identifiers, role mappings, permission matrices, Auth provider/session design, RLS policy, emergency override, or exceptional-action owner.

#### NEG-007 — No hidden technical decision
This specification MUST NOT select tables, fields, keys, constraints, indexes, exact records, endpoints, payloads, status codes, services, repositories, validators, algorithms, lock primitives, isolation levels, queues, caches, routes, components, breakpoints, or implementation files.

#### NEG-008 — No cross-company leakage
No Stock view, aggregate, denial, audit content, history link, search result, traceability detail, or critical operation MAY reveal or affect another company's protected resources.

### 4.9 Documentary governance

#### DOC-001 — E00–E11 remain planning families
`E00`–`E11` MUST remain blocked future planning families exactly as defined in `PROPOSAL.md`; they are coverage labels, not dispatched implementation tasks or file allocations.

#### DOC-002 — Independent protected gates
`G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, and `G-APPLY` MUST remain explicit, independent, and blocked; passing one MUST NOT imply another.

#### DOC-003 — Separate briefs and approvals
Every future implementation family MUST require a separate exact Task Brief, exclusive ownership, path-specific preflight, applicable gate approvals, and explicit Franco authorization before mutation.

#### DOC-004 — T4 stop
The documentary chain MUST stop after future independent TASKS verification and Franco T4 approval; T4 MAY approve only execution decomposition and future approval requests, never implementation or `APPLY`.

#### DOC-005 — Reserved details stop condition
If DESIGN or TASKS cannot proceed without selecting an unapproved product rule, exact schema, Auth/permission behavior, Cirugías placement, algorithm, API, file, migration, production operation, or rollout decision, work MUST stop and escalate.

#### DOC-006 — Future evidence is non-operative
All future validation criteria in this specification MUST remain documentary until an authorized implementation task names exact scope, environment, files, commands, ownership, and approvals.

---

## 5. Verifiable scenarios

### 5.1 Identity, quantity, and isolation

#### SCN-001 — Non-controlled Article is excluded
**Given** an Article is not explicitly Stock-controlled  
**When** a Stock position or critical Stock effect is requested for it  
**Then** no actionable Stock position or accepted Stock consequence is created.

#### SCN-002 — Action uses explicit position scope
**Given** one Stock-controlled Article has material in multiple deposits or traceability slices  
**When** an operator initiates a critical action from an Article summary  
**Then** the action requires an explicit company, deposit/custody, and applicable traceability child scope before confirmation.

#### SCN-003 — Hybrid traceability is conditional
**Given** one fungible Article has no lot applicability and one Box is identity-managed  
**When** their positions are inspected  
**Then** the first uses quantity at Article+deposit scope without fabricated lot/serial data and the Box exposes its identified unit.

#### SCN-004 — Quantity buckets reconcile without double count
**Given** a position has on-hand material with active reservations and under-review material  
**When** current quantities are presented  
**Then** `Disponible`, `Reservado`, and `En revisión` remain distinct and no quantity contributes twice to usable Stock.

#### SCN-005 — Cross-company reference is rejected safely
**Given** an authenticated actor belongs to company A and submits a company-B deposit or unit reference  
**When** any protected Stock read or mutation is evaluated  
**Then** the trusted boundary rejects it before effect, reveals no company-B resource fact, and returns no protected company-B data.

#### SCN-006 — Capability denial has no side effect
**Given** identity and membership are valid but applicable capability is denied  
**When** a critical Stock confirmation is attempted  
**Then** no source success, Stock evidence, projection change, or success audit is accepted and the UI does not represent the result as empty or successful.

### 5.2 Reservations, concurrency, evidence, and retry

#### SCN-007 — Provisional selection does not reserve
**Given** eligible material is browsed or provisionally selected in Preparation  
**When** incorporation into active Preparation has not been confirmed  
**Then** availability is unchanged and no reservation evidence is accepted.

#### SCN-008 — Confirmed selection reserves once
**Given** sufficient eligible availability at an explicit actionable scope  
**When** incorporation into active Preparation is confirmed and then retried with the same semantic intent  
**Then** one reservation is accepted, availability changes once, and the retry resolves to existing evidence.

#### SCN-009 — Concurrent fungible oversubscription is prevented
**Given** two confirmations together request more fungible quantity than is available  
**When** they compete at the authoritative acceptance boundary  
**Then** only claims satisfying scoped availability are accepted and no negative or oversubscribed availability results.

#### SCN-010 — Identified unit has one compatible claimant
**Given** two operations concurrently claim the same eligible identified unit  
**When** both confirmations are evaluated  
**Then** at most one is accepted and the other receives conflict/no-effect.

#### SCN-011 — Stale availability blocks confirmation
**Given** availability changed after action review  
**When** the operator confirms using stale context  
**Then** no reservation or disposition is accepted and fresh review is required.

#### SCN-012 — Explicit release is not movement
**Given** an active still-undispatched reservation is cancelled under its owning Preparation context  
**When** release is accepted  
**Then** only the applicable commitment ends, availability is updated once, and history labels a release rather than physical receipt or movement.

#### SCN-013 — Replacement is coherent
**Given** an active pre-dispatch reservation is being replaced  
**When** replacement confirmation is accepted  
**Then** prior scope is released and replacement scope reserved as one valid outcome without an interval of accepted double reservation or inferred movement.

#### SCN-014 — Conflicting semantic reuse is rejected
**Given** a semantic consequence identity was already accepted  
**When** it is reused with changed quantity, Article, custody, traceability, or disposition  
**Then** the request conflicts, original evidence remains unchanged, and no second consequence is accepted.

#### SCN-015 — Unknown outcome reconciles before retry
**Given** a critical confirmation response is lost after submission  
**When** the operator or client attempts again  
**Then** accepted evidence is checked by stable semantic identity first and the system either returns the accepted outcome or permits one safe absent-outcome retry.

#### SCN-016 — Projection divergence is visible
**Given** maintained projection differs from reconstruction of accepted evidence  
**When** reconciliation evaluates the same scope  
**Then** the mismatch is surfaced and no direct balance overwrite is accepted as the resolution.

#### SCN-017 — Linked reversal preserves history
**Given** an accepted effect retains reversible scope and has no contradictory downstream disposition  
**When** an authorized reversal is accepted  
**Then** new linked evidence neutralizes only that scope, the original remains visible, and retry cannot neutralize it twice.

#### SCN-018 — Invalid reversal is blocked
**Given** requested reversal exceeds the reversible remainder or contradicts later accepted evidence  
**When** reversal is attempted  
**Then** it is rejected or routed to a separately approved corrective path and no evidence is deleted.

### 5.3 Supplier receipt, dispatch, Consumption, Return, Transfer, and count

#### SCN-019 — Purchase order alone has no effect
**Given** a purchase order exists with expected lines  
**When** no physical receipt has been accepted  
**Then** no inbound Stock evidence or availability increase exists.

#### SCN-020 — Supplier receipt accepts observed material
**Given** observed material, destination, unit, and applicable traceability have been reviewed  
**When** physical receipt is accepted  
**Then** cause-specific receipt evidence and its Stock consequence are accepted together and the refreshed position is shown.

#### SCN-021 — Exceptional receipt denial
**Given** `Recepción sin orden de compra` is requested without future approved authority or required justification  
**When** confirmation is evaluated  
**Then** it is denied with no receipt evidence or position effect and without inventing a role in the UI.

#### SCN-022 — Preparation control is evidence-only
**Given** material is already reserved for a Cajas operation  
**When** preparation control or re-control is recorded  
**Then** control evidence is created without another reservation, dispatch, Return, or Consumption effect.

#### SCN-023 — Successful Remittance dispatch is atomic
**Given** valid reserved or otherwise dispatch-eligible material  
**When** Remittance issuance succeeds  
**Then** accepted issuance evidence and the mandatory dispatch/transit consequence are accepted together exactly once.

#### SCN-024 — Failed Remittance has no dispatch
**Given** Remittance issuance fails validation, authorization, concurrency, persistence, or mandatory Stock work  
**When** the attempt ends  
**Then** neither accepted issuance nor dispatch Stock effect remains and valid prior reservation/control evidence is preserved.

#### SCN-025 — Multiple Box dispatches remain bounded
**Given** one identified Box operation has controlled/reserved content  
**When** multiple dispatches are accepted  
**Then** their scopes do not overlap, cumulative dispatch does not exceed eligible composition, and undispatched content remains reserved.

#### SCN-026 — Partial Consumption preserves remainder
**Given** dispatched accountable quantity remains for a Remittance  
**When** a partial Consumption is human-validated  
**Then** only the accepted quantity becomes consumed once and the remainder stays explicitly unresolved.

#### SCN-027 — Consumption cannot exceed dispatch
**Given** prior Consumption and Return dispositions reduced the shared pending balance  
**When** another Consumption exceeds the remainder  
**Then** the confirmation fails with no partial consumed consequence.

#### SCN-028 — Return draft creates no availability
**Given** returned material is captured in a draft or comparison  
**When** human validation has not occurred  
**Then** no material becomes available and no balancing effect is inferred.

#### SCN-029 — Validated Return uses bounded dispositions
**Given** outstanding dispatched material is reviewed  
**When** Return is accepted with explicit available, under-review, consumed, damaged, or missing dispositions  
**Then** each accepted quantity or unit receives exactly its chosen bounded disposition and no contradictory usable quantity.

#### SCN-030 — Consumption and Return can arrive in either order
**Given** one dispatch has a shared pending balance  
**When** partial Consumption and partial Return are accepted in either order  
**Then** cumulative accounting remains within the dispatch, each scope receives at most one disposition, and unresolved remainder stays visible.

#### SCN-031 — Partial Box Return does not free whole Box
**Given** only part of an identified Box dispatch is returned correctly while content or differences remain pending  
**When** that partial Return is accepted  
**Then** accepted portions receive their dispositions but the whole Box is not presented as fully `Disponible`.

#### SCN-032 — Added or replacement content is explicit
**Given** a Return identifies added or replacement material  
**When** it is reviewed  
**Then** both physical sides retain explicit evidence and unresolved origin/belonging/disposition remains under review without inferred balancing.

#### SCN-033 — Transfer has two checkpoints
**Given** a valid internal Transfer scope  
**When** dispatch is accepted and receipt has not yet occurred  
**Then** origin availability decreases, material is `En tránsito`, destination availability does not increase, and company total is conserved.

#### SCN-034 — Transfer receipt preserves discrepancies
**Given** dispatched Transfer contents reach destination with a discrepancy  
**When** receipt is accepted for observed material  
**Then** accepted material enters destination position, the discrepancy remains unresolved, and both checkpoints stay in one causal chain.

#### SCN-035 — Count does not correct
**Given** a physical count differs from expected Stock  
**When** the count is completed  
**Then** observation and difference evidence are retained but the Stock position is unchanged.

#### SCN-036 — Correction is separate and justified
**Given** a count difference remains after known causes are routed to owning workflows  
**When** a separately reviewed correction with mandatory reason/evidence is accepted  
**Then** linked correction evidence changes the projection; rejection or failure leaves it unchanged.

### 5.4 Atomicity, UX honesty, and accessibility

#### SCN-037 — Mandatory consequence failure rolls back source success
**Given** a business confirmation requires a Stock consequence  
**When** mandatory Stock evidence or projection acceptance fails before commit  
**Then** neither the source confirmation nor Stock consequence is presented or retained as accepted.

#### SCN-038 — Optional notification failure does not undo acceptance
**Given** a business-and-Stock critical outcome was accepted  
**When** optional post-commit email or analytics fails  
**Then** accepted evidence remains accepted and optional retry cannot duplicate the critical outcome.

#### SCN-039 — Accepted success requires evidence
**Given** a user submits a critical action  
**When** only a dialog closes, local state changes, or a toast could be shown  
**Then** accepted success is withheld until authoritative accepted evidence and consequence are confirmed.

#### SCN-040 — Complete and filtered-empty states differ
**Given** Stock positions exist but current filters match none  
**When** the index completes loading  
**Then** it shows filtered-empty copy with active filters and does not claim the Stock catalog or company position is empty.

#### SCN-041 — Partial data cannot look complete
**Given** one required scope or quantity breakdown is unavailable  
**When** a position is displayed  
**Then** `Datos parciales` persists, unavailable scope is identified where safe, complete-looking totals are avoided, and unsafe critical confirmation is blocked.

#### SCN-042 — Offline context is read-only
**Given** connectivity is lost after successful data load  
**When** the operator remains on Stock  
**Then** timestamped prior data may remain under `Sin conexión`, but no critical mutation is accepted or presented as queued success.

#### SCN-043 — Attention is a lens, not status
**Given** an in-transit Transfer awaits receipt  
**When** it appears under `Atención`  
**Then** the underlying `En tránsito` condition and Transfer owner are shown and no new Stock status is created.

#### SCN-044 — Mobile preserves confirmation context
**Given** a critical review is used at a representative `412x915` viewport  
**When** content reflows  
**Then** company/source, quantity/unit, consequence, unresolved condition, and confirm action remain reachable without hover or clipped micro-tables.

#### SCN-045 — Keyboard and non-color operation
**Given** a keyboard user reviews a stale conflict and correction form  
**When** they navigate, encounter errors, and retry after review  
**Then** focus is visible and logical, errors/status are programmatically associated and announced, and no essential distinction relies on color alone.

### 5.5 Adoption and governance

#### SCN-046 — Opening position is honest
**Given** an approved bounded slice has reconciled physical and operational evidence at an effective date  
**When** opening position is accepted under separate authorization  
**Then** one dated starting cause is recorded and no historical receipt, Transfer, Remittance, Consumption, or Return is fabricated.

#### SCN-047 — Shadow comparison cannot write
**Given** a candidate slice is in dry-run/shadow evaluation  
**When** candidate projections are calculated  
**Then** no productive Stock truth changes and operators receive no accepted-success representation.

#### SCN-048 — One writer per active slice
**Given** a slice activates the future Stock writer  
**When** a post-cutoff source confirmation occurs  
**Then** one orchestrated path owns the Stock consequence and no legacy, source-domain, frontend, or compatibility path writes it again.

#### SCN-049 — Projection rebuild preserves evidence
**Given** an active slice projection requires repair  
**When** an authorized rebuild is performed in a future phase  
**Then** it derives from opening plus accepted post-cutover evidence, leaves accepted history unchanged, and exposes unresolved evidence instead of producing a plausible invented total.

#### SCN-050 — Routing rollback does not erase truth
**Given** an activated slice has accepted opening and post-cutover effects  
**When** a correctness defect triggers routing recovery  
**Then** accepted evidence remains visible, confirmations may pause, and routing does not lose, hide, or duplicate effects.

#### SCN-051 — Financial neutrality is observable
**Given** any receipt, reservation, dispatch, Consumption, Return, Transfer, correction, reversal, opening position, or Cajas checkpoint is accepted  
**When** its consequences are inspected  
**Then** no invoice, price, costing, valuation, accounting, collection, payment, tax, or fiscal effect is created automatically.

#### SCN-052 — Documentary gate cannot authorize implementation
**Given** this SPEC or a later DESIGN/TASKS artifact passes verification  
**When** implementation, schema, migration, Auth, permission, Cirugías, or production work is proposed  
**Then** work remains blocked until the relevant separate brief, ownership, protected gates, Franco approval, and explicit `G-APPLY` authorization exist.

### 5.6 Direct traceability regression scenarios

#### SCN-053 — Stock index preserves surface ownership and distinct journeys
**Given** an operator enters conceptual `/stock` and needs an Article master, supplier receipt, Transfer, count/correction, opening position, or source-domain operation  
**When** the operator uses the index entry points  
**Then** `/stock` provides position discovery, scoped reading, attention, and detail/history links while each distinct journey opens or links to its approved owner without creating an editable duplicate.

#### SCN-054 — Compact summary does not displace operational results
**Given** the Stock index has filter-scoped attention information and operational position results  
**When** the index summary is presented  
**Then** operational results remain primary, no giant `Total`, `Bajo mínimo`, or `Sin stock` KPI framing leads the surface, and any compact attention summary states its aggregation unit and active filter scope.

#### SCN-055 — Detail and history use a durable reading context
**Given** a position has traceability, causal history, source references, and linked correction or reversal evidence  
**When** an operator inspects the full history and starts a bounded confirmation  
**Then** the broad evidence remains available in a durable reading context and any dialog is limited to bounded review/confirmation rather than becoming the only history surface.

#### SCN-056 — Cajas context preserves all eight inherited labels
**Given** an approved Cajas context presents master, preparation, dispatch, availability, difference, and re-control concepts  
**When** their public labels are displayed  
**Then** the complete contextual set is exactly `Caja`, `Contenido esperado`, `Caja identificada`, `Control de preparación`, `Contenido despachado`, `Disponible`, `Con diferencias`, and `Recontrolar caja`, without widening Cajas scope.

#### SCN-057 — Cutover slices are explicit and non-overlapping
**Given** two candidate adoption slices define company, deposit/custody, Article set, traceability scope, and effective boundary  
**When** slice readiness is reviewed  
**Then** activation remains blocked unless their scopes are explicit and non-overlapping, with any overlap resolved under a separately approved cutover plan.

#### SCN-058 — Cross-boundary operations require an approved rule
**Given** an open operation crosses a slice cutoff or a document is dated before cutoff but confirmed after it  
**When** its Stock consequence is evaluated  
**Then** it follows the explicitly approved slice rule and is neither silently backdated into fabricated history nor assigned by operator convention alone.

#### SCN-059 — Stabilization blocks premature slice expansion
**Given** an active slice has not met approved reconciliation, duplicate-suppression, projection-equality, unresolved-operation, or operator-visible failure tolerances  
**When** expansion to another slice is proposed  
**Then** expansion remains blocked until stabilization evidence satisfies the separately approved criteria.

#### SCN-060 — Accessibility covers targets, reflow, contrast, and names
**Given** Stock search, results, detail, history, status, and critical controls are inspected with zoom/reflow and assistive input  
**When** repeated or primary touch targets, icon-only actions, text, controls, focus indicators, disabled states, and status indicators are evaluated  
**Then** targets provide at least `44x44` CSS pixels or an equivalent usable area, zoom/reflow hides no critical context or action, applicable AA contrast is met, and accessible names identify the affected Article/unit or action.

---

## 6. Future implementation validation — non-authorizing

A future authorized implementation plan MUST define evidence for the applicable requirements and scenarios above. At minimum, its validation matrix MUST cover:

1. requirement-to-test/evidence mapping, including positive, denial, conflict, retry, unknown-outcome, and rollback cases;
2. simultaneous fungible and identified-unit claims without oversubscription or double claim;
3. semantic retries across changed transport attempt identities and conflicting semantic reuse;
4. one accepted source confirmation and one mandatory Stock consequence, with no partial state under every mandatory failure class;
5. deterministic projection reconstruction, maintained-versus-reconstructed comparison, and safely repeatable repair evidence;
6. provider-neutral policy coverage across every trusted entry point, resource-company mismatch, safe denial, and no cross-company disclosure;
7. explicit separation and permitted correlation of immutable Stock evidence and transversal `AuditEvent`;
8. supplier receipt, no-PO denial, Preparation reservation/release/replacement, Remittance dispatch, Consumption, Return, Transfer, count/correction, reversal, and opening-position cases;
9. Cajas identified-unit, multiple-dispatch, partial Return, shared pending balance, added/replacement, difference/re-control, and no-double-effect cases;
10. honest UX states, no optimistic critical success, unknown-outcome reconciliation, desktop/tablet/mobile transformation including `412x915`, and WCAG 2.2 AA evidence;
11. bounded-slice opening, anti-double-write, shadow-read-only, one-writer, cross-boundary-operation, stabilization, rebuild, and routing-rollback evidence; and
12. assertions that no financial/fiscal effects, frontend authority, fabricated history, unsupported traceability, or cross-company leakage occur.

Exact test frameworks, commands, fixtures, files, environments, tolerances, and implementation mechanisms remain for separately approved DESIGN/TASKS and implementation briefs.

---

## 7. Decision traceability

### 7.1 Domain decisions `DR-01`–`DR-16`

| Decision | Normative coverage | Scenario coverage |
| --- | --- | --- |
| `DR-01` | `CORE-001`, `GOV-002` | `SCN-001` |
| `DR-02` | `CORE-010`–`CORE-012`, `GOV-004` | `SCN-004` |
| `DR-03` | `CORE-009` | `SCN-003`, `SCN-004` |
| `DR-04` | `EVID-001`–`EVID-002`, `FLOW-004`–`FLOW-007` | `SCN-007`–`SCN-013` |
| `DR-05` | `FLOW-009`–`FLOW-012`, `CORE-013` | `SCN-023`–`SCN-025` |
| `DR-06` | `FLOW-013`–`FLOW-014`, `FLOW-018` | `SCN-026`, `SCN-027`, `SCN-030` |
| `DR-07` | `FLOW-015`–`FLOW-020` | `SCN-028`–`SCN-032` |
| `DR-08` | `CORE-014`, `FLOW-021` | `SCN-033`, `SCN-034` |
| `DR-09` | `EVID-017`, `FLOW-022`–`FLOW-023` | `SCN-035`, `SCN-036` |
| `DR-10` | `EVID-003`, `EVID-015`–`EVID-016` | `SCN-017`, `SCN-018` |
| `DR-11` | `CORE-006`–`CORE-008` | `SCN-003` |
| `DR-12` | `CORE-003`–`CORE-005`, `CORE-014` | `SCN-002`, `SCN-033` |
| `DR-13` | `FLOW-019`–`FLOW-020`, `FLOW-030` | `SCN-025`, `SCN-030`–`SCN-032` |
| `DR-14` | `FLOW-001`–`FLOW-003` | `SCN-019`–`SCN-021` |
| `DR-15` | `FLOW-024`, `ADOPT-002`–`ADOPT-003` | `SCN-046` |
| `DR-16` | `FLOW-031`, `NEG-001` | `SCN-051` |

### 7.2 UX decisions `UXD-01`–`UXD-12`

| Decision | Normative coverage | Scenario coverage |
| --- | --- | --- |
| `UXD-01` | `UX-001`, `UX-002`, `NEG-005` | `SCN-053` |
| `UXD-02` | `UX-003`, `UX-004` | `SCN-002`, `SCN-003` |
| `UXD-03` | `UX-006`, `UX-007` | `SCN-004` |
| `UXD-04` | `UX-008` | `SCN-054` |
| `UXD-05` | `UX-009`–`UX-011` | `SCN-055` |
| `UXD-06` | `FLOW-001`–`FLOW-003`, `UX-014`–`UX-015` | `SCN-019`–`SCN-021` |
| `UXD-07` | `FLOW-021` | `SCN-033`, `SCN-034` |
| `UXD-08` | `FLOW-022`–`FLOW-023` | `SCN-035`, `SCN-036` |
| `UXD-09` | `UX-014`–`UX-017`, `FLOW-027` | `SCN-015`, `SCN-037`, `SCN-039` |
| `UXD-10` | `UX-012` | `SCN-043` |
| `UXD-11` | `UX-019`, `UX-020` | `SCN-044` |
| `UXD-12` | `UX-013`, `UX-018` | `SCN-041`, `SCN-042` |

### 7.3 Architecture decisions `A-01`–`A-12`

| Decision | Normative coverage | Scenario coverage |
| --- | --- | --- |
| `A-01` | `CORE-002` | `SCN-002`, `SCN-005` |
| `A-02` | `CORE-003`, `CORE-004` | `SCN-002` |
| `A-03` | `CORE-006`–`CORE-008` | `SCN-003`, `SCN-010` |
| `A-04` | `EVID-001`–`EVID-003` | `SCN-008`, `SCN-012` |
| `A-05` | `EVID-004`–`EVID-007` | `SCN-016`, `SCN-049` |
| `A-06` | `EVID-008`–`EVID-010` | `SCN-009`–`SCN-011` |
| `A-07` | `EVID-011`–`EVID-014` | `SCN-008`, `SCN-014`, `SCN-015` |
| `A-08` | `EVID-015`–`EVID-017` | `SCN-017`, `SCN-018`, `SCN-036` |
| `A-09` | `AUTH-001`, `AUTH-003`, `NEG-006` | `SCN-006` |
| `A-10` | `AUTH-002`–`AUTH-010`, `NEG-008` | `SCN-005`, `SCN-006` |
| `A-11` | `FLOW-025`–`FLOW-029` | `SCN-023`, `SCN-024`, `SCN-037`–`SCN-039` |
| `A-12` | `ADOPT-001`–`ADOPT-012`, `FLOW-024` | `SCN-046`–`SCN-050`, `SCN-057`–`SCN-059` |

### 7.4 Inherited Cajas Option A obligations

| Cajas obligation | Normative coverage | Scenario coverage |
| --- | --- | --- |
| Confirmed incorporation reserves; browsing/draft does not | `FLOW-004`, `FLOW-005` | `SCN-007`–`SCN-010` |
| Replacement/removal/cancellation releases only applicable commitment | `FLOW-006`, `FLOW-007` | `SCN-012`, `SCN-013` |
| Control/re-control is evidence-only | `FLOW-008` | `SCN-022` |
| Successful issuance dispatches; failure has no effect | `FLOW-009`, `FLOW-010`, `FLOW-025` | `SCN-023`, `SCN-024` |
| Multiple dispatches bounded; remainder reserved | `FLOW-011`, `CORE-013` | `SCN-025` |
| Partial Return is dispatch-linked and cannot release whole Box | `FLOW-017`, `FLOW-019` | `SCN-030`, `SCN-031` |
| Consumption/Return share pending balance with one disposition | `FLOW-018` | `SCN-027`, `SCN-030` |
| Missing/damaged/unresolved stays unavailable/review | `FLOW-016`, `FLOW-020` | `SCN-029`–`SCN-032` |
| Added/replacement effects are explicit, not inferred | `FLOW-020` | `SCN-032` |
| Atomic, attributable, idempotent, no-double-effect outcomes | `EVID-011`–`EVID-014`, `FLOW-025`–`FLOW-027` | `SCN-008`, `SCN-014`, `SCN-023`, `SCN-037` |
| Minimum identified-unit effects without full composition Stock | `FLOW-030`, `GOV-005` | `SCN-025`, `SCN-031` |
| Exact inherited Cajas public labels remain contextual | `UX-023` | `SCN-056` |
| No automatic financial/commercial/accounting effect | `FLOW-031`, `NEG-001` | `SCN-051` |

### 7.5 Direct accessibility obligation coverage

| Cross-cutting obligation | Normative coverage | Scenario coverage |
| --- | --- | --- |
| Keyboard, focus, programmatic status, and non-color distinctions | `UX-021`, `UX-022` | `SCN-045` |
| `44x44` targets/equivalent area, zoom/reflow, AA contrast, and accessible names | `UX-021`, `UX-022` | `SCN-060` |

---

## 8. Documentary family and gate coverage

| Family | Requirements that constrain future planning | Current state |
| --- | --- | --- |
| `E00` | `GOV-001`–`GOV-006`, `DOC-001`–`DOC-006` | **BLOCKED — planning only** |
| `E01` | `CORE-001`–`CORE-014` | **BLOCKED — no schema/identity implementation** |
| `E02` | `EVID-001`–`EVID-017` | **BLOCKED — no persistence/algorithm implementation** |
| `E03` | `AUTH-001`–`AUTH-010`, `NEG-008` | **BLOCKED — no Auth/permission/security implementation** |
| `E04` | `UX-001`–`UX-023` | **BLOCKED — no UI implementation** |
| `E05` | `FLOW-001`–`FLOW-003` | **BLOCKED — no receipt implementation** |
| `E06` | `FLOW-004`–`FLOW-008`, `FLOW-030` | **BLOCKED — no Preparation/Cajas/Cirugías implementation** |
| `E07` | `FLOW-009`–`FLOW-012`, `FLOW-025`–`FLOW-029` | **BLOCKED — no Remittance integration implementation** |
| `E08` | `FLOW-013`–`FLOW-020` | **BLOCKED — no Consumption/Return implementation** |
| `E09` | `FLOW-021`, `CORE-014` | **BLOCKED — no Transfer implementation** |
| `E10` | `FLOW-022`–`FLOW-023`, `EVID-015`–`EVID-017` | **BLOCKED — no count/correction implementation** |
| `E11` | `FLOW-024`, `ADOPT-001`–`ADOPT-012` | **BLOCKED — no migration/cutover/production work** |

Protected gates remain:

- `G-SCHEMA`: **BLOCKED** — exact schema brief, reviewed design, lock, and Franco approval required.
- `G-MIGRATION`: **BLOCKED** — independent migration/data/reconciliation/opening plan, evidence, rollback, and Franco approval required.
- `G-AUTH`: **BLOCKED** — productive Auth remains controlled by the unresolved final Auth decision.
- `G-PERMISSIONS`: **BLOCKED** — capability vocabulary, mappings, exceptional authority, RLS/security implementation, and matrix require separate approval.
- `G-CIRUGIAS`: **BLOCKED** — any Surgery/Record, Expediente, Ficha CX, Cajas placement, hook, store, type, or Cirugías change requires exact brief, lock, and Franco approval.
- `G-PRODUCTION`: **BLOCKED** — data creation, cutover, deployment, rollout, live repair, monitoring activation, and writer routing require explicit go/no-go approval.
- `G-APPLY`: **BLOCKED** — no implementation may begin after documentary T4 without a separate dispatch and Franco approval.

---

## 9. Specification acceptance conditions

This SPEC is acceptable for independent read-only verification only when:

1. proposal and seven frozen source hashes remain exact;
2. exactly 127 normative requirements and 60 balanced Given/When/Then scenarios exist, and every approved `DR`, `UXD`, and `A` decision and each inherited Cajas obligation traces to direct normative requirements and scenarios;
3. requirements distinguish product behavior from future non-operative validation;
4. no table, field, endpoint, role, capability identifier, algorithm, source file, or other reserved implementation detail is selected;
5. company isolation, provider-neutral authorization, evidence/audit separation, atomic no-partial behavior, retry safety, and historical integrity are explicit;
6. supplier receipt, Preparation, Remittance, Consumption, Return, Transfer, count/correction, reversal, opening, and Cajas checkpoints are covered;
7. `/stock`, quantity hierarchy, detail/history, honest states, critical-action safety, responsive transformation, and WCAG 2.2 AA are covered;
8. bounded adoption, one-writer cutover, anti-double-write, no fabricated history, reconstruction, stabilization, and routing rollback are covered;
9. non-goals prohibit financial effects, frontend truth, optimistic critical success, unsupported scope, and cross-company leakage;
10. `E00`–`E11` and all protected `G-*` gates remain blocked and independently approved; and
11. only `knowledge/specs/STOCK-V1-SDD-001/SPEC.md` is created by this phase, with no implementation or Git mutation.

Passing these conditions authorizes only independent read-only verification of this SPEC. A verified SPEC may allow the orchestrator to dispatch one separately bounded documentary DESIGN phase. It does not authorize DESIGN automatically, and it never authorizes implementation.

---

## 10. Stop statement

Stop and return to Franco/the orchestrator if provenance changes, another writer overlaps this file, a source conflict appears, scope requires another file, an approved decision would change, a reserved implementation detail must be selected, or any protected gate would need approval by implication.

`STOCK-V1-SDD-001` remains a documentary execution-plan package. This specification introduces no new product, architecture, security, data, UX, migration, production, or implementation decision.
