import type { AuditPrismaClient } from "@/lib/audit"
import { createAuditEvent } from "@/lib/audit"

import type { DigitalReceiptActorRef, DigitalReceiptArtifactType, DigitalReceiptAuditMetadata } from "./types"
import { sanitizeDigitalReceiptEventMetadata } from "./events"

type DigitalReceiptAuditBaseInput = {
  companyId: string
  surgeryId: string
  receiptId: string
  receiptNumber?: string
  actor?: DigitalReceiptActorRef
  metadata?: DigitalReceiptAuditMetadata
}

type DraftCreatedAuditInput = DigitalReceiptAuditBaseInput

type IssuedAuditInput = DigitalReceiptAuditBaseInput & {
  accessId?: string
  snapshotId?: string
  previousStatus?: string
}

type AccessReissuedAuditInput = DigitalReceiptAuditBaseInput & {
  accessId: string
  accessVersion: number
  signerRole: string
  previousAccessId?: string
  previousStatus?: string
  tokenLastFour?: string
  channel?: string
}

type AccessRevokedAuditInput = DigitalReceiptAuditBaseInput & {
  accessId: string
  reason?: string
  previousStatus?: string
}

type ReceiptRevokedAuditInput = DigitalReceiptAuditBaseInput & {
  reason?: string
  previousStatus?: string
}

type SnapshotCreatedAuditInput = DigitalReceiptAuditBaseInput & {
  snapshotId: string
  snapshotVersion: number
  checksum?: string
}

type ArtifactRegisteredAuditInput = DigitalReceiptAuditBaseInput & {
  artifactId: string
  artifactType: DigitalReceiptArtifactType
  snapshotId?: string
  accessId?: string
  fileName?: string
  mimeType?: string
  checksum?: string
  storageKey?: string
}

function compactRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined))
}

function buildAuditMetadata(input: DigitalReceiptAuditBaseInput, action: string) {
  return compactRecord({
    action,
    surgeryId: input.surgeryId,
    receiptNumber: input.receiptNumber,
    actorRole: input.actor?.actorRole,
    actorDisplayName: input.actor?.actorDisplayName,
    ...((sanitizeDigitalReceiptEventMetadata(input.metadata) as Record<string, unknown> | undefined) ?? {}),
  })
}

async function createReceiptAuditEvent(args: {
  prisma: AuditPrismaClient
  companyId: string
  receiptId: string
  actor?: DigitalReceiptActorRef
  action: string
  detail: string
  oldValue?: unknown
  newValue?: unknown
  metadata?: Record<string, unknown>
}) {
  const actorUserId = args.actor?.actorUserId?.trim()
  if (!actorUserId) {
    return null
  }

  return createAuditEvent({
    prisma: args.prisma,
    companyId: args.companyId,
    userId: actorUserId,
    entityType: "DigitalReceipt",
    entityId: args.receiptId,
    action: args.action,
    module: "digital_receipt",
    detail: args.detail,
    oldValue: args.oldValue,
    newValue: args.newValue,
    metadata: args.metadata,
  })
}

export function createDigitalReceiptTechnicalAuditRecorder(prisma: AuditPrismaClient) {
  return {
    recordDraftCreated(input: DraftCreatedAuditInput) {
      return createReceiptAuditEvent({
        prisma,
        companyId: input.companyId,
        receiptId: input.receiptId,
        actor: input.actor,
        action: "digital_receipt.draft_created",
        detail: `Digital receipt ${input.receiptNumber ?? input.receiptId} draft created`,
        oldValue: null,
        newValue: compactRecord({
          receiptId: input.receiptId,
          receiptNumber: input.receiptNumber,
          status: "draft",
        }),
        metadata: buildAuditMetadata(input, "draft_created"),
      })
    },
    recordIssued(input: IssuedAuditInput) {
      return createReceiptAuditEvent({
        prisma,
        companyId: input.companyId,
        receiptId: input.receiptId,
        actor: input.actor,
        action: "digital_receipt.issued",
        detail: `Digital receipt ${input.receiptNumber ?? input.receiptId} issued`,
        oldValue: compactRecord({
          status: input.previousStatus ?? "draft",
        }),
        newValue: compactRecord({
          status: "issued",
          accessId: input.accessId,
          snapshotId: input.snapshotId,
        }),
        metadata: buildAuditMetadata(input, "issued"),
      })
    },
    recordAccessReissued(input: AccessReissuedAuditInput) {
      return createReceiptAuditEvent({
        prisma,
        companyId: input.companyId,
        receiptId: input.receiptId,
        actor: input.actor,
        action: "digital_receipt.access_reissued",
        detail: `Digital receipt access ${input.accessId} reissued`,
        oldValue: compactRecord({
          accessId: input.previousAccessId,
          status: input.previousStatus ?? "active",
        }),
        newValue: compactRecord({
          accessId: input.accessId,
          status: "active",
          accessVersion: input.accessVersion,
          signerRole: input.signerRole,
          tokenLastFour: input.tokenLastFour,
          channel: input.channel,
        }),
        metadata: buildAuditMetadata(input, "access_reissued"),
      })
    },
    recordAccessRevoked(input: AccessRevokedAuditInput) {
      return createReceiptAuditEvent({
        prisma,
        companyId: input.companyId,
        receiptId: input.receiptId,
        actor: input.actor,
        action: "digital_receipt.access_revoked",
        detail: `Digital receipt access ${input.accessId} revoked`,
        oldValue: compactRecord({
          accessId: input.accessId,
          status: input.previousStatus ?? "active",
        }),
        newValue: compactRecord({
          accessId: input.accessId,
          status: "revoked",
        }),
        metadata: compactRecord({
          ...buildAuditMetadata(input, "access_revoked"),
          reason: input.reason,
        }),
      })
    },
    recordReceiptRevoked(input: ReceiptRevokedAuditInput) {
      return createReceiptAuditEvent({
        prisma,
        companyId: input.companyId,
        receiptId: input.receiptId,
        actor: input.actor,
        action: "digital_receipt.revoked",
        detail: `Digital receipt ${input.receiptNumber ?? input.receiptId} revoked`,
        oldValue: compactRecord({
          status: input.previousStatus ?? "issued",
        }),
        newValue: compactRecord({
          status: "revoked",
        }),
        metadata: compactRecord({
          ...buildAuditMetadata(input, "receipt_revoked"),
          reason: input.reason,
        }),
      })
    },
    recordSnapshotCreated(input: SnapshotCreatedAuditInput) {
      return createReceiptAuditEvent({
        prisma,
        companyId: input.companyId,
        receiptId: input.receiptId,
        actor: input.actor,
        action: "digital_receipt.snapshot_created",
        detail: `Digital receipt snapshot ${input.snapshotId} created`,
        oldValue: null,
        newValue: compactRecord({
          snapshotId: input.snapshotId,
          snapshotVersion: input.snapshotVersion,
          checksum: input.checksum,
        }),
        metadata: buildAuditMetadata(input, "snapshot_created"),
      })
    },
    recordArtifactRegistered(input: ArtifactRegisteredAuditInput) {
      return createReceiptAuditEvent({
        prisma,
        companyId: input.companyId,
        receiptId: input.receiptId,
        actor: input.actor,
        action: "digital_receipt.artifact_registered",
        detail: `Digital receipt artifact ${input.artifactId} registered`,
        oldValue: null,
        newValue: compactRecord({
          artifactId: input.artifactId,
          artifactType: input.artifactType,
          snapshotId: input.snapshotId,
          accessId: input.accessId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          checksum: input.checksum,
          hasStorageKey: Boolean(input.storageKey),
        }),
        metadata: buildAuditMetadata(input, "artifact_registered"),
      })
    },
  }
}
