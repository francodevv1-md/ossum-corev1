// OSSUM COR — Invoice service (Fase 1D)
// Facturación operacional: sin CAE/AFIP/TusFacturasAPP productivo.
// Every operational query MUST filter by companyId.

import { Prisma } from "@prisma/client";
import type { PrismaClient, Invoice as PrismaInvoice } from "@prisma/client";

import { createAuditEvent } from "../audit";
import { badRequest, notFound } from "../api/errors";
import { requireCompanyId } from "../tenant";
import { assertFiscalCancellationAllowed } from "./fiscal.service";

export const INVOICE_BASES = ["presupuesto", "consumo", "manual", "mixto"] as const;
export type InvoiceBase = (typeof INVOICE_BASES)[number];

export const INVOICE_STATES = [
  "Borrador",
  "Emitida",
  "Anulada",
  "Cobrada",
  "Parcialmente_cobrada",
] as const;
export type InvoiceState = (typeof INVOICE_STATES)[number];

export const INVOICE_TRANSITIONS: Record<InvoiceState, InvoiceState[]> = {
  Borrador: ["Anulada"],
  Emitida: ["Anulada", "Parcialmente_cobrada", "Cobrada"],
  Parcialmente_cobrada: ["Cobrada", "Anulada", "Emitida"],
  Cobrada: ["Anulada", "Parcialmente_cobrada", "Emitida"],
  Anulada: [],
};

export const INVOICE_MUTATION_ROLES = ["admin", "coordinador", "vendedor"] as const;
export const INVOICE_READ_ROLES = ["admin", "coordinador", "logistica", "vendedor", "matrona", "instrumentador"] as const;

const DEFAULT_LIST_TAKE = 50;
const INVOICE_EMIT_MAX_RETRIES = 3;

export class InvoiceError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "InvoiceError";
    this.code = code;
    this.status = status;
  }
}

function isInvoiceBase(value: string): value is InvoiceBase {
  return (INVOICE_BASES as readonly string[]).includes(value);
}

function isInvoiceState(value: string): value is InvoiceState {
  return (INVOICE_STATES as readonly string[]).includes(value);
}

function toDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

const quantizeMoney = (value: Prisma.Decimal) => value.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

function optionalUserId(userId: string | undefined): string | null {
  return userId ?? null;
}

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

const invoiceReadSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  surgeryId: true,
  presupuestoId: true,
  consumoId: true,
  base: true,
  state: true,
  type: true,
  currency: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  total: true,
  paidTotal: true,
  balance: true,
  issuedAt: true,
  cancelledAt: true,
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
      sourceType: true,
      sourceItemId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.InvoiceSelect;

function serializeInvoiceForAudit(invoice: {
  id: string;
  visibleNumber: number | null;
  companyId: string;
  surgeryId: string | null;
  presupuestoId: string | null;
  consumoId: string | null;
  base: string;
  state: string;
  total: Prisma.Decimal;
  paidTotal: Prisma.Decimal;
  balance: Prisma.Decimal;
  issuedAt: Date | null;
  cancelledAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: invoice.id,
    visibleNumber: invoice.visibleNumber,
    companyId: invoice.companyId,
    surgeryId: invoice.surgeryId,
    presupuestoId: invoice.presupuestoId,
    consumoId: invoice.consumoId,
    base: invoice.base,
    state: invoice.state,
    total: invoice.total.toString(),
    paidTotal: invoice.paidTotal.toString(),
    balance: invoice.balance.toString(),
    issuedAt: serializeDate(invoice.issuedAt),
    cancelledAt: serializeDate(invoice.cancelledAt),
    createdById: invoice.createdById,
    updatedById: invoice.updatedById,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

function requireCompanyMatch(invoice: { companyId: string } | null, companyId: string, invoiceId: string): asserts invoice {
  if (!invoice || invoice.companyId !== companyId) {
    throw notFound(`Invoice ${invoiceId} not found in company ${companyId}`, "invoice_not_found");
  }
}

async function getNextVisibleNumber(tx: Prisma.TransactionClient, companyId: string): Promise<number> {
  await tx.$executeRaw`LOCK TABLE "invoice" IN SHARE ROW EXCLUSIVE MODE`;
  const rows = await tx.$queryRaw<Array<{ next: bigint | number | null }>>`
    SELECT COALESCE(MAX("visibleNumber"), 0) + 1 AS "next"
    FROM "invoice"
    WHERE "companyId" = ${companyId}
  `;
  const next = Number(rows[0]?.next ?? 1);
  if (!Number.isFinite(next) || next <= 0) {
    throw new InvoiceError("invoice_visible_number_failed", "Failed to allocate next visible number");
  }
  return next;
}

export interface InvoiceItemInput {
  sku?: string;
  description: string;
  quantity: number | string | Prisma.Decimal;
  unit?: string;
  unitPrice?: number | string | Prisma.Decimal;
  discount?: number | string | Prisma.Decimal;
  tax?: number | string | Prisma.Decimal;
  sourceType?: string;
  sourceItemId?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedInvoiceItem {
  sku: string | null;
  description: string;
  quantity: Prisma.Decimal;
  unit: string | null;
  unitPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  sourceType: string | null;
  sourceItemId: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateInvoiceInput {
  companyId: string;
  surgeryId?: string;
  presupuestoId?: string;
  consumoId?: string;
  base?: string;
  type?: string;
  currency?: string;
  items: InvoiceItemInput[];
  createdById?: string;
  metadata?: Record<string, unknown> | null;
  prisma: PrismaClient;
}

export interface CreateInvoiceFromSourceInput {
  companyId: string;
  presupuestoId: string;
  consumoId?: string;
  createdById?: string;
  prisma: PrismaClient;
}

export interface ListInvoicesInput {
  companyId: string;
  surgeryId?: string;
  state?: string;
  base?: string;
  fromDate?: Date;
  toDate?: Date;
  take?: number;
  skip?: number;
  prisma: PrismaClient;
}

export interface GetInvoiceInput {
  companyId: string;
  invoiceId: string;
  prisma: PrismaClient;
}

export interface EmitInvoiceInput extends GetInvoiceInput {
  updatedById?: string;
}

export interface UpdateInvoiceStateInput extends GetInvoiceInput {
  newState: string;
  updatedById?: string;
}

export interface RecomputeInvoicePaymentStateInput {
  companyId: string;
  invoiceId: string;
  prisma: Prisma.TransactionClient;
}
export type DeleteInvoiceInput = GetInvoiceInput;

export function calculateInvoiceTotals(items: InvoiceItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("items must be a non-empty array", "invoice_empty_items");
  }

  const normalizedItems = items.map((item, index): NormalizedInvoiceItem => {
    const quantity = quantizeMoney(toDecimal(item.quantity));
    const unitPrice = quantizeMoney(toDecimal(item.unitPrice ?? 0));
    const discount = quantizeMoney(toDecimal(item.discount ?? 0));
    const tax = quantizeMoney(toDecimal(item.tax ?? 0));
    if (quantity.lte(0)) {
      throw badRequest(`items[${index}].quantity must be a positive number`, "invalid_invoice_item_quantity");
    }
    if (unitPrice.lt(0) || discount.lt(0) || tax.lt(0)) {
      throw badRequest(`items[${index}] prices, discounts and taxes must be non-negative`, "invalid_invoice_item_amount");
    }
    if (typeof item.description !== "string" || item.description.trim().length === 0) {
      throw badRequest(`items[${index}].description is required`, "invalid_invoice_item_description");
    }
    const total = quantizeMoney(quantizeMoney(quantity.mul(unitPrice)).minus(discount).plus(tax));
    if (total.lt(0)) {
      throw badRequest(`items[${index}].total cannot be negative`, "invalid_invoice_item_total");
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
      sourceType: item.sourceType ?? null,
      sourceItemId: item.sourceItemId ?? null,
      metadata: (item.metadata ?? null) as Prisma.InputJsonValue | undefined,
    };
  });

  return {
    items: normalizedItems,
    subtotal: normalizedItems.reduce((acc, item) => quantizeMoney(acc.plus(quantizeMoney(item.quantity.mul(item.unitPrice)))), new Prisma.Decimal(0)),
    discountTotal: normalizedItems.reduce((acc, item) => quantizeMoney(acc.plus(item.discount)), new Prisma.Decimal(0)),
    taxTotal: normalizedItems.reduce((acc, item) => quantizeMoney(acc.plus(item.tax)), new Prisma.Decimal(0)),
    total: normalizedItems.reduce((acc, item) => quantizeMoney(acc.plus(item.total)), new Prisma.Decimal(0)),
  };
}

function normalizedSku(value: string | null | undefined) {
  return value?.normalize("NFKC").trim().toLocaleUpperCase("es") ?? "";
}

function normalizedDescription(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

async function lockAndAssertSourcesNotInvoiced(
  tx: Prisma.TransactionClient,
  companyId: string,
  presupuestoId?: string,
  consumoId?: string,
) {
  const sourceKeys = [presupuestoId ? `presupuesto:${presupuestoId}` : "", consumoId ? `consumo:${consumoId}` : ""].filter(Boolean).sort();
  for (const sourceKey of sourceKeys) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${companyId}:${sourceKey}`}, 0))`;
  }
  if (!sourceKeys.length) return;
  const active = await tx.invoice.findFirst({
    where: {
      companyId,
      state: { not: "Anulada" },
      OR: [
        ...(presupuestoId ? [{ presupuestoId }] : []),
        ...(consumoId ? [{ consumoId }] : []),
      ],
    },
    select: { id: true },
  });
  if (active) throw new InvoiceError("invoice_source_already_invoiced", `Source already referenced by active invoice ${active.id}`, 409);
}

async function transitionLinkedConsumoForInvoice(input: {
  tx: Prisma.TransactionClient;
  companyId: string;
  consumoId: string;
  invoiceId: string;
  targetState: "Facturado" | "Validado";
  updatedById: string | null;
}) {
  const fromState = input.targetState === "Facturado" ? "Validado" : "Facturado";
  const updated = await input.tx.consumo.updateMany({
    where: { id: input.consumoId, companyId: input.companyId, state: fromState },
    data: {
      state: input.targetState,
      facturedAt: input.targetState === "Facturado" ? new Date() : null,
      updatedById: input.updatedById,
    },
  });
  if (input.targetState === "Facturado" && updated.count !== 1) {
    throw new InvoiceError("invoice_consumo_not_validado", `Consumo ${input.consumoId} must be Validado before invoice emission`, 409);
  }
  if (updated.count === 1 && input.updatedById) {
    await createAuditEvent({
      prisma: input.tx as unknown as PrismaClient,
      companyId: input.companyId,
      userId: input.updatedById,
      entityType: "Consumo",
      entityId: input.consumoId,
      action: input.targetState === "Facturado" ? "consumo.factured" : "consumo.invoice_cancelled_restore",
      module: "consumo",
      oldValue: { state: fromState },
      newValue: { state: input.targetState, invoiceId: input.invoiceId },
    });
  }
}

async function lockSourceRows(
  tx: Prisma.TransactionClient,
  companyId: string,
  presupuestoId: string,
  consumoId?: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "presupuesto" WHERE "id" = ${presupuestoId} AND "companyId" = ${companyId} FOR UPDATE`;
  if (consumoId) {
    await tx.$queryRaw`SELECT "id" FROM "consumo" WHERE "id" = ${consumoId} AND "companyId" = ${companyId} FOR UPDATE`;
  }
}

interface CreateInvoiceRecordInput {
  companyId: string;
  surgeryId?: string;
  presupuestoId?: string;
  consumoId?: string;
  base: InvoiceBase;
  type?: string;
  currency?: string;
  items: InvoiceItemInput[];
  createdById: string | null;
  metadata?: Record<string, unknown> | null;
  expectedTotal?: Prisma.Decimal;
}

async function createInvoiceRecord(tx: Prisma.TransactionClient, input: CreateInvoiceRecordInput) {
  const totals = calculateInvoiceTotals(input.items);
  if (input.expectedTotal && !totals.total.eq(input.expectedTotal)) {
    throw new InvoiceError(
      "invoice_presupuesto_total_mismatch",
      `Calculated Invoice total ${totals.total.toFixed(4)} does not match approved Presupuesto total ${input.expectedTotal.toFixed(4)}`,
      409,
    );
  }
  const created = await tx.invoice.create({
    data: {
      companyId: input.companyId,
      surgeryId: input.surgeryId ?? null,
      presupuestoId: input.presupuestoId ?? null,
      consumoId: input.consumoId ?? null,
      base: input.base,
      state: "Borrador",
      type: input.type ?? "FV",
      currency: input.currency ?? "ARS",
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      paidTotal: new Prisma.Decimal(0),
      balance: totals.total,
      createdById: input.createdById,
      metadata: (input.metadata ?? null) as Prisma.InputJsonValue | undefined,
      items: { create: totals.items },
    },
    select: invoiceReadSelect,
  });
  if (input.createdById) {
    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: input.companyId,
      userId: input.createdById,
      entityType: "Invoice",
      entityId: created.id,
      action: "invoice_created",
      module: "invoice",
      oldValue: null,
      newValue: serializeInvoiceForAudit(created),
    });
  }
  return created;
}

export async function createInvoiceFromSource(input: CreateInvoiceFromSourceInput) {
  const companyId = requireCompanyId(input.companyId);
  const createdById = optionalUserId(input.createdById);
  return input.prisma.$transaction(async (tx) => {
    await lockSourceRows(tx, companyId, input.presupuestoId, input.consumoId);
    await lockAndAssertSourcesNotInvoiced(tx, companyId, input.presupuestoId, input.consumoId);
    const presupuesto = await tx.presupuesto.findFirst({
      where: { id: input.presupuestoId, companyId, state: "Aprobado", slot: "CURRENT" },
      select: {
        id: true, surgeryId: true, currency: true, generalDiscountRate: true, total: true,
        items: {
          select: { id: true, sku: true, description: true, quantity: true, unit: true, unitPrice: true, discountRate: true, discount: true, taxRate: true, tax: true, metadata: true },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!presupuesto) throw notFound(`Approved CURRENT Presupuesto ${input.presupuestoId} not found in company ${companyId}`, "invoice_presupuesto_not_eligible");
    if (!presupuesto.surgeryId) throw badRequest("Presupuesto must reference a surgery", "invoice_source_surgery_required");

    if (!input.consumoId) {
      return createInvoiceRecord(tx, {
        companyId,
        surgeryId: presupuesto.surgeryId,
        presupuestoId: presupuesto.id,
        base: "presupuesto",
        currency: presupuesto.currency,
        createdById,
        expectedTotal: quantizeMoney(presupuesto.total),
        metadata: { source: { presupuestoId: presupuesto.id } },
        items: presupuesto.items.map((item) => ({
          sku: item.sku ?? undefined,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit ?? undefined,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: item.tax,
          sourceType: "presupuesto",
          sourceItemId: item.id,
          metadata: { presupuestoId: presupuesto.id, presupuestoItemMetadata: item.metadata ?? null },
        })),
      });
    }

    const consumo = await tx.consumo.findFirst({
      where: { id: input.consumoId, companyId, state: "Validado" },
      select: {
        id: true, surgeryId: true,
        items: {
          select: { id: true, sku: true, description: true, consumedQuantity: true, unit: true, metadata: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!consumo) throw notFound(`Validated Consumo ${input.consumoId} not found in company ${companyId}`, "invoice_consumo_not_eligible");
    if (!consumo.surgeryId || consumo.surgeryId !== presupuesto.surgeryId) throw badRequest("Presupuesto and Consumo must reference the same surgery", "invoice_source_surgery_mismatch");

    const consumedItems = consumo.items.filter((item) => toDecimal(item.consumedQuantity).gt(0));
    if (!consumedItems.length) throw badRequest("Consumo has no positive consumed lines", "invoice_consumo_empty");
    const items = consumedItems.map((consumoItem) => {
      const sku = normalizedSku(consumoItem.sku);
      const matches = presupuesto.items.filter((budgetItem) => sku
        ? normalizedSku(budgetItem.sku) === sku
        : !normalizedSku(budgetItem.sku) && normalizedDescription(budgetItem.description) === normalizedDescription(consumoItem.description));
      if (matches.length !== 1) throw badRequest(`Consumo item ${consumoItem.id} cannot be matched to exactly one presupuesto item`, "invoice_consumo_item_unpriced");
      const budgetItem = matches[0];
      const quantity = quantizeMoney(toDecimal(consumoItem.consumedQuantity));
      const unitPrice = quantizeMoney(budgetItem.unitPrice);
      const gross = quantizeMoney(quantity.mul(unitPrice));
      const lineDiscount = quantizeMoney(gross.mul(budgetItem.discountRate).div(100));
      const generalDiscount = quantizeMoney(gross.minus(lineDiscount).mul(presupuesto.generalDiscountRate).div(100));
      const discount = quantizeMoney(lineDiscount.plus(generalDiscount));
      const taxable = quantizeMoney(gross.minus(discount));
      const tax = quantizeMoney(taxable.mul(budgetItem.taxRate).div(100));
      return {
        sku: consumoItem.sku ?? budgetItem.sku ?? undefined,
        description: consumoItem.description,
        quantity,
        unit: consumoItem.unit ?? budgetItem.unit ?? undefined,
        unitPrice,
        discount,
        tax,
        sourceType: "consumo",
        sourceItemId: consumoItem.id,
        metadata: { presupuestoId: presupuesto.id, presupuestoItemId: budgetItem.id, presupuestoItemMetadata: budgetItem.metadata ?? null, consumoId: consumo.id, consumoItemMetadata: consumoItem.metadata ?? null },
      } satisfies InvoiceItemInput;
    });
    return createInvoiceRecord(tx, {
      companyId,
      surgeryId: consumo.surgeryId,
      presupuestoId: presupuesto.id,
      consumoId: consumo.id,
      base: "mixto",
      currency: presupuesto.currency,
      createdById,
      metadata: { source: { presupuestoId: presupuesto.id, consumoId: consumo.id } },
      items,
    });
  });
}

async function assertRefs(prisma: PrismaClient, companyId: string, input: CreateInvoiceInput) {
  if (input.surgeryId) {
    const surgery = await prisma.surgery.findFirst({ where: { id: input.surgeryId, companyId }, select: { id: true } });
    if (!surgery) throw notFound(`Surgery ${input.surgeryId} not found in company ${companyId}`, "surgery_not_found");
  }
  if (input.presupuestoId) {
    const presupuesto = await prisma.presupuesto.findFirst({ where: { id: input.presupuestoId, companyId }, select: { id: true, surgeryId: true } });
    if (!presupuesto) throw notFound(`Presupuesto ${input.presupuestoId} not found in company ${companyId}`, "presupuesto_not_found");
  }
  if (input.consumoId) {
    const consumo = await prisma.consumo.findFirst({ where: { id: input.consumoId, companyId }, select: { id: true, surgeryId: true } });
    if (!consumo) throw notFound(`Consumo ${input.consumoId} not found in company ${companyId}`, "consumo_not_found");
  }
}

export async function createInvoice(input: CreateInvoiceInput) {
  const companyId = requireCompanyId(input.companyId);
  const base = input.base ?? "manual";
  if (!isInvoiceBase(base)) {
    throw badRequest(`base must be one of: ${(INVOICE_BASES as readonly string[]).join(", ")}`, "invalid_invoice_base");
  }
  if (base === "presupuesto" && !input.presupuestoId) throw badRequest("presupuestoId is required for presupuesto invoices", "invoice_presupuesto_required");
  if (base === "consumo" && !input.consumoId) throw badRequest("consumoId is required for consumo invoices", "invoice_consumo_required");
  if (base === "manual" && (input.presupuestoId || input.consumoId)) throw badRequest("manual invoices cannot reference presupuestoId or consumoId", "invoice_manual_refs_not_allowed");
  if (base === "mixto" && !input.presupuestoId && !input.consumoId) throw badRequest("mixto invoices require at least one source id", "invoice_mixto_source_required");

  await assertRefs(input.prisma, companyId, input);
  const createdById = optionalUserId(input.createdById);

  return input.prisma.$transaction(async (tx) => {
    await lockAndAssertSourcesNotInvoiced(tx, companyId, input.presupuestoId, input.consumoId);
    return createInvoiceRecord(tx, { ...input, companyId, base, createdById });
  });
}

export async function listInvoices(input: ListInvoicesInput) {
  const companyId = requireCompanyId(input.companyId);
  if (input.state !== undefined && !isInvoiceState(input.state)) throw badRequest(`state must be one of: ${(INVOICE_STATES as readonly string[]).join(", ")}`, "invalid_invoice_state_filter");
  if (input.base !== undefined && !isInvoiceBase(input.base)) throw badRequest(`base must be one of: ${(INVOICE_BASES as readonly string[]).join(", ")}`, "invalid_invoice_base_filter");
  const where: Prisma.InvoiceWhereInput = { companyId };
  if (input.surgeryId) where.surgeryId = input.surgeryId;
  if (input.state) where.state = input.state;
  if (input.base) where.base = input.base;
  if (input.fromDate || input.toDate) where.createdAt = { ...(input.fromDate ? { gte: input.fromDate } : {}), ...(input.toDate ? { lte: input.toDate } : {}) };
  return input.prisma.invoice.findMany({ select: invoiceReadSelect, where, orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }], take: input.take ?? DEFAULT_LIST_TAKE, skip: input.skip ?? 0 });
}

export async function getInvoice(input: GetInvoiceInput) {
  const companyId = requireCompanyId(input.companyId);
  const invoice = await input.prisma.invoice.findFirst({ select: invoiceReadSelect, where: { id: input.invoiceId, companyId } });
  if (!invoice) throw notFound(`Invoice ${input.invoiceId} not found in company ${companyId}`, "invoice_not_found");
  return invoice;
}

export async function emitInvoice(input: EmitInvoiceInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);
  for (let attempt = 0; attempt < INVOICE_EMIT_MAX_RETRIES; attempt += 1) {
    try {
      return await input.prisma.$transaction(async (tx) => {
        await lockInvoiceRow(tx, companyId, input.invoiceId);
        const current = await tx.invoice.findFirst({ where: { id: input.invoiceId, companyId }, select: { id: true, state: true, companyId: true, consumoId: true } });
        requireCompanyMatch(current, companyId, input.invoiceId);
        if (current.state !== "Borrador") throw new InvoiceError("invoice_not_borrador", `Cannot emit invoice in state ${current.state}`, 409);
        const visibleNumber = await getNextVisibleNumber(tx, companyId);
        if (current.consumoId) {
          await transitionLinkedConsumoForInvoice({ tx, companyId, consumoId: current.consumoId, invoiceId: current.id, targetState: "Facturado", updatedById });
        }
        const result = await tx.invoice.update({ where: { id: input.invoiceId }, data: { visibleNumber, state: "Emitida", issuedAt: new Date(), updatedById }, select: invoiceReadSelect });
        if (updatedById) await createAuditEvent({ prisma: tx as unknown as PrismaClient, companyId, userId: updatedById, entityType: "Invoice", entityId: result.id, action: "invoice_issued", module: "invoice", oldValue: { state: current.state }, newValue: { state: result.state, visibleNumber: result.visibleNumber } });
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < INVOICE_EMIT_MAX_RETRIES - 1) continue;
      throw error;
    }
  }
  throw new InvoiceError("invoice_emit_failed", "Failed to emit invoice after retrying transactional visible number allocation");
}

export const emitirInvoice = emitInvoice;

async function lockInvoiceRow(tx: Prisma.TransactionClient, companyId: string, invoiceId: string) {
  await tx.$queryRaw`SELECT "id" FROM "invoice" WHERE "id" = ${invoiceId} AND "companyId" = ${companyId} FOR UPDATE`;
}

export async function updateInvoiceState(input: UpdateInvoiceStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);
  if (!isInvoiceState(input.newState)) throw badRequest(`newState must be one of: ${(INVOICE_STATES as readonly string[]).join(", ")}`, "invalid_invoice_state");
  const newState = input.newState as InvoiceState;
  return input.prisma.$transaction(async (tx) => {
    await lockInvoiceRow(tx, companyId, input.invoiceId);
    const current = await tx.invoice.findFirst({ where: { id: input.invoiceId, companyId }, select: { id: true, state: true, companyId: true, consumoId: true } });
    requireCompanyMatch(current, companyId, input.invoiceId);
    const currentState = current.state as InvoiceState;
    if (currentState === newState) throw new InvoiceError("invoice_state_unchanged", `Invoice state is already ${newState}`, 409);
    if (!((INVOICE_TRANSITIONS[currentState] ?? []) as readonly string[]).includes(newState)) throw new InvoiceError("invalid_invoice_transition", `Invalid invoice state transition: ${currentState} -> ${newState}`, 409);
    if (newState === "Anulada") await assertFiscalCancellationAllowed(tx, companyId, input.invoiceId);
    const result = await tx.invoice.update({ where: { id: input.invoiceId }, data: { state: newState, cancelledAt: newState === "Anulada" ? new Date() : undefined, updatedById }, select: invoiceReadSelect });
    if (newState === "Anulada" && currentState !== "Borrador" && current.consumoId) {
      await transitionLinkedConsumoForInvoice({ tx, companyId, consumoId: current.consumoId, invoiceId: current.id, targetState: "Validado", updatedById });
    }
    if (updatedById) await createAuditEvent({ prisma: tx as unknown as PrismaClient, companyId, userId: updatedById, entityType: "Invoice", entityId: result.id, action: "invoice_state_changed", module: "invoice", oldValue: { state: currentState }, newValue: { state: newState } });
    return result;
  });
}

export async function recomputeInvoicePaymentState(input: RecomputeInvoicePaymentStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const db = input.prisma;
  await lockInvoiceRow(db, companyId, input.invoiceId);
  const invoice = await db.invoice.findFirst({ where: { id: input.invoiceId, companyId }, select: { id: true, companyId: true, state: true, total: true } });
  requireCompanyMatch(invoice, companyId, input.invoiceId);
  const aggregate = await db.paymentImputation.aggregate({
    where: { invoiceId: input.invoiceId, payment: { state: "Registrado" } },
    _sum: { amount: true },
  });
  const paidTotal = aggregate._sum.amount ?? new Prisma.Decimal(0);
  const balance = invoice.total.minus(paidTotal);
  const state = invoice.state === "Anulada" || invoice.state === "Borrador" ? invoice.state : paidTotal.gte(invoice.total) ? "Cobrada" : paidTotal.gt(0) ? "Parcialmente_cobrada" : "Emitida";
  return db.invoice.update({ where: { id: input.invoiceId }, data: { paidTotal, balance, state }, select: invoiceReadSelect });
}

export async function deleteInvoice(input: DeleteInvoiceInput) {
  const companyId = requireCompanyId(input.companyId);
  return input.prisma.$transaction(async (tx) => {
    await lockInvoiceRow(tx, companyId, input.invoiceId);
    const current = await tx.invoice.findFirst({ where: { id: input.invoiceId, companyId }, select: { id: true, state: true, companyId: true, createdById: true } });
    requireCompanyMatch(current, companyId, input.invoiceId);
    if (current.state !== "Borrador") throw new InvoiceError("invoice_not_deletable", `Cannot delete invoice in state ${current.state} (only Borrador)`, 409);
    await tx.invoice.delete({ where: { id: input.invoiceId } });
    if (current.createdById) await createAuditEvent({ prisma: tx as unknown as PrismaClient, companyId, userId: current.createdById, entityType: "Invoice", entityId: input.invoiceId, action: "invoice_deleted", module: "invoice", oldValue: { id: input.invoiceId, state: current.state }, newValue: null });
    return { id: input.invoiceId, deleted: true };
  });
}

export type InvoiceRead = PrismaInvoice;
