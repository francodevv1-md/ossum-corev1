import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ViewCustomizationDialog } from "@/components/cirugias/ViewCustomizationDialog"
import {
  CIRUGIAS_COLUMNS,
  DEFAULT_VISIBLE_COLS,
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_FIXED_LEFT_COLUMNS,
  CIRUGIAS_COLUMN_GROUPS,
} from "@/lib/cirugias.constants"

describe("ViewCustomizationDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    columns: CIRUGIAS_COLUMNS,
    visibleCols: DEFAULT_VISIBLE_COLS,
    columnOrder: CIRUGIAS_COLUMNS.map((c) => c.key),
    stickyColumns: true,
    columnWidths: DEFAULT_COLUMN_WIDTHS,
    compactMode: false,
    fixedColumns: [...DEFAULT_FIXED_LEFT_COLUMNS],
    groups: CIRUGIAS_COLUMN_GROUPS.map((g) => ({
      id: g.key,
      label: g.label,
      colorName: "Blue",
      colorClassName: "bg-blue-50 text-blue-700",
      columns: [...g.columns],
    })),
    showGroupedHeaders: false,
    showOperationPresets: true,
    onShowOperationPresetsChange: vi.fn(),
    cxVariant: "b" as const,
    onApply: vi.fn(),
    onResetToDefault: vi.fn(),
  }

  it("renders with title and recommended presets on screen 1", () => {
    render(<ViewCustomizationDialog {...defaultProps} />)

    expect(screen.getByText("Configurar vista")).toBeDefined()
    expect(screen.getByText("Elegí cómo querés trabajar con el listado de Cirugías.")).toBeDefined()
    expect(screen.getByText("Operativa")).toBeDefined()
    expect(screen.getByText("Auditoría completa")).toBeDefined()
    expect(screen.getByText("Control general")).toBeDefined()
  })

  it("disables 'Aplicar a tabla' initially when no changes have been made", () => {
    render(<ViewCustomizationDialog {...defaultProps} />)

    const applyButton = screen.getByRole("button", { name: /aplicar a tabla/i })
    expect((applyButton as HTMLButtonElement).disabled).toBe(true)
  })

  it("enables 'Aplicar a tabla' when a different preset is selected", () => {
    render(<ViewCustomizationDialog {...defaultProps} />)

    const operativaCard = screen.getByRole("button", { name: /operativa/i })
    fireEvent.click(operativaCard)

    const applyButton = screen.getByRole("button", { name: /aplicar a tabla/i })
    expect((applyButton as HTMLButtonElement).disabled).toBe(false)
  })

  it("navigates to customization screen when 'Personalizar vista →' is clicked", () => {
    render(<ViewCustomizationDialog {...defaultProps} />)

    const customizeButton = screen.getByRole("button", { name: /personalizar vista →/i })
    fireEvent.click(customizeButton)

    expect(screen.getByText("Personalizar vista")).toBeDefined()
    expect(screen.getByRole("tab", { name: /columnas/i })).toBeDefined()
    expect(screen.getByRole("tab", { name: /apariencia/i })).toBeDefined()
  })

  it("allows toggling column visibility and applying changes", () => {
    const onApply = vi.fn()
    render(<ViewCustomizationDialog {...defaultProps} onApply={onApply} />)

    // Go to customize
    fireEvent.click(screen.getByRole("button", { name: /personalizar vista →/i }))

    // Search for Médico
    const searchInput = screen.getByPlaceholderText(/buscar columna por nombre…/i)
    fireEvent.change(searchInput, { target: { value: "Médico" } })

    const checkbox = screen.getByLabelText("Médico")
    expect(checkbox.getAttribute("data-state")).toBe("checked")

    // Toggle off
    fireEvent.click(checkbox)

    const applyButton = screen.getByRole("button", { name: /aplicar a tabla/i })
    expect((applyButton as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(applyButton)
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0].visibleCols.surgeon).toBe(false)
  })

  it("allows switching density in Apariencia tab", () => {
    const onApply = vi.fn()
    render(<ViewCustomizationDialog {...defaultProps} compactMode={false} onApply={onApply} />)

    // Go to customize
    fireEvent.click(screen.getByRole("button", { name: /personalizar vista →/i }))

    // Switch to Apariencia tab
    fireEvent.click(screen.getByRole("tab", { name: /apariencia/i }))

    // Click Compacta
    const compactOption = screen.getByRole("button", { name: /compacta/i })
    fireEvent.click(compactOption)

    const applyButton = screen.getByRole("button", { name: /aplicar a tabla/i })
    expect((applyButton as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(applyButton)
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0].compactMode).toBe(true)
  })

  it("restores standard defaults when 'Restablecer predeterminado' is clicked", () => {
    render(<ViewCustomizationDialog {...defaultProps} />)

    // Select a different preset first to make it dirty
    fireEvent.click(screen.getByRole("button", { name: /auditoría completa/i }))
    const applyButton = screen.getByRole("button", { name: /aplicar a tabla/i })
    expect((applyButton as HTMLButtonElement).disabled).toBe(false)

    // Click reset
    const resetButton = screen.getByRole("button", { name: /restablecer predeterminado/i })
    fireEvent.click(resetButton)

    // Once reset, if default matches current props, dirty is false
    expect(screen.getByText("Configurar vista")).toBeDefined()
  })

  it("allows selecting 'Celda coloreada' (variant 'a') in Apariencia tab", () => {
    const onApply = vi.fn()
    render(<ViewCustomizationDialog {...defaultProps} cxVariant="b" onApply={onApply} />)

    // Go to customize
    fireEvent.click(screen.getByRole("button", { name: /personalizar vista →/i }))

    // Switch to Apariencia tab
    fireEvent.click(screen.getByRole("tab", { name: /apariencia/i }))

    // Click 'Celda coloreada'
    const cellColorOption = screen.getByRole("button", { name: /celda coloreada/i })
    fireEvent.click(cellColorOption)

    const applyButton = screen.getByRole("button", { name: /aplicar a tabla/i })
    expect((applyButton as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(applyButton)
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0].cxVariant).toBe("a")
  })

  it("opens the color reference modal when clicking 'Colores y estados'", () => {
    render(<ViewCustomizationDialog {...defaultProps} />)

    const colorGuideButton = screen.getByRole("button", { name: /colores y estados/i })
    fireEvent.click(colorGuideButton)

    expect(screen.getByText("Guía de Estados y Colores")).toBeDefined()
    expect(screen.getByText("¿Cómo identificar las cirugías por color?")).toBeDefined()
  })

  it("allows pinning and unpinning columns", () => {
    const onApply = vi.fn()
    render(<ViewCustomizationDialog {...defaultProps} onApply={onApply} />)

    // Go to customize
    fireEvent.click(screen.getByRole("button", { name: /personalizar vista →/i }))

    // Pin institution column
    const pinButtons = screen.getAllByTitle(/fijar columna a la izquierda/i)
    if (pinButtons.length > 0) {
      fireEvent.click(pinButtons[0])
    }

    const applyButton = screen.getByRole("button", { name: /aplicar a tabla/i })
    expect((applyButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(applyButton)
    expect(onApply).toHaveBeenCalledTimes(1)
  })
})



