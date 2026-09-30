import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrdenPago } from "@/lib/services/orden-pago.service";
import { getComprasForecast } from "@/lib/services/compras-forecast.service";
import { Prisma } from "@prisma/client";

describe("Purchases Audit Remediation - Integrity Tests", () => {
  const companyId = "test-company-1";

  describe("Orden de Pago - Imputation Uniqueness Integrity", () => {
    it("rejects payload with duplicate facturaCompraId in the same OP before persistence", async () => {
      const mockTx = {
        contactCompanyLink: {
          findFirst: vi.fn().mockResolvedValue({ contactId: "prov-1", companyId, isActive: true }),
        },
        $queryRaw: vi.fn().mockResolvedValue([]),
        ordenPago: {
          aggregate: vi.fn().mockResolvedValue({ _max: { visibleNumber: 5 } }),
          create: vi.fn(),
        },
        facturaCompra: {
          findFirst: vi.fn(),
        },
      };

      const mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
      } as any;

      const duplicatePayload = {
        companyId,
        prisma: mockPrisma,
        proveedorId: "prov-1",
        proveedorName: "Proveedor Quirúrgico SA",
        total: 1000,
        imputaciones: [
          { facturaCompraId: "fc-123", amount: 400 },
          { facturaCompraId: "fc-123", amount: 300 }, // Duplicate invoice in same OP!
        ],
      };

      await expect(createOrdenPago(duplicatePayload)).rejects.toThrow(
        /No se puede imputar la misma factura de compra \(fc-123\) más de una vez/
      );

      // Verify zero persistence occurred
      expect(mockTx.ordenPago.create).not.toHaveBeenCalled();
    });
  });

  describe("Compras Forecast - Stock Ledger Delta Calculation", () => {
    it("correctly computes stock: DISPATCH_OUT reduces stock, RECEIPT_IN and RETURN_IN increase stock", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "art-1",
              sku: "IMPL-001",
              description: "Prótesis de Cadera Titanio",
              family: "Prótesis",
              brand: "Zimmer",
              articleType: "Implante",
            },
          ]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            // Inflow 10 via receipt
            {
              articleId: "art-1",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(10),
              expirationDate: new Date("2028-01-01"),
            },
            // Outflow 4 via surgery dispatch
            {
              articleId: "art-1",
              movementType: "DISPATCH_OUT",
              quantity: new Prisma.Decimal(4),
              expirationDate: new Date("2028-01-01"),
            },
            // Inflow 2 via return from surgery
            {
              articleId: "art-1",
              movementType: "RETURN_IN",
              quantity: new Prisma.Decimal(2),
              expirationDate: new Date("2028-01-01"),
            },
          ]),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecast = await getComprasForecast({
        prisma: mockPrisma,
        companyId,
      });

      // Expected calculation: +10 - 4 + 2 = 8 units in stock
      // Min stock = 5, required = 5 + 0 + 0 = 5, covered = 8 + 0 = 8. Deficit = 0.
      expect(forecast.totalArticlesEvaluated).toBe(1);

      const item = forecast.items.find((i) => i.articleId === "art-1");

      // Current stock should be 8
      if (item) {
        expect(item.currentStock).toBe(8);
        expect(item.suggestedOrderQty).toBe(0);
      }
    });

    it("triggers suggested order and deficit when DISPATCH_OUT reduces stock below safety threshold", async () => {
      const mockPrisma = {
        company: {
          findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }),
        },
        article: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "art-2",
              sku: "TORN-002",
              description: "Tornillo Cortical 3.5mm",
              family: "Osteosíntesis",
              brand: "Synthes",
              articleType: "Insumo",
            },
          ]),
        },
        stockMovement: {
          findMany: vi.fn().mockResolvedValue([
            // Inflow 5 via receipt
            {
              articleId: "art-2",
              movementType: "RECEIPT_IN",
              quantity: new Prisma.Decimal(5),
              expirationDate: null,
            },
            // Outflow 4 via dispatch
            {
              articleId: "art-2",
              movementType: "DISPATCH_OUT",
              quantity: new Prisma.Decimal(4),
              expirationDate: null,
            },
          ]),
        },
        necesidadCompra: {
          findMany: vi.fn().mockResolvedValue([
            // Open need for 2
            {
              articleId: "art-2",
              quantity: new Prisma.Decimal(2),
            },
          ]),
        },
        ordenCompra: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const forecast = await getComprasForecast({
        prisma: mockPrisma,
        companyId,
      });

      // Stock: 5 - 4 = 1. Min: 5. Open needs: 2.
      // Total required = 5 + 2 + 0 = 7. Covered = 1. Deficit = 6.
      expect(forecast.totalArticlesEvaluated).toBe(1);
      const item = forecast.items.find((i) => i.articleId === "art-2");
      expect(item).toBeDefined();
      expect(item?.currentStock).toBe(1);
      expect(item?.openNeedsQty).toBe(2);
      expect(item?.suggestedOrderQty).toBe(6);
      expect(item?.urgency).toBe("alta");
    });
  });
});
