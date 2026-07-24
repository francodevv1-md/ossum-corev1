/**
 * MissingCountText.test.tsx — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-04)
 *
 * Validates the pure presentational footer missing-count line:
 * - null when count === 0
 * - singular "Faltan 1 obligatorio" for count === 1
 * - plural "Faltan N obligatorios" for count > 1
 * - amber token classes (AC-07)
 * - informational only (no button, no disabled prop — Siguiente stays enabled)
 */
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

import { MissingCountText } from "@/components/cirugias/MissingCountText"

describe("MissingCountText — NUEVA-CIRUGIA-IA-UX-P1", () => {
  it("renders nothing when count is 0", () => {
    const { container } = render(<MissingCountText count={0} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when count is negative (defensive)", () => {
    const { container } = render(<MissingCountText count={-1} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders the singular form 'Faltan 1 obligatorio' when count === 1", () => {
    render(<MissingCountText count={1} />)
    expect(screen.getByText("Faltan 1 obligatorio")).toBeInTheDocument()
  })

  it("renders the plural form 'Faltan 2 obligatorios' when count === 2", () => {
    render(<MissingCountText count={2} />)
    expect(screen.getByText("Faltan 2 obligatorios")).toBeInTheDocument()
  })

  it("renders the plural form 'Faltan 5 obligatorios' when count === 5", () => {
    render(<MissingCountText count={5} />)
    expect(screen.getByText("Faltan 5 obligatorios")).toBeInTheDocument()
  })

  it("uses the amber token classes (AC-07)", () => {
    const { container } = render(<MissingCountText count={3} />)
    const span = container.firstChild as HTMLElement
    expect(span.tagName).toBe("SPAN")
    expect(span.className).toContain("text-amber-700")
    expect(span.className).toContain("dark:text-amber-400")
    // mr-auto keeps the right-aligned footer buttons in place (DESIGN §7.4).
    expect(span.className).toContain("mr-auto")
  })

  it("is informational only — renders a span, not a button (AC-04)", () => {
    const { container } = render(<MissingCountText count={2} />)
    expect(container.querySelector("button")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
