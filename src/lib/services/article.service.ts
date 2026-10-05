import type { Prisma, PrismaClient } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import {
  getVatKeyFromTreatmentAndRate,
  validateVatTreatmentAndRate,
  type VatTreatment,
} from "../commercial/vat";
import {
  identifierScopeKey,
  normalizeArticleIdentifier,
  resolutionStatus,
  type ArticleCreateInput,
  type ArticleLookupQuery,
  type ArticleUpdateInput,
} from "../validators/article";

type Db = PrismaClient | Prisma.TransactionClient;
const ai22ArticleReferenceManufacturers = ["BIOPROTECE"];

function clean(value?: string | null): string | undefined {
  const result = value?.trim();
  return result || undefined;
}

function getContactDisplayName(contact?: {
  legalName?: string | null;
  tradeName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null): string | null {
  if (!contact) return null;
  if (contact.tradeName?.trim()) return contact.tradeName.trim();
  if (contact.legalName?.trim()) return contact.legalName.trim();
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  return fullName || null;
}

function toIdentifierData(identifier: ArticleCreateInput["identifiers"][number]) {
  const manufacturerContext = clean(identifier.manufacturerContext);
  const supplierId = clean(identifier.supplierId);
  if (
    identifier.type === "GS1_AI_22" &&
    (!manufacturerContext ||
      !ai22ArticleReferenceManufacturers.some((manufacturer) =>
        normalizeArticleIdentifier(manufacturerContext).startsWith(manufacturer),
      ))
  ) {
    throw badRequest(
      "GS1 AI (22) is currently supported only for BIOPROTECE article references",
      "gs1_ai22_manufacturer_not_supported",
    );
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

function formatCommercialProfile(raw?: {
  id: string;
  companyId: string;
  organizationId: string;
  articleId: string;
  referenceCost: Prisma.Decimal | number;
  referenceSalePrice: Prisma.Decimal | number;
  currency: string;
  priceListCode: string | null;
  preferredSupplierId: string | null;
  leadTimeDays: number | null;
  minStock?: Prisma.Decimal | number | null;
  preferredSupplier?: {
    contactId: string;
    contact?: {
      legalName?: string | null;
      tradeName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
} | null) {
  if (!raw) return null;
  return {
    id: raw.id,
    companyId: raw.companyId,
    organizationId: raw.organizationId,
    articleId: raw.articleId,
    referenceCost: Number(raw.referenceCost),
    referenceSalePrice: Number(raw.referenceSalePrice),
    currency: raw.currency,
    priceListCode: raw.priceListCode,
    preferredSupplierId: raw.preferredSupplierId,
    preferredSupplierName: getContactDisplayName(raw.preferredSupplier?.contact),
    leadTimeDays: raw.leadTimeDays,
    minStock: Number(raw.minStock ?? 0),
  };
}

export async function createArticle(db: Db, companyId: string, input: ArticleCreateInput, actorUserId: string) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const identifiers = (input.identifiers ?? []).map(toIdentifierData);
  const supplierMappings = input.supplierMappings ?? [];
  const duplicate = new Set<string>();
  for (const identifier of identifiers) {
    const key = `${identifier.type}:${identifier.normalizedValue}:${identifier.scopeKey}`;
    if (duplicate.has(key)) throw conflict("Duplicate identifier in request", "duplicate_article_identifier");
    duplicate.add(key);
  }

  const sku = clean(input.sku) || articleCode();
  const existing = await db.article.findFirst({ where: { organizationId, sku }, select: { id: true } });
  if (existing) throw conflict("SKU already exists in this organization", "duplicate_sku");

  const { treatment: vatTreatment, rate: vatRate } = validateVatTreatmentAndRate(
    input.vatTreatment,
    input.vatRate,
  );

  return db.$transaction(async (tx) => {
    for (const mapping of supplierMappings) {
      const supplier = await tx.contactCompanyLink.findFirst({
        where: { companyId, contactId: mapping.supplierId, isActive: true },
        select: { contactId: true },
      });
      if (!supplier) throw badRequest("Supplier is not linked to the company", "supplier_company_scope_invalid");
    }
    for (const identifier of identifiers) {
      if (!identifier.supplierId) continue;
      const supplier = await tx.contactCompanyLink.findFirst({
        where: { companyId, contactId: identifier.supplierId, isActive: true },
        select: { contactId: true },
      });
      if (!supplier) throw badRequest("Supplier is not linked to the company", "supplier_company_scope_invalid");
    }

    const preferredSupplierId = clean(input.commercialProfile?.preferredSupplierId);
    if (preferredSupplierId) {
      const hasMapping = supplierMappings.some((m) => m.supplierId === preferredSupplierId);
      if (!hasMapping) {
        throw badRequest(
          "Preferred supplier must correspond to an active supplier mapping of the article and company",
          "preferred_supplier_not_mapped",
        );
      }
    }

    const article = await tx.article.create({
      data: {
        organizationId,
        sku,
        description: (input.description ?? "").trim(),
        articleType: clean(input.articleType),
        brand: clean(input.brand),
        manufacturer: clean(input.manufacturer),
        family: clean(input.family),
        modelVariant: clean(input.modelVariant),
        measure: clean(input.measure),
        unit: (input.unit ?? "u").trim(),
        category: clean(input.category),
        pmAnmat: clean(input.pmAnmat),
        isSterile: input.isSterile ?? false,
        vatTreatment,
        vatRate,
        identifiers: { create: identifiers },
        supplierMappings: {
          create: supplierMappings.map((mapping) => ({
            supplierId: mapping.supplierId,
            supplierCode: mapping.supplierCode.trim(),
            normalizedCode: normalizeArticleIdentifier(mapping.supplierCode),
            companyId,
          })),
        },
        tracePolicies: { create: { policy: input.traceabilityPolicy ?? "NONE" } },
        stockEligibilities: { create: { companyId, version: 1 } },
        ...(input.commercialProfile
          ? {
              commercialProfiles: {
                create: {
                  companyId,
                  referenceCost: input.commercialProfile.referenceCost ?? 0,
                  referenceSalePrice: input.commercialProfile.referenceSalePrice ?? 0,
                  currency: "ARS",
                  priceListCode: clean(input.commercialProfile.priceListCode),
                  preferredSupplierId,
                  leadTimeDays: input.commercialProfile.leadTimeDays,
                  minStock: input.commercialProfile.minStock ?? 0,
                },
              },
            }
          : {}),
      },
      include: {
        identifiers: true,
        tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 },
        stockEligibilities: true,
        commercialProfiles: {
          where: { companyId },
          take: 1,
          include: {
            preferredSupplier: {
              select: {
                contactId: true,
                contact: {
                  select: { legalName: true, tradeName: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    await createAuditEvent({
      prisma: tx,
      companyId,
      userId: actorUserId,
      entityType: "Article",
      entityId: article.id,
      action: "created",
      module: "stock",
      newValue: { sku: article.sku, description: article.description, vatTreatment, vatRate: Number(vatRate) },
    });

    if (input.commercialProfile) {
      await createAuditEvent({
        prisma: tx,
        companyId,
        userId: actorUserId,
        entityType: "ArticleCompanyCommercialProfile",
        entityId: `${companyId}:${article.id}`,
        action: "created",
        module: "stock",
        newValue: {
          referenceCost: input.commercialProfile.referenceCost ?? 0,
          referenceSalePrice: input.commercialProfile.referenceSalePrice ?? 0,
          currency: "ARS",
          priceListCode: clean(input.commercialProfile.priceListCode),
          preferredSupplierId,
          leadTimeDays: input.commercialProfile.leadTimeDays,
          minStock: input.commercialProfile.minStock ?? 0,
        },
      });
    }

    const commProfile = formatCommercialProfile(article.commercialProfiles?.[0]);

    return {
      ...article,
      ivaKey: getVatKeyFromTreatmentAndRate(article.vatTreatment as VatTreatment, article.vatRate),
      commercialProfile: commProfile,
      stock: 0,
    };
  });
}

export async function updateArticle(
  db: Db,
  companyId: string,
  articleId: string,
  input: ArticleUpdateInput,
  actorUserId: string,
) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const existing = await db.article.findFirst({
    where: { id: articleId, organizationId, stockEligibilities: { some: { companyId } } },
    include: { tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } },
  });
  if (!existing) throw notFound("Article not found", "article_not_found");

  let vatData: { vatTreatment?: string; vatRate?: Prisma.Decimal } = {};
  if (input.vatTreatment !== undefined || input.vatRate !== undefined) {
    const treatmentToValidate = input.vatTreatment ?? existing.vatTreatment;
    const rateToValidate = input.vatRate !== undefined ? input.vatRate : existing.vatRate;
    const validated = validateVatTreatmentAndRate(treatmentToValidate, rateToValidate);
    vatData = { vatTreatment: validated.treatment, vatRate: validated.rate };
  }

  const article = await db.$transaction(async (tx) => {
    const updated = await tx.article.update({
      where: { id: articleId },
      data: {
        description: input.description?.trim(),
        sku: clean(input.sku),
        articleType: clean(input.articleType),
        brand: clean(input.brand),
        manufacturer: clean(input.manufacturer),
        family: clean(input.family),
        modelVariant: clean(input.modelVariant),
        measure: clean(input.measure),
        unit: input.unit?.trim(),
        category: input.category !== undefined ? clean(input.category) ?? null : undefined,
        pmAnmat: input.pmAnmat !== undefined ? clean(input.pmAnmat) ?? null : undefined,
        isSterile: input.isSterile,
        isActive: input.isActive,
        ...vatData,
      },
      include: {
        identifiers: { where: { isActive: true } },
        tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 },
        stockEligibilities: true,
      },
    });

    for (const identifier of input.identifiers ?? []) {
      const data = toIdentifierData(identifier);
      await tx.articleIdentifier.upsert({
        where: {
          organizationId_type_normalizedValue_scopeKey: {
            organizationId,
            type: data.type,
            normalizedValue: data.normalizedValue,
            scopeKey: data.scopeKey,
          },
        },
        create: { organizationId, articleId, ...data },
        update: {
          articleId,
          value: data.value,
          manufacturerContext: data.manufacturerContext,
          supplierId: data.supplierId,
          isActive: true,
          deactivatedAt: null,
        },
      });
    }

    for (const mapping of input.supplierMappings ?? []) {
      const supplier = await tx.contactCompanyLink.findFirst({
        where: { companyId, contactId: mapping.supplierId, isActive: true },
        select: { contactId: true },
      });
      if (!supplier) throw badRequest("Supplier is not linked to the company", "supplier_company_scope_invalid");
      await tx.articleSupplierMapping.upsert({
        where: {
          organizationId_companyId_supplierId_normalizedCode: {
            organizationId,
            companyId,
            supplierId: mapping.supplierId,
            normalizedCode: normalizeArticleIdentifier(mapping.supplierCode),
          },
        },
        create: {
          organizationId,
          articleId,
          companyId,
          supplierId: mapping.supplierId,
          supplierCode: mapping.supplierCode.trim(),
          normalizedCode: normalizeArticleIdentifier(mapping.supplierCode),
        },
        update: {
          articleId,
          supplierCode: mapping.supplierCode.trim(),
          isActive: true,
          deactivatedAt: null,
        },
      });
    }

    if (input.traceabilityPolicy && input.traceabilityPolicy !== existing.tracePolicies[0]?.policy) {
      await tx.articleTraceabilityPolicy.create({
        data: { organizationId, articleId, policy: input.traceabilityPolicy },
      });
    }

    if (input.commercialProfile) {
      const prefSupplierId =
        input.commercialProfile.preferredSupplierId !== undefined
          ? clean(input.commercialProfile.preferredSupplierId) ?? null
          : undefined;

      if (prefSupplierId) {
        const hasInputMapping = input.supplierMappings?.some((m) => m.supplierId === prefSupplierId);
        if (!hasInputMapping) {
          const existingMapping = await tx.articleSupplierMapping.findFirst({
            where: {
              organizationId,
              companyId,
              articleId,
              supplierId: prefSupplierId,
              isActive: true,
            },
            select: { id: true },
          });
          if (!existingMapping) {
            throw badRequest(
              "Preferred supplier must correspond to an active supplier mapping of the article and company",
              "preferred_supplier_not_mapped",
            );
          }
        }
      }

      const existingProfile = await tx.articleCompanyCommercialProfile.findUnique({
        where: {
          companyId_articleId: {
            companyId,
            articleId,
          },
        },
      });

      const newCost =
        input.commercialProfile.referenceCost !== undefined
          ? input.commercialProfile.referenceCost
          : existingProfile
            ? Number(existingProfile.referenceCost)
            : 0;
      const newPrice =
        input.commercialProfile.referenceSalePrice !== undefined
          ? input.commercialProfile.referenceSalePrice
          : existingProfile
            ? Number(existingProfile.referenceSalePrice)
            : 0;
      const newPriceListCode =
        input.commercialProfile.priceListCode !== undefined
          ? clean(input.commercialProfile.priceListCode) ?? null
          : existingProfile?.priceListCode;
      const newPrefSupplier =
        input.commercialProfile.preferredSupplierId !== undefined
          ? prefSupplierId
          : existingProfile?.preferredSupplierId;
      const newLeadTime =
        input.commercialProfile.leadTimeDays !== undefined
          ? input.commercialProfile.leadTimeDays
          : existingProfile?.leadTimeDays;
      const newMinStock =
        input.commercialProfile.minStock !== undefined
          ? input.commercialProfile.minStock
          : existingProfile
            ? Number(existingProfile.minStock)
            : 0;

      const updatedProfile = await tx.articleCompanyCommercialProfile.upsert({
        where: {
          companyId_articleId: {
            companyId,
            articleId,
          },
        },
        create: {
          companyId,
          organizationId,
          articleId,
          referenceCost: newCost,
          referenceSalePrice: newPrice,
          currency: "ARS",
          priceListCode: newPriceListCode,
          preferredSupplierId: newPrefSupplier,
          leadTimeDays: newLeadTime,
          minStock: newMinStock,
        },
        update: {
          ...(input.commercialProfile.referenceCost !== undefined
            ? { referenceCost: input.commercialProfile.referenceCost }
            : {}),
          ...(input.commercialProfile.referenceSalePrice !== undefined
            ? { referenceSalePrice: input.commercialProfile.referenceSalePrice }
            : {}),
          ...(input.commercialProfile.priceListCode !== undefined
            ? { priceListCode: clean(input.commercialProfile.priceListCode) ?? null }
            : {}),
          ...(input.commercialProfile.preferredSupplierId !== undefined
            ? { preferredSupplierId: prefSupplierId }
            : {}),
          ...(input.commercialProfile.leadTimeDays !== undefined
            ? { leadTimeDays: input.commercialProfile.leadTimeDays }
            : {}),
          ...(input.commercialProfile.minStock !== undefined
            ? { minStock: input.commercialProfile.minStock }
            : {}),
        },
      });

      await createAuditEvent({
        prisma: tx,
        companyId,
        userId: actorUserId,
        entityType: "ArticleCompanyCommercialProfile",
        entityId: updatedProfile.id,
        action: existingProfile ? "updated" : "created",
        module: "stock",
        oldValue: existingProfile
          ? {
              referenceCost: Number(existingProfile.referenceCost),
              referenceSalePrice: Number(existingProfile.referenceSalePrice),
              priceListCode: existingProfile.priceListCode,
              preferredSupplierId: existingProfile.preferredSupplierId,
              leadTimeDays: existingProfile.leadTimeDays,
              minStock: Number(existingProfile.minStock),
            }
          : undefined,
        newValue: {
          referenceCost: Number(updatedProfile.referenceCost),
          referenceSalePrice: Number(updatedProfile.referenceSalePrice),
          priceListCode: updatedProfile.priceListCode,
          preferredSupplierId: updatedProfile.preferredSupplierId,
          leadTimeDays: updatedProfile.leadTimeDays,
          minStock: Number(updatedProfile.minStock),
        },
      });
    }

    await createAuditEvent({
      prisma: tx,
      companyId,
      userId: actorUserId,
      entityType: "Article",
      entityId: articleId,
      action: "updated",
      module: "stock",
    });
    return updated;
  });

  const profile = db.articleCompanyCommercialProfile
    ? await db.articleCompanyCommercialProfile.findUnique({
        where: { companyId_articleId: { companyId, articleId } },
        include: {
          preferredSupplier: {
            select: {
              contactId: true,
              contact: {
                select: { legalName: true, tradeName: true, firstName: true, lastName: true },
              },
            },
          },
        },
      })
    : null;

  return {
    ...article,
    ivaKey: getVatKeyFromTreatmentAndRate(article.vatTreatment as VatTreatment, article.vatRate),
    commercialProfile: formatCommercialProfile(profile),
    stock: 0,
  };
}

export async function getArticle(db: Db, companyId: string, articleId: string) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const article = await db.article.findFirst({
    where: { id: articleId, organizationId, stockEligibilities: { some: { companyId } } },
    include: {
      identifiers: { where: { isActive: true } },
      tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 },
      stockEligibilities: true,
      commercialProfiles: {
        where: { companyId },
        take: 1,
        include: {
          preferredSupplier: {
            select: {
              contactId: true,
              contact: {
                select: { legalName: true, tradeName: true, firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
  });
  if (!article) throw notFound("Article not found", "article_not_found");
  return {
    ...article,
    ivaKey: getVatKeyFromTreatmentAndRate(article.vatTreatment as VatTreatment, article.vatRate),
    commercialProfile: formatCommercialProfile(article.commercialProfiles?.[0]),
    stock: 0,
  };
}

export async function deactivateArticleIdentifier(
  db: Db,
  companyId: string,
  articleId: string,
  identifierId: string,
  actorUserId: string,
) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const identifier = await db.articleIdentifier.findFirst({
    where: { id: identifierId, articleId, organizationId, article: { stockEligibilities: { some: { companyId } } } },
  });
  if (!identifier) throw notFound("Identifier not found", "article_identifier_not_found");
  const updated = await db.articleIdentifier.update({
    where: { id: identifierId },
    data: { isActive: false, deactivatedAt: new Date() },
  });
  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "ArticleIdentifier",
    entityId: identifierId,
    action: "deactivated",
    module: "stock",
  });
  return updated;
}

export async function resolveArticleIdentifier(db: Db, companyId: string, query: ArticleLookupQuery) {
  const organizationId = await getCompanyOrganization(db, companyId);
  if (!query.identifier) throw badRequest("identifier is required", "identifier_required");
  const scopeKey = query.supplierId || query.manufacturerContext ? identifierScopeKey(query) : undefined;
  const matches = await db.articleIdentifier.findMany({
    where: {
      organizationId,
      isActive: true,
      normalizedValue: normalizeArticleIdentifier(query.identifier),
      type: query.identifierType,
      article: { stockEligibilities: { some: { companyId } } },
      ...(scopeKey ? { scopeKey } : {}),
    },
    include: {
      article: {
        include: {
          commercialProfiles: {
            where: { companyId },
            take: 1,
            include: {
              preferredSupplier: {
                select: {
                  contactId: true,
                  contact: {
                    select: { legalName: true, tradeName: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    take: 100,
  });
  return {
    status: resolutionStatus(matches.length),
    candidates: matches.map(({ article, ...identifier }) => ({
      ...article,
      ivaKey: getVatKeyFromTreatmentAndRate(article.vatTreatment as VatTreatment, article.vatRate),
      commercialProfile: formatCommercialProfile(article.commercialProfiles?.[0]),
      identifier,
    })),
  };
}

export async function searchArticles(db: Db, companyId: string, query: ArticleLookupQuery) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const q = query.q ? normalizeArticleIdentifier(query.q) : undefined;
  const articles = await db.article.findMany({
    where: {
      organizationId,
      isActive: true,
      stockEligibilities: { some: { companyId } },
      ...(q
        ? {
            OR: [
              { sku: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
              { identifiers: { some: { normalizedValue: { contains: q }, isActive: true } } },
            ],
          }
        : {}),
    },
    include: {
      identifiers: { where: { isActive: true } },
      tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 },
      commercialProfiles: {
        where: { companyId },
        take: 1,
        include: {
          preferredSupplier: {
            select: {
              contactId: true,
              contact: {
                select: { legalName: true, tradeName: true, firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
    orderBy: { description: "asc" },
    take: query.take,
  });
  return articles.map((article) => {
    const commercialProfile = formatCommercialProfile(article.commercialProfiles?.[0]);
    return {
      ...article,
      ivaKey: getVatKeyFromTreatmentAndRate(article.vatTreatment as VatTreatment, article.vatRate),
      commercialProfile,
      cost: commercialProfile ? commercialProfile.referenceCost : 0,
      price: commercialProfile ? commercialProfile.referenceSalePrice : 0,
      stock: 0,
    };
  });
}

export async function resolveSupplierCode(
  db: Db,
  companyId: string,
  supplierId: string,
  supplierCode: string,
) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const mappings = await db.articleSupplierMapping.findMany({
    where: {
      organizationId,
      companyId,
      supplierId,
      normalizedCode: normalizeArticleIdentifier(supplierCode),
      isActive: true,
      article: { stockEligibilities: { some: { companyId } } },
    },
    include: { article: true },
    take: 100,
  });
  return {
    status: resolutionStatus(mappings.length),
    candidates: mappings.map(({ article, ...mapping }) => ({
      ...article,
      ivaKey: getVatKeyFromTreatmentAndRate(article.vatTreatment as VatTreatment, article.vatRate),
      mapping,
    })),
  };
}

export async function deactivateSupplierMapping(
  db: Db,
  companyId: string,
  articleId: string,
  mappingId: string,
  actorUserId: string,
) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const mapping = await db.articleSupplierMapping.findFirst({
    where: { id: mappingId, articleId, organizationId, companyId, article: { stockEligibilities: { some: { companyId } } } },
  });
  if (!mapping) throw notFound("Supplier mapping not found", "supplier_mapping_not_found");
  const updated = await db.articleSupplierMapping.update({
    where: { id: mappingId },
    data: { isActive: false, deactivatedAt: new Date() },
  });
  await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "ArticleSupplierMapping",
    entityId: mappingId,
    action: "deactivated",
    module: "stock",
  });
  return updated;
}
