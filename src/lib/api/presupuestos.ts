import { apiFetch } from "@/lib/api/client"
import type { FormItem, PresupuestoFormData } from "@/hooks/usePresupuestoForm"
import { ivaValueFromKey } from "@/lib/presupuestos.constants"
import type { Presupuesto } from "@/types"

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
  slot: "DRAFT" | "CURRENT" | "HISTORY"
  revision: number
  state: PresupuestoState
  title: string | null
  currency: string
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
export type PresupuestoContactOption = {
  id: string
  firstName: string | null
  lastName: string | null
  legalName: string | null
  documentNumber: string | null
}

export const DISTRICORR_ESTIMATIVE_LEGEND =
  "El presente presupuesto es estimativo y se emite para orientación inicial del paciente. Queda sujeto a confirmación de disponibilidad de implantes, definición final del acto quirúrgico, institución, fecha de cirugía, logística y validación operativa correspondiente."

export function buildEstimativePresupuestoPayload(formData: PresupuestoFormData, items: FormItem[]): PresupuestoDraftPayload {
  const validUntil = new Date(`${formData.fechaEmision}T12:00:00`)
  validUntil.setDate(validUntil.getDate() + (Number.parseInt(formData.vigencia, 10) || 30))
  return {
    branchId: formData.branchId,
    clientContactId: formData.clientContactId,
    payerContactId: formData.payerContactId,
    title: formData.concepto || undefined,
    currency: "ARS",
    documentDate: formData.fechaEmision,
    paymentTerms: formData.condicionPago,
    priceListCode: formData.listaPrecios,
    legend: DISTRICORR_ESTIMATIVE_LEGEND,
    notes: formData.observaciones || undefined,
    validUntil: validUntil.toISOString(),
    generalDiscountRate: formData.descuento,
    commercial: { pricingMode: "ESTIMATIVE" },
    items: items.map((item) => ({
      sku: item.code || undefined,
      description: item.isArticuloLibre && item.descripcionLibre ? item.descripcionLibre : item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountRate: item.discountPercent,
      taxRate: ivaValueFromKey(item.ivaKey),
      metadata: item.catalogItemId ? { catalogItemId: item.catalogItemId } : undefined,
    })),
  }
}

function snapshotParty(snapshot: unknown, key: "client" | "payer") {
  if (!snapshot || typeof snapshot !== "object") return "—"
  const value = (snapshot as Record<string, unknown>)[key]
  if (!value || typeof value !== "object") return "—"
  const party = value as Record<string, unknown>
  return [party.legalName, [party.firstName, party.lastName].filter(Boolean).join(" ")]
    .find((candidate) => typeof candidate === "string" && candidate.trim()) as string || "—"
}

/** Compatibility projection for existing downstream calculators and presentational props. */
export function toLegacyPresupuestoProjection(item: PresupuestoApiRow): Presupuesto {
  return {
    id: item.id,
    surgeryId: item.surgeryId ?? undefined,
    client: snapshotParty(item.commercialSnapshot, "client"),
    financiador: snapshotParty(item.commercialSnapshot, "payer"),
    vendedor: "Backend",
    fechaEmision: item.documentDate?.slice(0, 10) ?? item.createdAt.slice(0, 10),
    vigencia: item.validUntil?.slice(0, 10) ?? "—",
    listaPrecios: item.priceListCode ?? "—",
    condicionPago: item.paymentTerms ?? undefined,
    descuento: Number(item.generalDiscountRate),
    items: item.items.map((line) => ({
      stockItemId: line.id,
      name: line.description,
      code: line.sku ?? "",
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      discountPercent: Number(line.discountRate),
      subtotal: Number(line.total),
      ivaKey: line.taxRate,
    })),
    subtotal: Number(item.subtotal),
    total: Number(item.total),
    state: item.state as Presupuesto["state"],
    createdAt: item.createdAt,
    approvedAt: item.approvedAt ?? undefined,
    observaciones: item.notes ?? undefined,
    bloqueado: item.slot !== "DRAFT",
    version: item.versionNumber,
    versionStatus: item.slot === "HISTORY" ? "reemplazada" : item.state === "Aprobado" ? "aprobada" : "vigente",
    parentPresupuestoId: item.sourcePresupuestoId ?? undefined,
  }
}

function basePath(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/presupuestos`
}

function itemPath(companyId: string, presupuestoId: string) {
  return `${basePath(companyId)}/${encodeURIComponent(presupuestoId)}`
}

function request<T = PresupuestoApiRow>(companyId: string, presupuestoId: string, suffix: string, method: string, body: unknown) {
  return apiFetch<T>(`${itemPath(companyId, presupuestoId)}${suffix}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export function fetchPresupuestoCatalogs(companyId: string) {
  const companyPath = `/api/companies/${encodeURIComponent(companyId)}`
  return Promise.all([
    apiFetch<PresupuestoBranchOption[]>(`${companyPath}/branches`),
    apiFetch<PresupuestoContactOption[]>(`${companyPath}/contacts?isActive=true&take=500`),
  ]).then(([branches, contacts]) => ({ branches, contacts }))
}

export function createPresupuesto(companyId: string, payload: CreatePresupuestoPayload) {
  return apiFetch<PresupuestoApiRow>(basePath(companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
