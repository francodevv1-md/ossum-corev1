import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { SurgeryStateSelect } from "@/components/shared/selectors/SurgeryStateSelect"
import { PreparationStateSelect } from "@/components/shared/selectors/PreparationStateSelect"

describe("SurgeryStateSelect", () => {
  it("renders trigger with current state and color indicator", () => {
    render(<SurgeryStateSelect value="Pendiente" onChange={vi.fn()} />)

    expect(screen.getByText("Pendiente")).toBeInTheDocument()
  })

  it("renders trigger with all states label when configured", () => {
    render(
      <SurgeryStateSelect
        value=""
        onChange={vi.fn()}
        includeAllOption={true}
        allOptionLabel="Estado: Todos"
      />
    )

    expect(screen.getByText("Estado: Todos")).toBeInTheDocument()
  })
})

describe("PreparationStateSelect", () => {
  it("renders trigger with current preparation state", () => {
    render(<PreparationStateSelect value="En preparación" onChange={vi.fn()} />)

    expect(screen.getByText("En preparación")).toBeInTheDocument()
  })
})
