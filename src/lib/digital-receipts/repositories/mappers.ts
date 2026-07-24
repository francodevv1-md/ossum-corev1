import type { Prisma } from "@prisma/client"

import type {
  DigitalReceipt,
  DigitalReceiptAccess,
  DigitalReceiptActorRef,
  DigitalReceiptAggregate,
  DigitalReceiptArtifact,
  DigitalReceiptAuditMetadata,
  DigitalReceiptEvent,
  DigitalReceiptSigner,
  DigitalReceiptSnapshot,
} from "../types"

export type PrismaDigitalReceiptAccessRow = {
  id: string
  receiptId: string
  version: number
  status: DigitalReceiptAccess["status"]
  tokenHash: string
  tokenLastFour: string | null
  channel: DigitalReceiptAccess["channel"] | null
  recipientEmail: string | null
  recipientPhone: string | null
  signerRole: DigitalReceiptAccess["signerRole"]
  signerId: string | null
  issuedAt: Date
  activatedAt: Date | null
  firstOpenedAt: Date | null
  lastOpenedAt: Date | null
  consumedAt: Date | null
  expiredAt: Date | null
  revokedAt: Date | null
  supersededByAccessId: string | null
  metadata: Prisma.JsonValue | null
}

export type PrismaDigitalReceiptSnapshotRow = {
  id: string
  receiptId: string
  version: number
  capturedAt: Date
  capturedBy: Prisma.JsonValue | null
  checksum: string | null
  payload: Prisma.JsonValue
  metadata: Prisma.JsonValue | null
}

export type PrismaDigitalReceiptEventRow = {
  id: string
  receiptId: string
  accessId: string | null
  snapshotId: string | null
  artifactId: string | null
  type: DigitalReceiptEvent["type"]
  happenedAt: Date
  actor: Prisma.JsonValue | null
  detail: string | null
  metadata: Prisma.JsonValue | null
}

export type PrismaDigitalReceiptArtifactRow = {
  id: string
  receiptId: string
  snapshotId: string | null
  accessId: string | null
  type: DigitalReceiptArtifact["type"]
  createdAt: Date
  createdBy: Prisma.JsonValue | null
  fileName: string | null
  mimeType: string | null
  storageKey: string | null
  checksum: string | null
  metadata: Prisma.JsonValue | null
}

export type PrismaDigitalReceiptAggregateRow = {
  id: string
  companyId: string
  surgeryId: string
  receiptNumber: string
  status: DigitalReceipt["status"]
  issuedAt: Date
  issuedBy: Prisma.JsonValue | null
  signedAt: Date | null
  expiredAt: Date | null
  revokedAt: Date | null
  latestAccessVersion: number | null
  activeAccessId: string | null
  currentSignerRole: DigitalReceipt["currentSignerRole"]
  signers: Prisma.JsonValue
  latestSnapshotId: string | null
  metadata: Prisma.JsonValue | null
  accesses: PrismaDigitalReceiptAccessRow[]
  snapshots: PrismaDigitalReceiptSnapshotRow[]
  events: PrismaDigitalReceiptEventRow[]
  artifacts: PrismaDigitalReceiptArtifactRow[]
  latestSnapshot: PrismaDigitalReceiptSnapshotRow | null
}

const digitalReceiptAggregateInclude = {
  accesses: {
    orderBy: { version: "asc" },
  },
  snapshots: {
    orderBy: [{ version: "asc" }, { capturedAt: "asc" }],
  },
  events: {
    orderBy: [{ happenedAt: "asc" }, { createdAt: "asc" }],
  },
  artifacts: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  latestSnapshot: true,
}

function isRecord(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isSigner(value: unknown): value is DigitalReceiptSigner {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.signerId === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.displayName === "string"
  )
}

function readRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function readActorRef(value: Prisma.JsonValue | null | undefined): DigitalReceiptActorRef | undefined {
  return isRecord(value) ? (value as DigitalReceiptActorRef) : undefined
}

function readSigners(value: Prisma.JsonValue): DigitalReceiptSigner[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isSigner)
}

function readPayload(value: Prisma.JsonValue): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function toIsoString(value: Date | null | undefined): string | undefined {
  return value?.toISOString()
}

export function mapDigitalReceiptAccess(record: PrismaDigitalReceiptAccessRow): DigitalReceiptAccess {
  return {
    accessId: record.id,
    receiptId: record.receiptId,
    version: record.version,
    status: record.status,
    tokenHash: record.tokenHash,
    tokenLastFour: record.tokenLastFour ?? undefined,
    channel: record.channel ?? undefined,
    recipientEmail: record.recipientEmail ?? undefined,
    recipientPhone: record.recipientPhone ?? undefined,
    signerRole: record.signerRole,
    signerId: record.signerId ?? undefined,
    issuedAt: record.issuedAt.toISOString(),
    activatedAt: toIsoString(record.activatedAt),
    firstOpenedAt: toIsoString(record.firstOpenedAt),
    lastOpenedAt: toIsoString(record.lastOpenedAt),
    consumedAt: toIsoString(record.consumedAt),
    expiredAt: toIsoString(record.expiredAt),
    revokedAt: toIsoString(record.revokedAt),
    supersededByAccessId: record.supersededByAccessId ?? undefined,
    metadata: readRecord(record.metadata) as DigitalReceiptAuditMetadata | undefined,
  }
}

export function mapDigitalReceiptSnapshot(record: PrismaDigitalReceiptSnapshotRow): DigitalReceiptSnapshot {
  return {
    snapshotId: record.id,
    receiptId: record.receiptId,
    version: record.version,
    capturedAt: record.capturedAt.toISOString(),
    capturedBy: readActorRef(record.capturedBy),
    checksum: record.checksum ?? undefined,
    payload: readPayload(record.payload),
    metadata: readRecord(record.metadata) as DigitalReceiptAuditMetadata | undefined,
  }
}

export function mapDigitalReceiptEvent(record: PrismaDigitalReceiptEventRow): DigitalReceiptEvent {
  return {
    eventId: record.id,
    receiptId: record.receiptId,
    accessId: record.accessId ?? undefined,
    snapshotId: record.snapshotId ?? undefined,
    artifactId: record.artifactId ?? undefined,
    type: record.type,
    happenedAt: record.happenedAt.toISOString(),
    actor: readActorRef(record.actor),
    detail: record.detail ?? undefined,
    metadata: readRecord(record.metadata) as DigitalReceiptAuditMetadata | undefined,
  }
}

export function mapDigitalReceiptArtifact(record: PrismaDigitalReceiptArtifactRow): DigitalReceiptArtifact {
  return {
    artifactId: record.id,
    receiptId: record.receiptId,
    snapshotId: record.snapshotId ?? undefined,
    accessId: record.accessId ?? undefined,
    type: record.type,
    createdAt: record.createdAt.toISOString(),
    createdBy: readActorRef(record.createdBy),
    fileName: record.fileName ?? undefined,
    mimeType: record.mimeType ?? undefined,
    storageKey: record.storageKey ?? undefined,
    checksum: record.checksum ?? undefined,
    metadata: readRecord(record.metadata) as DigitalReceiptAuditMetadata | undefined,
  }
}

export function mapDigitalReceiptAggregate(record: PrismaDigitalReceiptAggregateRow): DigitalReceiptAggregate {
  return {
    receipt: {
      receiptId: record.id,
      companyId: record.companyId,
      surgeryId: record.surgeryId,
      receiptNumber: record.receiptNumber,
      status: record.status,
      issuedAt: record.issuedAt.toISOString(),
      issuedBy: readActorRef(record.issuedBy),
      signedAt: toIsoString(record.signedAt),
      expiredAt: toIsoString(record.expiredAt),
      revokedAt: toIsoString(record.revokedAt),
      latestAccessVersion: record.latestAccessVersion ?? undefined,
      activeAccessId: record.activeAccessId ?? undefined,
      currentSignerRole: record.currentSignerRole,
      signers: readSigners(record.signers),
      latestSnapshot: record.latestSnapshot ? mapDigitalReceiptSnapshot(record.latestSnapshot) : undefined,
      artifacts: record.artifacts.map(mapDigitalReceiptArtifact),
      events: record.events.map(mapDigitalReceiptEvent),
      metadata: readRecord(record.metadata) as DigitalReceiptAuditMetadata | undefined,
    },
    accesses: record.accesses.map(mapDigitalReceiptAccess),
    snapshots: record.snapshots.map(mapDigitalReceiptSnapshot),
    events: record.events.map(mapDigitalReceiptEvent),
    artifacts: record.artifacts.map(mapDigitalReceiptArtifact),
  }
}

export function mapDigitalReceipt(record: PrismaDigitalReceiptAggregateRow): DigitalReceipt {
  return mapDigitalReceiptAggregate(record).receipt
}

export { digitalReceiptAggregateInclude }
