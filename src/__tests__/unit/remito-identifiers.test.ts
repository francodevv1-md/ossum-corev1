import { describe, expect, it } from "vitest"

import {
  createRemitoLocatorFromRandomBytes,
  generateRemitoLocator,
  isValidRemitoLocator,
  normalizeRemitoLocator,
} from "@/lib/remito-identifiers"

describe("RM1 Remito identifiers", () => {
  it.each([
    ["00000000000000000000", "RM1-0000-0000-0000-0000-B"],
    ["ffffffffffffffffffff", "RM1-ZZZZ-ZZZZ-ZZZZ-ZZZZ-H"],
    ["0123456789abcdeffedc", "RM1-04HM-ASW9-NF6Y-ZZPW-M"],
  ])("reproduces the sealed vector for %s", (hex, expected) => {
    expect(createRemitoLocatorFromRandomBytes(Buffer.from(hex, "hex"))).toBe(expected)
  })

  it("normalizes the sealed lowercase ungrouped vector", () => {
    expect(normalizeRemitoLocator("rm104hmasw9nf6yzzpwm")).toBe(
      "RM1-04HM-ASW9-NF6Y-ZZPW-M",
    )
  })

  it("accepts body plus check symbol without a version prefix", () => {
    expect(normalizeRemitoLocator("04HM-ASW9-NF6Y-ZZPW-M")).toBe(
      "RM1-04HM-ASW9-NF6Y-ZZPW-M",
    )
  })

  it("applies NFKC, Unicode edge trimming, ASCII uppercase, spaces and hyphens", () => {
    expect(normalizeRemitoLocator("\u2003ｒｍ１ ０４ｈｍ-ａｓｗ９-ｎｆ６ｙ-ｚｚｐｗ-ｍ\u2003")).toBe(
      "RM1-04HM-ASW9-NF6Y-ZZPW-M",
    )
  })

  it.each([
    "RM2-04HM-ASW9-NF6Y-ZZPW-M",
    "RM1-04HM-ASW9-NF6Y-ZZPW",
    "RM1-04HM-ASW9-NF6Y-ZZPW-MM",
    "RM1-04HM-ASW9-NF6Y-ZZP0-M",
    "RM1-04HM_ASW9_NF6Y_ZZPW_M",
    "RM1-04HM-ASW9-NF6Y-ZZPW-N",
    "",
  ])("rejects malformed input before lookup-capable use: %s", (input) => {
    expect(normalizeRemitoLocator(input)).toBeNull()
    expect(isValidRemitoLocator(input)).toBe(false)
  })

  it("rejects an invalid random input length", () => {
    expect(() => createRemitoLocatorFromRandomBytes(Buffer.alloc(9))).toThrow(RangeError)
  })

  it("generates canonical valid locators", () => {
    const locator = generateRemitoLocator()
    expect(locator).toMatch(/^RM1-[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3}-[0-9A-HJKMNP-TV-Z]$/)
    expect(normalizeRemitoLocator(locator)).toBe(locator)
  })
})
