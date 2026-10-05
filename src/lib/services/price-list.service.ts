import type { PriceList, Prisma, PrismaClient } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import type {
  ArticlePriceVersionCreateInput,
  PriceListCreateInput,
  PriceListUpdateInput,
} from "../validators/price-list";

type Db = PrismaClient | Prisma.TransactionClient;

async function getCompanyOrganization(db: Db, companyId: string) {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { organizationId: true } });
  if (!company) throw notFound("Empresa no encontrada", "company_not_found");
  return company.organizationId;
}

export async function createPriceList(
  db: Db,
  companyId: string,
  input: PriceListCreateInput,
  actorUserId: string,
): Promise<PriceList> {
  if (typeof (db as PrismaClient).$transaction === "function") {
    return (db as PrismaClient).$transaction((tx) => createPriceList(tx, companyId, input, actorUserId));
  }
  await getCompanyOrganization(db, companyId);
  const code = input.code.trim().toUpperCase();

  const existing = await db.priceList.findFirst({
    where: { companyId, code },
    select: { id: true },
  });
  if (existing) {
    throw conflict("Ya existe una lista de precios con este código en la empresa", "duplicate_price_list_code");
  }

  const priceList = await db.priceList.create({
    data: {
      companyId,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      currency: "ARS",
      isActive: true,
    },
  });

  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "PriceList",
    entityId: priceList.id,
    action: "created",
    module: "stock",
    newValue: {
      code: priceList.code,
      name: priceList.name,
      currency: priceList.currency,
      isActive: priceList.isActive,
    },
  });

  return priceList;
}

export async function listPriceLists(db: Db, companyId: string, includeInactive = false) {
  await getCompanyOrganization(db, companyId);
  return db.priceList.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { name: "asc" },
  });
}

export async function getPriceList(db: Db, companyId: string, priceListId: string) {
  await getCompanyOrganization(db, companyId);
  const priceList = await db.priceList.findFirst({
    where: { id: priceListId, companyId },
  });
  if (!priceList) throw notFound("Lista de precios no encontrada", "price_list_not_found");
  return priceList;
}

export async function updatePriceList(
  db: Db,
  companyId: string,
  priceListId: string,
  input: PriceListUpdateInput,
  actorUserId: string,
): Promise<PriceList> {
  if (typeof (db as PrismaClient).$transaction === "function") {
    return (db as PrismaClient).$transaction((tx) => updatePriceList(tx, companyId, priceListId, input, actorUserId));
  }
  await getCompanyOrganization(db, companyId);
  const existing = await db.priceList.findFirst({
    where: { id: priceListId, companyId },
  });
  if (!existing) throw notFound("Lista de precios no encontrada", "price_list_not_found");

  const updated = await db.priceList.update({
    where: { id: priceListId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "PriceList",
    entityId: priceListId,
    action: "updated",
    module: "stock",
    oldValue: { name: existing.name, description: existing.description, isActive: existing.isActive },
    newValue: { name: updated.name, description: updated.description, isActive: updated.isActive },
  });

  return updated;
}

export async function addArticlePriceVersion(
  db: Db,
  companyId: string,
  articleId: string,
  input: ArticlePriceVersionCreateInput,
  actorUserId: string,
): Promise<{
  id: string;
  companyId: string;
  organizationId: string;
  articleId: string;
  priceListId: string;
  priceListCode: string;
  priceListName: string;
  price: number;
  currency: string;
  effectiveAt: string;
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
}> {
  if (typeof (db as PrismaClient).$transaction === "function") {
    return (db as PrismaClient).$transaction((tx) => addArticlePriceVersion(tx, companyId, articleId, input, actorUserId));
  }
  const organizationId = await getCompanyOrganization(db, companyId);

  // Validate article exists and belongs to company eligibility
  const article = await db.article.findFirst({
    where: {
      id: articleId,
      organizationId,
      stockEligibilities: { some: { companyId } },
    },
    select: { id: true },
  });
  if (!article) throw notFound("Artículo no encontrado para esta empresa", "article_not_found");

  // Validate priceList exists and belongs to company
  const priceList = await db.priceList.findFirst({
    where: {
      id: input.priceListId,
      companyId,
      isActive: true,
    },
  });
  if (!priceList) throw notFound("Lista de precios no encontrada o inactiva en esta empresa", "price_list_not_found");

  if (input.price < 0) {
    throw badRequest("El precio no puede ser negativo", "invalid_price");
  }

  const effectiveAt = input.effectiveAt ? new Date(input.effectiveAt) : new Date();
  if (Number.isNaN(effectiveAt.getTime())) {
    throw badRequest("Fecha de vigencia inválida", "invalid_effective_at");
  }

  const version = await db.articleCompanyPriceVersion.create({
    data: {
      companyId,
      organizationId,
      articleId,
      priceListId: input.priceListId,
      price: input.price,
      currency: "ARS",
      effectiveAt,
      notes: input.notes?.trim() || null,
      createdById: actorUserId,
    },
    include: {
      priceList: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "ArticleCompanyPriceVersion",
    entityId: version.id,
    action: "created",
    module: "stock",
    newValue: {
      articleId,
      priceListId: input.priceListId,
      price: Number(version.price),
      currency: version.currency,
      effectiveAt: version.effectiveAt.toISOString(),
    },
  });

  return {
    id: version.id,
    companyId: version.companyId,
    organizationId: version.organizationId,
    articleId: version.articleId,
    priceListId: version.priceListId,
    priceListCode: version.priceList.code,
    priceListName: version.priceList.name,
    price: Number(version.price),
    currency: version.currency,
    effectiveAt: version.effectiveAt.toISOString(),
    notes: version.notes,
    createdById: version.createdById,
    createdByName: version.createdBy
      ? `${version.createdBy.firstName} ${version.createdBy.lastName}`.trim() || version.createdBy.email
      : null,
    createdAt: version.createdAt.toISOString(),
  };
}

export async function getArticlePriceHistory(
  db: Db,
  companyId: string,
  articleId: string,
  priceListId?: string,
) {
  const organizationId = await getCompanyOrganization(db, companyId);

  const article = await db.article.findFirst({
    where: {
      id: articleId,
      organizationId,
      stockEligibilities: { some: { companyId } },
    },
    select: { id: true },
  });
  if (!article) throw notFound("Artículo no encontrado para esta empresa", "article_not_found");

  const versions = await db.articleCompanyPriceVersion.findMany({
    where: {
      companyId,
      articleId,
      ...(priceListId ? { priceListId } : {}),
    },
    orderBy: { effectiveAt: "desc" },
    include: {
      priceList: { select: { id: true, code: true, name: true, isActive: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return versions.map((v) => ({
    id: v.id,
    companyId: v.companyId,
    organizationId: v.organizationId,
    articleId: v.articleId,
    priceListId: v.priceListId,
    priceListCode: v.priceList.code,
    priceListName: v.priceList.name,
    priceListActive: v.priceList.isActive,
    price: Number(v.price),
    currency: v.currency,
    effectiveAt: v.effectiveAt.toISOString(),
    notes: v.notes,
    createdById: v.createdById,
    createdByName: v.createdBy
      ? `${v.createdBy.firstName} ${v.createdBy.lastName}`.trim() || v.createdBy.email
      : null,
    createdAt: v.createdAt.toISOString(),
  }));
}

export async function getEffectiveArticlePrice(
  db: Db,
  companyId: string,
  articleId: string,
  priceListId: string,
  at?: Date | string,
) {
  const organizationId = await getCompanyOrganization(db, companyId);

  const article = await db.article.findFirst({
    where: {
      id: articleId,
      organizationId,
      stockEligibilities: { some: { companyId } },
    },
    select: { id: true },
  });
  if (!article) throw notFound("Artículo no encontrado para esta empresa", "article_not_found");

  const targetDate = at ? new Date(at) : new Date();
  if (Number.isNaN(targetDate.getTime())) {
    throw badRequest("Fecha consultada inválida", "invalid_query_date");
  }

  const version = await db.articleCompanyPriceVersion.findFirst({
    where: {
      companyId,
      articleId,
      priceListId,
      effectiveAt: { lte: targetDate },
      priceList: { isActive: true },
    },
    orderBy: { effectiveAt: "desc" },
    include: {
      priceList: { select: { id: true, code: true, name: true } },
    },
  });

  if (!version) return null;

  return {
    id: version.id,
    companyId: version.companyId,
    articleId: version.articleId,
    priceListId: version.priceListId,
    priceListCode: version.priceList.code,
    priceListName: version.priceList.name,
    price: Number(version.price),
    currency: version.currency,
    effectiveAt: version.effectiveAt.toISOString(),
    notes: version.notes,
  };
}
