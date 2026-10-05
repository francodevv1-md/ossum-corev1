import { test, expect } from "@playwright/test"
import { buildCollectionsDashboard, type PortfolioInvoice, type PortfolioPayment } from "../../../src/lib/collections-dashboard.utils"
import { formatDecimalCurrency } from "../../../src/lib/decimal-money"

test("authenticated read-only portfolio: backend balances, filters, reload and mobile", async ({ page }) => {
  const company = "codevdistricorr1000000000"
  const invoices = new Map<string, PortfolioInvoice[]>()
  const payments = new Map<string, PortfolioPayment[]>()
  const reads: Promise<void>[] = []
  let mutations = 0
  await page.route("**/api/**", async (route) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
      mutations += 1
      await route.abort()
    } else await route.continue()
  })
  page.on("response", (response) => {
    const url = new URL(response.url())
    if (response.request().method() !== "GET" || url.origin !== "http://127.0.0.1:5000") return
    const invoicePath = `/api/companies/${company}/invoices`
    const paymentPath = `/api/companies/${company}/payments`
    if (url.pathname !== invoicePath && url.pathname !== paymentPath) return
    reads.push((async () => {
      expect(response.status() === 200, "Portfolio read must succeed").toBe(true)
      const body = await response.json()
      const rows = body?.data ?? body
      expect(Array.isArray(rows), "Read must return an array").toBe(true)
      expect(rows.every((row: { companyId: string }) => row.companyId === company), "Read must match expected company").toBe(true)
      if (url.pathname === invoicePath) invoices.set(url.search, rows)
      else payments.set(url.search, rows)
    })())
  })
  // Match the verified session tool: membership preflight at login before testing
  // the protected feature. Allow cold DEV hydration without changing Auth.
  const membership = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/companies/${company}/me`, { timeout: 60_000 })
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  const membershipResponse = await membership
  expect(membershipResponse.status() === 200, "Authenticated membership preflight required").toBe(true)
  const membershipBody = await membershipResponse.json()
  expect(membershipBody?.data?.activeCompany?.id === company, "Expected DEV company required").toBe(true)
  await page.goto("/ventas/cartera", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Cartera de cobros", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Facturas para priorizar", exact: true })).toBeVisible({ timeout: 45_000 })
  await expect(page.getByRole("region", { name: "Saldos por moneda", exact: true })).toBeAttached()
  await Promise.all(reads)
  expect(invoices.size > 0 && payments.size > 0, "Both authoritative reads required").toBe(true)
  const projection = buildCollectionsDashboard([...invoices.values()].flat(), [...payments.values()].flat(), new Date())
  for (const entry of projection.currencies) {
    const amount = `${entry.currency} ${formatDecimalCurrency(entry.balance, 4).replace(/^\$ /, "")}`
    expect(await page.getByRole("region", { name: "Saldos por moneda", exact: true }).getByText(amount, { exact: true }).count() > 0,
      "Rendered currency balance must match authoritative projection").toBe(true)
  }
  await expect(page.getByText(/La antigüedad desde emisión no indica vencimiento ni mora/)).toBeVisible()
  await expect(page.getByRole("link", { name: "Ir a Cobros", exact: true })).toHaveAttribute("href", "/ventas/cobros")
  const search = page.getByLabel("Buscar factura, cirugía o ítem", { exact: true })
  await search.fill("QA-NONEXISTENT-COLLECTIONS-6a4e3a82")
  await expect(page.getByText(projection.rows.length ? "Sin resultados para los filtros aplicados." : "No hay facturas abiertas con saldo pendiente.", { exact: true })).toBeVisible()
  await search.fill("")
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(search).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Moneda", exact: true })).toBeVisible()
  const bounds = await search.boundingBox()
  expect(Boolean(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391), "Mobile search must fit viewport").toBe(true)
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Facturas para priorizar", exact: true })).toBeVisible({ timeout: 45_000 })
  await Promise.all(reads)
  expect(mutations, "Portfolio navigation must not mutate business data").toBe(0)
})
