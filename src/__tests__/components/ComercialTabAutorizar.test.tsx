import React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ComercialTabContent } from "@/components/expediente/ComercialTabContent"
import type { Surgery, Presupuesto } from "@/types"

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ activeCompany: { id: "company-1" } }),
}))

vi.mock("@/hooks/useSurgeryComprobantes", () => ({
  useSurgeryComprobantes: () => ({
    budgets: [],
    invoices: [],
    remittances: [],
    payments: [],
    status: "ready",
    error: null,
    reload: vi.fn(),
  }),
}))

describe("ComercialTabContent - read-only mounted surface", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const mockSurgery: Surgery = {
    id: "CX-001",
    backendId: "surg-backend-1",
    patient: "Juan Perez",
    patientDni: "30123456",
    surgeon: "Dr. Gomez",
    institution: "Sanatorio Modelo",
    institutionCity: "Córdoba",
    procedure: "Artroscopía de rodilla",
    date: "2026-10-15",
    time: "08:00",
    state: "Sin autorizar",
    preparationState: "Sin preparar",
    classification: "Artroscopía",
    client: "OSDE",
    urgente: false,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
    facturado: false,
    autorizado: false,
  }

  const mockApprovedBudget: Presupuesto = {
    id: "PR-001",
    surgeryId: "CX-001",
    client: "OSDE",
    vendedor: "Carlos Ruiz",
    fechaEmision: "2026-10-01",
    vigencia: "30 días",
    listaPrecios: "Lista General",
    state: "Aprobado",
    createdAt: "2026-10-01T10:00:00Z",
    approvedAt: "2026-10-02T10:00:00Z",
    bloqueado: false,
    version: 1,
    versionStatus: "vigente",
    items: [
      {
        stockItemId: "item-1",
        code: "ART-01",
        name: "Clavo intramedular",
        quantity: 1,
        unitPrice: 50000,
        subtotal: 50000,
      },
    ],
    subtotal: 50000,
    total: 50000,
  }

  it("never authorizes a surgery using an approved legacy budget", () => {
    const onAutorizarMock = vi.fn()

    render(
      <ComercialTabContent
        surgery={mockSurgery}
        presupuestos={[mockApprovedBudget]}
        onAutorizar={onAutorizarMock}
        remitos={[]}
        comprobantes={[]}
        resumenCobranza={{ saldoPendiente: 0, facturas: [] } as never}
      />
    )

    // This tab is a document register, not an authorization surface. The old
    // expectation was already absent in the received parent implementation.
    expect(screen.queryByRole("button", { name: /Autorizar CX/i })).not.toBeInTheDocument()
    expect(screen.queryByText("PR-001")).not.toBeInTheDocument()
    expect(screen.getByText("Sin comprobantes vinculados a esta cirugía.")).toBeInTheDocument()
    expect(onAutorizarMock).not.toHaveBeenCalled()
  })
})
