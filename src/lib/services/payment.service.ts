// OSSUM COR — Payment service (Fase 1D)
// Cobros independientes con imputación formal a facturas por invoiceId FK real.

import { InternalNotificationType, Prisma } from "@prisma/client";
import type { PrismaClient, Payment as PrismaPayment } from "@prisma/client";

import { createAuditEvent } from "../audit";
import { badRequest, notFound } from "../api/errors";
import { requireCompanyId } from "../tenant";
import { recomputeInvoicePaymentState } from "./invoice.service";
import { emitCrossDomainNotification } from "./internal-notifications.service";

export const PAYMENT_STATES = ["Registrado", "Anulado"] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export const PAYMENT_METHODS = ["transfer", "cash", "check", "other"] as const;

export const PAYMENT_MUTATION_ROLES = ["admin", "coordinador", "vendedor"] as const;
export const PAYMENT_READ_ROLES = ["admin", "coordinador", "vendedor"] as const;

const DEFAULT_LIST_TAKE = 50;

export class PaymentError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.status = status;
  }
}

function toDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function optionalUserId(userId: string | undefined): string | null {
  return userId ?? null;
}

const paymentReadSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  surgeryId: true,
  state: true,
  method: true,
  currency: true,
  amount: true,
  receivedAt: true,
  createdById: true,
  updatedById: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  imputations: {
    select: {
      id: true,
      invoiceId: true,
      amount: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PaymentSelect;

function requireCompanyMatch(payment: { companyId: string } | null, companyId: string, paymentId: string): asserts payment {
  if (!payment || payment.companyId !== companyId) {
    throw notFound(`Payment ${paymentId} not found in company ${companyId}`, "payment_not_found");
  }
}

async function getNextVisibleNumber(tx: Prisma.TransactionClient, companyId: string): Promise<number> {
  await tx.$executeRaw`LOCK TABLE "payment" IN SHARE ROW EXCLUSIVE MODE`;
  const rows = await tx.$queryRaw<Array<{ next: bigint | number | null }>>`
    SELECT COALESCE(MAX("visibleNumber"), 0) + 1 AS "next"
    FROM "payment"
    WHERE "companyId" = ${companyId}
  `;
  const next = Number(rows[0]?.next ?? 1);
  if (!Number.isFinite(next) || next <= 0) throw new PaymentError("payment_visible_number_failed", "Failed to allocate next visible number");
  return next;
}

export interface PaymentImputationInput {
  invoiceId: string;
  amount: number | string | Prisma.Decimal;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentInput {
  companyId: string;
  surgeryId?: string;
  method?: string;
  currency?: string;
  amount: number | string | Prisma.Decimal;
  receivedAt?: Date;
  imputations?: PaymentImputationInput[];
  createdById?: string;
  metadata?: Record<string, unknown> | null;
  prisma: PrismaClient;
}

export interface ListPaymentsInput {
  companyId: string;
  surgeryId?: string;
  state?: string;
  fromDate?: Date;
  toDate?: Date;
  take?: number;
  skip?: number;
  prisma: PrismaClient;
}

export interface GetPaymentInput {
  companyId: string;
  paymentId: string;
  prisma: PrismaClient;
}

export interface CancelPaymentInput extends GetPaymentInput {
  updatedById?: string;
}

function isPaymentState(value: string): value is PaymentState {
  return (PAYMENT_STATES as readonly string[]).includes(value);
}

function normalizeImputations(imputations: PaymentImputationInput[] | undefined) {
  const rows = imputations ?? [];
  const seen = new Set<string>();
  return rows.map((row, index) => {
    if (!row.invoiceId) throw badRequest(`imputations[${index}].invoiceId is required`, "payment_imputation_invoice_required");
    if (seen.has(row.invoiceId)) throw badRequest(`duplicate invoiceId in imputations: ${row.invoiceId}`, "payment_duplicate_invoice_imputation");
    seen.add(row.invoiceId);
    const amount = toDecimal(row.amount);
    if (amount.lte(0)) throw badRequest(`imputations[${index}].amount must be positive`, "invalid_payment_imputation_amount");
    return { invoiceId: row.invoiceId, amount, metadata: (row.metadata ?? null) as Prisma.InputJsonValue | undefined };
  });
}

export async function createPayment(input: CreatePaymentInput) {
  const companyId = requireCompanyId(input.companyId);
  const amount = toDecimal(input.amount);
  if (amount.lte(0)) throw badRequest("amount must be positive", "invalid_payment_amount");

  if (input.surgeryId) {
    const surgery = await input.prisma.surgery.findFirst({ where: { id: input.surgeryId, companyId }, select: { id: true } });
    if (!surgery) throw notFound(`Surgery ${input.surgeryId} not found in company ${companyId}`, "surgery_not_found");
  }

  const imputations = normalizeImputations(input.imputations);
  const totalImputed = imputations.reduce((acc, row) => acc.plus(row.amount), new Prisma.Decimal(0));
  if (totalImputed.gt(amount)) throw badRequest("total imputations cannot exceed payment amount", "payment_imputation_exceeds_amount");

  const invoiceIds = imputations.map((row) => row.invoiceId);
  if (invoiceIds.length > 0) {
    const invoices = await input.prisma.invoice.findMany({ where: { id: { in: invoiceIds }, companyId }, select: { id: true, balance: true, state: true } });
    const byId = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    for (const row of imputations) {
      const invoice = byId.get(row.invoiceId);
      if (!invoice) throw notFound(`Invoice ${row.invoiceId} not found in company ${companyId}`, "invoice_not_found");
      if (invoice.state === "Anulada" || invoice.state === "Borrador") throw new PaymentError("invoice_not_imputable", `Cannot impute invoice in state ${invoice.state}`, 409);
      if (row.amount.gt(invoice.balance)) throw new PaymentError("payment_over_imputation", `Imputation exceeds invoice balance for ${row.invoiceId}`, 409);
    }
  }

  const createdById = optionalUserId(input.createdById);
  return input.prisma.$transaction(async (tx) => {
    const visibleNumber = await getNextVisibleNumber(tx, companyId);
    const payment = await tx.payment.create({
      data: {
        visibleNumber,
        companyId,
        surgeryId: input.surgeryId ?? null,
        state: "Registrado",
        method: input.method ?? null,
        currency: input.currency ?? "ARS",
        amount,
        receivedAt: input.receivedAt ?? new Date(),
        createdById,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | undefined,
        imputations: {
          create: imputations.map((row) => ({ invoiceId: row.invoiceId, amount: row.amount, metadata: row.metadata })),
        },
      },
      select: paymentReadSelect,
    });

    for (const invoiceId of invoiceIds) {
      await recomputeInvoicePaymentState({ companyId, invoiceId, prisma: tx });
    }

    if (createdById) {
      await createAuditEvent({
        prisma: tx as unknown as PrismaClient,
        companyId,
        userId: createdById,
        entityType: "Payment",
        entityId: payment.id,
        action: "payment_created",
        module: "payment",
        oldValue: null,
        newValue: { id: payment.id, visibleNumber: payment.visibleNumber, amount: payment.amount.toString(), invoiceIds },
      });

      try {
        await emitCrossDomainNotification(tx, {
          companyId,
          actorUserId: createdById,
          type: InternalNotificationType.payment_recorded,
          domain: "COBROS",
          severity: "SUCCESS",
          title: `Cobro registrado: REC-${payment.visibleNumber || payment.id.slice(-6)}`,
          body: `Cobro por $${payment.amount.toString()} registrado con éxito.`,
          sourceEntityId: payment.id,
          linkHref: `/ventas/cobros`,
          metadata: { paymentId: payment.id, amount: payment.amount.toString(), method: payment.method },
        });
      } catch (e) {
        console.warn("[notification] Failed to emit payment_recorded notification", e);
      }
    }
    return payment;
  });
}

export async function listPayments(input: ListPaymentsInput) {
  const companyId = requireCompanyId(input.companyId);
  if (input.state !== undefined && !isPaymentState(input.state)) throw badRequest(`state must be one of: ${(PAYMENT_STATES as readonly string[]).join(", ")}`, "invalid_payment_state_filter");
  const where: Prisma.PaymentWhereInput = { companyId };
  if (input.surgeryId) where.surgeryId = input.surgeryId;
  if (input.state) where.state = input.state;
  if (input.fromDate || input.toDate) where.receivedAt = { ...(input.fromDate ? { gte: input.fromDate } : {}), ...(input.toDate ? { lte: input.toDate } : {}) };
  return input.prisma.payment.findMany({ select: paymentReadSelect, where, orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }], take: input.take ?? DEFAULT_LIST_TAKE, skip: input.skip ?? 0 });
}

export async function getPayment(input: GetPaymentInput) {
  const companyId = requireCompanyId(input.companyId);
  const payment = await input.prisma.payment.findFirst({ select: paymentReadSelect, where: { id: input.paymentId, companyId } });
  if (!payment) throw notFound(`Payment ${input.paymentId} not found in company ${companyId}`, "payment_not_found");
  return payment;
}

export async function cancelPayment(input: CancelPaymentInput) {
  const companyId = requireCompanyId(input.companyId);
  const updatedById = optionalUserId(input.updatedById);
  const current = await input.prisma.payment.findFirst({
    where: { id: input.paymentId, companyId },
    select: { id: true, companyId: true, state: true, imputations: { select: { invoiceId: true } } },
  });
  requireCompanyMatch(current, companyId, input.paymentId);
  if (current.state !== "Registrado") throw new PaymentError("payment_not_cancelable", `Cannot cancel payment in state ${current.state}`, 409);
  const invoiceIds = [...new Set(current.imputations.map((row) => row.invoiceId))];

  return input.prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({ where: { id: input.paymentId }, data: { state: "Anulado", updatedById }, select: paymentReadSelect });
    for (const invoiceId of invoiceIds) {
      await recomputeInvoicePaymentState({ companyId, invoiceId, prisma: tx });
    }
    if (updatedById) {
      await createAuditEvent({ prisma: tx as unknown as PrismaClient, companyId, userId: updatedById, entityType: "Payment", entityId: payment.id, action: "payment_cancelled", module: "payment", oldValue: { state: current.state }, newValue: { state: payment.state, invoiceIds } });

      try {
        await emitCrossDomainNotification(tx, {
          companyId,
          actorUserId: updatedById,
          type: InternalNotificationType.payment_cancelled,
          domain: "COBROS",
          severity: "WARNING",
          title: `Cobro anulado: REC-${payment.visibleNumber || payment.id.slice(-6)}`,
          body: `El cobro por $${payment.amount.toString()} fue anulado y los saldos revertidos.`,
          sourceEntityId: payment.id,
          linkHref: `/ventas/cobros`,
          metadata: { paymentId: payment.id, amount: payment.amount.toString() },
        });
      } catch (e) {
        console.warn("[notification] Failed to emit payment_cancelled notification", e);
      }
    }
    return payment;
  });
}

export type PaymentRead = PrismaPayment;
