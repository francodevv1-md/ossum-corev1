# Ownership Lock

- task: `SUPPLIER-REMITTANCE-BACKEND-T3-001`
- agent role: Backend / DB + frontend implementation
- selected model: `openai/gpt-5.6-terra`
- owned files/folders: `prisma/schema.prisma`; `prisma/migrations/20260922150000_supplier_remittance_backend_t3/**`; `src/lib/services/supplier-remittance.service.ts`; `src/lib/services/goods-receipt.service.ts`; `src/lib/validators/supplier-remittance.ts`; `src/lib/validators/goods-receipt.ts`; `src/app/api/companies/[companyId]/supplier-remittances/**`; `src/app/api/companies/[companyId]/goods-receipts/**`; `src/app/compras/remitos-proveedor/**`; `src/components/compras/ReceiptOperationalWorkspace.tsx`; focused tests under `src/__tests__/unit/**`; `knowledge/specs/SUPPLIER-REMITTANCE-BACKEND-T3-001/**`
- status: released
- authorization: Franco explicitly approved the single `size:exception` T3 DEV work unit on 2026-09-22. The connected database is disposable DEV only.
- forbidden: Auth/global permissions, invoices/purchase orders/payment orders, boxes, surgeries, fiscal scope, C13/C14/WCB-06 history, production/staging, deploy, commit, push, merge, PR, new dependencies, and unrelated worktree changes.
- verification: confirmed no active schema owner before reservation; prior visible schema locks `PURCHASE-RECEIPT-STOCK-S1-DEV-001`, `STOCK-CAJAS-SCHEMA-BASELINE-RECOVERY-001`, and `SURGERY-VISIBLE-NUMBER-UNIQUENESS-DEV-001` are `released`. Prisma validate/generate/status, focused tests, typecheck, and build passed. Migration SQL was executed only against `ossum_receipt_s1_dev_20260921` and resolved as applied.
