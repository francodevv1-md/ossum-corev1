import { apiFetch } from "@/lib/api/client"

export const DEVOLUCION_STATES = [
  "Borrador",
  "Pendiente",
  "Confirmada",
  "Rechazada",
  "Anulada",
] as const

export type DevolucionState = (typeof DEVOLUCION_STATES)[number]

export type DevolucionApiItem = {
  id: string
  remitoItemId?: string | null
  consumoItemId?: string | null
  sku?: string | null
  description: string
  returnedQuantity: string | number
  unit?: string | null
  lotNumber?: string | null
  serialNumber?: string | null
  expirationDate?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export type DevolucionApiRow = {
  id: string
  visibleNumber: number | null
  companyId: string
  surgeryId: string | null
  remitoId: string
  consumoId: string | null
  state: DevolucionState | string
  reason: string | null
  validatedAt: string | null
  createdById: string | null
  updatedById: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  items?: DevolucionApiItem[]
}

export type DevolucionDraftItemPayload = {
  remitoItemId?: string
  consumoItemId?: string
  sku?: string
  description: string
  returnedQuantity: string | number
  unit?: string
  lotNumber?: string
  serialNumber?: string
  expirationDate?: string
  metadata?: Record<string, unknown>
}

export type CreateDevolucionPayload = {
  surgeryId?: string
  remitoId: string
  consumoId?: string
  items: DevolucionDraftItemPayload[]
  reason?: string
  metadata?: Record<string, unknown> | null
}

export type ListDevolucionesParams = {
  state?: DevolucionState | string
  surgeryId?: string
  remitoId?: string
  consumoId?: string
  from?: string | Date
  to?: string | Date
  take?: number
  skip?: number
}

export type DeleteDevolucionResult = {
  id: string
  deleted: true
}

function devolucionesBasePath(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/devoluciones`
}

function devolucionPath(companyId: string, devolucionId: string) {
  return `${devolucionesBasePath(companyId)}/${encodeURIComponent(devolucionId)}`
}

function formatDateParam(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value
}

function appendParams(path: string, params?: ListDevolucionesParams) {
  const search = new URLSearchParams()
  if (params?.state) search.set("state", params.state)
  if (params?.surgeryId) search.set("surgeryId", params.surgeryId)
  if (params?.remitoId) search.set("remitoId", params.remitoId)
  if (params?.consumoId) search.set("consumoId", params.consumoId)
  if (params?.from) search.set("from", formatDateParam(params.from))
  if (params?.to) search.set("to", formatDateParam(params.to))
  if (params?.take !== undefined) search.set("take", String(params.take))
  if (params?.skip !== undefined) search.set("skip", String(params.skip))
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function fetchDevoluciones(companyId: string, params?: ListDevolucionesParams) {
  return apiFetch<DevolucionApiRow[]>(appendParams(devolucionesBasePath(companyId), params))
}

export function fetchDevolucion(companyId: string, devolucionId: string) {
  return apiFetch<DevolucionApiRow>(devolucionPath(companyId, devolucionId))
}

export function createDevolucion(companyId: string, payload: CreateDevolucionPayload) {
  return apiFetch<DevolucionApiRow>(devolucionesBasePath(companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export function updateDevolucionState(companyId: string, devolucionId: string, newState: DevolucionState | string) {
  return apiFetch<DevolucionApiRow>(`${devolucionPath(companyId, devolucionId)}/state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newState }),
  })
}

export function confirmDevolucion(companyId: string, devolucionId: string) {
  return apiFetch<DevolucionApiRow>(`${devolucionPath(companyId, devolucionId)}/confirm`, {
    method: "POST",
  })
}

export function deleteDevolucion(companyId: string, devolucionId: string) {
  return apiFetch<DeleteDevolucionResult>(devolucionPath(companyId, devolucionId), {
    method: "DELETE",
  })
}

export function getDevolucionVisibleNumber(devolucion: Pick<DevolucionApiRow, "visibleNumber" | "id">) {
  return devolucion.visibleNumber ? `D-${String(devolucion.visibleNumber).padStart(4, "0")}` : devolucion.id
}
