import type { Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import type { BoxFormulaCreateInput, BoxFormulaLookupQuery } from "../validators/cajas";

type Db = PrismaClient | Prisma.TransactionClient;

async function getCompanyOrganization(db: Db, companyId: string) {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { organizationId: true } });
  if (!company) throw notFound("Company not found", "company_not_found");
  return company.organizationId;
}

function clean(value?: string | null): string | undefined {
  const result = value?.trim();
  return result || undefined;
}

function boxCode(): string {
  return `BOX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Cajas box formula is built on top of the C14 append-only / command-acceptance
 * pattern.  The creation flow resolves three circular dependencies inside a
 * single transaction:
 *
 *  1. CajasBoxFormula ←→ CajasFormulaVersion (currentVersionId ↔ formulaId)
 *  2. CajasFormulaVersion ←→ OperationalCommandAcceptance (commandAcceptanceId ↔ resultEntityId)
 *  3. CajasFormulaVersion ←→ CajasFormulaLine (deferred min-line constraint trigger)
 *
 * Pre-generated UUIDs break cycles 1 and 2; the DEFERRABLE INITIALLY DEFERRED
 * constraint trigger on cajas_formula_version lets us insert the version before
 * its lines, as long as the lines exist at commit time.
 */
export async function createBoxFormula(db: Db, companyId: string, input: BoxFormulaCreateInput, actorUserId: string) {
  const organizationId = await getCompanyOrganization(db, companyId);
  const sku = clean(input.sku) || boxCode();

  const existing = await db.article.findFirst({ where: { organizationId, sku }, select: { id: true } });
  if (existing) throw conflict("SKU already exists in this organization", "duplicate_sku");

  const formulaId = randomUUID();
  const versionId = randomUUID();
  const commandAcceptanceId = randomUUID();

  return db.$transaction(async (tx) => {
    // 1 — Create the box article + stock eligibility
    const article = await tx.article.create({
      data: {
        organizationId,
        sku,
        description: input.description.trim(),
        articleType: "Caja",
        brand: clean(input.brand),
        manufacturer: clean(input.manufacturer),
        family: clean(input.family),
        unit: "caja",
        stockEligibilities: { create: { companyId, version: 1 } },
      },
      include: { stockEligibilities: true },
    });

    // 2 — Validate every component article is stock-eligible in this company
    // and capture snapshots for the formula lines.
    const lineSnapshots: Array<{ articleId: string; expectedQuantity: number; stockUnit: string; sku: string; description: string }> = [];
    for (const line of input.lines) {
      const eligibility = await tx.stockArticleEligibility.findFirst({
        where: { companyId, articleId: line.articleId },
        select: { article: { select: { sku: true, description: true } } },
      });
      if (!eligibility) throw badRequest(`Article ${line.articleId} is not eligible for stock in this company`, "article_not_eligible");
      lineSnapshots.push({
        articleId: line.articleId,
        expectedQuantity: line.expectedQuantity,
        stockUnit: line.stockUnit,
        sku: eligibility.article.sku,
        description: eligibility.article.description,
      });
    }

    // 3 — AuditEvent for the command acceptance
    const auditEvent = await createAuditEvent({
      prisma: tx,
      companyId,
      userId: actorUserId,
      entityType: "CajasFormulaVersion",
      entityId: versionId,
      action: "formula_accepted",
      module: "cajas",
      newValue: { description: input.description, lineCount: input.lines.length },
    });

    // 4 — OperationalCommandAcceptance
    const intentPayload = { companyId, boxArticleId: article.id, lines: input.lines.map((l) => ({ articleId: l.articleId, quantity: l.expectedQuantity })) };
    const intentHash = createHash("sha256").update(JSON.stringify(intentPayload)).digest("hex");

    await tx.operationalCommandAcceptance.create({
      data: {
        id: commandAcceptanceId,
        companyId,
        domain: "cajas",
        sourceOperationId: formulaId,
        checkpoint: "formula-accept",
        scopeKey: `company:${companyId}:box:${article.id}`,
        intentHash,
        acceptedAt: new Date(),
        acceptedById: actorUserId,
        resultEntityType: "CajasFormulaVersion",
        resultEntityId: versionId,
        auditEventId: auditEvent.id,
      },
    });

    // 5 — CajasBoxFormula (INSERT with currentVersionId=null, nextVersionNumber=1, version=1)
    //     The BEFORE INSERT guard fn_cajas_formula_current_guard requires this exact shape.
    await tx.cajasBoxFormula.create({
      data: {
        id: formulaId,
        companyId,
        boxArticleId: article.id,
        currentVersionId: null,
        nextVersionNumber: 1,
        version: 1,
      },
    });

    // 6 — CajasFormulaVersion (versionNumber=1, previousVersionId=null)
    //     The min-line constraint trigger is DEFERRABLE — lines can be inserted after.
    await tx.cajasFormulaVersion.create({
      data: {
        id: versionId,
        companyId,
        formulaId,
        boxArticleId: article.id,
        versionNumber: 1,
        previousVersionId: null,
        acceptedAt: new Date(),
        acceptedById: actorUserId,
        commandAcceptanceId,
      },
    });

    // 7 — CajasFormulaLine[] (must exist before commit for the deferred trigger)
    for (let i = 0; i < lineSnapshots.length; i++) {
      const snap = lineSnapshots[i];
      await tx.cajasFormulaLine.create({
        data: {
          companyId,
          formulaVersionId: versionId,
          lineNumber: i + 1,
          articleId: snap.articleId,
          expectedQuantity: snap.expectedQuantity,
          stockUnit: snap.stockUnit,
          scaleSnapshot: 1,
          skuSnapshot: snap.sku,
          descriptionSnapshot: snap.description,
        },
      });
    }

    // 8 — Update CajasBoxFormula to point at the current version.
    //     The BEFORE UPDATE guard requires: nextVersionNumber=2, version=2,
    //     currentVersionId=versionId, and the version must have
    //     version_number=1, previous_version_id=null.
    await tx.cajasBoxFormula.update({
      where: { companyId_id: { companyId, id: formulaId } },
      data: { currentVersionId: versionId, nextVersionNumber: 2, version: 2 },
    });

    // 9 — Audit for the box formula creation
    await createAuditEvent({
      prisma: tx,
      companyId,
      userId: actorUserId,
      entityType: "CajasBoxFormula",
      entityId: formulaId,
      action: "created",
      module: "cajas",
      newValue: { sku, description: input.description, lineCount: input.lines.length },
    });

    return tx.cajasBoxFormula.findUnique({
      where: { companyId_id: { companyId, id: formulaId } },
      include: {
        boxEligibility: { include: { article: true } },
        currentVersion: { include: { lines: { include: { eligibility: { include: { article: true } } }, orderBy: { lineNumber: "asc" } } } },
      },
    });
  });
}

export async function searchBoxFormulas(db: Db, companyId: string, query: BoxFormulaLookupQuery) {
  const q = query.q?.trim();
  const formulas = await db.cajasBoxFormula.findMany({
    where: {
      companyId,
      boxEligibility: { article: { isActive: true } },
      ...(q ? {
        OR: [
          { boxEligibility: { article: { sku: { contains: q, mode: "insensitive" } } } },
          { boxEligibility: { article: { description: { contains: q, mode: "insensitive" } } } },
        ],
      } : {}),
    },
    include: {
      boxEligibility: { include: { article: true } },
      currentVersion: { include: { lines: { include: { eligibility: { include: { article: true } } }, orderBy: { lineNumber: "asc" } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: query.take,
  });
  return formulas.map((f) => ({
    id: f.id,
    sku: f.boxEligibility.article.sku,
    description: f.boxEligibility.article.description,
    brand: f.boxEligibility.article.brand,
    manufacturer: f.boxEligibility.article.manufacturer,
    family: f.boxEligibility.article.family,
    version: f.currentVersion?.versionNumber ?? 0,
    nextVersionNumber: f.nextVersionNumber,
    lineCount: f.currentVersion?.lines.length ?? 0,
    lines: (f.currentVersion?.lines ?? []).map((l) => ({
      lineNumber: l.lineNumber,
      articleId: l.articleId,
      sku: l.skuSnapshot ?? l.eligibility.article.sku,
      description: l.descriptionSnapshot ?? l.eligibility.article.description,
      expectedQuantity: Number(l.expectedQuantity),
      stockUnit: l.stockUnit,
    })),
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));
}

export async function getBoxFormula(db: Db, companyId: string, boxId: string) {
  const formula = await db.cajasBoxFormula.findFirst({
    where: { companyId, id: boxId },
    include: {
      boxEligibility: { include: { article: { include: { identifiers: { where: { isActive: true } } } } } },
      currentVersion: {
        include: {
          lines: { include: { eligibility: { include: { article: true } } }, orderBy: { lineNumber: "asc" } },
          acceptedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 5,
        select: { id: true, versionNumber: true, acceptedAt: true, cause: true, acceptedBy: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!formula) throw notFound("Box formula not found", "box_formula_not_found");
  return formula;
}
