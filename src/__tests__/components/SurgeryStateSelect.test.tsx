import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { SurgeryStateSelect } from "@/components/shared/selectors/SurgeryStateSelect"
import { PreparationStateSelect } from "@/components/shared/selectors/PreparationStateSelect"
import { ALL_STATES } from "@/lib/cirugias.constants"
import type { SurgeryState } from "@/types"

// jsdom has no scrolling implementation; Radix calls this when opening options.
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = vi.fn()
}

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

  it.each([false, true])("never offers Sin fecha, including custom allowedStates=%s", async (custom) => {
    render(<SurgeryStateSelect
      value="Pendiente"
      onChange={vi.fn()}
      allowedStates={custom ? ["Sin fecha", ...ALL_STATES] as SurgeryState[] : undefined}
    />)
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" })
    await waitFor(() => expect(screen.getAllByRole("option").length).toBe(custom ? 9 : 8))
    expect(screen.queryByRole("option", { name: /Sin fecha/ })).not.toBeInTheDocument()
  })
})

describe("PreparationStateSelect", () => {
  it("renders trigger with current preparation state", () => {
    render(<PreparationStateSelect value="En preparación" onChange={vi.fn()} />)

    expect(screen.getByText("En preparación")).toBeInTheDocument()
  })
})
