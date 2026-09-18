import { describe, expect, it } from "vitest"
import { mapApiEntryToView, mapSeguimientoFeedResponse } from "@/lib/api/seguimiento-adapter"

describe("seguimiento-adapter", () => {
  it("maps note highlight and priority metadata", () => {
    const entry = mapApiEntryToView({
      id: "seg-1",
      surgeryId: "sx-1",
      companyId: "co-1",
      entryType: "note",
      content: "Resolver cobertura antes del cierre.",
      summary: null,
      authorId: "user-1",
      authorName: "Ana Test",
      evidenceRef: { highlighted: true, priority: "alta" },
      createdAt: "2026-06-29T12:00:00.000Z",
      updatedAt: "2026-06-29T12:00:00.000Z",
    })

    expect(entry.isHighlighted).toBe(true)
    expect(entry.notePriority).toBe("alta")
    expect(entry.mailMeta).toBeNull()
  })

  it("maps mail evidence metadata for feed rendering", () => {
    const entry = mapApiEntryToView({
      id: "seg-2",
      surgeryId: "sx-1",
      companyId: "co-1",
      entryType: "mail_evidence",
      content: "Dr. Test · proveedor@demo.com",
      summary: "RE: Material pendiente",
      authorId: "user-2",
      authorName: "Luis Test",
      evidenceRef: {
        highlighted: true,
        source: "mail_stage1",
        provider: "gmail",
        linkId: "link-22",
        subject: "RE: Material pendiente",
        participantsSummary: "Dr. Test · proveedor@demo.com",
        latestMessageAt: "2026-06-29T14:30:00.000Z",
        messageCount: 4,
        attachmentCount: 2,
      },
      createdAt: "2026-06-29T14:35:00.000Z",
      updatedAt: "2026-06-29T14:35:00.000Z",
    })

    expect(entry.isHighlighted).toBe(false)
    expect(entry.notePriority).toBeNull()
    expect(entry.mailMeta).toMatchObject({
      linkId: "link-22",
      subject: "RE: Material pendiente",
      messageCount: 4,
      attachmentCount: 2,
    })
    expect(entry.photoMeta).toBeNull()
  })

  it("maps photo evidence metadata for visual feed rendering", () => {
    const entry = mapApiEntryToView({
      id: "seg-3",
      surgeryId: "sx-1",
      companyId: "co-1",
      entryType: "file_photo_evidence",
      content: "Se cargó evidencia visual manual.",
      summary: "foto-1.jpg + 1 archivo",
      authorId: "user-3",
      authorName: "Mara Test",
      evidenceRef: {
        source: "manual_upload",
        fileCount: 2,
        files: [
          {
            name: "foto-1.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 124000,
            previewDataUrl: "data:image/jpeg;base64,abc123",
            width: 1200,
            height: 900,
          },
          {
            name: "foto-2.webp",
            mimeType: "image/webp",
            sizeBytes: 98000,
            previewDataUrl: "data:image/webp;base64,def456",
          },
        ],
      },
      createdAt: "2026-06-29T15:00:00.000Z",
      updatedAt: "2026-06-29T15:00:00.000Z",
    })

    expect(entry.mailMeta).toBeNull()
    expect(entry.notePriority).toBeNull()
    expect(entry.photoMeta).toMatchObject({
      source: "manual_upload",
      fileCount: 2,
      files: [
        {
          name: "foto-1.jpg",
          mimeType: "image/jpeg",
          previewDataUrl: "data:image/jpeg;base64,abc123",
        },
        {
          name: "foto-2.webp",
          mimeType: "image/webp",
        },
      ],
    })
  })

  it("maps private operational document metadata without exposing its object key", () => {
    const entry = mapApiEntryToView({
      id: "doc-1", surgeryId: "sx-1", companyId: "co-1", entryType: "document_evidence", content: "Documento", summary: "case.pdf",
      authorId: "user-1", authorName: "Ana", createdAt: "2026-08-17T10:00:00.000Z", updatedAt: "2026-08-17T10:00:00.000Z",
      evidenceRef: { source: "r2_document_pipeline", status: "queued", file: { name: "case.pdf", mimeType: "application/pdf", sizeBytes: 1200, objectKey: "document-inbox/private" } },
    })

    expect(entry.documentMeta).toEqual({ status: "queued", fileName: "case.pdf", mimeType: "application/pdf", sizeBytes: 1200 })
    expect(entry.documentMeta).not.toHaveProperty("objectKey")
    expect(entry.evidenceRef).not.toHaveProperty("file.objectKey")
    expect(entry.evidenceRef).not.toHaveProperty("file.etag")
  })

  it("maps nested images for notes and authorization evidence without granting authorization priority", () => {
    const note = mapApiEntryToView({
      id: "seg-nested-note", surgeryId: "sx-1", companyId: "co-1", entryType: "note", content: "Nota", summary: null,
      authorId: "user-1", authorName: "Ana", createdAt: "2026-07-15T10:00:00.000Z", updatedAt: "2026-07-15T10:00:00.000Z",
      evidenceRef: { priority: "alta", highlighted: true, imageEvidence: { source: "manual_event_edit", fileCount: 1, files: [{ name: "nota.png", mimeType: "image/png", sizeBytes: 20, previewDataUrl: "data:image/png;base64,abc" }] } },
    })
    const authorization = mapApiEntryToView({
      id: "seg-auth", surgeryId: "sx-1", companyId: "co-1", entryType: "authorization_evidence", content: "Autorización", summary: null,
      authorId: "user-1", authorName: "Ana", createdAt: "2026-07-15T10:00:00.000Z", updatedAt: "2026-07-15T10:00:00.000Z",
      evidenceRef: { priority: "alta", highlighted: true, imageEvidence: { source: "authorization_recorded", fileCount: 1, files: [{ name: "autorizacion.png", mimeType: "image/png", sizeBytes: 20, previewDataUrl: "data:image/png;base64,abc" }] } },
    })

    expect(note.imageEvidenceMeta?.files[0]?.name).toBe("nota.png")
    expect(note.notePriority).toBe("alta")
    expect(authorization.imageEvidenceMeta?.source).toBe("authorization_recorded")
    expect(authorization.notePriority).toBeNull()
    expect(authorization.isHighlighted).toBe(false)
  })

  it("reads both snapshot and legacy edit history without inventing legacy values", () => {
    const entry = mapApiEntryToView({
      id: "seg-history", surgeryId: "sx-1", companyId: "co-1", entryType: "note", content: "Actual", summary: null,
      authorId: "user-1", authorName: "Ana", createdAt: "2026-07-15T10:00:00.000Z", updatedAt: "2026-07-15T10:00:00.000Z",
      evidenceRef: { editHistory: [
        { editedAt: "2026-07-15T09:00:00.000Z", editedBy: "Ana", previousContent: "Antes" },
        { editedAt: "2026-07-15T10:00:00.000Z", actor: { userId: "user-2", displayName: "Luis" }, previous: { summary: "Resumen previo", noteType: "general", highlighted: false } },
      ] },
    })

    expect(entry.editHistory).toEqual([
      { editedAt: "2026-07-15T09:00:00.000Z", editedBy: "Ana", previous: { content: "Antes" } },
      { editedAt: "2026-07-15T10:00:00.000Z", editedBy: "Luis", previous: { summary: "Resumen previo", noteType: "general", highlighted: false } },
    ])
  })

  it("maps mentions with consistent deduped shape", () => {
    const entry = mapApiEntryToView({
      id: "seg-4",
      surgeryId: "sx-1",
      companyId: "co-1",
      entryType: "note",
      content: "Coordinar con @Ana y @Luis",
      summary: null,
      authorId: "user-4",
      authorName: "Nora Test",
      evidenceRef: {
        mentions: [
          { userId: "user-1", displayName: "Ana Test", companyId: "co-1" },
          { userId: "user-1", displayName: "Ana Repetida", companyId: "co-1" },
          { userId: "user-2", displayName: "Luis Test", companyId: "co-1" },
          { userId: "", displayName: "Inválida", companyId: "co-1" },
        ],
      },
      createdAt: "2026-06-29T16:00:00.000Z",
      updatedAt: "2026-06-29T16:00:00.000Z",
    })

    expect(entry.mentions).toEqual([
      { userId: "user-1", displayName: "Ana Repetida", companyId: "co-1" },
      { userId: "user-2", displayName: "Luis Test", companyId: "co-1" },
    ])
  })

  it("maps feed metadata and entries together", () => {
    const feed = mapSeguimientoFeedResponse({
      entries: [
        {
          id: "seg-5",
          surgeryId: "sx-1",
          companyId: "co-1",
          entryType: "note",
          content: "Seguimiento",
          summary: null,
          authorId: "user-5",
          authorName: "Mica Test",
          evidenceRef: { highlighted: false },
          createdAt: "2026-07-04T17:00:00.000Z",
          updatedAt: "2026-07-04T17:00:00.000Z",
        },
      ],
      meta: {
        total: 81,
        hasMore: true,
        take: 50,
      },
    })

    expect(feed.meta).toEqual({ total: 81, hasMore: true, take: 50 })
    expect(feed.entries).toHaveLength(1)
    expect(feed.entries[0]).toMatchObject({ id: "seg-5", authorName: "Mica Test" })
  })
})
