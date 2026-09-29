import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { badRequest, notFound, forbidden } from "../api/errors";
import { requireCompanyId } from "../tenant";
import { createAuditEvent } from "../audit";
import { formatDateToAr } from "./fiscal-tusfacturas.service";
import type {
  CreateAdjustmentDocumentInput,
  AdjustmentDocumentFilterInput,
} from "../validators/adjustment-document";

export class AdjustmentDocumentError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "AdjustmentDocumentError";
    this.code = code;
    this.status = status;
  }
}

export async function listAdjustmentDocuments(
  prisma: PrismaClient,
  companyId: string,
  filters: AdjustmentDocumentFilterInput = { page: 1, limit: 50 },
) {
  requireCompanyId(companyId);

  const where: Prisma.AdjustmentDocumentWhereInput = {
    companyId,
  };

  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.state) {
    where.state = filters.state;
  }
  if (filters.originType) {
    where.originType = filters.originType;
  }
  if (filters.internalInvoiceId) {
    where.internalInvoiceId = filters.internalInvoiceId;
  }
  if (filters.issuedFrom || filters.issuedTo) {
    where.createdAt = {};
    if (filters.issuedFrom) {
      where.createdAt.gte = new Date(filters.issuedFrom);
    }
    if (filters.issuedTo) {
      where.createdAt.lte = new Date(`${filters.issuedTo}T23:59:59.999Z`);
    }
  }

  if (filters.search && filters.search.trim() !== "") {
    const q = filters.search.trim();
    where.OR = [
      { motivo: { contains: q, mode: "insensitive" } },
      { observaciones: { contains: q, mode: "insensitive" } },
      { clientName: { contains: q, mode: "insensitive" } },
      { internalInvoice: { visibleNumber: Number(q.replace(/\D/g, "")) || undefined } },
    ];
  }

  const take = Math.min(filters.limit || 50, 100);
  const page = Math.max(filters.page || 1, 1);
  const skip = (page - 1) * take;

  const [totalItems, items, allDocsForKpis] = await Promise.all([
    prisma.adjustmentDocument.count({ where }),
    prisma.adjustmentDocument.findMany({
      where,
      include: {
        internalInvoice: {
          select: {
            id: true,
            visibleNumber: true,
            state: true,
            total: true,
            balance: true,
            issuedAt: true,
          },
        },
        items: true,
        fiscalDocument: {
          select: {
            id: true,
            state: true,
            externalReference: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.adjustmentDocument.findMany({
      where: { companyId },
      select: { type: true, state: true, total: true },
    }),
  ]);

  // Cálculo de KPIs
  let creditCount = 0;
  let creditTotal = new Prisma.Decimal(0);
  let debitCount = 0;
  let debitTotal = new Prisma.Decimal(0);

  for (const doc of allDocsForKpis) {
    if (doc.type === "CREDITO") {
      creditCount++;
      if (doc.state === "Emitida") creditTotal = creditTotal.add(doc.total);
    } else {
      debitCount++;
      if (doc.state === "Emitida") debitTotal = debitTotal.add(doc.total);
    }
  }

  const netImpact = debitTotal.sub(creditTotal);

  return {
    data: items,
    kpis: {
      creditCount,
      creditTotal: creditTotal.toFixed(4),
      debitCount,
      debitTotal: debitTotal.toFixed(4),
      netImpact: netImpact.toFixed(4),
      totalCount: allDocsForKpis.length,
    },
    pagination: {
      page,
      limit: take,
      totalItems,
      totalPages: Math.ceil(totalItems / take) || 1,
    },
  };
}

export async function getAdjustmentDocumentById(
  prisma: PrismaClient,
  companyId: string,
  id: string,
) {
  requireCompanyId(companyId);

  const doc = await prisma.adjustmentDocument.findFirst({
    where: { id, companyId },
    include: {
      internalInvoice: {
        include: {
          items: true,
          surgery: true,
        },
      },
      items: true,
      surgery: true,
      fiscalDocument: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!doc) {
    throw notFound(`Documento de ajuste ${id} no encontrado`, "adjustment_not_found");
  }

  return doc;
}

export interface InvoiceAdjustmentSummary {
  invoiceId: string;
  invoiceTotal: Prisma.Decimal;
  paidTotal: Prisma.Decimal;
  currentBalance: Prisma.Decimal;
  previousCreditTotal: Prisma.Decimal;
  previousDebitTotal: Prisma.Decimal;
  availableToCredit: Prisma.Decimal;
  projectedNewBalance: Prisma.Decimal;
  pendingResolutionCredit: Prisma.Decimal;
}

export async function getInvoiceAdjustmentSummary(
  prisma: PrismaClient,
  companyId: string,
  invoiceId: string,
  currentDocIdToExclude?: string,
): Promise<InvoiceAdjustmentSummary> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });

  if (!invoice) {
    throw notFound(`Factura ${invoiceId} no encontrada`, "invoice_not_found");
  }

  const adjustments = await prisma.adjustmentDocument.findMany({
    where: {
      companyId,
      internalInvoiceId: invoiceId,
      state: "Emitida",
      ...(currentDocIdToExclude ? { id: { not: currentDocIdToExclude } } : {}),
    },
    select: { type: true, total: true },
  });

  let previousCreditTotal = new Prisma.Decimal(0);
  let previousDebitTotal = new Prisma.Decimal(0);

  for (const adj of adjustments) {
    if (adj.type === "CREDITO") {
      previousCreditTotal = previousCreditTotal.add(adj.total);
    } else {
      previousDebitTotal = previousDebitTotal.add(adj.total);
    }
  }

  const totalAjustable = invoice.total.add(previousDebitTotal);
  let availableToCredit = totalAjustable.sub(previousCreditTotal);
  if (availableToCredit.lessThan(0)) availableToCredit = new Prisma.Decimal(0);

  const netNet = totalAjustable.sub(previousCreditTotal);
  let projectedNewBalance = netNet.sub(invoice.paidTotal);
  if (projectedNewBalance.lessThan(0)) projectedNewBalance = new Prisma.Decimal(0);

  let pendingResolutionCredit = invoice.paidTotal.sub(netNet);
  if (pendingResolutionCredit.lessThan(0)) pendingResolutionCredit = new Prisma.Decimal(0);

  return {
    invoiceId,
    invoiceTotal: invoice.total,
    paidTotal: invoice.paidTotal,
    currentBalance: invoice.balance,
    previousCreditTotal,
    previousDebitTotal,
    availableToCredit,
    projectedNewBalance,
    pendingResolutionCredit,
  };
}

export async function createAdjustmentDocument(
  prisma: PrismaClient,
  companyId: string,
  input: CreateAdjustmentDocumentInput,
  userId?: string | null,
  userRole?: string | null,
) {
  requireCompanyId(companyId);

  // Invariante Origen Período: Exclusivo Admin
  if (input.originType === "PERIOD") {
    if (userRole && userRole !== "admin") {
      throw forbidden("La emisión de ajustes por período está restringida exclusivamente a usuarios administradores.", "period_adjustment_admin_only");
    }
  }

  // Invariante Origen Interno: Factura debe existir, pertenecer a la empresa y estar Emitida
  let surgeryId = input.surgeryId || null;
  let clientName = input.clientName || null;
  let clientDocumentType = input.clientDocumentType || null;
  let clientDocumentNumber = input.clientDocumentNumber || null;
  let clientVatCondition = input.clientVatCondition || null;
  let internalInvoiceRef: { id: string; visibleNumber: number | null; total: Prisma.Decimal; balance: Prisma.Decimal } | null = null;

  if (input.originType === "INTERNAL_INVOICE" && input.internalInvoiceId) {
    const internalInv = await prisma.invoice.findFirst({
      where: { id: input.internalInvoiceId, companyId },
      include: { surgery: true },
    });

    if (!internalInv) {
      throw notFound(`Factura origen ${input.internalInvoiceId} no encontrada`, "origin_invoice_not_found");
    }

    if (internalInv.state !== "Emitida" && internalInv.state !== "Parcialmente_cobrada") {
      throw badRequest(`La factura origen debe estar Emitida (estado actual: ${internalInv.state})`, "origin_invoice_not_emitted");
    }

    surgeryId = internalInv.surgeryId;
    internalInvoiceRef = {
      id: internalInv.id,
      visibleNumber: internalInv.visibleNumber,
      total: internalInv.total,
      balance: internalInv.balance,
    };

    if (internalInv.metadata && typeof internalInv.metadata === "object") {
      const meta = internalInv.metadata as Record<string, unknown>;
      if (!clientName && typeof meta.clientName === "string") clientName = meta.clientName;
    }
  }

  // Cálculo de totales de los ítems
  let computedSubtotal = new Prisma.Decimal(0);
  let computedTaxTotal = new Prisma.Decimal(0);
  let computedTotal = new Prisma.Decimal(0);

  const itemsData = input.items.map((it) => {
    const qty = new Prisma.Decimal(it.quantity);
    const unitPrice = new Prisma.Decimal(it.unitPrice);
    const discount = new Prisma.Decimal(it.discount || 0);
    const vatRate = new Prisma.Decimal(it.vatRate || 21);

    const subtotal = qty.mul(unitPrice).mul(new Prisma.Decimal(1).sub(discount.div(100)));
    const tax = subtotal.mul(vatRate.div(100));
    const lineTotal = subtotal.add(tax);

    computedSubtotal = computedSubtotal.add(subtotal);
    computedTaxTotal = computedTaxTotal.add(tax);
    computedTotal = computedTotal.add(lineTotal);

    return {
      description: it.description.trim(),
      quantity: qty,
      unitPrice,
      discount,
      tax,
      total: lineTotal,
      vatTreatment: it.vatTreatment || "GRAVADO",
      vatRate,
      originalQuantity: it.originalQuantity ? new Prisma.Decimal(it.originalQuantity) : null,
      sourceItemId: it.sourceItemId || null,
    };
  });

  // Regla de Límite de NC Acumulada sobre Factura Interna
  if (input.originType === "INTERNAL_INVOICE" && input.internalInvoiceId && input.type === "CREDITO") {
    const summary = await getInvoiceAdjustmentSummary(prisma, companyId, input.internalInvoiceId);
    if (computedTotal.greaterThan(summary.availableToCredit)) {
      throw badRequest(
        `El importe de la Nota de Crédito ($${computedTotal.toFixed(2)}) supera el total disponible para acreditar ($${summary.availableToCredit.toFixed(2)}) de la factura.`,
        "credit_limit_exceeded",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const doc = await tx.adjustmentDocument.create({
      data: {
        companyId,
        type: input.type,
        state: "Borrador",
        originType: input.originType,
        internalInvoiceId: input.originType === "INTERNAL_INVOICE" ? input.internalInvoiceId : null,

        // Snapshot inmutable de comprobante externo
        externalDocType: input.originType === "EXTERNAL_INVOICE" ? input.externalDocType : null,
        externalPtoVta: input.originType === "EXTERNAL_INVOICE" ? input.externalPtoVta : null,
        externalNumber: input.originType === "EXTERNAL_INVOICE" ? input.externalNumber : null,
        externalIssueDate: input.originType === "EXTERNAL_INVOICE" && input.externalIssueDate ? new Date(input.externalIssueDate) : null,
        externalIssuerCuit: input.originType === "EXTERNAL_INVOICE" ? input.externalIssuerCuit : null,
        externalCae: input.originType === "EXTERNAL_INVOICE" ? input.externalCae : null,

        // Período
        periodFrom: input.originType === "PERIOD" && input.periodFrom ? new Date(input.periodFrom) : null,
        periodTo: input.originType === "PERIOD" && input.periodTo ? new Date(input.periodTo) : null,

        surgeryId,
        clientName,
        clientDocumentType,
        clientDocumentNumber,
        clientVatCondition,

        modalidad: input.modalidad,
        motivo: input.motivo,
        observaciones: input.observaciones || null,

        currency: input.currency || "ARS",
        subtotal: computedSubtotal,
        taxTotal: computedTaxTotal,
        total: computedTotal,

        createdById: userId || null,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
        internalInvoice: true,
      },
    });

    return doc;
  });
}

export async function emitAdjustmentDocument(
  prisma: PrismaClient,
  companyId: string,
  id: string,
  userId?: string | null,
) {
  requireCompanyId(companyId);

  return prisma.$transaction(async (tx) => {
    const doc = await tx.adjustmentDocument.findFirst({
      where: { id, companyId },
      include: {
        items: true,
        internalInvoice: true,
      },
    });

    if (!doc) {
      throw notFound(`Documento de ajuste ${id} no encontrado`, "adjustment_not_found");
    }

    if (doc.state !== "Borrador") {
      throw badRequest(`Solo se pueden emitir documentos en estado Borrador (estado actual: ${doc.state})`, "adjustment_already_emitted");
    }

    // Regla de Límite de NC Acumulada al emitir
    if (doc.originType === "INTERNAL_INVOICE" && doc.internalInvoiceId && doc.type === "CREDITO") {
      const summary = await getInvoiceAdjustmentSummary(tx as PrismaClient, companyId, doc.internalInvoiceId, doc.id);
      if (doc.total.greaterThan(summary.availableToCredit)) {
        throw badRequest(
          `El importe de la Nota de Crédito ($${doc.total.toFixed(2)}) supera el total disponible para acreditar ($${summary.availableToCredit.toFixed(2)}) de la factura.`,
          "credit_limit_exceeded",
        );
      }
    }

    // Obtener siguiente visibleNumber correlativo atómico
    const maxVisible = await tx.adjustmentDocument.aggregate({
      where: { companyId },
      _max: { visibleNumber: true },
    });
    const nextVisibleNumber = (maxVisible._max.visibleNumber ?? 0) + 1;

    // Regla de Balance Server-Side:
    // Si es Factura Interna OSSUM: recalcular Invoice.balance
    // Si es Comprobante Externo o Período: NO tocar Invoice.balance
    if (doc.originType === "INTERNAL_INVOICE" && doc.internalInvoiceId && doc.internalInvoice) {
      const invoice = doc.internalInvoice;
      const currentBalance = invoice.balance;
      let newBalance = currentBalance;

      if (doc.type === "CREDITO") {
        newBalance = currentBalance.sub(doc.total);
        if (newBalance.lessThan(0)) {
          newBalance = new Prisma.Decimal(0);
        }
      } else {
        newBalance = currentBalance.add(doc.total);
      }

      await tx.invoice.update({
        where: { id: doc.internalInvoiceId },
        data: {
          balance: newBalance,
          updatedById: userId || null,
        },
      });
    }

    const issuedAt = new Date();

    const emittedDoc = await tx.adjustmentDocument.update({
      where: { id },
      data: {
        visibleNumber: nextVisibleNumber,
        state: "Emitida",
        issuedAt,
        updatedById: userId || null,
      },
      include: {
        items: true,
        internalInvoice: true,
        fiscalDocument: true,
      },
    });

    return emittedDoc;
  });
}

export async function voidAdjustmentDocument(
  prisma: PrismaClient,
  companyId: string,
  id: string,
  userId?: string | null,
) {
  requireCompanyId(companyId);

  return prisma.$transaction(async (tx) => {
    const doc = await tx.adjustmentDocument.findFirst({
      where: { id, companyId },
      include: {
        internalInvoice: true,
        fiscalDocument: true,
      },
    });

    if (!doc) {
      throw notFound(`Documento de ajuste ${id} no encontrado`, "adjustment_not_found");
    }

    if (doc.state === "Anulada") {
      throw badRequest("El documento ya se encuentra anulado", "adjustment_already_voided");
    }

    // Revertir balance si fue emitida internamente
    if (doc.state === "Emitida" && doc.originType === "INTERNAL_INVOICE" && doc.internalInvoiceId && doc.internalInvoice) {
      const currentBalance = doc.internalInvoice.balance;
      let revertedBalance = currentBalance;

      if (doc.type === "CREDITO") {
        // Revertir crédito = reincorporar saldo
        revertedBalance = currentBalance.add(doc.total);
      } else {
        // Revertir débito = descontar saldo agregado
        revertedBalance = currentBalance.sub(doc.total);
        if (revertedBalance.lessThan(0)) revertedBalance = new Prisma.Decimal(0);
      }

      await tx.invoice.update({
        where: { id: doc.internalInvoiceId },
        data: {
          balance: revertedBalance,
          updatedById: userId || null,
        },
      });
    }

    const voidedDoc = await tx.adjustmentDocument.update({
      where: { id },
      data: {
        state: "Anulada",
        cancelledAt: new Date(),
        updatedById: userId || null,
      },
      include: {
        items: true,
        internalInvoice: true,
      },
    });

    return voidedDoc;
  });
}
