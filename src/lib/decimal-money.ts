const SCALE = BigInt(10_000)
const MAX_UNITS = BigInt("999999999999999999")

export function parseDecimalScale4(value: string) {
  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(value.trim())
  if (!match) return null
  const integer = match[1].replace(/^0+(?=\d)/, "")
  if (integer.length > 14) return null
  const units = BigInt(integer) * SCALE + BigInt((match[2] ?? "").padEnd(4, "0"))
  return units <= MAX_UNITS ? units : null
}

export function formatDecimalCurrency(value: string | bigint, decimals: 0 | 1 | 2 | 3 | 4 = 2) {
  const units = typeof value === "bigint" ? value : parseDecimalScale4(value)
  if (units === null) return "$ 0,00"
  const divisor = BigInt(10) ** BigInt(4 - decimals)
  const rounded = divisor === BigInt(1) ? units : (units + divisor / BigInt(2)) / divisor
  const fractionScale = BigInt(10) ** BigInt(decimals)
  const whole = rounded / fractionScale
  const fraction = rounded % fractionScale
  return `$ ${new Intl.NumberFormat("es-AR").format(whole)}${decimals ? `,${String(fraction).padStart(decimals, "0")}` : ""}`
}
