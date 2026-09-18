import { randomUUID } from "node:crypto"
import { Prisma, type PrismaClient } from "@prisma/client"
import { notFound } from "@/lib/api/errors"
import { operationalDocumentStorage, type OperationalDocumentStorage } from "@/lib/operational-documents/storage"
import { createSeguimientoEntry } from "@/lib/services/seguimiento.service"
import type { ValidatedOperationalDocument } from "@/lib/validators/operational-document-upload.validator"

const DOCUMENT_SOURCE = "r2_document_pipeline"

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function buildObjectKey(companyId: string, surgeryId: string, entryId: string, fileName: string) {
  return [
    "document-inbox",
    safeSegment(companyId),
    safeSegment(surgeryId),
    safeSegment(entryId),
    `${randomUUID()}-${safeSegment(fileName)}`,
  ].join("/")
}

function evidenceRef(input: {
  status: "uploading" | "queued" | "upload_failed"
  file: ValidatedOperationalDocument
  objectKey?: string
  etag?: string
}) {
  return {
    source: DOCUMENT_SOURCE,
    status: input.status,
    file: {
      name: input.file.fileName,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.sizeBytes,
      ...(input.objectKey ? { objectKey: input.objectKey } : {}),
      ...(input.etag ? { etag: input.etag } : {}),
    },
  }
}

export async function uploadOperationalDocument(input: {
  prisma: PrismaClient
  storage?: OperationalDocumentStorage
  companyId: string
  surgeryId: string
  actorUserId: string
  description?: string
  file: ValidatedOperationalDocument
}) {
  const storage = input.storage ?? operationalDocumentStorage
  const entry = await createSeguimientoEntry(input.prisma, {
    companyId: input.companyId,
    surgeryId: input.surgeryId,
    authorId: input.actorUserId,
    entryType: "document_evidence",
    content: input.description || `Document uploaded: ${input.file.fileName}`,
    summary: input.file.fileName,
    evidenceRef: evidenceRef({ status: "uploading", file: input.file }),
  })
  const objectKey = buildObjectKey(input.companyId, input.surgeryId, entry.id, input.file.fileName)

  try {
    const uploaded = await storage.upload({
      objectKey,
      body: input.file.bytes,
      fileName: input.file.fileName,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.sizeBytes,
      metadata: { documentType: "unknown" },
    })
    const nextEvidenceRef = evidenceRef({ status: "queued", file: input.file, objectKey, etag: uploaded.etag })

    await input.prisma.seguimientoEntry.update({
      where: { id: entry.id },
      data: { evidenceRef: nextEvidenceRef as Prisma.InputJsonValue },
    })

    return {
      ...entry,
      evidenceRef: {
        source: DOCUMENT_SOURCE,
        status: "queued" as const,
        file: {
          name: input.file.fileName,
          mimeType: input.file.mimeType,
          sizeBytes: input.file.sizeBytes,
        },
      },
    }
  } catch (error) {
    await storage.delete(objectKey).catch(() => undefined)
    await input.prisma.seguimientoEntry.updateMany({
      where: { id: entry.id, companyId: input.companyId, surgeryId: input.surgeryId },
      data: { evidenceRef: evidenceRef({ status: "upload_failed", file: input.file }) as Prisma.InputJsonValue },
    }).catch(() => undefined)
    throw error
  }
}

function readDocumentRef(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const ref = value as Record<string, unknown>
  const file = ref.file
  if (ref.source !== DOCUMENT_SOURCE || !file || typeof file !== "object" || Array.isArray(file)) return null
  const record = file as Record<string, unknown>
  if (typeof record.objectKey !== "string" || typeof record.name !== "string") return null
  return {
    objectKey: record.objectKey,
    fileName: record.name,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : "application/octet-stream",
  }
}

export async function readOperationalDocument(input: {
  prisma: PrismaClient
  storage?: OperationalDocumentStorage
  companyId: string
  surgeryId: string
  entryId: string
}) {
  const entry = await input.prisma.seguimientoEntry.findFirst({
    where: { id: input.entryId, companyId: input.companyId, surgeryId: input.surgeryId, entryType: "document_evidence" },
    select: { evidenceRef: true },
  })
  const document = readDocumentRef(entry?.evidenceRef ?? null)
  const expectedPrefix = `document-inbox/${safeSegment(input.companyId)}/${safeSegment(input.surgeryId)}/${safeSegment(input.entryId)}/`
  if (!document || !document.objectKey.startsWith(expectedPrefix)) {
    throw notFound("Document not found", "operational_document_not_found")
  }

  const stored = await (input.storage ?? operationalDocumentStorage).read(document.objectKey)
  return { ...stored, fileName: document.fileName, mimeType: stored.mimeType || document.mimeType }
}
