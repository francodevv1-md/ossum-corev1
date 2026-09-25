import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { EditMaterialsModal } from "@/components/coordinadores/modal/EditMaterialsModal"
import type { SurgeryGestionFormData } from "@/types/coordinadores.types"

describe("EditMaterialsModal", () => {
  const initialData: SurgeryGestionFormData = {
    date: "2026-09-24",
    time: "10:00",
    fechaEnvioMaterial: "2026-09-23",
    horaEnvio: "18:00",
    coordinadorCx: "Laura Coordinadora",
    state: "Pendiente",
    preparationState: "En preparación",
    materialAvailabilityDate: "2026-09-22",
    materialTransport: "Flete propio",
    instrumentador: "Marcos Cirujano",
    urgente: false,
    leyenda: "Nota",
    notes: "Supervisión",
    procedure: "Prótesis de Cadera Modular",
    boxId: "BOX-01",
    remitoId: "R-0001-00005555",
  }

  it("renders with initial values and allows applying changes", () => {
    const handleSave = vi.fn()
    const handleClose = vi.fn()

    render(
      <EditMaterialsModal
        isOpen={true}
        onClose={handleClose}
        formData={initialData}
        onSave={handleSave}
        patientName="Juan Pérez"
        visibleNumber="CX-1040"
      />
    )

    expect(screen.getByText("Editar Pedido de Materiales y Logística")).toBeInTheDocument()
    expect(screen.getByText("CX-1040")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Prótesis de Cadera Modular")).toBeInTheDocument()
    expect(screen.getByDisplayValue("BOX-01")).toBeInTheDocument()
    expect(screen.getByDisplayValue("R-0001-00005555")).toBeInTheDocument()

    const procedureInput = screen.getByDisplayValue("Prótesis de Cadera Modular")
    fireEvent.change(procedureInput, { target: { value: "Reemplazo Total de Rodilla" } })

    const applyButton = screen.getByRole("button", { name: /aplicar cambios/i })
    fireEvent.click(applyButton)

    expect(handleSave).toHaveBeenCalledWith({
      procedure: "Reemplazo Total de Rodilla",
      boxId: "BOX-01",
      remitoId: "R-0001-00005555",
      preparationState: "En preparación",
      materialTransport: "Flete propio",
    })
    expect(handleClose).toHaveBeenCalled()
  })

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <EditMaterialsModal
        isOpen={false}
        onClose={() => {}}
        formData={initialData}
        onSave={() => {}}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
