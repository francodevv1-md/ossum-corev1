# ADR — Cajas Core Persistence and Immutable Operational Evidence

## Metadata

- **Status:** ACCEPTED — Option A approved by Franco on 2026-07-19
- **Date:** 2026-07-19
- **Owner:** Architecture / SDD Design Author
- **Approver:** Franco
- **Scope:** Server truth and persistence boundaries for surgical/logistics Cajas
- **Supersedes:** None
- **Superseded by:** None
- **Decision independence:** This proposal may be approved, revised, or rejected independently from the other Cajas ADR proposals.
- **Authorization effect:** None. Approval of this ADR would approve an architecture direction only; it would not authorize schema edits, migrations, implementation, protected-file changes, or APPLY.

## Context and approved product constraints

Cajas are surgical/logistics compound Articles/SKUs, not a separate catalog and not financial cash boxes. Articles/Stock owns the shared `Caja` definition, versioned `Contenido esperado`, and each uniquely identified `Caja identificada`. The Surgery/Record is the operational context for assignment, preparation, `Control de preparación`, re-control, dispatch, return, and difference resolution.

The approved DG behavior requires:

- confirmed `Contenido esperado` edits to create future-only versions while open preparations and historical evidence retain their applicable version;
- actual selected physical components and their traceability to remain distinct from the reusable formula;
- immutable historical controls, post-control changes, re-controls, per-dispatch `Contenido despachado`, returns, differences, and difference resolutions;
- a separate current actionable condition, including `Disponible` or `Con diferencias` when applicable, without inventing a closed lifecycle state machine;
- multiple identified boxes per Surgery/Record, no more than one active Surgery/Record per identified box, multiple dispatches and partial returns, retained linkage until accounting and differences are complete, and reuse only after the operation ends and the box is `Disponible`;
- stale confirmations to be rejected rather than silently overwriting newer evidence; and
- company scope, server-side authorization, auditability, atomic effects, and idempotent retries.

These are approved product constraints, not an approved database design.

## Current evidence and gaps

D02 found production conditionally feasible but did not select architecture. Current evidence shows:

- PostgreSQL/Prisma and company-scoped server patterns exist for bounded slices, but the repository has no dedicated server Article/Stock/Box persistence that satisfies the approved Cajas behavior.
- Current Remittance references such as `boxId` and `itemId` are soft identifiers rather than an integrity-preserving Cajas/Stock model.
- Existing `AuditEvent` is suitable as transversal audit evidence, but it is not a substitute for queryable immutable domain records such as formula versions, controls, dispatch contents, returns, or resolutions.
- Current prototype/local state cannot be final truth.
- Current Remittance, Consumption, and Return slices provide useful integration conventions, but not the complete ownership, history, multiplicity, or stale-write contract required here.

The principal gap is not merely missing tables. It is the absence of an approved aggregate/evidence boundary that separates mutable current work from immutable operational facts.

## Decision drivers

1. Preserve approved history without making daily reads impractical.
2. Keep Article/Stock master ownership distinct from Surgery/Record operational evidence.
3. Prevent stale writes and simultaneous active-operation assignment.
4. Support multiple boxes, dispatches, partial returns, and later reuse without one-to-one assumptions.
5. Make business confirmation and its required evidence atomic and retry-safe.
6. Enforce company isolation and server truth consistently.
7. Permit progressive implementation without binding the product to exact Prisma models prematurely.
8. Keep audit evidence explainable without treating a generic audit stream as domain state.

## Viable option families

### Option A — Current-state aggregate with append-only evidence records

Maintain server-side current aggregates/projections for active work and current condition, while appending immutable domain evidence at each approved checkpoint. Historical records refer to the applicable formula version and physical selections; projections are derived or updated transactionally.

**Advantages**

- Directly supports operational queries and current-condition summaries.
- Makes immutability explicit for controls, dispatches, returns, and resolutions.
- Fits the current modular monolith and relational database direction.
- Allows targeted concurrency tokens and invariants around each aggregate boundary.

**Tradeoffs**

- Requires discipline to prevent projections and immutable evidence from diverging.
- Some facts may be represented both as evidence and as a current projection.
- Transaction boundaries across Cajas, Stock, and Remittance need careful design.

### Option B — Event-centric persistence with rebuilt projections

Persist each accepted domain event as the primary record and derive current formula, assignment, composition, condition, dispatch, and return projections from the event stream.

**Advantages**

- Strong chronological history and natural reconstruction of prior states.
- Corrections can be represented as new events rather than mutation.
- Projection rebuilding can expose inconsistencies and support future analytics.

**Tradeoffs**

- Adds event ordering, replay, versioning, and projection-operability complexity.
- Raises the implementation and support burden for the current V0 modular monolith.
- Generic event storage can obscure domain constraints unless typed evidence remains explicit.
- Cross-aggregate atomicity and migration from current slices remain non-trivial.

### Option C — Snapshot-only documents per checkpoint

Store complete immutable documents for each formula/control/dispatch/return checkpoint and obtain current state from the latest applicable document.

**Advantages**

- Checkpoint evidence is self-contained and easy to render historically.
- Reads can avoid reconstructing a composition from many changes.
- The conceptual match to `Control de preparación` and `Contenido despachado` is clear.

**Tradeoffs**

- Repetition can be substantial.
- Queries across components, traceability, and partial accounting may become awkward.
- Assignment exclusivity and current-condition concurrency still require separate coordination.
- Document flexibility can weaken relational integrity if used without disciplined references.

## Proposed direction for review

**Non-binding proposal:** adopt Option A: server-owned current aggregates/projections plus typed, append-only domain evidence for every approved historical checkpoint. A complete checkpoint may contain a self-sufficient composition representation where needed, but generic event sourcing would not be the primary persistence model.

The direction would establish these architecture rules without selecting exact models or fields:

- `Contenido esperado` has immutable versions; an open preparation retains its starting version.
- A `Caja identificada` has one company-scoped identity and at most one active-operation assignment.
- Draft/current selection is mutable only before confirmation and under concurrency protection.
- Each successful control, re-control, dispatch, return, and difference-resolution action appends domain evidence; prior evidence is never edited.
- Each successful dispatch owns its own immutable `Contenido despachado` and partial-return accounting context.
- Current condition and eligibility are projections constrained by the immutable evidence, not replacements for it.
- Business confirmation, evidence append, projection update, and any same-checkpoint required effect share an approved atomic boundary.
- Retry identity is carried by commands/confirmations so equivalent retries cannot duplicate evidence or effects.
- Generic audit records supplement, but do not replace, domain evidence.

Exact aggregate boundaries, identifiers, Prisma models, fields, indexes, foreign keys, transaction APIs, and migration steps remain for later approved Task Briefs.

## Consequences

### Positive

- Historical controls and dispatches remain stable while current work continues.
- Product summaries can read current projections without rewriting history.
- Formula versioning, partial returns, reuse gates, and explicit re-control have coherent persistence homes.
- Concurrency and idempotency can be designed around explicit server commands and aggregate versions.
- Audit can explain both the business fact and who invoked it.

### Negative

- More persistence concepts are required than a single mutable Box record.
- Projection consistency and repair procedures become operational responsibilities.
- Cross-domain confirmations may require carefully coordinated transactions or reliable post-commit integration.
- Migration from soft references and prototype state requires deliberate mapping and verification.

### Risks

- A projection could be treated as historical truth and later mutated incorrectly.
- Over-large aggregate boundaries could create contention; over-small boundaries could weaken atomicity.
- Snapshot payloads could become opaque if physical stock references and traceability are not integrity-preserving.
- Idempotency scoped too broadly or narrowly could suppress legitimate actions or duplicate evidence.
- A generic `AuditEvent` implementation could be mistakenly accepted as sufficient domain persistence.

### Migration and compatibility implications

- Existing soft `boxId`/`itemId` values require an explicit compatibility and integrity plan; this ADR does not choose it.
- Existing Remittance/Consumption/Return records must not be silently rewritten or inferred into new evidence.
- Prototype Zustand/localStorage data is not migration authority.
- Backfill, coexistence, cutover, rollback, and production-data treatment require separate approved plans.
- Existing Surgery/Record and Remittance contracts must remain usable until an approved integration slice replaces or adapts them.

## Boundaries and non-goals

- No exact Prisma model, field, relation, enum, index, or migration is defined.
- No database/provider change is proposed.
- No event-sourcing platform, queue, or external service is selected.
- No API, route, component, validator, or source file is selected.
- No Stock ledger representation is decided here.
- No Auth provider, role mapping, or permission matrix is decided here.
- No accounting, billing, invoicing, replenishment, or fiscal behavior is introduced.
- No independent sterilization, maintenance, damage, or quarantine workflow is introduced.

## Security, multiempresa, and audit implications

- Every master, aggregate, command, projection, and evidence read/write must be company-scoped where applicable.
- Cross-company references and active assignments must be rejected server-side.
- Historical evidence must record actor and context through the approved audit contract without leaking another company's data.
- Authorization is evaluated before mutation and again within the trusted command boundary as required by the future authorization ADR implementation.
- Sensitive historical consultation may require filtered views for external users under existing Knowledge rules.

## Validation obligations

A future implementation plan must prove:

- formula save failure/cancellation creates no version or side effect;
- open preparations retain their starting formula version;
- prior controls, dispatches, returns, differences, and resolutions are immutable;
- stale control, re-control, dispatch, return, assignment, and formula writes are rejected safely;
- only one active Surgery/Record can own an identified box at a time;
- each dispatch remains distinct and partial-return accounting is not collapsed;
- clean explicit re-control is the only approved path from `Con diferencias` to `Disponible`;
- retries do not duplicate evidence, projections, audit, or downstream effects;
- company-isolation and authorization-denial tests cover reads and writes; and
- rollback and reconciliation procedures detect projection/evidence divergence.

## Protected approvals still required

Even if Franco approves this ADR, the following remain separately required:

- exact schema and migration Task Brief plus Franco approval before touching `prisma/schema.prisma` or migrations;
- data migration/backfill and rollback approval;
- audit/concurrency/idempotency implementation Task Brief;
- multi-company and security review;
- authorization architecture and role/capability mapping approval;
- Stock transaction architecture approval;
- Remittance/Return/Consumption integration approval;
- sensitive Surgery/Record Task Brief and Franco approval;
- verified TASKS amendment and separate APPLY authorization.

## Open technical questions not settled by approved DGs

1. What are the smallest aggregate boundaries that preserve atomic invariants without excessive contention?
2. Which optimistic-concurrency token or locking family should protect each confirm action?
3. How are command retry identities generated, scoped, expired, and inspected?
4. Which evidence should be a full composition capture versus normalized immutable lines?
5. How are projection repair and consistency checks performed?
6. How are existing soft references reconciled without inventing product history?
7. What retention, archival, and query-performance policy applies to detailed evidence?
8. Which cross-domain effects must be in one database transaction, and which may use reliable post-commit delivery?

## Approval checklist — separate Franco decision

- [x] Franco accepts the proposed Option A direction.
- [ ] Franco requests revisions before a decision.
- [ ] Franco rejects this direction and requests another option family.
- [x] Franco confirms that approval is architecture-only and does not authorize implementation.
- [x] Franco records a separate decision for this ADR, independent of the other three Cajas ADRs.

**Current approval state:** Franco approved Option A on 2026-07-19. This acceptance approves only the architecture direction; exact models, fields, schema, migrations, APIs, protected-file changes, implementation, Cirugías/Expediente refactoring, TASKS amendment, and APPLY remain separately gated.

## References and traceability

- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/SPEC.md`: `SCOPE-01`, `SCOPE-03`, `VOCAB-02`–`VOCAB-04`, `PREP-10`, `CONTROL-01`–`CONTROL-06`, `CHANGE-01`–`CHANGE-06`, `DISPATCH-03`–`DISPATCH-05`, `RETURN-10`–`RETURN-12`, `FORMULA-01`–`FORMULA-05`, `RESOLUTION-01`–`RESOLUTION-05`, `MULTI-01`–`MULTI-06`, `STATE-06`–`STATE-07`, `STOCK-10`; scenarios `PREP-03`–`PREP-06`, `CHANGE-01`–`CHANGE-03`, `DISPATCH-01`–`DISPATCH-03`, `RETURN-01`–`RETURN-07`, `STATE-03`, `DG02-01`–`DG04-02`, `DG07-04`.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/DESIGN.md`: §§3.3, 7.4, 8–12, 15, 17.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/TASKS.md`: D02 and blocked packages B01–B05.
- `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md`.
- `knowledge/architecture/DATA_MODEL_RULES.md`.
- `knowledge/architecture/MULTI_COMPANY_ACCESS.md`.
- `knowledge/architecture/AUDIT_EVENT_POLICY.md`.
- `knowledge/domain/STOCK_CAJAS_TRAZABILIDAD.md`.
- `knowledge/domain/SURGERY_EXPEDIENTE.md`.
- Related proposals: `ADR-CAJAS-STOCK-TRANSACTIONS.md`, `ADR-CAJAS-AUTHORIZATION.md`, `ADR-CAJAS-OPERATIONAL-INTEGRATIONS.md`.
