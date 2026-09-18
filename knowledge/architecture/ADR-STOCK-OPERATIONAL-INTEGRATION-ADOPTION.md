# ADR — Stock Operational Integration and Adoption

## Metadata

- **Status:** ACCEPTED — A-11 and A-12 approved by Franco on 2026-07-20 as part of blanket approval A-01–A-12
- **Date:** 2026-07-20
- **Owner:** Integration / Migration Architect
- **Approver:** Franco
- **Approval date:** 2026-07-20
- **Approval basis:** Franco explicitly approved Stock V1 architecture decisions A-01 through A-12; A-11 and A-12 are accepted exactly as verified, without revision or scope drift.
- **Scope:** Stock V1 operational atomicity, integration boundaries, reconciliation, opening position, and bounded cutover/adoption (`A-11` and `A-12` only)
- **Supersedes:** None
- **Superseded by:** None
- **Decision independence:** A-11 and A-12 remained independently reviewable and are now accepted without revision under Franco's blanket approval A-01–A-12.
- **Authorization effect:** None. Acceptance selects the recorded architecture directions and authorizes only the next documentary SDD execution-plan phase; it does not authorize schema changes, migrations, reconciliation execution, opening-position creation, production cutover, backend/API or integration implementation, permissions/Auth changes, Cajas implementation, Cirugías changes, or APPLY.

## Context

The approved Stock domain and UX baselines require each accepted Stock effect to be explainable, company-scoped, attributable, retry-safe, and linked to the business confirmation that caused it. They also require honest initial adoption: a dated, reconciled opening position must establish the starting point without inventing supplier receipts, Remittances, Transfers, Consumption, Returns, or other historical movements.

The critical operational owners remain distinct:

- Remittance owns successful issuance and what was dispatched.
- Consumption owns the human-validated declaration of what was used against a specific Remittance.
- Return owns human validation and explicit disposition of returned or accounted-for material.
- Stock owns the mandatory quantity, custody, commitment, or final-disposition consequence of those accepted confirmations.
- Articles/Stock owns the approved Cajas masters and physical identities, while Surgery/Record remains the operation context for approved Box actions.

These boundaries must not produce two independently visible outcomes for one operator confirmation. For example, a Remittance cannot be shown as successfully issued while its mandatory dispatch Stock effect failed; accepted Consumption cannot exist without its required final Stock consequence; and an accepted Return cannot be visible while its required availability/review/disposition effect is missing. Conversely, Stock must not claim an effect when the owning business confirmation failed.

The accepted Cajas Stock ADR already selects explicit reservations plus append-only Stock transactions as its directional architecture and requires business checkpoints and mandatory Stock effects to be atomic, audited, and idempotent. The accepted Cajas operational-integration ADR selects synchronous modular orchestration in the existing server application. This ADR preserves those accepted observable constraints and generalizes only the integration and adoption direction needed by Stock V1. It does not change Cajas scope or select exact service, endpoint, table, command, or source-file designs.

Current records, prototype balances, mock data, local state, and soft Article/Box references do not constitute complete physical Stock history. Some current Remittance, Consumption, and Return slices are backend-backed and remain valid business evidence in their owning domains, but they cannot automatically be treated as historical Stock movements or opening quantities.

## Decision drivers

1. No partial visible success between a business confirmation and its mandatory Stock consequence.
2. Immediate, honest operator feedback for critical confirmations.
3. One accepted business cause produces its Stock consequence exactly once, including retries and uncertain outcomes.
4. Existing Remittance, Consumption, Return, and Cajas ownership remains intact.
5. Stock effects remain server-owned and company-scoped without frontend or duplicate-domain write authority.
6. Adoption does not fabricate history or silently reinterpret legacy/prototype data.
7. Cutover is bounded, observable, reconcilable, and reversible at the routing/deployment level without deleting accepted evidence.
8. Projections can be checked, repaired, or rebuilt from accepted evidence.
9. The initial direction fits the current modular monolith and shared PostgreSQL baseline without requiring a broker or distributed transaction.
10. Migration and production cutover require separate planning and authorization.

## A-11 — Operational atomicity and integration boundaries

### Option A — Synchronous orchestration with one database transaction

An application-level orchestrator invokes the owning domain rules and the Stock boundary synchronously. For each critical business confirmation, the accepted business result and every mandatory Stock effect commit in one database transaction. If any validation, authorization, concurrency, persistence, audit, or mandatory projection step fails, the transaction rolls back and no partial accepted result is exposed.

**Advantages**

- Directly enforces the approved all-or-nothing observable behavior.
- Gives the caller one authoritative success or failure result.
- Keeps Remittance, Consumption, Return, Cajas, and Stock responsibilities distinct while sharing a commit boundary.
- Avoids compensating for a business success that should never have been independently committed.
- Fits the current server application and shared PostgreSQL direction.
- Simplifies retry reconciliation because accepted business evidence and the mandatory Stock effect share one committed outcome.

**Tradeoffs**

- Cross-domain transaction ownership and dependency direction must be explicit.
- The transaction must remain bounded; unrelated notifications, exports, or external integrations cannot enlarge the critical commit.
- Domain services must accept transaction-scoped execution without bypassing their own invariants.
- Concurrency, idempotency identity, and projection update rules still need exact later contracts.
- Future service extraction would require a new architecture decision because a local database transaction would no longer span boundaries automatically.

### Option B — Asynchronous event-driven integration with eventual consistency

The owning domain commits its business confirmation, emits a durable event, and allows Stock to apply the consequence asynchronously. Retries, inbox/outbox processing, process state, and compensation handle downstream failures.

**Advantages**

- Stronger temporal and deployment decoupling between domains.
- Natural distribution path if domains later become separate services.
- Durable events may serve external integrations and non-critical post-commit work.

**Tradeoffs**

- The business confirmation can become visible before the mandatory Stock effect exists.
- A failed or delayed Stock consumer creates an intermediate state that contradicts the approved no-partial-success UX.
- Compensation cannot make an already observed success equivalent to an atomic failure.
- Requires ordering, deduplication, outbox/inbox, replay, poison-message, monitoring, and operator-recovery contracts not justified for the current stage.
- Expands the business state model with pending/compensating conditions that are not approved Stock domain states.

### Accepted decision for A-11

**Accepted:** adopt **Option A: synchronous orchestration with one database transaction** for every business confirmation whose approved outcome has a mandatory Stock effect.

The transaction boundary includes:

1. trusted actor and company context validation;
2. source-domain validation and stale/concurrency checks;
3. the owning business confirmation or immutable accepted evidence;
4. all mandatory Stock effects for that confirmation;
5. the shared correlation/idempotency evidence needed to recognize the accepted outcome; and
6. any immediately authoritative projection update required to prevent a stale success response.

The transaction boundary excludes unrelated or optional post-commit work such as notifications, analytics, exports, emails, or external integrations. Such work may later use durable post-commit delivery, but its failure must not reinterpret, duplicate, or roll back an already accepted business-and-Stock transaction. This ADR does not select an outbox, broker, queue, or delivery mechanism.

An application orchestrator coordinates the transaction; it does not become the owner of domain invariants. Remittance, Consumption, Return, Cajas, and Stock remain responsible for their own validation and evidence. No frontend, read model, or source domain may write a substitute Stock consequence.

### Operational integration matrix

| Owning operation/checkpoint | Owning-domain accepted evidence | Mandatory Stock consequence in the same transaction | Failure result | Explicitly excluded inference |
| --- | --- | --- | --- | --- |
| Remittance successful issuance | Accepted issuance and immutable dispatched content/reference | Dispatch effect that removes availability and places the affected quantity/unit in dispatched/external-custody/transit context | Neither accepted issuance nor dispatch Stock effect is committed | Draft creation, preparation control, or failed issuance does not dispatch |
| Consumption confirmation | Human-validated Consumption linked to a specific Remittance and remaining accountable quantity | Final consumed disposition for the same accepted quantity/unit | Neither accepted Consumption nor consumed Stock effect is committed | No generic adjustment and no simultaneous returned-available treatment |
| Return confirmation | Human-validated Return with explicit bounded disposition against relevant dispatch evidence | Availability, under-review, consumed, damaged, or missing consequence for each accepted quantity/unit, as applicable | Neither accepted Return disposition nor its Stock consequence is committed | Draft Return and comparison do not create availability or balancing effects |
| Cajas pre-dispatch cancellation | Accepted cancellation/release evidence in its approved owning context | Release of the applicable reservation | Neither cancellation/release acceptance nor reservation release is committed | No dispatch, Return, Consumption, billing, commercial, or accounting effect |
| Cajas Remittance/Consumption/Return checkpoints | The same owner evidence described above, preserving identified Box, dispatch, and partial-accounting context | Minimum approved identified-unit/Stock effect, without full Box-composition Stock | No partial owner/Stock success; existing reservation/control evidence remains according to the approved checkpoint | Control/re-control does not duplicate reservation or infer later effects |

The matrix is conceptual. It neither creates an endpoint nor selects an orchestrator, service name, command shape, transaction API, schema, or source file.

### Failure and retry semantics

1. **Precondition, authorization, or company-scope failure:** reject before mutation; commit no business confirmation and no Stock effect.
2. **Stale or concurrency conflict:** commit neither side; return a conflict requiring reload/reconciliation and explicit review before another confirmation.
3. **Source-domain validation failure:** commit neither side and preserve only non-accepted draft/input behavior already owned by that domain.
4. **Stock invariant failure:** roll back the complete transaction, including the source-domain confirmation.
5. **Persistence or mandatory projection failure before commit:** roll back the complete transaction and expose no accepted success.
6. **Commit succeeds but the response is lost or times out:** the outcome is unknown to the caller, not failed. Before retry, the system must reconcile by stable business-operation identity. If already accepted, return the existing evidence; if absent, allow a safe retry. Never create a second effect.
7. **Optional post-commit work fails:** the accepted business-and-Stock outcome remains accepted. The optional work follows its own visible retry/monitoring policy and cannot duplicate the critical transaction.
8. **Read refresh fails after accepted commit:** show accepted evidence with honest stale/refreshing state; do not claim that the transaction failed or invite blind resubmission.
9. **Rollback after an exception:** database rollback must leave no partially visible accepted business record, Stock effect, mandatory projection delta, or duplicate audit fact.

No critical Stock confirmation may use optimistic success. A toast, dialog close, client-state change, or source-document status alone is not accepted evidence.

## A-12 — Opening position, cutover, and adoption

### Option A — Dated reconciled opening positions with bounded-slice cutover

For each authorized cutover slice, establish one explicit opening position at a declared effective date/time from reconciled physical and operational evidence. Existing historical documents remain historical evidence in their owning domains but are not converted into invented Stock movements. Activate the new Stock writer only for the bounded slice after reconciliation and readiness gates pass.

**Advantages**

- Preserves historical honesty and the approved `DR-15` baseline.
- Creates a clear line between pre-adoption evidence and post-adoption Stock effects.
- Allows reconciliation and rollback gates to be exercised on a manageable scope.
- Avoids pretending current soft references or incomplete documents form a complete movement chain.
- Supports projection rebuild from a known starting point plus accepted post-cutover effects.

**Tradeoffs**

- Pre-cutover movement-level Stock history remains intentionally unavailable.
- Opening quantities and identified units require operational reconciliation and evidence.
- Open Remittance/Consumption/Return/Cajas cases crossing the boundary need an explicit runbook classification before activation.
- Adoption proceeds progressively rather than through one global switch.
- Reports must clearly distinguish opening evidence from later operational movements.

### Option B — Historical movement backfill

Translate legacy business records, prototype balances, and soft references into a reconstructed sequence of historical Stock movements, then derive current positions from that sequence.

**Advantages**

- Could provide a longer apparent movement history.
- Could avoid a visible opening-position discontinuity if source data were complete and trustworthy.
- May support historical analytics where evidence quality is sufficient.

**Tradeoffs**

- Current evidence is not complete enough to prove physical quantity, timing, custody, traceability, validation, or one-cause/one-effect history.
- Mapping incomplete records would invent precision and may duplicate effects already represented indirectly.
- Historical corrections could be mistaken for facts accepted at the original time.
- Reconciliation becomes harder because errors are distributed across fabricated history rather than isolated in an explicit opening position.
- Conflicts directly with the approved prohibition on invented historical movements.

### Accepted decision for A-12

**Accepted:** adopt **Option A: dated reconciled opening positions with bounded-slice cutover**. Reject historical movement backfill for Stock V1 unless a future, separately approved evidence assessment proves a narrow source complete enough for factual import without inference. Such a future exception would require its own ADR and would not alter the default established here.

An opening position is a distinct accepted Stock cause, not a supplier receipt, generic `Ingreso`, adjustment, Transfer, Remittance, Return, or reconstructed event. It records the effective date/time, company, bounded deposit/custody and Article/traceability scope, reconciled quantities or identified units, evidence reference, actor/reviewer context under a later approved authorization design, and any declared exceptions. This ADR does not authorize creating that record or decide its schema.

### Adoption stages

| Stage | Purpose | Entry gate | Exit evidence | Production effect under this ADR |
| --- | --- | --- | --- | --- |
| 0. Scope and source inventory | Define a bounded candidate slice and identify current business sources, prototype/local sources, soft references, open operations, and data owners | Documentary approval and named slice | Source inventory, known gaps, owner, proposed effective boundary | None |
| 1. Reconciliation design | Define how physical observation and trustworthy operational evidence will reconcile the opening scope and exceptions | Separately approved reconciliation Task Brief | Reconciliation rules, evidence requirements, discrepancy handling, and sign-off criteria | None |
| 2. Dry run / shadow projection | Calculate candidate opening positions and replay only authorized test fixtures or non-authoritative comparisons; compare projected outputs without writing productive Stock truth | Authorized environment and exact data-access plan | Difference report, projection reproducibility, performance/operability evidence | None unless separately authorized; shadow results are never authoritative |
| 3. Slice readiness | Resolve or explicitly classify differences and open cross-boundary operations; freeze the exact cutoff scope and rollback gate | Franco-approved slice/cutover plan | Reconciled candidate, exception register, go/no-go record, writer-routing plan | None |
| 4. Opening acceptance and writer switch | Accept one dated opening position for the slice and activate exactly one authoritative Stock effect path for post-cutoff confirmations | Separate schema/migration/data/cutover authorization | Accepted opening evidence, effective boundary, active writer identity, baseline reconciliation | Unauthorized by this ADR |
| 5. Stabilization | Monitor source-to-Stock atomicity, projection equality, duplicate suppression, unresolved operations, and operator-visible failures | Activated authorized slice | Reconciliation reports and incident/repair evidence within approved tolerances | Unauthorized by this ADR |
| 6. Expand, hold, or roll back routing | Decide whether to add another bounded slice, keep the current one, pause confirmations, or restore prior routing safely | Stabilization review and explicit approval | Decision record and preserved accepted history | Unauthorized by this ADR |

A bounded slice must be explicit and non-overlapping. Candidate dimensions include company, deposit/custody context, Stock-controlled Article set, and applicable traceability profile. The exact slicing key and order remain a future cutover-plan decision. No global production cutover is implied.

### Anti-double-write principles

1. For any active slice and business checkpoint, exactly one path owns the authoritative Stock write.
2. Shadow calculations and compatibility reads may compare results but must not create accepted Stock effects.
3. Legacy/prototype/local balance mutation must be disabled, made read-only, or kept outside the active slice before the new writer is enabled; dual authoritative writes are prohibited.
4. The source domain submits one confirmation to the orchestrated boundary; it must not separately update Stock before or after that call.
5. Slice boundaries and effective times must be persisted or otherwise made enforceable by a later approved design; operator convention alone is insufficient.
6. Retries use stable business-operation identity and reconcile uncertain outcomes before re-execution.
7. A document dated before cutover but confirmed after cutover must follow one explicitly approved boundary rule; it cannot be silently backdated into invented Stock history.
8. Open operations crossing cutover must be classified and reconciled in the slice runbook; this ADR does not invent a universal treatment for them.

### Reconciliation, projection repair, and rebuild principles

- Reconciliation compares accepted source-domain evidence, accepted Stock effects, the opening position, and current projections at the same company/slice/effective boundary.
- Every accepted source confirmation requiring Stock must have exactly one matching mandatory Stock consequence; every mandatory Stock consequence must identify one accepted source cause or the explicit opening position.
- Quantity and identified-unit conservation checks must respect deposit/custody, transit, reservation, under-review, Consumption, Return disposition, and applicable traceability boundaries.
- A projection is derived operational state, not an alternate write source. If it diverges, repair or rebuild it from the accepted opening position plus accepted post-cutover Stock evidence.
- Projection repair must not edit source confirmations, invent movements, erase accepted Stock evidence, or silently convert an unexplained difference into an adjustment.
- If accepted evidence itself is wrong, use the separately approved linked correction/reversal path; do not rewrite history during reconciliation.
- Rebuilds must be deterministic for the same accepted evidence and must expose unresolved or invalid evidence rather than producing a plausible-looking total.
- Reconciliation reports and repair actions require attributable audit evidence under the separately approved audit architecture.

### Rollback principles

“Rollback” in adoption means safe deployment or writer-routing recovery, not deletion of accepted Stock history.

- Before opening acceptance and writer activation, the candidate slice can be abandoned without productive Stock effects.
- After an opening position or post-cutover effects are accepted, they must not be deleted or hidden to simulate a rollback.
- If a defect threatens correctness, pause affected critical confirmations, preserve accepted evidence, reconcile the slice, and choose a forward repair, projection rebuild, linked correction/reversal, or explicitly approved writer-routing rollback.
- Routing must never revert to a legacy writer in a way that loses or duplicates accepted post-cutover effects.
- A rollback gate must state the last safe boundary, affected slice, accepted effects since activation, reconciliation status, and how operator-visible truth remains available.
- Expansion to the next slice remains blocked until the current slice passes its stabilization and reconciliation criteria.

## Consequences and tradeoffs

### Positive

- Critical operational confirmations have one immediate, atomic success/failure contract.
- Remittance, Consumption, Return, Cajas, and Stock retain clear ownership without duplicate writes.
- Retries and uncertain responses resolve against accepted evidence rather than applying blind compensation.
- Adoption begins from explicit truth rather than fabricated movement history.
- Bounded slices limit operational blast radius and make go/no-go evidence reviewable.
- Rebuildable projections provide a recovery path without making balances an unexplained source of truth.

### Negative

- Synchronous coordination introduces coupling at the application and database transaction boundary.
- Long-running or external work must be separated from the critical transaction and operated independently.
- Reconciliation and cutover require substantial operational preparation before implementation value appears.
- Historical Stock analytics before the opening date remain unavailable unless supported by independently trustworthy evidence.
- Open operations that cross a slice boundary require explicit handling rather than a universal automatic rule.

### Risks and controls

| Risk | Architectural control |
| --- | --- |
| An owner commits before Stock and exposes partial success | One orchestrated database transaction; no success response until commit |
| Transaction orchestration absorbs domain rules | Domains retain invariant ownership; orchestrator coordinates only |
| Transaction becomes too broad | Include only accepted business evidence, mandatory Stock/audit/idempotency evidence, and mandatory immediate projection work |
| Lost response causes duplicate retry | Reconcile by stable business-operation identity before re-execution |
| Optional event failure is mistaken for business failure | Optional post-commit work has separate status and cannot reinterpret the committed outcome |
| Cutover writes both legacy and new Stock | One authoritative writer per explicit slice; shadow paths are read/compare only |
| Legacy documents become invented history | Use one explicit dated opening position; reject default historical backfill |
| Opening position hides unresolved discrepancies | Require reconciliation evidence and an explicit exception register before acceptance |
| Projection divergence becomes a manual balance edit | Deterministic repair/rebuild from accepted evidence; correction/reversal for factual errors |
| Rollback deletes accepted facts | Roll back routing/deployment only; preserve history and reconcile forward |
| Cajas constraints are weakened | Preserve accepted identified-unit, dispatch, partial-accounting, failure, and no-double-effect behavior |
| Stock triggers financial consequences | Keep billing, commercial, valuation, accounting, collection, and fiscal behavior outside the transaction |

## Validation criteria for future authorized phases

Any later SPEC, TASKS, implementation, migration, reconciliation, or cutover plan must provide evidence for all applicable criteria below.

### Atomicity and integration

1. A successful Remittance confirmation and its mandatory dispatch Stock effect commit together.
2. Failed Remittance issuance commits neither accepted issuance evidence nor dispatch Stock effect and preserves prior reservation/control evidence as approved.
3. Accepted Consumption and its final consumed Stock consequence commit together and cannot exceed or double-account the relevant dispatch.
4. Accepted Return disposition and every mandatory Stock consequence commit together; draft or failed Return creates no availability.
5. Cajas checkpoints preserve identified-unit, multiple-dispatch, partial-return, reservation/release, and no-inferred-control-effect constraints.
6. Authorization, company-scope, stale, concurrency, or Stock-invariant failures leave no partial accepted business or Stock result.
7. Repeated confirmation, browser retry, timeout retry, or lost response produces one accepted business outcome and one mandatory Stock consequence.
8. Optional post-commit failures do not roll back or duplicate the accepted critical transaction.
9. No frontend, local state, read model, Remittance, Consumption, Return, or Cajas path acts as an independent Stock writer.

### Adoption and reconciliation

10. Every opening position is explicit, dated, company-scoped, reconciled, evidenced, and distinguishable from operational movements.
11. No historical supplier receipt, Remittance, Transfer, Consumption, Return, or correction is fabricated from incomplete legacy/prototype evidence.
12. Each activated slice has a non-overlapping scope, effective boundary, one authoritative writer, open-operation treatment, go/no-go record, and rollback gate.
13. Shadow comparisons cannot mutate productive Stock truth or produce operator-visible accepted success.
14. Source confirmations and mandatory Stock effects reconcile one-to-one within the active slice, except the explicit opening-position cause.
15. Projections rebuild deterministically from the opening position plus accepted post-cutover evidence and match authoritative reconciliation totals.
16. Projection repair does not alter accepted history; factual correction uses linked correction/reversal evidence.
17. A failed cutover or stabilization breach can pause the slice and recover routing without deleting, hiding, or duplicating accepted effects.
18. Expansion remains blocked until the prior slice meets approved reconciliation and operational tolerances.

### Boundary validation

19. No test or implementation treats Stock acceptance as billing, commercial, valuation, accounting, collection, or fiscal acceptance.
20. No validation of this ADR depends on an exact endpoint, service, schema, role mapping, provider, queue, broker, or Cirugías refactor selected here.

## Explicit non-goals and blocked work

This ADR does not select or authorize:

- exact endpoints, Server Actions, commands, service classes, orchestrator names, source files, module dependencies, or UI components;
- a concrete database schema, transaction API, isolation level, lock strategy, idempotency-key format, projection table, audit table, or reconciliation query;
- schema edits, migrations, seeds, imports, opening-position creation, historical backfill, reconciliation execution, or production data changes;
- production cutover, dual-running infrastructure, feature flags, deployment, rollback execution, or operational runbooks;
- Auth changes, role names, capability mappings, permission matrices, or multi-company security implementation;
- Cajas implementation, full Box-composition Stock, or changes to accepted Cajas product behavior;
- Remittance, Consumption, Return, Surgery/Record, Expediente, Ficha CX, or Cirugías refactors;
- asynchronous infrastructure, a queue, broker, outbox/inbox implementation, or a new dependency;
- costing, valuation, billing, commercial, accounting, collection, fiscal, purchasing, or replenishment effects; or
- implementation, APPLY, or automatic progression beyond the authorized next documentary SDD execution-plan phase.

Only the next documentary SDD execution-plan phase is authorized. Schema, migration, reconciliation execution, opening-position creation, backend/API or integration implementation, production cutover, protected-file changes, and APPLY remain blocked pending Franco's separate approval and exact Task Briefs.

## Decision register — accepted under blanket approval

| ID | Decision | Accepted option | Approval state |
| --- | --- | --- | --- |
| `A-11` | **Operational atomicity and integration boundary.** A business confirmation and every mandatory Stock effect use synchronous modular orchestration and commit in one database transaction; no partial visible success is permitted. Asynchronous eventual consistency is reserved for optional post-commit work and is not the critical confirmation path. | **Option A — synchronous orchestration with one database transaction** | **ACCEPTED — approved by Franco on 2026-07-20** |
| `A-12` | **Opening position and bounded adoption.** Use explicit dated reconciled opening positions, no fabricated historical movements, one authoritative writer per bounded slice, and repairable/rebuildable projections. Historical backfill is rejected as the default; migration and production cutover remain separately unauthorized. | **Option A — dated reconciled opening positions with bounded-slice cutover** | **ACCEPTED — approved by Franco on 2026-07-20** |

Franco explicitly approved Stock V1 architecture decisions `A-01` through `A-12` as a blanket approval on 2026-07-20. Within this ADR, `A-11` and `A-12` are accepted exactly as verified, with no revision, narrowing, expansion, or other drift. Their acceptance authorizes only the next documentary SDD execution-plan phase and does not authorize implementation, schema, migration, reconciliation execution, opening-position creation, integration work, or production cutover.

## Approval record

- [x] Franco approved `A-11` Option A on 2026-07-20.
- [x] Franco approved `A-12` Option A on 2026-07-20.
- [x] Both decisions were accepted exactly as verified as part of blanket approval `A-01`–`A-12`, without drift.
- [x] Only the next documentary SDD execution-plan phase is authorized.
- [x] Schema, migrations, reconciliation execution, opening-position creation, backend/API or integration implementation, production cutover, protected-file changes, and APPLY remain unauthorized.

## References and provenance

- `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` — approved domain baseline; verified working-tree blob `926476e1d5e275768296329e099e32e04069224e` before drafting.
- `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` — approved UX baseline; verified working-tree blob `95d8d986e7dc426b48a7b4480966a558a54d52ed` before drafting.
- `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` — accepted Cajas Stock direction; verified working-tree blob `5f470c58113c8990ea8bd83aaa811730f9417a55` before drafting.
- `knowledge/architecture/ADR-CAJAS-OPERATIONAL-INTEGRATIONS.md` — accepted Cajas synchronous modular integration direction.
- `knowledge/domain/PREPARACION_REMITOS_CONSUMO.md` — current ownership and domain constraints for Remittance, Consumption, and Return.
- `knowledge/core/PROJECT_BRIEF.md` and `knowledge/core/CANONICAL_DECISIONS.md` — canonical product, technical-source-of-truth, and approval boundaries.
