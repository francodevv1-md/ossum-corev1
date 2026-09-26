import { createHmac } from "node:crypto"

const DAY_MS = 86_400_000
const RATE_DOMAIN = Buffer.from("OSSUM-RATE\0", "utf8")

export type RateLimitConfig = {
  checksPerMinute: number
  invalidPerMinute: number
  blockMinutes: number
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  checksPerMinute: 60,
  invalidPerMinute: 10,
  blockMinutes: 15,
}

export function validateRateLimitConfig(config = DEFAULT_RATE_LIMIT): RateLimitConfig {
  if (!Number.isInteger(config.checksPerMinute) || config.checksPerMinute < 1 || config.checksPerMinute > 600
    || !Number.isInteger(config.invalidPerMinute) || config.invalidPerMinute < 1
    || config.invalidPerMinute > config.checksPerMinute
    || !Number.isInteger(config.blockMinutes) || config.blockMinutes < 1 || config.blockMinutes > 1_440) {
    throw new Error("Invalid Remito verification rate-limit configuration")
  }
  return { ...config }
}

export function createRateSourceFingerprint(key: Uint8Array, canonicalAddress: Uint8Array): string {
  if (key.byteLength < 32) throw new Error("Rate fingerprint key must contain at least 32 bytes")
  if (canonicalAddress.byteLength !== 4 && canonicalAddress.byteLength !== 16) {
    throw new Error("Canonical client address must contain 4 or 16 bytes")
  }
  return createHmac("sha256", key).update(RATE_DOMAIN).update(canonicalAddress).digest("hex")
}

export type AtomicRateDb = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>
}

type RateDecisionRow = { allowed: boolean; retryAfterSeconds: number }

const CONSUME_SQL = `
INSERT INTO "PublicVerificationRateBucket"
  ("sourceFingerprint","keyDate","firstSeenAt","windowStartedAt","checks","invalidChecks","blockedUntil","expiresAt","updatedAt")
VALUES ($1,$2,$3,$3,1,0,NULL,$4,$3)
ON CONFLICT ("sourceFingerprint","keyDate") DO UPDATE SET
  "windowStartedAt"=CASE WHEN "PublicVerificationRateBucket"."blockedUntil" > $3 THEN "PublicVerificationRateBucket"."windowStartedAt"
    WHEN "PublicVerificationRateBucket"."windowStartedAt" < $5 THEN $3 ELSE "PublicVerificationRateBucket"."windowStartedAt" END,
  "checks"=CASE WHEN "PublicVerificationRateBucket"."blockedUntil" > $3 THEN "PublicVerificationRateBucket"."checks"
    WHEN "PublicVerificationRateBucket"."windowStartedAt" < $5 THEN 1 ELSE "PublicVerificationRateBucket"."checks"+1 END,
  "invalidChecks"=CASE WHEN "PublicVerificationRateBucket"."blockedUntil" > $3 THEN "PublicVerificationRateBucket"."invalidChecks"
    WHEN "PublicVerificationRateBucket"."windowStartedAt" < $5 THEN 0 ELSE "PublicVerificationRateBucket"."invalidChecks" END,
  "blockedUntil"=CASE WHEN "PublicVerificationRateBucket"."blockedUntil" > $3 THEN "PublicVerificationRateBucket"."blockedUntil"
    WHEN (CASE WHEN "PublicVerificationRateBucket"."windowStartedAt" < $5 THEN 1 ELSE "PublicVerificationRateBucket"."checks"+1 END) > $6 THEN $3+($7*interval '1 minute') ELSE NULL END,
  "updatedAt"=$3
RETURNING ("blockedUntil" IS NULL OR "blockedUntil" <= $3) AS allowed,
  GREATEST(0,CEIL(EXTRACT(EPOCH FROM ("blockedUntil"-$3))))::int AS "retryAfterSeconds"`

const INVALID_SQL = `
UPDATE "PublicVerificationRateBucket" SET
  "invalidChecks"="invalidChecks"+1,
  "blockedUntil"=CASE WHEN "invalidChecks"+1 >= $4 THEN $3+($5*interval '1 minute') ELSE "blockedUntil" END,
  "updatedAt"=$3
WHERE "sourceFingerprint"=$1 AND "keyDate"=$2
RETURNING ("blockedUntil" IS NULL OR "blockedUntil" <= $3) AS allowed,
  GREATEST(0,CEIL(EXTRACT(EPOCH FROM ("blockedUntil"-$3))))::int AS "retryAfterSeconds"`

export async function consumeRateBeforeLookup(db: AtomicRateDb, input: {
  sourceFingerprint: string; keyDate: Date; now: Date; config?: RateLimitConfig
}): Promise<RateDecisionRow> {
  if (!/^[a-f0-9]{64}$/.test(input.sourceFingerprint)) throw new Error("Invalid rate source fingerprint")
  const config = validateRateLimitConfig(input.config)
  const expiresAt = new Date(input.now.getTime() + 29 * DAY_MS)
  const minuteStart = new Date(Math.floor(input.now.getTime() / 60_000) * 60_000)
  const rows = await db.$queryRawUnsafe<RateDecisionRow[]>(CONSUME_SQL, input.sourceFingerprint,
    input.keyDate, input.now, expiresAt, minuteStart, config.checksPerMinute, config.blockMinutes)
  if (!rows[0]) throw new Error("Rate bucket update returned no decision")
  return rows[0]
}

export async function recordInvalidRateOutcome(db: AtomicRateDb, input: {
  sourceFingerprint: string; keyDate: Date; now: Date; config?: RateLimitConfig
}): Promise<RateDecisionRow> {
  const config = validateRateLimitConfig(input.config)
  const rows = await db.$queryRawUnsafe<RateDecisionRow[]>(INVALID_SQL, input.sourceFingerprint,
    input.keyDate, input.now, config.invalidPerMinute, config.blockMinutes)
  if (!rows[0]) throw new Error("Rate bucket is missing before invalid outcome")
  return rows[0]
}
