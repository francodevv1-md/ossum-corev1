# Cajas completion validation log

## Preserved baseline

- Formula, assignment and physical units: 3 suites / 27 tests passed before completion changes.
- Article commercial profile and replenishment: 2 suites / 22 tests passed before generalized-reservation compatibility changes.
- Remito, Consumption, Return and canonical quantities: 7 suites / 84 tests passed before document-owner integration.
- Independent finalized-schema review: no concrete blocker; blob `b3b0fcf8472078aed254b3ffe4423643653f8a28` matched before and after review.
- Independent read-only `prisma migrate status`: 8 migration artifacts found; `Database schema is up to date!`. No schema editing, generation or unrelated migration application performed by the orchestrator.
- Stable-source preparation snapshot later passed 41/41. Assignment QA observed an external fixture hash change and made no source corrections; that file remains outside further write ownership.
- Owning Remito dispatch block: 42/42 focused tests (27 existing, 15 new); transaction-double proof only, not PostgreSQL rollback/concurrency.

## Corrections: Explicit PreparationLineId Enforcement & Universal Lot/Serial Validation

1. **Explicit `preparationLineId` Enforcement**:
   - In `buildCajasDispatchPayload`, if an item specifies `preparationLineId`, it is strictly verified against active preparation lines (`l.id === item.preparationLineId && l.isActive`).
   - If nonexistent or inactive, throws a descriptive error immediately. Never falls back to SKU/articleId matching when an explicit ID is supplied.
2. **Universal Traceability Validation**:
   - Lot and serial numbers (`item.lotNumber`, `item.serialNumber`) are validated against the chosen preparation line (`prepLine.lotNumberSnapshot`, `prepLine.serialNumberSnapshot`) in all selection paths (explicit ID, unique SKU candidate, and disambiguated candidates).
   - Any mismatch immediately throws a descriptive error rather than ignoring the incompatibility.

## Technical Checks and Verifications

- **git diff --check:** Clean (0 whitespace/syntax issues).
- **Standalone TypeScript (`npx tsc --noEmit`):**
  - Scoped files (`src/lib/cajas-intent.ts`, `src/__tests__/unit/cajas-ui-intent-wiring.test.ts`): 0 errors.
  - Foreign protected file (`src/app/cirugias/page.tsx`): 5 pre-existing errors preserved untouched per AGENTS.md §10–11.
- **Unit & Integration Tests:**
  - `npm test -- cajas-ui-intent-wiring` -> 1 test file, 31 passed (added 4 new regression tests for invalid/inactive explicit ID, SKU lot mismatch, serial mismatch, and matching traceability preservation).
  - `npm test -- cajas` -> 9 test files, 108 passed, 5 skipped (live PostgreSQL integration tests require live test database connection).
  - `npm test -- remito-service consumo-service devolucion-service` -> 3 test files, 78 passed.
  - Total: 186 unit tests passing across Cajas and Document domains.

Scoped locks released. Real multi-tenant concurrency stress and browser E2E marked pending live staging/deployment verification.
