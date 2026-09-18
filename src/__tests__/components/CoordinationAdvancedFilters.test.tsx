import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { CoordinationAdvancedFilters, createEmptyAdvancedFilters } from "@/components/coordinadores/CoordinationAdvancedFilters"
import type { AdvancedFilters } from "@/components/coordinadores/coordination-filtering"

const institutionOptions = [{ kind: "id" as const, value: "I1", label: "Hospital Italiano" }]
const clientOptions = [{ kind: "id" as const, value: "C1", label: "Cliente Uno" }]

function Harness({ onClear = vi.fn() }: { onClear?: () => void }) {
  const [applied, setApplied] = useState<AdvancedFilters>(() => createEmptyAdvancedFilters())
  return <CoordinationAdvancedFilters applied={applied} institutionOptions={institutionOptions} clientOptions={clientOptions} stateOptions={["Autorizada", "En tránsito"]} onApply={setApplied} onClearAdvanced={() => { setApplied(createEmptyAdvancedFilters()); onClear() }} />
}

describe("CoordinationAdvancedFilters", () => {
  it("contains only the six approved logical fields and a Spanish 44px close that restores focus", async () => {
    render(<Harness />)
    const trigger = screen.getByRole("button", { name: "Más filtros" })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole("dialog", { name: "Más filtros" })
    expect(dialog).toHaveAttribute("data-coordination-advanced-dialog", "viewport-bounded")
    for (const label of ["CX", "Fecha de cirugía desde", "Fecha de cirugía hasta", "Institución", "Cliente", "Disponibilidad desde", "Disponibilidad hasta", "Estado"]) {
      expect(within(dialog).getByLabelText(label)).toBeInTheDocument()
    }
    expect(within(dialog).getByRole("combobox", { name: /^Institución$/ })).toBeInTheDocument()
    expect(within(dialog).queryByText(/preparación|logística|solicitud/i)).not.toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Aplicar" })).toHaveClass("min-h-11")
    const close = within(dialog).getByRole("button", { name: "Cerrar" })
    expect(close).toHaveClass("size-11")
    expect(within(dialog).queryByRole("button", { name: "Close" })).not.toBeInTheDocument()
    fireEvent.click(close)
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("keeps draft isolated, applies atomically, updates count/chips, and removes one chip", () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Más filtros" }))
    fireEvent.change(screen.getByLabelText("CX"), { target: { value: "1042" } })
    fireEvent.change(screen.getByLabelText("Institución"), { target: { value: "id:I1" } })
    expect(screen.queryByLabelText("Filtros avanzados aplicados")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))

    expect(screen.getByRole("button", { name: "Más filtros, 2 activos" })).toHaveTextContent("Más filtros · 2")
    expect(screen.getByRole("button", { name: "Quitar filtro Institución: Hospital Italiano" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtro Institución: Hospital Italiano" }))
    expect(screen.getByRole("button", { name: "Más filtros, 1 activos" })).toHaveTextContent("Más filtros · 1")
    expect(screen.queryByRole("button", { name: "Quitar filtro Institución: Hospital Italiano" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Más filtros, 1 activos" }))
    expect(screen.getByLabelText("CX")).toHaveValue("1042")
    expect(screen.getByLabelText("Institución")).toHaveValue("")
  })

  it("discards cancel and Escape drafts and restores focus to the trigger", async () => {
    render(<Harness />)
    const trigger = screen.getByRole("button", { name: "Más filtros" })
    fireEvent.click(trigger)
    fireEvent.change(screen.getByLabelText("CX"), { target: { value: "cancelled" } })
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(trigger).toHaveFocus())
    fireEvent.click(trigger)
    expect(screen.getByLabelText("CX")).toHaveValue("")
    fireEvent.change(screen.getByLabelText("CX"), { target: { value: "escape" } })
    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    fireEvent.click(trigger)
    expect(screen.getByLabelText("CX")).toHaveValue("")
  })

  it("blocks invalid ranges, preserves applied state, announces error, and focuses first invalid range", () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Más filtros" }))
    fireEvent.change(screen.getByLabelText("CX"), { target: { value: "saved" } })
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))
    fireEvent.click(screen.getByRole("button", { name: "Más filtros, 1 activos" }))
    fireEvent.change(screen.getByLabelText("Fecha de cirugía desde"), { target: { value: "2026-07-22" } })
    fireEvent.change(screen.getByLabelText("Fecha de cirugía hasta"), { target: { value: "2026-07-20" } })
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))

    expect(screen.getByRole("alert")).toHaveTextContent("La fecha desde no puede ser posterior a la fecha hasta.")
    expect(screen.getByLabelText("Fecha de cirugía desde")).toHaveFocus()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByRole("button", { name: "Más filtros, 1 activos" })).toBeInTheDocument()
  })

  it("clears draft and applied advanced filters immediately through modal Limpiar", () => {
    const clear = vi.fn()
    render(<Harness onClear={clear} />)
    fireEvent.click(screen.getByRole("button", { name: "Más filtros" }))
    fireEvent.change(screen.getByLabelText("CX"), { target: { value: "saved" } })
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))
    fireEvent.click(screen.getByRole("button", { name: "Más filtros, 1 activos" }))
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }))
    expect(clear).toHaveBeenCalledOnce()
    expect(screen.getByLabelText("CX")).toHaveValue("")
    expect(screen.queryByLabelText("Filtros avanzados aplicados")).not.toBeInTheDocument()
  })
})
