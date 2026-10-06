import { describe, it, expect, vi, afterEach } from "vitest"
import { loadAuthorizationAttachments, loadAuthorizationFeed } from "@/lib/mail/authorization-evidence"
import type { SeguimientoEntryView } from "@/lib/api/seguimiento-adapter"
vi.mock("@/lib/auth/client", () => ({ getAccessToken: vi.fn(async () => "synthetic-token") }))

const PNG = "data:image/png;base64,iVBORw0KGgo="
const JPEG = "data:image/jpeg;base64,/9j/AA=="
const NEW_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII="
function entry(id: string, data: Partial<SeguimientoEntryView> = {}): SeguimientoEntryView {
  return { id, entryType: "authorization_evidence", content: "Selected", summary: null, evidenceRef: null, imageEvidenceMeta: null, photoMeta: null, documentMeta: null, ...data } as SeguimientoEntryView
}
afterEach(() => vi.restoreAllMocks())
describe("exact authorization evidence loading", () => {
  it("accepts newly supplied PNG bytes after successfully loading a text-only source", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network"))
    const loaded = await loadAuthorizationAttachments("co", "case", entry("auth", { evidenceRef: { sourceEntryId: "text" } }), [entry("text", { entryType: "note" })], [{ filename: "new.png", content: NEW_PNG, contentType: "image/png" }])
    expect(loaded).toEqual([{ filename: "new.png", content: NEW_PNG.split(",")[1], contentType: "image/png", contentId: "authorization-1" }])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("does not let additional PNG bytes mask a failed source document", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 500 }))
    await expect(loadAuthorizationAttachments("co", "case", entry("auth", { evidenceRef: { sourceEntryId: "doc" } }), [entry("doc", { documentMeta: { status: "queued", fileName: "real.pdf" } })], [{ filename: "new.png", content: NEW_PNG, contentType: "image/png" }])).rejects.toThrow("No se pudo cargar")
  })

  it("keeps own images plus explicitly linked source images and their actual MIME", async () => {
    const source = entry("source", { entryType: "note", imageEvidenceMeta: { fileCount: 1, files: [{ name: "source.jpg", mimeType: "image/jpeg", previewDataUrl: JPEG }] } })
    const selected = entry("selected", { evidenceRef: { sourceEntryId: "source" }, imageEvidenceMeta: { fileCount: 1, files: [{ name: "own.png", previewDataUrl: PNG }] } })
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network"))
    const loaded = await loadAuthorizationAttachments("co", "case", selected, [source, entry("unrelated", { photoMeta: { fileCount: 1, files: [{ previewDataUrl: PNG }] } })])
    expect(loaded).toMatchObject([{ filename: "own.png", contentType: "image/png", contentId: "authorization-1" }, { filename: "source.jpg", contentType: "image/jpeg", contentId: "authorization-2" }])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("downloads actual scoped document bytes with authentication and retains PDF MIME", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, blob: async () => new Blob(["%PDF-1.4\n"], { type: "application/pdf" }) } as Response)
    const loaded = await loadAuthorizationAttachments("co", "case", entry("auth", { evidenceRef: { sourceEntryId: "doc" } }), [entry("doc", { entryType: "document_evidence", documentMeta: { status: "queued", fileName: "real.pdf", mimeType: "application/pdf" } })])
    expect(fetchSpy).toHaveBeenCalledWith("/api/companies/co/surgeries/case/seguimiento/documents/doc", { headers: { Authorization: "Bearer synthetic-token" } })
    expect(loaded).toMatchObject([{ filename: "real.pdf", contentType: "application/pdf", content: btoa("%PDF-1.4\n") }])
    expect(loaded[0].contentId).toBeUndefined()
  })

  it("fails as a whole on document errors, never returns partial images", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 500 }))
    await expect(loadAuthorizationAttachments("co", "case", entry("auth", { imageEvidenceMeta: { fileCount: 1, files: [{ previewDataUrl: PNG }] }, evidenceRef: { sourceEntryId: "doc" } }), [entry("doc", { documentMeta: { status: "queued", fileName: "real.pdf" } })])).rejects.toThrow("No se pudo cargar")
  })

  it("does not guess another evidence when linked source is absent or feed is truncated", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { entries: [], meta: { total: 200, take: 100, hasMore: true } } })))
    await expect(loadAuthorizationAttachments("co", "case", entry("auth", { evidenceRef: { sourceEntryId: "missing" } }))).rejects.toThrow("100 registros")
  })

  it("requests only authorizations for the shared modal's unselected feed and retains truncation metadata", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { entries: [], meta: { total: 101, take: 100, hasMore: true } } })))
    const feed = await loadAuthorizationFeed("co", "case")
    expect(String(fetchSpy.mock.calls[0][0])).toBe("/api/companies/co/surgeries/case/seguimiento?take=100&entryType=authorization_evidence")
    expect(feed.meta.hasMore).toBe(true)
  })

  it("rejects empty entries and source-link cycles", async () => {
    await expect(loadAuthorizationAttachments("co", "case", entry("empty"))).rejects.toThrow("no tiene imágenes")
    await expect(loadAuthorizationAttachments("co", "case", entry("cycle", { evidenceRef: { sourceEntryId: "cycle" } }), [entry("cycle", { evidenceRef: { sourceEntryId: "cycle" } })])).rejects.toThrow("vínculo")
  })
})
