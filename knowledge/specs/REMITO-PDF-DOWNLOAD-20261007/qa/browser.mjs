import { chromium } from "../../../../node_modules/playwright/index.mjs"
import { readFile, mkdir } from "node:fs/promises"
import path from "node:path"
import assert from "node:assert/strict"

const output = path.join(process.env.LOCALAPPDATA, "Temp/opencode/remito-pdf-step2")
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.addInitScript(() => { window.__nativeFetch = window.fetch.bind(window) })
  await page.goto(process.env.QA_URL ?? "http://127.0.0.1:5187/", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Acciones NR 93" }).waitFor()
  await page.evaluate(() => {
    const fixtureFetch = window.fetch
    window.__pdfQA = { mode: "success", requests: 0, links: 0 }
    const create = URL.createObjectURL.bind(URL)
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = blob => { window.__pdfQA.links++; return create(blob) }
    URL.revokeObjectURL = url => { window.__pdfQA.revoked = true; revoke(url) }
    window.fetch = async (input, init) => {
      const url = new URL(String(input), location.origin)
      window.__pdfQA.lastFetch = url.href
      if (url.pathname.endsWith(".wasm")) return window.__nativeFetch(input, init)
      if (url.pathname !== "/api/companies/company-qa/remitos/remito-qa-001") return fixtureFetch(input, init)
      if ((init?.method ?? "GET") !== "GET") throw new Error("Unexpected write")
      window.__pdfQA.requests++
      if (window.__pdfQA.mode === "late") await new Promise(resolve => { window.__pdfQA.release = resolve })
      if (window.__pdfQA.mode === "error") return new Response(JSON.stringify({ error: { message: "synthetic error" } }), { status: 503 })
      const row = {
        id: "remito-qa-001", companyId: "company-qa", surgeryId: "surgery-qa", visibleNumber: 93,
        state: "Entregado", origin: "manual", createdAt: "2026-10-01", issuedAt: null, deliveredAt: null, returnedAt: null,
        destinatarioSnapshot: { nombre: "Hospital Córdoba", cuitDni: "30-12345678-9" },
        shippingAddressSnapshot: { domicilio: "Dirección de entrega 123" },
        metadata: { observaciones: "Observación real: prótesis y tornillos." },
        items: [{ id: "item", sku: "ART-1", description: "Prótesis quirúrgica", quantity: "2", unit: "u", returnedQuantity: "1" }],
      }
      if (window.__pdfQA.mode === "company") row.companyId = "other-company"
      window.__pdfQA.row = row
      return new Response(JSON.stringify({ data: row }), { headers: { "Content-Type": "application/json" } })
    }
  })
  const selectDownload = async () => {
    await page.getByRole("button", { name: "Acciones NR 93" }).click()
    await page.getByRole("menuitem", { name: "Descargar PDF", exact: true }).click()
  }
  const actualDownload = async name => {
    const event = page.waitForEvent("download", { timeout: 30000 })
    await selectDownload()
    const download = await event.catch(async error => {
      console.error(await page.evaluate(() => ({ text: document.body.innerText, qa: window.__pdfQA })))
      throw error
    })
    assert.equal(await download.failure(), null)
    assert.equal(download.suggestedFilename(), "Remito-93.pdf")
    await download.saveAs(path.join(output, name))
    const bytes = await readFile(path.join(output, name))
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-")
    assert.ok(bytes.subarray(-100).toString().includes("%%EOF"))
    await page.waitForFunction(() => window.__pdfQA.revoked === true)
  }
  await actualDownload("browser-download.pdf")
  await page.getByRole("button", { name: "Acciones FV 82" }).click()
  assert.equal(await page.getByRole("menuitem", { name: "Descargar PDF · No disponible" }).getAttribute("aria-disabled"), "true")
  await page.keyboard.press("Escape")
  for (const mode of ["error", "company"]) {
    const links = await page.evaluate(() => window.__pdfQA.links)
    await page.evaluate(mode => { window.__pdfQA.mode = mode }, mode)
    await selectDownload()
    await page.getByRole("alert").waitFor()
    assert.equal(await page.evaluate(() => window.__pdfQA.links), links)
  }
  await page.evaluate(() => { window.__pdfQA.mode = "late" })
  await selectDownload()
  await page.getByRole("status").filter({ hasText: "Preparando PDF" }).waitFor()
  await page.getByRole("button", { name: "Recargar" }).click()
  await page.getByRole("button", { name: "Acciones NR 93" }).waitFor()
  const links = await page.evaluate(() => window.__pdfQA.links)
  await page.evaluate(() => window.__pdfQA.release())
  assert.equal(await page.evaluate(() => window.__pdfQA.links), links)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => { window.__pdfQA.mode = "success"; window.__pdfQA.revoked = false })
  await actualDownload("browser-mobile.pdf")
  await page.screenshot({ path: path.join(output, "mobile.png"), fullPage: true })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: "PASS", checks: ["actual WASM PDF download", "filename", "PDF signature/end", "URL cleanup", "other types disabled", "HTTP error", "company mismatch", "reload cancellation", "390px download"], output }))
} finally { await browser.close() }
