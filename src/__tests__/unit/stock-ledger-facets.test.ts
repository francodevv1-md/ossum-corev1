import { describe, expect, it, vi } from "vitest"
import { getStockAvailability, getArticleStockDetail } from "@/lib/services/stock-ledger.service"
import type { PrismaClient } from "@prisma/client"

describe("STOCK-COMPANY-ELIGIBILITY-SCOPE-DEV-001: Multi-company eligibility isolation", () => {
  const ORG_ID = "org-main"
  const COMPANY_A = "company-a"
  const COMPANY_B = "company-b"

  type ArticleData = {
    id: string
    organizationId: string
    sku: string
    description: string
    family: string | null
    category?: string | null
    brand: string | null
    articleType: string | null
    unit: string | null
    manufacturer: string | null
    isActive: boolean
    stockEligibilities: Array<{ companyId: string }>
  }

  const allArticles: ArticleData[] = [
    {
      id: "art-a1",
      organizationId: ORG_ID,
      sku: "SKU-A1",
      description: "Prótesis Cadera A",
      family: "Cadera",
      category: null,
      brand: "Stryker",
      articleType: "Prótesis",
      unit: "u",
      manufacturer: "Stryker Corp",
      isActive: true,
      stockEligibilities: [{ companyId: COMPANY_A }],
    },
    {
      id: "art-a2",
      organizationId: ORG_ID,
      sku: "SKU-A2",
      description: "Placa Rodilla A",
      family: "Rodilla",
      brand: "Acme",
      articleType: "Osteosíntesis",
      unit: "u",
      manufacturer: "Acme",
      isActive: true,
      stockEligibilities: [{ companyId: COMPANY_A }],
    },
    {
      id: "art-b1",
      organizationId: ORG_ID,
      sku: "SKU-B1",
      description: "Clavo Columna B",
      family: "Columna",
      brand: "Medtronic",
      articleType: "Insumo",
      unit: "u",
      manufacturer: "Medtronic",
      isActive: true,
      stockEligibilities: [{ companyId: COMPANY_B }],
    },
    {
      id: "art-both",
      organizationId: ORG_ID,
      sku: "SKU-AB",
      description: "Tornillo Universal",
      family: "Trauma",
      brand: "Zimmer",
      articleType: "Insumo",
      unit: "u",
      manufacturer: "Zimmer",
      isActive: true,
      stockEligibilities: [{ companyId: COMPANY_A }, { companyId: COMPANY_B }],
    },
    {
      id: "art-no-eligibility",
      organizationId: ORG_ID,
      sku: "SKU-NONE",
      description: "Artículo Sin Habilitar",
      family: "Descartable",
      brand: "Generic",
      articleType: "Descartable",
      unit: "u",
      manufacturer: "Generic",
      isActive: true,
      stockEligibilities: [], // Not eligible for any company
    },
    {
      id: "art-inactive",
      organizationId: ORG_ID,
      sku: "SKU-INACT",
      description: "Artículo Inactivo",
      family: "Cadera",
      brand: "Stryker",
      articleType: "Prótesis",
      unit: "u",
      manufacturer: "Stryker",
      isActive: false, // Inactive
      stockEligibilities: [{ companyId: COMPANY_A }],
    },
  ]

  function createMockDb() {
    return {
      company: {
        findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          return Promise.resolve({
            id: where.id,
            organizationId: ORG_ID,
          })
        }),
      },
      article: {
        findMany: vi.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
          const reqOrgId = where.organizationId as string
          const reqIsActive = where.isActive as boolean
          const reqCompanyId = (where.stockEligibilities as { some?: { companyId?: string } })?.some?.companyId

          const filtered = allArticles.filter((a) => {
            if (a.organizationId !== reqOrgId) return false
            if (reqIsActive !== undefined && a.isActive !== reqIsActive) return false
            if (reqCompanyId && !a.stockEligibilities.some((e) => e.companyId === reqCompanyId)) return false
            return true
          })

          return Promise.resolve(
            filtered.map((a) => ({
              ...a,
              vatTreatment: "GRAVADO",
              vatRate: { toNumber: () => 21 },
              identifiers: [],
              tracePolicies: [],
            })),
          )
        }),
        findFirst: vi.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
          const reqId = where.id as string
          const reqOrgId = where.organizationId as string
          const reqCompanyId = (where.stockEligibilities as { some?: { companyId?: string } })?.some?.companyId

          const match = allArticles.find((a) => {
            if (a.id !== reqId) return false
            if (a.organizationId !== reqOrgId) return false
            if (reqCompanyId && !a.stockEligibilities.some((e) => e.companyId === reqCompanyId)) return false
            return true
          })

          if (!match) return Promise.resolve(null)
          return Promise.resolve({
            ...match,
            name: match.description,
            code: match.sku,
            vatTreatment: "GRAVADO",
            vatRate: { toNumber: () => 21 },
            identifiers: [],
            tracePolicies: [],
            supplierMappings: [],
          })
        }),
      },
      stockMovement: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      remito: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaClient
  }

  it("1. Empresa A solo ve artículos con eligibility A", async () => {
    const db = createMockDb()
    const result = await getStockAvailability(db, COMPANY_A, {
      page: 1,
      limit: 50,
      sortKey: "articulo",
      sortDir: "asc",
      quickFilter: "",
    })

    const codes = result.data.map((i) => i.code)
    expect(codes).toEqual(expect.arrayContaining(["SKU-A1", "SKU-A2", "SKU-AB"]))
    expect(codes).not.toContain("SKU-B1")
    expect(codes).not.toContain("SKU-NONE")
    expect(codes).not.toContain("SKU-INACT")
    expect(result.pagination.total).toBe(3)
    expect(result.data.find((item) => item.code === "SKU-A1")?.category).toBeNull()
  })

  it("2. Empresa B no ve ni recibe facetas de artículos exclusivos de A", async () => {
    const db = createMockDb()
    const result = await getStockAvailability(db, COMPANY_B, {
      page: 1,
      limit: 50,
      sortKey: "articulo",
      sortDir: "asc",
      quickFilter: "",
    })

    const codes = result.data.map((i) => i.code)
    expect(codes).toEqual(expect.arrayContaining(["SKU-B1", "SKU-AB"]))
    expect(codes).not.toContain("SKU-A1")
    expect(codes).not.toContain("SKU-A2")
    expect(result.pagination.total).toBe(2)

    // Facets for Company B must not leak exclusive Company A values (Cadera, Rodilla, Stryker, Acme, Osteosíntesis)
    expect(result.facets.families).toEqual(["Columna", "Trauma"])
    expect(result.facets.brands).toEqual(["Medtronic", "Zimmer"])
    expect(result.facets.articleTypes).toEqual(["Insumo"])
  })

  it("3. Artículo activo organizacional sin eligibility no aparece en availability ni en facets", async () => {
    const db = createMockDb()
    const resultA = await getStockAvailability(db, COMPANY_A, {
      page: 1,
      limit: 50,
      sortKey: "articulo",
      sortDir: "asc",
      quickFilter: "",
    })

    expect(resultA.data.some((i) => i.code === "SKU-NONE")).toBe(false)
    expect(resultA.facets.families).not.toContain("Descartable")
    expect(resultA.facets.brands).not.toContain("Generic")
    expect(resultA.facets.articleTypes).not.toContain("Descartable")
  })

  it("4. Facetas, total y paginación usan únicamente el catálogo elegible", async () => {
    const db = createMockDb()
    const resultA = await getStockAvailability(db, COMPANY_A, {
      page: 1,
      limit: 2,
      sortKey: "articulo",
      sortDir: "asc",
      quickFilter: "",
    })

    expect(resultA.facets).toEqual({
      families: ["Cadera", "Rodilla", "Trauma"],
      brands: ["Acme", "Stryker", "Zimmer"],
      articleTypes: ["Insumo", "Osteosíntesis", "Prótesis"],
    })
    expect(resultA.pagination.total).toBe(3)
    expect(resultA.pagination.totalPages).toBe(2)
    expect(resultA.data).toHaveLength(2)
  })

  it("5. No hay fallback cross-company cuando no existen eligibilities (resultado vacío honesto)", async () => {
    const db = createMockDb()
    const COMPANY_EMPTY = "company-without-eligibilities"

    const result = await getStockAvailability(db, COMPANY_EMPTY, {
      page: 1,
      limit: 50,
      sortKey: "articulo",
      sortDir: "asc",
      quickFilter: "",
    })

    expect(result.data).toEqual([])
    expect(result.facets).toEqual({
      families: [],
      brands: [],
      articleTypes: [],
    })
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(1)
  })

  it("6. getArticleStockDetail blocks access if article is not eligible for active company", async () => {
    const db = createMockDb()

    // art-a1 is only eligible for COMPANY_A, not COMPANY_B
    await expect(getArticleStockDetail(db, COMPANY_B, "art-a1")).rejects.toThrow("Artículo no encontrado")

    // art-a1 is eligible for COMPANY_A
    const detail = await getArticleStockDetail(db, COMPANY_A, "art-a1")
    expect(detail.article.id).toBe("art-a1")
  })

  it("uses the persisted commercial minimum for detail stock status", async () => {
    const db = createMockDb()
    vi.mocked(db.article.findFirst).mockResolvedValue({
      ...allArticles[0],
      vatRate: { toNumber: () => 21 },
      identifiers: [], supplierMappings: [], tracePolicies: [],
      commercialProfiles: [{
        minStock: { toNumber: () => 1 },
        referenceCost: { toNumber: () => 0 },
        referenceSalePrice: { toNumber: () => 0 },
      }],
    } as never)
    vi.mocked(db.stockMovement.findMany).mockResolvedValue([{
      id: "movement-1", movementType: "RECEIPT_IN", quantity: { toNumber: () => 2 },
      createdAt: new Date("2026-10-05T10:00:00Z"),
      lotCode: null, serialNumber: null, expirationDate: null, location: null,
    }] as never)

    const detail = await getArticleStockDetail(db, COMPANY_A, "art-a1")
    expect(detail.summary.minStock).toBe(1)
    expect(detail.summary.available).toBe(2)
    expect(detail.summary.state).toBe("Disponible")
  })
})
