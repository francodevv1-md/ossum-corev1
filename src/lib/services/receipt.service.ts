import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import { resolveArticleIdentifier } from "./article.service";
import type { ReceiptLineInput } from "../validators/receipt-preparation";
import { parseGs1DataMatrix } from "../gs1";
import { normalizeArticleIdentifier } from "../validators/article";

type Db = PrismaClient | Prisma.TransactionClient;
const D = (value: string | number) => new Prisma.Decimal(value);

async function companyExists(db: Db, companyId: string) {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) throw notFound("Company not found", "company_not_found");
}

type ExpectedReceiptLineInput = {
  articleId?: string;
  code?: string;
  description?: string;
  expectedQuantity: string;
  lotCode?: string;
  expirationDate?: Date;
};

export async function createReceipt(db: Db, companyId: string, userId: string, input: { supplierId?: string; documentReference?: string; idempotencyKey?: string; expectedLines?: ExpectedReceiptLineInput[] }) {
  await companyExists(db, companyId);
  if (input.idempotencyKey) {
    const existing = await db.goodsReceipt.findFirst({ where: { companyId, idempotencyKey: input.idempotencyKey }, include: { lines: true } });
    if (existing) return existing;
  }
  const receipt = await db.goodsReceipt.create({
    data: {
      companyId,
      createdById: userId,
      supplierId: input.supplierId,
      documentReference: input.documentReference,
      idempotencyKey: input.idempotencyKey,
      lines: input.expectedLines?.length ? {
        create: input.expectedLines.map((line, index) => ({
          lineNumber: index + 1,
          article: line.articleId ? { connect: { id: line.articleId } } : undefined,
          requestedQuantity: D(line.expectedQuantity),
          expectedQuantity: D(line.expectedQuantity),
          expectedCode: line.code,
          expectedDescription: line.description,
          lotCode: line.lotCode,
          expirationDate: line.expirationDate,
          resolutionStatus: line.articleId ? "EXPECTED" : "PENDING",
        })),
      } : undefined,
    },
    include: { lines: true },
  });
  await createAuditEvent({ prisma: db, companyId, userId, entityType: "GoodsReceipt", entityId: receipt.id, action: "created", module: "stock" });
  return receipt;
}

export async function addReceiptLine(db: Db, companyId: string, receiptId: string, userId: string, input: ReceiptLineInput) {
  const receipt = await db.goodsReceipt.findFirst({ where: { companyId, id: receiptId, status: "DRAFT" } });
  if (!receipt) throw notFound("Draft receipt not found", "receipt_not_found");
  const article = await db.article.findFirst({ where: { id: input.articleId, stockEligibilities: { some: { companyId } } }, select: { id: true } });
  if (!article) throw notFound("Article not found", "article_not_found");
  const count = await db.goodsReceiptLine.count({ where: { companyId, receiptId } });
  return db.goodsReceiptLine.create({ data: { companyId, receiptId, lineNumber: count + 1, articleId: input.articleId, requestedQuantity: D(input.requestedQuantity), receivedQuantity: D(input.requestedQuantity), receivedLotCode: input.lotCode, receivedSerialNumber: input.serialNumber, receivedExpirationDate: input.expirationDate, lotCode: input.lotCode, serialNumber: input.serialNumber, expirationDate: input.expirationDate, rawScan: input.rawScan, resolutionStatus: "RESOLVED" } });
}

const bioprotece = "BIOPROTECE";

async function resolveScannedArticle(db: Db, companyId: string, rawValue: string) {
  const parsed = parseGs1DataMatrix(rawValue);
  const queries: Array<{ identifier: string; identifierType: "GTIN_EAN" | "GS1_AI_22" | "MANUFACTURER_REF" | "SUPPLIER_CODE" | "ALTERNATIVE_CODE"; manufacturerContext?: string }> = [
    ...(parsed.gtin ? [{ identifier: parsed.gtin, identifierType: "GTIN_EAN" as const }] : []),
    ...(parsed.articleCode ? [{ identifier: parsed.articleCode, identifierType: "GS1_AI_22" as const, manufacturerContext: bioprotece }] : []),
    ...(parsed.additionalReference ? [{ identifier: parsed.additionalReference, identifierType: "MANUFACTURER_REF" as const }] : []),
  ];
  const hasGs1Data = Boolean(parsed.gtin || parsed.articleCode || parsed.additionalReference || parsed.lotCode || parsed.serialNumber || parsed.expirationDate);
  if (!hasGs1Data) for (const identifierType of ["GTIN_EAN", "MANUFACTURER_REF", "SUPPLIER_CODE", "ALTERNATIVE_CODE"] as const) queries.push({ identifier: parsed.normalizedValue, identifierType });
  const candidates = new Map<string, { id: string; sku: string; description: string; identifier?: { value: string } }>();
  for (const query of queries) (await resolveArticleIdentifier(db, companyId, { ...query, take: 100 })).candidates.forEach((candidate) => candidates.set(candidate.id, candidate));
  return { parsed, candidates: [...candidates.values()] };
}

type TraceProfile = { minimumRequirement: string; expirationRequired: boolean };
type GuidedAction = "identify_article" | "lot" | "serial" | "expiry" | "ready";

function profileFromPolicy(policy?: { policy?: string | null; minimumRequirement?: string; expirationRequired?: boolean } | null): TraceProfile {
  if (policy?.minimumRequirement) return { minimumRequirement: policy.minimumRequirement, expirationRequired: Boolean(policy.expirationRequired) };
  const legacy = policy?.policy ?? "NONE";
  return {
    minimumRequirement: legacy === "LOT_SERIAL_EXPIRY" ? "LOT_AND_SERIAL" : legacy.startsWith("LOT") ? "LOT" : legacy.startsWith("SERIAL") ? "SERIAL" : "NONE",
    expirationRequired: legacy.endsWith("EXPIRY"),
  };
}

export function nextReceiptTraceAction(profile: TraceProfile, trace: { lotCode?: string | null; serialNumber?: string | null; expirationDate?: Date | null }, identified = true): GuidedAction {
  if (!identified) return "identify_article";
  if ((profile.minimumRequirement === "LOT" || profile.minimumRequirement === "LOT_AND_SERIAL") && !trace.lotCode) return "lot";
  if ((profile.minimumRequirement === "SERIAL" || profile.minimumRequirement === "LOT_AND_SERIAL") && !trace.serialNumber) return "serial";
  if (profile.minimumRequirement === "LOT_OR_SERIAL" && !trace.lotCode && !trace.serialNumber) return "lot";
  if (profile.expirationRequired && !trace.expirationDate) return "expiry";
  return "ready";
}

export async function getReceiptForOperation(db: Db, companyId: string, receiptId: string) {
  const receipt = await db.goodsReceipt.findFirst({
    where: { companyId, id: receiptId },
    include: {
      lines: { include: { scans: { orderBy: { createdAt: "asc" } } }, orderBy: { lineNumber: "asc" } },
      scanEvents: {
        where: { resolutionStatus: { not: "RESOLVED" } },
        include: { article: { include: { tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!receipt) throw notFound("Receipt not found", "receipt_not_found");
  const { scanEvents, ...base } = receipt;
  return {
    ...base,
    pendingScans: scanEvents.map(({ article, ...event }) => ({
      event,
      status: event.resolutionStatus,
      candidates: Array.isArray(event.candidates) ? event.candidates : [],
      line: event.lineId ? receipt.lines.find((line) => line.id === event.lineId) : undefined,
      nextAction: event.resolutionStatus === "PENDING_TRACE" && article ? nextReceiptTraceAction(profileFromPolicy(article.tracePolicies[0]), event) : "identify_article",
    })),
  };
}

async function ensureReceiptLine(tx: Prisma.TransactionClient, companyId: string, receiptId: string, articleId: string, expectedCodes: string[] = []) {
  const line = await tx.goodsReceiptLine.findFirst({ where: { companyId, receiptId, articleId }, orderBy: { lineNumber: "asc" } });
  if (line) return line;
  const normalizedCodes = new Set(expectedCodes.filter(Boolean).map(normalizeArticleIdentifier));
  if (normalizedCodes.size) {
    const expectedLines = await tx.goodsReceiptLine.findMany({ where: { companyId, receiptId, articleId: null, expectedCode: { not: null } }, orderBy: { lineNumber: "asc" } });
    const matches = expectedLines.filter((expected) => expected.expectedCode && normalizedCodes.has(normalizeArticleIdentifier(expected.expectedCode)));
    if (matches.length === 1) {
      const claimed = await tx.goodsReceiptLine.updateMany({ where: { id: matches[0].id, articleId: null }, data: { articleId, resolutionStatus: "PENDING_TRACE" } });
      if (claimed.count === 1) return tx.goodsReceiptLine.findUniqueOrThrow({ where: { id: matches[0].id } });
      return ensureReceiptLine(tx, companyId, receiptId, articleId, expectedCodes);
    }
  }
  return tx.goodsReceiptLine.create({ data: { companyId, receiptId, lineNumber: await tx.goodsReceiptLine.count({ where: { companyId, receiptId } }) + 1, articleId, requestedQuantity: D(0), resolutionStatus: "PENDING_TRACE" } });
}

async function finalizeScanIfReady(tx: Prisma.TransactionClient, companyId: string, receiptId: string, scanId: string, profile: TraceProfile) {
  const scan = await tx.scanEvent.findFirst({ where: { id: scanId, companyId, receiptId } });
  if (!scan || !scan.articleId || !scan.lineId) throw notFound("Pending scan not found", "receipt_scan_not_found");
  const nextAction = nextReceiptTraceAction(profile, scan);
  if (nextAction !== "ready") return { event: scan, line: await tx.goodsReceiptLine.findUniqueOrThrow({ where: { id: scan.lineId } }), status: "PENDING_TRACE", nextAction };
  const claimed = await tx.scanEvent.updateMany({ where: { id: scan.id, resolutionStatus: "PENDING_TRACE" }, data: { resolutionStatus: "RESOLVING" } });
  if (claimed.count !== 1) throw conflict("Receipt scan is already being resolved", "receipt_scan_already_resolved");
  const [event, line] = await Promise.all([
    tx.scanEvent.update({ where: { id: scan.id }, data: { resolutionStatus: "RESOLVED" } }),
    tx.goodsReceiptLine.update({ where: { id: scan.lineId }, data: { receivedQuantity: { increment: 1 }, resolutionStatus: "RESOLVED" } }),
  ]);
  return { event, line, status: "RESOLVED", nextAction: "ready" as const };
}

async function attachResolvedScan(tx: Prisma.TransactionClient, companyId: string, receiptId: string, scanId: string, articleId: string) {
  const scan = await tx.scanEvent.findFirst({ where: { id: scanId, companyId, receiptId } });
  if (!scan) throw notFound("Pending scan not found", "receipt_scan_not_found");
  const claimed = await tx.scanEvent.updateMany({ where: { id: scan.id, resolutionStatus: "PENDING" }, data: { resolutionStatus: "RESOLVING" } });
  if (claimed.count !== 1) throw conflict("Receipt scan is already being resolved", "receipt_scan_already_resolved");
  const article = await tx.article.findFirst({ where: { id: articleId, stockEligibilities: { some: { companyId } } }, include: { identifiers: { where: { isActive: true } }, tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } });
  if (!article) throw notFound("Article not found", "article_not_found");
  const line = await ensureReceiptLine(tx, companyId, receiptId, articleId, [article.sku, ...article.identifiers.map((identifier) => identifier.value)]);
  await tx.scanEvent.update({ where: { id: scan.id }, data: { articleId, lineId: line.id, resolutionStatus: "PENDING_TRACE" } });
  return finalizeScanIfReady(tx, companyId, receiptId, scan.id, profileFromPolicy(article.tracePolicies[0]));
}

export async function scanReceipt(db: PrismaClient, companyId: string, receiptId: string, userId: string, input: { rawValue: string }) {
  return db.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.findFirst({ where: { companyId, id: receiptId, status: "DRAFT" } });
    if (!receipt) throw notFound("Draft receipt not found", "receipt_not_found");
    const { parsed, candidates } = await resolveScannedArticle(tx, companyId, input.rawValue);
    if (candidates.length !== 1) {
      const event = await tx.scanEvent.create({ data: { companyId, receiptId, rawValue: parsed.rawValue, normalizedValue: parsed.normalizedValue, resolutionStatus: "PENDING", candidates: candidates as Prisma.InputJsonValue, lotCode: parsed.lotCode, serialNumber: parsed.serialNumber, expirationDate: parsed.expirationDate, createdById: userId } });
      return { event, status: "PENDING", candidates };
    }
    const article = await tx.article.findUniqueOrThrow({ where: { id: candidates[0].id }, include: { tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } });
    const line = await ensureReceiptLine(tx, companyId, receiptId, article.id, [article.sku, candidates[0].identifier?.value ?? ""]);
    const event = await tx.scanEvent.create({ data: { companyId, receiptId, lineId: line.id, articleId: article.id, rawValue: parsed.rawValue, normalizedValue: parsed.normalizedValue, resolutionStatus: "PENDING_TRACE", candidates: candidates as Prisma.InputJsonValue, lotCode: parsed.lotCode, serialNumber: parsed.serialNumber, expirationDate: parsed.expirationDate, createdById: userId } });
    const result = await finalizeScanIfReady(tx, companyId, receiptId, event.id, profileFromPolicy(article.tracePolicies[0]));
    return { ...result, candidates };
  });
}

export async function resolveReceiptScan(db: PrismaClient, companyId: string, receiptId: string, scanId: string, userId: string, articleId: string) {
  return db.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.findFirst({ where: { companyId, id: receiptId, status: "DRAFT" } });
    if (!receipt) throw notFound("Draft receipt not found", "receipt_not_found");
    return attachResolvedScan(tx, companyId, receiptId, scanId, articleId);
  });
}

export async function captureReceiptScan(db: PrismaClient, companyId: string, receiptId: string, scanId: string, userId: string, rawValue: string) {
  return db.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.findFirst({ where: { companyId, id: receiptId, status: "DRAFT" } });
    if (!receipt) throw notFound("Draft receipt not found", "receipt_not_found");
    const scan = await tx.scanEvent.findFirst({ where: { id: scanId, companyId, receiptId, resolutionStatus: "PENDING_TRACE" }, include: { article: { include: { tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } } } });
    if (!scan?.article) throw notFound("Guided receipt scan not found", "receipt_scan_not_found");
    const profile = profileFromPolicy(scan.article.tracePolicies[0]);
    const nextAction = nextReceiptTraceAction(profile, scan);
    if (nextAction === "ready" || nextAction === "identify_article") throw badRequest("Receipt scan is not awaiting trace data", "receipt_scan_not_capturable");
    const history = Array.isArray(scan.captureHistory) ? scan.captureHistory : [];
    const expirationDate = nextAction === "expiry" ? new Date(rawValue.trim()) : undefined;
    if (expirationDate && Number.isNaN(expirationDate.getTime())) throw badRequest("Expiration date is invalid", "receipt_expiration_invalid");
    await tx.scanEvent.update({ where: { id: scan.id }, data: { ...(nextAction === "lot" ? { lotCode: rawValue.trim() } : nextAction === "serial" ? { serialNumber: rawValue.trim() } : { expirationDate }), captureHistory: [...history, { action: nextAction, rawValue: rawValue.trim(), capturedById: userId }] } });
    return finalizeScanIfReady(tx, companyId, receiptId, scan.id, profile);
  });
}

async function getContext(tx: Prisma.TransactionClient, companyId: string) {
  let deposit = await tx.stockDeposit.findFirst({ where: { companyId, active: true } });
  if (!deposit) deposit = await tx.stockDeposit.create({ data: { companyId, code: "DEFAULT", name: "Default deposit", active: true } });
  let context = await tx.stockContext.findFirst({ where: { companyId, kind: "DEPOSIT", depositId: deposit.id } });
  if (!context) context = await tx.stockContext.create({ data: { companyId, kind: "DEPOSIT", depositId: deposit.id, labelSnapshot: deposit.name } });
  return context;
}

export function traceMode(policy: string | TraceProfile, trace?: { lotCode?: string | null; serialNumber?: string | null }): "NONE" | "LOT" | "IDENTIFIED_UNIT" {
  const profile = typeof policy === "string" ? profileFromPolicy({ policy }) : policy;
  if (profile.minimumRequirement === "LOT_OR_SERIAL") return trace?.serialNumber ? "IDENTIFIED_UNIT" : "LOT";
  return profile.minimumRequirement === "SERIAL" || profile.minimumRequirement === "LOT_AND_SERIAL" ? "IDENTIFIED_UNIT" : profile.minimumRequirement === "LOT" ? "LOT" : "NONE";
}

export function assertLotExpirationCompatible(existing: Date | null, incoming: Date | null): void {
  if (existing?.toISOString().slice(0, 10) !== incoming?.toISOString().slice(0, 10)) throw conflict("Lot expiration conflicts with existing stock evidence", "lot_expiration_conflict_pending");
}

export function validateReceiptTrace(policy: string | TraceProfile, line: { requestedQuantity: Prisma.Decimal; lotCode: string | null; serialNumber: string | null; expirationDate: Date | null }) {
  const profile = typeof policy === "string" ? profileFromPolicy({ policy }) : policy;
  if (nextReceiptTraceAction(profile, line) !== "ready") throw badRequest("Receipt trace data does not meet the article minimum", "receipt_trace_policy_mismatch");
  if ((profile.minimumRequirement === "SERIAL" || profile.minimumRequirement === "LOT_AND_SERIAL" || profile.minimumRequirement === "LOT_OR_SERIAL") && line.serialNumber && !line.requestedQuantity.eq(1)) throw badRequest("Serialized receipt lines must have quantity 1", "serialized_quantity_invalid");
}

export function buildSerialLookupWhere(companyId: string, articleId: string, serialNumber: string) {
  return { companyId, serialNumber: serialNumber.trim().toUpperCase(), identifiedUnit: { articleId } } as const;
}

export function assertUniqueReceiptSerials(scans: Array<{ articleId: string; serialNumber: string | null }>) {
  const serialKeys = new Set<string>();
  for (const scan of scans) {
    if (!scan.serialNumber) continue;
    const key = `${scan.articleId}:${scan.serialNumber.trim().toUpperCase()}`;
    if (serialKeys.has(key)) throw conflict("Duplicate serial in receipt", "duplicate_receipt_serial");
    serialKeys.add(key);
  }
}

export async function confirmReceipt(db: Db, companyId: string, receiptId: string, userId: string, idempotencyKey?: string) {
  return db.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.findFirst({ where: { companyId, id: receiptId }, include: { lines: true, scanEvents: { orderBy: { createdAt: "asc" } } } });
    if (!receipt) throw notFound("Receipt not found", "receipt_not_found");
    if (receipt.status === "CONFIRMED") return receipt;
    if (receipt.status !== "DRAFT") throw conflict("Receipt cannot be confirmed", "receipt_not_confirmable");
    if (!receipt.scanEvents.length || receipt.scanEvents.some((scan) => scan.resolutionStatus !== "RESOLVED" || !scan.articleId || !scan.lineId)) throw badRequest("Receipt has unresolved scans", "receipt_scans_pending");
    const receiptLines = new Map(receipt.lines.map((line) => [line.id, line]));
    const unitLines = receipt.scanEvents.map((scan, index) => {
      const line = receiptLines.get(scan.lineId!);
      if (!line || line.articleId !== scan.articleId) throw badRequest("Receipt scan is not linked to its aggregate line", "receipt_scan_line_mismatch");
      return { ...line, lineNumber: index + 1, receivedQuantity: D(1), receivedLotCode: scan.lotCode, receivedSerialNumber: scan.serialNumber, receivedExpirationDate: scan.expirationDate };
    });
    assertUniqueReceiptSerials(receipt.scanEvents.map((scan) => ({ articleId: scan.articleId!, serialNumber: scan.serialNumber })));
    for (const line of unitLines) {
      const article = await tx.article.findUnique({ where: { id: line.articleId! }, include: { tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } });
      if (!article) throw notFound("Article not found", "article_not_found");
       const profile = profileFromPolicy(article.tracePolicies[0]);
      const actualLine = {
        requestedQuantity: line.receivedQuantity,
        lotCode: line.receivedLotCode ?? line.lotCode,
        serialNumber: (line.receivedSerialNumber ?? line.serialNumber)?.trim().toUpperCase() ?? null,
        expirationDate: line.receivedExpirationDate ?? line.expirationDate,
      };
       validateReceiptTrace(profile, actualLine);
    }
    const audit = await createAuditEvent({ prisma: tx, companyId, userId, entityType: "GoodsReceipt", entityId: receipt.id, action: "confirmed", module: "stock" });
    const command = await tx.operationalCommandAcceptance.create({ data: { companyId, domain: "stock", sourceOperationId: idempotencyKey ?? `receipt:${receipt.id}`, checkpoint: "receipt-confirm", scopeKey: receipt.id, intentHash: idempotencyKey ?? receipt.id, acceptedAt: new Date(), acceptedById: userId, resultEntityType: "GoodsReceipt", resultEntityId: receipt.id, auditEventId: audit.id } });
    const context = await getContext(tx, companyId);
    const evidence = await tx.stockEvidence.create({ data: { companyId, kind: "RECEIPT", recordKind: "ORIGINAL", sourceDomain: "stock", sourceEntityType: "GoodsReceipt", sourceEntityId: receipt.id, sourceCheckpoint: "receipt-confirm", acceptedAt: new Date(), acceptedById: userId, commandAcceptanceId: command.id, auditEventId: audit.id } });
    for (const line of unitLines) {
      const article = await tx.article.findUnique({ where: { id: line.articleId! }, include: { stockEligibilities: { where: { companyId } }, tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } });
      const eligibility = article?.stockEligibilities[0];
      if (!article || !eligibility) throw notFound("Article eligibility not found", "article_not_stock_eligible");
       const profile = profileFromPolicy(article.tracePolicies[0]);
       const actualLine = {
        requestedQuantity: line.receivedQuantity,
        lotCode: line.receivedLotCode ?? line.lotCode,
        serialNumber: (line.receivedSerialNumber ?? line.serialNumber)?.trim().toUpperCase() ?? null,
         expirationDate: line.receivedExpirationDate ?? line.expirationDate,
       };
       const mode = traceMode(profile, actualLine);
      let policyVersionId = eligibility.currentPolicyVersionId;
      if (!policyVersionId) {
        const policyAudit = await createAuditEvent({ prisma: tx, companyId, userId, entityType: "StockArticlePolicyVersion", entityId: eligibility.id, action: "created", module: "stock" });
        const policyCommand = await tx.operationalCommandAcceptance.create({ data: { companyId, domain: "stock", sourceOperationId: `receipt-policy:${receipt.id}:${article.id}`, checkpoint: "receipt-policy", scopeKey: article.id, intentHash: `${receipt.id}:${article.id}`, acceptedAt: new Date(), acceptedById: userId, resultEntityType: "StockArticlePolicyVersion", resultEntityId: eligibility.id, auditEventId: policyAudit.id } });
        const policyVersion = await tx.stockArticlePolicyVersion.create({ data: { companyId, eligibilityId: eligibility.id, versionNumber: 1, eligible: true, stockUnit: article.unit, quantityScale: 4, traceMode: mode, effectiveAt: new Date(), acceptedAt: new Date(), acceptedById: userId, commandAcceptanceId: policyCommand.id } });
        await tx.stockArticleEligibility.update({ where: { companyId_articleId: { companyId, articleId: article.id } }, data: { currentPolicyVersionId: policyVersion.id } });
        policyVersionId = policyVersion.id;
      }
      const scopeKey = `${article.id}:${context.id}:${mode}:${actualLine.lotCode ?? ""}:${actualLine.serialNumber ?? ""}`;
      let lotId: string | null = null;
      let identifiedUnitId: string | null = null;
      let identifiedCodeSnapshot: string | null = null;
        if (profile.minimumRequirement === "LOT" || profile.minimumRequirement === "LOT_AND_SERIAL") {
          if (!actualLine.lotCode) throw badRequest("Lot code is required", "lot_code_required");
          const normalizedLotCode = actualLine.lotCode.trim().toUpperCase();
        const existingLot = await tx.stockLot.findUnique({ where: { companyId_articleId_normalizedLotCode: { companyId, articleId: article.id, normalizedLotCode } }, include: { primaryObservation: { select: { expirationDate: true } } } });
        if (existingLot) {
          assertLotExpirationCompatible(existingLot.primaryObservation.expirationDate, actualLine.expirationDate);
          lotId = existingLot.id;
        }
        else {
          const observation = await tx.stockLotObservation.create({ data: { companyId, articleId: article.id, normalizedLotCode, displayLotCode: actualLine.lotCode, expirationDate: actualLine.expirationDate, sourceDomain: "stock", sourceEntityType: "GoodsReceiptLine", sourceEntityId: line.id, sourceScopeKey: line.id, recordKind: "ORIGINAL", observedAt: new Date(), observedById: userId, commandAcceptanceId: command.id, auditEventId: audit.id } });
          const lot = await tx.stockLot.create({ data: { companyId, articleId: article.id, normalizedLotCode, primaryObservationId: observation.id, acceptedAt: new Date(), acceptedById: userId, commandAcceptanceId: command.id } });
          lotId = lot.id;
        }
      }
       if (mode === "IDENTIFIED_UNIT") {
         if (!actualLine.serialNumber) throw badRequest("Serial number is required", "serial_number_required");
         const existing = await tx.stockIdentifiedUnitCurrentConfiguration.findFirst({ where: buildSerialLookupWhere(companyId, article.id, actualLine.serialNumber) });
        if (existing) throw conflict("Serial number already exists for this article", "duplicate_stock_serial");
         else {
           const unit = await tx.stockIdentifiedUnit.create({ data: { companyId, articleId: article.id } });
           const config = await tx.stockIdentifiedUnitConfigurationVersion.create({ data: { companyId, identifiedUnitId: unit.id, articleId: article.id, eligibilityId: eligibility.id, policyVersionId, versionNumber: 1, internalCode: `SERIAL:${actualLine.serialNumber}`, serialNumber: actualLine.serialNumber, effectiveAt: new Date(), acceptedAt: new Date(), acceptedById: userId, commandAcceptanceId: command.id, auditEventId: audit.id } });
           await tx.stockIdentifiedUnitCurrentConfiguration.create({ data: { companyId, identifiedUnitId: unit.id, configurationVersionId: config.id, internalCode: config.internalCode, serialNumber: config.serialNumber, version: 1 } });
           identifiedUnitId = unit.id;
           identifiedCodeSnapshot = config.internalCode;
         }
      }
      const position = await tx.stockPosition.upsert({ where: { companyId_scopeKey: { companyId, scopeKey } }, create: { companyId, articleId: article.id, eligibilityId: eligibility.id, policyVersionId, contextId: context.id, traceMode: mode, lotId, identifiedUnitId, stockUnit: article.unit, quantityScale: 4, scopeKey }, update: {} });
       await tx.stockEvidenceLine.create({ data: { companyId, evidenceId: evidence.id, lineNumber: line.lineNumber, articleId: article.id, toPositionId: position.id, quantity: actualLine.requestedQuantity, stockUnit: article.unit, scaleSnapshot: 4, lotCodeSnapshot: actualLine.lotCode, expirationDateSnapshot: actualLine.expirationDate, serialNumberSnapshot: actualLine.serialNumber, identifiedCodeSnapshot, sourceLineId: line.id } });
       await tx.stockPositionProjection.upsert({ where: { companyId_positionId: { companyId, positionId: position.id } }, create: { companyId, positionId: position.id, physicalQuantity: actualLine.requestedQuantity, reservedQuantity: D(0), availableQuantity: actualLine.requestedQuantity, underReviewQuantity: D(0), finalDispositionQuantity: D(0), version: 1, evidenceWatermark: evidence.id }, update: { physicalQuantity: { increment: actualLine.requestedQuantity }, availableQuantity: { increment: actualLine.requestedQuantity }, version: { increment: 1 }, evidenceWatermark: evidence.id } });
      await tx.goodsReceiptLine.update({ where: { id: line.id }, data: { confirmedEvidenceId: evidence.id } });
    }
    return tx.goodsReceipt.update({ where: { id: receipt.id }, data: { status: "CONFIRMED", confirmedAt: new Date(), confirmedById: userId }, include: { lines: { include: { scans: { orderBy: { createdAt: "asc" } } } } } });
  });
}
