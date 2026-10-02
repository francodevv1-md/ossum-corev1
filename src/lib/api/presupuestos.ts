import { apiFetch } from "@/lib/api/client"
import type { FormItem, PresupuestoFormData } from "@/hooks/usePresupuestoForm"
import { ivaValueFromKey, ivaKeyFromValue } from "@/lib/presupuestos.constants"
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
  vatRate?: string
  vatTreatment?: string
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
  commercial: unknown
  client?: string | null
  financiador?: string | null
  patient?: string | null
  institution?: string | null
  vendedor?: string | null
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
  branchId?: string | null
  clientContactId?: string | null
  payerContactId?: string | null
  title?: string
  currency?: string
  documentDate?: string
  paymentTerms?: string
  priceListCode?: string
  legend?: string
  notes?: string
  validUntil?: string
  generalDiscountRate?: string | number
  commercial?: { pricingMode: "ESTIMATIVE" } | {
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
  } | Record<string, unknown>
  metadata?: Record<string, unknown>
  items: Array<{
    sku?: string
    description: string
    quantity: string | number
    unit?: string
    unitPrice: string | number
    discountRate?: string | number
    discountPercent?: string | number
    discount?: string | number
    taxRate?: string | number
    vatRate?: string | number
    vatTreatment?: string
    metadata?: Record<string, unknown>
  }>
}

export type CreatePresupuestoPayload = PresupuestoDraftPayload & { surgeryId?: string }
export type ReplacePresupuestoPayload = PresupuestoDraftPayload & { expectedRevision?: number }
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
  const validUntil = new Date(`${formData.fechaEmision || new Date().toISOString().slice(0, 10)}T12:00:00`)
  validUntil.setDate(validUntil.getDate() + (Number.parseInt(formData.vigencia, 10) || 30))
  return {
    branchId: formData.branchId || undefined,
    clientContactId: formData.clientContactId || undefined,
    payerContactId: formData.payerContactId || undefined,
    title: formData.concepto || undefined,
    currency: "ARS",
    documentDate: formData.fechaEmision,
    paymentTerms: formData.condicionPago || undefined,
    priceListCode: formData.listaPrecios || undefined,
    legend: DISTRICORR_ESTIMATIVE_LEGEND,
    notes: formData.observaciones || undefined,
    validUntil: validUntil.toISOString(),
    generalDiscountRate: formData.descuento,
    commercial: {
      pricingMode: "ESTIMATIVE",
    },
    metadata: {
      client: formData.client || undefined,
      financiador: formData.financiador || undefined,
      obraSocial: formData.obraSocial || undefined,
      patient: formData.patient || undefined,
      institution: formData.institution || undefined,
      vendedor: formData.vendedor || undefined,
      vigencia: formData.vigencia || undefined,
    },
    items: items.map((item) => ({
      sku: item.code || undefined,
      description: item.isArticuloLibre && item.descripcionLibre ? item.descripcionLibre : item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountRate: item.discountPercent,
      taxRate: ivaValueFromKey(item.ivaKey),
      vatRate: ivaValueFromKey(item.ivaKey),
      vatTreatment: item.ivaKey === "exento" ? "EXENTO" : item.ivaKey === "no_gravado" ? "NO_GRAVADO" : "GRAVADO",
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
  const meta = (item.metadata && typeof item.metadata === "object" ? item.metadata : {}) as Record<string, unknown>
  const clientName = item.client || (typeof meta.client === "string" ? meta.client : null) || snapshotParty(item.commercialSnapshot, "client")
  const financiadorName = item.financiador || (typeof meta.financiador === "string" ? meta.financiador : null) || snapshotParty(item.commercialSnapshot, "payer")
  const patientName = item.patient || (typeof meta.patient === "string" ? meta.patient : undefined)
  const institutionName = item.institution || (typeof meta.institution === "string" ? meta.institution : undefined)
  const vendedorName = item.vendedor || (typeof meta.vendedor === "string" ? meta.vendedor : undefined) || "Backend"
  const vigenciaVal = (typeof meta.vigencia === "string" ? meta.vigencia : undefined) || item.validUntil?.slice(0, 10) || "—"

  return {
    id: item.id,
    surgeryId: item.surgeryId ?? undefined,
    client: clientName,
    financiador: financiadorName,
    patient: patientName,
    institution: institutionName,
    vendedor: vendedorName,
    fechaEmision: item.documentDate?.slice(0, 10) ?? item.createdAt.slice(0, 10),
    vigencia: vigenciaVal,
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

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function formVatKey(line: PresupuestoItemApiRow) {
  return line.vatTreatment === "EXENTO" || line.vatTreatment === "NO_GRAVADO" ? "exento" : ivaKeyFromValue(Number(line.vatRate ?? line.taxRate))
}

export function toPresupuestoEditFormData(row: PresupuestoApiRow): Partial<PresupuestoFormData> {
  const legacy = toLegacyPresupuestoProjection(row)
  const meta = metadataObject(row.metadata)
  const days = row.validUntil ? Math.round((Date.parse(row.validUntil) - Date.parse(row.documentDate ?? row.createdAt)) / 86400000) : 30
  return {
    branchId: row.branchId ?? "", clientContactId: row.clientContactId ?? "", payerContactId: row.payerContactId ?? "",
    client: legacy.client ?? "", financiador: legacy.financiador ?? "", obraSocial: typeof meta.obraSocial === "string" ? meta.obraSocial : "",
    vendedor: legacy.vendedor ?? "", patient: legacy.patient ?? "", institution: legacy.institution ?? "",
    concepto: row.title ?? "", fechaEmision: legacy.fechaEmision, vigencia: typeof meta.vigencia === "string" ? meta.vigencia : `${Math.max(1, days)} días`,
    listaPrecios: row.priceListCode ?? "", condicionPago: row.paymentTerms ?? "", descuento: Number(row.generalDiscountRate),
    iva: row.items[0] ? formVatKey(row.items[0]) : "21", observaciones: row.notes ?? "", surgeryId: row.surgeryId ?? undefined,
    items: row.items.map((line) => {
      const catalogItemId = metadataObject(line.metadata).catalogItemId
      return { code: line.sku ?? "", name: line.description, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice),
        discountPercent: Number(line.discountRate), catalogItemId: typeof catalogItemId === "string" ? catalogItemId : "",
        isArticuloLibre: !catalogItemId, descripcionLibre: "", ivaKey: formVatKey(line), codeResolved: !!catalogItemId,
        persistedItemId: line.id }
    }),
  }
}

export function buildPresupuestoEditPayload(row: PresupuestoApiRow, form: PresupuestoFormData, items: FormItem[]): ReplacePresupuestoPayload {
  const payload = buildEstimativePresupuestoPayload(form, items)
  const initial = toPresupuestoEditFormData(row)
  return { ...payload, expectedRevision: row.revision, currency: row.currency, legend: row.legend ?? undefined,
    ...(form.fechaEmision === initial.fechaEmision && form.vigencia === initial.vigencia ? { validUntil: row.validUntil ?? undefined } : {}),
    commercial: Object.keys(metadataObject(row.commercial)).length ? metadataObject(row.commercial) : payload.commercial,
    metadata: { ...metadataObject(row.metadata), ...payload.metadata },
    items: payload.items.map((line, index) => {
      const item = items[index] as FormItem & { persistedItemId?: string }
      const source = row.items.find((entry) => entry.id === item.persistedItemId)
      if (!source) return line
      const sameVat = item.ivaKey === formVatKey(source)
      const unchangedAmounts = item.quantity === Number(source.quantity) && item.unitPrice === Number(source.unitPrice) &&
        item.discountPercent === Number(source.discountRate) && sameVat
      return { ...line, unit: source.unit ?? undefined,
        metadata: { ...metadataObject(source.metadata), ...line.metadata, catalogItemId: item.catalogItemId || undefined },
        ...(sameVat ? { vatTreatment: source.vatTreatment, vatRate: source.vatRate } : {}),
        // Preserve exact fixed amounts on note/description-only edits, rather than round-tripping a rounded discount percentage.
        ...(unchangedAmounts ? { quantity: source.quantity, unitPrice: source.unitPrice, discount: source.discount, tax: source.tax,
          discountPercent: undefined, discountRate: undefined } : {}),
      }
    }),
  }
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
