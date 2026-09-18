import { badRequest } from "@/lib/api/errors"

export const OPERATIONAL_DOCUMENT_MAX_BYTES = 4_000_000

const MIME_SIGNATURES = {
  "application/pdf": (bytes: Uint8Array) => bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-",
  "image/jpeg": (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes: Uint8Array) => {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value)
  },
} as const

export type OperationalDocumentMimeType = keyof typeof MIME_SIGNATURES

export type ValidatedOperationalDocument = {
  bytes: Uint8Array
  fileName: string
  mimeType: OperationalDocumentMimeType
  sizeBytes: number
}

function safeFileName(value: string) {
  const baseName = value.split(/[\\/]/).pop()?.trim() || "document"
  return baseName.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120) || "document"
}

export async function validateOperationalDocument(file: File): Promise<ValidatedOperationalDocument> {
  if (file.size <= 0) throw badRequest("The document is empty", "empty_document")
  if (file.size > OPERATIONAL_DOCUMENT_MAX_BYTES) {
    throw badRequest("The document exceeds the 4 MB processing limit", "document_too_large")
  }

  const mimeType = file.type.toLowerCase() as OperationalDocumentMimeType
  const signatureMatches = MIME_SIGNATURES[mimeType]
  if (!signatureMatches) {
    throw badRequest("Only PDF, JPEG, and PNG documents are supported", "unsupported_document_type")
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!signatureMatches(bytes)) {
    throw badRequest("The document content does not match its declared type", "invalid_document_signature")
  }

  return {
    bytes,
    fileName: safeFileName(file.name),
    mimeType,
    sizeBytes: bytes.byteLength,
  }
}

export function validateOperationalDocumentDescription(value: FormDataEntryValue | null) {
  if (value === null) return undefined
  if (typeof value !== "string") throw badRequest("Document description must be text", "invalid_document_description")
  const description = value.trim()
  if (description.length > 2_000) throw badRequest("Document description is too long", "document_description_too_long")
  return description || undefined
}
