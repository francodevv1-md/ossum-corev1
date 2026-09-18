import type { PrismaDigitalReceiptEventRepository } from "./repositories/events.repository"
import type {
  DigitalReceiptActorRef,
  DigitalReceiptArtifactType,
  DigitalReceiptAuditMetadata,
  DigitalReceiptEvent,
  DigitalReceiptEventType,
} from "./types"

export const DIGITAL_RECEIPT_TIMELINE_ACTIONS = {
  draftCreated: "draft_created",
  issued: "issued",
  receiptRevoked: "receipt_revoked",
  accessReissued: "access_reissued",
  accessRevoked: "access_revoked",
  snapshotCreated: "snapshot_created",
  artifactRegistered: "artifact_registered",
} as const

export type DigitalReceiptTimelineAction =
  (typeof DIGITAL_RECEIPT_TIMELINE_ACTIONS)[keyof typeof DIGITAL_RECEIPT_TIMELINE_ACTIONS]

type TimelineRecorderDependencies = Pick<PrismaDigitalReceiptEventRepository, "create">

type DigitalReceiptTimelineBaseInput = {
  receiptId: string
  companyId: string
  surgeryId: string
  receiptNumber?: string
  actor?: DigitalReceiptActorRef
  happenedAt: string
  metadata?: DigitalReceiptAuditMetadata
}

type DraftCreatedInput = DigitalReceiptTimelineBaseInput

type IssuedInput = DigitalReceiptTimelineBaseInput & {
  snapshotId?: string
  accessId?: string
}

type AccessReissuedInput = DigitalReceiptTimelineBaseInput & {
  accessId: string
  accessVersion: number
  signerRole: string
  previousAccessId?: string
  channel?: string
  recipientEmail?: string
  recipientPhone?: string
  tokenLastFour?: string
}

type AccessRevokedInput = DigitalReceiptTimelineBaseInput & {
  accessId: string
  reason?: string
  previousStatus?: string
}

type ReceiptRevokedInput = DigitalReceiptTimelineBaseInput & {
  reason?: string
  previousStatus?: string
}

type SnapshotCreatedInput = DigitalReceiptTimelineBaseInput & {
  snapshotId: string
  snapshotVersion: number
  checksum?: string
}

type ArtifactRegisteredInput = DigitalReceiptTimelineBaseInput & {
  artifactId: string
  artifactType: DigitalReceiptArtifactType
  snapshotId?: string
  accessId?: string
  fileName?: string
  mimeType?: string
  checksum?: string
  storageKey?: string
}

type TimelineEventRecordInput = {
  receiptId: string
  accessId?: string
  snapshotId?: string
  artifactId?: string
  type: DigitalReceiptEventType
  happenedAt: string
  actor?: DigitalReceiptActorRef
  detail: string
  metadata: DigitalReceiptAuditMetadata
}

const SENSITIVE_METADATA_KEYS = new Set([
  "token",
  "accessToken",
  "tokenHash",
  "signedUrl",
  "signatureData",
  "secret",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function maskEmail(value: string): string {
  const [localPart, domainPart] = value.split("@")
  if (!localPart || !domainPart) {
    return "[redacted]"
  }

  return `${localPart.slice(0, 2)}***@${domainPart}`
}

function maskPhone(value: string): string {
  const trimmedValue = value.trim()
  const visibleSuffix = trimmedValue.slice(-4)
  return visibleSuffix ? `***${visibleSuffix}` : "[redacted]"
}

function sanitizeMetadataValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadataValue)
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => {
        if (SENSITIVE_METADATA_KEYS.has(key)) {
          return [key, "[redacted]"]
        }

        if (key === "recipientEmail" && typeof entryValue === "string") {
          return [key, maskEmail(entryValue)]
        }

        if (key === "recipientPhone" && typeof entryValue === "string") {
          return [key, maskPhone(entryValue)]
        }

        return [key, sanitizeMetadataValue(entryValue)]
      })
    )
  }

  return value
}

function compactMetadata(metadata: Record<string, unknown>): DigitalReceiptAuditMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  )
}

function buildBaseMetadata(input: DigitalReceiptTimelineBaseInput, action: DigitalReceiptTimelineAction) {
  return compactMetadata({
    action,
    companyId: input.companyId,
    surgeryId: input.surgeryId,
    receiptNumber: input.receiptNumber,
    actorRole: input.actor?.actorRole,
    actorDisplayName: input.actor?.actorDisplayName,
    ...(isRecord(input.metadata) ? (sanitizeMetadataValue(input.metadata) as Record<string, unknown>) : {}),
  })
}

function buildEventRecord(input: TimelineEventRecordInput): TimelineEventRecordInput {
  return {
    ...input,
    metadata: compactMetadata(input.metadata),
  }
}

function createDraftCreatedRecord(input: DraftCreatedInput): TimelineEventRecordInput {
  return buildEventRecord({
    receiptId: input.receiptId,
    type: "created",
    happenedAt: input.happenedAt,
    actor: input.actor,
    detail: `Digital receipt ${input.receiptNumber ?? input.receiptId} draft created`,
    metadata: buildBaseMetadata(input, DIGITAL_RECEIPT_TIMELINE_ACTIONS.draftCreated),
  })
}

function createIssuedRecord(input: IssuedInput): TimelineEventRecordInput {
  return buildEventRecord({
    receiptId: input.receiptId,
    accessId: input.accessId,
    snapshotId: input.snapshotId,
    type: "issued",
    happenedAt: input.happenedAt,
    actor: input.actor,
    detail: `Digital receipt ${input.receiptNumber ?? input.receiptId} issued`,
    metadata: buildBaseMetadata(input, DIGITAL_RECEIPT_TIMELINE_ACTIONS.issued),
  })
}

function createAccessReissuedRecord(input: AccessReissuedInput): TimelineEventRecordInput {
  return buildEventRecord({
    receiptId: input.receiptId,
    accessId: input.accessId,
    type: "access_created",
    happenedAt: input.happenedAt,
    actor: input.actor,
    detail: `Digital receipt access ${input.accessId} reissued`,
    metadata: {
      ...buildBaseMetadata(input, DIGITAL_RECEIPT_TIMELINE_ACTIONS.accessReissued),
      accessVersion: input.accessVersion,
      signerRole: input.signerRole,
      previousAccessId: input.previousAccessId,
      channel: input.channel,
      recipientEmail: input.recipientEmail ? maskEmail(input.recipientEmail) : undefined,
      recipientPhone: input.recipientPhone ? maskPhone(input.recipientPhone) : undefined,
      tokenLastFour: input.tokenLastFour,
    },
  })
}

function createAccessRevokedRecord(input: AccessRevokedInput): TimelineEventRecordInput {
  return buildEventRecord({
    receiptId: input.receiptId,
    accessId: input.accessId,
    type: "revoked",
    happenedAt: input.happenedAt,
    actor: input.actor,
    detail: `Digital receipt access ${input.accessId} revoked`,
    metadata: {
      ...buildBaseMetadata(input, DIGITAL_RECEIPT_TIMELINE_ACTIONS.accessRevoked),
      reason: input.reason,
      previousStatus: input.previousStatus,
    },
  })
}

function createReceiptRevokedRecord(input: ReceiptRevokedInput): TimelineEventRecordInput {
  return buildEventRecord({
    receiptId: input.receiptId,
    type: "revoked",
    happenedAt: input.happenedAt,
    actor: input.actor,
    detail: `Digital receipt ${input.receiptNumber ?? input.receiptId} revoked`,
    metadata: {
      ...buildBaseMetadata(input, DIGITAL_RECEIPT_TIMELINE_ACTIONS.receiptRevoked),
      reason: input.reason,
      previousStatus: input.previousStatus,
    },
  })
}

function createSnapshotCreatedRecord(input: SnapshotCreatedInput): TimelineEventRecordInput {
  return buildEventRecord({
    receiptId: input.receiptId,
    snapshotId: input.snapshotId,
    type: "snapshot_created",
    happenedAt: input.happenedAt,
    actor: input.actor,
    detail: `Digital receipt snapshot ${input.snapshotId} created`,
    metadata: {
      ...buildBaseMetadata(input, DIGITAL_RECEIPT_TIMELINE_ACTIONS.snapshotCreated),
      snapshotVersion: input.snapshotVersion,
      checksum: input.checksum,
    },
  })
}

function createArtifactRegisteredRecord(input: ArtifactRegisteredInput): TimelineEventRecordInput {
  return buildEventRecord({
    receiptId: input.receiptId,
    accessId: input.accessId,
    snapshotId: input.snapshotId,
    artifactId: input.artifactId,
    type: "artifact_created",
    happenedAt: input.happenedAt,
    actor: input.actor,
    detail: `Digital receipt artifact ${input.artifactId} registered`,
    metadata: {
      ...buildBaseMetadata(input, DIGITAL_RECEIPT_TIMELINE_ACTIONS.artifactRegistered),
      artifactType: input.artifactType,
      fileName: input.fileName,
      mimeType: input.mimeType,
      checksum: input.checksum,
      hasStorageKey: Boolean(input.storageKey),
    },
  })
}

async function persistTimelineEvent(
  repository: TimelineRecorderDependencies,
  input: TimelineEventRecordInput
): Promise<DigitalReceiptEvent> {
  return repository.create(input)
}

export function createDigitalReceiptTimelineRecorder(repository: TimelineRecorderDependencies) {
  return {
    recordDraftCreated(input: DraftCreatedInput) {
      return persistTimelineEvent(repository, createDraftCreatedRecord(input))
    },
    recordIssued(input: IssuedInput) {
      return persistTimelineEvent(repository, createIssuedRecord(input))
    },
    recordAccessReissued(input: AccessReissuedInput) {
      return persistTimelineEvent(repository, createAccessReissuedRecord(input))
    },
    recordAccessRevoked(input: AccessRevokedInput) {
      return persistTimelineEvent(repository, createAccessRevokedRecord(input))
    },
    recordReceiptRevoked(input: ReceiptRevokedInput) {
      return persistTimelineEvent(repository, createReceiptRevokedRecord(input))
    },
    recordSnapshotCreated(input: SnapshotCreatedInput) {
      return persistTimelineEvent(repository, createSnapshotCreatedRecord(input))
    },
    recordArtifactRegistered(input: ArtifactRegisteredInput) {
      return persistTimelineEvent(repository, createArtifactRegisteredRecord(input))
    },
  }
}

export function sanitizeDigitalReceiptEventMetadata(
  metadata: DigitalReceiptAuditMetadata | undefined
): DigitalReceiptAuditMetadata | undefined {
  if (!isRecord(metadata)) {
    return undefined
  }

  return sanitizeMetadataValue(metadata) as DigitalReceiptAuditMetadata
}
