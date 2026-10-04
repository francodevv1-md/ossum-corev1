import { apiFetch } from "./client"
import type { OrdenCompraState, OrdenCompraReceiptAllocation, OrdenCompraReceiptWarning } from "../services/orden-compra.service"

export type { OrdenCompraState }
export type { OrdenCompraReceiptAllocation, OrdenCompraReceiptWarning }

export type OrdenCompraItemApiRow = {
  id: string
  stockItemId: string
  name: string
  code: string
  quantity: string
  unitPrice: string
  subtotal: string
  received: string
  isArticuloZ: boolean
  descripcionLibre: string | null
}

export type OrdenCompraApiRow = {
  id: string
  proveedorId: string
  proveedorName: string
  total: string
  state: OrdenCompraState
  stateLabel: string
  emitidaAt: string | null
  enviadaAt: string | null
  recibidaAt: string | null
  canceladaAt: string | null
  observaciones: string | null
  necesidadCompraIds: string[]
  createdAt: string
  items: OrdenCompraItemApiRow[]
  /** Only present for accepted expired ingress; persisted evidence is returned unchanged on replay. */
  receiptWarnings?: OrdenCompraReceiptWarning[]
}

export type CreateOrdenCompraPayload = {
  proveedorId: string
  proveedorName: string
  items: Array<{ stockItemId: string; name: string; code: string; quantity: string | number; unitPrice: string | number }>
}

export type ReceiveOrdenCompraPayload = {
  location: string
  operationKey: string
  receivedByItem: Array<{ itemId: string; received: string | number; allocations?: OrdenCompraReceiptAllocation[] }>
}

const base = (companyId: string) => `/api/companies/${encodeURIComponent(companyId)}/ordenes-compra`

export const fetchOrdenesCompra = (companyId: string) => apiFetch<OrdenCompraApiRow[]>(base(companyId))
export const createOrdenCompra = (companyId: string, payload: CreateOrdenCompraPayload) => apiFetch<OrdenCompraApiRow>(base(companyId), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
export const emitirOrdenCompra = (companyId: string, id: string) => apiFetch<OrdenCompraApiRow>(`${base(companyId)}/${id}/emitir`, { method: "POST" })
export const enviarOrdenCompra = (companyId: string, id: string) => apiFetch<OrdenCompraApiRow>(`${base(companyId)}/${id}/enviar`, { method: "POST" })
export const recibirOrdenCompra = (companyId: string, id: string, payload: ReceiveOrdenCompraPayload) => apiFetch<OrdenCompraApiRow>(`${base(companyId)}/${id}/recibir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
