import { describe, expect, it } from "vitest"
import { receiptOrigin } from "@/app/compras/remitos-proveedor/receipt-flow"
import { goodsReceiptCreateSchema } from "@/lib/validators/goods-receipt"

describe("purchase receipt explicit origins", () => {
  it("identifies remittance receipts from their persisted link, not an idempotency key", () => {
    expect(receiptOrigin({ idempotencyKey: "supplier-remito:RP-1" })).toBe("Libre")
    expect(receiptOrigin({ supplierRemittanceId: "remittance-1" })).toBe("Desde Remito")
  })

  it("allows empty lines only for backend remittance registration", () => {
    expect(goodsReceiptCreateSchema.safeParse({ supplierRemittanceId: "remittance-1", lines: [] }).success).toBe(true)
    expect(goodsReceiptCreateSchema.safeParse({ idempotencyKey: "free:1", lines: [] }).success).toBe(false)
    expect(goodsReceiptCreateSchema.safeParse({ supplierRemittanceId: "", lines: [] }).success).toBe(false)
  })
})
