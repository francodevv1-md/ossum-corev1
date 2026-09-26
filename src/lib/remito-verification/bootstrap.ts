import type { PrismaClient } from "@prisma/client"
import type { RemitoActivationConfig, RemitoActivationFlags } from "@/lib/remito-verification/activation"
import { installRemitoActivationRuntime } from "@/lib/remito-verification/activation"
import { installRemitoVerificationRuntime } from "@/lib/remito-verification/service"
import { createRemitoTokenKeyring, type RemitoTokenKeyring } from "@/lib/remito-verification/token"
import { installPublicRemitoVerificationRuntime } from "@/app/api/public/remito-verifications/[token]/route"
import type { TrustedForwardingHeader } from "@/lib/security/trusted-client-address"
import { trustedClientAddressResolver, type ResolverInput } from "@/lib/security/trusted-client-address"

export type RemitoBootstrapEnvironment = Readonly<Record<string, string | undefined>>

export type RemitoBootstrapResult = {
  installed: boolean
  reason: string
  component?: "activation" | "verification" | "public" | "all"
}

const ENABLE_FLAG = "OSSUM_ENABLE_REMITO_VERIFICATION_DEV"
const ACTIVE_KEY_VERSION_ENV = "OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION"
const KEYRING_ENV = "OSSUM_REMITO_TOKEN_KEYRING_JSON"
const INTERNAL_ORIGIN_ENV = "OSSUM_REMITO_INTERNAL_ORIGIN"
const PUBLIC_ORIGIN_ENV = "OSSUM_REMITO_PUBLIC_ORIGIN"
const COMPANY_IDS_ENV = "OSSUM_REMITO_ACTIVATION_COMPANY_IDS"
const COHORT_START_ENV = "OSSUM_REMITO_COHORT_START"
const RATE_KEY_ENV = "OSSUM_REMITO_RATE_KEY_BASE64URL"
const FORWARDING_HEADER_ENV = "OSSUM_REMITO_TRUSTED_FORWARDING_HEADER"
const DEPLOYMENT_TIER_ENV = "OSSUM_DEPLOYMENT_TIER"

const ALL_ACTIVATION_FLAGS_ON: RemitoActivationFlags = {
  remitoLocatorIssuanceWrites: true,
  remitoInternalScanRead: true,
  remitoPublicPublicationWrites: true,
  remitoPublicCompatibilityRead: true,
  remitoPrintCodes: true,
}

function isDevelopment(env: RemitoBootstrapEnvironment): boolean {
  const tier = env[DEPLOYMENT_TIER_ENV]
  const nodeEnv = env.NODE_ENV
  return tier === "development" || nodeEnv === "development"
}

function required(env: RemitoBootstrapEnvironment, name: string): string {
  const value = env[name]
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Remito verification bootstrap requires ${name}`)
  }
  return value
}

function parseOrigin(env: RemitoBootstrapEnvironment, name: string): URL {
  const raw = required(env, name)
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${name} must be an absolute URL`)
  }
  if (url.protocol !== "https:") {
    throw new Error(`${name} must use the https scheme`)
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || url.origin === "null") {
    throw new Error(`${name} must be an origin-only https URL`)
  }
  return url
}

function parseCompanyIds(env: RemitoBootstrapEnvironment): readonly string[] {
  const raw = required(env, COMPANY_IDS_ENV)
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  if (ids.length === 0) throw new Error(`${COMPANY_IDS_ENV} must contain at least one company id`)
  const invalid = ids.find((id) => id !== id.trim() || id.length === 0)
  if (invalid !== undefined) throw new Error(`${COMPANY_IDS_ENV} contains an invalid id`)
  if (new Set(ids).size !== ids.length) throw new Error(`${COMPANY_IDS_ENV} must not repeat company ids`)
  return ids
}

function parseCohortStart(env: RemitoBootstrapEnvironment): Date {
  const raw = required(env, COHORT_START_ENV)
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) throw new Error(`${COHORT_START_ENV} must be an ISO date`)
  return date
}

function parseKeyring(env: RemitoBootstrapEnvironment): RemitoTokenKeyring {
  const rawVersion = required(env, ACTIVE_KEY_VERSION_ENV)
  if (!/^[1-9][0-9]*$/.test(rawVersion)) {
    throw new Error(`${ACTIVE_KEY_VERSION_ENV} must be a positive integer`)
  }
  let keys: unknown
  try {
    keys = JSON.parse(required(env, KEYRING_ENV))
  } catch {
    throw new Error(`${KEYRING_ENV} must be valid JSON`)
  }
  if (!keys || Array.isArray(keys) || typeof keys !== "object") {
    throw new Error(`${KEYRING_ENV} must be a JSON object keyed by token key version`)
  }
  return createRemitoTokenKeyring({
    activeTokenKeyVersion: Number(rawVersion),
    keys: keys as Record<string, string>,
  })
}

function parseRateKey(env: RemitoBootstrapEnvironment): Uint8Array {
  const raw = required(env, RATE_KEY_ENV)
  const decoded = Buffer.from(raw, "base64url")
  if (decoded.byteLength < 32 || decoded.toString("base64url") !== raw) {
    throw new Error(`${RATE_KEY_ENV} must be canonical base64url encoding at least 32 bytes`)
  }
  return Uint8Array.from(decoded)
}

function parseForwardingHeader(env: RemitoBootstrapEnvironment): TrustedForwardingHeader {
  const raw = env[FORWARDING_HEADER_ENV]?.trim()
  if (!raw || raw === "forwarded") return "forwarded"
  if (raw === "x-forwarded-for") return "x-forwarded-for"
  throw new Error(`${FORWARDING_HEADER_ENV} must be 'forwarded' or 'x-forwarded-for'`)
}

function buildActivationConfig(env: RemitoBootstrapEnvironment): RemitoActivationConfig {
  return {
    flags: { ...ALL_ACTIVATION_FLAGS_ON },
    cohort: {
      companyIds: parseCompanyIds(env),
      cohortStart: parseCohortStart(env),
    },
  }
}

function dayKeyDate(now: Date): Date {
  return new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`)
}

/**
 * Build the public verification route dependencies from the DEV bootstrap env.
 * Kept pure (no prisma import) so it can be unit-tested without a database.
 */
export type PublicRemitoVerificationPrisma = NonNullable<
  Parameters<typeof installPublicRemitoVerificationRuntime>[0]
>["prisma"]

export function buildPublicRemitoVerificationDependencies(input: {
  environment: "development" | "production"
  trustedIngressCidrs: readonly string[]
  trustedForwardingHeader: TrustedForwardingHeader
  forwardingHeaderOverwritten: boolean
  rateKey: Uint8Array
  prisma: PrismaClient
}) {
  const rateKey = input.rateKey
  return {
    environment: input.environment,
    addressResolver: trustedClientAddressResolver,
    addressInput(request: Request): ResolverInput {
      const ip = (request as { ip?: string | null }).ip ?? null
      return {
        directPeerAddress: ip,
        headers: request.headers,
        environment: input.environment,
        trustedIngressCidrs: input.trustedIngressCidrs,
        trustedForwardingHeader: input.trustedForwardingHeader,
        forwardingHeaderOverwritten: input.forwardingHeaderOverwritten,
      }
    },
    rateKey(now: Date) {
      return { key: rateKey, keyDate: dayKeyDate(now) }
    },
    prisma: input.prisma as unknown as PublicRemitoVerificationPrisma,
  } as const
}

export async function bootstrapRemitoVerificationRuntime(
  env: RemitoBootstrapEnvironment = process.env,
): Promise<RemitoBootstrapResult> {
  const enabled = env[ENABLE_FLAG]?.trim().toLowerCase() === "true"
  if (!enabled) {
    return { installed: false, reason: `${ENABLE_FLAG} is not enabled` }
  }
  if (!isDevelopment(env)) {
    return { installed: false, reason: "Refusing to install Remito verification outside a development tier" }
  }
  if (!env.DATABASE_URL?.trim()) {
    return { installed: false, reason: "DATABASE_URL is not configured" }
  }

  // Required configuration — fail loud when the enable flag is on but config is incomplete.
  const keyring = parseKeyring(env)
  const internalOrigin = parseOrigin(env, INTERNAL_ORIGIN_ENV)
  const publicOrigin = parseOrigin(env, PUBLIC_ORIGIN_ENV)
  const activationConfig = buildActivationConfig(env)
  const rateKey = parseRateKey(env)
  const trustedForwardingHeader = parseForwardingHeader(env)
  const environment: "development" | "production" = isDevelopment(env) ? "development" : "production"

  installRemitoActivationRuntime(activationConfig)
  const prisma = await loadPrisma()
  installRemitoVerificationRuntime({
    prisma: prisma as never,
    keyring,
    internalOrigin,
    publicOrigin,
  })
  installPublicRemitoVerificationRuntime(
    buildPublicRemitoVerificationDependencies({
      environment,
      trustedIngressCidrs: [],
      trustedForwardingHeader,
      forwardingHeaderOverwritten: false,
      rateKey,
      prisma,
    }),
  )

  return {
    installed: true,
    reason: "Remito verification runtime, activation gate, and public route runtime installed for development",
    component: "all",
  }
}

let cachedPrisma: PrismaClient | null = null
async function loadPrisma(): Promise<PrismaClient> {
  if (cachedPrisma) return cachedPrisma
  const mod = (await import("@/lib/prisma")) as { default: PrismaClient }
  cachedPrisma = mod.default
  return cachedPrisma
}

// Test-only helper: reset the cached prisma between unit tests.
export function __resetRemitoBootstrapPrismaCacheForTests(): void {
  cachedPrisma = null
}