import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { applyCxOperationPreset, clearCxOperationPreset, getCxOperationPresetStateAfterClear, type CxOperationPresetState } from "@/components/cirugias/CxOperationPresets"
import { useCirugiasFilters } from "@/hooks/useCirugiasFilters"

vi.mock("@/lib/store", () => ({ useOrtoTrackStore: () => ({}) }))

function setters() {
  return {
    setNeedsAttention: vi.fn(), setUrgenteFilter: vi.fn(), setSinFechaCx: vi.fn(),
    setPrepFilters: vi.fn(), setDocFilters: vi.fn(), setConPrFilter: vi.fn(),
    setConConsumoFilter: vi.fn(), setConFacturaFilter: vi.fn(),
  }
}

function state(overrides: Partial<CxOperationPresetState> = {}): CxOperationPresetState {
  return {
    needsAttention: false, urgenteFilter: null, sinFechaCx: false,
    prepFilters: [], docFilters: [], conPrFilter: null, conConsumoFilter: null, conFacturaFilter: null,
    ...overrides,
  }
}

describe("CX operation presets", () => {
  it.each([
    ["attention", "setNeedsAttention", true], ["urgent", "setUrgenteFilter", true], ["noCxDate", "setSinFechaCx", true],
    ["preparationPending", "setPrepFilters", ["Sin preparar", "Congelado con faltantes"]], ["documentationIncomplete", "setDocFilters", ["Incompleta"]],
    ["withoutPr", "setConPrFilter", "sin"], ["withoutConsumption", "setConConsumoFilter", "sin"], ["withoutInvoice", "setConFacturaFilter", "sin"],
  ] as const)("maps %s to the existing hook setter", (preset, setter, value) => {
    const target = setters()
    applyCxOperationPreset(preset, state(), target)
    expect(target[setter]).toHaveBeenCalledWith(value)
  })

  it("preserves manual preparation filters when the preset is individually cleared", () => {
    const target = setters()
    const before = state({ prepFilters: ["Preparado"] })
    const ownership = applyCxOperationPreset("preparationPending", before, target)
    const withPreset = state({ prepFilters: ["Preparado", "Sin preparar", "Congelado con faltantes"] })
    clearCxOperationPreset(ownership, withPreset, target)
    expect(target.setPrepFilters).toHaveBeenLastCalledWith(["Preparado"])
    expect(target.setUrgenteFilter).not.toHaveBeenCalled()
  })

  it("removes only prior preset contributions before applying a second preset", () => {
    const target = setters()
    const before = state({ prepFilters: ["Preparado"] })
    const ownership = applyCxOperationPreset("preparationPending", before, target)
    const withPreset = state({ prepFilters: ["Preparado", "Sin preparar", "Congelado con faltantes"] })
    clearCxOperationPreset(ownership, withPreset, target)
    applyCxOperationPreset("urgent", state({ prepFilters: ["Preparado"] }), target)
    expect(target.setPrepFilters).toHaveBeenLastCalledWith(["Preparado"])
    expect(target.setUrgenteFilter).toHaveBeenCalledWith(true)
  })

  it("reapplying preparation pending keeps the manual value and restores both preset contributions", () => {
    const target = setters()
    const before = state({ prepFilters: ["Preparado"] })
    const first = applyCxOperationPreset("preparationPending", before, target)
    const afterFirst = state({ prepFilters: ["Preparado", "Sin preparar", "Congelado con faltantes"] })
    const second = applyCxOperationPreset("preparationPending", getCxOperationPresetStateAfterClear(first, afterFirst), target)
    clearCxOperationPreset(second, afterFirst, target)
    expect(target.setPrepFilters).toHaveBeenLastCalledWith(["Preparado"])
  })

  it("keeps a manual scalar filter after the preset that replaced it is cleared", () => {
    const target = setters()
    const ownership = applyCxOperationPreset("withoutPr", state({ conPrFilter: "con" }), target)
    clearCxOperationPreset(ownership, state({ conPrFilter: "sin" }), target)
    expect(target.setConPrFilter).toHaveBeenLastCalledWith("con")
  })

  it("globally clears manual and preset state without persistence", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    const { result } = renderHook(() => useCirugiasFilters())

    act(() => {
      result.current.setPrepFilters(["Preparado", "Sin preparar"])
      result.current.setConPrFilter("sin")
      result.current.setSelectedPreset("preparationPending")
      result.current.setNeedsAttention(true)
    })
    act(() => result.current.clearFilters())

    expect(result.current.prepFilters).toEqual([])
    expect(result.current.conPrFilter).toBeNull()
    expect(result.current.selectedPreset).toBeNull()
    expect(result.current.needsAttention).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it("has no persistence mechanism in preset bookkeeping", () => {
    expect(applyCxOperationPreset.toString()).not.toMatch(/localStorage|sessionStorage|fetch|axios/)
    expect(clearCxOperationPreset.toString()).not.toMatch(/localStorage|sessionStorage|fetch|axios/)
  })
})
