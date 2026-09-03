import { apiFetch } from "@/lib/api/client"

export type InvoiceState = "Borrador" | "Emitida" | "Parcialmente_cobrada" | "Cobrada" | "Anulada"
export type InvoiceBase = "presupuesto" | "consumo" | "manual" | "mixto"

export type InvoiceItemApiRow = {
  id: string
  sku: string | null
  description: string
  quantity: string
  unit: string | null
  unitPrice: string
  discount: string
  tax: string
  total: string
  sourceType: string | null
  sourceItemId: string | null
  metadata: unknown
  createdAt: string
  updatedAt: string
}

export type InvoiceApiRow = {
  id: string
  visibleNumber: number | null
  companyId: string
  surgeryId: string | null
  presupuestoId: string | null
  consumoId: string | null
  base: InvoiceBase
  state: InvoiceState
  type: string
  currency: string
  subtotal: string
  discountTotal: string
  taxTotal: string
  total: string
  paidTotal: string
  balance: string
  issuedAt: string | null
  cancelledAt: string | null
  createdById: string | null
  updatedById: string | null
  metadata: unknown
  createdAt: string
  updatedAt: string
  items: InvoiceItemApiRow[]
}

export type ListInvoicesParams = {
  surgeryId?: string
  state?: InvoiceState
  base?: InvoiceBase
  from?: string
  to?: string
  take?: number
  skip?: number
}

/** One-line manual draft: one unit at `amount`, with no fiscal issuance. */
export type CreateManualInvoiceDraftPayload = {
  description: string
  amount: string | number
  surgeryId?: string
  reference?: string
}

export type CreateInvoiceFromSourcePayload = {
  presupuestoId: string
  consumoId?: string
}

function basePath(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/invoices`
}

function queryString(params?: ListInvoicesParams) {
  const query = new URLSearchParams()
  if (params?.surgeryId) query.set("surgeryId", params.surgeryId)
  if (params?.state) query.set("state", params.state)
  if (params?.base) query.set("base", params.base)
  if (params?.from) query.set("from", params.from)
  if (params?.to) query.set("to", params.to)
  if (params?.take !== undefined) query.set("take", String(params.take))
  if (params?.skip !== undefined) query.set("skip", String(params.skip))
  const value = query.toString()
  return value ? `?${value}` : ""
}

export function fetchInvoices(companyId: string, params?: ListInvoicesParams) {
  return apiFetch<InvoiceApiRow[]>(`${basePath(companyId)}${queryString(params)}`)
}

export async function fetchAllInvoices(companyId: string, params?: Omit<ListInvoicesParams, "take" | "skip">) {
  const rows: InvoiceApiRow[] = []
  const take = 500
  for (let skip = 0; ; skip += take) {
    const page = await fetchInvoices(companyId, { ...params, take, skip })
    rows.push(...page)
    if (page.length < take) return rows
  }
}

export function createManualInvoiceDraft(companyId: string, payload: CreateManualInvoiceDraftPayload) {
  return apiFetch<InvoiceApiRow>(basePath(companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      surgeryId: payload.surgeryId,
      base: "manual",
      type: "FV",
      currency: "ARS",
      items: [{
        description: payload.description,
        quantity: "1",
        unitPrice: payload.amount,
        discount: "0",
        tax: "0",
      }],
      metadata: payload.reference ? { reference: payload.reference } : undefined,
    }),
  })
}

export function createInvoiceDraftFromSource(companyId: string, payload: CreateInvoiceFromSourcePayload) {
  return apiFetch<InvoiceApiRow>(basePath(companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export function emitInvoice(companyId: string, invoiceId: string) {
  return apiFetch<InvoiceApiRow>(`${basePath(companyId)}/${encodeURIComponent(invoiceId)}/emitir`, {
    method: "POST",
  })
}
