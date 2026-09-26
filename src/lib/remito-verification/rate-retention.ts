import { timingSafeEqual } from "node:crypto"

const MAX_AGE_MS = 30 * 86_400_000
const ALERT_AGE_MS = 29.5 * 86_400_000

export type RetentionResult = { deleted: number; oldestRemainingAgeSeconds: number | null; retentionAlert: boolean }
type RetentionTx = {
  publicVerificationRateBucket: {
    deleteMany(input: unknown): Promise<{ count: number }>
    findFirst(input: unknown): Promise<{ firstSeenAt: Date } | null>
  }
}
export type RetentionDb = { $transaction<T>(run: (tx: RetentionTx) => Promise<T>): Promise<T> }

export async function purgeRemitoVerificationRateBuckets(db: RetentionDb, now = new Date()): Promise<RetentionResult> {
  return db.$transaction(async (tx) => {
    const deleted = await tx.publicVerificationRateBucket.deleteMany({ where: { expiresAt: { lte: now } } })
    const oldest = await tx.publicVerificationRateBucket.findFirst({ orderBy: { firstSeenAt: "asc" }, select: { firstSeenAt: true } })
    const age = oldest ? Math.max(0, now.getTime() - oldest.firstSeenAt.getTime()) : null
    return { deleted: deleted.count, oldestRemainingAgeSeconds: age === null ? null : Math.floor(age / 1_000),
      retentionAlert: age !== null && age >= ALERT_AGE_MS }
  })
}

export function verifySchedulerBearer(authorization: string | null, secret: Uint8Array): boolean {
  if (secret.byteLength < 32) throw new Error("Scheduler bearer secret must contain at least 32 bytes")
  const supplied = authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1]
  const expected = Buffer.from(secret).toString("base64url")
  const candidate = Buffer.from(supplied ?? "", "utf8")
  const expectedBytes = Buffer.from(expected, "utf8")
  const comparable = candidate.byteLength === expectedBytes.byteLength ? candidate : Buffer.alloc(expectedBytes.byteLength)
  return timingSafeEqual(comparable, expectedBytes) && supplied !== undefined
}

export function retentionGatePassed(result: RetentionResult): boolean {
  return !result.retentionAlert && (result.oldestRemainingAgeSeconds ?? 0) < MAX_AGE_MS / 1_000
}
