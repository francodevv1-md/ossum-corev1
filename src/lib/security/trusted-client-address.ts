export type TrustedForwardingHeader = "forwarded" | "x-forwarded-for"
export type HeaderSource = Headers | Readonly<Record<string, string | readonly string[] | undefined>>
export type ResolverInput = {
  directPeerAddress?: string | null
  headers: HeaderSource
  environment: "production" | "development" | "test"
  trustedIngressCidrs: readonly string[]
  trustedForwardingHeader: TrustedForwardingHeader
  forwardingHeaderOverwritten: boolean
}
export type AddressResult =
  | { ok: true; address: string; networkBytes: Uint8Array }
  | { ok: false; status: 503; body: typeof TEMPORARILY_UNAVAILABLE }
export interface TrustedClientAddressResolver {
  resolve(input: ResolverInput): AddressResult
}

export const TEMPORARILY_UNAVAILABLE = {
  error: { code: "verification_temporarily_unavailable", message: "Verification temporarily unavailable" },
} as const

type ParsedAddress = { family: 4 | 6; text: string; bytes: Uint8Array }
export type ParsedCidr = ParsedAddress & { prefix: number; contains(address: Uint8Array): boolean }

function parseIpv4(value: string): ParsedAddress | null {
  const parts = value.split(".")
  if (parts.length !== 4 || parts.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part))) return null
  const numbers = parts.map(Number)
  if (numbers.some((part) => part > 255)) return null
  return { family: 4, text: numbers.join("."), bytes: Uint8Array.from(numbers) }
}

function renderIpv6(words: readonly number[]): string {
  let bestStart = -1; let bestLength = 0
  for (let start = 0; start < 8;) {
    if (words[start] !== 0) { start += 1; continue }
    let end = start
    while (end < 8 && words[end] === 0) end += 1
    if (end - start > bestLength && end - start >= 2) { bestStart = start; bestLength = end - start }
    start = end
  }
  const left = words.slice(0, bestStart < 0 ? 8 : bestStart).map((word) => word.toString(16)).join(":")
  if (bestStart < 0) return left
  const right = words.slice(bestStart + bestLength).map((word) => word.toString(16)).join(":")
  return `${left}::${right}`
}

function parseIpv6(value: string): ParsedAddress | null {
  if (!value || value !== value.toLowerCase() || value.includes("%") || value.includes("[") || value.includes("]")) return null
  const mapped = /^::ffff:(.+)$/.exec(value)
  if (mapped) {
    const ipv4 = parseIpv4(mapped[1])
    return ipv4 && value === `::ffff:${ipv4.text}` ? ipv4 : null
  }
  if (value.includes(".")) return null
  const halves = value.split("::")
  if (halves.length > 2) return null
  const left = halves[0] ? halves[0].split(":") : []
  const right = halves[1] ? halves[1].split(":") : []
  if ([...left, ...right].some((word) => !/^[0-9a-f]{1,4}$/.test(word))) return null
  const missing = 8 - left.length - right.length
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null
  const words = [...left.map((word) => parseInt(word, 16)), ...Array(missing).fill(0), ...right.map((word) => parseInt(word, 16))]
  if (renderIpv6(words) !== value) return null
  const bytes = new Uint8Array(16)
  words.forEach((word, index) => { bytes[index * 2] = word >> 8; bytes[index * 2 + 1] = word & 255 })
  return { family: 6, text: value, bytes }
}

export function parseCanonicalAddress(value: string): ParsedAddress {
  if (value.trim() !== value || value.includes(":")) {
    const ipv6 = parseIpv6(value)
    if (ipv6) return ipv6
  } else {
    const ipv4 = parseIpv4(value)
    if (ipv4) return ipv4
  }
  throw new Error("Noncanonical address")
}

export function parseCanonicalCidr(value: string): ParsedCidr {
  const parts = value.split("/")
  if (parts.length !== 2 || !/^(0|[1-9]\d*)$/.test(parts[1])) throw new Error("Invalid CIDR")
  const address = parseCanonicalAddress(parts[0]); const prefix = Number(parts[1]); const bits = address.bytes.length * 8
  if (prefix > bits) throw new Error("Invalid CIDR prefix")
  const network = Uint8Array.from(address.bytes, (byte, index) => { const remaining = prefix - index * 8; const mask = remaining >= 8 ? 255 : remaining <= 0 ? 0 : 256 - 2 ** (8 - remaining); return byte & mask })
  if (!address.bytes.every((byte, index) => byte === network[index])) throw new Error("CIDR has host bits")
  const contains = (candidate: Uint8Array) => candidate.length === address.bytes.length && address.bytes.every((byte, index) => {
    const remaining = prefix - index * 8; const mask = remaining >= 8 ? 255 : remaining <= 0 ? 0 : 256 - 2 ** (8 - remaining)
    return (byte & mask) === (candidate[index] & mask)
  })
  return { ...address, prefix, contains }
}

function headerValues(headers: HeaderSource, name: string): readonly string[] {
  if (headers instanceof Headers) { const value = headers.get(name); return value === null ? [] : [value] }
  const entries = Object.entries(headers).filter(([key]) => key.toLowerCase() === name)
  return entries.flatMap(([, value]) => typeof value === "string" ? [value] : value ?? [])
}

function forwardedAddress(values: readonly string[], name: TrustedForwardingHeader): ParsedAddress {
  if (values.length !== 1 || values[0].includes(",")) throw new Error("Ambiguous forwarding header")
  if (name === "x-forwarded-for") return parseCanonicalAddress(values[0])
  const match = /^for=(?:([0-9.]+)|"\[([0-9a-f:.]+)\]")$/.exec(values[0])
  if (!match) throw new Error("Invalid Forwarded header")
  const parsed = parseCanonicalAddress(match[1] ?? match[2])
  if (match[2] && parsed.family !== 6 && !match[2].startsWith("::ffff:")) throw new Error("Invalid Forwarded IPv6")
  return parsed
}

export function resolveTrustedClientAddress(input: ResolverInput): AddressResult {
  const unavailable: AddressResult = { ok: false, status: 503, body: TEMPORARILY_UNAVAILABLE }
  try {
    if (!input.directPeerAddress) return unavailable
    const peer = parseCanonicalAddress(input.directPeerAddress)
    const trusted = input.forwardingHeaderOverwritten && input.trustedIngressCidrs.some((cidr) => {
      const network = parseCanonicalCidr(cidr); return network.family === peer.family && network.contains(peer.bytes)
    })
    if (trusted) {
      const client = forwardedAddress(headerValues(input.headers, input.trustedForwardingHeader), input.trustedForwardingHeader)
      return { ok: true, address: client.text, networkBytes: client.bytes }
    }
    if (input.environment !== "production" && (peer.text === "127.0.0.1" || peer.text === "::1")) {
      return { ok: true, address: peer.text, networkBytes: peer.bytes }
    }
    return unavailable
  } catch { return unavailable }
}

export const trustedClientAddressResolver: TrustedClientAddressResolver = { resolve: resolveTrustedClientAddress }
