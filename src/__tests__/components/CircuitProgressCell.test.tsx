import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { CircuitProgressCell } from "@/components/cirugias/CircuitProgressCell"
import type { CircuitStage } from "@/lib/circuit-progress"

const stages: CircuitStage[] = [
  { key: "cx", done: true, current: false },
  { key: "pr", done: true, current: false },
  { key: "nr", done: false, current: true },
  { key: "consumo", done: false, current: false },
  { key: "doc", done: false, current: false },
  { key: "fact", done: false, current: false },
  { key: "cobro", done: false, current: false },
]

describe("CircuitProgressCell", () => {
  it("renders 7 dots and 6 connectors", () => {
    const { container } = render(
      <table><tbody><tr><CircuitProgressCell stages={stages} /></tr></tbody></table>
    )

    expect(container.querySelectorAll('[data-slot="circuit-dot"]').length).toBe(7)
    expect(container.querySelectorAll('[data-slot="circuit-connector"]').length).toBe(6)
  })

  it("styles done, current, and pending dots correctly", () => {
    const { container } = render(
      <table><tbody><tr><CircuitProgressCell stages={stages} /></tr></tbody></table>
    )

    const dots = Array.from(container.querySelectorAll('[data-slot="circuit-dot"]'))

    expect(dots[0]).toHaveClass("bg-emerald-500")
    expect(dots[1]).toHaveClass("bg-emerald-500")
    expect(dots[2]).toHaveClass("bg-blue-500", "animate-pulse")
    expect(dots[3]).toHaveClass("border", "border-slate-300/80", "bg-slate-100/65")
  })

  it("colors connectors based on the left dot state", () => {
    const { container } = render(
      <table><tbody><tr><CircuitProgressCell stages={stages} /></tr></tbody></table>
    )

    const connectors = Array.from(container.querySelectorAll('[data-slot="circuit-connector"]'))

    expect(connectors[0]).toHaveClass("bg-emerald-400")
    expect(connectors[1]).toHaveClass("bg-emerald-400")
    expect(connectors[2]).toHaveClass("bg-slate-300/80")
  })
})
