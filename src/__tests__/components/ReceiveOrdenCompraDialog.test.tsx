import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReceiveOrdenCompraDialog } from "@/components/compras/ReceiveOrdenCompraDialog"
import type { OrdenCompraApiRow } from "@/lib/api/ordenes-compra"
import { ApiClientError } from "@/lib/api/client"

const tracePolicies = { "line-1": "NONE" } as const

const ordenCompra: OrdenCompraApiRow = {
  id: "oc-1", proveedorId: "supplier-1", proveedorName: "Proveedor", total: "20", state: "Enviada", stateLabel: "Enviada",
  emitidaAt: null, enviadaAt: null, recibidaAt: null, canceladaAt: null, observaciones: null, necesidadCompraIds: [], createdAt: "2026-09-29T00:00:00.000Z",
  items: [{ id: "line-1", stockItemId: "article-1", name: "Artículo", code: "ART-1", quantity: "5", unitPrice: "4", subtotal: "20", received: "2", isArticuloZ: false, descripcionLibre: null }],
}

describe("ReceiveOrdenCompraDialog (mocked submit; no browser/network)", () => {
  afterEach(cleanup)
  it("submits per-item quantities constrained to the remaining balance", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ReceiveOrdenCompraDialog open tracePolicies={tracePolicies} onOpenChange={vi.fn()} ordenCompra={ordenCompra} onSubmit={onSubmit} />)

    const input = screen.getByLabelText("Recibir Artículo")
    expect(input).toHaveAttribute("max", "3")
    fireEvent.change(input, { target: { value: "4" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))
    expect(screen.getByText(/sin superar el saldo pendiente/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: "3" } })
    fireEvent.change(screen.getByLabelText("Destino del stock"), { target: { value: "QA destination" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ location: "QA destination", operationKey: expect.any(String), receivedByItem: [{ itemId: "line-1", received: "3" }] }))
  })
  it.each(["uncertain_result", "refresh_failed"])("reuses exact intent/key and blocks edits/dismissal after %s", async code => {
    const onSubmit = vi.fn().mockRejectedValueOnce(Object.assign(new Error(code), { code })).mockResolvedValueOnce(undefined)
    const onOpenChange = vi.fn()
    const view = render(<ReceiveOrdenCompraDialog open tracePolicies={tracePolicies} onOpenChange={onOpenChange} ordenCompra={ordenCompra} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText("Recibir Artículo"), { target: { value: "3" } })
    fireEvent.change(screen.getByLabelText("Destino del stock"), { target: { value: "QA destination" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))
    await screen.findByRole("button", { name: "Reconciliar recepción" })
    expect(screen.getByLabelText("Recibir Artículo")).toBeDisabled()
    expect(screen.getByLabelText("Destino del stock")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(onOpenChange).not.toHaveBeenCalled()
    view.rerender(<ReceiveOrdenCompraDialog open tracePolicies={tracePolicies} onOpenChange={onOpenChange} ordenCompra={{ ...ordenCompra, state: "Recibida", items: [{ ...ordenCompra.items[0], received: "5" }] }} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole("button", { name: "Reconciliar recepción" }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onSubmit.mock.calls[1][0]).toEqual(onSubmit.mock.calls[0][0])
    expect(onSubmit.mock.calls[0][0].operationKey).not.toBe("")
  })
  it("requires an explicit destination", () => {
    const onSubmit = vi.fn()
    render(<ReceiveOrdenCompraDialog open tracePolicies={tracePolicies} onOpenChange={vi.fn()} ordenCompra={ordenCompra} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText("Recibir Artículo"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))
    expect(screen.getByText(/destino explícito/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
  it("keeps uncertain intent frozen when a later retry is denied", async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error("uncertain_result")).mockRejectedValueOnce(new ApiClientError("Expired access", 401)).mockResolvedValueOnce(undefined)
    render(<ReceiveOrdenCompraDialog open tracePolicies={tracePolicies} onOpenChange={vi.fn()} ordenCompra={ordenCompra} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText("Recibir Artículo"), { target: { value: "1" } })
    fireEvent.change(screen.getByLabelText("Destino del stock"), { target: { value: "QA destination" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))
    fireEvent.click(await screen.findByRole("button", { name: "Reconciliar recepción" }))
    await screen.findByText("Expired access")
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Reconciliar recepción" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(3))
    expect(onSubmit.mock.calls.map(call => call[0])).toEqual([onSubmit.mock.calls[0][0], onSubmit.mock.calls[0][0], onSubmit.mock.calls[0][0]])
  })
})
