import { describe, expect, it } from "vitest"

import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"

describe("decimal money", () => {
  it("keeps Decimal(18,4) values exact", () => {
    const lower = parseDecimalScale4("99999999999999.9998")
    const higher = parseDecimalScale4("99999999999999.9999")

    expect(lower).toBe(BigInt("999999999999999998"))
    expect(higher).toBe(BigInt("999999999999999999"))
    expect(higher! > lower!).toBe(true)
    expect(formatDecimalCurrency(higher!)).toBe("$ 100.000.000.000.000,00")
  })
})
