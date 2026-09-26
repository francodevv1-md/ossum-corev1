import { describe, expect, it } from "vitest"
import {
  CODE128_BAR_HEIGHT_MODULES,
  CODE128_QUIET_ZONE_MODULES,
  CODE128_SYMBOL_PATTERNS,
  CODE128_X_DIMENSION_MM,
  encodeCode128B,
  renderCode128BSvg,
} from "@/lib/code128"

// Independently transcribed ISO/IEC 15417 symbol-width reference table.
const ISO_PATTERNS = (
  "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 " +
  "112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 " +
  "311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 " +
  "112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 " +
  "313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 " +
  "314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 " +
  "122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 " +
  "124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 " +
  "114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112"
).split(" ")

function referenceEncode(text: string) {
  const data = [...text].map((character) => character.charCodeAt(0) - 32)
  const checksum = (104 + data.reduce((sum, value, index) => sum + value * (index + 1), 0)) % 103
  const values = [104, ...data, checksum, 106]
  const modules = values.flatMap((value) =>
    [...ISO_PATTERNS[value]].map((width, index) =>
      String(index % 2 === 0 ? 1 : 0).repeat(Number(width)),
    ),
  ).join("")
  return { checksum, values, modules }
}

describe("Code 128 Set B", () => {
  it.each([
    ["RM1-A", [104, 50, 45, 17, 13, 33, 100, 106]],
    ["CODE128", [104, 35, 47, 36, 37, 17, 18, 24, 26, 106]],
  ] as const)("matches the normative %s vector", (text, values) => {
    expect(encodeCode128B(text).values).toEqual(values)
  })

  it("contains every independently referenced ISO symbol pattern", () => {
    expect(CODE128_SYMBOL_PATTERNS).toHaveLength(107)
    expect(CODE128_SYMBOL_PATTERNS).toEqual(ISO_PATTERNS)
    CODE128_SYMBOL_PATTERNS.forEach((pattern, value) => {
      expect(pattern).toMatch(value === 106 ? /^\d{7}$/ : /^\d{6}$/)
      expect([...pattern].reduce((sum, width) => sum + Number(width), 0)).toBe(value === 106 ? 13 : 11)
    })
  })

  it.each(["RM1-A", "CODE128", " !~", "\u007f"])(
    "matches the independent checksum and full module stream for %j",
    (text) => {
      const actual = encodeCode128B(text)
      const reference = referenceEncode(text)
      expect(actual.checksum).toBe(reference.checksum)
      expect(actual.values).toEqual(reference.values)
      expect(actual.moduleStream).toBe(reference.modules)
      expect(actual.symbolModules).toBe(11 * (text.length + 2) + 13)
    },
  )

  it.each(["", "\n", "é", "😀"])("rejects unsupported input %j", (text) => {
    expect(() => encodeCode128B(text)).toThrow(RangeError)
  })

  it("renders fixed physical dimensions, integer bars, and exact 10X quiet zones", () => {
    const encoded = encodeCode128B("RM1-A")
    const svg = renderCode128BSvg("RM1-A")
    expect(CODE128_X_DIMENSION_MM).toBe(0.4)
    expect(CODE128_BAR_HEIGHT_MODULES * CODE128_X_DIMENSION_MM).toBeGreaterThanOrEqual(15)
    expect(encoded.totalModules).toBe(encoded.symbolModules + 20)
    expect(svg).toContain(`width="${(encoded.totalModules * 0.4).toFixed(1)}mm"`)
    expect(svg).toContain(`viewBox="0 0 ${encoded.totalModules} 50"`)
    expect(svg).toContain(`<rect x="${CODE128_QUIET_ZONE_MODULES}"`)

    const rects = [...svg.matchAll(/<rect x="(\d+)" y="0" width="(\d+)" height="(\d+)"\/>/g)]
    expect(rects.length).toBeGreaterThan(0)
    const finalBar = rects.at(-1)!
    expect(Number(finalBar[1]) + Number(finalBar[2])).toBe(encoded.totalModules - 10)
    expect(rects.every((match) => Number.isInteger(Number(match[1])) && Number.isInteger(Number(match[2])))).toBe(true)
    expect(renderCode128BSvg("CODE128")).toContain('width="52.8mm"')
  })

  it("escapes human-readable SVG text", () => {
    expect(renderCode128BSvg("A&B")).toContain("A&amp;B")
    expect(renderCode128BSvg("A&B")).not.toContain(">A&B<")
  })
})
