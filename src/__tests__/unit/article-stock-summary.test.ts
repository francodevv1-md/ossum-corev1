import { describe, expect, it, vi } from "vitest"

import { getArticle } from "@/lib/services/article.service"

describe("getArticle stock summary", () => {
  it("aggregates only company-scoped position projections for the requested article", async () => {
    const db = {
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      article: { findFirst: vi.fn().mockResolvedValue({ id: "article-1", sku: "ITM-001", identifiers: [], tracePolicies: [], supplierMappings: [] }) },
      stockPositionProjection: {
        findMany: vi.fn().mockResolvedValue([
          { physicalQuantity: { toString: () => "10" }, reservedQuantity: { toString: () => "2" }, availableQuantity: { toString: () => "8" }, position: { id: "position-1", articleId: "article-1", context: { labelSnapshot: "Central", deposit: null }, lot: null, identifiedUnit: null } },
          { physicalQuantity: { toString: () => "5" }, reservedQuantity: { toString: () => "1" }, availableQuantity: { toString: () => "4" }, position: { id: "position-2", articleId: "article-1", context: { labelSnapshot: "Central", deposit: null }, lot: null, identifiedUnit: null } },
        ]),
      },
      stockEvidenceLine: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "evidence-line-1",
            quantity: { valueOf: () => 10, negated: () => ({ valueOf: () => -10 }) },
            fromPositionId: null,
            toPositionId: "position-1",
            evidence: { kind: "RECEIPT", acceptedAt: new Date("2026-08-26T00:00:00.000Z"), sourceEntityId: "receipt-1", acceptedBy: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.test" } },
          },
          {
            id: "evidence-line-2",
            quantity: { valueOf: () => 2, negated: () => ({ valueOf: () => -2 }) },
            fromPositionId: "position-1",
            toPositionId: "position-2",
            evidence: { kind: "TRANSFER_DISPATCH", acceptedAt: new Date("2026-08-27T00:00:00.000Z"), sourceEntityId: "transfer-1", acceptedBy: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.test" } },
          },
        ]),
      },
    }

    const article = await getArticle(db as never, "company-1", "article-1")

    expect(article.stock).toEqual({ physical: 15, reserved: 3, available: 12, inTransit: 0 })
    expect(article.positions[0]).toMatchObject({ id: "position-1", deposit: "Central", available: 8 })
    expect(article.movements[0]).toMatchObject({ id: "evidence-line-1", type: "Ingreso", qty: 10, user: "Ada Lovelace", ref: "receipt-1" })
    expect(article.movements[1]).toMatchObject({ id: "evidence-line-2", type: "Traslado", qty: 0 })
    expect(db.stockPositionProjection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1", position: { articleId: "article-1" } },
    }))
  })
})
