# Task Brief — Supplier Goods Receipt / Stock S1 DEV

## Objective

Create and confirm a company-scoped supplier goods receipt once, recording inbound stock through the existing C13/C14 evidence and projection topology, then expose the resulting balances in Stock.

## Approval and risk

- Risk: T3 stock persistence and existing schema topology; T2 API/UI.
- Approval: explicit implementation request `PURCHASE-RECEIPT-STOCK-S1-DEV-001`; DEV only, no production/staging, deploy, commit, push, or PR.
- Owner: `openai/gpt-5.6-terra`, Backend/DB + frontend implementation.

## Scope

- Reuse company-linked `Contact` as the supplier; `GoodsReceipt.supplierId` stores the Contact ID when current schema semantics support it. No supplier model or schema relation is added for S1.
- Add the minimum nullable `GoodsReceiptLine.depositId` relation: neither receipt header nor line currently persists the required destination deposit, so it is essential for reconstructible inbound evidence. The service requires it for new S1 lines; migration application remains blocked without an explicitly verified disposable DEV URL.
- Repair note (2026-09-21): the isolated clean chain has no historical migration that created `GoodsReceipt`, `GoodsReceiptLine`, or `ScanEvent`; the original S1 `ALTER TABLE` therefore fails on clean deployment. The failed S1 migration was marked rolled back and replaced with those schema-declared base tables, their indexes/foreign keys, and the S1 deposit FK. `migrate deploy` then applied it successfully to `ossum_receipt_s1_dev_20260921`.
- Isolated DEV validation (2026-09-21): retained `Proveedor S1 Validación`, `Depósito S1 Validación`, and `S1-RECEIPT-NONE`. A real normal confirmation (3), replay, and concurrent confirmations (4 + 5) created exactly three receipt evidences and finished with physical/available projection balance `12`.
- Create draft receipts with article, quantity, deposit, and lot/expiry where the stock article policy requires LOT traceability.
- Confirm transactionally and idempotently through `StockContext`, `StockPosition`, `StockEvidence`, `StockEvidenceLine`, and `StockPositionProjection`; reject unsupported `IDENTIFIED_UNIT` receipts.
- Provide company-scoped receipt and balance APIs, a compact `/compras/recepciones` operational page, and replace Stock's fabricated quantity fields with API-backed balances.
- Add focused receipt-idempotency, lot-expiry, and Stock-balance tests.

## Allowed files

- `knowledge/specs/PURCHASE-RECEIPT-STOCK-S1-DEV-001/**`
- `src/lib/services/goods-receipt.service.ts`
- `src/lib/services/stock-balance.service.ts`
- `src/lib/validators/goods-receipt.ts`
- `src/app/api/companies/[companyId]/goods-receipts/**`
- `src/app/api/companies/[companyId]/stock/balances/route.ts`
- `src/app/compras/recepciones/page.tsx`
- `src/components/compras/ReceiptOperationalWorkspace.tsx`
- `src/app/stock/page.tsx`
- focused tests under `src/__tests__/**`
- `prisma/schema.prisma` and `prisma/migrations/20260921130000_goods_receipt_line_deposit_s1/migration.sql`

## Forbidden files/actions

- C13 migration; all C14 migrations, validators, and writers; Auth, permissions, `src/lib/db.ts`, unrelated Cirugías/Presupuestos/Facturación, OCR, Remito service, production/staging/deploy/commit/push/PR.
- `prisma/schema.prisma` and migrations unless a documented additive requirement is proven and the target DB is explicitly confirmed disposable DEV.

## Validation

- Focused database-backed receipt confirmation idempotency and balance tests; lint, typecheck, and build as feasible.
- Browser preparation only; do not change Auth or spend more than 20 minutes on authentication.

## Stop conditions

- Stock projection semantics cannot be determined safely, C13/C14 ownership changes are required, Auth/security/RLS/role changes are needed, or database target is not confirmed disposable DEV.

## Pre-implementation finding

- Resolved by Franco's explicit S1 approval: receipt confirmation writes the receipt, inbound evidence/lines, and projection in one transaction. For normal deposit receipts: `physicalQuantity += receivedQuantity` and `availableQuantity += receivedQuantity`; reservation, review, and disposition values are retained. The projection watermark is the receipt evidence ID and its version increments exactly once per accepted receipt evidence.
- Confirmation must be DB-idempotent and race-safe; retries/concurrent confirms produce one inbound evidence and one projection increment. `WCB-06` remains untouched.
