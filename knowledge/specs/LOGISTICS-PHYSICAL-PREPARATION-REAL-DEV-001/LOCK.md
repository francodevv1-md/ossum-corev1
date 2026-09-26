# Ownership Lock — LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001

- Task: `LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001-MIGRATION-APPLY`
- Agent role: SDD apply executor
- Selected model: `openai/gpt-5.6-terra`
- Status: `released`
- Owned files: `knowledge/specs/LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001/{HANDOFF.md,LOCK.md}`; authorized DB operation is limited to applying `20260906234500_add_cajas_allocation_trace_snapshot` after sole-pending proof.
- Explicitly not claimed: Prisma schema/migration artifacts, app/test files, seed/backfill, any other DB mutation, routes/validators, C14 runtime writers/contracts, generic preparation service, control/Remito/dispatch, UI, Auth/policy, and unrelated dirty/untracked work.

## Evidence

Inspection found that the existing multi-row `CajasReservationCorrelation` topology has no per-allocation immutable trace-snapshot field. `CajasPreparationLine.traceCapture` is single-valued at the expected-line level, so it cannot represent B1 allocations from multiple lots/identified units without overwrite or conflation.

## Prior static-fix scope

Independent static review identified a nullable legacy release path that could append a new correlation without a complete snapshot, plus missing focused B1/B4 runtime proof. This task may only reject legacy no-snapshot releases, add those focused tests, and correct factual scope wording.

## Migration-apply scope

Apply only the approved additive migration to the explicitly confirmed disposable DEV database after Prisma status/history prove it is the sole pending migration. Capture read-only integrity evidence, validate the focused suite, then release this lock.

## Migration application evidence

- Before apply, `npx prisma migrate status` reported 39 migrations and exactly one pending migration: `20260906234500_add_cajas_allocation_trace_snapshot`.
- `npx prisma migrate deploy` applied only `20260906234500_add_cajas_allocation_trace_snapshot` successfully.
- After apply, `npx prisma migrate status` reported `Database schema is up to date!`.
- Read-only catalog evidence confirms nullable `allocation_trace_snapshot` (`jsonb`), retained non-null `stock_position_id`, `stock_reservation_id`, and `stock_reservation_evidence_id`, plus one completed, non-rolled-back target row in `public._prisma_migrations`.

## Prior release

Focused Vitest (8 tests) and `npx prisma validate` passed. No database migration or DB command was run.
