import { apiFetch } from "@/lib/api/client"

export const REMITO_STATES = [
  "Borrador",
  "Emitido",
  "En_transito",
  "Entregado",
  "Parcialmente_devuelto",
  "Devuelto",
  "Anulado",
] as const

export const REMITO_ORIGINS = ["box", "presupuesto", "manual", "mixto"] as const
export const REMITO_SALIDA_REASONS = ["cirugia", "venta", "prestamo", "traslado", "ajuste", "otro"] as const

export type RemitoState = (typeof REMITO_STATES)[number]
export type RemitoOrigin = (typeof REMITO_ORIGINS)[number]
export type RemitoSalidaReason = (typeof REMITO_SALIDA_REASONS)[number]

export type RemitoDestinatarioSnapshot = {
  nombre?: string
  codigoContacto?: string
  cuitDni?: string
  domicilio?: string
  localidad?: string
  provincia?: string
  [key: string]: unknown
}

export type RemitoShippingAddressSnapshot = {
  domicilio?: string
  localidad?: string
  provincia?: string
  [key: string]: unknown
}

export type RemitoTransportSnapshot = {
  nombre?: string
  [key: string]: unknown
}

export type RemitoApiItem = {
  id: string
  itemId: string | null
  sku: string | null
  description: string
  quantity: string | number
  unit: string | null
  boxId: string | null
  presupuestoItemId: string | null
  returnedQuantity: string | number | null
  lotNumber: string | null
  serialNumber: string | null
  expirationDate: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type RemitoApiRow = {
  id: string
  visibleNumber: number | null
  companyId: string
  branchId: string | null
  issuedBranchId: string | null
  documentType: string
  surgeryId: string | null
  origin: RemitoOrigin | string
  salidaReason: RemitoSalidaReason | string
  boxId: string | null
  presupuestoId: string | null
  destinatarioContactId: string | null
  destinatarioSnapshot: RemitoDestinatarioSnapshot | null
  shippingAddressSnapshot: RemitoShippingAddressSnapshot | null
  transportSnapshot: RemitoTransportSnapshot | null
  packageCount: number | null
  declaredValue: string | number | null
  state: RemitoState | string
  issuedAt: string | null
  deliveredAt: string | null
  returnedAt: string | null
  createdById: string | null
  updatedById: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  items: RemitoApiItem[]
}

export type RemitoDraftItemPayload = {
  itemId?: string
  sku?: string
  description: string
  quantity: string | number
  unit?: string
  boxId?: string
  presupuestoItemId?: string
  lotNumber?: string
  serialNumber?: string
  expirationDate?: string
  metadata?: Record<string, unknown>
}

export type CreateRemitoPayload = {
  branchId: string
  issuedBranchId?: string
  surgeryId?: string
  origin: RemitoOrigin
  salidaReason: RemitoSalidaReason
  boxId?: string | null
  presupuestoId?: string | null
  destinatarioContactId?: string | null
  destinatarioSnapshot?: RemitoDestinatarioSnapshot | null
  shippingAddressSnapshot?: RemitoShippingAddressSnapshot | null
  transportSnapshot?: RemitoTransportSnapshot | null
  packageCount?: number | null
  declaredValue?: string | number | null
  items: RemitoDraftItemPayload[]
  metadata?: Record<string, unknown> | null
}

export type UpdateRemitoDraftPayload = Partial<Omit<CreateRemitoPayload, "origin" | "surgeryId">> & {
  surgeryId?: string | null
  expectedUpdatedAt?: string
}

export type RemitoDevPresetUnavailable = { available: false }

export type RemitoDevPresetAvailable = {
  available: true
  branch: { id: string; label: string }
  example: {
    surgeryId: string
    origin: RemitoOrigin
    salidaReason: RemitoSalidaReason
    recipientSnapshot: RemitoDestinatarioSnapshot
    shippingAddressSnapshot: RemitoShippingAddressSnapshot | null
    transportSnapshot: RemitoTransportSnapshot | null
    packageCount: number | null
    declaredValue: string | number | null
    metadata: Record<string, unknown> | null
    items: RemitoDraftItemPayload[]
  }
}

export type RemitoDevPreset = RemitoDevPresetUnavailable | RemitoDevPresetAvailable

export type ListRemitosParams = {
  state?: string
  origin?: string
  salidaReason?: string
  branchId?: string
  surgeryId?: string
  take?: number
  skip?: number
}

function remitosBasePath(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/remitos`
}

function remitoPath(companyId: string, remitoId: string) {
  return `${remitosBasePath(companyId)}/${encodeURIComponent(remitoId)}`
}

function appendParams(path: string, params?: ListRemitosParams) {
  const search = new URLSearchParams()
  if (params?.state) search.set("state", params.state)
  if (params?.origin) search.set("origin", params.origin)
  if (params?.salidaReason) search.set("salidaReason", params.salidaReason)
  if (params?.branchId) search.set("branchId", params.branchId)
  if (params?.surgeryId) search.set("surgeryId", params.surgeryId)
  if (params?.take !== undefined) search.set("take", String(params.take))
  if (params?.skip !== undefined) search.set("skip", String(params.skip))
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function fetchRemitos(companyId: string, params?: ListRemitosParams) {
  return apiFetch<RemitoApiRow[]>(appendParams(remitosBasePath(companyId), params))
}

export function fetchRemito(companyId: string, remitoId: string) {
  return apiFetch<RemitoApiRow>(remitoPath(companyId, remitoId))
}

export function fetchRemitoDevPreset(companyId: string) {
  return apiFetch<RemitoDevPreset>(`${remitosBasePath(companyId)}/dev-preset`)
}

export function createRemito(companyId: string, payload: CreateRemitoPayload) {
  return apiFetch<RemitoApiRow>(remitosBasePath(companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export function updateRemitoDraft(companyId: string, remitoId: string, payload: UpdateRemitoDraftPayload) {
  return apiFetch<RemitoApiRow>(remitoPath(companyId, remitoId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export function emitirRemito(companyId: string, remitoId: string, intent?: import("../validators/remito").RemitoEmitInput) {
  return apiFetch<RemitoApiRow>(`${remitoPath(companyId, remitoId)}/emitir`, {
    method: "POST",
    ...(intent ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(intent) } : {}),
  })
}

export function updateRemitoState(companyId: string, remitoId: string, state: RemitoState | string) {
  return apiFetch<RemitoApiRow>(`${remitoPath(companyId, remitoId)}/state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  })
}

export function registrarRemitoDevolucion(
  companyId: string,
  remitoId: string,
  items: Array<{ itemId: string; returnedQuantity: string | number }>,
  idempotencyKey?: string
) {
  return apiFetch<RemitoApiRow>(`${remitoPath(companyId, remitoId)}/devolucion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, idempotencyKey }),
  })
}

export function getRemitoVisibleNumber(remito: Pick<RemitoApiRow, "visibleNumber" | "id">) {
  return remito.visibleNumber ? `R-${String(remito.visibleNumber).padStart(4, "0")}` : remito.id
}

export function getRemitoDestinatarioName(remito: Pick<RemitoApiRow, "destinatarioSnapshot">) {
  return remito.destinatarioSnapshot?.nombre || "Sin destinatario"
}
