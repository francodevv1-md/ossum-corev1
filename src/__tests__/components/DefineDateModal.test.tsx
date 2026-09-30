import React from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { DefineDateModal } from "@/components/coordinadores/modal/DefineDateModal"
import type { Surgery } from "@/types"

const mockSurgery: Surgery = {
  id: "cx-100",
  visibleNumber: "CX-0100",
  patient: "GARCIA JUAN",
  patientDni: "30111222",
  surgeon: "Dr. Benitez",
  institution: "Sanatorio Central",
  institutionCity: "CABA",
  procedure: "Osteosíntesis",
  client: "OSDE",
  classification: "Osteosíntesis",
  date: "",
  time: "",
  notes: "Nota previa",
  state: "Pendiente",
  preparationState: "Sin preparar",
  facturado: false,
  autorizado: false,
  urgente: false,
  leyendaDestacada: false,
  referenciasAdministrativas: [],
  coordinadorCx: "Nelson Gonzalez",
}

describe("DefineDateModal", () => {
  it("renders with surgery info, date inputs, and tracking note composer", () => {
    render(
      <DefineDateModal
        surgery={mockSurgery}
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText("CX-0100")).toBeInTheDocument()
    expect(screen.getByText("GARCIA JUAN")).toBeInTheDocument()
    expect(screen.getByText("Dr. Benitez")).toBeInTheDocument()
    expect(screen.getByText("Sanatorio Central")).toBeInTheDocument()
    expect(screen.getByText("Cronograma Quirúrgico y Logística")).toBeInTheDocument()
    expect(screen.getByText("Nota de Seguimiento y Coordinación")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Adjuntar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Pegar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Dictar voz/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Clasificar/i })).toBeInTheDocument()
  })

  it("submits updated dates, tracking note payload and urgencia on form submission", () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <DefineDateModal
        surgery={mockSurgery}
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    )

    // Fill date
    const dateInput = screen.getByLabelText(/Fecha de Cirugía/i)
    fireEvent.change(dateInput, { target: { value: "2026-10-15" } })

    // Fill notes
    const notesInput = screen.getByPlaceholderText(/Escribí aquí observaciones/i)
    fireEvent.change(notesInput, { target: { value: "Coordinado con el médico para primera hora" } })

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Guardar y Programar/i })
    fireEvent.click(submitBtn)

    expect(onSave).toHaveBeenCalledWith(
      "cx-100",
      expect.objectContaining({
        date: "2026-10-15",
        notes: "Coordinado con el médico para primera hora",
      }),
      expect.objectContaining({
        content: "Coordinado con el médico para primera hora",
        noteType: "Coordinación",
        priority: "Media",
      })
    )
    expect(onClose).toHaveBeenCalled()
  })
})
