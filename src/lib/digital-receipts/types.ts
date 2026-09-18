export const DIGITAL_RECEIPT_STATUSES = [
  "draft",
  "issued",
  "signed",
  "expired",
  "revoked",
] as const

export type DigitalReceiptStatus = (typeof DIGITAL_RECEIPT_STATUSES)[number]

export const DIGITAL_RECEIPT_ACCESS_STATUSES = [
  "active",
  "consumed",
  "expired",
  "revoked",
] as const

export type DigitalReceiptAccessStatus = (typeof DIGITAL_RECEIPT_ACCESS_STATUSES)[number]

export const DIGITAL_RECEIPT_SIGNER_ROLES = ["patient", "authorized_payer"] as const

export type DigitalReceiptSignerRole = (typeof DIGITAL_RECEIPT_SIGNER_ROLES)[number]

export const DIGITAL_RECEIPT_EVENT_TYPES = [
  "created",
  "issued",
  "access_created",
  "access_opened",
  "access_consumed",
  "signed",
  "snapshot_created",
  "artifact_created",
  "expired",
  "revoked",
] as const

export type DigitalReceiptEventType = (typeof DIGITAL_RECEIPT_EVENT_TYPES)[number]

export const DIGITAL_RECEIPT_ARTIFACT_TYPES = [
  "receipt_html",
  "receipt_pdf",
  "audit_trail",
  "snapshot_payload",
  "signature_evidence",
] as const

export type DigitalReceiptArtifactType = (typeof DIGITAL_RECEIPT_ARTIFACT_TYPES)[number]

export type DigitalReceiptAuditMetadata = Record<string, unknown>

export type DigitalReceiptDeliveryChannel = "whatsapp" | "email" | "sms" | "internal"

export const DIGITAL_RECEIPT_DELIVERY_INTENT_STATUSES = [
  "not_configured",
  "pending_manual",
] as const

export type DigitalReceiptDeliveryIntentStatus =
  (typeof DIGITAL_RECEIPT_DELIVERY_INTENT_STATUSES)[number]

export const DIGITAL_RECEIPT_DELIVERY_INTENT_SOURCES = [
  "issue",
  "reissue",
  "manual_internal",
] as const

export type DigitalReceiptDeliveryIntentSource =
  (typeof DIGITAL_RECEIPT_DELIVERY_INTENT_SOURCES)[number]

export type DigitalReceiptDeliveryRecipientTarget = {
  type: "email" | "phone"
  value: string
}

export type DigitalReceiptDeliveryIntent = {
  version: 1
  accessId: string
  snapshotId?: string
  channel: DigitalReceiptDeliveryChannel
  status: DigitalReceiptDeliveryIntentStatus
  source: DigitalReceiptDeliveryIntentSource
  trigger: "issue" | "reissue"
  requestedAt: string
  issuedAt: string
  signerRole: DigitalReceiptSignerRole
  signerId?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientTargets: DigitalReceiptDeliveryRecipientTarget[]
  artifactIds?: string[]
  artifactTypes?: DigitalReceiptArtifactType[]
  provider: {
    configured: false
    mode: "not_integrated"
  }
}

export type DigitalReceiptDeliveryMetadata = {
  version: 1
  latestIntent: DigitalReceiptDeliveryIntent
  intents: DigitalReceiptDeliveryIntent[]
  updatedAt: string
}

export type DigitalReceiptActorRef = {
  actorUserId?: string
  actorRole?: string
  actorDisplayName?: string
}

export type DigitalReceiptSigner = {
  signerId: string
  role: DigitalReceiptSignerRole
  displayName: string
  documentNumber?: string
  email?: string
  relationshipLabel?: string
}

export type DigitalReceiptAccess = {
  accessId: string
  receiptId: string
  version: number
  status: DigitalReceiptAccessStatus
  tokenHash: string
  tokenLastFour?: string
  channel?: DigitalReceiptDeliveryChannel
  recipientEmail?: string
  recipientPhone?: string
  signerRole: DigitalReceiptSignerRole
  signerId?: string
  issuedAt: string
  activatedAt?: string
  firstOpenedAt?: string
  lastOpenedAt?: string
  consumedAt?: string
  expiredAt?: string
  revokedAt?: string
  supersededByAccessId?: string
  metadata?: DigitalReceiptAuditMetadata
}

export type DigitalReceiptSnapshot = {
  snapshotId: string
  receiptId: string
  version: number
  capturedAt: string
  capturedBy?: DigitalReceiptActorRef
  checksum?: string
  payload: Record<string, unknown>
  metadata?: DigitalReceiptAuditMetadata
}

export type DigitalReceiptEvent = {
  eventId: string
  receiptId: string
  accessId?: string
  snapshotId?: string
  artifactId?: string
  type: DigitalReceiptEventType
  happenedAt: string
  actor?: DigitalReceiptActorRef
  detail?: string
  metadata?: DigitalReceiptAuditMetadata
}

export type DigitalReceiptArtifact = {
  artifactId: string
  receiptId: string
  snapshotId?: string
  accessId?: string
  type: DigitalReceiptArtifactType
  createdAt: string
  createdBy?: DigitalReceiptActorRef
  fileName?: string
  mimeType?: string
  storageKey?: string
  checksum?: string
  metadata?: DigitalReceiptAuditMetadata
}

export type DigitalReceipt = {
  receiptId: string
  companyId: string
  surgeryId: string
  receiptNumber: string
  status: DigitalReceiptStatus
  issuedAt: string
  issuedBy?: DigitalReceiptActorRef
  signedAt?: string
  expiredAt?: string
  revokedAt?: string
  latestAccessVersion?: number
  activeAccessId?: string
  currentSignerRole: DigitalReceiptSignerRole
  signers: DigitalReceiptSigner[]
  latestSnapshot?: DigitalReceiptSnapshot
  artifacts: DigitalReceiptArtifact[]
  events: DigitalReceiptEvent[]
  metadata?: DigitalReceiptAuditMetadata
}

export type DigitalReceiptRecord = DigitalReceipt

export type DigitalReceiptAccessRecord = DigitalReceiptAccess

export type DigitalReceiptAggregate = {
  receipt: DigitalReceipt
  accesses: DigitalReceiptAccess[]
  snapshots: DigitalReceiptSnapshot[]
  events: DigitalReceiptEvent[]
  artifacts: DigitalReceiptArtifact[]
}

export type DigitalReceiptFlowContext = {
  companyId: string
  surgeryId: string
  receiptId?: string
  accessId?: string
  actor?: DigitalReceiptActorRef
  nowIso?: string
  correlationId?: string
}
