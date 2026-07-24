import { badRequest } from "../api/errors"
import type {
  CreateDigitalReceiptDraftInput,
  DigitalReceiptDraftSignerInput,
  IssueDigitalReceiptInput,
  ListDigitalReceiptsFilters,
  ReissueDigitalReceiptAccessInput,
  RevokeDigitalReceiptAccessInput,
  RevokeDigitalReceiptInput,
} from "./contracts"
import {
  DIGITAL_RECEIPT_ACCESS_STATUSES,
  DIGITAL_RECEIPT_SIGNER_ROLES,
  DIGITAL_RECEIPT_STATUSES,
  type DigitalReceiptAccessStatus,
  type DigitalReceiptDeliveryChannel,
  type DigitalReceiptSignerRole,
  type DigitalReceiptStatus,
} from "./types"

const DIGITAL_RECEIPT_DELIVERY_CHANNELS = ["whatsapp", "email", "sms", "internal"] as const satisfies readonly DigitalReceiptDeliveryChannel[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function normalizeDigitalReceiptString(value: string): string {
  return value.trim()
}

function validateRequiredString(value: unknown, fieldName: string, code: string): string {
  if (typeof value !== "string") {
    throw badRequest(`${fieldName} is required`, code)
  }

  const normalizedValue = normalizeDigitalReceiptString(value)
  if (normalizedValue.length === 0) {
    throw badRequest(`${fieldName} is required`, code)
  }

  return normalizedValue
}

function validateOptionalString(value: unknown, fieldName: string, code: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== "string") {
    throw badRequest(`${fieldName} must be a non-empty string when provided`, code)
  }

  const normalizedValue = normalizeDigitalReceiptString(value)
  if (normalizedValue.length === 0) {
    throw badRequest(`${fieldName} must be a non-empty string when provided`, code)
  }

  return normalizedValue
}

function validateOptionalRecord(value: unknown, fieldName: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!isRecord(value)) {
    throw badRequest(`${fieldName} must be a JSON object when provided`, `invalid_${fieldName}`)
  }

  return value
}

function validateOptionalActor(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!isRecord(value)) {
    throw badRequest("actor must be a JSON object when provided", "invalid_actor")
  }

  return value
}

function isDigitalReceiptStatus(value: string): value is DigitalReceiptStatus {
  return DIGITAL_RECEIPT_STATUSES.includes(value as DigitalReceiptStatus)
}

function isDigitalReceiptAccessStatus(value: string): value is DigitalReceiptAccessStatus {
  return DIGITAL_RECEIPT_ACCESS_STATUSES.includes(value as DigitalReceiptAccessStatus)
}

function isDigitalReceiptSignerRole(value: string): value is DigitalReceiptSignerRole {
  return DIGITAL_RECEIPT_SIGNER_ROLES.includes(value as DigitalReceiptSignerRole)
}

function isDigitalReceiptDeliveryChannel(value: string): value is DigitalReceiptDeliveryChannel {
  return DIGITAL_RECEIPT_DELIVERY_CHANNELS.includes(value as DigitalReceiptDeliveryChannel)
}

export function validateDigitalReceiptCompanyId(value: unknown): string {
  return validateRequiredString(value, "companyId", "missing_company_id")
}

export function validateDigitalReceiptSurgeryId(value: unknown): string {
  return validateRequiredString(value, "surgeryId", "missing_surgery_id")
}

export function validateDigitalReceiptId(value: unknown, fieldName: "receiptId" | "accessId"): string {
  return validateRequiredString(value, fieldName, `missing_${fieldName}`)
}

export function validateDigitalReceiptSignerRole(value: unknown): DigitalReceiptSignerRole {
  const signerRole = validateRequiredString(value, "signerRole", "missing_signer_role")

  if (!isDigitalReceiptSignerRole(signerRole)) {
    throw badRequest(
      `signerRole must be one of: ${DIGITAL_RECEIPT_SIGNER_ROLES.join(", ")}`,
      "invalid_signer_role"
    )
  }

  return signerRole
}

export function validateDigitalReceiptExpiration(
  value: unknown,
  fieldName = "expiresAt",
  options?: { allowPast?: boolean }
): string | undefined {
  const expiresAt = validateOptionalString(value, fieldName, `invalid_${fieldName}`)
  if (expiresAt === undefined) {
    return undefined
  }

  const expiresAtDate = new Date(expiresAt)
  if (Number.isNaN(expiresAtDate.getTime())) {
    throw badRequest(`${fieldName} must be a valid ISO date`, `invalid_${fieldName}`)
  }

  if (!options?.allowPast && expiresAtDate.getTime() <= Date.now()) {
    throw badRequest(`${fieldName} must be in the future`, `invalid_${fieldName}`)
  }

  return expiresAtDate.toISOString()
}

export function validateDigitalReceiptConcept(value: unknown): string {
  return validateRequiredString(value, "concept", "missing_concept")
}

export function validateDigitalReceiptAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw badRequest("amount must be a valid number greater than 0", "invalid_amount")
  }

  return value
}

export function validateDigitalReceiptSigner(value: unknown, index = 0): DigitalReceiptDraftSignerInput {
  if (!isRecord(value)) {
    throw badRequest(`signers[${index}] must be a JSON object`, "invalid_signer")
  }

  return {
    signerId: validateRequiredString(value.signerId, `signers[${index}].signerId`, "missing_signer_id"),
    role: validateDigitalReceiptSignerRole(value.role),
    displayName: validateRequiredString(value.displayName, `signers[${index}].displayName`, "missing_signer_display_name"),
    documentNumber: validateOptionalString(value.documentNumber, `signers[${index}].documentNumber`, "invalid_signer_document_number"),
    email: validateOptionalString(value.email, `signers[${index}].email`, "invalid_signer_email"),
    relationshipLabel: validateOptionalString(
      value.relationshipLabel,
      `signers[${index}].relationshipLabel`,
      "invalid_signer_relationship_label"
    ),
  }
}

export function validateDigitalReceiptSigners(value: unknown): DigitalReceiptDraftSignerInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw badRequest("signers must contain at least one signer", "missing_signers")
  }

  return value.map((signer, index) => validateDigitalReceiptSigner(signer, index))
}

function validateOptionalReceiptStatus(value: unknown): DigitalReceiptStatus | undefined {
  const status = validateOptionalString(value, "status", "invalid_status")
  if (status === undefined) {
    return undefined
  }

  if (!isDigitalReceiptStatus(status)) {
    throw badRequest(
      `status must be one of: ${DIGITAL_RECEIPT_STATUSES.join(", ")}`,
      "invalid_status"
    )
  }

  return status
}

function validateOptionalAccessStatus(value: unknown): DigitalReceiptAccessStatus | undefined {
  const accessStatus = validateOptionalString(value, "accessStatus", "invalid_access_status")
  if (accessStatus === undefined) {
    return undefined
  }

  if (!isDigitalReceiptAccessStatus(accessStatus)) {
    throw badRequest(
      `accessStatus must be one of: ${DIGITAL_RECEIPT_ACCESS_STATUSES.join(", ")}`,
      "invalid_access_status"
    )
  }

  return accessStatus
}

function validateOptionalDeliveryChannel(value: unknown): DigitalReceiptDeliveryChannel | undefined {
  const channel = validateOptionalString(value, "channel", "invalid_channel")
  if (channel === undefined) {
    return undefined
  }

  if (!isDigitalReceiptDeliveryChannel(channel)) {
    throw badRequest(
      `channel must be one of: ${DIGITAL_RECEIPT_DELIVERY_CHANNELS.join(", ")}`,
      "invalid_channel"
    )
  }

  return channel
}

export function validateCreateDigitalReceiptDraftInput(body: unknown): CreateDigitalReceiptDraftInput {
  if (!isRecord(body)) {
    throw badRequest("Request body must be a JSON object", "invalid_body")
  }

  const signers = validateDigitalReceiptSigners(body.signers)
  const currentSignerRole = validateDigitalReceiptSignerRole(body.currentSignerRole)

  if (!signers.some((signer) => signer.role === currentSignerRole)) {
    throw badRequest(
      "currentSignerRole must match one of the provided signers",
      "invalid_current_signer_role"
    )
  }

  return {
    companyId: validateDigitalReceiptCompanyId(body.companyId),
    surgeryId: validateDigitalReceiptSurgeryId(body.surgeryId),
    concept: validateDigitalReceiptConcept(body.concept),
    amount: validateDigitalReceiptAmount(body.amount),
    currentSignerRole,
    signers,
    expiresAt: validateDigitalReceiptExpiration(body.expiresAt),
    metadata: validateOptionalRecord(body.metadata, "metadata"),
  }
}

export function validateIssueDigitalReceiptInput(body: unknown): IssueDigitalReceiptInput {
  if (!isRecord(body)) {
    throw badRequest("Request body must be a JSON object", "invalid_body")
  }

  return {
    companyId: validateDigitalReceiptCompanyId(body.companyId),
    receiptId: validateDigitalReceiptId(body.receiptId, "receiptId"),
    signerRole:
      body.signerRole !== undefined ? validateDigitalReceiptSignerRole(body.signerRole) : undefined,
    signerId: validateOptionalString(body.signerId, "signerId", "invalid_signer_id"),
    expiresAt: validateDigitalReceiptExpiration(body.expiresAt),
    channel: validateOptionalDeliveryChannel(body.channel),
    recipientEmail: validateOptionalString(body.recipientEmail, "recipientEmail", "invalid_recipient_email"),
    recipientPhone: validateOptionalString(body.recipientPhone, "recipientPhone", "invalid_recipient_phone"),
    actor: validateOptionalActor(body.actor),
    metadata: validateOptionalRecord(body.metadata, "metadata"),
  }
}

export function validateRevokeDigitalReceiptInput(body: unknown): RevokeDigitalReceiptInput {
  if (!isRecord(body)) {
    throw badRequest("Request body must be a JSON object", "invalid_body")
  }

  return {
    companyId: validateDigitalReceiptCompanyId(body.companyId),
    receiptId: validateDigitalReceiptId(body.receiptId, "receiptId"),
    reason: validateOptionalString(body.reason, "reason", "invalid_reason"),
    actor: validateOptionalActor(body.actor),
    metadata: validateOptionalRecord(body.metadata, "metadata"),
  }
}

export function validateRevokeDigitalReceiptAccessInput(body: unknown): RevokeDigitalReceiptAccessInput {
  if (!isRecord(body)) {
    throw badRequest("Request body must be a JSON object", "invalid_body")
  }

  return {
    companyId: validateDigitalReceiptCompanyId(body.companyId),
    receiptId: validateDigitalReceiptId(body.receiptId, "receiptId"),
    accessId: validateDigitalReceiptId(body.accessId, "accessId"),
    reason: validateOptionalString(body.reason, "reason", "invalid_reason"),
    actor: validateOptionalActor(body.actor),
    metadata: validateOptionalRecord(body.metadata, "metadata"),
  }
}

export function validateReissueDigitalReceiptAccessInput(body: unknown): ReissueDigitalReceiptAccessInput {
  if (!isRecord(body)) {
    throw badRequest("Request body must be a JSON object", "invalid_body")
  }

  return {
    companyId: validateDigitalReceiptCompanyId(body.companyId),
    receiptId: validateDigitalReceiptId(body.receiptId, "receiptId"),
    signerRole: validateDigitalReceiptSignerRole(body.signerRole),
    signerId: validateOptionalString(body.signerId, "signerId", "invalid_signer_id"),
    expiresAt: validateDigitalReceiptExpiration(body.expiresAt),
    channel: validateOptionalDeliveryChannel(body.channel),
    recipientEmail: validateOptionalString(body.recipientEmail, "recipientEmail", "invalid_recipient_email"),
    recipientPhone: validateOptionalString(body.recipientPhone, "recipientPhone", "invalid_recipient_phone"),
    actor: validateOptionalActor(body.actor),
    metadata: validateOptionalRecord(body.metadata, "metadata"),
  }
}

export function validateListDigitalReceiptsFilters(input: unknown): ListDigitalReceiptsFilters {
  if (!isRecord(input)) {
    throw badRequest("Filters must be a JSON object", "invalid_filters")
  }

  const issuedFrom = validateDigitalReceiptExpiration(input.issuedFrom, "issuedFrom", { allowPast: true })
  const issuedTo = validateDigitalReceiptExpiration(input.issuedTo, "issuedTo", { allowPast: true })

  return {
    companyId: validateDigitalReceiptCompanyId(input.companyId),
    surgeryId: validateOptionalString(input.surgeryId, "surgeryId", "invalid_surgery_id"),
    receiptId: validateOptionalString(input.receiptId, "receiptId", "invalid_receipt_id"),
    status: validateOptionalReceiptStatus(input.status),
    accessStatus: validateOptionalAccessStatus(input.accessStatus),
    signerRole:
      input.signerRole !== undefined ? validateDigitalReceiptSignerRole(input.signerRole) : undefined,
    activeOnly: input.activeOnly === undefined ? undefined : Boolean(input.activeOnly),
    query: validateOptionalString(input.query, "query", "invalid_query"),
    issuedFrom,
    issuedTo,
  }
}
