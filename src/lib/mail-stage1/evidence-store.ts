import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import type { MailAttachmentRecord } from "./types"

type PersistEvidenceInput = {
  companyId: string
  surgeryId: string
  conversationId: string
  attachment: MailAttachmentRecord
  buffer: Buffer
}

function runtimeRoot() {
  return process.env.OSSUM_RUNTIME_DIR ?? path.join(process.cwd(), ".runtime")
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function safeFileName(fileName: string) {
  return sanitizeSegment(path.basename(fileName || "attachment.bin")) || "attachment.bin"
}

function attachmentShortId(attachmentId: string) {
  return attachmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "attachment"
}

function buildEvidenceKey(input: PersistEvidenceInput) {
  return [
    "mail-evidence",
    sanitizeSegment(input.companyId),
    sanitizeSegment(input.surgeryId),
    sanitizeSegment(input.conversationId),
    `${attachmentShortId(input.attachment.attachmentId)}-${safeFileName(input.attachment.fileName)}`,
  ].join("/")
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Uint8Array) return Buffer.from(body)
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer())
  }
  if (body && typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    return Buffer.from(await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray())
  }
  if (body && Symbol.asyncIterator in Object(body)) {
    const chunks: Buffer[] = []
    for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
  throw new Error("Unsupported evidence stream body")
}

export interface MailEvidenceStore {
  persist(input: PersistEvidenceInput): Promise<string>
  read(storageRef: string): Promise<Buffer>
}

class FileSystemMailEvidenceStore implements MailEvidenceStore {
  private readonly baseDir = path.join(runtimeRoot(), "mail-stage1")

  async persist(input: PersistEvidenceInput) {
    const key = buildEvidenceKey(input)
    const relativePath = key.replace(/^mail-evidence\//, "attachments/")
    const targetPath = path.join(this.baseDir, relativePath)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await writeFile(targetPath, input.buffer)
    return `fs:${path.relative(runtimeRoot(), targetPath).replace(/\\/g, "/")}`
  }

  async read(storageRef: string) {
    const relativePath = storageRef.startsWith("fs:") ? storageRef.slice(3) : storageRef
    return readFile(path.join(runtimeRoot(), relativePath))
  }
}

class R2MailEvidenceStore implements MailEvidenceStore {
  private readonly bucketName: string
  private readonly client: S3Client

  constructor() {
    const bucketName = process.env.R2_BUCKET_NAME
    const endpoint = process.env.R2_ENDPOINT
      ?? (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined)
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (!bucketName || !endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing R2 configuration for mail evidence store")
    }

    this.bucketName = bucketName
    this.client = new S3Client({
      region: process.env.R2_REGION ?? "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async persist(input: PersistEvidenceInput) {
    const key = buildEvidenceKey(input)
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: input.buffer,
      ContentType: input.attachment.mimeType || "application/octet-stream",
    }))
    return `r2:${key}`
  }

  async read(storageRef: string) {
    const key = storageRef.slice(3)
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: key }))
    return streamToBuffer(response.Body)
  }
}

const fsMailEvidenceStore = new FileSystemMailEvidenceStore()

function canUseR2Store() {
  if (process.env.NODE_ENV === "test" && process.env.MAIL_EVIDENCE_STORE_FORCE !== "r2") {
    return false
  }

  return Boolean(
    process.env.R2_BUCKET_NAME
      && (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID)
      && process.env.R2_ACCESS_KEY_ID
      && process.env.R2_SECRET_ACCESS_KEY
  )
}

export function createMailEvidenceStore(): MailEvidenceStore {
  return canUseR2Store() ? new R2MailEvidenceStore() : fsMailEvidenceStore
}

export const mailEvidenceStore = createMailEvidenceStore()
