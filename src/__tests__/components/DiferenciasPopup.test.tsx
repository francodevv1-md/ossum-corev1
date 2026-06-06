import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { DiferenciasPopup } from "@/components/facturacion/DiferenciasPopup"
import type { DiferenciaFactura } from "@/types"

// ─── Factory helpers ─────────────────────────────────────────────────────────
function makeDiferencia(overrides: Partial<DiferenciaFactura> = {}): DiferenciaFactura {
  return {
    stockItemId: "STK-001",
    name: "Tornillo cannulated",
    code: "TOR-CAN-001",
    cantPresupuestada: 5,
    cantConsumida: 7,
    precioUnitario: 50_000,
    diferencia: 2,
    impactoMonetario: 100_000,
    tipo: "cantidad",
    ...overrides,
  }
}

// ─── Shared default props ────────────────────────────────────────────────────
const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  diferencias: [] as DiferenciaFactura[],
  totalPresupuestado: 1_000_000,
  totalConsumidoValorizado: 1_200_000,
  deltaDetectado: 200_000,
  onAccion: vi.fn(),
}

/**
 * Helper: check if the document body contains a given text substring.
 * Needed because Radix Dialog renders content in a portal outside the
 * render container.
 */
function bodyHasText(text: string): boolean {
  return document.body.textContent?.includes(text) ?? false
}

describe("DiferenciasPopup", () => {
  // ═══════════════════════════════════════════════════════════════
  // Renders when open=true
  // ═══════════════════════════════════════════════════════════════
  describe("renders when open=true", () => {
    it("renders the dialog title when open=true", () => {
      render(<DiferenciasPopup {...defaultProps} open />)
      expect(screen.getByText("Diferencias detectadas")).toBeInTheDocument()
    })

    it("renders the dialog description", () => {
      render(<DiferenciasPopup {...defaultProps} open />)
      expect(
        screen.getByText(/Se detectaron diferencias entre lo presupuestado y lo consumido/)
      ).toBeInTheDocument()
    })

    it("renders total presupuestado in the summary section", () => {
      render(<DiferenciasPopup {...defaultProps} open totalPresupuestado={1_000_000} />)
      // Radix Dialog renders in a portal, so check document.body
      expect(bodyHasText("1.000.000")).toBe(true)
    })

    it("renders total consumido valorizado in the summary section", () => {
      render(<DiferenciasPopup {...defaultProps} open totalConsumidoValorizado={1_200_000} />)
      expect(bodyHasText("1.200.000")).toBe(true)
    })

    it("renders delta in the summary section", () => {
      render(<DiferenciasPopup {...defaultProps} open deltaDetectado={200_000} />)
      expect(screen.getByText("Delta:")).toBeInTheDocument()
    })

    it("renders all summary labels", () => {
      render(<DiferenciasPopup {...defaultProps} open />)
      expect(screen.getByText("Total presupuestado:")).toBeInTheDocument()
      expect(screen.getByText("Total consumido valorizado:")).toBeInTheDocument()
      expect(screen.getByText("Delta:")).toBeInTheDocument()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Does not render when open=false
  // ═══════════════════════════════════════════════════════════════
  describe("does not render when open=false", () => {
    it("does not show the dialog content when open=false", () => {
      render(<DiferenciasPopup {...defaultProps} open={false} />)
      expect(screen.queryByText("Diferencias detectadas")).not.toBeInTheDocument()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Shows difference items when provided
  // ═══════════════════════════════════════════════════════════════
  describe("shows difference items when provided", () => {
    it("renders difference item name in the table", () => {
      const diferencias = [
        makeDiferencia({ name: "Tornillo especial", tipo: "cantidad" }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("Tornillo especial")).toBeInTheDocument()
    })

    it("renders the tipo badge for each difference", () => {
      const diferencias = [
        makeDiferencia({ tipo: "cantidad" }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("Cant.")).toBeInTheDocument()
    })

    it("renders multiple difference items", () => {
      const diferencias = [
        makeDiferencia({ name: "Tornillo A", tipo: "cantidad", stockItemId: "STK-001" }),
        makeDiferencia({ name: "Placa B", tipo: "no_consumido", stockItemId: "STK-002" }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("Tornillo A")).toBeInTheDocument()
      expect(screen.getByText("Placa B")).toBeInTheDocument()
    })

    it("renders 'no_consumido' type badge", () => {
      const diferencias = [
        makeDiferencia({ tipo: "no_consumido" }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("No consumido")).toBeInTheDocument()
    })

    it("renders 'no_presupuestado' type badge", () => {
      const diferencias = [
        makeDiferencia({ tipo: "no_presupuestado" }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("No presup.")).toBeInTheDocument()
    })

    it("renders 'articulo_z' type badge", () => {
      const diferencias = [
        makeDiferencia({ tipo: "articulo_z" }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("Art. Z")).toBeInTheDocument()
    })

    it("renders the specific list for no_consumido items", () => {
      const diferencias = [
        makeDiferencia({ name: "Tornillo X", tipo: "no_consumido", impactoMonetario: -50_000 }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("Ítems presupuestados no consumidos:")).toBeInTheDocument()
      // Name appears in both table and list, use getAllByText
      const matches = screen.getAllByText(/Tornillo X/)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it("renders the specific list for no_presupuestado items", () => {
      const diferencias = [
        makeDiferencia({ name: "Implante Y", tipo: "no_presupuestado", impactoMonetario: 75_000 }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("Ítems consumidos no presupuestados:")).toBeInTheDocument()
      const matches = screen.getAllByText(/Implante Y/)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it("renders the specific list for articulo_z items", () => {
      const diferencias = [
        makeDiferencia({ name: "Z-Item W", tipo: "articulo_z", impactoMonetario: 30_000 }),
      ]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("Artículos Z involucrados:")).toBeInTheDocument()
      const matches = screen.getAllByText(/Z-Item W/)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it("renders table headers when differences exist", () => {
      const diferencias = [makeDiferencia()]
      render(<DiferenciasPopup {...defaultProps} diferencias={diferencias} />)
      expect(screen.getByText("Ítem")).toBeInTheDocument()
      expect(screen.getByText("Tipo")).toBeInTheDocument()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Shows empty state when no differences
  // ═══════════════════════════════════════════════════════════════
  describe("shows empty state when no differences", () => {
    it("does not render the differences table when diferencias is empty", () => {
      render(<DiferenciasPopup {...defaultProps} diferencias={[]} />)
      expect(screen.queryByText("Ítem")).not.toBeInTheDocument()
    })

    it("does not render no_consumido list when empty", () => {
      render(<DiferenciasPopup {...defaultProps} diferencias={[]} />)
      expect(screen.queryByText("Ítems presupuestados no consumidos:")).not.toBeInTheDocument()
    })

    it("does not render no_presupuestado list when empty", () => {
      render(<DiferenciasPopup {...defaultProps} diferencias={[]} />)
      expect(screen.queryByText("Ítems consumidos no presupuestados:")).not.toBeInTheDocument()
    })

    it("does not render articulo_z list when empty", () => {
      render(<DiferenciasPopup {...defaultProps} diferencias={[]} />)
      expect(screen.queryByText("Artículos Z involucrados:")).not.toBeInTheDocument()
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Calls onAccion when action buttons are triggered
  // ═══════════════════════════════════════════════════════════════
  describe("action buttons", () => {
    it("calls onAccion with tipo 'presupuesto' when Presupuesto button is clicked", () => {
      const onAccion = vi.fn()
      render(<DiferenciasPopup {...defaultProps} onAccion={onAccion} />)
      const btn = screen.getByRole("button", { name: /Presupuesto/ })
      fireEvent.click(btn)
      expect(onAccion).toHaveBeenCalledWith({ tipo: "presupuesto" })
    })

    it("calls onAccion with tipo 'consumo' when Consumo button is clicked", () => {
      const onAccion = vi.fn()
      render(<DiferenciasPopup {...defaultProps} onAccion={onAccion} />)
      const btn = screen.getByRole("button", { name: /Consumo/ })
      fireEvent.click(btn)
      expect(onAccion).toHaveBeenCalledWith({ tipo: "consumo" })
    })

    it("calls onAccion with tipo 'mixto' when Importar diff button is clicked", () => {
      const onAccion = vi.fn()
      render(
        <DiferenciasPopup
          {...defaultProps}
          deltaDetectado={200_000}
          onAccion={onAccion}
        />
      )
      const btn = screen.getByRole("button", { name: "Importar diff" })
      fireEvent.click(btn)
      expect(onAccion).toHaveBeenCalledWith({
        tipo: "mixto",
        diferenciasAceptadas: 200_000,
      })
    })

    it("calls onAccion with tipo 'cancelar' when Cancelar button is clicked", () => {
      const onAccion = vi.fn()
      render(<DiferenciasPopup {...defaultProps} onAccion={onAccion} />)
      const btn = screen.getByRole("button", { name: "Cancelar" })
      fireEvent.click(btn)
      expect(onAccion).toHaveBeenCalledWith({ tipo: "cancelar" })
    })

    it("calls onAccion with tipo 'observado' when Dejar observado is clicked", () => {
      const onAccion = vi.fn()
      render(<DiferenciasPopup {...defaultProps} onAccion={onAccion} />)
      const btn = screen.getByRole("button", { name: "Dejar observado" })
      fireEvent.click(btn)
      expect(onAccion).toHaveBeenCalledWith({
        tipo: "observado",
        observacion: "",
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Observacion textarea
  // ═══════════════════════════════════════════════════════════════
  describe("observacion textarea", () => {
    it("renders the observation textarea", () => {
      render(<DiferenciasPopup {...defaultProps} />)
      const textarea = screen.getByPlaceholderText(/Observación/)
      expect(textarea).toBeInTheDocument()
    })

    it("allows typing in the observation textarea", () => {
      render(<DiferenciasPopup {...defaultProps} />)
      const textarea = screen.getByPlaceholderText(/Observación/)
      fireEvent.change(textarea, { target: { value: "Test observation" } })
      expect(textarea).toHaveValue("Test observation")
    })

    it("passes observation text when Dejar observado is clicked after typing", () => {
      const onAccion = vi.fn()
      render(<DiferenciasPopup {...defaultProps} onAccion={onAccion} />)
      const textarea = screen.getByPlaceholderText(/Observación/)
      fireEvent.change(textarea, { target: { value: "Faltan documentos" } })
      const btn = screen.getByRole("button", { name: "Dejar observado" })
      fireEvent.click(btn)
      expect(onAccion).toHaveBeenCalledWith({
        tipo: "observado",
        observacion: "Faltan documentos",
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Calls onClose when close action triggered
  // ═══════════════════════════════════════════════════════════════
  describe("close handling", () => {
    it("calls onAccion when cancelar action is clicked", () => {
      const onAccion = vi.fn()
      render(<DiferenciasPopup {...defaultProps} onAccion={onAccion} />)
      const btn = screen.getByRole("button", { name: "Cancelar" })
      fireEvent.click(btn)
      expect(onAccion).toHaveBeenCalledWith({ tipo: "cancelar" })
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Renders without crashing (smoke test)
  // ═══════════════════════════════════════════════════════════════
  describe("smoke test", () => {
    it("renders without crashing with minimal props", () => {
      const { container } = render(
        <DiferenciasPopup
          open={true}
          onOpenChange={() => {}}
          diferencias={[]}
          totalPresupuestado={0}
          totalConsumidoValorizado={0}
          deltaDetectado={0}
          onAccion={() => {}}
        />
      )
      expect(container).toBeTruthy()
    })

    it("renders without crashing with many differences", () => {
      const manyDiferencias = Array.from({ length: 20 }, (_, i) =>
        makeDiferencia({
          stockItemId: `STK-${i}`,
          name: `Item ${i}`,
          tipo: i % 2 === 0 ? "cantidad" : "no_consumido",
        })
      )
      const { container } = render(
        <DiferenciasPopup
          {...defaultProps}
          diferencias={manyDiferencias}
        />
      )
      expect(container).toBeTruthy()
    })
  })
})
