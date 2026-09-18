import "server-only"

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

import { getDigitalReceiptR2StorageConfig, type DigitalReceiptR2StorageConfig } from "./storage.config"
import { DIGITAL_RECEIPT_R2_KEY_PREFIX } from "./storage.keys"
import {
  buildDigitalReceiptArtifactStorageMetadata,
  DIGITAL_RECEIPT_STORAGE_PROVIDER,
  type DigitalReceiptArtifactObjectHead,
  type DigitalReceiptArtifactObjectRead,
  type DigitalReceiptArtifactStorageAdapter,
  type DigitalReceiptArtifactStorageLocator,
  type UploadDigitalReceiptArtifactObjectInput,
  type UploadDigitalReceiptArtifactObjectResult,
} from "./storage.types"

function normalizeEtag(value: string | undefined) {
  return value?.replace(/^\"|\"$/g, "")
}

function resolveChecksum(input: {
  explicitChecksum?: string
  metadataChecksum?: string
  etag?: string
}) {
  return input.explicitChecksum ?? input.metadataChecksum ?? input.etag
}

function resolveKeyPrefix(config: DigitalReceiptR2StorageConfig) {
  return config.keyPrefix.trim().replace(/^\/+|\/+$/g, "") || DIGITAL_RECEIPT_R2_KEY_PREFIX
}

function withConfiguredKeyPrefix(config: DigitalReceiptR2StorageConfig, objectKey: string) {
  const normalizedKey = objectKey.replace(/^\/+/, "")
  const prefix = resolveKeyPrefix(config)
  return normalizedKey.startsWith(`${prefix}/`) || normalizedKey === prefix
    ? normalizedKey
    : `${prefix}/${normalizedKey}`
}

export class R2DigitalReceiptArtifactStorageAdapter
  implements DigitalReceiptArtifactStorageAdapter {
  readonly provider = DIGITAL_RECEIPT_STORAGE_PROVIDER
  readonly bucket: string

  private readonly client: S3Client
  private readonly config: DigitalReceiptR2StorageConfig

  constructor(config: DigitalReceiptR2StorageConfig = getDigitalReceiptR2StorageConfig()) {
    this.config = config
    this.bucket = config.bucket
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  async uploadObject(
    input: UploadDigitalReceiptArtifactObjectInput
  ): Promise<UploadDigitalReceiptArtifactObjectResult> {
    const bucket = input.bucket ?? this.bucket
    const objectKey = withConfiguredKeyPrefix(this.config, input.objectKey)
    const uploadedAt = new Date().toISOString()
    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: input.body,
        ContentType: input.mimeType,
        ContentDisposition: input.fileName ? `inline; filename="${input.fileName}"` : undefined,
        Metadata: {
          ...(input.checksum ? { checksum: input.checksum } : {}),
          ...(input.renderProfile ? { renderProfile: input.renderProfile } : {}),
          ...(input.metadata ?? {}),
        },
      })
    )

    return {
      bucket,
      objectKey,
      mimeType: input.mimeType,
      checksum: resolveChecksum({
        explicitChecksum: input.checksum,
        etag: normalizeEtag(response.ETag),
      }),
      size: input.size,
      uploadedAt,
      renderProfile: input.renderProfile,
      etag: normalizeEtag(response.ETag),
    }
  }

  async getObject(locator: DigitalReceiptArtifactStorageLocator): Promise<DigitalReceiptArtifactObjectRead> {
    const bucket = locator.bucket || this.bucket
    const objectKey = withConfiguredKeyPrefix(this.config, locator.objectKey)
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )

    return {
      bucket,
      objectKey,
      body: response.Body,
      mimeType: response.ContentType,
      checksum: resolveChecksum({
        metadataChecksum: response.Metadata?.checksum,
        etag: normalizeEtag(response.ETag),
      }),
      size: typeof response.ContentLength === "number" ? response.ContentLength : undefined,
      uploadedAt: response.LastModified?.toISOString(),
      renderProfile: response.Metadata?.renderProfile,
      etag: normalizeEtag(response.ETag),
      raw: response,
    }
  }

  async headObject(locator: DigitalReceiptArtifactStorageLocator): Promise<DigitalReceiptArtifactObjectHead> {
    const bucket = locator.bucket || this.bucket
    const objectKey = withConfiguredKeyPrefix(this.config, locator.objectKey)
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )

    return {
      bucket,
      objectKey,
      mimeType: response.ContentType,
      checksum: resolveChecksum({
        metadataChecksum: response.Metadata?.checksum,
        etag: normalizeEtag(response.ETag),
      }),
      size: typeof response.ContentLength === "number" ? response.ContentLength : undefined,
      uploadedAt: response.LastModified?.toISOString(),
      renderProfile: response.Metadata?.renderProfile,
      etag: normalizeEtag(response.ETag),
      raw: response,
    }
  }

  async deleteObject(locator: DigitalReceiptArtifactStorageLocator): Promise<void> {
    const bucket = locator.bucket || this.bucket
    const objectKey = withConfiguredKeyPrefix(this.config, locator.objectKey)
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    )
  }
}

export function createDigitalReceiptR2StorageAdapter(config?: DigitalReceiptR2StorageConfig) {
  return new R2DigitalReceiptArtifactStorageAdapter(config)
}

export function createDigitalReceiptArtifactStorageMetadataFromUpload(
  result: UploadDigitalReceiptArtifactObjectResult
) {
  return buildDigitalReceiptArtifactStorageMetadata(result)
}
