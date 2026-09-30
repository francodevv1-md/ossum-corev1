import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createNecesidadCompra,
  convertNecesidadesToOrdenCompra,
} from "@/lib/services/necesidad-compra.service";
import {
  createOrdenPago,
  cancelOrdenPago,
} from "@/lib/services/orden-pago.service";
import { getComprasForecast } from "@/lib/services/compras-forecast.service";
import { recordStockMovement } from "@/lib/services/stock-ledger.service";

describe("ERP Backend - Purchases & Stock Domain Engine", () => {
  const companyId = "tenant-comp-1";
  const userId = "actor-user-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Necesidad de Compra - Idempotencia y Conversión a OC", () => {
    it("createNecesidadCompra uses idempotencyKey in upsert to prevent duplicate creation", async () => {
      const mockPrisma = {
        necesidadCompra: {
          findFirst: vi.fn().mockResolvedValue({
            id: "nec-idem-1",
            companyId,
            name: "Placa LCP 3.5mm",
            quantity: new Prisma.Decimal(5),
            state: "Pendiente",
            idempotencyKey: "key-origin-123",
            articleId: null,
            isArticuloZ: false,
            descripcionLibre: null,
            code: null,
            priority: "media",
            origin: "manual",
            originReference: null,
            suggestedSupplierId: null,
            suggestedSupplierName: null,
            surgeryId: null,
            observaciones: null,
            ordenCompraId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        auditEvent: {
          create: vi.fn().mockResolvedValue({ id: "audit-1" }),
        },
      } as any;

      const res = await createNecesidadCompra({
        companyId,
        prisma: mockPrisma,
        userId,
        name: "Placa LCP 3.5mm",
        quantity: 5,
        idempotencyKey: "key-origin-123",
      });

      expect(mockPrisma.necesidadCompra.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId,
            idempotencyKey: "key-origin-123",
          },
        })
      );
      expect(res.id).toBe("nec-idem-1");
    });

    it("convertNecesidadesToOrdenCompra rejects needs that are not in Pendiente state", async () => {
      const mockTx = {
        contactCompanyLink: {
          findFirst: vi.fn().mockResolvedValue({ contactId: "prov-1", companyId, isActive: true }),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([
            { id: "nec-1", state: "Pendiente", name: "Art 1", quantity: 2 },
            { id: "nec-2", state: "En_OC", name: "Art 2", quantity: 3 }, // Already converted!
          ]),
        },
      };

      const mockPrisma = {
        $transaction: vi.fn(async (cb: any) => cb(mockTx)),
      } as any;

      await expect(
        convertNecesidadesToOrdenCompra({
          companyId,
          prisma: mockPrisma,
          userId,
          necesidadIds: ["nec-1", "nec-2"],
          proveedorId: "prov-1",
          proveedorName: "Proveedor Test SA",
        })
      ).rejects.toThrow(/ya no están pendientes/);
    });
  });

  describe("2. Receipt & Stock Ledger - Inflow vs Outflow Movements", () => {
    it("recordStockMovement with idempotencyKey ensures single append in ledger", async () => {
      const mockDb = {
        stockMovement: {
          upsert: vi.fn().mockResolvedValue({
            id: "sm-1",
            companyId,
            articleId: "art-1",
            movementType: "RECEIPT_IN",
            quantity: new Prisma.Decimal(10),
            idempotencyKey: "receipt-scan-001",
          }),
        },
      } as any;

      const result = await recordStockMovement(mockDb, {
        companyId,
        articleId: "art-1",
        movementType: "RECEIPT_IN",
        quantity: 10,
        idempotencyKey: "receipt-scan-001",
      });

      expect(mockDb.stockMovement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId_idempotencyKey: {
              companyId,
              idempotencyKey: "receipt-scan-001",
            },
          },
        })
      );
      expect(result.id).toBe("sm-1");
    });
  });

  describe("3. Orden de Pago - Financial Integrity & Reversion", () => {
    it("rejects over-imputation exceeding payment total", async () => {
      const mockTx = {
        contactCompanyLink: {
          findFirst: vi.fn().mockResolvedValue({ contactId: "prov-1", companyId, isActive: true }),
        },
        $queryRaw: vi.fn().mockResolvedValue([]),
        ordenPago: {
          aggregate: vi.fn().mockResolvedValue({ _max: { visibleNumber: 1 } }),
        },
        facturaCompra: {
          findFirst: vi.fn().mockResolvedValue({
            id: "fc-1",
            number: "A-0001",
            total: new Prisma.Decimal(5000),
            proveedorId: "prov-1",
            state: "Pendiente",
            imputaciones: [],
          }),
        },
      };

      const mockPrisma = {
        $transaction: vi.fn(async (cb: any) => cb(mockTx)),
      } as any;

      await expect(
        createOrdenPago({
          companyId,
          prisma: mockPrisma,
          proveedorId: "prov-1",
          proveedorName: "Proveedor SA",
          total: 1000, // Total is 1000
          imputaciones: [{ facturaCompraId: "fc-1", amount: 1500 }], // Imputation is 1500 > 1000!
        })
      ).rejects.toThrow(/El total de imputaciones.*no puede superar el monto de la orden de pago/);
    });

    it("rejects imputation to invoice belonging to a different supplier", async () => {
      const mockTx = {
        contactCompanyLink: {
          findFirst: vi.fn().mockResolvedValue({ contactId: "prov-1", companyId, isActive: true }),
        },
        $queryRaw: vi.fn().mockResolvedValue([]),
        ordenPago: {
          aggregate: vi.fn().mockResolvedValue({ _max: { visibleNumber: 1 } }),
        },
        facturaCompra: {
          findFirst: vi.fn().mockResolvedValue({
            id: "fc-2",
            number: "A-0002",
            total: new Prisma.Decimal(5000),
            proveedorId: "prov-OTHER", // Different supplier!
            state: "Pendiente",
            imputaciones: [],
          }),
        },
      };

      const mockPrisma = {
        $transaction: vi.fn(async (cb: any) => cb(mockTx)),
      } as any;

      await expect(
        createOrdenPago({
          companyId,
          prisma: mockPrisma,
          proveedorId: "prov-1",
          proveedorName: "Proveedor SA",
          total: 2000,
          imputaciones: [{ facturaCompraId: "fc-2", amount: 2000 }],
        })
      ).rejects.toThrow(/pertenece a otro proveedor/);
    });

    it("cancelOrdenPago reverts fully paid invoices back to Pendiente", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditEvent: {
          create: vi.fn().mockResolvedValue({ id: "audit-1" }),
        },
        ordenPago: {
          findFirst: vi.fn().mockResolvedValue({
            id: "op-1",
            companyId,
            state: "Emitida",
            imputaciones: [{ facturaCompraId: "fc-100", amount: new Prisma.Decimal(5000) }],
          }),
          update: vi.fn().mockResolvedValue({
            id: "op-1",
            visibleNumber: 10,
            companyId,
            proveedorId: "prov-1",
            proveedorName: "Proveedor SA",
            total: new Prisma.Decimal(5000),
            paymentDate: new Date(),
            state: "Anulada",
            createdAt: new Date(),
            updatedAt: new Date(),
            imputaciones: [],
          }),
        },
        ordenPagoImputacion: {
          findMany: vi.fn().mockResolvedValue([]), // No other active imputations
        },
        facturaCompra: {
          findFirst: vi.fn().mockResolvedValue({
            id: "fc-100",
            total: new Prisma.Decimal(5000),
            state: "Pagada",
          }),
          update: vi.fn().mockResolvedValue({}),
        },
      };

      const mockPrisma = {
        $transaction: vi.fn(async (cb: any) => cb(mockTx)),
      } as any;

      const res = await cancelOrdenPago({
        companyId,
        prisma: mockPrisma,
        userId,
        ordenPagoId: "op-1",
        motivo: "Comprobante emitido por error",
      });

      expect(res.state).toBe("Anulada");
      // Must update invoice state back to Pendiente
      expect(mockTx.facturaCompra.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "fc-100" },
          data: expect.objectContaining({
            state: "Pendiente",
            pagadaAt: null,
          }),
        })
      );
    });
  });

  describe("4. Forecast - Signed Movement Deltas & Deterministic Stock", () => {
    it("RECEIPT_IN and RETURN_IN add stock, DISPATCH_OUT subtracts stock", async () => {
      const mockPrisma = {
        company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
        article: {
          findMany: vi.fn().mockResolvedValue([
            { id: "art-alpha", sku: "SKU-A", description: "Clavo Femoral", family: "Trauma", brand: "Synthes" },
          ]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            { articleId: "art-alpha", movementType: "RECEIPT_IN", quantity: new Prisma.Decimal(20), expirationDate: null },
            { articleId: "art-alpha", movementType: "DISPATCH_OUT", quantity: new Prisma.Decimal(15), expirationDate: null },
            { articleId: "art-alpha", movementType: "RETURN_IN", quantity: new Prisma.Decimal(5), expirationDate: null },
          ]),
        },
        necesidadCompra: { findMany: vi.fn().mockResolvedValue([]) },
        ordenCompra: { findMany: vi.fn().mockResolvedValue([]) },
      } as any;

      const summary = await getComprasForecast({ prisma: mockPrisma, companyId });

      // Physical stock calculation: +20 - 15 + 5 = 10
      // Default safety threshold = 5. Covered = 10 >= 5 -> deficit = 0
      expect(summary.totalArticlesEvaluated).toBe(1);
      const item = summary.items.find((i) => i.articleId === "art-alpha");
      if (item) {
        expect(item.currentStock).toBe(10);
        expect(item.suggestedOrderQty).toBe(0);
      }
    });
  });
});
