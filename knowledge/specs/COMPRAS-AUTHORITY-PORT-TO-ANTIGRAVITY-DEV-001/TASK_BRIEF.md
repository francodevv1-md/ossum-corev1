# COMPRAS-AUTHORITY-PORT-TO-ANTIGRAVITY-DEV-001

## Approval

Franco approved the selective port on 2026-09-29 with: `ok dale metele`.

## Objective

Make OrdenCompra and FacturaCompra server-authoritative in the Antigravity final worktree, replacing their visible Zustand/local-store write authority without importing root history.

## Ordered scope

1. Port OrdenCompra persistence, API, typed client/hook, scoped UI, and tests.
2. Port FacturaCompra persistence, API, typed client/hook, scoped UI/OCR save bridge, and tests.
3. Create new target-local additive migrations after `20260929150000_adjustment_documents_multi_origin`.

## Rules

- No cherry-pick or merge from the divergent root branch.
- No schema/migration execution until the connected database is explicitly confirmed as disposable DEV.
- No production/staging/deploy, real data mutation, Auth, fiscal issuance, or unrelated Antigravity changes.
- FacturaCompra follows OrdenCompra because it has an OC relationship.
- Existing browser-local purchase records are legacy; no backfill in this package.

## Allowed files

- `prisma/schema.prisma`
- New target-local migrations: `20260929160000_oc_backend_authority`, `20260929160100_factura_compra_backend_authority`, `20260929160200_factura_compra_integrity`
- `src/lib/services/{orden-compra,factura-compra}.service.ts`
- `src/lib/validators/{orden-compra,factura-compra}.ts`
- `src/lib/api/{ordenes-compra,facturas-compra,proveedores}.ts`
- `src/hooks/{useOrdenesCompra,useFacturasCompra,useProveedores,useComprasOcrForm}.ts`
- Scoped API routes under `src/app/api/companies/[companyId]/{ordenes-compra,facturas-compra}/`
- `src/components/compras/{ArticleSearchInput,CreateOrdenCompraDialog,ReceiveOrdenCompraDialog,ComprasOcrWorkspace}.tsx`
- `src/app/compras/{ordenes-compra,facturas-compra}/**`
- Focused OrdenCompra and FacturaCompra unit tests.

## Validation

- `prisma format`, `prisma validate`, `prisma generate`.
- Focused service/validator tests for both slices.
- DEV-only `prisma migrate deploy` after database confirmation.
- API smoke flows for OC create/emit/send/receive and FC create/pay/cancel/duplicate rejection.
- Authenticated browser smoke with a fresh, temporary local storage state.
- Independent review and scoped diff check.
