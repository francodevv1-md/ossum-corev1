import { createHash } from "node:crypto"

import type { PrismaClient } from "@prisma/client"

import { prisma as defaultPrisma } from "@/lib/prisma"

import { createDigitalReceiptTechnicalAuditRecorder } from "./audit"
import { buildDigitalReceiptDownloadArtifact } from "./download-artifact"
import type {
  CreateDigitalReceiptDraftInput,
  IssueDigitalReceiptInput,
  ListDigitalReceiptsFilters,
  ReissueDigitalReceiptAccessInput,
  RevokeDigitalReceiptInput,
  RevokeDigitalReceiptAccessInput,
} from "./contracts"
import {
  createDigitalReceiptTimelineRecorder,
  sanitizeDigitalReceiptEventMetadata,
} from "./events"
import {
  createDigitalReceiptDomainError,
  type DigitalReceiptDomainErrorCode,
} from "./errors"
import {
  planNextDigitalReceiptNumber,
  parseDigitalReceiptNumber,
  type PlannedDigitalReceiptNumber,
} from "./numbering"
import { createDigitalReceiptRepositories } from "./repository"
import {
  buildDigitalReceiptSnapshotDraft,
  type BuildDigitalReceiptSnapshotDraftInput,
  type DigitalReceiptIssuedSnapshotPayload,
  type DigitalReceiptSnapshotAmount,
  type DigitalReceiptSnapshotConcept,
  type DigitalReceiptSnapshotEmitter,
  type DigitalReceiptSnapshotLegalMetadata,
  type DigitalReceiptSnapshotSurgeryContext,
} from "./snapshot-service"
import {
  issueDigitalReceiptAccessDraft,
  reissueDigitalReceiptAccessDraft,
  revokeDigitalReceiptAccess as revokeDigitalReceiptAccessTransition,
  shouldExpireDigitalReceiptAccess,
  toSafeDigitalReceiptAccess,
  type DigitalReceiptAccessDraft,
  type SafeDigitalReceiptAccess,
} from "./access-service"
import { DIGITAL_RECEIPT_ARTIFACT_TYPES } from "./types"
import type {
  DigitalReceipt,
  DigitalReceiptAccess,
  DigitalReceiptActorRef,
  DigitalReceiptAggregate,
  DigitalReceiptArtifactType,
  DigitalReceiptAuditMetadata,
  DigitalReceiptDeliveryChannel,
  DigitalReceiptDeliveryIntent,
  DigitalReceiptDeliveryMetadata,
  DigitalReceiptDeliveryIntentSource,
  DigitalReceiptDeliveryIntentStatus,
  DigitalReceiptEventType,
  DigitalReceiptSigner,
  DigitalReceiptSignerRole,
} from "./types"
import {
  validateCreateDigitalReceiptDraftInput,
  validateDigitalReceiptCompanyId,
  validateDigitalReceiptId,
  validateDigitalReceiptSurgeryId,
  validateIssueDigitalReceiptInput,
  validateListDigitalReceiptsFilters,
  validateReissueDigitalReceiptAccessInput,
  validateRevokeDigitalReceiptInput,
  validateRevokeDigitalReceiptAccessInput,
} from "./validators"
import type { ReceiptCreateDefaults } from "./ui"

const DIGITAL_RECEIPT_DEFAULT_COMPANY_SERIES = "0001"
const DIGITAL_RECEIPT_DEFAULT_CURRENCY = "ARS"
const DIGITAL_RECEIPT_PLACEHOLDER_DISCLAIMER =
  "Sprint 1 placeholder: emitter/legal context pending canonical approval."

type DigitalReceiptDraftMetadata = {
  concept: string
  amount: number
  currency?: string
  companySeries?: string
  expiresAt?: string
  emitter?: Record<string, unknown>
  surgery?: Record<string, unknown>
  legal?: Record<string, unknown>
}

type DigitalReceiptContextData = {
  emitter: DigitalReceiptSnapshotEmitter
  surgery: DigitalReceiptSnapshotSurgeryContext
  legal: DigitalReceiptSnapshotLegalMetadata
}

type ArtifactRegistrationPlan = {
  artifactId?: string
  type: DigitalReceiptArtifactType
  snapshotId?: string
  accessId?: string
  fileName?: string
  mimeType?: string
  checksum?: string
  storageKey?: string
  metadata?: DigitalReceiptAuditMetadata
}

export type SafeDigitalReceiptAggregate = Omit<DigitalReceiptAggregate, "accesses"> & {
  accesses: SafeDigitalReceiptAccess[]
}

export type IssueDigitalReceiptResult = {
  detail: SafeDigitalReceiptAggregate
  access: SafeDigitalReceiptAccess
  accessToken: string
}

export type ReissueDigitalReceiptAccessResult = IssueDigitalReceiptResult

export type DigitalReceiptService = ReturnType<typeof createDigitalReceiptService>

type DigitalReceiptServiceDependencies = {
  prisma?: PrismaClient
  now?: () => Date
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : undefined
}

function normalizeDateToIso(value: Date | string | null | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  }

  const normalizedValue = normalizeString(value)
  if (!normalizedValue) {
    return undefined
  }

  const parsedDate = new Date(normalizedValue)
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString()
}

function compactUnknownRecord<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T
}

function buildContactDisplayName(contact: {
  firstName?: string | null
  lastName?: string | null
  legalName?: string | null
} | null | undefined): string | undefined {
  if (!contact) {
    return undefined
  }

  const legalName = normalizeString(contact.legalName)
  if (legalName) {
    return legalName
  }

  const firstName = normalizeString(contact.firstName)
  const lastName = normalizeString(contact.lastName)
  const fullName = [firstName, lastName].filter(Boolean).join(" ")

  return normalizeString(fullName)
}

function mergeContextRecord<T extends Record<string, unknown>>(
  base: T | undefined,
  override: Record<string, unknown> | undefined
): T | undefined {
  if (!base && !override) {
    return undefined
  }

  return {
    ...(base ?? {}),
    ...(override ?? {}),
  } as T
}

function buildPersistedContextPlaceholders(context: DigitalReceiptContextData) {
  return {
    emitter: compactUnknownRecord(context.emitter as Record<string, unknown>),
    surgery: compactUnknownRecord(context.surgery as Record<string, unknown>),
    legal: compactUnknownRecord(context.legal as Record<string, unknown>),
  }
}

function readDeliveryMetadata(
  metadata: DigitalReceiptAuditMetadata | undefined
): DigitalReceiptDeliveryMetadata | undefined {
  if (!isRecord(metadata) || !isRecord(metadata.delivery)) {
    return undefined
  }

  const latestIntent = metadata.delivery.latestIntent
  const intents = metadata.delivery.intents
  const updatedAt = normalizeString(metadata.delivery.updatedAt)

  if (!isRecord(latestIntent) || !Array.isArray(intents) || !updatedAt) {
    return undefined
  }

  return metadata.delivery as DigitalReceiptDeliveryMetadata
}

function buildDeliveryRecipientTargets(input: {
  recipientEmail?: string
  recipientPhone?: string
}) {
  const recipientTargets: DigitalReceiptDeliveryIntent["recipientTargets"] = []

  const recipientEmail = normalizeString(input.recipientEmail)
  if (recipientEmail) {
    recipientTargets.push({
      type: "email",
      value: recipientEmail,
    })
  }

  const recipientPhone = normalizeString(input.recipientPhone)
  if (recipientPhone) {
    recipientTargets.push({
      type: "phone",
      value: recipientPhone,
    })
  }

  return recipientTargets
}

function resolveDeliveryIntentStatus(
  channel: DigitalReceiptDeliveryChannel
): DigitalReceiptDeliveryIntentStatus {
  return channel === "internal" ? "pending_manual" : "not_configured"
}

function resolveDeliveryIntentSource(input: {
  channel: DigitalReceiptDeliveryChannel
  trigger: DigitalReceiptDeliveryIntent["trigger"]
}): DigitalReceiptDeliveryIntentSource {
  return input.channel === "internal" ? "manual_internal" : input.trigger
}

function buildDigitalReceiptDeliveryIntent(input: {
  access: Pick<
    DigitalReceiptAccess,
    | "accessId"
    | "channel"
    | "recipientEmail"
    | "recipientPhone"
    | "signerRole"
    | "signerId"
    | "issuedAt"
  >
  requestedAt: string
  trigger: DigitalReceiptDeliveryIntent["trigger"]
  snapshotId?: string
  artifactIds?: string[]
  artifactTypes?: DigitalReceiptArtifactType[]
}): DigitalReceiptDeliveryIntent {
  const channel = input.access.channel ?? "internal"

  return compactUnknownRecord({
    version: 1,
    accessId: input.access.accessId,
    snapshotId: input.snapshotId,
    channel,
    status: resolveDeliveryIntentStatus(channel),
    source: resolveDeliveryIntentSource({
      channel,
      trigger: input.trigger,
    }),
    trigger: input.trigger,
    requestedAt: input.requestedAt,
    issuedAt: input.access.issuedAt,
    signerRole: input.access.signerRole,
    signerId: normalizeString(input.access.signerId),
    recipientEmail: normalizeString(input.access.recipientEmail),
    recipientPhone: normalizeString(input.access.recipientPhone),
    recipientTargets: buildDeliveryRecipientTargets({
      recipientEmail: input.access.recipientEmail,
      recipientPhone: input.access.recipientPhone,
    }),
    artifactIds: input.artifactIds?.length ? input.artifactIds : undefined,
    artifactTypes: input.artifactTypes?.length ? input.artifactTypes : undefined,
    provider: {
      configured: false,
      mode: "not_integrated",
    },
  }) as DigitalReceiptDeliveryIntent
}

function appendDeliveryIntentMetadata(
  metadata: DigitalReceiptAuditMetadata | undefined,
  deliveryIntent: DigitalReceiptDeliveryIntent
): DigitalReceiptAuditMetadata {
  const existingDelivery = readDeliveryMetadata(metadata)

  return {
    ...(metadata ?? {}),
    delivery: {
      version: 1,
      latestIntent: deliveryIntent,
      intents: [...(existingDelivery?.intents ?? []), deliveryIntent],
      updatedAt: deliveryIntent.requestedAt,
    } satisfies DigitalReceiptDeliveryMetadata,
  }
}

function buildDeliveryIntentEventMetadata(
  deliveryIntent: DigitalReceiptDeliveryIntent
): DigitalReceiptAuditMetadata {
  return {
    delivery: compactUnknownRecord({
      accessId: deliveryIntent.accessId,
      snapshotId: deliveryIntent.snapshotId,
      channel: deliveryIntent.channel,
      status: deliveryIntent.status,
      source: deliveryIntent.source,
      trigger: deliveryIntent.trigger,
      requestedAt: deliveryIntent.requestedAt,
      issuedAt: deliveryIntent.issuedAt,
      recipientEmail: deliveryIntent.recipientEmail,
      recipientPhone: deliveryIntent.recipientPhone,
      recipientTargets: deliveryIntent.recipientTargets,
      artifactIds: deliveryIntent.artifactIds,
      artifactTypes: deliveryIntent.artifactTypes,
      providerConfigured: false,
      providerMode: "not_integrated",
    }),
  }
}

function isDigitalReceiptArtifactType(value: string): value is DigitalReceiptArtifactType {
  return (DIGITAL_RECEIPT_ARTIFACT_TYPES as readonly string[]).includes(value)
}

function mergeMetadata(
  ...metadataValues: Array<DigitalReceiptAuditMetadata | undefined>
): DigitalReceiptAuditMetadata | undefined {
  const mergedMetadata = metadataValues.reduce<Record<string, unknown>>((accumulator, metadata) => {
    if (!metadata) {
      return accumulator
    }

    Object.assign(accumulator, metadata)
    return accumulator
  }, {})

  return Object.keys(mergedMetadata).length > 0 ? mergedMetadata : undefined
}

function sanitizeFileNameSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function toArtifactBuffer(content: string | ArrayBuffer) {
  return typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content)
}

function createArtifactChecksum(content: string | ArrayBuffer) {
  return createHash("sha256").update(toArtifactBuffer(content)).digest("hex")
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortJsonValue((value as Record<string, unknown>)[key])
        return accumulator
      }, {})
  }

  return value
}

function stableStringify(value: Record<string, unknown>) {
  return JSON.stringify(sortJsonValue(value))
}

function buildArtifactRegistrationKey(registration: ArtifactRegistrationPlan) {
  return [
    registration.type,
    registration.snapshotId ?? "",
    registration.accessId ?? "",
    registration.fileName ?? "",
    registration.mimeType ?? "",
    registration.artifactId ?? "",
  ].join("::")
}

function dedupeArtifactRegistrationPlans(registrations: ArtifactRegistrationPlan[]) {
  const seen = new Set<string>()

  return registrations.filter((registration) => {
    const key = buildArtifactRegistrationKey(registration)
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function buildIssuedAuditTrailSummary(input: {
  aggregate: SafeDigitalReceiptAggregate
  access: SafeDigitalReceiptAccess
  snapshotId: string
  snapshotVersion: number
  snapshotChecksum?: string
}) {
  return {
    receiptId: input.aggregate.receipt.receiptId,
    receiptNumber: input.aggregate.receipt.receiptNumber,
    companyId: input.aggregate.receipt.companyId,
    surgeryId: input.aggregate.receipt.surgeryId,
    receiptStatus: input.aggregate.receipt.status,
    signerRole: input.aggregate.receipt.currentSignerRole,
    snapshot: compactUnknownRecord({
      snapshotId: input.snapshotId,
      version: input.snapshotVersion,
      checksum: input.snapshotChecksum,
    }),
    access: compactUnknownRecord({
      accessId: input.access.accessId,
      version: input.access.version,
      status: input.access.status,
      signerRole: input.access.signerRole,
      tokenLastFour: input.access.tokenLastFour,
      issuedAt: input.access.issuedAt,
      expiredAt: input.access.expiredAt,
    }),
    timeline: input.aggregate.events.map((event) =>
      compactUnknownRecord({
        eventId: event.eventId,
        type: event.type,
        happenedAt: event.happenedAt,
        accessId: event.accessId,
        snapshotId: event.snapshotId,
        artifactId: event.artifactId,
      })
    ),
  }
}

function buildIssuedCoreArtifactRegistrationPlans(input: {
  aggregate: SafeDigitalReceiptAggregate
  access: SafeDigitalReceiptAccess
  snapshotId: string
  snapshotVersion: number
  snapshotChecksum?: string
}): ArtifactRegistrationPlan[] {
  const htmlArtifact = buildDigitalReceiptDownloadArtifact({
    aggregate: input.aggregate,
    access: input.access,
    format: "html",
  })
  const pdfArtifact = buildDigitalReceiptDownloadArtifact({
    aggregate: input.aggregate,
    access: input.access,
    format: "pdf",
  })
  const auditTrailSummary = buildIssuedAuditTrailSummary(input)
  const auditTrailFileName = `${sanitizeFileNameSegment(input.aggregate.receipt.receiptNumber)}-audit-trail.json`
  const auditTrailChecksum = createArtifactChecksum(stableStringify(auditTrailSummary))
  const metadataBase = compactUnknownRecord({
    source: "issue_flow",
    generator: "ossum_cor.digital_receipts.artifact_registry.v1",
    generationSource: "persisted_backend_state",
    storageMode: "metadata_only",
    checksumAlgorithm: "sha256",
    snapshotId: input.snapshotId,
    snapshotVersion: input.snapshotVersion,
    snapshotChecksum: input.snapshotChecksum,
    accessId: input.access.accessId,
    accessVersion: input.access.version,
    accessStatus: input.access.status,
    receiptStatus: input.aggregate.receipt.status,
  })

  return [
    {
      type: "receipt_html",
      snapshotId: input.snapshotId,
      accessId: input.access.accessId,
      fileName: htmlArtifact.fileName,
      mimeType: htmlArtifact.mimeType,
      checksum: createArtifactChecksum(htmlArtifact.content),
      metadata: {
        ...metadataBase,
        format: "html",
        renderMode: "on_demand",
      },
    },
    {
      type: "receipt_pdf",
      snapshotId: input.snapshotId,
      accessId: input.access.accessId,
      fileName: pdfArtifact.fileName,
      mimeType: pdfArtifact.mimeType,
      checksum: createArtifactChecksum(pdfArtifact.content),
      metadata: {
        ...metadataBase,
        format: "pdf",
        renderMode: "on_demand",
      },
    },
    {
      type: "audit_trail",
      snapshotId: input.snapshotId,
      accessId: input.access.accessId,
      fileName: auditTrailFileName,
      mimeType: "application/json",
      checksum: auditTrailChecksum,
      metadata: {
        ...metadataBase,
        format: "json",
        renderMode: "summary_descriptor",
        representation: "receipt_audit_trail_summary",
        eventCount: input.aggregate.events.length,
        accessCount: input.aggregate.accesses.length,
        artifactCount: input.aggregate.artifacts.length,
      },
    },
  ]
}

function readArtifactRegistrationMetadata(
  metadata: DigitalReceiptAuditMetadata | undefined
): ArtifactRegistrationPlan[] {
  if (!isRecord(metadata)) {
    return []
  }

  const registrations = metadata.artifactRegistrations
  if (!Array.isArray(registrations)) {
    return []
  }

  return registrations.reduce<ArtifactRegistrationPlan[]>((accumulator, entry) => {
    if (!isRecord(entry)) {
      return accumulator
    }

    const artifactId = normalizeString(entry.artifactId)
    const type = normalizeString(entry.type)

    if (!artifactId || !type || !isDigitalReceiptArtifactType(type)) {
      return accumulator
    }

    accumulator.push({
      artifactId,
      type,
      snapshotId: normalizeString(entry.snapshotId),
      accessId: normalizeString(entry.accessId),
      fileName: normalizeString(entry.fileName),
      mimeType: normalizeString(entry.mimeType),
      checksum: normalizeString(entry.checksum),
      storageKey: normalizeString(entry.storageKey),
      metadata: {
        source: "issue_request_metadata",
        registrationOrigin: "input.metadata.artifactRegistrations",
      },
    })

    return accumulator
  }, [])
}

function sanitizeDigitalReceiptAggregate(aggregate: DigitalReceiptAggregate): SafeDigitalReceiptAggregate {
  return {
    ...aggregate,
    accesses: aggregate.accesses.map(toSafeDigitalReceiptAccess),
  }
}

function sanitizeAccessDraft(draft: DigitalReceiptAccessDraft): SafeDigitalReceiptAccess {
  return toSafeDigitalReceiptAccess(draft as DigitalReceiptAccess)
}

function getCurrentIso(now: () => Date): string {
  return now().toISOString()
}

function readDraftMetadata(
  receipt: DigitalReceipt,
  context?: DigitalReceiptContextData
): DigitalReceiptDraftMetadata {
  if (!isRecord(receipt.metadata)) {
    throw createDigitalReceiptDomainError(
      "digital_receipt_event_invalid",
      "Digital receipt draft metadata is missing",
      { receiptId: receipt.receiptId }
    )
  }

  const draft = isRecord(receipt.metadata.draft) ? receipt.metadata.draft : undefined
  const placeholders = isRecord(receipt.metadata.placeholders) ? receipt.metadata.placeholders : undefined

  const concept = normalizeString(draft?.concept)
  const amount = typeof draft?.amount === "number" && Number.isFinite(draft.amount) ? draft.amount : undefined

  if (!concept || amount === undefined) {
    throw createDigitalReceiptDomainError(
      "digital_receipt_event_invalid",
      "Digital receipt draft metadata is incomplete",
      { receiptId: receipt.receiptId }
    )
  }

  return {
    concept,
    amount,
    currency: normalizeString(draft?.currency) ?? DIGITAL_RECEIPT_DEFAULT_CURRENCY,
    companySeries: normalizeString(draft?.companySeries),
    expiresAt: normalizeString(draft?.expiresAt),
    emitter: mergeContextRecord(
      context?.emitter as Record<string, unknown> | undefined,
      isRecord(placeholders?.emitter) ? placeholders.emitter : undefined
    ),
    surgery: mergeContextRecord(
      context?.surgery as Record<string, unknown> | undefined,
      isRecord(placeholders?.surgery) ? placeholders.surgery : undefined
    ),
    legal: mergeContextRecord(
      context?.legal as Record<string, unknown> | undefined,
      isRecord(placeholders?.legal) ? placeholders.legal : undefined
    ),
  }
}

function resolveDraftCompanySeries(input: CreateDigitalReceiptDraftInput): string {
  const metadataCompanySeries = isRecord(input.metadata)
    ? normalizeString(input.metadata.companySeries)
    : undefined

  return metadataCompanySeries ?? DIGITAL_RECEIPT_DEFAULT_COMPANY_SERIES
}

function resolvePlannedReceiptNumber(
  companyId: string,
  companySeries: string,
  receipts: DigitalReceipt[]
): PlannedDigitalReceiptNumber {
  const maxSequence = receipts.reduce<number | undefined>((currentMax, receipt) => {
    const parsed = parseDigitalReceiptNumber(receipt.receiptNumber)
    if (!parsed || parsed.companySeries !== companySeries) {
      return currentMax
    }

    return currentMax === undefined ? parsed.sequenceValue : Math.max(currentMax, parsed.sequenceValue)
  }, undefined)

  return planNextDigitalReceiptNumber({
    companyId,
    companySeries,
    lastSequence: maxSequence,
  })
}

function resolveSigner(
  receipt: DigitalReceipt,
  signerRole?: DigitalReceiptSignerRole,
  signerId?: string
): DigitalReceiptSigner {
  const normalizedSignerId = normalizeString(signerId)
  const resolvedRole = signerRole ?? receipt.currentSignerRole

  const signer = receipt.signers.find((candidate) => {
    if (normalizedSignerId) {
      return candidate.signerId === normalizedSignerId && candidate.role === resolvedRole
    }

    return candidate.role === resolvedRole
  })

  if (!signer) {
    throw createDigitalReceiptDomainError(
      normalizedSignerId ? "digital_receipt_signer_mismatch" : "digital_receipt_signer_missing",
      normalizedSignerId
        ? "Provided signer does not match the digital receipt signer role"
        : "Digital receipt signer was not found for the requested role",
      {
        receiptId: receipt.receiptId,
        signerRole: resolvedRole,
        signerId: normalizedSignerId,
      }
    )
  }

  return signer
}

function assertReceiptCanIssue(receipt: DigitalReceipt): void {
  if (receipt.status === "draft") {
    return
  }

  const codeByStatus: Record<string, DigitalReceiptDomainErrorCode> = {
    issued: "digital_receipt_invalid_status_transition",
    signed: "digital_receipt_already_signed",
    expired: "digital_receipt_already_expired",
    revoked: "digital_receipt_already_revoked",
  }

  throw createDigitalReceiptDomainError(
    codeByStatus[receipt.status] ?? "digital_receipt_invalid_status_transition",
    `Digital receipt cannot be issued from status ${receipt.status}`,
    {
      receiptId: receipt.receiptId,
      status: receipt.status,
    }
  )
}

function assertReceiptCanReissueAccess(receipt: DigitalReceipt): void {
  if (receipt.status === "issued") {
    return
  }

  const codeByStatus: Record<string, DigitalReceiptDomainErrorCode> = {
    draft: "digital_receipt_invalid_status_transition",
    signed: "digital_receipt_already_signed",
    expired: "digital_receipt_already_expired",
    revoked: "digital_receipt_already_revoked",
  }

  throw createDigitalReceiptDomainError(
    codeByStatus[receipt.status] ?? "digital_receipt_invalid_status_transition",
    `Digital receipt access cannot be reissued from status ${receipt.status}`,
    {
      receiptId: receipt.receiptId,
      status: receipt.status,
    }
  )
}

function assertReceiptCanRevoke(receipt: DigitalReceipt): void {
  if (receipt.status === "draft" || receipt.status === "issued") {
    return
  }

  const codeByStatus: Record<string, DigitalReceiptDomainErrorCode> = {
    signed: "digital_receipt_already_signed",
    expired: "digital_receipt_already_expired",
    revoked: "digital_receipt_already_revoked",
  }

  throw createDigitalReceiptDomainError(
    codeByStatus[receipt.status] ?? "digital_receipt_invalid_status_transition",
    `Digital receipt cannot be revoked from status ${receipt.status}`,
    {
      receiptId: receipt.receiptId,
      status: receipt.status,
    }
  )
}

function resolveSnapshotEmitter(
  companyId: string,
  metadata: DigitalReceiptDraftMetadata
): DigitalReceiptSnapshotEmitter {
  return {
    ...metadata.emitter,
    companyId,
    displayName: normalizeString(metadata.emitter?.displayName) ?? `Company ${companyId}`,
  }
}

function resolveSnapshotSurgeryContext(
  receipt: DigitalReceipt,
  metadata: DigitalReceiptDraftMetadata
): DigitalReceiptSnapshotSurgeryContext | undefined {
  return {
    ...metadata.surgery,
    surgeryId: normalizeString(metadata.surgery?.surgeryId) ?? receipt.surgeryId,
  }
}

function resolveSnapshotConcepts(metadata: DigitalReceiptDraftMetadata): DigitalReceiptSnapshotConcept[] {
  return [
    {
      label: metadata.concept,
      amount: metadata.amount,
      quantity: 1,
      unitAmount: metadata.amount,
    },
  ]
}

function resolveSnapshotAmount(metadata: DigitalReceiptDraftMetadata): DigitalReceiptSnapshotAmount {
  return {
    currency: metadata.currency ?? DIGITAL_RECEIPT_DEFAULT_CURRENCY,
    total: metadata.amount,
    subtotal: metadata.amount,
    balanceAmount: metadata.amount,
  }
}

function resolveSnapshotLegalMetadata(
  metadata: DigitalReceiptDraftMetadata
): DigitalReceiptSnapshotLegalMetadata {
  return {
    ...metadata.legal,
    disclaimer:
      normalizeString(metadata.legal?.disclaimer) ?? DIGITAL_RECEIPT_PLACEHOLDER_DISCLAIMER,
    signatureMode: normalizeString(metadata.legal?.signatureMode) ?? "internal_placeholder",
  }
}

function buildSnapshotDraftInput(args: {
  receipt: DigitalReceipt
  signer: DigitalReceiptSigner
  actor?: DigitalReceiptActorRef
  nowIso: string
  snapshotVersion: number
  metadata: DigitalReceiptDraftMetadata
  issueMetadata?: DigitalReceiptAuditMetadata
}): BuildDigitalReceiptSnapshotDraftInput {
  const snapshotMetadata = mergeMetadata(args.issueMetadata, {
    placeholders: {
      emitter: !args.metadata.emitter,
      legal: !args.metadata.legal,
      surgery: !args.metadata.surgery,
    },
  })

  return {
    receipt: {
      receiptId: args.receipt.receiptId,
      companyId: args.receipt.companyId,
      surgeryId: args.receipt.surgeryId,
      receiptNumber: args.receipt.receiptNumber,
      status: "issued",
      issuedAt: args.nowIso,
      issuedBy: args.actor,
      currentSignerRole: args.signer.role,
      signers: args.receipt.signers,
    },
    emitter: resolveSnapshotEmitter(args.receipt.companyId, args.metadata),
    signerId: args.signer.signerId,
    signerRole: args.signer.role,
    surgery: resolveSnapshotSurgeryContext(args.receipt, args.metadata),
    concepts: resolveSnapshotConcepts(args.metadata),
    amount: resolveSnapshotAmount(args.metadata),
    legal: resolveSnapshotLegalMetadata(args.metadata),
    metadata: mergeMetadata(args.receipt.metadata, args.issueMetadata),
    capturedAt: args.nowIso,
    snapshotVersion: args.snapshotVersion,
    capturedBy: args.actor,
    snapshotMetadata,
  }
}

function toSnapshotPayloadRecord(payload: DigitalReceiptIssuedSnapshotPayload): Record<string, unknown> {
  return payload as unknown as Record<string, unknown>
}

function buildReceiptEventDetail(type: DigitalReceiptEventType, identifier: string): string {
  switch (type) {
    case "access_created":
      return `Access ${identifier} created`
    case "snapshot_created":
      return `Snapshot ${identifier} captured`
    case "issued":
      return `Receipt ${identifier} issued`
    case "revoked":
      return `Access ${identifier} revoked`
    case "expired":
      return `Access ${identifier} expired`
    case "created":
      return `Receipt ${identifier} draft created`
    default:
      return identifier
  }
}

export function createDigitalReceiptService(dependencies: DigitalReceiptServiceDependencies = {}) {
  const prismaClient = dependencies.prisma ?? defaultPrisma
  const now = dependencies.now ?? (() => new Date())

  async function resolveReceiptContext(
    companyId: string,
    surgeryId: string
  ): Promise<DigitalReceiptContextData> {
    const [company, surgery] = await Promise.all([
      prismaClient.company.findFirst({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          taxId: true,
          organization: {
            select: {
              name: true,
              taxId: true,
            },
          },
        },
      }),
      prismaClient.surgery.findFirst({
        where: {
          id: surgeryId,
          companyId,
        },
        select: {
          id: true,
          visibleNumber: true,
          description: true,
          notes: true,
          surgeryDate: true,
          scheduledDate: true,
          probableDate: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              legalName: true,
              documentNumber: true,
            },
          },
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              legalName: true,
            },
          },
          institution: {
            select: {
              firstName: true,
              lastName: true,
              legalName: true,
            },
          },
          payer: {
            select: {
              firstName: true,
              lastName: true,
              legalName: true,
              documentNumber: true,
            },
          },
          branch: {
            select: {
              name: true,
              address: true,
              phone: true,
            },
          },
        },
      }),
    ])

    if (!surgery) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_surgery_not_found",
        "Surgery was not found for this company",
        { companyId, surgeryId }
      )
    }

    if (!company) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_event_invalid",
        "Company was not found for this digital receipt",
        { companyId, surgeryId }
      )
    }

    const branchName = normalizeString(surgery.branch?.name)
    const branchAddress = normalizeString(surgery.branch?.address)
    const branchPhone = normalizeString(surgery.branch?.phone)
    const companyDisplayName = normalizeString(company.name) ?? `Company ${companyId}`
    const legalName = normalizeString(company.organization?.name) ?? companyDisplayName
    const taxId = normalizeString(company.taxId) ?? normalizeString(company.organization?.taxId)
    const visibleNumber = normalizeString(surgery.visibleNumber)
    const description = normalizeString(surgery.description)
    const surgeryDate = normalizeDateToIso(surgery.surgeryDate)
    const scheduledDate = normalizeDateToIso(surgery.scheduledDate)
    const probableDate = normalizeDateToIso(surgery.probableDate)

    return {
      emitter: compactUnknownRecord({
        companyId: company.id,
        displayName: companyDisplayName,
        legalName,
        taxId,
        branchName,
        address: branchAddress,
        phone: branchPhone,
      }),
      surgery: compactUnknownRecord({
        surgeryId: surgery.id,
        expedienteId: visibleNumber ?? surgery.id,
        visibleNumber,
        patientId: surgery.patient.id,
        patientDisplayName: buildContactDisplayName(surgery.patient),
        patientDocumentNumber: normalizeString(surgery.patient.documentNumber),
        procedureLabel: description ?? visibleNumber ?? `Cirugía ${surgery.id}`,
        procedureDate: surgeryDate ?? scheduledDate ?? probableDate,
        description,
        surgeryDate,
        scheduledDate,
        probableDate,
        facilityName: buildContactDisplayName(surgery.institution),
        surgeonDisplayName: buildContactDisplayName(surgery.doctor),
        payerName: buildContactDisplayName(surgery.payer),
        notes: normalizeString(surgery.notes),
      }),
      legal: compactUnknownRecord({
        issuePlace: branchAddress ?? branchName,
      }),
    }
  }

  async function requireAggregate(companyId: string, receiptId: string): Promise<DigitalReceiptAggregate> {
    const repositories = createDigitalReceiptRepositories(prismaClient)
    const aggregate = await repositories.receipts.getAggregate(companyId, receiptId)

    if (!aggregate) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_not_found",
        "Digital receipt was not found",
        { companyId, receiptId }
      )
    }

    return aggregate
  }

  async function requireCommittedAggregate(
    companyId: string,
    receiptId: string,
    message: string
  ): Promise<DigitalReceiptAggregate> {
    const aggregate = await requireAggregate(companyId, receiptId)

    if (!aggregate) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_not_found",
        message,
        { companyId, receiptId }
      )
    }

    return aggregate
  }

  async function requireSurgery(companyId: string, surgeryId: string): Promise<void> {
    const surgery = await prismaClient.surgery.findFirst({
      where: {
        id: surgeryId,
        companyId,
      },
      select: { id: true },
    })

    if (!surgery) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_surgery_not_found",
        "Surgery was not found for this company",
        { companyId, surgeryId }
      )
    }
  }

  async function createDigitalReceiptDraft(input: CreateDigitalReceiptDraftInput) {
    const validatedInput = validateCreateDigitalReceiptDraftInput(input)
    const repositories = createDigitalReceiptRepositories(prismaClient)
    await requireSurgery(validatedInput.companyId, validatedInput.surgeryId)
    const receiptContext = await resolveReceiptContext(
      validatedInput.companyId,
      validatedInput.surgeryId
    )
    const existingReceipts = await repositories.receipts.list({
      companyId: validatedInput.companyId,
    })
    const companySeries = resolveDraftCompanySeries(validatedInput)
    const plannedNumber = resolvePlannedReceiptNumber(
      validatedInput.companyId,
      companySeries,
      existingReceipts
    )
    const nowIso = getCurrentIso(now)

    const createdReceiptId = await prismaClient.$transaction(async (tx) => {
      const txRepositories = createDigitalReceiptRepositories(tx)
      const timeline = createDigitalReceiptTimelineRecorder(txRepositories.events)
      const audit = createDigitalReceiptTechnicalAuditRecorder(tx)
      const receipt = await txRepositories.receipts.create({
        companyId: validatedInput.companyId,
        surgeryId: validatedInput.surgeryId,
        receiptNumber: plannedNumber.value,
        status: "draft",
        issuedAt: nowIso,
        currentSignerRole: validatedInput.currentSignerRole,
        signers: validatedInput.signers as Array<Record<string, unknown>>,
        metadata: mergeMetadata(validatedInput.metadata, {
          draft: {
            concept: validatedInput.concept,
            amount: validatedInput.amount,
            currency: DIGITAL_RECEIPT_DEFAULT_CURRENCY,
            companySeries,
            expiresAt: validatedInput.expiresAt,
          },
          placeholders: buildPersistedContextPlaceholders(receiptContext),
          numbering: {
            strategy: "company_scoped_sequence",
            companySeries,
            scopeKey: plannedNumber.scopeKey,
            sequence: plannedNumber.sequence,
            placeholderSeriesDefaulted: companySeries === DIGITAL_RECEIPT_DEFAULT_COMPANY_SERIES,
          },
        }),
      })

      await timeline.recordDraftCreated({
        receiptId: receipt.receiptId,
        companyId: validatedInput.companyId,
        surgeryId: validatedInput.surgeryId,
        receiptNumber: receipt.receiptNumber,
        happenedAt: nowIso,
        metadata: mergeMetadata(sanitizeDigitalReceiptEventMetadata(validatedInput.metadata), {
          receiptNumber: receipt.receiptNumber,
        }),
      })

      await audit.recordDraftCreated({
        companyId: validatedInput.companyId,
        surgeryId: validatedInput.surgeryId,
        receiptId: receipt.receiptId,
        receiptNumber: receipt.receiptNumber,
        metadata: validatedInput.metadata,
      })

      return receipt.receiptId
    })

    const aggregate = await requireCommittedAggregate(
      validatedInput.companyId,
      createdReceiptId,
      "Digital receipt draft could not be reloaded after creation"
    )

    return sanitizeDigitalReceiptAggregate(aggregate)
  }

  async function issueDigitalReceipt(input: IssueDigitalReceiptInput): Promise<IssueDigitalReceiptResult> {
    const validatedInput = validateIssueDigitalReceiptInput(input)
    const aggregate = await requireAggregate(validatedInput.companyId, validatedInput.receiptId)

    assertReceiptCanIssue(aggregate.receipt)

    const signer = resolveSigner(
      aggregate.receipt,
      validatedInput.signerRole,
      validatedInput.signerId
    )
    const nowIso = getCurrentIso(now)
    const receiptContext = await resolveReceiptContext(
      aggregate.receipt.companyId,
      aggregate.receipt.surgeryId
    )
    const draftMetadata = readDraftMetadata(aggregate.receipt, receiptContext)
    const accessResult = issueDigitalReceiptAccessDraft({
      receiptId: aggregate.receipt.receiptId,
      accesses: aggregate.accesses,
      signerRole: signer.role,
      signerId: signer.signerId,
      expiresAt: validatedInput.expiresAt ?? draftMetadata.expiresAt,
      channel: validatedInput.channel,
      recipientEmail: validatedInput.recipientEmail ?? signer.email,
      recipientPhone: validatedInput.recipientPhone,
      metadata: validatedInput.metadata,
      nowIso,
    })
    const snapshotDraft = buildDigitalReceiptSnapshotDraft(
      buildSnapshotDraftInput({
        receipt: aggregate.receipt,
        signer,
        actor: validatedInput.actor,
        nowIso,
        snapshotVersion: aggregate.snapshots.length + 1,
        metadata: draftMetadata,
        issueMetadata: validatedInput.metadata,
      })
    )

    const issueResult = await prismaClient.$transaction(async (tx) => {
      const txRepositories = createDigitalReceiptRepositories(tx)
      const timeline = createDigitalReceiptTimelineRecorder(txRepositories.events)
      const audit = createDigitalReceiptTechnicalAuditRecorder(tx)
      const transitionEvents = [] as DigitalReceiptAggregate["events"]
      const issueReceiptMetadata = mergeMetadata(aggregate.receipt.metadata, validatedInput.metadata, {
        placeholders: buildPersistedContextPlaceholders({
          emitter: resolveSnapshotEmitter(aggregate.receipt.companyId, draftMetadata),
          surgery:
            resolveSnapshotSurgeryContext(aggregate.receipt, draftMetadata) ?? {
              surgeryId: aggregate.receipt.surgeryId,
            },
          legal: resolveSnapshotLegalMetadata(draftMetadata),
        }),
      })

      for (const patch of accessResult.deactivatedAccesses) {
        await txRepositories.accesses.update(patch.accessId, {
          status: patch.status,
          firstOpenedAt: patch.firstOpenedAt ?? null,
          lastOpenedAt: patch.lastOpenedAt ?? null,
          consumedAt: patch.consumedAt ?? null,
          expiredAt: patch.expiredAt ?? null,
          revokedAt: patch.revokedAt ?? null,
          supersededByAccessId: patch.supersededByAccessId ?? null,
          metadata: patch.metadata,
        })

        if (patch.status === "revoked") {
          transitionEvents.push(
            await timeline.recordAccessRevoked({
            receiptId: aggregate.receipt.receiptId,
            accessId: patch.accessId,
            companyId: aggregate.receipt.companyId,
            surgeryId: aggregate.receipt.surgeryId,
            receiptNumber: aggregate.receipt.receiptNumber,
            happenedAt: patch.revokedAt ?? nowIso,
            actor: validatedInput.actor,
            reason: "superseded_by_new_access",
            previousStatus: "active",
            metadata: patch.metadata,
            })
          )

          await audit.recordAccessRevoked({
            companyId: aggregate.receipt.companyId,
            surgeryId: aggregate.receipt.surgeryId,
            receiptId: aggregate.receipt.receiptId,
            receiptNumber: aggregate.receipt.receiptNumber,
            actor: validatedInput.actor,
            accessId: patch.accessId,
            reason: "superseded_by_new_access",
            previousStatus: "active",
            metadata: patch.metadata,
          })
        } else {
          transitionEvents.push(
            await txRepositories.events.create({
            receiptId: aggregate.receipt.receiptId,
            accessId: patch.accessId,
            type: "expired",
            happenedAt: patch.expiredAt ?? nowIso,
            actor: validatedInput.actor,
            detail: buildReceiptEventDetail("expired", patch.accessId),
            metadata: patch.metadata,
            })
          )
        }
      }

      const createdAccess = await txRepositories.accesses.create({
        ...accessResult.draft,
      })

      const snapshot = await txRepositories.snapshots.create({
        receiptId: snapshotDraft.receiptId,
        version: snapshotDraft.version,
        capturedAt: snapshotDraft.capturedAt,
        capturedBy: snapshotDraft.capturedBy,
        checksum: snapshotDraft.checksum,
        payload: toSnapshotPayloadRecord(snapshotDraft.payload),
        metadata: snapshotDraft.metadata,
      })

      await txRepositories.receipts.update(aggregate.receipt.receiptId, {
        status: "issued",
        issuedAt: nowIso,
        issuedBy: validatedInput.actor,
        currentSignerRole: signer.role,
        latestAccessVersion: accessResult.receiptPatch.latestAccessVersion,
        activeAccessId: accessResult.receiptPatch.activeAccessId ?? null,
        latestSnapshotId: snapshot.snapshotId,
        metadata: issueReceiptMetadata,
      })

      const issuedEvent = await timeline.recordIssued({
        receiptId: aggregate.receipt.receiptId,
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptNumber: aggregate.receipt.receiptNumber,
        accessId: accessResult.draft.accessId,
        snapshotId: snapshot.snapshotId,
        happenedAt: nowIso,
        actor: validatedInput.actor,
        metadata: sanitizeDigitalReceiptEventMetadata(validatedInput.metadata),
      })

      const snapshotCreatedEvent = await timeline.recordSnapshotCreated({
        receiptId: aggregate.receipt.receiptId,
        snapshotId: snapshot.snapshotId,
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptNumber: aggregate.receipt.receiptNumber,
        happenedAt: snapshotDraft.capturedAt,
        actor: validatedInput.actor,
        snapshotVersion: snapshot.version,
        checksum: snapshot.checksum,
        metadata: sanitizeDigitalReceiptEventMetadata(snapshotDraft.metadata),
      })

      await audit.recordSnapshotCreated({
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptId: aggregate.receipt.receiptId,
        receiptNumber: aggregate.receipt.receiptNumber,
        actor: validatedInput.actor,
        snapshotId: snapshot.snapshotId,
        snapshotVersion: snapshot.version,
        checksum: snapshot.checksum,
        metadata: snapshotDraft.metadata,
      })

      const issuedAggregate = sanitizeDigitalReceiptAggregate({
        ...aggregate,
        receipt: {
          ...aggregate.receipt,
          status: "issued",
          issuedAt: nowIso,
          issuedBy: validatedInput.actor,
          currentSignerRole: signer.role,
          latestAccessVersion: accessResult.receiptPatch.latestAccessVersion,
          activeAccessId: accessResult.receiptPatch.activeAccessId,
          latestSnapshot: snapshot,
          metadata: issueReceiptMetadata,
        },
        accesses: [
          ...aggregate.accesses
            .map((access) => {
              const patch = accessResult.deactivatedAccesses.find(
                (candidate) => candidate.accessId === access.accessId
              )

              return patch ? { ...access, ...patch } : access
            })
            .filter((access) => access.accessId !== createdAccess.accessId),
          createdAccess,
        ].sort((left, right) => left.version - right.version),
        snapshots: [...aggregate.snapshots, snapshot].sort((left, right) => left.version - right.version),
        events: [...aggregate.events, ...transitionEvents, issuedEvent, snapshotCreatedEvent].sort(
          (left, right) => left.happenedAt.localeCompare(right.happenedAt)
        ),
      })
      const issuedAccess = issuedAggregate.accesses.find(
        (access) => access.accessId === accessResult.draft.accessId
      )

      if (!issuedAccess) {
        throw createDigitalReceiptDomainError(
          "digital_receipt_event_invalid",
          "Digital receipt issued access disappeared before artifact registration",
          { companyId: validatedInput.companyId, receiptId: aggregate.receipt.receiptId }
        )
      }

      const artifactRegistrations = dedupeArtifactRegistrationPlans([
        ...buildIssuedCoreArtifactRegistrationPlans({
          aggregate: issuedAggregate,
          access: issuedAccess,
          snapshotId: snapshot.snapshotId,
          snapshotVersion: snapshot.version,
          snapshotChecksum: snapshot.checksum,
        }),
        ...readArtifactRegistrationMetadata(validatedInput.metadata),
      ])
      const createdArtifacts = [] as {
        artifactId: string
        type: DigitalReceiptArtifactType
      }[]

      for (const artifactRegistration of artifactRegistrations) {
        const artifact = await txRepositories.artifacts.create({
          artifactId: artifactRegistration.artifactId,
          receiptId: aggregate.receipt.receiptId,
          snapshotId: artifactRegistration.snapshotId,
          accessId: artifactRegistration.accessId,
          type: artifactRegistration.type,
          createdBy: validatedInput.actor,
          fileName: artifactRegistration.fileName,
          mimeType: artifactRegistration.mimeType,
          checksum: artifactRegistration.checksum,
          storageKey: artifactRegistration.storageKey,
          metadata: artifactRegistration.metadata,
        })

        createdArtifacts.push({
          artifactId: artifact.artifactId,
          type: artifact.type,
        })

        const artifactAuditMetadata = mergeMetadata(
          sanitizeDigitalReceiptEventMetadata(validatedInput.metadata),
          artifactRegistration.metadata
        )

        await timeline.recordArtifactRegistered({
          receiptId: aggregate.receipt.receiptId,
          companyId: aggregate.receipt.companyId,
          surgeryId: aggregate.receipt.surgeryId,
          receiptNumber: aggregate.receipt.receiptNumber,
          artifactId: artifact.artifactId,
          artifactType: artifact.type,
          snapshotId: artifact.snapshotId,
          accessId: artifact.accessId,
          happenedAt: artifact.createdAt,
          actor: validatedInput.actor,
          fileName: artifact.fileName,
          mimeType: artifact.mimeType,
          checksum: artifact.checksum,
          storageKey: artifact.storageKey,
          metadata: artifactAuditMetadata,
        })

        await audit.recordArtifactRegistered({
          companyId: aggregate.receipt.companyId,
          surgeryId: aggregate.receipt.surgeryId,
          receiptId: aggregate.receipt.receiptId,
          receiptNumber: aggregate.receipt.receiptNumber,
          actor: validatedInput.actor,
          artifactId: artifact.artifactId,
          artifactType: artifact.type,
          snapshotId: artifact.snapshotId,
          accessId: artifact.accessId,
          fileName: artifact.fileName,
          mimeType: artifact.mimeType,
          checksum: artifact.checksum,
          storageKey: artifact.storageKey,
          metadata: mergeMetadata(validatedInput.metadata, artifactRegistration.metadata),
        })
      }

      const deliveryIntent = buildDigitalReceiptDeliveryIntent({
        access: accessResult.draft,
        requestedAt: nowIso,
        trigger: "issue",
        snapshotId: snapshot.snapshotId,
        artifactIds: createdArtifacts.map((artifact) => artifact.artifactId),
        artifactTypes: createdArtifacts.map((artifact) => artifact.type),
      })
      const deliveryEventMetadata = buildDeliveryIntentEventMetadata(deliveryIntent)
      const accessMetadataWithDelivery = appendDeliveryIntentMetadata(
        accessResult.draft.metadata,
        deliveryIntent
      )
      const receiptMetadataWithDelivery = appendDeliveryIntentMetadata(
        issueReceiptMetadata,
        deliveryIntent
      )

      await txRepositories.accesses.update(accessResult.draft.accessId, {
        metadata: accessMetadataWithDelivery,
      })

      await txRepositories.receipts.update(aggregate.receipt.receiptId, {
        metadata: receiptMetadataWithDelivery,
      })

      await txRepositories.events.create({
        receiptId: aggregate.receipt.receiptId,
        accessId: accessResult.draft.accessId,
        snapshotId: snapshot.snapshotId,
        type: "access_created",
        happenedAt: accessResult.draft.issuedAt,
        actor: validatedInput.actor,
        detail: buildReceiptEventDetail("access_created", accessResult.draft.accessId),
        metadata: mergeMetadata(
          sanitizeDigitalReceiptEventMetadata(validatedInput.metadata),
          deliveryEventMetadata,
          {
            action: "delivery_intent_recorded",
          }
        ),
      })

      await audit.recordIssued({
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptId: aggregate.receipt.receiptId,
        receiptNumber: aggregate.receipt.receiptNumber,
        actor: validatedInput.actor,
        accessId: accessResult.draft.accessId,
        snapshotId: snapshot.snapshotId,
        previousStatus: aggregate.receipt.status,
        metadata: mergeMetadata(validatedInput.metadata, deliveryEventMetadata),
      })

      return {
        receiptId: aggregate.receipt.receiptId,
        accessId: accessResult.draft.accessId,
        accessToken: accessResult.token,
      }
    })

    const detail = sanitizeDigitalReceiptAggregate(
      await requireCommittedAggregate(
        validatedInput.companyId,
        issueResult.receiptId,
        "Digital receipt could not be reloaded after issue"
      )
    )
    const issuedAccessDetail = detail.accesses.find((access) => access.accessId === issueResult.accessId)

    if (!issuedAccessDetail) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_event_invalid",
        "Digital receipt issued access disappeared after delivery intent persistence",
        { companyId: validatedInput.companyId, receiptId: issueResult.receiptId }
      )
    }

    return {
      detail,
      access: issuedAccessDetail,
      accessToken: issueResult.accessToken,
    }
  }

  async function getDigitalReceiptDetail(companyId: string, receiptId: string) {
    const validatedCompanyId = validateDigitalReceiptCompanyId(companyId)
    const validatedReceiptId = validateDigitalReceiptId(receiptId, "receiptId")
    const aggregate = await requireAggregate(validatedCompanyId, validatedReceiptId)

    const nowIso = getCurrentIso(now)
    const staleActiveAccesses = aggregate.accesses.filter((access) => shouldExpireDigitalReceiptAccess(access, nowIso))

    if (staleActiveAccesses.length === 0) {
      return sanitizeDigitalReceiptAggregate(aggregate)
    }

    await prismaClient.$transaction(async (tx) => {
      const txRepositories = createDigitalReceiptRepositories(tx)
      const expiredAt = staleActiveAccesses[0]?.expiredAt ?? nowIso

      for (const access of staleActiveAccesses) {
        await txRepositories.accesses.update(access.accessId, {
          status: "expired",
          expiredAt: access.expiredAt ?? nowIso,
          metadata: mergeMetadata(access.metadata, {
            lifecycle: "auto_expired_on_read",
          }),
        })

        await txRepositories.events.create({
          receiptId: access.receiptId,
          accessId: access.accessId,
          type: "expired",
          happenedAt: access.expiredAt ?? nowIso,
          detail: buildReceiptEventDetail("expired", access.accessId),
          metadata: {
            lifecycle: "auto_expired_on_read",
          },
        })
      }

      await txRepositories.receipts.update(validatedReceiptId, {
        ...(aggregate.receipt.status === "issued"
          ? {
              status: "expired",
              expiredAt,
            }
          : {}),
        activeAccessId: null,
      })

    })

    const refreshedAggregate = await requireCommittedAggregate(
      validatedCompanyId,
      validatedReceiptId,
      "Digital receipt could not be reloaded after expiring stale accesses"
    )

    return sanitizeDigitalReceiptAggregate(refreshedAggregate)
  }

  async function getDigitalReceiptCreateDefaults(
    companyId: string,
    surgeryId: string
  ): Promise<ReceiptCreateDefaults> {
    const validatedCompanyId = validateDigitalReceiptCompanyId(companyId)
    const validatedSurgeryId = validateDigitalReceiptSurgeryId(surgeryId)
    const context = await resolveReceiptContext(validatedCompanyId, validatedSurgeryId)
    const patientName = normalizeString(context.surgery.patientDisplayName) ?? "Paciente"
    const patientDocument = normalizeString(context.surgery.patientDocumentNumber) ?? "DNI pendiente"
    const payerName = normalizeString(context.surgery.payerName)
    const procedureLabel = normalizeString(context.surgery.procedureLabel) ?? `Cirugía ${validatedSurgeryId}`
    const expedienteId = normalizeString(context.surgery.expedienteId)

    return {
      source: "backend_context",
      surgeryId: validatedSurgeryId,
      companyName: normalizeString(context.emitter.legalName) ?? normalizeString(context.emitter.displayName) ?? `Company ${validatedCompanyId}`,
      issuerArea: normalizeString(context.emitter.branchName) ?? "Backoffice OSSUM COR",
      expedienteLabel: expedienteId ? `Expediente ${expedienteId} · ${procedureLabel}` : `Expediente · ${procedureLabel}`,
      patient: {
        name: patientName,
        document: patientDocument,
        relationLabel: "Paciente",
      },
      payer: payerName
        ? {
            name: payerName,
            document: "DNI pendiente",
            relationLabel: "Pagador autorizado",
          }
        : undefined,
      defaultSignerRole: "patient",
      concept: `Recibo digital interno asociado a ${procedureLabel}`,
      notes:
        "La constancia refleja un cobro interno vinculado a esta cirugía. La firma pública deja evidencia del acceso emitido; no reemplaza comprobantes fiscales.",
      shareChannel: "Internal",
      expiresInHours: 72,
    }
  }

  async function listDigitalReceipts(filters: ListDigitalReceiptsFilters) {
    const validatedFilters = validateListDigitalReceiptsFilters(filters)
    const repositories = createDigitalReceiptRepositories(prismaClient)

    return repositories.receipts.list(validatedFilters)
  }

  async function reissueDigitalReceiptAccess(
    input: ReissueDigitalReceiptAccessInput
  ): Promise<ReissueDigitalReceiptAccessResult> {
    const validatedInput = validateReissueDigitalReceiptAccessInput(input)
    const aggregate = await requireAggregate(validatedInput.companyId, validatedInput.receiptId)

    assertReceiptCanReissueAccess(aggregate.receipt)

    const signer = resolveSigner(aggregate.receipt, validatedInput.signerRole, validatedInput.signerId)
    const nowIso = getCurrentIso(now)
    const accessResult = reissueDigitalReceiptAccessDraft({
      receiptId: aggregate.receipt.receiptId,
      accesses: aggregate.accesses,
      signerRole: signer.role,
      signerId: signer.signerId,
      expiresAt: validatedInput.expiresAt,
      channel: validatedInput.channel,
      recipientEmail: validatedInput.recipientEmail ?? signer.email,
      recipientPhone: validatedInput.recipientPhone,
      metadata: validatedInput.metadata,
      nowIso,
    })

    const reissueResult = await prismaClient.$transaction(async (tx) => {
      const txRepositories = createDigitalReceiptRepositories(tx)
      const timeline = createDigitalReceiptTimelineRecorder(txRepositories.events)
      const audit = createDigitalReceiptTechnicalAuditRecorder(tx)
      const deliveryIntent = buildDigitalReceiptDeliveryIntent({
        access: accessResult.draft,
        requestedAt: nowIso,
        trigger: "reissue",
      })
      const deliveryEventMetadata = buildDeliveryIntentEventMetadata(deliveryIntent)
      const accessMetadataWithDelivery = appendDeliveryIntentMetadata(
        accessResult.draft.metadata,
        deliveryIntent
      )
      const receiptMetadataWithDelivery = appendDeliveryIntentMetadata(
        mergeMetadata(aggregate.receipt.metadata, validatedInput.metadata),
        deliveryIntent
      )

      for (const patch of accessResult.deactivatedAccesses) {
        await txRepositories.accesses.update(patch.accessId, {
          status: patch.status,
          expiredAt: patch.expiredAt ?? null,
          revokedAt: patch.revokedAt ?? null,
          supersededByAccessId: patch.supersededByAccessId ?? null,
          metadata: patch.metadata,
        })

        if (patch.status === "revoked") {
          await timeline.recordAccessRevoked({
            receiptId: aggregate.receipt.receiptId,
            accessId: patch.accessId,
            companyId: aggregate.receipt.companyId,
            surgeryId: aggregate.receipt.surgeryId,
            receiptNumber: aggregate.receipt.receiptNumber,
            happenedAt: patch.revokedAt ?? nowIso,
            actor: validatedInput.actor,
            reason: "superseded_by_new_access",
            previousStatus: "active",
            metadata: patch.metadata,
          })

          await audit.recordAccessRevoked({
            companyId: aggregate.receipt.companyId,
            surgeryId: aggregate.receipt.surgeryId,
            receiptId: aggregate.receipt.receiptId,
            receiptNumber: aggregate.receipt.receiptNumber,
            actor: validatedInput.actor,
            accessId: patch.accessId,
            reason: "superseded_by_new_access",
            previousStatus: "active",
            metadata: patch.metadata,
          })
        } else {
          await txRepositories.events.create({
            receiptId: aggregate.receipt.receiptId,
            accessId: patch.accessId,
            type: "expired",
            happenedAt: patch.expiredAt ?? nowIso,
            actor: validatedInput.actor,
            detail: buildReceiptEventDetail("expired", patch.accessId),
            metadata: patch.metadata,
          })
        }
      }

      await txRepositories.accesses.create({
        ...accessResult.draft,
        metadata: accessMetadataWithDelivery,
      })

      await txRepositories.receipts.update(aggregate.receipt.receiptId, {
        latestAccessVersion: accessResult.receiptPatch.latestAccessVersion,
        activeAccessId: accessResult.receiptPatch.activeAccessId ?? null,
        currentSignerRole: signer.role,
        metadata: receiptMetadataWithDelivery,
      })

      await timeline.recordAccessReissued({
        receiptId: aggregate.receipt.receiptId,
        accessId: accessResult.draft.accessId,
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptNumber: aggregate.receipt.receiptNumber,
        happenedAt: accessResult.draft.issuedAt,
        actor: validatedInput.actor,
        accessVersion: accessResult.draft.version,
        signerRole: accessResult.draft.signerRole,
        previousAccessId: accessResult.deactivatedAccesses.find(
          (candidate) => candidate.status === "revoked" && candidate.supersededByAccessId === accessResult.draft.accessId
        )?.accessId,
        channel: accessResult.draft.channel,
        recipientEmail: accessResult.draft.recipientEmail,
        recipientPhone: accessResult.draft.recipientPhone,
        tokenLastFour: accessResult.draft.tokenLastFour,
        metadata: mergeMetadata(
          sanitizeDigitalReceiptEventMetadata(validatedInput.metadata),
          deliveryEventMetadata
        ),
      })

      await audit.recordAccessReissued({
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptId: aggregate.receipt.receiptId,
        receiptNumber: aggregate.receipt.receiptNumber,
        actor: validatedInput.actor,
        accessId: accessResult.draft.accessId,
        accessVersion: accessResult.draft.version,
        signerRole: accessResult.draft.signerRole,
        previousAccessId: accessResult.deactivatedAccesses.find(
          (candidate) => candidate.status === "revoked" && candidate.supersededByAccessId === accessResult.draft.accessId
        )?.accessId,
        tokenLastFour: accessResult.draft.tokenLastFour,
        channel: accessResult.draft.channel,
        metadata: mergeMetadata(validatedInput.metadata, deliveryEventMetadata),
      })

      return {
        receiptId: aggregate.receipt.receiptId,
        accessId: accessResult.draft.accessId,
        accessToken: accessResult.token,
      }
    })

    const detail = sanitizeDigitalReceiptAggregate(
      await requireCommittedAggregate(
        validatedInput.companyId,
        reissueResult.receiptId,
        "Digital receipt could not be reloaded after reissue"
      )
    )
    const reissuedAccessDetail = detail.accesses.find((access) => access.accessId === reissueResult.accessId)

    if (!reissuedAccessDetail) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_event_invalid",
        "Digital receipt reissued access disappeared after delivery intent persistence",
        { companyId: validatedInput.companyId, receiptId: reissueResult.receiptId }
      )
    }

    return {
      detail,
      access: reissuedAccessDetail,
      accessToken: reissueResult.accessToken,
    }
  }

  async function revokeDigitalReceiptAccess(input: RevokeDigitalReceiptAccessInput) {
    const validatedInput = validateRevokeDigitalReceiptAccessInput(input)
    const aggregate = await requireAggregate(validatedInput.companyId, validatedInput.receiptId)
    const access = aggregate.accesses.find((candidate) => candidate.accessId === validatedInput.accessId)

    if (!access) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_access_not_found",
        "Digital receipt access was not found",
        {
          companyId: validatedInput.companyId,
          receiptId: validatedInput.receiptId,
          accessId: validatedInput.accessId,
        }
      )
    }

    const nowIso = getCurrentIso(now)
    const transition = revokeDigitalReceiptAccessTransition({
      access,
      nowIso,
      metadata: mergeMetadata(validatedInput.metadata, validatedInput.reason ? { reason: validatedInput.reason } : undefined),
    })

    await prismaClient.$transaction(async (tx) => {
      const txRepositories = createDigitalReceiptRepositories(tx)
      const timeline = createDigitalReceiptTimelineRecorder(txRepositories.events)
      const audit = createDigitalReceiptTechnicalAuditRecorder(tx)

      await txRepositories.accesses.update(access.accessId, {
        status: transition.patch.status,
        revokedAt: transition.patch.revokedAt ?? null,
        metadata: transition.patch.metadata,
      })

      await txRepositories.receipts.update(aggregate.receipt.receiptId, {
        latestAccessVersion: transition.receiptPatch.latestAccessVersion,
        activeAccessId: transition.receiptPatch.activeAccessId ?? null,
      })

      await timeline.recordAccessRevoked({
        receiptId: aggregate.receipt.receiptId,
        accessId: access.accessId,
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptNumber: aggregate.receipt.receiptNumber,
        happenedAt: transition.patch.revokedAt ?? nowIso,
        actor: validatedInput.actor,
        reason: validatedInput.reason,
        previousStatus: access.status,
        metadata: transition.patch.metadata,
      })

      await audit.recordAccessRevoked({
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptId: aggregate.receipt.receiptId,
        receiptNumber: aggregate.receipt.receiptNumber,
        actor: validatedInput.actor,
        accessId: access.accessId,
        reason: validatedInput.reason,
        previousStatus: access.status,
        metadata: transition.patch.metadata,
      })

    })

    const detail = await requireCommittedAggregate(
      validatedInput.companyId,
      aggregate.receipt.receiptId,
      "Digital receipt could not be reloaded after access revoke"
    )

    return sanitizeDigitalReceiptAggregate(detail)
  }

  async function revokeDigitalReceipt(input: RevokeDigitalReceiptInput) {
    const validatedInput = validateRevokeDigitalReceiptInput(input)
    const aggregate = await requireAggregate(validatedInput.companyId, validatedInput.receiptId)

    assertReceiptCanRevoke(aggregate.receipt)

    const nowIso = getCurrentIso(now)
    const activeAccesses = aggregate.accesses.filter((access) => access.status === "active")
    const revokeMetadata = mergeMetadata(
      validatedInput.metadata,
      validatedInput.reason ? { reason: validatedInput.reason } : undefined,
      { lifecycle: "receipt_revoked" }
    )

    await prismaClient.$transaction(async (tx) => {
      const txRepositories = createDigitalReceiptRepositories(tx)
      const timeline = createDigitalReceiptTimelineRecorder(txRepositories.events)
      const audit = createDigitalReceiptTechnicalAuditRecorder(tx)

      for (const access of activeAccesses) {
        const transition = revokeDigitalReceiptAccessTransition({
          access,
          nowIso,
          metadata: mergeMetadata(access.metadata, revokeMetadata),
        })

        await txRepositories.accesses.update(access.accessId, {
          status: transition.patch.status,
          revokedAt: transition.patch.revokedAt ?? null,
          metadata: transition.patch.metadata,
        })

        await timeline.recordAccessRevoked({
          receiptId: aggregate.receipt.receiptId,
          accessId: access.accessId,
          companyId: aggregate.receipt.companyId,
          surgeryId: aggregate.receipt.surgeryId,
          receiptNumber: aggregate.receipt.receiptNumber,
          happenedAt: transition.patch.revokedAt ?? nowIso,
          actor: validatedInput.actor,
          reason: validatedInput.reason ?? "receipt_revoked",
          previousStatus: access.status,
          metadata: transition.patch.metadata,
        })

        await audit.recordAccessRevoked({
          companyId: aggregate.receipt.companyId,
          surgeryId: aggregate.receipt.surgeryId,
          receiptId: aggregate.receipt.receiptId,
          receiptNumber: aggregate.receipt.receiptNumber,
          actor: validatedInput.actor,
          accessId: access.accessId,
          reason: validatedInput.reason ?? "receipt_revoked",
          previousStatus: access.status,
          metadata: transition.patch.metadata,
        })
      }

      await txRepositories.receipts.update(aggregate.receipt.receiptId, {
        status: "revoked",
        revokedAt: nowIso,
        activeAccessId: null,
        metadata: mergeMetadata(aggregate.receipt.metadata, revokeMetadata),
      })

      await timeline.recordReceiptRevoked({
        receiptId: aggregate.receipt.receiptId,
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptNumber: aggregate.receipt.receiptNumber,
        happenedAt: nowIso,
        actor: validatedInput.actor,
        reason: validatedInput.reason,
        previousStatus: aggregate.receipt.status,
        metadata: sanitizeDigitalReceiptEventMetadata(revokeMetadata),
      })

      await audit.recordReceiptRevoked({
        companyId: aggregate.receipt.companyId,
        surgeryId: aggregate.receipt.surgeryId,
        receiptId: aggregate.receipt.receiptId,
        receiptNumber: aggregate.receipt.receiptNumber,
        actor: validatedInput.actor,
        reason: validatedInput.reason,
        previousStatus: aggregate.receipt.status,
        metadata: revokeMetadata,
      })

    })

    const detail = await requireCommittedAggregate(
      validatedInput.companyId,
      aggregate.receipt.receiptId,
      "Digital receipt could not be reloaded after revoke"
    )

    return sanitizeDigitalReceiptAggregate(detail)
  }

  return {
    createDigitalReceiptDraft,
    getDigitalReceiptCreateDefaults,
    issueDigitalReceipt,
    getDigitalReceiptDetail,
    listDigitalReceipts,
    reissueDigitalReceiptAccess,
    revokeDigitalReceipt,
    revokeDigitalReceiptAccess,
  }
}

export const digitalReceiptService = createDigitalReceiptService()
