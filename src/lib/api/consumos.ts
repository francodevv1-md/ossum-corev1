import { apiFetch } from "@/lib/api/client"

export const CONSUMO_STATES = [
  "Borrador",
  "Pendiente",
  "Validado",
  "Facturado",
  "Anulado",
] as const

export type ConsumoState = (typeof CONSUMO_STATES)[number]

export type ConsumoApiItem = {
  id: string
  remitoItemId?: string | null
  sku?: string | null
  description: string
  requestedQuantity: string | number
  consumedQuantity: string | number
  unit?: string | null
  lotNumber?: string | null
  serialNumber?: string | null
  expirationDate?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export type ConsumoApiRow = {
  id: string
  visibleNumber: number | null
  companyId: string
  surgeryId: string | null
  remitoId: string
  state: ConsumoState | string
  validatedAt: string | null
  facturedAt: string | null
  createdById: string | null
  updatedById: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  items?: ConsumoApiItem[]
}

export type ConsumoDraftItemPayload = {
  remitoItemId?: string
  sku?: string
  description: string
  requestedQuantity: string | number
  consumedQuantity?: string | number
  unit?: string
  lotNumber?: string
  serialNumber?: string
  expirationDate?: string
  metadata?: Record<string, unknown>
}

export type CreateConsumoPayload = {
  surgeryId?: string
  remitoId: string
  items: ConsumoDraftItemPayload[]
  metadata?: Record<string, unknown> | null
}

export type ListConsumosParams = {
  state?: ConsumoState | string
  surgeryId?: string
  remitoId?: string
  from?: string | Date
  to?: string | Date
  take?: number
  skip?: number
}

export type DeleteConsumoResult = {
  id: string
  deleted: true
}

function consumosBasePath(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/consumos`
}

function consumoPath(companyId: string, consumoId: string) {
  return `${consumosBasePath(companyId)}/${encodeURIComponent(consumoId)}`
}

function formatDateParam(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value
}

function appendParams(path: string, params?: ListConsumosParams) {
  const search = new URLSearchParams()
  if (params?.state) search.set("state", params.state)
  if (params?.surgeryId) search.set("surgeryId", params.surgeryId)
  if (params?.remitoId) search.set("remitoId", params.remitoId)
  if (params?.from) search.set("from", formatDateParam(params.from))
  if (params?.to) search.set("to", formatDateParam(params.to))
  if (params?.take !== undefined) search.set("take", String(params.take))
  if (params?.skip !== undefined) search.set("skip", String(params.skip))
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function fetchConsumos(companyId: string, params?: ListConsumosParams) {
  return apiFetch<ConsumoApiRow[]>(appendParams(consumosBasePath(companyId), params))
}

export function fetchConsumo(companyId: string, consumoId: string) {
  return apiFetch<ConsumoApiRow>(consumoPath(companyId, consumoId))
}

export function createConsumo(companyId: string, payload: CreateConsumoPayload) {
  return apiFetch<ConsumoApiRow>(consumosBasePath(companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export function updateConsumoState(companyId: string, consumoId: string, newState: ConsumoState | string) {
  return apiFetch<ConsumoApiRow>(`${consumoPath(companyId, consumoId)}/state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newState }),
  })
}

export function validateConsumo(companyId: string, consumoId: string, payload?: { cajasAccounting?: unknown }) {
  return apiFetch<ConsumoApiRow>(`${consumoPath(companyId, consumoId)}/validate`, {
    method: "POST",
    ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
  })
}

export function emitirConsumo(companyId: string, consumoId: string) {
  return apiFetch<ConsumoApiRow>(`${consumoPath(companyId, consumoId)}/emitir`, {
    method: "POST",
  })
}

export function deleteConsumo(companyId: string, consumoId: string) {
  return apiFetch<DeleteConsumoResult>(consumoPath(companyId, consumoId), {
    method: "DELETE",
  })
}

export function getConsumoVisibleNumber(consumo: Pick<ConsumoApiRow, "visibleNumber" | "id">) {
  return consumo.visibleNumber ? `C-${String(consumo.visibleNumber).padStart(4, "0")}` : consumo.id
}
