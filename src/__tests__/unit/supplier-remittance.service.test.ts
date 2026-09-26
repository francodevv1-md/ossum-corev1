/* eslint-disable @typescript-eslint/no-explicit-any -- focused service boundary mocks. */
import { describe, expect, it, vi } from "vitest";
import { createSupplierRemittance, linkGoodsReceiptToSupplierRemittance, openSupplierRemittanceGoodsReceipt } from "@/lib/services/supplier-remittance.service";

const companyId = "company-1"; const actorId = "user-1";
const input = { supplierId: "supplier-1", number: "RP-1", documentDate: "2026-09-22", lines: [{ expectedDescription: "Implante", expectedQuantity: 2 }] };

describe("supplier remittance service", () => {
  it("rejects a foreign or inactive supplier before persistence", async () => {
    const db: any = { contactCompanyLink: { findFirst: vi.fn(async () => null) } };
    await expect(createSupplierRemittance(db, companyId, actorId, input)).rejects.toMatchObject({ code: "supplier_company_scope_invalid" });
  });
  it("persists expected lines under the tenant supplier link", async () => {
    const create = vi.fn(async ({ data }) => data); const db: any = { contactCompanyLink: { findFirst: vi.fn(async () => ({ contactId: input.supplierId })) }, supplierRemittance: { create } };
    await createSupplierRemittance(db, companyId, actorId, input);
    expect(create.mock.calls[0][0].data).toMatchObject({ companyId, supplierId: input.supplierId, number: "RP-1" });
    expect(create.mock.calls[0][0].data.lines.create[0]).toMatchObject({ lineNumber: 1, expectedDescription: "Implante" });
  });
  it("opens exactly one receipt for a remittance", async () => {
    const remittance = { id: "remittance-1", supplierId: input.supplierId, number: "RP-1", goodsReceipt: null }; const create = vi.fn(async ({ data }) => ({ id: "receipt-1", ...data }));
    const db: any = { supplierRemittance: { findFirst: vi.fn(async () => remittance) }, goodsReceipt: { create } };
    await expect(openSupplierRemittanceGoodsReceipt(db, companyId, remittance.id, actorId)).resolves.toMatchObject({ supplierRemittanceId: remittance.id });
    expect(create).toHaveBeenCalledTimes(1);
  });
  it("links a free receipt only through an explicit audited action", async () => {
    const tx: any = { goodsReceipt: { findFirst: vi.fn(async () => ({ id: "receipt-1", supplierRemittanceId: null })), update: vi.fn(async ({ data }) => ({ id: "receipt-1", ...data })) }, supplierRemittance: { findFirst: vi.fn(async () => ({ id: "remittance-1", goodsReceipt: null })) }, auditEvent: { create: vi.fn(async () => ({})) } };
    const db: any = { $transaction: vi.fn((fn: any) => fn(tx)) };
    await linkGoodsReceiptToSupplierRemittance(db, companyId, "receipt-1", "remittance-1", actorId);
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "goods_receipt.supplier_remittance_linked" }) }));
  });
});
