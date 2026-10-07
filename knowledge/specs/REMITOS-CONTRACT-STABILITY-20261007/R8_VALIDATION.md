# R8 — verified stock projection

## Diagnose

- **Reproduce:** new predicate/select-aware availability replay: **16 failed /14 passed of30** before source changes. Canonical En_transito disappears; full accepted2-unit dispatch from10 gives physical8 but available6; partial/mixed lines subtract twice; ID and SKU buckets omit quantities or leak to a coincident SKU; transit filter drops canonical rows.
- **Scope:** only `getStockAvailability` read projection; ledger/state/accounting writers untouched. Current source had no foreign stock-ledger diff. Concurrent transit agent owns Surgery `in_transit` validators/adapters, not Remito/stock; no overlap.
- **Evidence:** actual Cajas issuance writes DISPATCH_OUT with company/article/Remito/item links. Existing availability selects discarded links and subtracted entire documentary transit from already-decremented physical stock. Canonical Remito state En_transito absent from read filter.
- **Hypothesis:** preserve existing transit eligibility, add actual canonical label, retain ledger linkage in read select, match posted quantity per exact line/article/owner, subtract only the unposted documentary remainder. Resolve technical-ID/SKU-only lines into a single article identity before aggregating.
- **Minimal Fix:** movement Remito/item IDs and active document/item IDs selected; Decimal net DISPATCH_OUT minus RETURN_IN by line; nonnegative documentary net and uncovered remainder; same existing company-filtered ledger query, no per-line queries. Transit remains informational. IDs and SKU use separate lookup namespaces. Draft reservation aggregation uses the same resolved article key.
- **Validate:** first **65/65 across5 files**, R8 scoped TypeScript PASS.4 supplemental regressions retained: emitted→canonical transit, fractional exact coverage, mixed-ID/SKU reservations, explicit unknown ID not guessed by SKU.
- **Regression Check:** **580/580 across38 files PASS**; final scoped TypeScript/owned whitespace PASS. Includes full R1–R7 matrix plus stock facets/commercial/origin and Cajas correctness/transaction shape. Independent critical review **34/34 R8,59/59 across5 selected suites + typing/whitespace PASS**, no concrete introduced blocker. Ownership released.
- **Handoff:** no physical stock is created or reversed by this read change. Annulation excludes transit/reservations as before but does not reverse accepted ledger effects. No change to Remito/Surgery transitions, emission or human accounting.

## Protected cases

-34 current checks, real service against predicate/select-aware database doubles: canonical and incumbent Emitido/legacy spellings; full/partial/mixed/multiple dispatch effects; exact company/Remito/item/article matching; null link cannot suppress documentary quantity.
- Physical versus documentary return evidence, returned ledger quantities no longer treated as outstanding dispatch, unrelated return/zero-delta disposition, excess dispatch clamped without adding stock.
- Anulado/Entregado/Devuelto/Parcialmente_devuelto and existing deliveredAt gate exclude documentary transit without changing physical ledger balance.
- Draft reservations preserved, ID/SKU mixed totals merged, namespace collision eliminated, SKU-only exact item linkage, unknown explicit ID not reassigned.
- Filters/facets/summary/pagination and fixed read-query count preserved. Database double exposes no writes; production changes contain only reads/aggregation.

## Replay

```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/stock-availability-remitos.test.ts src/__tests__/unit/stock-ledger-facets.test.ts src/__tests__/unit/article-company-commercial-profile.test.ts src/__tests__/unit/stock-movement-origin-projection.test.ts src/__tests__/unit/cajas-dispatch-owner.test.ts --maxWorkers=2
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/R8-tsconfig.json --noEmit --incremental false --pretty false
git diff --check -- src/lib/services/stock-ledger.service.ts
```

Full matrix: final32-file R7 command in `R7_VALIDATION.md` (its expanded base command in `R6_VALIDATION.md`) plus these six suites:

```text
src/__tests__/unit/stock-availability-remitos.test.ts
src/__tests__/unit/stock-ledger-facets.test.ts
src/__tests__/unit/article-company-commercial-profile.test.ts
src/__tests__/unit/stock-movement-origin-projection.test.ts
src/__tests__/unit/cajas-prep-correctness.test.ts
src/__tests__/unit/cajas-transaction-shape.test.ts
```

Use `--maxWorkers=2`; actual result38 files /580 tests. Existing Cajas dispatch owner already in R7 matrix, not counted twice.

## Limits

- Offline service contract proof, not live DB/Auth/browser/whole-stock certification. Existing multi-query snapshot behavior remains; no new transaction/locking/isolation policy.
- Existing numeric DTO, physical ledger helper and summary number conversion retained; not a global Decimal refactor. Only per-line coverage/remainder uses exact Decimal before conversion.
- Incumbent Emitido/legacy spellings and deliveredAt condition deliberately retained; no fictitious state, no assumption that only physically in-transit documents count. Other agent owns Surgery canonical state separately.
- No change to canonical StockReservation counting, lot/position projections or Cajas lifecycle; draft reservation eligibility retained. No cancellation compensation/inferred Cajas disposition or historical data cleanup.
- Global build/source-wide typing NOT RUN; prior unrelated failures remain:9 Seguimiento route fixture cases and intermittent ComprobantesPrint multi-suite behavior excluded, not fixed or counted green.
- No UI/API/DTO/schema/Auth/roles/dependencies/DB/browser/Git mutation/deploy; R9 changed-content audit/technical IDs/global gates remain.
