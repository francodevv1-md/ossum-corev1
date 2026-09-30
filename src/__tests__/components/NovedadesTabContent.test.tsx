import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { canPublishSeguimientoComposer, NovedadesTabContent } from "@/components/expediente/NovedadesTabContent"

const editEntry = vi.fn()
const { authState, feedState, addDocumentEvidence, downloadDocumentEvidence } = vi.hoisted(() => ({
  authState: { role: "admin" },
  addDocumentEvidence: vi.fn(),
  downloadDocumentEvidence: vi.fn(),
  feedState: { entries: [
    { id: "note-1", entryType: "note", content: "Nota editable", summary: "Resumen", authorId: "u-1", authorName: "Ana", evidenceRef: null, createdAt: "2026-07-15T10:00:00.000Z", timestamp: 0, isHighlighted: false, notePriority: "media", noteType: null, mailMeta: null, photoMeta: null, imageEvidenceMeta: null, editHistory: null, mentions: [] },
    { id: "auth-1", entryType: "authorization_evidence", content: "Autorización", summary: null, authorId: "u-1", authorName: "Ana", evidenceRef: null, createdAt: "2026-07-15T10:00:00.000Z", timestamp: 0, isHighlighted: false, notePriority: null, noteType: null, mailMeta: null, photoMeta: null, imageEvidenceMeta: null, editHistory: null, mentions: [] },
  ] as Array<Record<string, unknown>> },
}))

vi.mock("@/hooks/useSeguimientoFeed", () => ({
  useSeguimientoFeed: () => ({
    entries: feedState.entries,
    loading: false, error: null, addNote: vi.fn(), addPhotoEvidence: vi.fn(), addDocumentEvidence, downloadDocumentEvidence, createAuthorizationEvidence: vi.fn(), addingNote: false, addingPhotoEvidence: false, addingDocumentEvidence: false, addingAuthorizationEvidence: false, highlightedEntries: [], editEntry, editingEntryId: null, take: 50, total: 2, canLoadMore: false, loadMore: vi.fn(), loadingMore: false, refetch: vi.fn(),
  }),
}))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-1" }, currentAccess: { role: authState.role } }) }))
vi.mock("@/components/expediente/correo/ImportEvidenceFromMailModal", () => ({ ImportEvidenceFromMailModal: () => null }))
vi.mock("@/lib/api/mentionable-users", () => ({ fetchMentionableUsers: vi.fn().mockResolvedValue([]) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe("NovedadesTabContent", () => {
  it("prioritizes case context, important updates, and the full history", () => {
    render(<NovedadesTabContent surgery={{ id: "surgery-1", patient: "Paciente Demo", date: "2026-08-16", time: "10:00", preparationState: "Sin preparar", state: "Autorizada" } as never} />)

    expect(screen.getByRole("heading", { name: /surgery-1 · Paciente Demo/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "NOVEDADES IMPORTANTES" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "HISTORIAL COMPLETO" })).toBeInTheDocument()
    expect(screen.getAllByText("Preparación").length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText("Recorrido estimado del caso")).toHaveLength(2)
  })

  it("does not show pending path steps for terminal cases", () => {
    render(<NovedadesTabContent surgery={{ id: "surgery-1", patient: "Paciente Demo", preparationState: "Sin preparar", state: "Finalizada" } as never} />)

    expect(screen.getAllByText("Recorrido completado · Finalizada")).toHaveLength(2)
    expect(screen.getByText("Sin plazo pendiente")).toBeInTheDocument()
    expect(screen.queryByText("Envío previsto")).not.toBeInTheDocument()
  })

  it("offers every action requested by the Coordination management surface", async () => {
    authState.role = "admin"
    render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} availableAddActions={["note", "mail", "image"]} openAddSheetKey={1} />)

    for (const name of ["Agregar nota", "Adjuntar documento", "Importar desde correo"]) {
      expect(await screen.findByRole("button", { name: new RegExp(name, "i") })).toBeInTheDocument()
    }
    expect(screen.queryByRole("button", { name: /Marcar autorizado/i })).not.toBeInTheDocument()
  })

  it("does not offer mutation actions to coordinators", async () => {
    authState.role = "coordinator"
    render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} openAddSheetKey={1} />)

    await waitFor(() => expect(screen.queryByRole("button", { name: /Agregar nota/i })).not.toBeInTheDocument())
    expect(screen.queryByRole("button", { name: /Marcar autorizado/i })).not.toBeInTheDocument()
  })

  it("does not expose the composer to coordinators", async () => {
    authState.role = "coordinator"
    render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} initialAddAction="note" initialAddActionKey={1} />)

    await waitFor(() => expect(screen.queryByRole("button", { name: "Tipo y prioridad" })).not.toBeInTheDocument())
  })

  it("rejects a direct authorization composer request from coordinators", async () => {
    authState.role = "coordinator"
    render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} initialAddAction="auth" initialAddActionKey={1} />)

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Registrar autorización" })).not.toBeInTheDocument())
  })

  it("allows publishing image evidence without requiring text", () => {
    expect(canPublishSeguimientoComposer("", 1)).toBe(true)
    expect(canPublishSeguimientoComposer("", 0)).toBe(false)
    expect(canPublishSeguimientoComposer("", 1, true)).toBe(false)
  })

  it("uploads one PDF through the durable document action", async () => {
    authState.role = "admin"
    addDocumentEvidence.mockReset()
    addDocumentEvidence.mockResolvedValue(undefined)
    const { container } = render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} initialAddAction="note" initialAddActionKey={1} />)
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    const pdf = new File(["%PDF-1"], "case.pdf", { type: "application/pdf" })
    fireEvent.change(input, { target: { files: [pdf] } })

    expect(await screen.findByText("case.pdf")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Publicar novedad" }))
    await waitFor(() => expect(addDocumentEvidence).toHaveBeenCalledWith({ file: pdf, content: "" }))
  })

  it("keeps document upload directly visible in the Ficha CX header", () => {
    authState.role = "admin"
    render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} />)
    expect(screen.getByRole("button", { name: "Adjuntar documento" })).toBeInTheDocument()
  })

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

  it("does not open the image viewer when no photo index is active", () => {
    authState.role = "admin"
    feedState.entries = [
      {
        id: "note-photo-1",
        entryType: "file_photo_evidence",
        content: "Foto de prueba",
        photoMeta: {
          source: "composer",
          fileCount: 1,
          files: [{ name: "prueba.jpg", mimeType: "image/jpeg", sizeBytes: 2048, previewDataUrl: "data:image/jpeg;base64,123" }],
        },
        mentions: [],
      },
    ]
    render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} />)

    // Image thumbnail is rendered, but dialog is not open
    expect(screen.getByAltText("prueba.jpg")).toBeInTheDocument()
    expect(screen.queryByTitle("Acercar (+)")).not.toBeInTheDocument()
  })

  it("opens image viewer with download and share capabilities when an image is selected", async () => {
    authState.role = "admin"
    feedState.entries = [
      {
        id: "note-photo-1",
        entryType: "file_photo_evidence",
        content: "Foto de prueba",
        photoMeta: {
          source: "composer",
          fileCount: 1,
          files: [{ name: "evidencia-quirurgica.jpg", mimeType: "image/jpeg", sizeBytes: 2048, previewDataUrl: "data:image/jpeg;base64,123" }],
        },
        mentions: [],
      },
    ]
    render(<NovedadesTabContent surgery={{ id: "surgery-1" } as never} />)

    const imgThumbnail = screen.getByAltText("evidencia-quirurgica.jpg")
    fireEvent.click(imgThumbnail.closest("button")!)

    // Dialog should open showing image controls
    expect(await screen.findByTitle("Acercar (+)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Descargar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Compartir/i })).toBeInTheDocument()
  })
})
