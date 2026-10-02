# Validation evidence

## Execution boundary
- Workspace E:/OSSUM_COR_ANTIGRAVITY/ux-ui; branch ux/antigravity-redesign.
- Initial HEAD 8d8626a95bbe7524dab74fe50b801039750c3799.
- No live DB operation, Auth modification, server restart, build, commit or dependency change.
- Other owners' pre-existing dirty files and active locks preserved. Shared .next validation output not reserved.

## Commands executed
- Baseline: `npx vitest run src/__tests__/unit/documentation-validator.test.ts src/__tests__/unit/documentation-service.test.ts src/__tests__/unit/documentation-route.test.ts` → 3 files / 31 passed.
- Focused: `npx vitest run src/__tests__/components/DocumentacionPanel.backend.test.tsx src/__tests__/unit/documentation-validator.test.ts src/__tests__/unit/documentation-service.test.ts src/__tests__/unit/documentation-route.test.ts` → 4 files / 55 passed (24 panel HTTP-boundary tests + 31 backend unit regressions).
- `npx tsc --noEmit --incremental false` → fails globally, six diagnostics in forbidden files: Surgery missing (four) and nullable ConsumoState (one) in src/app/cirugias/page.tsx; InputJsonValue/JsonValue mismatch in src/lib/services/presupuesto.service.ts:914. No documentation diagnostics. No type generation or shared output written. Concurrent owner's code may change these locations; this is point-in-time evidence, not attribution.
- Final repeat of `npx tsc --noEmit --incremental false` → no diagnostics after concurrent work changed the global snapshot. This task did not fix the above files. Build remains unexecuted; a clean TypeScript run is not a build pass.
- Scoped ESLint initially rejected mount effect helper (react-hooks/set-state-in-effect); Diagnose recorded separately. Final result recorded in HANDOFF.md.
- Final scoped `npx eslint src/components/expediente/DocumentacionPanel.tsx src/hooks/useSurgeryDocumentation.ts src/lib/api/documentation.ts src/__tests__/components/DocumentacionPanel.backend.test.tsx` → passes, no diagnostics/suppressions.
- Scoped `git diff --check -- src/components/expediente/DocumentacionPanel.tsx src/lib/api/documentation.ts src/hooks/useSurgeryDocumentation.ts src/__tests__/components/DocumentacionPanel.backend.test.tsx knowledge/specs/DOCUMENTATION-CHECKLIST-BACKEND-UI-DEV-001` → no whitespace errors in tracked owned diff. New files validated by lint/tests separately.
- Global `git diff --check` → trailing blank lines in concurrent src/app/api/companies/[companyId]/presupuestos/route.ts:95 and src/lib/validators/presupuesto.ts:162. No edits to those files.

## What tests prove
Tests render the real panel, hook, client and shared apiFetch, mock only HTTP/auth context/token lookup/toast, and use the actual server view shape. A store mock throws if local checklist authority is accessed. They cover read/absent/empty/error, explicit bodyless initialization, canonical four-state controls, CAS payload, accepted observation/refetch/remount, network/server/conflict drafts, explicit conflict refresh, forbidden transition after refresh, stale company/surgery reads and writes, duplicate submission, backend required-only aggregate, read-only roles and revoked permission, missing technical identity and unsupported actions.

## What is NOT proven
- HTTP fixtures do not prove real database persistence or real delivery; existing service/route tests mock DB/service boundaries.
- Authenticated browser acceptance NOT executed: CORE_FLOW_STORAGE_STATE and PLAYWRIGHT_STORAGE_STATE absent. No unattended login or fabricated state.
- DB integration NOT executed: no newly confirmed disposable DEV database/synthetic data approval for this execution. Existing integration suite writes fixtures and must remain gated.
- Build/typegen deferred: shared .next ownership not coordinated while Presupuestos is active; no interference with its validation.
- Responsive/keyboard behavior uses native buttons/labelled dialog/flex wrapping; real browser visual and keyboard acceptance remains unexecuted.

## Recovery
Confirm the actual connected DB is disposable DEV for this execution and provide a synthetic persisted surgery plus existing authorized contexts. Perform one manual headed login, save temporary storageState outside Git, expose CORE_FLOW_STORAGE_STATE and pass authenticated preflight. Then run the bounded read → initialize → received → approved → observed → reopen/refresh journey and controlled stale-update conflict within a 20-minute browser budget. Do not change Auth or permissions. Coordinate a separate build window with the Presupuestos owner.

## Follow-up confirmation
- Franco explicitly confirmed `la dev es descartable` for this execution. Disposable DEV approval prerequisite is now satisfied; historical statements above describe the earlier validation window.
- Fresh environment check: branch ux/antigravity-redesign; CORE_FLOW_STORAGE_STATE and PLAYWRIGHT_STORAGE_STATE absent; no listener found on ports 3000/3001. No DB mutation or browser test performed by this follow-up. Need the running DEV URL and fresh manual login; synthetic data/existing authorized contexts still required for acceptance.
- Subsequent follow-up: Franco supplied port 5000. Real application-authenticated acceptance executed in the same Chromium context, temporary state saved outside Git, browser closed within budget. Initialization, actual CAS transitions, observation after reload, genuine backend conflict and explicit draft-preserving recovery all verified. Detailed evidence and remaining build/live-context gaps in RUNTIME_ACCEPTANCE.md; earlier missing-DB/browser status is historical.
