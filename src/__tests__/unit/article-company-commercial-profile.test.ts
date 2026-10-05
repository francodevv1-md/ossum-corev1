import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  articleCommercialProfileSchema,
  articleCommercialProfileUpdateSchema,
  articleCreateSchema,
  articleUpdateSchema,
} from "@/lib/validators/article"
import {
  createArticle,
  updateArticle,
  getArticle,
  searchArticles,
} from "@/lib/services/article.service"
import { getStockAvailability, getArticleStockDetail } from "@/lib/services/stock-ledger.service"
import { Prisma } from "@prisma/client"

describe("ARTICLE-COMMERCIAL-PURCHASING-PER-COMPANY-DEV-001 — Commercial & Purchasing Profile Per Company", () => {
  describe("1. Validators: articleCommercialProfileSchema & articleCommercialProfileUpdateSchema", () => {
    it("accepts valid commercial profile fields in create schema", () => {
      const parsed = articleCommercialProfileSchema.parse({
        referenceCost: 1500.5,
        referenceSalePrice: 3200,
        priceListCode: "LISTA-DIST",
        preferredSupplierId: "supp-01",
        leadTimeDays: 7,
        minStock: 25,
      })

      expect(parsed.referenceCost).toBe(1500.5)
      expect(parsed.referenceSalePrice).toBe(3200)
      expect(parsed.priceListCode).toBe("LISTA-DIST")
      expect(parsed.preferredSupplierId).toBe("supp-01")
      expect(parsed.leadTimeDays).toBe(7)
      expect(parsed.minStock).toBe(25)
    })

    it("rejects negative referenceCost or negative referenceSalePrice", () => {
      expect(() =>
        articleCommercialProfileSchema.parse({
          referenceCost: -10,
        }),
      ).toThrow()

      expect(() =>
        articleCommercialProfileSchema.parse({
          referenceSalePrice: -50,
        }),
      ).toThrow()
    })

    it("rejects negative minStock", () => {
      expect(() =>
        articleCommercialProfileSchema.parse({
          minStock: -5,
        }),
      ).toThrow("El stock mínimo no puede ser negativo")
    })

    it("rejects negative or fractional leadTimeDays", () => {
      expect(() =>
        articleCommercialProfileSchema.parse({
          leadTimeDays: -1,
        }),
      ).toThrow()

      expect(() =>
        articleCommercialProfileSchema.parse({
          leadTimeDays: 3.5,
        }),
      ).toThrow()
    })

    it("accepts commercialProfile in articleCreateSchema and articleUpdateSchema", () => {
      const createParsed = articleCreateSchema.parse({
        description: "Prótesis Fémur",
        commercialProfile: {
          referenceCost: 2000,
          referenceSalePrice: 4500,
          priceListCode: "L1",
          leadTimeDays: 14,
          minStock: 10,
        },
      })
      expect(createParsed.commercialProfile?.referenceCost).toBe(2000)
      expect(createParsed.commercialProfile?.referenceSalePrice).toBe(4500)
      expect(createParsed.commercialProfile?.minStock).toBe(10)

      const updateParsed = articleUpdateSchema.parse({
        commercialProfile: {
          referenceCost: 2200,
          priceListCode: "L2",
          minStock: 15,
        },
      })
      expect(updateParsed.commercialProfile?.referenceCost).toBe(2200)
      expect(updateParsed.commercialProfile?.priceListCode).toBe("L2")
      expect(updateParsed.commercialProfile?.minStock).toBe(15)
    })
  })

  describe("2. Company Isolation: Multi-company commercial profile separation", () => {
    const ORG_ID = "org-main"
    const COMPANY_A = "company-a"
    const COMPANY_B = "company-b"

    it("ensures getArticle only returns the commercial profile for the requested company", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
            if (where.id === COMPANY_A || where.id === COMPANY_B) {
              return { id: where.id, organizationId: ORG_ID }
            }
            return null
          }),
        },
        article: {
          findFirst: vi.fn().mockImplementation(async ({ where, include }: { where: { id: string }; include: { commercialProfiles?: { where?: { companyId?: string } } } }) => {
            const requestedCompany = include?.commercialProfiles?.where?.companyId
            return {
              id: "art-1",
              organizationId: ORG_ID,
              sku: "SKU-001",
              description: "Clavo Intramedular",
              vatTreatment: "GRAVADO",
              vatRate: new Prisma.Decimal(21),
              stockEligibilities: [{ companyId: COMPANY_A }, { companyId: COMPANY_B }],
              commercialProfiles:
                requestedCompany === COMPANY_A
                  ? [
                      {
                        id: "prof-a",
                        companyId: COMPANY_A,
                        organizationId: ORG_ID,
                        articleId: "art-1",
                        referenceCost: new Prisma.Decimal(500),
                        referenceSalePrice: new Prisma.Decimal(1000),
                        currency: "ARS",
                        priceListCode: "LISTA-A",
                        preferredSupplierId: "supp-a",
                        leadTimeDays: 5,
                        minStock: new Prisma.Decimal(20),
                        preferredSupplier: {
                          contactId: "supp-a",
                          contact: { tradeName: "Proveedor A", legalName: null, firstName: null, lastName: null },
                        },
                      },
                    ]
                  : [
                      {
                        id: "prof-b",
                        companyId: COMPANY_B,
                        organizationId: ORG_ID,
                        articleId: "art-1",
                        referenceCost: new Prisma.Decimal(750),
                        referenceSalePrice: new Prisma.Decimal(1400),
                        currency: "ARS",
                        priceListCode: "LISTA-B",
                        preferredSupplierId: null,
                        leadTimeDays: 10,
                        minStock: new Prisma.Decimal(5),
                        preferredSupplier: null,
                      },
                    ],
            }
          }),
        },
      }

      const articleCompanyA = await getArticle(mockDb as unknown as Parameters<typeof getArticle>[0], COMPANY_A, "art-1")
      expect(articleCompanyA.commercialProfile?.companyId).toBe(COMPANY_A)
      expect(articleCompanyA.commercialProfile?.referenceCost).toBe(500)
      expect(articleCompanyA.commercialProfile?.referenceSalePrice).toBe(1000)
      expect(articleCompanyA.commercialProfile?.priceListCode).toBe("LISTA-A")
      expect(articleCompanyA.commercialProfile?.minStock).toBe(20)
      expect(articleCompanyA.commercialProfile?.preferredSupplierName).toBe("Proveedor A")

      const articleCompanyB = await getArticle(mockDb as unknown as Parameters<typeof getArticle>[0], COMPANY_B, "art-1")
      expect(articleCompanyB.commercialProfile?.companyId).toBe(COMPANY_B)
      expect(articleCompanyB.commercialProfile?.referenceCost).toBe(750)
      expect(articleCompanyB.commercialProfile?.referenceSalePrice).toBe(1400)
      expect(articleCompanyB.commercialProfile?.priceListCode).toBe("LISTA-B")
      expect(articleCompanyB.commercialProfile?.minStock).toBe(5)
      expect(articleCompanyB.commercialProfile?.preferredSupplierName).toBeNull()
    })
  })

  describe("3. Preferred Supplier Validation against active mappings", () => {
    const mockDb = {
      company: {
        findUnique: vi.fn().mockResolvedValue({ id: "comp-1", organizationId: "org-1" }),
      },
      article: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(),
    }

    beforeEach(() => {
      vi.clearAllMocks()
      mockDb.company.findUnique.mockResolvedValue({ id: "comp-1", organizationId: "org-1" })
    })

    it("throws badRequest if preferredSupplierId is not in supplierMappings during createArticle", async () => {
      mockDb.article.findFirst.mockResolvedValue(null)
      mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          contactCompanyLink: { findFirst: vi.fn().mockResolvedValue({ contactId: "supp-1" }) },
        }
        return callback(tx)
      })

      await expect(
        createArticle(
          mockDb as unknown as Parameters<typeof createArticle>[0],
          "comp-1",
          articleCreateSchema.parse({
            description: "Placa LCP",
            supplierMappings: [{ supplierId: "supp-1", supplierCode: "P-01" }],
            commercialProfile: {
              preferredSupplierId: "supp-unmapped",
              referenceCost: 100,
              referenceSalePrice: 200,
            },
          }),
          "user-1",
        ),
      ).rejects.toThrow("Preferred supplier must correspond to an active supplier mapping")
    })

    it("succeeds when preferredSupplierId matches an active supplier mapping", async () => {
      mockDb.article.findFirst.mockResolvedValue(null)
      mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          contactCompanyLink: { findFirst: vi.fn().mockResolvedValue({ contactId: "supp-1" }) },
          article: {
            create: vi.fn().mockResolvedValue({
              id: "art-1",
              organizationId: "org-1",
              sku: "SKU-01",
              description: "Placa LCP",
              vatTreatment: "GRAVADO",
              vatRate: new Prisma.Decimal(21),
              commercialProfiles: [
                {
                  id: "prof-1",
                  companyId: "comp-1",
                  organizationId: "org-1",
                  articleId: "art-1",
                  referenceCost: new Prisma.Decimal(100),
                  referenceSalePrice: new Prisma.Decimal(200),
                  currency: "ARS",
                  priceListCode: "L1",
                  preferredSupplierId: "supp-1",
                  leadTimeDays: 3,
                  preferredSupplier: {
                    contactId: "supp-1",
                    contact: { legalName: "Acme Ortopedia S.A.", tradeName: null, firstName: null, lastName: null },
                  },
                },
              ],
            }),
          },
          auditEvent: { create: vi.fn() },
        }
        return callback(tx)
      })

      const res = await createArticle(
        mockDb as unknown as Parameters<typeof createArticle>[0],
        "comp-1",
        articleCreateSchema.parse({
          description: "Placa LCP",
          supplierMappings: [{ supplierId: "supp-1", supplierCode: "P-01" }],
          commercialProfile: {
            preferredSupplierId: "supp-1",
            referenceCost: 100,
            referenceSalePrice: 200,
            priceListCode: "L1",
            leadTimeDays: 3,
          },
        }),
        "user-1",
      )

      expect(res.commercialProfile).not.toBeNull()
      expect(res.commercialProfile?.preferredSupplierId).toBe("supp-1")
      expect(res.commercialProfile?.preferredSupplierName).toBe("Acme Ortopedia S.A.")
    })
  })

  describe("4. Audit Logging on Create and Update", () => {
    it("persists explicit clears and preserves omitted nullable profile fields", async () => {
      for (const clear of [true, false]) {
        const profile = {
          id: "profile-1", referenceCost: new Prisma.Decimal(10),
          referenceSalePrice: new Prisma.Decimal(20), minStock: new Prisma.Decimal(1),
          priceListCode: "OLD", preferredSupplierId: "supplier-old", leadTimeDays: 5,
        }
        const article = { id: "art-1", vatTreatment: "GRAVADO", vatRate: new Prisma.Decimal(21), tracePolicies: [] }
        const tx = {
          article: { update: vi.fn().mockResolvedValue(article) },
          articleCompanyCommercialProfile: {
            findUnique: vi.fn().mockResolvedValue(profile),
            upsert: vi.fn().mockImplementation(({ update }) => Promise.resolve({ ...profile, ...update })),
          },
          auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
        }
        const db = {
          company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
          article: { findFirst: vi.fn().mockResolvedValue(article) },
          $transaction: vi.fn(async (run) => run(tx)),
        }
        const input = articleUpdateSchema.parse(clear ? {
          category: "", pmAnmat: "", commercialProfile: { preferredSupplierId: null, priceListCode: "" },
        } : { commercialProfile: { referenceCost: 12 } })
        await updateArticle(db as unknown as Parameters<typeof updateArticle>[0], "comp-1", "art-1", input, "user-1")
        const articleData = tx.article.update.mock.calls[0][0].data
        const profileData = tx.articleCompanyCommercialProfile.upsert.mock.calls[0][0].update
        if (clear) {
          expect(articleData).toMatchObject({ category: null, pmAnmat: null })
          expect(profileData).toMatchObject({ preferredSupplierId: null, priceListCode: null })
        } else {
          expect(articleData.category).toBeUndefined()
          expect(profileData).not.toHaveProperty("preferredSupplierId")
          expect(profileData).not.toHaveProperty("priceListCode")
        }
      }
    })

    it("creates an audit event for ArticleCompanyCommercialProfile when created or updated", async () => {
      const auditCreateMock = vi.fn()
      const mockDb = {
        company: { findUnique: vi.fn().mockResolvedValue({ id: "comp-1", organizationId: "org-1" }) },
        article: {
          findFirst: vi.fn().mockResolvedValue({
            id: "art-1",
            organizationId: "org-1",
            sku: "SKU-01",
            description: "Prótesis",
            vatTreatment: "GRAVADO",
            vatRate: new Prisma.Decimal(21),
            tracePolicies: [{ policy: "NONE" }],
          }),
        },
        articleCompanyCommercialProfile: {
          findUnique: vi.fn().mockResolvedValue({
            id: "prof-1",
            companyId: "comp-1",
            organizationId: "org-1",
            articleId: "art-1",
            referenceCost: new Prisma.Decimal(100),
            referenceSalePrice: new Prisma.Decimal(200),
            currency: "ARS",
            priceListCode: "OLD-LIST",
            preferredSupplierId: null,
            leadTimeDays: 5,
            preferredSupplier: null,
          }),
        },
        $transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            article: {
              update: vi.fn().mockResolvedValue({
                id: "art-1",
                sku: "SKU-01",
                description: "Prótesis",
                vatTreatment: "GRAVADO",
                vatRate: new Prisma.Decimal(21),
              }),
            },
            articleCompanyCommercialProfile: {
              findUnique: vi.fn().mockResolvedValue({
                id: "prof-1",
                referenceCost: new Prisma.Decimal(100),
                referenceSalePrice: new Prisma.Decimal(200),
                priceListCode: "OLD-LIST",
                preferredSupplierId: null,
                leadTimeDays: 5,
              }),
              upsert: vi.fn().mockResolvedValue({
                id: "prof-1",
                referenceCost: new Prisma.Decimal(150),
                referenceSalePrice: new Prisma.Decimal(300),
                priceListCode: "NEW-LIST",
                preferredSupplierId: null,
                leadTimeDays: 7,
              }),
            },
            auditEvent: {
              create: auditCreateMock,
            },
          }
          return callback(tx)
        }),
      }

      await updateArticle(
        mockDb as unknown as Parameters<typeof updateArticle>[0],
        "comp-1",
        "art-1",
        {
          commercialProfile: {
            referenceCost: 150,
            referenceSalePrice: 300,
            priceListCode: "NEW-LIST",
            leadTimeDays: 7,
          },
        },
        "user-auditor",
      )

      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: "comp-1",
            userId: "user-auditor",
            entityType: "ArticleCompanyCommercialProfile",
            action: "updated",
            module: "stock",
            oldValue: expect.objectContaining({
              referenceCost: 100,
              referenceSalePrice: 200,
              priceListCode: "OLD-LIST",
              leadTimeDays: 5,
            }),
            newValue: expect.objectContaining({
              referenceCost: 150,
              referenceSalePrice: 300,
              priceListCode: "NEW-LIST",
              leadTimeDays: 7,
            }),
          }),
        }),
      )
    })
  })

  describe("5. Stock Ledger & Detail integration", () => {
    it("getStockAvailability projects commercial profile cost, price, and preferred supplier", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ id: "comp-1", organizationId: "org-1", name: "Empresa 1" }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "art-1",
              sku: "SKU-PROT-1",
              description: "Prótesis Cadera",
              family: "Prótesis",
              brand: "Zimmer",
              articleType: "Prótesis",
              unit: "u",
              manufacturer: "Zimmer Biomet",
              isActive: true,
              identifiers: [{ type: "GTIN_EAN", value: "7791234567890", isActive: true }],
              tracePolicies: [{ policy: "SERIAL" }],
              commercialProfiles: [
                {
                  id: "prof-1",
                  companyId: "comp-1",
                  referenceCost: new Prisma.Decimal(125000),
                  referenceSalePrice: new Prisma.Decimal(280000),
                  currency: "ARS",
                  priceListCode: "DIST-2026",
                  preferredSupplierId: "supp-1",
                  leadTimeDays: 10,
                  preferredSupplier: {
                    contactId: "supp-1",
                    contact: { firstName: "Juan", lastName: "Pérez", legalName: null, tradeName: null },
                  },
                },
              ],
            },
          ]),
        },
        remito: { findMany: vi.fn().mockResolvedValue([]) },
        stockMovement: { findMany: vi.fn().mockResolvedValue([]) },
      }

      const result = await getStockAvailability(
        mockDb as unknown as Parameters<typeof getStockAvailability>[0],
        "comp-1",
        {
          quickFilter: "",
          page: 1,
          limit: 50,
          sortKey: "articulo",
          sortDir: "asc",
        },
      )

      expect(result.data).toHaveLength(1)
      const item = result.data[0]
      expect(item.cost).toBe(125000)
      expect(item.price).toBe(280000)
      expect(item.priceListCode).toBe("DIST-2026")
      expect(item.preferredSupplier).toBe("Juan Pérez")
      expect(item.preferredSupplierId).toBe("supp-1")
      expect(item.leadTimeDays).toBe(10)
    })

    it("getArticleStockDetail includes full commercialProfile and formats supplier name", async () => {
      const mockDb = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ id: "comp-1", organizationId: "org-1", name: "Empresa 1" }),
        },
        article: {
          findFirst: vi.fn().mockResolvedValue({
            id: "art-1",
            sku: "SKU-PROT-1",
            description: "Prótesis Cadera",
            family: "Prótesis",
            category: "Cadera",
            pmAnmat: "PM-1234",
            isSterile: true,
            brand: "Zimmer",
            articleType: "Prótesis",
            unit: "u",
            manufacturer: "Zimmer Biomet",
            vatTreatment: "GRAVADO",
            vatRate: new Prisma.Decimal(21),
            identifiers: [],
            supplierMappings: [],
            tracePolicies: [{ policy: "SERIAL" }],
            commercialProfiles: [
              {
                id: "prof-1",
                companyId: "comp-1",
                referenceCost: new Prisma.Decimal(125000),
                referenceSalePrice: new Prisma.Decimal(280000),
                currency: "ARS",
                priceListCode: "DIST-2026",
                preferredSupplierId: "supp-1",
                leadTimeDays: 10,
                preferredSupplier: {
                  contactId: "supp-1",
                  contact: { legalName: "Zimmer Argentina S.R.L.", tradeName: "Zimmer Direct", firstName: null, lastName: null },
                },
              },
            ],
          }),
        },
        stockMovement: { findMany: vi.fn().mockResolvedValue([]) },
      }

      const detail = await getArticleStockDetail(
        mockDb as unknown as Parameters<typeof getArticleStockDetail>[0],
        "comp-1",
        "art-1",
      )

      expect(detail.article.cost).toBe(125000)
      expect(detail.article.price).toBe(280000)
      expect(detail.article.preferredSupplier).toBe("Zimmer Direct")
      expect(detail.article.commercialProfile?.referenceCost).toBe(125000)
      expect(detail.article.commercialProfile?.referenceSalePrice).toBe(280000)
      expect(detail.article.commercialProfile?.preferredSupplierName).toBe("Zimmer Direct")
      expect(detail.article.commercialProfile?.leadTimeDays).toBe(10)
    })
  })
})
