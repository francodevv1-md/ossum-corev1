import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { BaseFacturacionSelector } from "@/components/facturacion/BaseFacturacionSelector"
import type { BaseFacturacion } from "@/types"

// ─── Shared default props ────────────────────────────────────────────────────
const defaultProps = {
  value: "presupuesto" as BaseFacturacion,
  onChange: vi.fn(),
  totalPresupuestado: 1_000_000,
  totalConsumidoValorizado: 800_000,
}

describe("BaseFacturacionSelector", () => {
  // ═══════════════════════════════════════════════════════════════
  // Renders all three base options
  // ═══════════════════════════════════════════════════════════════
  describe("renders all three base options", () => {
    it("renders 'Presupuesto vigente' option", () => {
      render(<BaseFacturacionSelector {...defaultProps} />)
      expect(screen.getByText("Presupuesto vigente")).toBeInTheDocument()
    })

    it("renders 'Consumo valorizado' option", () => {
      render(<BaseFacturacionSelector {...defaultProps} />)
      expect(screen.getByText("Consumo valorizado")).toBeInTheDocument()
    })

    it("renders 'Mixto (manual)' option", () => {
      render(<BaseFacturacionSelector {...defaultProps} />)
      expect(screen.getByText("Mixto (manual)")).toBeInTheDocument()
    })

    it("renders all three radio buttons", () => {
      render(<BaseFacturacionSelector {...defaultProps} />)
      const radios = screen.getAllByRole("radio")
      expect(radios).toHaveLength(3)
    })

    it("renders correct currency amounts for each option", () => {
      const { container } = render(<BaseFacturacionSelector {...defaultProps} />)
      // presupuesto: 1,000,000 — should appear in the DOM as formatted currency
      expect(container.textContent).toContain("1.000.000")
      // consumo: 800,000
      expect(container.textContent).toContain("800.000")
      // mixto: max(1,000,000, 800,000) = 1,000,000 (appears multiple times)
    })

    it("renders the section label 'Facturar según:'", () => {
      render(<BaseFacturacionSelector {...defaultProps} />)
      expect(screen.getByText("Facturar según:")).toBeInTheDocument()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Calls onChange when selection changes
  // ═══════════════════════════════════════════════════════════════
  describe("calls onChange when selection changes", () => {
    it("calls onChange with 'consumo' when consumo option is clicked", () => {
      const onChange = vi.fn()
      render(<BaseFacturacionSelector {...defaultProps} onChange={onChange} />)

      const consumoLabel = screen.getByText("Consumo valorizado")
      fireEvent.click(consumoLabel)

      expect(onChange).toHaveBeenCalledWith("consumo")
    })

    it("calls onChange with 'mixto' when mixto option is clicked", () => {
      const onChange = vi.fn()
      render(<BaseFacturacionSelector {...defaultProps} onChange={onChange} />)

      const mixtoLabel = screen.getByText("Mixto (manual)")
      fireEvent.click(mixtoLabel)

      expect(onChange).toHaveBeenCalledWith("mixto")
    })

    it("calls onChange with 'presupuesto' when presupuesto option is clicked", () => {
      const onChange = vi.fn()
      render(
        <BaseFacturacionSelector
          {...defaultProps}
          value="consumo"
          onChange={onChange}
        />
      )

      const presupuestoLabel = screen.getByText("Presupuesto vigente")
      fireEvent.click(presupuestoLabel)

      expect(onChange).toHaveBeenCalledWith("presupuesto")
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Highlights the selected base
  // ═══════════════════════════════════════════════════════════════
  describe("highlights the selected base", () => {
    it("checks the presupuesto radio when value is presupuesto", () => {
      render(<BaseFacturacionSelector {...defaultProps} value="presupuesto" />)
      const presupuestoRadio = screen.getByRole("radio", { name: /Presupuesto vigente/ })
      expect(presupuestoRadio).toBeChecked()
    })

    it("checks the consumo radio when value is consumo", () => {
      render(<BaseFacturacionSelector {...defaultProps} value="consumo" />)
      const consumoRadio = screen.getByRole("radio", { name: /Consumo valorizado/ })
      expect(consumoRadio).toBeChecked()
    })

    it("checks the mixto radio when value is mixto", () => {
      render(<BaseFacturacionSelector {...defaultProps} value="mixto" />)
      const mixtoRadio = screen.getByRole("radio", { name: /Mixto \(manual\)/ })
      expect(mixtoRadio).toBeChecked()
    })

    it("does not check non-selected radios", () => {
      render(<BaseFacturacionSelector {...defaultProps} value="presupuesto" />)
      const consumoRadio = screen.getByRole("radio", { name: /Consumo valorizado/ })
      const mixtoRadio = screen.getByRole("radio", { name: /Mixto \(manual\)/ })
      expect(consumoRadio).not.toBeChecked()
      expect(mixtoRadio).not.toBeChecked()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Suggestion badge
  // ═══════════════════════════════════════════════════════════════
  describe("suggestion badge", () => {
    it("shows 'Sugerido' badge on the suggested option", () => {
      render(
        <BaseFacturacionSelector
          {...defaultProps}
          suggestion="consumo"
        />
      )
      // "Sugerido" badge should appear next to "Consumo valorizado"
      const badges = screen.getAllByText("Sugerido")
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })

    it("does not show 'Sugerido' badge when no suggestion", () => {
      render(<BaseFacturacionSelector {...defaultProps} />)
      expect(screen.queryByText("Sugerido")).not.toBeInTheDocument()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Forced mode
  // ═══════════════════════════════════════════════════════════════
  describe("forced mode", () => {
    it("renders forced warning when forced=true", () => {
      render(
        <BaseFacturacionSelector
          {...defaultProps}
          forced
        />
      )
      expect(screen.getByText(/Base forzada/)).toBeInTheDocument()
    })

    it("does not render forced warning when forced=false or omitted", () => {
      render(<BaseFacturacionSelector {...defaultProps} />)
      expect(screen.queryByText(/Base forzada/)).not.toBeInTheDocument()
    })

    it("disables radio group when forced=true", () => {
      const { container } = render(
        <BaseFacturacionSelector
          {...defaultProps}
          forced
        />
      )
      // The radio group should have the disabled attribute
      const radios = screen.getAllByRole("radio")
      expect(radios.every((r) => (r as HTMLInputElement).disabled)).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Mixto amount calculation
  // ═══════════════════════════════════════════════════════════════
  describe("mixto amount calculation", () => {
    it("shows max(presupuesto, consumo) for mixto when consumo > presupuesto", () => {
      const { container } = render(
        <BaseFacturacionSelector
          {...defaultProps}
          totalPresupuestado={500_000}
          totalConsumidoValorizado={700_000}
        />
      )
      // Mixto should show 700,000 (the max)
      expect(container.textContent).toContain("700.000")
    })

    it("shows max(presupuesto, consumo) for mixto when presupuesto > consumo", () => {
      const { container } = render(
        <BaseFacturacionSelector
          {...defaultProps}
          totalPresupuestado={900_000}
          totalConsumidoValorizado={600_000}
        />
      )
      // Mixto should show 900,000 (the max)
      expect(container.textContent).toContain("900.000")
    })
  })
})
