// OSSUM COR — Devolución service (Fase 1B)
// Every operational query MUST filter by companyId.
// Services receive prisma as dependency injection.
// Catálogos (state / transitions) viven acá para single source of truth.
//
// Devolución es ENTIDAD PROPIA — audit trail propio.
// Al confirmarse, aplica la devolución sobre RemitoItem.returnedQuantity y
// recalcula el estado operativo del Remito en la misma transacción.

import { InternalNotificationType, Prisma } from "@prisma/client";
import type { PrismaClient, Devolucion as PrismaDevolucion } from "@prisma/client";

import { createAuditEvent } from "../audit";
import { requireCompanyId } from "../tenant";
import { badRequest, notFound } from "../api/errors";
import { emitCrossDomainNotification } from "./internal-notifications.service";
import { acceptCajasAccounting } from "./cajas-accounting.service";

// ─── Catálogos (single source of truth; validator re-exporta estos) ─────────
export const DEVOLUCION_STATES = [
  "Borrador",
  "Pendiente",
  "Confirmada",
  "Rechazada",
  "Anulada",
] as const;
export type DevolucionState = (typeof DEVOLUCION_STATES)[number];

export const DEVOLUCION_TRANSITIONS: Record<DevolucionState, DevolucionState[]> = {
  Borrador: ["Pendiente", "Anulada"],
  // Confirmation is intentionally excluded: it must use confirmDevolucion so
  // the audited return and its Remito projection are committed together.
  Pendiente: ["Rechazada", "Anulada"],
  Confirmada: [],
  Rechazada: [],
  Anulada: [],
};

// TODO: migrate to src/lib/permissions/*
export const DEVOLUCION_MUTATION_ROLES = ["admin", "coordinador", "logistica"] as const;
export const DEVOLUCION_READ_ROLES = [
  "admin",
  "coordinador",
  "logistica",
  "vendedor",
  "matrona",
  "instrumentador",
] as const;

const DEFAULT_LIST_TAKE = 50;

// ─── Errores ─────────────────────────────────────────────────────────────────
export class DevolucionError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "DevolucionError";
    this.code = code;
    this.status = status;
  }
}

function isDevolucionState(value: string): value is DevolucionState {
  return (DEVOLUCION_STATES as readonly string[]).includes(value);
}

function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializeDevolucionForAudit(devolucion: {
  id: string;
  visibleNumber: number | null;
  companyId: string;
  surgeryId: string | null;
  remitoId: string;
  consumoId: string | null;
  state: string;
  reason: string | null;
  validatedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: devolucion.id,
    visibleNumber: devolucion.visibleNumber,
    companyId: devolucion.companyId,
    surgeryId: devolucion.surgeryId,
    remitoId: devolucion.remitoId,
    consumoId: devolucion.consumoId,
    state: devolucion.state,
    reason: devolucion.reason,
    validatedAt: serializeDate(devolucion.validatedAt),
    createdById: devolucion.createdById,
    updatedById: devolucion.updatedById,
    createdAt: devolucion.createdAt.toISOString(),
    updatedAt: devolucion.updatedAt.toISOString(),
  };
}

// ─── Select para read/list ──────────────────────────────────────────────────
const devolucionReadSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  surgeryId: true,
  remitoId: true,
  consumoId: true,
  state: true,
  reason: true,
  validatedAt: true,
  createdById: true,
  updatedById: true,
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

function requireCompanyMatch(
  devolucion: { companyId: string } | null,
  companyId: string,
  devolucionId: string
): asserts devolucion {
  if (!devolucion || devolucion.companyId !== companyId) {
    throw notFound(
      `Devolucion ${devolucionId} not found in company ${companyId}`,
      "devolucion_not_found"
    );
  }
}

function requireCreatedById(createdById: string | undefined): string | null {
  return createdById ?? null;
}

function normalizeTraceExpirationDate(value: Date | string | null | undefined, path: string): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${path}.expirationDate must be a valid date`, "invalid_trace_expiration_date");
  }
  return date;
}

async function applyConfirmedDevolucionToRemito(
  tx: Prisma.TransactionClient,
  params: { companyId: string; devolucionId: string; updatedById: string | null }
) {
  const devolucion = await tx.devolucion.findFirst({
    where: { id: params.devolucionId, companyId: params.companyId },
    select: {
      id: true,
      companyId: true,
      remitoId: true,
      items: {
        select: {
          id: true,
          remitoItemId: true,
          returnedQuantity: true,
        },
      },
    },
  });

  requireCompanyMatch(devolucion, params.companyId, params.devolucionId);

  if (devolucion.items.length === 0) {
    throw badRequest("devolucion items must be a non-empty array", "devolucion_empty_items");
  }

  const remito = await tx.remito.findFirst({
    where: { id: devolucion.remitoId, companyId: params.companyId },
    select: {
      id: true,
      companyId: true,
      state: true,
      returnedAt: true,
      items: {
        select: {
          id: true,
          quantity: true,
          returnedQuantity: true,
        },
      },
    },
  });

  if (!remito || remito.companyId !== params.companyId) {
    throw notFound(
      `Remito ${devolucion.remitoId} not found in company ${params.companyId}`,
      "remito_not_found"
    );
  }

  if (remito.state !== "Entregado" && remito.state !== "Parcialmente_devuelto") {
    throw new DevolucionError(
      "remito_devolucion_not_allowed",
      `Cannot confirm devolucion on remito in state ${remito.state}`,
      409
    );
  }

  const remitoItems = new Map(remito.items.map((item) => [item.id, item]));
  const requestedByRemitoItem = new Map<string, Prisma.Decimal>();

  for (const item of devolucion.items) {
    if (!item.remitoItemId) {
      throw badRequest(
        `Devolucion item ${item.id} must reference a remito item to be confirmed`,
        "devolucion_item_remito_item_required"
      );
    }
    if (!remitoItems.has(item.remitoItemId)) {
      throw badRequest(
        `Item ${item.remitoItemId} does not belong to remito ${devolucion.remitoId}`,
        "remito_item_not_found"
      );
    }

    const currentRequested = requestedByRemitoItem.get(item.remitoItemId) ?? new Prisma.Decimal(0);
    requestedByRemitoItem.set(item.remitoItemId, currentRequested.plus(item.returnedQuantity));
  }

  for (const [remitoItemId, requestedQuantity] of requestedByRemitoItem.entries()) {
    const remitoItem = remitoItems.get(remitoItemId)!;
    const alreadyReturned = remitoItem.returnedQuantity ?? new Prisma.Decimal(0);
    const newReturnedQuantity = alreadyReturned.plus(requestedQuantity);

    if (newReturnedQuantity.gt(remitoItem.quantity)) {
      throw new DevolucionError(
        "remito_devolucion_quantity_exceeded",
        `Item ${remitoItemId} returnedQuantity would exceed quantity (max ${remitoItem.quantity.minus(alreadyReturned).toString()})`,
        409
      );
    }

    await tx.remitoItem.update({
      where: { id: remitoItemId },
      data: { returnedQuantity: newReturnedQuantity },
    });
  }

  const updatedItems = await tx.remitoItem.findMany({
    where: { remitoId: remito.id },
    select: { quantity: true, returnedQuantity: true },
  });

  let allReturned = updatedItems.length > 0;
  let anyReturned = false;
  for (const item of updatedItems) {
    const returnedQuantity = item.returnedQuantity ?? new Prisma.Decimal(0);
    if (returnedQuantity.gt(0)) anyReturned = true;
    if (returnedQuantity.lt(item.quantity)) allReturned = false;
  }

  const newState = allReturned ? "Devuelto" : anyReturned ? "Parcialmente_devuelto" : "Entregado";

  await tx.remito.update({
    where: { id: remito.id },
    data: {
      state: newState,
      ...(newState === "Devuelto" && !remito.returnedAt ? { returnedAt: new Date() } : {}),
      updatedById: params.updatedById,
    },
  });
}

// ─── Tipos de input ──────────────────────────────────────────────────────────
export interface DevolucionItemCreatePayload {
  remitoItemId?: string;
  consumoItemId?: string;
  sku?: string;
  description: string;
  returnedQuantity: number | string;
  unit?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: Date | string;
  metadata?: Record<string, unknown>;
}

export interface CreateDevolucionInput {
  companyId: string;
  surgeryId?: string;
  remitoId: string;
  consumoId?: string;
  items: DevolucionItemCreatePayload[];
  reason?: string;
  createdById?: string;
  metadata?: Record<string, unknown> | null;
  prisma: PrismaClient;
}

export interface ListDevolucionesInput {
  companyId: string;
  surgeryId?: string;
  state?: string;
  remitoId?: string;
  consumoId?: string;
  fromDate?: Date;
  toDate?: Date;
  prisma: PrismaClient;
  take?: number;
  skip?: number;
}

export interface GetDevolucionInput {
  companyId: string;
  devolucionId: string;
  prisma: PrismaClient;
}

export interface ConfirmDevolucionInput {
  companyId: string;
  devolucionId: string;
  updatedById?: string;
  cajasAccounting?: unknown;
  prisma: PrismaClient;
}

export interface RejectDevolucionInput {
  companyId: string;
  devolucionId: string;
  updatedById?: string;
  reason?: string;
  prisma: PrismaClient;
}

export interface UpdateDevolucionStateInput {
  companyId: string;
  devolucionId: string;
  newState: string;
  updatedById?: string;
  prisma: PrismaClient;
}

export interface DeleteDevolucionInput {
  companyId: string;
  devolucionId: string;
  prisma: PrismaClient;
}

// ─── createDevolucion ────────────────────────────────────────────────────────
export async function createDevolucion(input: CreateDevolucionInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  if (!input.remitoId || input.remitoId.trim().length === 0) {
    throw badRequest("remitoId is required", "devolucion_remito_required");
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw badRequest("items must be a non-empty array", "devolucion_empty_items");
  }

  const normalizedItems = input.items.map((item, index) => {
    if (typeof item.description !== "string" || item.description.trim().length === 0) {
      throw badRequest(
        `items[${index}].description is required`,
        "invalid_devolucion_item_description"
      );
    }
    const returnedNumber = Number(item.returnedQuantity);
    if (!Number.isFinite(returnedNumber) || returnedNumber <= 0) {
      throw badRequest(
        `items[${index}].returnedQuantity must be a positive number`,
        "invalid_devolucion_item_quantity"
      );
    }
    return {
      remitoItemId: item.remitoItemId ?? null,
      consumoItemId: item.consumoItemId ?? null,
      sku: item.sku ?? null,
      description: item.description,
      returnedQuantity: toDecimal(item.returnedQuantity),
      unit: item.unit ?? null,
      lotNumber: item.lotNumber?.trim() || null,
      serialNumber: item.serialNumber?.trim() || null,
      expirationDate: normalizeTraceExpirationDate(item.expirationDate, `items[${index}]`),
      metadata: (item.metadata ?? null) as Prisma.InputJsonValue | undefined,
    };
  });

  // FK blanda validada en service — el remito debe existir y pertenecer a la company.
  const remito = await prisma.remito.findFirst({
    where: { id: input.remitoId, companyId },
    select: { id: true, companyId: true, surgeryId: true },
  });
  if (!remito) {
    throw notFound(
      `Remito ${input.remitoId} not found in company ${companyId}`,
      "remito_not_found"
    );
  }

  // Si viene consumoId, el consumo debe existir en la misma company Y pertenecer al mismo remito.
  let consumoSnapshot: { id: string; remitoId: string; surgeryId: string | null } | null = null;
  if (input.consumoId) {
    consumoSnapshot = await prisma.consumo.findFirst({
      where: { id: input.consumoId, companyId },
      select: { id: true, remitoId: true, surgeryId: true },
    });
    if (!consumoSnapshot) {
      throw notFound(
        `Consumo ${input.consumoId} not found in company ${companyId}`,
        "consumo_not_found"
      );
    }
    if (consumoSnapshot.remitoId !== input.remitoId) {
      throw new DevolucionError(
        "devolucion_consumo_remito_mismatch",
        `Consumo ${input.consumoId} belongs to remito ${consumoSnapshot.remitoId}, not to remito ${input.remitoId}`,
        409
      );
    }
  }

  const createdById = requireCreatedById(input.createdById);
  const surgeryId = input.surgeryId ?? remito.surgeryId ?? (consumoSnapshot?.surgeryId ?? null);

  const devolucion = await prisma.$transaction(async (tx) => {
    const created = await tx.devolucion.create({
      data: {
        companyId,
        surgeryId,
        remitoId: input.remitoId,
        consumoId: input.consumoId ?? null,
        state: "Borrador",
        reason: input.reason ?? null,
        createdById,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | undefined,
        items: {
          create: normalizedItems.map((item) => ({
            remitoItemId: item.remitoItemId,
            consumoItemId: item.consumoItemId,
            sku: item.sku,
            description: item.description,
            returnedQuantity: item.returnedQuantity,
            unit: item.unit,
            lotNumber: item.lotNumber,
            serialNumber: item.serialNumber,
            expirationDate: item.expirationDate,
            metadata: item.metadata,
          })),
        },
      },
      select: {
        id: true,
        visibleNumber: true,
        companyId: true,
        surgeryId: true,
        remitoId: true,
        consumoId: true,
        state: true,
        reason: true,
        validatedAt: true,
        createdById: true,
        updatedById: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            description: true,
            returnedQuantity: true,
            lotNumber: true,
            serialNumber: true,
            expirationDate: true,
          },
        },
      },
    });

    if (createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: createdById,
        entityType: "Devolucion",
        entityId: created.id,
        action: "devolucion.created",
        module: "devolucion",
        oldValue: null,
        newValue: serializeDevolucionForAudit(created),
      });
    }

    return created;
  });

  return devolucion;
}

// ─── listDevoluciones ────────────────────────────────────────────────────────
export async function listDevoluciones(input: ListDevolucionesInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  if (input.state !== undefined && !isDevolucionState(input.state)) {
    throw badRequest(
      `state must be one of: ${(DEVOLUCION_STATES as readonly string[]).join(", ")}`,
      "invalid_devolucion_state_filter"
    );
  }

  const where: Prisma.DevolucionWhereInput = { companyId };
  if (input.surgeryId) where.surgeryId = input.surgeryId;
  if (input.state) where.state = input.state;
  if (input.remitoId) where.remitoId = input.remitoId;
  if (input.consumoId) where.consumoId = input.consumoId;

  if (input.fromDate || input.toDate) {
    where.createdAt = {
      ...(input.fromDate ? { gte: input.fromDate } : {}),
      ...(input.toDate ? { lte: input.toDate } : {}),
    };
  }

  const take = input.take ?? DEFAULT_LIST_TAKE;
  const skip = input.skip ?? 0;

  return prisma.devolucion.findMany({
    select: devolucionReadSelect,
    where,
    orderBy: [{ createdAt: "desc" }],
    take,
    skip,
  });
}

// ─── getDevolucion ────────────────────────────────────────────────────────────
export async function getDevolucion(input: GetDevolucionInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  const devolucion = await prisma.devolucion.findFirst({
    select: devolucionReadSelect,
    where: { id: input.devolucionId, companyId },
  });

  if (!devolucion) {
    throw notFound(
      `Devolucion ${input.devolucionId} not found in company ${companyId}`,
      "devolucion_not_found"
    );
  }

  return devolucion;
}

// ─── confirmDevolucion (regla dominio: validación humana) ───────────────────
// Confirmar aplica la devolución auditada al Remito operativo en la misma tx.
export async function confirmDevolucion(input: ConfirmDevolucionInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  const current = await prisma.devolucion.findFirst({
    where: { id: input.devolucionId, companyId },
    select: { id: true, state: true, companyId: true },
  });

  requireCompanyMatch(current, companyId, input.devolucionId);

  if (current.state === "Confirmada") {
    return getDevolucion({ companyId, devolucionId: input.devolucionId, prisma });
  }

  if (current.state !== "Pendiente") {
    throw new DevolucionError(
      "devolucion_not_pendiente",
      `Cannot confirm devolucion in state ${current.state} (only Pendiente)`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    // Claim Pendiente atomically before applying quantities. The preliminary read above
    // preserves the existing not-found/invalid-state semantics, but cannot serialize
    // two callers that both observed Pendiente before entering their transactions.
    const claim = await tx.devolucion.updateMany({
      where: { id: input.devolucionId, companyId, state: "Pendiente" },
      data: {
        state: "Confirmada",
        validatedAt: new Date(),
        updatedById,
      },
    });

    if (claim.count === 0) {
      const existing = await tx.devolucion.findFirst({
        select: devolucionReadSelect,
        where: { id: input.devolucionId, companyId },
      });
      requireCompanyMatch(existing, companyId, input.devolucionId);

      if (existing.state === "Confirmada") return existing;

      throw new DevolucionError(
        "devolucion_not_pendiente",
        `Cannot confirm devolucion in state ${existing.state} (only Pendiente)`,
        409
      );
    }

    const result = await tx.devolucion.findFirst({
      where: { id: input.devolucionId, companyId },
      select: {
        id: true,
        visibleNumber: true,
        companyId: true,
        surgeryId: true,
        remitoId: true,
        consumoId: true,
        state: true,
        reason: true,
        validatedAt: true,
        createdById: true,
        updatedById: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    requireCompanyMatch(result, companyId, input.devolucionId);

    await applyConfirmedDevolucionToRemito(tx, {
      companyId,
      devolucionId: input.devolucionId,
      updatedById,
    });

    if (updatedById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: updatedById,
        entityType: "Devolucion",
        entityId: result.id,
        action: "devolucion.confirmed",
        module: "devolucion",
        oldValue: { state: current.state },
        newValue: { state: result.state, validatedAt: serializeDate(result.validatedAt) },
      });
    }

    try {
      await emitCrossDomainNotification(tx, {
        companyId,
        actorUserId: updatedById ?? "system",
        type: InternalNotificationType.devolucion_confirmed,
        domain: "CONSUMOS",
        severity: "INFO",
        surgeryId: result.surgeryId,
        sourceEntityId: result.id,
        linkHref: result.surgeryId ? `/cirugias/${encodeURIComponent(result.surgeryId)}` : null,
        title: `Devolución #${result.visibleNumber ?? result.id.slice(-6)} confirmada`,
        body: "Reintegro físico de sobrante de cirugía auditado en depósito.",
        metadata: { devolucionId: result.id, remitoId: result.remitoId, visibleNumber: result.visibleNumber },
      });
    } catch (err) {
      console.error("[devolucion.service] emitCrossDomainNotification failed:", err);
    }

    const linkedDispatch = await tx.cajasDispatch?.findFirst?.({
      where: { remitoId: result.remitoId, companyId },
      select: { id: true },
    });

    if (linkedDispatch && !input.cajasAccounting) {
      throw badRequest(
        "El remito asociado contiene un despacho de Cajas que requiere imputación de devolución",
        "cajas_accounting_required",
      );
    }

    const cajasAccounting = input.cajasAccounting
      ? await acceptCajasAccounting(tx, companyId, result.id, "return", input.cajasAccounting, updatedById!)
      : undefined;

    return { ...result, cajasAccounting };
  });
}

// ─── rejectDevolucion ─────────────────────────────────────────────────────────
export async function rejectDevolucion(input: RejectDevolucionInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  const current = await prisma.devolucion.findFirst({
    where: { id: input.devolucionId, companyId },
    select: { id: true, state: true, companyId: true },
  });

  requireCompanyMatch(current, companyId, input.devolucionId);

  if (current.state !== "Pendiente") {
    throw new DevolucionError(
      "devolucion_not_pendiente",
      `Cannot reject devolucion in state ${current.state} (only Pendiente)`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.devolucion.update({
      where: { id: input.devolucionId },
      data: {
        state: "Rechazada",
        reason: input.reason ?? null,
        updatedById,
      },
      select: {
        id: true,
        visibleNumber: true,
        companyId: true,
        surgeryId: true,
        remitoId: true,
        consumoId: true,
        state: true,
        reason: true,
        validatedAt: true,
        createdById: true,
        updatedById: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (updatedById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: updatedById,
        entityType: "Devolucion",
        entityId: result.id,
        action: "devolucion.rejected",
        module: "devolucion",
        oldValue: { state: current.state },
        newValue: { state: result.state, reason: input.reason ?? null },
      });
    }

    return result;
  });
}

// ─── updateDevolucionState (transición genérica) ──────────────────────────────
export async function updateDevolucionState(input: UpdateDevolucionStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  if (!isDevolucionState(input.newState)) {
    throw badRequest(
      `newState must be one of: ${(DEVOLUCION_STATES as readonly string[]).join(", ")}`,
      "invalid_devolucion_state"
    );
  }

  const current = await prisma.devolucion.findFirst({
    where: { id: input.devolucionId, companyId },
    select: { id: true, state: true, companyId: true },
  });

  requireCompanyMatch(current, companyId, input.devolucionId);

  const currentState = current.state as DevolucionState;
  const newState = input.newState as DevolucionState;

  if (currentState === newState) {
    throw new DevolucionError(
      "devolucion_state_unchanged",
      `Devolucion state is already ${newState}`,
      409
    );
  }

  const allowed = DEVOLUCION_TRANSITIONS[currentState] ?? [];
  if (!(allowed as readonly string[]).includes(newState)) {
    throw new DevolucionError(
      "invalid_devolucion_transition",
      `Invalid devolucion state transition: ${currentState} -> ${newState}`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.devolucion.update({
      where: { id: input.devolucionId },
      data: {
        state: newState,
        updatedById,
      },
      select: {
        id: true,
        visibleNumber: true,
        companyId: true,
        surgeryId: true,
        remitoId: true,
        consumoId: true,
        state: true,
        reason: true,
        validatedAt: true,
        createdById: true,
        updatedById: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (updatedById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: updatedById,
        entityType: "Devolucion",
        entityId: result.id,
        action: "devolucion.state_changed",
        module: "devolucion",
        oldValue: { state: currentState },
        newValue: { state: newState },
      });
    }

    return result;
  });
}

// ─── deleteDevolucion (solo Borrador) ─────────────────────────────────────────
export async function deleteDevolucion(input: DeleteDevolucionInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  const current = await prisma.devolucion.findFirst({
    where: { id: input.devolucionId, companyId },
    select: { id: true, state: true, companyId: true, createdById: true },
  });

  requireCompanyMatch(current, companyId, input.devolucionId);

  if (current.state !== "Borrador") {
    throw new DevolucionError(
      "devolucion_not_deletable",
      `Cannot delete devolucion in state ${current.state} (only Borrador)`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.devolucion.findUnique({
      where: { id: input.devolucionId },
      select: { id: true, visibleNumber: true },
    });
    if (!existing) {
      throw notFound(`Devolucion ${input.devolucionId} not found`, "devolucion_not_found");
    }

    await tx.devolucion.delete({ where: { id: input.devolucionId } });

    if (current.createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: current.createdById,
        entityType: "Devolucion",
        entityId: input.devolucionId,
        action: "devolucion.deleted",
        module: "devolucion",
        oldValue: { id: input.devolucionId, state: current.state },
        newValue: null,
      });
    }

    return { id: input.devolucionId, deleted: true };
  });
}

// Re-export para consumers que quieran el tipo plano (no Prisma.Decimal) del model.
export type DevolucionRead = PrismaDevolucion;
