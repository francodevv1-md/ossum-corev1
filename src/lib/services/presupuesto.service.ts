// OSSUM COR — Presupuesto service (Fase 1C)
// Every operational query MUST filter by companyId.
// Services receive prisma as dependency injection.
// Catálogos (state / transitions) viven acá para single source of truth.

import { Prisma } from "@prisma/client";
import type { PrismaClient, Presupuesto as PrismaPresupuesto } from "@prisma/client";

import { createAuditEvent } from "../audit";
import { requireCompanyId } from "../tenant";
import { badRequest, notFound } from "../api/errors";
import {
  calculateLineCommercial,
  calculateCommercialDocumentTotals,
  DEFAULT_VAT_RATE,
  DEFAULT_VAT_TREATMENT,
  VatTreatment,
} from "../commercial/vat";

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

export type PresupuestoAction =
  | "edit"
  | "delete"
  | "emit"
  | "approve"
  | "reject"
  | "expire"
  | "annul"
  | "revise";

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

const quantizeMoney = (value: Prisma.Decimal) => value.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

function generalDiscount(value: unknown): Prisma.Decimal {
  let rate: Prisma.Decimal;
  try { rate = new Prisma.Decimal(value == null ? 0 : String(value)); }
  catch { throw badRequest("General discount must be between 0 and 100", "invalid_general_discount"); }
  if (!rate.isFinite() || rate.lt(0) || rate.gt(100)) {
    throw badRequest("General discount must be between 0 and 100", "invalid_general_discount");
  }
  return rate;
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// These values have validated top-level contracts; arbitrary metadata cannot replace them.
function customMetadata(value: unknown): Record<string, unknown> {
  const { branchId, clientContactId, payerContactId, generalDiscountRate, ...rest } = metadataObject(value);
  return rest;
}

function commercialReferences(input: { branchId?: string | null; clientContactId?: string | null; payerContactId?: string | null; metadata?: Record<string, unknown> | null }, existing: Record<string, unknown> = {}) {
  return Object.fromEntries((["branchId", "clientContactId", "payerContactId"] as const).map((key) => [
    key, input[key] !== undefined ? input[key] : input.metadata?.[key] !== undefined ? input.metadata[key] : existing[key] ?? null,
  ]));
}

async function assertCommercialReferences(prisma: PrismaClient | Prisma.TransactionClient, companyId: string, values: Record<string, unknown>) {
  for (const key of ["branchId", "clientContactId", "payerContactId"] as const) {
    const id = values[key];
    if (id == null) continue;
    if (typeof id !== "string" || !id.trim()) throw badRequest(`Invalid ${key}`, "invalid_presupuesto_reference");
    const exists = key === "branchId"
      ? await prisma.branch.findFirst({ where: { id, companyId }, select: { id: true } })
      : await prisma.contactCompanyLink.findFirst({ where: { contactId: id, companyId, isActive: true }, select: { contactId: true } });
    if (!exists) throw badRequest(`${key} does not belong to company`, "invalid_presupuesto_reference");
  }
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
      vatTreatment: true,
      vatRate: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PresupuestoSelect;

export type PresupuestoDatabaseRow = Prisma.PresupuestoGetPayload<{ select: typeof presupuestoReadSelect }>;

export function derivePresupuestoSlot(state: string): "DRAFT" | "CURRENT" | "HISTORY" {
  if (state === "Borrador") return "DRAFT";
  if (state === "Reemplazado") return "HISTORY";
  return "CURRENT";
}

export function derivePresupuestoActions(state: string): PresupuestoAction[] {
  switch (state) {
    case "Borrador":
      return ["edit", "delete", "emit", "annul"];
    case "Emitido":
      return ["approve", "reject", "expire", "annul", "revise"];
    case "Aprobado":
      return ["annul", "revise"];
    case "Rechazado":
    case "Vencido":
      return ["revise"];
    default:
      return [];
  }
}

export function getPresupuestoWriteRevision(metadata: unknown, fallbackVersion = 1): number {
  if (metadata && typeof metadata === "object") {
    const meta = metadata as Record<string, unknown>;
    if (typeof meta.writeRevision === "number" && Number.isFinite(meta.writeRevision)) {
      return meta.writeRevision;
    }
  }
  return fallbackVersion;
}

async function lockPresupuestoRow(
  tx: Prisma.TransactionClient,
  companyId: string,
  presupuestoId: string
) {
  if (typeof (tx as any).$queryRaw === "function") {
    await tx.$queryRaw`SELECT "id" FROM "presupuesto" WHERE "id" = ${presupuestoId} AND "companyId" = ${companyId} FOR UPDATE`;
  }
}

function assertExpectedRevision(
  currentWriteRevision: number,
  expectedRevision: number | string | undefined | null
) {
  if (expectedRevision === undefined || expectedRevision === null) {
    throw new PresupuestoError(
      "presupuesto_revision_required",
      "expectedRevision is required for this protected mutation",
      400
    );
  }
  const expectedNum = typeof expectedRevision === "string" ? Number(expectedRevision) : expectedRevision;
  if (!Number.isFinite(expectedNum) || expectedNum <= 0) {
    throw new PresupuestoError(
      "invalid_expected_revision",
      `Invalid expectedRevision value: ${String(expectedRevision)}`,
      400
    );
  }
  if (expectedNum !== currentWriteRevision) {
    throw new PresupuestoError(
      "presupuesto_revision_conflict",
      `Presupuesto concurrency conflict: expected revision ${expectedRevision}, found ${currentWriteRevision}`,
      409
    );
  }
}

export function serializePresupuestoRow(row: PresupuestoDatabaseRow) {
  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  const slot = derivePresupuestoSlot(row.state);
  const actions = derivePresupuestoActions(row.state);
  const familyId = row.parentPresupuestoId ?? row.id;
  const writeRevision = getPresupuestoWriteRevision(row.metadata, row.versionNumber);

  const items = (row.items ?? []).map((item, idx) => {
    const itemQty = toDecimal(item.quantity);
    const itemPrice = toDecimal(item.unitPrice);
    const itemDisc = toDecimal(item.discount);
    const itemTax = toDecimal(item.tax);
    const itemTotal = toDecimal(item.total);
    const lineBruto = itemQty.mul(itemPrice);
    const inputs = metadataObject(metadataObject(item.metadata).budgetLineInputs);
    const lineDiscount = inputs.discount !== undefined ? toDecimal(String(inputs.discount)) : itemDisc;
    const discountRate = typeof inputs.discountRate === "string" ? inputs.discountRate : lineBruto.gt(0)
      ? quantizeMoney(lineDiscount.mul(100).div(lineBruto)).toString()
      : "0";

    return {
      id: item.id,
      position: idx + 1,
      sku: item.sku ?? null,
      description: item.description,
      quantity: itemQty.toString(),
      unit: item.unit ?? null,
      unitPrice: itemPrice.toString(),
      discountRate,
      discount: itemDisc.toString(),
      taxRate: toDecimal(item.vatRate).toString(),
      tax: itemTax.toString(),
      total: itemTotal.toString(),
      vatTreatment: item.vatTreatment,
      vatRate: toDecimal(item.vatRate).toString(),
      metadata: item.metadata ?? null,
    };
  });

  return {
    id: row.id,
    visibleNumber: row.visibleNumber ?? null,
    companyId: row.companyId,
    familyId,
    surgeryId: row.surgeryId ?? null,
    branchId: (typeof meta.branchId === "string" ? meta.branchId : null),
    clientContactId: (typeof meta.clientContactId === "string" ? meta.clientContactId : null),
    payerContactId: (typeof meta.payerContactId === "string" ? meta.payerContactId : null),
    parentPresupuestoId: row.parentPresupuestoId ?? null,
    sourcePresupuestoId: row.parentPresupuestoId ?? null,
    versionNumber: row.versionNumber,
    slot,
    revision: writeRevision,
    state: row.state as PresupuestoState,
    title: row.title ?? null,
    currency: row.currency,
    documentDate: typeof meta.documentDate === "string"
      ? meta.documentDate
      : serializeDate(row.issuedAt ?? row.createdAt),
    paymentTerms: (typeof meta.paymentTerms === "string" ? meta.paymentTerms : null),
    priceListCode: (typeof meta.priceListCode === "string" ? meta.priceListCode : null),
    legend: (typeof meta.legend === "string" ? meta.legend : null),
    notes: (typeof meta.notes === "string" ? meta.notes : null),
    generalDiscountRate: (typeof meta.generalDiscountRate === "number" || typeof meta.generalDiscountRate === "string"
      ? String(meta.generalDiscountRate)
      : "0"),
    commercialSnapshot: meta.commercialSnapshot ?? meta.commercial ?? null,
    commercial: meta.commercial ?? null,
    client: typeof meta.client === "string" ? meta.client : null,
    financiador: typeof meta.financiador === "string" ? meta.financiador : null,
    patient: typeof meta.patient === "string" ? meta.patient : null,
    institution: typeof meta.institution === "string" ? meta.institution : null,
    vendedor: typeof meta.vendedor === "string" ? meta.vendedor : null,
    subtotal: toDecimal(row.subtotal).toString(),
    discountTotal: toDecimal(row.discountTotal).toString(),
    taxTotal: toDecimal(row.taxTotal).toString(),
    total: toDecimal(row.total).toString(),
    validUntil: serializeDate(row.validUntil),
    issuedAt: serializeDate(row.issuedAt),
    approvedAt: serializeDate(row.approvedAt),
    rejectedAt: serializeDate(row.rejectedAt),
    createdById: row.createdById ?? null,
    updatedById: row.updatedById ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
    actions,
  };
}

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
  sku?: string | null;
  description: string;
  quantity: number | string | Prisma.Decimal;
  unit?: string | null;
  unitPrice?: number | string | Prisma.Decimal | null;
  discount?: number | string | Prisma.Decimal | null;
  discountRate?: number | string | Prisma.Decimal | null;
  discountPercent?: number | string | Prisma.Decimal | null;
  tax?: number | string | Prisma.Decimal | null;
  taxRate?: number | string | Prisma.Decimal | null;
  vatTreatment?: string | VatTreatment;
  vatRate?: number | string | Prisma.Decimal | null;
  metadata?: Record<string, unknown> | null;
}

export interface NormalizedPresupuestoItem extends Required<Pick<PresupuestoItemInput, "description">> {
  sku: string | null;
  quantity: Prisma.Decimal;
  unit: string | null;
  unitPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  vatTreatment: string;
  vatRate: Prisma.Decimal;
  metadata?: Prisma.InputJsonValue;
}

export interface CreatePresupuestoInput {
  companyId: string;
  surgeryId?: string | null;
  branchId?: string | null;
  clientContactId?: string | null;
  payerContactId?: string | null;
  title?: string | null;
  currency?: string;
  documentDate?: string | Date | null;
  paymentTerms?: string | null;
  priceListCode?: string | null;
  legend?: string | null;
  notes?: string | null;
  validUntil?: Date | null;
  generalDiscountRate?: number | string | Prisma.Decimal | null;
  commercial?: Record<string, unknown> | null;
  items: PresupuestoItemInput[];
  createdById?: string;
  metadata?: Record<string, unknown> | null;
  prisma: PrismaClient;
}

export interface UpdatePresupuestoDraftInput {
  companyId: string;
  presupuestoId: string;
  branchId?: string | null;
  clientContactId?: string | null;
  payerContactId?: string | null;
  title?: string | null;
  currency?: string;
  documentDate?: string | Date | null;
  paymentTerms?: string | null;
  priceListCode?: string | null;
  legend?: string | null;
  notes?: string | null;
  validUntil?: Date | null;
  generalDiscountRate?: number | string | Prisma.Decimal | null;
  commercial?: Record<string, unknown> | null;
  expectedRevision: number;
  items: PresupuestoItemInput[];
  updatedById?: string;
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
  expectedRevision: number;
  updatedById?: string;
}

export interface UpdatePresupuestoStateInput extends GetPresupuestoInput {
  newState?: string;
  command?: "approve" | "reject" | "expire" | "annul";
  expectedRevision: number;
  metadata?: Record<string, unknown> | null;
  updatedById?: string;
}

export interface CreatePresupuestoVersionInput {
  companyId: string;
  sourcePresupuestoId: string;
  expectedRevision: number;
  items?: PresupuestoItemInput[];
  metadata?: Record<string, unknown> | null;
  updatedById?: string;
  prisma: PrismaClient;
}

export interface DeletePresupuestoInput extends GetPresupuestoInput {
  expectedRevision: number;
}

export function recalculatePresupuestoTotals(items: PresupuestoItemInput[], generalDiscountRate: number | string | Prisma.Decimal | null = 0) {
  const generalRate = generalDiscount(generalDiscountRate);
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("items must be a non-empty array", "presupuesto_empty_items");
  }

  const normalizedItems = items.map((item, index): NormalizedPresupuestoItem => {
    const quantity = quantizeMoney(toDecimal(item.quantity));
    const unitPrice = quantizeMoney(toDecimal(item.unitPrice ?? 0));

    // Calculate discount amount from explicit discount or discount percentage
    let discount: Prisma.Decimal;
    if (item.discount !== undefined && item.discount !== null) {
      discount = quantizeMoney(toDecimal(item.discount));
    } else if (item.discountRate !== undefined && item.discountRate !== null) {
      const rate = toDecimal(item.discountRate);
      const lineBruto = quantizeMoney(quantity.mul(unitPrice));
      discount = quantizeMoney(lineBruto.mul(rate).div(100));
    } else if (item.discountPercent !== undefined && item.discountPercent !== null) {
      const rate = toDecimal(item.discountPercent);
      const lineBruto = quantizeMoney(quantity.mul(unitPrice));
      discount = quantizeMoney(lineBruto.mul(rate).div(100));
    } else {
      discount = new Prisma.Decimal(0);
    }

    if (quantity.lte(0)) {
      throw badRequest(
        `items[${index}].quantity must be a positive number`,
        "invalid_presupuesto_item_quantity"
      );
    }
    if (unitPrice.lt(0) || discount.lt(0)) {
      throw badRequest(
        `items[${index}] prices and discounts must be non-negative`,
        "invalid_presupuesto_item_amount"
      );
    }
    if (typeof item.description !== "string" || item.description.trim().length === 0) {
      throw badRequest(
        `items[${index}].description is required`,
        "invalid_presupuesto_item_description"
      );
    }

    const lineInputs = {
      ...(item.discount != null ? { discount: discount.toString() } : {
        discountRate: toDecimal(item.discountRate ?? item.discountPercent ?? 0).toString(),
      }),
      ...(item.tax != null ? { tax: quantizeMoney(toDecimal(item.tax)).toString() } : {}),
    };
    const gross = quantizeMoney(quantity.mul(unitPrice));
    if (discount.gt(gross)) throw badRequest("Discount cannot exceed line net amount", "invalid_presupuesto_item_amount");
    discount = quantizeMoney(discount.plus(quantizeMoney(gross.minus(discount).mul(generalRate).div(100))));
    const effectiveVatRate = item.vatRate ?? item.taxRate;
    const lineCalc = calculateLineCommercial({
      quantity,
      unitPrice,
      discount,
      vatTreatment: item.vatTreatment,
      vatRate: effectiveVatRate ?? undefined,
    });

    const tax = item.tax !== undefined && item.tax !== null
      ? quantizeMoney(toDecimal(item.tax))
      : lineCalc.tax;
    if (tax.lt(0)) {
      throw badRequest(`items[${index}].tax cannot be negative`, "invalid_presupuesto_item_tax");
    }

    const taxableAmount = quantizeMoney(Prisma.Decimal.max(0, quantizeMoney(quantity.mul(unitPrice)).minus(discount)));
    const total = quantizeMoney(taxableAmount.plus(tax));

    return {
      sku: item.sku ?? null,
      description: item.description,
      quantity,
      unit: item.unit ?? null,
      unitPrice,
      discount,
      tax,
      total,
      vatTreatment: lineCalc.vatTreatment,
      vatRate: lineCalc.vatRate,
      metadata: { ...metadataObject(item.metadata), budgetLineInputs: lineInputs } as Prisma.InputJsonValue,
    };
  });

  const totals = calculateCommercialDocumentTotals(normalizedItems);

  return {
    items: normalizedItems,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    breakdown: totals.breakdown,
  };
}

async function assertSurgeryBelongsToCompany(prisma: PrismaClient, companyId: string, surgeryId?: string | null) {
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

  const rate = generalDiscount(input.generalDiscountRate);
  const references = commercialReferences(input);
  await assertCommercialReferences(prisma, companyId, references);
  const totals = recalculatePresupuestoTotals(input.items, rate);
  const createdById = optionalUserId(input.createdById);

  const mergedMetadata: Record<string, unknown> = {
    ...customMetadata(input.metadata),
    ...references,
    ...(input.documentDate ? { documentDate: typeof input.documentDate === "string" ? input.documentDate : input.documentDate.toISOString() } : {}),
    ...(input.paymentTerms ? { paymentTerms: input.paymentTerms } : {}),
    ...(input.priceListCode ? { priceListCode: input.priceListCode } : {}),
    ...(input.legend ? { legend: input.legend } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    generalDiscountRate: rate.toString(),
    ...(input.commercial ? { commercial: input.commercial } : {}),
    writeRevision: 1,
  };

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
        metadata: mergedMetadata as Prisma.InputJsonValue,
        items: { create: totals.items },
      },
      select: presupuestoReadSelect,
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

    return serializePresupuestoRow(created);
  });
}

export async function updatePresupuestoDraft(input: UpdatePresupuestoDraftInput) {
  const companyId = requireCompanyId(input.companyId);
  const prisma = input.prisma;
  const updatedById = optionalUserId(input.updatedById);

  return prisma.$transaction(async (tx) => {
    await lockPresupuestoRow(tx, companyId, input.presupuestoId);
    const current = await tx.presupuesto.findFirst({
      where: { id: input.presupuestoId, companyId },
      select: {
        id: true,
        companyId: true,
        state: true,
        versionNumber: true,
        surgeryId: true,
        metadata: true,
      },
    });
    requireCompanyMatch(current, companyId, input.presupuestoId);

    if (current.state !== "Borrador") {
      throw new PresupuestoError(
        "presupuesto_not_editable",
        `Cannot edit presupuesto in state ${current.state} (only Borrador)`,
        409
      );
    }

    const currentWriteRevision = getPresupuestoWriteRevision(current.metadata, current.versionNumber);
    assertExpectedRevision(currentWriteRevision, input.expectedRevision);

    const existingMeta = metadataObject(current.metadata);
    const rate = generalDiscount(input.generalDiscountRate === undefined ? existingMeta.generalDiscountRate : input.generalDiscountRate);
    const totals = recalculatePresupuestoTotals(input.items, rate);
    const nextWriteRevision = currentWriteRevision + 1;

    const updatedMetadata: Record<string, unknown> = {
      ...existingMeta,
      ...customMetadata(input.metadata),
      ...commercialReferences(input, existingMeta),
      ...(input.documentDate !== undefined ? { documentDate: typeof input.documentDate === "string" ? input.documentDate : input.documentDate?.toISOString() ?? null } : {}),
      ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
      ...(input.priceListCode !== undefined ? { priceListCode: input.priceListCode } : {}),
      ...(input.legend !== undefined ? { legend: input.legend } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      generalDiscountRate: rate.toString(),
      ...(input.commercial !== undefined ? { commercial: input.commercial } : {}),
      writeRevision: nextWriteRevision,
    };

    await assertCommercialReferences(tx, companyId, updatedMetadata);

    // Delete existing items and recreate
    await tx.presupuestoItem.deleteMany({
      where: { presupuestoId: input.presupuestoId },
    });

    const updated = await tx.presupuesto.update({
      where: { id: input.presupuestoId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        updatedById,
        metadata: updatedMetadata as Prisma.InputJsonValue,
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
        entityId: updated.id,
        action: "presupuesto_draft_updated",
        module: "presupuesto",
        oldValue: { id: current.id, state: current.state },
        newValue: serializePresupuestoForAudit(updated),
      });
    }

    return serializePresupuestoRow(updated);
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

  const rows = await input.prisma.presupuesto.findMany({
    select: presupuestoReadSelect,
    where,
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    take: input.take ?? DEFAULT_LIST_TAKE,
    skip: input.skip ?? 0,
  });

  return rows.map(serializePresupuestoRow);
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
  return serializePresupuestoRow(presupuesto);
}

export async function emitPresupuesto(input: EmitPresupuestoInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);

  for (let attempt = 0; attempt < PRESUPUESTO_EMIT_MAX_RETRIES; attempt += 1) {
    try {
      return await input.prisma.$transaction(
        async (tx) => {
          await lockPresupuestoRow(tx, companyId, input.presupuestoId);
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
              metadata: true,
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

          const currentWriteRevision = getPresupuestoWriteRevision(current.metadata, current.versionNumber);
          assertExpectedRevision(currentWriteRevision, input.expectedRevision);

          const visibleNumber = await getNextVisibleNumber(tx, companyId);
          const currentMeta = (current.metadata && typeof current.metadata === "object" ? current.metadata : {}) as Record<string, unknown>;
          const updatedMeta = { ...currentMeta, writeRevision: currentWriteRevision + 1 };

          const result = await tx.presupuesto.update({
            where: { id: input.presupuestoId },
            data: {
              visibleNumber,
              state: "Emitido",
              issuedAt: new Date(),
              updatedById,
              metadata: updatedMeta as Prisma.InputJsonValue,
            },
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
          return serializePresupuestoRow(result);
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

const COMMAND_STATE_MAP: Record<string, PresupuestoState> = {
  approve: "Aprobado",
  reject: "Rechazado",
  expire: "Vencido",
  annul: "Anulado",
};

export async function updatePresupuestoState(input: UpdatePresupuestoStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);

  let targetState: string | undefined = input.newState;
  if (!targetState && input.command) {
    targetState = COMMAND_STATE_MAP[input.command];
  }

  if (!targetState || !isPresupuestoState(targetState)) {
    throw badRequest(
      `Invalid newState/command. State must be one of: ${(PRESUPUESTO_STATES as readonly string[]).join(", ")}`,
      "invalid_presupuesto_state"
    );
  }

  const newState = targetState as PresupuestoState;
  const dateFields: { approvedAt?: Date; rejectedAt?: Date } = {};
  if (newState === "Aprobado") dateFields.approvedAt = new Date();
  if (newState === "Rechazado") dateFields.rejectedAt = new Date();

  return input.prisma.$transaction(async (tx) => {
    await lockPresupuestoRow(tx, companyId, input.presupuestoId);
    const current = await tx.presupuesto.findFirst({
      where: { id: input.presupuestoId, companyId },
      select: { id: true, state: true, companyId: true, versionNumber: true, metadata: true },
    });
    requireCompanyMatch(current, companyId, input.presupuestoId);

    const currentWriteRevision = getPresupuestoWriteRevision(current.metadata, current.versionNumber);
    assertExpectedRevision(currentWriteRevision, input.expectedRevision);

    const currentState = current.state as PresupuestoState;
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

    const existingMeta = (current.metadata && typeof current.metadata === "object" ? current.metadata : {}) as Record<string, unknown>;
    const updatedMeta: Record<string, unknown> = {
      ...existingMeta,
      ...customMetadata(input.metadata),
      writeRevision: currentWriteRevision + 1,
    };

    const result = await tx.presupuesto.update({
      where: { id: input.presupuestoId },
      data: {
        state: newState,
        updatedById,
        metadata: updatedMeta as Prisma.InputJsonObject,
        ...dateFields,
      },
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
    return serializePresupuestoRow(result);
  });
}

export async function createPresupuestoVersion(input: CreatePresupuestoVersionInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);

  return input.prisma.$transaction(async (tx) => {
    await lockPresupuestoRow(tx, companyId, input.sourcePresupuestoId);
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

    const sourceWriteRevision = getPresupuestoWriteRevision(source.metadata, source.versionNumber);
    assertExpectedRevision(sourceWriteRevision, input.expectedRevision);

    const rootId = source.parentPresupuestoId ?? source.id;
    const maxVersion = await tx.presupuesto.aggregate({
      where: { companyId, OR: [{ id: rootId }, { parentPresupuestoId: rootId }] },
      _max: { versionNumber: true },
    });
    const nextVersionNumber = (maxVersion._max.versionNumber ?? source.versionNumber) + 1;
    const sourceItems = source.items.map((item) => ({
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
      vatTreatment: item.vatTreatment,
      vatRate: item.vatRate,
      metadata: (item.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    }));
    const sourceMeta = (source.metadata && typeof source.metadata === "object" ? source.metadata : {}) as Record<string, unknown>;
    const references = commercialReferences(input, sourceMeta);
    await assertCommercialReferences(tx, companyId, references);
    const rate = generalDiscount(sourceMeta.generalDiscountRate);
    // A revision without replacements copies final monetary values, never discounts them again.
    const totals = input.items ? recalculatePresupuestoTotals(input.items, rate) : {
      items: sourceItems.map((item, index) => ({ ...item, total: source.items[index].total })),
      subtotal: source.subtotal, discountTotal: source.discountTotal, taxTotal: source.taxTotal, total: source.total,
    };
    await tx.presupuesto.update({
      where: { id: source.id },
      data: {
        state: "Reemplazado",
        updatedById,
        metadata: { ...sourceMeta, writeRevision: sourceWriteRevision + 1 } as Prisma.InputJsonValue,
      },
    });

    const mergedMeta: Record<string, unknown> = {
      ...sourceMeta,
      ...customMetadata(input.metadata),
      ...references,
      writeRevision: 1,
    };

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
        metadata: mergedMeta as Prisma.InputJsonValue,
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

    return serializePresupuestoRow(created);
  });
}

export async function deletePresupuesto(input: DeletePresupuestoInput) {
  const companyId = requireCompanyId(input.companyId);

  return input.prisma.$transaction(async (tx) => {
    await lockPresupuestoRow(tx, companyId, input.presupuestoId);
    const current = await tx.presupuesto.findFirst({
      where: { id: input.presupuestoId, companyId },
      select: { id: true, state: true, companyId: true, createdById: true, versionNumber: true, metadata: true },
    });
    requireCompanyMatch(current, companyId, input.presupuestoId);
    if (current.state !== "Borrador") {
      throw new PresupuestoError(
        "presupuesto_not_deletable",
        `Cannot delete presupuesto in state ${current.state} (only Borrador)`,
        409
      );
    }

    const currentWriteRevision = getPresupuestoWriteRevision(current.metadata, current.versionNumber);
    assertExpectedRevision(currentWriteRevision, input.expectedRevision);

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
