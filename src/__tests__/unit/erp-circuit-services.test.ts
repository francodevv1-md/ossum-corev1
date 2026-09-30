import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSurgeryComparativa } from "@/lib/services/comparativa.service";
import { Prisma } from "@prisma/client";

describe("ERP Backend - Operating Circuit & Comparativa Authority", () => {
  const companyId = "company-tenant-100";
  const surgeryId = "surgery-tx-100";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Comparativa - Tenant Isolation & Source Derivation", () => {
    it("rejects surgery lookup if companyId does not match (tenant boundary)", async () => {
      const mockPrisma = {
        surgery: {
          findFirst: vi.fn().mockResolvedValue(null), // Surgery not found for this company
        },
      } as any;

      await expect(
        getSurgeryComparativa({
          companyId: "wrong-company-id",
          surgeryId,
          prisma: mockPrisma,
        })
      ).rejects.toThrow(/no encontrada en la empresa/);
    });

    it("aggregates and computes exact delta between Presupuesto, Remito, Consumo, and Devolucion", async () => {
      const mockPrisma = {
        surgery: {
          findFirst: vi.fn().mockResolvedValue({ id: surgeryId }),
        },
        presupuesto: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "pr-1",
              companyId,
              surgeryId,
              state: "Aprobado",
              versionNumber: 1,
              items: [
                {
                  id: "pr-item-1",
                  sku: "PROT-01",
                  description: "Prótesis Total Cadera",
                  quantity: new Prisma.Decimal(1),
                  unitPrice: new Prisma.Decimal(250000),
                  unit: "u",
                  metadata: null,
                },
                {
                  id: "pr-item-2",
                  sku: "TORN-01",
                  description: "Tornillos Esponjosa 6.5mm",
                  quantity: new Prisma.Decimal(6),
                  unitPrice: new Prisma.Decimal(5000),
                  unit: "u",
                  metadata: null,
                },
              ],
            },
          ]),
        },
        remito: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "rem-1",
              visibleNumber: 101,
              companyId,
              surgeryId,
              state: "Entregado",
              items: [
                {
                  id: "rem-item-1",
                  sku: "PROT-01",
                  description: "Prótesis Total Cadera",
                  quantity: new Prisma.Decimal(1),
                },
                {
                  id: "rem-item-2",
                  sku: "TORN-01",
                  description: "Tornillos Esponjosa 6.5mm",
                  quantity: new Prisma.Decimal(8), // Sent 8 (2 extra for safety)
                },
              ],
            },
          ]),
        },
        consumo: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "con-1",
              visibleNumber: 501,
              companyId,
              surgeryId,
              state: "Validado",
              items: [
                {
                  id: "con-item-1",
                  sku: "PROT-01",
                  description: "Prótesis Total Cadera",
                  consumedQuantity: new Prisma.Decimal(1),
                  remitoItemId: "rem-item-1",
                },
                {
                  id: "con-item-2",
                  sku: "TORN-01",
                  description: "Tornillos Esponjosa 6.5mm",
                  consumedQuantity: new Prisma.Decimal(6), // Consumed exact 6
                  remitoItemId: "rem-item-2",
                },
              ],
            },
          ]),
        },
        devolucion: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "dev-1",
              visibleNumber: 701,
              companyId,
              surgeryId,
              state: "Confirmada",
              items: [
                {
                  id: "dev-item-1",
                  sku: "TORN-01",
                  description: "Tornillos Esponjosa 6.5mm",
                  returnedQuantity: new Prisma.Decimal(2), // 2 unused screws returned
                  remitoItemId: "rem-item-2",
                },
              ],
            },
          ]),
        },
        invoice: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const comparativa = await getSurgeryComparativa({
        companyId,
        surgeryId,
        prisma: mockPrisma,
      });

      expect(comparativa.companyId).toBe(companyId);
      expect(comparativa.surgeryId).toBe(surgeryId);
      expect(comparativa.sources.hasPresupuesto).toBe(true);
      expect(comparativa.sources.hasRemitos).toBe(true);
      expect(comparativa.sources.hasConsumos).toBe(true);
      expect(comparativa.sources.hasDevoluciones).toBe(true);

      // Verify line items calculation
      const protLine = comparativa.lineas.find((l) => l.sku === "PROT-01");
      expect(protLine).toBeDefined();
      expect(protLine?.presupuestado).toBe(1);
      expect(protLine?.remitido).toBe(1);
      expect(protLine?.consumido).toBe(1);
      expect(protLine?.devuelto).toBe(0);
      expect(protLine?.estadoLinea).toBe("pendiente_facturar");

      const tornLine = comparativa.lineas.find((l) => l.sku === "TORN-01");
      expect(tornLine).toBeDefined();
      expect(tornLine?.presupuestado).toBe(6);
      expect(tornLine?.remitido).toBe(8);
      expect(tornLine?.consumido).toBe(6);
      expect(tornLine?.devuelto).toBe(2);
      expect(tornLine?.pendienteFisico).toBe(0); // 8 remitidos - 6 consumidos - 2 devueltos = 0
    });

    it("identifies unbudgeted items consumed during surgery", async () => {
      const mockPrisma = {
        surgery: { findFirst: vi.fn().mockResolvedValue({ id: surgeryId }) },
        presupuesto: { findMany: vi.fn().mockResolvedValue([]) }, // No formal quote
        remito: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "rem-2",
              companyId,
              surgeryId,
              state: "Entregado",
              items: [
                { id: "ri-1", sku: "HEMO-01", description: "Hemostático Surgicel", quantity: new Prisma.Decimal(2) },
              ],
            },
          ]),
        },
        consumo: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "con-2",
              companyId,
              surgeryId,
              state: "Validado",
              items: [
                { id: "ci-1", sku: "HEMO-01", description: "Hemostático Surgicel", consumedQuantity: new Prisma.Decimal(2), remitoItemId: "ri-1" },
              ],
            },
          ]),
        },
        devolucion: { findMany: vi.fn().mockResolvedValue([]) },
        invoice: { findMany: vi.fn().mockResolvedValue([]) },
      } as any;

      const comparativa = await getSurgeryComparativa({ companyId, surgeryId, prisma: mockPrisma });
      const hemoLine = comparativa.lineas.find((l) => l.sku === "HEMO-01");
      expect(hemoLine).toBeDefined();
      expect(hemoLine?.presupuestado).toBe(0);
      expect(hemoLine?.consumido).toBe(2);
      expect(hemoLine?.estadoLinea).toBe("revision_manual");
    });
  });
});
