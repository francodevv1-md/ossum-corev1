import React from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NovedadesTabContent } from "@/components/expediente/NovedadesTabContent"
import type { Surgery } from "@/types"
import type { SeguimientoEntryView } from "@/lib/api/seguimiento-adapter"
import type { SendEmailModal } from "@/components/mail/SendEmailModal"

const mocks = vi.hoisted(() => ({
  auth: { activeCompany: { id: "company-1" }, currentAccess: { role: "admin" } },
  feed: { entries: [] as SeguimientoEntryView[], highlightedEntries: [] as SeguimientoEntryView[] },
  createAuthorizationEvidence: vi.fn(),
  refetch: vi.fn(),
  modal: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  getAccessToken: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => mocks.auth }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: mocks.getAccessToken }))
vi.mock("@/lib/api/client", () => ({ ApiClientError: class extends Error { status = 500 } }))
vi.mock("@/hooks/useIsMobile", () => ({ useIsMobile: () => false }))
vi.mock("@/hooks/useSeguimientoFeed", () => ({
  useSeguimientoFeed: () => ({
    ...mocks.feed,
    loading: false, error: null, total: mocks.feed.entries.length, canLoadMore: false,
    addingNote: false, addingPhotoEvidence: false, addingDocumentEvidence: false,
    addingAuthorizationEvidence: false, editingEntryId: null, loadingMore: false,
    createAuthorizationEvidence: mocks.createAuthorizationEvidence, refetch: mocks.refetch,
  }),
}))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))
vi.mock("@/components/mail/SendEmailModal", () => ({
  SendEmailModal: (props: React.ComponentProps<typeof SendEmailModal>) => {
    mocks.modal(props)
    return <div role="dialog" aria-label="Authorization email"><button onClick={props.onClose}>Close email</button></div>
  },
}))
vi.mock("@/components/expediente/correo/ImportEvidenceFromMailModal", () => ({ ImportEvidenceFromMailModal: () => null }))
vi.mock("@/components/expediente/correo/MailTextViewer", () => ({ MailTextViewer: () => null }))
vi.mock("@/components/shared/image/ImageViewerDialog", () => ({ ImageViewerDialog: () => null }))
vi.mock("@/components/shared/mentions/MentionComposer", () => ({
  MentionComposer: React.forwardRef<HTMLTextAreaElement, {
    value: { content: string; mentions: [] }
    onChange: (value: { content: string; mentions: [] }) => void
    placeholder: string
  }>(function MockMentionComposer({ value, onChange, placeholder }, ref) {
    return <textarea ref={ref} value={value.content} placeholder={placeholder} onChange={(event) => onChange({ content: event.target.value, mentions: [] })} />
  }),
}))

// Native shells isolate caller state from portal/focus/animation lifecycles.
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}))
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

const surgery = { id: "case-1", backendId: "backend-case-1", patient: "Synthetic patient" } as Surgery
const previewDataUrl = "data:image/png;base64,aW1hZ2U="

function entry(id: string, overrides: Partial<SeguimientoEntryView> = {}): SeguimientoEntryView {
  return {
    id, entryType: "note", content: `Synthetic source ${id}`, summary: null,
    authorId: "synthetic-user", authorName: "Synthetic user", evidenceRef: null,
    createdAt: "2026-10-06T10:00:00.000Z", timestamp: 0, isHighlighted: false,
    notePriority: null, noteType: null, mailMeta: null, photoMeta: null,
    imageEvidenceMeta: null, documentMeta: null, logisticsMeta: null,
    editHistory: null, mentions: [], ...overrides,
  }
}

function modalProps(): React.ComponentProps<typeof SendEmailModal> {
  return mocks.modal.mock.calls.at(-1)![0]
}

async function registerAuthorization() {
  fireEvent.change(screen.getByPlaceholderText("Describí la autorización registrada..."), { target: { value: "Synthetic authorization notes" } })
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "selected-source" } })
  fireEvent.click(screen.getByRole("button", { name: "Registrar autorización" }))
  await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Autorización registrada", expect.anything()))
  return mocks.success.mock.calls.find(([message]) => message === "Autorización registrada")![1].action.onClick as () => void
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.activeCompany.id = "company-1"
  mocks.feed.entries = []
  mocks.feed.highlightedEntries = []
  mocks.createAuthorizationEvidence.mockResolvedValue(undefined)
  mocks.fetch.mockRejectedValue(new Error("Unexpected network call in isolated caller test"))
  mocks.getAccessToken.mockRejectedValue(new Error("Unexpected auth client call in isolated caller test"))
  vi.stubGlobal("fetch", mocks.fetch)
  vi.spyOn(window, "scrollTo").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  expect(mocks.fetch).not.toHaveBeenCalled()
  expect(mocks.getAccessToken).not.toHaveBeenCalled()
})

describe("Novedades authorization email caller (mocked boundaries)", () => {
  it.each(["authorization_evidence", "document_evidence"] as const)("passes the exact existing %s and feed snapshot, not a guessed source", (entryType) => {
    const source = entry("original-source")
    const evidence = entry("selected-evidence", {
      entryType, content: "Exact selected evidence notes", evidenceRef: { sourceEntryId: source.id },
      ...(entryType === "document_evidence" ? { documentMeta: { fileName: "autorizacion.pdf", mimeType: "application/pdf", sizeBytes: 10, status: "queued" } } : {}),
    })
    mocks.feed.entries = [source, evidence]
    render(<NovedadesTabContent surgery={surgery} />)

    fireEvent.click(screen.getByRole("button", { name: "Emitir correo formal (Resend)" }))

    expect(modalProps()).toMatchObject({ open: true, mode: "authorization", initialNotes: evidence.content, initialAttachments: [] })
    expect(modalProps().surgery).toBe(surgery)
    expect(modalProps().initialEvidence).toBe(evidence)
    expect(modalProps().evidenceEntries).toEqual([source, evidence])
    expect(modalProps().evidenceEntries?.[0]).toBe(source)
    expect(modalProps().evidenceEntries).not.toBe(mocks.feed.entries)
  })

  it("retains the selected text-only source and new image after a void authorization result and feed replacement", async () => {
    const source = entry("selected-source")
    const unrelated = entry("unrelated-source")
    mocks.feed.entries = [unrelated, source]
    let finish!: () => void
    mocks.createAuthorizationEvidence.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    vi.stubGlobal("Image", class {
      naturalWidth = 24
      naturalHeight = 16
      onload: (() => void) | null = null
      set src(_value: string) { queueMicrotask(() => this.onload?.()) }
    })
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:synthetic-image")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(previewDataUrl)
    const props = { surgery, initialAddAction: "auth" as const, initialAddActionKey: 1 }
    const view = render(<NovedadesTabContent {...props} />)
    const image = new File(["synthetic-image"], "new-authorization.png", { type: "image/png" })
    fireEvent.change(view.container.querySelector('input[type="file"][accept="image/*"]')!, { target: { files: [image] } })
    await screen.findByAltText(image.name)
    fireEvent.change(screen.getByPlaceholderText("Describí la autorización registrada..."), { target: { value: "Synthetic authorization notes" } })
    fireEvent.change(screen.getByRole("combobox"), { target: { value: source.id } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar autorización" }))
    await waitFor(() => expect(mocks.createAuthorizationEvidence).toHaveBeenCalledWith(source.id, expect.objectContaining({ imageEvidence: { files: [expect.objectContaining({ name: image.name, previewDataUrl })] } })))
    mocks.feed.entries = [entry("newest-unrelated", { entryType: "authorization_evidence" })]
    view.rerender(<NovedadesTabContent {...props} />)
    await act(async () => { finish() })
    const onClick = mocks.success.mock.calls.find(([message]) => message === "Autorización registrada")![1].action.onClick
    act(() => onClick())

    expect(modalProps().initialEvidence).toBe(source)
    expect(modalProps().evidenceEntries).toEqual([unrelated, source])
    expect(modalProps().evidenceEntries?.[1]).toBe(source)
    expect(modalProps().initialNotes).toBe("Synthetic authorization notes")
    expect(modalProps().initialAttachments).toEqual([{ filename: image.name, content: previewDataUrl, contentType: "image/png", isImage: true }])
    await waitFor(() => expect(screen.queryByPlaceholderText("Describí la autorización registrada...")).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: "Close email" }))
    fireEvent.click(screen.getByRole("button", { name: "Emitir correo formal (Resend)" }))
    expect(modalProps().initialEvidence).toBe(mocks.feed.entries[0])
    expect(modalProps().evidenceEntries).toEqual(mocks.feed.entries)
    expect(modalProps().initialAttachments).toEqual([])
    expect(modalProps().initialNotes).toBe(mocks.feed.entries[0].content)
  })

  it.each(["case", "backend case", "company"])("ignores an old authorization toast after switching %s", async (context) => {
    mocks.feed.entries = [entry("selected-source")]
    const view = render(<NovedadesTabContent surgery={surgery} initialAddAction="auth" initialAddActionKey={1} />)
    const onClick = await registerAuthorization()
    if (context === "company") mocks.auth.activeCompany.id = "company-2"
    const nextSurgery = context === "case" ? { ...surgery, id: "case-2", backendId: "backend-case-2" }
      : context === "backend case" ? { ...surgery, backendId: "backend-case-2" } : surgery
    view.rerender(<NovedadesTabContent surgery={nextSurgery} />)
    act(() => onClick())

    expect(screen.queryByRole("dialog", { name: "Authorization email" })).not.toBeInTheDocument()
    expect(mocks.modal).not.toHaveBeenCalled()
  })

  it.each(["case", "backend case", "company"])("closes an already-open email when switching %s", (context) => {
    mocks.feed.entries = [entry("selected-evidence", { entryType: "authorization_evidence" })]
    const view = render(<NovedadesTabContent surgery={surgery} />)
    fireEvent.click(screen.getByRole("button", { name: "Emitir correo formal (Resend)" }))
    expect(screen.getByRole("dialog", { name: "Authorization email" })).toBeInTheDocument()
    if (context === "company") mocks.auth.activeCompany.id = "company-2"
    const nextSurgery = context === "case" ? { ...surgery, id: "case-2", backendId: "backend-case-2" }
      : context === "backend case" ? { ...surgery, backendId: "backend-case-2" } : surgery
    view.rerender(<NovedadesTabContent surgery={nextSurgery} />)

    expect(screen.queryByRole("dialog", { name: "Authorization email" })).not.toBeInTheDocument()
  })
})
