## Handoff

### Done
- Added the approved immutable per-allocation snapshot field and additive migration artifact.
- Implemented server-authoritative eligible-position reads, confirmed allocations, explicit releases/replacements, and non-final difference acknowledgement.
- Preserved C14 correlation append-only behavior; no control, Remito, or dispatch writer is called.
- Rejected legacy correlations without a complete immutable snapshot before a release/replacement can append a new correlation.
- Added focused B1 multi-position/lot/identified-unit and B4 explicit-release runtime proof.
- Applied only the approved additive Phase B migration to the explicitly confirmed disposable DEV database after proving it was the sole pending migration.
- Captured post-apply Prisma status and read-only PostgreSQL catalog/history evidence.

### Changed
- New correlations persist a complete server-derived allocation trace snapshot. Legacy correlations remain nullable/readable.
- Legacy nullable or incomplete snapshots are not releasable: the service rejects them rather than fabricate historical trace evidence for a new release correlation.
- Confirmations lock the expected line, position, and identified unit where applicable; final conditional availability decrement prevents oversubscription.
- Replacements first release the active reservation, then append new correlation lineage. Partial reservations remain active until an explicit release.

### Files
- `prisma/schema.prisma`
- `prisma/migrations/20260906234500_add_cajas_allocation_trace_snapshot/migration.sql`
- `src/lib/services/cajas-physical-preparation.service.ts`
- `src/lib/validators/cajas.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/cajas/preparation/[assignmentId]/lines/[lineId]/{positions,allocations/[correlationId],difference-acknowledgement}/route.ts`
- `src/__tests__/unit/cajas-physical-preparation.service.test.ts`
- `knowledge/specs/LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001/TASK_BRIEF.md`
- `knowledge/specs/LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001/LOCK.md`
- `knowledge/specs/LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001/HANDOFF.md`

### Validations
- `npx prisma format`, `npx prisma validate`, and `npx prisma generate` passed.
- Focused Vitest passed: 7 tests covering B1–B4, idempotency, atomic oversubscription failure, isolation of control/dispatch writers, and explicit-only release behavior.
- Scoped ESLint passed.
- Typecheck has only the known unrelated `src/__tests__/unit/c14-wcb-06.test.ts:214` union-narrowing baseline errors; no Phase B errors remain.
- Read-only `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` showed the expected `allocation_trace_snapshot JSONB` addition plus unrelated existing schema drift. The migration was not applied.
- `npx vitest run src/__tests__/unit/cajas-physical-preparation.service.test.ts` passed (9 tests) after the static fix and independent runtime-coverage additions.
- The focused suite now proves cross-company assignment/line/position rejection before writes; visible unacknowledged `DIFFERENT` replacement evidence/audit lineage; acknowledgement audit `finalApproval: false` with no control/dispatch writer; and explicit-only release evidence/audit lineage from `PARTIAL`.
- `npx prisma validate` passed after the static fix; it did not mutate the database.
- Migration gate before apply: `npx prisma migrate status` found 39 migrations and exactly one pending migration, `20260906234500_add_cajas_allocation_trace_snapshot`; no other migration was pending.
- Apply: `npx prisma migrate deploy` applied only `20260906234500_add_cajas_allocation_trace_snapshot` successfully.
- Post-apply: `npx prisma migrate status` reported `Database schema is up to date!`.
- `npx prisma validate` passed post-apply.
- `npx prisma generate` passed post-apply (Prisma Client v7.8.0 generated locally).
- Read-only PostgreSQL catalog inspection of `public.cajas_reservation_correlation` confirmed `allocation_trace_snapshot` is nullable `jsonb`; legacy FK columns `stock_position_id`, `stock_reservation_id`, and `stock_reservation_evidence_id` remain present and non-null.
- Read-only `public._prisma_migrations` inspection confirmed target `20260906234500_add_cajas_allocation_trace_snapshot` is applied and not rolled back.
- `npx vitest run src/__tests__/unit/cajas-physical-preparation.service.test.ts` passed post-apply (9 tests).
- Read-only scoped review: the approved migration remains a single `ALTER TABLE "cajas_reservation_correlation" ADD COLUMN "allocation_trace_snapshot" JSONB;`; `git diff --check -- prisma/migrations/20260906234500_add_cajas_allocation_trace_snapshot/migration.sql knowledge/specs/LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001/HANDOFF.md knowledge/specs/LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001/LOCK.md` passed with no output.

### Diagnose
Reproduce:
- Independent static review identified `release()` appending `Prisma.JsonNull` for a legacy correlation and focused tests that passed without exercising the path.

Scope:
- Only the Caja physical-preparation service, its focused unit test, and factual Phase B records; no schema, migration, DB, route, UI, control, Remito, or dispatch changes.

Evidence:
- `src/lib/services/cajas-physical-preparation.service.ts:121` used `correlation.allocationTraceSnapshot ?? Prisma.JsonNull` for a newly created release correlation.
- The pre-fix B1 fixture allocated the same `NONE` position twice; B4 did not invoke the release service.

Hypothesis:
- Nullable legacy storage was correctly retained for read compatibility, but the release append path treated missing historical evidence as a valid new snapshot.

Minimal Fix:
- Validate the prior snapshot's required immutable fields and correlation bindings before any release mutation; reject if incomplete, otherwise copy the retained snapshot exactly into the append-only release correlation.

Validate:
- Focused Vitest passed with B1 lot/identified-unit snapshot fidelity, B4 explicit release, and legacy no-snapshot rejection coverage.
- Prisma schema validation passed without a DB command or mutation.

Regression Check:
- Existing replacement, idempotency, acknowledgement, oversubscription, and control/dispatch-isolation tests remain green in the focused suite.

Handoff:
- Legacy snapshot rows remain readable but require a separately authoritative historical evidence source before release; this task deliberately does not invent one.

Migration inspection Diagnose:
- Reproduce: the initial read-only `node -e` catalog query failed with `SyntaxError: Invalid or unexpected token`; a second wrapper failed with `ERR_UNKNOWN_ENCODING: Unknown encoding: from`.
- Scope: only the ad-hoc PowerShell/Node inspection command; the migration had already applied successfully and no project artifact was implicated.
- Evidence: PowerShell stripped embedded JavaScript/SQL quote characters for the native command; the second command passed `Buffer.from.name` (`from`) instead of a valid encoding.
- Hypothesis: native argument parsing, not Prisma, PostgreSQL, or the applied migration, caused the inspection failures.
- Minimal fix: transmit the unchanged read-only Node query as base64 and decode it in Node with the explicit `base64` encoding value.
- Validate: the corrected query returned the nullable `jsonb` column, retained non-null FK columns, and completed non-rolled-back migration row.
- Regression Check: post-apply Prisma status, validate, generate, focused 9-test suite, and scoped `git diff --check` all passed.
- Handoff: no database correction, schema change, or migration artifact edit followed the inspection failure.

### Risks
- The existing repository has extensive unrelated dirty/untracked work and unrelated schema drift; none was reverted or reformatted intentionally by this task.
- Legacy correlations without snapshots cannot be released or replaced until authoritative historical trace evidence is available; this is the required fail-closed behavior.
- The transient read-only catalog command initially failed because PowerShell/native argument parsing stripped embedded SQL quoting. Diagnose isolated it to the inspection wrapper; the final base64-encoded stdin-free Node wrapper executed the same read-only query successfully. No database correction or migration artifact change was made.

### Next
- Phase B migration application is complete. Archive or continue only with separately authorized work.
