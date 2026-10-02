import type { Prisma, PrismaClient } from "@prisma/client";
import { badRequest, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import type { StockPhysicalUnitCreateInput, StockPhysicalUnitUpdateInput } from "../validators/stock-physical-unit";

type Db = PrismaClient | Prisma.TransactionClient;

function supportsTransactions(db: Db): db is PrismaClient {
  return "$connect" in db && typeof db.$connect === "function" &&
    "$transaction" in db && typeof db.$transaction === "function";
}

async function getEligibleArticle(db: Db, companyId: string, articleId: string) {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { organizationId: true } });
  if (!company) throw notFound("Empresa no encontrada", "company_not_found");

  const article = await db.article.findFirst({
    where: { id: articleId, organizationId: company.organizationId, stockEligibilities: { some: { companyId } } },
    select: { id: true, sku: true, description: true, articleType: true },
  });
  if (!article) throw notFound("Artículo no encontrado o no habilitado para esta empresa", "article_not_found");
  return article;
}

export async function listStockPhysicalUnits(db: Db, companyId: string, articleId?: string) {
  return db.stockPhysicalUnit.findMany({
    where: { companyId, ...(articleId ? { articleId } : {}) },
    include: { article: { select: { sku: true, description: true } } },
    orderBy: [{ status: "asc" }, { unitCode: "asc" }],
  });
}

export async function createStockPhysicalUnit(
  db: Db,
  companyId: string,
  input: StockPhysicalUnitCreateInput,
  actorUserId: string,
) {
  if (supportsTransactions(db)) {
    return db.$transaction((tx) => createStockPhysicalUnit(tx, companyId, input, actorUserId));
  }

  const article = await getEligibleArticle(db, companyId, input.articleId);
  const unit = await db.stockPhysicalUnit.create({
    data: {
      companyId,
      articleId: article.id,
      unitCode: input.unitCode.trim(),
      serialNumber: input.serialNumber?.trim() || null,
      location: input.location?.trim() || null,
      createdById: actorUserId,
    },
  });
  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "StockPhysicalUnit",
    entityId: unit.id,
    action: "created",
    module: "stock",
    newValue: { articleId: article.id, sku: article.sku, unitCode: unit.unitCode, serialNumber: unit.serialNumber, location: unit.location },
  });
  return unit;
}

export async function updateStockPhysicalUnit(
  db: Db,
  companyId: string,
  unitId: string,
  input: StockPhysicalUnitUpdateInput,
  actorUserId: string,
) {
  if (supportsTransactions(db)) {
    return db.$transaction((tx) => updateStockPhysicalUnit(tx, companyId, unitId, input, actorUserId));
  }

  const current = await db.stockPhysicalUnit.findFirst({ where: { id: unitId, companyId } });
  if (!current) throw notFound("Caja identificada no encontrada", "physical_unit_not_found");
  if (current.status === "RETIRED" && input.status === "ACTIVE") {
    throw badRequest("Una Caja identificada retirada no puede reactivarse", "physical_unit_reactivation_forbidden");
  }

  const unit = await db.stockPhysicalUnit.update({
    where: { id: current.id },
    data: {
      ...(input.location !== undefined ? { location: input.location?.trim() || null } : {}),
      ...(input.status === "RETIRED" ? { status: "RETIRED", retiredAt: new Date() } : {}),
    },
  });
  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "StockPhysicalUnit",
    entityId: unit.id,
    action: "updated",
    module: "stock",
    oldValue: { location: current.location, status: current.status },
    newValue: { location: unit.location, status: unit.status },
  });
  return unit;
}
