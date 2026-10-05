import { describe, expect, it, vi, beforeEach } from "vitest"
import { articleCreateSchema, articleUpdateSchema } from "@/lib/validators/article"
import { createArticle, updateArticle } from "@/lib/services/article.service"

describe("ARTICLE-MASTER-CLASSIFICATION-DEV-001 — Article Classification Master Fields", () => {
  describe("Validators: articleCreateSchema & articleUpdateSchema", () => {
    it("accepts category, pmAnmat, and isSterile in create schema", () => {
      const parsed = articleCreateSchema.parse({
        description: "Tornillo de Titanio 3.5mm",
        category: "Implantes",
        pmAnmat: "PM-1234-56",
        isSterile: true,
      })

      expect(parsed.description).toBe("Tornillo de Titanio 3.5mm")
      expect(parsed.category).toBe("Implantes")
      expect(parsed.pmAnmat).toBe("PM-1234-56")
      expect(parsed.isSterile).toBe(true)
      expect(parsed.unit).toBe("u")
    })

    it("defaults isSterile to false when omitted in create schema", () => {
      const parsed = articleCreateSchema.parse({
        description: "Pinza Adson",
      })

      expect(parsed.isSterile).toBe(false)
      expect(parsed.category).toBeUndefined()
      expect(parsed.pmAnmat).toBeUndefined()
    })

    it("accepts partial classification updates in update schema", () => {
      const parsed = articleUpdateSchema.parse({
        category: "Instrumental",
        pmAnmat: "PM-9999-01",
        isSterile: false,
      })

      expect(parsed.category).toBe("Instrumental")
      expect(parsed.pmAnmat).toBe("PM-9999-01")
      expect(parsed.isSterile).toBe(false)
    })
  })

  describe("Service: createArticle and updateArticle persistence", () => {
    const mockDb = {
      company: {
        findUnique: vi.fn(),
      },
      article: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    }

    beforeEach(() => {
      vi.clearAllMocks()
      mockDb.company.findUnique.mockResolvedValue({ id: "comp-1", organizationId: "org-1" })
    })

    it("persists category, pmAnmat, and isSterile in createArticle", async () => {
      mockDb.article.findFirst.mockResolvedValue(null)
      const createdArticle = {
        id: "art-1",
        organizationId: "org-1",
        sku: "SKU-TEST-01",
        description: "Tornillo Canulado",
        category: "Implantes",
        pmAnmat: "PM-1122-33",
        isSterile: true,
        unit: "u",
        vatTreatment: "GRAVADO",
        vatRate: 21,
        identifiers: [],
        tracePolicies: [{ policy: "NONE" }],
        stockEligibilities: [{ companyId: "comp-1", version: 1 }],
      }

      mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          contactCompanyLink: { findFirst: vi.fn().mockResolvedValue({ contactId: "supp-1" }) },
          article: {
            create: vi.fn().mockResolvedValue(createdArticle),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-1" }),
          },
        }
        return callback(tx)
      })

      const res = await createArticle(
        mockDb as unknown as Parameters<typeof createArticle>[0],
        "comp-1",
        {
          description: "Tornillo Canulado",
          sku: "SKU-TEST-01",
          category: "Implantes",
          pmAnmat: "PM-1122-33",
          isSterile: true,
          unit: "u",
          vatTreatment: "GRAVADO",
          vatRate: 21,
          traceabilityPolicy: "NONE",
          identifiers: [],
          supplierMappings: [],
        },
        "user-test-1",
      )

      expect(res.id).toBe("art-1")
      expect(res.category).toBe("Implantes")
      expect(res.pmAnmat).toBe("PM-1122-33")
      expect(res.isSterile).toBe(true)
    })

    it("updates category, pmAnmat, and isSterile in updateArticle", async () => {
      const existingArticle = {
        id: "art-1",
        organizationId: "org-1",
        sku: "SKU-TEST-01",
        description: "Tornillo Canulado",
        category: "General",
        pmAnmat: null,
        isSterile: false,
        unit: "u",
        vatTreatment: "GRAVADO",
        vatRate: 21,
        tracePolicies: [{ policy: "NONE" }],
      }

      mockDb.article.findFirst.mockResolvedValue(existingArticle)

      const updatedArticle = {
        ...existingArticle,
        category: "Implantes Especiales",
        pmAnmat: "PM-5555-1",
        isSterile: true,
        identifiers: [],
        tracePolicies: [{ policy: "NONE" }],
        stockEligibilities: [{ companyId: "comp-1", version: 1 }],
      }

      mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          article: {
            update: vi.fn().mockResolvedValue(updatedArticle),
          },
          auditEvent: {
            create: vi.fn().mockResolvedValue({ id: "audit-1" }),
          },
        }
        return callback(tx)
      })

      const res = await updateArticle(
        mockDb as unknown as Parameters<typeof updateArticle>[0],
        "comp-1",
        "art-1",
        {
          category: "Implantes Especiales",
          pmAnmat: "PM-5555-1",
          isSterile: true,
        },
        "user-test-1",
      )

      expect(res.category).toBe("Implantes Especiales")
      expect(res.pmAnmat).toBe("PM-5555-1")
      expect(res.isSterile).toBe(true)
    })
  })
})
