# Validation — R1/R2

## Proven bounded outcomes
- R1 **9 failing before source fix → 22 passing** lifecycle tests after corrections.
- Independent review identified a newly introduced canceled-refresh/failing-mutation loading deadlock. **2 failing checks reproduced → fixed → passing**, included in the 22.
- R2 **2 failing / 1 passing before fix → 3 passing** service + select-aware Prisma double + real response serialization contract checks. No real database/HTTP middleware involved.
- Final focused regression command: **133/133 tests across 11 files PASS**; includes existing Remitos service/routes/returns-route, draft recovery/dialog, page/summary, real PDF lifecycle and HTTP-backed Comprobantes listing tests.
- Scoped TypeScript **PASS**; scoped tracked diff whitespace **PASS**.
- No browser QA, servers, DB access, schema/migration/generate, Auth/role policy or dependency operations executed. No commit/push/deploy.

## Do not hide broader failures
- Initial broad probe: **180 pass / 33 fail across 14 files**. 31 Cajas emission failures repeated with committed `HEAD:src/hooks/useRemitos.ts` loaded by a read-only Vitest plugin. **Baseline result 12 pass / 31 fail across 43 cases**; no source reset/restore.
- Workspace test `replaces /remitos after a successful emit` fails because it asserts exactly two arguments while unchanged production passes optional third `undefined`. It does not use the changed hook/service path. Test left untouched.
- `ComprobantesPrint.test.tsx` **22/22 passed in an isolated rerun**, but multi-suite runs show intermittent async/menu errors (1–2 failures). A bounded two-worker replay still failed one popup-blocker assertion. **Not resolved or excluded from risk reporting.** The 133-test green gate does not include this separate 22-case suite.
- Global root `tsc` exceeded90seconds. A source-only config avoiding generated workspace artifacts completed and reported errors in authorization/intake tests, compras/replenishment/billing contracts, NewSurgeryDialog/AiLateralRail and PDF CSS typing. These files remain outside R1/R2 ownership.
- Source-only typecheck also revealed one unsupported `exact` role-query option in this same session's prior Comprobantes test assertion. Changed only that authored assertion to anchored regex; no other foreign test/type errors touched.
- Application-wide build/typing and complete Remitos acceptance **not passed**. Current results cannot justify “the whole application works.”

## Reproduce without browser or database

R1/R2 core:
```powershell
node_modules/.bin/vitest.cmd run src/__tests__/hooks/useRemitos.test.tsx src/__tests__/unit/remito-response-contract.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/remito-devolucion-route.test.ts --maxWorkers=2
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/tsconfig.json --noEmit --incremental false --pretty false
```

Final133-test regression:
```powershell
node_modules/.bin/vitest.cmd run src/__tests__/hooks/useRemitos.test.tsx src/__tests__/unit/remito-response-contract.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/remito-devolucion-route.test.ts src/__tests__/unit/remito-workspace-draft-recovery.test.ts src/__tests__/components/RemitosPage.test.tsx src/__tests__/components/RemitosSummaryCard.backend.test.tsx src/__tests__/components/RemitoDraftDialog.test.tsx src/__tests__/components/RemitoPdfDownload.test.tsx src/__tests__/components/ComprobantesAsociados.http.test.tsx --maxWorkers=2
```

Existing Cajas failures compared without overwriting source:
```powershell
node_modules/.bin/vitest.cmd run --config knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/baseline.config.mjs src/__tests__/components/LogisticaCajasEmission.http.test.tsx src/__tests__/components/RemitoCajasEmission.http.test.tsx --maxWorkers=2
```
The baseline config pins audited Git commit `ec981cfeb189943eb212ddedbd024f090e44676d` and overrides only hook loading in the test process; later changes to HEAD cannot silently change the reference. Original baseline replay used HEAD when it equaled this hash.

Source-wide blockers (diagnostic, not a green gate):
```powershell
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/source-tsconfig.json --noEmit --incremental false --pretty false
```

## Diagnose trail
Reproduce shared read failures → scope five callers/hook → evidence stale requests/identity dependency → minimal lifecycle fix → focused tests → independent reviewer → reproduce loading deadlock → two-line loading correction →22hook/133regressions/scoped TS → re-review. R2 reproduces incomplete selected fields before reusing incumbent full projection. No fixes based solely on speculative findings.
- Final independent source re-review: loading blocker resolved; no remaining blocker in R1/R2 correction. Reviewer did not rerun runtime checks.
