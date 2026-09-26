import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRawUnsafe: vi.fn(),
    remitoVerificationAccess: { findUnique: vi.fn() },
    remitoVerificationDailyMetric: { upsert: vi.fn() },
    remitoScanLocator: { findFirst: vi.fn() },
    remitoVerificationPublication: { findFirst: vi.fn() },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import {
  bootstrapRemitoVerificationRuntime,
  buildPublicRemitoVerificationDependencies,
  __resetRemitoBootstrapPrismaCacheForTests,
} from "@/lib/remito-verification/bootstrap"
import { getRemitoActivationGate, installRemitoActivationRuntime } from "@/lib/remito-verification/activation"
import { getRemitoVerificationRuntime } from "@/lib/remito-verification/service"
import { getPublicRemitoVerificationRuntime, installPublicRemitoVerificationRuntime } from "@/app/api/public/remito-verifications/[token]/route"

// 32-byte canonical unpadded base64url (43 chars), like the token keyring requires.
const VALID_KEY = Buffer.from(new Uint8Array(32).map((_, i) => i + 1)).toString("base64url")
const rateKey = Buffer.alloc(32, 7).toString("base64url")

function validEnv() {
  return {
    NODE_ENV: "development" as const,
    OSSUM_DEPLOYMENT_TIER: "development",
    OSSUM_ENABLE_REMITO_VERIFICATION_DEV: "true",
    OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION: "1",
    OSSUM_REMITO_TOKEN_KEYRING_JSON: JSON.stringify({ "1": VALID_KEY }),
    OSSUM_REMITO_INTERNAL_ORIGIN: "https://localhost:3000",
    OSSUM_REMITO_PUBLIC_ORIGIN: "https://localhost:3000",
    OSSUM_REMITO_ACTIVATION_COMPANY_IDS: "company-dev-1,company-dev-2",
    OSSUM_REMITO_COHORT_START: "2026-01-01T00:00:00.000Z",
    OSSUM_REMITO_RATE_KEY_BASE64URL: rateKey,
    DATABASE_URL: "postgresql://localhost/test",
  } as Record<string, string | undefined>
}

describe("bootstrapRemitoVerificationRuntime", () => {
  beforeEach(() => {
    __resetRemitoBootstrapPrismaCacheForTests()
    installRemitoActivationRuntime(null)
    installPublicRemitoVerificationRuntime(null)
  })

  it("is a no-op when the enable flag is off", async () => {
    const env = { ...validEnv(), OSSUM_ENABLE_REMITO_VERIFICATION_DEV: "false" }
    const result = await bootstrapRemitoVerificationRuntime(env)
    expect(result.installed).toBe(false)
    const gate = await getRemitoActivationGate()
    expect(gate.flags.remitoPrintCodes).toBe(false)
  })

  it("refuses to run outside a development tier", async () => {
    const env = { ...validEnv(), OSSUM_DEPLOYMENT_TIER: "production", NODE_ENV: "production" }
    const result = await bootstrapRemitoVerificationRuntime(env)
    expect(result.installed).toBe(false)
    expect(result.reason).toMatch(/development/)
  })

  it("is a no-op when DATABASE_URL is missing", async () => {
    const env = validEnv()
    delete env.DATABASE_URL
    const result = await bootstrapRemitoVerificationRuntime(env)
    expect(result.installed).toBe(false)
    expect(result.reason).toMatch(/DATABASE_URL/)
  })

  it("installs all three runtimes for a complete DEV config", async () => {
    const result = await bootstrapRemitoVerificationRuntime(validEnv())
    expect(result.installed).toBe(true)

    const gate = await getRemitoActivationGate()
    expect(gate.flags.remitoLocatorIssuanceWrites).toBe(true)
    expect(gate.flags.remitoPrintCodes).toBe(true)
    expect(gate.cohort?.companyIds).toEqual(["company-dev-1", "company-dev-2"])
    expect(gate.cohort?.cohortStart).toEqual(new Date("2026-01-01T00:00:00.000Z"))
    expect(gate.isCompanyDateEligible("company-dev-1", new Date("2026-06-01"))).toBe(true)
    expect(gate.isCompanyDateEligible("company-other", new Date("2026-06-01"))).toBe(false)

    const runtime = getRemitoVerificationRuntime()
    expect(runtime.internalOrigin.origin).toBe("https://localhost:3000")
    expect(runtime.publicOrigin.origin).toBe("https://localhost:3000")
    expect(runtime.keyring.activeTokenKeyVersion).toBe(1)

    const publicRuntime = getPublicRemitoVerificationRuntime()
    expect(publicRuntime).not.toBeNull()
    expect(publicRuntime!.environment).toBe("development")
    expect(publicRuntime!.addressResolver).toBeDefined()
  })

  it("registers the activation cohort as eligible for issued dates on/after cohort start", async () => {
    await bootstrapRemitoVerificationRuntime(validEnv())
    const gate = await getRemitoActivationGate()
    expect(gate.isCompanyDateEligible("company-dev-1", new Date("2025-12-31"))).toBe(false)
    expect(gate.isCompanyDateEligible("company-dev-1", new Date("2026-01-01T00:00:00.000Z"))).toBe(true)
  })

  it("rejects non-https origins", async () => {
    const env = { ...validEnv(), OSSUM_REMITO_INTERNAL_ORIGIN: "http://localhost:3000" }
    await expect(bootstrapRemitoVerificationRuntime(env)).rejects.toThrow(/OSSUM_REMITO_INTERNAL_ORIGIN/)
  })

  it("rejects an invalid keyring payload", async () => {
    const env = { ...validEnv(), OSSUM_REMITO_TOKEN_KEYRING_JSON: "not-json" }
    await expect(bootstrapRemitoVerificationRuntime(env)).rejects.toThrow(/OSSUM_REMITO_TOKEN_KEYRING_JSON/)
  })

  it("rejects repeated company ids", async () => {
    const env = { ...validEnv(), OSSUM_REMITO_ACTIVATION_COMPANY_IDS: "dup,dup" }
    await expect(bootstrapRemitoVerificationRuntime(env)).rejects.toThrow(/OSSUM_REMITO_ACTIVATION_COMPANY_IDS/)
  })

  it("rejects a rate key shorter than 32 bytes", async () => {
    const env = { ...validEnv(), OSSUM_REMITO_RATE_KEY_BASE64URL: Buffer.alloc(16, 1).toString("base64url") }
    await expect(bootstrapRemitoVerificationRuntime(env)).rejects.toThrow(/OSSUM_REMITO_RATE_KEY_BASE64URL/)
  })
})

describe("buildPublicRemitoVerificationDependencies", () => {
  it("builds a day-stable rate key and reads the peer ip from the request", () => {
    const prisma = { $queryRawUnsafe: vi.fn() } as never
    const deps = buildPublicRemitoVerificationDependencies({
      environment: "development",
      trustedIngressCidrs: [],
      trustedForwardingHeader: "forwarded",
      forwardingHeaderOverwritten: false,
      rateKey: new Uint8Array(32),
      prisma,
    })
    expect(deps.environment).toBe("development")
    const now = new Date("2026-08-12T13:14:15.000Z")
    const rate = deps.rateKey(now)
    expect(rate.keyDate).toEqual(new Date("2026-08-12T00:00:00.000Z"))
    const nextDay = new Date("2026-08-13T01:00:00.000Z")
    expect(deps.rateKey(nextDay).keyDate).toEqual(new Date("2026-08-13T00:00:00.000Z"))

    const request = new NextRequest("https://localhost:3000/verificar/remito/x", {
      headers: { "x-forwarded-for": "203.0.113.7" },
    })
    const input = deps.addressInput(request)
    expect(input.environment).toBe("development")
    expect(input.trustedIngressCidrs).toEqual([])
    expect(input.trustedForwardingHeader).toBe("forwarded")
    expect(input.forwardingHeaderOverwritten).toBe(false)
    expect(input.headers).toBe(request.headers)
  })
})