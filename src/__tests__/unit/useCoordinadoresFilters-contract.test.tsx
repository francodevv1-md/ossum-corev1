import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useCoordinadoresFilters } from "@/hooks/useCoordinadoresFilters"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"

describe("coordination filter contracts", () => {
  afterEach(() => vi.useRealTimers())
  it("evaluates overdue against the Argentine day, not the UTC next day", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-07T02:00:00Z"))
    const surgeries = mapApiSurgeryListToSurgeries([{ id: "cx-1", surgeryDate: "2026-10-06T03:00:00Z", surgeryTimeSpecified: false, cxStatus: "authorized" }])
    const { result } = renderHook(() => useCoordinadoresFilters(surgeries))
    expect(result.current.incidentMetrics.find(metric => metric.key === "fuera-plazo")?.count).toBe(0)
    act(() => result.current.toggleIncidentFilter("fuera-plazo"))
    expect(result.current.filteredSurgeries).toHaveLength(0)
  })
  it("combines supported additional filters across the full dataset and clears them", () => {
    const surgeries = mapApiSurgeryListToSurgeries(Array.from({ length: 60 }, (_, index) => ({ id: `cx-${index}`, classification: "Osteosíntesis", priority: index === 59 ? "urgent" : "normal", institution: { legalName: "Hospital" }, payer: { legalName: "Payer" } })))
    const { result } = renderHook(() => useCoordinadoresFilters(surgeries))
    act(() => { result.current.setInstitutionFilters(["Hospital"]); result.current.setClientFilters(["Payer"]); result.current.setClassFilters(["Osteosíntesis"]); result.current.setUrgenteFilter(true); result.current.setSinFechaCx(true) })
    expect(result.current.filteredSurgeries.map(surgery => surgery.backendId)).toEqual(["cx-59"])
    act(() => result.current.clearAllFilters())
    expect(result.current.filteredSurgeries).toHaveLength(60)
  })
  it("replaces single-select coordinator values by contact ID and clears all", () => {
    const surgeries = mapApiSurgeryListToSurgeries([
      { id: "cx-a", coordinatorAssignment: { resolved: { contactId: "contact-a", label: "Alex" } } },
      { id: "cx-b", coordinatorAssignment: { resolved: { contactId: "contact-b", label: "Alex" } } },
      { id: "cx-c", coordinatorAssignment: { status: "unassigned" } },
    ])
    const { result } = renderHook(() => useCoordinadoresFilters(surgeries))
    act(() => result.current.toggleCoordinator("contact-a"))
    expect(result.current.filters.selectedCoordinators).toEqual(["contact-a"])
    expect(result.current.filteredSurgeries.map(surgery => surgery.backendId)).toEqual(["cx-a"])
    act(() => result.current.toggleCoordinator("contact-b"))
    expect(result.current.filters.selectedCoordinators).toEqual(["contact-b"])
    expect(result.current.filteredSurgeries.map(surgery => surgery.backendId)).toEqual(["cx-b"])
    act(() => result.current.toggleCoordinator("contact-b"))
    expect(result.current.filters.selectedCoordinators).toEqual([])
    expect(result.current.filteredSurgeries).toHaveLength(3)
  })
})
