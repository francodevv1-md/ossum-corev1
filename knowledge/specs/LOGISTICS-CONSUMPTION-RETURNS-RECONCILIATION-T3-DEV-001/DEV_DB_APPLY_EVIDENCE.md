# DEV DB migration evidence — 2026-09-07

Franco explicitly confirmed the configured target was disposable DEV and authorized this exact migration/proof.

## Migration

- Before: `npx prisma migrate status` reported only `20260907100000_phase_d_logistics_reconciliation` pending.
- Applied: `npx prisma migrate deploy` applied exactly that migration.
- After: `npx prisma migrate status` reported the database schema up to date.
- Catalog read: `prisma db execute` successfully queried `to_regclass` for `public.cajas_phase_d_operation` and `public.cajas_phase_d_reconciliation_event`.

## Validation

- `npx prisma validate` — pass.
- `npx prisma generate` — pass.
- `npm run typecheck` — pass.
- Focused Phase-D suite — 11 tests pass.

## PostgreSQL concurrency proof

`OSSUM_RUN_PHASE_D_POSTGRES_CONCURRENCY_DEV_INTEGRATION=true npx vitest run src/__tests__/integration/phase-d-logistics.postgres.test.ts` passed on the confirmed DEV database. The test selected isolated existing DEV surgical dispatch lineage, granted the explicit consumption action, issued two identical commands concurrently, asserted exactly one persisted Phase-D operation, a winner/replay pair, and a changed-intent `409` conflict.

The Phase-D operation/evidence history is append-only by design, so the generated uniquely keyed proof record remains as DEV audit evidence. No seed, backfill, or unrelated DB mutation was performed.
