# C13 checksum drift reconciliation proposal

## Evidence

- DEV records `20260813000000_remito_stock_atomic_dispatch_persistence_001` as finished with checksum `670e672a539edfeb6133e8e95b30b4e7f388aef8f93dcfb46eaca4d7f60742d8`.
- The preserved, untracked SQL artifact hashes to `6d0451972ed294fd4acc1ea293d21859acb869b1c960d4976127abbc4c279f8b`.
- The artifact creates `Article` and `StockArticleEligibility`; stabilization migration `20260917120000_article_prisma_contract_recovery` already creates and owns those contracts.

## Decision

Do not alter `_prisma_migrations`, checksums, or the historical C13 SQL. Do not use `migrate resolve` to conceal the mismatch.

## Proposed correction for review

Author a new, additive forward migration from the current stabilized schema only. It must exclude all existing Contact and Article tables/contracts, declare only absent C13/C14 structures, and include preflight checks for every target relation/type/constraint. Validate it against an explicitly confirmed disposable database before execution.
