import { test, expect, type Response } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

const company = "codevdistricorr1000000000"
const prefix = `/api/companies/${company}`
const orders = `${prefix}/ordenes-compra`
const expired = "E2E blocked by expired authentication state"
const cuid = /^c[a-z0-9]{24}$/
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }

test("native synthetic OC → partial receipt → rejected overreceipt → full receipt persisted after reload", async ({ playwright }, testInfo) => {
  const importJS = new Function("url", "return import(url)")
  const helper = await importJS(pathToFileURL(path.resolve(__dirname, "../scripts/qa/run-compras-process.mjs")).href)
  const sessionHelper = await importJS(pathToFileURL(path.resolve(__dirname, "../scripts/qa/dev-session.mjs")).href)
  const setup = helper.configuration()
  const marker = `QA-OC-${randomUUID()}`
  let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | undefined
  let phase = "session"
  let bearer = ""
  let id = ""
  let itemId = ""
  let violation = false
  let permit = ""
  let expectedReceipt = 0
  const writes = { create: 0, emitir: 0, enviar: 0, recibir: 0, rejected: 0 }
  try {
    browser = await playwright.chromium.launch({ timeout: 30_000 })
    const context = await browser.newContext({ storageState: setup.state, baseURL: setup.baseURL, viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" })
    const page = await context.newPage()
    page.setDefaultTimeout(15_000)
    page.setDefaultNavigationTimeout(60_000)
    await context.route("**/*", async route => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method()
      let allowed = !violation && url.origin === setup.baseURL
      // Read-only app bootstrap and OC catalog are allowed; integrations never are.
      if (url.pathname.startsWith("/api/")) allowed &&= url.pathname.startsWith(`${prefix}/`) && !/\/(?:mail|ai|ocr|upload|documents|fiscal|payments|gps)(?:\/|$)/i.test(url.pathname)
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        allowed = false
        if (!violation && url.origin === setup.baseURL && !url.search && method === "POST") {
          try {
            if (permit === "create" && url.pathname === orders && writes.create === 0) {
              const body = request.postDataJSON()
              const line = body?.items?.[0]
              allowed = body.proveedorId === setup.supplier.id && body.proveedorName === setup.supplier.name
                && body.items.length === 1 && line.stockItemId === setup.article.id
                && line.name === setup.article.name && line.code === setup.article.code
                && Number(line.quantity) === 4 && Number(line.unitPrice) === 10
                && Object.keys(body).every(k => ["proveedorId", "proveedorName", "items"].includes(k))
                && Object.keys(line).every(k => ["stockItemId", "name", "code", "quantity", "unitPrice"].includes(k))
              if (allowed) writes.create++
            } else if (id && ["emitir", "enviar"].includes(permit) && url.pathname === `${orders}/${id}/${permit}`) {
              const key = permit as "emitir" | "enviar"
              allowed = writes[key] === 0 && !request.postData()
              if (allowed) writes[key]++
            } else if (permit === "recibir" && id && itemId && url.pathname === `${orders}/${id}/recibir` && writes.recibir < 2) {
              const body = request.postDataJSON()
              allowed = Object.keys(body).length === 1 && Array.isArray(body.receivedByItem) && body.receivedByItem.length === 1
                && body.receivedByItem[0].itemId === itemId && Number(body.receivedByItem[0].received) === expectedReceipt
                && Object.keys(body.receivedByItem[0]).every(k => ["itemId", "received"].includes(k))
              if (allowed) writes.recibir++
            }
          } catch { allowed = false }
        }
        if (allowed) permit = "" // Consume before dispatch; no double-click/retry writes.
      }
      if (!allowed) { violation = true; await route.abort("blockedbyclient"); return }
      await route.continue()
    })
    await context.routeWebSocket("**/*", socket => {
      const url = new URL(socket.url())
      const local = new URL(setup.baseURL); local.protocol = "ws:"
      if (!violation && url.origin === local.origin && !url.hash && ["/_next/hmr", "/_next/webpack-hmr"].includes(url.pathname)) socket.connectToServer()
      else { violation = true; socket.close() }
    })
    const decode = async (response: Response | Awaited<ReturnType<typeof context.request.get>>) => {
      if (response.status() === 401) throw new Error(expired)
      const body = await response.json()
      if (body?.error?.code === "invalid_auth_token") throw new Error(expired)
      check(response.ok(), "FAIL: backend response rejected")
      return body.data
    }
    const [membership] = await Promise.all([
      page.waitForResponse(r => r.url() === `${setup.baseURL}${prefix}/me` && r.request().method() === "GET", { timeout: 60_000 }),
      page.goto("/compras/ordenes-compra", { waitUntil: "domcontentloaded" }),
    ]).catch(async () => {
      const verdict = await page.evaluate(sessionHelper.storedSessionVerdict).catch(() => "blocked")
      throw new Error(verdict === "expired" ? expired : "BLOCKED: app membership unavailable")
    })
    bearer = await membership.request().headerValue("authorization") || ""
    const me = await decode(membership)
    check(/^Bearer \S+$/.test(bearer) && membership.status() === 200 && me?.activeCompany?.id === company
      && typeof me?.user?.id === "string" && ["admin", "coordinador", "logistica"].includes(me?.access?.role), "BLOCKED: current app bearer and exact company membership required")
    const get = async (pathname: string) => {
      check(!violation && pathname.startsWith(`${prefix}/`), "BLOCKED: traffic tripwire")
      return decode(await context.request.get(`${setup.baseURL}${pathname}`, { headers: { Authorization: bearer }, maxRedirects: 0, timeout: 15_000 }))
    }
    phase = "supplier"
    // Only designated provider identity is checked; unrelated contacts are not evidence.
    const records = await get(`${prefix}/contacts?role=proveedor&isActive=true&search=${encodeURIComponent(setup.supplier.code)}&take=20`)
    const matches = Array.isArray(records) ? records.filter((c: any) => c.id === setup.supplier.id && c.code === setup.supplier.code) : []
    const supplier = matches[0]
    const name = supplier && (supplier.tradeName?.trim() || supplier.legalName?.trim() || `${supplier.firstName || ""} ${supplier.lastName || ""}`.trim())
    check(matches.length === 1 && supplier.isActive === true && supplier.linkIsActive === true && supplier.roles?.includes("proveedor")
      && supplier.email === setup.supplier.email && name === setup.supplier.name, "BLOCKED: exact independently verified synthetic supplier mismatch")
    await get(`${orders}?proveedorId=${encodeURIComponent(setup.supplier.id)}&take=1`)
    const catalog = await get(`${prefix}/articles?take=100`)
    check(Array.isArray(catalog) && catalog.filter((a: any) => a.id === setup.article.id && a.sku === setup.article.code && a.description === setup.article.name && a.isActive === true).length === 1,
      "BLOCKED: exact synthetic native catalog article unavailable")
    const getOrder = async () => {
      const records = await get(orders)
      const matches = Array.isArray(records) ? records.filter((r: any) => r.id === id) : []
      check(matches.length === 1, "FAIL: exact owned OC collection readback required")
      return matches[0]
    }
    phase = "native-capability"
    await page.getByRole("button", { name: "Nueva OC", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "Nueva Orden de Compra", exact: true })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("combobox").first().click()
    await page.getByRole("option", { name: setup.supplier.name, exact: true }).click()
    await dialog.getByRole("combobox").nth(1).click()
    await page.getByRole("option", { name: `${setup.article.code} — ${setup.article.name}`, exact: true }).click()
    await dialog.getByRole("spinbutton").nth(0).fill("4")
    await dialog.getByRole("spinbutton").nth(1).fill("10")
    check(!violation, "BLOCKED: unexpected traffic before creation")
    phase = "create"
    permit = "create"
    const creation = page.waitForResponse(r => r.url() === `${setup.baseURL}${orders}` && r.request().method() === "POST")
    await dialog.getByRole("button", { name: "Crear OC", exact: true }).click()
    const created = await decode(await creation)
    id = typeof created?.id === "string" ? created.id : ""
    itemId = typeof created?.items?.[0]?.id === "string" ? created.items[0].id : ""
    // Save immediately, before strict CUID/state assertions; never auto-clean/recreate.
    await writeFile(path.join(setup.artifacts, `${marker}-created.json`), JSON.stringify({
      result: "CREATED_NOT_YET_VALIDATED", companyId: company, marker, createdId: id, itemId, nativeCreationObserved: true,
    }), { flag: "wx", mode: 0o600 })
    check(cuid.test(id) && cuid.test(itemId), "FAIL: native CUID identities required")
    const assertOrder = (record: any, state: string, received: number) => {
      const line = record?.items?.[0]
      check(record?.id === id && record.companyId === company && record.proveedorId === setup.supplier.id
        && record.proveedorName === setup.supplier.name && record.observaciones === null && record.state === state
        && record.items.length === 1 && line.id === itemId && line.stockItemId === setup.article.id && line.isArticuloZ === false && line.name === setup.article.name
        && line.code === setup.article.code && line.descripcionLibre === null && Number(line.quantity) === 4
        && Number(line.unitPrice) === 10 && Number(line.received) === received && Number(line.quantity) - Number(line.received) === 4 - received
        && Number(record.total) === 40, "FAIL: persisted owned OC state/quantity mismatch")
    }
    assertOrder(await getOrder(), "Borrador", 0)
    await expect(dialog).toBeHidden()
    const row = () => page.getByRole("row").filter({ has: page.getByText(id, { exact: true }) })
    const action = async (label: string, endpoint: string, amount?: number) => {
      check(!violation, "BLOCKED: traffic tripwire")
      await expect(row()).toHaveCount(1)
      await row().locator('button[aria-haspopup="menu"]').click()
      const menu = page.getByRole("menuitem", { name: label, exact: true })
      check(await menu.count() === 1, "BLOCKED: required native operational action unavailable")
      if (amount !== undefined) {
        await menu.click()
        const receipt = page.getByRole("dialog", { name: "Registrar recepción", exact: true })
        await expect(receipt.getByText(`Pendiente: ${amount === 1 ? 4 : 3} de 4`, { exact: true })).toBeVisible()
        await receipt.getByRole("spinbutton", { name: `Recibir ${setup.article.name}`, exact: true }).fill(String(amount))
        expectedReceipt = amount; permit = "recibir"
        const response = page.waitForResponse(r => r.url() === `${setup.baseURL}${orders}/${id}/recibir` && r.request().method() === "POST")
        await receipt.getByRole("button", { name: "Registrar recepción", exact: true }).click()
        await decode(await response)
        await expect(receipt).toBeHidden()
      } else {
        permit = endpoint
        const response = page.waitForResponse(r => r.url() === `${setup.baseURL}${orders}/${id}/${endpoint}` && r.request().method() === "POST")
        await menu.click(); await decode(await response)
      }
    }
    phase = "emitir"; await action("Emitir", "emitir"); assertOrder(await getOrder(), "Emitida", 0)
    await expect(row().getByText("Emitida", { exact: true })).toBeVisible()
    phase = "enviar"; await action("Marcar enviada", "enviar"); assertOrder(await getOrder(), "Enviada", 0)
    await expect(row().getByText("Enviada", { exact: true })).toBeVisible()
    phase = "partial"; await action("Registrar recepción", "recibir", 1)
    await page.reload({ waitUntil: "domcontentloaded" })
    assertOrder(await getOrder(), "Parcialmente_recibida", 1)
    await expect(row().getByText("Parcialmente recibida", { exact: true })).toBeVisible()
    phase = "overreceipt"
    const before = await getOrder()
    check(!violation && writes.rejected === 0, "BLOCKED: negative request tripwire")
    writes.rejected++
    // APIRequestContext bypasses browser routing: this is the sole explicit backend
    // mutation, with fixed owned URL/payload/no redirects; no generic request helper.
    const denied = await context.request.post(`${setup.baseURL}${orders}/${id}/recibir`, {
      headers: { Authorization: bearer }, data: { receivedByItem: [{ itemId, received: "4" }] }, maxRedirects: 0, timeout: 15_000,
    })
    if (denied.status() === 401) throw new Error(expired)
    const rejected = await denied.json()
    if (rejected?.error?.code === "invalid_auth_token") throw new Error(expired)
    check(denied.status() === 409 && rejected?.error?.code === "orden_compra_invalid_receipt", "FAIL: overreceipt must reject")
    const after = await getOrder()
    check(JSON.stringify(before) === JSON.stringify(after), "FAIL: rejected overreceipt changed OC")
    assertOrder(after, "Parcialmente_recibida", 1)
    phase = "full"; await action("Registrar recepción", "recibir", 3)
    phase = "reload"; await page.reload({ waitUntil: "domcontentloaded" })
    assertOrder(await getOrder(), "Recibida", 4)
    await expect(row().getByText("Recibida", { exact: true })).toBeVisible()
    check(!violation && Object.entries(writes).every(([kind, count]) => count === (kind === "recibir" ? 2 : 1)),
      "FAIL: unexpected or missing mutations")
    await writeFile(path.join(setup.artifacts, `${marker}-result.json`), JSON.stringify({
      result: "PASS", companyId: company, marker, createdId: id, itemId, writes,
      received: 4, remaining: 0, reloadVerified: true, rejectedOverreceiptUnchanged: true, physicalStockValidated: false,
    }), { flag: "wx", mode: 0o600 })
  } catch (error) {
    testInfo.annotations.push({ type: "process", description: `Stopped at ${phase}; owned creation retained; browser guard=${violation}` })
    testInfo.annotations.push({ type: "mutation-counts", description: JSON.stringify(writes) })
    if (error instanceof Error) testInfo.annotations.push({ type: "diagnose", description: /^(?:FAIL|BLOCKED):/.test(error.message) ? error.message : `Error class: ${error.name.replace(/[^a-zA-Z]/g, "")}` })
    if (error instanceof Error && error.message === expired) throw new Error(expired)
    // Suppress raw Playwright assertions, URLs, supplier values and response bodies.
    throw new Error(phase === "native-capability"
      ? "BLOCKED: native supplier/catalog or Emitir action unavailable; no backend happy-path fallback"
      : `${id ? "FAIL" : "BLOCKED"}: guarded compras journey at ${phase}; inspect private report`)
  } finally { bearer = ""; await browser?.close() }
})
