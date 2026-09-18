import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CoordinationStateSurface } from "@/components/coordinadores/CoordinationStateSurface"

describe("CoordinationStateSurface", () => {
  it("renders initial loading without false empty or zero copy", () => {
    render(<CoordinationStateSurface state={{ tag: "loading-initial" }} surface="personal" />)
    expect(screen.getByText("Cargando tu bandeja…")).toBeInTheDocument()
    expect(screen.queryByText(/No tenés/)).not.toBeInTheDocument()
  })

  it("keeps loaded content visible during refresh", () => {
    render(<CoordinationStateSurface state={{ tag: "refreshing", previous: "populated" }} surface="global"><article data-testid="result-row">Caso existente</article></CoordinationStateSurface>)
    expect(screen.getByText("Actualizando…")).toBeInTheDocument()
    expect(screen.getByText("Caso existente")).toBeInTheDocument()
    expect(screen.getByTestId("result-row").closest("[aria-live]")).toBeNull()
  })

  it("does not place populated result trees inside a broad live region", () => {
    render(<CoordinationStateSurface state={{ tag: "ready-populated" }} surface="personal"><article data-testid="populated-row">Caso cargado</article></CoordinationStateSurface>)
    expect(screen.getByTestId("populated-row").closest("[aria-live]")).toBeNull()
  })

  it("offers retry for initial and refresh errors", () => {
    const retry = vi.fn()
    const { rerender } = render(<CoordinationStateSurface state={{ tag: "error-initial" }} surface="personal" onRetry={retry} />)
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    rerender(<CoordinationStateSurface state={{ tag: "error-refresh", previous: "populated" }} surface="personal" onRetry={retry}><p>Últimos datos</p></CoordinationStateSurface>)
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(screen.getByText("Últimos datos")).toBeInTheDocument()
    expect(retry).toHaveBeenCalledTimes(2)
  })

  it.each([
    ["blocked-unresolved", "No pudimos vincular tu usuario con un coordinador activo."],
    ["blocked-ambiguous", "Encontramos más de un coordinador posible para tu usuario."],
  ] as const)("renders %s as a blocked state", (tag, copy) => {
    render(<CoordinationStateSurface state={{ tag }} surface="personal" />)
    expect(screen.getByText(copy)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument()
  })

  it("distinguishes real empty from filtered empty", () => {
    const clear = vi.fn()
    const { rerender } = render(<CoordinationStateSurface state={{ tag: "ready-empty" }} surface="personal" emptyStateVariant="productive-personal" onClearFilters={clear} />)
    expect(screen.getByText("No tenés casos asignados en esta etapa.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument()
    rerender(<CoordinationStateSurface state={{ tag: "ready-filtered-empty" }} surface="personal" emptyStateVariant="productive-personal" onClearFilters={clear} />)
    expect(screen.getByText("No hay resultados con estos filtros")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    expect(clear).toHaveBeenCalledOnce()
  })

  it("renders contradiction before normal filtered empty with the exact clear path", () => {
    const clear = vi.fn()
    render(<CoordinationStateSurface state={{ tag: "ready-contradictory-empty" }} surface="personal" emptyStateVariant="productive-personal" onClearFilters={clear} />)
    expect(screen.getByText("Los filtros seleccionados se contradicen")).toBeInTheDocument()
    expect(screen.queryByText("No hay resultados con estos filtros")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    expect(clear).toHaveBeenCalledOnce()
  })

  it("keeps the shared Preview-compatible filtered-empty copy by default", () => {
    render(<CoordinationStateSurface state={{ tag: "ready-filtered-empty" }} surface="personal" />)
    expect(screen.getByText("No hay casos con estos filtros.")).toBeInTheDocument()
    expect(screen.queryByText("No hay resultados con estos filtros")).not.toBeInTheDocument()
  })

  it("can delegate loaded announcements to one external aggregate region", () => {
    render(<><p role="status" aria-live="polite">Resumen agregado</p><CoordinationStateSurface state={{ tag: "ready-filtered-empty" }} surface="personal" emptyStateVariant="productive-personal" loadedAnnouncements="external" /></>)
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByText("No hay resultados con estos filtros")).not.toHaveAttribute("role")
  })

  it("clears denied preview through the explicit exit action", () => {
    const exit = vi.fn()
    render(<CoordinationStateSurface state={{ tag: "preview-denied" }} surface="personal" onExitPreview={exit} />)
    fireEvent.click(screen.getByRole("button", { name: "Volver a mi bandeja" }))
    expect(exit).toHaveBeenCalledOnce()
  })
})
