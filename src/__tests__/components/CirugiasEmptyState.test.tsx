import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { CirugiasEmptyState } from "@/components/cirugias/CirugiasEmptyState"

function renderEmptyState(props: Partial<Parameters<typeof CirugiasEmptyState>[0]> = {}) {
  return render(
    <table>
      <tbody>
        <CirugiasEmptyState hasActiveFilters={false} {...props} />
      </tbody>
    </table>
  )
}

describe("CirugiasEmptyState", () => {
  it("renders the primary message", () => {
    renderEmptyState()
    expect(screen.getByText("No se encontraron cirugías con los filtros aplicados")).toBeInTheDocument()
  })

  it("shows hint and clear button when filters are active and callback exists", () => {
    renderEmptyState({ hasActiveFilters: true, onClearFilters: vi.fn() })

    expect(screen.getByText("Probá ajustar o limpiar los filtros")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument()
  })

  it("hides filter hint and clear button when filters are inactive", () => {
    renderEmptyState({ hasActiveFilters: false, onClearFilters: vi.fn() })

    expect(screen.queryByText("Probá ajustar o limpiar los filtros")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument()
  })

  it("shows hint without clear button when callback is missing", () => {
    renderEmptyState({ hasActiveFilters: true })

    expect(screen.getByText("Probá ajustar o limpiar los filtros")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument()
  })

  it("renders new surgery CTA only when callback exists and triggers both actions", () => {
    const onClearFilters = vi.fn()
    const onNewSurgery = vi.fn()

    renderEmptyState({ hasActiveFilters: true, onClearFilters, onNewSurgery })

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    fireEvent.click(screen.getByRole("button", { name: "Nueva cirugía" }))

    expect(onClearFilters).toHaveBeenCalledTimes(1)
    expect(onNewSurgery).toHaveBeenCalledTimes(1)
  })

  it("does not render new surgery CTA when callback is missing", () => {
    renderEmptyState()
    expect(screen.queryByRole("button", { name: "Nueva cirugía" })).not.toBeInTheDocument()
  })
})
