import { describe, expect, it, vi } from "vitest"
import { getNextState, runAutomations } from "@/lib/automations"

describe("automations", () => {
  it("does not invent a general successor for authorization", () => {
    expect(getNextState("Autorizada")).toBeNull()
  })

  it("does not issue a general transition when no successor is approved", () => {
    const changeStatus = vi.fn()

    expect(runAutomations(changeStatus, "cx-1", "Autorizada")).toBe(false)
    expect(changeStatus).not.toHaveBeenCalled()
  })
})
