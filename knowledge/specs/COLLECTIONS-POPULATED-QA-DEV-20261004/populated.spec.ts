import { test, type Page } from "@playwright/test"
import { readFile, writeFile } from "node:fs/promises"
import { parseDecimalScale4 } from "../../../src/lib/decimal-money"
import { base, company, task, gate, runtimePaths } from "./populated.config"

const prefix = `/api/companies/${company}`
const cases = [
  { key: "unpaid", currency: "ARS", total: "100000.0001", paid: "0", balance: "100000.0001", state: "Emitida" },
  { key: "partial", currency: "ARS", total: "80000.0002", paid: "30000.0001", balance: "50000.0001", state: "Parcialmente_cobrada" },
  { key: "paid", currency: "ARS", total: "40000.0003", paid: "40000.0003", balance: "0", state: "Cobrada" },
  { key: "usd", currency: "USD", total: "100.0001", paid: "0", balance: "100.0001", state: "Emitida" },
] as const
type Case = typeof cases[number]
type Checkpoint = { task: string; run: string; startedAt: number; invoices: Record<string, string>; payments: Record<string, string>; pending: string | null; passed: boolean }
const decimal = (value: string) => { const parsed = parseDecimalScale4(value); gate(parsed !== null); return parsed }
const equalMoney = (left: string, right: string) => decimal(left) === decimal(right)
const idValid = (id: unknown) => typeof id === "string" && /^c[a-z0-9]{24}$/.test(id)
const money = (amount: bigint, currency: string) => `${currency} ${new Intl.NumberFormat("es-AR").format(amount / BigInt(10000))},${String(amount % BigInt(10000)).padStart(4, "0")}`

test("four owned nonfiscal cases → authoritative balances → populated collections desktop/mobile", async ({ playwright }, testInfo) => {
  let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | undefined
  let activePage: Page | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let violation = false
  let expired = false
  let passed = false
  let checkpoint: Checkpoint | undefined
  let save: (() => Promise<void>) | undefined
  try {
    const setup = await runtimePaths()
    try {
      setup.validate(setup.checkpoint, "preflight")
      checkpoint = JSON.parse(await readFile(setup.checkpoint, "utf8"))
    } catch (error) {
      // Only an absent checkpoint is new; unsafe/existing invalid paths block.
      setup.validate(setup.checkpoint, "capture")
      checkpoint = { task, run: setup.run, startedAt: Date.now(), invoices: {}, payments: {}, pending: null, passed: false }
      await writeFile(setup.checkpoint, JSON.stringify(checkpoint), { flag: "wx", mode: 0o600 })
    }
    const cp = checkpoint!
    gate(cp.task === task && cp.run === setup.run && Number.isSafeInteger(cp.startedAt)
      && cp.startedAt <= Date.now() && cp.invoices && cp.payments
      && (cp.pending === null || /^(create|emit|payment):(unpaid|partial|paid|usd)$/.test(cp.pending)))
    for (const map of [cp.invoices, cp.payments]) gate(Object.entries(map).every(([key, id]) => cases.some(c => c.key === key) && idValid(id)))
    const deadline = cp.startedAt + 20 * 60_000
    gate(deadline > Date.now())
    save = async () => {
      setup.validate(setup.checkpoint, "preflight")
      await writeFile(setup.checkpoint, JSON.stringify(cp), { mode: 0o600 })
    }
    const namespace = `QA-CARTERA-${setup.run}`
    const marker = (c: Case) => `${namespace}-${c.key}`
    const metadata = (c: Case) => ({ qaTask: task, qaRun: setup.run, qaCase: c.key, synthetic: true })
    const exactMetadata = (value: any, c: Case) => value && Object.keys(value).length === 4
      && Object.entries(metadata(c)).every(([key, expected]) => value[key] === expected)
    let permit: { pathname: string; body: string | null } | null = null
    const attempted = new Set<string>()
    browser = await playwright.chromium.launch({ timeout: 30_000 })
    timer = setTimeout(() => { void browser?.close() }, Math.min(600_000, deadline - Date.now()))
    const context = await browser.newContext({ storageState: setup.state, baseURL: base,
      viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" })
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url())
      const method = request.method()
      let allowed = url.origin === base && Date.now() < deadline
      if (url.pathname.startsWith("/api/companies/") && !url.pathname.startsWith(`${prefix}/`)) allowed = false
      if (/fiscal|(?:^|\/)(?:send|mail|email|ocr|ai|upload)(?:\/|$)/i.test(url.pathname)) allowed = false
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        allowed = allowed && method === "POST" && !!permit && !url.search
          && url.pathname === permit.pathname && request.postData() === permit.body
        if (allowed) permit = null
      }
      if (!allowed) { violation = true; await route.abort("blockedbyclient"); return }
      // Inspect without following redirects: route.continue alone does not guard
      // the redirected URL. No POST/network retry and no unreviewed redirect.
      try {
        const response = await route.fetch({ maxRedirects: 0, maxRetries: 0, timeout: 30_000 })
        if (response.status() >= 300 && response.status() < 400) {
          violation = true; await route.abort("blockedbyclient"); return
        }
        await route.fulfill({ response })
      } catch { violation = true; await route.abort("blockedbyclient").catch(() => {}) }
    })
    await context.routeWebSocket("**/*", socket => {
      const url = new URL(socket.url())
      if (url.origin === "ws://127.0.0.1:5000" && ["/_next/hmr", "/_next/webpack-hmr"].includes(url.pathname)) socket.connectToServer()
      else { violation = true; socket.close() }
    })
    // Token never crosses the browser boundary or enters checkpoints/reports.
    await context.addInitScript(({ base, prefix, company }) => {
      const w = window as any, original = window.fetch.bind(window)
      let bearer = ""
      w.__collectionsMembership = "waiting"
      w.__collectionsActor = ""
      w.__collectionsFetch = async (pathname: string, body: string | null) => {
        if (!bearer || !pathname.startsWith(`${prefix}/`)) throw new Error("blocked")
        const response = await original(`${base}${pathname}`, { method: body === null ? "GET" : "POST",
          headers: { Authorization: bearer, ...(body === null ? {} : { "Content-Type": "application/json" }) },
          body: body === null ? undefined : body, redirect: "error", signal: AbortSignal.timeout(30_000) })
        if (response.status === 401) { w.__collectionsMembership = "expired"; throw new Error("expired") }
        if (!response.ok) throw new Error("rejected")
        const json = await response.json()
        if (json?.error || !Object.prototype.hasOwnProperty.call(json, "data")) throw new Error("contract")
        return json.data
      }
      w.fetch = async (...args: Parameters<typeof fetch>) => {
        const request = args[0], url = new URL(typeof request === "string" || request instanceof URL ? request : request.url, location.href)
        const headers = new Headers(args[1]?.headers ?? (request instanceof Request ? request.headers : undefined))
        const response = await original(...args)
        if (url.origin === base && url.pathname === `${prefix}/me`) {
          try {
            const json = await response.clone().json()
            if (response.status === 401 || json?.error?.code === "invalid_auth_token") w.__collectionsMembership = "expired"
            else if (response.status === 200 && json?.data?.activeCompany?.id === company
              && ["admin", "coordinador", "vendedor"].includes(json?.data?.access?.role)
              && typeof json?.data?.user?.id === "string" && json.data.user.id && /^Bearer \S+$/.test(headers.get("Authorization") || "")) {
              bearer = headers.get("Authorization")!; w.__collectionsActor = json.data.user.id; w.__collectionsMembership = "valid"
            } else w.__collectionsMembership = "blocked"
          } catch { w.__collectionsMembership = "blocked" }
        }
        return response
      }
    }, { base, prefix, company })
    const page = await context.newPage()
    activePage = page
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForFunction(() => ["valid", "blocked", "expired"].includes((window as any).__collectionsMembership), null, { timeout: 60_000 })
    const verdict = await page.evaluate(() => (window as any).__collectionsMembership)
    expired = verdict === "expired"; gate(verdict === "valid" && !violation)
    const actor = await page.evaluate(() => (window as any).__collectionsActor as string)
    const get = (pathname: string): Promise<any> => page.evaluate(pathname => (window as any).__collectionsFetch(pathname, null), pathname)
    const all = async (kind: "invoices" | "payments") => {
      const rows: any[] = [], seen = new Set<string>()
      for (let skip = 0; ; skip += 500) {
        gate(Date.now() < deadline && !violation)
        const batch = await get(`${prefix}/${kind}?take=500&skip=${skip}`)
        gate(Array.isArray(batch) && batch.length <= 500)
        for (const row of batch) { gate(row.companyId === company && idValid(row.id) && !seen.has(row.id)); seen.add(row.id); rows.push(row) }
        if (batch.length < 500) return rows
      }
    }
    let invoices = await all("invoices"), payments = await all("payments")
    const validateInvoice = (row: any, c: Case) => {
      const line = row?.items?.[0]
      gate(idValid(row?.id) && row.companyId === company && row.createdById === actor && exactMetadata(row.metadata, c)
        && row.base === "manual" && row.type === "FV" && row.currency === c.currency
        && row.surgeryId === null && row.presupuestoId === null && row.consumoId === null && row.cancelledAt === null
        && ["Borrador", "Emitida", ...(c.key === "partial" ? [c.state] : c.key === "paid" ? [c.state] : [])].includes(row.state)
        && equalMoney(row.subtotal, c.total) && equalMoney(row.total, c.total)
        && equalMoney(row.discountTotal, "0") && equalMoney(row.taxTotal, "0")
        && row.items.length === 1 && line.description === marker(c) && equalMoney(line.quantity, "1")
        && equalMoney(line.unitPrice, c.total) && equalMoney(line.total, c.total) && equalMoney(line.discount, "0")
        && equalMoney(line.tax, "0") && line.vatTreatment === "NO_GRAVADO" && equalMoney(line.vatRate, "0")
        && line.sourceType === null && line.sourceItemId === null && line.sku === null && line.unit === null && line.metadata === null)
      gate(row.state === "Borrador" ? row.issuedAt === null && row.visibleNumber === null
        : Number.isInteger(row.visibleNumber) && row.visibleNumber > 0 && Number.isFinite(Date.parse(row.issuedAt)) && row.updatedById === actor)
      const settled = row.state === "Parcialmente_cobrada" || row.state === "Cobrada"
      gate(equalMoney(row.paidTotal, settled ? c.paid : "0") && equalMoney(row.balance, settled ? c.balance : c.total))
    }
    const validatePayment = (row: any, c: Case, invoiceId: string) => gate(idValid(row?.id)
      && row.companyId === company && row.createdById === actor && row.updatedById === null
      && Number.isInteger(row.visibleNumber) && row.visibleNumber > 0
      && exactMetadata(row.metadata, c) && row.surgeryId === null && row.currency === "ARS" && row.method === "other"
      && row.state === "Registrado" && equalMoney(row.amount, c.paid) && Number.isFinite(Date.parse(row.receivedAt))
      && row.imputations?.length === 1 && idValid(row.imputations[0].id)
      && row.imputations[0].invoiceId === invoiceId && equalMoney(row.imputations[0].amount, c.paid)
      && row.imputations[0].metadata === null)
    const ownedInvoices = new Map<string, any>(), ownedPayments = new Map<string, any>()
    // Validate EVERY collision/recovered fixture before the first POST.
    for (const row of invoices) {
      const relevant = row.metadata?.qaRun === setup.run || row.items?.some((line: any) => typeof line.description === "string" && line.description.includes(namespace))
      if (!relevant) continue
      const c = cases.find(c => row.items?.some((line: any) => line.description === marker(c)))
      gate(c && !ownedInvoices.has(c.key)); validateInvoice(row, c); ownedInvoices.set(c.key, row)
    }
    for (const row of payments) {
      const relevant = row.metadata?.qaRun === setup.run || row.imputations?.some((imp: any) => [...ownedInvoices.values()].some(inv => inv.id === imp.invoiceId))
      if (!relevant) continue
      const c = cases.find(c => c.key === row.metadata?.qaCase && (c.key === "partial" || c.key === "paid"))
      gate(c && ownedInvoices.has(c.key) && !ownedPayments.has(c.key)); validatePayment(row, c, ownedInvoices.get(c.key).id); ownedPayments.set(c.key, row)
    }
    for (const c of cases) {
      const inv = ownedInvoices.get(c.key), payment = ownedPayments.get(c.key)
      gate(!cp.invoices[c.key] || cp.invoices[c.key] === inv?.id)
      gate(!cp.payments[c.key] || cp.payments[c.key] === payment?.id)
      if (inv) {
        gate(equalMoney(inv.paidTotal, payment ? c.paid : "0") && equalMoney(inv.balance, payment ? c.balance : c.total))
        gate(payment ? inv.state === c.state : ["Borrador", "Emitida"].includes(inv.state))
        cp.invoices[c.key] = inv.id
      }
      if (payment) cp.payments[c.key] = payment.id
    }
    if (cp.pending) {
      const [kind, key] = cp.pending.split(":")
      gate(kind === "create" ? ownedInvoices.has(key) : kind === "emit" ? ownedInvoices.has(key) && ownedInvoices.get(key).state !== "Borrador" : ownedPayments.has(key))
      cp.pending = null
    }
    const baselineInvoices = invoices.filter(row => ![...ownedInvoices.values()].some(owned => owned.id === row.id))
    const baselinePayments = payments.filter(row => ![...ownedPayments.values()].some(owned => owned.id === row.id))
    await save()
    const post = async (operation: string, pathname: string, body: object) => {
      gate(!violation && Date.now() < deadline && !cp.pending && !attempted.has(operation))
      attempted.add(operation); cp.pending = operation; await save!()
      const serialized = JSON.stringify(body)
      permit = { pathname, body: serialized }
      // One attempt only. Pending checkpoint survives timeout/rejection; recovery
      // requires exact owned readback, never an automatic retry or deletion.
      const row = await page.evaluate(({ pathname, body }) => (window as any).__collectionsFetch(pathname, body), { pathname, body: serialized })
      gate(!permit && !violation && idValid(row?.id))
      return row
    }
    for (const c of cases) {
      let inv = ownedInvoices.get(c.key)
      if (!inv) {
        inv = await post(`create:${c.key}`, `${prefix}/invoices`, { base: "manual", type: "FV", currency: c.currency,
          items: [{ description: marker(c), quantity: "1", unitPrice: c.total, discount: "0", tax: "0", vatTreatment: "NO_GRAVADO", vatRate: "0" }], metadata: metadata(c) })
        cp.invoices[c.key] = inv.id; await save()
        const createdId = inv.id
        inv = await get(`${prefix}/invoices/${createdId}`)
        validateInvoice(inv, c)
        gate(inv.id === createdId && inv.state === "Borrador" && equalMoney(inv.paidTotal, "0") && equalMoney(inv.balance, c.total))
        cp.pending = null; await save()
      }
      if (inv.state === "Borrador") {
        const invoiceId = inv.id
        const emitted = await post(`emit:${c.key}`, `${prefix}/invoices/${invoiceId}/emitir`, {})
        gate(emitted.id === invoiceId)
        inv = await get(`${prefix}/invoices/${invoiceId}`); validateInvoice(inv, c)
        gate(inv.id === invoiceId && inv.state === "Emitida" && equalMoney(inv.paidTotal, "0") && equalMoney(inv.balance, c.total))
        cp.pending = null; await save()
      }
      if ((c.key === "partial" || c.key === "paid") && !ownedPayments.has(c.key)) {
        gate(inv.id === cp.invoices[c.key] && inv.currency === "ARS" && inv.state === "Emitida"
          && equalMoney(inv.paidTotal, "0") && equalMoney(inv.balance, c.total))
        const payment = await post(`payment:${c.key}`, `${prefix}/payments`, { method: "other", currency: "ARS", amount: c.paid,
          imputations: [{ invoiceId: inv.id, amount: c.paid }], metadata: metadata(c) })
        cp.payments[c.key] = payment.id; await save()
        validatePayment(await get(`${prefix}/payments/${payment.id}`), c, inv.id)
        cp.pending = null; await save()
      }
    }
    invoices = await all("invoices"); payments = await all("payments")
    for (const [before, after] of [[baselineInvoices, invoices], [baselinePayments, payments]]) {
      gate(before.every(row => JSON.stringify(row) === JSON.stringify(after.find(current => current.id === row.id))))
    }
    for (const c of cases) {
      const inv = invoices.find(row => row.id === cp.invoices[c.key]); validateInvoice(inv, c)
      gate(inv.state === c.state && equalMoney(inv.paidTotal, c.paid) && equalMoney(inv.balance, c.balance)
        && decimal(c.total) - decimal(c.paid) === decimal(c.balance))
      const matches = payments.filter(p => p.imputations.some((imp: any) => imp.invoiceId === inv.id))
      gate(matches.length === (c.key === "partial" || c.key === "paid" ? 1 : 0))
      if (matches.length) { gate(matches[0].id === cp.payments[c.key]); validatePayment(matches[0], c, inv.id) }
    }
    gate(decimal("100000.0001") + decimal("50000.0001") === decimal("150000.0002"))
    await page.goto("/ventas/cartera", { waitUntil: "domcontentloaded" })
    const ready = async () => {
      await page.getByRole("heading", { name: "Facturas para priorizar", exact: true }).waitFor({ timeout: 60_000 })
      gate(await page.getByRole("heading", { name: "Cartera de cobros", exact: true }).isVisible())
    }
    await ready()
    const uiGate = async (value: boolean | Promise<boolean>) => gate(await value)
    const search = page.getByLabel("Buscar factura, cirugía o ítem", { exact: true })
    const currency = page.getByRole("combobox", { name: "Moneda", exact: true })
    const rows = page.getByRole("region", { name: "Lista de facturas", exact: true }).locator("tbody tr")
    const checkRows = async (count: number) => {
      await page.waitForFunction(count => document.querySelectorAll('tbody tr').length === count, count)
      gate(await rows.count() === count)
    }
    const verifySummary = async () => {
      const current = await all("invoices")
      const currentPayments = await all("payments")
      const totals = new Map<string, bigint>()
      const counts = new Map<string, number>()
      const trends = new Map<string, bigint[]>()
      const paymentCounts = new Map<string, number>()
      const currencies = new Intl.DisplayNames(["es"], { type: "currency", fallback: "none" })
      for (const inv of current) {
        if (!["Emitida", "Parcialmente_cobrada"].includes(inv.state)) continue
        const amount = parseDecimalScale4(inv.balance)
        if (amount === null || amount <= BigInt(0) || !/^[A-Z]{3}$/.test(inv.currency) || inv.currency === "XXX" || !currencies.of(inv.currency)) continue
        totals.set(inv.currency, (totals.get(inv.currency) || BigInt(0)) + amount)
        counts.set(inv.currency, (counts.get(inv.currency) || 0) + 1)
      }
      const now = Date.now(), day = 86_400_000
      for (const payment of currentPayments) {
        const amount = parseDecimalScale4(payment.amount), received = Date.parse(payment.receivedAt)
        if (payment.state !== "Registrado" || amount === null || amount <= BigInt(0)
          || !/^[A-Z]{3}$/.test(payment.currency) || payment.currency === "XXX" || !currencies.of(payment.currency)
          || !/^\d{4}-\d{2}-\d{2}T/.test(payment.receivedAt) || !Number.isFinite(received) || received > now) continue
        const days = Math.floor(now / day) - Math.floor(received / day)
        if (days >= 28) continue
        const buckets = trends.get(payment.currency) || Array<bigint>(4).fill(BigInt(0))
        buckets[Math.floor(days / 7)] += amount; trends.set(payment.currency, buckets)
        paymentCounts.set(payment.currency, (paymentCounts.get(payment.currency) || 0) + 1)
        if (!totals.has(payment.currency)) totals.set(payment.currency, BigInt(0))
      }
      const summary = page.getByRole("region", { name: "Saldos por moneda", exact: true })
      for (const [code, amount] of totals) {
        const card = summary.locator('[data-slot="card"]').filter({ has: page.getByText(`Saldo pendiente · ${code}`, { exact: true }) })
        await uiGate(card.getByText(money(amount, code), { exact: true }).first().isVisible())
        await uiGate(card.getByText(`${counts.get(code) || 0} facturas con saldo válido`, { exact: true }).isVisible())
        const trend = page.locator('[data-slot="card"]').filter({ has: page.getByText(`Cobros · ${code}`, { exact: true }) })
        await uiGate(trend.getByText(`${paymentCounts.get(code) || 0} cobros registrados en el período`, { exact: true }).isVisible())
        for (const [index, bucket] of ["0–6 días", "7–13 días", "14–20 días", "21–27 días"].entries()) {
          const value = await trend.locator("dl > div").filter({ has: page.getByText(`Hace ${bucket}`, { exact: true }) }).locator("dd").textContent()
          gate(value === money(trends.get(code)?.[index] || BigInt(0), code))
        }
      }
    }
    await verifySummary()
    const verifyOwn = async () => {
      await search.fill(namespace); await currency.selectOption("all"); await checkRows(3)
      const paid = invoices.find(inv => inv.id === cp.invoices.paid)
      gate(await rows.getByText(`FV ${paid.visibleNumber}`, { exact: true }).count() === 0)
      await page.getByRole("combobox", { name: "Prioridad", exact: true }).selectOption("largest")
      await currency.selectOption("ARS"); await checkRows(2)
      for (const [index, key] of ["unpaid", "partial"].entries()) {
        const inv = invoices.find(inv => inv.id === cp.invoices[key])
        await uiGate(rows.nth(index).getByText(`FV ${inv.visibleNumber}`, { exact: true }).isVisible())
        await uiGate(rows.nth(index).getByText(money(decimal(inv.balance), "ARS"), { exact: true }).isVisible())
      }
      await currency.selectOption("USD"); await checkRows(1)
      await uiGate(rows.first().getByText(money(decimal("100.0001"), "USD"), { exact: true }).isVisible())
      await currency.selectOption("all"); await checkRows(3)
      await page.getByRole("combobox", { name: "Antigüedad desde emisión", exact: true }).selectOption("0-30"); await checkRows(3)
      await page.getByRole("combobox", { name: "Antigüedad desde emisión", exact: true }).selectOption("all")
      await search.fill("QA-CARTERA-NONEXISTENT"); await checkRows(0)
      await search.fill(""); await verifySummary()
    }
    await verifyOwn()
    await page.reload({ waitUntil: "domcontentloaded" }); await ready(); await verifyOwn()
    await page.setViewportSize({ width: 390, height: 844 }); await verifyOwn()
    const bounds = await search.boundingBox(); gate(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391)
    await page.reload({ waitUntil: "domcontentloaded" }); await ready(); await verifyOwn()
    gate(!violation && Date.now() < deadline && cp.pending === null)
    cp.passed = true; await save(); passed = true
  } catch {
    expired = expired || Boolean(await activePage?.evaluate(() => (window as any).__collectionsMembership === "expired").catch(() => false))
    // Fixed verdicts only: Playwright exception text/DOM/response bodies withheld.
    testInfo.annotations.push({ type: "redacted", description: `passed=false;trafficBlocked=${violation};expired=${expired};pending=${Boolean(checkpoint?.pending)}` })
    throw new Error(expired ? "E2E blocked by expired authentication state" : "BLOCKED_OR_FAIL: guarded collections QA; records retained; no automatic retry")
  } finally {
    clearTimeout(timer)
    const browserClosed = !browser || await browser.close().then(() => true, () => false)
    testInfo.annotations.push({ type: "result", description: `runtimePassed=${passed};browserClosed=${browserClosed}` })
  }
})
