import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import type {
  CajasFormulaCreateInput,
  CajasFormulaVersionPublishInput,
} from "../validators/cajas-formula";
import crypto from "node:crypto";

type Db = PrismaClient | Prisma.TransactionClient;

function supportsTransactions(db: Db): db is PrismaClient {
  return "$connect" in db && typeof db.$connect === "function" &&
    "$transaction" in db && typeof db.$transaction === "function";
}

function formulaIntentHash(
  operation: "create" | "publish",
  companyId: string,
  formulaIdentity: string,
  versionNumber: number,
  input: CajasFormulaCreateInput | CajasFormulaVersionPublishInput,
) {
  const lines = [...input.lines]
    .map(({ articleId, expectedQuantity, unit }) => ({
      articleId,
      expectedQuantity,
      unit: unit || null,
    }))
    .sort((a, b) => a.articleId.localeCompare(b.articleId) || (a.unit || "").localeCompare(b.unit || ""));

  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ operation, companyId, formulaIdentity, versionNumber, lines, cause: input.cause?.trim() || null }))
    .digest("hex");
}

async function getCompanyOrganization(db: Db, companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  });
  if (!company) throw notFound("Empresa no encontrada", "company_not_found");
  return company.organizationId;
}

export async function ensureArticleReference(
  db: Db,
  companyId: string,
  organizationId: string,
  articleId: string,
  actorUserId: string,
) {
  const article = await db.article.findFirst({
    where: {
      id: articleId,
      organizationId,
      stockEligibilities: { some: { companyId } },
    },
    select: {
      id: true,
      sku: true,
      description: true,
      unit: true,
      family: true,
      brand: true,
      articleType: true,
    },
  });

  if (!article) {
    throw notFound(
      `Artículo ${articleId} no encontrado o no habilitado para esta empresa`,
      "article_not_found",
    );
  }

  const existingRef = await db.cajasArticleReference.findUnique({
    where: {
      companyId_sourceArticleId: {
        companyId,
        sourceArticleId: article.id,
      },
    },
  });

  if (existingRef) {
    return { ref: existingRef, article };
  }

  const newRef = await db.cajasArticleReference.create({
    data: {
      companyId,
      sourceArticleId: article.id,
      skuSnapshot: article.sku,
      descriptionSnapshot: article.description,
      unit: article.unit || "u",
      verifiedAt: new Date(),
      verifiedById: actorUserId,
    },
  });

  return { ref: newRef, article };
}

export async function createBoxFormula(
  db: Db,
  companyId: string,
  input: CajasFormulaCreateInput,
  actorUserId: string,
) {
  if (supportsTransactions(db)) {
    return db.$transaction((tx) => createBoxFormula(tx, companyId, input, actorUserId));
  }

  const organizationId = await getCompanyOrganization(db, companyId);

  // 1. Ensure box article reference
  const { ref: boxRef, article: boxArticle } = await ensureArticleReference(
    db,
    companyId,
    organizationId,
    input.articleId,
    actorUserId,
  );

  // 2. Check if a formula already exists for this box article in this company
  const existingFormula = await db.cajasBoxFormula.findUnique({
    where: {
      companyId_boxArticleReferenceId: {
        companyId,
        boxArticleReferenceId: boxRef.id,
      },
    },
  });
  if (existingFormula) {
    throw conflict(
      "Ya existe una fórmula de composición para este artículo caja en la empresa",
      "duplicate_box_formula",
    );
  }

  // 3. Ensure component article references
  const componentRefs: Array<{
    refId: string;
    expectedQuantity: number;
    unit: string;
    skuSnapshot: string | null;
    descriptionSnapshot: string | null;
  }> = [];

  const seenArticleIds = new Set<string>();
  for (const line of input.lines) {
    if (seenArticleIds.has(line.articleId)) {
      throw badRequest(
        `Artículo componente duplicado en la composición: ${line.articleId}`,
        "duplicate_component_article",
      );
    }
    seenArticleIds.add(line.articleId);

    const { ref: compRef, article: compArticle } = await ensureArticleReference(
      db,
      companyId,
      organizationId,
      line.articleId,
      actorUserId,
    );

    componentRefs.push({
      refId: compRef.id,
      expectedQuantity: line.expectedQuantity,
      unit: line.unit || compArticle.unit || "u",
      skuSnapshot: compArticle.sku,
      descriptionSnapshot: compArticle.description,
    });
  }

  // 4. Create formula and version 1 in a transaction/atomic block
  const formulaId = "cbf_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const versionId = "cfv_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const commandAcceptanceId = "cca_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const currentSelectorId = "cfc_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);

  // Create AuditEvent first
  const auditEvent = await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "CajasBoxFormula",
    entityId: formulaId,
    action: "created",
    module: "stock",
    newValue: {
      boxArticleId: boxArticle.id,
      boxSku: boxArticle.sku,
      version: 1,
      lineCount: componentRefs.length,
      cause: input.cause || "Creación inicial de fórmula",
    },
  });

  const intentHash = formulaIntentHash("create", companyId, boxArticle.id, 1, input);

  // Create Command Acceptance
  const commandAcceptance = await db.cajasCommandAcceptance.create({
    data: {
      id: commandAcceptanceId,
      companyId,
      sourceOperationId: formulaId,
      checkpoint: "formulaVersion",
      semanticKey: `formula:${companyId}:${boxRef.id}:v1`,
      intentHash,
      acceptedAt: new Date(),
      acceptedById: actorUserId,
      resultEntityType: "CajasFormulaVersion",
      resultEntityId: versionId,
      auditEventId: auditEvent.id,
    },
  });

  // Create Box Formula Root
  const boxFormula = await db.cajasBoxFormula.create({
    data: {
      id: formulaId,
      companyId,
      boxArticleReferenceId: boxRef.id,
      nextVersion: 2,
    },
  });

  // Create Formula Version 1
  const formulaVersion = await db.cajasFormulaVersion.create({
    data: {
      id: versionId,
      companyId,
      formulaId: boxFormula.id,
      versionNumber: 1,
      previousVersionId: null,
      acceptedAt: new Date(),
      acceptedById: actorUserId,
      cause: input.cause?.trim() || "Composición inicial de caja modelo",
      commandAcceptanceId: commandAcceptance.id,
    },
  });

  // Create Lines
  let lineNumber = 1;
  for (const item of componentRefs) {
    await db.cajasFormulaLine.create({
      data: {
        companyId,
        formulaVersionId: formulaVersion.id,
        lineNumber: lineNumber++,
        articleReferenceId: item.refId,
        expectedQuantity: new Prisma.Decimal(item.expectedQuantity),
        unit: item.unit,
        skuSnapshot: item.skuSnapshot,
        descriptionSnapshot: item.descriptionSnapshot,
      },
    });
  }

  // Create Current Selector
  await db.cajasFormulaCurrent.create({
    data: {
      id: currentSelectorId,
      companyId,
      formulaId: boxFormula.id,
      currentFormulaVersionId: formulaVersion.id,
      version: 1,
    },
  });

  return getBoxFormula(db, companyId, boxFormula.id);
}

export async function publishFormulaVersion(
  db: Db,
  companyId: string,
  formulaId: string,
  input: CajasFormulaVersionPublishInput,
  actorUserId: string,
) {
  if (supportsTransactions(db)) {
    return db.$transaction((tx) => publishFormulaVersion(tx, companyId, formulaId, input, actorUserId));
  }

  const organizationId = await getCompanyOrganization(db, companyId);

  const formula = await db.cajasBoxFormula.findFirst({
    where: { id: formulaId, companyId },
    include: {
      currentSelector: true,
      boxArticleReference: true,
    },
  });

  if (!formula) {
    throw notFound("Fórmula de caja no encontrada para esta empresa", "box_formula_not_found");
  }

  const nextVersionNum = formula.nextVersion;
  const previousVersionId = formula.currentSelector?.currentFormulaVersionId || null;

  // Validate and resolve components
  const componentRefs: Array<{
    refId: string;
    expectedQuantity: number;
    unit: string;
    skuSnapshot: string | null;
    descriptionSnapshot: string | null;
  }> = [];

  const seenArticleIds = new Set<string>();
  for (const line of input.lines) {
    if (seenArticleIds.has(line.articleId)) {
      throw badRequest(
        `Artículo componente duplicado en la nueva versión: ${line.articleId}`,
        "duplicate_component_article",
      );
    }
    seenArticleIds.add(line.articleId);

    const { ref: compRef, article: compArticle } = await ensureArticleReference(
      db,
      companyId,
      organizationId,
      line.articleId,
      actorUserId,
    );

    componentRefs.push({
      refId: compRef.id,
      expectedQuantity: line.expectedQuantity,
      unit: line.unit || compArticle.unit || "u",
      skuSnapshot: compArticle.sku,
      descriptionSnapshot: compArticle.description,
    });
  }

  const versionId = "cfv_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const commandAcceptanceId = "cca_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);

  // AuditEvent
  const auditEvent = await createAuditEvent({
    prisma: db,
    companyId,
    userId: actorUserId,
    entityType: "CajasFormulaVersion",
    entityId: versionId,
    action: "created",
    module: "stock",
    newValue: {
      formulaId: formula.id,
      versionNumber: nextVersionNum,
      previousVersionId,
      lineCount: componentRefs.length,
      cause: input.cause?.trim() || `Publicación de versión ${nextVersionNum}`,
    },
  });

  const intentHash = formulaIntentHash("publish", companyId, formula.id, nextVersionNum, input);

  // Command acceptance
  const commandAcceptance = await db.cajasCommandAcceptance.create({
    data: {
      id: commandAcceptanceId,
      companyId,
      sourceOperationId: formula.id,
      checkpoint: "formulaVersion",
      semanticKey: `formula:${companyId}:${formula.id}:v${nextVersionNum}`,
      intentHash,
      acceptedAt: new Date(),
      acceptedById: actorUserId,
      resultEntityType: "CajasFormulaVersion",
      resultEntityId: versionId,
      auditEventId: auditEvent.id,
    },
  });

  // Create Formula Version
  const newVersion = await db.cajasFormulaVersion.create({
    data: {
      id: versionId,
      companyId,
      formulaId: formula.id,
      versionNumber: nextVersionNum,
      previousVersionId,
      acceptedAt: new Date(),
      acceptedById: actorUserId,
      cause: input.cause?.trim() || `Versión ${nextVersionNum}`,
      commandAcceptanceId: commandAcceptance.id,
    },
  });

  // Create Lines
  let lineNumber = 1;
  for (const item of componentRefs) {
    await db.cajasFormulaLine.create({
      data: {
        companyId,
        formulaVersionId: newVersion.id,
        lineNumber: lineNumber++,
        articleReferenceId: item.refId,
        expectedQuantity: new Prisma.Decimal(item.expectedQuantity),
        unit: item.unit,
        skuSnapshot: item.skuSnapshot,
        descriptionSnapshot: item.descriptionSnapshot,
      },
    });
  }

  // Update Current Selector
  if (formula.currentSelector) {
    await db.cajasFormulaCurrent.update({
      where: { id: formula.currentSelector.id },
      data: {
        currentFormulaVersionId: newVersion.id,
        version: { increment: 1 },
      },
    });
  } else {
    await db.cajasFormulaCurrent.create({
      data: {
        companyId,
        formulaId: formula.id,
        currentFormulaVersionId: newVersion.id,
        version: 1,
      },
    });
  }

  // Update nextVersion on root formula
  await db.cajasBoxFormula.update({
    where: { id: formula.id },
    data: {
      nextVersion: nextVersionNum + 1,
    },
  });

  return getBoxFormula(db, companyId, formula.id);
}

export async function listBoxFormulas(db: Db, companyId: string) {
  await getCompanyOrganization(db, companyId);

  const formulas = await db.cajasBoxFormula.findMany({
    where: { companyId },
    include: {
      boxArticleReference: true,
      currentSelector: {
        include: {
          currentFormulaVersion: {
            include: {
              acceptedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
              _count: { select: { lines: true } },
            },
          },
        },
      },
      _count: {
        select: { versions: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return formulas.map((f) => {
    const currentVersion = f.currentSelector?.currentFormulaVersion;
    const author = currentVersion?.acceptedBy;
    const authorName = author
      ? `${author.firstName || ""} ${author.lastName || ""}`.trim() || author.email
      : null;

    return {
      id: f.id,
      companyId: f.companyId,
      boxArticleId: f.boxArticleReference.sourceArticleId,
      boxSku: f.boxArticleReference.skuSnapshot,
      boxDescription: f.boxArticleReference.descriptionSnapshot,
      boxUnit: f.boxArticleReference.unit,
      currentVersionNumber: currentVersion?.versionNumber ?? 1,
      currentVersionId: currentVersion?.id ?? null,
      totalVersionsCount: f._count.versions,
      linesCount: currentVersion?._count.lines ?? 0,
      lastAcceptedAt: currentVersion?.acceptedAt.toISOString() ?? f.updatedAt.toISOString(),
      lastAcceptedByName: authorName,
      lastCause: currentVersion?.cause ?? null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    };
  });
}

export async function getBoxFormula(db: Db, companyId: string, formulaId: string) {
  await getCompanyOrganization(db, companyId);

  const formula = await db.cajasBoxFormula.findFirst({
    where: { id: formulaId, companyId },
    include: {
      boxArticleReference: true,
      currentSelector: {
        include: {
          currentFormulaVersion: {
            include: {
              acceptedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
              lines: {
                orderBy: { lineNumber: "asc" },
                include: {
                  articleReference: true,
                },
              },
            },
          },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          acceptedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { lines: true } },
          lines: {
            orderBy: { lineNumber: "asc" },
            include: {
              articleReference: true,
            },
          },
        },
      },
    },
  });

  if (!formula) {
    throw notFound("Fórmula de caja no encontrada", "box_formula_not_found");
  }

  const currentVersion = formula.currentSelector?.currentFormulaVersion;
  const currentAuthor = currentVersion?.acceptedBy;
  const currentAuthorName = currentAuthor
    ? `${currentAuthor.firstName || ""} ${currentAuthor.lastName || ""}`.trim() || currentAuthor.email
    : null;

  return {
    id: formula.id,
    companyId: formula.companyId,
    boxArticleId: formula.boxArticleReference.sourceArticleId,
    boxSku: formula.boxArticleReference.skuSnapshot,
    boxDescription: formula.boxArticleReference.descriptionSnapshot,
    boxUnit: formula.boxArticleReference.unit,
    nextVersion: formula.nextVersion,
    currentVersion: currentVersion
      ? {
          id: currentVersion.id,
          versionNumber: currentVersion.versionNumber,
          acceptedAt: currentVersion.acceptedAt.toISOString(),
          acceptedById: currentVersion.acceptedById,
          acceptedByName: currentAuthorName,
          cause: currentVersion.cause,
          lines: currentVersion.lines.map((l) => ({
            id: l.id,
            lineNumber: l.lineNumber,
            articleId: l.articleReference.sourceArticleId,
            sku: l.skuSnapshot || l.articleReference.skuSnapshot,
            description: l.descriptionSnapshot || l.articleReference.descriptionSnapshot,
            expectedQuantity: Number(l.expectedQuantity),
            unit: l.unit,
          })),
        }
      : null,
    versions: formula.versions.map((v) => {
      const author = v.acceptedBy;
      const authorName = author
        ? `${author.firstName || ""} ${author.lastName || ""}`.trim() || author.email
        : null;

      return {
        id: v.id,
        versionNumber: v.versionNumber,
        previousVersionId: v.previousVersionId,
        acceptedAt: v.acceptedAt.toISOString(),
        acceptedById: v.acceptedById,
        acceptedByName: authorName,
        cause: v.cause,
        lineCount: v._count.lines,
        lines: v.lines.map((l) => ({
          id: l.id,
          lineNumber: l.lineNumber,
          articleId: l.articleReference.sourceArticleId,
          sku: l.skuSnapshot || l.articleReference.skuSnapshot,
          description: l.descriptionSnapshot || l.articleReference.descriptionSnapshot,
          expectedQuantity: Number(l.expectedQuantity),
          unit: l.unit,
        })),
      };
    }),
    createdAt: formula.createdAt.toISOString(),
    updatedAt: formula.updatedAt.toISOString(),
  };
}
