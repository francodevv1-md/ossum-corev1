import {
  consumeRateBeforeLookup,
  createRateSourceFingerprint,
  recordInvalidRateOutcome,
  type AtomicRateDb,
  type RateLimitConfig,
} from "@/lib/remito-verification/rate-limit"
import {
  verifyPublicRemitoToken,
  type PublicVerificationDependencies,
} from "@/lib/remito-verification/service"
import {
  TEMPORARILY_UNAVAILABLE,
  type ResolverInput,
  type TrustedClientAddressResolver,
} from "@/lib/security/trusted-client-address"
import { getRemitoActivationGate } from "@/lib/remito-verification/activation"

type RouteContext = { params: Promise<{ token: string }> }
type RateKey = { key: Uint8Array; keyDate: Date }

export type PublicRemitoVerificationRouteDependencies = {
  environment: "development" | "production"
  addressResolver: TrustedClientAddressResolver
  addressInput(request: Request): ResolverInput
  rateKey(now: Date): RateKey
  prisma: PublicVerificationDependencies["prisma"] & AtomicRateDb
  now?: () => Date
  rateConfig?: RateLimitConfig
  reportFailure?: (event: "public_remito_verification_failed") => void
}

const SECURITY_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Type": "application/json",
} as const

const RATE_LIMITED = {
  error: { code: "verification_rate_limited", message: "Verification temporarily unavailable" },
} as const

function json(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, ...extraHeaders },
  })
}

export function createPublicRemitoVerificationGet(dependencies: PublicRemitoVerificationRouteDependencies) {
  return async function GET(request: Request, { params }: RouteContext): Promise<Response> {
    const now = (dependencies.now ?? (() => new Date()))()
    try {
      if (!(await getRemitoActivationGate()).flags.remitoPublicCompatibilityRead) {
        return json(TEMPORARILY_UNAVAILABLE, 503)
      }
      if (new URL(request.url).protocol !== "https:" && dependencies.environment !== "development") {
        return json(TEMPORARILY_UNAVAILABLE, 503)
      }
      const address = dependencies.addressResolver.resolve(dependencies.addressInput(request))
      if (!address.ok) return json(address.body, address.status)

      const rateKey = dependencies.rateKey(now)
      const sourceFingerprint = createRateSourceFingerprint(rateKey.key, address.networkBytes)
      const rateInput = { sourceFingerprint, keyDate: rateKey.keyDate, now, config: dependencies.rateConfig }
      const decision = await consumeRateBeforeLookup(dependencies.prisma, rateInput)
      if (!decision.allowed) {
        return json(RATE_LIMITED, 429, { "Retry-After": String(Math.max(1, decision.retryAfterSeconds)) })
      }

      const { token } = await params
      const dto = await verifyPublicRemitoToken({ prisma: dependencies.prisma, now: () => now }, token)
      if (dto.verificationStatus === "invalid") await recordInvalidRateOutcome(dependencies.prisma, rateInput)
      return json(dto)
    } catch {
      dependencies.reportFailure?.("public_remito_verification_failed")
      return json(TEMPORARILY_UNAVAILABLE, 503)
    }
  }
}

// globalThis-backed so instrumentation.ts (separate module graph in dev) shares
// state with the GET handler. See remito-verification/activation.ts for the same pattern.
const globalForPublicRemitoVerification = globalThis as unknown as {
  __publicRemitoVerificationRuntime?: PublicRemitoVerificationRouteDependencies | null
}

export function installPublicRemitoVerificationRuntime(
  dependencies: PublicRemitoVerificationRouteDependencies | null,
): void {
  globalForPublicRemitoVerification.__publicRemitoVerificationRuntime = dependencies
}

export function getPublicRemitoVerificationRuntime(): PublicRemitoVerificationRouteDependencies | null {
  return globalForPublicRemitoVerification.__publicRemitoVerificationRuntime ?? null
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const rt = getPublicRemitoVerificationRuntime()
  if (!rt) return json(TEMPORARILY_UNAVAILABLE, 503)
  return createPublicRemitoVerificationGet(rt)(request, context)
}
