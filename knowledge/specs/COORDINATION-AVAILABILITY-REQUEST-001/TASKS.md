# TASKS — COORDINATION-AVAILABILITY-REQUEST-001

Status: **FAST-TRACK DEV source and database alignment CLOSED; feature default-disabled; production track BLOCKED**
Authority: `SPEC.md` and `DESIGN.md` remain authoritative; this file changes execution sequencing only. Feature remains disabled by default.

## Review workload forecast

Estimated changed lines: >400 across implementation; serialized DEV work units.
Delivery strategy: ask-on-risk
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Governance

- Before each unit, declare ID, objective, owner/model/mode, scope/files/commands, dependencies, validation, output, stop rules and lock. Franco's authorization persists through fixes, retries, evidence and reviewer iterations until final PASS.
- One owner writes; at unit end one independent reviewer returns findings to that owner. New approval is required only for architecture/business change, schema/DDL expansion, real DB operation, Auth/permission boundary, destructive action, production/rollout, dependency, outside-file scope or active-writer conflict.
- No self-hashed manifests, byte ceremony, command-use limits, per-file baseline approvals or preimplementation over-specification. Every handoff uses Spanish Caveman: `Done / Changed / Files / Validations / Risks / Next`.

## Accepted baseline

- T00A PASS `#3635/#3636`; G-ARCH `#3646`; T10-v2 `#3642/#3643`; T20-r3 `#3657`, payloads `#3649–#3652`, review `#3654`.
- T30-A PASS `#3619/#3678/#3679`; preserve exactly `src/lib/services/availability-readiness-classifier.ts`, `scripts/dev/report-availability-readiness.ts`, `src/__tests__/unit/availability-readiness-classifier.test.ts`.
- T30-B1 is canceled by `#3693`. FT0 removes only `src/lib/services/availability-readiness-db-adapter.ts`, `scripts/dev/run-availability-readiness-read-only.ts`, `src/__tests__/unit/availability-readiness-db-adapter.test.ts`, `src/__tests__/unit/availability-readiness-read-only-runner.test.ts`.

## Serialized DEV units

- [x] **FT0 — Cleanup/baseline.** Already authorized. Owner removes only the four canceled untracked files; lock those paths. Preserve T30-A/unrelated work. Commands: status/hash/read-only containment only. Reviewer verifies deletion and containment. Evidence: `#3695/#3696`.
- [x] **FT1 — Schema source, no DB.** Backend/DB owner locks only `prisma/schema.prisma` and `prisma/migrations/20260722160000_add_availability_request_foundation/migration.sql`; apply exact T20-r3 payload. Reconcile current Cajas D4 schema; never repair missing Cajas history. Static review only: no Prisma generate/format/introspection, migration apply, DB, seed or backfill. Evidence: `#3700/#3701`.
- [x] **FT2 — Backend/API, disabled.** After FT1 PASS, approve an exact services/validators/routes/tests brief and one chain lock. Implement new-Surgery creator write and request logic; no unrelated Cirugías refactor. Unit/API mocks allowed; runtime DB tests wait for FT3. Permission scope requires explicit source/permissions approval. Evidence: `#3704/#3719/#3722`; 97/97 focused tests; P0=0/P1=0.
- [x] **FT3 — DEV DB alignment — EXECUTED.** Repair plus Availability applied successfully; second item-tenant repair applied; Prisma status up to date; catalog principal checks passed; focused DB rerun 5/5 files, 6/6 tests PASS; cleanup 25/25 zero and Availability workflow tables remain zero. Evidence: `#3764/#3765/#3767/#3770/#3773/#3774/#3775`.
- [x] **FT4 — Permissions/UI.** Approve exact capability mapping and frontend files; no Auth-provider redesign. Synthetic DEV PÍVOT only. Run source/UI tests; browser waits for a separate local-QA gate. Evidence: apply `#3733`; independent verify/close `#3736/#3737`; 86/86 focused tests; P0=0/P1=0.
- [x] **FT5 — Final DEV QA — EXECUTED.** Report `#3738`: Availability DEV source-only PASS WITH WARNINGS; FT2 focused 100/100, FT4 focused 86/86, typecheck/build PASS, exact Availability lint 0. Its original repository global gate FAILED: 5 DB-backed integration files failed against stale DEV DB; global lint 260 errors/786 warnings. FT3 later repaired those five blockers and their exact focused rerun passes, but the entire full suite was not rerun; global lint debt remains. No production readiness, browser PASS or real Availability runtime fixture PASS.

## Traceability and deferred production

FT1 validates schema portions of `RQ-003,009–010,013,015,027–029,036,038` / `SC-008–014,032,035`; FT2/FT4 cover `RQ-001–034,038` / `SC-001–032,036–037`; FT3/FT5 may validate DEV-only parts of `RQ-035–038` / `SC-033–035`.

T30-B2 real environment reporting, creator backfill, real per-company PÍVOT, production migration, permission population, observability, pilot and rollout are deferred. They need fresh production packages and approvals; FAST-TRACK does not satisfy production evidence for `RQ-035–038` or `SC-033–035`. Unknown legacy creators remain unknown/ineligible: no default or inference.

## Next gate

Next requires exact real per-company PÍVOT designation, capability grants and provider enablement, then Availability-specific runtime/browser QA, and only after those gates DEV feature enablement. Production remains a separate package. No approval phrase, production readiness, full-suite PASS, browser PASS or real Availability runtime fixture PASS is fabricated.
