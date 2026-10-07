# Validation — actual remito PDF download

## Results
| Gate | Evidence |
| --- | --- |
| Current-worktree UI/hook regression tests | **42/42 PASS**, 5 files (27 existing + 15 new) |
| Isolated staged-panel tests, excluding foreign design/motion | **42/42 PASS**, same 5 files |
| Scoped TypeScript | **PASS**, no-emit/no-incremental |
| Actual renderer, single/120-item/empty remitos | **PASS**, real application/pdf blobs, %PDF header and %%EOF |
| Tool PDF parser + visual review | **PASS**, selected text includes accented recipient/address/items/returns/observations; all 120 rows present across 4 pages; actual downloaded single-page PDF inspected |
| Real browser download from dev fixture | **PASS**, native download event, Remito-93.pdf, actual WASM output, object URL cleanup, errors/wrong-company/late-reload/retry; 390px download |
| Production Vite bundle + browser replay | **PASS**, actual download via emitted WASM/chunks; same negative checks |
| Next-bundled Webpack asset compatibility | **PASS**, isolated web compilation emits WASM and lazy chunks; minimization disabled in this harness only |
| Directed independent read-only review | **PASS**, no blockers; does not independently rerun tests |

## Evidence boundaries
- All API traffic in these checks is mocked/synthetic. No DB/live records/Auth changes, fiscal issuance, backend mutation, external font service, dependency install or deploy.
- Actual renderer is not mocked in render/browser checks. Unit hook tests mock rendering to exercise state/scope failure paths; these do not alone prove valid PDF bytes.
- WASM asset is approximately 4.1 MB uncompressed, fetched only on first explicit download. Built-in Geist is used; unsupported glyphs fail explicitly instead of silently losing text.
- Full application Next build/global TypeScript remain outside this bounded validation (existing unrelated failures known). Isolated Webpack compatibility is not a full Next build claim.
- Existing print layout is reused, including its brand and missing-data placeholders. No invented fiscal values, recipient data or verification QR link. Browser print is unchanged; PDF geometry is independently adapted.
- PDF artifacts and bundles are generated into approved `%LOCALAPPDATA%/Temp/opencode/remito-pdf-step2*` folders, never committed.

## Diagnose records
1. Runtime/type errors: installed Takumi rejects string margin `12mm`; numeric CSS-pixel conversion fixed only renderer options. Installed d.ts verifies numeric margin. Actual PDF geometry inspected after fix.
2. Node QA initially preloaded a separate CJS WASM instance. Dynamic ESM preload now uses the same module as the browser-facing renderer; no product-only Node workaround.
3. Hook retry fixture initially reused a consumed Response. Changed only new test fixture to create a Response per request; real client remains untouched.
4. Current received design's adjacent inline spans produced `Remitos1` accessible name. Explicit spaced aria labels restore screen-reader/query contract without changing visuals or motion. Existing test files unchanged.
5. First dev browser attempt timed out during new dependency optimization. Complete fresh replay and emitted production-bundle replay both passed. No fake-download fallback added.
6. Direct Next Webpack wrapper exposes `.webpack`, not `.init`/`.default`; harness corrected using inspected module exports. Its default minifier references an unavailable installed plugin path, so standalone asset check disables minimization only; production Vite bundle remains minified and tested.
7. Staged snapshot resides on C: while repo deps are on E:. Test-only aliases explicitly resolve installed React/Lucide/Motion; no package/config/runtime changes.

## Replay
```powershell
node_modules/.bin/vitest.cmd run src/__tests__/components/RemitoPdfDownload.test.tsx src/__tests__/components/ComprobantesAsociados.http.test.tsx src/__tests__/components/ComercialTabContent.test.tsx src/__tests__/components/ComercialTabAutorizar.test.tsx src/__tests__/components/ExpedienteFullView.test.tsx
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITO-PDF-DOWNLOAD-20261007/tsconfig.json --noEmit --incremental false
node --import tsx knowledge/specs/REMITO-PDF-DOWNLOAD-20261007/qa/render-check.ts
node knowledge/specs/REMITO-PDF-DOWNLOAD-20261007/qa/webpack-check.mjs
```

Use existing isolated source fixture (only synthetic API/Auth) on port5187, then:
```powershell
node node_modules/vite/bin/vite.js --config knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/qa/vite.config.mjs
node knowledge/specs/REMITO-PDF-DOWNLOAD-20261007/qa/browser.mjs
```
For production replay, build/preview the same fixture to approved temp directory on port5197, and set `QA_URL=http://127.0.0.1:5197/` for the browser script. Native fetch is restored only for the renderer's WASM asset; no API request escapes the synthetic fixture.

## Commit isolation
- Existing panel design/motion locks were released, but their uncommitted source remains user work.
- Staged panel was constructed from HEAD plus exact own import/hook/status/error/download/aria-label edits, without writing to or reverting the working file. Its 42-test suite ran through `qa/vitest-staged.config.mjs` using a temporary snapshot with relative sibling imports normalized to existing aliases.
- Staged panel retains HEAD styling/motion; current worktree retains user styling/motion. Both variants tested. Never stage the entire modified panel for this task.
