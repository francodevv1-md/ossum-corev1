import type { Readable } from "node:stream"

import type {
  GetObjectCommandOutput,
  HeadObjectCommandOutput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3"

import type { DigitalReceiptArtifact, DigitalReceiptAuditMetadata } from "./types"

export const DIGITAL_RECEIPT_STORAGE_PROVIDER = "cloudflare-r2" as const
export const DIGITAL_RECEIPT_ARTIFACT_STORAGE_METADATA_VERSION = 1 as const

export type DigitalReceiptStorageProvider = typeof DIGITAL_RECEIPT_STORAGE_PROVIDER

export type DigitalReceiptArtifactStorageMetadata = {
  version: typeof DIGITAL_RECEIPT_ARTIFACT_STORAGE_METADATA_VERSION
  storageProvider: DigitalReceiptStorageProvider
  bucket: string
  objectKey: string
  mimeType: string
  checksum?: string
  size?: number
  uploadedAt?: string
  renderProfile?: string
  etag?: string
}

export type DigitalReceiptArtifactStorageMetadataInput = Omit<
  DigitalReceiptArtifactStorageMetadata,
  "version" | "storageProvider"
>

export type DigitalReceiptArtifactStorageLocator = Pick<
  DigitalReceiptArtifactStorageMetadata,
  "bucket" | "objectKey"
>

export type DigitalReceiptArtifactStorageKeyInput = {
  companyId: string
  surgeryId: string
  receiptId: string
  artifactId?: string
  snapshotId?: string
  accessId?: string
  artifactType: DigitalReceiptArtifact["type"]
  fileName?: string
  extension?: string
}

export type UploadDigitalReceiptArtifactObjectInput = {
  bucket?: string
  objectKey: string
  body: PutObjectCommandInput["Body"]
  mimeType: string
  checksum?: string
  fileName?: string
  size?: number
  metadata?: Record<string, string>
  renderProfile?: string
}

export type UploadDigitalReceiptArtifactObjectResult = {
  bucket: string
  objectKey: string
  mimeType: string
  checksum?: string
  size?: number
  uploadedAt: string
  renderProfile?: string
  etag?: string
}

export type DigitalReceiptArtifactObjectHead = {
  bucket: string
  objectKey: string
  mimeType?: string
  checksum?: string
  size?: number
  uploadedAt?: string
  renderProfile?: string
  etag?: string
  raw: HeadObjectCommandOutput
}

export type DigitalReceiptArtifactObjectRead = DigitalReceiptArtifactObjectHead & {
  body: GetObjectCommandOutput["Body"]
}

export interface DigitalReceiptArtifactStorageAdapter {
  readonly provider: DigitalReceiptStorageProvider
  readonly bucket: string

  uploadObject(
    input: UploadDigitalReceiptArtifactObjectInput
  ): Promise<UploadDigitalReceiptArtifactObjectResult>
  getObject(locator: DigitalReceiptArtifactStorageLocator): Promise<DigitalReceiptArtifactObjectRead>
  headObject(locator: DigitalReceiptArtifactStorageLocator): Promise<DigitalReceiptArtifactObjectHead>
  deleteObject(locator: DigitalReceiptArtifactStorageLocator): Promise<void>
}

export function buildDigitalReceiptArtifactStorageMetadata(
  input: DigitalReceiptArtifactStorageMetadataInput
): DigitalReceiptArtifactStorageMetadata {
  return {
    version: DIGITAL_RECEIPT_ARTIFACT_STORAGE_METADATA_VERSION,
    storageProvider: DIGITAL_RECEIPT_STORAGE_PROVIDER,
    bucket: input.bucket,
    objectKey: input.objectKey,
    mimeType: input.mimeType,
    checksum: input.checksum,
    size: input.size,
    uploadedAt: input.uploadedAt,
    renderProfile: input.renderProfile,
    etag: input.etag,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function normalizeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export function readDigitalReceiptArtifactStorageMetadata(
  metadata: DigitalReceiptAuditMetadata | undefined
): DigitalReceiptArtifactStorageMetadata | undefined {
  if (!isRecord(metadata) || !isRecord(metadata.storage)) {
    return undefined
  }

  const bucket = normalizeString(metadata.storage.bucket)
  const objectKey = normalizeString(metadata.storage.objectKey)
  const mimeType = normalizeString(metadata.storage.mimeType)
  const storageProvider = normalizeString(metadata.storage.storageProvider)

  if (
    storageProvider !== DIGITAL_RECEIPT_STORAGE_PROVIDER
    || !bucket
    || !objectKey
    || !mimeType
  ) {
    return undefined
  }

  return buildDigitalReceiptArtifactStorageMetadata({
    bucket,
    objectKey,
    mimeType,
    checksum: normalizeString(metadata.storage.checksum),
    size: normalizeNumber(metadata.storage.size),
    uploadedAt: normalizeString(metadata.storage.uploadedAt),
    renderProfile: normalizeString(metadata.storage.renderProfile),
    etag: normalizeString(metadata.storage.etag),
  })
}

export function attachDigitalReceiptArtifactStorageMetadata(
  metadata: DigitalReceiptAuditMetadata | undefined,
  storage: DigitalReceiptArtifactStorageMetadata
): DigitalReceiptAuditMetadata {
  return {
    ...(metadata ?? {}),
    storage,
  }
}

export function isReadableDigitalReceiptArtifactStream(value: unknown): value is Readable {
  return Boolean(value && typeof value === "object" && typeof (value as Readable).pipe === "function")
}
