/**
 * CoordinatorShareDialog.test.tsx
 *
 * Focalized UI honesty test (roadmap 010). Verifies the post-send toast
 * wording for the email-formal path of `CoordinatorShareDialog`:
 *   - devMode: true  → 🧪 Correo simulado; no fue entregado.
 *   - devMode: false → 📨 Proveedor aceptó el envío (la entrega depende del proveedor).
 *
 * Uses real `CoordinatorShareDialog` with hooks mocked and `fetch` mocked.
 * No network, no DB, no env.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { toast } from "sonner"

const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id")
const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id")

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: { id: "test-co", name: "Test Co" },
    currentUser: { id: "u1", displayName: "Tester", email: "t@x.com" },
  }),
}))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: vi.fn(async () => null) }))

// Match the hooks' stable collections; fresh arrays would retrigger the
// evidence-selection effect on every render and prevent the test finishing.
const { store, feed } = vi.hoisted(() => ({
  store: { remitos: [], presupuestos: [] },
  feed: {
    entries: [],
    loading: false,
    error: null,
    addNote: vi.fn(async () => ({ id: "note_1" })),
    addingNote: false,
  },
}))

vi.mock("@/lib/store", () => ({ useOrtoTrackStore: () => store }))
vi.mock("@/hooks/useSeguimientoFeed", () => ({ useSeguimientoFeed: () => feed }))

// Email command tests do not need the channel's exit animation to finish.
vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Native dialog + sheet shells keep command tests independent of Radix
// portals / focus management / Presence animation, which otherwise cause a
// `Maximum update depth exceeded` loop in @radix-ui/react-presence under
// jsdom. The CoordinatorShareDialog imports Dialog, DialogContent,
// DialogHeader, DialogTitle (from @/components/ui/dialog) and Sheet,
// SheetContent, SheetHeader, SheetTitle (from @/components/ui/sheet; the
// sheet path is only reached on mobile, but we still mock the module
// to keep the import surface contract).
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <>{children}</> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

import { CoordinatorShareDialog } from "@/components/coordinadores/CoordinatorShareDialog"

const SAMPLE_ENTRY = {
  surgery: {
    backendId: "surgery_x",
    id: "surgery_x",
    visibleNumber: "CX-1040",
    patient: "Paciente Test",
    surgeon: "Dr. X",
    institution: "Clinica Y",
    date: "2026-10-10",
    urgente: false,
    procedure: "Proc",
    materialAvailabilityDate: "2026-10-09",
  },
  sla: { tone: "ok" },
  history: [],
  materialAvailabilityLabel: "OK",
  materialAvailabilityDefined: true,
  bucket: null,
  subgroup: null,
} as any

function mockFetchOnce(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected fetch")).mockResolvedValueOnce(
    new Response(JSON.stringify(status >= 400 ? body : { data: body }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  )
}

describe("CoordinatorShareDialog — honest toast wording per mode (email-formal path)", () => {
  let fetchSpy: ReturnType<typeof mockFetchOnce> | null = null

  beforeEach(() => {
    toastSuccessSpy.mockClear()
    toastErrorSpy.mockClear()
    feed.addNote.mockClear()
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

    render(
      <CoordinatorShareDialog
        open={true}
        onOpenChange={() => {}}
        entry={SAMPLE_ENTRY}
      />,
    )

    // Switch to the email tab
    const emailTab = screen.getByRole("button", { name: /correo formal/i })
    fireEvent.click(emailTab)

    // Fill the email recipient field
    const emailToInput = screen.getByRole("textbox", { name: /destinatario/i })
    fireEvent.change(emailToInput, { target: { value: "dest@example.com" } })

    const sendButton = screen.getByRole("button", { name: /enviar correo/i })
    expect(sendButton).toBeEnabled()
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledTimes(1)
    })
    expect(toastSuccessSpy).toHaveBeenCalledWith("🧪 Correo simulado; no fue entregado.")
    await waitFor(() => expect(feed.addNote).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("Simulación de reporte por Correo (DEV; no entregado)"),
    })))
  })

  it("devMode=false → toast.success('📨 Proveedor aceptó el envío (la entrega depende del proveedor).')", async () => {
    fetchSpy = mockFetchOnce({ success: true, id: "resend_real_abc", devMode: false })

    render(
      <CoordinatorShareDialog
        open={true}
        onOpenChange={() => {}}
        entry={SAMPLE_ENTRY}
      />,
    )

    const emailTab = screen.getByRole("button", { name: /correo formal/i })
    fireEvent.click(emailTab)

    const emailToInput = screen.getByRole("textbox", { name: /destinatario/i })
    fireEvent.change(emailToInput, { target: { value: "dest@example.com" } })

    const sendButton = screen.getByRole("button", { name: /enviar correo/i })
    expect(sendButton).toBeEnabled()
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledTimes(1)
    })
    expect(toastSuccessSpy).toHaveBeenCalledWith(
      "📨 Proveedor aceptó el envío (la entrega depende del proveedor).",
    )
    await waitFor(() => expect(feed.addNote).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("Acción: Reporte formal por Correo"),
    })))
  })

  it.each([
    [400, { error: { code: "mail_dispatch_failed", message: "Provider unavailable" } }, "Provider unavailable"],
    [200, {}, "No se pudo confirmar el despacho del correo"],
  ])("does not report success, track or close for unsuccessful response %s", async (status, body, message) => {
    fetchSpy = mockFetchOnce(body, status)
    const onOpenChange = vi.fn()
    render(<CoordinatorShareDialog open onOpenChange={onOpenChange} entry={SAMPLE_ENTRY} />)
    fireEvent.click(screen.getByRole("button", { name: /correo formal/i }))
    fireEvent.change(screen.getByRole("textbox", { name: /destinatario/i }), {
      target: { value: "dest@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))

    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalledWith(message))
    expect(toastSuccessSpy).not.toHaveBeenCalled()
    expect(feed.addNote).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it.each([true, false])("does not duplicate tracking when current route reports auditRecorded=%s", async (auditRecorded) => {
    fetchSpy = mockFetchOnce({ success: true, id: "accepted", auditRecorded, warning: auditRecorded ? undefined : "Tracking failed; do not resend" })
    const onOpenChange = vi.fn()
    render(<CoordinatorShareDialog open onOpenChange={onOpenChange} entry={SAMPLE_ENTRY} />)
    fireEvent.click(screen.getByRole("button", { name: /correo formal/i }))
    fireEvent.change(screen.getByRole("textbox", { name: /destinatario/i }), { target: { value: "dest@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /enviar correo/i }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(feed.addNote).not.toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
