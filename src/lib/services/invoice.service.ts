// OSSUM COR — Invoice service (Fase 1D)
// Facturación operacional: sin CAE/AFIP/TusFacturasAPP productivo.
// Every operational query MUST filter by companyId.

import { Prisma } from "@prisma/client";
import type { PrismaClient, Invoice as PrismaInvoice } from "@prisma/client";

import { createAuditEvent } from "../audit";
import { badRequest, notFound } from "../api/errors";
import { requireCompanyId } from "../tenant";
import { markConsumoAsFacturado } from "./consumo.service";

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
  Borrador: ["Emitida", "Anulada"],
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
  prisma: PrismaClient | Prisma.TransactionClient;
}
export interface DeleteInvoiceInput extends GetInvoiceInput {}

export function calculateInvoiceTotals(items: InvoiceItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("items must be a non-empty array", "invoice_empty_items");
  }

  const normalizedItems = items.map((item, index): NormalizedInvoiceItem => {
    const quantity = toDecimal(item.quantity);
    const unitPrice = toDecimal(item.unitPrice ?? 0);
    const discount = toDecimal(item.discount ?? 0);
    const tax = toDecimal(item.tax ?? 0);
    if (quantity.lte(0)) {
      throw badRequest(`items[${index}].quantity must be a positive number`, "invalid_invoice_item_quantity");
    }
    if (unitPrice.lt(0) || discount.lt(0) || tax.lt(0)) {
      throw badRequest(`items[${index}] prices, discounts and taxes must be non-negative`, "invalid_invoice_item_amount");
    }
    if (typeof item.description !== "string" || item.description.trim().length === 0) {
      throw badRequest(`items[${index}].description is required`, "invalid_invoice_item_description");
    }
    const total = quantity.mul(unitPrice).minus(discount).plus(tax);
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
    subtotal: normalizedItems.reduce((acc, item) => acc.plus(item.quantity.mul(item.unitPrice)), new Prisma.Decimal(0)),
    discountTotal: normalizedItems.reduce((acc, item) => acc.plus(item.discount), new Prisma.Decimal(0)),
    taxTotal: normalizedItems.reduce((acc, item) => acc.plus(item.tax), new Prisma.Decimal(0)),
    total: normalizedItems.reduce((acc, item) => acc.plus(item.total), new Prisma.Decimal(0)),
  };
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
  const totals = calculateInvoiceTotals(input.items);
  const createdById = optionalUserId(input.createdById);

  return input.prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        companyId,
        surgeryId: input.surgeryId ?? null,
        presupuestoId: input.presupuestoId ?? null,
        consumoId: input.consumoId ?? null,
        base,
        state: "Borrador",
        type: input.type ?? "FV",
        currency: input.currency ?? "ARS",
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paidTotal: new Prisma.Decimal(0),
        balance: totals.total,
        createdById,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | undefined,
        items: { create: totals.items },
      },
      select: invoiceReadSelect,
    });

    if ((base === "consumo" || base === "mixto") && input.consumoId) {
      await markConsumoAsFacturado({ companyId, consumoId: input.consumoId, updatedById: createdById ?? undefined, prisma: tx as unknown as PrismaClient });
    }

    if (createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: createdById,
        entityType: "Invoice",
        entityId: created.id,
        action: "invoice_created",
        module: "invoice",
        oldValue: null,
        newValue: serializeInvoiceForAudit(created),
      });
    }
    return created;
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
        const current = await tx.invoice.findFirst({ where: { id: input.invoiceId, companyId }, select: { id: true, state: true, companyId: true } });
        requireCompanyMatch(current, companyId, input.invoiceId);
        if (current.state !== "Borrador") throw new InvoiceError("invoice_not_borrador", `Cannot emit invoice in state ${current.state}`, 409);
        const visibleNumber = await getNextVisibleNumber(tx, companyId);
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

export async function updateInvoiceState(input: UpdateInvoiceStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);
  if (!isInvoiceState(input.newState)) throw badRequest(`newState must be one of: ${(INVOICE_STATES as readonly string[]).join(", ")}`, "invalid_invoice_state");
  const current = await input.prisma.invoice.findFirst({ where: { id: input.invoiceId, companyId }, select: { id: true, state: true, companyId: true } });
  requireCompanyMatch(current, companyId, input.invoiceId);
  const currentState = current.state as InvoiceState;
  const newState = input.newState as InvoiceState;
  if (currentState === newState) throw new InvoiceError("invoice_state_unchanged", `Invoice state is already ${newState}`, 409);
  if (!((INVOICE_TRANSITIONS[currentState] ?? []) as readonly string[]).includes(newState)) throw new InvoiceError("invalid_invoice_transition", `Invalid invoice state transition: ${currentState} -> ${newState}`, 409);
  return input.prisma.$transaction(async (tx) => {
    const result = await tx.invoice.update({ where: { id: input.invoiceId }, data: { state: newState, cancelledAt: newState === "Anulada" ? new Date() : undefined, updatedById }, select: invoiceReadSelect });
    if (updatedById) await createAuditEvent({ prisma: tx as unknown as PrismaClient, companyId, userId: updatedById, entityType: "Invoice", entityId: result.id, action: "invoice_state_changed", module: "invoice", oldValue: { state: currentState }, newValue: { state: newState } });
    return result;
  });
}

export async function recomputeInvoicePaymentState(input: RecomputeInvoicePaymentStateInput) {
  const companyId = requireCompanyId(input.companyId);
  const db = input.prisma;
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
  const current = await input.prisma.invoice.findFirst({ where: { id: input.invoiceId, companyId }, select: { id: true, state: true, companyId: true, createdById: true } });
  requireCompanyMatch(current, companyId, input.invoiceId);
  if (current.state !== "Borrador") throw new InvoiceError("invoice_not_deletable", `Cannot delete invoice in state ${current.state} (only Borrador)`, 409);
  return input.prisma.$transaction(async (tx) => {
    await tx.invoice.delete({ where: { id: input.invoiceId } });
    if (current.createdById) await createAuditEvent({ prisma: tx as unknown as PrismaClient, companyId, userId: current.createdById, entityType: "Invoice", entityId: input.invoiceId, action: "invoice_deleted", module: "invoice", oldValue: { id: input.invoiceId, state: current.state }, newValue: null });
    return { id: input.invoiceId, deleted: true };
  });
}

export type InvoiceRead = PrismaInvoice;
