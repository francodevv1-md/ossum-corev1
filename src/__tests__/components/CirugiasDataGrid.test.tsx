import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: useAuthMock,
}))

import { CirugiasDataGrid } from "@/components/cirugias/CirugiasDataGrid"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DEFAULT_VISIBLE_COLS, CIRUGIAS_COLUMNS } from "@/lib/cirugias.constants"
import type { Surgery } from "@/types"

const mockSurgery: Surgery = {
  id: "1",
  patient: "Juan Pérez",
  patientDni: "12345678",
  surgeon: "Dr. García",
  institution: "Hospital Alemán",
  institutionCity: "CABA",
  procedure: "Reemplazo total de rodilla",
  date: "2026-06-15",
  time: "09:00",
  state: "Realizada",
  client: "OSDE",
  obraSocial: "OSDE 210",
  financiador: "OSDE",
  classification: "Reemplazo total de rodilla",
  preparationState: "Retirado",
  facturado: false,
  autorizado: true,
  prNumber: "PR-001",
  expedienteNumber: "EXP-001",
  coordinadorCx: "Coordinador 1",
  urgente: false,
  leyendaDestacada: false,
  referenciasAdministrativas: [],
}

const mockSurgery2: Surgery = {
  ...mockSurgery,
  id: "2",
  patient: "María López",
  date: "2026-06-16",
  urgente: true,
}

function createProps(overrides: Partial<Parameters<typeof CirugiasDataGrid>[0]> = {}) {
  const onSelect = vi.fn()
  const onOpenExpediente = vi.fn()

  return {
    data: [mockSurgery, mockSurgery2],
    columnContext: {
      getDocStatus: vi.fn(() => "Completa"),
      getConsumoState: vi.fn(() => null),
      getFacturacionStatus: vi.fn(() => "No facturada"),
      getPrId: vi.fn(() => undefined),
      onOpenExpediente,
      onOpenPresupuestoDialog: vi.fn(),
      onSetExpTab: vi.fn(),
      onSetDialogSurgery: vi.fn(),
      onSetNewState: vi.fn(),
      onSetChangeStateDialogOpen: vi.fn(),
      onSetChangeDateDialogOpen: vi.fn(),
      onSetSuspendDialogOpen: vi.fn(),
      onSetCancelDialogOpen: vi.fn(),
      onSetNoteDialogOpen: vi.fn(),
      onSetFacturarDialogOpen: vi.fn(),
      onRecover: vi.fn(),
      canFacturar: vi.fn(() => ({ allowed: true })),
    },
    selectedSurgeryId: null,
    onSelect,
    onOpenExpediente,
    density: "standard" as const,
    columnVisibility: DEFAULT_VISIBLE_COLS,
    onColumnVisibilityChange: vi.fn(),
    columnOrder: CIRUGIAS_COLUMNS.map((c) => c.key),
    onColumnOrderChange: vi.fn(),
    sorting: [{ id: "date", desc: false }],
    onSortingChange: vi.fn(),
    stickyColumns: true,
    fixedLeftColumns: ["id", "state", "patient"],
    ...overrides,
  }
}

function wrap(ui: React.ReactNode) {
  return <TooltipProvider>{ui}</TooltipProvider>
}

describe("CirugiasDataGrid", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ activeCompany: { id: "company-1", name: "Test Company" } })
  })

  it("renders table with surgery data and headers", () => {
    const props = createProps()
    render(wrap(<CirugiasDataGrid {...props} />))

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
    expect(screen.getByText("María López")).toBeInTheDocument()
    expect(screen.getByText("URG")).toBeInTheDocument()
  })

  it("handles single click row selection", () => {
    const props = createProps()
    render(wrap(<CirugiasDataGrid {...props} />))

    const patientCell = screen.getByText("Juan Pérez")
    fireEvent.click(patientCell)
    expect(props.onSelect).toHaveBeenCalledWith("1")
  })

  it("handles double click to open expediente", () => {
    const props = createProps()
    render(wrap(<CirugiasDataGrid {...props} />))

    const patientCell = screen.getByText("María López")
    fireEvent.doubleClick(patientCell)
    expect(props.onOpenExpediente).toHaveBeenCalledWith("2")
  })

  it("applies data-density attribute correctly", () => {
    const props = createProps({ density: "compact" })
    const { container } = render(wrap(<CirugiasDataGrid {...props} />))

    const root = container.querySelector('[data-density="compact"]')
    expect(root).toBeInTheDocument()
  })

  it("renders empty state when there is no data", () => {
    const props = createProps({ data: [] })
    render(wrap(<CirugiasDataGrid {...props} />))

    expect(screen.getByText(/no se encontraron cirugías/i)).toBeInTheDocument()
  })
})
