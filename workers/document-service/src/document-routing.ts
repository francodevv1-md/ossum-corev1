import type { AzureDocumentModel, DocumentType, R2ObjectCreatedEvent } from "./contracts"

const INPUT_PREFIX = "document-inbox/"
const OUTPUT_PREFIX = "document-results/"
const DOCUMENT_BUCKET = "ossum-cor-documents-dev"
const OBJECT_CREATE_ACTIONS = new Set(["PutObject", "CopyObject", "CompleteMultipartUpload"])
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/bmp",
  "image/tiff",
  "image/heif",
])
const MAX_F0_DOCUMENT_BYTES = 4_000_000

export function normalizeEtag(value: string): string {
  return value.trim().replace(/^"|"$/g, "").replace(/[^a-zA-Z0-9_-]/g, "_")
}

export function isDocumentCreatedEvent(value: unknown): value is R2ObjectCreatedEvent {
  if (!value || typeof value !== "object") return false
  const event = value as Partial<R2ObjectCreatedEvent>

  return Boolean(
    event.action
      && OBJECT_CREATE_ACTIONS.has(event.action)
      && event.bucket === DOCUMENT_BUCKET
      && event.object
      && typeof event.object.key === "string"
      && typeof event.object.eTag === "string"
      && normalizeEtag(event.object.eTag).length > 0
      && event.object.key.startsWith(INPUT_PREFIX)
  )
}

export function normalizeDocumentType(value: string | undefined): DocumentType {
  switch (value?.trim().toLowerCase().replaceAll("-", "_")) {
    case "invoice":
    case "purchase_order":
    case "delivery_note":
    case "authorization":
      return value.trim().toLowerCase().replaceAll("-", "_") as DocumentType
    default:
      return "unknown"
  }
}

export function validateDocumentObject(size: number, mimeType: string | undefined): string | null {
  if (size <= 0) return "empty_document"
  if (size > MAX_F0_DOCUMENT_BYTES) return "document_exceeds_azure_f0_limit"
  if (!mimeType || !SUPPORTED_MIME_TYPES.has(mimeType.toLowerCase())) return "unsupported_document_type"
  return null
}

export function selectAzureModel(documentType: DocumentType): AzureDocumentModel {
  return documentType === "invoice" || documentType === "purchase_order"
    ? "prebuilt-invoice"
    : "prebuilt-layout"
}

export function buildResultKey(inputKey: string, eTag: string): string {
  const relativeKey = inputKey.startsWith(INPUT_PREFIX)
    ? inputKey.slice(INPUT_PREFIX.length)
    : inputKey

  return `${OUTPUT_PREFIX}${relativeKey}.${normalizeEtag(eTag)}.azure.json`
}
