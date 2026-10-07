import type { PresupuestoApiRow } from "@/lib/api/presupuestos"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { RemitoApiRow } from "@/lib/api/remitos"
import type { PaymentApiRow } from "@/lib/api/payments"

export const COMPROBANTE_LABELS = { PR: "Presupuestos", FV: "Facturas", NR: "Remitos", CO: "Cobros" } as const
export type ComprobanteType = keyof typeof COMPROBANTE_LABELS
export type ComprobanteRecord = {
  key: string
  id: string
  type: ComprobanteType
  number: number | null
  date: string
  state: string
  concept: string
  amount?: string | number | null
  balance?: string | null
  currency?: string
  lines: { id: string; description: string; quantity?: string | number; total?: string | number }[]
}

export function documentMoney(value: string | number | null | undefined, currency?: string) {
  if (value === null || value === undefined || value === "" || !currency || !Number.isFinite(Number(value))) return "No disponible"
  return `${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

/** Presentation only. Never use budget/remittance totals to calculate debt. */
export function comprobanteRecords(budgets: PresupuestoApiRow[], invoices: InvoiceApiRow[], remittances: RemitoApiRow[], payments: PaymentApiRow[]): ComprobanteRecord[] {
  const invoiceIds = new Set(invoices.map(invoice => invoice.id))
  return [
    ...budgets.map(row => ({
      key: `PR:${row.id}`, id: row.id, type: "PR" as const, number: row.visibleNumber,
      date: row.documentDate ?? row.issuedAt ?? row.createdAt, state: row.state,
      concept: row.title || "Presupuesto", amount: row.total, currency: row.currency,
      lines: row.items.map(line => ({ id: line.id, description: line.description, quantity: line.quantity, total: line.total })),
    })),
    ...invoices.map(row => ({
      key: `FV:${row.id}`, id: row.id, type: "FV" as const, number: row.visibleNumber,
      date: row.issuedAt ?? row.createdAt, state: row.state,
      concept: `Factura operativa · ${row.base}`, amount: row.total, balance: row.balance, currency: row.currency,
      lines: row.items.map(line => ({ id: line.id, description: line.description, quantity: line.quantity, total: line.total })),
    })),
    ...remittances.map(row => ({
      key: `NR:${row.id}`, id: row.id, type: "NR" as const, number: row.visibleNumber,
      date: row.issuedAt ?? row.createdAt, state: row.state,
      concept: row.destinatarioSnapshot?.nombre || "Remito de material",
      // Declared shipping value is not a commercial amount or a receivable.
      lines: row.items.map(line => ({ id: line.id, description: line.description, quantity: line.quantity })),
    })),
    ...payments.map(row => ({
      key: `CO:${row.id}`, id: row.id, type: "CO" as const, number: row.visibleNumber,
      date: row.receivedAt, state: row.state, concept: "Cobro · importe total del recibo", amount: row.amount, currency: row.currency,
      lines: row.imputations.filter(line => invoiceIds.has(line.invoiceId))
        .map(line => ({ id: line.id, description: `Factura ${line.invoiceId}`, total: line.amount })),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key))
}
