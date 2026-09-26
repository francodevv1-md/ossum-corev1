import { randomUUID } from "node:crypto"
import { badRequest, forbidden, notFound } from "@/lib/api/errors"
import { createRemitoFingerprint } from "@/lib/remito-verification/fingerprint"
import { recordPublicVerificationMetric } from "@/lib/remito-verification/metrics"
import {
  generateRemitoPublicToken, hashRemitoPublicToken, timingSafeRemitoTokenHashMatches,
  type RemitoTokenKeyring,
} from "@/lib/remito-verification/token"

export type PublicRemitoVerificationDto = {
  verificationStatus: "valid" | "invalid" | "revoked" | "replaced"
  issuerDisplayName: string | null
  issuerTaxId: string | null
  documentType: string | null
  issuedDate: string | null
  remitoShortCode: string | null
  verificationVersion: number | null
  fingerprint: string | null
  checkedAt: string
}

type AccessRow = {
  id: string; companyId: string; publicationId: string; version: number; status: string; tokenHash: string
  publication: PublicationRow
}
type PublicationRow = {
  id: string; version: number; status: string; issuerDisplayNameSnapshot: string
  issuerTaxIdSnapshot: string; documentTypeSnapshot: string; issuedDateSnapshot: Date
  remitoShortCodeSnapshot: string; fingerprintVersion: string; fingerprintSha256: string
  accesses?: AccessRow[]
}
type ReaderDb = {
  remitoVerificationAccess: { findUnique(input: unknown): Promise<AccessRow | null> }
  remitoVerificationDailyMetric: { upsert(input: unknown): Promise<unknown> }
}
type Db = ReaderDb & {
  remitoVerificationAccess: ReaderDb["remitoVerificationAccess"] & { update(input: unknown): Promise<unknown>; create(input: unknown): Promise<unknown> }
  remitoVerificationPublication: { findFirst(input: unknown): Promise<PublicationRow | null> }
  remitoScanLocator: { findFirst(input: unknown): Promise<{ remitoId: string } | null> }
  auditEvent: { create(input: unknown): Promise<unknown> }
  $transaction<T>(callback: (tx: Db) => Promise<T>): Promise<T>
}
export type RemitoVerificationDependencies = {
  prisma: Db
  keyring: RemitoTokenKeyring
  internalOrigin: URL
  publicOrigin: URL
  now?: () => Date
  randomId?: () => string
}
export type PublicVerificationDependencies = { prisma: ReaderDb; now?: () => Date }

// globalThis-backed so instrumentation.ts (separate module graph in dev) shares
// state with route handlers. See activation.ts for the same pattern.
const globalForRemitoVerification = globalThis as unknown as {
  __remitoVerificationRuntime?: RemitoVerificationDependencies | null
}
export function installRemitoVerificationRuntime(deps: RemitoVerificationDependencies): void {
  assertOrigin(deps.internalOrigin); assertOrigin(deps.publicOrigin)
  globalForRemitoVerification.__remitoVerificationRuntime = deps
}
export function getRemitoVerificationRuntime(): RemitoVerificationDependencies {
  const rt = globalForRemitoVerification.__remitoVerificationRuntime
  if (!rt) throw new Error("Remito verification runtime is not configured")
  return rt
}
function assertOrigin(origin: URL): void {
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Remito verification origins must be origin-only URLs")
  }
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
    throw new Error("Remito verification origins must use HTTPS")
  }
}
export function requireConfiguredOrigin(request: Request, configuredOrigin: URL): void {
  const supplied = request.headers.get("origin")
  if (!supplied || supplied !== configuredOrigin.origin) {
    throw forbidden("Verification lifecycle origin denied", "verification_lifecycle_origin_denied")
  }
}
const invalid = (checkedAt: Date): PublicRemitoVerificationDto => ({
  verificationStatus: "invalid", issuerDisplayName: null, issuerTaxId: null,
  documentType: null, issuedDate: null, remitoShortCode: null,
  verificationVersion: null, fingerprint: null, checkedAt: checkedAt.toISOString(),
})

export async function verifyPublicRemitoToken(
  deps: PublicVerificationDependencies,
  token: string,
): Promise<PublicRemitoVerificationDto> {
  const checkedAt = (deps.now ?? (() => new Date()))()
  let tokenHash: string | null = null
  try { tokenHash = hashRemitoPublicToken(token) } catch { /* uniform invalid path */ }
  const access = tokenHash ? await deps.prisma.remitoVerificationAccess.findUnique({
    where: { tokenHash }, include: { publication: true },
  }) : null
  if (!timingSafeRemitoTokenHashMatches(token, access?.tokenHash ?? null) || !access) return invalid(checkedAt)
  const publication = access.publication
  const expected = createRemitoFingerprint({
    issuerDisplayName: publication.issuerDisplayNameSnapshot,
    issuerTaxId: publication.issuerTaxIdSnapshot,
    documentType: publication.documentTypeSnapshot,
    issuedAt: publication.issuedDateSnapshot,
    remitoShortCode: publication.remitoShortCodeSnapshot,
    verificationVersion: publication.version,
  })
  if (publication.fingerprintVersion !== "RF1" || expected.hash !== publication.fingerprintSha256) {
    return invalid(checkedAt)
  }
  const status = access.status === "revoked" ? "revoked"
    : access.status === "replaced" || publication.status === "replaced" ? "replaced"
    : access.status === "current" && publication.status === "current" ? "valid" : "invalid"
  if (status === "invalid") return invalid(checkedAt)
  await recordPublicVerificationMetric(deps.prisma, { companyId: access.companyId, checkedAt, result: status })
  return {
    verificationStatus: status, issuerDisplayName: publication.issuerDisplayNameSnapshot,
    issuerTaxId: publication.issuerTaxIdSnapshot, documentType: publication.documentTypeSnapshot,
    issuedDate: publication.issuedDateSnapshot.toISOString().slice(0, 10),
    remitoShortCode: publication.remitoShortCodeSnapshot, verificationVersion: publication.version,
    fingerprint: `sha256:${publication.fingerprintSha256}`, checkedAt: checkedAt.toISOString(),
  }
}

const VERIFICATION_LIFECYCLE_ROLES = ["admin", "coordinador", "coordinator"] as const
function requireLifecycleRole(role: string): void {
  if (!(VERIFICATION_LIFECYCLE_ROLES as readonly string[]).includes(role)) {
    throw forbidden("Verification lifecycle access denied", "verification_lifecycle_access_denied")
  }
}
async function currentContext(tx: Db, companyId: string, remitoShortCode: string) {
  const locator = await tx.remitoScanLocator.findFirst({ where: { companyId, locator: remitoShortCode },
    select: { remitoId: true } })
  if (!locator) throw notFound("Remito verification unavailable", "remito_verification_unavailable")
  const publication = await tx.remitoVerificationPublication.findFirst({
    where: { companyId, remitoId: locator.remitoId, status: "current", currentSlot: 1 },
    include: { accesses: { where: { status: "current", currentSlot: 1 }, take: 1 } },
  })
  if (!publication?.accesses?.[0]) throw notFound("Remito verification unavailable", "remito_verification_unavailable")
  return { locator, publication, access: publication.accesses[0] }
}

export async function rotateRemitoVerification(deps: RemitoVerificationDependencies, input: {
  companyId: string; remitoShortCode: string; actorId: string; role: string
}): Promise<{ verificationVersion: number }> {
  requireLifecycleRole(input.role); assertOrigin(deps.internalOrigin); assertOrigin(deps.publicOrigin)
  return deps.prisma.$transaction(async (tx: Db) => {
    const { locator, publication, access } = await currentContext(tx, input.companyId, input.remitoShortCode)
    const generated = generateRemitoPublicToken(deps.keyring), now = (deps.now ?? (() => new Date()))()
    const nextId = (deps.randomId ?? randomUUID)(), version = access.version + 1
    await tx.remitoVerificationAccess.update({ where: { id: access.id }, data: {
      status: "replaced", currentSlot: null, replacedAt: now, supersededByAccessId: nextId,
    } })
    await tx.remitoVerificationAccess.create({ data: {
      id: nextId, companyId: input.companyId, remitoId: locator.remitoId,
      publicationId: publication.id, version, status: "current", currentSlot: 1,
      tokenNonce: generated.nonce, tokenKeyVersion: generated.tokenKeyVersion,
      tokenHash: generated.tokenHash, issuedAt: now, createdAt: now,
    } })
    await tx.auditEvent.create({ data: { companyId: input.companyId, userId: input.actorId,
      entityType: "Remito", entityId: locator.remitoId, action: "remito.verification.rotated",
      module: "remito", metadata: { verificationVersion: version } } })
    return { verificationVersion: version }
  })
}

export async function revokeRemitoVerification(deps: RemitoVerificationDependencies, input: {
  companyId: string; remitoShortCode: string; actorId: string; role: string; reason: string
}): Promise<{ verificationStatus: "revoked" }> {
  requireLifecycleRole(input.role)
  const reason = input.reason.trim()
  if (!reason || reason.length > 500) {
    throw badRequest("Revocation reason must contain 1 through 500 characters", "invalid_revocation_reason")
  }
  return deps.prisma.$transaction(async (tx: Db) => {
    const { locator, access } = await currentContext(tx, input.companyId, input.remitoShortCode)
    const now = (deps.now ?? (() => new Date()))()
    await tx.remitoVerificationAccess.update({ where: { id: access.id }, data: {
      status: "revoked", currentSlot: null, revokedAt: now,
    } })
    await tx.auditEvent.create({ data: { companyId: input.companyId, userId: input.actorId,
      entityType: "Remito", entityId: locator.remitoId, action: "remito.verification.revoked",
      module: "remito", detail: reason, metadata: { verificationVersion: access.version } } })
    return { verificationStatus: "revoked" }
  })
}
