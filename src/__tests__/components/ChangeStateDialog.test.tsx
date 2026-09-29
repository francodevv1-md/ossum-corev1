import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ChangeStateDialog } from "@/components/cirugias/dialogs/ChangeStateDialog"
import type { SurgeryState } from "@/types"

describe("ChangeStateDialog", () => {
  const onOpenChange = vi.fn()
  const setNewState = vi.fn()
  const onConfirm = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange,
    dialogSurgery: { id: "SURG-101", state: "Pendiente" },
    newState: "Programada" as SurgeryState,
    setNewState,
    onConfirm,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders non-Autorizada state transition without file upload requirements", () => {
    render(<ChangeStateDialog {...defaultProps} />)

    expect(screen.getByText("Cambiar Estado de Cirugía")).toBeInTheDocument()
    expect(screen.getByText("SURG-101")).toBeInTheDocument()
    expect(screen.queryByText("Comprobante de Autorización")).not.toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /Confirmar cambio/i })
    expect(confirmBtn).not.toBeDisabled()

    act(() => {
      fireEvent.click(confirmBtn)
    })
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("disables confirm button on Autorizada state when no file or reason is provided", () => {
    render(<ChangeStateDialog {...defaultProps} newState="Autorizada" />)

    expect(screen.getByText("Comprobante de Autorización")).toBeInTheDocument()
    expect(screen.getByText(/Cargar imagen o PDF de autorización/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/No dispongo de comprobante ahora/i)).toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /Confirmar cambio/i })
    expect(confirmBtn).toBeDisabled()
  })

  it("enables confirm button and passes authFile when a file is selected", async () => {
    render(<ChangeStateDialog {...defaultProps} newState="Autorizada" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    const dummyFile = new File(["dummy content"], "autorizacion_medica.pdf", { type: "application/pdf" })

    act(() => {
      fireEvent.change(fileInput, { target: { files: [dummyFile] } })
    })

    expect(screen.getByText("autorizacion_medica.pdf")).toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /Confirmar cambio/i })
    expect(confirmBtn).not.toBeDisabled()

    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    expect(onConfirm).toHaveBeenCalledWith({
      authFile: dummyFile,
      reasonWithoutAuthFile: undefined,
    })
  })

  it("requires at least 3 chars in motivo when bypass checkbox is checked", async () => {
    render(<ChangeStateDialog {...defaultProps} newState="Autorizada" />)

    const checkbox = screen.getByLabelText(/No dispongo de comprobante ahora/i)
    act(() => {
      fireEvent.click(checkbox)
    })

    const textarea = screen.getByPlaceholderText(/Detallá el motivo o justificación/i)
    expect(textarea).toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /Confirmar cambio/i })
    expect(confirmBtn).toBeDisabled()

    // Short motivo (< 3 chars)
    act(() => {
      fireEvent.change(textarea, { target: { value: "ok" } })
    })
    expect(confirmBtn).toBeDisabled()
    expect(screen.getByText(/El motivo debe tener al menos 3 caracteres/i)).toBeInTheDocument()

    // Valid motivo (>= 3 chars)
    act(() => {
      fireEvent.change(textarea, { target: { value: "Autorizado por vía telefónica urgente" } })
    })
    expect(confirmBtn).not.toBeDisabled()

    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    expect(onConfirm).toHaveBeenCalledWith({
      authFile: null,
      reasonWithoutAuthFile: "Autorizado por vía telefónica urgente",
    })
  })
})
