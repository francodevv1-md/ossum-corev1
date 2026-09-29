import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  searchArticlesApi: vi.fn(),
}))

vi.mock("@/lib/api/articles", () => ({
  searchArticlesApi: mocks.searchArticlesApi,
}))

import { InvoiceItemsTable } from "@/components/facturacion/InvoiceItemsTable"
import type { InvoiceFormItem } from "@/hooks/useInvoiceForm"

describe("InvoiceItemsTable", () => {
  const defaultItems: InvoiceFormItem[] = [
    {
      code: "SKU-001",
      description: "Tornillo de titanio 3.5mm",
      lote: "LOT-2026-A",
      quantity: 4,
      unitPrice: 250,
      discountPercent: 0,
      ivaKey: "21",
      catalogItemId: "art-1",
      isArticuloLibre: false,
      note: "Estéril",
      codeResolved: true,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchArticlesApi.mockResolvedValue([
      {
        id: "art-2",
        sku: "PLA-002",
        description: "Placa bloqueada 4.5mm",
        unit: "u",
        unitPrice: 1500,
        ivaKey: "21",
      },
    ])
  })

  it("renders dense grid headers and rows with formatted values", () => {
    const addItem = vi.fn()
    const removeItem = vi.fn()
    const updateItem = vi.fn()

    render(
      <InvoiceItemsTable
        companyId="company-1"
        items={defaultItems}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        errors={{}}
      />
    )

    expect(screen.getByText("Código")).toBeInTheDocument()
    expect(screen.getByText("Descripción")).toBeInTheDocument()
    expect(screen.getByText("Lote")).toBeInTheDocument()
    expect(screen.getByText("Total línea")).toBeInTheDocument()
    expect(screen.getByDisplayValue("SKU-001")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Tornillo de titanio 3.5mm")).toBeInTheDocument()
    expect(screen.getByDisplayValue("LOT-2026-A")).toBeInTheDocument()
    expect(screen.getByDisplayValue("4")).toBeInTheDocument()
    expect(screen.getByDisplayValue("250")).toBeInTheDocument()
  })

  it("calls addItem when clicking add button or pressing Tab on the last row", async () => {
    const addItem = vi.fn()
    const removeItem = vi.fn()
    const updateItem = vi.fn()

    render(
      <InvoiceItemsTable
        companyId="company-1"
        items={defaultItems}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        errors={{}}
      />
    )

    fireEvent.click(screen.getByText(/Agregar fila/i))
    expect(addItem).toHaveBeenCalled()
  })

  it("highlights cell errors when validation errors are present", () => {
    const addItem = vi.fn()
    const removeItem = vi.fn()
    const updateItem = vi.fn()

    const itemsWithError: InvoiceFormItem[] = [
      {
        code: "",
        description: "",
        lote: "",
        quantity: 0,
        unitPrice: -5,
        discountPercent: 0,
        ivaKey: "21",
        catalogItemId: "",
        isArticuloLibre: true,
        note: "",
        codeResolved: false,
      },
    ]

    render(
      <InvoiceItemsTable
        companyId="company-1"
        items={itemsWithError}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        errors={{
          items: "Revise los errores",
          "items[0].description": "Descripción requerida",
          "items[0].quantity": "Cantidad inválida",
          "items[0].unitPrice": "Precio inválido",
        }}
      />
    )

    expect(screen.getByText("Revise los errores")).toBeInTheDocument()
  })

  it("handles keyboard Tab navigation across column inputs and triggers add on last cell", () => {
    const addItem = vi.fn()
    const removeItem = vi.fn()
    const updateItem = vi.fn()

    render(
      <InvoiceItemsTable
        companyId="company-1"
        items={defaultItems}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        errors={{}}
      />
    )

    const codeInput = screen.getByDisplayValue("SKU-001")
    fireEvent.keyDown(codeInput, { key: "Tab", code: "Tab" })

    const noteInput = screen.getByDisplayValue("Estéril")
    fireEvent.keyDown(noteInput, { key: "Tab", code: "Tab" })
    expect(addItem).toHaveBeenCalled()
  })
})
