import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ExpedienteFullView } from "@/components/expediente/ExpedienteFullView"
import { ApiClientError } from "@/lib/api/client"
import type { Surgery } from "@/types"

const { useAuthMock, apiFetchMock, consumoPropsMock, documentacionPropsMock, logisticaPropsMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  apiFetchMock: vi.fn(),
  consumoPropsMock: vi.fn(),
  documentacionPropsMock: vi.fn(),
  logisticaPropsMock: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: useAuthMock,
}))

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client")

  return {
    ...actual,
    apiFetch: apiFetchMock,
  }
})

vi.mock("@/components/expediente/ExpedienteHeader", () => ({
  ExpedienteHeader: () => <div>header</div>,
}))

vi.mock("@/components/expediente/FichaTabContent", () => ({
  FichaTabContent: () => <div>ficha-tab</div>,
}))

vi.mock("@/components/expediente/ComercialTabContent", () => ({
  ComercialTabContent: () => <div>comercial-tab</div>,
}))

vi.mock("@/components/expediente/DocumentacionTrazabilidadTab", () => ({
  DocumentacionTrazabilidadTab: (props: { freshnessKey?: number }) => {
    documentacionPropsMock(props)
    return <div>documentacion-tab</div>
  },
}))

vi.mock("@/components/expediente/LogisticaTabContent", () => ({
  LogisticaTabContent: (props: { freshnessKey?: number }) => {
    logisticaPropsMock(props)
    return <div>logistica-tab</div>
  },
}))

vi.mock("@/components/expediente/ConsumoPanel", () => ({
  ConsumoPanel: (props: { freshnessKey?: number; onDevolucionConfirmed?: () => void }) => {
    consumoPropsMock(props)
    return <button type="button" onClick={props.onDevolucionConfirmed}>confirm-devolucion</button>
  },
}))

vi.mock("@/components/expediente/InstrumentadorPanel", () => ({
  InstrumentadorPanel: () => <div>instrumentador-tab</div>,
}))

vi.mock("@/components/expediente/HistorialPanel", () => ({
  HistorialPanel: () => <div>historial-tab</div>,
}))

vi.mock("@/components/expediente/EditFichaDrawer", () => ({
  EditFichaDrawer: () => null,
}))

vi.mock("@/components/expediente/NovedadesTabContent", () => ({
  NovedadesTabContent: () => <div>seguimiento-real-tab</div>,
}))

vi.mock("@/components/expediente/correo/ExpedienteCorreoTab", () => ({
  ExpedienteCorreoTab: () => <div>correo-real-tab</div>,
}))

function makeSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "CX-9001",
    patient: "Paciente Test",
    patientDni: "12345678",
    surgeon: "Dr. Test",
    institution: "Institución Test",
    institutionCity: "Corrientes",
    procedure: "Procedimiento",
    date: "2026-07-06",
    time: "10:00",
    state: "Pendiente",
    client: "Cliente Test",
    classification: "Artroscopía",
    preparationState: "Sin preparar",
    facturado: false,
    autorizado: false,
    urgente: false,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
    ...overrides,
  }
}

function renderView(surgery: Surgery, expTab: string) {
  render(
    <ExpedienteFullView
      surgery={surgery}
      presupuestos={[]}
      comprobantes={[]}
      remitos={[]}
      consumo={undefined}
      notes={[]}
      history={[]}
      docChecklist={undefined}
      logistics={undefined}
      docStatus="pending"
      materialTransito={[]}
      instrumentadorSurgery={undefined}
      box={undefined}
      resumenCobranza={{ totalCobrado: 0, totalFacturado: 0, saldoPendiente: 0, facturas: [] }}
      facturacionStatus="pending"
      expTab={expTab}
      setExpTab={vi.fn()}
      onBack={vi.fn()}
        onSetDialogSurgery={vi.fn()}
        onSetFacturarDialogOpen={vi.fn()}
        onAddNoteToSeguimiento={vi.fn()}
        onSetSuspendDialogOpen={vi.fn()}
        onSetCancelDialogOpen={vi.fn()}
      onSetChangeStateDialogOpen={vi.fn()}
      onSetChangeDateDialogOpen={vi.fn()}
      onSetNewState={vi.fn()}
      onRecover={vi.fn()}
      onAutorizar={vi.fn()}
      onOpenPresupuestoDialog={vi.fn()}
      editingConsumo={{}}
      setEditingConsumo={vi.fn()}
    />
  )
}

beforeEach(() => {
  useAuthMock.mockReturnValue({ activeCompany: { id: "company-1" } })
  apiFetchMock.mockReset()
  consumoPropsMock.mockClear()
  documentacionPropsMock.mockClear()
  logisticaPropsMock.mockClear()
})

describe("ExpedienteFullView legacy server-backed guards", () => {
  it("increments the operational freshness key after a confirmed return", () => {
    renderView(makeSurgery(), "consumo")

    expect(consumoPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({ freshnessKey: 0 }))

    fireEvent.click(screen.getByRole("button", { name: "confirm-devolucion" }))

    expect(consumoPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({ freshnessKey: 1 }))
  })

  it("verifica CX-0001 en backend y habilita Seguimiento", async () => {
    apiFetchMock.mockResolvedValueOnce({ data: [] })

    renderView(makeSurgery({ id: "CX-0001" }), "novedades")

    expect(screen.getByText("Verificando disponibilidad backend")).toBeInTheDocument()
    expect(screen.queryByText("Función no disponible para esta cirugía")).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("seguimiento-real-tab")).toBeInTheDocument()
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/companies/company-1/surgeries/CX-0001/mail-links"
    )
    expect(screen.queryByText("Función no disponible para esta cirugía")).not.toBeInTheDocument()
  })

  it("bloquea CX-0001 si backend no encuentra la cirugía", async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiClientError("Surgery not found", 404, "surgery_not_found"))

    renderView(makeSurgery({ id: "CX-0001" }), "novedades")

    expect(screen.getByText("Verificando disponibilidad backend")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Función no disponible para esta cirugía")).toBeInTheDocument()
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/companies/company-1/surgeries/CX-0001/mail-links"
    )
    expect(screen.getByText(/store\/mock legacy y no se sincroniza automáticamente en DEV/i)).toBeInTheDocument()
  })

  it("verifica CX-0009 en backend y habilita Correo", async () => {
    apiFetchMock.mockResolvedValueOnce({ data: [] })

    renderView(makeSurgery({ id: "CX-0009" }), "correo")

    await waitFor(() => {
      expect(screen.getByText("correo-real-tab")).toBeInTheDocument()
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/companies/company-1/surgeries/CX-0009/mail-links"
    )
    expect(screen.queryByText("Función no disponible para esta cirugía")).not.toBeInTheDocument()
  })

  it("mantiene bloqueadas otras cirugías mock legacy no persistidas", async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiClientError("Surgery not found", 404, "surgery_not_found"))

    renderView(makeSurgery({ id: "CX-0008" }), "novedades")

    await waitFor(() => {
      expect(screen.getByText("Función no disponible para esta cirugía")).toBeInTheDocument()
    })

    expect(screen.getByText("Requiere backend")).toBeInTheDocument()
    expect(screen.getByText(/store\/mock legacy y no se sincroniza automáticamente en DEV/i)).toBeInTheDocument()
    expect(screen.queryByText("seguimiento-real-tab")).not.toBeInTheDocument()
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/companies/company-1/surgeries/CX-0008/mail-links"
    )
  })

  it("bloquea legacy local-only no sembradas cuando backend no encuentra la cirugía", async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiClientError("Surgery not found", 404, "surgery_not_found"))

    renderView(makeSurgery({ id: "CX-B65A77D77886" }), "novedades")

    expect(screen.getByText("Verificando disponibilidad backend")).toBeInTheDocument()
    expect(screen.queryByText("Función no disponible para esta cirugía")).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Función no disponible para esta cirugía")).toBeInTheDocument()
    })

    expect(screen.queryByText("seguimiento-real-tab")).not.toBeInTheDocument()
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/companies/company-1/surgeries/CX-B65A77D77886/mail-links"
    )
  })

  it("mantiene Seguimiento y Correo habilitados para cirugías persistidas verificadas", async () => {
    apiFetchMock.mockResolvedValue({ data: [] })

    const { rerender } = render(
      <ExpedienteFullView
        surgery={makeSurgery({ id: "CX-PERSISTED-123" })}
        presupuestos={[]}
        comprobantes={[]}
        remitos={[]}
        consumo={undefined}
        notes={[]}
        history={[]}
        docChecklist={undefined}
        logistics={undefined}
        docStatus="pending"
        materialTransito={[]}
        instrumentadorSurgery={undefined}
        box={undefined}
        resumenCobranza={{ totalCobrado: 0, totalFacturado: 0, saldoPendiente: 0, facturas: [] }}
        facturacionStatus="pending"
        expTab="novedades"
        setExpTab={vi.fn()}
        onBack={vi.fn()}
        onSetDialogSurgery={vi.fn()}
        onSetFacturarDialogOpen={vi.fn()}
        onAddNoteToSeguimiento={vi.fn()}
        onSetSuspendDialogOpen={vi.fn()}
        onSetCancelDialogOpen={vi.fn()}
        onSetChangeStateDialogOpen={vi.fn()}
        onSetChangeDateDialogOpen={vi.fn()}
        onSetNewState={vi.fn()}
        onRecover={vi.fn()}
        onAutorizar={vi.fn()}
        onOpenPresupuestoDialog={vi.fn()}
        editingConsumo={{}}
        setEditingConsumo={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("seguimiento-real-tab")).toBeInTheDocument()
    })
    expect(screen.queryByText("Función no disponible para esta cirugía")).not.toBeInTheDocument()

    rerender(
      <ExpedienteFullView
        surgery={makeSurgery({ id: "CX-PERSISTED-123" })}
        presupuestos={[]}
        comprobantes={[]}
        remitos={[]}
        consumo={undefined}
        notes={[]}
        history={[]}
        docChecklist={undefined}
        logistics={undefined}
        docStatus="pending"
        materialTransito={[]}
        instrumentadorSurgery={undefined}
        box={undefined}
        resumenCobranza={{ totalCobrado: 0, totalFacturado: 0, saldoPendiente: 0, facturas: [] }}
        facturacionStatus="pending"
        expTab="correo"
        setExpTab={vi.fn()}
        onBack={vi.fn()}
        onSetDialogSurgery={vi.fn()}
        onSetFacturarDialogOpen={vi.fn()}
        onAddNoteToSeguimiento={vi.fn()}
        onSetSuspendDialogOpen={vi.fn()}
        onSetCancelDialogOpen={vi.fn()}
        onSetChangeStateDialogOpen={vi.fn()}
        onSetChangeDateDialogOpen={vi.fn()}
        onSetNewState={vi.fn()}
        onRecover={vi.fn()}
        onAutorizar={vi.fn()}
        onOpenPresupuestoDialog={vi.fn()}
        editingConsumo={{}}
        setEditingConsumo={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("correo-real-tab")).toBeInTheDocument()
    })
    expect(screen.getByText("correo-real-tab")).toBeInTheDocument()
    expect(screen.queryByText("Función no disponible para esta cirugía")).not.toBeInTheDocument()
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
  })
})
