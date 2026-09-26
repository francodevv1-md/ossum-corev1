import { randomBytes } from "node:crypto"

export const REMITO_LOCATOR_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ" as const
export const REMITO_LOCATOR_VERSION = "RM1" as const

const BODY_SYMBOLS = 16
const NORMALIZED_SYMBOLS = 17

function crc5Epc(body: string): number {
  let remainder = 0x09
  const values = [1, ...Array.from(body, (symbol) => REMITO_LOCATOR_ALPHABET.indexOf(symbol))]

  for (const value of values) {
    for (let bit = 4; bit >= 0; bit -= 1) {
      const feedback = ((remainder >> 4) & 1) ^ ((value >> bit) & 1)
      remainder = (remainder << 1) & 0x1f
      if (feedback === 1) remainder ^= 0x09
    }
  }

  return remainder
}

function formatLocator(body: string, checkSymbol: string): string {
  return `${REMITO_LOCATOR_VERSION}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}-${checkSymbol}`
}

function encodeBody(bytes: Uint8Array): string {
  if (bytes.byteLength !== 10) {
    throw new RangeError("RM1 random input must contain exactly 10 bytes")
  }

  let encoded = ""
  for (let offset = 0; offset < bytes.length; offset += 2) {
    const value = (bytes[offset] << 8) | bytes[offset + 1]
    encoded += REMITO_LOCATOR_ALPHABET[(value >> 11) & 0x1f]
    encoded += REMITO_LOCATOR_ALPHABET[(value >> 6) & 0x1f]
    encoded += REMITO_LOCATOR_ALPHABET[(value >> 1) & 0x1f]

    if (offset + 2 < bytes.length) {
      encoded += REMITO_LOCATOR_ALPHABET[((value & 1) << 4) | (bytes[offset + 2] >> 4)]
      encoded += REMITO_LOCATOR_ALPHABET[((bytes[offset + 2] & 0x0f) << 1) | (bytes[offset + 3] >> 7)]
      encoded += REMITO_LOCATOR_ALPHABET[(bytes[offset + 3] >> 2) & 0x1f]
      encoded += REMITO_LOCATOR_ALPHABET[((bytes[offset + 3] & 0x03) << 3) | (bytes[offset + 4] >> 5)]
      encoded += REMITO_LOCATOR_ALPHABET[bytes[offset + 4] & 0x1f]
      offset += 3
    }
  }

  return encoded
}

export function createRemitoLocatorFromRandomBytes(bytes: Uint8Array): string {
  const body = encodeBody(bytes)
  const checkSymbol = REMITO_LOCATOR_ALPHABET[crc5Epc(body)]
  return formatLocator(body, checkSymbol)
}

export function generateRemitoLocator(): string {
  return createRemitoLocatorFromRandomBytes(randomBytes(10))
}

export function normalizeRemitoLocator(input: string): string | null {
  if (typeof input !== "string") return null

  const compact = input.normalize("NFKC").trim().toUpperCase().replace(/[ -]/g, "")
  let symbols: string

  if (compact.startsWith(REMITO_LOCATOR_VERSION)) {
    if (compact.length !== REMITO_LOCATOR_VERSION.length + NORMALIZED_SYMBOLS) return null
    symbols = compact.slice(REMITO_LOCATOR_VERSION.length)
  } else {
    if (compact.length !== NORMALIZED_SYMBOLS) return null
    symbols = compact
  }

  if (!Array.from(symbols).every((symbol) => REMITO_LOCATOR_ALPHABET.includes(symbol))) {
    return null
  }

  const body = symbols.slice(0, BODY_SYMBOLS)
  const checkSymbol = symbols[BODY_SYMBOLS]
  if (REMITO_LOCATOR_ALPHABET[crc5Epc(body)] !== checkSymbol) return null

  return formatLocator(body, checkSymbol)
}

export function isValidRemitoLocator(input: string): boolean {
  return normalizeRemitoLocator(input) !== null
}
