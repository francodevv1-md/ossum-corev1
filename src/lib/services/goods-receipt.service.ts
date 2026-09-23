import { Prisma, type PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { badRequest, conflict, notFound } from "@/lib/api/errors";
import type { GoodsReceiptCreateInput } from "@/lib/validators/goods-receipt";

type Db = PrismaClient | Prisma.TransactionClient;
const RETRIES = 3;

function isRetryableConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (["P2034", "P2002"].includes(error.code)) return true;
  const cause = (error.meta?.driverAdapterError as { cause?: { originalCode?: string } } | undefined)?.cause;
  return error.code === "P2010" && cause?.originalCode === "40001";
}

function scopeKey(articleId: string, policyId: string, contextId: string, lotId?: string | null) {
  return `S1:${articleId}:${policyId}:${contextId}:${lotId ?? "NONE"}`;
}
function stableId(prefix: string, value: unknown) {
  return `${prefix}.${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export async function createGoodsReceipt(db: PrismaClient, companyId: string, actorId: string, input: GoodsReceiptCreateInput) {
  const existing = input.supplierRemittanceId ? await db.goodsReceipt.findFirst({ where: { companyId, supplierRemittanceId: input.supplierRemittanceId }, include: { lines: true } }) : input.idempotencyKey ? await db.goodsReceipt.findFirst({ where: { companyId, idempotencyKey: input.idempotencyKey }, include: { lines: true } }) : null;
  if (existing && (existing.status !== "DRAFT" || input.lines.length === 0)) return existing;
  if (existing?.lines.length) throw conflict("Goods receipt draft already has lines", "goods_receipt_draft_already_populated");
  if (input.supplierId) {
    const supplier = await db.contactCompanyLink.findFirst({ where: { companyId, contactId: input.supplierId, isActive: true, OR: [{ roles: { has: "proveedor" } }, { role: "proveedor" }] }, select: { contactId: true } });
    if (!supplier) throw badRequest("supplierId must be an active supplier contact in this company", "supplier_company_scope_invalid");
  }
  for (const row of input.lines) {
    const deposit = await db.stockDeposit.findFirst({ where: { id: row.depositId, companyId, active: true }, select: { id: true } });
    if (!deposit) throw badRequest("depositId must be an active company deposit", "receipt_deposit_invalid");
    const eligibility = await db.stockArticleEligibility.findFirst({ where: { companyId, articleId: row.articleId }, include: { currentPolicyVersion: true } });
    const policy = eligibility?.currentPolicyVersion;
    if (!eligibility || !policy?.eligible) throw badRequest("Article is not eligible for current stock policy", "stock_article_not_eligible");
    if (policy.traceMode === "IDENTIFIED_UNIT") throw badRequest("IDENTIFIED_UNIT receipts are not supported in S1", "identified_unit_receipt_not_supported");
    if (policy.traceMode === "LOT" && !row.lotCode) throw badRequest("LOT policy requires a lot code", "receipt_lot_required");
    if (policy.traceMode !== "LOT" && (row.lotCode || row.expirationDate)) throw badRequest("Lot data is not allowed for this article policy", "receipt_lot_not_allowed");
  }
  const lines = input.lines.map((row, index) => ({ lineNumber: index + 1, articleId: row.articleId, depositId: row.depositId, requestedQuantity: new Prisma.Decimal(row.quantity), receivedQuantity: new Prisma.Decimal(row.quantity), lotCode: row.lotCode, expirationDate: row.expirationDate ? new Date(`${row.expirationDate}T00:00:00.000Z`) : null, receivedLotCode: row.lotCode, receivedExpirationDate: row.expirationDate ? new Date(`${row.expirationDate}T00:00:00.000Z`) : null, resolutionStatus: "RESOLVED" }));
  try {
    if (existing) return await db.goodsReceipt.update({ where: { id: existing.id }, data: { ...(input.supplierId ? { supplierId: input.supplierId } : {}), ...(input.documentReference ? { documentReference: input.documentReference } : {}), lines: { create: lines } }, include: { lines: true } });
    return await db.goodsReceipt.create({ data: { companyId, createdById: actorId, supplierId: input.supplierId, documentReference: input.documentReference, idempotencyKey: input.idempotencyKey, supplierRemittanceId: input.supplierRemittanceId, lines: { create: lines } }, include: { lines: true } });
  } catch (error) {
    if (input.idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.goodsReceipt.findFirst({ where: { companyId, idempotencyKey: input.idempotencyKey }, include: { lines: true } });
      if (existing) return existing;
    }
    throw error;
  }
}

async function confirmInTransaction(tx: Prisma.TransactionClient, companyId: string, receiptId: string, actorId: string) {
  await tx.$queryRaw`SELECT id FROM "GoodsReceipt" WHERE id = ${receiptId} AND "companyId" = ${companyId} FOR UPDATE`;
  const receipt = await tx.goodsReceipt.findFirst({ where: { id: receiptId, companyId }, include: { lines: { orderBy: { lineNumber: "asc" } } } });
  if (!receipt) throw notFound("Goods receipt not found", "goods_receipt_not_found");
  const existing = await tx.stockEvidence.findFirst({ where: { companyId, sourceDomain: "GOODS_RECEIPT", sourceEntityType: "GOODS_RECEIPT", sourceEntityId: receiptId, sourceCheckpoint: "CONFIRMED" }, select: { id: true } });
  if (receipt.status === "CONFIRMED" || existing) return { receipt, evidenceId: existing?.id ?? receipt.lines[0]?.confirmedEvidenceId ?? null, replayed: true };
  if (receipt.status !== "DRAFT") throw conflict("Goods receipt is not confirmable", "goods_receipt_not_draft");
  if (receipt.lines.length === 0) throw badRequest("Goods receipt requires at least one line", "goods_receipt_lines_required");

  const acceptedAt = new Date();
  const acceptanceId = stableId("s1-oca", { companyId, receiptId });
  const auditId = stableId("s1-audit", { companyId, receiptId });
  const evidenceId = stableId("s1-evidence", { companyId, receiptId });
  await tx.auditEvent.create({ data: { id: auditId, companyId, userId: actorId, entityType: "GoodsReceipt", entityId: receiptId, action: "goods_receipt.confirmed", module: "stock", newValue: { receiptId } } });
  await tx.operationalCommandAcceptance.create({ data: { id: acceptanceId, companyId, domain: "GOODS_RECEIPT", sourceOperationId: receiptId, checkpoint: "CONFIRMED", scopeKey: `RECEIPT:${receiptId}`, intentHash: createHash("sha256").update(`${companyId}:${receiptId}`).digest("hex"), acceptedAt, acceptedById: actorId, resultEntityType: "GOODS_RECEIPT", resultEntityId: receiptId, auditEventId: auditId } });
  await tx.stockEvidence.create({ data: { id: evidenceId, companyId, kind: "RECEIPT", recordKind: "ORIGINAL", sourceDomain: "GOODS_RECEIPT", sourceEntityType: "GOODS_RECEIPT", sourceEntityId: receiptId, sourceCheckpoint: "CONFIRMED", acceptedAt, acceptedById: actorId, commandAcceptanceId: acceptanceId, auditEventId: auditId } });

  for (const row of receipt.lines) {
    if (!row.articleId || !row.depositId) throw badRequest("Receipt lines require article and deposit", "receipt_line_incomplete");
    const eligibility = await tx.stockArticleEligibility.findFirst({ where: { companyId, articleId: row.articleId }, include: { currentPolicyVersion: true } });
    const policy = eligibility?.currentPolicyVersion;
    if (!eligibility || !policy?.eligible) throw badRequest("Article is not eligible for current stock policy", "stock_article_not_eligible");
    if (policy.traceMode === "IDENTIFIED_UNIT") throw badRequest("IDENTIFIED_UNIT receipts are not supported in S1", "identified_unit_receipt_not_supported");
    const quantity = new Prisma.Decimal(row.receivedQuantity);
    const lotRequired = policy.traceMode === "LOT";
    if (lotRequired && !row.receivedLotCode) throw badRequest("LOT policy requires a lot code", "receipt_lot_required");
    if (!lotRequired && (row.receivedLotCode || row.receivedExpirationDate)) throw badRequest("Lot data is not allowed for this article policy", "receipt_lot_not_allowed");
    let context = await tx.stockContext.findFirst({ where: { companyId, kind: "DEPOSIT", depositId: row.depositId } });
    if (!context) context = await tx.stockContext.create({ data: { companyId, kind: "DEPOSIT", depositId: row.depositId } });
    let lotId: string | null = null;
    if (lotRequired) {
      const normalizedLotCode = row.receivedLotCode!.trim().toUpperCase();
      let lot = await tx.stockLot.findFirst({ where: { companyId, articleId: row.articleId, normalizedLotCode }, include: { primaryObservation: true } });
      if (lot && String(lot.primaryObservation.expirationDate ?? "") !== String(row.receivedExpirationDate ?? "")) throw badRequest("Lot expiration conflicts with its registered value", "receipt_lot_expiration_conflict");
      if (!lot) {
        const observation = await tx.stockLotObservation.create({ data: { companyId, articleId: row.articleId, normalizedLotCode, displayLotCode: row.receivedLotCode!, expirationDate: row.receivedExpirationDate, sourceDomain: "GOODS_RECEIPT", sourceEntityType: "GOODS_RECEIPT", sourceEntityId: receiptId, sourceScopeKey: `L:${row.id}`, recordKind: "ORIGINAL", observedAt: acceptedAt, observedById: actorId, commandAcceptanceId: acceptanceId, auditEventId: auditId } });
        lot = await tx.stockLot.create({ data: { companyId, articleId: row.articleId, normalizedLotCode, primaryObservationId: observation.id, acceptedAt, acceptedById: actorId, commandAcceptanceId: acceptanceId }, include: { primaryObservation: true } });
      }
      lotId = lot.id;
    }
    const key = scopeKey(row.articleId, policy.id, context.id, lotId);
    await tx.$queryRaw`SELECT id FROM "StockPosition" WHERE "companyId" = ${companyId} AND "scopeKey" = ${key} FOR UPDATE`;
    let position = await tx.stockPosition.findFirst({ where: { companyId, scopeKey: key } });
    if (!position) position = await tx.stockPosition.create({ data: { companyId, articleId: row.articleId, eligibilityId: eligibility.id, policyVersionId: policy.id, contextId: context.id, traceMode: policy.traceMode, lotId, stockUnit: policy.stockUnit, quantityScale: policy.quantityScale, scopeKey: key } });
    await tx.stockEvidenceLine.create({ data: { companyId, evidenceId, lineNumber: row.lineNumber, articleId: row.articleId, toPositionId: position.id, quantity, stockUnit: policy.stockUnit, scaleSnapshot: policy.quantityScale, lotCodeSnapshot: row.receivedLotCode, expirationDateSnapshot: row.receivedExpirationDate, sourceLineId: row.id } });
    const projection = await tx.stockPositionProjection.findFirst({ where: { companyId, positionId: position.id } });
    if (projection) await tx.stockPositionProjection.update({ where: { companyId_positionId: { companyId, positionId: position.id } }, data: { physicalQuantity: { increment: quantity }, availableQuantity: { increment: quantity }, version: { increment: 1 }, evidenceWatermark: evidenceId } });
    else await tx.stockPositionProjection.create({ data: { companyId, positionId: position.id, physicalQuantity: quantity, reservedQuantity: 0, availableQuantity: quantity, underReviewQuantity: 0, finalDispositionQuantity: 0, version: 1, evidenceWatermark: evidenceId } });
    await tx.goodsReceiptLine.update({ where: { id: row.id }, data: { confirmedEvidenceId: evidenceId, resolutionStatus: "CONFIRMED" } });
  }
  const confirmed = await tx.goodsReceipt.update({ where: { id: receiptId }, data: { status: "CONFIRMED", confirmedAt: acceptedAt, confirmedById: actorId } });
  return { receipt: confirmed, evidenceId, replayed: false };
}

export async function confirmGoodsReceipt(db: PrismaClient, companyId: string, receiptId: string, actorId: string) {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) try { return await db.$transaction((tx) => confirmInTransaction(tx, companyId, receiptId, actorId), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (error) {
    if (isRetryableConflict(error) && attempt < RETRIES - 1) continue;
    throw error;
  }
  throw conflict("Receipt confirmation retry limit exceeded", "goods_receipt_confirmation_conflict");
}

export async function listStockBalances(db: Db, companyId: string) {
  return db.stockPositionProjection.findMany({ where: { companyId }, include: { position: { include: { eligibilityByArticle: { include: { article: { select: { id: true, sku: true, description: true, unit: true, brand: true } } }, }, context: { include: { deposit: true } }, lot: { include: { primaryObservation: true } } } } }, orderBy: { updatedAt: "desc" } });
}
