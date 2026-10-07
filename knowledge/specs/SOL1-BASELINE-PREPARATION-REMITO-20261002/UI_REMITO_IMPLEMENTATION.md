# Remito emission callers — source-ready handoff

## Done
- Bounded implementation complete in `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`; runtime validation pending orchestrator. Overall package remains PARTIAL.
- Read AGENTS.md, UI_TASK_BRIEF.md, UI_REMITO_LOCK.md and DB_TESTS_BLOCKED.md. Coordination lock explicitly excludes Sol scope; owned existing source/helper/test clean at read-only Git preflight.
- Own lock moved reserved → editing before source writes, released after static review and test authoring.

## Changed
- Both active emission callers use `buildCajasRemitoEmissionIntent` in the existing helper. Persisted `metadata.cajas.assignmentId` wins over active surgery lookup. Loaded assignment ID/company/surgery must match backend context; visible CX/R numbers are never command identifiers.
- Invalid explicit linkage, missing selected assignment detail/preparation/items, ambiguous line association, mismatched trace or omitted required preparation lot/serial stop before emission. Only confirmed no-assignment legacy documents retain generic emission.
- Existing pure nullable dispatch builder, including explicit preparation-line association and trace checks, unchanged. Emission wrapper validates the existing dispatch request schema and rejects duplicate preparation references. Accounting builder and consumption/return lookup behavior unchanged.
- Emission command gets one `dispatch-<UUID>` identity when constructed. Identical context retry retains the exact payload/key/observed version across 409/network failures; no automatic latest-assignment reload or conflict recovery. Explicit document reload, edits/accepted save, changed backend row or changed read context invalidate the cached command.
- Workspace generation and draft/read-context checks run before mutation; logistics protects company/backend surgery/document/freshness/unmount changes and rejects stale captured callbacks. Scoped pending refs prevent overlapping commands.
- Failure keeps workspace input/recovery and reports error; accepted response is required before success/navigation. Logistics continues using real `useRemitos.emit`; its existing read-refresh error handling does not relabel accepted emission as rejected.
- Existing workspace test assertion aligned only with optional third `undefined` argument; success-navigation assertion retained.

## Files
- `src/lib/cajas-intent.ts` — bounded emission construction; active-selection null/mismatched detail rejection.
- `src/components/remitos/OperationalRemitoWorkspace.tsx` — guarded cached emission and explicit reload invalidation.
- `src/components/expediente/LogisticaTabContent.tsx` — same helper, raw backend row requirement, scoped retry/context refs.
- `src/__tests__/components/RemitoCajasEmission.http.test.tsx` — new actual-client/apiFetch mocked-fetch boundary tests.
- `src/__tests__/components/LogisticaCajasEmission.http.test.tsx` — new actual useRemitos/client/apiFetch mocked-fetch tests, presentational children and trace hook mocked.
- `src/__tests__/components/OperationalRemitoWorkspace.test.tsx` — one mechanical fixture assertion only.
- `knowledge/specs/SOL1-BASELINE-PREPARATION-REMITO-20261002/UI_REMITO_LOCK.md` and this handoff — exact ownership/status/evidence.

## Validations
- Read-only Git status, targeted diff and `git diff --check` — passed; Git emitted line-ending notices, no whitespace errors.
- Source trace: both emission callers and all imports of cajas-intent inspected. Other production callers are ConsumoPanel/DevolucionesPanel accounting; no writes there.
- New boundary coverage authored: exact POST body/key/version/backend item/preparation IDs/quantity; explicit marker precedence; backend versus visible surgery; null/unavailable/ambiguous linkage; lot/serial missing/mismatch; no success/navigation on rejection; recovery retained; byte-identical uncertain retries without new assignment reads; accepted edit/reload invalidation; stale company/document/surgery/read context cancellation; duplicate pending command; accepted write plus failed read refresh; confirmed unlinked legacy path.
- New files import no services, Prisma, dotenv or DB code. Real Remito/Cajas clients and apiFetch are retained, auth token accessor and global fetch are mocked. Pure cajas dispatch schema reused; Remito validator's service reexports are not runtime-imported.
- Tests/TypeScript/build/browser/Node/npm/scripts/DB — **not run**, explicitly forbidden for this writer. Orchestrator alone inspects and executes allowlisted checks.
- Diagnose for pre-existing fixture failure:
  - Reproduce: orchestrator supplied offline baseline: 86 passed / 1 failed across five explicit suites; existing workspace line136 expected two API args, received three including undefined.
  - Scope/Evidence: old emitter and useRemitos/client contract support optional emission payload; legacy no-intent caller explicitly supplies undefined.
  - Hypothesis: mechanical mock call-shape mismatch, not emission-success regression.
  - Minimal Fix: expected arguments now company/document/undefined; navigation assertion unchanged.
  - Validate/Regression Check: static assertion/source review complete; execution deferred to orchestrator, no pass claimed.

## Risks
- Source-ready does not mean tests passed; mocks do not establish real DB/browser journey acceptance.
- DB_TESTS_BLOCKED remains fully in force. No DB access, forensic work, integration reruns, cleanup or configuration changes performed.
- Retry cache is scoped to the mounted UI session; explicit context changes create new commands. Backend remains final authority for reservations/control/version/domain acceptance.
- No out-of-scope writes, dependency installation or Git mutation.

## Next
- Orchestrator inspect and execute only the two exact new component test paths above plus the existing workspace regression, using its approved offline runner. Apply Diagnose to concrete failures before bounded corrections.
- Keep DB-backed integration files excluded. Independent read-only review and package UI validation remain orchestrator-owned.
