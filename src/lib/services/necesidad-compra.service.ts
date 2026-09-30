import { Prisma, type PrismaClient, NecesidadCompraState } from "@prisma/client";
import { createAuditEvent } from "../audit";
import { badRequest, conflict, notFound } from "../api/errors";
import { requireCompanyId } from "../tenant";
import { createOrdenCompra } from "./orden-compra.service";

export const NECESIDAD_COMPRA_STATES = [
  "Pendiente",
  "En_OC",
  "Enviada",
  "Recibida",
  "Cancelada",
] as const;

export const NECESIDAD_COMPRA_PRIORITIES = ["baja", "media", "alta", "critica"] as const;

export const NECESIDAD_COMPRA_ORIGINS = [
  "stock_bajo",
  "faltante_preparacion",
  "consumo",
  "diferencia_comparativa",
  "manual",
] as const;

export class NecesidadCompraError extends Error {
  constructor(readonly code: string, message: string, readonly status = 409) {
    super(message);
    this.name = "NecesidadCompraError";
  }
}

type Base = {
  companyId: string;
  prisma: PrismaClient;
  userId?: string;
};

const select = {
  id: true,
  companyId: true,
  articleId: true,
  isArticuloZ: true,
  descripcionLibre: true,
  code: true,
  name: true,
  quantity: true,
  priority: true,
  origin: true,
  originReference: true,
  suggestedSupplierId: true,
  suggestedSupplierName: true,
  surgeryId: true,
  observaciones: true,
  state: true,
  ordenCompraId: true,
  idempotencyKey: true,
  createdAt: true,
  updatedAt: true,
  article: {
    select: {
      id: true,
      sku: true,
      description: true,
    },
  },
  surgery: {
    select: {
      id: true,
      surgeryDate: true,
      cxStatus: true,
    },
  },
  ordenCompra: {
    select: {
      id: true,
      state: true,
      total: true,
      proveedorName: true,
    },
  },
} satisfies Prisma.NecesidadCompraSelect;

type Row = Prisma.NecesidadCompraGetPayload<{ select: typeof select }>;

const decimal = (v: string | number | Prisma.Decimal) =>
  (v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v)).toDecimalPlaces(
    4,
    Prisma.Decimal.ROUND_HALF_UP
  );

const serialize = (row: Row) => ({
  ...row,
  quantity: row.quantity.toString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  surgery: row.surgery
    ? {
        id: row.surgery.id,
        status: row.surgery.cxStatus,
        surgeryDate: row.surgery.surgeryDate ? row.surgery.surgeryDate.toISOString() : null,
      }
    : null,
  ordenCompra: row.ordenCompra
    ? {
        id: row.ordenCompra.id,
        state: row.ordenCompra.state,
        proveedorName: row.ordenCompra.proveedorName,
        total: row.ordenCompra.total.toString(),
      }
    : null,
  article: row.article
    ? {
        id: row.article.id,
        code: row.article.sku,
        name: row.article.description,
      }
    : null,
});

export type NecesidadCompraApi = ReturnType<typeof serialize>;

export async function listNecesidadesCompra(
  input: Base & {
    state?: string;
    origin?: string;
    surgeryId?: string;
    suggestedSupplierId?: string;
    take?: number;
    skip?: number;
  }
) {
  const companyId = requireCompanyId(input.companyId);

  const rows = await input.prisma.necesidadCompra.findMany({
    select,
    where: {
      companyId,
      ...(input.state ? { state: input.state as NecesidadCompraState } : {}),
      ...(input.origin ? { origin: input.origin } : {}),
      ...(input.surgeryId ? { surgeryId: input.surgeryId } : {}),
      ...(input.suggestedSupplierId
        ? { suggestedSupplierId: input.suggestedSupplierId }
        : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: input.take ?? 100,
    skip: input.skip ?? 0,
  });

  return rows.map(serialize);
}

export async function getNecesidadCompra(
  input: Base & { necesidadId: string }
) {
  const companyId = requireCompanyId(input.companyId);
  const row = await input.prisma.necesidadCompra.findFirst({
    select,
    where: { id: input.necesidadId, companyId },
  });

  if (!row) {
    throw notFound("Necesidad de compra no encontrada", "necesidad_compra_not_found");
  }

  return serialize(row);
}

export async function createNecesidadCompra(
  input: Base & {
    articleId?: string | null;
    isArticuloZ?: boolean;
    descripcionLibre?: string | null;
    code?: string | null;
    name: string;
    quantity: string | number | Prisma.Decimal;
    priority?: string;
    origin?: string;
    originReference?: string | null;
    suggestedSupplierId?: string | null;
    suggestedSupplierName?: string | null;
    surgeryId?: string | null;
    observaciones?: string | null;
    idempotencyKey?: string | null;
  }
) {
  const companyId = requireCompanyId(input.companyId);
  const quantity = decimal(input.quantity);

  if (quantity.lte(0)) {
    throw badRequest("La cantidad debe ser mayor a 0", "necesidad_compra_invalid_quantity");
  }

  if (!input.name?.trim()) {
    throw badRequest("El nombre del artículo es obligatorio", "necesidad_compra_invalid_name");
  }

  // Deduplication / Idempotency check if idempotencyKey is supplied
  if (input.idempotencyKey) {
    const existing = await input.prisma.necesidadCompra.findFirst({
      select,
      where: {
        companyId,
        idempotencyKey: input.idempotencyKey,
      },
    });

    if (existing) {
      return serialize(existing);
    }
  }

  // If articleId provided, verify it belongs to catalog
  let articleCode = input.code?.trim() || null;
  let articleName = input.name.trim();

  if (input.articleId) {
    const article = await input.prisma.article.findFirst({
      where: { id: input.articleId },
      select: { id: true, sku: true, description: true },
    });
    if (article) {
      articleCode = article.sku;
      articleName = article.description;
    }
  }

  const row = await input.prisma.necesidadCompra.create({
    select,
    data: {
      companyId,
      articleId: input.articleId || null,
      isArticuloZ: !!input.isArticuloZ,
      descripcionLibre: input.descripcionLibre?.trim() || null,
      code: articleCode,
      name: articleName,
      quantity,
      priority: input.priority || "media",
      origin: input.origin || "manual",
      originReference: input.originReference?.trim() || null,
      suggestedSupplierId: input.suggestedSupplierId?.trim() || null,
      suggestedSupplierName: input.suggestedSupplierName?.trim() || null,
      surgeryId: input.surgeryId || null,
      observaciones: input.observaciones?.trim() || null,
      idempotencyKey: input.idempotencyKey?.trim() || null,
      createdById: input.userId || null,
    },
  });

  if (input.userId) {
    await createAuditEvent({
      prisma: input.prisma,
      companyId,
      userId: input.userId,
      entityType: "NecesidadCompra",
      entityId: row.id,
      action: "necesidad_compra_created",
      module: "compras",
      newValue: {
        name: row.name,
        quantity: row.quantity.toString(),
        origin: row.origin,
        priority: row.priority,
      },
    });
  }

  return serialize(row);
}

export async function updateNecesidadCompra(
  input: Base & {
    necesidadId: string;
    articleId?: string | null;
    isArticuloZ?: boolean;
    descripcionLibre?: string | null;
    code?: string | null;
    name?: string;
    quantity?: string | number | Prisma.Decimal;
    priority?: string;
    suggestedSupplierId?: string | null;
    suggestedSupplierName?: string | null;
    surgeryId?: string | null;
    observaciones?: string | null;
  }
) {
  const companyId = requireCompanyId(input.companyId);

  return input.prisma.$transaction(async (tx) => {
    const existing = await tx.necesidadCompra.findFirst({
      where: { id: input.necesidadId, companyId },
      select: { id: true, state: true, quantity: true, priority: true },
    });

    if (!existing) {
      throw notFound("Necesidad de compra no encontrada", "necesidad_compra_not_found");
    }

    if (existing.state !== "Pendiente") {
      throw conflict(
        `No se puede editar una necesidad en estado ${existing.state}`,
        "necesidad_compra_not_editable"
      );
    }

    const row = await tx.necesidadCompra.update({
      where: { id: existing.id },
      select,
      data: {
        ...(input.articleId !== undefined ? { articleId: input.articleId || null } : {}),
        ...(input.isArticuloZ !== undefined ? { isArticuloZ: input.isArticuloZ } : {}),
        ...(input.descripcionLibre !== undefined
          ? { descripcionLibre: input.descripcionLibre?.trim() || null }
          : {}),
        ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.quantity !== undefined ? { quantity: decimal(input.quantity) } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.suggestedSupplierId !== undefined
          ? { suggestedSupplierId: input.suggestedSupplierId?.trim() || null }
          : {}),
        ...(input.suggestedSupplierName !== undefined
          ? { suggestedSupplierName: input.suggestedSupplierName?.trim() || null }
          : {}),
        ...(input.surgeryId !== undefined ? { surgeryId: input.surgeryId || null } : {}),
        ...(input.observaciones !== undefined
          ? { observaciones: input.observaciones?.trim() || null }
          : {}),
      },
    });

    if (input.userId) {
      await createAuditEvent({
        prisma: tx as PrismaClient,
        companyId,
        userId: input.userId,
        entityType: "NecesidadCompra",
        entityId: row.id,
        action: "necesidad_compra_updated",
        module: "compras",
        oldValue: { state: existing.state, quantity: existing.quantity.toString() },
        newValue: { state: row.state, quantity: row.quantity.toString() },
      });
    }

    return serialize(row);
  });
}

export async function cancelNecesidadCompra(
  input: Base & { necesidadId: string; motivo?: string }
) {
  const companyId = requireCompanyId(input.companyId);

  return input.prisma.$transaction(async (tx) => {
    const existing = await tx.necesidadCompra.findFirst({
      where: { id: input.necesidadId, companyId },
      select: { id: true, state: true },
    });

    if (!existing) {
      throw notFound("Necesidad de compra no encontrada", "necesidad_compra_not_found");
    }

    if (["Recibida", "Cancelada"].includes(existing.state)) {
      throw conflict(
        `No se puede cancelar una necesidad en estado ${existing.state}`,
        "necesidad_compra_invalid_cancel"
      );
    }

    const row = await tx.necesidadCompra.update({
      where: { id: existing.id },
      select,
      data: {
        state: "Cancelada",
        observaciones: input.motivo
          ? `Cancelada: ${input.motivo}`
          : undefined,
      },
    });

    if (input.userId) {
      await createAuditEvent({
        prisma: tx as PrismaClient,
        companyId,
        userId: input.userId,
        entityType: "NecesidadCompra",
        entityId: row.id,
        action: "necesidad_compra_cancelled",
        module: "compras",
        oldValue: { state: existing.state },
        newValue: { state: "Cancelada", motivo: input.motivo || null },
      });
    }

    return serialize(row);
  });
}

export async function convertNecesidadesToOrdenCompra(
  input: Base & {
    necesidadIds: string[];
    proveedorId: string;
    proveedorName: string;
    observaciones?: string | null;
  }
) {
  const companyId = requireCompanyId(input.companyId);

  if (!input.necesidadIds?.length) {
    throw badRequest(
      "Debe proporcionar al menos una necesidad de compra",
      "convert_necesidades_empty"
    );
  }

  if (!input.proveedorId?.trim() || !input.proveedorName?.trim()) {
    throw badRequest(
      "El proveedor es obligatorio para emitir la orden de compra",
      "convert_necesidades_invalid_supplier"
    );
  }

  return input.prisma.$transaction(async (tx) => {
    // 1. Lock and load the needs
    const needs = await tx.necesidadCompra.findMany({
      where: {
        id: { in: input.necesidadIds },
        companyId,
      },
      include: {
        article: true,
      },
    });

    if (needs.length !== input.necesidadIds.length) {
      throw notFound(
        "Una o más necesidades de compra no pertenecen a la empresa activa",
        "convert_necesidades_not_found"
      );
    }

    // Verify all are in 'Pendiente' state
    const nonPending = needs.filter((n) => n.state !== "Pendiente");
    if (nonPending.length > 0) {
      throw conflict(
        `Las siguientes necesidades ya no están pendientes: ${nonPending
          .map((n) => `${n.name} (${n.state})`)
          .join(", ")}`,
        "convert_necesidades_not_pending"
      );
    }

    // 2. Prepare OC Items from needs
    const items = needs.map((n) => {
      const stockItemId = n.articleId || `art-z-${n.id}`;
      const unitPrice = new Prisma.Decimal(0);
      return {
        stockItemId,
        name: n.name,
        code: n.code || n.article?.sku || (n.isArticuloZ ? "ART-Z" : "S/C"),
        quantity: n.quantity,
        unitPrice,
        isArticuloZ: n.isArticuloZ,
        descripcionLibre: n.descripcionLibre || (n.isArticuloZ ? n.name : null),
      };
    });

    // 3. Create the OrdenCompra
    const oc = await createOrdenCompra({
      prisma: tx as PrismaClient,
      companyId,
      proveedorId: input.proveedorId.trim(),
      proveedorName: input.proveedorName.trim(),
      items,
      observaciones:
        input.observaciones?.trim() ||
        `Generada desde ${needs.length} necesidad(es) de compra`,
      necesidadCompraIds: input.necesidadIds,
      createdById: input.userId,
    });

    // 4. Update the needs to 'En_OC' state and link to OrdenCompra
    await tx.necesidadCompra.updateMany({
      where: {
        id: { in: input.necesidadIds },
        companyId,
      },
      data: {
        state: "En_OC",
        ordenCompraId: oc.id,
      },
    });

    // 5. Audit each updated need
    for (const need of needs) {
      if (input.userId) {
        await createAuditEvent({
          prisma: tx as PrismaClient,
          companyId,
          userId: input.userId,
          entityType: "NecesidadCompra",
          entityId: need.id,
          action: "necesidad_compra_converted_to_oc",
          module: "compras",
          oldValue: { state: need.state },
          newValue: { state: "En_OC", ordenCompraId: oc.id },
        });
      }
    }

    // Return the created OC and list of updated need IDs
    return {
      ordenCompra: oc,
      convertedNecesidadIds: input.necesidadIds,
    };
  });
}
