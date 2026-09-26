import { randomBytes, randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"

import { createRemitoFingerprint } from "@/lib/remito-verification/fingerprint"
import {
  deriveRemitoPublicToken,
  hashRemitoPublicToken,
  type RemitoTokenKeyring,
} from "@/lib/remito-verification/token"
import { createRemitoLocatorFromRandomBytes } from "@/lib/remito-identifiers"
import { ApiError } from "@/lib/api/errors"

const LOCATOR_CONSTRAINT = "pk_remito_scan_locator_locator"
const MAX_EXECUTIONS = 8

export type RemitoIssuanceDependencies = {
  keyring: RemitoTokenKeyring
  randomBytes?: (size: number) => Uint8Array
  randomId?: () => string
  now?: () => Date
  sleep?: (milliseconds: number) => Promise<void>
}

export type SurgicalSqlstate = "55P03" | "40P01" | "40001"
const SURGICAL_RETRY_DELAYS = [25, 100] as const
class SurgicalRemitoConflictError extends ApiError {
  readonly attemptCount = 3
  constructor() { super(409, "C14_INSERT_CONFLICT", "Surgical Remito issuance retry exhausted") }
}
export function surgicalSqlstate(error: unknown): SurgicalSqlstate | null {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : null
  const meta = record?.meta && typeof record.meta === "object" ? record.meta as Record<string, unknown> : null
  const cause = record?.cause && typeof record.cause === "object" ? record.cause as Record<string, unknown> : null
  const candidates = [record?.sqlstate, record?.sqlState, meta?.sqlstate, meta?.sqlState, meta?.code, cause?.code]
  return candidates.find((value): value is SurgicalSqlstate => value === "55P03" || value === "40P01" || value === "40001") ?? null
}

export async function runSurgicalRemitoIssuanceTransaction<T>(
  execute: (attempt: number) => Promise<T>,
  lifecycle: {
    sleep?: (milliseconds: number) => Promise<void>
    onAttemptStart?: (attempt: number) => Promise<void>
    onAttemptFailed?: (attempt: number, error: unknown, sqlstate: SurgicalSqlstate | null, willRetry: boolean, retryExhausted: boolean) => Promise<void>
  } = {},
): Promise<T> {
  const sleep = lifecycle.sleep ?? ((milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds)))
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await lifecycle.onAttemptStart?.(attempt)
    try { return await execute(attempt) } catch (error) {
      const sqlstate = surgicalSqlstate(error)
      const willRetry = sqlstate !== null && attempt < 3
      await lifecycle.onAttemptFailed?.(attempt, error, sqlstate, willRetry, sqlstate !== null && attempt === 3)
      if (sqlstate !== null && attempt === 3) throw new SurgicalRemitoConflictError()
      if (!willRetry) throw error
      await sleep(SURGICAL_RETRY_DELAYS[attempt - 1])
    }
  }
  throw new Error("Surgical Remito issuance exceeded the three-attempt retry ceiling")
}

function isKnownError(error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

function isLocatorCollision(error: unknown): boolean {
  if (!isKnownError(error, "P2002")) return false
  const metadata = error.meta as Record<string, unknown> | undefined
  if (metadata === undefined) return false
  const namedConstraints = [metadata.target, metadata.constraint, metadata.constraint_name]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === "string")
  return namedConstraints.length === 1 && namedConstraints[0] === LOCATOR_CONSTRAINT
}

export async function runRemitoIssuanceTransaction<T>(
  execute: (attempt: number) => Promise<T>,
  lifecycle?: {
    maxExecutions?: number
    onAttemptStart?: (attempt: number) => Promise<void>
    onAttemptFailed?: (attempt: number, error: unknown, willRetry: boolean, retryExhausted: boolean) => Promise<void>
  },
): Promise<T> {
  let serializationAttempts = 1
  let locatorRetries = 0

  const maxExecutions = lifecycle?.maxExecutions ?? MAX_EXECUTIONS
  for (let executions = 1; executions <= maxExecutions; executions += 1) {
    await lifecycle?.onAttemptStart?.(executions)
    try {
      return await execute(executions)
    } catch (error) {
      const serializationCandidate = isKnownError(error, "P2034")
      const locatorCandidate = isLocatorCollision(error)
      const serializationRetry = serializationCandidate && serializationAttempts < 3
      const locatorRetry = locatorCandidate && locatorRetries < 5
      const retryable = serializationRetry || locatorRetry
      const willRetry = retryable && executions < maxExecutions
      await lifecycle?.onAttemptFailed?.(executions, error, willRetry, !willRetry && (serializationCandidate || locatorCandidate))
      if (willRetry && serializationRetry) {
        serializationAttempts += 1
        continue
      }
      if (willRetry && locatorRetry) {
        locatorRetries += 1
        continue
      }
      throw error
    }
  }

  throw new Error("Remito issuance exceeded the eight-execution retry ceiling")
}

type IssuedRemito = {
  id: string
  companyId: string
  documentType: string
  visibleNumber: number | null
  state: string
  issuedAt: Date | null
}

export async function persistRemitoIssuanceVerification(input: {
  tx: Prisma.TransactionClient
  remito: IssuedRemito
  actorId: string
  dependencies: RemitoIssuanceDependencies
}): Promise<void> {
  const bytes = input.dependencies.randomBytes ?? randomBytes
  const id = input.dependencies.randomId ?? randomUUID
  const clock = input.dependencies.now ?? (() => new Date())
  if (input.remito.issuedAt === null) throw new Error("Issued Remito requires issuedAt")
  const issuedAt = input.remito.issuedAt
  const publishedAt = clock()
  const createdAt = clock()
  const locator = createRemitoLocatorFromRandomBytes(bytes(10))
  const nonce = Buffer.from(bytes(32)).toString("base64url")
  const tokenKeyVersion = input.dependencies.keyring.activeTokenKeyVersion
  const token = deriveRemitoPublicToken(input.dependencies.keyring, tokenKeyVersion, nonce)
  const publicationId = id()
  const accessId = id()
  const company = await input.tx.company.findUnique({
    where: { id: input.remito.companyId },
    select: { name: true, taxId: true },
  })
  if (!company?.taxId) throw new Error("Remito issuer requires a valid taxId")
  const fingerprint = createRemitoFingerprint({
    issuerDisplayName: company.name,
    issuerTaxId: company.taxId,
    documentType: input.remito.documentType,
    issuedAt,
    remitoShortCode: locator,
    verificationVersion: 1,
  })

  await input.tx.remitoScanLocator.create({ data: {
    locator, companyId: input.remito.companyId, remitoId: input.remito.id, version: 1, issuedAt, createdAt,
  } })
  await input.tx.remitoVerificationPublication.create({ data: {
    id: publicationId, companyId: input.remito.companyId, remitoId: input.remito.id,
    version: 1, status: "current", currentSlot: 1,
    issuerDisplayNameSnapshot: company.name, issuerTaxIdSnapshot: company.taxId,
    documentTypeSnapshot: input.remito.documentType,
    issuedDateSnapshot: new Date(`${issuedAt.toISOString().slice(0, 10)}T00:00:00.000Z`),
    remitoShortCodeSnapshot: locator, fingerprintVersion: "RF1",
    fingerprintSha256: fingerprint.hash, publishedAt, createdAt,
  } })
  await input.tx.remitoVerificationAccess.create({ data: {
    id: accessId, companyId: input.remito.companyId, remitoId: input.remito.id,
    publicationId, version: 1, status: "current", currentSlot: 1,
    tokenNonce: nonce, tokenKeyVersion, tokenHash: hashRemitoPublicToken(token), issuedAt, createdAt,
  } })
  await input.tx.auditEvent.create({ data: {
    companyId: input.remito.companyId, userId: input.actorId, entityType: "Remito",
    entityId: input.remito.id, action: "remito.issued", module: "remito",
    oldValue: { state: "Borrador" },
    newValue: { state: input.remito.state, visibleNumber: input.remito.visibleNumber,
      publicationId, accessId, issuedAt: issuedAt.toISOString() },
    metadata: { fingerprintVersion: "RF1", verificationVersion: 1, publishedAt: publishedAt.toISOString() },
  } })
}
