import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SmartSurgerySearch } from "@/components/cirugias/SmartSurgerySearch"
import { mockSurgeries } from "@/data/mock-surgeries"
import { useCirugiasFilters } from "@/hooks/useCirugiasFilters"

vi.mock("@/lib/store", () => ({ useOrtoTrackStore: () => ({ getContactoById: () => undefined }) }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const surgery = {
  ...mockSurgeries[0], id: "CX-0042", patient: "María López", surgeon: "Dr. Fernández",
  institution: "Hospital Central", client: "OSDE", prNumber: "PR-0081", expedienteNumber: "EXP-0099",
}

function Harness({ surgeries = [surgery] }: { surgeries?: typeof surgery[] }) {
  const filters = useCirugiasFilters()
  return <>
    <SmartSurgerySearch surgeries={surgeries} chips={filters.searchChips} onChipsChange={filters.setSearchChips} />
    <output data-testid="results">{filters.filterData(surgeries).map(item => item.id).join(",")}</output>
    <output data-testid="chip-count">{filters.searchChips.length}</output>
  </>
}

describe("reusable search selection-to-filter integration", () => {
  it.each(["Enter", "button", "suggestion"])("supports %s when crypto.randomUUID is unavailable", async mode => {
    vi.stubGlobal("crypto", {})
    render(<Harness />)
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "lopez" } })
    if (mode === "Enter") fireEvent.keyDown(input, { key: "Enter" })
    else if (mode === "button") fireEvent.click(screen.getByRole("button", { name: "Ejecutar búsqueda" }))
    else fireEvent.click(await screen.findByRole("option", { name: "Paciente: María López" }))
    expect(screen.getByTestId("chip-count")).toHaveTextContent("1")
    expect(screen.getByTestId("results")).toHaveTextContent("CX-0042")
  })

  it.each([
    ["lopez", "Paciente: María López"], ["fernandez", "Médico: Dr. Fernández"],
    ["hospital", "Institución: Hospital Central"], ["osde", "Cliente: OSDE"],
    ["PR-0081", "Presupuesto: PR-0081"], ["EXP-0099", "Expediente: EXP-0099"],
  ])("selecting the rendered %s suggestion keeps its source result", async (query, label) => {
    render(<Harness />)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: query } })
    fireEvent.click(await screen.findByRole("option", { name: label }))
    expect(screen.getByTestId("chip-count")).toHaveTextContent("1")
    expect(screen.getByTestId("results")).toHaveTextContent("CX-0042")
  })

  it.each(["Enter", "button"])("commits normalized text with %s and ignores normalized duplicates", mode => {
    render(<Harness />)
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "  LOPEZ  " } })
    if (mode === "Enter") fireEvent.keyDown(input, { key: "Enter" })
    else fireEvent.click(screen.getByRole("button", { name: "Ejecutar búsqueda" }))
    expect(screen.getByTestId("results")).toHaveTextContent("CX-0042")
    fireEvent.change(input, { target: { value: "López" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(screen.getByTestId("chip-count")).toHaveTextContent("1")
  })

  it("supports ArrowDown/Enter, accessible removal and empty-input Backspace", async () => {
    render(<Harness />)
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "fernandez" } })
    await screen.findByRole("option", { name: "Médico: Dr. Fernández" })
    fireEvent.keyDown(input, { key: "ArrowDown" })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(screen.getByTestId("results")).toHaveTextContent("CX-0042")
    fireEvent.click(screen.getByRole("button", { name: "Quitar Médico: Dr. Fernández" }))
    expect(screen.getByTestId("chip-count")).toHaveTextContent("0")
    fireEvent.change(input, { target: { value: "lopez" } })
    fireEvent.keyDown(input, { key: "Enter" })
    fireEvent.keyDown(input, { key: "Backspace" })
    expect(screen.getByTestId("chip-count")).toHaveTextContent("0")
  })

  it("keeps a genuine zero result and does not invent suggestions", () => {
    render(<Harness />)
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "nonexistent" } })
    expect(screen.queryAllByRole("option")).toHaveLength(0)
    fireEvent.keyDown(input, { key: "Enter" })
    expect(screen.getByTestId("results")).toBeEmptyDOMElement()
    expect(screen.getByTestId("chip-count")).toHaveTextContent("1")
  })

  it("closes the suggestion list after executing from the external search button", () => {
    render(<Harness />)
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "lopez" } })
    const button = screen.getByRole("button", { name: "Ejecutar búsqueda" })
    button.focus()
    fireEvent.click(button)
    expect(input).toHaveValue("")
    expect(input).toHaveAttribute("aria-expanded", "false")
  })

  it("uses the caller's new dataset rather than stale store/mock contacts", async () => {
    const { rerender } = render(<Harness />)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "lopez" } })
    await screen.findByRole("option", { name: "Paciente: María López" })
    rerender(<Harness surgeries={[]} />)
    expect(screen.queryAllByRole("option")).toHaveLength(0)
  })
})
