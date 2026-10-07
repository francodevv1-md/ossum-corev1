# Validation

## Diagnose
- Reproduce: before edits, exact panel HTTP + parent suite failed **12/12**. Parent still rendered retired cards; old panel consumed legacy fixtures and failed at `date.localeCompare` without a backend request.
- Scope: only shared Comprobantes panel/parent, read hook, presentation/detail adapters and focused tests. Both Ficha CX and coordinator modal consume the same repaired component; no parent/core refactor required.
- Evidence: `useCirugiaSelection.ts:23–24,37–39` supplies store projections; old panel never imported the existing backend hook. Prior handoffs described a different source state. No evidence proves who changed it or when. Current panel/parent were initially clean versus HEAD.
- Hypothesis: current renderer had returned to local authority while the scoped hook and tests survived untracked. This explains the reproduced regression; earlier handoffs alone were not validation.
- Minimal fix: reuse authenticated read clients, preserve parent signature, remove local authority, open loaded rows; include existing remito/payment read contracts. No API/schema/Auth/dependency changes.
- Validate/regression: final evidence below.

## Final checks
| Check | Result |
| --- | --- |
| Exact Vitest panel HTTP + parent + mounted parent + full view | **27/27 PASS**, 4 files, after final motion-pill edit |
| Scoped TypeScript, source/tests plus actual test setup | **PASS**, no emit or incremental output |
| Browser synthetic fixture: 1440px desktop, 390px and 320px mobile | **PASS**, no document overflow |
| Real panel detail, type filters, disabled action labels | **PASS** |
| Reduced motion, dark mode, no page errors | **PASS** |
| Isolated component Vite build | **PASS**, 2125 modules; not a full Next build |
| Independent directed static review | **PASS**, previous obsolete-test blocker resolved; no remaining blockers |
| Targeted diff whitespace | **PASS**, line-ending warnings only |

Replay tests:
```powershell
node_modules/.bin/vitest.cmd run src/__tests__/components/ComprobantesAsociados.http.test.tsx src/__tests__/components/ComercialTabContent.test.tsx src/__tests__/components/ComercialTabAutorizar.test.tsx src/__tests__/components/ExpedienteFullView.test.tsx
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/tsconfig.scope.json --noEmit --incremental false
```

Visual replay (isolated source panel, synthetic Auth/data only; never imports into product):
```powershell
node node_modules/vite/bin/vite.js --config knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/qa/vite.config.mjs
node knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/qa/browser.mjs
```
- Separate port **5187**; shared DEV5000/.next not touched.
- Screenshots in approved temporary folder `comprobantes-visual-20261006`: desktop, detail, mobile-390, mobile-320, dark. Screenshots wait for animations to finish.
- Component build output in approved temporary folder `comprobantes-qa-build-20261006`; no output committed.
- Browser fixture intercepts every API request and has no backend/DB access. Browser results **do not certify live persistence**.

## Non-task failures / limits
- Original unrestricted TypeScript failed with default 4GB heap OOM, then 8GB run timed out at 240 seconds. No product workaround.
- Application-source-only TypeScript completed and reported unrelated errors in existing intake/authorization/Cajas/Compras/billing-gate source/tests, including foreign modified NewSurgeryDialog and untracked leftovers. These were not changed. No global TypeScript or full Next build pass claimed.
- Test-only Diagnose: a reload fixture reused one consumed `Response` for four clients; fixed fixture by cloning. Large 1002-row mock pagination tests get an explicit 20-second local ceiling; no global timeout/config changes.
- Vite-only Diagnose: Next-style PostCSS config did not load in isolated harness; harness now supplies the installed Tailwind plugin instance. Product config untouched.
- Visual Diagnose: final screenshot inspection found the parent heading retained a light-only slate text class. Added explicit dark title/icon/border and register foreground; browser replay now waits for theme transitions and asserts heading color before screenshot.
- No production data, DB commands, issuance, payment registration, fiscalization, push/PR/deploy.

## Connection contract for future agents
1. `comercial` remains the internal tab key; visible label is Comprobantes.
2. Active company + **surgery.backendId** are required. Never use visible CX IDs or compatibility props to query/fill missing records.
3. Budget/invoice/remito pages use surgeryId. Payment API filters only direct surgeryId: read company payment pages, reject unexpected companies, retain direct association OR linked invoice imputations.
4. All four reads must complete successfully; otherwise show error/reload, not a partial list presented as complete. Paginate every endpoint.
5. Snapshots include company/surgery/reload revision; old responses and already-open details cannot survive scope changes. No animated exit of stale rows.
6. Budgets/remittances/payments are not invoice debt. Invoice balances come from backend, zero remains zero, currencies stay distinct. Payment amount is receipt total; detail shows only imputations to this CX's invoices.
7. Open means actual loaded detail. PDF/print/edit are **explicitly unavailable** here until a real document-specific integration is tested. Do not reuse fake DocumentViewerDialog data/download toast or mutate via FiscalEvidenceDialog in this read-only register.
8. Run the exact four-file suite after edits; unchanged test hashes do not validate changed consumers.
