import { Prisma, type PrismaClient, OrdenPagoState } from "@prisma/client";
import { createAuditEvent } from "../audit";
import { badRequest, conflict, notFound } from "../api/errors";
import { requireCompanyId } from "../tenant";

export const ORDEN_PAGO_STATES = ["Emitida", "Anulada"] as const;
export const ORDEN_PAGO_MUTATION_ROLES = ["admin", "coordinador", "vendedor"] as const;

export class OrdenPagoError extends Error {
  constructor(readonly code: string, message: string, readonly status = 409) {
    super(message);
    this.name = "OrdenPagoError";
  }
}

type Base = {
  companyId: string;
  prisma: PrismaClient;
  userId?: string;
};

const select = {
  id: true,
  visibleNumber: true,
  companyId: true,
  proveedorId: true,
  proveedorName: true,
  total: true,
  method: true,
  paymentDate: true,
  state: true,
  observaciones: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
  imputaciones: {
    select: {
      id: true,
      facturaCompraId: true,
      amount: true,
      createdAt: true,
      facturaCompra: {
        select: {
          id: true,
          number: true,
          date: true,
          total: true,
          state: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.OrdenPagoSelect;

type Row = Prisma.OrdenPagoGetPayload<{ select: typeof select }>;

const decimal = (v: string | number | Prisma.Decimal) =>
  (v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v)).toDecimalPlaces(
    4,
    Prisma.Decimal.ROUND_HALF_UP
  );

const serialize = (row: Row) => {
  const total = decimal(row.total);
  const totalImputado = row.imputaciones.reduce(
    (sum, imp) => sum.plus(decimal(imp.amount)),
    new Prisma.Decimal(0)
  );
  const saldoSinAplicar = total.minus(totalImputado);

  return {
    ...row,
    total: total.toString(),
    totalImputado: totalImputado.toString(),
    saldoSinAplicar: saldoSinAplicar.toString(),
    paymentDate: row.paymentDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    imputaciones: row.imputaciones.map((imp) => ({
      ...imp,
      amount: imp.amount.toString(),
      createdAt: imp.createdAt.toISOString(),
      facturaCompra: {
        ...imp.facturaCompra,
        date: imp.facturaCompra.date.toISOString(),
        total: imp.facturaCompra.total.toString(),
      },
    })),
  };
};

export type OrdenPagoApi = ReturnType<typeof serialize>;

export async function listOrdenesPago(
  input: Base & {
    state?: string;
    proveedorId?: string;
    take?: number;
    skip?: number;
  }
) {
  const companyId = requireCompanyId(input.companyId);

  const rows = await input.prisma.ordenPago.findMany({
    select,
    where: {
      companyId,
      ...(input.state ? { state: input.state as OrdenPagoState } : {}),
      ...(input.proveedorId ? { proveedorId: input.proveedorId } : {}),
    },
    orderBy: { paymentDate: "desc" },
    take: input.take ?? 100,
    skip: input.skip ?? 0,
  });

  return rows.map(serialize);
}

export async function getOrdenPago(input: Base & { ordenPagoId: string }) {
  const companyId = requireCompanyId(input.companyId);
  const row = await input.prisma.ordenPago.findFirst({
    select,
    where: { id: input.ordenPagoId, companyId },
  });

  if (!row) {
    throw notFound("Orden de pago no encontrada", "orden_pago_not_found");
  }

  return serialize(row);
}

export async function createOrdenPago(
  input: Base & {
    proveedorId: string;
    proveedorName: string;
    total: string | number | Prisma.Decimal;
    method?: string;
    paymentDate?: string | Date;
    observaciones?: string | null;
    imputaciones?: { facturaCompraId: string; amount: string | number | Prisma.Decimal }[];
  }
) {
  const companyId = requireCompanyId(input.companyId);
  const total = decimal(input.total);

  if (total.lte(0)) {
    throw badRequest("El monto total del pago debe ser mayor a 0", "orden_pago_invalid_total");
  }

  if (!input.proveedorId?.trim() || !input.proveedorName?.trim()) {
    throw badRequest("El proveedor es obligatorio", "orden_pago_invalid_supplier");
  }

  return input.prisma.$transaction(async (tx) => {
    // 1. Verify supplier existence in ContactCompanyLink
    const supplier = await tx.contactCompanyLink.findFirst({
      where: {
        companyId,
        contactId: input.proveedorId.trim(),
        isActive: true,
      },
    });

    if (!supplier) {
      throw badRequest(
        "El proveedor especificado no existe o no está activo en esta empresa",
        "orden_pago_supplier_not_found"
      );
    }

    // 2. Validate input imputations for duplicates before persistence
    const inputImputations = input.imputaciones ?? [];
    const seenFacturaIds = new Set<string>();
    for (const imp of inputImputations) {
      const fcId = imp.facturaCompraId?.trim();
      if (!fcId) {
        throw badRequest(
          "El ID de la factura de compra es obligatorio en cada imputación",
          "orden_pago_missing_factura_id"
        );
      }
      if (seenFacturaIds.has(fcId)) {
        throw badRequest(
          `No se puede imputar la misma factura de compra (${fcId}) más de una vez en la misma orden de pago`,
          "orden_pago_duplicate_invoice_imputation"
        );
      }
      seenFacturaIds.add(fcId);
    }

    // 3. Lock company row to avoid visibleNumber concurrency collisions
    await tx.$queryRaw`SELECT "id" FROM "company" WHERE "id" = ${companyId} FOR UPDATE`;

    const maxVisible = await tx.ordenPago.aggregate({
      where: { companyId },
      _max: { visibleNumber: true },
    });
    const visibleNumber = (maxVisible._max.visibleNumber ?? 0) + 1;

    // 4. Process imputations if provided
    let sumImputations = new Prisma.Decimal(0);
    const validatedImputations: { facturaCompraId: string; amount: Prisma.Decimal }[] = [];

    for (const imp of inputImputations) {
      const impAmount = decimal(imp.amount);
      if (impAmount.lte(0)) {
        throw badRequest(
          "El monto de cada imputación debe ser mayor a 0",
          "orden_pago_invalid_imputation_amount"
        );
      }

      // Lock and fetch FacturaCompra
      await tx.$queryRaw`SELECT "id" FROM "factura_compra" WHERE "id" = ${imp.facturaCompraId} AND "company_id" = ${companyId} FOR UPDATE`;

      const factura = await tx.facturaCompra.findFirst({
        where: { id: imp.facturaCompraId, companyId },
        include: {
          imputaciones: {
            where: {
              ordenPago: { state: "Emitida" },
            },
          },
        },
      });

      if (!factura) {
        throw notFound(
          `Factura de compra ${imp.facturaCompraId} no encontrada`,
          "factura_compra_not_found"
        );
      }

      if (factura.proveedorId !== input.proveedorId.trim()) {
        throw badRequest(
          `La factura ${factura.number} pertenece a otro proveedor`,
          "factura_compra_different_supplier"
        );
      }

      if (factura.state === "Anulada") {
        throw conflict(
          `No se puede imputar a una factura anulada (${factura.number})`,
          "factura_compra_already_annulled"
        );
      }

      // Calculate existing paid balance
      const alreadyPaid = factura.imputaciones.reduce(
        (sum, existingImp) => sum.plus(decimal(existingImp.amount)),
        new Prisma.Decimal(0)
      );
      const remainingBalance = decimal(factura.total).minus(alreadyPaid);

      if (impAmount.gt(remainingBalance)) {
        throw conflict(
          `El monto imputado ($${impAmount}) supera el saldo pendiente ($${remainingBalance}) de la factura ${factura.number}`,
          "imputation_exceeds_invoice_balance"
        );
      }

      sumImputations = sumImputations.plus(impAmount);
      validatedImputations.push({
        facturaCompraId: imp.facturaCompraId,
        amount: impAmount,
      });
    }

    if (sumImputations.gt(total)) {
      throw conflict(
        `El total de imputaciones ($${sumImputations}) no puede superar el monto de la orden de pago ($${total})`,
        "imputations_exceed_payment_total"
      );
    }

    // 4. Create OrdenPago
    const paymentDate = input.paymentDate
      ? input.paymentDate instanceof Date
        ? input.paymentDate
        : new Date(input.paymentDate)
      : new Date();

    const created = await tx.ordenPago.create({
      select,
      data: {
        visibleNumber,
        companyId,
        proveedorId: input.proveedorId.trim(),
        proveedorName: input.proveedorName.trim(),
        total,
        method: input.method || "transfer",
        paymentDate,
        state: "Emitida",
        observaciones: input.observaciones?.trim() || null,
        createdById: input.userId || null,
        imputaciones: {
          create: validatedImputations.map((imp) => ({
            companyId,
            facturaCompraId: imp.facturaCompraId,
            amount: imp.amount,
          })),
        },
      },
    });

    // 5. Update state of fully paid invoices
    for (const imp of validatedImputations) {
      const allImps = await tx.ordenPagoImputacion.findMany({
        where: {
          companyId,
          facturaCompraId: imp.facturaCompraId,
          ordenPago: { state: "Emitida" },
        },
      });

      const totalPaid = allImps.reduce(
        (sum, currentImp) => sum.plus(decimal(currentImp.amount)),
        new Prisma.Decimal(0)
      );

      const fc = await tx.facturaCompra.findFirst({
        where: { id: imp.facturaCompraId, companyId },
        select: { id: true, total: true, state: true },
      });

      if (fc && totalPaid.gte(decimal(fc.total))) {
        await tx.facturaCompra.update({
          where: { id: fc.id },
          data: {
            state: "Pagada",
            pagadaAt: new Date(),
          },
        });
      }
    }

    // 6. Audit
    if (input.userId) {
      await createAuditEvent({
        prisma: tx as PrismaClient,
        companyId,
        userId: input.userId,
        entityType: "OrdenPago",
        entityId: created.id,
        action: "orden_pago_created",
        module: "compras",
        newValue: {
          visibleNumber: created.visibleNumber,
          proveedorName: created.proveedorName,
          total: created.total.toString(),
          imputacionesCount: validatedImputations.length,
        },
      });
    }

    return serialize(created);
  });
}

export async function cancelOrdenPago(
  input: Base & { ordenPagoId: string; motivo?: string }
) {
  const companyId = requireCompanyId(input.companyId);

  return input.prisma.$transaction(async (tx) => {
    // 1. Lock and load
    await tx.$queryRaw`SELECT "id" FROM "orden_pago" WHERE "id" = ${input.ordenPagoId} AND "company_id" = ${companyId} FOR UPDATE`;

    const existing = await tx.ordenPago.findFirst({
      where: { id: input.ordenPagoId, companyId },
      include: {
        imputaciones: true,
      },
    });

    if (!existing) {
      throw notFound("Orden de pago no encontrada", "orden_pago_not_found");
    }

    if (existing.state === "Anulada") {
      throw conflict(
        "La orden de pago ya se encuentra anulada",
        "orden_pago_already_cancelled"
      );
    }

    // 2. Mark as Anulada
    const updated = await tx.ordenPago.update({
      where: { id: existing.id },
      select,
      data: {
        state: "Anulada",
        observaciones: input.motivo
          ? `Anulada: ${input.motivo}`
          : existing.observaciones,
        updatedById: input.userId || null,
      },
    });

    // 3. Recompute invoices that were paid by this OrdenPago
    const touchedInvoiceIds = [
      ...new Set(existing.imputaciones.map((imp) => imp.facturaCompraId)),
    ];

    for (const facturaId of touchedInvoiceIds) {
      const activeImps = await tx.ordenPagoImputacion.findMany({
        where: {
          companyId,
          facturaCompraId: facturaId,
          ordenPago: { state: "Emitida" },
        },
      });

      const totalActivePaid = activeImps.reduce(
        (sum, imp) => sum.plus(decimal(imp.amount)),
        new Prisma.Decimal(0)
      );

      const fc = await tx.facturaCompra.findFirst({
        where: { id: facturaId, companyId },
        select: { id: true, total: true, state: true },
      });

      if (fc) {
        const isStillFullyPaid = totalActivePaid.gte(decimal(fc.total));
        if (!isStillFullyPaid && fc.state === "Pagada") {
          await tx.facturaCompra.update({
            where: { id: fc.id },
            data: {
              state: "Pendiente",
              pagadaAt: null,
            },
          });
        }
      }
    }

    // 4. Audit
    if (input.userId) {
      await createAuditEvent({
        prisma: tx as PrismaClient,
        companyId,
        userId: input.userId,
        entityType: "OrdenPago",
        entityId: updated.id,
        action: "orden_pago_cancelled",
        module: "compras",
        oldValue: { state: existing.state },
        newValue: { state: "Anulada", motivo: input.motivo || null },
      });
    }

    return serialize(updated);
  });
}
