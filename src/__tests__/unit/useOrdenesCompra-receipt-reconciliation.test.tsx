import { useState } from "react"
import { cleanup, fireEvent, render, renderHook, screen, waitFor, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useOrdenesCompra } from "@/hooks/useOrdenesCompra"
import { ReceiveOrdenCompraDialog } from "@/components/compras/ReceiveOrdenCompraDialog"
import { ApiClientError } from "@/lib/api/client"
import * as api from "@/lib/api/ordenes-compra"

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company" } }) }))
vi.mock("@/lib/api/ordenes-compra", () => ({ fetchOrdenesCompra: vi.fn(), recibirOrdenCompra: vi.fn(), createOrdenCompra: vi.fn(), emitirOrdenCompra: vi.fn(), enviarOrdenCompra: vi.fn() }))

const initial: api.OrdenCompraApiRow = {
  id: "oc", proveedorId: "supplier", proveedorName: "Supplier", total: "4", state: "Enviada", stateLabel: "Enviada",
  emitidaAt: null, enviadaAt: null, recibidaAt: null, canceladaAt: null, observaciones: null, necesidadCompraIds: [], createdAt: "2026-10-03T00:00:00.000Z",
  items: [{ id: "item", stockItemId: "article", name: "Article", code: "SKU", quantity: "4", received: "0", unitPrice: "1", subtotal: "4", isArticuloZ: false, descripcionLibre: null }],
}
const accepted: api.OrdenCompraApiRow = { ...initial, state: "Parcialmente_recibida", items: [{ ...initial.items[0], received: "1" }] }

function Receiving() {
  const { ordenes, recibir } = useOrdenesCompra()
  const [open, setOpen] = useState(true)
  return <ReceiveOrdenCompraDialog open={open} onOpenChange={setOpen} ordenCompra={ordenes[0] ?? null} tracePolicies={{ item: "NONE" }} onSubmit={async payload => { await recibir("oc", payload) }} />
}

async function submit() {
  fireEvent.change(await screen.findByLabelText("Recibir Article"), { target: { value: "1" } })
  fireEvent.change(screen.getByLabelText("Destino del stock"), { target: { value: " QA destination " } })
  fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))
}

describe("actual OC hook + dialog reconciliation (mocked API, no network)", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.fetchOrdenesCompra).mockResolvedValue([initial]); vi.mocked(api.recibirOrdenCompra).mockResolvedValue(accepted) })
  afterEach(cleanup)

  it.each([new Error("GET 500"), new ApiClientError("GET forbidden", 403)])("freezes accepted intent after failed GET: %s", async failure => {
    vi.mocked(api.fetchOrdenesCompra).mockResolvedValueOnce([initial]).mockRejectedValueOnce(failure).mockResolvedValueOnce([accepted])
    render(<Receiving />)
    await submit()
    await screen.findByRole("button", { name: "Reconciliar recepción" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByLabelText("Recibir Article")).toBeDisabled()
    expect(screen.getByLabelText("Destino del stock")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    const intent = vi.mocked(api.recibirOrdenCompra).mock.calls[0][2]
    expect(intent).toEqual({ operationKey: expect.any(String), location: "QA destination", receivedByItem: [{ itemId: "item", received: "1" }] })
    expect(intent.operationKey).not.toBe("")
    fireEvent.click(screen.getByRole("button", { name: "Reconciliar recepción" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(api.recibirOrdenCompra).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.recibirOrdenCompra).mock.calls[1]).toEqual(["company", "oc", intent])
    expect(vi.mocked(api.recibirOrdenCompra).mock.calls[1][2]).toBe(intent)
    expect(api.fetchOrdenesCompra).toHaveBeenCalledTimes(3)
  })

  it("preserves direct POST 4xx rejection and permits a corrected new intent", async () => {
    const rejected = new ApiClientError("POST rejected", 400)
    vi.mocked(api.recibirOrdenCompra).mockRejectedValueOnce(rejected)
    render(<Receiving />)
    await submit()
    await screen.findByText("POST rejected")
    expect(screen.getByLabelText("Recibir Article")).not.toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancelar" })).not.toBeDisabled()
    expect(api.fetchOrdenesCompra).toHaveBeenCalledTimes(1)
    const first = vi.mocked(api.recibirOrdenCompra).mock.calls[0][2]
    fireEvent.change(screen.getByLabelText("Recibir Article"), { target: { value: "2" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    const second = vi.mocked(api.recibirOrdenCompra).mock.calls[1][2]
    expect(second.operationKey).not.toBe(first.operationKey)
    expect(second.receivedByItem).toEqual([{ itemId: "item", received: "2" }])
  })

  it("returns the original POST ApiClientError without wrapping it", async () => {
    const rejected = new ApiClientError("POST forbidden", 403)
    vi.mocked(api.recibirOrdenCompra).mockRejectedValueOnce(rejected)
    const { result } = renderHook(useOrdenesCompra)
    await waitFor(() => expect(result.current.ordenes).toHaveLength(1))
    await act(async () => { await expect(result.current.recibir("oc", { operationKey: "key", location: "QA", receivedByItem: [{ itemId: "item", received: "1" }] })).rejects.toBe(rejected) })
  })

  it.each(["create", "emitir", "enviar"] as const)("preserves swallowed refresh failure for %s", async action => {
    vi.mocked(api.fetchOrdenesCompra).mockResolvedValueOnce([initial]).mockRejectedValueOnce(new Error("GET failed"))
    vi.mocked(api.createOrdenCompra).mockResolvedValue(initial)
    vi.mocked(api.emitirOrdenCompra).mockResolvedValue(initial)
    vi.mocked(api.enviarOrdenCompra).mockResolvedValue(initial)
    const { result } = renderHook(useOrdenesCompra)
    await waitFor(() => expect(result.current.ordenes).toHaveLength(1))
    await act(async () => {
      const mutation = action === "create" ? result.current.create({ proveedorId: "supplier", proveedorName: "Supplier", items: [] }) : result.current[action]("oc")
      await expect(mutation).resolves.toBe(initial)
    })
    expect(result.current.error).toBe("GET failed")
  })
})
