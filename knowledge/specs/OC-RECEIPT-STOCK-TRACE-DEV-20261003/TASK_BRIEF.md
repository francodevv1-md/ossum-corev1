# OC receipt → physical stock / origin traceability DEV

## Outcome and approval
Franco explicitly requested continuation after proposed receipt→stock/traceability. Finite DEV package: one NEW isolated QA OC, real quantity-stock effect through the existing physical authority, delta partial/full, explicit destination, source/actor traceability, atomicity and replay protection. No retrospective backfill of the previously received QA OC or real records.

## Declaration
- Task: OC-RECEIPT-STOCK-TRACE-DEV-20261003
- Owner/model: orchestrator openai/gpt-6.1-sol; directed single source writer after permissions boundary resolved, independent review.
- Current mode: implementation/testing; stock permission boundary resolved by explicit approval below.
- Allowed source chain: services/orden-compra.service.ts and receipt.service.ts; validators/orden-compra.ts; api/ordenes-compra.ts; receiving route; ReceiveOrdenCompraDialog.tsx; OC page receiving controls; exact focused tests in lock. Coordinator additionally owns four-field read-only movement origin projection/type extension and one focused test; stock-ledger write helpers/foreign deltas remain untouched. Schema/Auth/role definitions/RLS and other source files remain read-only.
- Execution: focused mocked tests, independent reviews, fresh manual session and two isolated NEW-OC/NEW-SKU live runs completed; no migrations, held suites, real records or backfill.
- Exclusions: Auth/security policy changes without exact approval, competing ledger, major architecture, schema/provider changes, old Sol1 held suites/fixtures/forensics, historical stock backfill, real records, fiscal/payment/mail, cleanup/reset/delete, Git/deploy.
- Validation planned: focused quantity/idempotency/rollback/company eligibility tests; real isolated partial/full stock readback and origin Receipt/StockMovement audit; same saved command; independent review; applicable TypeScript/build without disabling checks.
- Handoff: Done / Changed / Files / Validations / Risks / Next, actual PASS/FAIL/BLOCKED/NOT RUN.

## Replay validation bound
Primary acceptance uses one new isolated OC/SKU. One additional explicit fresh replay verifies the same user-facing command prepares a different zero-balance SKU and never duplicates/backfills the completed case. Finite validation ceiling: two completed synthetic cases in this package; no automatic retry, cleanup or historical ingress.

## Verified canonical authority
Source explorer salty-orange-salamander traced stock UI/API and Cajas to the SAME Prisma StockMovement authority. StockPhysicalUnit is an identified-unit registry, not a second balance. Current OC receipt has no Receipt/StockMovement side effect. Use existing Receipt confirmation and shared recordStockMovement helper, not a new writer. Existing Receipt metadata/idempotency and trace/location fields can support a bounded slice without schema changes.

## Minimal technical slice (pending permission decision)
- New OC + independently reverified QA supplier/article; verified current policy NONE only for V1 quantity/origin traceability. Explicitly reject tracked policies rather than silently receive without lot/serial/expiry; complete serialized-unit lifecycle is not claimed.
- Explicit nonempty destination supplied in the receiving request/UI; never silently choose the display fallback Depósito Central. QA uses a unique isolated destination string, not a real warehouse decision.
- Stable client operation key and normalized payload retained for uncertain-result retries. Under company-scoped OC FOR UPDATE: accepted operation lookup before state rejection, equal-key/equal-payload replay with no extra writes, changed-payload conflict.
- Validate all positive lines/unique item IDs/finite positive precision-limited quantities/article active+organization+company eligibility/supplier link before effects. Empty/all-zero operations rejected.
- Existing Receipt + delta lines + RECEIPT_IN movements + OC quantities/state + audit in one transaction. Shared confirmation currently calls nested $transaction even when typed TransactionClient; transaction-aware extraction required, preserving other receipt callers.
- Never credit cumulative received, duplicate retries or historical received quantities. Partial cancellation must not reverse previously recorded physical stock.
- Existing Stock detail omitted persisted receipt/line/key/actor identifiers. Add only receiptId, receiptLineId, idempotencyKey and createdById to movement projection (optional types for old callers), keeping tenant-scoped queries/balances/permissions unchanged. Do not expose arbitrary metadata or add another stock writer. This enables exact physical movement↔Receipt-line actor trace verification via existing APIs.

## Genuine permission boundary
Verified src/lib/services/orden-compra.service.ts allows OC mutation admin/coordinador/logistica (normalized admin/coordinator/logistics). Standalone receipt confirmation calls requireReceiptMutationAccess, whose STOCK_OPERATION_ROLES are ONLY admin/logistics (src/lib/permissions/stock-operations-policy.ts:4).
Connecting stock while retaining coordinator's existing OC receipt permission would expand coordinator stock rights. Restricting physical OC receipt to the stock policy also changes which OC actors can receive. This is a human security/business decision, NOT a routine technical phase; ask one precise question before implementation. Conservative proposal: reuse existing stock guard, physical receiving admin/logistics only, do not grant coordinator stock privileges. Auth/role definitions/RLS unchanged.

### Approved permission decision
Franco answered “Si confirmo” to the exact question limiting physical OC receipt to Admin/Logística and not enabling stock ingress for Coordinación. Approved narrowly: reuse requireReceiptMutationAccess on OC receiving and canPerformStockOperations for receiving UI; existing OC create/emit/send roles remain unchanged. Do not modify global role/capability/RLS definitions. Backend remains final authority, coordinator receipt attempts must return403 before service/stock effects.

## Proven review corrections before live ingress
Source writer timed out after leaving implementation; process stopped and ownership handed off internally. Exact80mocked checks PASS but critical reviewer reproduced accepted POST + swallowed failed GET refresh: modal closes/loses key and reopening can double-credit stock. Propagate receiving post-commit refresh failure as a reconciliation error (not rejected POST, even for refresh4xx); preserve modal's stable key/payload. Recovery owner has the hook and focused regression suite only, not global auth/API policy. Shared normalization also needs explicit finite key/destination bounds and malformed-Unicode key rejection400 before URI encoding. These are fixes inside approved outcome, not another human decision. No live ingress before re-review.

## Historical hold
SOL1-BASELINE-PREPARATION-REMITO-20261002/DB_TESTS_BLOCKED.md remains intact and applies to that package's unknown historical fixtures/DB suites/forensics. Do not rerun those suites, investigate broad markers or clean old data. This separate new-OC slice does not lift the hold.
