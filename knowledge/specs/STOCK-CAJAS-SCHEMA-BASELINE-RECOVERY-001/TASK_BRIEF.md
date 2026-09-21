# Task Brief — C14 schema baseline recovery

Status: **T3 authorized by Franco on 2026-09-21; forward-only and not applied.**

## Objective

Establish the bounded schema baseline required by C14 WCB-06 without adopting unrelated schema recovery work.

## Literal GGA #7221 defects

1. `[critical] prisma/schema.prisma:18 — §9.5/§11 approval boundary — Critical schema/database architecture is rewritten without a supplied GGA-verified Task Brief and Franco approval for this exact scope.`
2. `[critical] prisma/schema.prisma:GoodsReceiptLine.article — multiempresa isolation — GoodsReceiptLine, ScanEvent, and SurgeryPreparationLine reference Article.id without organization/company lineage, permitting cross-tenant article associations.`
3. `[high] prisma/schema.prisma:StockReservationEvidence — schema/runtime consistency — @@unique([companyId, commandAcceptanceId]) allows one reservation evidence per command, while WCB-06 supports writing multiple distinct reservation evidences under that acceptance.`
4. `[high] prisma/schema.prisma:18 — database/schema parity — Extensive destructive/additive schema changes have no staged forward migration; prisma migrate deploy cannot create the schema required by the staged runtime.`

## Allowed changes

- Retain the durable generic stock/Cajas candidate and the ContactAddress/Article tenant overlay; do not extract partial models.
- Bind `GoodsReceiptLine`, `ScanEvent`, and `SurgeryPreparationLine` to the existing company-scoped `StockArticleEligibility(companyId, articleId)` owner. This rejects cross-company articles without duplicating organization lineage.
- Change `StockReservationEvidence` uniqueness to `[companyId, commandAcceptanceId, reservationId]` mapped as `uq_sre_command_reservation`.
- Reuse the prepared forward migration for that uniqueness change. It remains unexecuted.
- Record the broad candidate's six independent packages as preserved, not approved by this task; no migration may silently drop or transform their existing data.

## Existing data treatment

- This package does not execute a migration or infer a company, organization, eligibility, or article relationship.
- The reusable uniqueness migration validates the exact legacy index before changing it.
- A complete migration for the preserved +2315/-1016 candidate cannot be generated safely from migration history without a configured isolated shadow database; it remains a hard parity gate. Its generated preview contains destructive topology replacements and therefore is not staged by this package.
- If a future approved migration finds a receipt, scan, or preparation row without a matching company-scoped eligibility, it must stop for manual reconciliation; it must not create an eligibility or select a company.

## Preserved, out-of-scope candidate packages

1. Remito scan/public verification.
2. Generic stock/evidence/reservation/projection/operational-command topology.
3. Cajas assignment, preparation, control, dispatch, reconciliation, maintenance, and unit-log rewrites.
4. Article taxonomy, Xadmin, identifiers, suppliers, and traceability.
5. Goods receipt, scan-event, and surgery-preparation persistence.
6. Phase-D operational models and durable attempt audit.

## Exclusions

No migration execution, database/shadow-database access, SQL history/checksum changes, C13 changes, backfill, data inference, Auth, permissions, deployment, push, or PR.

## Validation

Prisma format/validate/generate, TypeScript, focused C14 tests, migration static assertions, and GGA #7221. Commit only after every gate passes.
