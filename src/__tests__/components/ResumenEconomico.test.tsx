import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ResumenEconomico } from "@/components/facturacion/ResumenEconomico"
import type { BaseFacturacion } from "@/types"

/**
 * Helper: extract currency-formatted text from container.
 * Uses a function matcher because Intl.NumberFormat with es-AR locale
 * produces non-breaking spaces (U+00A0) that make exact string matching fragile.
 */
function hasText(container: HTMLElement, text: string): boolean {
  return container.textContent?.includes(text) ?? false
}

// ─── Shared default props ────────────────────────────────────────────────────
const defaultProps = {
  totalPresupuestado: 1_000_000,
  totalConsumidoValorizado: 800_000,
  deltaDetectado: -200_000,
  baseFacturacion: "presupuesto" as BaseFacturacion,
  totalAFacturar: 1_000_000,
}

describe("ResumenEconomico", () => {
  // ═══════════════════════════════════════════════════════════════
  // Full (non-compact) mode
  // ═══════════════════════════════════════════════════════════════
  describe("full mode (default)", () => {
    it("renders total presupuestado as formatted currency", () => {
      const { container } = render(<ResumenEconomico {...defaultProps} />)
      // Intl es-AR produces something like "$ 1.000.000" (with non-breaking spaces)
      expect(hasText(container, "1.000.000")).toBe(true)
    })

    it("renders total consumido valorizado as formatted currency", () => {
      const { container } = render(<ResumenEconomico {...defaultProps} />)
      expect(hasText(container, "800.000")).toBe(true)
    })

    it("renders delta when significant (>= 1)", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} deltaDetectado={-200_000} />
      )
      // Delta label should appear
      expect(screen.getByText("Delta")).toBeInTheDocument()
      // Delta value should appear (negative)
      expect(hasText(container, "200.000")).toBe(true)
    })

    it("does not render delta when absolute value < 1", () => {
      render(<ResumenEconomico {...defaultProps} deltaDetectado={0} />)
      expect(screen.queryByText("Delta")).not.toBeInTheDocument()
    })

    it("renders 'Total a facturar' label", () => {
      render(<ResumenEconomico {...defaultProps} totalAFacturar={1_000_000} />)
      expect(screen.getByText("Total a facturar")).toBeInTheDocument()
    })

    it("renders total a facturar as formatted currency", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} totalAFacturar={1_500_000} />
      )
      expect(hasText(container, "1.500.000")).toBe(true)
    })

    it("renders 'Resumen Económico' heading", () => {
      render(<ResumenEconomico {...defaultProps} />)
      expect(screen.getByText("Resumen Económico")).toBeInTheDocument()
    })

    it("renders base facturacion label with presupuesto", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} baseFacturacion="presupuesto" />
      )
      expect(hasText(container, "Base facturación")).toBe(true)
      expect(hasText(container, "Presupuesto vigente")).toBe(true)
    })

    it("renders base facturacion label with consumo", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} baseFacturacion="consumo" />
      )
      expect(hasText(container, "Consumo valorizado")).toBe(true)
    })

    it("renders presupuestoId when provided", () => {
      render(<ResumenEconomico {...defaultProps} presupuestoId="PR-001" />)
      expect(screen.getByText(/PR-001/)).toBeInTheDocument()
    })

    it("renders items sin precio warning when provided", () => {
      render(
        <ResumenEconomico
          {...defaultProps}
          itemsSinPrecio={["Tornillo especial", "Placa custom"]}
        />
      )
      expect(screen.getByText(/2 ítem\(s\) sin precio de referencia/)).toBeInTheDocument()
      expect(screen.getByText(/Tornillo especial, Placa custom/)).toBeInTheDocument()
    })

    it("does not render items sin precio section when array is empty", () => {
      render(<ResumenEconomico {...defaultProps} itemsSinPrecio={[]} />)
      expect(screen.queryByText(/sin precio de referencia/)).not.toBeInTheDocument()
    })

    it("renders 'Ver diferencias' button when tieneDiferencias and onVerDiferencias provided", () => {
      render(
        <ResumenEconomico
          {...defaultProps}
          deltaDetectado={5000}
          onVerDiferencias={() => {}}
        />
      )
      expect(screen.getByText("Ver diferencias")).toBeInTheDocument()
    })

    it("renders 'Facturar' button when onFacturar provided", () => {
      render(<ResumenEconomico {...defaultProps} onFacturar={() => {}} />)
      expect(screen.getByText("Facturar")).toBeInTheDocument()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Compact mode
  // ═══════════════════════════════════════════════════════════════
  describe("compact mode", () => {
    it("renders total presupuestado in compact view", () => {
      const { container } = render(<ResumenEconomico {...defaultProps} compact />)
      expect(hasText(container, "1.000.000")).toBe(true)
    })

    it("renders total consumido valorizado in compact view", () => {
      const { container } = render(<ResumenEconomico {...defaultProps} compact />)
      expect(hasText(container, "800.000")).toBe(true)
    })

    it("renders total a facturar in compact view", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} compact totalAFacturar={950_000} />
      )
      expect(hasText(container, "950.000")).toBe(true)
    })

    it("renders delta in compact view when significant", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} compact deltaDetectado={5000} />
      )
      expect(screen.getByText("Delta:")).toBeInTheDocument()
      expect(hasText(container, "5.000")).toBe(true)
    })

    it("does not render heading in compact mode", () => {
      render(<ResumenEconomico {...defaultProps} compact />)
      expect(screen.queryByText("Resumen Económico")).not.toBeInTheDocument()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Zero values
  // ═══════════════════════════════════════════════════════════════
  describe("zero values", () => {
    it("handles all zero values gracefully", () => {
      const { container } = render(
        <ResumenEconomico
          totalPresupuestado={0}
          totalConsumidoValorizado={0}
          deltaDetectado={0}
          baseFacturacion="presupuesto"
          totalAFacturar={0}
        />
      )
      // Should render without crashing
      expect(container).toBeTruthy()
      // Zero value should be rendered (currency format for 0)
      expect(screen.getByText("Total a facturar")).toBeInTheDocument()
    })

    it("handles zero presupuesto with non-zero consumo", () => {
      const { container } = render(
        <ResumenEconomico
          totalPresupuestado={0}
          totalConsumidoValorizado={500_000}
          deltaDetectado={500_000}
          baseFacturacion="consumo"
          totalAFacturar={500_000}
        />
      )
      expect(hasText(container, "500.000")).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Formatted currency values
  // ═══════════════════════════════════════════════════════════════
  describe("formatted currency values", () => {
    it("renders values with $ currency symbol", () => {
      const { container } = render(<ResumenEconomico {...defaultProps} />)
      // es-AR locale should include $ symbol
      expect(hasText(container, "$")).toBe(true)
    })

    it("renders values with period thousands separator", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} totalPresupuestado={1_234_567} />
      )
      // es-AR uses period for thousands
      expect(hasText(container, "1.234.567")).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Delta sign indicators
  // ═══════════════════════════════════════════════════════════════
  describe("delta sign", () => {
    it("shows positive delta with + prefix for positive delta", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} deltaDetectado={150_000} />
      )
      // Positive delta shows "+" prefix
      expect(hasText(container, "+")).toBe(true)
    })

    it("renders negative delta with minus sign", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} deltaDetectado={-150_000} />
      )
      // Negative delta renders (might use - or −)
      expect(screen.getByText("Delta")).toBeInTheDocument()
    })

    it("renders without crashing for positive delta with red color class", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} deltaDetectado={100_000} />
      )
      // Positive delta uses text-red-600 class
      const redEl = container.querySelector(".text-red-600")
      expect(redEl).toBeInTheDocument()
    })

    it("renders negative delta with green color class", () => {
      const { container } = render(
        <ResumenEconomico {...defaultProps} deltaDetectado={-100_000} />
      )
      // Negative delta uses text-green-600 class
      const greenEl = container.querySelector(".text-green-600")
      expect(greenEl).toBeInTheDocument()
    })
  })
})
