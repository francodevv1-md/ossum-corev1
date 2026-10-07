# Sol 1 validation — bounded evidence, not READY

Workspace: `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`; HEAD `73e3e1b` with documentation predecessor `2d8d617`. Commands below ran in this worktree, without DB/browser/build operations.

## Baseline before correction
- `npx tsc --noEmit --incremental false`: exit 0. No typegen/shared `.next` rewrite. Historical non-green TypeScript evidence remains historical; no document is retroactively relabeled.
- `git diff --check`: exit 0; LF/CRLF conversion warnings on existing foreign files, not failures.
- Independent baseline audit: all 19 certified source/test Git blobs match isolation MANIFEST; historical working-tree SHA256 evidence is a different explicitly documented snapshot.

## Executed focused commands
All paths below are under `src/__tests__/`; each row is one `npx vitest run` invocation with the listed paths.

| Suites | Result |
| --- | --- |
| components/PresupuestoConnectedForm.test.tsx; unit/presupuesto-api-routes.test.ts; unit/presupuesto-concurrency.test.ts; unit/presupuesto-connected-journey-e2e.test.ts; unit/presupuesto-mvp-closure.test.ts; unit/presupuesto-service.test.ts; unit/invoice-service.test.ts; components/DocumentacionPanel.backend.test.tsx | 8 files, 101 passed |
| unit/surgery-preparation.service.test.ts; unit/surgery-preparation-route.test.ts; unit/surgery-preparation-client.test.ts; unit/remito-service.test.ts; unit/remito-route.test.ts; unit/remito-workspace-draft-recovery.test.ts | 6 files, 41 passed |
| unit/cajas-preparation-recovery.test.ts; unit/cajas-prep-correctness.test.ts; unit/remitos-022.test.ts; unit/remito-devolucion-route.test.ts | 4 files, 35 passed, 10 skipped |
| unit/cajas-dispatch-owner.test.ts | 1 file, 15 passed |
| unit/cajas-ui-intent-wiring.test.ts; unit/consumo-service.test.ts; unit/devolucion-service.test.ts | 3 files, 83 passed |
| unit/cajas-nested-trace.test.ts; unit/logistica-canonical-quantities.test.ts; unit/receipt-service.test.ts; unit/orden-compra-service.test.ts; unit/orden-compra-validators.test.ts | 5 files, 16 passed |

Total before baseline corrections: 27 suite executions, 291 passing tests, 10 skipped. These are focused unit/component regressions; none proves a live persisted end-to-end case. Existing Node localstorage-file warnings remain; no clean-console claim.

## Pending/not run
- Baseline correction reruns are recorded separately in BASELINE.md; final independent review in REVIEW.md.
- Actual PostgreSQL preparation/owner-dispatch proof: not run; unresolved Cajas ownership hold and current target/schema/cleanup prerequisites. Skipped tests are not accepted DB evidence.
- Browser journey: not run; no CORE_FLOW_STORAGE_STATE/preflight-confirmed auth supplied. Port 5000 reachability only was checked. No browser timer/session started.
- Production build/typegen: not run; exclusive shared-output window not established. No foreign server restarted.
- No schema/migration/generate/dependency, Auth/permissions, fiscal operation, Git index/commit, deploy or real-data mutation.

Overall status: PARTIAL / BLOCKED for requested persistent Preparation → Remito acceptance; not READY.

Continuation after Franco's `dale metele`: exact Cajas API/client/test ownership reconciled; implementation and focused verification proceed under PHASE_B_LOCK.md. The previous block is lifted for that source scope only. Persistent-case, browser and exclusive-build gates still require their own evidence; this continuation does not turn historical/mock results into READY.

## Post-correction static preservation check
Orchestrator `git hash-object` independently confirmed the four owned fixtures now match the certified MANIFEST Git blobs exactly:
- integration/presupuestos-api.test.ts: `a1e1853a2b646265b30a4cde6b7e0bf40d8a37ad`
- unit/presupuesto-concurrency.test.ts: `838ceaca0eeeb125056d87bb8bdc8772cbe32918`
- unit/presupuesto-connected-journey-e2e.test.ts: `30c3b763656647b2f89f4ab6e87b5b385f15f617`
- unit/presupuesto-service.test.ts: `7ed77d6db564633c29b46b4f6d22e29a1132df68`

Consequently those four files no longer show a residual diff against HEAD, despite having changed from the initial working tree. This was a hunk-only fixture correction, not Git restore/staging. `git diff --check` still passes and the Git index remains empty. Source presupuesto/invoice and foreign diffs remain outside write ownership.

Post-correction orchestrator rerun `npx tsc --noEmit --incremental false`: exit 0. Independent read-only fixture reviewer `ultimate-bronze-rabbit` found no correctness blocker; checked revision-bearing requests, all Date/Decimal clones and restored exact SQL/no-update assertions. No whole-tree byte-preservation certification is inferred from current residual diffs alone.

Baseline owner after each change: 22 / 10 / 1 / 9 passing tests respectively; final combined five-suite regression: 42/42 passed. Owner nonincremental TypeScript passed after retrying an initial timeout; orchestrator post-correction TypeScript separately passed. These reruns overlap earlier suites and must not be added to 291 as distinct test cases. Integration DB hooks were not executed. Baseline lock released.

## Current PostgreSQL prerequisite audit
Read-only prerequisite reviewer `inevitable-peach-wolf` verified unchanged existing preparation proof/service hashes against NESTED/DISPATCH records. Current schema Git blob matches the released snapshot, but this does not certify current DB/client alignment.

Prior explicit disposable-target confirmation is reusable only after secure verification of the same effective allowlisted target; do not routinely ask again whether DEV is disposable. Process environment can override dotenv files. No connection identity or schema check was executed by this read-only audit.

Remaining live gates: coordinated exclusive DB executor/window lifting the residual DB hold; verified effective target/current schema/generated client; permission and ability to create/delete only current synthetic fixtures; uninterrupted execution/cleanup budget and exact fixture-ID capture. Old leftovers are excluded. Shared numbering table locks can still contend across synthetic tenants.

Orchestrator ran only the pure gate with OSSUM_RUN_CAJAS_DEV_INTEGRATION temporarily cleared and restored:
`node node_modules/vitest/vitest.mjs run src/__tests__/integration/cajas-preparation-postgres.test.ts`
Result: one gate test passed, five real PostgreSQL tests skipped. DB imports/setup/mutations did not run. This is NOT persistent acceptance.

The existing partial owner-dispatch case prepares one unit and dispatches 0.5, checks ledger/reservation/pending remainder 0.5 and exact replay. It can run independently of API changes after prerequisites pass; it does not certify partial preparation or reachable UI. Prefer that single real scenario first under an adequate window, then full scenarios only with sufficient cleanup budget. Full suite creates seven synthetic tenants; internal afterAll budget may be narrower than combined per-tenant cleanup allowances. Never prefix-delete, reset or disable guards.

Continuation orchestrator combined `npx tsc --noEmit --incremental false; if ($?) { git diff --check }` reached the conditional Git check (no TypeScript diagnostics), but the outer tool timed out at 120 seconds during the combined invocation. This is not certified successful completion of the entire combined command. Final separate typecheck/diff evidence is required; no speculative source fix applied for an execution-budget timeout.

Diagnose for the execution timeout: reproduce above; scope tool budget for a combined read-only check; evidence conditional Git output after TypeScript and no diagnostics; hypothesis insufficient outer budget rather than a proven source defect; minimal correction separate commands with adequate budget, no code edit. Separate `git diff --check` (60-second budget) and `npx tsc --noEmit --incremental false` (300-second budget) both completed successfully. Final implementation-owner results and independent source review remain separate evidence.

## Released bounded transport patch
- Writer's final unit-only run completed normally: 16 suites,184 passing tests,10 skipped; includes30 new contract tests. Exact command in IMPLEMENTATION.md; existing suites overlap historical counts.
- Writer typecheck/scoped diff passed; orchestrator separate checks also passed. Final six Git blobs match independent source review and writer release manifest; index remains empty.
- Protected validators/services unchanged by this patch. UI callers remain incomplete; no browser/build/actual Cajas persisted acceptance.
- Implementation delegation ultimately timed out after writing final evidence/release; no final delegation response was produced. Validation claims above are attributed to written evidence, not an absent final response.

## Unauthorized DB regression incident — acceptance halted
- At09:59:40 local (12:59:40UTC), writer mistakenly included `src/__tests__/integration/remitos-api.test.ts` despite explicit no-DB scope. It unconditionally loads configuration internally and connects real Prisma. No target verification preceded this execution.
- Reported beforeAll cleanup/seed completed; synthetic organization/company/branch/user/access/contact/link/surgery fixtures were created. Remito POST failed403 instead of201. afterAll cleanup/disconnect reported no hook failure; residual absence is NOT independently verified.
- Read-only source audit confirms runtime `it-remito-${Date.now()}` fixture prefix and cleanup targeting the runtime company/exact actor/organization plus runtime-prefix contacts. Exact runtime IDs were not durably captured. No blanket prefix deletion or further cleanup/query/retry is permitted.
- This violated scope, does not validate Cajas persistence, and must be disclosed. Subsequent runs excluded integration and used unit-only allowlists. No Auth/permission workaround or source security change made.
- All additional DB work stopped. Next prerequisite is explicit authorization for read-only target/fixture-impact audit; any corrective mutation would require its own exact approval.
