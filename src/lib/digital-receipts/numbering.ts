export const DIGITAL_RECEIPT_NUMBER_PREFIX = "RD"
export const DIGITAL_RECEIPT_COMPANY_SERIES_LENGTH = 4
export const DIGITAL_RECEIPT_SEQUENCE_LENGTH = 9

const DIGITAL_RECEIPT_NUMBER_REGEX = new RegExp(
  `^(?<prefix>[A-Z]{2})-(?<companySeries>\\d{${DIGITAL_RECEIPT_COMPANY_SERIES_LENGTH}})-(?<sequence>\\d{${DIGITAL_RECEIPT_SEQUENCE_LENGTH}})$`
)

export type DigitalReceiptNumberParts = {
  prefix: string
  companySeries: string
  sequence: string
}

export type BuildDigitalReceiptNumberInput = {
  companySeries: string | number
  sequence: string | number
  prefix?: string
}

export type ParsedDigitalReceiptNumber = DigitalReceiptNumberParts & {
  value: string
  sequenceValue: number
}

export type PlanNextDigitalReceiptNumberInput = {
  companyId: string
  companySeries: string | number
  lastSequence?: string | number | null
  prefix?: string
}

export type PlannedDigitalReceiptNumber = ParsedDigitalReceiptNumber & {
  companyId: string
  scopeKey: string
  nextSequence: number
}

function normalizeDigits(value: string | number, fieldName: string): string {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${fieldName} must be a positive integer`)
    }

    return String(value)
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    throw new Error(`${fieldName} is required`)
  }

  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error(`${fieldName} must contain digits only`)
  }

  return normalizedValue
}

function padNumericSegment(rawValue: string | number, length: number, fieldName: string): string {
  const normalizedValue = normalizeDigits(rawValue, fieldName)

  if (normalizedValue.length > length) {
    throw new Error(`${fieldName} must be at most ${length} digits`)
  }

  return normalizedValue.padStart(length, "0")
}

export function normalizeDigitalReceiptNumberPrefix(prefix = DIGITAL_RECEIPT_NUMBER_PREFIX): string {
  const normalizedPrefix = prefix.trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(normalizedPrefix)) {
    throw new Error("receipt number prefix must contain exactly 2 letters")
  }

  return normalizedPrefix
}

export function normalizeDigitalReceiptCompanySeries(companySeries: string | number): string {
  return padNumericSegment(
    companySeries,
    DIGITAL_RECEIPT_COMPANY_SERIES_LENGTH,
    "companySeries"
  )
}

export function normalizeDigitalReceiptSequence(sequence: string | number): string {
  return padNumericSegment(sequence, DIGITAL_RECEIPT_SEQUENCE_LENGTH, "sequence")
}

export function buildDigitalReceiptNumber(input: BuildDigitalReceiptNumberInput): string {
  const prefix = normalizeDigitalReceiptNumberPrefix(input.prefix)
  const companySeries = normalizeDigitalReceiptCompanySeries(input.companySeries)
  const sequence = normalizeDigitalReceiptSequence(input.sequence)

  return `${prefix}-${companySeries}-${sequence}`
}

export function parseDigitalReceiptNumber(value: string): ParsedDigitalReceiptNumber | null {
  const normalizedValue = value.trim().toUpperCase()
  const match = DIGITAL_RECEIPT_NUMBER_REGEX.exec(normalizedValue)

  if (!match?.groups) {
    return null
  }

  const { prefix, companySeries, sequence } = match.groups

  return {
    value: normalizedValue,
    prefix,
    companySeries,
    sequence,
    sequenceValue: Number.parseInt(sequence, 10),
  }
}

export function isDigitalReceiptNumber(value: string): boolean {
  return parseDigitalReceiptNumber(value) !== null
}

export function createDigitalReceiptSequenceScopeKey(companyId: string): string {
  const normalizedCompanyId = companyId.trim()

  if (normalizedCompanyId.length === 0) {
    throw new Error("companyId is required")
  }

  return `digital-receipt:${normalizedCompanyId}`
}

export function getNextDigitalReceiptSequence(lastSequence?: string | number | null): number {
  if (lastSequence === undefined || lastSequence === null) {
    return 1
  }

  const normalizedSequence = normalizeDigits(lastSequence, "lastSequence")
  const nextSequence = Number.parseInt(normalizedSequence, 10) + 1

  if (String(nextSequence).length > DIGITAL_RECEIPT_SEQUENCE_LENGTH) {
    throw new Error("digital receipt sequence exceeded supported length")
  }

  return nextSequence
}

export function planNextDigitalReceiptNumber(
  input: PlanNextDigitalReceiptNumberInput
): PlannedDigitalReceiptNumber {
  const nextSequence = getNextDigitalReceiptSequence(input.lastSequence)
  const value = buildDigitalReceiptNumber({
    prefix: input.prefix,
    companySeries: input.companySeries,
    sequence: nextSequence,
  })

  const parsedValue = parseDigitalReceiptNumber(value)
  if (!parsedValue) {
    throw new Error("failed to parse planned digital receipt number")
  }

  return {
    ...parsedValue,
    companyId: input.companyId.trim(),
    scopeKey: createDigitalReceiptSequenceScopeKey(input.companyId),
    nextSequence,
  }
}
