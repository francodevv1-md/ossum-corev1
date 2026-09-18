# Clean Budget Authority Recovery — Phase 1

## Brief / declaration
- Task: `CLEAN-BUDGET-AUTHORITY-RECOVERY-20260916`; T3 bounded recovery of already approved canonical behavior, not a new business decision.
- Owner: sole SDD apply backend executor; model `openai/gpt-6-astra`; implementation/testing/docs mode.
- Target: `E:/OSSUM_COR_WORKTREES/ossum-clean`; original `E:/OSSUM_COR_PROJECT` strictly read-only.
- Authority: original `PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001/TASK_BRIEF.md` (completed, approval 2026-08-30), `knowledge/domain/PRESUPUESTOS.md`; runtime gap confirmed by independent review Engram #6909.
- Parent explicitly authorizes this finite recovery after “continua con el flujo”. No new rules, no legacy repair, no live migration certification.
- Allowed files: narrow budget models/reverse relations in `prisma/schema.prisma`; two source authority SQL artifacts; `src/lib/services/presupuesto.service.ts`; `src/lib/validators/presupuesto.ts`; five existing collection/detail/emitir/versions/state routes; source budget unit/static SQL tests; `recovered-schema-contract.test.ts` monetary assertion only; new producer-consumer regression; this package and worklog milestone.
- Forbidden: Invoice implementation, Auth/guards/roles, stock, email, packages, store, core Cirugias, client read adapter, all unrelated existing dirty changes; env/secrets inspection/change; DB connections/queries/mutations; migration execution; installs; browser; Git staging/commit/push/PR/deploy.
- Commands: scoped status/diff/hash, offline test runner (env loading disabled), full tsc, Prisma format/generate with datasource-free temporary config. Build deferred to parent unless safe guard is reused.
- Stop: owner collision, changed source baseline, missing canonical semantics, required security/Auth/business expansion.

## Design
Recover exact existing backend authority, not compatibility aliases: family + DRAFT/CURRENT/HISTORY, required commercial snapshot, strict expectedRevision commands, four-place Decimal arithmetic, transactional audit and replacement. Revision creates a draft without replacing current; only replacement emission changes prior current. Invoice still requires approved CURRENT and reads persisted rates/amounts. No rate inference or approved-row promotion.

Schema merge is limited to PresupuestoFamily, Presupuesto, PresupuestoItem and required Company/Surgery/Branch/ContactCompanyLink reverse relations and uniqueness. The unrelated pending Article/stock recovery cluster is excluded from this candidate. SQL was recovered byte-for-byte and was not executed during this recovery; historical verification evidence #6145 is not superseded. Required NOT NULL additions have no legacy backfill and may fail on populated tables: **NON-EXECUTABLE against existing data until a separately authorized compatibility audit**.

## Delivery / testing
- Standard mode (no strict TDD config found); explicitly requested RED producer-consumer regression precedes implementation.
- Internal auto-chain: A persistence declarations/static SQL; B source service/validator/routes; C producer-consumer and adjacent regression validation. No PR or commit actions.
- 400-line budget risk: High
- Chained PRs recommended: No
- Decision needed before apply: No
- Accepted `size:exception` for exact source recovery files exceeding 400 lines; inspect units separately.
- Output: review-ready Phase 1, lock review, inventory/evidence, exact downstream UI incompatibilities. Parent owns independent review and Sales UI recovery.

## Checklist
- [x] Context/provenance/ownership preflight; preserve dirty target baseline.
- [x] RED contract reproduction and Diagnose evidence.
- [x] A: narrow schema and exact SQL recovery.
- [x] B: canonical source backend/test recovery.
- [x] C: contract/affected/financial/geography regressions, offline generation, full tsc.
- [x] Source stability check, handoff and review lock.
- [x] Independent bounded backend ACCEPT (#6942); parent-authorized docs-only finalization and lock release.
- [x] Current candidate review on HEAD `cc0cabb461ac42a1d55f08fb3b4965741654cd6c`: unrelated Article/stock schema cluster removed, Presupuesto relations closed, migration bytes unchanged, static migration contract green, lock released.

## Diagnose evidence
- Reproduce: offline producer-consumer test, 4/4 RED before backend edits. Canonical rates returned `200` instead of `206.91`; canonical create export absent; missing branch accepted.
- Scope/evidence: clean legacy create omitted family/commercial fields; emit never wrote CURRENT; version creation prematurely replaced source. Invoice already requires approved CURRENT and consumes rates. All service callers traced to the five scoped routes/tests.
- Hypothesis: incomplete authority recovery, not an Invoice eligibility bug.
- Minimal fix: exact source service/validator/routes and source unit/static tests; narrow schema declaration merge; never infer rates or repair rows.
- Initial Validate: 18/18 focused tests GREEN. Exact service/validator/unit/static test and SQL hashes equal original. Offline Prisma 7.8 format/generate succeeded.
- Typecheck Diagnose: one new test-only TS2737 (`1n`, target below ES2020). Fix only fixture to `BigInt(1)`, preserving value and application config; rerun full tsc and regressions.
- Final Validate/Regression: full tsc 0 diagnostics; 111/111 tests in 19 files; focused ESLint 0 errors/2 unused fixture-destructure warnings; diff-check passes. All 13 source hashes rechecked unchanged. Five routes have no source content diff (target retains mixed/CRLF line endings); service/validator/source tests and SQL are exact-byte matches.
- Handoff: bounded backend phase accepted by `condemned-yellow-lobster` / #6942; no introduced blockers. Independent 46/46 tests in five files, full tsc 0/diff-check pass, 13 source hashes and HEAD unchanged; 111-suite not wholly rerun. Lock released. Final continuation edits own docs/worklog only, with no source/schema/env/test changes or test reruns. Build remains deferred to parent guarded runner; no browser/DB/runtime certification. Active catalog audit/UI exploration not duplicated; runtime gates preserved pending their results.
