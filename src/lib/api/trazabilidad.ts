import { apiFetch } from "@/lib/api/client"

export type TraceTimelineKind =
  | "remito.created"
  | "remito.issued"
  | "remito.delivered"
  | "remito.returned"
  | "remito.state_changed"
  | "consumo.created"
  | "consumo.emitted"
  | "consumo.validated"
  | "consumo.factured"
  | "consumo.state_changed"
  | "devolucion.created"
  | "devolucion.confirmed"
  | "devolucion.rejected"
  | "devolucion.state_changed"
  | "audit.event"
  | "stock.movement"

export type TraceSourceType = "Remito" | "Consumo" | "Devolucion" | "AuditEvent" | "StockMovement"

export type TraceTimelineEvent = {
  id: string
  occurredAt: string
  kind: TraceTimelineKind
  label: string
  sourceType: TraceSourceType
  sourceId: string
  sourceVisibleNumber?: number | null
  sourceState?: string | null
  actorUserId?: string | null
  module?: string | null
  severity: "info" | "success" | "warning" | "danger"
  related?: {
    remitoId?: string
    consumoId?: string
    devolucionId?: string
    remitoItemId?: string
    consumoItemId?: string
    devolucionItemId?: string
  }
  metadata?: Record<string, unknown>
}

export type TraceItemRow = {
  id: string
  remitoId?: string
  remitoItemId?: string
  consumoIds: string[]
  consumoItemIds: string[]
  devolucionIds: string[]
  devolucionItemIds: string[]
  itemId?: string | null
  sku?: string | null
  description: string
  unit?: string | null
  lot?: string | null
  serial?: string | null
  expiry?: string | null
  brand?: string | null
  department?: string | null
  sentQuantity: number
  consumedQuantity: number
  returnedQuantity: number
  pendingQuantity: number
  matchConfidence: "direct" | "soft" | "unmatched"
  status: "ok" | "pending" | "difference" | "unknown"
  sourceFlags: {
    hasRemito: boolean
    hasConsumo: boolean
    hasDevolucion: boolean
    hasStockMovement: boolean
  }
  warnings: string[]
  metadata?: Record<string, unknown>
}

export type TraceSummary = {
  remitosCount: number
  consumosCount: number
  devolucionesCount: number
  eventsCount: number
  itemRowsCount: number
  totalSentQuantity: number
  totalConsumedQuantity: number
  totalReturnedQuantity: number
  rowsWithDifference: number
  rowsWithUnknownLotOrSerial: number
  hasStockMovements: boolean
}

export type TraceGap = {
  code:
    | "NO_REMITOS"
    | "NO_CONSUMOS"
    | "NO_DEVOLUCIONES"
    | "NO_STOCK_MOVEMENTS"
    | "LOT_SERIAL_METADATA_ONLY"
    | "UNMATCHED_CONSUMO_ITEM"
    | "UNMATCHED_DEVOLUCION_ITEM"
    | "RETURNED_QUANTITY_SOURCE_CONFLICT"
  message: string
  severity: "info" | "warning" | "danger"
  sourceIds?: string[]
}

export type TraceSourceRef = {
  type: "Remito" | "RemitoItem" | "Consumo" | "ConsumoItem" | "Devolucion" | "DevolucionItem" | "AuditEvent"
  id: string
  visibleNumber?: number | null
}

export type TraceResponse = {
  companyId: string
  surgeryId: string
  generatedAt: string
  sourceVersion: "v0-derived"
  summary: TraceSummary
  timeline: TraceTimelineEvent[]
  items: TraceItemRow[]
  gaps: TraceGap[]
  sources?: TraceSourceRef[]
}

export type FetchTraceParams = {
  includeAudit?: boolean
  includeItems?: boolean
  includeSources?: boolean
  from?: string
  to?: string
}

function tracePath(companyId: string, surgeryId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/trace`
}

function appendParams(path: string, params?: FetchTraceParams) {
  const search = new URLSearchParams()
  if (params?.includeAudit !== undefined) search.set("includeAudit", String(params.includeAudit))
  if (params?.includeItems !== undefined) search.set("includeItems", String(params.includeItems))
  if (params?.includeSources !== undefined) search.set("includeSources", String(params.includeSources))
  if (params?.from) search.set("from", params.from)
  if (params?.to) search.set("to", params.to)
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function fetchSurgeryTrace(companyId: string, surgeryId: string, params?: FetchTraceParams) {
  return apiFetch<TraceResponse>(appendParams(tracePath(companyId, surgeryId), params))
}
