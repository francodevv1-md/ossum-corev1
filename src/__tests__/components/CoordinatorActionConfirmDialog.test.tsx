import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { CoordinatorActionConfirmDialog } from "@/components/coordinadores/modal/CoordinatorActionConfirmDialog"
import type { Surgery } from "@/types"

const mockSurgery: Surgery = {
  id: "cx-101",
  visibleNumber: "CX-101",
  patient: "González, Martín",
  institution: "Sanatorio Los Arcos",
  surgeon: "Pérez, Juan",
  coordinadorCx: "Rodrigo Morales",
  state: "Pendiente",
  date: "",
  materials: [],
}

describe("CoordinatorActionConfirmDialog", () => {
  it("renders correctly for request-date action", () => {
    render(
      <CoordinatorActionConfirmDialog
        isOpen={true}
        actionType="request-date"
        surgery={mockSurgery}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText("Confirmar Solicitud de Fecha")).toBeInTheDocument()
    expect(screen.getByText("Rodrigo Morales")).toBeInTheDocument()
    expect(screen.getByText("González, Martín")).toBeInTheDocument()
    expect(screen.getByText("Sanatorio Los Arcos")).toBeInTheDocument()
    expect(screen.getByText("Confirmar Solicitud")).toBeInTheDocument()
  })

  it("renders correctly for notify action", () => {
    render(
      <CoordinatorActionConfirmDialog
        isOpen={true}
        actionType="notify"
        surgery={mockSurgery}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText("Confirmar Notificación a Coordinación")).toBeInTheDocument()
    expect(screen.getByText("Rodrigo Morales")).toBeInTheDocument()
    expect(screen.getByText("Confirmar y Notificar")).toBeInTheDocument()
  })

  it("calls onConfirm with custom note when confirmed", async () => {
    const handleConfirm = vi.fn()

    render(
      <CoordinatorActionConfirmDialog
        isOpen={true}
        actionType="request-date"
        surgery={mockSurgery}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />
    )

    const textarea = screen.getByPlaceholderText(/Confirmar antes de las 14:00/i)
    fireEvent.change(textarea, { target: { value: "Prioridad quirófano 2" } })

    const confirmBtn = screen.getByRole("button", { name: /Confirmar Solicitud/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith("Prioridad quirófano 2")
    })
  })

  it("calls onClose when cancel button is clicked", () => {
    const handleClose = vi.fn()

    render(
      <CoordinatorActionConfirmDialog
        isOpen={true}
        actionType="notify"
        surgery={mockSurgery}
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    )

    const cancelBtn = screen.getByRole("button", { name: /Cancelar/i })
    fireEvent.click(cancelBtn)

    expect(handleClose).toHaveBeenCalled()
  })
})
