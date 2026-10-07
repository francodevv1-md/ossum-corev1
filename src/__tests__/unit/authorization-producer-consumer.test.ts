import { describe, it, expect, vi, beforeEach } from "vitest"
import { uploadOperationalDocument } from "@/lib/services/operational-document-upload.service"
import { createSeguimientoEntry } from "@/lib/services/seguimiento.service"
import { updateSurgeryCxStatus } from "@/lib/services/surgery.service"
import type { PrismaClient } from "@prisma/client"
import type { OperationalDocumentStorage } from "@/lib/operational-documents/storage"

vi.mock("@/lib/audit", () => ({
  createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-1" }),
}))

vi.mock("@/lib/services/internal-notifications.service", () => ({
  emitCrossDomainNotification: vi.fn().mockResolvedValue({ createdCount: 0, attemptedCount: 0 }),
}))

describe("Authorization Evidence Producer-Consumer Connected Contract", () => {
  const companyId = "comp-auth-1"
  const actorUserId = "user-auth-1"
  const surgeryId = "surg-auth-1"

  let inMemorySeguimientoEntries: Array<{
    id: string
    companyId: string
    surgeryId: string
    authorId: string
    entryType: string
    content: string
    summary: string | null
    evidenceRef: Record<string, unknown> | null
    createdAt: Date
    updatedAt: Date
    author?: { firstName: string | null; lastName: string | null }
  }>

  let inMemorySurgeries: Array<{
    id: string
    companyId: string
    visibleNumber: string
    cxStatus: string
    archivedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }>

  let mockPrisma: PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()
    inMemorySeguimientoEntries = []
    inMemorySurgeries = [
      {
        id: surgeryId,
        companyId,
        visibleNumber: "CX-0001",
        cxStatus: "pending",
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const matchesFilter = (entry: typeof inMemorySeguimientoEntries[0], where: Record<string, unknown>) => {
      if (where.companyId && entry.companyId !== where.companyId) return false
      if (where.surgeryId && entry.surgeryId !== where.surgeryId) return false
      if (where.entryType && typeof where.entryType === "string" && entry.entryType !== where.entryType) return false
      if (where.entryType && typeof where.entryType === "object" && "in" in (where.entryType as Record<string, unknown>)) {
        const allowed = (where.entryType as { in: string[] }).in
        if (!allowed.includes(entry.entryType)) return false
      }
      if (where.content && typeof where.content === "object") {
        const contentFilter = where.content as { startsWith?: string; contains?: string }
        if (contentFilter.startsWith && !entry.content.startsWith(contentFilter.startsWith)) return false
        if (contentFilter.contains && !entry.content.includes(contentFilter.contains)) return false
      }

      if (Array.isArray(where.OR)) {
        const orMatches = (where.OR as Array<Record<string, unknown>>).some((orClause) => {
          if (orClause.entryType && orClause.entryType !== entry.entryType) return false
          if (orClause.evidenceRef && typeof orClause.evidenceRef === "object") {
            const evRef = orClause.evidenceRef as { path?: string[]; equals?: string }
            if (evRef.path && evRef.path[0] === "action") {
              if (entry.evidenceRef?.action !== evRef.equals) return false
            }
          }
          if (orClause.NOT) {
            const notList = Array.isArray(orClause.NOT) ? orClause.NOT : [orClause.NOT]
            const anyNotMatches = notList.some((notItem: Record<string, unknown>) => {
              if (notItem.evidenceRef && typeof notItem.evidenceRef === "object") {
                const notClause = (notItem as { evidenceRef?: { path?: string[]; equals?: string } }).evidenceRef
                if (notClause?.path && notClause.path[0] === "status") {
                  return entry.evidenceRef?.status === notClause.equals
                }
              }
              return false
            })
            if (anyNotMatches) return false
          }
          return true
        })
        if (!orMatches) return false
      }

      return true
    }

    const txMock = {
      surgery: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          const found = inMemorySurgeries.find((s) => s.id === where.id && s.companyId === where.companyId && s.archivedAt === null)
          return Promise.resolve(found ? { ...found } : null)
        }),
        updateMany: vi.fn().mockImplementation(({ where, data }) => {
          let count = 0
          inMemorySurgeries.forEach((s) => {
            if (s.id === where.id && s.companyId === where.companyId && s.archivedAt === null) {
              Object.assign(s, data)
              count++
            }
          })
          return Promise.resolve({ count })
        }),
      },
      surgeryContactAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: actorUserId,
          firstName: "Franco",
          lastName: "Dev",
          email: "franco@districorr.com.ar",
        }),
      },
      userCompanyAccess: {
        findFirst: vi.fn().mockResolvedValue({
          id: "uca-1",
          userId: actorUserId,
          companyId,
          role: "admin",
          isActive: true,
          company: { isActive: true },
        }),
      },
      seguimientoEntry: {
        create: vi.fn().mockImplementation(({ data }) => {
          const newEntry = {
            id: `entry-${inMemorySeguimientoEntries.length + 1}`,
            companyId: data.companyId,
            surgeryId: data.surgeryId,
            authorId: data.authorId,
            entryType: data.entryType,
            content: data.content,
            summary: data.summary ?? null,
            evidenceRef: data.evidenceRef ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            author: { firstName: "Franco", lastName: "Dev" },
          }
          inMemorySeguimientoEntries.push(newEntry)
          return Promise.resolve(newEntry)
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          const entry = inMemorySeguimientoEntries.find((e) => e.id === where.id)
          if (entry) {
            if (data.entryType !== undefined) {
              entry.entryType = data.entryType
            }
            if (data.evidenceRef !== undefined) {
              entry.evidenceRef = data.evidenceRef
            }
          }
          return Promise.resolve(entry)
        }),
        updateMany: vi.fn().mockImplementation(({ where, data }) => {
          let count = 0
          inMemorySeguimientoEntries.forEach((e) => {
            if (e.id === where.id && e.companyId === where.companyId && e.surgeryId === where.surgeryId) {
              if (data.entryType !== undefined) {
                e.entryType = data.entryType
              }
              if (data.evidenceRef !== undefined) {
                e.evidenceRef = data.evidenceRef
              }
              count++
            }
          })
          return Promise.resolve({ count })
        }),
        findFirst: vi.fn().mockImplementation(({ where }) => {
          const found = inMemorySeguimientoEntries.find((e) => matchesFilter(e, where))
          return Promise.resolve(found ? { ...found } : null)
        }),
        count: vi.fn().mockImplementation(({ where }) => {
          const matching = inMemorySeguimientoEntries.filter((e) => matchesFilter(e, where))
          return Promise.resolve(matching.length)
        }),
      },
    }

    mockPrisma = {
      ...txMock,
      $transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
    } as unknown as PrismaClient
  })

  const dummyFile = {
    fileName: "autorizacion-medica.pdf",
    mimeType: "application/pdf" as const,
    sizeBytes: 1024,
    bytes: new Uint8Array([1, 2, 3, 4]),
  }

  it("Case 1: comprobante subido correctamente con documentType='authorization' -> autorización aceptada en backend", async () => {
    const mockStorage: OperationalDocumentStorage = {
      upload: vi.fn().mockResolvedValue({ etag: "mock-etag-123" }),
      read: vi.fn().mockResolvedValue({ bytes: new Uint8Array(), mimeType: "application/pdf", sizeBytes: 1024 }),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    // 1. Producer uploads authorization voucher
    const uploadResult = await uploadOperationalDocument({
      prisma: mockPrisma,
      storage: mockStorage,
      companyId,
      surgeryId,
      actorUserId,
      description: "Comprobante de autorización médica",
      file: dummyFile,
      documentType: "authorization",
    })

    expect(uploadResult.entryType).toBe("authorization_evidence")
    expect(uploadResult.evidenceRef.status).toBe("queued")
    expect(uploadResult.evidenceRef.action).toBe("authorization_recorded")

    // 2. Consumer attempts to authorize surgery
    const updatedSurgery = await updateSurgeryCxStatus(
      mockPrisma,
      { companyId, actorUserId, module: "surgery" },
      surgeryId,
      "authorized"
    )

    expect(updatedSurgery?.cxStatus).toBe("authorized")
    expect(inMemorySurgeries[0].cxStatus).toBe("authorized")
  })

  it("Case 2: documento genérico subido sin documentType='authorization' -> rechazado (no autoriza)", async () => {
    const mockStorage: OperationalDocumentStorage = {
      upload: vi.fn().mockResolvedValue({ etag: "mock-etag-456" }),
      read: vi.fn().mockResolvedValue({ bytes: new Uint8Array(), mimeType: "application/pdf", sizeBytes: 1024 }),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    // 1. Producer uploads generic document (e.g. invoice, report)
    const uploadResult = await uploadOperationalDocument({
      prisma: mockPrisma,
      storage: mockStorage,
      companyId,
      surgeryId,
      actorUserId,
      description: "Documento clínico general",
      file: dummyFile,
      documentType: "general",
    })

    expect(uploadResult.entryType).toBe("document_evidence")

    // 2. Consumer attempts to authorize surgery -> must reject because generic documents do not qualify
    await expect(
      updateSurgeryCxStatus(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        surgeryId,
        "authorized"
      )
    ).rejects.toThrow("Para autorizar la cirugía se requiere comprobante o registro de excepción en Seguimiento.")

    expect(inMemorySurgeries[0].cxStatus).toBe("pending")
  })

  it("Case 3: upload fallido en storage -> marca upload_failed y no autoriza", async () => {
    const mockFailingStorage: OperationalDocumentStorage = {
      upload: vi.fn().mockRejectedValue(new Error("Storage service unavailable")),
      read: vi.fn().mockResolvedValue({ bytes: new Uint8Array(), mimeType: "application/pdf", sizeBytes: 1024 }),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    // 1. Producer upload fails
    await expect(
      uploadOperationalDocument({
        prisma: mockPrisma,
        storage: mockFailingStorage,
        companyId,
        surgeryId,
        actorUserId,
        description: "Comprobante de autorización médica",
        file: dummyFile,
        documentType: "authorization",
      })
    ).rejects.toThrow("Storage service unavailable")

    // Verify DB entry has status upload_failed
    expect(inMemorySeguimientoEntries[0]?.evidenceRef?.status).toBe("upload_failed")

    // 2. Consumer attempts to authorize surgery -> must reject because failed upload is excluded
    await expect(
      updateSurgeryCxStatus(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        surgeryId,
        "authorized"
      )
    ).rejects.toThrow("Para autorizar la cirugía se requiere comprobante o registro de excepción en Seguimiento.")

    expect(inMemorySurgeries[0].cxStatus).toBe("pending")
  })

  it("Case 4: excepción explícita registrada en Seguimiento -> autorización aceptada en backend", async () => {
    // 1. Producer registers explicit exception note
    await createSeguimientoEntry(mockPrisma, {
      companyId,
      surgeryId,
      authorId: actorUserId,
      entryType: "note",
      content: "confirma que no tiene una imagen de autorización",
    })

    // Verify exception note content resolved author name
    expect(inMemorySeguimientoEntries[0]?.content).toContain("El usuario Franco Dev: confirma que no tiene una imagen de autorización")

    // 2. Consumer attempts to authorize surgery -> accepted
    const updatedSurgery = await updateSurgeryCxStatus(
      mockPrisma,
      { companyId, actorUserId, module: "surgery" },
      surgeryId,
      "authorized"
    )

    expect(updatedSurgery?.cxStatus).toBe("authorized")
    expect(inMemorySurgeries[0].cxStatus).toBe("authorized")
  })

  it("Case 5: storage pendiente (en uploading) -> autorizar rechaza; tras completar y persistir -> autorizar acepta", async () => {
    let completeStorageUpload!: (res: { etag: string }) => void
    const pendingUploadPromise = new Promise<{ etag: string }>((resolve) => {
      completeStorageUpload = resolve
    })

    const mockPendingStorage: OperationalDocumentStorage = {
      upload: vi.fn().mockImplementation(() => pendingUploadPromise),
      read: vi.fn().mockResolvedValue({ bytes: new Uint8Array(), mimeType: "application/pdf", sizeBytes: 1024 }),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    // 1. Launch upload task (asynchronously waiting for storage)
    const uploadTask = uploadOperationalDocument({
      prisma: mockPrisma,
      storage: mockPendingStorage,
      companyId,
      surgeryId,
      actorUserId,
      description: "Comprobante de autorización en curso",
      file: dummyFile,
      documentType: "authorization",
    })

    // Yield control to let initial createSeguimientoEntry execute
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Verify entry exists in uploading status
    expect(inMemorySeguimientoEntries[0]?.evidenceRef?.status).toBe("uploading")
    expect(inMemorySeguimientoEntries[0]?.entryType).toBe("document_evidence")

    // 2. Attempt to authorize BEFORE storage upload completes -> MUST REJECT
    await expect(
      updateSurgeryCxStatus(
        mockPrisma,
        { companyId, actorUserId, module: "surgery" },
        surgeryId,
        "authorized"
      )
    ).rejects.toThrow("Para autorizar la cirugía se requiere comprobante o registro de excepción en Seguimiento.")

    expect(inMemorySurgeries[0].cxStatus).toBe("pending")

    // 3. Complete storage upload
    completeStorageUpload({ etag: "mock-etag-final-999" })
    const uploadResult = await uploadTask

    // Verify entry is now promoted to authorization_evidence in queued status
    expect(uploadResult.entryType).toBe("authorization_evidence")
    expect(inMemorySeguimientoEntries[0]?.entryType).toBe("authorization_evidence")
    expect(inMemorySeguimientoEntries[0]?.evidenceRef?.status).toBe("queued")

    // 4. Attempt to authorize AFTER storage completes and persists -> MUST ACCEPT
    const updatedSurgery = await updateSurgeryCxStatus(
      mockPrisma,
      { companyId, actorUserId, module: "surgery" },
      surgeryId,
      "authorized"
    )

    expect(updatedSurgery?.cxStatus).toBe("authorized")
    expect(inMemorySurgeries[0].cxStatus).toBe("authorized")
  })
})
