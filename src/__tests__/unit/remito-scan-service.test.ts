import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "@prisma/client";
import { resolveRemitoScan } from "@/lib/services/remito-scan.service";

const locator = "RM1-ZZZZ-ZZZZ-ZZZZ-ZZZZ-H";

function prismaWith(result: unknown) {
  return { remitoScanLocator: { findUnique: vi.fn().mockResolvedValue(result) } } as unknown as PrismaClient;
}

describe("resolveRemitoScan", () => {
  it("uses one exact company-scoped lookup and returns no raw IDs or contextual existence", async () => {
    const prisma = prismaWith({ locator, remito: {
      documentType: "REMITO_SALIDA", state: "Emitido", issuedAt: new Date("2026-08-11T12:00:00Z"),
      items: [{ sku: "SKU", description: "Implant", quantity: new Prisma.Decimal(2), unit: "u",
        returnedQuantity: new Prisma.Decimal(0), lotNumber: "L1", serialNumber: null, expirationDate: null }],
    } });
    const result = await resolveRemitoScan({ companyId: "company-a", role: "logistica", locator, prisma });

    expect(prisma.remitoScanLocator.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId_locator: { companyId: "company-a", locator } },
    }));
    expect(result).toMatchObject({ remitoShortCode: locator, capabilities: { canDeliver: false, canReturn: false } });
    expect(JSON.stringify(result)).not.toMatch(/company-a|remitoId|surgery|cajas|\"id\"/i);
  });

  it.each(["admin", "coordinador", "logistica", "vendedor", "matrona", "instrumentador"])(
    "allows approved role %s but keeps mutation capabilities disabled", async (role) => {
      const prisma = prismaWith({ locator, remito: { documentType: "REMITO_SALIDA", state: "Emitido",
        issuedAt: new Date(), items: [] } });
      await expect(resolveRemitoScan({ companyId: "c", role, locator, prisma })).resolves.toMatchObject({
        capabilities: { canDeliver: false, canReturn: false },
      });
    });

  it.each([null, { locator, remito: { state: "Borrador", issuedAt: null, items: [] } }])(
    "returns the uniform neutral error for unavailable records", async (row) => {
      await expect(resolveRemitoScan({ companyId: "c", role: "admin", locator, prisma: prismaWith(row) }))
        .rejects.toMatchObject({ status: 404, code: "remito_scan_unavailable" });
    });

  it("denies unknown roles without lookup using the same neutral error", async () => {
    const prisma = prismaWith(null);
    await expect(resolveRemitoScan({ companyId: "c", role: "patient", locator, prisma }))
      .rejects.toMatchObject({ status: 404, code: "remito_scan_unavailable" });
    expect(prisma.remitoScanLocator.findUnique).not.toHaveBeenCalled();
  });
});
