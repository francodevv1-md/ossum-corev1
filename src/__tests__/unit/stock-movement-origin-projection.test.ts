import { Prisma } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"
import { getArticleStockDetail } from "@/lib/services/stock-ledger.service"

describe("company-scoped stock movement origin projection", () => {
  it("exposes persisted receipt, line, replay key and actor without changing balances", async () => {
    const movement = {
      id: "movement-qa", companyId: "company-qa", articleId: "article-qa",
      movementType: "RECEIPT_IN", quantity: new Prisma.Decimal(1),
      lotCode: null, serialNumber: null, expirationDate: null,
      location: "QA Receiving", notes: "Owned QA receipt", createdAt: new Date("2026-10-03T12:00:00Z"),
      receiptId: "receipt-qa", receiptLineId: "line-qa", idempotencyKey: "receipt:receipt-qa:line:line-qa",
      createdById: "actor-qa", createdBy: { id: "actor-qa", firstName: "QA", lastName: "Actor", email: "qa@ossum.local" },
      receipt: { id: "receipt-qa", documentReference: "OC QA" },
    }
    const db = {
      company: { findUnique: vi.fn().mockResolvedValue({ id: "company-qa", organizationId: "organization-qa" }) },
      article: { findFirst: vi.fn().mockResolvedValue({ id: "article-qa", sku: "QA-ARTICLE", description: "QA Article", vatRate: new Prisma.Decimal(21), vatTreatment: "GRAVADO", identifiers: [], supplierMappings: [], commercialProfiles: [] }) },
      stockMovement: { findMany: vi.fn().mockResolvedValue([movement]) },
    }
    const detail = await getArticleStockDetail(db as unknown as Parameters<typeof getArticleStockDetail>[0], "company-qa", "article-qa")
    expect(detail.summary.physical).toBe(1)
    expect(detail.lots).toEqual([expect.objectContaining({ location: "QA Receiving", physical: 1 })])
    expect(detail.movements).toEqual([expect.objectContaining({
      id: movement.id, qty: 1, receiptId: movement.receiptId, receiptLineId: movement.receiptLineId,
      idempotencyKey: movement.idempotencyKey, createdById: movement.createdById,
      ref: "Remito OC QA", user: "QA Actor",
    })])
    expect(db.stockMovement.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-qa", articleId: "article-qa" } }))
    expect(db.article.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "article-qa", organizationId: "organization-qa", stockEligibilities: { some: { companyId: "company-qa" } } } }))
  })
})
