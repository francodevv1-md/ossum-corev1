import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStockPhysicalUnit, updateStockPhysicalUnit } from "@/lib/services/stock-physical-unit.service";
import { stockPhysicalUnitCreateSchema, stockPhysicalUnitUpdateSchema } from "@/lib/validators/stock-physical-unit";
import { createAuditEvent } from "@/lib/audit";

vi.mock("@/lib/audit", () => ({ createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-1" }) }));

describe("Stock physical units", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a physical unit code", () => {
    expect(() => stockPhysicalUnitCreateSchema.parse({ articleId: "article-1", unitCode: "" })).toThrow();
  });

  it("rejects an empty physical-unit update", () => {
    expect(() => stockPhysicalUnitUpdateSchema.parse({})).toThrow("Debe indicar una actualización");
  });

  it("creates an eligible caja unit and its audit event in one transaction", async () => {
    const tx = {
      $transaction: vi.fn(() => { throw new Error("Unexpected nested transaction"); }),
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      article: { findFirst: vi.fn().mockResolvedValue({ id: "article-1", sku: "CAJA-01", description: "Caja", articleType: "caja" }) },
      stockPhysicalUnit: { create: vi.fn().mockResolvedValue({ id: "unit-1", unitCode: "CJ-001", serialNumber: null, location: "Depósito A", status: "ACTIVE" }) },
    } as any;
    const db = { ...tx, $connect: vi.fn(), $transaction: vi.fn((callback) => callback(tx)) } as any;

    await createStockPhysicalUnit(db, "company-1", { articleId: "article-1", unitCode: "CJ-001", location: "Depósito A" }, "user-1");

    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(tx.stockPhysicalUnit.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "company-1", articleId: "article-1", unitCode: "CJ-001" }) });
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ entityType: "StockPhysicalUnit", action: "created" }));
  });

  it("creates a physical unit for an eligible serialized component", async () => {
    const db = {
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      article: { findFirst: vi.fn().mockResolvedValue({ id: "article-1", sku: "COMP-01", articleType: "implante" }) },
      stockPhysicalUnit: { create: vi.fn().mockResolvedValue({ id: "unit-1", unitCode: "COMP-UNIT-01", serialNumber: "SER-01", location: null }) },
    } as any;

    await createStockPhysicalUnit(db, "company-1", { articleId: "article-1", unitCode: "COMP-UNIT-01", serialNumber: "SER-01" }, "user-1");
    expect(db.stockPhysicalUnit.create).toHaveBeenCalledOnce();
  });

  it("allows location updates but prevents reactivating a retired unit", async () => {
    const db = {
      stockPhysicalUnit: {
        findFirst: vi.fn().mockResolvedValue({ id: "unit-1", companyId: "company-1", location: "A", status: "RETIRED" }),
        update: vi.fn(),
      },
    } as any;

    await expect(updateStockPhysicalUnit(db, "company-1", "unit-1", { status: "ACTIVE" }, "user-1")).rejects.toThrow("no puede reactivarse");
    expect(db.stockPhysicalUnit.update).not.toHaveBeenCalled();
  });
});
