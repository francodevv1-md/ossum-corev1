import { describe, expect, it, vi } from "vitest";
import { listComprasMovimientos } from "@/lib/services/compras-movimientos.service";
import type { PrismaClient } from "@prisma/client";

function makeMovementRow(
  supplierId: string | null,
  articleId: string,
  id: string
) {
  return {
    id,
    companyId: "company-1",
    articleId,
    quantity: 5,
    movementType: "RECEIPT_IN",
    createdAt: new Date("2026-09-30T10:00:00Z"),
    receiptId: supplierId ? "receipt-1" : null,
    receipt: supplierId
      ? { id: "receipt-1", documentReference: "REM-100", supplierId }
      : null,
    article: { id: articleId, sku: `SKU-${articleId}`, description: `Art ${articleId}` },
    createdBy: { id: "user-1", firstName: "Alice", lastName: "Doe", email: "a@b" },
  };
}

describe("compras-movimientos service — supplierId applied in WHERE before pagination", () => {
  it("passes supplierId in the receipt-relation WHERE clause and applies take/skip", async () => {
    const rows = [
      makeMovementRow("sup-1", "art-1", "sm-1"),
      makeMovementRow("sup-1", "art-3", "sm-3"),
    ];

    const prisma = {
      stockMovement: {
        findMany: vi.fn().mockImplementation(async (args: any) => {
          expect(args.where).toMatchObject({
            companyId: "company-1",
            receipt: { is: { supplierId: "sup-1" } },
          });
          expect(args.take).toBe(2);
          expect(args.skip).toBe(10);
          return rows;
        }),
      },
      contact: {
        findMany: vi.fn().mockImplementation(async () => [
          { id: "sup-1", tradeName: "Proveedor A" },
        ]),
      },
    } as unknown as PrismaClient;

    const result = await listComprasMovimientos({
      prisma,
      companyId: "company-1",
      supplierId: "sup-1",
      take: 2,
      skip: 10,
    });

    // Every result row carries the supplierId; the supplier filter is
    // applied in WHERE, not after pagination.
    expect(result.every((r) => r.supplierId === "sup-1")).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty("ordenCompraId");
    expect(result[0]).not.toHaveProperty("ordenCompraNumber");
  });

  it("omits the receipt WHERE filter when supplierId is absent", async () => {
    const rows = [
      makeMovementRow("sup-1", "art-1", "sm-1"),
      makeMovementRow(null, "art-2", "sm-2"),
    ];
    const prisma = {
      stockMovement: {
        findMany: vi.fn().mockImplementation(async (args: any) => {
          expect(args.where).not.toHaveProperty("receipt");
          return rows;
        }),
      },
      contact: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const result = await listComprasMovimientos({
      prisma,
      companyId: "company-1",
      receiptId: "rec-1",
    });

    expect(result).toHaveLength(2);
  });
});