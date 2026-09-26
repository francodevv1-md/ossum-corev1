import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { requireCompanyId } from "../tenant";
import {
  FISCAL_DEV_ONLY_ENVIRONMENT,
  fiscalDevOnlyPolicySchema,
  type FiscalDevOnlyPolicy,
} from "../validators/fiscal";

export const FISCAL_CANCELLATION_GUARD_STATES = ["SUBMITTED", "PENDING", "UNKNOWN", "AUTHORIZED"] as const;
const FISCAL_ELIGIBLE_INVOICE_STATES = ["Emitida", "Parcialmente_cobrada", "Cobrada"] as const;

export class FiscalError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "FiscalError";
    this.code = code;
    this.status = status;
  }
}

type FiscalInvoice = {
  id: string;
  visibleNumber: number | null;
  companyId: string;
  state: string;
  type: string;
  currency: string;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  items: Array<{
    description: string;
    quantity: Prisma.Decimal;
    unit: string | null;
    unitPrice: Prisma.Decimal;
    discount: Prisma.Decimal;
    tax: Prisma.Decimal;
    total: Prisma.Decimal;
  }>;
};

export type FiscalSnapshot = ReturnType<typeof buildDevOnlyFiscalSnapshot>;

export interface CreateDevOnlyFiscalDocumentInput {
  companyId: string;
  invoiceId: string;
  policy: FiscalDevOnlyPolicy;
  createdById?: string;
  prisma: PrismaClient;
}

function decimal(value: Prisma.Decimal) {
  return value.toFixed(4);
}

function snapshotHash(snapshot: FiscalSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function buildDevOnlyFiscalSnapshot(invoice: FiscalInvoice, policyInput: FiscalDevOnlyPolicy) {
  const policy = fiscalDevOnlyPolicySchema.parse(policyInput);
  if (!(FISCAL_ELIGIBLE_INVOICE_STATES as readonly string[]).includes(invoice.state)) {
    throw new FiscalError("fiscal_invoice_not_emitted", `Invoice ${invoice.id} is not operationally emitted`, 422);
  }
  if (invoice.currency !== "ARS") {
    throw new FiscalError("fiscal_currency_not_supported", `Invoice ${invoice.id} currency must be ARS for DEV_ONLY issuance`, 422);
  }
  if (!invoice.items.length) {
    throw new FiscalError("fiscal_invoice_empty", `Invoice ${invoice.id} has no items`, 422);
  }

  return {
    environment: FISCAL_DEV_ONLY_ENVIRONMENT,
    policy,
    invoice: {
      id: invoice.id,
      visibleNumber: invoice.visibleNumber,
      type: invoice.type,
      currency: invoice.currency,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: decimal(item.quantity),
      unit: item.unit,
      unitPrice: decimal(item.unitPrice),
      discount: decimal(item.discount),
      tax: decimal(item.tax),
      total: decimal(item.total),
      ivaRate: policy.ivaRate,
    })),
    totals: {
      subtotal: decimal(invoice.subtotal),
      discountTotal: decimal(invoice.discountTotal),
      taxTotal: decimal(invoice.taxTotal),
      total: decimal(invoice.total),
    },
  } as const;
}

async function lockInvoiceRow(tx: Prisma.TransactionClient, companyId: string, invoiceId: string) {
  await tx.$queryRaw`SELECT "id" FROM "invoice" WHERE "id" = ${invoiceId} AND "companyId" = ${companyId} FOR UPDATE`;
}

export async function assertFiscalCancellationAllowed(
  tx: Prisma.TransactionClient,
  companyId: string,
  invoiceId: string,
) {
  const activeDocument = await tx.fiscalDocument.findFirst({
    where: {
      companyId,
      invoiceId,
      state: { in: [...FISCAL_CANCELLATION_GUARD_STATES] },
    },
    select: { id: true, state: true },
  });
  if (activeDocument) {
    throw new FiscalError(
      "fiscal_cancellation_blocked",
      `Invoice ${invoiceId} cannot be operationally cancelled while fiscal evidence is ${activeDocument.state}`,
    );
  }
}

export async function createDevOnlyFiscalDocument(input: CreateDevOnlyFiscalDocumentInput) {
  const companyId = requireCompanyId(input.companyId);
  const policy = fiscalDevOnlyPolicySchema.parse(input.policy);

  return input.prisma.$transaction(async (tx) => {
    await lockInvoiceRow(tx, companyId, input.invoiceId);
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, companyId },
      select: {
        id: true,
        visibleNumber: true,
        companyId: true,
        state: true,
        type: true,
        currency: true,
        subtotal: true,
        discountTotal: true,
        taxTotal: true,
        total: true,
        items: {
          select: {
            description: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            discount: true,
            tax: true,
            total: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!invoice) throw new FiscalError("fiscal_invoice_not_found", `Invoice ${input.invoiceId} not found in company ${companyId}`, 404);

    const existing = await tx.fiscalDocument.findUnique({ where: { invoiceId: input.invoiceId }, select: { id: true } });
    if (existing) throw new FiscalError("fiscal_document_already_exists", `Invoice ${input.invoiceId} already has fiscal evidence`);

    const snapshot = buildDevOnlyFiscalSnapshot(invoice, policy);
    const hash = snapshotHash(snapshot);
    const externalReference = `ossum-dev-${companyId}-${input.invoiceId}-${hash.slice(0, 16)}`;
    const payload = snapshot as unknown as Prisma.InputJsonValue;

    return tx.fiscalDocument.create({
      data: {
        companyId,
        invoiceId: input.invoiceId,
        environment: FISCAL_DEV_ONLY_ENVIRONMENT,
        state: "READY",
        externalReference,
        snapshotHash: hash,
        snapshot: payload,
        createdById: input.createdById ?? null,
        attempts: {
          create: {
            companyId,
            attemptNumber: 1,
            state: "READY",
            externalReference,
            requestPayload: payload,
          },
        },
      },
      include: { attempts: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
