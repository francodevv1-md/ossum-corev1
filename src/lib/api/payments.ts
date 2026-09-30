import { apiFetch } from "@/lib/api/client"

export type PaymentState = "Registrado" | "Anulado"
export type PaymentMethod = "transfer" | "cash" | "check" | "other"

export type PaymentImputationApiRow = {
  id: string
  invoiceId: string
  amount: string
  metadata: unknown
  createdAt: string
  updatedAt: string
}

export type PaymentApiRow = {
  id: string
  visibleNumber: number
  companyId: string
  surgeryId: string | null
  state: PaymentState
  method: string | null
  currency: string
  amount: string
  receivedAt: string
  createdById: string | null
  updatedById: string | null
  metadata: unknown
  createdAt: string
  updatedAt: string
  imputations: PaymentImputationApiRow[]
}

export type ListPaymentsParams = {
  surgeryId?: string
  state?: PaymentState
  from?: string
  to?: string
  take?: number
  skip?: number
}

export type PaymentImputationPayload = {
  invoiceId: string
  amount: string | number
  metadata?: Record<string, unknown>
}

export type CreatePaymentPayload = {
  surgeryId?: string
  amount: string | number
  method?: PaymentMethod | string
  currency?: string
  receivedAt?: string
  reference?: string
  notes?: string
  imputations?: PaymentImputationPayload[]
  metadata?: Record<string, unknown>
}

export type CreateInvoicePaymentPayload = {
  invoiceId: string
  surgeryId?: string
  amount: string | number
  method?: PaymentMethod
  receivedAt?: string
  reference?: string
  notes?: string
}

function basePath(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/payments`
}

function queryString(params?: ListPaymentsParams) {
  const query = new URLSearchParams()
  if (params?.surgeryId) query.set("surgeryId", params.surgeryId)
  if (params?.state) query.set("state", params.state)
  if (params?.from) query.set("from", params.from)
  if (params?.to) query.set("to", params.to)
  if (params?.take !== undefined) query.set("take", String(params.take))
  if (params?.skip !== undefined) query.set("skip", String(params.skip))
  const value = query.toString()
  return value ? `?${value}` : ""
}

export function fetchPayments(companyId: string, params?: ListPaymentsParams) {
  return apiFetch<PaymentApiRow[]>(`${basePath(companyId)}${queryString(params)}`)
}

export async function fetchAllPayments(companyId: string, params?: Omit<ListPaymentsParams, "take" | "skip">) {
  const rows: PaymentApiRow[] = []
  const take = 500
  for (let skip = 0; ; skip += take) {
    const page = await fetchPayments(companyId, { ...params, take, skip })
    rows.push(...page)
    if (page.length < take) return rows
  }
}

export function createPayment(companyId: string, payload: CreatePaymentPayload) {
  const metadata = {
    ...(payload.metadata ?? {}),
    ...(payload.reference ? { reference: payload.reference } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
  }
  return apiFetch<PaymentApiRow>(basePath(companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      surgeryId: payload.surgeryId,
      method: payload.method,
      currency: payload.currency ?? "ARS",
      amount: String(payload.amount),
      receivedAt: payload.receivedAt,
      imputations: (payload.imputations ?? []).map((imp) => ({
        invoiceId: imp.invoiceId,
        amount: String(imp.amount),
        metadata: imp.metadata,
      })),
      metadata: Object.keys(metadata).length ? metadata : undefined,
    }),
  })
}

export function createInvoicePayment(companyId: string, payload: CreateInvoicePaymentPayload) {
  return createPayment(companyId, {
    surgeryId: payload.surgeryId,
    amount: payload.amount,
    method: payload.method,
    receivedAt: payload.receivedAt,
    reference: payload.reference,
    notes: payload.notes,
    imputations: [{ invoiceId: payload.invoiceId, amount: payload.amount }],
  })
}

export function cancelPayment(companyId: string, paymentId: string) {
  return apiFetch<PaymentApiRow>(`${basePath(companyId)}/${encodeURIComponent(paymentId)}/cancel`, {
    method: "POST",
  })
}
