# ADR — Stock Evidence, Reservations, Projections, and Correction

## Metadata

- **Status:** ACCEPTED — A-04–A-08 approved by Franco on 2026-07-20 as part of blanket A-01–A-12 approval
- **Date:** 2026-07-20
- **Owner:** Transactional Domain Architecture
- **Approver:** Franco
- **Approval date:** 2026-07-20
- **Scope:** Stock V1 architecture decisions A-04, A-05, A-06, A-07, and A-08 only
- **Supersedes:** None
- **Superseded by:** None
- **Decision independence:** These decisions remain bounded to this ADR even though Franco accepted them through the blanket A-01–A-12 approval.
- **Approval basis:** A-04–A-08 were accepted exactly as verified, without revision, narrowing, expansion, or semantic drift.
- **Authorization effect:** Documentary only — the next documentary SDD execution-plan phase is authorized; schema, migration, reconciliation execution, implementation, APPLY, and production changes remain unauthorized.

Acceptance of this ADR approves only the five conceptual architecture directions recorded below and authorizes continuation only to the next documentary SDD execution-plan phase. It does not authorize a table, field, key, constraint, transaction implementation, Prisma change, migration, reconciliation run, opening-position load, API, service, permission, Auth behavior, UI implementation, integration change, protected-file change, APPLY, or production change.

## Context

The approved Stock V1 domain baseline requires Stock to be company-scoped and explainable by accepted business causes rather than maintained as one unexplained number. It distinguishes temporary commitment from physical or disposition change, prohibits reservation oversubscription, requires one accepted cause to produce its applicable Stock consequence only once, and preserves accepted history through linked correction or reversal rather than deletion.

The approved UX baseline makes those obligations observable. Operators must be able to reconcile on-hand, reserved, available, in-transit or external-custody, under-review, and applicable final-disposition views; inspect causal evidence; recognize stale conflicts; and avoid false success during retries. Current projections must therefore remain operationally useful without being mistaken for historical truth.

The accepted Cajas Stock transaction ADR selected **Option A: explicit reservation commitments plus append-only Stock transactions, with server-owned current availability projections**. That accepted direction governs Cajas checkpoint effects and is an inherited constraint here. This ADR does not reopen it. Instead, it records the wider conceptual consistency rules needed for Stock V1 evidence, reservation lifecycle, projections, concurrent claims, duplicate suppression, and historical correction.

The companion Stock core-persistence ADR records the identities and actionable position grain for A-01 through A-03. This ADR relies only on the conceptual minimum scope of company, Article, deposit/custody, and applicable traceability or identified unit; it does not assume or authorize exact persistence artifacts or names.

## Inherited approved baselines

This ADR preserves the approved Stock domain, UX, and Cajas obligations without narrowing or extending them:

- reservation begins at confirmed Preparation selection, release is explicit, and oversubscription is prohibited;
- reservation and release are non-physical Stock effects, not dispatch, receipt, Return, or Consumption movements;
- Preparation control and re-control create evidence only and do not duplicate reservation or infer a later effect;
- accepted physical or disposition changes remain attributable to their approved business checkpoint;
- successful Remittance dispatch, validated Consumption, validated Return disposition, Transfer dispatch/receipt, accepted receipt, correction, reversal, and opening position retain their approved meanings;
- failed or draft source operations create no accepted Stock consequence where the baseline says they have no effect;
- the same confirmed source operation cannot apply the same Stock consequence twice, including retries;
- one exclusive physical unit cannot be reserved by incompatible active operations, and fungible reservations cannot exceed approved availability;
- accepted Stock history is not deleted or destructively rewritten;
- Stock changes remain atomic at the observable domain boundary, audited, and idempotent;
- current position and availability are explainable from accepted Stock evidence; and
- Stock V1 creates no costing, valuation, billing, accounting, collection, commercial, tax, or fiscal effect.

## Decision drivers

1. Honor accepted Cajas Option A without collapsing reservations into physical movements.
2. Keep current Stock reads efficient while preserving evidence as the explainable source from which projections can be reconstructed.
3. Prevent concurrent oversubscription of fungible quantities and double claim of identified units.
4. Make one-cause/one-consequence enforceable across retries independently of transport attempt identity.
5. Preserve accepted history while allowing justified correction and reversal.
6. Keep company, position, custody, and applicable traceability scope visible in every critical consistency decision.
7. Preserve observable atomic, audited, and idempotent outcomes without selecting exact database, ORM, API, or cross-domain integration implementation.
8. Support reconciliation and safe future projection repair without authorizing migration or operational repair work.

## Considered option families

### A-04 — Stock evidence and reservation representation

#### Option A — Explicit reservations separate from append-only physical/disposition movement evidence

Represent each active commitment and its lifecycle as explicit reservation evidence, separate from append-only evidence of physical movement or disposition. A reservation affects availability but does not assert that material moved. Release explicitly ends the applicable commitment; a later approved disposition accounts for the committed material according to its own checkpoint and does not retroactively turn the reservation into a movement.

**Advantages**

- Honors accepted Cajas Option A directly.
- Preserves the domain distinction between temporary commitment and physical/custody/final-disposition change.
- Makes active commitments, releases, partial accounting, and operation attribution independently inspectable.
- Prevents Preparation control, cancellation, or retry behavior from masquerading as dispatch or receipt.
- Allows movement history to remain cause-specific and append-only.

**Tradeoffs**

- Projection logic must reconcile two related evidence families: reservation lifecycle and physical/disposition movements.
- Reservation lifecycle rules must distinguish active, released, fulfilled/accounted, and invalidated outcomes conceptually without relying on movement semantics.
- Later persistence design must prevent an accepted disposition and an incompatible reservation release from making the same quantity available twice.

#### Option B — One unified journal for reservations and movements

Represent reservation, release, dispatch, receipt, Consumption, Return disposition, and correction as entries in one generic transaction journal whose type determines whether an entry is physical.

**Advantages**

- Provides one chronological mechanism and potentially one replay interface.
- Can share a common correlation and audit envelope.

**Tradeoffs**

- Reopens the accepted Cajas choice by making reservations movement-like journal entries.
- Increases the risk that a reservation is interpreted as physical movement or that generic journal rules weaken checkpoint-specific validation.
- Makes availability reconstruction depend on a growing set of type-specific signs and exceptions.

#### Option C — Mutable reservation flags or availability-only updates

Store only current reservation/availability state and overwrite it when selection, release, or disposition occurs.

**Advantages**

- Simple superficial current-state reads.
- Minimal conceptual record count.

**Tradeoffs**

- Loses attributable reservation lifecycle evidence.
- Cannot reliably prove which operation held availability or why a commitment ended.
- Makes retries, partial fulfillment, and correction difficult to explain.
- Conflicts with accepted Cajas Option A and the approved historical-truth baseline.

### A-05 — Current Stock projections and reconciliation

#### Option A — Server-owned, maintained, reconciliable projection reconstructible from accepted evidence

Maintain current position and availability projections under the trusted server boundary. Every projection change must be the derived consequence of accepted Stock evidence, including applicable opening-position, movement/disposition, reservation-lifecycle, correction, and reversal evidence. The projection may be updated for operational reads, but it is not independent truth: it must be reproducible under a defined fold and comparable with its reconstruction so divergence can be detected and repaired through a separately authorized process.

**Advantages**

- Supports efficient operational reads and the approved UX quantity hierarchy.
- Keeps accepted evidence authoritative for explanation and reconstruction.
- Enables reconciliation, drift detection, and deterministic projection replacement rather than manual balance repair.
- Allows availability to incorporate both active reservations and accepted physical/disposition evidence.
- Supports honest freshness and conflict behavior without requiring every read to replay complete history.

**Tradeoffs**

- Projection update and reconciliation behavior must be designed, tested, monitored, and operated.
- Evidence semantics and ordering must be sufficiently deterministic for reconstruction.
- Repair and cutover procedures remain necessary and separately gated.
- A maintained projection can drift if a later implementation violates the accepted atomic boundary.

#### Option B — Read-time fold only

Compute every current position by folding all accepted Stock evidence at read time, without a maintained operational projection.

**Advantages**

- Minimizes persisted derived state.
- Makes the evidence-to-result relationship direct in concept.

**Tradeoffs**

- Read cost and latency grow with history, scope, and traceability depth.
- Operational lists, attention views, and concurrent availability checks become harder to support predictably.
- Complex folds can be duplicated across readers and produce inconsistent interpretations.
- Caching introduced later can become an undeclared projection without reconciliation rules.

#### Option C — Unexplained mutable balance

Treat a stored current balance or status as authoritative and update it directly, using history or audit only as optional context.

**Advantages**

- Simplest nominal read and write shape.

**Tradeoffs**

- Cannot prove why the current quantity exists or reconstruct it after corruption.
- Treats reservation, transit, review, and disposition as mutable labels rather than causal consequences.
- Makes manual edits an alternate source of truth.
- Conflicts with canonical Stock explainability and the accepted Cajas projection direction.

### A-06 — Concurrency and conditional claims

#### Option A — Scope-local conditional claim/update inside an atomic transaction

At minimum, evaluate and apply a critical claim against the same authoritative transactional scope as the affected Stock position or identified unit. A fungible claim succeeds only if the scoped eligible availability still satisfies the requested quantity when the claim is accepted. An identified-unit claim succeeds only if that unit remains eligible and has no incompatible active claim or disposition. The accepted source checkpoint consequence, Stock evidence, applicable reservation/projection consequence, and required audit observability must have no partial accepted outcome.

This direction requires conditional acceptance and atomicity but deliberately does not prescribe a lock primitive, isolation level, SQL statement, database constraint, retry loop, Prisma call, or distributed coordination mechanism.

**Advantages**

- Prevents check-then-write races from oversubscribing quantity or double-claiming a physical unit.
- Limits contention to the smallest approved actionable scope rather than serializing all company Stock.
- Gives stale callers a clear conflict/no-effect result.
- Preserves the observable all-or-nothing obligation for critical Stock consequences.

**Tradeoffs**

- High-contention positions may require bounded retry or conflict handling in a later design.
- Operations spanning multiple positions or units require deterministic scope coordination without broadening this ADR into integration design.
- Exact behavior depends on future persistence and transaction capabilities.

#### Option B — Application pre-check followed by unconditional write

Read availability, decide in application memory, and then write the reservation or effect without a conditional transactional claim over the same authoritative scope.

**Advantages**

- Straightforward application flow.
- Fewer explicit concurrency concepts.

**Tradeoffs**

- Two callers can observe the same availability and both succeed.
- UI submission guards or process-local mutexes do not protect multiple server instances.
- Stale reads can overwrite or contradict newer accepted evidence.
- Fails the approved no-oversubscription invariant.

#### Option C — Company-wide or system-wide serialization

Serialize every Stock mutation through one broad company or global gate.

**Advantages**

- Can prevent concurrent writes when implemented correctly.
- Simplifies some ordering questions.

**Tradeoffs**

- Creates unnecessary contention and a large failure domain.
- Couples unrelated Articles, deposits, and operations.
- Does not by itself define semantic duplicate handling or correct evidence.
- Is disproportionate to the approved minimum position/identified-unit scope.

### A-07 — Idempotency identity

#### Option A — Stable semantic uniqueness by company + source operation + checkpoint + line/effect

Define each intended Stock consequence by a stable business identity composed conceptually of company, source operation, approved checkpoint, and the applicable line/effect identity. Retries of the same logical consequence reuse that identity. Distinct legitimate consequences from the same operation—such as separate lines, partial confirmations, Transfer checkpoints, or different dispositions—must have distinct line/effect identities rather than new arbitrary retry identities.

Transport request IDs, tracing IDs, client submission IDs, and delivery-attempt IDs may correlate attempts, but they do not replace the semantic uniqueness identity. Duplicate semantic submission must return or resolve to the already accepted outcome without appending a second reservation, movement, projection consequence, or accepted-success audit consequence. A payload that reuses an accepted semantic identity with materially different intent must conflict rather than silently overwrite or create another effect.

**Advantages**

- Enforces one accepted cause/checkpoint/line consequence across network, process, and user retries.
- Distinguishes valid partial or multi-line effects from accidental duplicates.
- Remains stable when a retry receives a new HTTP or transport request ID.
- Provides a durable basis for linking accepted evidence and duplicate suppression.

**Tradeoffs**

- Each owning source workflow must eventually expose a stable operation, checkpoint, and line/effect identity.
- Versioning or correction of previously accepted intent must use explicit correction/reversal semantics rather than key mutation.
- The exact identity format and persistence enforcement remain future design work.

#### Option B — Transport request ID as the idempotency identity

Use each HTTP request, command delivery, or client-generated attempt ID as the uniqueness key.

**Advantages**

- Easy to attach at a transport boundary.
- Useful for tracing one attempt.

**Tradeoffs**

- A logical retry commonly receives a new request ID and can duplicate the consequence.
- Reusing one request ID for a changed payload creates ambiguous behavior.
- Ties domain correctness to a particular delivery mechanism.
- Does not identify checkpoint or line-level intent.

#### Option C — Best-effort temporal or payload duplicate detection

Suppress duplicates by timing window, similar payload, latest state, or operator/session heuristics.

**Advantages**

- Requires no explicit source semantic identity.

**Tradeoffs**

- Can suppress legitimate repeated effects or allow delayed duplicates.
- Becomes unreliable for partial operations, offline delays, or replay.
- Cannot prove one-cause/one-consequence.

### A-08 — Correction and reversal

#### Option A — New linked reversal/correction evidence with projection recomputation

Preserve the original accepted evidence unchanged. A reversal creates a new attributable consequence linked to the prior accepted effect and neutralizes only the scope that remains valid to reverse. A correction records new linked evidence that explains the corrected consequence; it does not rewrite the original claim. Current projections incorporate the original and linked corrective chain under deterministic rules.

Corrections and reversals require their own semantic identities, cause, scope, actor attribution, and effective relationship to the original evidence. They must respect later dependent dispositions: when simple neutralization would contradict already accepted downstream evidence, the operation must fail or follow a separately approved corrective path rather than erase history.

**Advantages**

- Preserves complete causal and audit history.
- Makes current position reconstructible from original and corrective evidence.
- Supports investigation of what was first accepted, why it changed, and who changed it.
- Prevents cancellation from becoming deletion or unexplained balance replacement.

**Tradeoffs**

- Corrective chains and dependent effects require explicit validation and presentation.
- Not every error can be neutralized by a simple opposite quantity or status.
- Projection folds must avoid applying the same reversal twice or exceeding the reversible remainder.

#### Option B — Destructive edit or deletion of accepted evidence

Modify or remove the original reservation, movement, or disposition so history reflects only the corrected result.

**Advantages**

- Produces a superficially simple current history.

**Tradeoffs**

- Destroys accepted historical truth and weakens auditability.
- Breaks source-document and downstream-effect references.
- Prevents deterministic reconstruction of what actually occurred.
- Conflicts with approved `DR-10` and the accepted Cajas direction.

#### Option C — Balance-only compensating update

Change the current projection to the desired quantity or status without linked corrective Stock evidence.

**Advantages**

- Quickly changes the displayed position.

**Tradeoffs**

- Creates unexplained projection drift.
- Bypasses correction cause, reversible remainder, and dependent-effect validation.
- Establishes an unofficial manual source of truth.
- Cannot survive evidence-based reconstruction.

## Accepted decision

**Accepted by Franco on 2026-07-20 as part of blanket A-01–A-12 approval, exactly as verified and without semantic drift:** Option A for A-04, A-05, A-06, A-07, and A-08 forms one coherent but independently bounded transactional Stock direction:

1. **A-04:** preserve explicit reservation commitments separately from append-only physical/disposition movement evidence, exactly honoring accepted Cajas Option A.
2. **A-05:** maintain server-owned current projections that are reconciliable and reconstructible from accepted Stock evidence; reject read-time-only folding as the operational default and reject unexplained mutable balances as truth.
3. **A-06:** accept critical claims and effects through conditional, scope-local updates in an atomic transaction at least at position or identified-unit scope, without selecting the exact persistence primitive.
4. **A-07:** enforce semantic uniqueness conceptually by company + source operation + checkpoint + line/effect, while treating transport request IDs only as attempt correlation.
5. **A-08:** correct or reverse accepted Stock effects only through new linked evidence; never destructively rewrite accepted history or repair only the projection.

Together, these recommendations make current Stock useful without separating it from causal truth: explicit reservations explain commitments; append-only movement/disposition evidence explains physical outcomes; maintained projections serve reads; conditional claims protect availability; semantic identities suppress duplicate consequences; and linked corrections preserve history. The recommendation does not select an exact schema, transaction API, locking mechanism, projection algorithm, repair process, audit store, or source-domain integration design.

## Accepted architecture constraints

- Reservation lifecycle evidence must remain conceptually distinct from physical/disposition movement evidence even if a future implementation shares infrastructure.
- Accepted physical/disposition movement evidence is append-only; accepted reservation history must remain attributable and cannot be erased to simulate a different outcome.
- A projection may be stored and updated, but no direct projection mutation may create accepted Stock truth without corresponding accepted evidence.
- Projection reconstruction must use deterministic accepted evidence and preserve company, position/custody, and applicable traceability scope.
- Projection reconciliation must be able to identify a mismatch between maintained and reconstructed results; this ADR does not authorize running or implementing repair.
- A reservation or critical disposition claim must be conditionally accepted against current authoritative scope within the atomic boundary that records its consequence.
- The minimum contention scope is the affected position for quantity-managed Stock and the affected physical identity for identified-unit Stock; a multi-scope operation may require a larger atomic set only under later design.
- A stale or conflicting claim produces no accepted reservation, movement, projection consequence, or success result.
- Semantic idempotency identity is company-scoped and includes source operation, approved checkpoint, and applicable line/effect identity.
- Transport request IDs are correlation metadata, not the sole proof that a business consequence is unique.
- Reuse of an accepted semantic identity with conflicting intent must be rejected and must not rewrite prior evidence.
- Reversal and correction are new linked accepted consequences with their own attribution and idempotency identity.
- A correction must not become a shortcut around a known Remittance, Consumption, Return, Transfer, or other approved source operation.
- Every accepted critical consequence and every privileged correction/reversal must remain attributable and auditable; exact audit model, storage, authorization, and visibility are outside this ADR.
- Observable atomicity includes the accepted business checkpoint and required Stock consequence, but exact cross-domain ownership, orchestration, API placement, and rollout belong to A-11 or later authorized integration design.
- No recommendation here creates a financial, billing, accounting, costing, commercial, collection, tax, or fiscal effect.

## Required invariants

1. **Reservation is not movement:** commitment and release cannot be interpreted as proof of physical movement or final disposition.
2. **Accepted movement history is append-only:** accepted physical/disposition evidence is never overwritten or deleted.
3. **Projection is derived:** every current projected quantity, custody, or availability condition must be explainable by accepted Stock evidence.
4. **Reconstructibility:** rebuilding from the same accepted evidence under the same rules yields the same current projection.
5. **Reconciliation visibility:** maintained-versus-reconstructed divergence is detectable and cannot be silently normalized through balance editing.
6. **Conditional availability:** a fungible reservation or disposition cannot be accepted when scoped eligible availability is insufficient.
7. **Identified-unit exclusivity:** one physical identity cannot be accepted into incompatible active reservations, positions, or dispositions.
8. **No check-then-write race:** the acceptance predicate and consequence share the authoritative atomic scope.
9. **One semantic effect once:** one company + source operation + checkpoint + line/effect identity produces at most one accepted Stock consequence.
10. **Transport neutrality:** changing request, tracing, session, or delivery-attempt identity does not create a new logical Stock consequence.
11. **Conflict integrity:** reusing a semantic identity with different material intent conflicts rather than mutating or duplicating accepted evidence.
12. **Linked correction only:** reversal/correction adds attributable linked evidence and never deletes the original.
13. **Bounded reversal:** a reversal cannot neutralize more than the still-reversible accepted scope or contradict accepted downstream disposition.
14. **Company isolation:** evidence, reservation, projection, identity, duplicate detection, and correction never cross company scope.
15. **Observable all-or-nothing:** no accepted business success remains without its required Stock consequence, and no Stock consequence remains accepted for a failed checkpoint.
16. **Auditability:** accepted effects, conflict suppression where operationally relevant, and privileged correction/reversal retain actor, company, cause, time, and source context under the applicable later audit contract.

## Failure modes and required outcomes

| Failure mode | Required conceptual outcome |
| --- | --- |
| Two operations concurrently claim the same identified unit | At most one is accepted; the other receives a conflict/no-effect outcome. |
| Concurrent fungible claims exceed available quantity together | Only the subset satisfying conditional scoped availability is accepted; no silent negative or oversubscribed availability results. |
| Availability changes after review but before confirmation | The stale claim fails without accepted evidence or projection consequence and requires fresh review. |
| The same logical effect is retried with a new transport request ID | It resolves to the prior semantic outcome and does not duplicate reservation, movement, projection consequence, or accepted-success audit consequence. |
| An accepted semantic identity is reused with changed Article, quantity, unit, custody, traceability, or disposition intent | The request conflicts; prior evidence is preserved and no second consequence is accepted. |
| Reservation release races with dispatch or another disposition | Only a valid lifecycle transition is accepted; the same committed scope cannot become both released availability and dispatched/finally disposed. |
| Source checkpoint fails after Stock work begins | No partial accepted source success or Stock consequence remains observable. Exact coordination is deferred to A-11 integration design. |
| Projection update fails while evidence acceptance is attempted | No success may be reported for an inconsistent accepted boundary; later implementation must preserve or recover the approved atomic outcome without treating the stale projection as truth. |
| Maintained projection differs from evidence reconstruction | The mismatch is surfaced for reconciliation; no manual projection overwrite silently resolves it. |
| Projection repair is interrupted or repeated | Accepted evidence remains unchanged; repair must be safely repeatable under a later authorized design. |
| A reversal is retried | Its semantic identity prevents a second neutralization. |
| A requested reversal exceeds the remaining reversible scope or conflicts with downstream evidence | It is rejected or routed to a separately approved corrective path; history is not deleted. |
| A correction attempts to hide a known source operation | It is rejected as a generic adjustment path and must return to the owning operation. |
| Cross-company source, position, reservation, or corrective link is supplied | The trusted boundary rejects it before any accepted effect or information leak. |
| Audit recording required by the accepted boundary cannot be satisfied | The critical consequence is not reported as accepted; exact audit transaction/storage mechanics remain separately gated. |

## Consequences

### Positive

- Current availability remains fast enough for operational use while retaining evidence-based explainability.
- Reservations no longer masquerade as dispatch or other physical movement.
- Concurrent claims have a conceptual safety boundary for fungible quantities and identified units.
- Retries remain safe across changing HTTP requests, processes, and user navigation.
- Projection drift can be detected and corrected from evidence instead of normalized through manual balance edits.
- Original and corrective history remain inspectable as one causal chain.
- The direction supports partial operations and multiple checkpoints without treating each attempt as a new consequence.

### Negative

- More consistency concepts and records are required than a mutable balance design.
- Projection folding, reconciliation, and corrective-chain validation add operational complexity.
- Source operations must eventually provide stable checkpoint and line/effect identities.
- High-contention positions can produce legitimate conflicts that the UX and owning workflow must handle honestly.
- Multi-position effects and cross-domain checkpoints require later integration design before implementation.

### Risks

- A future implementation may use separate records but still accidentally treat reservation as movement in projection rules.
- A maintained projection may become unofficial truth if reconstruction and reconciliation are not operated.
- An idempotency identity may be too coarse and suppress valid partial effects, or too fine and permit duplicates.
- A transport request ID may be mislabeled as business idempotency despite this decision.
- Correction may be abused as a generic escape hatch around known operational causes.
- A naive opposite-sign reversal may contradict later Consumption, Return, Transfer, or custody evidence.
- Broad locking may create avoidable contention; narrow locking may omit a required related scope.
- Integration code may split source confirmation from Stock acceptance and violate observable atomicity.
- Audit implementation may become a substitute for Stock evidence rather than complementary critical-action traceability.

## Migration-neutral and operational implications

- Existing mock balances, Zustand/localStorage state, soft references, and current service records remain baseline evidence only; none becomes authoritative Stock evidence or projection under this ADR.
- No existing balance is declared reconstructible, reconciled, or suitable as an opening position.
- Historical movements, reservations, or corrections must not be invented to make legacy data fit this architecture.
- A later adoption plan must distinguish accepted opening-position evidence from fabricated history and must define coexistence without dual Stock truth.
- Projection bootstrap, replay, comparison, repair, rollback, cutover, monitoring, and production reconciliation remain separately gated.
- Existing source-operation identifiers must be assessed for stability before they can participate in semantic idempotency; this ADR does not authorize backfill.
- No database mutation, data cleanup, correction run, or historical linkage follows from acceptance of this ADR.

## Rejected alternatives

The accepted decision rejects:

- representing reservations as physical movements or collapsing all effects into an undifferentiated journal;
- mutable reservation flags or availability updates without attributable lifecycle evidence;
- read-time-only folding as the default operational projection strategy;
- an unexplained mutable balance as authoritative Stock truth;
- application pre-check followed by unconditional write for critical claims;
- global serialization as the default concurrency scope;
- transport request ID, timing window, payload similarity, or latest-state heuristics as the sole idempotency mechanism;
- destructive edit or deletion of accepted Stock evidence; and
- balance-only correction without linked corrective evidence.

## Explicit non-decisions and downstream blocks

This ADR does not decide or authorize:

- final table, model, record, field, relation, enum, key, constraint, index, or partition names;
- exact reservation statuses, movement types, projection columns, evidence payloads, or correction record shapes;
- SQL predicates, lock modes, isolation levels, optimistic-version fields, database constraints, Prisma transaction APIs, queues, or distributed locks;
- exact projection fold, ordering implementation, snapshot interval, replay tool, reconciliation query, repair algorithm, monitoring system, or service-level objective;
- exact semantic idempotency-key encoding, transport header, retention period, response code, or storage mechanism;
- exact API, route, Server Action, service, repository, validator, command, module, or source-file ownership;
- A-09/A-10 authorization, role/capability mapping, audit persistence, audit visibility, or security implementation;
- A-11 source-domain integration placement, cross-service orchestration, delivery sequence, coexistence, or anti-double-write implementation;
- Article, deposit, custody, traceability, identified-unit, position, ledger, reservation, projection, or audit schema;
- migration, seed, import, backfill, opening-position creation, reconciliation execution, production repair, or provider change;
- UI route, component, form, error copy, or changes to Stock, Articles, Preparation, Remittance, Consumption, Return, Cajas, Surgery/Record, Expediente, or Cirugías;
- offline mutation, synchronization, cache architecture, or optimistic critical success;
- costing, valuation, replenishment, purchase optimization, billing, accounting, collections, commercial, tax, or fiscal behavior; or
- any phase beyond the authorized documentary SDD execution-plan phase, plus APPLY, rollout, production changes, or protected-file changes.

Only the next documentary SDD execution-plan phase is authorized. All schema, migration, reconciliation execution, backend/API, Auth, permissions, UI, integration implementation, Cirugías, APPLY, rollout, and production work remains blocked until its own Task Briefs and required Franco approvals are recorded.

## Validation criteria for this ADR

This accepted ADR remains internally valid only if all of the following remain true:

1. A-04 through A-08 are visibly accepted by Franco on 2026-07-20 exactly as verified under the blanket A-01–A-12 approval.
2. A-04 adopts explicit reservation commitments separate from append-only physical/disposition movement evidence and does not reopen accepted Cajas Option A.
3. A-05 selects a server-owned maintained projection that is reconciliable and reconstructible from accepted evidence, while comparing read-time folding and unexplained mutable balance.
4. A-06 requires conditional acceptance in an atomic transaction at minimum position or identified-unit scope without prescribing exact SQL, Prisma, lock, or isolation implementation.
5. A-07 uses company + source operation + checkpoint + line/effect as the conceptual semantic uniqueness identity and distinguishes transport request IDs.
6. A-08 requires linked reversal/correction evidence and prohibits destructive rewrite or projection-only repair.
7. Atomic, audited, idempotent observable obligations remain explicit without selecting A-09/A-10 mechanisms or taking A-11 integration ownership.
8. Concurrency, retry, stale conflict, projection divergence, and correction failure modes have explicit no-partial/no-duplicate outcomes.
9. Approved Stock `DR-01`–`DR-16`, UX `UXD-01`–`UXD-12`, and Cajas obligations remain inherited and are not narrowed or expanded.
10. No exact schema, API, source file, algorithm, role, capability, audit store, migration, or implementation sequence is selected.
11. Authorization remains limited to the next documentary SDD execution-plan phase; schema, migration, reconciliation execution, implementation, APPLY, and production changes remain blocked.
12. The references preserve the verified working-tree provenance hashes recorded before authoring.

## Decision register — accepted by Franco

| ID | Architecture decision | Accepted direction | Franco decision |
| --- | --- | --- | --- |
| `A-04` | **Stock evidence and reservations** | Keep explicit reservation commitments separate from append-only physical/disposition movement evidence, honoring accepted Cajas Option A. | **ACCEPTED by Franco — 2026-07-20** |
| `A-05` | **Current projections** | Use server-owned maintained projections that are reconciliable and reconstructible from accepted Stock evidence; projections are not independent mutable truth. | **ACCEPTED by Franco — 2026-07-20** |
| `A-06` | **Concurrency and conditional claims** | Conditionally accept/update within an atomic transaction at minimum position or identified-unit scope, without selecting an exact persistence primitive. | **ACCEPTED by Franco — 2026-07-20** |
| `A-07` | **Idempotency identity** | Use company + source operation + checkpoint + line/effect as the semantic uniqueness identity; transport request IDs correlate attempts only. | **ACCEPTED by Franco — 2026-07-20** |
| `A-08` | **Correction and reversal** | Add linked reversal/correction evidence and recalculate projections; never destructively rewrite accepted evidence. | **ACCEPTED by Franco — 2026-07-20** |

**Decision count:** exactly five accepted decisions, `A-04` through `A-08`.

Franco explicitly accepted all five rows exactly as verified through the blanket A-01–A-12 approval on 2026-07-20. No schema, migration, reconciliation execution, implementation, APPLY, or production authorization follows from this acceptance.

## References and provenance

- `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` — approved Stock domain baseline; verified working-tree blob `926476e1d5e275768296329e099e32e04069224e` before authoring.
- `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` — approved Stock UX baseline; verified working-tree blob `95d8d986e7dc426b48a7b4480966a558a54d52ed` before authoring.
- `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` — accepted Cajas Stock transaction direction; verified working-tree blob `5f470c58113c8990ea8bd83aaa811730f9417a55` before authoring.
- `knowledge/architecture/ADR-STOCK-CORE-PERSISTENCE.md` — accepted companion decisions A-01 through A-03; referenced for conceptual identity scope only, without authorizing exact persistence artifacts or implementation.
- `knowledge/domain/STOCK_CAJAS_TRAZABILIDAD.md`.
- `knowledge/architecture/DATA_MODEL_RULES.md`.
- `knowledge/architecture/AUDIT_EVENT_POLICY.md`.
- `knowledge/architecture/MULTI_COMPANY_ACCESS.md`.
