import { parseCanonicalCidr, type TrustedForwardingHeader } from "./trusted-client-address"

export type TrustedClientAddressConfigInput = {
  environment: "production" | "development" | "test"
  trustedIngressCidrs?: readonly string[]
  trustedForwardingHeader?: TrustedForwardingHeader
  forwardingHeaderOverwritten?: boolean
}

export type TrustedClientAddressConfig = {
  environment: "production" | "development" | "test"
  trustedIngressCidrs: readonly string[]
  trustedForwardingHeader: TrustedForwardingHeader
  forwardingHeaderOverwritten: boolean
}

export function validateTrustedClientAddressConfig(input: TrustedClientAddressConfigInput): TrustedClientAddressConfig {
  const cidrs = [...(input.trustedIngressCidrs ?? [])]
  const header = input.trustedForwardingHeader
  if (!header || !["forwarded", "x-forwarded-for"].includes(header)) throw new Error("Invalid trusted forwarding header")
  if (input.environment === "production" && (!cidrs.length || input.forwardingHeaderOverwritten !== true)) {
    throw new Error("Production trusted-ingress provenance is incomplete")
  }
  const parsed = cidrs.map(parseCanonicalCidr)
  for (let left = 0; left < parsed.length; left += 1) {
    for (let right = left + 1; right < parsed.length; right += 1) {
      if (parsed[left].family === parsed[right].family &&
        (parsed[left].contains(parsed[right].bytes) || parsed[right].contains(parsed[left].bytes))) {
        throw new Error("Trusted ingress CIDRs overlap")
      }
    }
  }
  return { environment: input.environment, trustedIngressCidrs: cidrs, trustedForwardingHeader: header, forwardingHeaderOverwritten: input.forwardingHeaderOverwritten === true }
}
