# ADR — Cajas Operational Integration Boundaries

## Metadata

- **Status:** ACCEPTED — Option A approved by Franco on 2026-07-19
- **Date:** 2026-07-19
- **Owner:** Architecture / SDD Design Author
- **Approver:** Franco
- **Scope:** Integration boundaries among Articles/Stock, Cajas, Surgery/Record, Remittance, Return, and Consumption
- **Supersedes:** None
- **Superseded by:** None
- **Decision independence:** This proposal may be approved, revised, or rejected independently from the other Cajas ADR proposals.
- **Authorization effect:** None. This approval does not select exact routes/files, authorize a Cirugías/Expediente refactor, approve implementation, or authorize APPLY.

## Context and approved product constraints

DG-06 fixes product-surface ownership:

- Articles/Stock manages `Caja`, versioned `Contenido esperado`, and `Caja identificada`.
- `/cajas` is a search and summary surface, not the operational host.
- the relevant Surgery/Record contains a section labeled exactly `Cajas` for selection, preparation, `Control de preparación`, difference resolution, `Recontrolar caja`, dispatch, and return;
- existing Remittance and Return flows are reused in Surgery/Record context rather than duplicated as Box-only workflows; and
- Articles/Stock operation history is consultation-only during an active operation.

DG-04 allows multiple identified boxes per Surgery/Record, multiple dispatches/remittances and partial returns for one identified box within its assigned operation, exclusive active-operation assignment, retained linkage until accounting and differences close, and bounded reuse.

DG-07 and approved CD-03 require Remittance issuance to count as successful only when the owning flow accepts it as emitted and operationally valid—not at draft, preview, tentative numbering, download, or attempt. At success, the emitted Remittance, immutable `Contenido despachado`, and Stock dispatch effect are accepted together; failure accepts none. Later annulment appends linked correction/reversal evidence and never erases the original; fiscal and commercial effects remain excluded.

Approved CD-06 is an expressly approved new product rule: Return and Consumption may occur in either order against one shared conceptual pending balance per dispatch, no quantity may receive two dispositions, and a Return-classified consumed quantity produces the single consumption effect that later Consumption recognizes as already accounted.

Approved CD-09 requires selection-incorporation, control, dispatch, Return, Consumption, and resolution confirmations to revalidate current server truth. The same operation shows its accepted result immediately. Informational read models may refresh later only while honestly marked updating/non-current, with no false zero/success/availability and no stale confirmation; no refresh-time SLA is selected. These constraints do not select technical routes, contracts, files, orchestration, or consistency mechanisms.

## Current evidence and gaps

The current repository has backend-backed Surgery, Remittance, Consumption, and Return slices and uses server services/validators behind API boundaries. Ficha CX is the current operation surface for Remittance/Consumption/Return, while sensitive Cirugías/Expediente files remain protected. D02 found:

- no approved Cajas service or operation contract;
- only soft `boxId`/`itemId` references and no integrity-preserving Article/Stock/identified-box model;
- current Remittance patterns do not gate issuance on immutable Cajas control evidence;
- current Return behavior does not provide the approved immutable per-dispatch exception/partial-accounting model; and
- existing patterns are evidence for modular boundaries, not authority to select exact integration placement.

## Decision drivers

1. Preserve Surgery/Record as the operation host and Articles/Stock as master owner.
2. Avoid duplicate sources of truth in `/cajas`, Remittance, Return, or frontend state.
3. Support approved multiplicity without hidden one-to-one assumptions.
4. Make dispatch success/failure semantics atomic and unambiguous.
5. Keep services, validators, authorization, and persistence server-side.
6. Integrate incrementally with current Remittance/Return/Consumption slices.
7. Minimize sensitive Surgery/Record change and require explicit ownership.
8. Keep exact routes/files open until approved Task Briefs.

## Viable option families

### Option A — Synchronous modular orchestration in the existing server application

Use bounded domain services for Cajas, Stock, Remittance, Return, and Consumption. An application-level operation orchestrator coordinates approved cross-domain commands and transaction boundaries; read models supply `/cajas`, Articles/Stock, and Surgery/Record views.

**Advantages**

- Fits the current Next.js modular monolith and service conventions.
- Supports immediate success/failure semantics for control, dispatch, and return.
- Keeps critical business logic and validation server-side.
- Easier initial transactional reasoning when domains share PostgreSQL.

**Tradeoffs**

- Orchestrators can become coupled or oversized.
- Cross-domain transaction boundaries require careful ownership.
- Sensitive host integration still needs frontend and server adapters.
- Future extraction may require stable internal contracts.

### Option B — Event-driven integration between bounded domains

Each domain accepts its own commands and emits durable events. Other domains react asynchronously, using process state to coordinate dispatch, return, and Stock outcomes.

**Advantages**

- Strong decoupling and independent domain evolution.
- Durable events can support integrations and audit-like chronology.
- Failure handling can be explicit through retries and compensations.

**Tradeoffs**

- Eventual consistency conflicts with checkpoints that users expect to succeed or fail as one confirmation.
- Requires outbox/inbox, ordering, deduplication, observability, and compensation design.
- Adds substantial operational complexity for the current project stage.
- A failed downstream Stock effect could leave confusing intermediate states unless workflow semantics are expanded.

### Option C — Remittance/Return-owned Cajas integration

Embed most Cajas operation logic directly into existing Remittance and Return contracts, with Articles/Stock supplying lookup data.

**Advantages**

- Reuses existing backend-backed surfaces and service entry points.
- May reduce the number of initial integration adapters.

**Tradeoffs**

- Conflicts with the Surgery/Record `Cajas` host and risks fragmented ownership.
- Preparation/control/re-control do not naturally belong to Remittance or Return.
- Multiple dispatches and partial returns could cause Cajas history to be reconstructed from documents rather than owned evidence.
- Increases risk of source duplication and tight coupling.

## Proposed direction for review

**Non-binding proposal:** adopt Option A: synchronous modular orchestration inside the existing server application, with explicit domain boundaries and server-owned read models. Durable post-commit events/outbox may later be used for non-critical notifications or integrations, but user-confirmed Cajas/Stock/Remittance/Return checkpoints would not depend on eventually consistent success.

The proposed responsibilities are conceptual, not file or API choices:

- **Articles/Stock boundary:** owns compound Article identity, `Contenido esperado` versions, physical unit identity, and selectable physical Stock facts.
- **Cajas operation boundary:** owns assignment, preparation composition, control/re-control evidence, differences/resolutions, operation linkage, and eligibility rules.
- **Surgery/Record application boundary:** supplies the operation context and composes the `Cajas` section without becoming the persistence owner of Article/Stock masters.
- **Remittance boundary:** retains issuance ownership; it requests/validates current dispatch eligibility and accepts emitted/operationally valid issuance together with its own immutable `Contenido despachado` and Stock dispatch effect. Later annulment contributes linked correction/reversal evidence rather than mutation.
- **Return boundary:** retains return ownership; it confirms exceptions against one relevant immutable dispatch and disposes only the confirmed portion against the shared pending balance without rewriting dispatch evidence.
- **Consumption boundary:** records approved consumption effects against the same per-dispatch pending balance, recognizes Return-classified consumption as already accounted, and creates no automatic invoicing or accounting.
- **Read models:** provide `/cajas` search/summary, Articles/Stock consultation, and Surgery/Record operational views from server truth without duplicate write ownership; delayed informational refresh is explicitly updating/non-current and cannot authorize confirmation.
- **Validators:** validate transport/input shape; domain services enforce business invariants; authorization policies enforce capabilities/company access.

No exact endpoint, Server Action, route, component, source path, or transaction implementation is selected.

## Consequences

### Positive

- Product ownership maps cleanly to technical responsibility without a Box-only subsystem.
- Existing Remittance and Return ownership is preserved.
- Critical checkpoint success/failure can remain immediate and atomic.
- `/cajas` can stay read-only summary/search while operation evidence remains centralized.
- Service, validator, permission, and read-model boundaries can be independently tested.

### Negative

- Coordinating several domains in one modular monolith requires strict dependency rules.
- Application orchestration and domain ownership must be documented to avoid circular calls.
- Read-model freshness and stale-confirmation behavior require explicit contracts.
- Sensitive Surgery/Record integration remains a separate high-risk project slice.

### Risks

- The Surgery/Record host could accidentally absorb Cajas/Stock business logic into React components.
- Remittance could create `Contenido despachado` before issuance truly succeeds.
- Return or Consumption could mutate dispatch evidence or over-account partial quantities.
- `/cajas` could become an alternate operational write surface.
- A shared transaction could become too broad; asynchronous splitting could weaken no-side-effect guarantees.
- Exact cardinality could be narrowed accidentally by current one-document assumptions.

### Migration and compatibility implications

- Existing Remittance/Consumption/Return APIs and services require adapters or additive contracts, not unreviewed replacement.
- Current soft references require an integrity plan under the Core Persistence ADR.
- Existing Ficha CX/Cirugías surfaces remain unchanged until a sensitive Task Brief identifies the minimal host integration.
- Legacy/prototype `/cajas` state cannot remain final truth and must have an explicit compatibility/cutover plan.
- Rollout should preserve current operations until each server-backed vertical slice passes regression and rollback gates.

## Boundaries and non-goals

- No exact API routes, Server Actions, service names, validators, components, or files are chosen.
- No Cirugías, Expediente, Ficha CX, Remittance, Return, or Consumption refactor is authorized.
- No Prisma/schema/migration work is authorized.
- No new provider, queue, broker, or dependency is selected.
- No duplicate Remittance or Return workflow is introduced under Cajas.
- No one-to-one cardinality beyond approved `MULTI-01`–`MULTI-06` is assumed.
- No automatic billing, invoicing, commercial, accounting, fiscal, purchasing, or replenishment effect is included.
- No incident lifecycle beyond approved simple notes is introduced.

## Security, multiempresa, and audit implications

- Every boundary receives trusted actor/company context from the approved server auth path and independently validates resource company scope for every query and mutation.
- Cross-domain references must reject cross-company reads or writes without disclosing resource existence and without side effects.
- The orchestrator cannot substitute for domain authorization or validation.
- Each successful critical command and its linked domain/Stock evidence must be auditable with shared correlation context.
- Denial or downstream validation failure must occur before any business side effect, or the whole atomic confirmation must roll back.
- Read models must apply the same company and filtered-history constraints as source domains.

## Validation obligations

A future implementation plan must prove:

- Articles/Stock is the only master-management owner and `/cajas` has no operational mutations;
- Surgery/Record context remains visible and one operation may contain multiple identified boxes;
- one identified box cannot be assigned to two active operations;
- each Remittance dispatch has separate immutable `Contenido despachado`;
- failed issuance creates no dispatch evidence or Stock movement;
- multiple dispatches and partial returns remain independently accounted;
- Return starts from the relevant dispatch and never mutates it;
- Consumption and Return may occur in either order against one shared per-dispatch pending balance and cannot double-account the same physical quantity, including Return-classified consumption;
- all critical confirmations revalidate current server truth, show their own accepted result immediately, and pass server validators, domain invariants, authorization, company scope, stale protection, audit, and idempotency;
- delayed informational refresh is explicitly updating/non-current and cannot show false zero/success/availability or enable stale confirmation;
- no frontend/local state is treated as final truth;
- existing Remittance/Consumption/Return regression suites remain green when implementation is later authorized; and
- sensitive Surgery/Record browser, accessibility, and rollback validation is performed under its own task.

## Protected approvals still required

- Approval of the Core Persistence, Stock Transactions, and Authorization directions needed by a given integration slice.
- Exact Remittance dispatch contract Task Brief and Franco approval.
- Exact Return/Consumption partial-flow Task Brief and Franco approval.
- Exact sensitive Surgery/Record host Task Brief, file lock, and Franco approval.
- Exact API/service/validator/read-model file allowlists.
- Schema/migration approval where persistence changes are required.
- Independent TASKS amendment verification and separate APPLY approval.
- Any asynchronous infrastructure or new dependency requires separate architecture and installation approval.

## Open technical questions not settled by approved DGs

1. Which application service owns each cross-domain transaction boundary?
2. What minimal contract lets Remittance verify dispatch eligibility without duplicating Cajas rules?
3. How are multiple boxes and multiple dispatches represented in current Remittance/Return contracts without narrowing cardinality?
4. What technical contract realizes the approved single pending balance per dispatch across Return and Consumption without double disposition in either order?
5. Which informational read models refresh synchronously or post-commit while preserving immediate own-operation success, explicit updating/non-current presentation, and no stale confirmation? No time SLA is selected.
6. Are any non-critical events delivered through an outbox, and what is their failure policy?
7. What is the minimal sensitive Surgery/Record integration point that avoids broad refactor?
8. How are legacy/prototype `/cajas` links and current operation records handled during cutover?

## Approval checklist — separate Franco decision

- [x] Franco accepts the proposed Option A direction.
- [ ] Franco requests revisions before a decision.
- [ ] Franco rejects this direction and requests another option family.
- [x] Franco confirms that exact routes/files and any Cirugías/Expediente refactor remain unapproved.
- [x] Franco confirms that no implementation or APPLY is authorized by this ADR alone.
- [x] Franco records a separate decision for this ADR, independent of the other three Cajas ADRs.

**Current approval state:** Franco approved Option A independently on 2026-07-19. This directional approval does not authorize implementation or APPLY, select exact routes/files, approve Prisma/schema/migration work, or authorize any Cirugías/Expediente refactor.

## References and traceability

- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/SPEC.md`: `SCOPE-03`, `DETAIL-06`–`DETAIL-09`, `PREP-01`–`PREP-10`, `CONTROL-01`–`CONTROL-06`, `CHANGE-01`–`CHANGE-06`, `DISPATCH-01`–`DISPATCH-08`, `RETURN-01`–`RETURN-19`, `ACCOUNTING-01`–`ACCOUNTING-05`, `FRESHNESS-01`–`FRESHNESS-03`, `COMPANY-01`–`COMPANY-03`, `MULTI-01`–`MULTI-10`, `HOST-01`–`HOST-05`, `STOCK-01`–`STOCK-10`; scenarios `CD03-01`–`CD03-02`, `CD06-01`–`CD06-03`, `CD09-01`–`CD09-02`, `CD10-01`–`CD10-02`, and applicable DG/PREP/CHANGE/DISPATCH/RETURN scenarios.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/DESIGN.md`: §§4–5, 8–12.4, 14–15, 17.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/DECISIONS-CD01-CD10.md`: approved CD-03, CD-06, CD-09, and CD-10 product constraints only; no implementation authorization.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/TASKS.md`: D02 and blocked packages B02–B08.
- `knowledge/domain/SURGERY_EXPEDIENTE.md`.
- `knowledge/domain/PREPARACION_REMITOS_CONSUMO.md`.
- `knowledge/domain/STOCK_CAJAS_TRAZABILIDAD.md`.
- `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md`.
- `knowledge/architecture/MULTI_COMPANY_ACCESS.md`.
- `knowledge/architecture/AUDIT_EVENT_POLICY.md`.
- Related proposals: `ADR-CAJAS-CORE-PERSISTENCE.md`, `ADR-CAJAS-STOCK-TRANSACTIONS.md`, `ADR-CAJAS-AUTHORIZATION.md`.
