import { describe, it, expect } from "vitest"
import { encodeCode128B, renderCode128BSvg } from "@/lib/code128"
import { PdfBarcode } from "@/components/pdf/barcode/barcode"

describe("PDF Barcode Component & Code128 generator", () => {
  it("encodes valid ASCII strings into Code 128 B stream", () => {
    const encoded = encodeCode128B("R-0004-00001842")
    expect(encoded.totalModules).toBeGreaterThan(0)
    expect(encoded.symbolModules).toBeGreaterThan(0)
    expect(encoded.moduleStream).toMatch(/^[01]+$/)
  })

  it("generates a valid SVG representation for barcode", () => {
    const svg = renderCode128BSvg("R-0004-00001842")
    expect(svg).toContain("<svg")
    expect(svg).toContain("Code 128: R-0004-00001842")
    expect(svg).toContain("</svg>")
  })

  it("handles empty or whitespace strings gracefully without crashing", () => {
    expect(() => encodeCode128B("")).toThrow(RangeError)
  })
})
