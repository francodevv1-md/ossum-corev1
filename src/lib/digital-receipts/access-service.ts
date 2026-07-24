import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"

import { createDigitalReceiptDomainError } from "./errors"
import type {
  DigitalReceiptAccess,
  DigitalReceiptAccessStatus,
  DigitalReceiptAuditMetadata,
  DigitalReceiptDeliveryChannel,
  DigitalReceiptSignerRole,
} from "./types"

export const DIGITAL_RECEIPT_ACCESS_TOKEN_BYTES = 24
export const DIGITAL_RECEIPT_ACCESS_TOKEN_HASH_ALGORITHM = "sha256"
export const DIGITAL_RECEIPT_ACCESS_DEFAULT_TTL_MINUTES = 60 * 24 * 3

export type DigitalReceiptAccessDraft = Pick<
  DigitalReceiptAccess,
  | "accessId"
  | "receiptId"
  | "version"
  | "status"
  | "tokenHash"
  | "tokenLastFour"
  | "channel"
  | "recipientEmail"
  | "recipientPhone"
  | "signerRole"
  | "signerId"
  | "issuedAt"
  | "activatedAt"
  | "expiredAt"
  | "metadata"
>

export type DigitalReceiptAccessReceiptPatch = {
  latestAccessVersion: number
  activeAccessId?: string
}

export type DigitalReceiptAccessTransitionPatch = {
  accessId: string
  status: DigitalReceiptAccessStatus
  firstOpenedAt?: string
  lastOpenedAt?: string
  consumedAt?: string
  expiredAt?: string
  revokedAt?: string
  supersededByAccessId?: string
  metadata?: DigitalReceiptAuditMetadata
}

export type DigitalReceiptAccessIssueInput = {
  receiptId: string
  accesses?: DigitalReceiptAccess[]
  signerRole: DigitalReceiptSignerRole
  signerId?: string
  expiresAt?: string
  ttlMinutes?: number
  channel?: DigitalReceiptDeliveryChannel
  recipientEmail?: string
  recipientPhone?: string
  metadata?: DigitalReceiptAuditMetadata
  nowIso?: string
  accessId?: string
}

export type DigitalReceiptAccessIssueResult = {
  token: string
  tokenLastFour: string
  draft: DigitalReceiptAccessDraft
  receiptPatch: DigitalReceiptAccessReceiptPatch
  deactivatedAccesses: DigitalReceiptAccessTransitionPatch[]
}

export type DigitalReceiptAccessTransitionInput = {
  access: DigitalReceiptAccess
  nowIso?: string
  metadata?: DigitalReceiptAuditMetadata
}

export type SafeDigitalReceiptAccess = Omit<DigitalReceiptAccess, "tokenHash">

function normalizeString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : undefined
}

function normalizeIsoString(value: string | undefined, fieldName: string): string | undefined {
  const normalizedValue = normalizeString(value)
  if (!normalizedValue) {
    return undefined
  }

  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO date`)
  }

  return date.toISOString()
}

function normalizeTtlMinutes(ttlMinutes: number | undefined): number {
  if (ttlMinutes === undefined) {
    return DIGITAL_RECEIPT_ACCESS_DEFAULT_TTL_MINUTES
  }

  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
    throw new Error("ttlMinutes must be a positive finite number")
  }

  return Math.floor(ttlMinutes)
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T
}

function mergeMetadata(
  baseMetadata: DigitalReceiptAuditMetadata | undefined,
  nextMetadata: DigitalReceiptAuditMetadata | undefined
): DigitalReceiptAuditMetadata | undefined {
  if (!baseMetadata && !nextMetadata) {
    return undefined
  }

  return {
    ...(baseMetadata ?? {}),
    ...(nextMetadata ?? {}),
  }
}

function resolveTransitionTime(nowIso: string | undefined): string {
  return normalizeIsoString(nowIso, "nowIso") ?? new Date().toISOString()
}

function isAccessEffectivelyExpired(access: DigitalReceiptAccess, nowIso: string): boolean {
  return Boolean(access.expiredAt && new Date(access.expiredAt).getTime() <= new Date(nowIso).getTime())
}

function getCurrentlyActiveAccesses(
  accesses: readonly DigitalReceiptAccess[],
  nowIso: string
): DigitalReceiptAccess[] {
  return accesses.filter(
    (access) => access.status === "active" && !isAccessEffectivelyExpired(access, nowIso)
  )
}

function getNextAccessVersion(accesses: readonly DigitalReceiptAccess[]): number {
  return accesses.reduce((maxVersion, access) => Math.max(maxVersion, access.version), 0) + 1
}

function assertTransitionable(
  access: DigitalReceiptAccess,
  disallowedStatuses: DigitalReceiptAccessStatus[],
  nextStatus: DigitalReceiptAccessStatus
) {
  if (disallowedStatuses.includes(access.status)) {
    throw createDigitalReceiptDomainError(
      "digital_receipt_invalid_status_transition",
      `Cannot transition digital receipt access from ${access.status} to ${nextStatus}`,
      {
        accessId: access.accessId,
        receiptId: access.receiptId,
        currentStatus: access.status,
        nextStatus,
      }
    )
  }
}

function buildTokenLastFour(token: string): string {
  return token.slice(-4)
}

export function generateDigitalReceiptAccessToken(byteLength = DIGITAL_RECEIPT_ACCESS_TOKEN_BYTES): string {
  if (!Number.isInteger(byteLength) || byteLength <= 0) {
    throw new Error("byteLength must be a positive integer")
  }

  return randomBytes(byteLength).toString("hex")
}

export function hashDigitalReceiptAccessToken(token: string): string {
  const normalizedToken = normalizeString(token)
  if (!normalizedToken) {
    throw new Error("token is required")
  }

  return createHash(DIGITAL_RECEIPT_ACCESS_TOKEN_HASH_ALGORITHM)
    .update(normalizedToken)
    .digest("hex")
}

export function verifyDigitalReceiptAccessToken(token: string, tokenHash: string): boolean {
  const normalizedHash = normalizeString(tokenHash)
  if (!normalizedHash) {
    return false
  }

  const receivedHash = hashDigitalReceiptAccessToken(token)

  return timingSafeEqual(Buffer.from(receivedHash, "hex"), Buffer.from(normalizedHash, "hex"))
}

export function normalizeDigitalReceiptAccessExpiry(input: {
  issuedAt?: string
  expiresAt?: string
  ttlMinutes?: number
}): string {
  const issuedAt = normalizeIsoString(input.issuedAt, "issuedAt") ?? new Date().toISOString()
  const explicitExpiresAt = normalizeIsoString(input.expiresAt, "expiresAt")

  if (explicitExpiresAt) {
    if (new Date(explicitExpiresAt).getTime() <= new Date(issuedAt).getTime()) {
      throw new Error("expiresAt must be after issuedAt")
    }

    return explicitExpiresAt
  }

  const ttlMinutes = normalizeTtlMinutes(input.ttlMinutes)
  return new Date(new Date(issuedAt).getTime() + ttlMinutes * 60_000).toISOString()
}

export function getDigitalReceiptAccessTokenLastFour(token: string): string {
  const normalizedToken = normalizeString(token)
  if (!normalizedToken) {
    throw new Error("token is required")
  }

  return buildTokenLastFour(normalizedToken)
}

export function toSafeDigitalReceiptAccess(access: DigitalReceiptAccess): SafeDigitalReceiptAccess {
  const { tokenHash: _tokenHash, ...safeAccess } = access
  return safeAccess
}

export function issueDigitalReceiptAccessDraft(
  input: DigitalReceiptAccessIssueInput
): DigitalReceiptAccessIssueResult {
  const receiptId = normalizeString(input.receiptId)
  if (!receiptId) {
    throw new Error("receiptId is required")
  }

  const signerId = normalizeString(input.signerId)
  const recipientEmail = normalizeString(input.recipientEmail)
  const recipientPhone = normalizeString(input.recipientPhone)
  const issuedAt = resolveTransitionTime(input.nowIso)
  const expiresAt = normalizeDigitalReceiptAccessExpiry({
    issuedAt,
    expiresAt: input.expiresAt,
    ttlMinutes: input.ttlMinutes,
  })
  const existingAccesses = input.accesses ?? []
  const activeAccesses = getCurrentlyActiveAccesses(existingAccesses, issuedAt)

  if (activeAccesses.length > 1) {
    throw createDigitalReceiptDomainError(
      "digital_receipt_invalid_status_transition",
      "Digital receipt access lifecycle is inconsistent: multiple active versions found",
      {
        receiptId,
        activeAccessIds: activeAccesses.map((access) => access.accessId),
      }
    )
  }

  const token = generateDigitalReceiptAccessToken()
  const tokenLastFour = buildTokenLastFour(token)
  const accessId = normalizeString(input.accessId) ?? randomUUID()
  const version = getNextAccessVersion(existingAccesses)
  const activeAccess = activeAccesses[0]

  const deactivatedAccesses: DigitalReceiptAccessTransitionPatch[] = existingAccesses
    .filter((access) => access.status === "active" && isAccessEffectivelyExpired(access, issuedAt))
    .map((access) => ({
      accessId: access.accessId,
      status: "expired",
      expiredAt: access.expiredAt ?? issuedAt,
    }))

  if (activeAccess) {
    deactivatedAccesses.push({
      accessId: activeAccess.accessId,
      status: "revoked",
      revokedAt: issuedAt,
      supersededByAccessId: accessId,
      metadata: mergeMetadata(activeAccess.metadata, {
        lifecycle: "superseded",
      }),
    })
  }

  return {
    token,
    tokenLastFour,
    draft: compactObject({
      accessId,
      receiptId,
      version,
      status: "active",
      tokenHash: hashDigitalReceiptAccessToken(token),
      tokenLastFour,
      channel: input.channel,
      recipientEmail,
      recipientPhone,
      signerRole: input.signerRole,
      signerId,
      issuedAt,
      activatedAt: issuedAt,
      expiredAt: expiresAt,
      metadata: input.metadata,
    }) as DigitalReceiptAccessDraft,
    receiptPatch: {
      latestAccessVersion: version,
      activeAccessId: accessId,
    },
    deactivatedAccesses,
  }
}

export function reissueDigitalReceiptAccessDraft(
  input: DigitalReceiptAccessIssueInput
): DigitalReceiptAccessIssueResult {
  return issueDigitalReceiptAccessDraft(input)
}

export function revokeDigitalReceiptAccess(
  input: DigitalReceiptAccessTransitionInput
): {
  patch: DigitalReceiptAccessTransitionPatch
  receiptPatch: DigitalReceiptAccessReceiptPatch
} {
  assertTransitionable(input.access, ["consumed", "revoked", "expired"], "revoked")

  const revokedAt = resolveTransitionTime(input.nowIso)

  return {
    patch: {
      accessId: input.access.accessId,
      status: "revoked",
      revokedAt,
      metadata: mergeMetadata(input.access.metadata, input.metadata),
    },
    receiptPatch: {
      latestAccessVersion: input.access.version,
      activeAccessId: undefined,
    },
  }
}

export function expireDigitalReceiptAccess(
  input: DigitalReceiptAccessTransitionInput
): {
  patch: DigitalReceiptAccessTransitionPatch
  receiptPatch: DigitalReceiptAccessReceiptPatch
} {
  assertTransitionable(input.access, ["consumed", "revoked", "expired"], "expired")

  const expiredAt = normalizeIsoString(input.access.expiredAt, "access.expiredAt") ?? resolveTransitionTime(input.nowIso)

  return {
    patch: {
      accessId: input.access.accessId,
      status: "expired",
      expiredAt,
      metadata: mergeMetadata(input.access.metadata, input.metadata),
    },
    receiptPatch: {
      latestAccessVersion: input.access.version,
      activeAccessId: undefined,
    },
  }
}

export function consumeDigitalReceiptAccess(
  input: DigitalReceiptAccessTransitionInput
): {
  patch: DigitalReceiptAccessTransitionPatch
  receiptPatch: DigitalReceiptAccessReceiptPatch
} {
  assertTransitionable(input.access, ["consumed", "revoked", "expired"], "consumed")

  const consumedAt = resolveTransitionTime(input.nowIso)

  return {
    patch: {
      accessId: input.access.accessId,
      status: "consumed",
      consumedAt,
      metadata: mergeMetadata(input.access.metadata, input.metadata),
    },
    receiptPatch: {
      latestAccessVersion: input.access.version,
      activeAccessId: undefined,
    },
  }
}

export function shouldExpireDigitalReceiptAccess(
  access: DigitalReceiptAccess,
  nowIso?: string
): boolean {
  if (access.status !== "active") {
    return false
  }

  const transitionTime = resolveTransitionTime(nowIso)
  return isAccessEffectivelyExpired(access, transitionTime)
}
