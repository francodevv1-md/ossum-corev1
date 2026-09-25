import { renderHook, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useTemporalNavigation, formatLocalDate } from "@/hooks/useTemporalNavigation"

describe("useTemporalNavigation with Period support", () => {
  it("formats single day correctly", () => {
    const fixedDate = new Date(2026, 8, 24) // 24 Septiembre 2026 (Jueves)
    const { result } = renderHook(() => useTemporalNavigation(fixedDate))

    expect(result.current.periodTitle).toContain("Jueves 24 de Septiembre, 2026")
  })

  it("formats multi-day period in the same month correctly", () => {
    const fixedDate = new Date(2026, 8, 24)
    const { result } = renderHook(() => useTemporalNavigation(fixedDate))

    act(() => {
      result.current.setDateRange("2026-09-24", "2026-09-30")
    })

    expect(result.current.periodTitle).toContain("Período: Jueves 24 al 30 de Septiembre, 2026")
  })

  it("formats period spanning across different months correctly", () => {
    const fixedDate = new Date(2026, 8, 24)
    const { result } = renderHook(() => useTemporalNavigation(fixedDate))

    act(() => {
      result.current.setDateRange("2026-09-24", "2026-10-05")
    })

    expect(result.current.periodTitle).toContain("Período: 24 de Septiembre al 5 de Octubre, 2026")
  })

  it("checks date containment with isDateInPeriod", () => {
    const fixedDate = new Date(2026, 8, 24)
    const { result } = renderHook(() => useTemporalNavigation(fixedDate))

    act(() => {
      result.current.setDateRange("2026-09-24", "2026-09-30")
    })

    expect(result.current.isDateInPeriod("2026-09-25")).toBe(true)
    expect(result.current.isDateInPeriod("2026-09-24")).toBe(true)
    expect(result.current.isDateInPeriod("2026-09-30")).toBe(true)
    expect(result.current.isDateInPeriod("2026-10-01")).toBe(false)
    expect(result.current.isDateInPeriod("2026-09-20")).toBe(false)
  })

  it("applies next7 preset correctly", () => {
    const { result } = renderHook(() => useTemporalNavigation(new Date()))

    act(() => {
      result.current.applyPreset("next7")
    })

    expect(result.current.activePreset).toBe("next7")
    expect(result.current.startDateStr).toBeDefined()
    expect(result.current.endDateStr).toBeDefined()
  })
})
