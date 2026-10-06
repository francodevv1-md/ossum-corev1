/**
 * SendEmailModal.test.tsx
 *
 * Focalized UI honesty test (roadmap 010). Verifies the post-send toast
 * wording for the two modes of the Resend mail-send path:
 *   - devMode: true  → 🧪 Correo simulado; no fue entregado.
 *   - devMode: false → 📨 Proveedor aceptó el envío (la entrega depende del proveedor).
 *
 * Uses real `SendEmailModal` with `useAuth` mocked, `fetch` mocked, and
 * `toast` from sonner spied. No network, no DB, no env.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { toast } from "sonner"

const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id")
const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id")
const toastWarningSpy = vi.spyOn(toast, "warning").mockImplementation(() => "toast-id")
const { auth } = vi.hoisted(() => ({ auth: {
  activeCompany: { id: "test-co", name: "Test Co" } as { id: string; name: string } | null,
  currentUser: { id: "u1", email: "tester@example.com", firstName: "Test", lastName: "User" } as { id: string; email: string; firstName: string; lastName: string } | null,
} }))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => auth,
}))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: vi.fn(async () => null) }))

// Native dialog shell keeps command tests independent of Radix portals /
// focus management / Presence animation, which otherwise cause a
// `Maximum update depth exceeded` loop in @radix-ui/react-presence under
// jsdom. The SendEmailModal imports: Dialog, DialogContent, DialogHeader,
// DialogTitle, DialogFooter.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { SendEmailModal } from "@/components/mail/SendEmailModal"

const NEW_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII="

const SAMPLE_SURGERY = {
  id: "surgery_x",
  patient: "Paciente Test",
  surgeon: "Dr. X",
  institution: "Clinica Y",
  date: "2026-10-10",
  procedure: "Proc",
  obraSocial: "OS Test",
  client: "Cliente Test",
  financiador: "Financ Test",
} as any

function mockFetchOnce(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected fetch")).mockResolvedValueOnce(
    new Response(JSON.stringify(status >= 400 ? body : { data: body }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  )
}

describe("SendEmailModal — honest toast wording per mode", () => {
  let fetchSpy: ReturnType<typeof mockFetchOnce> | null = null

  beforeEach(() => {
    toastSuccessSpy.mockClear()
    toastErrorSpy.mockClear()
    toastWarningSpy.mockClear()
    auth.activeCompany = { id: "test-co", name: "Test Co" }
    auth.currentUser = { id: "u1", email: "tester@example.com", firstName: "Test", lastName: "User" }
  })

  afterEach(() => {
    // Restore ONLY the per-test fetch spy. Do NOT call vi.restoreAllMocks()
    // because that would also restore the module-level sonner spies and
    // disconnect them for the next test.
    fetchSpy?.mockRestore()
    fetchSpy = null
  })

  it("devMode=true → toast.success('🧪 Correo simulado; no fue entregado.')", async () => {
    fetchSpy = mockFetchOnce({ success: true, id: "dev_resend_42", devMode: true })
    const onClose = vi.fn()

    render(
      <SendEmailModal
        open={true}
        onClose={onClose}
        surgery={SAMPLE_SURGERY}
        initialTo={["dest@example.com"]}
        initialSubject="Asunto de prueba"
      />,
    )

    const sendButton = screen.getByRole("button", { name: /enviar correo/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledTimes(1)
    })
    expect(toastSuccessSpy).toHaveBeenCalledWith("🧪 Correo simulado; no fue entregado.")
  })

  it("devMode=false → toast.success('📨 Proveedor aceptó el envío (la entrega depende del proveedor).')", async () => {
    fetchSpy = mockFetchOnce({ success: true, id: "resend_real_abc", devMode: false })
    const onClose = vi.fn()
    const onEmailSent = vi.fn()

    render(
      <SendEmailModal
        open={true}
        onClose={onClose}
        surgery={SAMPLE_SURGERY}
        initialTo={["dest@example.com"]}
        initialSubject="Asunto de prueba"
        onEmailSent={onEmailSent}
      />,
    )

    const sendButton = screen.getByRole("button", { name: /enviar correo/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledTimes(1)
    })
    expect(toastSuccessSpy).toHaveBeenCalledWith(
      "📨 Proveedor aceptó el envío (la entrega depende del proveedor).",
    )
    expect(onEmailSent).toHaveBeenCalledWith({ id: "resend_real_abc", recipients: ["dest@example.com"] })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.each([
    [400, { error: { code: "mail_dispatch_failed", message: "Provider unavailable" } }, "Provider unavailable"],
    [200, {}, "No se pudo confirmar el despacho del correo"],
  ])("does not report success or close for unsuccessful response %s", async (status, body, message) => {
    fetchSpy = mockFetchOnce(body, status)
    const onClose = vi.fn()
    const onEmailSent = vi.fn()
    render(<SendEmailModal open onClose={onClose} surgery={SAMPLE_SURGERY}
      initialTo={["dest@example.com"]} initialSubject="Test subject" onEmailSent={onEmailSent} />)

    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalledWith(message))
    expect(toastSuccessSpy).not.toHaveBeenCalled()
    expect(onEmailSent).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("does not invent recipients or company context and keeps dispatch disabled without initialized identity", () => {
    auth.activeCompany = null
    auth.currentUser = null
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected fetch"))
    render(<SendEmailModal open onClose={vi.fn()} surgery={SAMPLE_SURGERY} />)
    expect(screen.getByRole("button", { name: /enviar correo/i })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("usuario y empresa")
    expect(screen.queryByText(/districorr/i)).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("preserves edits during rerenders but samples latest props on reopen and case switch", () => {
    const onClose = vi.fn()
    const { rerender } = render(<SendEmailModal open onClose={onClose} surgery={SAMPLE_SURGERY} initialSubject="First" initialNotes="Old notes" initialTo={["first@example.com"]} />)
    fireEvent.change(screen.getByDisplayValue("First"), { target: { value: "User edited" } })
    rerender(<SendEmailModal open onClose={onClose} surgery={{ ...SAMPLE_SURGERY }} initialSubject="Ignored while editing" initialNotes="new parent object" initialTo={["second@example.com"]} />)
    expect(screen.getByDisplayValue("User edited")).toBeInTheDocument()
    expect(screen.getByText("first@example.com")).toBeInTheDocument()
    rerender(<SendEmailModal open={false} onClose={onClose} surgery={SAMPLE_SURGERY} initialSubject="Latest" />)
    rerender(<SendEmailModal open onClose={onClose} surgery={SAMPLE_SURGERY} initialSubject="Latest" initialTo={["latest@example.com"]} />)
    expect(screen.getByDisplayValue("Latest")).toBeInTheDocument()
    expect(screen.getByText("latest@example.com")).toBeInTheDocument()
    rerender(<SendEmailModal open onClose={onClose} surgery={{ ...SAMPLE_SURGERY, id: "other-case" }} initialSubject="Other case" initialTo={[]} />)
    expect(screen.getByDisplayValue("Other case")).toBeInTheDocument()
    expect(screen.queryByText("latest@example.com")).not.toBeInTheDocument()
  })

  it("loads exact linked evidence, previews actual bytes, and dispatches the matching CID", async () => {
    const source = { id: "source", entryType: "note", content: "Source", imageEvidenceMeta: { fileCount: 1, files: [{ name: "actual.jpg", mimeType: "image/jpeg", previewDataUrl: "data:image/jpeg;base64,/9j/AA==" }] } } as any
    const selected = { id: "selected", entryType: "authorization_evidence", content: "Approved", evidenceRef: { sourceEntryId: "source" } } as any
    fetchSpy = mockFetchOnce({ success: true, id: "accepted", devMode: false, auditRecorded: true })
    render(<SendEmailModal open onClose={vi.fn()} surgery={SAMPLE_SURGERY} mode="authorization" initialEvidence={selected} evidenceEntries={[source, selected]} initialTo={["dest@example.com"]} />)
    await waitFor(() => expect(screen.getByRole("img", { name: "actual.jpg" })).toHaveAttribute("src", "data:image/jpeg;base64,/9j/AA=="))
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(JSON.parse(String(fetchSpy!.mock.calls[0][1]?.body)).attachments).toEqual([{ filename: "actual.jpg", content: "/9j/AA==", contentType: "image/jpeg", contentId: "authorization-1" }])
  })

  it("shared Header entry point lists authorizations without auto-selecting unrelated images", async () => {
    fetchSpy = mockFetchOnce({ entries: [{ id: "auth", entryType: "authorization_evidence", content: "Explicit authorization", summary: "Exact choice", createdAt: "2026-10-06", evidenceRef: { imageEvidence: { files: [{ name: "actual.png", mimeType: "image/png", previewDataUrl: "data:image/png;base64,iVBORw0KGgo=" }] } } }], meta: { total: 101, take: 100, hasMore: true } })
    render(<SendEmailModal open onClose={vi.fn()} surgery={SAMPLE_SURGERY} mode="authorization" initialTo={["dest@example.com"]} />)
    await waitFor(() => expect(screen.getByRole("option", { name: "Exact choice" })).toBeInTheDocument())
    expect(screen.getByRole("button", { name: /enviar correo/i })).toBeDisabled()
    expect(screen.getByText(/últimas 100 autorizaciones/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Evidencia de autorización"), { target: { value: "auth" } })
    await waitFor(() => expect(screen.getByRole("img", { name: "actual.png" })).toHaveAttribute("src", "data:image/png;base64,iVBORw0KGgo="))
    expect(screen.getByRole("button", { name: /enviar correo/i })).toBeEnabled()
  })

  it("loads a text-only Novedades source together with newly supplied authorization images", async () => {
    const source = { id: "text-source", entryType: "note", content: "Text authorization" } as any
    fetchSpy = mockFetchOnce({ success: true, id: "accepted" })
    render(<SendEmailModal open onClose={vi.fn()} surgery={SAMPLE_SURGERY} mode="authorization"
      initialEvidence={source} initialAttachments={[{ filename: "new.png", content: NEW_PNG, contentType: "image/png" }]} initialTo={["dest@example.com"]} />)
    await waitFor(() => expect(screen.getByRole("img", { name: "new.png" })).toHaveAttribute("src", NEW_PNG))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(JSON.parse(String(fetchSpy!.mock.calls[0][1]?.body)).attachments).toEqual([{ filename: "new.png", content: NEW_PNG.split(",")[1], contentType: "image/png", contentId: "authorization-1" }])
  })

  it("freezes body controls during dispatch so removal cannot invalidate completion", async () => {
    let resolveFetch!: (value: Response) => void
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>((resolve) => { resolveFetch = resolve }))
    const onClose = vi.fn()
    const onEmailSent = vi.fn()
    render(<SendEmailModal open onClose={onClose} onEmailSent={onEmailSent} surgery={SAMPLE_SURGERY} mode="authorization"
      initialAttachments={[{ filename: "actual.png", content: "data:image/png;base64,iVBORw0KGgo=", contentType: "image/png" }]} initialTo={["dest@example.com"]} />)
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const remove = screen.getByTitle("Quitar adjunto")
    expect(remove).toBeDisabled()
    expect(screen.getByLabelText("Evidencia de autorización")).toBeDisabled()
    expect(screen.getByLabelText("Subir archivo / captura")).toBeDisabled()
    expect(screen.getByPlaceholderText("Escribí un correo y presioná Enter...")).toBeDisabled()
    fireEvent.click(remove)
    expect(screen.getByText("actual.png")).toBeInTheDocument()
    await act(async () => resolveFetch(new Response(JSON.stringify({ data: { success: true, id: "accepted" } }))))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(onEmailSent).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: /enviar correo/i })).toBeEnabled()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it.each(["case switch", "close and reopen"])("does not close a new session when an accepted callback completes after %s", async (transition) => {
    let resolveCallback!: () => void
    const onEmailSent = vi.fn(() => new Promise<void>((resolve) => { resolveCallback = resolve }))
    const onClose = vi.fn()
    fetchSpy = mockFetchOnce({ success: true, id: "accepted" })
    const props = { onClose, onEmailSent, surgery: SAMPLE_SURGERY, initialTo: ["dest@example.com"], initialSubject: "Old session" }
    const { rerender } = render(<SendEmailModal {...props} open />)
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(onEmailSent).toHaveBeenCalledTimes(1))
    if (transition === "close and reopen") rerender(<SendEmailModal {...props} open={false} />)
    rerender(<SendEmailModal {...props} open surgery={transition === "case switch" ? { ...SAMPLE_SURGERY, id: "new-case" } : SAMPLE_SURGERY} initialSubject="New session" />)
    await act(async () => resolveCallback())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue("New session")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /enviar correo/i })).toBeEnabled()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("warns on accepted callback failure and closes without a retry or resend", async () => {
    const onClose = vi.fn()
    fetchSpy = mockFetchOnce({ success: true, id: "accepted" })
    render(<SendEmailModal open onClose={onClose} surgery={SAMPLE_SURGERY} initialTo={["dest@example.com"]}
      onEmailSent={vi.fn(async () => { throw new Error("Refresh failed") })} />)
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(toastWarningSpy).toHaveBeenCalledWith("El correo fue procesado, pero no se pudo actualizar la vista. No lo reenvíes.")
    expect(toastErrorSpy).not.toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("initializes the next case's evidence even when the previous render was sending", async () => {
    let resolveFetch!: (value: Response) => void
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>((resolve) => { resolveFetch = resolve }))
    const onClose = vi.fn()
    const props = { onClose, surgery: SAMPLE_SURGERY, mode: "authorization" as const, initialTo: ["dest@example.com"] }
    const { rerender } = render(<SendEmailModal {...props} open initialAttachments={[{ filename: "old.png", content: NEW_PNG, contentType: "image/png" }]} />)
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const nextEvidence = { id: "next-evidence", entryType: "authorization_evidence", content: "Next", imageEvidenceMeta: { files: [{ name: "next.png", previewDataUrl: NEW_PNG }] } } as any
    rerender(<SendEmailModal {...props} open surgery={{ ...SAMPLE_SURGERY, id: "next-case" }} initialEvidence={nextEvidence} />)
    await waitFor(() => expect(screen.getByRole("img", { name: "next.png" })).toHaveAttribute("src", NEW_PNG))
    await act(async () => resolveFetch(new Response(JSON.stringify({ data: { success: true, id: "old-accepted" } }))))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /enviar correo/i })).toBeEnabled()
    expect(screen.queryByText("old.png")).not.toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("rejects late evidence response after close/case switch", async () => {
    let resolveFetch!: (value: Response) => void
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>((resolve) => { resolveFetch = resolve }))
    const props = { onClose: vi.fn(), surgery: SAMPLE_SURGERY, mode: "authorization" as const, initialTo: ["dest@example.com"] }
    const { rerender } = render(<SendEmailModal {...props} open />)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    rerender(<SendEmailModal {...props} open={false} />)
    await act(async () => resolveFetch(new Response(JSON.stringify({ data: { entries: [{ id: "stale", entryType: "authorization_evidence", summary: "Stale evidence", content: "stale", createdAt: "2026-10-06" }], meta: { total: 1, take: 100, hasMore: false } } }))))
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ data: { entries: [], meta: { total: 0, take: 100, hasMore: false } } })))
    rerender(<SendEmailModal {...props} surgery={{ ...SAMPLE_SURGERY, id: "new-case" }} open />)
    await waitFor(() => expect(screen.getByText(/No hay autorizaciones disponibles/)).toBeInTheDocument())
    expect(screen.queryByRole("option", { name: "Stale evidence" })).not.toBeInTheDocument()
  })

  it("shows retry on failed document load and never enables a partial send", async () => {
    const selected = { id: "doc", entryType: "document_evidence", content: "Original", documentMeta: { status: "queued", fileName: "actual.pdf", mimeType: "application/pdf" } } as any
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("failed", { status: 500 }))
    render(<SendEmailModal open onClose={vi.fn()} surgery={SAMPLE_SURGERY} mode="authorization" initialEvidence={selected} initialTo={["dest@example.com"]} />)
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar"))
    expect(screen.getByRole("button", { name: /enviar correo/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Reintentar carga de evidencia" })).toBeInTheDocument()
    fetchSpy.mockResolvedValue({ ok: true, blob: async () => new Blob(["%PDF-1.4\n"], { type: "application/pdf" }) } as Response)
    fireEvent.click(screen.getByRole("button", { name: "Reintentar carga de evidencia" }))
    await waitFor(() => expect(screen.getByRole("button", { name: /enviar correo/i })).toBeEnabled())
    expect(screen.getByText("actual.pdf")).toBeInTheDocument()
  })

  it("accepted-but-audit-failed warns and closes without resending", async () => {
    fetchSpy = mockFetchOnce({ success: true, id: "accepted", auditRecorded: false, warning: "Audit failed; do not resend" })
    const onClose = vi.fn()
    render(<SendEmailModal open onClose={onClose} surgery={SAMPLE_SURGERY} initialTo={["dest@example.com"]} />)
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(toastWarningSpy).toHaveBeenCalledWith("Audit failed; do not resend")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(toastErrorSpy).not.toHaveBeenCalled()
  })
})
