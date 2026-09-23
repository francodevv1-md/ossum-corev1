/* eslint-disable @typescript-eslint/no-explicit-any -- transaction mock supplies only the Prisma surface exercised here. */
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { confirmGoodsReceipt, createGoodsReceipt } from "@/lib/services/goods-receipt.service";

const companyId = "company-1";
const receiptId = "receipt-1";
const actorId = "user-1";

function receipt(status = "DRAFT") {
  return { id: receiptId, companyId, status, lines: [{ id: "line-1", lineNumber: 1, articleId: "article-1", depositId: "deposit-1", receivedQuantity: new Prisma.Decimal(3), receivedLotCode: null, receivedExpirationDate: null, confirmedEvidenceId: null }] };
}

function transaction(receiptState = receipt()) {
  const tx: any = {
    $queryRaw: vi.fn(async () => []),
    goodsReceipt: { findFirst: vi.fn(async () => receiptState), update: vi.fn(async ({ data }) => ({ ...receiptState, ...data })) },
    goodsReceiptLine: { update: vi.fn(async () => ({})) },
    stockEvidence: { findFirst: vi.fn(async () => null), create: vi.fn(async ({ data }) => data) },
    stockEvidenceLine: { create: vi.fn(async ({ data }) => data) },
    auditEvent: { create: vi.fn(async ({ data }) => data) },
    operationalCommandAcceptance: { create: vi.fn(async ({ data }) => data) },
    stockArticleEligibility: { findFirst: vi.fn(async () => ({ id: "eligibility-1", currentPolicyVersion: { id: "policy-1", eligible: true, traceMode: "NONE", stockUnit: "u", quantityScale: 0 } })) },
    stockContext: { findFirst: vi.fn(async () => ({ id: "context-1" })), create: vi.fn() },
    stockLot: { findFirst: vi.fn(), create: vi.fn() }, stockLotObservation: { create: vi.fn() },
    stockPosition: { findFirst: vi.fn(async () => ({ id: "position-1" })), create: vi.fn() },
    stockPositionProjection: { findFirst: vi.fn(async () => ({ id: "projection-1" })), update: vi.fn(async ({ data }) => data), create: vi.fn() },
  };
  return tx;
}

describe("confirmGoodsReceipt", () => {
  it("creates a document-free receipt without a supplier", async () => {
    const create = vi.fn(async ({ data }) => ({ id: "free-receipt", ...data }));
    const db: any = { stockDeposit: { findFirst: vi.fn(async () => ({ id: "deposit-1" })) }, stockArticleEligibility: { findFirst: vi.fn(async () => ({ id: "eligibility-1", currentPolicyVersion: { eligible: true, traceMode: "NONE" } })) }, goodsReceipt: { findFirst: vi.fn(async () => null), create } };
    const result = await createGoodsReceipt(db, companyId, actorId, { idempotencyKey: "free:request-1", lines: [{ articleId: "article-1", depositId: "deposit-1", quantity: 1 }] });
    expect(result.id).toBe("free-receipt");
    expect(create.mock.calls[0][0].data).toMatchObject({ supplierId: undefined, documentReference: undefined, idempotencyKey: "free:request-1" });
  });

  it("reopens the same supplier-remittance receipt by idempotency key", async () => {
    const existing = { id: "receipt-from-remito", lines: [] };
    const create = vi.fn();
    const db: any = { goodsReceipt: { findFirst: vi.fn(async () => existing), create } };
    await expect(createGoodsReceipt(db, companyId, actorId, { idempotencyKey: "supplier-remito:RP-1", documentReference: "REM-10", lines: [{ articleId: "article-1", depositId: "deposit-1", quantity: 1 }] })).resolves.toBe(existing);
    expect(create).not.toHaveBeenCalled();
  });

  it("recovers the existing supplier-remittance receipt after a concurrent create race", async () => {
    const existing = { id: "receipt-from-remito", lines: [] };
    const duplicate = new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7.8.0" });
    const db: any = {
      stockDeposit: { findFirst: vi.fn(async () => ({ id: "deposit-1" })) },
      stockArticleEligibility: { findFirst: vi.fn(async () => ({ id: "eligibility-1", currentPolicyVersion: { eligible: true, traceMode: "NONE" } })) },
      goodsReceipt: { findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existing), create: vi.fn().mockRejectedValue(duplicate) },
    };
    await expect(createGoodsReceipt(db, companyId, actorId, { idempotencyKey: "supplier-remito:RP-1", lines: [{ articleId: "article-1", depositId: "deposit-1", quantity: 1 }] })).resolves.toBe(existing);
  });

  it("lets the receipt relation supply line company ownership during creation", async () => {
    const create = vi.fn(async ({ data }) => data);
    const db: any = { contactCompanyLink: { findFirst: vi.fn(async () => ({ contactId: "supplier-1" })) }, stockDeposit: { findFirst: vi.fn(async () => ({ id: "deposit-1" })) }, stockArticleEligibility: { findFirst: vi.fn(async () => ({ id: "eligibility-1", currentPolicyVersion: { eligible: true, traceMode: "NONE" } })) }, goodsReceipt: { create } };
    await createGoodsReceipt(db, companyId, actorId, { supplierId: "supplier-1", lines: [{ articleId: "article-1", depositId: "deposit-1", quantity: 1 }] });
    expect(create.mock.calls[0][0].data.lines.create[0]).not.toHaveProperty("companyId");
  });

  it("registers a supplier remittance as a company-scoped empty draft", async () => {
    const create = vi.fn(async ({ data }) => ({ id: "registered-remito", status: "DRAFT", lines: [], ...data }));
    const db: any = { goodsReceipt: { findFirst: vi.fn(async () => null), create } };
    const result = await createGoodsReceipt(db, companyId, actorId, { documentReference: "REM-10", idempotencyKey: "supplier-remito:RP-1", lines: [] });
    expect(result).toMatchObject({ id: "registered-remito", status: "DRAFT", idempotencyKey: "supplier-remito:RP-1" });
  });

  it("hydrates the registered remittance draft with physical receipt lines", async () => {
    const existing = { id: "registered-remito", status: "DRAFT", lines: [] };
    const update = vi.fn(async ({ data }) => ({ ...existing, lines: data.lines.create }));
    const db: any = { stockDeposit: { findFirst: vi.fn(async () => ({ id: "deposit-1" })) }, stockArticleEligibility: { findFirst: vi.fn(async () => ({ id: "eligibility-1", currentPolicyVersion: { eligible: true, traceMode: "NONE" } })) }, goodsReceipt: { findFirst: vi.fn(async () => existing), update } };
    const result = await createGoodsReceipt(db, companyId, actorId, { documentReference: "REM-10", idempotencyKey: "supplier-remito:RP-1", lines: [{ articleId: "article-1", depositId: "deposit-1", quantity: 2 }] });
    expect(result.lines).toHaveLength(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: existing.id } }));
    expect(update.mock.calls[0][0].data).not.toHaveProperty("supplierId");
  });

  it("does not overwrite a populated receipt draft", async () => {
    const existing = { id: "registered-remito", status: "DRAFT", lines: [{ id: "line-1" }] };
    const db: any = { goodsReceipt: { findFirst: vi.fn(async () => existing) } };
    await expect(createGoodsReceipt(db, companyId, actorId, { idempotencyKey: "supplier-remito:RP-1", lines: [{ articleId: "article-1", depositId: "deposit-1", quantity: 2 }] })).rejects.toMatchObject({ code: "goods_receipt_draft_already_populated" });
  });

  it("writes one receipt evidence linked to its line and increments the resolved position projection", async () => {
    const tx = transaction();
    const db: any = { $transaction: vi.fn((fn: any) => fn(tx)) };
    const result = await confirmGoodsReceipt(db, companyId, receiptId, actorId);
    expect(result.replayed).toBe(false);
    expect(tx.stockEvidence.create).toHaveBeenCalledTimes(1);
    expect(tx.stockEvidenceLine.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ evidenceId: result.evidenceId, sourceLineId: "line-1", toPositionId: "position-1", articleId: "article-1" }) }));
    expect(tx.stockPositionProjection.update).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId_positionId: { companyId, positionId: "position-1" } }, data: expect.objectContaining({ physicalQuantity: { increment: expect.any(Prisma.Decimal) }, availableQuantity: { increment: expect.any(Prisma.Decimal) }, evidenceWatermark: result.evidenceId }) }));
    expect(tx.goodsReceipt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) }));
  });

  it("replays a confirmed receipt without stock writes", async () => {
    const tx = transaction(receipt("CONFIRMED"));
    const db: any = { $transaction: vi.fn((fn: any) => fn(tx)) };
    const result = await confirmGoodsReceipt(db, companyId, receiptId, actorId);
    expect(result.replayed).toBe(true);
    for (const writer of [tx.stockEvidence.create, tx.stockEvidenceLine.create, tx.stockPositionProjection.update, tx.stockPositionProjection.create]) expect(writer).not.toHaveBeenCalled();
  });

  it("rejects confirming an empty bridge draft", async () => {
    const tx = transaction({ ...receipt(), lines: [] });
    const db: any = { $transaction: vi.fn((fn: any) => fn(tx)) };
    await expect(confirmGoodsReceipt(db, companyId, receiptId, actorId)).rejects.toMatchObject({ code: "goods_receipt_lines_required" });
    expect(tx.stockEvidence.create).not.toHaveBeenCalled();
  });

  it("retries a serializable race and accepts stock only once", async () => {
    const tx = transaction();
    const race = new Prisma.PrismaClientKnownRequestError("serialization conflict", { code: "P2034", clientVersion: "7.8.0" });
    const db: any = { $transaction: vi.fn().mockRejectedValueOnce(race).mockImplementationOnce((fn: any) => fn(tx)) };
    const result = await confirmGoodsReceipt(db, companyId, receiptId, actorId);
    expect(result.replayed).toBe(false);
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.stockEvidence.create).toHaveBeenCalledTimes(1);
    expect(tx.stockPositionProjection.update).toHaveBeenCalledTimes(1);
  });

  it("retries adapter-wrapped PostgreSQL serialization conflicts", async () => {
    const tx = transaction();
    const race = new Prisma.PrismaClientKnownRequestError("raw query conflict", { code: "P2010", clientVersion: "7.8.0", meta: { driverAdapterError: { cause: { originalCode: "40001" } } } });
    const db: any = { $transaction: vi.fn().mockRejectedValueOnce(race).mockImplementationOnce((fn: any) => fn(tx)) };
    const result = await confirmGoodsReceipt(db, companyId, receiptId, actorId);
    expect(result.replayed).toBe(false);
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });

  it("requires a lot for LOT policy before stock writes", async () => {
    const tx = transaction();
    tx.stockArticleEligibility.findFirst.mockResolvedValue({ id: "eligibility-1", currentPolicyVersion: { id: "policy-1", eligible: true, traceMode: "LOT", stockUnit: "u", quantityScale: 0 } });
    const db: any = { $transaction: vi.fn((fn: any) => fn(tx)) };
    await expect(confirmGoodsReceipt(db, companyId, receiptId, actorId)).rejects.toMatchObject({ code: "receipt_lot_required" });
    expect(tx.stockEvidenceLine.create).not.toHaveBeenCalled();
    expect(tx.stockPositionProjection.update).not.toHaveBeenCalled();
  });
});
