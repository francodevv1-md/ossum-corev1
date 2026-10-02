# Bounded runtime-root Diagnose handoff

## Done
- Fixed modern Prisma root-versus-owner-transaction detection within approved workspace and four services only.
- Ownership released. Existing dirty source preserved; no Git commands, schema/generate, config, Auth/security/UI or dependency changes.

## Changed
- Root boundary requires callable public $connect and $transaction. An owner tx exposing $transaction but no $connect is reused directly, including supplied proxies.
- Existing Serializable/retry/timeouts and command/domain semantics retained.
- Three exact-hash-reserved test files updated only to model modern root/tx shapes.

## Files
- src/lib/services/cajas-formula.service.ts
- src/lib/services/stock-physical-unit.service.ts
- src/lib/services/cajas-assignment.service.ts
- src/lib/services/cajas-command.service.ts
- NEW src/__tests__/unit/cajas-transaction-shape.test.ts
- Root-shape fixtures only: src/__tests__/unit/cajas-slice1-formula.test.ts, stock-physical-unit.test.ts, cajas-preparation-recovery.test.ts.
- knowledge/specs/CAJAS-END-TO-END-DEV-001/TX_ROOT_LOCK.md and TX_ROOT_HANDOFF.md.
- Integration file unchanged (reserved hash still 8ED37028A98B6B29A7DD39EDF6A40D01529AE7B38C89CC2320BB4E22DA854DE9). Original cajas-slice3-assignment.test.ts untouched.

## Validations
- Reproduce / Scope / Evidence / Hypothesis: accepted orchestrator's actual DB probe/P2028 evidence; NEW runnable regression failed 8/8 against legacy detection with nested transaction errors before source changes.
- Minimal Fix: only public root checks changed in four transaction boundaries.
- Validate: transaction-shape regression 8/8 PASS. Supplied owner runs directly; root callback executes exactly once; all six recursive entry points reach domain work without nested savepoints.
- Regression Check final targeted units (Vitest --no-file-parallelism): 60 PASS / 5 FAIL, 6 files.
  - transaction shape: 8/8 PASS
  - formula: 12/12 PASS
  - physical unit: 5/5 PASS
  - new preparation correctness: 14/14 PASS
  - original assignment: 12/12 PASS, no mock issue observed and no edits
  - preparation recovery: 9/14 PASS; root retry test now passes; five previously documented obsolete non-boundary fixture cases remain.
- Real PostgreSQL run (same targeted command including integration): gate 1/1 PASS; actual scenarios 0 PASS / 4 FAIL in 39.4s. Actual formula/unit/assignment prerequisites succeeded. No recurring P2028.
- New first actual failure: PrismaClientValidationError, Unknown argument companyId in cajas-component-selection.service.ts:98-99, data.lines.create, reached via integration fixture:85. All four actual scenarios share this new prerequisite blocker. No scenario assertion reached; no fixture-only correction justified because invalid data originates in production service.
- Synthetic exact-owned child-first cleanup completed: afterAll produced no separate failure; disconnect and pool close completed. No FK/trigger disabling, resets or truncation.
- Commands rejected preexisting prod/production/staging tier/APP_ENV/VERCEL_ENV; opt-in/development/NODE_ENV=test overrides were transient and restored in finally. No DB secret logged or .env content reads.
- Caller review: six API routes pass root Prisma; integration passes root for prerequisites; formula/physical/assignment recursion supplies tx; component selection, reservations, controls and differences route through cajasTransaction and preserve owner tx. No TSX callers found.
- Broad build/typecheck not run: bounded root task and known unrelated shared TypeScript failures; no full-package validation claimed.

## Risks
- Real reservation/tenant/rollback/replay assertions remain unproven until component-selection service payload blocker is resolved by its owner.
- Recovery test fixture gaps: preparation-line findMany missing (3 cases), expectedResolutionSequence missing (1), formulaVersion.lines missing (1). Not source regressions introduced by root detection; previous PREP_A handoff already recorded 9/14.
- Accounting, UI and cancellation remain pending; this is not all-Cajas closure.

## Next
- Orchestrator assigns separate bounded Diagnose to component-selection payload owner. Re-run actual four PostgreSQL scenarios after that fix; retain synthetic gate and cleanup.

## Final SHA256
- cajas-formula.service.ts: EFFA0707E79134476CF241DA3B3EEB2CC1FF1E629BCBC945D17D64E950590113
- stock-physical-unit.service.ts: 95E1A79DE88F45FE3A53EE097FDFA204633A81B88B3027CECCF7FCB64911B1FD
- cajas-assignment.service.ts: 085B47FFB1D87E13C33325B02C2AA5A0819EEFD66B3D15B7925A34276C0EBA54
- cajas-command.service.ts: F678E51A4371046B6F36C309CA4C30C727186F309332ED043D67DB909B351D35
- cajas-transaction-shape.test.ts: 60E89AB5B2266ACA831968D6A4A8A66D9D99FF23316C3808327634387542BB4B
- cajas-slice1-formula.test.ts: 4FAB6C34053DD699DDBF7B13406C85CAE7113A7F9F9CF4089F70A9E63A24AB9E
- stock-physical-unit.test.ts: 59643F3DA50D4C03B18061DEC472102EFDCABC3A61393BC911789911E11D43DF
- cajas-preparation-recovery.test.ts: 28C31D508C54C10CCFB826CB130F4E3C79E7D910BD54DD64EA72A9F16FEF229B
