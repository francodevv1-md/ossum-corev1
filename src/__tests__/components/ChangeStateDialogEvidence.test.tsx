import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChangeStateDialog } from "@/components/cirugias/dialogs/ChangeStateDialog"

describe("ChangeStateDialog - Evidence Verification Honesty", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("does NOT enable 'Confirmar cambio' for Autorizada state when surgery only has autorizado=true or state='Autorizada' without a file or hasPersistedAuthEvidence", () => {
    const onConfirmMock = vi.fn()

    render(
      <ChangeStateDialog
        open={true}
        onOpenChange={vi.fn()}
        dialogSurgery={{
          id: "CX-001",
          state: "Autorizada",
          autorizado: true,
          hasPersistedAuthEvidence: false,
        }}
        newState="Autorizada"
        setNewState={vi.fn()}
        onConfirm={onConfirmMock}
      />
    )

    // The confirm button should be DISABLED because neither authFile nor exception checkbox nor hasPersistedAuthEvidence is present
    const confirmBtn = screen.getByRole("button", { name: /Confirmar cambio/i })
    expect(confirmBtn).toBeDefined()
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true)

    // Attempting to click confirm should not call onConfirm
    fireEvent.click(confirmBtn)
    expect(onConfirmMock).not.toHaveBeenCalled()
  })

  it("enables 'Confirmar cambio' when hasPersistedAuthEvidence is explicitly true", () => {
    const onConfirmMock = vi.fn()

    render(
      <ChangeStateDialog
        open={true}
        onOpenChange={vi.fn()}
        dialogSurgery={{
          id: "CX-001",
          state: "Sin autorizar",
          hasPersistedAuthEvidence: true,
        }}
        newState="Autorizada"
        setNewState={vi.fn()}
        onConfirm={onConfirmMock}
      />
    )

    const confirmBtn = screen.getByRole("button", { name: /Confirmar cambio/i })
    expect(confirmBtn).toBeDefined()
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it("enables 'Confirmar cambio' when 'No posee autorizado' exception checkbox is checked", () => {
    const onConfirmMock = vi.fn()

    render(
      <ChangeStateDialog
        open={true}
        onOpenChange={vi.fn()}
        dialogSurgery={{
          id: "CX-001",
          state: "Sin autorizar",
          hasPersistedAuthEvidence: false,
        }}
        newState="Autorizada"
        setNewState={vi.fn()}
        onConfirm={onConfirmMock}
      />
    )

    const checkbox = screen.getByLabelText(/No posee autorizado/i)
    fireEvent.click(checkbox)

    const confirmBtn = screen.getByRole("button", { name: /Confirmar cambio/i })
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false)
  })
})
