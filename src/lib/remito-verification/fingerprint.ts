import { createHash } from "node:crypto"

import { normalizeRemitoLocator } from "@/lib/remito-identifiers"

const HEADER = Buffer.from("OSSUM-REMITO-PUBLIC-FINGERPRINT\0\n", "utf8")
const FINGERPRINT_VERSION = "RF1" as const
const MAX_SIGNED_INT = 2_147_483_647
const ASCII_PUNCTUATION_OR_WHITESPACE = /[\x09-\x0d\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/g

export type RemitoFingerprintInput = {
  issuerDisplayName: string
  issuerTaxId: string
  documentType: string
  issuedAt: Date
  remitoShortCode: string
  verificationVersion: number
}

function normalizeRequiredString(value: string, field: string): string {
  if (typeof value !== "string" || value.includes("\0")) {
    throw new TypeError(`${field} must be a null-free string`)
  }

  const normalized = value.normalize("NFC").replace(/\p{White_Space}+/gu, " ").trim()
  if (normalized.length === 0) throw new RangeError(`${field} must not be empty`)
  return normalized
}

function normalizeIssuerTaxId(value: string): string {
  const normalized = normalizeRequiredString(value, "issuerTaxId").replace(
    ASCII_PUNCTUATION_OR_WHITESPACE,
    "",
  )
  if (!/^[0-9]+$/.test(normalized)) {
    throw new RangeError("issuerTaxId must normalize to non-empty ASCII digits")
  }
  return normalized
}

function normalizeDocumentType(value: string): string {
  const normalized = normalizeRequiredString(value, "documentType").toUpperCase()
  if (!/^[\x20-\x7e]+$/.test(normalized)) {
    throw new RangeError("documentType must normalize to uppercase ASCII")
  }
  return normalized
}

function normalizeIssuedDate(value: Date): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new RangeError("issuedAt must be a valid Date")
  }
  return value.toISOString().slice(0, 10)
}

function normalizeVerificationVersion(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > MAX_SIGNED_INT) {
    throw new RangeError("verificationVersion must be a positive signed Int")
  }
  return String(value)
}

function record(name: string, value: string): Buffer {
  const valueBytes = Buffer.from(value, "utf8")
  return Buffer.concat([
    Buffer.from(`${name}=${valueBytes.byteLength}:`, "ascii"),
    valueBytes,
    Buffer.from("\n", "ascii"),
  ])
}

export function buildRemitoFingerprintPayload(input: RemitoFingerprintInput): Buffer {
  const remitoShortCode = normalizeRemitoLocator(input.remitoShortCode)
  if (remitoShortCode === null) throw new RangeError("remitoShortCode must be a valid RM1 locator")

  const fields: ReadonlyArray<readonly [string, string]> = [
    ["fingerprintVersion", FINGERPRINT_VERSION],
    ["issuerDisplayName", normalizeRequiredString(input.issuerDisplayName, "issuerDisplayName")],
    ["issuerTaxId", normalizeIssuerTaxId(input.issuerTaxId)],
    ["documentType", normalizeDocumentType(input.documentType)],
    ["issuedDate", normalizeIssuedDate(input.issuedAt)],
    ["remitoShortCode", remitoShortCode],
    ["verificationVersion", normalizeVerificationVersion(input.verificationVersion)],
  ]

  return Buffer.concat([HEADER, ...fields.map(([name, value]) => record(name, value))])
}

export function hashRemitoFingerprintPayload(payload: Uint8Array): string {
  return createHash("sha256").update(payload).digest("hex")
}

export function createRemitoFingerprint(input: RemitoFingerprintInput): {
  payload: Buffer
  hash: string
  apiFingerprint: string
} {
  const payload = buildRemitoFingerprintPayload(input)
  const hash = hashRemitoFingerprintPayload(payload)
  return { payload, hash, apiFingerprint: `sha256:${hash}` }
}
