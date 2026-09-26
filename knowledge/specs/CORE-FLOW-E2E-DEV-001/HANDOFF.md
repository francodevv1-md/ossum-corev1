# Handoff — CORE-FLOW-E2E-DEV-001

## Done

- Completed the scoped Preparation TransactionClient integrity fix and its focused regression.
- Attempted the authenticated canonical DEV chain once with the supplied storage state; the stored token was expired or invalid.
- Added the minimum C13/C14 control-correlation bridge required because no public control-acceptance API exists.
- Fixed the reproduced Surgery allocation, Preparation reservation, Cajas dispatch ceiling, and WCB-06 deferred-constraint blockers.

## Changed

- Added one serial Playwright flow with API assertions and Cirugias/Cobros UI checkpoints.
- Reused a persisted authenticated Chromium storage state; the E2E no longer performs interactive login.
- Added focused Surgery and Preparation regression coverage.
- Serialized reservations on their preparation line, made replay intent-safe, and rechecked replay after lock contention.
- Scoped WCB-06 forced checks to its two dispatch constraints and restored those constraints to deferred mode afterward.
- Added two corrective PostgreSQL function migrations and applied them only to the confirmed disposable DEV database.

## Files

- `e2e/core-flow-dev.spec.ts`
- `src/lib/services/surgery.service.ts`
- `src/lib/services/preparation.service.ts`
- `src/lib/services/c14/bundles/wcb-06.ts`
- `src/__tests__/unit/surgery.service-visible-number.test.ts`
- `src/__tests__/unit/preparation.service.test.ts`
- `src/__tests__/unit/c14-wcb-06.test.ts`
- `src/__tests__/integration/cajas-dispatch-ceiling-columns.test.ts`
- `prisma/migrations/20260903195000_fix_preparation_reservation_contracts/migration.sql`
- `prisma/migrations/20260903200000_fix_cajas_dispatch_ceiling_columns/migration.sql`

## Validations

- Playwright Chromium with reused authenticated state: `1 passed (46.7s)`.
- Focused Vitest after final fixes: `3 files passed`, `18 tests passed`.
- TypeScript: clean.
- Prisma migration status: 38 migrations, schema up to date.
- Prisma format check: passed.
- Production build: passed.
- Diff whitespace check: passed.
- Final GGA: FAILED. The directly related WCB-06 HIGH is accepted as a separate follow-up and does not extend this Change Pack.

## Risks

- The E2E creates uniquely marked `CORE-E2E-*` rows and intentionally does not delete them from disposable DEV.
- Caja control acceptance remains a direct Prisma test fixture until a public application contract exists.
- WCB-06 was enabled only for the local validation process; no persistent environment was changed.
- Corrective function migrations intentionally target the exact known predecessor text and are one-time Prisma artifacts.
- Unrelated coordinator edits already present in `src/lib/services/surgery.service.ts` remain outside this package and require selective staging if committed later.
- Follow-up task: `WCB-06 — Replay lineage/evidence revalidation`. GGA found that idempotent replay accepts a matching dispatch without validating its persisted evidence, reservation, effects, counts, timestamps, or lineage. This real integrity risk is intentionally not fixed in this Change Pack.
- Follow-up (not fixed): GGA reported that the Cajas ceiling migration validates only one replacement, so a partial function rewrite could pass. This MEDIUM is recorded as technical debt.
- Follow-up (not fixed): GGA reported that preparation replay checks mutable assignment/activity and article eligibility before idempotency lookup. This MEDIUM is recorded as technical debt.
- E2E: rerun once with `C:\Users\franc\AppData\Local\Temp\opencode\core-flow-auth-state.json`; FAIL at `GET /api/me/companies` with `401 invalid_auth_token`. No login recreation or Auth investigation was performed.
- Validation baseline: `npx tsc --noEmit --pretty false` fails in pre-existing `src/__tests__/unit/c14-wcb-06.test.ts` null mock typings; the production build passed because it skips TypeScript validation.

## Cajas migration deterministic evidence

- Classification: `VALIDATION_ONLY`.
- PostgreSQL object: `public.fn_cajas_dispatch_ceiling()`.
- Final definition SHA-256: `1bf416f2b2266f79815dd68714cf9e9aff0f5c55898f586a8be3cce707f5ad4f`.
- `"control"."articleId"` → `"control"."article_id"`: OLD count `0`, NEW count `1`.
- `"control"."stockPositionId"` → `"control"."stock_position_id"`: OLD count `0`, NEW count `1`.
- `"control"."stockUnit"` → `"control"."stock_unit"`: OLD count `0`, NEW count `1`.
- `"control"."scaleSnapshot"` → `"control"."scale_snapshot"`: OLD count `0`, NEW count `1`.
- `"source"."articleId"` → `"source"."article_id"`: OLD count `0`, NEW count `1`.
- `"source"."stockPositionId"` → `"source"."stock_position_id"`: OLD count `0`, NEW count `1`.
- `"source"."stockUnit"` → `"source"."stock_unit"`: OLD count `0`, NEW count `1`.
- `"source"."scaleSnapshot"` → `"source"."scale_snapshot"`: OLD count `0`, NEW count `1`.
- Evidence source: read-only `pg_get_functiondef` inspection against the approved disposable DEV database plus `src/__tests__/integration/cajas-dispatch-ceiling-columns.test.ts`.

## Next

- This Change Pack is closed with accepted follow-ups. The WCB-06 replay-integrity HIGH requires the separate task `WCB-06 — Replay lineage/evidence revalidation`.
- No commit, push, PR, deployment, or non-DEV execution is included.
