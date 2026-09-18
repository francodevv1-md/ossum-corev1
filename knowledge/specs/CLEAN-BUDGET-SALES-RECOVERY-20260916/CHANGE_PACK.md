# Sales authority recovery — Phase 2

- Task: `CLEAN-BUDGET-SALES-RECOVERY-20260916`; sole SDD apply executor, `openai/gpt-6-astra`; implementation/testing/docs. T3 bounded recovery, explicitly assigned by parent after Phase 1 ACCEPT #6942 and released lock.
- Authority: original `PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001/SPEC.md` and `DESIGN.md`, restricted to Sales by this assignment. Original filesystem is read-only; see SOURCE_BASELINE.md.
- Delivery: internal auto-chain client/catalog -> isolated form/page -> offline checks. Accepted narrow `size:exception` for coherent recovery. No commits or PRs. Standard test mode (no strict_tdd config).
- Production allowlist: `src/lib/api/presupuestos.ts`, `src/hooks/usePresupuestos.ts`, NEW `src/components/presupuestos/SalesPresupuestoFormDialog.tsx`, `src/app/ventas/presupuestos/page.tsx`, NEW `src/app/api/companies/[companyId]/branches/route.ts`.
- Tests: `src/__tests__/unit/presupuesto-authority-sales.test.tsx`, `src/__tests__/components/SalesPresupuestos.backend.test.tsx`, `src/__tests__/unit/presupuesto-branches-route.test.ts`; additive financial-client fixture adjustment only if needed. Docs restricted to this directory.
- Forbidden: schema/services/migrations/env/DB writes, Auth or permission changes, dependencies, core Cirugias/store/base types, shared legacy form/hook, original writes, backend mutations, live browser, connected budget integration, commits/PRs.
- Commands: read-only Git/hash checks; env-disabled selected nonDB Vitest, full tsc, focused lint. Build deferred to parent guarded runner.
- Required: preserve pending-invoice fetch signature/eligibility; complete pagination; canonical revision commands; no local authority; real rendered form failure retention, company isolation, catalogs/retry, FIRM/currency/metadata/date preservation, lifecycle/handoff coverage. Source hashes rechecked at close.
- Diagnose evidence before adaptation: original Sales is canonical but imports shared form. Shared form uses store surgery overlays (49–55), discards unit/metadata (70–81), and always builds ARS/ESTIMATIVE/derived validity (adapter 118–145). Target Sales uses local CRUD. Minimal scope-safe fix is isolated Sales form and source-derived client/page, not changing core callers.
- Stop: overlapping writer, source pin drift, scope expansion or unresolved business decision. At finalization bounded live catalog compatibility PASSED; runtime/data/authenticated QA remains separate.

## Tasks
- [x] A: canonical DTO/client/catalog and scope-safe complete hook; exact branch GET.
- [x] B: isolated lossless Sales form; canonical list/detail/actions/history and Pending Invoice navigation.
- [x] C: offline rendered/contract/regression tests, tsc, provenance recheck, handoff to independent review.

## Review Workload Forecast
400-line budget risk: High
Chained PRs recommended: No
Decision needed before apply: No
Resolved: auto-chain internal work units, accepted size:exception; no publication.

## Diagnose — focused validation
- Reproduce: env-disabled focused Vitest passes 22/22; full tsc reports TS2352 in new partial hook fixture, focused ESLint reports three set-state-in-effect errors (catalog reset, tenant reset, external refresh).
- Scope/evidence: only new Phase2 files; production tsc passed before tests. Fixture `slot` inferred as string, partial DTO assertion too weak. Catalog reset is redundant on keyed mount and belongs in explicit retry handler; tenant reset must run before paint, external read effect matches existing source hook pattern.
- Hypothesis: test-only fixture assertion and effect placement/lint documentation, not backend contract defects.
- Minimal fix: explicit partial test cast; move catalog retry reset to event; document narrowly justified synchronization exceptions in hook, retaining source tenant protection.
- Validate/regression: rerun focused suite, full tsc and lint; then Phase1 financial/geo regression set. No architecture/config changes.
- Outcome: 134/134 tests (22 files), tsc 0, lint 0. Empty catalog retries retain form text; backend detail action recheck prevents opening a no-longer-editable draft. Lock review.

## Diagnose — review correction #6953
- Reproduce: permanent rendered page/form test with actual `presupuestoReplaceDraftSchema.safeParse` at mocked PATCH transport; both parameterized cases fail before production fix (cleared fields, trailing/whitespace-only lines). No mocked validator or DB connection.
- Scope/evidence: `split('\n')` preserves editing correctly but sends empty string elements. RED reports `too_small` for both `commercial.firmPrice.*Materials.0` when cleared and five blank elements in trailing-line case.
- Hypothesis: missing submission-boundary normalization, not incorrect backend rule. Schema permits `[]`, trims material strings and rejects blank entries.
- Minimal fix: copy FIRM payload on submission, trim/filter both material arrays; do not mutate hydrated snapshots/draft or normalize per keystroke. Validator and all other production files unchanged.
- Validation: focused RED→GREEN, complete prior 134-check suite plus two regressions, tsc/lint; parent repeats guarded build after correction. Prior build #6954 (56/56 pages, tsc0) predates this fix and is not final-code evidence. Catalog audit remains separate.
- Result: 2/2 focused RED before fix → 2/2 GREEN; final 136/136 tests in same 22 files, full tsc0 and focused lint0. Lock returned to review. No refactor required.

## Final docs-only release
- Parent authorized release after `scattered-coral-weasel` ACCEPT #6962 (independent25/25, including12 rendered; tsc0) and final post-fix guarded build #6964 (56/56 pages,compile7.9s,tsc0,byte snapshots unchanged). Implementation136/136 is distinct evidence.
- #6958 + #6966 complete bounded metadata gate: PASSED, not runtime/data/whole-DB certification or permission to execute migrations. Canonical authority/corrective history checksums match source/destination; baseline20260707173000 newline-only destination debt remains. Exact Phase1 risk qualification recorded in own HANDOFF only.
- Lock released. This finalization edits only own LOCK/HANDOFF/APPLY_PROGRESS/CHANGE_PACK; no source/env/schema/test writes, shell commands, reruns or migrations. Separate manual-login bootstrap starting; no authenticated QA yet.
