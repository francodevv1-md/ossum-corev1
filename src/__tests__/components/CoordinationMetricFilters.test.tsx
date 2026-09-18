import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CoordinationMetricFilters } from "@/components/coordinadores/CoordinationMetricFilters"

const counts = { "put-date": 3, overdue: 0, coordinated: 5, "in-transit": 1 } as const

describe("CoordinationMetricFilters", () => {
  it("renders exactly four operable Spanish metric toggles with stable counts", () => {
    const toggle = vi.fn()
    render(<CoordinationMetricFilters counts={counts} selected={new Set(["put-date"])} onToggle={toggle} />)

    const group = screen.getByRole("group", { name: "Filtros por métricas de coordinación" })
    const buttons = within(group).getAllByRole("button")
    expect(buttons).toHaveLength(4)
    expect(buttons.map((button) => button.textContent)).toEqual([
      expect.stringContaining("Poner fecha3"),
      expect.stringContaining("Fuera de plazo0"),
      expect.stringContaining("Coordinadas5"),
      expect.stringContaining("En tránsito1"),
    ])
    expect(screen.getByRole("button", { name: "Poner fecha, 3 casos" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Fuera de plazo, 0 casos" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "Fuera de plazo, 0 casos" })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: "Fuera de plazo, 0 casos" }))
    expect(toggle).toHaveBeenCalledWith("overdue")
  })

  it("uses compact responsive layout, 44px targets, and a non-color selected indicator", () => {
    render(<CoordinationMetricFilters counts={counts} selected={new Set(["coordinated"])} onToggle={vi.fn()} />)
    const group = screen.getByRole("group")
    expect(group).toHaveClass("grid-cols-2", "sm:grid-cols-4", "min-w-0")
    for (const button of within(group).getAllByRole("button")) expect(button).toHaveClass("min-h-11", "min-w-0")
    expect(screen.getByRole("button", { name: "Coordinadas, 5 casos" }).querySelector("svg")).toBeInTheDocument()
  })
})
