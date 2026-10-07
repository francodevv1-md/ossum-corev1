# OC receipt stock adoption DEV — 2026-10-03

## Done
Bounded NONE-policy OC receipt now creates real physical stock through existing Receipt/StockMovement authority atomically with OC quantities/state and mandatory audit. No second ledger or historical ingress.

## Changed
Franco approved physical receiving Admin/Logistics only, no coordinator stock rights. Reused existing guards/capabilities; no global role/RLS/Auth changes. Explicit destination and stable intent/replay key, finite quantities, eligibility and policy fail-closed; post-commit refresh uncertainty fixed.

## Files
Current scope/evidence: knowledge/specs/OC-RECEIPT-STOCK-TRACE-DEV-20261003/; exact ownership in corresponding .opencode lock. No schema migration or foreign stock writer changes.

## Validations
94mocked checks PASS; critical review P1/P2 corrected and re-reviewed. Two live isolated NEW-SKU/NEW-OC runs PASS with stock0→1→4, canonical origin/actor/audit links, rejected/replayed operations unchanged, reload and native stock availability4. Separate SKUs avoid duplicate/backfilled stock. Artifacts outside Git contain only own QA IDs/counters; no session values.

## Risks
NONE quantity/origin only, not lot/serial/expiry units or full stock architecture. Real fault-injection/concurrent DB stress not executed. Typecheck global blocked by existing excluded next.config.ts eslintproperty; build not certified. Sol1 holds intact; no cleanup, real data, fiscal/mail, publication.

## Next
Use documented fresh QA replay; separately define traced receipt data/lifecycle and typed source/location expansion when requested.
