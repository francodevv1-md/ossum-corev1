import { Prisma, type PrismaClient } from "@prisma/client";
import { requireCompanyId } from "../tenant";

export interface ComprasMovimientoItem {
  id: string;
  date: string;
  type: string;
  movementType: string;
  quantity: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  lotCode: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
  location: string | null;
  receiptId: string | null;
  receiptNumber: string | null;
  supplierRemitoNumber: string | null;
  ordenCompraId: string | null;
  ordenCompraNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  userName: string;
  notes: string | null;
}

export async function listComprasMovimientos(input: {
  prisma: PrismaClient;
  companyId: string;
  articleId?: string;
  supplierId?: string;
  receiptId?: string;
  ordenCompraId?: string;
  take?: number;
  skip?: number;
}): Promise<ComprasMovimientoItem[]> {
  const companyId = requireCompanyId(input.companyId);

  // 1. Retrieve movements related to purchases (RECEIPT_IN or linked to receipts or supplier returns)
  const movements = await input.prisma.stockMovement.findMany({
    where: {
      companyId,
      ...(input.articleId ? { articleId: input.articleId } : {}),
      ...(input.receiptId ? { receiptId: input.receiptId } : {}),
      OR: [
        { movementType: "RECEIPT_IN" },
        { receiptId: { not: null } },
      ],
    },
    include: {
      article: {
        select: {
          id: true,
          sku: true,
          description: true,
        },
      },
      receipt: {
        select: {
          id: true,
          documentReference: true,
          supplierId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: input.take ?? 100,
    skip: input.skip ?? 0,
  });

  // 2. Fetch suppliers for all referenced supplierIds in receipts
  const supplierIds = [
    ...new Set(
      movements.map((m) => m.receipt?.supplierId).filter((id): id is string => Boolean(id))
    ),
  ];

  const contacts = supplierIds.length
    ? await input.prisma.contact.findMany({
        where: { id: { in: supplierIds } },
        select: {
          id: true,
          tradeName: true,
          legalName: true,
          firstName: true,
          lastName: true,
        },
      })
    : [];

  const contactMap = new Map(
    contacts.map((c) => [
      c.id,
      c.tradeName || c.legalName || (c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : c.id),
    ])
  );

  return movements
    .filter((m) => {
      if (input.supplierId) {
        const suppId = m.receipt?.supplierId;
        if (suppId !== input.supplierId) return false;
      }
      return true;
    })
    .map((m) => {
      const supplierName = m.receipt?.supplierId
        ? contactMap.get(m.receipt.supplierId) || "Proveedor"
        : "Proveedor no especificado";

      const userName = m.createdBy
        ? `${m.createdBy.firstName} ${m.createdBy.lastName}`.trim() || m.createdBy.email
        : "Sistema";

      return {
        id: m.id,
        date: m.createdAt.toISOString(),
        type: m.movementType === "RECEIPT_IN" ? "Ingreso por Recepción" : m.movementType,
        movementType: m.movementType,
        quantity: m.quantity.toString(),
        articleId: m.articleId,
        articleCode: m.article.sku,
        articleName: m.article.description,
        lotCode: m.lotCode,
        serialNumber: m.serialNumber,
        expirationDate: m.expirationDate ? m.expirationDate.toISOString().split("T")[0] : null,
        location: m.location,
        receiptId: m.receiptId,
        receiptNumber: m.receiptId ? `REC-${m.receiptId.slice(-6).toUpperCase()}` : null,
        supplierRemitoNumber: m.receipt?.documentReference || null,
        ordenCompraId: null,
        ordenCompraNumber: null,
        supplierId: m.receipt?.supplierId || null,
        supplierName,
        userName,
        notes: m.notes,
      };
    });
}
