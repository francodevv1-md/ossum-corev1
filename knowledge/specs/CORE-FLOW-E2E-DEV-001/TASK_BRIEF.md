# Task Brief — Canonical core-flow E2E DEV

## Objective

Validate the authenticated DEV path `Contact -> Surgery -> Presupuesto -> Preparation -> Remito -> Consumo -> Devolucion -> Invoice -> Payment` through CLI-driven Playwright with minimal browser/UI checkpoints and backend API assertions.

## Approval and scope

## HUMAN APPROVAL EVIDENCE

```yaml
approval_id: CORE-FLOW-E2E-DEV-001-20260903
status: APPROVED
approved_by: Franco
approved_at: 2026-09-03
environment: disposable-dev-only
approved_scope:
  - Validate the authenticated canonical flow from Contact through Payment.
  - Generate uniquely marked CORE-E2E test data and the minimum C13/C14 fixture bridge in the confirmed disposable DEV database.
  - Apply the proven Surgery visible-number P2002 correction and focused regression coverage.
  - Apply the proven Preparation and reservation correctness, concurrency, and idempotency corrections with focused regression coverage.
  - Apply corrective migrations 20260903195000_fix_preparation_reservation_contracts and 20260903200000_fix_cajas_dispatch_ceiling_columns only to disposable DEV.
  - Activate WCB-06 only in the local DEV process and restore its named deferred constraints after its immediate checkpoint.
  - Run required validation, GGA review, and create the local Change Pack commit after the gate passes.
restrictions:
  - No production or staging execution, deployment, push, PR, or real/non-disposable data mutation.
  - No schema, Auth, roles, permissions, secrets, provider, billing, fiscal, or unrelated business-rule changes.
  - No bypass or global disabling of GGA, stock authorization gates, or C13/C14 lineage controls.
  - Preserve unrelated working-tree changes and commit only the staged Change Pack scope.
```

- Franco confirmed the connected database is disposable DEV and authorized all test data required on 2026-09-03.
- Franco approved the minimal Surgery P2002 retry fix and regression test on 2026-09-03 after the E2E and direct service reproduction proved the blocker.
- Franco approved activating WCB-06 locally and generating the required C13/C14 Stock, Preparation, and Caja fixtures in the disposable DEV database on 2026-09-03.
- Franco approved the minimal Preparation/reservation service corrections and corrective PostgreSQL migration, applied only to the disposable DEV database, on 2026-09-03.
- The same approved DEV stabilization package includes restoring deferred constraints after WCB-06 performs its explicit immediate checkpoint so Remito verification can persist its deferred publication/access aggregate.
- Allowed writes: `e2e/core-flow-dev.spec.ts`, the reproduced blocker fixes in `src/lib/services/surgery.service.ts`, `src/lib/services/preparation.service.ts`, and `src/lib/services/c14/bundles/wcb-06.ts`, focused regression tests, corrective migrations, and this Change Pack. Other pre-existing edits in those files remain outside this package.
- Allowed execution: Chromium Playwright against the local DEV server and authenticated mutations against the confirmed disposable DEV database.
- Allowed DEV activation: restart the local server with `OSSUM_C14_WCB06_ENABLED=true`; no persistent environment or deployment configuration changes.
- Existing DEV fixtures and API contracts may be reused; generated rows use a unique `CORE-E2E-*` marker.

## Exclusions

- No schema, unrelated migrations, Auth, permissions, production/staging, deploy, push, PR or unrelated source implementation changes.
- No bypass of surgical stock/authorization gates.
- C13/C14 fixture data must satisfy the existing public contracts and WCB-06 lineage checks.
- Any proven application defect is reported before changing sensitive core-flow code.

## Validation

- `npx playwright test "e2e/core-flow-dev.spec.ts" --project=chromium --reporter=line`
- Focused Vitest regressions for Surgery allocation and Preparation reservations.
- `npx tsc --noEmit --pretty false`
- `npx prisma migrate status`
- `npx prisma format --check`
- `npm run build`
- API response bodies identify the exact failing stage without exposing credentials.
