# Tracked OC receipt DEV

## Outcome and approval
Franco explicitly answered “Si dale” to reception by lot/serial/expiration, extending the completed NONE-policy physical stock/origin slice. Keep Admin/Logistics-only physical ingress and current atomic/idempotent authority; new isolated synthetic fixtures only. No real records or historical backfill.

## Declaration
- Task: OC-TRACKED-RECEIPT-DEV-001
- Coordinator/model: openai/gpt-6.1-sol; read-only explorer agreed-sapphire-wildcat.
- Current mode: read-only investigation/internal brief. Implementation waits on actual business rules below, not technical phase approval.
- Current allowed files: this isolated task folder only. No shared source/schema ownership yet.
- Forbidden: Auth/permissions/RLS/production/fiscal/real data/destructive cleanup/Git publication, prior Sol1 held suites/forensics, unapproved major architecture or lifecycle expansion.
- Validation planned: six-policy trace requirement checks, exact Decimal allocation sums, canonical lot/expiry equivalence, serial uniqueness/registration and rollback, old NONE replay unchanged, reordered tracked replay and changed-trace conflict, uncertain UI payload preservation, source review and isolated DEV replay.
- Handoff: Done / Changed / Files / Validations / Risks / Next with real-vs-mocked status.

## Verified existing contracts
One receivedByItem entry per OC item can carry nested allocations; existing ReceiptLine fields hold lot/serial/expiration and shared helper already emits line movements. Multiple lines can represent one OC item via itemsByLine; serialized allocations require quantity1 per serial. Existing schema can store this receipt evidence without changes.

Preserve legacy NONE normalized JSON exactly: inserting default empty trace fields would invalidate accepted operation replay. New tracked allocation order/quantities/date formatting must normalize consistently; accepted samekey changedtrace conflicts.

Lot equivalence has canonical direction: company/article/normalized lot, conflicting expiration blocked. Do not silently separate one lot into different expiry identities.

## Genuine business/architecture boundaries
- Existing StockPhysicalUnit registry uniquely constrains company+serial across articles/statuses. Generic Receipt/StockMovement has no serial duplicate guard. Need confirm whether business serial identity is company-wide lifelong or product-scoped; do not merely remove NONE rejection.
- Creating a physical unit registers identity, not balance. Registry holds no lot/expiration/receipt relationship; Cajas unit selection checks neither ledger balance nor expiration. Do not claim complete expiry-safe serialized lifecycle or extend held Cajas/core flow implicitly.
- Current stock detail labels expired yet retains availability; Cajas fungible selection uses UTC day-start. No canonical ingress decision for expired goods (reject vs quarantine/accept). Ask separately after serial identity is resolved; do not invent receiving/expiry policy.

## Confirmed serial rule
In response to whether serials can repeat between different articles or must be company-wide unique, Franco answered “Unico no debe repetirse”. Adopt existing company-wide serial uniqueness, across products and historical/retired registrations; never create a second physical identity for the same serial. Accepted operation retries retain the already-created identity and do not count as another ingress. Return/reactivation is a distinct lifecycle, not a new OC identity or implicit permission to recreate serials. No scope/constraint migration needed for this rule.

## Confirmed expired-receipt rule
Franco answered “Registramos y generamos aviso. No sé bloquea” in response to expired material at receiving. Register the physical receipt even when expired, show a visible advisory and preserve warning evidence with receipt/audit. Do not invent quarantine or reject valid expired dates. This concerns receiving only: existing downstream use/preparation/reservation rules are not changed or represented as newly certified. Dates must be strict real calendar dates; warnings must be deterministic/documented for date-only values.

## Approved implementation slice
Company-wide serial uniqueness reuses current registry constraint and transaction-aware createStockPhysicalUnit helper. Repeated accepted operations do not create units/movements/notices again. New OC ingress rejects already-registered serials across articles/statuses; return/reactivation remains separate. No schema/permission expansion, competing ledger, or Cajas selection/assignment edits.

Preserve all old NONE normalized intents byte-for-byte. Tracked rows accept nested allocations, exact Decimal sum, one serial per quantity1 line, lot/valid date requirements from current authoritative article policy. Detect normalized lot expiry conflicts under a stable Article-level lock; keep serial registration, Receipt lines/movements/OC deltas/audit atomic. Guard missing trace/invalid dates/duplicate serials before writes; use current compound unique constraint for concurrent serial collision. Warning accepts expired input, not malformed dates.

## Current evidence
Source-only exploration, no implementation/tests/browser/DB/network/migrations. Previous stock source lock released, foreign dirty OC/Receipt/schema preserved. Precise previously verified DEV company remains codevdistricorr1000000000; explorer shorthand target typo is not a replacement. Runtime DEV5000 still listening; no restart/build/typegen performed.

## Continuation declaration — 2026-10-04
- Owner/coordinator: openai/gpt-6.1-sol; mode QA/testing/docs. Existing production implementation is frozen, not rebuilt.
- Allowed writes: task folder/current lock; explicit NONE metadata in useOrdenesCompra-receipt-reconciliation.test.tsx; three new tracked QA files reserved by the lock. characteristic-turquoise-junglefowl exclusively authors those QA files; confident-harlequin-guppy independently reviews existing production source read-only.
- Allowed commands: exact eight-suite mocked allowlist, tsc --noEmit --incremental false, offline QA discovery/syntax, authenticated read-only preflight, sequential new synthetic DEV acceptance after review. Forbidden: broad tests/held suites, build/typegen/restart over readiness runtime, source rewrites, migration/reset/cleanup, secrets disclosure, Auth/permissions, real data, Git mutation/publication/deployment.
- Source review: independent production source PASS; no blocking finding. Reviewer identified omitted NONE policy in old reconciliation fixture; coordinator reproduced three failures then aligned only that fixture. Consolidated 200/200 mocked checks PASS. Typecheck FAIL only foreign next.config.ts:10 unsupported eslint property.
- Runtime preflight: unchanged listener PID21948 on127.0.0.1:5000. Initial login timed out during cold readiness; later HTTP200 and actual dev-session authenticated/200 exact-company preflight PASS with existing external state reused. No business mutations yet. Actual tracked receipt/browser/concurrency acceptance remains NOT RUN until saved QA execution.
