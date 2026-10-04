import { test, expect, type APIResponse, type Response } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

// OC-TRACKED-RECEIPT-DEV-001: QA author, host-configured model.
// Exclusive source scope: this spec, playwright.compras-tracked.config.ts,
// scripts/qa/run-compras-tracked-process.mjs. Coordinator owns live execution.
const company = "codevdistricorr1000000000"
const base = `/api/companies/${company}`
const ordersPath = `${base}/ordenes-compra`
const expired = "E2E blocked by expired authentication state"
const cuid = /^c[a-z0-9]{24}$/
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
// Stable object-key comparison; array order remains significant in persisted snapshots.
const stable = (value: any): string => JSON.stringify(value, (_key, v) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v)
const same = (a: unknown, b: unknown) => stable(a) === stable(b)
type Allocation = { quantity: string; lotCode?: string; serialNumber?: string; expirationDate?: string }
type Intent = { operationKey: string; location: string; receivedByItem: { itemId: string; received: string; allocations: Allocation[] }[] }
type Article = { id: string; code: string; name: string; policy: string; allocations: Allocation[] }
type OwnedOrder = { id: string; items: any[]; articles: Article[] }

test("FRESH tracked native receipt: expired advisory/audit, canonical origins, replay/conflict, cross-article serial rollback and isolated race", async ({ playwright }, testInfo) => {
  // Dynamic imports inside callback only: --list never reads env/session/fixtures.
  const importJS = new Function("url", "return import(url)")
  const helper = await importJS(pathToFileURL(path.resolve(__dirname, "../scripts/qa/run-compras-tracked-process.mjs")).href)
  const sessionHelper = await importJS(pathToFileURL(path.resolve(__dirname, "../scripts/qa/dev-session.mjs")).href)
  const setup = helper.configuration()
   const marker = setup.resume?.marker ?? `${helper.namespace}${randomUUID()}`
   const evidencePrefix = setup.resume ? `${marker}-resume-${randomUUID()}` : marker
  const location = `${marker}-DEST`
  const articles: Article[] = [], ownedOrders: OwnedOrder[] = []
  const receiptIds = new Set<string>(), movementIds = new Set<string>(), unitIds = new Set<string>()
  const writes: Record<string, number> = {}
  let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let bearer = "", phase = "preflight", mutationStarted = false, violation = false, authBlocked = false, budgetExpired = false
  let nativePermit: { order: OwnedOrder; expected: Omit<Intent, "operationKey"> } | undefined
  let nativeIntent: Intent | undefined
  const save = (suffix: string, value: unknown) => writeFile(path.join(setup.artifacts, `${evidencePrefix}-${suffix}.json`), JSON.stringify(value), { flag: "wx", mode: 0o600 })
  const manifest = () => ({ task: helper.task, companyId: company, marker, location, writes,
    articles: articles.map(({ id, code, policy }) => ({ id, code, policy })),
    orders: ownedOrders.map(o => ({ id: o.id, itemIds: o.items.map(i => i.id), articleIds: o.articles.map(a => a.id) })),
    receiptIds: [...receiptIds], movementIds: [...movementIds], unitIds: [...unitIds] })
  try {
    browser = await playwright.chromium.launch({ timeout: 30_000 })
    timer = setTimeout(() => { budgetExpired = true; void browser?.close().catch(() => {}) }, 18 * 60_000)
    const context = await browser.newContext({ baseURL: setup.baseURL, storageState: setup.state,
      viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" })
    const alive = () => check(!violation && !authBlocked && !budgetExpired, authBlocked ? expired : "BLOCKED: traffic/budget guard")
    const auditPath = (type: string, id: string) => `${base}/audit-events?entityType=${type}&entityId=${encodeURIComponent(id)}&take=100`
    const readAllowed = (url: URL) => {
      if (url.origin !== setup.baseURL || url.hash) return false
      const p = url.pathname
      if (!p.startsWith("/api/")) return ["/compras/ordenes-compra", "/favicon.ico"].includes(p)
        || p.startsWith("/_next/") || /\.(?:svg|png|jpg|jpeg|webp|ico|woff2?|css|js)$/i.test(p)
      if ([`${base}/me`, "/api/me/companies", `${base}/notifications`, `${base}/notifications/unread-count`,
        `${base}/contacts`, `${base}/articles`, ordersPath, `${base}/stock/physical-units`].includes(p)) return true
      if (p === `${base}/articles/${setup.article.id}` || articles.some(a => p === `${base}/articles/${a.id}` || p === `${base}/stock/${a.id}`)) return true
      if ([...receiptIds].some(id => p === `${base}/receipts/${id}`)) return true
      const type = url.searchParams.get("entityType"), id = url.searchParams.get("entityId") || ""
      return p === `${base}/audit-events` && url.searchParams.get("take") === "100"
        && (type === "OrdenCompra" && ownedOrders.some(o => o.id === id) || type === "Receipt" && receiptIds.has(id)
          || type === "StockMovement" && movementIds.has(id) || type === "StockPhysicalUnit" && unitIds.has(id))
    }
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url())
      let allowed = !violation && !authBlocked && !budgetExpired && request.method() === "GET" && readAllowed(url)
      if (nativePermit && !violation && !authBlocked && !budgetExpired && request.method() === "POST"
        && url.origin === setup.baseURL && !url.search && !url.hash && url.pathname === `${ordersPath}/${nativePermit.order.id}/recibir`) {
        try {
          const body = request.postDataJSON()
          allowed = Object.keys(body).sort().join(",") === "location,operationKey,receivedByItem"
            && typeof body.operationKey === "string" && body.operationKey.trim() === body.operationKey && body.operationKey.length > 0 && body.operationKey.length <= 128
            && same({ location: body.location, receivedByItem: body.receivedByItem }, nativePermit.expected)
          if (allowed) {
            nativeIntent = structuredClone(body)
            await save("native-intent-attempt", { ...manifest(), intent: nativeIntent, result: "FROZEN_BEFORE_POST" })
            writes.nativeReceipt = (writes.nativeReceipt || 0) + 1; nativePermit = undefined; mutationStarted = true
          }
        } catch { allowed = false }
      }
      if (!allowed) { violation = true; await route.abort("blockedbyclient"); return }
      await route.continue()
    })
    await context.routeWebSocket("**/*", socket => {
      const url = new URL(socket.url()), local = new URL(setup.baseURL); local.protocol = "ws:"
      if (!violation && url.origin === local.origin && !url.hash && ["/_next/hmr", "/_next/webpack-hmr"].includes(url.pathname)) socket.connectToServer()
      else { violation = true; socket.close() }
    })
    context.on("response", response => { if (new URL(response.url()).pathname.startsWith("/api/") && response.status() === 401) authBlocked = true })
    const json = async (response: APIResponse | Response) => {
      if (response.status() === 401) { authBlocked = true; throw new Error(expired) }
      const body = await response.json()
      if (body?.error?.code === "invalid_auth_token") { authBlocked = true; throw new Error(expired) }
      return body
    }
    const decode = async (response: APIResponse | Response) => {
      const body = await json(response)
      check(response.ok() && body && Object.hasOwn(body, "data"), "FAIL: backend envelope/status")
      return body.data
    }
    const page = await context.newPage()
    page.setDefaultTimeout(15_000); page.setDefaultNavigationTimeout(45_000)
    const [membership] = await Promise.all([
      page.waitForResponse(r => r.url() === `${setup.baseURL}${base}/me` && r.request().method() === "GET", { timeout: 45_000 }),
      page.goto("/compras/ordenes-compra", { waitUntil: "domcontentloaded" }),
    ]).catch(async () => {
      const verdict = await page.evaluate(sessionHelper.storedSessionVerdict).catch(() => "blocked")
      throw new Error(verdict === "expired" ? expired : "BLOCKED: authenticated company preflight unavailable")
    })
    bearer = await membership.request().headerValue("authorization") || ""
    const me = await decode(membership)
    check(membership.status() === 200 && /^Bearer \S+$/.test(bearer) && me.activeCompany?.id === company
      && me.user?.id === setup.actorId && me.access?.role === "admin", "BLOCKED: exact company/actor/admin fixture permission")
    const get = async (pathname: string) => {
      alive(); check(readAllowed(new URL(`${setup.baseURL}${pathname}`)), "BLOCKED: direct GET allowlist")
      return decode(await context.request.get(`${setup.baseURL}${pathname}`, { headers: { Authorization: bearer }, maxRedirects: 0, timeout: 45_000 }))
    }
    // Direct requests bypass context.route. Closed creation/transition sets and owned
    // receipt payloads below are enforced here, with per-action single-use counters.
    const post = async (key: string, pathname: string, data?: unknown) => {
      alive(); check(!writes[key], "BLOCKED: duplicate mutation attempt")
      check(pathname === `${base}/articles` && key.startsWith("article-") && articles.length < 5
        || pathname === ordersPath && key.startsWith("order-") && ownedOrders.length < 4
        || ownedOrders.some(o => ["emitir", "enviar"].some(action => pathname === `${ordersPath}/${o.id}/${action}` && key === `${action}-${o.id}`)), "BLOCKED: direct creation/transition ownership")
      writes[key] = 1; mutationStarted = true
      return context.request.post(`${setup.baseURL}${pathname}`, { headers: { Authorization: bearer }, ...(data === undefined ? {} : { data }), maxRedirects: 0, timeout: 15_000 })
    }
    const receive = async (order: OwnedOrder, key: string, intent: Intent) => {
      alive(); check(ownedOrders.includes(order) && !writes[key] && intent.location === location && intent.operationKey.length <= 128
        && intent.receivedByItem.length > 0 && intent.receivedByItem.length <= 2
        && intent.receivedByItem.every(row => order.items.some(i => i.id === row.itemId) && row.allocations.length > 0 && row.allocations.length <= 2
          && row.allocations.every(a => Object.keys(a).every(k => ["quantity", "lotCode", "serialNumber", "expirationDate"].includes(k))
            && (!a.lotCode || a.lotCode.trim().startsWith(marker)) && (!a.serialNumber || a.serialNumber.trim().startsWith(marker)))), "BLOCKED: direct receipt ownership/bounds")
      writes[key] = 1; mutationStarted = true
      return context.request.post(`${setup.baseURL}${ordersPath}/${order.id}/recibir`, { headers: { Authorization: bearer }, data: intent, maxRedirects: 0, timeout: 15_000 })
    }
    phase = "supplier-and-readback-preflight"
    const contacts = await get(`${base}/contacts?role=proveedor&isActive=true&search=${encodeURIComponent(setup.supplier.code)}&take=20`)
    const suppliers = Array.isArray(contacts) ? contacts.filter((s: any) => s.id === setup.supplier.id && s.code === setup.supplier.code) : []
    const supplier = suppliers[0]
    const name = supplier && (supplier.tradeName?.trim() || supplier.legalName?.trim() || `${supplier.firstName || ""} ${supplier.lastName || ""}`.trim())
    check(suppliers.length === 1 && supplier.isActive && supplier.linkIsActive && supplier.roles?.includes("proveedor")
      && supplier.email === setup.supplier.email && name === setup.supplier.name, "BLOCKED: independently verified synthetic supplier")
    phase = "seed-readback-preflight"
    const seed = await get(`${base}/articles/${setup.article.id}`)
    check(seed.sku === setup.article.code && seed.description === setup.article.name && seed.tracePolicies?.[0]?.policy === "NONE"
      && seed.stockEligibilities?.some((e: any) => e.companyId === company), "BLOCKED: existing read-only fixture proof")
    const records = async () => {
      // The route returns at most 100 company-wide orders; filter owned IDs after readback.
      const rows = await get(ordersPath)
      check(Array.isArray(rows) && rows.length < 100, "BLOCKED: OC readback truncated")
      return rows
    }
    const notices = async () => {
      const result = await get(`${base}/notifications?category=stock&take=100`)
      check(Array.isArray(result.items) && Number.isInteger(result.totalCount) && result.totalCount <= 100
        && result.items.length === result.totalCount, "BLOCKED: recipient notice readback truncated/unavailable")
      return result.items.filter((n: any) => receiptIds.has(n.sourceEntityId))
    }
    const identities = async () => {
      const rows = await get(`${base}/stock/physical-units`)
      check(Array.isArray(rows), "BLOCKED: physical identity readback unavailable")
      return rows.filter((u: any) => typeof u.serialNumber === "string" && u.serialNumber.startsWith(marker)
        || setup.resume?.articles.some((a: any) => a.id === u.articleId)).sort((a: any, b: any) => a.id.localeCompare(b.id))
    }
    phase = "orders-readback-preflight"
    const beforeOrders = await records()
    await save("preflight-orders", { result: "READ_ONLY", orderCount: beforeOrders.length, cap: 100, newOrderLimit: 4 })
    phase = "identities-readback-preflight"
    const beforeIdentities = await identities()
    await save("preflight-identities", { result: "READ_ONLY", identityCount: beforeIdentities.length })
    check(beforeOrders.length <= 90 && beforeIdentities.length === 0, "BLOCKED: bounded fresh namespace")
    phase = "notices-readback-preflight"
    await notices() // Endpoint/complete recipient collection checked BEFORE business writes.
    phase = "catalog-readback-preflight"
    const catalog = await get(`${base}/articles?q=${encodeURIComponent(marker)}&take=100`)
    check(Array.isArray(catalog) && (setup.resume
      ? catalog.length === 5 && catalog.every((a: any) => setup.resume.articles.some((owned: any) => owned.id === a.id && owned.code === a.sku))
      : catalog.length === 0), "BLOCKED: namespace ownership")
    const past = "2000-01-01", future = "2099-12-31"
    const definitions = [
      { policy: "LOT_EXPIRY", allocations: [{ quantity: "1", lotCode: `${marker}-L1`, expirationDate: past }, { quantity: "1", lotCode: `${marker}-L2`, expirationDate: future }] },
      { policy: "LOT_SERIAL_EXPIRY", allocations: [{ quantity: "1", lotCode: `${marker}-C1`, serialNumber: `${marker}-S1`, expirationDate: past }, { quantity: "1", lotCode: `${marker}-C2`, serialNumber: `${marker}-S2`, expirationDate: future }] },
      { policy: "SERIAL", allocations: [{ quantity: "1", serialNumber: `${marker}-S1` }] },
      { policy: "SERIAL", allocations: [{ quantity: "1", serialNumber: `${marker}-RACE` }] },
      { policy: "SERIAL", allocations: [{ quantity: "1", serialNumber: `${marker}-RACE` }] },
    ]
    await save("plan", { ...manifest(), result: "PREFLIGHT_OK_NO_WRITES", fixturePlan: definitions,
      limits: { articles: 5, orders: 4, nativeReceipts: 1, raceRequests: 2 }, cleanup: false })
    phase = "fresh-articles"
    for (const [index, definition] of definitions.entries()) {
      const code = `${marker}-A${index}`, name = `000 ${code}`
      const response = setup.resume ? null : await post(`article-${index}`, `${base}/articles`, { sku: code, description: name, unit: "u", traceabilityPolicy: definition.policy })
      const result = response ? await json(response) : { data: setup.resume.articles[index] }
      const article: Article = { id: result.data?.id || "", code, name, ...definition }
      articles.push(article)
      await save(`article-${index}`, { ...manifest(), status: response?.status() ?? "RESUME_READ_ONLY" })
      check((!response || response.status() === 201) && cuid.test(article.id), "FAIL: fresh article identity")
      const read = await get(`${base}/articles/${article.id}`)
      check(read.isActive && read.sku === code && read.description === name && read.tracePolicies?.[0]?.policy === definition.policy
        && read.stockEligibilities?.some((e: any) => e.companyId === company), "FAIL: fresh authoritative article policy/eligibility")
      const stock = await get(`${base}/stock/${article.id}`)
      check(stock.summary?.physical === 0 && stock.movements?.length === 0 && stock.lots?.length === 0, "FAIL: fresh empty stock baseline")
    }
    phase = "fresh-orders"
    for (const [index, group] of [[articles[0], articles[1]], [articles[2]], [articles[3]], [articles[4]]].entries()) {
      const response = setup.resume ? null : await post(`order-${index}`, ordersPath, { proveedorId: setup.supplier.id, proveedorName: setup.supplier.name,
        items: group.map(a => ({ stockItemId: a.id, name: a.name, code: a.code, quantity: String(a.allocations.length), unitPrice: "10" })) })
      const body = response ? await json(response) : { data: beforeOrders.find((o: any) => o.id === setup.resume.orders[index].id) }
      const order = { id: body.data?.id || "", items: body.data?.items || [], articles: group }
      if (setup.resume) check(body.data?.companyId === company && body.data?.proveedorId === setup.supplier.id && body.data?.state === "Enviada"
        && order.items.every((i: any) => Number(i.received) === 0 && group.some(a => a.id === i.stockItemId && Number(i.quantity) === a.allocations.length))
        && same(order.items.map((i: any) => i.id).sort(), [...setup.resume.orders[index].itemIds].sort()), "BLOCKED: resumed exact untouched OC")
      ownedOrders.push(order)
      await save(`order-${index}`, { ...manifest(), status: response?.status() ?? "RESUME_READ_ONLY" })
      check((!response || response.status() === 201) && cuid.test(order.id) && order.items.length === group.length
        && new Set(order.items.map((i: any) => i.id)).size === order.items.length
        && same(order.items.map((i: any) => i.stockItemId).sort(), group.map(a => a.id).sort())
        && order.items.every((i: any) => cuid.test(i.id) && group.some(a => a.id === i.stockItemId && a.code === i.code && a.name === i.name)), "FAIL: fresh OC/item identities")
      if (!setup.resume) for (const action of ["emitir", "enviar"]) await decode(await post(`${action}-${order.id}`, `${ordersPath}/${order.id}/${action}`))
    }
    const main = ownedOrders[0]
    const orderRead = async (order: OwnedOrder) => {
      const matches = (await records()).filter((o: any) => o.id === order.id)
      check(matches.length === 1 && matches[0].companyId === company && matches[0].proveedorId === setup.supplier.id, "FAIL: exact owned order readback")
      return matches[0]
    }
    const payload = (order: OwnedOrder): Intent => ({ operationKey: `${marker}-${randomUUID()}`, location,
      receivedByItem: order.items.map(i => { const a = order.articles.find(a => a.id === i.stockItemId)!;
        return { itemId: i.id, received: String(a.allocations.length), allocations: structuredClone(a.allocations) } }) })
    const snapshot = async () => {
      const stock: any[] = []
      for (const a of articles) stock.push(await get(`${base}/stock/${a.id}`))
      const identitiesRead = await identities()
      for (const u of identitiesRead) unitIds.add(u.id)
      const receipts: any[] = [], audits: any[] = []
      for (const id of [...receiptIds].sort()) { receipts.push(await get(`${base}/receipts/${id}`)); audits.push(await get(auditPath("Receipt", id))) }
      for (const id of [...movementIds].sort()) audits.push(await get(auditPath("StockMovement", id)))
      for (const id of [...unitIds].sort()) audits.push(await get(auditPath("StockPhysicalUnit", id)))
      for (const o of ownedOrders) audits.push(await get(auditPath("OrdenCompra", o.id)))
      check(audits.every(a => Array.isArray(a) && a.length < 100), "BLOCKED: audit readback truncation")
      return { orders: await Promise.all(ownedOrders.map(orderRead)), stock, identities: identitiesRead, receipts, audits,
        notices: (await notices()).sort((a: any, b: any) => a.id.localeCompare(b.id)) }
    }
    const rejectUnchanged = async (order: OwnedOrder, key: string, intent: Intent, status: number, code?: string) => {
      const before = await snapshot(), response = await receive(order, key, intent), body = await json(response)
      check(response.status() === status && body?.error && (!code || body.error.code === code), `FAIL: ${key} rejection contract`)
      check(same(before, await snapshot()), `FAIL: ${key} changed OC/stock/receipt/identity/audit/notice snapshot`)
      await save(`check-${key}`, { ...manifest(), result: "PASS", status, unchanged: true })
    }
    phase = "strict-date-api"
    for (const [index, date] of ["2026-02-30", "2026-2-03", "0000-01-01", "2026-01-01T00:00:00Z"].entries()) {
      const intent = payload(main); intent.receivedByItem[0].allocations[0].expirationDate = date
      await rejectUnchanged(main, `invalid-date-${index}`, intent, 400, "validation_failed")
    }
    phase = "native-tracked-dialog"
    await page.reload({ waitUntil: "domcontentloaded" })
    const row = () => page.getByRole("row").filter({ has: page.getByText(main.id, { exact: true }) })
    await expect(row()).toHaveCount(1)
    await row().locator('button[aria-haspopup="menu"]').click()
    await page.getByRole("menuitem", { name: "Registrar recepción", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "Registrar recepción", exact: true })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel("Destino del stock", { exact: true }).fill(location)
    for (const item of main.items) {
      const a = main.articles.find(a => a.id === item.stockItemId)!
      for (const [index, allocation] of a.allocations.entries()) {
        await dialog.getByRole("button", { name: `Agregar asignación de ${a.name}`, exact: true }).click()
        const block = dialog.getByTestId(`receipt-allocation-${item.id}-${index}`)
        const quantity = block.getByLabel(`Cantidad — ${a.name}, asignación ${index + 1}`, { exact: true })
        if (a.policy.includes("SERIAL")) { await expect(quantity).toHaveValue("1"); await expect(quantity).toHaveAttribute("readonly", "") }
        else await quantity.fill(allocation.quantity)
        if (allocation.lotCode) await block.getByLabel(`Lote — ${a.name}, asignación ${index + 1}`, { exact: true }).fill(allocation.lotCode)
        if (allocation.serialNumber) await block.getByLabel(`Número de serie — ${a.name}, asignación ${index + 1}`, { exact: true }).fill(allocation.serialNumber)
        if (allocation.expirationDate) await block.getByLabel(`Vencimiento — ${a.name}, asignación ${index + 1}`, { exact: true }).fill(allocation.expirationDate)
      }
      await expect(dialog.getByRole("spinbutton", { name: `Recibir ${a.name}`, exact: true })).toHaveValue("2")
    }
    const firstArticle = main.articles.find(a => a.policy === "LOT_EXPIRY")!
    const dateInput = dialog.getByLabel(`Vencimiento — ${firstArticle.name}, asignación 1`, { exact: true })
    await dateInput.fill("")
    const beforeInvalidUI = await snapshot()
    await dialog.getByRole("button", { name: "Registrar recepción", exact: true }).click()
    await expect(dialog.getByText("Completá cada asignación con cantidad positiva y lote, serie o fecha válida según la política del artículo.", { exact: true })).toBeVisible()
    check(!nativeIntent && !writes.nativeReceipt && same(beforeInvalidUI, await snapshot()), "FAIL: invalid native date emitted writes")
    await dateInput.fill(past)
    await expect(dialog.getByRole("alert").filter({ hasText: "Material vencido: la recepción se registrará y generará un aviso" })).toHaveCount(2)
    const expected = payload(main)
    nativePermit = { order: main, expected: { location, receivedByItem: expected.receivedByItem } }
    const pending = page.waitForResponse(r => r.url() === `${setup.baseURL}${ordersPath}/${main.id}/recibir` && r.request().method() === "POST")
    await dialog.getByRole("button", { name: "Registrar recepción", exact: true }).click()
    const response = await pending, responseBody = await json(response)
    await save("native-response", { ...manifest(), status: response.status(), errorCode: responseBody?.error?.code,
      hasData: Object.hasOwn(responseBody ?? {}, "data"), state: responseBody?.data?.state, warningCount: responseBody?.data?.receiptWarnings?.length })
    const accepted = await decode(response)
    await save("native-intent", { ...manifest(), intent: nativeIntent, status: response.status() })
    const submittedIntent = nativeIntent as Intent | undefined
    check(response.status() === 200 && submittedIntent && accepted.id === main.id && accepted.state === "Recibida"
      && accepted.items.every((i: any) => Number(i.received) === 2) && accepted.receiptWarnings?.length === 2, "FAIL: native expired acceptance")
    await expect(dialog).toBeHidden()
    await expect(page.getByText("Material vencido: la recepción se registró y generó un aviso", { exact: true })).toBeVisible()
    const canonical = async (order: OwnedOrder, intent: Intent) => {
      const units = await identities()
      const discoveredReceipts = new Set<string>()
      for (const article of order.articles) {
        const detail = await get(`${base}/stock/${article.id}`)
        const total = article.allocations.reduce((n, a) => n + Number(a.quantity), 0)
        check(detail.summary?.physical === total && detail.summary.available === total && detail.summary.reserved === 0 && detail.summary.inTransit === 0
          && detail.movements?.length === article.allocations.length && detail.lots?.length === article.allocations.length, "FAIL: canonical physical/position totals")
        for (const allocation of article.allocations) {
          const matches = detail.movements.filter((m: any) => m.lot === (allocation.lotCode || null) && m.serial === (allocation.serialNumber || null)
            && (m.expiry?.slice(0, 10) || null) === (allocation.expirationDate || null))
          check(matches.length === 1, "FAIL: exact canonical traced movement")
          const m = matches[0]
          check(cuid.test(m.id) && cuid.test(m.receiptId) && cuid.test(m.receiptLineId) && m.qty === Number(allocation.quantity)
            && m.movementType === "RECEIPT_IN" && m.location === location && m.createdById === me.user.id
            && m.idempotencyKey === `receipt:${m.receiptId}:line:${m.receiptLineId}`, "FAIL: movement origin/location/actor")
          movementIds.add(m.id); receiptIds.add(m.receiptId); discoveredReceipts.add(m.receiptId)
          const positions = detail.lots.filter((p: any) => p.lot === m.lot && p.serial === m.serial && (p.expiry?.slice(0, 10) || null) === (allocation.expirationDate || null))
          check(positions.length === 1 && positions[0].location === location && positions[0].physical === Number(allocation.quantity)
            && positions[0].available === Number(allocation.quantity) && positions[0].reserved === 0, "FAIL: traced explicit-location position")
          const receipt = await get(`${base}/receipts/${m.receiptId}`), line = receipt.lines.find((l: any) => l.id === m.receiptLineId)
          check(receipt.companyId === company && receipt.status === "CONFIRMED" && receipt.documentReference === order.id
            && receipt.supplierId === setup.supplier.id && receipt.confirmedById === me.user.id
            && receipt.idempotencyKey === `oc:${encodeURIComponent(order.id)}:operation:${encodeURIComponent(intent.operationKey)}`
            && line?.articleId === article.id && line.expectedCode === article.code && Number(line.receivedQuantity) === Number(allocation.quantity)
            && line.lotCode === m.lot && line.serialNumber === m.serial && (line.expirationDate?.slice(0, 10) || null) === (allocation.expirationDate || null), "FAIL: canonical ReceiptLine trace/actor/OC links")
          const ocAudits = await get(auditPath("OrdenCompra", order.id))
          const origin = ocAudits.filter((a: any) => a.action === "orden_compra_recibida" && a.newValue?.receiptId === receipt.id)
          check(origin.length === 1 && origin[0].userId === me.user.id && origin[0].newValue.operationKey === intent.operationKey
            && origin[0].newValue.location === location, "FAIL: receipt audit origin")
          const item = order.items.find(i => i.stockItemId === article.id)
          const trace = origin[0].newValue.allocations?.find((a: any) => a.lineNumber === line.lineNumber && a.articleId === article.id)
          check(trace && trace.ordenCompraItemId === item.id && trace.policy === article.policy && Number(trace.quantity) === Number(allocation.quantity)
            && (trace.lotCode || null) === m.lot && (trace.serialNumber || null) === m.serial
            && (trace.expirationDate || null) === (allocation.expirationDate || null), "FAIL: audit allocation/item/trace mapping")
          if (allocation.serialNumber) {
            const exact = units.filter((u: any) => u.serialNumber === allocation.serialNumber)
            check(exact.length === 1 && exact[0].companyId === company && exact[0].articleId === article.id && exact[0].status === "ACTIVE"
              && exact[0].location === location && exact[0].createdById === me.user.id && exact[0].id === trace.physicalUnitId
              && exact[0].unitCode === trace.unitCode, "FAIL: single company serial identity/canonical audit pointer")
            unitIds.add(exact[0].id)
            const unitAudit = await get(auditPath("StockPhysicalUnit", exact[0].id))
            check(unitAudit.filter((a: any) => a.action === "created" && a.userId === me.user.id && a.newValue?.serialNumber === allocation.serialNumber).length === 1, "FAIL: physical identity actor/audit")
          }
          const receiptAudit = await get(auditPath("Receipt", receipt.id))
          check(receiptAudit.filter((a: any) => a.action === "confirmed" && a.userId === me.user.id).length === 1, "FAIL: confirmed Receipt audit")
        }
      }
      check(discoveredReceipts.size === 1, "FAIL: one receipt for multi-allocation ingress")
      const receiptId = [...discoveredReceipts][0]
      const receipt = await get(`${base}/receipts/${receiptId}`)
      check(receipt.lines.length === order.articles.reduce((n, a) => n + a.allocations.length, 0), "FAIL: exact ReceiptLine count")
      await save(`canonical-${order.id}`, { ...manifest(), result: "PASS", receiptId })
      return receiptId
    }
    phase = "canonical-readback"
    const receiptId = await canonical(main, submittedIntent)
    const warningAudit = (await get(auditPath("OrdenCompra", main.id))).find((a: any) => a.newValue?.receiptId === receiptId)
    check(same(warningAudit?.newValue?.receiptWarnings, accepted.receiptWarnings), "FAIL: persisted warning evidence")
    check(accepted.receiptWarnings.every((w: any) => w.code === "EXPIRED_RECEIPT_ACCEPTED" && w.expirationDate === past
      && w.receivedOn > past && main.items.some(i => i.id === w.itemId && i.stockItemId === w.articleId)), "FAIL: warning UTC-day/item/article evidence")
    // Frozen emitter excludes the actor (internal-notifications.service.ts:374).
    // GET /notifications always filters recipientUserId to the current actor.
    // Do not equate an audit warning with a persisted recipient WARNING notice.
    check((await notices()).length === 0, "FAIL: receiving actor unexpectedly notified")
    testInfo.annotations.push({ type: "BLOCKED", description: "Recipient WARNING notice readback requires a separately authorized recipient session; actor is excluded by emitter. See saved blocked notice test." })
    phase = "same-key-and-reordered-replay"
    for (const [key, reorder] of [["replay-exact", false], ["replay-reordered", true]] as const) {
      const before = await snapshot(), intent = structuredClone(submittedIntent)
      if (reorder) {
        intent.receivedByItem.reverse()
        for (const row of intent.receivedByItem) { row.allocations.reverse(); row.received = "2.00000e0"; for (const a of row.allocations) a.quantity = "0.00001e5" }
      }
      const replay = await decode(await receive(main, key, intent))
      check(replay.id === main.id && replay.state === "Recibida" && same(replay.receiptWarnings, accepted.receiptWarnings)
        && same(before, await snapshot()), "FAIL: replay changed OC/Receipt/stock/identity/audit/notice")
      await save(`check-${key}`, { ...manifest(), result: "PASS", unchanged: true })
    }
    phase = "changed-trace-conflict"
    const changed = structuredClone(submittedIntent)
    changed.receivedByItem[0].allocations[0].lotCode += "-CHANGED"
    await rejectUnchanged(main, "changed-trace", changed, 409, "orden_compra_receipt_conflict")
    phase = "cross-article-duplicate-serial"
    await rejectUnchanged(ownedOrders[1], "duplicate-company-serial", payload(ownedOrders[1]), 409, "orden_compra_serial_conflict")
    phase = "isolated-concurrent-serial-race"
    // Different NEW articles/OCs avoid article-level serialization hiding the
    // compound company+serial constraint race. Exactly two requests, no retries.
    const raceOrders = ownedOrders.slice(2), beforeRace = await snapshot(), intents = raceOrders.map(payload)
    const results = await Promise.all(raceOrders.map((o, i) => receive(o, `race-${i}`, intents[i])))
    const bodies = await Promise.all(results.map(json))
    check(results.map(r => r.status()).sort().join(",") === "200,409", "FAIL: race must accept exactly one and reject one")
    const winner = results.findIndex(r => r.status() === 200), loser = 1 - winner
    check(bodies[loser]?.error?.code === "orden_compra_serial_conflict", "FAIL: race loser exact serial conflict")
    await canonical(raceOrders[winner], intents[winner])
    const afterRace = await snapshot()
    check(afterRace.identities.length === beforeRace.identities.length + 1 && receiptIds.size === 2 && movementIds.size === 5,
      "FAIL: race duplicate identity/Receipt/movement")
    const loserArticle = raceOrders[loser].articles[0]
    const stockIndex = articles.indexOf(loserArticle), orderIndex = ownedOrders.indexOf(raceOrders[loser])
    check(same(beforeRace.stock[stockIndex], afterRace.stock[stockIndex]) && same(beforeRace.orders[orderIndex], afterRace.orders[orderIndex])
      && same(await get(auditPath("OrdenCompra", raceOrders[loser].id)), beforeRace.audits[beforeRace.audits.length - ownedOrders.length + orderIndex]), "FAIL: race loser rollback")
    await save("check-race", { ...manifest(), result: "PASS", winnerId: raceOrders[winner].id, loserId: raceOrders[loser].id, loserUnchanged: true })
    phase = "reload"
    const beforeReload = await snapshot()
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(row().getByText("Recibida", { exact: true })).toBeVisible()
    check(same(beforeReload, await snapshot()), "FAIL: reload changed persisted canonical state/warning")
    check(writes.nativeReceipt === 1 && articles.length === 5 && ownedOrders.length === 4 && (await identities()).length === 3, "FAIL: bounded fixture/write counts")
    await save("checks", { ...manifest(), result: "PASS_AVAILABLE_ASSERTIONS_NOTICE_BLOCKED", nativePolicies: ["LOT_EXPIRY", "LOT_SERIAL_EXPIRY"],
      strictDates: true, expiredAccepted: true, visibleWarning: true, persistedWarningAudit: true, persistedWarningNotice: "BLOCKED", canonicalReload: true,
      reorderedReplay: true, changedTrace409: true, crossArticleSerial409Unchanged: true, concurrentSerialRace: true,
      NONE: "NOT RUN here; reuse frozen compras-oc-stock-receipt.spec.ts separately",
      readbackLimits: ["Receipt metadata is not projected: OC audit provides warning/allocation/unit pointers",
        "StockMovement metadata is not projected: OC audit + ReceiptLine provide trace/identity links",
        "Notices cover authenticated recipient only and emitter excludes actor; recipient WARNING persistence/deduplication BLOCKED"], cleanup: false })
  } catch (error) {
    const auth = authBlocked || error instanceof Error && error.message === expired
    const originLine = error instanceof Error ? error.stack?.match(/compras-oc-tracked-receipt\.spec\.ts:\d+:\d+/)?.[0] : undefined
    await save("stopped", { ...manifest(), result: auth ? "BLOCKED" : mutationStarted ? "FAIL" : "BLOCKED", phase,
      authBlocked: auth, budgetExpired, guardTripped: violation, partialFixturesRetained: mutationStarted, originLine }).catch(() => {})
    testInfo.annotations.push({ type: "process", description: `Tracked ${phase}; private fresh fixtures retained; no retry/cleanup` })
    throw new Error(auth ? `BLOCKED: ${expired}` : `${mutationStarted ? "FAIL" : "BLOCKED"}: tracked ${phase}; inspect private manifest; no retry/cleanup`)
  } finally { clearTimeout(timer); bearer = ""; await browser?.close() }
})

// Explicit failing prerequisite, not a skipped/green assertion. The saved command
// cannot claim full acceptance until the coordinator supplies authorized recipient
// readback. No browser, credentials, DB access or permission bypass in this check.
test("BLOCKED: persisted recipient WARNING notice and replay deduplication readback", async () => {
  throw new Error("BLOCKED: emitCrossDomainNotification excludes actor; GET /notifications fixes recipientUserId to authenticated user. Existing CORE_FLOW_STORAGE_STATE proves ingress actor only. Need separately authorized recipient readback to assert severity WARNING, expired body/metadata, actor/Receipt/OC links and unchanged notice ID/count on replay. Receipt metadata is not exposed by GET /receipts/:id; OC audit warning evidence is covered separately.")
})
