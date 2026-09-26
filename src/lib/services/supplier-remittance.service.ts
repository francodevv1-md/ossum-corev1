import { Prisma, type PrismaClient } from "@prisma/client";
import { badRequest, conflict, notFound } from "@/lib/api/errors";
import type { SupplierRemittanceCreateInput } from "@/lib/validators/supplier-remittance";

async function supplierInCompany(db: PrismaClient | Prisma.TransactionClient, companyId: string, supplierId: string) {
  return db.contactCompanyLink.findFirst({ where: { companyId, contactId: supplierId, isActive: true, OR: [{ roles: { has: "proveedor" } }, { role: "proveedor" }] }, select: { contactId: true } });
}

export async function createSupplierRemittance(db: PrismaClient, companyId: string, actorId: string, input: SupplierRemittanceCreateInput) {
  if (!await supplierInCompany(db, companyId, input.supplierId)) throw badRequest("supplierId must be an active supplier contact in this company", "supplier_company_scope_invalid");
  try {
    return await db.supplierRemittance.create({ data: { companyId, supplierId: input.supplierId, number: input.number, documentDate: new Date(`${input.documentDate}T00:00:00.000Z`), observations: input.observations, createdById: actorId, lines: { create: input.lines.map((row, index) => ({ lineNumber: index + 1, expectedCode: row.expectedCode, expectedDescription: row.expectedDescription, expectedQuantity: new Prisma.Decimal(row.expectedQuantity), articleId: row.articleId, lotCode: row.lotCode, expirationDate: row.expirationDate ? new Date(`${row.expirationDate}T00:00:00.000Z`) : null })) } }, include: { lines: true, supplier: { include: { contact: true } }, goodsReceipt: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw conflict("Supplier remittance number already exists in this company", "supplier_remittance_number_exists");
    throw error;
  }
}

export async function getSupplierRemittance(db: PrismaClient, companyId: string, remittanceId: string) {
  const remittance = await db.supplierRemittance.findFirst({ where: { id: remittanceId, companyId }, include: { lines: { orderBy: { lineNumber: "asc" } }, supplier: { include: { contact: true } }, goodsReceipt: { include: { lines: true } } } });
  if (!remittance) throw notFound("Supplier remittance not found", "supplier_remittance_not_found");
  return remittance;
}

export async function linkGoodsReceiptToSupplierRemittance(db: PrismaClient, companyId: string, receiptId: string, remittanceId: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.findFirst({ where: { id: receiptId, companyId }, select: { id: true, supplierRemittanceId: true } });
    if (!receipt) throw notFound("Goods receipt not found", "goods_receipt_not_found");
    if (receipt.supplierRemittanceId) throw conflict("Goods receipt is already linked to a supplier remittance", "goods_receipt_remittance_already_linked");
    const remittance = await tx.supplierRemittance.findFirst({ where: { id: remittanceId, companyId }, select: { id: true, goodsReceipt: { select: { id: true } } } });
    if (!remittance) throw notFound("Supplier remittance not found", "supplier_remittance_not_found");
    if (remittance.goodsReceipt) throw conflict("Supplier remittance already has a goods receipt", "supplier_remittance_receipt_exists");
    const updated = await tx.goodsReceipt.update({ where: { id: receipt.id }, data: { supplierRemittanceId: remittance.id } });
    await tx.auditEvent.create({ data: { companyId, userId: actorId, entityType: "GoodsReceipt", entityId: receipt.id, action: "goods_receipt.supplier_remittance_linked", module: "purchases", newValue: { supplierRemittanceId: remittance.id, manual: true } } });
    return updated;
  });
}

export async function openSupplierRemittanceGoodsReceipt(db: PrismaClient, companyId: string, remittanceId: string, actorId: string) {
  const remittance = await getSupplierRemittance(db, companyId, remittanceId);
  if (remittance.goodsReceipt) return remittance.goodsReceipt;
  try {
    return await db.goodsReceipt.create({ data: { companyId, createdById: actorId, supplierId: remittance.supplierId, documentReference: remittance.number, supplierRemittanceId: remittance.id }, include: { lines: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.goodsReceipt.findFirst({ where: { companyId, supplierRemittanceId: remittance.id }, include: { lines: true } });
      if (existing) return existing;
    }
    throw error;
  }
}
