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
7. Open means actual loaded detail. Follow-up step 1 enables NR browser printing only. PDF download/edit and other types' printing remain unavailable. Do not reuse fake DocumentViewerDialog data/download toast or mutate via FiscalEvidenceDialog in this read-only register.
8. Run the exact four-file suite after edits; unchanged test hashes do not validate changed consumers.

## Follow-up step 1 — remito printing
- Approved scope: NR print only; step 2 waits for explicit user confirmation. One product source changed; no test files changed.
- Synthetic check below mounts the existing actual source fixture and intercepts detail GET only. Success invokes printing of backend row HTML; failures/popup blocking/scope rejection/reload are checked. Native OS print UI is not certified by a headless browser.
- TypeScript Diagnose: first run reported three nullable date arguments to `formatDate`; API dates are nullable. Fixed only those presentation calls with explicit absent-date placeholders; no helper/type changes.
- Replay: start the isolated Vite server above; extract the `js remito-print-check` fence to Node stdin with `--input-type=module` from repo root. No temporary test file required.
- Results: **27/27 existing tests PASS**, scoped TypeScript PASS after date guards, isolated component build PASS (2126 modules), original synthetic desktop/mobile/dark/reduced-motion replay PASS, new print check PASS. No test-file or QA-fixture edits. Full application build/live DB/physical printer/OS dialog not certified.
- Directed independent read-only review: no blocking findings; recorded tests reviewed, not independently rerun.
- Harness Diagnose: Windows PowerShell's default stdin encoding mangled accented selector text; reran with explicit UTF-8 input/output. No product or fixture change for that failure.

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new()
$text = Get-Content -Raw -Encoding UTF8 'knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/VALIDATION.md'
$code = [regex]::Match($text, '(?s)```js remito-print-check\r?\n(.*?)\r?\n```').Groups[1].Value
$code | node --input-type=module -
```

```js remito-print-check
import { chromium } from "./node_modules/playwright/index.mjs"
import assert from "node:assert/strict"
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("http://127.0.0.1:5187/", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Acciones NR 93" }).waitFor()
  await page.evaluate(() => {
    const originalFetch = window.fetch
    const originalOpen = window.open.bind(window)
    window.__printQA = { mode: "success", prints: 0, requests: 0, html: "", popup: null }
    window.open = (...args) => {
      if (window.__printQA.mode === "blocked") return null
      const popup = originalOpen(...args)
      window.__printQA.popup = popup
      popup.print = () => { window.__printQA.prints++; window.__printQA.html = popup.document.documentElement.outerHTML }
      return popup
    }
    window.fetch = async (input, init) => {
      const url = new URL(String(input), location.origin)
      if (url.pathname !== "/api/companies/company-qa/remitos/remito-qa-001") return originalFetch(input, init)
      if ((init?.method ?? "GET") !== "GET") throw new Error("Unexpected write")
      const qa = window.__printQA
      qa.requests++
      if (qa.mode === "late") await new Promise(resolve => { qa.release = resolve })
      if (qa.mode === "error") return new Response(JSON.stringify({ error: { message: "synthetic failure" } }), { status: 503 })
      const row = {
        id: "remito-qa-001", companyId: "company-qa", surgeryId: "surgery-qa", visibleNumber: 93,
        state: "Entregado", origin: "manual", createdAt: "2026-10-01", issuedAt: null, deliveredAt: null, returnedAt: null,
        destinatarioSnapshot: { nombre: "Hospital <script>invalid()</script>", cuitDni: "30-12345678-9" },
        shippingAddressSnapshot: { domicilio: "Dirección de entrega" }, metadata: { observaciones: "Observación real" },
        items: [{ sku: "ART-1", description: "Material real <b>sin ejecutar</b>", quantity: "2", unit: "u", returnedQuantity: "1" }],
      }
      if (qa.mode === "company") row.companyId = "another-company"
      if (qa.mode === "surgery") row.surgeryId = "another-surgery"
      if (qa.mode === "id") row.id = "another-remito"
      return new Response(JSON.stringify({ data: row }), { headers: { "Content-Type": "application/json" } })
    }
  })
  const print = async () => {
    await page.getByRole("button", { name: "Acciones NR 93" }).click()
    const menu = page.getByRole("menu")
    assert.equal(await menu.getByRole("menuitem", { name: "Descargar PDF · No disponible" }).getAttribute("aria-disabled"), "true")
    await menu.getByRole("menuitem", { name: "Imprimir", exact: true }).click()
  }
  await print()
  await page.waitForFunction(() => window.__printQA.prints === 1)
  const html = await page.evaluate(() => window.__printQA.html)
  assert.ok(html.includes("Material real &lt;b&gt;sin ejecutar&lt;/b&gt;"))
  assert.ok(html.includes("Hospital &lt;script&gt;invalid()&lt;/script&gt;"))
  assert.ok(html.includes("Dirección de entrega") && html.includes("Observación real"))
  assert.ok(!html.includes("El recorrido documental"))
  await page.evaluate(() => window.__printQA.popup.close())
  for (const mode of ["blocked", "error", "company", "surgery", "id"]) {
    await page.evaluate(mode => { window.__printQA.mode = mode; window.__printQA.prints = 0 }, mode)
    await print()
    await page.getByRole("alert").waitFor()
    const result = await page.evaluate(() => ({ prints: window.__printQA.prints, closed: window.__printQA.popup.closed }))
    assert.equal(result.prints, 0)
    assert.equal(result.closed, true)
  }
  await page.evaluate(() => { window.__printQA.mode = "late" })
  await print()
  await page.getByRole("status").filter({ hasText: "Preparando remito" }).waitFor()
  await page.getByRole("button", { name: "Recargar" }).click()
  await page.getByRole("button", { name: "Acciones NR 93" }).waitFor()
  await page.evaluate(() => window.__printQA.release())
  assert.equal(await page.evaluate(() => window.__printQA.popup.closed), true)
  assert.equal(await page.evaluate(() => window.__printQA.prints), 0)
  await page.evaluate(() => { window.__printQA.mode = "success" })
  await print()
  await page.waitForFunction(() => window.__printQA.prints === 1)
  await page.evaluate(() => window.__printQA.popup.close())
  assert.deepEqual(errors, [])
  console.log("PASS: real popup/document HTML, escaping, unavailable download, popup blocker, HTTP error, company/surgery/id rejection, late reload cancellation, retry")
} finally { await browser.close() }
```
