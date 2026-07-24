import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { CxOperationPresets } from "@/components/cirugias/CxOperationPresets"

describe("CxOperationPresets", () => {
  it("keeps each preset and clear control keyboard-reachable", () => {
    const onApply = vi.fn()
    const onClear = vi.fn()
    render(<CxOperationPresets selectedPreset="urgent" onApply={onApply} onClear={onClear} />)
    fireEvent.click(screen.getByRole("button", { name: "Urgentes" }))
    fireEvent.click(screen.getByRole("button", { name: /Limpiar preset/ }))
    expect(onApply).toHaveBeenCalledWith("urgent")
    expect(onClear).toHaveBeenCalledOnce()
  })
})
