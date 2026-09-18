import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ExpedienteHeader } from "@/components/expediente/ExpedienteHeader"
import { buildExpedienteHeaderModel } from "@/components/expediente/expediente-header.model"
import type { Surgery } from "@/types"

function makeSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "technical-surgery-1",
    visibleNumber: "CX-0042",
    patient: "Paciente Test",
    patientDni: "12345678",
    surgeon: "Dr. Test",
    institution: "Hospital Test",
    institutionCity: "Ciudad",
    procedure: "Procedimiento",
    date: "2026-07-06",
    time: "10:00",
    state: "Pendiente",
    client: "Cliente Test",
    classification: "Artroscopía",
    preparationState: "Sin preparar",
    facturado: false,
    autorizado: false,
    urgente: true,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
    ...overrides,
  }
}

function renderHeader(surgery = makeSurgery()) {
  const model = buildExpedienteHeaderModel({
    surgery,
    docStatus: "Incompleta",
    presupuestoId: "PR-1",
    remitoId: "NR-1",
    fvNumber: "FV-1",
    facturacionStatus: "pending",
    cobrosTotal: 0,
    pendiente: { text: "Sin pendientes", color: "" },
  })
  const onEditFicha = vi.fn()
  const onViewPR = vi.fn()

  render(
    <ExpedienteHeader
      surgery={surgery}
      docStatus="Incompleta"
      presupuestoId="PR-1"
      model={model}
      operationsDisplay={{
        attentionReasons: ["SLA vencido", "Sin disponibilidad", "Urgente"],
        nextActionLabel: "Resolver coordinación y fecha",
        responsibleAreaLabel: "Coordinación",
      }}
      onEditFicha={onEditFicha}
      onViewPR={onViewPR}
      onGeneratePR={vi.fn()}
      onViewDocumentacion={vi.fn()}
      onViewRemitos={vi.fn()}
      onViewConsumo={vi.fn()}
      onSetDialogSurgery={vi.fn()}
      onSetFacturarDialogOpen={vi.fn()}
      onSetNoteDialogOpen={vi.fn()}
      onSetSuspendDialogOpen={vi.fn()}
      onSetCancelDialogOpen={vi.fn()}
      onSetChangeStateDialogOpen={vi.fn()}
      onSetChangeDateDialogOpen={vi.fn()}
      onSetNewState={vi.fn()}
      onRecover={vi.fn()}
    />,
  )

  return { onEditFicha, onViewPR }
}

describe("ExpedienteHeader", () => {
  it("mantiene la lectura operativa ordenada y explícita", () => {
    renderHeader()

    expect(screen.getByText("CX-0042")).toBeInTheDocument()
    expect(screen.getByText("06/07/2026")).toBeInTheDocument()
    expect(screen.getAllByText("Estado CX").length).toBeGreaterThan(0)
    expect(screen.getByText("Preparación")).toBeInTheDocument()
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0)
    expect(screen.getByText("Sin preparar")).toBeInTheDocument()
    expect(screen.getByText("PR")).toBeInTheDocument()
  })

  it("shows En preparación only in the preparation field", () => {
    renderHeader(makeSurgery({ state: "Pendiente", preparationState: "En preparación" }))

    expect(screen.getByText("En preparación")).toBeInTheDocument()
    expect(screen.getAllByText("Estado CX").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0)
  })

  it("conserva los callbacks existentes de acción de cabecera", () => {
    const { onEditFicha, onViewPR } = renderHeader()

    fireEvent.click(screen.getByRole("button", { name: /Editar ficha/i }))
    fireEvent.click(screen.getByRole("button", { name: /Ver PR/i }))

    expect(onEditFicha).toHaveBeenCalledOnce()
    expect(onViewPR).toHaveBeenCalledOnce()
  })
})
