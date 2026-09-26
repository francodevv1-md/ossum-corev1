export const DOCUMENT_TYPES = [
  "invoice",
  "purchase_order",
  "delivery_note",
  "authorization",
  "unknown",
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export type AzureDocumentModel = "prebuilt-invoice" | "prebuilt-layout"

export type DocumentReadRequest = {
  bytes: ArrayBuffer
  mimeType: string
  model: AzureDocumentModel
}

export type DocumentReadResult = {
  provider: "azure-document-intelligence"
  model: AzureDocumentModel
  raw: unknown
}

export interface DocumentReaderProvider {
  read(request: DocumentReadRequest): Promise<DocumentReadResult>
}

export type R2ObjectCreatedEvent = {
  action: string
  bucket: string
  object: {
    key: string
    size?: number
    eTag: string
  }
  eventTime: string
}
