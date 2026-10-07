# UI caller QA — explicit offline scope

## Scope and runner
- User authorizes preparation/emission UI integration with no DB. Incident containment is not reopened.
- Antigravity current coordination lock reviewed; exact Sol UI/helper targets excluded from its editing scope. Reserved Coordination/states/Stock host/services/schema/Movimientos remain untouched.
- Only orchestrator executes tests. Source writers have no test/Node/npm/script execution authority.
- External `sol1-ui-offline-vitest.cjs` accepts only the eight exact paths below, strips DB/provider/secret variables from test children, and preloads a real TCP/HTTP/fetch prohibition. HTTP-boundary tests must install explicit fetch mocks. No application config or permissions changed.

## Inspected existing test allowlist
Fully read before execution, including mocks/hooks and relevant imports:
1. src/__tests__/components/OperationalRemitoWorkspace.test.tsx — component mocks, synthetic auth context, local sessionStorage recovery; no live fixture.
2. src/__tests__/unit/remito-workspace-draft-recovery.test.ts — browser-memory storage only.
3. src/__tests__/unit/logistica-canonical-quantities.test.ts — pure mapping assertions; no render/API writes.
4. src/__tests__/unit/cajas-ui-intent-wiring.test.ts — complete664lines inspected; Prisma.Decimal data class, injected fake persistence objects and API spies; no DB constructor/config/seed execution.
5. src/__tests__/unit/cajas-preparation-contract.test.ts — all Prisma/services/auth/client routes explicitly mocked;30contract assertions.

New files below are allowlisted but MUST be fully inspected after authoring before any execution:
6. src/__tests__/components/CajasPreparation.http.test.tsx
7. src/__tests__/components/RemitoCajasEmission.http.test.tsx
8. src/__tests__/components/LogisticaCajasEmission.http.test.tsx

No integration path, generic suite/filter, DB script or cleanup may run. Runner rejects arbitrary path/argument selections.

## Baseline reproduction and Diagnose
Command: `node <external-offline-runner> <exact paths1–5 above>`; no wildcard selection.

- First attempt: preload MODULE_NOT_FOUND before test loading. Windows backslashes in NODE_OPTIONS require path were consumed as escapes. Scope external invocation only; evidence stripped path in error. Minimal fix use forwardslashes for preload path; no app source/config change.
- Second attempt completed:5files,86passed/1failed. Node localstorage warning remains.
- Existing OperationalRemitoWorkspace.test.tsx:136 expected emit(company,id), actual emit(company,id,undefined). Scope assertion shape, not emission rules. Source already uses the optional dispatch argument; no success/navigation assertion weakening allowed. Emission owner receives this exact reproduction for minimal fixture alignment.
- Nonincremental baseline TypeScript (`node node_modules/typescript/bin/tsc --noEmit --incremental false`) completed successfully; no typegen/build.

## Acceptance pending
New mocked HTTP tests/focused regressions and final TypeScript/source review will be recorded after implementation. Real preparation→issuedRemito persisted quantities/reservations/traces, live UI/browser and exclusive build remain unaccepted. Status PARTIAL; no mock suite can lift DB_TESTS_BLOCKED.md.

## Final executed evidence
- All three new files fully inspected before execution: real clients/apiFetch with explicit global fetch and auth accessor mocks; no services/Prisma/dotenv/database imports. Presentational dialog/panel/trace/surgery-adapter mocks are documented, not live UI acceptance.
- Narrow emission checks: exact new Remito/Logistica HTTP files plus existing OperationalRemitoWorkspace component suite:63/63 passed.
- Narrow preparation checks: exact CajasPreparation.http.test.tsx:23/23 passed.
- Final full approved eight-file allowlist (paths1–8 above, explicitly enumerated):8files,153/153 passed; no integration paths or skipped tests. Counts overlap narrow checks; do not sum them as distinct tests.
- Nonincremental final TypeScript and git diff whitespace check completed successfully. Existing Node localstorage warning and Git line-ending notices remain; no clean-console claim.
- Independent read-only reviewer religious-blush-kiwi: no introduced correctness blocker. Orchestrator independently matched all eight reviewed hashes; existing Cajas transport hash unchanged. Git index remains empty.
- Both source writers released locks before QA; delegations later timed out after source/handoff authoring. Main recovered artifacts and actually executed all checks; authoring documents do not claim unperformed writer tests.
- No DB connection/config loading, integration/DB scripts/cleanup, incident investigation, browser/build/server restart, Auth/permissions/schema/dependency/Git mutation in this UI continuation. Build has no exclusive window and is deferred, not a source-delivery blocker.
- Overall PARTIAL: offline UI contract integration accepted; real persisted journey/live browser/build acceptance still pending under existing DB gate.
