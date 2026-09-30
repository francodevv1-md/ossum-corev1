// OSSUM COR — Remito service (Fase 1A.1)
// Every operational query MUST filter by companyId.
// Services receive prisma as dependency injection.
// Catálogos (origin / state / transitions) viven acá para single source of truth.
// schema.prisma queda intocable (schema phase1 cerrado).

import { InternalNotificationType, Prisma } from "@prisma/client";
import type { PrismaClient, Remito as PrismaRemito } from "@prisma/client";

import { createAuditEvent, type AuditPrismaClient } from "../audit";
import { requireCompanyId } from "../tenant";
import { ApiError, badRequest, notFound } from "../api/errors";
import { emitCrossDomainNotification } from "./internal-notifications.service";
import {
  confirmDevolucion,
  createDevolucion,
  updateDevolucionState,
} from "./devolucion.service";

// ─── Catálogos (single source of truth; validator re-exporta estos) ─────────
export const REMITO_ORIGINS = ["box", "presupuesto", "manual", "mixto"] as const;
export type RemitoOrigin = (typeof REMITO_ORIGINS)[number];

export const REMITO_SALIDA_REASONS = ["cirugia", "venta", "prestamo", "traslado", "ajuste", "otro"] as const;
export type RemitoSalidaReason = (typeof REMITO_SALIDA_REASONS)[number];

export const REMITO_DOCUMENT_TYPES = ["REMITO_SALIDA"] as const;
export type RemitoDocumentType = (typeof REMITO_DOCUMENT_TYPES)[number];

export const REMITO_STATES = [
  "Borrador",
  "Emitido",
  "En_transito",
  "Entregado",
  "Parcialmente_devuelto",
  "Devuelto",
  "Anulado",
] as const;
export type RemitoState = (typeof REMITO_STATES)[number];

export const REMITO_TRANSITIONS: Record<RemitoState, RemitoState[]> = {
  Borrador: ["Emitido", "Anulado"],
  Emitido: ["En_transito", "Entregado", "Anulado"],
  En_transito: ["Entregado", "Parcialmente_devuelto", "Anulado"],
  Entregado: ["Parcialmente_devuelto", "Devuelto", "Anulado"],
  Parcialmente_devuelto: ["Devuelto", "Anulado"],
  Devuelto: [],
  Anulado: [],
};

// TODO: migrate to src/lib/permissions/*
export const REMITO_MUTATION_ROLES = ["admin", "coordinador", "logistica"] as const;
export const REMITO_READ_ROLES = [
  "admin",
  "coordinador",
  "logistica",
  "vendedor",
  "matrona",
  "instrumentador",
] as const;

const REMITO_EMIT_MAX_RETRIES = 3;
const DEFAULT_LIST_TAKE = 50;

// ─── Errores ─────────────────────────────────────────────────────────────────
export class RemitoError extends ApiError {
  constructor(code: string, message: string, status = 500) {
    super(status, code, message);
    this.name = "RemitoError";
  }
}

function isRemitoOrigin(value: string): value is RemitoOrigin {
  return (REMITO_ORIGINS as readonly string[]).includes(value);
}

function isRemitoSalidaReason(value: string): value is RemitoSalidaReason {
  return (REMITO_SALIDA_REASONS as readonly string[]).includes(value);
}

function isRemitoDocumentType(value: string): value is RemitoDocumentType {
  return (REMITO_DOCUMENT_TYPES as readonly string[]).includes(value);
}

function isRemitoState(value: string): value is RemitoState {
  return (REMITO_STATES as readonly string[]).includes(value);
}

function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializeRemitoForAudit(remito: {
  id: string;
  visibleNumber: number | null;
  companyId: string;
  branchId: string | null;
  issuedBranchId: string | null;
  documentType: string;
  surgeryId: string | null;
  origin: string;
  salidaReason: string;
  boxId: string | null;
  presupuestoId: string | null;
  destinatarioContactId: string | null;
  state: string;
  issuedAt: Date | null;
  deliveredAt: Date | null;
  returnedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: remito.id,
    visibleNumber: remito.visibleNumber,
    companyId: remito.companyId,
    branchId: remito.branchId,
    issuedBranchId: remito.issuedBranchId,
    documentType: remito.documentType,
    surgeryId: remito.surgeryId,
    origin: remito.origin,
    salidaReason: remito.salidaReason,
    boxId: remito.boxId,
    presupuestoId: remito.presupuestoId,
    destinatarioContactId: remito.destinatarioContactId,
    state: remito.state,
    issuedAt: serializeDate(remito.issuedAt),
    deliveredAt: serializeDate(remito.deliveredAt),
    returnedAt: serializeDate(remito.returnedAt),
    createdById: remito.createdById,
    updatedById: remito.updatedById,
    createdAt: remito.createdAt.toISOString(),
    updatedAt: remito.updatedAt.toISOString(),
  };
}

// ─── Select para read/list ──────────────────────────────────────────────────
const remitoReadSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  branchId: true,
  issuedBranchId: true,
  documentType: true,
  surgeryId: true,
  origin: true,
  salidaReason: true,
  boxId: true,
  presupuestoId: true,
  destinatarioContactId: true,
  destinatarioSnapshot: true,
  shippingAddressSnapshot: true,
  transportSnapshot: true,
  packageCount: true,
  declaredValue: true,
  state: true,
  issuedAt: true,
  deliveredAt: true,
  returnedAt: true,
  createdById: true,
  updatedById: true,
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
      boxId: true,
      presupuestoItemId: true,
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

function requireCompanyMatch(
  remito: { companyId: string } | null,
  companyId: string,
  remitoId: string
): asserts remito {
  if (!remito || remito.companyId !== companyId) {
    throw notFound(`Remito ${remitoId} not found in company ${companyId}`, "remito_not_found");
  }
}

function requireCreatedById(createdById: string | undefined): string | null {
  return createdById ?? null;
}

function normalizeExpectedUpdatedAt(value: string | Date | undefined): string | null {
  if (value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest("expectedUpdatedAt must be a valid date", "invalid_expected_updated_at");
  }
  return date.toISOString();
}

async function assertBranchBelongsToCompany(
  prisma: Pick<PrismaClient, "branch"> | Prisma.TransactionClient,
  companyId: string,
  branchId: string,
  code = "invalid_remito_branch"
) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId, isActive: true },
    select: { id: true },
  });
  if (!branch) {
    throw badRequest(`branchId must belong to company ${companyId}`, code);
  }
}

async function assertSurgeryBelongsToCompany(
  prisma: Pick<PrismaClient, "surgery"> | Prisma.TransactionClient,
  companyId: string,
  surgeryId: string | null | undefined
) {
  if (!surgeryId) return;
  const surgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, companyId },
    select: { id: true },
  });
  if (!surgery) {
    throw notFound(`Surgery ${surgeryId} not found in company ${companyId}`, "surgery_not_found");
  }
}

function requireBranchId(branchId: string | null | undefined): string {
  if (typeof branchId !== "string" || branchId.trim().length === 0) {
    throw badRequest("branchId is required for Remito de Salida V1", "remito_branch_required");
  }
  return branchId.trim();
}

function normalizeTraceExpirationDate(value: Date | string | null | undefined, path: string): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${path}.expirationDate must be a valid date`, "invalid_trace_expiration_date");
  }
  return date;
}

// ─── Asignación de visibleNumber (atomic via row-level lock in tx) ──────────
async function getNextVisibleNumber(
  tx: Prisma.TransactionClient,
  companyId: string,
  branchId: string,
  documentType: RemitoDocumentType
): Promise<number> {
  await tx.$executeRaw`LOCK TABLE "Remito" IN SHARE ROW EXCLUSIVE MODE`;

  const rows = await tx.$queryRaw<Array<{ next: bigint | number | null }>>`
    SELECT COALESCE(MAX("visibleNumber"), 0) + 1 AS "next"
    FROM "Remito"
    WHERE "companyId" = ${companyId}
      AND "branchId" = ${branchId}
      AND "documentType" = ${documentType}
  `;

  const raw = rows[0]?.next;
  const next = raw == null ? 1 : Number(raw);
  if (!Number.isFinite(next) || next <= 0) {
    throw new RemitoError("remito_visible_number_failed", "Failed to allocate next visible number");
  }
  return next;
}

// ─── Tipos de input ──────────────────────────────────────────────────────────
export interface RemitoItemCreatePayload {
  itemId?: string;
  sku?: string;
  description: string;
  quantity: number | string;
  unit?: string;
  boxId?: string;
  presupuestoItemId?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: Date | string;
  metadata?: Record<string, unknown>;
}

export interface CreateRemitoInput {
  companyId: string;
  branchId: string;
  issuedBranchId?: string;
  documentType?: string;
  surgeryId?: string;
  origin: string;
  salidaReason: string;
  boxId?: string;
  presupuestoId?: string;
  destinatarioContactId?: string | null;
  destinatarioSnapshot?: Record<string, unknown> | null;
  shippingAddressSnapshot?: Record<string, unknown> | null;
  transportSnapshot?: Record<string, unknown> | null;
  packageCount?: number | null;
  declaredValue?: number | string | null;
  items: RemitoItemCreatePayload[];
  createdById?: string;
  metadata?: Record<string, unknown> | null;
  prisma: PrismaClient;
}

export interface ListRemitosInput {
  companyId: string;
  surgeryId?: string;
  branchId?: string;
  state?: string;
  origin?: string;
  salidaReason?: string;
  fromDate?: Date;
  toDate?: Date;
  prisma: PrismaClient;
  take?: number;
  skip?: number;
}

export interface GetRemitoInput {
  companyId: string;
  remitoId: string;
  prisma: PrismaClient;
}

export interface EmitirRemitoInput {
  companyId: string;
  remitoId: string;
  updatedById?: string;
  prisma: PrismaClient;
}

export interface UpdateRemitoStateInput {
  companyId: string;
  remitoId: string;
  newState: string;
  updatedById?: string;
  prisma: PrismaClient;
}

export interface UpdateRemitoDraftInput {
  companyId: string;
  remitoId: string;
  expectedUpdatedAt?: string | Date;
  branchId?: string;
  issuedBranchId?: string;
  surgeryId?: string | null;
  salidaReason?: string;
  boxId?: string | null;
  presupuestoId?: string | null;
  destinatarioContactId?: string | null;
  destinatarioSnapshot?: Record<string, unknown> | null;
  shippingAddressSnapshot?: Record<string, unknown> | null;
  transportSnapshot?: Record<string, unknown> | null;
  packageCount?: number | null;
  declaredValue?: number | string | null;
  items?: RemitoItemCreatePayload[];
  metadata?: Record<string, unknown> | null;
  updatedById?: string;
  prisma: PrismaClient;
}

export interface DevolucionItemInput {
  itemId: string;
  returnedQuantity: number | string;
}

export interface RegistrarDevolucionInput {
  companyId: string;
  remitoId: string;
  items: DevolucionItemInput[];
  updatedById?: string;
  prisma: PrismaClient;
}

export interface DeleteRemitoInput {
  companyId: string;
  remitoId: string;
  prisma: PrismaClient;
}

// ─── createRemito ─────────────────────────────────────────────────────────────
export async function createRemito(input: CreateRemitoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const branchId = requireBranchId(input.branchId);
  const issuedBranchId = requireBranchId(input.issuedBranchId ?? input.branchId);
  const documentType = input.documentType ?? "REMITO_SALIDA";

  if (!isRemitoDocumentType(documentType)) {
    throw badRequest(
      `documentType must be one of: ${(REMITO_DOCUMENT_TYPES as readonly string[]).join(", ")}`,
      "invalid_remito_document_type"
    );
  }

  if (!isRemitoOrigin(input.origin)) {
    throw badRequest(
      `origin must be one of: ${(REMITO_ORIGINS as readonly string[]).join(", ")}`,
      "invalid_remito_origin"
    );
  }

  if (!isRemitoSalidaReason(input.salidaReason)) {
    throw badRequest(
      `salidaReason must be one of: ${(REMITO_SALIDA_REASONS as readonly string[]).join(", ")}`,
      "invalid_remito_salida_reason"
    );
  }

  if (input.packageCount !== undefined && input.packageCount !== null && (!Number.isInteger(input.packageCount) || input.packageCount < 0)) {
    throw badRequest("packageCount must be a non-negative integer", "invalid_remito_package_count");
  }
  if (input.declaredValue !== undefined && input.declaredValue !== null) {
    const declaredValue = Number(input.declaredValue);
    if (!Number.isFinite(declaredValue) || declaredValue < 0) {
      throw badRequest("declaredValue must be a non-negative number", "invalid_remito_declared_value");
    }
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw badRequest("items must be a non-empty array", "remito_empty_items");
  }

  const normalizedItems = input.items.map((item, index) => {
    const quantityNumber = Number(item.quantity);
    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      throw badRequest(`items[${index}].quantity must be a positive number`, "invalid_remito_item_quantity");
    }
    if (typeof item.description !== "string" || item.description.trim().length === 0) {
      throw badRequest(`items[${index}].description is required`, "invalid_remito_item_description");
    }
    return {
      itemId: item.itemId ?? null,
      sku: item.sku ?? null,
      description: item.description,
      quantity: toDecimal(item.quantity),
      unit: item.unit ?? null,
      boxId: item.boxId ?? null,
      presupuestoItemId: item.presupuestoItemId ?? null,
      lotNumber: item.lotNumber?.trim() || null,
      serialNumber: item.serialNumber?.trim() || null,
      expirationDate: normalizeTraceExpirationDate(item.expirationDate, `items[${index}]`),
      metadata: (item.metadata ?? null) as Prisma.InputJsonValue | undefined,
    };
  });

  const createdById = requireCreatedById(input.createdById);

  await assertBranchBelongsToCompany(prisma, companyId, branchId);
  await assertBranchBelongsToCompany(prisma, companyId, issuedBranchId, "invalid_remito_issued_branch");
  await assertSurgeryBelongsToCompany(prisma, companyId, input.surgeryId);

  const remito = await prisma.$transaction(async (tx) => {
    const created = await tx.remito.create({
      data: {
        companyId,
        branchId,
        issuedBranchId,
        documentType,
        surgeryId: input.surgeryId ?? null,
        origin: input.origin,
        salidaReason: input.salidaReason,
        boxId: input.boxId ?? null,
        presupuestoId: input.presupuestoId ?? null,
        destinatarioContactId: input.destinatarioContactId ?? null,
        destinatarioSnapshot:
          (input.destinatarioSnapshot ?? null) as Prisma.InputJsonValue | undefined,
        shippingAddressSnapshot:
          (input.shippingAddressSnapshot ?? null) as Prisma.InputJsonValue | undefined,
        transportSnapshot:
          (input.transportSnapshot ?? null) as Prisma.InputJsonValue | undefined,
        packageCount: input.packageCount ?? null,
        declaredValue: input.declaredValue == null ? null : toDecimal(input.declaredValue),
        state: "Borrador",
        createdById,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | undefined,
        items: {
          create: normalizedItems.map((item) => ({
            itemId: item.itemId,
            sku: item.sku,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            boxId: item.boxId,
            presupuestoItemId: item.presupuestoItemId,
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
        branchId: true,
        issuedBranchId: true,
        documentType: true,
        surgeryId: true,
        origin: true,
        salidaReason: true,
        boxId: true,
        presupuestoId: true,
        destinatarioContactId: true,
        destinatarioSnapshot: true,
        shippingAddressSnapshot: true,
        transportSnapshot: true,
        packageCount: true,
        declaredValue: true,
        state: true,
        issuedAt: true,
        deliveredAt: true,
        returnedAt: true,
        createdById: true,
        updatedById: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        items: { select: { id: true, description: true, quantity: true } },
      },
    });

    if (createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: createdById,
        entityType: "Remito",
        entityId: created.id,
        action: "remito.created",
        module: "remito",
        oldValue: null,
        newValue: serializeRemitoForAudit(created),
      });
    }

    return created;
  });

  return remito;
}

// ─── listRemitos ──────────────────────────────────────────────────────────────
export async function listRemitos(input: ListRemitosInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  if (input.state !== undefined && !isRemitoState(input.state)) {
    throw badRequest(
      `state must be one of: ${(REMITO_STATES as readonly string[]).join(", ")}`,
      "invalid_remito_state_filter"
    );
  }

  if (input.origin !== undefined && !isRemitoOrigin(input.origin)) {
    throw badRequest(
      `origin must be one of: ${(REMITO_ORIGINS as readonly string[]).join(", ")}`,
      "invalid_remito_origin_filter"
    );
  }

  if (input.salidaReason !== undefined && !isRemitoSalidaReason(input.salidaReason)) {
    throw badRequest(
      `salidaReason must be one of: ${(REMITO_SALIDA_REASONS as readonly string[]).join(", ")}`,
      "invalid_remito_salida_reason_filter"
    );
  }

  const where: Prisma.RemitoWhereInput = { companyId };
  if (input.surgeryId) where.surgeryId = input.surgeryId;
  if (input.branchId) where.branchId = input.branchId;
  if (input.state) where.state = input.state;
  if (input.origin) where.origin = input.origin;
  if (input.salidaReason) where.salidaReason = input.salidaReason;

  if (input.fromDate || input.toDate) {
    where.issuedAt = {
      ...(input.fromDate ? { gte: input.fromDate } : {}),
      ...(input.toDate ? { lte: input.toDate } : {}),
    };
  }

  const take = input.take ?? DEFAULT_LIST_TAKE;
  const skip = input.skip ?? 0;

  return prisma.remito.findMany({
    select: remitoReadSelect,
    where,
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    take,
    skip,
  });
}

// ─── getRemito ─────────────────────────────────────────────────────────────────
export async function getRemito(input: GetRemitoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  const remito = await prisma.remito.findFirst({
    select: remitoReadSelect,
    where: { id: input.remitoId, companyId },
  });

  if (!remito) {
    throw notFound(`Remito ${input.remitoId} not found in company ${companyId}`, "remito_not_found");
  }

  return remito;
}

// ─── updateRemitoDraft ──────────────────────────────────────────────────────
export async function updateRemitoDraft(input: UpdateRemitoDraftInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);
  const expectedUpdatedAt = normalizeExpectedUpdatedAt(input.expectedUpdatedAt);

  const hasItems = input.items !== undefined;
  const hasScalarUpdate =
    input.branchId !== undefined ||
    input.issuedBranchId !== undefined ||
    input.surgeryId !== undefined ||
    input.salidaReason !== undefined ||
    input.boxId !== undefined ||
    input.presupuestoId !== undefined ||
    input.destinatarioContactId !== undefined ||
    input.destinatarioSnapshot !== undefined ||
    input.shippingAddressSnapshot !== undefined ||
    input.transportSnapshot !== undefined ||
    input.packageCount !== undefined ||
    input.declaredValue !== undefined ||
    input.metadata !== undefined;

  if (!hasItems && !hasScalarUpdate) {
    throw badRequest("At least one draft field is required", "empty_remito_draft_update");
  }

  const normalizedItems = hasItems
    ? input.items!.map((item, index) => {
        const quantityNumber = Number(item.quantity);
        if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
          throw badRequest(`items[${index}].quantity must be a positive number`, "invalid_remito_item_quantity");
        }
        if (typeof item.description !== "string" || item.description.trim().length === 0) {
          throw badRequest(`items[${index}].description is required`, "invalid_remito_item_description");
        }
        return {
          itemId: item.itemId ?? null,
          sku: item.sku ?? null,
          description: item.description,
          quantity: toDecimal(item.quantity),
          unit: item.unit ?? null,
          boxId: item.boxId ?? null,
          presupuestoItemId: item.presupuestoItemId ?? null,
          lotNumber: item.lotNumber?.trim() || null,
          serialNumber: item.serialNumber?.trim() || null,
          expirationDate: normalizeTraceExpirationDate(item.expirationDate, `items[${index}]`),
          metadata: (item.metadata ?? null) as Prisma.InputJsonValue | undefined,
        };
      })
    : undefined;

  const nextBranchId = input.branchId !== undefined ? requireBranchId(input.branchId) : undefined;
  const nextIssuedBranchId = input.issuedBranchId !== undefined
    ? requireBranchId(input.issuedBranchId)
    : input.branchId !== undefined
      ? requireBranchId(input.branchId)
      : undefined;

  if (input.salidaReason !== undefined && !isRemitoSalidaReason(input.salidaReason)) {
    throw badRequest(
      `salidaReason must be one of: ${(REMITO_SALIDA_REASONS as readonly string[]).join(", ")}`,
      "invalid_remito_salida_reason"
    );
  }

  if (input.packageCount !== undefined && input.packageCount !== null && (!Number.isInteger(input.packageCount) || input.packageCount < 0)) {
    throw badRequest("packageCount must be a non-negative integer", "invalid_remito_package_count");
  }
  if (input.declaredValue !== undefined && input.declaredValue !== null) {
    const declaredValue = Number(input.declaredValue);
    if (!Number.isFinite(declaredValue) || declaredValue < 0) {
      throw badRequest("declaredValue must be a non-negative number", "invalid_remito_declared_value");
    }
  }

  if (nextBranchId) await assertBranchBelongsToCompany(prisma, companyId, nextBranchId);
  if (nextIssuedBranchId) await assertBranchBelongsToCompany(prisma, companyId, nextIssuedBranchId, "invalid_remito_issued_branch");
  await assertSurgeryBelongsToCompany(prisma, companyId, input.surgeryId);

  return prisma.$transaction(async (tx) => {
    const current = await tx.remito.findFirst({
      where: { id: input.remitoId, companyId },
      select: remitoReadSelect,
    });

    requireCompanyMatch(current, companyId, input.remitoId);

    if (current.state !== "Borrador") {
      throw new RemitoError(
        "remito_not_borrador",
        `Cannot update remito in state ${current.state} (only Borrador)`,
        409
      );
    }

    if (expectedUpdatedAt && current.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new RemitoError(
        "remito_update_conflict",
        "El remito fue actualizado por otro usuario. Actualizá la vista antes de guardar para no perder cambios.",
        409
      );
    }

    const data = {
      updatedById,
      ...(nextBranchId !== undefined ? { branchId: nextBranchId } : {}),
      ...(nextIssuedBranchId !== undefined ? { issuedBranchId: nextIssuedBranchId } : {}),
      ...(input.surgeryId !== undefined ? { surgeryId: input.surgeryId } : {}),
      ...(input.salidaReason !== undefined ? { salidaReason: input.salidaReason } : {}),
      ...(input.boxId !== undefined ? { boxId: input.boxId } : {}),
      ...(input.presupuestoId !== undefined ? { presupuestoId: input.presupuestoId } : {}),
      ...(input.destinatarioContactId !== undefined ? { destinatarioContactId: input.destinatarioContactId } : {}),
      ...(input.destinatarioSnapshot !== undefined
        ? { destinatarioSnapshot: (input.destinatarioSnapshot ?? null) as Prisma.InputJsonValue | undefined }
        : {}),
      ...(input.shippingAddressSnapshot !== undefined
        ? { shippingAddressSnapshot: (input.shippingAddressSnapshot ?? null) as Prisma.InputJsonValue | undefined }
        : {}),
      ...(input.transportSnapshot !== undefined
        ? { transportSnapshot: (input.transportSnapshot ?? null) as Prisma.InputJsonValue | undefined }
        : {}),
      ...(input.packageCount !== undefined ? { packageCount: input.packageCount } : {}),
      ...(input.declaredValue !== undefined ? { declaredValue: input.declaredValue == null ? null : toDecimal(input.declaredValue) } : {}),
      ...(input.metadata !== undefined ? { metadata: (input.metadata ?? null) as Prisma.InputJsonValue | undefined } : {}),
    };

    const updated = await tx.remito.updateMany({
      where: {
        id: input.remitoId,
        companyId,
        state: "Borrador",
        ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}),
      },
      data,
    });

    if (updated.count === 0) {
      throw new RemitoError(
        "remito_update_conflict",
        "El remito fue actualizado por otro usuario. Actualizá la vista antes de guardar para no perder cambios.",
        409
      );
    }

    if (normalizedItems) {
      await tx.remitoItem.deleteMany({
        where: { companyId, remitoId: input.remitoId },
      });
      await tx.remitoItem.createMany({
        data: normalizedItems.map((item) => ({
          companyId,
          remitoId: input.remitoId,
          itemId: item.itemId,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          boxId: item.boxId,
          presupuestoItemId: item.presupuestoItemId,
          lotNumber: item.lotNumber,
          serialNumber: item.serialNumber,
          expirationDate: item.expirationDate,
          metadata: item.metadata,
        })),
      });
    }

    const result = await tx.remito.findFirst({
      where: { id: input.remitoId, companyId },
      select: remitoReadSelect,
    });
    requireCompanyMatch(result, companyId, input.remitoId);

    if (updatedById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: updatedById,
        entityType: "Remito",
        entityId: result.id,
        action: "remito.draft_updated",
        module: "remito",
        oldValue: serializeRemitoForAudit(current),
        newValue: serializeRemitoForAudit(result),
      });
    }

    return result;
  });
}

// ─── emitirRemito ────────────────────────────────────────────────────────────
export async function emitirRemito(input: EmitirRemitoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  for (let attempt = 0; attempt < REMITO_EMIT_MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const current = await tx.remito.findFirst({
            where: { id: input.remitoId, companyId },
            select: remitoReadSelect,
          });

          requireCompanyMatch(current, companyId, input.remitoId);

          if (current.state !== "Borrador") {
            throw new RemitoError(
              "remito_not_borrador",
              `Cannot emit remito in state ${current.state}`,
              409
            );
          }

          const branchId = requireBranchId(current.branchId);
          const issuedBranchId = requireBranchId(current.issuedBranchId ?? current.branchId);
          if (!isRemitoDocumentType(current.documentType)) {
            throw badRequest("Invalid remito documentType", "invalid_remito_document_type");
          }

          const visibleNumber = await getNextVisibleNumber(tx, companyId, branchId, current.documentType);

          const result = await tx.remito.update({
            where: { id: input.remitoId },
            data: {
              issuedBranchId,
              visibleNumber,
              state: "Emitido",
              issuedAt: new Date(),
              updatedById,
            },
            select: remitoReadSelect,
          });

          if (updatedById) {
            await createAuditEvent({
              prisma: tx as unknown as PrismaClient,
              companyId,
              userId: updatedById,
              entityType: "Remito",
              entityId: result.id,
              action: "remito.issued",
              module: "remito",
              oldValue: { state: current.state },
              newValue: { state: result.state, visibleNumber: result.visibleNumber },
            });

            await emitCrossDomainNotification(tx as unknown as PrismaClient, {
              companyId,
              actorUserId: updatedById,
              type: InternalNotificationType.remito_prepared,
              domain: "LOGISTICA",
              severity: "INFO",
              surgeryId: result.surgeryId,
              sourceEntityId: result.id,
              linkHref: `/remitos/${result.id}`,
              title: `Remito ${result.visibleNumber || result.id} emitido / preparado`,
              body: `Remito de salida emitido para ${result.surgeryId ? `cirugía ${result.surgeryId}` : "traslado / venta"}.`,
              eventKeyPrefix: "remito:issued",
            }).catch((err) => {
              console.error("[notifications] Failed to emit remito_prepared:", err);
            });
          }

          return result;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < REMITO_EMIT_MAX_RETRIES - 1
      ) {
        continue;
      }

      // Propagate RemitoError and ApiError as-is
      if (error instanceof RemitoError) {
        throw error;
      }
      throw error;
    }
  }

  throw new RemitoError("remito_emit_failed", "Failed to emit remito after retrying transactional visible number allocation");
}

// ─── updateRemitoState ─────────────────────────────────────────────────────────
export async function updateRemitoState(input: UpdateRemitoStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  if (!isRemitoState(input.newState)) {
    throw badRequest(
      `newState must be one of: ${(REMITO_STATES as readonly string[]).join(", ")}`,
      "invalid_remito_state"
    );
  }

  const current = await prisma.remito.findFirst({
    where: { id: input.remitoId, companyId },
    select: {
      id: true,
      state: true,
      companyId: true,
      issuedAt: true,
      deliveredAt: true,
      returnedAt: true,
    },
  });

  requireCompanyMatch(current, companyId, input.remitoId);

  const currentState = current.state as RemitoState;
  const newState = input.newState as RemitoState;

  const allowed = REMITO_TRANSITIONS[currentState] ?? [];
  if (currentState === newState) {
    throw new RemitoError("remito_state_unchanged", `Remito state is already ${newState}`, 409);
  }

  if (!(allowed as readonly string[]).includes(newState)) {
    throw new RemitoError(
      "invalid_remito_transition",
      `Invalid remito state transition: ${currentState} -> ${newState}`,
      409
    );
  }

  if (currentState === "Borrador" && newState === "Emitido") {
    throw new RemitoError(
      "remito_emit_requires_emit_endpoint",
      "Borrador remitos must be emitted through emitirRemito to allocate visibleNumber",
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const result = await tx.remito.update({
      where: { id: input.remitoId },
      data: {
        state: newState,
        ...(newState === "Emitido" && !current.issuedAt ? { issuedAt: now } : {}),
        ...(newState === "Entregado" && !current.deliveredAt ? { deliveredAt: now } : {}),
        ...(newState === "Devuelto" && !current.returnedAt ? { returnedAt: now } : {}),
        updatedById,
      },
      select: {
        id: true,
        visibleNumber: true,
        companyId: true,
        surgeryId: true,
        origin: true,
        boxId: true,
        presupuestoId: true,
        state: true,
        issuedAt: true,
        deliveredAt: true,
        returnedAt: true,
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
        entityType: "Remito",
        entityId: result.id,
        action: "remito.state_changed",
        module: "remito",
        oldValue: { state: currentState },
        newValue: { state: newState },
      });

      let notifType: InternalNotificationType | null = null;
      let title = "";
      let body = "";
      let severity: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS" = "INFO";

      if (newState === "En_transito") {
        notifType = InternalNotificationType.remito_dispatched;
        title = `Remito ${result.visibleNumber || result.id} despachado`;
        body = `El remito se encuentra en tránsito hacia su destino.`;
      } else if (newState === "Entregado") {
        notifType = InternalNotificationType.remito_delivered;
        title = `Remito ${result.visibleNumber || result.id} entregado`;
        body = `Entrega confirmada en destino.`;
        severity = "SUCCESS";
      } else if (newState === "Anulado") {
        notifType = InternalNotificationType.logistics_incident;
        title = `Incidencia / Anulación en Remito ${result.visibleNumber || result.id}`;
        body = `El remito fue anulado desde estado ${currentState}.`;
        severity = "WARNING";
      }

      if (notifType) {
        await emitCrossDomainNotification(tx as unknown as PrismaClient, {
          companyId,
          actorUserId: updatedById,
          type: notifType,
          domain: "LOGISTICA",
          severity,
          surgeryId: result.surgeryId,
          sourceEntityId: result.id,
          linkHref: `/remitos/${result.id}`,
          title,
          body,
          eventKeyPrefix: `remito:state:${newState}`,
        }).catch((err) => {
          console.error("[notifications] Failed to emit remito state change notification:", err);
        });
      }
    }

    return result;
  });
}

// ─── registrarDevolucion ─────────────────────────────────────────────────────────
export async function registrarDevolucion(input: RegistrarDevolucionInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw badRequest("devolucion items must be a non-empty array", "remito_empty_devolucion");
  }

  // Prefetch remito + items para validar existencia, cantidades y armar la Devolucion auditable.
  const current = await prisma.remito.findFirst({
    where: { id: input.remitoId, companyId },
    select: {
      id: true,
      state: true,
      companyId: true,
      surgeryId: true,
      returnedAt: true,
      items: {
        select: {
          id: true,
          sku: true,
          description: true,
          quantity: true,
          returnedQuantity: true,
          unit: true,
          lotNumber: true,
          serialNumber: true,
          expirationDate: true,
        },
      },
    },
  });

  requireCompanyMatch(current, companyId, input.remitoId);

  if (current.state === "Anulado" || current.state === "Devuelto") {
    throw new RemitoError(
      "remito_devolucion_not_allowed",
      `Cannot register devolucion on remito in state ${current.state}`,
      409
    );
  }

  const itemMap = new Map(current.items.map((it) => [it.id, it]));
  const requestedByItem = new Map<string, number>();
  for (const requestedItem of input.items) {
    const existing = itemMap.get(requestedItem.itemId);
    if (!existing) {
      throw badRequest(
        `Item ${requestedItem.itemId} does not belong to remito ${input.remitoId}`,
        "remito_item_not_found"
      );
    }
    const requestedQty = Number(requestedItem.returnedQuantity);
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      throw badRequest(
        `Item ${requestedItem.itemId} returnedQuantity must be a positive number`,
        "invalid_returned_quantity"
      );
    }
    requestedByItem.set(
      requestedItem.itemId,
      (requestedByItem.get(requestedItem.itemId) ?? 0) + requestedQty
    );
  }

  for (const [itemId, requestedQty] of requestedByItem.entries()) {
    const existing = itemMap.get(itemId)!;
    const alreadyReturned = Number(existing.returnedQuantity ?? 0);
    const totalRequested = alreadyReturned + requestedQty;
    const itemQuantity = Number(existing.quantity);
    if (totalRequested > itemQuantity) {
      throw new RemitoError(
        "remito_devolucion_quantity_exceeded",
        `Item ${itemId} returnedQuantity would exceed quantity (max ${itemQuantity - alreadyReturned})`,
        409
      );
    }
  }

  const devolucion = await createDevolucion({
    companyId,
    remitoId: input.remitoId,
    surgeryId: current.surgeryId ?? undefined,
    items: input.items.map((requestedItem) => {
      const existing = itemMap.get(requestedItem.itemId)!;
      return {
        remitoItemId: requestedItem.itemId,
        sku: existing.sku ?? undefined,
        description: existing.description,
        returnedQuantity: requestedItem.returnedQuantity,
        unit: existing.unit ?? undefined,
        lotNumber: existing.lotNumber ?? undefined,
        serialNumber: existing.serialNumber ?? undefined,
        expirationDate: existing.expirationDate ?? undefined,
      };
    }),
    reason: "legacy_remito_devolucion",
    createdById: updatedById ?? undefined,
    metadata: { source: "legacy_remito_devolucion_endpoint" },
    prisma,
  });

  await updateDevolucionState({
    companyId,
    devolucionId: devolucion.id,
    newState: "Pendiente",
    updatedById: updatedById ?? undefined,
    prisma,
  });

  await confirmDevolucion({
    companyId,
    devolucionId: devolucion.id,
    updatedById: updatedById ?? undefined,
    prisma,
  });

  return getRemito({
    companyId,
    remitoId: input.remitoId,
    prisma,
  });
}

// ─── deleteRemito ───────────────────────────────────────────────────────────────
export async function deleteRemito(input: DeleteRemitoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  const current = await prisma.remito.findFirst({
    where: { id: input.remitoId, companyId },
    select: { id: true, state: true, companyId: true, createdById: true },
  });

  requireCompanyMatch(current, companyId, input.remitoId);

  if (current.state !== "Borrador") {
    throw new RemitoError(
      "remito_not_deletable",
      `Cannot delete remito in state ${current.state} (only Borrador)`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.remito.findUnique({
      where: { id: input.remitoId },
      select: { id: true, visibleNumber: true },
    });
    if (!existing) {
      throw notFound(`Remito ${input.remitoId} not found`, "remito_not_found");
    }

    await tx.remito.delete({ where: { id: input.remitoId } });

    if (current.createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: current.createdById,
        entityType: "Remito",
        entityId: input.remitoId,
        action: "remito.deleted",
        module: "remito",
        oldValue: { id: input.remitoId, state: current.state },
        newValue: null,
      });
    }

    return { id: input.remitoId, deleted: true };
  });
}

// ─── recomputeSurgeryLogisticsStatus ───────────────────────────────────────────
// Lee remitos no anulados de la cirugía y devuelve el estado logístico sugerido.
// NO muta Surgery — es función pura de read. El frontend hook de Fase 1A.2 lo invoca.
export async function recomputeSurgeryLogisticsStatus(params: {
  companyId: string;
  surgeryId: string;
  prisma: PrismaClient;
}): Promise<"has_remitos_emitidos" | "en_transito" | "entregado" | "parcial" | "devuelto" | "none"> {
  const companyId = requireCompanyId(params.companyId);
  const prisma = params.prisma;

  const remitos = await prisma.remito.findMany({
    where: { companyId, surgeryId: params.surgeryId, state: { not: "Anulado" } },
    select: { state: true },
  });

  if (remitos.length === 0) {
    return "none";
  }

  const states = new Set(remitos.map((r) => r.state));

  if (states.has("En_transito")) return "en_transito";
  if (states.has("Parcialmente_devuelto")) return "parcial";
  if (states.has("Devuelto")) return "devuelto";
  if (states.has("Entregado")) return "entregado";
  return "has_remitos_emitidos";
}

// Re-export para consumers que quieran el tipo plano (no Prisma.Decimal) del model.
export type RemitoRead = PrismaRemito;
