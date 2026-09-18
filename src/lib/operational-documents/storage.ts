import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing operational document R2 configuration: ${name}`)
  return value
}

function createClient() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim()
  const endpoint = process.env.R2_ENDPOINT?.trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "")
  if (!endpoint) throw new Error("Missing operational document R2 configuration: R2_ENDPOINT or R2_ACCOUNT_ID")

  return new S3Client({
    region: process.env.R2_REGION?.trim() || "auto",
    endpoint,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  })
}

function bucket() {
  return required("R2_BUCKET_NAME")
}

function normalizeEtag(value: string | undefined) {
  return value?.replace(/^"|"$/g, "")
}

export type OperationalDocumentObject = {
  objectKey: string
  body: Uint8Array
  fileName: string
  mimeType: string
  sizeBytes: number
  metadata?: Record<string, string>
}

export const operationalDocumentStorage = {
  async upload(input: OperationalDocumentObject) {
    const response = await createClient().send(new PutObjectCommand({
      Bucket: bucket(),
      Key: input.objectKey,
      Body: input.body,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
      ContentDisposition: `inline; filename="${input.fileName.replace(/["\r\n]/g, "_")}"`,
      Metadata: input.metadata,
    }))
    return { etag: normalizeEtag(response.ETag) }
  },

  async read(objectKey: string) {
    const response = await createClient().send(new GetObjectCommand({ Bucket: bucket(), Key: objectKey }))
    if (!response.Body) throw new Error("Operational document body is missing")
    return {
      bytes: await response.Body.transformToByteArray(),
      mimeType: response.ContentType,
      sizeBytes: response.ContentLength,
    }
  },

  async delete(objectKey: string) {
    await createClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: objectKey }))
  },
}

export type OperationalDocumentStorage = typeof operationalDocumentStorage
