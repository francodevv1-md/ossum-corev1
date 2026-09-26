const START_B = 104
const STOP = 106

export const CODE128_X_DIMENSION_MM = 0.4
export const CODE128_QUIET_ZONE_MODULES = 10
export const CODE128_BAR_HEIGHT_MODULES = 40 // 16 mm at the required X-dimension.

/** ISO/IEC 15417 Code 128 symbol widths, indexed by symbol value. */
export const CODE128_SYMBOL_PATTERNS = Object.freeze([
  "212222", "222122", "222221", "121223", "121322", "131222",
  "122213", "122312", "132212", "221213", "221312", "231212",
  "112232", "122132", "122231", "113222", "123122", "123221",
  "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321",
  "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131",
  "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124",
  "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111",
  "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141",
  "411131", "211412", "211214", "211232", "2331112",
] as const)

export type Code128Encoding = {
  readonly text: string
  readonly values: readonly number[]
  readonly checksum: number
  readonly moduleStream: string
  readonly symbolModules: number
  readonly totalModules: number
}

function patternToModules(pattern: string): string {
  return [...pattern]
    .map((width, index) => String(index % 2 === 0 ? 1 : 0).repeat(Number(width)))
    .join("")
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]!)
}

export function encodeCode128B(text: string): Code128Encoding {
  if (text.length === 0) throw new RangeError("Code 128 B input must not be empty")

  const dataValues = Array.from(text, (character) => {
    const codePoint = character.codePointAt(0)!
    if (codePoint < 32 || codePoint > 127) {
      throw new RangeError("Code 128 B accepts only ASCII code points 32 through 127")
    }
    return codePoint - 32
  })
  const checksum = dataValues.reduce(
    (sum, value, index) => sum + value * (index + 1),
    START_B,
  ) % 103
  const values = Object.freeze([START_B, ...dataValues, checksum, STOP])
  const moduleStream = values
    .map((value) => patternToModules(CODE128_SYMBOL_PATTERNS[value]))
    .join("")
  const symbolModules = moduleStream.length

  return Object.freeze({
    text,
    values,
    checksum,
    moduleStream,
    symbolModules,
    totalModules: symbolModules + CODE128_QUIET_ZONE_MODULES * 2,
  })
}

export function renderCode128BSvg(text: string): string {
  const encoded = encodeCode128B(text)
  const widthMm = (encoded.totalModules * CODE128_X_DIMENSION_MM).toFixed(1)
  const heightModules = 50
  let cursor = CODE128_QUIET_ZONE_MODULES
  const bars: string[] = []

  for (const run of encoded.moduleStream.matchAll(/(1+)|(0+)/g)) {
    const width = run[0].length
    if (run[1]) {
      bars.push(`<rect x="${cursor}" y="0" width="${width}" height="${CODE128_BAR_HEIGHT_MODULES}"/>`)
    }
    cursor += width
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Code 128: ${escapeXml(text)}" width="${widthMm}mm" height="20mm" viewBox="0 0 ${encoded.totalModules} ${heightModules}" shape-rendering="crispEdges"><title>${escapeXml(text)}</title><g fill="#000">${bars.join("")}</g><text x="50%" y="48" text-anchor="middle" font-family="monospace" font-size="7">${escapeXml(text)}</text></svg>`
}
