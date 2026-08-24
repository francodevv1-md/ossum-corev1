import type { Prisma, PrismaClient } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import { identifierScopeKey, normalizeArticleIdentifier, resolutionStatus, type ArticleCreateInput, type ArticleLookupQuery, type ArticleUpdateInput } from "../validators/article";

type Db = PrismaClient | Prisma.TransactionClient;
const ai22ArticleReferenceManufacturers = ["BIOPROTECE"];

function clean(value?: string | null): string | undefined {
  const result = value?.trim();
  return result || undefined;
}

function toIdentifierData(identifier: ArticleCreateInput["identifiers"][number]) {
  const manufacturerContext = clean(identifier.manufacturerContext);
  const supplierId = clean(identifier.supplierId);
  if (identifier.type === "GS1_AI_22" && (!manufacturerContext || !ai22ArticleReferenceManufacturers.some((manufacturer) => normalizeArticleIdentifier(manufacturerContext).startsWith(manufacturer)))) {
    throw badRequest("GS1 AI (22) is currently supported only for BIOPROTECE article references", "gs1_ai22_manufacturer_not_supported");
  }
  return {
    type: identifier.type,
    value: identifier.value.trim(),
    normalizedValue: normalizeArticleIdentifier(identifier.value),
    sourcePayload: clean(identifier.sourcePayload),
    manufacturerContext,
    supplierId,
    scopeKey: identifierScopeKey({ supplierId, manufacturerContext }),
  };
}

async function getCompanyOrganization(db: Db, companyId: string) {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { organizationId: true } });
  if (!company) throw notFound("Company not found", "company_not_found");
  return company.organizationId;
}

function articleCode(): string {
  return `ITM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createArticle(db: Db, companyId: string, input: ArticleCreateInput, actorUserId: string) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const identifiers = input.identifiers.map(toIdentifierData);
  const duplicate = new Set<string>();
  for (const identifier of identifiers) {
    const key = `${identifier.type}:${identifier.normalizedValue}:${identifier.scopeKey}`;
    if (duplicate.has(key)) throw conflict("Duplicate identifier in request", "duplicate_article_identifier");
    duplicate.add(key);
  }

  const sku = clean(input.sku) || articleCode();
  const existing = await db.article.findFirst({ where: { organizationId, sku }, select: { id: true } });
  if (existing) throw conflict("SKU already exists in this organization", "duplicate_sku");

  return db.$transaction(async (tx) => {
    for (const mapping of input.supplierMappings) {
      const supplier = await tx.contactCompanyLink.findFirst({ where: { companyId, contactId: mapping.supplierId, isActive: true }, select: { contactId: true } });
      if (!supplier) throw badRequest("Supplier is not linked to the company", "supplier_company_scope_invalid");
    }
    for (const identifier of identifiers) {
      if (!identifier.supplierId) continue;
      const supplier = await tx.contactCompanyLink.findFirst({ where: { companyId, contactId: identifier.supplierId, isActive: true }, select: { contactId: true } });
      if (!supplier) throw badRequest("Supplier is not linked to the company", "supplier_company_scope_invalid");
    }
    const article = await tx.article.create({
      data: {
        organizationId,
        sku,
        description: input.description.trim(),
        articleType: clean(input.articleType), brand: clean(input.brand), manufacturer: clean(input.manufacturer),
        family: clean(input.family), modelVariant: clean(input.modelVariant), measure: clean(input.measure), unit: input.unit.trim(),
        identifiers: { create: identifiers },
        supplierMappings: { create: input.supplierMappings.map((mapping) => ({ supplierId: mapping.supplierId, supplierCode: mapping.supplierCode.trim(), normalizedCode: normalizeArticleIdentifier(mapping.supplierCode) })) },
        tracePolicies: { create: { policy: input.traceabilityPolicy } },
        stockEligibilities: { create: { companyId, version: 1 } },
      },
      include: { identifiers: true, tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 }, stockEligibilities: true },
    });
    await createAuditEvent({ prisma: tx, companyId, userId: actorUserId, entityType: "Article", entityId: article.id, action: "created", module: "stock", newValue: { sku: article.sku, description: article.description } });
    return { ...article, stock: 0 };
  });
}

export async function updateArticle(db: Db, companyId: string, articleId: string, input: ArticleUpdateInput, actorUserId: string) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const existing = await db.article.findFirst({ where: { id: articleId, organizationId, stockEligibilities: { some: { companyId } } }, include: { tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } });
  if (!existing) throw notFound("Article not found", "article_not_found");
  const article = await db.$transaction(async (tx) => {
    const updated = await tx.article.update({ where: { id: articleId }, data: {
      description: input.description?.trim(), articleType: clean(input.articleType), brand: clean(input.brand), manufacturer: clean(input.manufacturer), family: clean(input.family), modelVariant: clean(input.modelVariant), measure: clean(input.measure), unit: input.unit?.trim(), isActive: input.isActive,
    }, include: { identifiers: { where: { isActive: true } }, tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 }, stockEligibilities: true } });
    for (const identifier of input.identifiers ?? []) {
      const data = toIdentifierData(identifier);
      await tx.articleIdentifier.upsert({ where: { organizationId_type_normalizedValue_scopeKey: { organizationId, type: data.type, normalizedValue: data.normalizedValue, scopeKey: data.scopeKey } }, create: { organizationId, articleId, ...data }, update: { articleId, value: data.value, manufacturerContext: data.manufacturerContext, supplierId: data.supplierId, isActive: true, deactivatedAt: null } });
    }
    for (const mapping of input.supplierMappings ?? []) {
      const supplier = await tx.contactCompanyLink.findFirst({ where: { companyId, contactId: mapping.supplierId, isActive: true }, select: { contactId: true } });
      if (!supplier) throw badRequest("Supplier is not linked to the company", "supplier_company_scope_invalid");
      await tx.articleSupplierMapping.upsert({ where: { organizationId_supplierId_normalizedCode: { organizationId, supplierId: mapping.supplierId, normalizedCode: normalizeArticleIdentifier(mapping.supplierCode) } }, create: { organizationId, articleId, supplierId: mapping.supplierId, supplierCode: mapping.supplierCode.trim(), normalizedCode: normalizeArticleIdentifier(mapping.supplierCode) }, update: { articleId, supplierCode: mapping.supplierCode.trim(), isActive: true, deactivatedAt: null } });
    }
    if (input.traceabilityPolicy && input.traceabilityPolicy !== existing.tracePolicies[0]?.policy) await tx.articleTraceabilityPolicy.create({ data: { organizationId, articleId, policy: input.traceabilityPolicy } });
    await createAuditEvent({ prisma: tx, companyId, userId: actorUserId, entityType: "Article", entityId: articleId, action: "updated", module: "stock" });
    return updated;
  });
  return { ...article, stock: 0 };
}

export async function deactivateArticleIdentifier(db: Db, companyId: string, articleId: string, identifierId: string, actorUserId: string) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const identifier = await db.articleIdentifier.findFirst({ where: { id: identifierId, articleId, organizationId, article: { stockEligibilities: { some: { companyId } } } } });
  if (!identifier) throw notFound("Identifier not found", "article_identifier_not_found");
  const updated = await db.articleIdentifier.update({ where: { id: identifierId }, data: { isActive: false, deactivatedAt: new Date() } });
  await createAuditEvent({ prisma: db, companyId, userId: actorUserId, entityType: "ArticleIdentifier", entityId: identifierId, action: "deactivated", module: "stock" });
  return updated;
}

export async function resolveArticleIdentifier(db: Db, companyId: string, query: ArticleLookupQuery) {
  const organizationId = await getCompanyOrganization(db, companyId);
  if (!query.identifier) throw badRequest("identifier is required", "identifier_required");
  const scopeKey = query.supplierId || query.manufacturerContext ? identifierScopeKey(query) : undefined;
  const matches = await db.articleIdentifier.findMany({ where: { organizationId, isActive: true, normalizedValue: normalizeArticleIdentifier(query.identifier), type: query.identifierType, article: { stockEligibilities: { some: { companyId } } }, ...(scopeKey ? { scopeKey } : {}) }, include: { article: true }, take: 100 });
  return { status: resolutionStatus(matches.length), candidates: matches.map(({ article, ...identifier }) => ({ ...article, identifier })) };
}

export async function searchArticles(db: Db, companyId: string, query: ArticleLookupQuery) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const q = query.q ? normalizeArticleIdentifier(query.q) : undefined;
  const articles = await db.article.findMany({ where: { organizationId, isActive: true, stockEligibilities: { some: { companyId } }, ...(q ? { OR: [{ sku: { contains: query.q, mode: "insensitive" } }, { description: { contains: query.q, mode: "insensitive" } }, { identifiers: { some: { normalizedValue: { contains: q }, isActive: true } } }] } : {}) }, include: { identifiers: { where: { isActive: true } }, tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } }, orderBy: { description: "asc" }, take: query.take });
  return articles.map((article) => ({ ...article, stock: 0 }));
}

export async function resolveSupplierCode(db: Db, companyId: string, supplierId: string, supplierCode: string) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const mappings = await db.articleSupplierMapping.findMany({ where: { organizationId, supplierId, normalizedCode: normalizeArticleIdentifier(supplierCode), isActive: true, article: { stockEligibilities: { some: { companyId } } } }, include: { article: true }, take: 100 });
  return { status: resolutionStatus(mappings.length), candidates: mappings.map(({ article, ...mapping }) => ({ ...article, mapping })) };
}

export async function deactivateSupplierMapping(db: Db, companyId: string, articleId: string, mappingId: string, actorUserId: string) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const mapping = await db.articleSupplierMapping.findFirst({ where: { id: mappingId, articleId, organizationId, article: { stockEligibilities: { some: { companyId } } } } });
  if (!mapping) throw notFound("Supplier mapping not found", "supplier_mapping_not_found");
  const updated = await db.articleSupplierMapping.update({ where: { id: mappingId }, data: { isActive: false, deactivatedAt: new Date() } });
  await createAuditEvent({ prisma: db, companyId, userId: actorUserId, entityType: "ArticleSupplierMapping", entityId: mappingId, action: "deactivated", module: "stock" });
  return updated;
}
