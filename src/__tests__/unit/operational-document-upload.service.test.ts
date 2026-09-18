import { beforeEach, describe, expect, it, vi } from "vitest"

const { createSeguimientoEntry } = vi.hoisted(() => ({ createSeguimientoEntry: vi.fn() }))
vi.mock("@/lib/services/seguimiento.service", () => ({ createSeguimientoEntry }))

import { readOperationalDocument, uploadOperationalDocument } from "@/lib/services/operational-document-upload.service"

describe("operational document upload service", () => {
  const prisma = {
    seguimientoEntry: {
      update: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  }
  const storage = {
    upload: vi.fn(),
    read: vi.fn(),
    delete: vi.fn(),
  }
  const file = {
    bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    fileName: "case.pdf",
    mimeType: "application/pdf" as const,
    sizeBytes: 5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createSeguimientoEntry.mockResolvedValue({ id: "entry-1", evidenceRef: null })
    prisma.seguimientoEntry.update.mockResolvedValue({ id: "entry-1" })
    prisma.seguimientoEntry.updateMany.mockResolvedValue({ count: 1 })
    storage.upload.mockResolvedValue({ etag: "etag-1" })
    storage.delete.mockResolvedValue(undefined)
  })

  it("creates a trace entry then queues a server-generated R2 key", async () => {
    const result = await uploadOperationalDocument({
      prisma: prisma as never,
      storage,
      companyId: "company-1",
      surgeryId: "surgery-1",
      actorUserId: "user-1",
      file,
    })

    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({
      objectKey: expect.stringMatching(/^document-inbox\/company-1\/surgery-1\/entry-1\/[^/]+-case\.pdf$/),
      mimeType: "application/pdf",
    }))
    expect(prisma.seguimientoEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "entry-1" },
      data: { evidenceRef: expect.objectContaining({ status: "queued" }) },
    }))
    expect(result.evidenceRef).toMatchObject({ source: "r2_document_pipeline", status: "queued" })
    expect(result.evidenceRef).not.toHaveProperty("file.objectKey")
    expect(result.evidenceRef).not.toHaveProperty("file.etag")
  })

  it("marks the trace failed and compensates the R2 object when persistence fails", async () => {
    prisma.seguimientoEntry.update.mockRejectedValueOnce(new Error("db unavailable"))

    await expect(uploadOperationalDocument({
      prisma: prisma as never,
      storage,
      companyId: "company-1",
      surgeryId: "surgery-1",
      actorUserId: "user-1",
      file,
    })).rejects.toThrow("db unavailable")

    expect(storage.delete).toHaveBeenCalledTimes(1)
    expect(prisma.seguimientoEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { evidenceRef: expect.objectContaining({ status: "upload_failed" }) },
    }))
  })

  it("rejects a persisted object key outside the company, surgery, and entry prefix", async () => {
    prisma.seguimientoEntry.findFirst.mockResolvedValue({
      evidenceRef: {
        source: "r2_document_pipeline",
        status: "queued",
        file: { name: "case.pdf", objectKey: "document-inbox/another-company/surgery-1/entry-1/case.pdf" },
      },
    })

    await expect(readOperationalDocument({
      prisma: prisma as never,
      storage,
      companyId: "company-1",
      surgeryId: "surgery-1",
      entryId: "entry-1",
    })).rejects.toMatchObject({ code: "operational_document_not_found", status: 404 })
    expect(storage.read).not.toHaveBeenCalled()
  })
})
