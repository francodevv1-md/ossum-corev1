# TASK BRIEF — Remito / Stock Atomic Dispatch

Status: **RUNTIME IMPLEMENTED ON APPROVED DISPOSABLE DEV TARGET / VERIFICATION FIXES IN PROGRESS**
Task ID: `REMITO-STOCK-ATOMIC-DISPATCH-001`
Risk: **T3 — Stock truth, schema/migration, multi-company integrity, audit, and Remito issuance**

## Objective

Make successful Remito issuance and Stock/Cajas dispatch acceptance one atomic,
idempotent server-side command. A failed command must persist neither the emitted
Remito nor dispatch/Stock evidence.

## Proven current state

- `emitirRemito()` already owns Remito issuance in one Serializable Prisma
  transaction, including numbering and verification artifacts.
- `CajasDispatch` and `CajasDispatchLine` are declared in Prisma and relate to
  the exact Remito and Remito items.
- The repository now includes the approved runtime C14 bundle service and validation-only validator.
- The approved disposable DEV migration materialized the canonical C14 persistence package.
- Prisma declares the canonical Stock source tables required by WCB-06
  (`StockEvidence`, lines, reservation evidence, positions, and identified
  units) under the approved persistence package.
- The task-specific approvals superseded the earlier C13/C14 exclusions only
  for this bounded disposable-DEV migration and runtime implementation.
- The independently reviewed C14 documentary package was materialized as the
  approved executable persistence and runtime package for this task.
- Canonical WCB-06 uses an exact pre-transaction authorization proof,
  private-writer registry/scanner enforcement, a durable attempt sink, and
  opportunistic 60-second reconciliation in the emission service.

The persistence prerequisite was completed and applied only to the approved
disposable DEV target before runtime implementation began.

## Canonical command contract

The implementation entry point is the approved WCB-06 command:
`DISPATCH_ACCEPTANCE_WITH_RESERVATION_APPLICATION`.

### Approved transaction-owner amendment

Franco approved this amendment in chat on 2026-08-13; Engram `#5292`:

- the Remito issuance application orchestrator is the only top-level
  transaction owner;
- it opens one fresh `Serializable` transaction and supplies its private
  `Prisma.TransactionClient` and authorized capability to WCB-06;
- WCB-06 must not open a nested, ambient, or sibling transaction;
- WCB-06 retains frozen-anchor lock order, complete prevalidation, the
  transactional audit → acceptance → domain-write order, forced checks,
  post-DML reread, rollback semantics, stable idempotency, and bounded
  whole-transaction retry classification;
- durable attempt/reconciliation evidence remains outside the domain
  transaction and cannot substitute for transactional acceptance evidence.

This narrowly supersedes WCB-06's `READ COMMITTED` top-level ownership for this
Remito issuance composition. It does not weaken any data, authorization,
anti-bypass, audit, idempotency, or validation invariant.

### Approved authorization mapping

Franco approved this mapping in chat on 2026-08-13; Engram `#5299`:

- WCB-06 reuses exactly the current Remito issuance role set: `admin`,
  `coordinador`, `coordinator`, and `logistica`;
- actor and company access are validated before transaction creation;
- the authorization proof binds only that actor/company, WCB-06, its exact
  contracts, registry/scanner identities, and permission evidence;
- it does not broaden roles, trust client lineage, or change Auth, RLS, or the
  global permission model.

### Approved durable-attempt channel

Franco approved this storage decision in chat on 2026-08-13; Engram `#5300`:

- use one append-only durable-attempt table in the same PostgreSQL DEV database;
- durable events use separate fresh transactions and never share or substitute
  the Remito/WCB-06 domain transaction;
- after a fixed 60-second lease, the reconciler resolves exact semantic-key
  state to `SUCCESS_RECOVERED`, `ROLLED_BACK_RECOVERED`, or remains
  `AUDIT_PENDING` when coherent success/absence cannot be proved;
- no new provider, queue, credentials, secrets, or external infrastructure;
- this approval is DEV-only and grants no production deployment authority.

### Approved V1 applicability and mapping

Franco approved this business rule in chat on 2026-08-13; Engram `#5304`:

- WCB-06 applies only to surgical Remitos whose complete item set can be derived
  server-side from exactly one active Cajas assignment, its current accepted
  control/preparation lines, Stock positions, and live reservations;
- every Remito item must map bijectively to the accepted dispatch/Stock lines;
  missing, duplicate, extra, stale, cross-company, or quantity-mismatched
  lineage rejects issuance with no domain side effects;
- client-provided `itemId`, `boxId`, SKU, or snapshots are never Stock authority;
- non-surgical Remitos keep the existing issuance path without WCB-06;
- multi-box or multi-assignment surgical content must be split into one Remito
  per Caja before issuance; an unsplit Remito is rejected.

One accepted command must write, in one transaction and authoritative time:

1. command audit and acceptance evidence;
2. one dispatch Stock-evidence header and one or more Stock-evidence lines;
3. one `APPLY_TO_DISPATCH` reservation-evidence row;
4. one `CajasDispatch` and one or more `CajasDispatchLine` rows;
5. exactly two command effects: reservation application and dispatch Stock;
6. the Remito transition from `Borrador` to `Emitido`, visible number, issuance
   verification artifacts, and issuance audit.

Stock and dispatch lines must form a non-empty bijection and match Article,
physical scope, quantity, unit, scale, traceability, command, result, and time.
`RemitoItem` remains the printed snapshot; it does not become Stock truth.

## Required implementation sequence

### A. C14 persistence prerequisite

- Materialize the already approved canonical Stock/Cajas persistence objects in
  a DEV-only migration artifact.
- Prove the migration matches the approved object inventory and creates no
  billing, accounting, fiscal, Auth, provider, or UI behavior.
- Apply it only to an explicitly confirmed disposable DEV database.
- Validate constraints, append-only protections, company lineage, and rollback.

### B. WCB-06 runtime

- Add the exact validator at
  `src/lib/validators/c14/bundles/wcb-06.ts`.
- Add the exact command owner at
  `src/lib/services/c14/bundles/wcb-06.ts`.
- Reuse one supplied `Prisma.TransactionClient`; the bundle must not open a
  nested or ambient transaction.
- Produce the exact authorization proof before transaction creation. The route
  may supply actor/company context, but the client may not supply authoritative
  company, result, timestamp, acceptance/audit, Stock, reservation, control, or
  Cajas lineage fields.
- Derive authoritative lineage from locked, company-scoped server records.
- Implement the required private-writer registry/scanner gate, durable attempt
  sink, and reconciliation path before enabling WCB-06.
- Implement stable semantic idempotency. Same key + same intent returns the
  accepted result; same key + different intent returns `409`; retries never
  duplicate evidence, effects, or audits.
- Revalidate company ownership, active assignment, latest accepted control,
  reservation availability, line correspondence, and current dispatch
  eligibility inside the transaction.

### C. Remito orchestration

- Extend `src/lib/services/remito.service.ts` so `emitirRemito()` invokes WCB-06
  inside its existing Serializable transaction before commit.
- Extend the existing emission route only with the bounded command input needed
  for transport idempotency. Cajas/Stock lineage remains server-derived.
- Preserve current issuance verification and whole-transaction retry behavior.
- Do not create a post-issuance Stock write or asynchronous compensation path.

## Proposed implementation allowlist

- `prisma/schema.prisma` only if the independently reviewed canonical migration
  requires exact Prisma representation.
- One new migration directory under `prisma/migrations/`.
- `src/lib/validators/c14/bundles/wcb-06.ts`.
- `src/lib/services/c14/bundles/wcb-06.ts`.
- Exact C14 shared wrapper, private writers, lock/reread/deferred-check adapters,
  registry/scanner, durable-attempt, and reconciliation modules only after their
  complete paths and identities are independently reviewed.
- `src/lib/permissions/c14/authorize-insert-writer.ts`, limited to the approved
  Remito role/company mapping above.
- `src/lib/services/remito.service.ts`.
- `src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route.ts`.
- Focused WCB-06, Remito service, route, rollback, retry, and integration tests
  under `src/__tests__/`.
- This Task Brief and one milestone/handoff record if required.

Exact migration paths and any additional canonical C14 writer modules must be
declared before APPLY. Scope expansion is a hard stop.

Canonical closure requires the complete non-severable 169-object C14
persistence set and complete RegistryV4/ScannerV2 inert owner topology (11
bundle owners, 18 contract owners, 21 private writers, and 29 command
entrypoints). Only WCB-06 is product-enabled by this task; all other bundle
routes remain unavailable. An inferred WCB-06-only persistence subset is not
authorized.

## Forbidden scope

- Production, staging, or non-disposable data.
- Auth, permission-model, RLS, provider, storage, or secret changes.
- Cirugías/Expediente UI or core-flow refactors.
- Return/Consumption runtime implementation beyond regression protection.
- Billing, invoicing, accounting, fiscal, purchasing, or replenishment effects.
- Historical backfill or invented Stock evidence for existing Remitos.
- Destructive mutation of accepted evidence; corrections remain append-only.
- New dependencies.
- Commit, push, PR, merge, deployment, or publication.

## Required validation

- Prisma format, validate, and generate.
- Migration static review and disposable-DEV application evidence.
- Focused tests proving happy path, rollback on every failed section, line
  bijection/totals, reservation application, stale control, company isolation,
  idempotent retry, key reuse conflict, and no duplicate audit/effects.
- Existing Remito issuance, retry, verification, route, Consumption, and Return
  regressions.
- TypeScript and build; unrelated pre-existing failures must be reported with
  focused green evidence rather than silently changed.
- Independent read-only review of the exact migration and runtime diff.

## Stop conditions

- Canonical Stock/C14 object bytes or migration authority are incomplete.
- Runtime registry/scanner, durable attempt sink, or reconciliation contract is
  absent or unapproved.
- The target database is not explicitly confirmed as disposable DEV.
- A current dirty-file owner conflicts on schema, Remito service, or route.
- Implementation requires a business rule not fixed by the approved WCB-06
  contract.
- The same proven blocker survives two minimal Diagnose cycles.

## Approval requested

Approval must explicitly cover this exact Task Brief, the C14 persistence
prerequisite, one disposable DEV migration application, WCB-06 runtime, and the
atomic Remito integration. It grants no authority outside the allowlist and
exclusions above.
