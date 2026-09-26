import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"
import { CoordinatorShareDialog } from "@/components/coordinadores/CoordinatorShareDialog"
import { SendRemitoEmailDialog } from "@/components/remitos/SendRemitoEmailDialog"
import type { RemitoApiRow } from "@/lib/api/remitos"

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  addNote: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  feedEntries: [],
}))

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ activeCompany: { id: "company-1" }, currentUser: { email: "actor@example.com" } }),
}))
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))
vi.mock("@/hooks/useSeguimientoFeed", () => ({
  useSeguimientoFeed: () => ({ entries: mocks.feedEntries, loading: false, error: null, addNote: mocks.addNote, addingNote: false }),
}))
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError, warning: vi.fn(), info: vi.fn() } }))

const remito = {
  id: "rem-1",
  visibleNumber: 12,
  state: "Emitido",
  destinatarioSnapshot: { nombre: "Hospital Central" },
} as unknown as RemitoApiRow

const coordinatorCase = {
  surgery: {
    id: "surgery-1",
    visibleNumber: "CX-0012",
    patient: "Paciente Test",
    institution: "Hospital Central",
    surgeon: "Profesional Test",
  },
  history: [],
  bucket: "autorizado",
  subgroup: "pendiente-coordinar",
  materialAvailabilityDefined: false,
  materialAvailabilityLabel: "Sin definir",
  sla: { tone: "missing", label: "SLA sin base", hoursElapsed: null },
} as unknown as CoordinatorCase

describe("outbound document email dialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiFetch.mockResolvedValue({ provider: "resend", providerMessageId: "email-1", status: "accepted" })
    mocks.addNote.mockResolvedValue({ id: "note-1" })
  })

  it("submits an issued Remito as a PDF email with an optional copy", async () => {
    const onOpenChange = vi.fn()
    render(<SendRemitoEmailDialog remito={remito} open onOpenChange={onOpenChange} />)

    expect(screen.getByText(/se adjuntará el PDF del remito emitido/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Asunto")).toHaveValue("Remito R-0012")
    fireEvent.change(screen.getByLabelText("Destinatario"), { target: { value: "recipient@example.com" } })
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }))

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1))
    const [path, init] = mocks.apiFetch.mock.calls[0]
    expect(path).toBe("/api/companies/company-1/remitos/rem-1/email")
    expect(JSON.parse(init.body)).toMatchObject({ to: "recipient@example.com", subject: "Remito R-0012", copyMe: true })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("submits the coordinator report and records its tracking event", async () => {
    const onOpenChange = vi.fn()
    render(<CoordinatorShareDialog entry={coordinatorCase} open onOpenChange={onOpenChange} />)

    const recipient = await screen.findByLabelText("Destinatario")
    await waitFor(() => expect(screen.getByLabelText("Asunto")).toHaveValue("Resumen operativo CX-0012"))
    fireEvent.change(screen.getByPlaceholderText("Escribí el mensaje para compartir la cirugía"), { target: { value: "Mensaje visible y editado" } })
    fireEvent.change(recipient, { target: { value: "recipient@example.com" } })
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte por correo" }))

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1))
    const [path, init] = mocks.apiFetch.mock.calls[0]
    expect(path).toBe("/api/companies/company-1/surgeries/surgery-1/reports/email")
    expect(JSON.parse(init.body)).toMatchObject({ to: "recipient@example.com", subject: "Resumen operativo CX-0012", message: "Mensaje visible y editado", copyMe: true })
    await waitFor(() => expect(mocks.addNote).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("Reporte enviado por correo") })))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
