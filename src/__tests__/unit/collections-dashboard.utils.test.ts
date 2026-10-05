import { describe, expect, it } from "vitest"
import {
  buildCollectionsDashboard, filterCollectionRows, issuanceAge,
  type PortfolioInvoice, type PortfolioPayment,
} from "@/lib/collections-dashboard.utils"

const now = new Date("2026-10-04T12:00:00Z")
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
const invoice = (overrides: Partial<PortfolioInvoice> = {}): PortfolioInvoice => ({
  id: "invoice-1", visibleNumber: 1, companyId: "company-a", surgeryId: "surgery-a",
  state: "Emitida", currency: "ARS", balance: "10.0001", issuedAt: daysAgo(40), items: [], ...overrides,
})
const payment = (overrides: Partial<PortfolioPayment> = {}): PortfolioPayment => ({
  id: "payment-1", companyId: "company-a", state: "Registrado", currency: "ARS", amount: "2.0001", receivedAt: daysAgo(0), ...overrides,
})

describe("collections dashboard exact projections", () => {
  it.each([[0, "0-30"], [30, "0-30"], [31, "31-60"], [60, "31-60"], [61, "61-90"], [90, "61-90"], [91, "91+"]])(
    "classifies issuance age at %s days as %s", (days, age) => {
      expect(issuanceAge(daysAgo(Number(days)), now)).toEqual({ age, days })
    },
  )
  it.each([
    [null, "missing"], ["", "missing"], ["not-a-date", "invalid"], ["2026-02-30", "invalid"],
    ["2026-02-29T12:00:00Z", "invalid"], ["2026-10-03T24:00:00Z", "invalid"],
    ["2026-10-04T13:00:00Z", "future"], ["2026-10-05", "future"],
  ])("explicitly classifies unusable date %s", (date, age) => {
    expect(issuanceAge(date, now)).toEqual({ age, days: null })
  })
  it("uses UTC calendar days and accepts leap dates and timezone offsets", () => {
    expect(issuanceAge("2026-10-04T00:30:00+02:00", now).days).toBe(1)
    expect(issuanceAge("2024-02-29", now).age).toBe("91+")
  })
  it("preserves authoritative balances and scale-4 precision without mixed-currency totals", () => {
    const result = buildCollectionsDashboard([
      invoice(), invoice({ id: "two", balance: "0.0001", state: "Parcialmente_cobrada" }),
      invoice({ id: "usd", currency: "USD", balance: "99999999999999.9999" }),
      invoice({ id: "usd2", currency: "USD", balance: "0.0001" }),
    ], [], now)
    expect(result.currencies.map((entry) => [entry.currency, entry.balance])).toEqual([
      ["ARS", BigInt(100002)], ["USD", BigInt("1000000000000000000")],
    ])
    expect(result.currencies[0].ages["31-60"]).toBe(BigInt(100002))
    expect(result).not.toHaveProperty("total")
  })
  it("excludes draft, cancelled, paid and zero-balance invoices despite inconsistent positive states", () => {
    const result = buildCollectionsDashboard([
      invoice({ state: "Borrador" }), invoice({ state: "Anulada" }), invoice({ state: "Cobrada" }), invoice({ balance: "0.0000" }),
    ], [], now)
    expect(result.rows).toEqual([])
    expect(result.currencies).toEqual([])
  })
  it.each(["bad", "-1", "1e3", "1.00001", "100000000000000", ""])("does not silently zero invalid balance %s", (balance) => {
    const result = buildCollectionsDashboard([invoice({ balance })], [], now)
    expect(result.rows[0].balance).toBeNull()
    expect(result.currencies).toHaveLength(0)
    expect(result.issues[0].label).toContain("saldo inválido")
  })
  it.each(["", "ars", "ZZZ", "XXX", "$", " ARS"])("does not aggregate invalid currency %s", (currency) => {
    const result = buildCollectionsDashboard([invoice({ currency })], [], now)
    expect(result.rows[0].currency).toBeNull()
    expect(result.currencies).toHaveLength(0)
    expect(result.issues[0].label).toContain("moneda inválida")
  })
  it("retains valid exposure with unknown, invalid and future dates in separate groups", () => {
    const result = buildCollectionsDashboard([
      invoice({ issuedAt: null }), invoice({ id: "bad", issuedAt: "invalid" }), invoice({ id: "future", issuedAt: daysAgo(-1) }),
    ], [], now)
    expect(result.currencies[0].balance).toBe(BigInt(300003))
    expect(result.currencies[0].ages.missing).toBe(BigInt(100001))
    expect(result.currencies[0].ages.invalid).toBe(BigInt(100001))
    expect(result.currencies[0].ages.future).toBe(BigInt(100001))
    expect(result.issues).toHaveLength(3)
  })
  it("projects four exact recent payment windows, excluding cancelled and outside-period payments", () => {
    const payments = [0, 6, 7, 13, 14, 20, 21, 27, 28].map((days) => payment({ id: String(days), receivedAt: daysAgo(days) }))
    payments.push(payment({ state: "Anulado", amount: "999" }), payment({ currency: "USD", amount: "1.0001" }))
    const result = buildCollectionsDashboard([], payments, now)
    expect(result.currencies[0].payments).toEqual(Array(4).fill(BigInt(40002)))
    expect(result.currencies[0].paymentCount).toBe(8)
    expect(result.currencies[1].payments[0]).toBe(BigInt(10001))
  })
  it("reports unusable payment amounts, currencies and dates without inventing trends", () => {
    const result = buildCollectionsDashboard([], [
      payment({ amount: "bad" }), payment({ amount: "0" }), payment({ currency: "ZZZ" }),
      payment({ receivedAt: "bad" }), payment({ receivedAt: daysAgo(-1) }),
    ], now)
    expect(result.currencies).toHaveLength(0)
    expect(result.issues.reduce((sum, issue) => sum + issue.count, 0)).toBe(5)
  })
  it("searches actual invoice identifiers/items, filters age/currency, and ranks exact amounts within currency", () => {
    const result = buildCollectionsDashboard([
      invoice({ id: "small", balance: "99999999999999.9998", issuedAt: daysAgo(60) }),
      invoice({ id: "large", balance: "99999999999999.9999", issuedAt: daysAgo(31) }),
      invoice({ id: "usd", currency: "USD", balance: "1", issuedAt: daysAgo(90) }),
      invoice({ id: "unknown", issuedAt: null, currency: "ZZZ" }),
    ], [], now)
    const filters = { search: "", currency: "all", age: "all", sort: "largest" as const }
    expect(filterCollectionRows(result.rows, filters).map((row) => row.invoice.id)).toEqual(["large", "small", "usd", "unknown"])
    expect(filterCollectionRows(result.rows, { ...filters, sort: "oldest" })[0].invoice.id).toBe("usd")
    expect(filterCollectionRows(result.rows, { ...filters, currency: "USD", age: "61-90", search: "SURGERY-A" })).toHaveLength(1)
    expect(filterCollectionRows(result.rows, { ...filters, currency: "invalid", age: "missing" })).toHaveLength(1)
    expect(filterCollectionRows(result.rows, { ...filters, search: "nothing" })).toEqual([])
    expect(result.rows[0].invoice.id).toBe("small")
  })
  it("searches backend item descriptions without inferring a payer", () => {
    const result = buildCollectionsDashboard([invoice({ items: [{
      id: "item", sku: null, description: "Implante de rodilla", quantity: "1", unit: null, unitPrice: "10", discount: "0",
      tax: "0", total: "10", sourceType: null, sourceItemId: null, metadata: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
    }] })], [], now)
    expect(filterCollectionRows(result.rows, { search: "RODILLA", currency: "ARS", age: "all", sort: "oldest" })).toHaveLength(1)
    expect(filterCollectionRows(result.rows, { search: "FV 1", currency: "ARS", age: "all", sort: "oldest" })).toHaveLength(1)
  })
})
