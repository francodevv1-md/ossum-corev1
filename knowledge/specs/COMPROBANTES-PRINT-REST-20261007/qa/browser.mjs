import { chromium } from "../../../../node_modules/playwright/index.mjs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import assert from "node:assert/strict"

const output = path.join(process.env.LOCALAPPDATA, "Temp/opencode/comprobantes-print-rest")
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(process.env.QA_URL ?? "http://127.0.0.1:5187/", { waitUntil: "domcontentloaded", timeout: 60000 })
  await page.getByRole("button", { name: "Acciones PR 71" }).waitFor()
  await page.evaluate(() => {
    const fixtureFetch = window.fetch
    const nativeOpen = window.open.bind(window)
    window.__printQA = { mode: "success", reads: [], popups: [] }
    window.open = (...args) => {
      if (window.__printQA.mode === "blocked") return null
      const popup = nativeOpen(...args)
      if (popup) {
        popup.print = () => { popup.document.body.dataset.printCalls = "1" }
        window.__printQA.popups.push(popup)
      }
      return popup
    }
    const base = { companyId: "company-qa", surgeryId: "surgery-qa", createdAt: "2026-10-01T12:00:00Z", issuedAt: null, currency: "ARS", state: "Borrador" }
    const item = { id: "item", sku: "ART-1", description: "Material leído al imprimir <script>window.bad=true</script>", quantity: "2", unit: "u", unitPrice: "12.75", discount: "1.25", tax: "5.09", total: "29.34" }
    window.__printQA.documents = {
      presupuestos: { ...base, id: "budget-qa-001", visibleNumber: 71, documentDate: "2026-10-01", total: "29.34", subtotal: "25.50", discountTotal: "1.25", taxTotal: "5.09", versionNumber: 2, generalDiscountRate: "0", items: [item],
        title: "Presupuesto backend actualizado", commercialSnapshot: { client: { legalName: "Cliente Córdoba" }, payer: { legalName: "Financiador QA" } }, metadata: { patient: "Paciente QA", institution: "Hospital Córdoba" },
        validUntil: "2026-10-30T12:00:00Z", legend: "Presupuesto estimativo guardado", paymentTerms: "30 días", notes: "Nota backend" },
      invoices: { ...base, id: "invoice-qa-001", visibleNumber: 82, type: "FV", base: "manual", items: [item], subtotal: "25.50", discountTotal: "1.25", taxTotal: "5.09", total: "29.34", paidTotal: "10", balance: "19.34" },
      payments: { ...base, id: "payment-qa-001", visibleNumber: 104, surgeryId: null, state: "Registrado", amount: "100", method: "transfer", receivedAt: "2026-10-04T12:00:00Z", metadata: { reference: "REF-104", notes: "Cobro backend" },
        imputations: [{ id: "allocation", invoiceId: "invoice-qa-001", amount: "10" }, { id: "other", invoiceId: "invoice-other-surgery", amount: "90" }] },
      remitos: { ...base, id: "remito-qa-001", visibleNumber: 93, state: "Emitido", destinatarioSnapshot: { nombre: "Hospital QA" }, deliveredAt: null, returnedAt: null, items: [{ ...item, returnedQuantity: "0" }] },
    }
    window.fetch = async (input, init) => {
      const url = new URL(String(input), location.origin)
      const segments = url.pathname.split("/")
      if (segments.length !== 6) return fixtureFetch(input, init)
      if (segments[3] !== "company-qa" || !window.__printQA.documents[segments[4]]) throw new Error("Unexpected endpoint")
      if ((init?.method ?? "GET") !== "GET") throw new Error("Unexpected mutation")
      if (new Headers(init?.headers).get("Authorization") !== "Bearer synthetic-qa-token") throw new Error("Missing auth")
      window.__printQA.reads.push(url.pathname)
      if (window.__printQA.mode === "late") await new Promise(resolve => { window.__printQA.release = resolve })
      if (window.__printQA.mode === "error") return new Response(JSON.stringify({ error: { message: "Synthetic failed GET" } }), { status: 403 })
      const row = { ...window.__printQA.documents[segments[4]] }
      if (window.__printQA.mode === "company") row.companyId = "other-company"
      return new Response(JSON.stringify({ data: row }))
    }
  })

  const openMenu = async (type, number) => {
    await page.getByRole("button", { name: `Acciones ${type} ${number}` }).click()
    const item = page.getByRole("menuitem", { name: "Imprimir", exact: true })
    assert.notEqual(await item.getAttribute("aria-disabled"), "true")
    await item.evaluate(async element => {
      const menu = element.closest('[role="menu"]')
      await Promise.all(menu.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))
    })
    return item
  }
  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080], [2560, 1440], [390, 844]]) {
    await page.setViewportSize({ width, height })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    for (const [type, number, title] of [["PR", 71, "Presupuesto"], ["FV", 82, "Factura operativa"], ["CO", 104, "Recibo de cobro"], ["NR", 93, "REMITO"]]) {
      const item = await openMenu(type, number)
      if (width === 390) {
        assert.ok((await item.boundingBox()).height >= 44)
        assert.ok((await page.locator(`button[aria-label="Acciones ${type} ${number}"]`).boundingBox()).height >= 44)
      }
      if (type !== "NR") assert.equal(await page.getByRole("menuitem", { name: "Descargar PDF · No disponible" }).getAttribute("aria-disabled"), "true")
      assert.equal(await page.getByRole("menuitem", { name: "Modificar · No disponible" }).getAttribute("aria-disabled"), "true")
      const event = page.waitForEvent("popup")
      await item.click()
      const popup = await event
      await popup.waitForFunction(() => document.body.dataset.printCalls === "1")
      assert.equal(await popup.evaluate(() => window.opener), null)
      assert.equal(await popup.locator("script").count(), 0)
      const text = await popup.locator("body").innerText()
      assert.ok(text.includes(title))
      assert.ok(text.includes("Material leído al imprimir") || type === "CO")
      if (type === "FV") { assert.ok(text.includes("Sin validez fiscal")); assert.ok(text.includes("19,34 ARS")) }
      if (type === "CO") { assert.ok(text.includes("100,00 ARS")); assert.ok(text.includes("10,00 ARS")); assert.ok(!text.includes("90,00 ARS")); assert.ok(text.includes("82")) }
      if (type === "PR") { assert.ok(text.includes("Cliente Córdoba")); assert.ok(text.includes("30 días")) }
      if (type !== "NR") {
        await popup.setViewportSize({ width, height })
        assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
        await popup.screenshot({ path: path.join(output, `${type}-${width}.png`), fullPage: true })
        if (width === 1366) await popup.pdf({ path: path.join(output, `${type}-print.pdf`), preferCSSPageSize: true })
      }
      await popup.close()
    }
    await page.locator('[data-radix-menu-content]').waitFor({ state: "detached" })
    await page.screenshot({ path: path.join(output, `panel-${width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 1366, height: 768 })
  for (const mode of ["error", "company"]) {
    await page.evaluate(mode => { window.__printQA.mode = mode }, mode)
    const item = await openMenu("FV", 82)
    const event = page.waitForEvent("popup")
    await item.click(); const popup = await event
    await page.getByRole("alert").waitFor()
    await page.waitForFunction(() => window.__printQA.popups.at(-1).closed)
    assert.equal(popup.isClosed(), true)
  }
  await page.evaluate(() => { window.__printQA.mode = "blocked" })
  await (await openMenu("PR", 71)).click()
  assert.ok((await page.getByRole("alert").innerText()).includes("bloqueó"))
  await page.evaluate(() => { window.__printQA.mode = "late" })
  const event = page.waitForEvent("popup")
  await (await openMenu("PR", 71)).click(); const latePopup = await event
  await page.waitForFunction(() => typeof window.__printQA.release === "function")
  await page.getByRole("button", { name: "Recargar" }).click()
  await page.getByRole("button", { name: "Acciones PR 71" }).waitFor()
  await page.evaluate(() => window.__printQA.release())
  assert.equal(latePopup.isClosed(), true)
  await page.evaluate(() => { window.__printQA.mode = "success" })
  // Content long enough for actual A4 pagination, without changing amounts or product data.
  await page.evaluate(() => {
    const row = window.__printQA.documents.presupuestos
    row.items = Array.from({ length: 100 }, (_, index) => ({ ...row.items[0], id: `item-${index}`, description: `Material ${index + 1} — ${row.items[0].description}` }))
  })
  const multiEvent = page.waitForEvent("popup")
  await (await openMenu("PR", 71)).click(); const longPopup = await multiEvent
  await longPopup.waitForFunction(() => document.body.dataset.printCalls === "1")
  assert.equal(await longPopup.locator("tbody tr").count(), 100)
  await longPopup.pdf({ path: path.join(output, "PR-multipage.pdf"), preferCSSPageSize: true })
  await longPopup.close()
  assert.deepEqual(errors, [])
  const result = { result: "PASS", checks: ["PR/FV/CO/NR real popup + print invocation", "fresh authenticated GET", "20 viewport/type combinations", "no viewport overflow", "44px mobile action targets", "PDF+Modify unchanged", "payment total vs allocations", "no script execution", "HTTP errors+scope rejection", "popup blocker", "reload cancellation", "100-row A4 pagination"], output }
  await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally { await browser.close() }
