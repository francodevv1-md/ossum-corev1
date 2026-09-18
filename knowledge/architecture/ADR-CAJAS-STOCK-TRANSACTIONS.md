# ADR — Cajas Stock Transactions and Checkpoint Effects

## Metadata

- **Status:** ACCEPTED — Option A approved by Franco on 2026-07-19
- **Date:** 2026-07-19
- **Owner:** Architecture / SDD Design Author
- **Approver:** Franco
- **Scope:** Transaction architecture for the approved Cajas Stock checkpoints
- **Supersedes:** None
- **Superseded by:** None
- **Decision independence:** This proposal may be approved, revised, or rejected independently from the other Cajas ADR proposals.
- **Authorization effect:** None. Approval would not authorize a ledger schema, migration, Stock implementation, accounting behavior, protected-file changes, or APPLY.

## Context and approved product constraints

DG-07 plus approved CD-01, CD-02, CD-04–CD-08, and CD-10 fix the following observable Stock behavior while leaving its technical representation unresolved:

- explicit confirmation of incorporation into active preparation reserves a `Caja identificada` and physical component Articles for the Surgery/Record; browsing, opening, comparison, drafts, and provisional selection do not reserve;
- a confirmed pre-dispatch replacement coherently releases the prior reservation and reserves the replacement without oversubscription; granular component/box removal and whole-operation cancellation release only the applicable still-undispatched reservations;
- preparation control and re-control record evidence only and must not duplicate reservations or infer dispatch, return, or consumption;
- successful Remittance issuance alone creates `Contenido despachado` and applies the `Despachado` / `En tránsito` checkpoint;
- failed issuance creates neither dispatch evidence nor Stock movement and preserves control evidence and reservation;
- cancellation before dispatch releases reservations with no dispatch, return, consumption, billing, commercial, or accounting evidence;
- multiple non-overlapping dispatches are cumulatively bounded by controlled/reserved composition, and undispatched content remains reserved;
- each partial Return references one dispatch and disposes only its confirmed portion; correct components may become `Disponible` after human validation, but a partial result never releases the whole identified box while content or differences remain pending;
- Consumption and Return may occur in either order against one shared pending balance per dispatch; every quantity receives at most one disposition, including a Return-classified consumption effect;
- missing, damaged, or unresolved-incident items remain `No disponible` / `En revisión`;
- added and replacement items remain under review until origin, belonging, and disposition are resolved; both replacement sides retain evidence without presuming custody of the original or inferring balancing/availability/movement; and
- all effects are atomic, audited, and idempotent, with no automatic billing, commercial, or accounting entries.

Multiplicity and partial returns also require effects to remain associated with the relevant operation, identified box, dispatch, and confirmation rather than being collapsed into a single balance change. Unaffected components retain their approved disposition while affected components remain unavailable/under review through the approved difference-resolution and re-control checkpoints.

## Current evidence and gaps

D02 found no production Article/Stock/Box server model or approved Stock transaction architecture. Canonical Knowledge states that Stock must be explainable by movements, not only balances. Current Remittance/Consumption/Return services provide bounded transaction and validation patterns, but current soft item/box references do not provide the physical identity, reservation, movement integrity, partial accounting, or retry guarantees required by Cajas.

The gap is therefore both structural and behavioral: the system needs an approved way to reserve availability and record explainable movements while coupling each movement to the business confirmation that caused it.

## Decision drivers

1. Exact conformity to `STOCK-01`–`STOCK-10`, including no-effect failures.
2. Explainable Stock history rather than direct balance mutation.
3. Atomicity between a successful business checkpoint and its Stock effect.
4. Idempotent retries at operation and line level.
5. Correct handling of reservations, multiple dispatches, and partial returns.
6. Integrity of physical identity and traceability.
7. Company and location isolation.
8. No implicit accounting, invoicing, commercial, or fiscal behavior.

## Viable option families

### Option A — Explicit reservation records plus append-only Stock movements

Represent reservation/release as explicit availability commitments and dispatch, return, consumption, unavailable/review, added, and replacement outcomes as append-only Stock transactions. Current availability is a projection from accepted commitments and movements.

**Advantages**

- Separates temporary commitments from completed physical movements.
- Gives each checkpoint an explainable, auditable cause.
- Supports partial returns and explicit added/replacement handling.
- Aligns with canonical “Stock is explained by movements.”

**Tradeoffs**

- Requires projection and consistency rules between reservations, movements, and balances.
- More records and invariants than direct status/balance updates.
- Cancellation and expiry semantics for reservations need precise technical contracts.

### Option B — Unified inventory transaction journal

Represent reservations, releases, dispatches, returns, consumption, and review holds as typed entries in one inventory transaction journal, with availability derived from entry semantics.

**Advantages**

- One chronological mechanism for all Stock effects.
- Consistent idempotency and audit envelope can apply to every transaction type.
- Potentially simpler cross-checking and reconciliation.

**Tradeoffs**

- Reservation semantics can be obscured if treated like physical movement.
- A broad journal may become a generic abstraction that weakens domain-specific validation.
- Query and projection logic may become complex as transaction types grow.

### Option C — State-first inventory with audit deltas

Update current item/unit availability and quantities directly, recording audit deltas for explanation.

**Advantages**

- Simple current-state reads.
- Lower initial modeling overhead.
- Familiar fit for straightforward CRUD services.

**Tradeoffs**

- Weakest fit with explainable movement history and retry-safe partial accounting.
- Audit deltas risk becoming the only historical record.
- Harder to prove that consumed items were not also released or that retries did not double-apply.
- Added/replacement movements and reversals become less explicit.

## Proposed direction for review

**Non-binding proposal:** adopt Option A: explicit reservation commitments plus append-only Stock transactions, with server-owned current availability projections. The Cajas domain confirmation supplies the business cause; the Stock boundary validates and applies only the approved effect.

The direction would require:

- reservation and release to be explicit, company-scoped, attributable, and idempotent, with reservation beginning only at confirmed incorporation into active preparation;
- control/re-control to create no Stock transaction;
- successful Remittance issuance to atomically pair its immutable dispatch evidence with the approved dispatch/in-transit transaction;
- failed issuance to commit neither artifact;
- Return and Consumption confirmations to classify each affected physical quantity exactly once against one shared pending balance per dispatch, regardless of confirmation order;
- added/replacement effects to be explicit commands with identifiable physical sides, never inferred balancing entries;
- each effect to carry a stable business-operation identity that prevents duplicate application;
- balances and availability to be projections, not unexplained manual truth; and
- reversals/corrections, if later approved, to be new explainable transactions rather than destructive edits.

This proposal does not select exact ledger tables, reservation records, quantity algorithms, warehouses, valuation, costing, or transaction APIs.

## Consequences

### Positive

- Approved checkpoints map to explicit, testable Stock effects.
- Reservation does not masquerade as physical dispatch.
- Failure/no-side-effect semantics can be verified at one trusted transaction boundary.
- Partial returns and replacement pairs remain explainable.
- Current availability can be reconciled to historical transactions.

### Negative

- Stock projection and reconciliation logic must be operated and monitored.
- Cross-domain transaction coordination with Remittance and Return is required.
- Physical quantity/identity validation may expose gaps in current Article/Stock data.
- Additional technical design is required before any schema can be proposed.

### Risks

- Double reservation or oversubscription under concurrent selection.
- A retry may use a different key and duplicate an otherwise valid movement.
- Partial returns may over-account a dispatch line if cumulative limits are not enforced.
- A replacement may be modeled as one opaque delta and lose both physical sides.
- “Available” could be projected despite unresolved differences or pending dispatched content.
- A transaction journal could be extended into accounting without separate approval.

### Migration and compatibility implications

- Existing Remittance/Consumption/Return records and soft identifiers require explicit mapping and cannot be assumed to represent physical Stock truth.
- Existing current balances, if any, require reconciliation before becoming projections from movements.
- Coexistence with current services needs an anti-double-write plan and a reversible cutover.
- Historical business records must not be retroactively assigned invented movements.
- Location/deposit and fine-traceability depth may be introduced progressively only under approved scope.

## Boundaries and non-goals

- No exact ledger, reservation, balance, lot, serial, or warehouse schema is selected.
- No costing, valuation, general ledger, accounting journal, tax, or fiscal behavior is included.
- No automatic invoice, billing, commercial, replenishment, or purchasing action is authorized.
- No Stock provider or database change is proposed.
- No exact API, route, service, validator, idempotency-key format, or source file is selected.
- No effect beyond `STOCK-01`–`STOCK-10` is introduced.
- No independent maintenance, sterilization, damage, or quarantine workflow is created.

## Security, multiempresa, and audit implications

- Stock candidates, reservations, movements, queries, and mutations must be constrained to the authorized company and applicable location context.
- The server must reject cross-company references without disclosing resource existence and before any availability, movement, or other business effect.
- Every reservation, release, movement, retry suppression, and privileged correction must be auditable with actor, company, cause, and linked business evidence.
- Authorization follows the approved capability/existing-permission contract; UI disabled state is never enforcement.
- Audit and movement history must not disclose another company's traceability or inventory.

## Validation obligations

A future implementation plan must include tests proving:

- concurrent confirmed incorporation cannot reserve the same exclusive unit for two active operations, while provisional browsing/selection creates no reservation;
- the same confirmed incorporation, coherent replacement, granular removal, or cancellation retry cannot duplicate reservation/release;
- control and re-control create evidence only;
- successful issuance creates dispatch evidence and Stock effect together;
- failed issuance creates neither and retains reservation/control evidence;
- each partial Return references one dispatch and cannot exceed its shared pending balance;
- Consumption and Return work in either order without double disposition, and Return-classified consumed content is recognized as already accounted later;
- missing/damaged/unresolved content remains unavailable/review;
- added and replacement items require explicit, identifiable movements;
- retries do not duplicate movements, evidence, audit, or conditions;
- no checkpoint creates billing, commercial, accounting, or fiscal entries; and
- company-isolation, stale-confirmation, rollback, and reconciliation paths are covered.

## Protected approvals still required

- Exact Stock transaction/reservation/ledger Task Brief and Franco approval.
- Exact schema and migration Task Brief plus Franco approval.
- Multi-company/security and authorization mapping approval.
- Remittance dispatch transaction contract approval.
- Return/Consumption partial-accounting contract approval.
- Audit and idempotency mechanism approval.
- Exact files, independently verified TASKS amendment, and separate APPLY approval.
- Any warehouse, replenishment, costing, billing, accounting, or fiscal expansion requires its own decision and approval.

## Open technical questions not settled by approved DGs

1. What is the precise reservation granularity for identified boxes, serialized components, lots, and fungible quantities?
2. Beyond the approved pre-dispatch removal and cancellation cases, are reservation expiry or any other manual release allowed, and under what separately approved business conditions?
3. Which effects must share one database transaction with Cajas/Remittance/Return evidence?
4. How are idempotency identities scoped across operation, dispatch, return, and line-level effects?
5. How is available quantity projected and reconciled when legacy balances exist?
6. How are explicit replacement movements represented when origin and replacement differ in identity or location?
7. What correction/reversal family is safe without destructive mutation?
8. What minimum deposit/location support is required for V1 without broad warehouse redesign?

## Approval checklist — separate Franco decision

- [x] Franco accepts the proposed Option A direction.
- [ ] Franco requests revisions before a decision.
- [ ] Franco rejects this direction and requests another option family.
- [x] Franco confirms that no ledger schema, accounting behavior, or implementation is approved by this ADR alone.
- [x] Franco records a separate decision for this ADR, independent of the other three Cajas ADRs.

**Current approval state:** Franco approved Option A on 2026-07-19. This acceptance approves only the transaction architecture direction; exact ledger/reservation schema, migrations, algorithms, APIs, protected-file changes, implementation, Cirugías/Expediente refactoring, TASKS amendment, and APPLY remain separately gated.

## References and traceability

- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/SPEC.md`: `MULTI-01`–`MULTI-10`, `STOCK-01`–`STOCK-10`, `RESERVATION-01`–`RESERVATION-07`, `DISPATCH-01`–`DISPATCH-08`, `RETURN-01`–`RETURN-19`, `ACCOUNTING-01`–`ACCOUNTING-05`, `RESOLUTION-01`–`RESOLUTION-05`, `COMPANY-01`–`COMPANY-03`; scenarios `DG03-01`–`DG03-02`, `DG04-01`–`DG04-02`, `DG07-01`–`DG07-04`, `CD01-01`–`CD05-02`, `CD06-01`–`CD06-03`, `CD07-01`–`CD07-02`, and `CD10-01`–`CD10-02`.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/DESIGN.md`: §§8.2, 9.1, 9.5–9.6, 10.2–12.4, 15, 17.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/DECISIONS-CD01-CD10.md`: approved CD-01, CD-02, CD-04–CD-08, and CD-10 product constraints only; no implementation authorization.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/TASKS.md`: D02 and blocked packages B03–B05.
- `knowledge/domain/STOCK_CAJAS_TRAZABILIDAD.md`.
- `knowledge/domain/PREPARACION_REMITOS_CONSUMO.md`.
- `knowledge/architecture/DATA_MODEL_RULES.md`.
- `knowledge/architecture/AUDIT_EVENT_POLICY.md`.
- `knowledge/architecture/MULTI_COMPANY_ACCESS.md`.
- Related proposals: `ADR-CAJAS-CORE-PERSISTENCE.md`, `ADR-CAJAS-AUTHORIZATION.md`, `ADR-CAJAS-OPERATIONAL-INTEGRATIONS.md`.
