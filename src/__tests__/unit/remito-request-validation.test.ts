import { describe, expect, it } from "vitest"
import { Prisma } from "@prisma/client"
import { remitoCreateSchema, remitoDraftUpdateSchema, remitoDevolucionSchema, remitoItemCreateSchema } from "@/lib/validators/remito"

const item = (quantity: string | number) => ({ description: "Implant", quantity })
const create = (declaredValue: unknown) => ({ branchId: "branch", origin: "manual", salidaReason: "cirugia", items: [item(1)], declaredValue })

describe("Remito Decimal(18,4) request boundary", () => {
  it.each(["", " ", "\t", "0x10", "0b10", "0o10", "NaN", "Infinity", "-1", "1,25", "1.00001", "1e-5", "100000000000000", "99999999999999.99999", "1e14"])('rejects invalid declared value %j for create and PATCH', (value) => {
    expect(remitoCreateSchema.safeParse(create(value)).success).toBe(false)
    expect(remitoDraftUpdateSchema.safeParse({ declaredValue: value }).success).toBe(false)
  })
  it.each(["0x10", "0b10", "0o10", "  ", "1.00001", "1e-5", "100000000000000", "99999999999999.99999", "1e14", "0", "-1", Infinity, NaN])('rejects invalid quantity %j on create, PATCH and return', (value) => {
    expect(remitoItemCreateSchema.safeParse(item(value)).success).toBe(false)
    expect(remitoDraftUpdateSchema.safeParse({ items: [item(value)] }).success).toBe(false)
    expect(remitoDevolucionSchema.safeParse({ items: [{ itemId: "item", returnedQuantity: value }] }).success).toBe(false)
  })
  it.each(["99999999999999.9999", "0.0001", ".5", "1.", "+2", "1e-4", "1E+3", "0002.50000", " 2.5 ", 0.5, 10])('preserves exact supported quantity %j through Decimal construction', (value) => {
    const parsed = remitoItemCreateSchema.parse(item(value))
    expect(parsed.quantity).toBe(String(value).trim())
    const decimal = new Prisma.Decimal(parsed.quantity)
    expect(decimal.eq(new Prisma.Decimal(String(value).trim()))).toBe(true)
    expect(decimal.decimalPlaces()).toBeLessThanOrEqual(4)
    expect(decimal.lt("100000000000000")).toBe(true)
  })
  it.each([0, "0", "-0", "99999999999999.9999", "0.0001", "1e3", null])('allows representable nonnegative declared value %j', (value) => {
    expect(remitoCreateSchema.safeParse(create(value)).success).toBe(true)
    expect(remitoDraftUpdateSchema.safeParse({ declaredValue: value }).success).toBe(true)
  })
  it("keeps PATCH partial/null surgery semantics and immutable origin", () => {
    expect(remitoDraftUpdateSchema.parse({ surgeryId: null })).toEqual({ surgeryId: null })
    expect(remitoDraftUpdateSchema.parse({ metadata: { note: "Only metadata" } })).toEqual({ metadata: { note: "Only metadata" } })
    expect(remitoDraftUpdateSchema.safeParse({ origin: "box" }).success).toBe(false)
    expect(remitoDraftUpdateSchema.safeParse({ expectedUpdatedAt: "2026-10-07T00:00:00Z" }).success).toBe(false)
  })
  it.each(["1e-9000000000000001", "-1e-9000000000000001", "1e-999999999999999999999999999999999"])("rejects %s instead of accepting Decimal exponent underflow as zero", (value) => {
    expect(remitoCreateSchema.safeParse(create(value)).success).toBe(false)
    expect(remitoDraftUpdateSchema.safeParse({ declaredValue: value }).success).toBe(false)
  })
  it.each(["0e-9000000000000001", "-0e-9000000000000001", "0e9000000000000001"])("preserves an exact zero coefficient in %s", (value) => {
    expect(remitoCreateSchema.safeParse(create(value)).success).toBe(true)
    expect(remitoDraftUpdateSchema.safeParse({ declaredValue: value }).success).toBe(true)
  })
})
