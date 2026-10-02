# FORECAST-COMPAT-001

## Done
- Minimal purchasing read-projection compatibility regression fixed in principal E:\OSSUM_COR_ANTIGRAVITY\ux-ui; own lock released.

## Changed
- Select remainingQuantity and sum its numeric value for ACTIVE reservations, including fractional components and zero remaining fully dispatched rows.
- Preserve original minStock implementation and physical-unit behavior through explicit remainingQuantity=1 fixtures; no fallback.

## Files
- src/lib/services/compras-forecast.service.ts — one selected field and one aggregation expression.
- src/__tests__/unit/compras-reposicion.test.ts — one focused regression plus explicit existing reservation fixtures.
- knowledge/specs/CAJAS-END-TO-END-DEV-001/FORECAST_COMPAT_LOCK.md — exact ownership, released.
- knowledge/specs/CAJAS-END-TO-END-DEV-001/FORECAST_COMPAT_HANDOFF.md — this evidence.

## Validations
- Reproduce: npm test -- src/__tests__/unit/compras-reposicion.test.ts -t "reserves remaining quantity" failed before fix: expected reservedStock 3.5, received 2.
- Scope: forecast read projection only; actual getComprasForecast with mocked Prisma reads.
- Evidence: original select only articleId; aggregation +1 per row. Baseline service blob 7ddad4968bcbf4450c1fda0e078283e8c282f607 unchanged immediately before service edit.
- Hypothesis: row counting loses quantity and reserves dispatched allocations again.
- Minimal Fix: select remainingQuantity; aggregate Number(res.remainingQuantity).
- Validate / Regression Check: npm test -- src/__tests__/unit/compras-reposicion.test.ts src/__tests__/unit/article-company-commercial-profile.test.ts passed 2 suites, 23 tests (12 purchasing + 11 profile; combined original 22 plus one regression).
- Regression checks remaining 3.5 + remaining 0, inTransit 4, physical 10, available 2.5, minStock 5, suggested 2.5 and exact tenant/status/select query.

## Risks
- Existing Node localstorage-file warning during Vitest; tests pass.
- Validation limited to requested suites; no build/typecheck run in this bounded compatibility task.

## Next
- Preparation owner can continue independently. No pending forecast compatibility work.
