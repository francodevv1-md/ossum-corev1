import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  getComprasForecast,
  acceptReplenishmentSuggestion,
} from "@/lib/services/compras-forecast.service";
import { convertNecesidadesToOrdenCompra } from "@/lib/services/necesidad-compra.service";

describe("Compras y Reposición Backend-Authoritative", () => {
  const COMPANY_A = "comp-a";
  const COMPANY_B = "comp-b";
  const ORG_ID = "org-1";
  const USER_ID = "user-test";

  const ARTICLE_1 = {
    id: "art-1",
    sku: "TORN-001",
    description: "Tornillo de Titanio 3.5mm",
    family: "Trauma",
    brand: "Synthes",
    articleType: "Implante",
    commercialProfiles: [
      {
        preferredSupplierId: "prov-1",
        leadTimeDays: 7,
        referenceCost: new Prisma.Decimal("1500.00"),
        minStock: new Prisma.Decimal(5),
        preferredSupplier: {
          contactId: "prov-1",
          contact: {
            legalName: "Proveedor Quirúrgico SA",
            tradeName: "ProQuir",
            firstName: null,
            lastName: null,
          },
        },
      },
    ],
  };

  const ARTICLE_2 = {
    id: "art-2",
    sku: "PLACA-002",
    description: "Placa Bloqueada 6 orificios",
    family: "Trauma",
    brand: "Synthes",
    articleType: "Implante",
    commercialProfiles: [
      {
        preferredSupplierId: null,
        leadTimeDays: null,
        referenceCost: new Prisma.Decimal(0),
        minStock: new Prisma.Decimal(5),
        preferredSupplier: null,
      },
    ],
  };

  describe("1. Multiempresa Isolation & Suggestion Detection", () => {
    it("detects shortage and generates explainable suggestion for company A without leaking company B data", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([ARTICLE_1]),
        },
        stockMovement: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            if (where.companyId === COMPANY_A) {
              // Stock movement of 2 units in Company A
              return Promise.resolve([
                {
                  articleId: "art-1",
                  movementType: "RECEIPT_IN",
                  quantity: new Prisma.Decimal(2),
                  expirationDate: null,
                },
              ]);
            }
            // Company B has 10 units
            return Promise.resolve([
              {
                articleId: "art-1",
                movementType: "RECEIPT_IN",
                quantity: new Prisma.Decimal(10),
                expirationDate: null,
              },
            ]);
          }),
        },
        remito: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        stockReservation: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecastA = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });

      // minStock = 5, physical = 2, available = 2 -> suggested = 3
      expect(forecastA.items).toHaveLength(1);
      const item = forecastA.items[0];
      expect(item.articleId).toBe("art-1");
      expect(item.currentStock).toBe(2);
      expect(item.availableStock).toBe(2);
      expect(item.minStock).toBe(5);
      expect(item.suggestedOrderQty).toBe(3);
      expect(item.suggestedSupplierName).toBe("ProQuir");
      expect(item.leadTimeDays).toBe(7);
      expect(item.urgency).toBe("alta");
      expect(item.rationale.some((r) => r.includes("Disponible: 2 u."))).toBe(true);
      expect(item.rationale.some((r) => r.includes("inferior al mínimo de seguridad (5)"))).toBe(true);
    });

    it("evaluates different minStock per company for the same article", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            const isCompA = where?.stockEligibilities?.some?.companyId === COMPANY_A;
            return Promise.resolve([
              {
                id: "art-1",
                sku: "TORN-001",
                description: "Tornillo de Titanio 3.5mm",
                family: "Trauma",
                brand: "Synthes",
                articleType: "Implante",
                commercialProfiles: [
                  {
                    minStock: new Prisma.Decimal(isCompA ? 10 : 2),
                    preferredSupplierId: null,
                    leadTimeDays: null,
                    referenceCost: new Prisma.Decimal(100),
                    preferredSupplier: null,
                  },
                ],
              },
            ]);
          }),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            {
              articleId: "art-1",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(4),
              expirationDate: null,
            },
          ]),
        },
        remito: { findMany: vi.fn().mockResolvedValue([]) },
        stockReservation: { findMany: vi.fn().mockResolvedValue([]) },
        necesidadCompra: { findMany: vi.fn().mockResolvedValue([]) },
        ordenCompra: { findMany: vi.fn().mockResolvedValue([]) },
      } as any;

      // Company A: minStock = 10, physical = 4 -> suggested = 6
      const forecastA = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });
      expect(forecastA.items).toHaveLength(1);
      expect(forecastA.items[0].minStock).toBe(10);
      expect(forecastA.items[0].suggestedOrderQty).toBe(6);

      // Company B: minStock = 2, physical = 4 -> suggested = 0 (no shortage)
      const forecastB = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_B });
      expect(forecastB.items).toHaveLength(0);
    });

    it("minStock = 0 does not generate shortage suggestions", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "art-zero",
              sku: "ZERO-001",
              description: "Artículo Sin Mínimo",
              family: "Insumos",
              brand: "Genérico",
              articleType: "Insumo",
              commercialProfiles: [
                {
                  minStock: new Prisma.Decimal(0),
                  preferredSupplierId: null,
                  leadTimeDays: null,
                  referenceCost: new Prisma.Decimal(50),
                  preferredSupplier: null,
                },
              ],
            },
          ]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            {
              articleId: "art-zero",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(0),
              expirationDate: null,
            },
          ]),
        },
        remito: { findMany: vi.fn().mockResolvedValue([]) },
        stockReservation: { findMany: vi.fn().mockResolvedValue([]) },
        necesidadCompra: { findMany: vi.fn().mockResolvedValue([]) },
        ordenCompra: { findMany: vi.fn().mockResolvedValue([]) },
      } as any;

      const forecast = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });
      expect(forecast.items).toHaveLength(0);
    });

    it("uses real configurable minStock per article in suggestion calculations", async () => {
      const customArticle = {
        ...ARTICLE_1,
        id: "art-custom",
        commercialProfiles: [
          {
            minStock: new Prisma.Decimal(12),
            preferredSupplierId: null,
            leadTimeDays: null,
            referenceCost: new Prisma.Decimal(1500),
            preferredSupplier: null,
          },
        ],
      };

      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([customArticle]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            {
              articleId: "art-custom",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(4),
              expirationDate: null,
            },
          ]),
        },
        remito: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        stockReservation: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecast = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });

      expect(forecast.items).toHaveLength(1);
      const item = forecast.items[0];
      expect(item.minStock).toBe(12);
      expect(item.currentStock).toBe(4);
      expect(item.availableStock).toBe(4);
      // Shortage is 12 - 4 = 8
      expect(item.suggestedOrderQty).toBe(8);
      expect(item.rationale.some((r) => r.includes("inferior al mínimo de seguridad (12)"))).toBe(true);
    });

    it("active StockReservation reduces available stock and is distinguished in rationale", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([ARTICLE_1]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            {
              articleId: "art-1",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(5),
              expirationDate: null,
            },
          ]),
        },
        remito: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            if (where?.state?.in?.includes("Borrador")) {
              return Promise.resolve([
                {
                  items: [
                    {
                      itemId: "art-1",
                      quantity: new Prisma.Decimal(1),
                    },
                  ],
                },
              ]);
            }
            return Promise.resolve([]);
          }),
        },
        stockReservation: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            if (where.companyId === COMPANY_A && where.status === "ACTIVE") {
              return Promise.resolve([
                 { articleId: "art-1", remainingQuantity: new Prisma.Decimal(1) },
                 { articleId: "art-1", remainingQuantity: new Prisma.Decimal(1) },
              ]);
            }
            return Promise.resolve([]);
          }),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecast = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });

      expect(forecast.items).toHaveLength(1);
      const item = forecast.items[0];
      expect(item.currentStock).toBe(5);
      // Remito = 1, Box = 2 -> total reserved = 3
      expect(item.reservedStock).toBe(3);
      // Available = 5 - 3 = 2
      expect(item.availableStock).toBe(2);
      // Shortage = minStock(5) - available(2) = 3
      expect(item.suggestedOrderQty).toBe(3);

      // Verify rationale distinguishes remito and box reservations
      expect(item.rationale.some((r) => r.includes("Reservas por Remitos: 1 u."))).toBe(true);
      expect(item.rationale.some((r) => r.includes("Reservas por Cajas (StockReservation): 2 u."))).toBe(true);
      expect(item.rationale.some((r) => r.includes("Total reservado: 3 u."))).toBe(true);
    });

    it("reserves remaining quantity without double-counting dispatched allocations", async () => {
      const mockPrisma = {
        company: { findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }) },
        article: { findMany: vi.fn().mockResolvedValue([ARTICLE_1]) },
        stockMovement: { findMany: vi.fn().mockResolvedValue([
          { articleId: "art-1", movementType: "RECEIPT_IN", quantity: new Prisma.Decimal(10), expirationDate: null },
        ]) },
        remito: { findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(
          where.state.in.includes("Emitido")
            ? [{ items: [{ itemId: "art-1", quantity: new Prisma.Decimal(4), returnedQuantity: new Prisma.Decimal(0) }] }]
            : []
        )) },
        stockReservation: { findMany: vi.fn().mockResolvedValue([
          { articleId: "art-1", physicalUnitId: null, quantity: new Prisma.Decimal("3.5"), remainingQuantity: new Prisma.Decimal("3.5"), dispatchedQuantity: new Prisma.Decimal(0) },
          { articleId: "art-1", physicalUnitId: null, quantity: new Prisma.Decimal(4), remainingQuantity: new Prisma.Decimal(0), dispatchedQuantity: new Prisma.Decimal(4) },
        ]) },
        necesidadCompra: { findMany: vi.fn().mockResolvedValue([]) },
        ordenCompra: { findMany: vi.fn().mockResolvedValue([]) },
      } as any;

      const forecast = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });

      expect(forecast.items).toHaveLength(1);
      expect(forecast.items[0].reservedStock).toBe(3.5);
      expect(forecast.items[0].availableStock).toBe(2.5);
      expect(forecast.items[0].minStock).toBe(5);
      expect(forecast.items[0].suggestedOrderQty).toBe(2.5);
      expect(mockPrisma.stockReservation.findMany).toHaveBeenCalledWith({
        where: { companyId: COMPANY_A, status: "ACTIVE" },
        select: { articleId: true, remainingQuantity: true },
      });
    });

    it("RELEASED StockReservation does not reduce available stock", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([ARTICLE_1]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            {
              articleId: "art-1",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(5),
              expirationDate: null,
            },
          ]),
        },
        remito: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        stockReservation: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            // Service queries with status: "ACTIVE", so RELEASED won't be returned
            expect(where.status).toBe("ACTIVE");
            return Promise.resolve([]);
          }),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecast = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });

      // Physical = 5, Reserved = 0, Available = 5 >= minStock(5) -> no shortage
      expect(forecast.items).toHaveLength(0);
    });

    it("StockReservation from another company does not affect forecast", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([ARTICLE_1]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            {
              articleId: "art-1",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(5),
              expirationDate: null,
            },
          ]),
        },
        remito: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        stockReservation: {
          findMany: vi.fn().mockImplementation(({ where }) => {
            if (where.companyId === COMPANY_B) {
              return Promise.resolve([
                { articleId: "art-1", remainingQuantity: new Prisma.Decimal(1) },
                { articleId: "art-1", remainingQuantity: new Prisma.Decimal(1) },
              ]);
            }
            return Promise.resolve([]);
          }),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecastA = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });

      expect(forecastA.items).toHaveLength(0);
    });

    it("excludes articles with no shortage (available >= minStock)", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([ARTICLE_1, ARTICLE_2]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            // Article 1 has 10 units (healthy, min is 5)
            {
              articleId: "art-1",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(10),
              expirationDate: null,
            },
            // Article 2 has 1 unit (deficit, min is 5)
            {
              articleId: "art-2",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(1),
              expirationDate: null,
            },
          ]),
        },
        remito: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        stockReservation: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecast = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });

      // Only Article 2 should be in suggestions
      expect(forecast.items).toHaveLength(1);
      expect(forecast.items[0].articleId).toBe("art-2");
      expect(forecast.items[0].availableStock).toBe(1);
      expect(forecast.items[0].suggestedOrderQty).toBe(4);
    });

    it("deducts open needs (Pendiente / En_OC) and incoming POs to avoid duplicate suggestions", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: ORG_ID }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([ARTICLE_1]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            {
              articleId: "art-1",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(1),
              expirationDate: null,
            },
          ]),
        },
        remito: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        stockReservation: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([
            // Already has open purchase need of 4 units (covers min of 5)
            {
              articleId: "art-1",
              quantity: new Prisma.Decimal(4),
              state: "Pendiente",
            },
          ]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecast = await getComprasForecast({ prisma: mockPrisma, companyId: COMPANY_A });

      // Deficit is 4, but openNeedsQty is 4 -> suggestedOrderQty = 0 -> excluded
      expect(forecast.items).toHaveLength(0);
      expect(forecast.totalSuggestedOrderQty).toBe(0);
    });
  });

  describe("2. Accept Suggestion as Purchase Need", () => {
    it("creates a NecesidadCompra with origin stock_bajo without moving stock", async () => {
      const mockPrisma = {
        article: {
          findFirst: vi.fn().mockResolvedValue(ARTICLE_1),
        },
        necesidadCompra: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(({ data }) =>
            Promise.resolve({
              id: "nec-new",
              companyId: COMPANY_A,
              articleId: data.articleId,
              isArticuloZ: false,
              descripcionLibre: null,
              code: data.code,
              name: data.name,
              quantity: data.quantity,
              priority: data.priority,
              origin: data.origin,
              originReference: data.originReference,
              suggestedSupplierId: data.suggestedSupplierId,
              suggestedSupplierName: data.suggestedSupplierName,
              surgeryId: null,
              observaciones: data.observaciones,
              state: "Pendiente",
              ordenCompraId: null,
              idempotencyKey: data.idempotencyKey,
              createdAt: new Date(),
              updatedAt: new Date(),
              surgery: null,
              ordenCompra: null,
              article: { id: "art-1", sku: "TORN-001", description: "Tornillo de Titanio 3.5mm" },
            })
          ),
        },
        auditEvent: {
          create: vi.fn().mockResolvedValue({ id: "aud-1" }),
        },
        stockMovement: {
          create: vi.fn(),
          createMany: vi.fn(),
          upsert: vi.fn(),
        },
      } as any;

      const createdNeed = await acceptReplenishmentSuggestion({
        prisma: mockPrisma,
        companyId: COMPANY_A,
        articleId: "art-1",
        quantity: 5,
        priority: "alta",
        userId: USER_ID,
      });

      expect(createdNeed.id).toBe("nec-new");
      expect(createdNeed.origin).toBe("stock_bajo");
      expect(createdNeed.originReference).toBe("reposicion_sugerida");
      expect(createdNeed.suggestedSupplierName).toBe("ProQuir");
      expect(createdNeed.quantity).toBe("5");

      // Verify ZERO stock movements were called
      expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
      expect(mockPrisma.stockMovement.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.stockMovement.upsert).not.toHaveBeenCalled();
    });
  });

  describe("3. Traceability: Need → Purchase Order → Receipt", () => {
    it("converts pending needs to purchase order and updates state to En_OC", async () => {
      const mockNeeds = [
        {
          id: "nec-1",
          companyId: COMPANY_A,
          articleId: "art-1",
          name: "Tornillo de Titanio 3.5mm",
          code: "TORN-001",
          quantity: new Prisma.Decimal(10),
          state: "Pendiente",
          isArticuloZ: false,
          descripcionLibre: null,
          article: { id: "art-1", sku: "TORN-001" },
        },
      ];

      const mockTx = {
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue(mockNeeds),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        ordenCompra: {
          create: vi.fn().mockResolvedValue({
            id: "oc-100",
            companyId: COMPANY_A,
            proveedorId: "prov-1",
            proveedorName: "ProQuir",
            total: new Prisma.Decimal(0),
            state: "Borrador",
            emitidaAt: null,
            enviadaAt: null,
            recibidaAt: null,
            canceladaAt: null,
            observaciones: null,
            necesidadCompraIds: ["nec-1"],
            createdAt: new Date(),
            items: [],
          }),
        },
        auditEvent: {
          create: vi.fn().mockResolvedValue({ id: "aud-oc" }),
        },
      };

      const mockPrisma = {
        $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      } as any;

      const result = await convertNecesidadesToOrdenCompra({
        prisma: mockPrisma,
        companyId: COMPANY_A,
        necesidadIds: ["nec-1"],
        proveedorId: "prov-1",
        proveedorName: "ProQuir",
        userId: USER_ID,
      });

      expect(result.ordenCompra.id).toBe("oc-100");
      expect(result.convertedNecesidadIds).toEqual(["nec-1"]);
      expect(mockTx.necesidadCompra.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["nec-1"] },
          companyId: COMPANY_A,
        },
        data: {
          state: "En_OC",
          ordenCompraId: "oc-100",
        },
      });
    });
  });
});
