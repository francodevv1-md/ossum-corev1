import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { BoxesOperationalIndex } from "@/components/boxes/BoxesOperationalIndex"
import { BOX_PRESENTATION_FIXTURES } from "@/features/boxes/presentation/boxes-presentation-fixtures"

function renderIndex() {
  return render(<BoxesOperationalIndex items={BOX_PRESENTATION_FIXTURES} />)
}

describe("BoxesOperationalIndex", () => {
  it("shows a unit-centric control board without duplicating the page heading", () => {
    renderIndex()

    expect(screen.getByRole("heading", { name: "Unidades físicas", level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Cajas", level: 1 })).not.toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Unidades físicas" })).toBeInTheDocument()
    expect(screen.getByText("UT-TIB-014")).toBeInTheDocument()
  })

  it("exposes uses, latest Surgery, reported problems, and repair-log signals per unit", () => {
    renderIndex()

    const row = screen.getByText("UT-TIB-022").closest("tr")
    expect(row).not.toBeNull()
    expect(within(row!).getByText("8")).toBeInTheDocument()
    expect(within(row!).getByText("CX-1921")).toBeInTheDocument()
    expect(within(row!).getByText("2", { selector: "td" })).toBeInTheDocument()
    expect(within(row!).getByText("2 envíos")).toBeInTheDocument()
    expect(within(row!).getByText("1 instrumental con último evento: envío")).toBeInTheDocument()
  })

  it("shows active maintenance separately from condition and historical repair signals", () => {
    const box = {
      ...BOX_PRESENTATION_FIXTURES[0],
      units: [{
        ...BOX_PRESENTATION_FIXTURES[0].units[0],
        activeMaintenanceCount: 2,
        latestActiveMaintenance: {
          id: "maintenance-2",
          kind: "REPAIR" as const,
          status: "SENT" as const,
          articleDescription: "Guía de corte tibial",
          version: 2,
          updatedAt: "2026-08-27T10:00:00Z",
        },
      }],
    }
    render(<BoxesOperationalIndex items={[box]} />)

    const row = screen.getByText("UT-TIB-014").closest("tr")!
    expect(within(row).getByText("2 casos activos")).toBeInTheDocument()
    expect(within(row).getByText("Enviado · Guía de corte tibial")).toBeInTheDocument()
    expect(within(row).getByText("Disponible")).toBeInTheDocument()
    expect(within(row).getByText("1 envío")).toBeInTheDocument()
  })

  it("derives condition summaries from physical units and filters rows", () => {
    renderIndex()

    const available = screen.getByRole("button", { name: "Disponible, 4 unidades físicas" })
    const differences = screen.getByRole("button", { name: "Con diferencias, 2 unidades físicas" })
    fireEvent.click(differences)

    expect(differences).toHaveAttribute("aria-pressed", "true")
    expect(available).toBeInTheDocument()
    expect(screen.getByText("UT-TIB-022")).toBeInTheDocument()
    expect(screen.queryByText("UT-TIB-014")).not.toBeInTheDocument()
    expect(screen.queryByText("UT-ART-008")).not.toBeInTheDocument()
  })

  it("applies search and condition filters directly to physical units", () => {
    renderIndex()

    fireEvent.change(screen.getByLabelText("Buscar unidad o modelo"), { target: { value: "UT-TIB" } })
    fireEvent.click(screen.getByRole("button", { name: "Disponible, 1 unidad física" }))

    expect(screen.getByText("UT-TIB-014")).toBeInTheDocument()
    expect(screen.queryByText("UT-TIB-022")).not.toBeInTheDocument()
    expect(screen.queryByText("UT-TIB-031")).not.toBeInTheDocument()
  })

  it("searches by latest Surgery reference", () => {
    renderIndex()

    fireEvent.change(screen.getByLabelText("Buscar unidad o modelo"), { target: { value: "CX-1921" } })

    expect(screen.getByText("UT-TIB-022")).toBeInTheDocument()
    expect(screen.queryByText("UT-TIB-014")).not.toBeInTheDocument()
  })

  it("distinguishes no matches, no physical units, and an empty catalog", () => {
    const { rerender } = renderIndex()

    fireEvent.change(screen.getByLabelText("Buscar unidad o modelo"), { target: { value: "sin-coincidencias" } })
    expect(screen.getByText("No hay resultados para esta búsqueda o filtro")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Restablecer filtros" }))

    rerender(<BoxesOperationalIndex items={[{ ...BOX_PRESENTATION_FIXTURES[0], units: [] }]} />)
    expect(screen.getByText("No hay unidades físicas identificadas")).toBeInTheDocument()

    rerender(<BoxesOperationalIndex items={[]} />)
    expect(screen.getByText("Todavía no hay cajas para mostrar")).toBeInTheDocument()
  })

  it("exposes loading, error, refreshing, and retry states", () => {
    const onRetry = vi.fn()
    const { rerender } = render(<BoxesOperationalIndex items={[]} loading onRetry={onRetry} />)
    expect(screen.getByRole("status", { name: "Cargando unidades físicas" })).toBeInTheDocument()
    rerender(<BoxesOperationalIndex items={[]} error onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar las cajas")
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(onRetry).toHaveBeenCalledOnce()
    rerender(<BoxesOperationalIndex items={BOX_PRESENTATION_FIXTURES} loading onRetry={onRetry} />)
    expect(screen.getByRole("status", { name: "Actualizando información" })).toBeInTheDocument()
  })

  it("keeps model and history actions explicit and touch-sized", () => {
    const onOpenBox = vi.fn()
    const onOpenUnit = vi.fn()
    render(<BoxesOperationalIndex items={[BOX_PRESENTATION_FIXTURES[0]]} onOpenBox={onOpenBox} onOpenUnit={onOpenUnit} />)

    fireEvent.click(screen.getAllByRole("button", { name: /Abrir Caja/ })[0])
    fireEvent.click(screen.getByRole("button", { name: "Ver historial de UT-TIB-014" }))
    expect(onOpenBox).toHaveBeenCalledWith(BOX_PRESENTATION_FIXTURES[0])
    expect(onOpenUnit).toHaveBeenCalledWith(BOX_PRESENTATION_FIXTURES[0], BOX_PRESENTATION_FIXTURES[0].units[0])
    expect(screen.getByRole("button", { name: "Ver historial de UT-TIB-014" }).className).toContain("min-h-11")
  })

  it("uses server source states without exposing presentation controls", () => {
    const onRetry = vi.fn()
    const { rerender } = render(<BoxesOperationalIndex items={[]} loading onRetry={onRetry} />)

    expect(screen.getByRole("status", { name: "Cargando unidades físicas" })).toBeInTheDocument()
    rerender(<BoxesOperationalIndex items={[]} error onRetry={onRetry} />)
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
