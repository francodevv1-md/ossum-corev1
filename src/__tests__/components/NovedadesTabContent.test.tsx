import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NovedadesTabContent } from "@/components/expediente/NovedadesTabContent"

const editEntry = vi.fn()
const { authState, feedState } = vi.hoisted(() => ({
  authState: { role: "admin" },
  feedState: { entries: [
    { id: "note-1", entryType: "note", content: "Nota editable", summary: "Resumen", authorId: "u-1", authorName: "Ana", evidenceRef: null, createdAt: "2026-07-15T10:00:00.000Z", timestamp: 0, isHighlighted: false, notePriority: "media", noteType: null, mailMeta: null, photoMeta: null, imageEvidenceMeta: null, editHistory: null, mentions: [] },
    { id: "auth-1", entryType: "authorization_evidence", content: "Autorización", summary: null, authorId: "u-1", authorName: "Ana", evidenceRef: null, createdAt: "2026-07-15T10:00:00.000Z", timestamp: 0, isHighlighted: false, notePriority: null, noteType: null, mailMeta: null, photoMeta: null, imageEvidenceMeta: null, editHistory: null, mentions: [] },
  ] as Array<Record<string, unknown>> },
}))

vi.mock("@/hooks/useSeguimientoFeed", () => ({
  useSeguimientoFeed: () => ({
    entries: feedState.entries,
    loading: false, error: null, addNote: vi.fn(), addPhotoEvidence: vi.fn(), createAuthorizationEvidence: vi.fn(), addingNote: false, addingPhotoEvidence: false, addingAuthorizationEvidence: false, highlightedEntries: [], editEntry, editingEntryId: null, take: 50, total: 2, canLoadMore: false, loadMore: vi.fn(), loadingMore: false, refetch: vi.fn(),
  }),
}))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-1" }, currentAccess: { role: authState.role } }) }))
vi.mock("@/components/expediente/correo/ImportEvidenceFromMailModal", () => ({ ImportEvidenceFromMailModal: () => null }))
vi.mock("@/lib/api/mentionable-users", () => ({ fetchMentionableUsers: vi.fn().mockResolvedValue([]) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe("NovedadesTabContent", () => {
  it("offers Modify only on admin-visible notes, never on authorization evidence", () => {
    authState.role = "admin"
    const { container } = render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} />)
    expect(container.querySelectorAll('[title="Editar novedad"]')).toHaveLength(1)
    expect(container.textContent).toContain("Autorización")
  })

  it("hides Modify for non-admin users while retaining the feed", () => {
    authState.role = "coordinator"
    const { container } = render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} />)
    expect(container.querySelectorAll('[title="Editar novedad"]')).toHaveLength(0)
    expect(container.textContent).toContain("Nota editable")
  })

  it("sends explicit image removal while leaving image evidence omitted until changed", async () => {
    authState.role = "admin"
    editEntry.mockReset()
    editEntry.mockResolvedValue(undefined)
    feedState.entries = [{ ...feedState.entries[0], imageEvidenceMeta: { source: "manual_event_edit", fileCount: 1, files: [{ name: "nota.png", mimeType: "image/png", sizeBytes: 10, previewDataUrl: "data:image/png;base64,abc" }] } }]
    const { container } = render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} />)
    const editButton = container.querySelector<HTMLButtonElement>('[title="Editar novedad"]')!
    fireEvent.click(editButton)
    expect(container.textContent).toContain("Quitar imágenes")
    const saveWithoutImageChange = screen.getByRole("button", { name: "Guardar" })
    fireEvent.click(saveWithoutImageChange)
    await waitFor(() => expect(editEntry).toHaveBeenLastCalledWith("note-1", expect.not.objectContaining({ imageEvidence: expect.anything() })))

    fireEvent.click(container.querySelector<HTMLButtonElement>('[title="Editar novedad"]')!)
    fireEvent.click(screen.getByRole("button", { name: "Quitar imágenes" }))
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))
    await waitFor(() => expect(editEntry).toHaveBeenLastCalledWith("note-1", expect.objectContaining({ imageEvidence: { files: [] } })))
  })

  it("replaces the editable summary with the existing Spanish Type selector", async () => {
    authState.role = "admin"
    editEntry.mockReset()
    editEntry.mockResolvedValue(undefined)
    feedState.entries = [{ ...feedState.entries[0], noteType: "general" }]
    const { container } = render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} />)

    fireEvent.click(container.querySelector<HTMLButtonElement>('[title="Editar novedad"]')!)
    expect(screen.queryByLabelText("Resumen de la novedad")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("combobox", { name: "Tipo de la novedad" }))
    fireEvent.click(screen.getByRole("option", { name: "Urgente" }))
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => expect(editEntry).toHaveBeenLastCalledWith("note-1", expect.objectContaining({ noteType: "urgente" })))
    expect(editEntry).toHaveBeenLastCalledWith("note-1", expect.not.objectContaining({ summary: expect.anything(), entryType: expect.anything() }))
  })
})
