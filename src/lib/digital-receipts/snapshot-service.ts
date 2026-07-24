import { createHash } from "node:crypto"

import { createDigitalReceiptDomainError } from "./errors"
import { parseDigitalReceiptNumber } from "./numbering"
import type {
  DigitalReceipt,
  DigitalReceiptActorRef,
  DigitalReceiptAuditMetadata,
  DigitalReceiptSigner,
  DigitalReceiptSignerRole,
} from "./types"

export const DIGITAL_RECEIPT_SNAPSHOT_SCHEMA = "digital_receipt_issued"
export const DIGITAL_RECEIPT_SNAPSHOT_PAYLOAD_VERSION = 1 as const

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

type ReceiptSnapshotBase = Pick<
  DigitalReceipt,
  | "receiptId"
  | "companyId"
  | "surgeryId"
  | "receiptNumber"
  | "status"
  | "issuedAt"
  | "issuedBy"
  | "currentSignerRole"
  | "signers"
>

export type DigitalReceiptSnapshotEmitter = {
  companyId?: string
  displayName: string
  legalName?: string
  taxId?: string
  branchName?: string
  address?: string
  city?: string
  province?: string
  country?: string
  phone?: string
  email?: string
}

export type DigitalReceiptSnapshotSurgeryContext = {
  surgeryId?: string
  expedienteId?: string
  visibleNumber?: string
  patientId?: string
  patientDisplayName?: string
  patientDocumentNumber?: string
  procedureLabel?: string
  procedureDate?: string
  description?: string
  surgeryDate?: string
  scheduledDate?: string
  probableDate?: string
  facilityName?: string
  surgeonDisplayName?: string
  payerName?: string
  notes?: string
}

export type DigitalReceiptSnapshotConcept = {
  code?: string
  label: string
  description?: string
  quantity?: number
  unitAmount?: number
  amount: number
}

export type DigitalReceiptSnapshotAmount = {
  currency: string
  subtotal?: number
  discounts?: number
  taxes?: number
  total: number
  paidAmount?: number
  balanceAmount?: number
}

export type DigitalReceiptSnapshotLegalMetadata = {
  disclaimer?: string
  jurisdiction?: string
  issuePlace?: string
  signatureMode?: string
  signatureProvider?: string
  regulatoryReferences?: string[]
  termsVersion?: string
}

export type DigitalReceiptIssuedSnapshotPayload = {
  schema: typeof DIGITAL_RECEIPT_SNAPSHOT_SCHEMA
  version: typeof DIGITAL_RECEIPT_SNAPSHOT_PAYLOAD_VERSION
  capturedAt: string
  receipt: {
    receiptId: string
    companyId: string
    surgeryId: string
    receiptNumber: string
    status: DigitalReceipt["status"]
    issuedAt: string
    issuedBy?: DigitalReceiptActorRef
    currentSignerRole: DigitalReceiptSignerRole
  }
  emitter: DigitalReceiptSnapshotEmitter
  signer: DigitalReceiptSigner
  signers: DigitalReceiptSigner[]
  surgery?: DigitalReceiptSnapshotSurgeryContext
  concepts: DigitalReceiptSnapshotConcept[]
  amount: DigitalReceiptSnapshotAmount
  numbering: {
    value: string
    prefix?: string
    companySeries?: string
    sequence?: string
    sequenceValue?: number
  }
  legal?: DigitalReceiptSnapshotLegalMetadata
  metadata?: DigitalReceiptAuditMetadata
}

export type BuildDigitalReceiptIssuedSnapshotPayloadInput = {
  receipt: ReceiptSnapshotBase
  emitter: DigitalReceiptSnapshotEmitter
  signerId?: string
  signerRole?: DigitalReceiptSignerRole
  surgery?: DigitalReceiptSnapshotSurgeryContext
  concepts: DigitalReceiptSnapshotConcept[]
  amount: DigitalReceiptSnapshotAmount
  legal?: DigitalReceiptSnapshotLegalMetadata
  metadata?: DigitalReceiptAuditMetadata
  capturedAt?: string
}

export type BuildDigitalReceiptSnapshotDraftInput = BuildDigitalReceiptIssuedSnapshotPayloadInput & {
  snapshotVersion: number
  capturedBy?: DigitalReceiptActorRef
  snapshotMetadata?: DigitalReceiptAuditMetadata
}

export type DigitalReceiptSnapshotDraft = {
  receiptId: string
  version: number
  capturedAt: string
  capturedBy?: DigitalReceiptActorRef
  checksum: string
  payload: DigitalReceiptIssuedSnapshotPayload
  metadata?: DigitalReceiptAuditMetadata
}

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

function normalizeNumber(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`)
  }

  return value
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T
}

function cloneJsonValue<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function sortJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<{ [key: string]: JsonValue }>((accumulator, key) => {
        accumulator[key] = sortJsonValue(value[key])
        return accumulator
      }, {})
  }

  return value
}

function createSnapshotChecksum(payload: DigitalReceiptIssuedSnapshotPayload): string {
  const stablePayload = JSON.stringify(sortJsonValue(payload as JsonValue))
  return createHash("sha256").update(stablePayload).digest("hex")
}

function normalizeSigner(signer: DigitalReceiptSigner): DigitalReceiptSigner {
  return compactObject({
    signerId: signer.signerId.trim(),
    role: signer.role,
    displayName: signer.displayName.trim(),
    documentNumber: normalizeString(signer.documentNumber),
    email: normalizeString(signer.email),
    relationshipLabel: normalizeString(signer.relationshipLabel),
  }) as DigitalReceiptSigner
}

function selectSnapshotSigner(
  receipt: ReceiptSnapshotBase,
  signerId?: string,
  signerRole?: DigitalReceiptSignerRole
): DigitalReceiptSigner {
  const normalizedSignerId = normalizeString(signerId)
  const resolvedSignerRole = signerRole ?? receipt.currentSignerRole

  const selectedSigner = receipt.signers.find((candidate) => {
    if (normalizedSignerId && candidate.signerId === normalizedSignerId) {
      return true
    }

    if (!normalizedSignerId && candidate.role === resolvedSignerRole) {
      return true
    }

    return false
  })

  if (!selectedSigner) {
    throw createDigitalReceiptDomainError(
      "digital_receipt_signer_missing",
      "Digital receipt snapshot requires a concrete signer",
      {
        receiptId: receipt.receiptId,
        signerId: normalizedSignerId,
        signerRole: resolvedSignerRole,
      }
    )
  }

  return normalizeSigner(selectedSigner)
}

function normalizeEmitter(input: DigitalReceiptSnapshotEmitter): DigitalReceiptSnapshotEmitter {
  return compactObject({
    companyId: normalizeString(input.companyId),
    displayName: input.displayName.trim(),
    legalName: normalizeString(input.legalName),
    taxId: normalizeString(input.taxId),
    branchName: normalizeString(input.branchName),
    address: normalizeString(input.address),
    city: normalizeString(input.city),
    province: normalizeString(input.province),
    country: normalizeString(input.country),
    phone: normalizeString(input.phone),
    email: normalizeString(input.email),
  }) as DigitalReceiptSnapshotEmitter
}

function normalizeSurgeryContext(
  input: DigitalReceiptSnapshotSurgeryContext | undefined
): DigitalReceiptSnapshotSurgeryContext | undefined {
  if (!input) {
    return undefined
  }

  return compactObject({
    surgeryId: normalizeString(input.surgeryId),
    expedienteId: normalizeString(input.expedienteId),
    visibleNumber: normalizeString(input.visibleNumber),
    patientId: normalizeString(input.patientId),
    patientDisplayName: normalizeString(input.patientDisplayName),
    patientDocumentNumber: normalizeString(input.patientDocumentNumber),
    procedureLabel: normalizeString(input.procedureLabel),
    procedureDate: normalizeIsoString(input.procedureDate, "surgery.procedureDate"),
    description: normalizeString(input.description),
    surgeryDate: normalizeIsoString(input.surgeryDate, "surgery.surgeryDate"),
    scheduledDate: normalizeIsoString(input.scheduledDate, "surgery.scheduledDate"),
    probableDate: normalizeIsoString(input.probableDate, "surgery.probableDate"),
    facilityName: normalizeString(input.facilityName),
    surgeonDisplayName: normalizeString(input.surgeonDisplayName),
    payerName: normalizeString(input.payerName),
    notes: normalizeString(input.notes),
  }) as DigitalReceiptSnapshotSurgeryContext
}

function normalizeConcept(concept: DigitalReceiptSnapshotConcept, index: number): DigitalReceiptSnapshotConcept {
  const normalizedLabel = normalizeString(concept.label)
  if (!normalizedLabel) {
    throw new Error(`concepts[${index}].label is required`)
  }

  const normalizedAmount = normalizeNumber(concept.amount, `concepts[${index}].amount`)
  if (normalizedAmount === undefined) {
    throw new Error(`concepts[${index}].amount is required`)
  }

  return compactObject({
    code: normalizeString(concept.code),
    label: normalizedLabel,
    description: normalizeString(concept.description),
    quantity: normalizeNumber(concept.quantity, `concepts[${index}].quantity`),
    unitAmount: normalizeNumber(concept.unitAmount, `concepts[${index}].unitAmount`),
    amount: normalizedAmount,
  }) as DigitalReceiptSnapshotConcept
}

function normalizeAmount(input: DigitalReceiptSnapshotAmount): DigitalReceiptSnapshotAmount {
  const normalizedCurrency = normalizeString(input.currency)?.toUpperCase()
  if (!normalizedCurrency) {
    throw new Error("amount.currency is required")
  }

  const normalizedTotal = normalizeNumber(input.total, "amount.total")
  if (normalizedTotal === undefined) {
    throw new Error("amount.total is required")
  }

  return compactObject({
    currency: normalizedCurrency,
    subtotal: normalizeNumber(input.subtotal, "amount.subtotal"),
    discounts: normalizeNumber(input.discounts, "amount.discounts"),
    taxes: normalizeNumber(input.taxes, "amount.taxes"),
    total: normalizedTotal,
    paidAmount: normalizeNumber(input.paidAmount, "amount.paidAmount"),
    balanceAmount: normalizeNumber(input.balanceAmount, "amount.balanceAmount"),
  }) as DigitalReceiptSnapshotAmount
}

function normalizeLegalMetadata(
  input: DigitalReceiptSnapshotLegalMetadata | undefined
): DigitalReceiptSnapshotLegalMetadata | undefined {
  if (!input) {
    return undefined
  }

  return compactObject({
    disclaimer: normalizeString(input.disclaimer),
    jurisdiction: normalizeString(input.jurisdiction),
    issuePlace: normalizeString(input.issuePlace),
    signatureMode: normalizeString(input.signatureMode),
    signatureProvider: normalizeString(input.signatureProvider),
    regulatoryReferences: input.regulatoryReferences
      ?.map((reference) => normalizeString(reference))
      .filter((reference): reference is string => Boolean(reference)),
    termsVersion: normalizeString(input.termsVersion),
  }) as DigitalReceiptSnapshotLegalMetadata
}

function normalizeAuditMetadata(
  metadata: DigitalReceiptAuditMetadata | undefined
): DigitalReceiptAuditMetadata | undefined {
  if (!metadata) {
    return undefined
  }

  return cloneJsonValue(metadata as JsonValue) as DigitalReceiptAuditMetadata
}

export function buildDigitalReceiptIssuedSnapshotPayload(
  input: BuildDigitalReceiptIssuedSnapshotPayloadInput
): DigitalReceiptIssuedSnapshotPayload {
  const capturedAt = normalizeIsoString(input.capturedAt, "capturedAt") ?? new Date().toISOString()
  const numbering = parseDigitalReceiptNumber(input.receipt.receiptNumber)
  const resolvedSigner = selectSnapshotSigner(input.receipt, input.signerId, input.signerRole)

  return {
    schema: DIGITAL_RECEIPT_SNAPSHOT_SCHEMA,
    version: DIGITAL_RECEIPT_SNAPSHOT_PAYLOAD_VERSION,
    capturedAt,
    receipt: compactObject({
      receiptId: input.receipt.receiptId,
      companyId: input.receipt.companyId,
      surgeryId: input.receipt.surgeryId,
      receiptNumber: input.receipt.receiptNumber,
      status: input.receipt.status,
      issuedAt: normalizeIsoString(input.receipt.issuedAt, "receipt.issuedAt") ?? input.receipt.issuedAt,
      issuedBy: input.receipt.issuedBy ? normalizeAuditMetadata(input.receipt.issuedBy as DigitalReceiptAuditMetadata) as DigitalReceiptActorRef : undefined,
      currentSignerRole: input.receipt.currentSignerRole,
    }) as DigitalReceiptIssuedSnapshotPayload["receipt"],
    emitter: normalizeEmitter(input.emitter),
    signer: resolvedSigner,
    signers: input.receipt.signers.map(normalizeSigner),
    surgery: normalizeSurgeryContext(input.surgery),
    concepts: input.concepts.map(normalizeConcept),
    amount: normalizeAmount(input.amount),
    numbering: compactObject({
      value: input.receipt.receiptNumber,
      prefix: numbering?.prefix,
      companySeries: numbering?.companySeries,
      sequence: numbering?.sequence,
      sequenceValue: numbering?.sequenceValue,
    }),
    legal: normalizeLegalMetadata(input.legal),
    metadata: normalizeAuditMetadata(input.metadata),
  }
}

export function buildDigitalReceiptSnapshotDraft(
  input: BuildDigitalReceiptSnapshotDraftInput
): DigitalReceiptSnapshotDraft {
  const payload = buildDigitalReceiptIssuedSnapshotPayload(input)

  return compactObject({
    receiptId: input.receipt.receiptId,
    version: input.snapshotVersion,
    capturedAt: payload.capturedAt,
    capturedBy: input.capturedBy
      ? (normalizeAuditMetadata(input.capturedBy as DigitalReceiptAuditMetadata) as DigitalReceiptActorRef)
      : undefined,
    checksum: createSnapshotChecksum(payload),
    payload,
    metadata: normalizeAuditMetadata(input.snapshotMetadata),
  }) as DigitalReceiptSnapshotDraft
}
