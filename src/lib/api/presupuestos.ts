import { apiFetch } from "@/lib/api/client"

export type PresupuestoState = "Borrador" | "Emitido" | "Aprobado" | "Rechazado" | "Vencido" | "Reemplazado" | "Anulado"
export type PresupuestoAction = "edit" | "delete" | "emit" | "approve" | "reject" | "expire" | "annul" | "revise"
export type PresupuestoItemApiRow = {
  id: string
  position: number
  sku: string | null
  description: string
  quantity: string
  unit: string | null
  unitPrice: string
  discountRate: string
  discount: string
  taxRate: string
  tax: string
  total: string
  metadata: unknown
}

/** Canonical backend DTO; pending-invoice consumers retain the same read interface. */
export type PresupuestoApiRow = {
  id: string
  visibleNumber: number | null
  companyId: string
  familyId: string
  surgeryId: string | null
  branchId: string | null
  clientContactId: string | null
  payerContactId: string | null
  parentPresupuestoId: string | null
  sourcePresupuestoId: string | null
  versionNumber: number
  revision: number
  slot: "DRAFT" | "CURRENT" | "HISTORY"
  state: PresupuestoState
  currency: string
  title: string | null
  documentDate: string | null
  paymentTerms: string | null
  priceListCode: string | null
  legend: string | null
  notes: string | null
  generalDiscountRate: string
  commercialSnapshot: unknown
  subtotal: string
  discountTotal: string
  taxTotal: string
  total: string
  validUntil: string | null
  issuedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdById: string | null
  updatedById: string | null
  metadata: unknown
  createdAt: string
  updatedAt: string
  items: PresupuestoItemApiRow[]
  actions: PresupuestoAction[]
}

export type PresupuestoDraftPayload = {
  branchId: string
  clientContactId: string
  payerContactId: string
  title?: string
  currency?: string
  documentDate: string
  paymentTerms: string
  priceListCode: string
  legend: string
  notes?: string
  validUntil: string
  generalDiscountRate?: string | number
  commercial: { pricingMode: "ESTIMATIVE" } | {
    pricingMode: "FIRM"
    firmPrice: {
      coordinator: string
      quotationContact: string
      includedMaterials: string[]
      excludedMaterials: string[]
      availability: string
      operationalClarifications: string
      surgicalAssumptions: string
    }
  }
  items: Array<{
    sku?: string
    description: string
    quantity: string | number
    unit?: string
    unitPrice: string | number
    discountRate?: string | number
    taxRate?: string | number
    metadata?: Record<string, unknown>
  }>
}
export type CreatePresupuestoPayload = PresupuestoDraftPayload & { surgeryId?: string }
export type ReplacePresupuestoPayload = PresupuestoDraftPayload & { expectedRevision: number }
export type ListPresupuestosParams = { surgeryId?: string; state?: PresupuestoState; take?: number; skip?: number }
export type PresupuestoBranchOption = { id: string; name: string }
export type PresupuestoContactOption = { id: string; firstName: string | null; lastName: string | null; legalName: string | null; documentNumber: string | null }

export const DISTRICORR_ESTIMATIVE_LEGEND =
  "El presente presupuesto es estimativo y se emite para orientación inicial del paciente. Queda sujeto a confirmación de disponibilidad de implantes, definición final del acto quirúrgico, institución, fecha de cirugía, logística y validación operativa correspondiente."

function basePath(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/presupuestos`
}

function itemPath(companyId: string, presupuestoId: string) {
  return `${basePath(companyId)}/${encodeURIComponent(presupuestoId)}`
}

function request<T = PresupuestoApiRow>(companyId: string, presupuestoId: string, suffix: string, method: string, body: unknown) {
  return apiFetch<T>(`${itemPath(companyId, presupuestoId)}${suffix}`, {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  })
}

export function fetchPresupuestos(companyId: string, params?: ListPresupuestosParams) {
  const search = new URLSearchParams()
  if (params?.surgeryId) search.set("surgeryId", params.surgeryId)
  if (params?.state) search.set("state", params.state)
  if (params?.take !== undefined) search.set("take", String(params.take))
  if (params?.skip !== undefined) search.set("skip", String(params.skip))
  const query = search.toString()
  return apiFetch<PresupuestoApiRow[]>(`${basePath(companyId)}${query ? `?${query}` : ""}`)
}

export function fetchPresupuesto(companyId: string, presupuestoId: string) {
  return apiFetch<PresupuestoApiRow>(itemPath(companyId, presupuestoId))
}

export async function fetchPresupuestoCatalogs(companyId: string) {
  const companyPath = `/api/companies/${encodeURIComponent(companyId)}`
  const [branches, contacts] = await Promise.all([
    apiFetch<PresupuestoBranchOption[]>(`${companyPath}/branches`),
    (async () => {
      const rows: PresupuestoContactOption[] = []
      for (let skip = 0; ; skip += 500) {
        const page = await apiFetch<PresupuestoContactOption[]>(`${companyPath}/contacts?isActive=true&take=500&skip=${skip}`)
        rows.push(...page)
        if (page.length < 500) return rows
      }
    })(),
  ])
  return { branches, contacts }
}

export function createPresupuesto(companyId: string, payload: CreatePresupuestoPayload) {
  return apiFetch<PresupuestoApiRow>(basePath(companyId), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  })
}

export function replacePresupuestoDraft(companyId: string, presupuestoId: string, payload: ReplacePresupuestoPayload) {
  return request(companyId, presupuestoId, "", "PATCH", payload)
}
export function deletePresupuestoDraft(companyId: string, presupuestoId: string, expectedRevision: number) {
  return request<{ id: string; deleted: true }>(companyId, presupuestoId, "", "DELETE", { expectedRevision })
}
export function createPresupuestoRevision(companyId: string, presupuestoId: string, expectedRevision: number) {
  return request(companyId, presupuestoId, "/versions", "POST", { expectedRevision })
}
export function emitPresupuesto(companyId: string, presupuestoId: string, expectedRevision: number) {
  return request(companyId, presupuestoId, "/emitir", "POST", { expectedRevision })
}
export function transitionPresupuesto(companyId: string, presupuestoId: string, command: "approve" | "reject" | "expire" | "annul", expectedRevision: number) {
  return request(companyId, presupuestoId, "/state", "PATCH", { command, expectedRevision })
}
