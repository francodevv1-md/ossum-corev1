import { describe, expect, it } from "vitest"
import QRCode from "qrcode"
import { encodeCode128B, renderCode128BSvg, CODE128_SYMBOL_PATTERNS } from "@/lib/code128"
import { parseGs1DataMatrix } from "@/lib/gs1"

describe("recovered identifier utilities", () => {
  it("encodes the normative Code 128 vector and physical dimensions", () => {
    expect(encodeCode128B("CODE128").values).toEqual([104, 35, 47, 36, 37, 17, 18, 24, 26, 106])
    expect(CODE128_SYMBOL_PATTERNS).toHaveLength(107)
    expect(renderCode128BSvg("CODE128")).toContain('width="52.8mm"')
    expect(renderCode128BSvg("A&B")).toContain("A&amp;B")
  })
  it.each(["", "\n", "é", "😀"])("rejects invalid Code 128 input %j", (value) => {
    expect(() => encodeCode128B(value)).toThrow(RangeError)
  })
  it("extracts parenthesized GS1 traceability without dropping the original", () => {
    const raw = "(01)01234567890123(10)LOT(21)SERIAL(17)271231(22)REF"
    expect(parseGs1DataMatrix(raw)).toMatchObject({ rawValue: raw, gtin: "01234567890123", lotCode: "LOT", serialNumber: "SERIAL", articleCode: "REF", expirationDate: new Date("2027-12-31T00:00:00Z") })
  })
  it("extracts the established compact supplier format", () => {
    expect(parseGs1DataMatrix("]d2010123456789012321SERIAL10LOT1727123122REF")).toMatchObject({ gtin: "01234567890123", lotCode: "LOT", serialNumber: "SERIAL", articleCode: "REF" })
  })
  it.each([
    ["invalid month", "271300"],
    ["day 00", "270100"],
    ["day outside month", "270431"],
    ["impossible date JavaScript would normalize", "270229"],
  ])("rejects %s in GS1 expiration dates", (_case, expiration) => {
    expect(parseGs1DataMatrix(`(17)${expiration}`).expirationDate).toBeUndefined()
  })
  it("generates a real QR PNG", async () => {
    expect(await QRCode.toDataURL("SKU-1")).toMatch(/^data:image\/png;base64,/)
  })
})
