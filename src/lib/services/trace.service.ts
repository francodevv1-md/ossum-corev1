// OSSUM COR — Traceability service (TRACE-API-001)
// Read-only derived view. Do not persist trace rows and do not use legacy traceEntries.

import type { Prisma, PrismaClient } from "@prisma/client";

import { notFound } from "../api/errors";
import { requireCompanyId } from "../tenant";

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
  | "stock.movement";

export type TraceSourceType = "Remito" | "Consumo" | "Devolucion" | "AuditEvent" | "StockMovement";

export type TraceTimelineEvent = {
  id: string;
  occurredAt: string;
  kind: TraceTimelineKind;
  label: string;
  sourceType: TraceSourceType;
  sourceId: string;
  sourceVisibleNumber?: number | null;
  sourceState?: string | null;
  actorUserId?: string | null;
  module?: string | null;
  severity: "info" | "success" | "warning" | "danger";
  related?: {
    remitoId?: string;
    consumoId?: string;
    devolucionId?: string;
    remitoItemId?: string;
    consumoItemId?: string;
    devolucionItemId?: string;
  };
  metadata?: Record<string, unknown>;
};

export type TraceItemRow = {
  id: string;
  remitoId?: string;
  remitoItemId?: string;
  consumoIds: string[];
  consumoItemIds: string[];
  devolucionIds: string[];
  devolucionItemIds: string[];
  itemId?: string | null;
  sku?: string | null;
  description: string;
  unit?: string | null;
  lot?: string | null;
  serial?: string | null;
  expiry?: string | null;
  brand?: string | null;
  department?: string | null;
  sentQuantity: number;
  consumedQuantity: number;
  returnedQuantity: number;
  pendingQuantity: number;
  matchConfidence: "direct" | "soft" | "unmatched";
  status: "ok" | "pending" | "difference" | "unknown";
  sourceFlags: {
    hasRemito: boolean;
    hasConsumo: boolean;
    hasDevolucion: boolean;
    hasStockMovement: boolean;
  };
  warnings: string[];
  metadata?: Record<string, unknown>;
};

export type TraceSummary = {
  remitosCount: number;
  consumosCount: number;
  devolucionesCount: number;
  eventsCount: number;
  itemRowsCount: number;
  totalSentQuantity: number;
  totalConsumedQuantity: number;
  totalReturnedQuantity: number;
  rowsWithDifference: number;
  rowsWithUnknownLotOrSerial: number;
  hasStockMovements: boolean;
};

export type TraceGap = {
  code:
    | "NO_REMITOS"
    | "NO_CONSUMOS"
    | "NO_DEVOLUCIONES"
    | "NO_STOCK_MOVEMENTS"
    | "LOT_SERIAL_METADATA_ONLY"
    | "UNMATCHED_CONSUMO_ITEM"
    | "UNMATCHED_DEVOLUCION_ITEM"
    | "RETURNED_QUANTITY_SOURCE_CONFLICT";
  message: string;
  severity: "info" | "warning" | "danger";
  sourceIds?: string[];
};

export type TraceSourceRef = {
  type: "Remito" | "RemitoItem" | "Consumo" | "ConsumoItem" | "Devolucion" | "DevolucionItem" | "AuditEvent";
  id: string;
  visibleNumber?: number | null;
};

export type TraceResponse = {
  companyId: string;
  surgeryId: string;
  generatedAt: string;
  sourceVersion: "v0-derived";
  summary: TraceSummary;
  timeline: TraceTimelineEvent[];
  items: TraceItemRow[];
  gaps: TraceGap[];
  sources?: TraceSourceRef[];
};

export type GetSurgeryTraceInput = {
  companyId: string;
  surgeryId: string;
  prisma: PrismaClient;
  includeAudit?: boolean;
  includeItems?: boolean;
  includeSources?: boolean;
  from?: Date;
  to?: Date;
};

const traceRemitoSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  surgeryId: true,
  state: true,
  issuedAt: true,
  deliveredAt: true,
  returnedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      itemId: true,
      sku: true,
      description: true,
      quantity: true,
      unit: true,
      lotNumber: true,
      serialNumber: true,
      expirationDate: true,
      returnedQuantity: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.RemitoSelect;

const traceConsumoSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  surgeryId: true,
  remitoId: true,
  state: true,
  validatedAt: true,
  facturedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      remitoItemId: true,
      sku: true,
      description: true,
      consumedQuantity: true,
      unit: true,
      lotNumber: true,
      serialNumber: true,
      expirationDate: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ConsumoSelect;

const traceDevolucionSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  surgeryId: true,
  remitoId: true,
  consumoId: true,
  state: true,
  reason: true,
  validatedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      remitoItemId: true,
      consumoItemId: true,
      sku: true,
      description: true,
      returnedQuantity: true,
      unit: true,
      lotNumber: true,
      serialNumber: true,
      expirationDate: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.DevolucionSelect;

type TraceRemito = Prisma.RemitoGetPayload<{ select: typeof traceRemitoSelect }>;
type TraceConsumo = Prisma.ConsumoGetPayload<{ select: typeof traceConsumoSelect }>;
type TraceDevolucion = Prisma.DevolucionGetPayload<{ select: typeof traceDevolucionSelect }>;
type TraceAuditEvent = Prisma.AuditEventGetPayload<{
  select: {
    id: true;
    companyId: true;
    userId: true;
    entityType: true;
    entityId: true;
    action: true;
    detail: true;
    oldValue: true;
    newValue: true;
    module: true;
    metadata: true;
    createdAt: true;
  };
}>;

type ItemAccumulator = TraceItemRow & {
  remitoReturnedQuantity: number;
  confirmedDevolucionQuantity: number;
};

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function metadataString(metadata: Record<string, unknown> | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

function serializeOptionalDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function itemKey(sourceType: string, sourceId: string, sku?: string | null, description?: string | null, unit?: string | null) {
  return `unmatched:${sourceType}:${sourceId}:${normalize(sku)}:${normalize(description)}:${normalize(unit)}`;
}

function uniquePush(values: string[], value: string | null | undefined) {
  if (value && !values.includes(value)) values.push(value);
}

function createBaseRowFromRemito(remito: TraceRemito, item: TraceRemito["items"][number]): ItemAccumulator {
  const metadata = asRecord(item.metadata);
  const rowMetadata: Record<string, unknown> = { ...(metadata ?? {}) };
  if (asNumber(item.returnedQuantity) > 0) {
    rowMetadata.remitoReturnedQuantity = asNumber(item.returnedQuantity);
  }

  return {
    id: item.id,
    remitoId: remito.id,
    remitoItemId: item.id,
    consumoIds: [],
    consumoItemIds: [],
    devolucionIds: [],
    devolucionItemIds: [],
    itemId: item.itemId,
    sku: item.sku,
    description: item.description,
    unit: item.unit,
    lot: item.lotNumber ?? metadataString(metadata, ["lotNumber", "lot", "lote"]),
    serial: item.serialNumber ?? metadataString(metadata, ["serialNumber", "serial", "serie"]),
    expiry: serializeOptionalDate(item.expirationDate) ?? metadataString(metadata, ["expirationDate", "expiry", "expiration", "vencimiento"]),
    brand: metadataString(metadata, ["brand", "marca"]),
    department: metadataString(metadata, ["department", "sector"]),
    sentQuantity: asNumber(item.quantity),
    consumedQuantity: 0,
    returnedQuantity: 0,
    pendingQuantity: 0,
    matchConfidence: "direct",
    status: "pending",
    sourceFlags: {
      hasRemito: true,
      hasConsumo: false,
      hasDevolucion: false,
      hasStockMovement: false,
    },
    warnings: [],
    metadata: Object.keys(rowMetadata).length > 0 ? rowMetadata : undefined,
    remitoReturnedQuantity: asNumber(item.returnedQuantity),
    confirmedDevolucionQuantity: 0,
  };
}

function findSoftRow(
  rows: Map<string, ItemAccumulator>,
  remitoId: string,
  sku: string | null,
  description: string,
  unit: string | null
): ItemAccumulator | undefined {
  const normalizedSku = normalize(sku);
  const normalizedDescription = normalize(description);
  const normalizedUnit = normalize(unit);

  for (const row of rows.values()) {
    if (row.remitoId !== remitoId || !row.sourceFlags.hasRemito) continue;
    if (normalizedSku && normalize(row.sku) === normalizedSku) return row;
    if (normalize(row.description) === normalizedDescription && normalize(row.unit) === normalizedUnit) return row;
  }
  return undefined;
}

function finalizeRows(rows: ItemAccumulator[], gaps: TraceGap[]): TraceItemRow[] {
  return rows.map((row) => {
    const warnings = [...row.warnings];
    let returnedQuantity = row.confirmedDevolucionQuantity;
    if (returnedQuantity === 0) returnedQuantity = row.remitoReturnedQuantity;
    if (row.confirmedDevolucionQuantity > 0 && row.remitoReturnedQuantity > 0 && row.confirmedDevolucionQuantity !== row.remitoReturnedQuantity) {
      warnings.push("RETURNED_QUANTITY_SOURCE_CONFLICT");
      gaps.push({
        code: "RETURNED_QUANTITY_SOURCE_CONFLICT",
        message: "La devolución confirmada difiere del acumulador logístico del remito.",
        severity: "warning",
        sourceIds: [row.remitoItemId, ...row.devolucionItemIds].filter((id): id is string => Boolean(id)),
      });
      row.metadata = {
        ...(row.metadata ?? {}),
        remitoReturnedQuantity: row.remitoReturnedQuantity,
        confirmedDevolucionQuantity: row.confirmedDevolucionQuantity,
      };
    }

    const pendingQuantity = Math.max(0, row.sentQuantity - row.consumedQuantity - returnedQuantity);
    const hasDifference =
      row.matchConfidence !== "unmatched" &&
      (pendingQuantity !== 0 || row.consumedQuantity + returnedQuantity > row.sentQuantity);

    const status: TraceItemRow["status"] = row.matchConfidence === "unmatched"
      ? "unknown"
      : hasDifference
        ? "difference"
        : row.consumedQuantity > 0 || returnedQuantity > 0
          ? "ok"
          : "pending";

    const { remitoReturnedQuantity: _remitoReturnedQuantity, confirmedDevolucionQuantity: _confirmedDevolucionQuantity, ...publicRow } = row;
    return {
      ...publicRow,
      returnedQuantity,
      pendingQuantity,
      status,
      warnings,
    };
  });
}

function timelineEvent(params: Omit<TraceTimelineEvent, "occurredAt"> & { occurredAt: Date | null | undefined }): TraceTimelineEvent | null {
  if (!params.occurredAt) return null;
  return { ...params, occurredAt: params.occurredAt.toISOString() };
}

function isAuditEquivalent(auditEvents: TraceAuditEvent[], entityType: string, entityId: string, action: string): boolean {
  return auditEvents.some((event) => event.entityType === entityType && event.entityId === entityId && event.action === action);
}

function auditKind(action: string): TraceTimelineKind {
  if (action === "remito.state_changed") return "remito.state_changed";
  if (action === "consumo.state_changed") return "consumo.state_changed";
  if (action === "devolucion.state_changed") return "devolucion.state_changed";
  if (action === "consumo.emitted") return "consumo.emitted";
  if (action === "devolucion.confirmed") return "devolucion.confirmed";
  if (action === "devolucion.rejected") return "devolucion.rejected";
  if (action === "remito.issued") return "remito.issued";
  if (action === "consumo.validated") return "consumo.validated";
  if (action === "consumo.factured") return "consumo.factured";
  if (action === "remito.created") return "remito.created";
  if (action === "consumo.created") return "consumo.created";
  if (action === "devolucion.created") return "devolucion.created";
  return "audit.event";
}

function buildTimeline(remitos: TraceRemito[], consumos: TraceConsumo[], devoluciones: TraceDevolucion[], auditEvents: TraceAuditEvent[]) {
  const events: TraceTimelineEvent[] = [];

  for (const remito of remitos) {
    const visible = remito.visibleNumber ?? null;
    const remitoLabel = visible === null ? remito.id : `#${visible}`;
    if (!isAuditEquivalent(auditEvents, "Remito", remito.id, "remito.created")) {
      const event = timelineEvent({
        id: `Remito:${remito.id}:created`,
        occurredAt: remito.createdAt,
        kind: "remito.created",
        label: `Remito ${remitoLabel} creado`,
        sourceType: "Remito",
        sourceId: remito.id,
        sourceVisibleNumber: visible,
        sourceState: remito.state,
        severity: "info",
        related: { remitoId: remito.id },
        metadata: { derivedFrom: "createdAt" },
      });
      if (event) events.push(event);
    }
    if (!isAuditEquivalent(auditEvents, "Remito", remito.id, "remito.issued")) {
      const event = timelineEvent({
        id: `Remito:${remito.id}:issued`,
        occurredAt: remito.issuedAt,
        kind: "remito.issued",
        label: `Remito ${remitoLabel} emitido`,
        sourceType: "Remito",
        sourceId: remito.id,
        sourceVisibleNumber: visible,
        sourceState: remito.state,
        severity: "success",
        related: { remitoId: remito.id },
        metadata: { derivedFrom: "issuedAt" },
      });
      if (event) events.push(event);
    }
    const delivered = timelineEvent({
      id: `Remito:${remito.id}:delivered`,
      occurredAt: remito.deliveredAt,
      kind: "remito.delivered",
      label: `Remito ${remitoLabel} entregado`,
      sourceType: "Remito",
      sourceId: remito.id,
      sourceVisibleNumber: visible,
      sourceState: remito.state,
      severity: "success",
      related: { remitoId: remito.id },
      metadata: { derivedFrom: "deliveredAt" },
    });
    if (delivered) events.push(delivered);
    const returned = timelineEvent({
      id: `Remito:${remito.id}:returned`,
      occurredAt: remito.returnedAt,
      kind: "remito.returned",
      label: `Remito ${remitoLabel} devuelto logísticamente`,
      sourceType: "Remito",
      sourceId: remito.id,
      sourceVisibleNumber: visible,
      sourceState: remito.state,
      severity: "info",
      related: { remitoId: remito.id },
      metadata: { derivedFrom: "returnedAt" },
    });
    if (returned) events.push(returned);
    if (remito.state === "Anulado" && !isAuditEquivalent(auditEvents, "Remito", remito.id, "remito.state_changed")) {
      const event = timelineEvent({
        id: `Remito:${remito.id}:state_changed`,
        occurredAt: remito.updatedAt,
        kind: "remito.state_changed",
        label: `Remito ${remitoLabel} cambió a ${remito.state}`,
        sourceType: "Remito",
        sourceId: remito.id,
        sourceVisibleNumber: visible,
        sourceState: remito.state,
        severity: "danger",
        related: { remitoId: remito.id },
        metadata: { derivedFrom: "updatedAt" },
      });
      if (event) events.push(event);
    }
  }

  for (const consumo of consumos) {
    const visible = consumo.visibleNumber ?? null;
    const labelId = visible === null ? consumo.id : `#${visible}`;
    if (!isAuditEquivalent(auditEvents, "Consumo", consumo.id, "consumo.created")) {
      events.push({
        id: `Consumo:${consumo.id}:created`,
        occurredAt: consumo.createdAt.toISOString(),
        kind: "consumo.created",
        label: `Consumo ${labelId} creado`,
        sourceType: "Consumo",
        sourceId: consumo.id,
        sourceVisibleNumber: visible,
        sourceState: consumo.state,
        severity: "info",
        related: { consumoId: consumo.id, remitoId: consumo.remitoId },
        metadata: { derivedFrom: "createdAt" },
      });
    }
    const validated = timelineEvent({
      id: `Consumo:${consumo.id}:validated`,
      occurredAt: consumo.validatedAt,
      kind: "consumo.validated",
      label: `Consumo ${labelId} validado`,
      sourceType: "Consumo",
      sourceId: consumo.id,
      sourceVisibleNumber: visible,
      sourceState: consumo.state,
      severity: "success",
      related: { consumoId: consumo.id, remitoId: consumo.remitoId },
      metadata: { derivedFrom: "validatedAt" },
    });
    if (validated && !isAuditEquivalent(auditEvents, "Consumo", consumo.id, "consumo.validated")) events.push(validated);
    const factured = timelineEvent({
      id: `Consumo:${consumo.id}:factured`,
      occurredAt: consumo.facturedAt,
      kind: "consumo.factured",
      label: `Consumo ${labelId} facturado`,
      sourceType: "Consumo",
      sourceId: consumo.id,
      sourceVisibleNumber: visible,
      sourceState: consumo.state,
      severity: "success",
      related: { consumoId: consumo.id, remitoId: consumo.remitoId },
      metadata: { derivedFrom: "facturedAt" },
    });
    if (factured && !isAuditEquivalent(auditEvents, "Consumo", consumo.id, "consumo.factured")) events.push(factured);
    if (consumo.state === "Anulado" && !isAuditEquivalent(auditEvents, "Consumo", consumo.id, "consumo.state_changed")) {
      events.push({
        id: `Consumo:${consumo.id}:state_changed`,
        occurredAt: consumo.updatedAt.toISOString(),
        kind: "consumo.state_changed",
        label: `Consumo ${labelId} cambió a ${consumo.state}`,
        sourceType: "Consumo",
        sourceId: consumo.id,
        sourceVisibleNumber: visible,
        sourceState: consumo.state,
        severity: "danger",
        related: { consumoId: consumo.id, remitoId: consumo.remitoId },
        metadata: { derivedFrom: "updatedAt" },
      });
    }
  }

  for (const devolucion of devoluciones) {
    const visible = devolucion.visibleNumber ?? null;
    const labelId = visible === null ? devolucion.id : `#${visible}`;
    if (!isAuditEquivalent(auditEvents, "Devolucion", devolucion.id, "devolucion.created")) {
      events.push({
        id: `Devolucion:${devolucion.id}:created`,
        occurredAt: devolucion.createdAt.toISOString(),
        kind: "devolucion.created",
        label: `Devolución ${labelId} creada`,
        sourceType: "Devolucion",
        sourceId: devolucion.id,
        sourceVisibleNumber: visible,
        sourceState: devolucion.state,
        severity: "info",
        related: { devolucionId: devolucion.id, remitoId: devolucion.remitoId, consumoId: devolucion.consumoId ?? undefined },
        metadata: { derivedFrom: "createdAt" },
      });
    }
    if (devolucion.state === "Confirmada" && !isAuditEquivalent(auditEvents, "Devolucion", devolucion.id, "devolucion.confirmed")) {
      const event = timelineEvent({
        id: `Devolucion:${devolucion.id}:confirmed`,
        occurredAt: devolucion.validatedAt,
        kind: "devolucion.confirmed",
        label: `Devolución ${labelId} confirmada`,
        sourceType: "Devolucion",
        sourceId: devolucion.id,
        sourceVisibleNumber: visible,
        sourceState: devolucion.state,
        severity: "success",
        related: { devolucionId: devolucion.id, remitoId: devolucion.remitoId, consumoId: devolucion.consumoId ?? undefined },
        metadata: { derivedFrom: "validatedAt" },
      });
      if (event) events.push(event);
    }
    if (["Rechazada", "Anulada"].includes(devolucion.state) && !isAuditEquivalent(auditEvents, "Devolucion", devolucion.id, "devolucion.state_changed")) {
      events.push({
        id: `Devolucion:${devolucion.id}:state_changed`,
        occurredAt: devolucion.updatedAt.toISOString(),
        kind: devolucion.state === "Rechazada" ? "devolucion.rejected" : "devolucion.state_changed",
        label: `Devolución ${labelId} cambió a ${devolucion.state}`,
        sourceType: "Devolucion",
        sourceId: devolucion.id,
        sourceVisibleNumber: visible,
        sourceState: devolucion.state,
        severity: devolucion.state === "Rechazada" ? "warning" : "danger",
        related: { devolucionId: devolucion.id, remitoId: devolucion.remitoId, consumoId: devolucion.consumoId ?? undefined },
        metadata: { derivedFrom: "updatedAt" },
      });
    }
  }

  for (const audit of auditEvents) {
    if (audit.entityId === null) continue;
    const sourceType = audit.entityType === "Remito"
      ? "Remito"
      : audit.entityType === "Consumo"
        ? "Consumo"
        : audit.entityType === "Devolucion"
          ? "Devolucion"
          : "AuditEvent";
    events.push({
      id: audit.id,
      occurredAt: audit.createdAt.toISOString(),
      kind: auditKind(audit.action),
      label: audit.detail ?? `Cambio auditado: ${audit.action}`,
      sourceType,
      sourceId: audit.entityId,
      actorUserId: audit.userId,
      module: audit.module,
      severity: audit.action.includes("rejected") || audit.action.includes("Anulado") ? "warning" : "info",
      related: {
        remitoId: audit.entityType === "Remito" ? audit.entityId : undefined,
        consumoId: audit.entityType === "Consumo" ? audit.entityId : undefined,
        devolucionId: audit.entityType === "Devolucion" ? audit.entityId : undefined,
      },
      metadata: {
        action: audit.action,
        oldValue: audit.oldValue,
        newValue: audit.newValue,
        metadata: audit.metadata,
      },
    });
  }

  const priority: Record<TraceSourceType, number> = {
    Remito: 1,
    Consumo: 2,
    Devolucion: 3,
    AuditEvent: 4,
    StockMovement: 5,
  };

  return events.sort((a, b) => {
    const timeDiff = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
    if (timeDiff !== 0) return timeDiff;
    const priorityDiff = priority[a.sourceType] - priority[b.sourceType];
    if (priorityDiff !== 0) return priorityDiff;
    return a.id.localeCompare(b.id);
  });
}

function withinDateWindow(event: TraceTimelineEvent, from?: Date, to?: Date): boolean {
  const value = Date.parse(event.occurredAt);
  if (from && value < from.getTime()) return false;
  if (to && value > to.getTime()) return false;
  return true;
}

function deriveItems(remitos: TraceRemito[], consumos: TraceConsumo[], devoluciones: TraceDevolucion[], gaps: TraceGap[]): TraceItemRow[] {
  const rows = new Map<string, ItemAccumulator>();
  const consumoItemToRemitoItem = new Map<string, string>();

  for (const remito of remitos) {
    if (remito.state === "Anulado") continue;
    for (const item of remito.items) {
      rows.set(item.id, createBaseRowFromRemito(remito, item));
    }
  }

  for (const consumo of consumos) {
    if (consumo.state === "Anulado") continue;
    for (const item of consumo.items) {
      let row = item.remitoItemId ? rows.get(item.remitoItemId) : undefined;
      let matchedSoft = false;
      if (!row) {
        row = findSoftRow(rows, consumo.remitoId, item.sku, item.description, item.unit);
        matchedSoft = Boolean(row);
      }
      if (!row) {
        const key = itemKey("ConsumoItem", item.id, item.sku, item.description, item.unit);
        row = rows.get(key);
        if (!row) {
          row = {
            id: key,
            consumoIds: [],
            consumoItemIds: [],
            devolucionIds: [],
            devolucionItemIds: [],
            sku: item.sku,
            description: item.description,
            unit: item.unit,
            lot: item.lotNumber ?? metadataString(asRecord(item.metadata), ["lotNumber", "lot", "lote"]),
            serial: item.serialNumber ?? metadataString(asRecord(item.metadata), ["serialNumber", "serial", "serie"]),
            expiry: serializeOptionalDate(item.expirationDate) ?? metadataString(asRecord(item.metadata), ["expirationDate", "expiry", "expiration", "vencimiento"]),
            sentQuantity: 0,
            consumedQuantity: 0,
            returnedQuantity: 0,
            pendingQuantity: 0,
            matchConfidence: "unmatched",
            status: "unknown",
            sourceFlags: { hasRemito: false, hasConsumo: true, hasDevolucion: false, hasStockMovement: false },
            warnings: ["UNMATCHED_CONSUMO_ITEM"],
            metadata: asRecord(item.metadata),
            remitoReturnedQuantity: 0,
            confirmedDevolucionQuantity: 0,
          };
          rows.set(key, row);
          gaps.push({
            code: "UNMATCHED_CONSUMO_ITEM",
            message: "Hay un ítem de consumo sin ítem de remito asociado.",
            severity: "warning",
            sourceIds: [item.id],
          });
        }
      }
      uniquePush(row.consumoIds, consumo.id);
      uniquePush(row.consumoItemIds, item.id);
      row.consumedQuantity += asNumber(item.consumedQuantity);
      row.sourceFlags.hasConsumo = true;
      if (matchedSoft && row.matchConfidence === "direct") {
        row.matchConfidence = "soft";
        uniquePush(row.warnings, "SOFT_MATCH_CONSUMO_ITEM");
      }
      if (row.remitoItemId) consumoItemToRemitoItem.set(item.id, row.remitoItemId);
    }
  }

  for (const devolucion of devoluciones) {
    const confirmed = devolucion.state === "Confirmada";
    for (const item of devolucion.items) {
      const remitoItemFromConsumo = item.consumoItemId ? consumoItemToRemitoItem.get(item.consumoItemId) : undefined;
      let row = item.remitoItemId ? rows.get(item.remitoItemId) : undefined;
      row = row ?? (remitoItemFromConsumo ? rows.get(remitoItemFromConsumo) : undefined);
      let matchedSoft = false;
      if (!row) {
        row = findSoftRow(rows, devolucion.remitoId, item.sku, item.description, item.unit);
        matchedSoft = Boolean(row);
      }
      if (!row) {
        const key = itemKey("DevolucionItem", item.id, item.sku, item.description, item.unit);
        row = rows.get(key);
        if (!row) {
          row = {
            id: key,
            consumoIds: [],
            consumoItemIds: [],
            devolucionIds: [],
            devolucionItemIds: [],
            sku: item.sku,
            description: item.description,
            unit: item.unit,
            lot: item.lotNumber ?? metadataString(asRecord(item.metadata), ["lotNumber", "lot", "lote"]),
            serial: item.serialNumber ?? metadataString(asRecord(item.metadata), ["serialNumber", "serial", "serie"]),
            expiry: serializeOptionalDate(item.expirationDate) ?? metadataString(asRecord(item.metadata), ["expirationDate", "expiry", "expiration", "vencimiento"]),
            sentQuantity: 0,
            consumedQuantity: 0,
            returnedQuantity: 0,
            pendingQuantity: 0,
            matchConfidence: "unmatched",
            status: "unknown",
            sourceFlags: { hasRemito: false, hasConsumo: false, hasDevolucion: true, hasStockMovement: false },
            warnings: ["UNMATCHED_DEVOLUCION_ITEM"],
            metadata: asRecord(item.metadata),
            remitoReturnedQuantity: 0,
            confirmedDevolucionQuantity: 0,
          };
          rows.set(key, row);
          gaps.push({
            code: "UNMATCHED_DEVOLUCION_ITEM",
            message: "Hay un ítem de devolución sin ítem de remito asociado.",
            severity: "warning",
            sourceIds: [item.id],
          });
        }
      }
      uniquePush(row.devolucionIds, devolucion.id);
      uniquePush(row.devolucionItemIds, item.id);
      row.sourceFlags.hasDevolucion = true;
      if (confirmed) row.confirmedDevolucionQuantity += asNumber(item.returnedQuantity);
      if (!confirmed) uniquePush(row.warnings, `DEVOLUCION_${devolucion.state.toUpperCase()}_NOT_COUNTED`);
      if (matchedSoft && row.matchConfidence === "direct") {
        row.matchConfidence = "soft";
        uniquePush(row.warnings, "SOFT_MATCH_DEVOLUCION_ITEM");
      }
    }
  }

  return finalizeRows([...rows.values()], gaps).sort((a, b) => a.description.localeCompare(b.description) || a.id.localeCompare(b.id));
}

export async function getSurgeryTrace(input: GetSurgeryTraceInput): Promise<TraceResponse> {
  const companyId = requireCompanyId(input.companyId);
  const surgeryId = input.surgeryId;
  const includeAudit = input.includeAudit ?? true;
  const includeItems = input.includeItems ?? true;
  const includeSources = input.includeSources ?? false;

  const surgery = await input.prisma.surgery.findFirst({
    where: { id: surgeryId, companyId },
    select: { id: true },
  });

  if (!surgery) {
    throw notFound("Surgery not found", "surgery_not_found");
  }

  const [remitos, consumos, devoluciones] = await Promise.all([
    input.prisma.remito.findMany({
      where: { companyId, surgeryId },
      select: traceRemitoSelect,
      orderBy: [{ createdAt: "asc" }],
    }),
    input.prisma.consumo.findMany({
      where: { companyId, surgeryId },
      select: traceConsumoSelect,
      orderBy: [{ createdAt: "asc" }],
    }),
    input.prisma.devolucion.findMany({
      where: { companyId, surgeryId },
      select: traceDevolucionSelect,
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);

  const sourceEntityFilters = [
    ...remitos.map((remito) => ({ entityType: "Remito", entityId: remito.id })),
    ...consumos.map((consumo) => ({ entityType: "Consumo", entityId: consumo.id })),
    ...devoluciones.map((devolucion) => ({ entityType: "Devolucion", entityId: devolucion.id })),
  ];

  const auditEvents = includeAudit && sourceEntityFilters.length > 0
    ? await input.prisma.auditEvent.findMany({
        where: {
          companyId,
          OR: sourceEntityFilters,
          ...(input.from || input.to
            ? { createdAt: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) } }
            : {}),
        },
        select: {
          id: true,
          companyId: true,
          userId: true,
          entityType: true,
          entityId: true,
          action: true,
          detail: true,
          oldValue: true,
          newValue: true,
          module: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "asc" }],
      })
    : [];

  const gaps: TraceGap[] = [];
  if (remitos.length === 0) gaps.push({ code: "NO_REMITOS", message: "Todavía no hay remitos backend para esta cirugía.", severity: "info" });
  if (consumos.length === 0) gaps.push({ code: "NO_CONSUMOS", message: "Consumo no registrado o pendiente para esta cirugía.", severity: "info" });
  if (devoluciones.length === 0) gaps.push({ code: "NO_DEVOLUCIONES", message: "Devolución no registrada/confirmada para esta cirugía.", severity: "info" });
  gaps.push({ code: "NO_STOCK_MOVEMENTS", message: "Stock fino pendiente: movimientos de stock no integrados en V0.", severity: "info" });

  const items = includeItems ? deriveItems(remitos, consumos, devoluciones, gaps) : [];
  for (const row of items) {
    if (!row.lot || !row.serial) {
      gaps.push({
        code: "LOT_SERIAL_METADATA_ONLY",
        message: "Lote/serie no están normalizados; V0 sólo lee metadata si existe.",
        severity: "info",
        sourceIds: [row.remitoItemId, ...row.consumoItemIds, ...row.devolucionItemIds].filter((id): id is string => Boolean(id)),
      });
    }
  }

  const timeline = buildTimeline(remitos, consumos, devoluciones, auditEvents).filter((event) => withinDateWindow(event, input.from, input.to));
  const summary: TraceSummary = {
    remitosCount: remitos.length,
    consumosCount: consumos.length,
    devolucionesCount: devoluciones.length,
    eventsCount: timeline.length,
    itemRowsCount: items.length,
    totalSentQuantity: items.reduce((sum, row) => sum + row.sentQuantity, 0),
    totalConsumedQuantity: items.reduce((sum, row) => sum + row.consumedQuantity, 0),
    totalReturnedQuantity: items.reduce((sum, row) => sum + row.returnedQuantity, 0),
    rowsWithDifference: items.filter((row) => row.status === "difference").length,
    rowsWithUnknownLotOrSerial: items.filter((row) => !row.lot || !row.serial).length,
    hasStockMovements: false,
  };

  const sources = includeSources
    ? [
        ...remitos.map((remito) => ({ type: "Remito" as const, id: remito.id, visibleNumber: remito.visibleNumber })),
        ...remitos.flatMap((remito) => remito.items.map((item) => ({ type: "RemitoItem" as const, id: item.id, visibleNumber: remito.visibleNumber }))),
        ...consumos.map((consumo) => ({ type: "Consumo" as const, id: consumo.id, visibleNumber: consumo.visibleNumber })),
        ...consumos.flatMap((consumo) => consumo.items.map((item) => ({ type: "ConsumoItem" as const, id: item.id, visibleNumber: consumo.visibleNumber }))),
        ...devoluciones.map((devolucion) => ({ type: "Devolucion" as const, id: devolucion.id, visibleNumber: devolucion.visibleNumber })),
        ...devoluciones.flatMap((devolucion) => devolucion.items.map((item) => ({ type: "DevolucionItem" as const, id: item.id, visibleNumber: devolucion.visibleNumber }))),
        ...auditEvents.map((event) => ({ type: "AuditEvent" as const, id: event.id })),
      ]
    : undefined;

  return {
    companyId,
    surgeryId,
    generatedAt: new Date().toISOString(),
    sourceVersion: "v0-derived",
    summary,
    timeline,
    items,
    gaps,
    ...(sources ? { sources } : {}),
  };
}
