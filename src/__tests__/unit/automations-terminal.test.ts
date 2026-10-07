import { describe, expect, it, vi } from "vitest"
import { getNextState, runAutomations } from "@/lib/automations"
import type { SurgeryState } from "@/types"

describe("surgery automations refuse terminal states", () => {
  const terminals: SurgeryState[] = ["Suspendida", "Cancelada", "Finalizada"]
  it.each(terminals)("getNextState returns null for terminal %s", (state) => {
    expect(getNextState(state)).toBeNull()
  })

  it.each(terminals)("runAutomations returns false and does not invoke changeStatus for %s", (state) => {
    const change = vi.fn()
    expect(runAutomations(change, "cx-1", state)).toBe(false)
    expect(change).not.toHaveBeenCalled()
  })

  it("runAutomations still advances from non-terminal states", () => {
    const change = vi.fn()
    expect(runAutomations(change, "cx-1", "Pendiente")).toBe(true)
    expect(change).toHaveBeenCalledWith("cx-1", "Autorizada")
  })
})
