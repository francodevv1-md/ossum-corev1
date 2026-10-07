# Comprobantes remaining printing — validation

## Results
- **64/64 tests PASS** across6files:22new printing tests,15existing PDF tests,27existing panel/parent tests. One obsolete PR-print-disabled assertion was updated to enabled; PDF/Modify checks retained.
- **Scoped TypeScript PASS** (noEmit/no incremental).
- **Isolated minified Vite bundle PASS** using prior synthetic fixture, output in approved OpenCode temp directory. Not a full Next application build.
- **Dev and production-bundle browser PASS**:20type/viewport combinations per replay (PR/FV/CO/NR ×1366×768,1600×900,1920×1080,2560×1440,390×844). Actual popup/document generation, authenticated synthetic GET, native `print()` invocation intercepted, opener detached, no executable script elements, no viewport overflow,44px mobile print/menu-trigger targets. PDF availability and Modify unchanged.
- **Negative browser paths PASS**:403HTTP, wrong returned company, blocked popup, late GET after reload. Unit tests additionally cover wrong id/surgery, indirect link removal, malformed scope in invoice list,501st invoice link, repeated clicks, closed popup, scope change/unmount and retry.
- **A4 Chromium output/parser review PASS**: actual rendered invoice page reviewed with saved totals/saldo, nonfiscal label and escaped injected item text;100budget items present across9pages with repeated table headings and final totals/observations. Screen screenshots of budget/receipt and mobile panel inspected; total receipt100ARS distinct from10ARS allocated to this surgery.
- **Independent directed read-only review PASS**, no evidenced blockers. Reviewer did not independently rerun tests/browser.
- **Existing real remito PDF browser replay PASS** against latest production fixture: actual WASM download/signature/URL cleanup/scope/reload/mobile checks retained after print extension.
- **Scoped diff whitespace check PASS**. Full-worktree diff check reports pre-existing foreign trailing whitespace in `src/components/contactos/ContactLookupField.tsx:138`; not part of this task and not modified.

## Authority and boundaries
- Every test/browser API request terminates in synthetic data; no DB/Auth/fiscal/backend mutations. Detail GET uses incumbent `apiFetch` with `cache: no-store`; payment links resolve using existing scoped invoice pagination.
- No financial recalculation. Stored item/subtotal/discount/tax/total, invoice paidTotal/balance, and payment amount/imputation values rendered as returned. Payment print intentionally lists only current-surgery allocations, not full-company receipt allocations, and labels that distinction explicitly.
- No invented company legal data, CUIT, CAE, recipient or items. Generic document viewer contains mock fiscal/company/item data and was not used. Known active company/public surgery labels are optional context; missing values stay explicit.
- Other documents' direct PDF downloads remain disabled. Browser “Save as PDF” may exist in the native print dialog, but this task adds no direct PDF feature.
- Native OS print dialog acceptance/physical printer and live authenticated DEV acceptance **not verified**. Full app Next build/global TypeScript **not certified**; isolated scoped gates do not certify unrelated modules.
- Screenshot/PDF/bundle artifacts are temporary, not committed. No Git commit/push requested or performed.

## Diagnose records
| Reproduce / Scope / Evidence | Hypothesis / Minimal fix | Validate / Regression |
| --- | --- | --- |
| First62-test run failed old PR disabled assertion and new CO escaping fixture. Actual menu showed enabled Imprimir, as requested; CO fixture contained no script but assertion required escaped script. | Obsolete expectation + incomplete test input, not product bugs. Update only approved PR-print assertion; put unsafe text in CO notes to genuinely exercise escaping. |64/64tests PASS; all disabled PDF/Modify assertions retained. |
| Cold dev browser navigation timed out waiting for networkidle; server was healthy, fixture readiness was not asserted separately. | Dev network settling is not a readiness contract. Wait for DOMContentLoaded then exact ready action button. |Full dev and emitted production replay PASS. No product timeout workaround. |
| Initial44px assertion measured during existing menu pop animation; later computed min-height44px and transformnone confirmed correct final size. | Transient inherited transform distorted QA measurement. Await menu animation promises before geometry checks. |All four mobile actions44px PASS; no animation/product behavior changed. |
| Trigger role lookup timed out with modal Radix menu open; menu hides background from accessibility tree. | Correct Radix modal behavior, invalid QA query. Measure known underlying trigger by exact aria-label CSS selector; keep role query for visible print item. |Mobile geometry and actual menu clicks PASS. No accessibility workaround in product. |

## Replay
```powershell
node_modules/.bin/vitest.cmd run src/__tests__/components/ComprobantesPrint.test.tsx src/__tests__/components/RemitoPdfDownload.test.tsx src/__tests__/components/ComprobantesAsociados.http.test.tsx src/__tests__/components/ComercialTabContent.test.tsx src/__tests__/components/ComercialTabAutorizar.test.tsx src/__tests__/components/ExpedienteFullView.test.tsx
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/COMPROBANTES-PRINT-REST-20261007/tsconfig.json --noEmit --incremental false
```
Use only owned isolated synthetic fixture on free port5187 (never restart shared servers):
```powershell
node node_modules/vite/bin/vite.js --config knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/qa/vite.config.mjs
node knowledge/specs/COMPROBANTES-PRINT-REST-20261007/qa/browser.mjs
```
For production replay, build the same fixture to `%LOCALAPPDATA%/Temp/opencode/comprobantes-print-rest-bundle`, preview on5197, and run browser script with `QA_URL=http://127.0.0.1:5197/`. Outputs live under `%LOCALAPPDATA%/Temp/opencode/comprobantes-print-rest`. `page.pdf()` is QA-only native Chromium output; it does not enable product PDF downloads.
