export const DIGITAL_RECEIPT_DOMAIN_ERROR_CODES = [
  "digital_receipt_not_found",
  "digital_receipt_surgery_not_found",
  "digital_receipt_invalid_status_transition",
  "digital_receipt_invalid_signer_role",
  "digital_receipt_signer_mismatch",
  "digital_receipt_access_not_found",
  "digital_receipt_access_token_invalid",
  "digital_receipt_access_denied",
  "digital_receipt_access_consumed",
  "digital_receipt_access_expired",
  "digital_receipt_access_revoked",
  "digital_receipt_already_signed",
  "digital_receipt_already_expired",
  "digital_receipt_already_revoked",
  "digital_receipt_snapshot_missing",
  "digital_receipt_artifact_missing",
  "digital_receipt_signer_missing",
  "digital_receipt_event_invalid",
] as const

export type DigitalReceiptDomainErrorCode = (typeof DIGITAL_RECEIPT_DOMAIN_ERROR_CODES)[number]

export class DigitalReceiptDomainError extends Error {
  readonly code: DigitalReceiptDomainErrorCode
  readonly details?: Record<string, unknown>

  constructor(
    code: DigitalReceiptDomainErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "DigitalReceiptDomainError"
    this.code = code
    this.details = details
  }
}

export function createDigitalReceiptDomainError(
  code: DigitalReceiptDomainErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return new DigitalReceiptDomainError(code, message, details)
}

export function isDigitalReceiptDomainError(error: unknown): error is DigitalReceiptDomainError {
  return error instanceof DigitalReceiptDomainError
}
