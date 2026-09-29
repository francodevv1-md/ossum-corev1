import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { InvoiceWorkspace } from "@/components/facturacion/InvoiceWorkspace"
import * as invoicesApi from "@/lib/api/invoices"
import * as surgeriesApi from "@/lib/api/backend-surgeries"

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: { id: "company-1", name: "Empresa Test" },
    currentUser: { id: "user-1", email: "test@example.com" },
  }),
}))

describe("InvoiceWorkspace (/ventas/facturacion/nueva)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(surgeriesApi, "fetchBackendActiveSurgeries").mockResolvedValue([
      {
        id: "CIR-001",
        visibleNumber: "CX-00421",
        backendId: "surg-1",
        patient: "Juan Pérez",
        institution: "Sanatorio Los Arcos",
        obraSocial: "OSDE 310",
        date: "2026-09-28",
        state: "Confirmada",
        facturado: false,
      } as any,
    ])
  })

  it("renders the full workspace header, title, badges, and quick buttons", async () => {
    render(<InvoiceWorkspace />)

    expect(screen.getByText("Nueva Factura Operativa")).toBeInTheDocument()
    expect(screen.getByText("Borrador operativo")).toBeInTheDocument()
    expect(screen.getByText("Fiscal DEV: Sin solicitar")).toBeInTheDocument()
    expect(screen.getByText("Buscar en Catálogo")).toBeInTheDocument()
    expect(screen.getByText("+ Línea Libre")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Guardar borrador/i })[0]).toBeInTheDocument()
  })

  it("navigates back to /ventas/facturacion directly when no changes were made", () => {
    render(<InvoiceWorkspace />)

    const backButton = screen.getByText("Facturación").closest("button")!
    fireEvent.click(backButton)

    expect(mockPush).toHaveBeenCalledWith("/ventas/facturacion")
  })

  it("shows discard confirmation dialog when navigating back with unsaved changes", async () => {
    render(<InvoiceWorkspace />)

    // Type a client name to make the form dirty
    const clientInput = screen.getByPlaceholderText(/Buscar contacto o escribir razón social/i)
    fireEvent.change(clientInput, { target: { value: "Hospital Central" } })

    const backButton = screen.getByText("Facturación").closest("button")!
    fireEvent.click(backButton)

    // Discard warning dialog should appear
    expect(screen.getByText("¿Descartar cambios sin guardar?")).toBeInTheDocument()

    // Clicking "Continuar editando" keeps the user in the form
    const continueBtn = screen.getByRole("button", { name: /Continuar editando/i })
    fireEvent.click(continueBtn)
    expect(screen.queryByText("¿Descartar cambios sin guardar?")).not.toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()

    // Clicking "Descartar y salir" proceeds with navigation
    fireEvent.click(backButton)
    const discardBtn = screen.getByRole("button", { name: /Descartar y salir/i })
    fireEvent.click(discardBtn)
    expect(mockPush).toHaveBeenCalledWith("/ventas/facturacion")
  })

  it("renders ORIGEN OPERATIVO with dual states and connects surgery with autocompletion", async () => {
    render(<InvoiceWorkspace />)

    // Verify initial unlinked state
    expect(screen.getByText("ORIGEN OPERATIVO")).toBeInTheDocument()
    expect(screen.getByText("Venta Directa")).toBeInTheDocument()
    expect(screen.getByText("Sin cirugía vinculada")).toBeInTheDocument()

    const linkBtn = screen.getByRole("button", { name: /Vincular cirugía/i })
    expect(linkBtn).toBeInTheDocument()

    // Open link modal
    fireEvent.click(linkBtn)

    // Check modal contents
    await waitFor(() => {
      expect(screen.getByText("Vincular factura a cirugía")).toBeInTheDocument()
      expect(screen.getByText(/Buscá por número CX, paciente, institución o fecha/i)).toBeInTheDocument()
      expect(screen.getByText("CX-00421")).toBeInTheDocument()
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
      expect(screen.getByText("Sanatorio Los Arcos")).toBeInTheDocument()
    })

    // Click on the surgery item to select and confirm
    const surgeryRow = screen.getByText("CX-00421").closest("div[role='option']")!
    fireEvent.click(surgeryRow)

    const confirmModalBtn = screen.getAllByRole("button", { name: /Vincular cirugía/i }).slice(-1)[0]
    fireEvent.click(confirmModalBtn)

    // Modal closes and linked state is visible in ORIGEN OPERATIVO
    await waitFor(() => {
      expect(screen.getByText("Cirugía Vinculada")).toBeInTheDocument()
      expect(screen.getByText("Ver expediente")).toBeInTheDocument()
      expect(screen.getByLabelText("Desvincular cirugía")).toBeInTheDocument()
    })

    // Verify autocompletion of client and reference
    const clientInput = screen.getByPlaceholderText(/Buscar contacto o escribir razón social/i) as HTMLInputElement
    expect(clientInput.value).toBe("OSDE 310")

    const refInput = screen.getByPlaceholderText("OC/Ref") as HTMLInputElement
    expect(refInput.value).toBe("Cirugía CX-00421 · Juan Pérez")
  })

  it("allows unlinking surgery with confirmation when items are loaded", async () => {
    render(<InvoiceWorkspace />)

    // Link a surgery first
    const linkBtn = screen.getByRole("button", { name: /Vincular cirugía/i })
    fireEvent.click(linkBtn)

    await waitFor(() => {
      expect(screen.getByText("CX-00421")).toBeInTheDocument()
    })

    const surgeryRow = screen.getByText("CX-00421").closest("div[role='option']")!
    fireEvent.click(surgeryRow)
    const confirmModalBtn = screen.getAllByRole("button", { name: /Vincular cirugía/i }).slice(-1)[0]
    fireEvent.click(confirmModalBtn)

    await waitFor(() => {
      expect(screen.getByLabelText("Desvincular cirugía")).toBeInTheDocument()
    })

    // Add item to table
    const descInput = screen.getByPlaceholderText(/Descripción o buscar en catálogo/i)
    fireEvent.change(descInput, { target: { value: "Prótesis femoral" } })

    // Click unlink button
    const unlinkBtn = screen.getByLabelText("Desvincular cirugía")
    fireEvent.click(unlinkBtn)

    // Unlink confirmation dialog should appear
    expect(screen.getByText("¿Desvincular cirugía de la factura?")).toBeInTheDocument()

    // Confirm unlinking
    const confirmUnlinkBtn = screen.getByRole("button", { name: /Desvincular cirugía/i })
    fireEvent.click(confirmUnlinkBtn)

    // Should return to unlinked Venta Directa state
    await waitFor(() => {
      expect(screen.getByText("Sin cirugía vinculada")).toBeInTheDocument()
      expect(screen.getByText("Venta Directa")).toBeInTheDocument()
    })
  })

  it("saves a valid draft invoice and redirects to facturacion list", async () => {
    const createDraftSpy = vi.spyOn(invoicesApi, "createInvoiceDraft").mockResolvedValue({
      id: "inv-created-1",
      visibleNumber: null,
      companyId: "company-1",
      state: "Borrador",
      type: "FV",
      currency: "ARS",
      total: "1210.00",
      paidTotal: "0",
      balance: "1210.00",
      items: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any)

    render(<InvoiceWorkspace />)

    // Set description and price
    const descInput = screen.getByPlaceholderText(/Descripción o buscar en catálogo/i)
    fireEvent.change(descInput, { target: { value: "Clavo intramedular" } })

    const priceInputs = screen.getAllByPlaceholderText("0.00")
    fireEvent.change(priceInputs[0], { target: { value: "1000" } })

    const saveButton = screen.getAllByRole("button", { name: /Guardar borrador/i })[0]
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(createDraftSpy).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith("/ventas/facturacion")
    })
  })
})
