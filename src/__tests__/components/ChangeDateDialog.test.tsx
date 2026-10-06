import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ChangeDateDialog } from "@/components/cirugias/dialogs/ChangeDateDialog"

describe("ChangeDateDialog component", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    dialogSurgery: { id: "cx-internal-1", visibleNumber: "CX-0042" },
    newDate: "2026-08-21",
    setNewDate: vi.fn(),
    newTime: "14:30",
    setNewTime: vi.fn(),
    onConfirm: vi.fn(),
    isSubmitting: false,
    error: null,
  }

  it("selects shipping and hides surgery time without changing it", () => {
    const setDateType = vi.fn()
    render(<ChangeDateDialog {...defaultProps} dateType="shipping" setDateType={setDateType} />)
    expect(screen.getByLabelText(/Nueva fecha de envío/)).toBeDefined()
    expect(screen.queryByLabelText(/Hora de intervención/)).toBeNull()
    fireEvent.change(screen.getByLabelText("Fecha a modificar"), { target: { value: "surgery" } })
    expect(setDateType).toHaveBeenCalledWith("surgery")
  })

  it("renders surgery visibleNumber in the header description", () => {
    render(<ChangeDateDialog {...defaultProps} />)

    expect(screen.getByText("Reprogramar Fecha Quirúrgica")).toBeDefined()
    expect(screen.getByText("CX-0042")).toBeDefined()
  })

  it("renders date and time inputs with current values and calls setters on change", () => {
    render(<ChangeDateDialog {...defaultProps} />)

    const dateInput = screen.getByLabelText(/Nueva fecha de cirugía/i) as HTMLInputElement
    const timeInput = screen.getByLabelText(/Hora de intervención/i) as HTMLInputElement

    expect(dateInput.value).toBe("2026-08-21")
    expect(timeInput.value).toBe("14:30")

    fireEvent.change(dateInput, { target: { value: "2026-08-22" } })
    expect(defaultProps.setNewDate).toHaveBeenCalledWith("2026-08-22")

    fireEvent.change(timeInput, { target: { value: "15:00" } })
    expect(defaultProps.setNewTime).toHaveBeenCalledWith("15:00")
  })

  it("disables the confirm button when newDate is empty", () => {
    render(<ChangeDateDialog {...defaultProps} newDate="" />)

    const saveButton = screen.getByRole("button", { name: /Guardar fecha/i })
    expect((saveButton as HTMLButtonElement).disabled).toBe(true)
  })

  it("displays loading state and disables inputs/buttons when isSubmitting is true", () => {
    render(<ChangeDateDialog {...defaultProps} isSubmitting={true} />)

    expect(screen.getByText("Guardando...")).toBeDefined()
    const saveButton = screen.getByRole("button", { name: /Guardando.../i })
    const cancelButton = screen.getByRole("button", { name: /Cancelar/i })
    const dateInput = screen.getByLabelText(/Nueva fecha de cirugía/i) as HTMLInputElement
    const timeInput = screen.getByLabelText(/Hora de intervención/i) as HTMLInputElement

    expect((saveButton as HTMLButtonElement).disabled).toBe(true)
    expect((cancelButton as HTMLButtonElement).disabled).toBe(true)
    expect(dateInput.disabled).toBe(true)
    expect(timeInput.disabled).toBe(true)
  })

  it("renders error message when error prop is present", () => {
    render(<ChangeDateDialog {...defaultProps} error="Error al contactar el servidor" />)

    const errorAlert = screen.getByRole("alert")
    expect(errorAlert.textContent).toContain("Error al contactar el servidor")
  })

  it("calls onConfirm on button click and onOpenChange(false) on cancel", () => {
    render(<ChangeDateDialog {...defaultProps} />)

    fireEvent.click(screen.getByRole("button", { name: /Guardar fecha/i }))
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }))
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })
})
