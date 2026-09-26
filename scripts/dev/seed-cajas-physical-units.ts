import prisma from "../../src/lib/prisma";
import { normalizeArticleIdentifier } from "../../src/lib/validators/article";
import { updateArticle } from "../../src/lib/services/article.service";
import {
  captureReceiptScan,
  confirmReceipt,
  createReceipt,
  resolveReceiptScan,
  scanReceipt,
} from "../../src/lib/services/receipt.service";
import {
  assertCajasDemoCompany,
  assertCajasDemoDevBoundary,
  CAJAS_DEMO_COMPANY_ID as COMPANY_ID,
  CAJAS_DEMO_COMPANY_NAME as COMPANY_NAME,
} from "./cajas-demo-boundary";

const units = [
  ["DEMO-LG-T00KSP", "CAJA-DEMO-001"],
  ["DEMO-LG-T00IFP", "CAJA-DEMO-002"],
  ["DEMO-OS-T35CLU", "CAJA-DEMO-003"],
  ["DEMO-OS-T35DTU", "CAJA-DEMO-004"],
  ["DEMO-RC-X00CMI", "CAJA-DEMO-005"],
  ["DEMO-LG-T00PKP", "CAJA-DEMO-006"],
  ["DEMO-LC-T00LGI", "CAJA-DEMO-007"],
  ["DEMO-OS-A35XXU", "CAJA-DEMO-008"],
  ["DEMO-TR-T35TCU", "CAJA-DEMO-009"],
  ["DEMO-CL-T00FRI", "CAJA-DEMO-010"],
] as const;

type DemoBoxArticle = {
  id: string;
  sku: string;
  organizationId: string;
  tracePolicies: Array<{ minimumRequirement: string; expirationRequired: boolean }>;
  identifiers: Array<{ type: string; normalizedValue: string }>;
};

function hasExpectedArticleIdentity(article: DemoBoxArticle) {
  const policy = article.tracePolicies[0];
  const normalizedSku = normalizeArticleIdentifier(article.sku);
  return policy?.minimumRequirement === "SERIAL" && !policy.expirationRequired &&
    article.identifiers.some((identifier) => identifier.type === "ALTERNATIVE_CODE" && identifier.normalizedValue === normalizedSku);
}

async function ensureArticleIdentity(article: DemoBoxArticle, actorUserId: string) {
  const policy = article.tracePolicies[0];
  if (policy && (policy.minimumRequirement !== "NONE" && policy.minimumRequirement !== "SERIAL" || policy.expirationRequired)) {
    throw new Error(`Box article ${article.sku} has an incompatible traceability policy`);
  }

  const normalizedSku = normalizeArticleIdentifier(article.sku);
  const collision = await prisma.articleIdentifier.findFirst({
    where: { organizationId: article.organizationId, type: "ALTERNATIVE_CODE", normalizedValue: normalizedSku, scopeKey: "GLOBAL", isActive: true },
    select: { articleId: true },
  });
  if (collision && collision.articleId !== article.id) throw new Error(`Identifier collision for ${article.sku}`);

  const hasIdentifier = article.identifiers.some((identifier) => identifier.type === "ALTERNATIVE_CODE" && identifier.normalizedValue === normalizedSku);
  if (policy?.minimumRequirement !== "SERIAL" || !hasIdentifier) {
    await updateArticle(prisma, COMPANY_ID, article.id, {
      ...(policy?.minimumRequirement !== "SERIAL" ? { traceabilityRequirement: "SERIAL" as const, expirationRequired: false } : {}),
      ...(!hasIdentifier ? { identifiers: [{ type: "ALTERNATIVE_CODE" as const, value: article.sku }] } : {}),
    }, actorUserId);
  }
}

async function createUnitThroughReceipt(articleId: string, sku: string, serialNumber: string, actorUserId: string) {
  const idempotencyKey = `cajas-demo-physical:${sku}:v1`;
  const receipt = await createReceipt(prisma, COMPANY_ID, actorUserId, {
    documentReference: `Ingreso físico DEMO ${serialNumber}`,
    idempotencyKey,
  });

  const current = await prisma.goodsReceipt.findFirstOrThrow({
    where: { companyId: COMPANY_ID, id: receipt.id },
    include: { scanEvents: { orderBy: { createdAt: "asc" } } },
  });
  if (current.status === "CONFIRMED") return;
  if (current.status !== "DRAFT") throw new Error(`Receipt ${current.id} cannot be resumed`);
  if (current.scanEvents.length > 1) throw new Error(`Receipt ${current.id} contains unexpected extra scans`);

  let scan = current.scanEvents[0];
  if (!scan) {
    const result = await scanReceipt(prisma, COMPANY_ID, current.id, actorUserId, { rawValue: sku });
    scan = result.event;
  }
  if (scan.resolutionStatus === "PENDING") {
    const result = await resolveReceiptScan(prisma, COMPANY_ID, current.id, scan.id, actorUserId, articleId);
    scan = result.event;
  }
  if (scan.articleId !== articleId) throw new Error(`Receipt ${current.id} resolved to the wrong article`);
  if (scan.resolutionStatus === "PENDING_TRACE") {
    const result = await captureReceiptScan(prisma, COMPANY_ID, current.id, scan.id, actorUserId, serialNumber);
    scan = result.event;
  }
  if (scan.resolutionStatus !== "RESOLVED" || scan.serialNumber !== serialNumber) {
    throw new Error(`Receipt ${current.id} did not resolve serial ${serialNumber}`);
  }
  await confirmReceipt(prisma, COMPANY_ID, current.id, actorUserId, idempotencyKey);
}

async function main() {
  assertCajasDemoDevBoundary(process.env);

  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID },
    select: { name: true, isActive: true, organization: { select: { slug: true, isActive: true } } },
  });
  assertCajasDemoCompany(company);

  const access = await prisma.userCompanyAccess.findFirst({
    where: { companyId: COMPANY_ID, role: "admin", isActive: true, user: { isActive: true } },
    select: { userId: true },
  });
  if (!access) throw new Error("No active DEV admin is available for audit ownership");

  let createdUnits = 0;
  let skippedUnits = 0;
  for (const [sku, serialNumber] of units) {
    const formula = await prisma.cajasBoxFormula.findFirst({
      where: { companyId: COMPANY_ID, boxEligibility: { article: { sku } } },
      select: {
        boxArticleId: true,
        boxEligibility: { select: { article: { select: {
          id: true,
          sku: true,
          organizationId: true,
          tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1, select: { minimumRequirement: true, expirationRequired: true } },
          identifiers: { where: { isActive: true }, select: { type: true, normalizedValue: true } },
        } } } },
      },
    });
    if (!formula) throw new Error(`DEMO formula ${sku} not found`);

    const internalCode = `SERIAL:${serialNumber}`;
    const existing = await prisma.stockIdentifiedUnitCurrentConfiguration.findFirst({
      where: { companyId: COMPANY_ID, OR: [{ internalCode }, { serialNumber }] },
      select: {
        internalCode: true,
        serialNumber: true,
        identifiedUnit: { select: {
          id: true,
          articleId: true,
          stockPositions: { select: {
            traceMode: true,
            positionProjection: { select: { physicalQuantity: true, availableQuantity: true, reservedQuantity: true, underReviewQuantity: true, finalDispositionQuantity: true } },
            evidenceLinesTo: {
              where: { evidence: { kind: "RECEIPT", recordKind: "ORIGINAL" } },
              select: { quantity: true, serialNumberSnapshot: true, identifiedCodeSnapshot: true },
            },
          } },
        } },
      },
    });
    if (existing) {
      const positions = existing.identifiedUnit.stockPositions;
      const position = positions[0];
      const projection = position?.positionProjection;
      const receiptLines = position?.evidenceLinesTo ?? [];
      if (
        existing.identifiedUnit.articleId !== formula.boxArticleId || existing.internalCode !== internalCode || existing.serialNumber !== serialNumber ||
        !hasExpectedArticleIdentity(formula.boxEligibility.article) || positions.length !== 1 || position.traceMode !== "IDENTIFIED_UNIT" ||
        !projection?.physicalQuantity.equals(1) || !projection.availableQuantity.equals(1) || !projection.reservedQuantity.equals(0) ||
        !projection.underReviewQuantity.equals(0) || !projection.finalDispositionQuantity.equals(0) || receiptLines.length !== 1 ||
        !receiptLines[0].quantity.equals(1) || receiptLines[0].serialNumberSnapshot !== serialNumber || receiptLines[0].identifiedCodeSnapshot !== internalCode
      ) {
        throw new Error(`Physical unit collision for ${serialNumber}`);
      }
      skippedUnits += 1;
      continue;
    }

    const article = formula.boxEligibility.article;
    await ensureArticleIdentity(article, access.userId);
    await createUnitThroughReceipt(article.id, sku, serialNumber, access.userId);

    const created = await prisma.stockIdentifiedUnitCurrentConfiguration.findFirst({
      where: { companyId: COMPANY_ID, internalCode, serialNumber, identifiedUnit: { articleId: article.id } },
      select: { identifiedUnitId: true },
    });
    if (!created) throw new Error(`Physical unit ${serialNumber} was not created`);
    createdUnits += 1;
  }

  console.log(JSON.stringify({ createdUnits, skippedUnits, target: COMPANY_NAME }));
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
