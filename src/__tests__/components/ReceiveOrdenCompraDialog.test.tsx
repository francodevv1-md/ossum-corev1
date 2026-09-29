import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ReceiveOrdenCompraDialog } from "@/components/compras/ReceiveOrdenCompraDialog"
import type { OrdenCompraApiRow } from "@/lib/api/ordenes-compra"

const ordenCompra: OrdenCompraApiRow = {
  id: "oc-1", proveedorId: "supplier-1", proveedorName: "Proveedor", total: "20", state: "Enviada", stateLabel: "Enviada",
  emitidaAt: null, enviadaAt: null, recibidaAt: null, canceladaAt: null, observaciones: null, necesidadCompraIds: [], createdAt: "2026-09-29T00:00:00.000Z",
  items: [{ id: "line-1", stockItemId: "article-1", name: "Artículo", code: "ART-1", quantity: "5", unitPrice: "4", subtotal: "20", received: "2", isArticuloZ: false, descripcionLibre: null }],
}

describe("ReceiveOrdenCompraDialog", () => {
  it("submits per-item quantities constrained to the remaining balance", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ReceiveOrdenCompraDialog open onOpenChange={vi.fn()} ordenCompra={ordenCompra} onSubmit={onSubmit} />)

    const input = screen.getByLabelText("Recibir Artículo")
    expect(input).toHaveAttribute("max", "3")
    fireEvent.change(input, { target: { value: "4" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))
    expect(screen.getByText(/sin superar el saldo pendiente/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ receivedByItem: [{ itemId: "line-1", received: "3" }] }))
  })
})
