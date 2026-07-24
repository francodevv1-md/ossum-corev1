// OSSUM COR — Presupuesto service (Fase 1C)
// Every operational query MUST filter by companyId.
// Services receive prisma as dependency injection.
// Catálogos (state / transitions) viven acá para single source of truth.

import { Prisma } from "@prisma/client";
import type { PrismaClient, Presupuesto as PrismaPresupuesto } from "@prisma/client";

import { createAuditEvent } from "../audit";
import { requireCompanyId } from "../tenant";
import { badRequest, notFound } from "../api/errors";

export const PRESUPUESTO_STATES = [
  "Borrador",
  "Emitido",
  "Aprobado",
  "Rechazado",
  "Vencido",
  "Reemplazado",
  "Anulado",
] as const;
export type PresupuestoState = (typeof PRESUPUESTO_STATES)[number];

export const PRESUPUESTO_TRANSITIONS: Record<PresupuestoState, PresupuestoState[]> = {
  Borrador: ["Emitido", "Anulado"],
  Emitido: ["Aprobado", "Rechazado", "Vencido", "Anulado"],
  Aprobado: ["Reemplazado", "Anulado"],
  Rechazado: [],
  Vencido: [],
  Reemplazado: [],
  Anulado: [],
};

export const PRESUPUESTO_MUTATION_ROLES = ["admin", "coordinador", "vendedor"] as const;
export const PRESUPUESTO_READ_ROLES = [
  "admin",
  "coordinador",
  "logistica",
  "vendedor",
  "matrona",
  "instrumentador",
] as const;

const PRESUPUESTO_EMIT_MAX_RETRIES = 3;
const DEFAULT_LIST_TAKE = 50;

export class PresupuestoError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "PresupuestoError";
    this.code = code;
    this.status = status;
  }
}

function isPresupuestoState(value: string): value is PresupuestoState {
  return (PRESUPUESTO_STATES as readonly string[]).includes(value);
}

function toDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializePresupuestoForAudit(presupuesto: {
  id: string;
  visibleNumber: number | null;
  companyId: string;
  surgeryId: string | null;
  parentPresupuestoId: string | null;
  versionNumber: number;
  state: string;
  title: string | null;
  currency: string;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  validUntil: Date | null;
  issuedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: presupuesto.id,
    visibleNumber: presupuesto.visibleNumber,
    companyId: presupuesto.companyId,
    surgeryId: presupuesto.surgeryId,
    parentPresupuestoId: presupuesto.parentPresupuestoId,
    versionNumber: presupuesto.versionNumber,
    state: presupuesto.state,
    title: presupuesto.title,
    currency: presupuesto.currency,
    subtotal: presupuesto.subtotal.toString(),
    discountTotal: presupuesto.discountTotal.toString(),
    taxTotal: presupuesto.taxTotal.toString(),
    total: presupuesto.total.toString(),
    validUntil: serializeDate(presupuesto.validUntil),
    issuedAt: serializeDate(presupuesto.issuedAt),
    approvedAt: serializeDate(presupuesto.approvedAt),
    rejectedAt: serializeDate(presupuesto.rejectedAt),
    createdById: presupuesto.createdById,
    updatedById: presupuesto.updatedById,
    createdAt: presupuesto.createdAt.toISOString(),
    updatedAt: presupuesto.updatedAt.toISOString(),
  };
}

const presupuestoReadSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  surgeryId: true,
  parentPresupuestoId: true,
  versionNumber: true,
  state: true,
  title: true,
  currency: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  total: true,
  validUntil: true,
  issuedAt: true,
  approvedAt: true,
  rejectedAt: true,
  createdById: true,
  updatedById: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      sku: true,
      description: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      discount: true,
      tax: true,
      total: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PresupuestoSelect;

function requireCompanyMatch(
  presupuesto: { companyId: string } | null,
  companyId: string,
  presupuestoId: string
): asserts presupuesto {
  if (!presupuesto || presupuesto.companyId !== companyId) {
    throw notFound(
      `Presupuesto ${presupuestoId} not found in company ${companyId}`,
      "presupuesto_not_found"
    );
  }
}

function optionalUserId(userId: string | undefined): string | null {
  return userId ?? null;
}

async function getNextVisibleNumber(
  tx: Prisma.TransactionClient,
  companyId: string
): Promise<number> {
  await tx.$executeRaw`LOCK TABLE "presupuesto" IN SHARE ROW EXCLUSIVE MODE`;

  const rows = await tx.$queryRaw<Array<{ next: bigint | number | null }>>`
    SELECT COALESCE(MAX("visibleNumber"), 0) + 1 AS "next"
    FROM "presupuesto"
    WHERE "companyId" = ${companyId}
  `;

  const raw = rows[0]?.next;
  const next = raw == null ? 1 : Number(raw);
  if (!Number.isFinite(next) || next <= 0) {
    throw new PresupuestoError(
      "presupuesto_visible_number_failed",
      "Failed to allocate next visible number"
    );
  }
  return next;
}

export interface PresupuestoItemInput {
  sku?: string;
  description: string;
  quantity: number | string | Prisma.Decimal;
  unit?: string;
  unitPrice?: number | string | Prisma.Decimal;
  discount?: number | string | Prisma.Decimal;
  tax?: number | string | Prisma.Decimal;
  metadata?: Record<string, unknown>;
}

export interface NormalizedPresupuestoItem extends Required<Pick<PresupuestoItemInput, "description">> {
  sku: string | null;
  quantity: Prisma.Decimal;
  unit: string | null;
  unitPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  metadata?: Prisma.InputJsonValue;
}

export interface CreatePresupuestoInput {
  companyId: string;
  surgeryId?: string;
  title?: string;
  currency?: string;
  validUntil?: Date;
  items: PresupuestoItemInput[];
  createdById?: string;
  metadata?: Record<string, unknown> | null;
  prisma: PrismaClient;
}

export interface ListPresupuestosInput {
  companyId: string;
  surgeryId?: string;
  state?: string;
  fromDate?: Date;
  toDate?: Date;
  take?: number;
  skip?: number;
  prisma: PrismaClient;
}

export interface GetPresupuestoInput {
  companyId: string;
  presupuestoId: string;
  prisma: PrismaClient;
}

export interface EmitPresupuestoInput extends GetPresupuestoInput {
  updatedById?: string;
}

export interface UpdatePresupuestoStateInput extends GetPresupuestoInput {
  newState: string;
  updatedById?: string;
}

export interface CreatePresupuestoVersionInput {
  companyId: string;
  sourcePresupuestoId: string;
  items?: PresupuestoItemInput[];
  updatedById?: string;
  prisma: PrismaClient;
}

export interface DeletePresupuestoInput extends GetPresupuestoInput {}

export function recalculatePresupuestoTotals(items: PresupuestoItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("items must be a non-empty array", "presupuesto_empty_items");
  }

  const normalizedItems = items.map((item, index): NormalizedPresupuestoItem => {
    const quantity = toDecimal(item.quantity);
    const unitPrice = toDecimal(item.unitPrice ?? 0);
    const discount = toDecimal(item.discount ?? 0);
    const tax = toDecimal(item.tax ?? 0);

    if (quantity.lte(0)) {
      throw badRequest(
        `items[${index}].quantity must be a positive number`,
        "invalid_presupuesto_item_quantity"
      );
    }
    if (unitPrice.lt(0) || discount.lt(0) || tax.lt(0)) {
      throw badRequest(
        `items[${index}] prices, discounts and taxes must be non-negative`,
        "invalid_presupuesto_item_amount"
      );
    }
    if (typeof item.description !== "string" || item.description.trim().length === 0) {
      throw badRequest(
        `items[${index}].description is required`,
        "invalid_presupuesto_item_description"
      );
    }

    const gross = quantity.mul(unitPrice);
    const total = gross.minus(discount).plus(tax);
    if (total.lt(0)) {
      throw badRequest(`items[${index}].total cannot be negative`, "invalid_presupuesto_item_total");
    }

    return {
      sku: item.sku ?? null,
      description: item.description,
      quantity,
      unit: item.unit ?? null,
      unitPrice,
      discount,
      tax,
      total,
      metadata: (item.metadata ?? null) as Prisma.InputJsonValue | undefined,
    };
  });

  const subtotal = normalizedItems.reduce(
    (acc, item) => acc.plus(item.quantity.mul(item.unitPrice)),
    new Prisma.Decimal(0)
  );
  const discountTotal = normalizedItems.reduce(
    (acc, item) => acc.plus(item.discount),
    new Prisma.Decimal(0)
  );
  const taxTotal = normalizedItems.reduce((acc, item) => acc.plus(item.tax), new Prisma.Decimal(0));
  const total = normalizedItems.reduce((acc, item) => acc.plus(item.total), new Prisma.Decimal(0));

  return { items: normalizedItems, subtotal, discountTotal, taxTotal, total };
}

async function assertSurgeryBelongsToCompany(prisma: PrismaClient, companyId: string, surgeryId?: string) {
  if (!surgeryId) return;
  const surgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, companyId },
    select: { id: true },
  });
  if (!surgery) {
    throw notFound(`Surgery ${surgeryId} not found in company ${companyId}`, "surgery_not_found");
  }
}

export async function createPresupuesto(input: CreatePresupuestoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  await assertSurgeryBelongsToCompany(prisma, companyId, input.surgeryId);

  const totals = recalculatePresupuestoTotals(input.items);
  const createdById = optionalUserId(input.createdById);

  return prisma.$transaction(async (tx) => {
    const created = await tx.presupuesto.create({
      data: {
        companyId,
        surgeryId: input.surgeryId ?? null,
        versionNumber: 1,
        state: "Borrador",
        title: input.title ?? null,
        currency: input.currency ?? "ARS",
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        validUntil: input.validUntil ?? null,
        createdById,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | undefined,
        items: { create: totals.items },
      },
      select: { ...presupuestoReadSelect, items: { select: { id: true, description: true, quantity: true, total: true } } },
    });

    if (createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: createdById,
        entityType: "Presupuesto",
        entityId: created.id,
        action: "presupuesto_created",
        module: "presupuesto",
        oldValue: null,
        newValue: serializePresupuestoForAudit(created),
      });
    }

    return created;
  });
}

export async function listPresupuestos(input: ListPresupuestosInput) {
  const companyId = requireCompanyId(input.companyId);
  if (input.state !== undefined && !isPresupuestoState(input.state)) {
    throw badRequest(
      `state must be one of: ${(PRESUPUESTO_STATES as readonly string[]).join(", ")}`,
      "invalid_presupuesto_state_filter"
    );
  }

  const where: Prisma.PresupuestoWhereInput = { companyId };
  if (input.surgeryId) where.surgeryId = input.surgeryId;
  if (input.state) where.state = input.state;
  if (input.fromDate || input.toDate) {
    where.createdAt = {
      ...(input.fromDate ? { gte: input.fromDate } : {}),
      ...(input.toDate ? { lte: input.toDate } : {}),
    };
  }

  return input.prisma.presupuesto.findMany({
    select: presupuestoReadSelect,
    where,
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    take: input.take ?? DEFAULT_LIST_TAKE,
    skip: input.skip ?? 0,
  });
}

export async function getPresupuesto(input: GetPresupuestoInput) {
  const companyId = requireCompanyId(input.companyId);
  const presupuesto = await input.prisma.presupuesto.findFirst({
    select: presupuestoReadSelect,
    where: { id: input.presupuestoId, companyId },
  });
  if (!presupuesto) {
    throw notFound(
      `Presupuesto ${input.presupuestoId} not found in company ${companyId}`,
      "presupuesto_not_found"
    );
  }
  return presupuesto;
}

export async function emitPresupuesto(input: EmitPresupuestoInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);

  for (let attempt = 0; attempt < PRESUPUESTO_EMIT_MAX_RETRIES; attempt += 1) {
    try {
      return await input.prisma.$transaction(
        async (tx) => {
          const current = await tx.presupuesto.findFirst({
            where: { id: input.presupuestoId, companyId },
            select: {
              id: true,
              visibleNumber: true,
              companyId: true,
              surgeryId: true,
              parentPresupuestoId: true,
              versionNumber: true,
              state: true,
              title: true,
              currency: true,
              subtotal: true,
              discountTotal: true,
              taxTotal: true,
              total: true,
              validUntil: true,
              issuedAt: true,
              approvedAt: true,
              rejectedAt: true,
              createdById: true,
              updatedById: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          requireCompanyMatch(current, companyId, input.presupuestoId);
          if (current.state !== "Borrador") {
            throw new PresupuestoError(
              "presupuesto_not_borrador",
              `Cannot emit presupuesto in state ${current.state}`,
              409
            );
          }

          const visibleNumber = await getNextVisibleNumber(tx, companyId);
          const result = await tx.presupuesto.update({
            where: { id: input.presupuestoId },
            data: { visibleNumber, state: "Emitido", issuedAt: new Date(), updatedById },
            select: presupuestoReadSelect,
          });

          if (updatedById) {
            await createAuditEvent({
              prisma: tx as unknown as PrismaClient,
              companyId,
              userId: updatedById,
              entityType: "Presupuesto",
              entityId: result.id,
              action: "presupuesto_issued",
              module: "presupuesto",
              oldValue: { state: current.state },
              newValue: { state: result.state, visibleNumber: result.visibleNumber },
            });
          }
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < PRESUPUESTO_EMIT_MAX_RETRIES - 1
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new PresupuestoError(
    "presupuesto_emit_failed",
    "Failed to emit presupuesto after retrying transactional visible number allocation"
  );
}

export const emitirPresupuesto = emitPresupuesto;

export async function updatePresupuestoState(input: UpdatePresupuestoStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);

  if (!isPresupuestoState(input.newState)) {
    throw badRequest(
      `newState must be one of: ${(PRESUPUESTO_STATES as readonly string[]).join(", ")}`,
      "invalid_presupuesto_state"
    );
  }

  const current = await input.prisma.presupuesto.findFirst({
    where: { id: input.presupuestoId, companyId },
    select: { id: true, state: true, companyId: true },
  });
  requireCompanyMatch(current, companyId, input.presupuestoId);

  const currentState = current.state as PresupuestoState;
  const newState = input.newState as PresupuestoState;
  if (currentState === newState) {
    throw new PresupuestoError("presupuesto_state_unchanged", `Presupuesto state is already ${newState}`, 409);
  }
  if (!((PRESUPUESTO_TRANSITIONS[currentState] ?? []) as readonly string[]).includes(newState)) {
    throw new PresupuestoError(
      "invalid_presupuesto_transition",
      `Invalid presupuesto state transition: ${currentState} -> ${newState}`,
      409
    );
  }

  const dateFields: { approvedAt?: Date; rejectedAt?: Date } = {};
  if (newState === "Aprobado") dateFields.approvedAt = new Date();
  if (newState === "Rechazado") dateFields.rejectedAt = new Date();

  return input.prisma.$transaction(async (tx) => {
    const result = await tx.presupuesto.update({
      where: { id: input.presupuestoId },
      data: { state: newState, updatedById, ...dateFields },
      select: presupuestoReadSelect,
    });
    if (updatedById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: updatedById,
        entityType: "Presupuesto",
        entityId: result.id,
        action: "presupuesto_state_changed",
        module: "presupuesto",
        oldValue: { state: currentState },
        newValue: { state: newState },
      });
    }
    return result;
  });
}

export async function createPresupuestoVersion(input: CreatePresupuestoVersionInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);

  return input.prisma.$transaction(async (tx) => {
    const source = await tx.presupuesto.findFirst({
      where: { id: input.sourcePresupuestoId, companyId },
      include: { items: true },
    });
    requireCompanyMatch(source, companyId, input.sourcePresupuestoId);
    if (source.state === "Anulado" || source.state === "Reemplazado") {
      throw new PresupuestoError(
        "presupuesto_version_not_allowed",
        `Cannot create version from presupuesto in state ${source.state}`,
        409
      );
    }

    const rootId = source.parentPresupuestoId ?? source.id;
    const maxVersion = await tx.presupuesto.aggregate({
      where: { companyId, OR: [{ id: rootId }, { parentPresupuestoId: rootId }] },
      _max: { versionNumber: true },
    });
    const nextVersionNumber = (maxVersion._max.versionNumber ?? source.versionNumber) + 1;
    const sourceItems: PresupuestoItemInput[] = source.items.map((item) => ({
      sku: item.sku ?? undefined,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit ?? undefined,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
      metadata: (item.metadata as Record<string, unknown> | null) ?? undefined,
    }));
    const totals = recalculatePresupuestoTotals(input.items ?? sourceItems);

    await tx.presupuesto.update({
      where: { id: source.id },
      data: { state: "Reemplazado", updatedById },
    });

    const created = await tx.presupuesto.create({
      data: {
        companyId,
        surgeryId: source.surgeryId,
        parentPresupuestoId: rootId,
        versionNumber: nextVersionNumber,
        state: "Borrador",
        title: source.title,
        currency: source.currency,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        validUntil: source.validUntil,
        createdById: updatedById,
        metadata: (source.metadata ?? null) as Prisma.InputJsonValue | undefined,
        items: { create: totals.items },
      },
      select: presupuestoReadSelect,
    });

    if (updatedById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: updatedById,
        entityType: "Presupuesto",
        entityId: created.id,
        action: "presupuesto_version_created",
        module: "presupuesto",
        oldValue: { sourcePresupuestoId: source.id, sourceState: source.state },
        newValue: { id: created.id, parentPresupuestoId: rootId, versionNumber: nextVersionNumber },
      });
    }

    return created;
  });
}

export async function deletePresupuesto(input: DeletePresupuestoInput) {
  const companyId = requireCompanyId(input.companyId);
  const current = await input.prisma.presupuesto.findFirst({
    where: { id: input.presupuestoId, companyId },
    select: { id: true, state: true, companyId: true, createdById: true },
  });
  requireCompanyMatch(current, companyId, input.presupuestoId);
  if (current.state !== "Borrador") {
    throw new PresupuestoError(
      "presupuesto_not_deletable",
      `Cannot delete presupuesto in state ${current.state} (only Borrador)`,
      409
    );
  }

  return input.prisma.$transaction(async (tx) => {
    await tx.presupuesto.delete({ where: { id: input.presupuestoId } });
    if (current.createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: current.createdById,
        entityType: "Presupuesto",
        entityId: input.presupuestoId,
        action: "presupuesto_deleted",
        module: "presupuesto",
        oldValue: { id: input.presupuestoId, state: current.state },
        newValue: null,
      });
    }
    return { id: input.presupuestoId, deleted: true };
  });
}

export type PresupuestoRead = PrismaPresupuesto;
