import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SendExistingFinancialDocumentDialog } from "@/components/email/SendExistingFinancialDocumentDialog"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), toastSuccess: vi.fn() }))

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ activeCompany: { id: "company-1" }, currentUser: { email: "actor@example.com" } }),
}))
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }))

describe("SendExistingFinancialDocumentDialog", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows loading while authoritative documents are pending", () => {
    mocks.apiFetch.mockImplementationOnce(() => new Promise(() => {}))
    render(<SendExistingFinancialDocumentDialog kind="presupuesto" onOpenChange={vi.fn()} />)
    expect(screen.getByText("Cargando…")).toBeInTheDocument()
  })

  it("shows an honest empty state", async () => {
    mocks.apiFetch.mockResolvedValueOnce([])
    render(<SendExistingFinancialDocumentDialog kind="presupuesto" onOpenChange={vi.fn()} />)
    expect(await screen.findByText("No hay presupuestos emitidos disponibles.")).toBeInTheDocument()
  })

  it("shows backend load errors", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new Error("Backend unavailable"))
    render(<SendExistingFinancialDocumentDialog kind="invoice" onOpenChange={vi.fn()} />)
    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument()
  })

  it("lists only backend-issued Presupuestos and submits the selected real ID", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce([
        { id: "draft-1", visibleNumber: null, state: "Borrador", issuedAt: null, currency: "ARS", total: "10" },
        { id: "rejected-2", visibleNumber: 2, state: "Rechazado", issuedAt: "2026-08-29T12:00:00Z", currency: "ARS", total: "50" },
        { id: "budget-7", visibleNumber: 7, state: "Emitido", issuedAt: "2026-08-30T12:00:00Z", currency: "ARS", total: "100" },
        { id: "approved-8", visibleNumber: 8, state: "Aprobado", issuedAt: "2026-08-31T12:00:00Z", currency: "ARS", total: "120" },
      ])
      .mockResolvedValueOnce({ status: "accepted" })
    const onOpenChange = vi.fn()
    render(<SendExistingFinancialDocumentDialog kind="presupuesto" onOpenChange={onOpenChange} />)

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company-1/presupuestos?take=100"))
    fireEvent.click(await screen.findByRole("combobox", { name: "Documento backend" }))
    expect(screen.queryByRole("option", { name: /draft-1/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /Rechazado/i })).not.toBeInTheDocument()
    expect(screen.getByRole("option", { name: /P-0008 · Aprobado/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("option", { name: /P-0007 · Emitido/i }))
    fireEvent.change(screen.getByLabelText("Destinatario"), { target: { value: "recipient@example.com" } })
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }))

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(2))
    const [path, init] = mocks.apiFetch.mock.calls[1]
    expect(path).toBe("/api/companies/company-1/presupuestos/budget-7/email")
    expect(JSON.parse(init.body)).toMatchObject({ to: "recipient@example.com", subject: "Presupuesto P-0007", copyMe: true })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("labels and submits only existing non-fiscal deliverable Invoices", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce([
        { id: "cancelled-1", visibleNumber: 2, state: "Anulada", issuedAt: "2026-08-30T12:00:00Z", currency: "ARS", total: "50" },
        { id: "invoice-3", visibleNumber: 3, state: "Emitida", issuedAt: "2026-08-30T12:00:00Z", currency: "ARS", total: "200" },
      ])
      .mockResolvedValueOnce({ status: "accepted" })
    render(<SendExistingFinancialDocumentDialog kind="invoice" onOpenChange={vi.fn()} />)

    expect(screen.getByText(/PDF es operativo, no fiscal y no contiene CAE/i)).toBeInTheDocument()
    fireEvent.click(await screen.findByRole("combobox", { name: "Documento backend" }))
    expect(screen.queryByRole("option", { name: /Anulada/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("option", { name: /Factura-3 · Emitida/i }))
    fireEvent.change(screen.getByLabelText("Destinatario"), { target: { value: "recipient@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }))

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(2))
    const [path, init] = mocks.apiFetch.mock.calls[1]
    expect(path).toBe("/api/companies/company-1/invoices/invoice-3/email")
    expect(JSON.parse(init.body)).toMatchObject({ subject: "Factura operativa Factura-3", message: expect.stringContaining("no fiscal") })
  })
})
