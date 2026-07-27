import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ComparativaOperativaV0 } from "@/components/comparativa/ComparativaOperativaV0"
import type { TraceItemRow, TraceSummary } from "@/lib/api/trazabilidad"

const summary: TraceSummary = {
  remitosCount: 2,
  consumosCount: 2,
  devolucionesCount: 1,
  eventsCount: 8,
  itemRowsCount: 2,
  totalSentQuantity: 11,
  totalConsumedQuantity: 8,
  totalReturnedQuantity: 3,
  rowsWithDifference: 1,
  rowsWithUnknownLotOrSerial: 0,
  hasStockMovements: false,
}

function traceRow(overrides: Partial<TraceItemRow> = {}): TraceItemRow {
  return {
    id: "remito-item-1",
    remitoId: "remito-1",
    remitoItemId: "remito-item-1",
    consumoIds: ["consumo-1"],
    consumoItemIds: ["consumo-item-1"],
    devolucionIds: [],
    devolucionItemIds: [],
    itemId: "item-1",
    sku: "SKU-SHARED",
    description: "Tornillo",
    unit: "u",
    lot: "LOT-1",
    serial: null,
    expiry: null,
    brand: null,
    department: null,
    sentQuantity: 7,
    consumedQuantity: 5,
    returnedQuantity: 1,
    pendingQuantity: 1,
    matchConfidence: "direct",
    status: "pending",
    sourceFlags: {
      hasRemito: true,
      hasConsumo: true,
      hasDevolucion: false,
      hasStockMovement: false,
    },
    warnings: [],
    ...overrides,
  }
}

describe("ComparativaOperativaV0", () => {
  it("keeps equal SKUs from different remitos as separate semantic rows with verbatim measures", () => {
    render(
      <ComparativaOperativaV0
        rows={[
          traceRow(),
          traceRow({
            id: "remito-item-2",
            remitoId: "remito-2",
            remitoItemId: "remito-item-2",
            sentQuantity: 4,
            consumedQuantity: 3,
            returnedQuantity: 1,
            pendingQuantity: 0,
            status: "ok",
          }),
        ]}
        summary={summary}
        loading={false}
        error={null}
        remitoLabels={{ "remito-1": "R-0001" }}
      />
    )

    expect(screen.getByText("Comparativa operativa preliminar")).toBeInTheDocument()
    expect(screen.getByText(/solo lectura/i)).toBeInTheDocument()
    expect(screen.queryByText(/stock|facturación|valores comerciales|conciliación/i)).not.toBeInTheDocument()
    expect(screen.getAllByText("SKU-SHARED")).toHaveLength(2)

    const firstRow = screen.getByText(/remito-item-1/).closest("tr")
    const secondRow = screen.getByText(/remito-item-2/).closest("tr")
    expect(firstRow).not.toBeNull()
    expect(secondRow).not.toBeNull()
    expect(within(firstRow!).getByText("R-0001")).toBeInTheDocument()
    expect(within(firstRow!).getByText("7")).toBeInTheDocument()
    expect(within(firstRow!).getByText("5")).toBeInTheDocument()
    expect(within(firstRow!).getAllByText("1")).toHaveLength(2)
    expect(within(secondRow!).getByText("remito-2")).toBeInTheDocument()

    expect(screen.getByRole("columnheader", { name: "Remitido" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Consumido" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Devuelto" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Pendiente" })).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("keeps difference, unmatched, and warning rows visible with textual attention", () => {
    render(
      <ComparativaOperativaV0
        rows={[
          traceRow({
            id: "difference-row",
            sentQuantity: 2,
            consumedQuantity: 3,
            returnedQuantity: 1,
            pendingQuantity: 0,
            status: "difference",
          }),
          traceRow({
            id: "unmatched-row",
            remitoId: undefined,
            remitoItemId: undefined,
            description: "Pinza sin asociación",
            matchConfidence: "unmatched",
            status: "unknown",
            warnings: ["RETURNED_QUANTITY_SOURCE_CONFLICT"],
          }),
        ]}
        summary={summary}
        loading={false}
        error={null}
      />
    )

    expect(screen.getByText(/estado trace: diferencia/i)).toBeInTheDocument()
    expect(within(screen.getByText(/estado trace: diferencia/i).closest("tr")!).getByText("0")).toBeInTheDocument()
    expect(screen.getByText("Pinza sin asociación")).toBeInTheDocument()
    expect(screen.getAllByText(/sin asociación de remito/i)).toHaveLength(2)
    expect(screen.getByText(/conflicto entre fuentes de devolución/i)).toBeInTheDocument()
  })

  it.each([
    { loading: true, error: null, message: /cargando comparativa operativa/i },
    { loading: false, error: "Trace no disponible", message: /trace no disponible/i },
  ])("suppresses stale rows for loading and error states", ({ loading, error, message }) => {
    render(
      <ComparativaOperativaV0
        rows={[traceRow()]}
        summary={summary}
        loading={loading}
        error={error}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent(message)
    expect(screen.queryByText("Tornillo")).not.toBeInTheDocument()
  })

  it("shows an explicit accessible empty state", () => {
    render(<ComparativaOperativaV0 rows={[]} summary={summary} loading={false} error={null} />)

    expect(screen.getByRole("status")).toHaveTextContent(/no hay filas operativas/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
