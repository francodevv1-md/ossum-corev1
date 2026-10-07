import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { mockSurgeries } from "@/data/mock-surgeries"
import { useCirugiasFilters } from "@/hooks/useCirugiasFilters"
import { getSurgerySearchSuggestions, matchesSurgerySearchText } from "@/lib/cirugias/search"
import type { SearchChip } from "@/lib/cirugias.types"

vi.mock("@/lib/store", () => ({ useOrtoTrackStore: () => ({ getContactoById: () => undefined }) }))

const surgery = {
  ...mockSurgeries[0], id: "CX-0042", patient: "María López", surgeon: "Dr. Fernández",
  institution: "Hospital Central", client: "OSDE", prNumber: "PR-0081", expedienteNumber: "EXP-0099",
  state: "Pendiente" as const, surgeonContactId: "doctor-42", patientContactId: "patient-42",
  institutionContactId: "institution-42", clientContactId: "payer-42",
}
const chip = (field: SearchChip["field"], value: string): SearchChip => ({
  id: `${field}:${value}`, field, value, match: "text", label: value,
})

describe("production surgery search", () => {
  it.each([
    ["lopez", "paciente"], ["fernandez", "medico"], ["hospital", "institucion"],
    ["osde", "cliente"], ["CX-0042", "general"], ["PR-0081", "general"], ["EXP-0099", "general"],
  ] as const)("selecting %s finds the source surgery through the actual filter hook", (query, field) => {
    const suggestion = getSurgerySearchSuggestions([surgery], query).find(item => item.field === field)
    expect(suggestion).toBeDefined()
    const { result } = renderHook(() => useCirugiasFilters())
    act(() => result.current.setSearchChips([{ ...suggestion!, id: "selected" }]))
    expect(result.current.filterData([surgery])).toEqual([surgery])
  })

  it.each(["  LOPEZ  ", "DR.   FERNANDEZ", " Hospital ", "OSDE"])("normalizes simple search %s across all core fields", query => {
    const { result } = renderHook(() => useCirugiasFilters())
    act(() => result.current.setSearch(query))
    expect(result.current.filterData([surgery])).toEqual([surgery])
  })

  it("combines simple text with chips instead of silently ignoring it", () => {
    const { result } = renderHook(() => useCirugiasFilters())
    act(() => {
      result.current.setSearchChips([chip("cliente", "OSDE")])
      result.current.setSearch("nonexistent patient")
    })
    expect(result.current.filterData([surgery])).toEqual([])
  })

  it("keeps OR within a category and AND between categories", () => {
    const { result } = renderHook(() => useCirugiasFilters())
    act(() => result.current.setSearchChips([
      chip("paciente", "lopez"), chip("paciente", "another patient"), chip("cliente", "OSDE"),
    ]))
    expect(result.current.filterData([surgery])).toEqual([surgery])
    act(() => result.current.setSearchChips([chip("paciente", "lopez"), chip("cliente", "another payer")]))
    expect(result.current.filterData([surgery])).toEqual([])
  })

  it("distinguishes restrictive filters and explicitly recovers without losing the query", () => {
    const { result } = renderHook(() => useCirugiasFilters())
    const selected = chip("paciente", "lopez")
    act(() => {
      result.current.setSearch("OSDE")
      result.current.setSearchChips([selected])
      result.current.setStateFilters(["Cancelada"])
      result.current.setSelectedPreset("urgent")
      result.current.setNeedsAttention(true)
    })
    expect(result.current.filterSearchData([surgery])).toEqual([surgery])
    expect(result.current.filterData([surgery])).toEqual([])
    act(() => result.current.clearFilters(true))
    expect(result.current.search).toBe("OSDE")
    expect(result.current.searchChips).toEqual([selected])
    expect(result.current.selectedPreset).toBeNull()
    expect(result.current.needsAttention).toBe(false)
    expect(result.current.filterData([surgery])).toEqual([surgery])
    act(() => result.current.clearFilters())
    expect(result.current.search).toBe("")
    expect(result.current.searchChips).toEqual([])
  })

  it("preserves matching legacy contact chips", () => {
    const { result } = renderHook(() => useCirugiasFilters())
    act(() => result.current.setSearchChips([{ id: "legacy", field: "medico", value: "doctor-42", label: "Doctor" }]))
    expect(result.current.filterData([surgery])).toEqual([surgery])
  })

  it("deduplicates normalized suggestions without hiding a different category", () => {
    const suggestions = getSurgerySearchSuggestions([
      surgery, { ...surgery, id: "CX-0043", patient: "MARIA  LOPEZ", surgeon: "Dr. López" },
    ], "lopez")
    expect(suggestions.filter(item => item.field === "paciente")).toHaveLength(1)
    expect(suggestions.some(item => item.field === "medico")).toBe(true)
  })

  it("caps suggestions but does not cap matching surgeries", () => {
    const surgeries = Array.from({ length: 60 }, (_, i) => ({ ...surgery, id: `CX-${i}`, patient: `Paciente ${i}` }))
    expect(getSurgerySearchSuggestions(surgeries, "paciente").filter(item => item.field === "paciente")).toHaveLength(5)
    const { result } = renderHook(() => useCirugiasFilters())
    act(() => result.current.setSearchChips([chip("general", "paciente")]))
    expect(result.current.filterData(surgeries)).toHaveLength(60)
  })

  it("never widens the supplied scope and keeps genuine misses empty", () => {
    expect(getSurgerySearchSuggestions([], "lopez")).toEqual([])
    expect(getSurgerySearchSuggestions([surgery], "missing")).toEqual([])
    expect(matchesSurgerySearchText(surgery, "missing")).toBe(false)
    expect(matchesSurgerySearchText(surgery, "   ")).toBe(false)
    const { result } = renderHook(() => useCirugiasFilters())
    act(() => result.current.setSearchChips([chip("general", "missing")]))
    expect(result.current.filterData([surgery])).toEqual([])
  })
})
