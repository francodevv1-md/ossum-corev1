import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { getSurgeryTrace } from "@/lib/services/trace.service";

const COMPANY_ID = "company-1";
const SURGERY_ID = "surgery-1";

function remito(over: Record<string, unknown> = {}) {
  return {
    id: "remito-1",
    visibleNumber: 10,
    companyId: COMPANY_ID,
    surgeryId: SURGERY_ID,
    state: "Entregado",
    issuedAt: new Date("2026-07-08T10:00:00.000Z"),
    deliveredAt: new Date("2026-07-08T12:00:00.000Z"),
    returnedAt: null,
    metadata: null,
    createdAt: new Date("2026-07-08T09:00:00.000Z"),
    updatedAt: new Date("2026-07-08T12:00:00.000Z"),
    items: [
      {
        id: "remito-item-1",
        itemId: "catalog-1",
        sku: "SKU-1",
        description: "Tornillo",
        quantity: new Prisma.Decimal(5),
        unit: "u",
        lotNumber: null,
        serialNumber: null,
        expirationDate: null,
        returnedQuantity: new Prisma.Decimal(2),
        metadata: { lot: "L1" },
        createdAt: new Date("2026-07-08T09:01:00.000Z"),
        updatedAt: new Date("2026-07-08T09:01:00.000Z"),
      },
    ],
    ...over,
  };
}

function consumo(over: Record<string, unknown> = {}) {
  return {
    id: "consumo-1",
    visibleNumber: 20,
    companyId: COMPANY_ID,
    surgeryId: SURGERY_ID,
    remitoId: "remito-1",
    state: "Validado",
    validatedAt: new Date("2026-07-08T13:00:00.000Z"),
    facturedAt: null,
    metadata: null,
    createdAt: new Date("2026-07-08T12:30:00.000Z"),
    updatedAt: new Date("2026-07-08T13:00:00.000Z"),
    items: [
      {
        id: "consumo-item-1",
        remitoItemId: "remito-item-1",
        sku: "SKU-1",
        description: "Tornillo",
        consumedQuantity: new Prisma.Decimal(3),
        unit: "u",
        lotNumber: null,
        serialNumber: null,
        expirationDate: null,
        metadata: null,
        createdAt: new Date("2026-07-08T12:31:00.000Z"),
        updatedAt: new Date("2026-07-08T12:31:00.000Z"),
      },
    ],
    ...over,
  };
}

function devolucion(over: Record<string, unknown> = {}) {
  return {
    id: "devolucion-1",
    visibleNumber: 30,
    companyId: COMPANY_ID,
    surgeryId: SURGERY_ID,
    remitoId: "remito-1",
    consumoId: "consumo-1",
    state: "Confirmada",
    reason: "No usado",
    validatedAt: new Date("2026-07-08T14:00:00.000Z"),
    metadata: null,
    createdAt: new Date("2026-07-08T13:30:00.000Z"),
    updatedAt: new Date("2026-07-08T14:00:00.000Z"),
    items: [
      {
        id: "devolucion-item-1",
        remitoItemId: "remito-item-1",
        consumoItemId: "consumo-item-1",
        sku: "SKU-1",
        description: "Tornillo",
        returnedQuantity: new Prisma.Decimal(2),
        unit: "u",
        lotNumber: null,
        serialNumber: null,
        expirationDate: null,
        metadata: null,
        createdAt: new Date("2026-07-08T13:31:00.000Z"),
        updatedAt: new Date("2026-07-08T13:31:00.000Z"),
      },
    ],
    ...over,
  };
}

function prismaMock(over: Record<string, unknown> = {}) {
  return {
    surgery: { findFirst: vi.fn().mockResolvedValue({ id: SURGERY_ID }) },
    remito: { findMany: vi.fn().mockResolvedValue([remito()]) },
    consumo: { findMany: vi.fn().mockResolvedValue([consumo()]) },
    devolucion: { findMany: vi.fn().mockResolvedValue([devolucion()]) },
    auditEvent: { findMany: vi.fn().mockResolvedValue([]) },
    ...over,
  } as any;
}

describe("getSurgeryTrace", () => {
  it("derives read-only trace summary, timeline and item rows", async () => {
    const prisma = prismaMock();

    const trace = await getSurgeryTrace({ companyId: COMPANY_ID, surgeryId: SURGERY_ID, prisma });

    expect(prisma.surgery.findFirst).toHaveBeenCalledWith({
      where: { id: SURGERY_ID, companyId: COMPANY_ID },
      select: { id: true },
    });
    expect(trace.sourceVersion).toBe("v0-derived");
    expect(trace.summary).toMatchObject({
      remitosCount: 1,
      consumosCount: 1,
      devolucionesCount: 1,
      totalSentQuantity: 5,
      totalConsumedQuantity: 3,
      totalReturnedQuantity: 2,
      hasStockMovements: false,
    });
    expect(trace.items).toHaveLength(1);
    expect(trace.items[0]).toMatchObject({
      id: "remito-item-1",
      remitoItemId: "remito-item-1",
      consumoItemIds: ["consumo-item-1"],
      devolucionItemIds: ["devolucion-item-1"],
      sentQuantity: 5,
      consumedQuantity: 3,
      returnedQuantity: 2,
      pendingQuantity: 0,
      status: "ok",
      matchConfidence: "direct",
    });
    expect(trace.items[0]?.warnings).not.toContain("RETURNED_QUANTITY_SOURCE_CONFLICT");
    expect(trace.gaps.some((gap) => gap.code === "RETURNED_QUANTITY_SOURCE_CONFLICT")).toBe(false);
    expect(trace.gaps.some((gap) => gap.code === "NO_STOCK_MOVEMENTS")).toBe(true);
    expect(trace.timeline.map((event) => event.kind)).toEqual([
      "remito.created",
      "remito.issued",
      "remito.delivered",
      "consumo.created",
      "consumo.validated",
      "devolucion.created",
      "devolucion.confirmed",
    ]);
  });

  it("creates unmatched consumo gap when no remito item can be matched", async () => {
    const prisma = prismaMock({
      remito: { findMany: vi.fn().mockResolvedValue([remito({ items: [] })]) },
      devolucion: { findMany: vi.fn().mockResolvedValue([]) },
    });

    const trace = await getSurgeryTrace({ companyId: COMPANY_ID, surgeryId: SURGERY_ID, prisma });

    expect(trace.items).toHaveLength(1);
    expect(trace.items[0]).toMatchObject({
      matchConfidence: "unmatched",
      status: "unknown",
      sentQuantity: 0,
      consumedQuantity: 3,
    });
    expect(trace.gaps.some((gap) => gap.code === "UNMATCHED_CONSUMO_ITEM")).toBe(true);
  });

  it("accumulates multiple consumos for one remito item", async () => {
    const second = consumo({
      id: "consumo-2",
      items: [{ ...consumo().items[0], id: "consumo-item-2", consumedQuantity: new Prisma.Decimal(1) }],
    });
    const prisma = prismaMock({ consumo: { findMany: vi.fn().mockResolvedValue([consumo(), second]) } });

    const trace = await getSurgeryTrace({ companyId: COMPANY_ID, surgeryId: SURGERY_ID, prisma });

    expect(trace.items[0]).toMatchObject({
      consumoItemIds: ["consumo-item-1", "consumo-item-2"],
      consumedQuantity: 4,
    });
  });

  it("prefers confirmed devolucion quantity and exposes a conflict with the remito accumulator", async () => {
    const conflicting = devolucion({
      items: [{ ...devolucion().items[0], returnedQuantity: new Prisma.Decimal(1) }],
    });
    const prisma = prismaMock({ devolucion: { findMany: vi.fn().mockResolvedValue([conflicting]) } });

    const trace = await getSurgeryTrace({ companyId: COMPANY_ID, surgeryId: SURGERY_ID, prisma });

    expect(trace.items[0]).toMatchObject({
      returnedQuantity: 1,
      pendingQuantity: 1,
      warnings: expect.arrayContaining(["RETURNED_QUANTITY_SOURCE_CONFLICT"]),
    });
    expect(trace.gaps).toContainEqual(expect.objectContaining({ code: "RETURNED_QUANTITY_SOURCE_CONFLICT" }));
  });

  it("uses normalized devolucion trace fields for unmatched devolucion items", async () => {
    const prisma = prismaMock({
      remito: { findMany: vi.fn().mockResolvedValue([remito({ items: [] })]) },
      consumo: { findMany: vi.fn().mockResolvedValue([]) },
      devolucion: {
        findMany: vi.fn().mockResolvedValue([
          devolucion({
            consumoId: null,
            items: [
              {
                id: "devolucion-item-1",
                remitoItemId: null,
                consumoItemId: null,
                sku: "SKU-TRACE",
                description: "Pinza",
                returnedQuantity: new Prisma.Decimal(1),
                unit: "u",
                lotNumber: "LOT-D1",
                serialNumber: "SER-D1",
                expirationDate: new Date("2028-01-31T00:00:00.000Z"),
                metadata: null,
                createdAt: new Date("2026-07-08T13:31:00.000Z"),
                updatedAt: new Date("2026-07-08T13:31:00.000Z"),
              },
            ],
          }),
        ]),
      },
    });

    const trace = await getSurgeryTrace({ companyId: COMPANY_ID, surgeryId: SURGERY_ID, prisma });

    expect(trace.items).toHaveLength(1);
    expect(trace.items[0]).toMatchObject({
      matchConfidence: "unmatched",
      sourceFlags: { hasDevolucion: true },
      lot: "LOT-D1",
      serial: "SER-D1",
      expiry: "2028-01-31T00:00:00.000Z",
    });
    expect(trace.gaps.some((gap) => gap.code === "UNMATCHED_DEVOLUCION_ITEM")).toBe(true);
  });

  it("throws not_found when surgery does not belong to company", async () => {
    const prisma = prismaMock({ surgery: { findFirst: vi.fn().mockResolvedValue(null) } });

    await expect(getSurgeryTrace({ companyId: COMPANY_ID, surgeryId: SURGERY_ID, prisma })).rejects.toMatchObject({
      code: "surgery_not_found",
      status: 404,
    });
    expect(prisma.remito.findMany).not.toHaveBeenCalled();
  });

  it("honors includeAudit/includeItems/includeSources flags", async () => {
    const prisma = prismaMock();

    const trace = await getSurgeryTrace({
      companyId: COMPANY_ID,
      surgeryId: SURGERY_ID,
      prisma,
      includeAudit: false,
      includeItems: false,
      includeSources: true,
    });

    expect(prisma.auditEvent.findMany).not.toHaveBeenCalled();
    expect(trace.items).toEqual([]);
    expect(trace.summary.itemRowsCount).toBe(0);
    expect(trace.sources?.map((source) => source.type)).toEqual([
      "Remito",
      "RemitoItem",
      "Consumo",
      "ConsumoItem",
      "Devolucion",
      "DevolucionItem",
    ]);
  });
});
