import { expect, it, vi } from "vitest"
import { resolveTrustedClientAddress } from "@/lib/security/trusted-client-address"

it("returns generic 503 before rate mutation or token lookup when provenance is ambiguous", () => {
  const rate = vi.fn(); const lookup = vi.fn()
  const result = resolveTrustedClientAddress({ environment: "production", directPeerAddress: "10.0.0.2", headers: { "x-forwarded-for": "192.0.2.1, 203.0.113.1" }, trustedIngressCidrs: ["10.0.0.0/24"], trustedForwardingHeader: "x-forwarded-for", forwardingHeaderOverwritten: true })
  if (result.ok) { rate(result.networkBytes); lookup() }
  expect(result).toEqual({ ok: false, status: 503, body: { error: { code: "verification_temporarily_unavailable", message: "Verification temporarily unavailable" } } })
  expect(rate).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled()
})
