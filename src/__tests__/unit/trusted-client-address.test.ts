import { describe, expect, it } from "vitest"
import { parseCanonicalAddress, parseCanonicalCidr, resolveTrustedClientAddress } from "@/lib/security/trusted-client-address"
import { validateTrustedClientAddressConfig } from "@/lib/security/trusted-client-address.config"

const base = { environment: "production" as const, directPeerAddress: "10.0.0.7", trustedIngressCidrs: ["10.0.0.0/24"], trustedForwardingHeader: "x-forwarded-for" as const, forwardingHeaderOverwritten: true }

describe("trusted client address", () => {
  it("parses canonical IPv4, IPv6 and mapped addresses to network bytes", () => {
    expect([...parseCanonicalAddress("192.0.2.1").bytes]).toEqual([192, 0, 2, 1])
    expect(parseCanonicalAddress("2001:db8::1").bytes).toHaveLength(16)
    expect([...parseCanonicalAddress("::ffff:192.0.2.1").bytes]).toEqual([192, 0, 2, 1])
  })

  it.each(["192.168.001.1", "2001:0db8::1", "FE80::1", "fe80::1%eth0", "192.0.2.1:80", "[2001:db8::1]"])("rejects noncanonical %s", (value) => {
    expect(() => parseCanonicalAddress(value)).toThrow()
  })

  it("validates canonical, non-overlapping injected CIDRs and overwrite provenance", () => {
    expect(parseCanonicalCidr("10.0.0.0/24").contains(Uint8Array.from([10, 0, 0, 255]))).toBe(true)
    expect(parseCanonicalCidr("2001:db8::/32").contains(parseCanonicalAddress("2001:db8:ffff::1").bytes)).toBe(true)
    expect(() => validateTrustedClientAddressConfig({ environment: "production", trustedIngressCidrs: ["10.0.0.1/24"], trustedForwardingHeader: "forwarded", forwardingHeaderOverwritten: true })).toThrow()
    expect(() => parseCanonicalCidr("1.2.3.4/0")).toThrow(/host bits/)
    expect(() => validateTrustedClientAddressConfig({ environment: "production", trustedIngressCidrs: ["10.0.0.0/24", "10.0.0.0/25"], trustedForwardingHeader: "forwarded", forwardingHeaderOverwritten: true })).toThrow(/overlap/)
    expect(() => validateTrustedClientAddressConfig({ environment: "production", trustedForwardingHeader: "forwarded" })).toThrow(/incomplete/)
  })

  it("accepts exact XFF and Forwarded forms from a trusted peer", () => {
    expect(resolveTrustedClientAddress({ ...base, headers: { "x-forwarded-for": "192.0.2.1" } })).toMatchObject({ ok: true, address: "192.0.2.1" })
    expect(resolveTrustedClientAddress({ ...base, trustedForwardingHeader: "forwarded", headers: { forwarded: 'for="[2001:db8::1]"' } })).toMatchObject({ ok: true, address: "2001:db8::1" })
    expect(resolveTrustedClientAddress({ ...base, trustedForwardingHeader: "forwarded", headers: { forwarded: 'for="[::ffff:192.0.2.1]"' } })).toMatchObject({ ok: true, address: "192.0.2.1" })
  })

  it.each([
    { headers: { "x-forwarded-for": "192.0.2.1, 198.51.100.2" } },
    { headers: { "X-Forwarded-For": "192.0.2.1", "x-forwarded-for": "198.51.100.2" } },
    { headers: { "x-forwarded-for": "192.0.2.1:80" } },
    { headers: {} },
    { headers: { "x-forwarded-for": "192.0.2.1" }, directPeerAddress: null },
    { headers: { "x-forwarded-for": "192.0.2.1" }, directPeerAddress: "198.51.100.1" },
  ])("fails closed for spoof, list, duplicate, port, untrusted or missing input", (override) => {
    expect(resolveTrustedClientAddress({ ...base, ...override })).toMatchObject({ ok: false, status: 503 })
  })

  it.each(["for=unknown", "for=_hidden", "for=192.0.2.1:80", "for=192.0.2.1;for=198.51.100.2", 'for="[fe80::1%25eth0]"'])("rejects ambiguous Forwarded value %s", (forwarded) => {
    expect(resolveTrustedClientAddress({ ...base, trustedForwardingHeader: "forwarded", headers: { forwarded } })).toMatchObject({ ok: false, status: 503 })
  })

  it("allows only actual development loopback and ignores spoofed headers", () => {
    expect(resolveTrustedClientAddress({ ...base, environment: "development", directPeerAddress: "::1", trustedIngressCidrs: [], forwardingHeaderOverwritten: false, headers: { "x-forwarded-for": "203.0.113.9" } })).toMatchObject({ ok: true, address: "::1" })
  })
})
