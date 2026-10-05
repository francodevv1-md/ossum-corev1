import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { PaymentApiRow } from "@/lib/api/payments"
import { parseDecimalScale4 } from "@/lib/decimal-money"

export const AGE_LABELS = {
  "0-30": "0–30 días",
  "31-60": "31–60 días",
  "61-90": "61–90 días",
  "91+": "91 días o más",
  missing: "Sin fecha de emisión",
  invalid: "Fecha de emisión inválida",
  future: "Fecha de emisión futura",
} as const
export type AgeBucket = keyof typeof AGE_LABELS
export const PAYMENT_WINDOWS = ["0–6 días", "7–13 días", "14–20 días", "21–27 días"] as const
const DAY = 86_400_000
const ZERO = BigInt(0)
const currencyNames = new Intl.DisplayNames(["es"], { type: "currency", fallback: "none" })

export type PortfolioInvoice = Pick<InvoiceApiRow,
  "id" | "visibleNumber" | "companyId" | "surgeryId" | "state" | "currency" | "balance" | "issuedAt" | "items">
export type PortfolioPayment = Pick<PaymentApiRow, "id" | "companyId" | "state" | "currency" | "amount" | "receivedAt">
export type CollectionRow = {
  invoice: PortfolioInvoice
  balance: bigint | null
  currency: string | null
  age: AgeBucket
  days: number | null
}
export type CurrencyPortfolio = {
  currency: string
  balance: bigint
  count: number
  ages: Record<AgeBucket, bigint>
  payments: bigint[]
  paymentCount: number
}

function validCurrency(value: string) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) && currencyNames.of(value) !== undefined && value !== "XXX"
}

// Calendar-day buckets use UTC consistently; no fallback to creation or due dates.
export function issuanceAge(value: string | null, now: Date): { age: AgeBucket; days: number | null } {
  if (value == null || value === "") return { age: "missing", days: null }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.test(value)) {
    return { age: "invalid", days: null }
  }
  const calendarDate = value.slice(0, 10)
  const calendarTime = Date.parse(`${calendarDate}T00:00:00Z`)
  const time = Date.parse(value)
  if (!Number.isFinite(time) || !Number.isFinite(calendarTime) || new Date(calendarTime).toISOString().slice(0, 10) !== calendarDate) {
    return { age: "invalid", days: null }
  }
  if (time > now.getTime()) return { age: "future", days: null }
  const days = Math.floor(now.getTime() / DAY) - Math.floor(time / DAY)
  return { age: days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "91+", days }
}

export function invoiceLabel(invoice: PortfolioInvoice) {
  return invoice.visibleNumber == null ? `Factura ${invoice.id}` : `FV ${invoice.visibleNumber}`
}

export function buildCollectionsDashboard(invoices: PortfolioInvoice[], payments: PortfolioPayment[], now: Date) {
  const rows: CollectionRow[] = []
  const currencies = new Map<string, CurrencyPortfolio>()
  const issues = new Map<string, number>()
  const warn = (label: string) => issues.set(label, (issues.get(label) ?? 0) + 1)
  const group = (currency: string) => {
    let value = currencies.get(currency)
    if (!value) {
      value = {
        currency, balance: ZERO, count: 0,
        ages: { "0-30": ZERO, "31-60": ZERO, "61-90": ZERO, "91+": ZERO, missing: ZERO, invalid: ZERO, future: ZERO },
        payments: [ZERO, ZERO, ZERO, ZERO], paymentCount: 0,
      }
      currencies.set(currency, value)
    }
    return value
  }
  for (const invoice of invoices) {
    if (invoice.state !== "Emitida" && invoice.state !== "Parcialmente_cobrada") continue
    const balance = parseDecimalScale4(invoice.balance)
    if (balance !== null && balance <= ZERO) continue
    const currency = validCurrency(invoice.currency) ? invoice.currency : null
    const age = issuanceAge(invoice.issuedAt, now)
    rows.push({ invoice, balance, currency, ...age })
    if (balance === null) warn("Facturas con saldo inválido (excluidas de importes)")
    if (currency === null) warn("Facturas con moneda inválida (excluidas de importes)")
    if (age.days === null) warn(AGE_LABELS[age.age])
    if (balance !== null && currency !== null) {
      const entry = group(currency)
      entry.balance += balance
      entry.count += 1
      entry.ages[age.age] += balance
    }
  }
  for (const payment of payments) {
    if (payment.state !== "Registrado") continue
    const amount = parseDecimalScale4(payment.amount)
    const currency = validCurrency(payment.currency) ? payment.currency : null
    const age = issuanceAge(payment.receivedAt, now)
    if (amount === null || amount <= ZERO) warn("Cobros con importe inválido (excluidos de tendencia)")
    if (currency === null) warn("Cobros con moneda inválida (excluidos de tendencia)")
    if (age.days === null) warn(`Cobros: ${AGE_LABELS[age.age].replace("emisión", "cobro")}`)
    if (amount === null || amount <= ZERO || currency === null || age.days === null || age.days >= 28) continue
    const entry = group(currency)
    entry.payments[Math.floor(age.days / 7)] += amount
    entry.paymentCount += 1
  }
  return {
    rows,
    currencies: [...currencies.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    issues: [...issues].map(([label, count]) => ({ label, count })),
  }
}

export function filterCollectionRows(rows: CollectionRow[], filters: {
  search: string; currency: string; age: string; sort: "oldest" | "largest"
}) {
  const query = filters.search.trim().toLocaleLowerCase("es")
  return rows.filter((row) =>
    (filters.currency === "all" || (filters.currency === "invalid" ? row.currency === null : row.currency === filters.currency)) &&
    (filters.age === "all" || row.age === filters.age) &&
    (!query || [invoiceLabel(row.invoice), row.invoice.id, row.invoice.surgeryId ?? "", ...row.invoice.items.map((item) => item.description)]
      .some((text) => text.toLocaleLowerCase("es").includes(query)))
  ).sort((a, b) => {
    const currencyOrder = a.currency === b.currency ? 0 : a.currency === null ? 1 : b.currency === null ? -1 : a.currency.localeCompare(b.currency)
    const amountOrder = a.balance === b.balance ? 0 : a.balance === null ? 1 : b.balance === null ? -1 : a.balance > b.balance ? -1 : 1
    const ageOrder = (b.days ?? -1) - (a.days ?? -1)
    // Largest balances are ranked within each currency, never across currencies.
    return (filters.sort === "largest" ? currencyOrder || amountOrder || ageOrder : ageOrder || currencyOrder || amountOrder)
      || a.invoice.id.localeCompare(b.invoice.id)
  })
}
