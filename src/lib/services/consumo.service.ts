// OSSUM COR — Consumo service (Fase 1B)
// Every operational query MUST filter by companyId.
// Services receive prisma as dependency injection.
// Catálogos (state / transitions) viven acá para single source of truth.
// schema.prisma queda intocable salvo back-relations ya añadidas en Fase 1B.
//
// Repara conflicto C6: consumo.remitoId es FK OBLIGATORIA (NOT NULL + RESTRICT).

import { InternalNotificationType, Prisma } from "@prisma/client";
import type { PrismaClient, Consumo as PrismaConsumo } from "@prisma/client";

import { createAuditEvent } from "../audit";
import { requireCompanyId } from "../tenant";
import { badRequest, conflict, notFound } from "../api/errors";
import { emitCrossDomainNotification } from "./internal-notifications.service";
import { acceptCajasAccounting } from "./cajas-accounting.service";

// ─── Catálogos (single source of truth; validator re-exporta estos) ─────────
export const CONSUMO_STATES = [
  "Borrador",
  "Pendiente",
  "Validado",
  "Facturado",
  "Anulado",
] as const;
export type ConsumoState = (typeof CONSUMO_STATES)[number];

export const CONSUMO_TRANSITIONS: Record<ConsumoState, ConsumoState[]> = {
  Borrador: ["Pendiente", "Anulado"],
  Pendiente: ["Validado", "Anulado"],
  Validado: ["Facturado", "Anulado"],
  Facturado: [],
  Anulado: [],
};

// TODO: migrate to src/lib/permissions/*
export const CONSUMO_MUTATION_ROLES = ["admin", "coordinador", "logistica", "matrona"] as const;
export const CONSUMO_READ_ROLES = [
  "admin",
  "coordinador",
  "logistica",
  "vendedor",
  "matrona",
  "instrumentador",
] as const;

const CONSUMO_EMIT_MAX_RETRIES = 3;
const DEFAULT_LIST_TAKE = 50;

// ─── Errores ─────────────────────────────────────────────────────────────────
export class ConsumoError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "ConsumoError";
    this.code = code;
    this.status = status;
  }
}

function isConsumoState(value: string): value is ConsumoState {
  return (CONSUMO_STATES as readonly string[]).includes(value);
}

function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializeConsumoForAudit(consumo: {
  id: string;
  visibleNumber: number | null;
  companyId: string;
  surgeryId: string | null;
  remitoId: string;
  state: string;
  validatedAt: Date | null;
  facturedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: consumo.id,
    visibleNumber: consumo.visibleNumber,
    companyId: consumo.companyId,
    surgeryId: consumo.surgeryId,
    remitoId: consumo.remitoId,
    state: consumo.state,
    validatedAt: serializeDate(consumo.validatedAt),
    facturedAt: serializeDate(consumo.facturedAt),
    createdById: consumo.createdById,
    updatedById: consumo.updatedById,
    createdAt: consumo.createdAt.toISOString(),
    updatedAt: consumo.updatedAt.toISOString(),
  };
}

// ─── Select para read/list ──────────────────────────────────────────────────
const consumoReadSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  surgeryId: true,
  remitoId: true,
  state: true,
  validatedAt: true,
  facturedAt: true,
  createdById: true,
  updatedById: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      remitoItemId: true,
      sku: true,
      description: true,
      requestedQuantity: true,
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

function requireCompanyMatch(
  consumo: { companyId: string } | null,
  companyId: string,
  consumoId: string
): asserts consumo {
  if (!consumo || consumo.companyId !== companyId) {
    throw notFound(
      `Consumo ${consumoId} not found in company ${companyId}`,
      "consumo_not_found"
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

// ─── Asignación de visibleNumber (atomic via row-level lock in tx) ──────────
async function getNextVisibleNumber(
  tx: Prisma.TransactionClient,
  companyId: string
): Promise<number> {
  await tx.$executeRaw`LOCK TABLE "consumo" IN SHARE ROW EXCLUSIVE MODE`;

  const rows = await tx.$queryRaw<Array<{ next: bigint | number | null }>>`
    SELECT COALESCE(MAX("visibleNumber"), 0) + 1 AS "next"
    FROM "consumo"
    WHERE "companyId" = ${companyId}
  `;

  const raw = rows[0]?.next;
  const next = raw == null ? 1 : Number(raw);
  if (!Number.isFinite(next) || next <= 0) {
    throw new ConsumoError(
      "consumo_visible_number_failed",
      "Failed to allocate next visible number"
    );
  }
  return next;
}

// ─── Tipos de input ──────────────────────────────────────────────────────────
export interface ConsumoItemCreatePayload {
  remitoItemId?: string;
  sku?: string;
  description: string;
  requestedQuantity: number | string;
  consumedQuantity?: number | string;
  unit?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: Date | string;
  metadata?: Record<string, unknown>;
}

export type AuthorizedConsumptionStatus = "OK" | "under" | "over" | "unauthorized" | "pending_auth";

export type AuthorizedMaterial = {
  key: string;
  sku: string | null;
  description: string;
  authorizedQuantity: number;
  unit?: string | null;
  sourceEntryIds: string[];
};

export type ConsumedMaterial = {
  key: string;
  sku: string | null;
  description: string;
  consumedQuantity: number;
  unit?: string | null;
  consumoItemIds: string[];
};

export type AuthorizedConsumptionDifference = {
  status: AuthorizedConsumptionStatus;
  key: string;
  sku: string | null;
  description: string;
  authorizedQuantity: number;
  consumedQuantity: number;
  deltaQuantity: number;
  unit?: string | null;
  sourceEntryIds: string[];
  consumoItemIds: string[];
};

export type AuthorizedConsumptionControl = {
  companyId: string;
  surgeryId: string;
  generatedAt: string;
  status: AuthorizedConsumptionStatus;
  authorizedSource: "seguimiento.authorization_evidence";
  summary: {
    authorizedItemsCount: number;
    consumedItemsCount: number;
    differencesCount: number;
    overCount: number;
    underCount: number;
    unauthorizedCount: number;
    pendingAuth: boolean;
  };
  authorized: AuthorizedMaterial[];
  consumed: ConsumedMaterial[];
  differences: AuthorizedConsumptionDifference[];
};

export interface GetAuthorizedConsumptionControlInput {
  companyId: string;
  surgeryId: string;
  prisma: PrismaClient;
}

export interface CreateConsumoInput {
  companyId: string;
  surgeryId?: string;
  remitoId: string;
  items: ConsumoItemCreatePayload[];
  createdById?: string;
  metadata?: Record<string, unknown> | null;
  prisma: PrismaClient;
}

export interface ListConsumosInput {
  companyId: string;
  surgeryId?: string;
  state?: string;
  remitoId?: string;
  fromDate?: Date;
  toDate?: Date;
  prisma: PrismaClient;
  take?: number;
  skip?: number;
}

export interface GetConsumoInput {
  companyId: string;
  consumoId: string;
  prisma: PrismaClient;
}

export interface ValidateConsumptionInput {
  companyId: string;
  consumoId: string;
  updatedById?: string;
  cajasAccounting?: unknown;
  prisma: PrismaClient;
}

export interface MarkConsumoAsFacturadoInput {
  companyId: string;
  consumoId: string;
  updatedById?: string;
  prisma: PrismaClient;
}

export interface UpdateConsumoStateInput {
  companyId: string;
  consumoId: string;
  newState: string;
  updatedById?: string;
  prisma: PrismaClient;
}

export interface EmitirConsumoInput {
  companyId: string;
  consumoId: string;
  updatedById?: string;
  prisma: PrismaClient;
}

export interface DeleteConsumoInput {
  companyId: string;
  consumoId: string;
  prisma: PrismaClient;
}

function normalizeMaterialText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseMaterialQuantity(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const match = value.replace(/,/g, ".").match(/\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function materialKey(sku: string | null | undefined, description: string): string {
  const normalizedSku = (sku ?? "").trim().toLocaleLowerCase();
  if (normalizedSku) return `sku:${normalizedSku}`;
  return `desc:${description.trim().toLocaleLowerCase().replace(/\s+/g, " ")}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return undefined;
}

function extractMaterialArrays(record: Record<string, unknown>): unknown[] {
  const extracted = asRecord(record.extracted);
  const candidates = [
    record.material_autorizado,
    record.materialAutorizado,
    record.authorizedMaterials,
    record.materials,
    extracted?.material_autorizado,
    extracted?.materialAutorizado,
    extracted?.authorizedMaterials,
    extracted?.materials,
  ];
  return candidates.flatMap((candidate) => (Array.isArray(candidate) ? candidate : []));
}

function upsertAuthorizedMaterial(target: Map<string, AuthorizedMaterial>, item: unknown, sourceEntryId: string) {
  const record = asRecord(item);
  if (!record) return;
  const description = normalizeMaterialText(record.descripcion ?? record.description ?? record.nombre ?? record.name);
  if (!description) return;
  const sku = normalizeMaterialText(record.codigo ?? record.code ?? record.sku) || null;
  const unit = normalizeMaterialText(record.unidad ?? record.unit) || null;
  const authorizedQuantity = parseMaterialQuantity(record.cantidad ?? record.quantity ?? record.authorizedQuantity) || 1;
  const key = materialKey(sku, description);
  const current = target.get(key);
  if (current) {
    current.authorizedQuantity += authorizedQuantity;
    if (!current.sourceEntryIds.includes(sourceEntryId)) current.sourceEntryIds.push(sourceEntryId);
    return;
  }
  target.set(key, { key, sku, description, authorizedQuantity, unit, sourceEntryIds: [sourceEntryId] });
}

function upsertConsumedMaterial(target: Map<string, ConsumedMaterial>, item: { id: string; sku: string | null; description: string; consumedQuantity: unknown; unit: string | null }) {
  const key = materialKey(item.sku, item.description);
  const consumedQuantity = Number(item.consumedQuantity ?? 0);
  const current = target.get(key);
  if (current) {
    current.consumedQuantity += Number.isFinite(consumedQuantity) ? consumedQuantity : 0;
    current.consumoItemIds.push(item.id);
    return;
  }
  target.set(key, {
    key,
    sku: item.sku,
    description: item.description,
    consumedQuantity: Number.isFinite(consumedQuantity) ? consumedQuantity : 0,
    unit: item.unit,
    consumoItemIds: [item.id],
  });
}

export function compareConsumedVsAuthorized(params: {
  companyId: string;
  surgeryId: string;
  authorized: AuthorizedMaterial[];
  consumed: ConsumedMaterial[];
}): AuthorizedConsumptionControl {
  const authorizedByKey = new Map(params.authorized.map((item) => [item.key, item]));
  const consumedByKey = new Map(params.consumed.map((item) => [item.key, item]));
  const differences: AuthorizedConsumptionDifference[] = [];
  const keys = new Set([...authorizedByKey.keys(), ...consumedByKey.keys()]);

  if (authorizedByKey.size === 0) {
    for (const consumed of consumedByKey.values()) {
      differences.push({
        status: "pending_auth",
        key: consumed.key,
        sku: consumed.sku,
        description: consumed.description,
        authorizedQuantity: 0,
        consumedQuantity: consumed.consumedQuantity,
        deltaQuantity: consumed.consumedQuantity,
        unit: consumed.unit,
        sourceEntryIds: [],
        consumoItemIds: consumed.consumoItemIds,
      });
    }
  } else {
    for (const key of keys) {
      const authorized = authorizedByKey.get(key);
      const consumed = consumedByKey.get(key);
      const authorizedQuantity = authorized?.authorizedQuantity ?? 0;
      const consumedQuantity = consumed?.consumedQuantity ?? 0;
      const deltaQuantity = consumedQuantity - authorizedQuantity;
      const status: AuthorizedConsumptionStatus = !authorized
        ? "unauthorized"
        : deltaQuantity > 0
          ? "over"
          : deltaQuantity < 0
            ? "under"
            : "OK";
      if (status !== "OK") {
        differences.push({
          status,
          key,
          sku: consumed?.sku ?? authorized?.sku ?? null,
          description: consumed?.description ?? authorized?.description ?? key,
          authorizedQuantity,
          consumedQuantity,
          deltaQuantity,
          unit: consumed?.unit ?? authorized?.unit,
          sourceEntryIds: authorized?.sourceEntryIds ?? [],
          consumoItemIds: consumed?.consumoItemIds ?? [],
        });
      }
    }
  }

  const status: AuthorizedConsumptionStatus = authorizedByKey.size === 0
    ? "pending_auth"
    : differences.some((difference) => difference.status === "unauthorized")
      ? "unauthorized"
      : differences.some((difference) => difference.status === "over")
        ? "over"
        : differences.some((difference) => difference.status === "under")
          ? "under"
          : "OK";

  return {
    companyId: params.companyId,
    surgeryId: params.surgeryId,
    generatedAt: new Date().toISOString(),
    status,
    authorizedSource: "seguimiento.authorization_evidence",
    summary: {
      authorizedItemsCount: params.authorized.length,
      consumedItemsCount: params.consumed.length,
      differencesCount: differences.length,
      overCount: differences.filter((difference) => difference.status === "over").length,
      underCount: differences.filter((difference) => difference.status === "under").length,
      unauthorizedCount: differences.filter((difference) => difference.status === "unauthorized").length,
      pendingAuth: authorizedByKey.size === 0,
    },
    authorized: params.authorized,
    consumed: params.consumed,
    differences,
  };
}

// ─── createConsumo ────────────────────────────────────────────────────────────
export async function createConsumo(input: CreateConsumoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  if (!input.remitoId || input.remitoId.trim().length === 0) {
    throw badRequest("remitoId is required", "consumo_remito_required");
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw badRequest("items must be a non-empty array", "consumo_empty_items");
  }

  const normalizedItems = input.items.map((item, index) => {
    const requestedNumber = Number(item.requestedQuantity);
    if (!Number.isFinite(requestedNumber) || requestedNumber <= 0) {
      throw badRequest(
        `items[${index}].requestedQuantity must be a positive number`,
        "invalid_consumo_item_quantity"
      );
    }
    if (typeof item.description !== "string" || item.description.trim().length === 0) {
      throw badRequest(`items[${index}].description is required`, "invalid_consumo_item_description");
    }
    const consumedRaw = item.consumedQuantity ?? 0;
    const consumedNumber = Number(consumedRaw);
    if (!Number.isFinite(consumedNumber) || consumedNumber < 0) {
      throw badRequest(
        `items[${index}].consumedQuantity must be a non-negative number`,
        "invalid_consumo_item_consumed_quantity"
      );
    }
      return {
        remitoItemId: item.remitoItemId ?? null,
        sku: item.sku ?? null,
        description: item.description,
        requestedQuantity: toDecimal(item.requestedQuantity),
        consumedQuantity: toDecimal(consumedRaw),
        unit: item.unit ?? null,
        lotNumber: item.lotNumber?.trim() || null,
        serialNumber: item.serialNumber?.trim() || null,
        expirationDate: normalizeTraceExpirationDate(item.expirationDate, `items[${index}]`),
        metadata: (item.metadata ?? null) as Prisma.InputJsonValue | undefined,
      };
  });

  // Eligibilidad canónica: el remito debe existir dentro del tenant, pertenecer a
  // la cirugía solicitada (si se especifica) y estar efectivamente entregado.
  // Las verificaciones ocurren antes de abrir la transacción de creación.
  const remito = await prisma.remito.findFirst({
    where: { id: input.remitoId, companyId },
    select: { id: true, companyId: true, surgeryId: true, state: true },
  });
  if (!remito) {
    throw notFound(
      `Remito ${input.remitoId} not found in company ${companyId}`,
      "remito_not_found"
    );
  }

  if (input.surgeryId && remito.surgeryId !== input.surgeryId) {
    throw conflict(
      "Remito does not belong to the specified surgery",
      "consumo_remito_surgery_mismatch"
    );
  }

  if (remito.state !== "Entregado") {
    throw conflict(
      "Consumo can only be created from a delivered remito",
      "consumo_remito_not_delivered"
    );
  }

  const createdById = requireCreatedById(input.createdById);
  const surgeryId = input.surgeryId ?? remito.surgeryId ?? null;

  const consumo = await prisma.$transaction(async (tx) => {
    const created = await tx.consumo.create({
      data: {
        companyId,
        surgeryId,
        remitoId: input.remitoId,
        state: "Borrador",
        createdById,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | undefined,
        items: {
          create: normalizedItems.map((item) => ({
            remitoItemId: item.remitoItemId,
            sku: item.sku,
            description: item.description,
            requestedQuantity: item.requestedQuantity,
            consumedQuantity: item.consumedQuantity,
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
        state: true,
        validatedAt: true,
        facturedAt: true,
        createdById: true,
        updatedById: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        items: { select: { id: true, description: true, requestedQuantity: true, consumedQuantity: true } },
      },
    });

    if (createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: createdById,
        entityType: "Consumo",
        entityId: created.id,
        action: "consumo.created",
        module: "consumo",
        oldValue: null,
        newValue: serializeConsumoForAudit(created),
      });
    }

    return created;
  });

  return consumo;
}

// ─── listConsumos ──────────────────────────────────────────────────────────────
export async function listConsumos(input: ListConsumosInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  if (input.state !== undefined && !isConsumoState(input.state)) {
    throw badRequest(
      `state must be one of: ${(CONSUMO_STATES as readonly string[]).join(", ")}`,
      "invalid_consumo_state_filter"
    );
  }

  const where: Prisma.ConsumoWhereInput = { companyId };
  if (input.surgeryId) where.surgeryId = input.surgeryId;
  if (input.state) where.state = input.state;
  if (input.remitoId) where.remitoId = input.remitoId;

  if (input.fromDate || input.toDate) {
    where.createdAt = {
      ...(input.fromDate ? { gte: input.fromDate } : {}),
      ...(input.toDate ? { lte: input.toDate } : {}),
    };
  }

  const take = input.take ?? DEFAULT_LIST_TAKE;
  const skip = input.skip ?? 0;

  return prisma.consumo.findMany({
    select: consumoReadSelect,
    where,
    orderBy: [{ createdAt: "desc" }],
    take,
    skip,
  });
}

// ─── getConsumo ──────────────────────────────────────────────────────────────
export async function getConsumo(input: GetConsumoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  const consumo = await prisma.consumo.findFirst({
    select: consumoReadSelect,
    where: { id: input.consumoId, companyId },
  });

  if (!consumo) {
    throw notFound(`Consumo ${input.consumoId} not found in company ${companyId}`, "consumo_not_found");
  }

  return consumo;
}

// ─── getAuthorizedConsumptionControl ────────────────────────────────────────
// Compara consumo real contra materiales autorizados cargados en Seguimientos.
// Fuente canónica V0: SeguimientoEntry.entryType = authorization_evidence con
// evidenceRef.extracted.material_autorizado (o aliases legacy compatibles).
export async function getAuthorizedConsumptionControl(input: GetAuthorizedConsumptionControlInput): Promise<AuthorizedConsumptionControl> {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  const surgery = await prisma.surgery.findFirst({
    where: { id: input.surgeryId, companyId },
    select: { id: true },
  });
  if (!surgery) {
    throw notFound(`Surgery ${input.surgeryId} not found in company ${companyId}`, "surgery_not_found");
  }

  const [seguimientoEntries, consumos] = await Promise.all([
    prisma.seguimientoEntry.findMany({
      where: { companyId, surgeryId: input.surgeryId, entryType: "authorization_evidence" },
      select: { id: true, evidenceRef: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.consumo.findMany({
      where: { companyId, surgeryId: input.surgeryId, state: { not: "Anulado" } },
      select: {
        id: true,
        items: {
          select: { id: true, sku: true, description: true, consumedQuantity: true, unit: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const authorized = new Map<string, AuthorizedMaterial>();
  for (const entry of seguimientoEntries) {
    const evidenceRef = asRecord(entry.evidenceRef);
    if (!evidenceRef) continue;
    for (const item of extractMaterialArrays(evidenceRef)) {
      upsertAuthorizedMaterial(authorized, item, entry.id);
    }
  }

  const consumed = new Map<string, ConsumedMaterial>();
  for (const consumo of consumos) {
    for (const item of consumo.items) {
      upsertConsumedMaterial(consumed, item);
    }
  }

  return compareConsumedVsAuthorized({
    companyId,
    surgeryId: input.surgeryId,
    authorized: [...authorized.values()],
    consumed: [...consumed.values()],
  });
}

// ─── validateConsumption (regla dominio: validación humana) ──────────────────
export async function validateConsumption(input: ValidateConsumptionInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  const current = await prisma.consumo.findFirst({
    where: { id: input.consumoId, companyId },
    select: { id: true, state: true, companyId: true },
  });

  requireCompanyMatch(current, companyId, input.consumoId);

  if (current.state !== "Pendiente") {
    throw new ConsumoError(
      "consumo_not_pendiente",
      `Cannot validate consumo in state ${current.state} (only Pendiente)`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.consumo.update({
      where: { id: input.consumoId },
      data: {
        state: "Validado",
        validatedAt: new Date(),
        updatedById,
      },
      select: {
        id: true,
        visibleNumber: true,
        companyId: true,
        surgeryId: true,
        remitoId: true,
        state: true,
        validatedAt: true,
        facturedAt: true,
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
        entityType: "Consumo",
        entityId: result.id,
        action: "consumo.validated",
        module: "consumo",
        oldValue: { state: current.state },
        newValue: { state: result.state, validatedAt: serializeDate(result.validatedAt) },
      });
    }

    try {
      await emitCrossDomainNotification(tx, {
        companyId,
        actorUserId: updatedById ?? "system",
        type: InternalNotificationType.consumo_validated,
        domain: "CONSUMOS",
        severity: "SUCCESS",
        surgeryId: result.surgeryId,
        sourceEntityId: result.id,
        linkHref: result.surgeryId ? `/cirugias/${encodeURIComponent(result.surgeryId)}` : null,
        title: `Consumo #${result.visibleNumber ?? result.id.slice(-6)} validado`,
        body: "El consumo quirúrgico ha sido validado para facturación.",
        metadata: { consumoId: result.id, remitoId: result.remitoId, visibleNumber: result.visibleNumber },
      });
    } catch (err) {
      console.error("[consumo.service] emitCrossDomainNotification failed:", err);
    }

    const linkedDispatch = await tx.cajasDispatch?.findFirst?.({
      where: { remitoId: result.remitoId, companyId },
      select: { id: true },
    });

    if (linkedDispatch && !input.cajasAccounting) {
      throw badRequest(
        "El remito asociado contiene un despacho de Cajas que requiere imputación de consumo",
        "cajas_accounting_required",
      );
    }

    const cajasAccounting = input.cajasAccounting
      ? await acceptCajasAccounting(tx, companyId, result.id, "consumption", input.cajasAccounting, updatedById!)
      : undefined;

    return { ...result, cajasAccounting };
  });
}

// ─── markConsumoAsFacturado (método disponible — Fase 1D lo invocará) ──────────
// NO invocado desde facturación en Fase 1B. Solo el método existe.
export async function markConsumoAsFacturado(input: MarkConsumoAsFacturadoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  const current = await prisma.consumo.findFirst({
    where: { id: input.consumoId, companyId },
    select: { id: true, state: true, companyId: true },
  });

  requireCompanyMatch(current, companyId, input.consumoId);

  if (current.state !== "Validado") {
    throw new ConsumoError(
      "consumo_not_validado",
      `Cannot mark consumo as facturado in state ${current.state} (only Validado)`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.consumo.update({
      where: { id: input.consumoId },
      data: {
        state: "Facturado",
        facturedAt: new Date(),
        updatedById,
      },
      select: {
        id: true,
        visibleNumber: true,
        companyId: true,
        surgeryId: true,
        remitoId: true,
        state: true,
        validatedAt: true,
        facturedAt: true,
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
        entityType: "Consumo",
        entityId: result.id,
        action: "consumo.factured",
        module: "consumo",
        oldValue: { state: current.state },
        newValue: { state: result.state, facturedAt: serializeDate(result.facturedAt) },
      });
    }

    return result;
  });
}

// ─── updateConsumoState (transición genérica) ──────────────────────────────────
export async function updateConsumoState(input: UpdateConsumoStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  if (!isConsumoState(input.newState)) {
    throw badRequest(
      `newState must be one of: ${(CONSUMO_STATES as readonly string[]).join(", ")}`,
      "invalid_consumo_state"
    );
  }

  const current = await prisma.consumo.findFirst({
    where: { id: input.consumoId, companyId },
    select: { id: true, state: true, companyId: true },
  });

  requireCompanyMatch(current, companyId, input.consumoId);

  const currentState = current.state as ConsumoState;
  const newState = input.newState as ConsumoState;

  if (currentState === newState) {
    throw new ConsumoError("consumo_state_unchanged", `Consumo state is already ${newState}`, 409);
  }

  const allowed = CONSUMO_TRANSITIONS[currentState] ?? [];
  if (!(allowed as readonly string[]).includes(newState)) {
    throw new ConsumoError(
      "invalid_consumo_transition",
      `Invalid consumo state transition: ${currentState} -> ${newState}`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.consumo.update({
      where: { id: input.consumoId },
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
        state: true,
        validatedAt: true,
        facturedAt: true,
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
        entityType: "Consumo",
        entityId: result.id,
        action: "consumo.state_changed",
        module: "consumo",
        oldValue: { state: currentState },
        newValue: { state: newState },
      });
    }

    return result;
  });
}

// ─── emitirConsumo (Borrador → Pendiente + auto visibleNumber) ──────────────
export async function emitirConsumo(input: EmitirConsumoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = requireCreatedById(input.updatedById);

  for (let attempt = 0; attempt < CONSUMO_EMIT_MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const current = await tx.consumo.findFirst({
            where: { id: input.consumoId, companyId },
            select: {
              id: true,
              visibleNumber: true,
              companyId: true,
              surgeryId: true,
              remitoId: true,
              state: true,
              validatedAt: true,
              facturedAt: true,
              createdById: true,
              updatedById: true,
              metadata: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          requireCompanyMatch(current, companyId, input.consumoId);

          if (current.state !== "Borrador") {
            throw new ConsumoError(
              "consumo_not_borrador",
              `Cannot emit consumo in state ${current.state}`,
              409
            );
          }

          const visibleNumber = await getNextVisibleNumber(tx, companyId);

          const result = await tx.consumo.update({
            where: { id: input.consumoId },
            data: {
              visibleNumber,
              state: "Pendiente",
              updatedById,
            },
            select: {
              id: true,
              visibleNumber: true,
              companyId: true,
              surgeryId: true,
              remitoId: true,
              state: true,
              validatedAt: true,
              facturedAt: true,
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
              entityType: "Consumo",
              entityId: result.id,
              action: "consumo.emitted",
              module: "consumo",
              oldValue: { state: current.state },
              newValue: { state: result.state, visibleNumber: result.visibleNumber },
            });
          }

          try {
            await emitCrossDomainNotification(tx, {
              companyId,
              actorUserId: updatedById ?? "system",
              type: InternalNotificationType.consumo_pending_validation,
              domain: "CONSUMOS",
              severity: "INFO",
              surgeryId: result.surgeryId,
              sourceEntityId: result.id,
              linkHref: result.surgeryId ? `/cirugias/${encodeURIComponent(result.surgeryId)}` : null,
              title: `Consumo #${result.visibleNumber ?? result.id.slice(-6)} pendiente de validación`,
              body: "Consumo emitido. Requiere validación de materiales.",
              metadata: { consumoId: result.id, remitoId: result.remitoId, visibleNumber: result.visibleNumber },
            });
          } catch (err) {
            console.error("[consumo.service] emitCrossDomainNotification failed:", err);
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
        attempt < CONSUMO_EMIT_MAX_RETRIES - 1
      ) {
        continue;
      }
      if (error instanceof ConsumoError) {
        throw error;
      }
      throw error;
    }
  }

  throw new ConsumoError(
    "consumo_emit_failed",
    "Failed to emit consumo after retrying transactional visible number allocation"
  );
}

// ─── deleteConsumo (solo Borrador) ───────────────────────────────────────────
export async function deleteConsumo(input: DeleteConsumoInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;

  const current = await prisma.consumo.findFirst({
    where: { id: input.consumoId, companyId },
    select: { id: true, state: true, companyId: true, createdById: true },
  });

  requireCompanyMatch(current, companyId, input.consumoId);

  if (current.state !== "Borrador") {
    throw new ConsumoError(
      "consumo_not_deletable",
      `Cannot delete consumo in state ${current.state} (only Borrador)`,
      409
    );
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.consumo.findUnique({
      where: { id: input.consumoId },
      select: { id: true, visibleNumber: true },
    });
    if (!existing) {
      throw notFound(`Consumo ${input.consumoId} not found`, "consumo_not_found");
    }

    await tx.consumo.delete({ where: { id: input.consumoId } });

    if (current.createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: current.createdById,
        entityType: "Consumo",
        entityId: input.consumoId,
        action: "consumo.deleted",
        module: "consumo",
        oldValue: { id: input.consumoId, state: current.state },
        newValue: null,
      });
    }

    return { id: input.consumoId, deleted: true };
  });
}

// Re-export para consumers que quieran el tipo plano (no Prisma.Decimal) del model.
export type ConsumoRead = PrismaConsumo;
