import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CxAttentionMarker } from "@/components/cx-operations/CxAttentionMarker"

describe("CxAttentionMarker", () => {
  it("renders nothing without source-backed attention reasons", () => {
    const { container, rerender } = render(<CxAttentionMarker />)
    expect(container.firstChild).toBeNull()

    rerender(<CxAttentionMarker attentionReasons={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders the first reason visibly and all reasons accessibly in source order", () => {
    render(<CxAttentionMarker attentionReasons={["SLA vencido", "Sin disponibilidad", "Urgente"]} />)

    const marker = screen.getByLabelText("Atención: SLA vencido; Sin disponibilidad; Urgente")
    expect(marker).toHaveTextContent("Atención: SLA vencido")
    expect(marker.querySelector("svg")).toBeInTheDocument()
    expect(marker.className).toContain("border-amber-300")
    expect(marker).not.toHaveAttribute("aria-live")
  })
})
