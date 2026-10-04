import { test, expect, type Response, type APIResponse } from "@playwright/test"
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
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
type Intent = { location: string; operationKey: string; receivedByItem: { itemId: string; received: string }[] }

test("NEW NONE article: native OC → delta receipts → physical stock and canonical origin → replay/conflict invariance", async ({ playwright }, testInfo) => {
  const importJS = new Function("url", "return import(url)")
  const helper = await importJS(pathToFileURL(path.resolve(__dirname, "../scripts/qa/run-compras-stock-process.mjs")).href)
  const sessionHelper = await importJS(pathToFileURL(path.resolve(__dirname, "../scripts/qa/dev-session.mjs")).href)
  const setup = helper.configuration() // Before browser launch; --list never enters this callback.
  const marker = `${helper.namespace}${randomUUID()}`
  let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | undefined
  let phase = "session", bearer = "", id = "", itemId = "", permit = ""
  let violation = false, expectedQuantity = 0
  const intents: Intent[] = []
  const receiptIds = new Set<string>()
  const movementIds = new Set<string>()
  const writes = { create: 0, emitir: 0, enviar: 0, recibir: 0, replayK1: 0, conflictK1: 0, overflow: 0, replayK2Full: 0, replayK1Full: 0 }
  const save = (suffix: string, data: unknown) => writeFile(path.join(setup.artifacts, `${marker}-${suffix}.json`), JSON.stringify(data), { flag: "wx", mode: 0o600 })
  try {
    browser = await playwright.chromium.launch({ timeout: 30_000 })
    const context = await browser.newContext({ storageState: setup.state, baseURL: setup.baseURL,
      viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" })
    const stockDetail = `${prefix}/stock/${setup.article.id}`
    const stockList = `${prefix}/stock?search=${encodeURIComponent(setup.article.code)}&limit=100`
    const auditPath = (entityType: string, entityId: string) => `${prefix}/audit-events?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}&take=100`
    const readAllowed = (url: URL) => {
      if (url.origin !== setup.baseURL || url.hash) return false
      const p = url.pathname
      if (!p.startsWith("/api/")) return ["/compras/ordenes-compra", "/stock", "/favicon.ico"].includes(p) || p.startsWith("/_next/") || /\.(?:svg|png|jpg|jpeg|webp|ico|woff2?|css|js)$/i.test(p)
      if ([`${prefix}/me`, "/api/me/companies", `${prefix}/notifications`, `${prefix}/notifications/unread-count`,
        `${prefix}/contacts`, `${prefix}/articles`, orders, `${prefix}/stock`].includes(p)) return true
      if ([`${prefix}/articles/${setup.article.id}`, stockDetail].includes(p)) return true
      if ([...receiptIds].some(r => p === `${prefix}/receipts/${r}`)) return true
      return p === `${prefix}/audit-events` && url.searchParams.get("take") === "100"
        && ((url.searchParams.get("entityType") === "OrdenCompra" && !!id && url.searchParams.get("entityId") === id)
          || (url.searchParams.get("entityType") === "Receipt" && receiptIds.has(url.searchParams.get("entityId") || ""))
          || (url.searchParams.get("entityType") === "StockMovement" && movementIds.has(url.searchParams.get("entityId") || "")))
    }
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method()
      let allowed = !violation && method === "GET" && readAllowed(url)
      if (!violation && url.origin === setup.baseURL && !url.search && !url.hash && method === "POST") {
        try {
          if (permit === "create" && url.pathname === orders && writes.create === 0) {
            const body = request.postDataJSON(), line = body?.items?.[0]
            allowed = body.proveedorId === setup.supplier.id && body.proveedorName === setup.supplier.name && body.items.length === 1
              && line.stockItemId === setup.article.id && line.name === setup.article.name && line.code === setup.article.code
              && Number(line.quantity) === 4 && Number(line.unitPrice) === 10
              && Object.keys(body).every(k => ["proveedorId", "proveedorName", "items"].includes(k))
              && Object.keys(line).every(k => ["stockItemId", "name", "code", "quantity", "unitPrice"].includes(k))
            if (allowed) writes.create++
          } else if (id && ["emitir", "enviar"].includes(permit) && url.pathname === `${orders}/${id}/${permit}`) {
            const kind = permit as "emitir" | "enviar"
            allowed = writes[kind] === 0 && !request.postData()
            if (allowed) writes[kind]++
          } else if (permit === "recibir" && id && itemId && url.pathname === `${orders}/${id}/recibir` && writes.recibir < 2) {
            const body = request.postDataJSON()
            allowed = Object.keys(body).sort().join(",") === "location,operationKey,receivedByItem"
              && body.location === setup.location && typeof body.operationKey === "string" && body.operationKey.trim() === body.operationKey
              && body.operationKey.length > 0 && body.operationKey.length <= 128 && !intents.some(i => i.operationKey === body.operationKey)
              && Array.isArray(body.receivedByItem) && body.receivedByItem.length === 1
              && body.receivedByItem[0].itemId === itemId && body.receivedByItem[0].received === String(expectedQuantity)
              && Object.keys(body.receivedByItem[0]).sort().join(",") === "itemId,received"
            if (allowed) { intents.push(JSON.parse(JSON.stringify(body))); writes.recibir++ }
          }
        } catch { allowed = false }
        if (allowed) permit = "" // Consume before sending: no implicit duplicate retry.
      }
      if (!allowed) { violation = true; await route.abort("blockedbyclient"); return }
      await route.continue()
    })
    await context.routeWebSocket("**/*", socket => {
      const url = new URL(socket.url()), local = new URL(setup.baseURL); local.protocol = "ws:"
      if (!violation && url.origin === local.origin && !url.hash && ["/_next/hmr", "/_next/webpack-hmr"].includes(url.pathname)) socket.connectToServer()
      else { violation = true; socket.close() }
    })
    const page = await context.newPage()
    page.setDefaultTimeout(15_000); page.setDefaultNavigationTimeout(45_000)
    const json = async (response: Response | APIResponse) => {
      if (response.status() === 401) throw new Error(expired)
      const body = await response.json()
      if (body?.error?.code === "invalid_auth_token") throw new Error(expired)
      return body
    }
    const decode = async (response: Response | APIResponse) => {
      const body = await json(response)
      check(response.ok() && body && Object.hasOwn(body, "data"), "FAIL: backend envelope/status")
      return body.data
    }
    const [membership] = await Promise.all([
      page.waitForResponse(r => r.url() === `${setup.baseURL}${prefix}/me` && r.request().method() === "GET", { timeout: 45_000 }),
      page.goto("/compras/ordenes-compra", { waitUntil: "domcontentloaded" }),
    ]).catch(async () => {
      const verdict = await page.evaluate(sessionHelper.storedSessionVerdict).catch(() => "blocked")
      throw new Error(verdict === "expired" ? expired : "BLOCKED: app membership unavailable")
    })
    bearer = await membership.request().headerValue("authorization") || ""
    const me = await decode(membership)
    check(!violation && /^Bearer \S+$/.test(bearer) && membership.status() === 200 && me?.activeCompany?.id === company
      && me.user?.id === setup.actorId && ["admin", "logistica", "logistics"].includes(me.access?.role), "BLOCKED: exact company/actor/stock role")
    // APIRequestContext bypasses routing. Every GET validates this same allowlist;
    // direct POSTs below have a separate closed set of fixed payloads/counters.
    const get = async (pathname: string) => {
      check(!violation && readAllowed(new URL(`${setup.baseURL}${pathname}`)), "BLOCKED: direct GET tripwire")
      return decode(await context.request.get(`${setup.baseURL}${pathname}`, { headers: { Authorization: bearer }, maxRedirects: 0, timeout: 15_000 }))
    }
    phase = "fixture-proof"
    const contacts = await get(`${prefix}/contacts?role=proveedor&isActive=true&search=${encodeURIComponent(setup.supplier.code)}&take=20`)
    const suppliers = Array.isArray(contacts) ? contacts.filter((c: any) => c.id === setup.supplier.id && c.code === setup.supplier.code) : []
    const supplier = suppliers[0]
    const name = supplier && (supplier.tradeName?.trim() || supplier.legalName?.trim() || `${supplier.firstName || ""} ${supplier.lastName || ""}`.trim())
    check(suppliers.length === 1 && supplier.isActive === true && supplier.linkIsActive === true && supplier.roles?.includes("proveedor")
      && supplier.email === setup.supplier.email && name === setup.supplier.name, "BLOCKED: synthetic supplier identity")
    const article = await get(`${prefix}/articles/${setup.article.id}`)
    check(article.id === setup.article.id && article.sku === setup.article.code && article.description === setup.article.name && article.isActive === true
      && article.tracePolicies?.length === 1 && article.tracePolicies[0].policy === "NONE"
      && article.stockEligibilities?.some((e: any) => e.companyId === company), "BLOCKED: new eligible NONE article")
    const catalog = await get(`${prefix}/articles?take=100`)
    check(Array.isArray(catalog) && catalog.filter((a: any) => a.id === setup.article.id && a.sku === setup.article.code && a.description === setup.article.name).length === 1,
      "BLOCKED: native catalog fixture unavailable")
    const orderRecords = () => get(`${orders}?proveedorId=${encodeURIComponent(setup.supplier.id)}&take=100`)
    const previous = await orderRecords()
    check(Array.isArray(previous) && previous.length < 100 && !previous.some((o: any) => o.items?.some((i: any) => i.stockItemId === setup.article.id)),
      "BLOCKED: new article already used or fixture history truncated")
    const getOrder = async () => {
      const records = await orderRecords()
      const matches = Array.isArray(records) ? records.filter((o: any) => o.id === id) : []
      check(matches.length === 1, "FAIL: owned OC collection readback")
      return matches[0]
    }
    const assertOrder = (o: any, state: string, received: number) => {
      const line = o?.items?.[0]
      check(o.id === id && o.companyId === company && o.proveedorId === setup.supplier.id && o.proveedorName === setup.supplier.name
        && o.state === state && o.items.length === 1 && o.observaciones === null && Number(o.total) === 40
        && line.id === itemId && line.stockItemId === setup.article.id && line.code === setup.article.code && line.name === setup.article.name
        && line.isArticuloZ === false && line.descripcionLibre === null && Number(line.quantity) === 4 && Number(line.unitPrice) === 10
        && Number(line.subtotal) === 40 && Number(line.received) === received, "FAIL: owned OC state/quantity/price")
    }
    const stock = async (quantity: number, count: number) => {
      const detail = await get(stockDetail), list = await get(stockList)
      const matches = Array.isArray(list?.data) ? list.data.filter((a: any) => a.id === setup.article.id && a.code === setup.article.code) : []
      check(detail.article?.id === setup.article.id && detail.article.code === setup.article.code && detail.article.name === setup.article.name
        && matches.length === 1 && matches[0].name === setup.article.name && detail.movements?.length === count, "FAIL: exact stock detail/list/movement count")
      for (const summary of [detail.summary, matches[0]]) check(summary.physical === quantity && summary.available === quantity
        && summary.reserved === 0 && summary.inTransit === 0, "FAIL: physical/available/reservation/transit")
      check(Array.isArray(detail.lots) && (quantity === 0 ? detail.lots.length === 0 : detail.lots.length === 1
        && detail.lots[0].location === setup.location && detail.lots[0].physical === quantity && detail.lots[0].available === quantity
        && detail.lots[0].reserved === 0 && detail.lots[0].lot === null && detail.lots[0].serial === null && detail.lots[0].expiry === null),
        "FAIL: exact explicit-location stock position")
      return { detail, list }
    }
    phase = "baseline"; await stock(0, 0)
    phase = "native-create"
    await page.getByRole("button", { name: "Nueva OC", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "Nueva Orden de Compra", exact: true })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("combobox").first().click()
    await page.getByRole("option", { name: setup.supplier.name, exact: true }).click()
    await dialog.getByRole("combobox").nth(1).click()
    await page.getByRole("option", { name: `${setup.article.code} — ${setup.article.name}`, exact: true }).click()
    await dialog.getByRole("spinbutton").nth(0).fill("4")
    await dialog.getByRole("spinbutton").nth(1).fill("10")
    check(!violation, "BLOCKED: precreation traffic")
    permit = "create"
    const creation = page.waitForResponse(r => r.url() === `${setup.baseURL}${orders}` && r.request().method() === "POST")
    await dialog.getByRole("button", { name: "Crear OC", exact: true }).click()
    const creationResponse = await creation
    const creationBody = await json(creationResponse)
    const created = creationBody?.data
    id = typeof created?.id === "string" ? created.id : ""
    itemId = typeof created?.items?.[0]?.id === "string" ? created.items[0].id : ""
    // Durable recovery evidence BEFORE assertions; never recreate after failure.
    await save("created", { result: "CREATED_NOT_YET_VALIDATED", companyId: company, marker, createdId: id, itemId,
      articleId: setup.article.id, status: creationResponse.status() })
    check(creationResponse.ok() && cuid.test(id) && cuid.test(itemId), "FAIL: native creation/OC/item CUID identities")
    assertOrder(await getOrder(), "Borrador", 0)
    await expect(dialog).toBeHidden()
    const row = () => page.getByRole("row").filter({ has: page.getByText(id, { exact: true }) })
    const action = async (label: string, endpoint: "emitir" | "enviar" | "recibir", quantity?: number) => {
      check(!violation, "BLOCKED: native-action tripwire")
      await expect(row()).toHaveCount(1)
      await row().locator('button[aria-haspopup="menu"]').click()
      const menu = page.getByRole("menuitem", { name: label, exact: true })
      await expect(menu).toHaveCount(1)
      if (quantity !== undefined) {
        await menu.click()
        const receipt = page.getByRole("dialog", { name: "Registrar recepción", exact: true })
        await expect(receipt.getByText(`Pendiente: ${quantity === 1 ? 4 : 3} de 4`, { exact: true })).toBeVisible()
        await receipt.getByLabel("Destino del stock", { exact: true }).fill(setup.location)
        await receipt.getByRole("spinbutton", { name: `Recibir ${setup.article.name}`, exact: true }).fill(String(quantity))
        expectedQuantity = quantity; permit = endpoint
        const pending = page.waitForResponse(r => r.url() === `${setup.baseURL}${orders}/${id}/recibir` && r.request().method() === "POST")
        await receipt.getByRole("button", { name: "Registrar recepción", exact: true }).click()
        const response = await pending, body = await json(response)
        // OC POST returns OC, not Receipt. Retain only safe native intent and response IDs/state.
        await save(`native-${writes.recibir}`, { companyId: company, marker, createdId: id, itemId,
          intent: intents[intents.length - 1], response: { status: response.status(), id: body?.data?.id, state: body?.data?.state,
            items: body?.data?.items?.map((i: any) => ({ id: i.id, stockItemId: i.stockItemId, received: i.received })) } })
        check(response.status() === 200 && body?.data?.id === id, "FAIL: native receipt response")
        await expect(receipt).toBeHidden()
      } else {
        permit = endpoint
        const pending = page.waitForResponse(r => r.url() === `${setup.baseURL}${orders}/${id}/${endpoint}` && r.request().method() === "POST")
        await menu.click(); await decode(await pending)
      }
    }
    phase = "emitir"; await action("Emitir", "emitir"); assertOrder(await getOrder(), "Emitida", 0)
    await expect(row().getByText("Emitida", { exact: true })).toBeVisible()
    phase = "enviar"; await action("Marcar enviada", "enviar"); assertOrder(await getOrder(), "Enviada", 0)
    await expect(row().getByText("Enviada", { exact: true })).toBeVisible()
    await stock(0, 0)
    const crosslink = async (detail: any, intent: Intent, quantity: number) => {
      const candidates = detail.movements.filter((m: any) => m.qty === quantity)
      check(candidates.length === 1, "FAIL: exact delta movement")
      const movement = candidates[0]
      check(cuid.test(movement.id) && cuid.test(movement.receiptId) && cuid.test(movement.receiptLineId)
        && movement.movementType === "RECEIPT_IN" && movement.location === setup.location && movement.createdById === me.user.id
        && movement.lot === null && movement.serial === null && movement.expiry === null
        && movement.idempotencyKey === `receipt:${movement.receiptId}:line:${movement.receiptLineId}`, "FAIL: canonical stock origin/actor")
      receiptIds.add(movement.receiptId); movementIds.add(movement.id)
      const receipt = await get(`${prefix}/receipts/${movement.receiptId}`)
      // Save canonical IDs immediately before strict Receipt assertions.
      await save(`receipt-${quantity}`, { companyId: company, marker, createdId: id, itemId, articleId: setup.article.id,
        receiptId: movement.receiptId, receiptLineId: movement.receiptLineId, movementId: movement.id,
        operationKey: intent.operationKey, location: intent.location })
      const line = receipt.lines?.[0]
      check(receipt.id === movement.receiptId && receipt.companyId === company && receipt.status === "CONFIRMED"
        && receipt.documentReference === id && receipt.supplierId === setup.supplier.id && receipt.confirmedById === me.user.id
        && receipt.idempotencyKey === `oc:${encodeURIComponent(id)}:operation:${encodeURIComponent(intent.operationKey)}`
        && receipt.lines.length === 1 && line.id === movement.receiptLineId && line.articleId === setup.article.id
        && line.expectedCode === setup.article.code && Number(line.receivedQuantity) === quantity, "FAIL: Receipt-line/OC/SKU/actor crosslink")
      const audits = await get(auditPath("OrdenCompra", id))
      check(Array.isArray(audits) && audits.some((a: any) => a.action === "orden_compra_recibida" && a.userId === me.user.id
        && a.newValue?.receiptId === receipt.id && a.newValue?.operationKey === intent.operationKey
        && a.newValue?.location === setup.location && a.newValue?.items?.some((i: any) => i.ordenCompraItemId === itemId && i.articleId === setup.article.id)),
        "FAIL: OC receipt audit pointers")
      return receipt
    }
    const snapshot = async (quantity: number, count: number) => {
      const physical = await stock(quantity, count)
      const receipts: unknown[] = [], audits: unknown[] = []
      for (const receiptId of [...receiptIds].sort()) {
        receipts.push(await get(`${prefix}/receipts/${receiptId}`))
        audits.push(await get(auditPath("Receipt", receiptId)))
      }
      for (const movementId of [...movementIds].sort()) audits.push(await get(auditPath("StockMovement", movementId)))
      return { order: await getOrder(), ...physical, receipts, audits, orderAudits: await get(auditPath("OrdenCompra", id)) }
    }
    const direct = async (kind: "replayK1" | "conflictK1" | "overflow" | "replayK2Full" | "replayK1Full", quantity: number, count: number) => {
      check(!violation && cuid.test(id) && cuid.test(itemId) && writes[kind] === 0 && intents.length === (count === 1 ? 1 : 2), "BLOCKED: direct mutation counter")
      const before = await snapshot(quantity, count)
      const payload: Intent = JSON.parse(JSON.stringify(kind === "replayK2Full" ? intents[1] : intents[0]))
      if (kind === "conflictK1") payload.receivedByItem[0].received = "2"
      if (kind === "overflow") { payload.operationKey = `${helper.namespace}${randomUUID()}`; payload.receivedByItem[0].received = "4" }
      check(payload.location === setup.location && payload.receivedByItem.length === 1 && payload.receivedByItem[0].itemId === itemId,
        "BLOCKED: direct intent ownership")
      writes[kind]++
      const response = await context.request.post(`${setup.baseURL}${orders}/${id}/recibir`, {
        headers: { Authorization: bearer }, data: payload, maxRedirects: 0, timeout: 15_000,
      })
      const body = await json(response)
      if (kind === "conflictK1" || kind === "overflow") check(response.status() === 409
        && body?.error?.code === (kind === "conflictK1" ? "orden_compra_receipt_conflict" : "orden_compra_invalid_receipt"), "FAIL: exact negative receipt contract")
      else check(response.status() === 200 && same(body?.data, before.order), "FAIL: accepted replay response")
      check(same(before, await snapshot(quantity, count)), "FAIL: replay/rejection changed OC/Receipt/movement/audit/stock pointers")
    }
    phase = "partial"; await action("Registrar recepción", "recibir", 1)
    assertOrder(await getOrder(), "Parcialmente_recibida", 1)
    const first = await stock(1, 1); const firstReceipt = await crosslink(first.detail, intents[0], 1)
    phase = "replay-partial"; await direct("replayK1", 1, 1)
    phase = "conflict"; await direct("conflictK1", 1, 1)
    phase = "overflow"; await direct("overflow", 1, 1)
    phase = "full"; await action("Registrar recepción", "recibir", 3)
    check(intents.length === 2 && intents[0].operationKey !== intents[1].operationKey && intents[1].location === intents[0].location, "FAIL: fresh K2/same location")
    assertOrder(await getOrder(), "Recibida", 4)
    const full = await stock(4, 2); await crosslink(full.detail, intents[1], 3)
    check(receiptIds.size === 2 && movementIds.size === 2
      && same(full.detail.movements.find((m: any) => m.id === first.detail.movements[0].id), first.detail.movements[0])
      && same(await get(`${prefix}/receipts/${firstReceipt.id}`), firstReceipt), "FAIL: distinct receipts/movements and immutable first origin")
    phase = "replay-full"; await direct("replayK2Full", 4, 2); await direct("replayK1Full", 4, 2)
    phase = "reload"; const beforeReload = await snapshot(4, 2)
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(row().getByText("Recibida", { exact: true })).toBeVisible()
    check(same(beforeReload, await snapshot(4, 2)), "FAIL: persisted reload")
    phase = "stock-ui"
    await page.goto("/stock", { waitUntil: "domcontentloaded" })
    await page.getByRole("textbox", { name: "Buscar artículo", exact: true }).fill(setup.article.code)
    const stockTable = page.getByRole("table", { name: "Catálogo de stock", exact: true })
    const stockRow = stockTable.getByRole("row").filter({ has: page.getByText(setup.article.code, { exact: true }) })
    await expect(stockRow).toHaveCount(1)
    await expect(stockRow.getByText(setup.article.name, { exact: true })).toBeVisible()
    const availableColumn = (await stockTable.getByRole("columnheader").allTextContents()).findIndex(text => text.trim() === "Disponible")
    if (availableColumn >= 0) await expect(stockRow.getByRole("cell").nth(availableColumn)).toHaveText("4")
    check(!violation && Object.entries(writes).every(([key, value]) => value === (key === "recibir" ? 2 : 1)), "FAIL: bounded mutation totals")
    check(same(beforeReload, await snapshot(4, 2)), "FAIL: GET-only stock UI changed readbacks")
    await save("result", { result: "PASS", companyId: company, marker, createdId: id, itemId, articleId: setup.article.id, writes,
      receiptIds: [...receiptIds], movementIds: [...movementIds], physical: 4, available: 4, position: 4, deltas: [1, 3],
      policy: "NONE", canonicalOriginVerified: true, auditPointersVerified: true, reloadVerified: true, nativeStockListVerified: true,
      nativeStockAvailabilityVisible: availableColumn >= 0 })
  } catch (error) {
    await save("stopped", { result: error instanceof Error && error.message === expired ? "EXPIRED" : id ? "FAIL" : "BLOCKED",
      phase, companyId: company, marker, createdId: id, itemId, writes, guardTripped: violation }).catch(() => {})
    testInfo.annotations.push({ type: "process", description: `Stopped at ${phase}; guard=${violation}; creation retained` })
    if (error instanceof Error && error.message === expired) throw new Error(expired)
    // Do not publish raw assertions, bearer headers, supplier names or API bodies.
    throw new Error(`${id ? "FAIL" : "BLOCKED"}: NEW-stock process at ${phase}; inspect private JSON; no retry/cleanup`)
  } finally { bearer = ""; await browser?.close() }
})
