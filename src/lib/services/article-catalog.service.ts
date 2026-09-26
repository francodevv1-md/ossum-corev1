import type { Prisma, PrismaClient } from "@prisma/client";

import { badRequest, conflict, notFound } from "../api/errors";
import { type ArticleCatalogCreateInput, type ArticleCatalogKind, normalizeCatalogName } from "../validators/article-catalog";

type Db = PrismaClient | Prisma.TransactionClient;
type CatalogRow = { id: string; name: string; code: string; isActive: boolean; parentId?: string | null; depth?: number };

async function organizationIdForCompany(db: Db, companyId: string) {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { organizationId: true } });
  if (!company) throw notFound("Company not found", "company_not_found");
  return company.organizationId;
}

function catalogCode(name: string) {
  return normalizeCatalogName(name).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "CATALOG";
}

function present(row: CatalogRow) {
  return { id: row.id, name: row.name, code: row.code, isActive: row.isActive, parentId: row.parentId ?? null, depth: row.depth ?? null };
}

export async function listArticleCatalog(db: Db, companyId: string, kind: ArticleCatalogKind) {
  const organizationId = await organizationIdForCompany(db, companyId);
  if (kind === "category") return (await db.productCategory.findMany({ where: { organizationId, isActive: true }, select: { id: true, name: true, code: true, isActive: true, parentId: true, depth: true }, orderBy: [{ depth: "asc" }, { name: "asc" }] })).map(present);
  if (kind === "clinical-family") return (await db.clinicalFamily.findMany({ where: { organizationId, isActive: true }, select: { id: true, name: true, code: true, isActive: true }, orderBy: { name: "asc" } })).map(present);
  if (kind === "brand") return (await db.brand.findMany({ where: { organizationId, isActive: true }, select: { id: true, name: true, code: true, isActive: true }, orderBy: { name: "asc" } })).map(present);
  if (kind === "manufacturer") return (await db.manufacturer.findMany({ where: { organizationId, isActive: true }, select: { id: true, name: true, code: true, isActive: true }, orderBy: { name: "asc" } })).map(present);
  return (await db.productLine.findMany({ where: { organizationId, isActive: true }, select: { id: true, name: true, code: true, isActive: true }, orderBy: { name: "asc" } })).map(present);
}

export async function createArticleCatalog(db: Db, companyId: string, kind: ArticleCatalogKind, input: ArticleCatalogCreateInput) {
  const organizationId = await organizationIdForCompany(db, companyId);
  const name = input.name.trim();
  const normalizedName = normalizeCatalogName(name);
  const code = catalogCode(name);
  try {
    if (kind === "category") {
      const parent = input.parentId ? await db.productCategory.findFirst({ where: { id: input.parentId, organizationId, isActive: true }, select: { id: true, depth: true } }) : null;
      if (input.parentId && !parent) throw badRequest("Category parent is not active in this organization", "catalog_parent_invalid");
      if (parent && parent.depth >= 3) throw badRequest("Category depth cannot exceed three", "catalog_depth_invalid");
      return present(await db.productCategory.create({ data: { organizationId, name, normalizedName, code, parentId: parent?.id, depth: (parent?.depth ?? 0) + 1 }, select: { id: true, name: true, code: true, isActive: true, parentId: true, depth: true } }));
    }
    if (kind === "clinical-family") return present(await db.clinicalFamily.create({ data: { organizationId, name, normalizedName, code }, select: { id: true, name: true, code: true, isActive: true } }));
    if (kind === "brand") return present(await db.brand.create({ data: { organizationId, name, normalizedName, code }, select: { id: true, name: true, code: true, isActive: true } }));
    if (kind === "manufacturer") return present(await db.manufacturer.create({ data: { organizationId, name, normalizedName, code }, select: { id: true, name: true, code: true, isActive: true } }));
    return present(await db.productLine.create({ data: { organizationId, name, normalizedName, code }, select: { id: true, name: true, code: true, isActive: true } }));
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") throw conflict("An active catalog item with this name or code already exists", "catalog_duplicate");
    throw error;
  }
}
