import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReceiveOrdenCompraDialog, readReceiptTracePolicy, type ReceiptTracePolicy } from "@/components/compras/ReceiveOrdenCompraDialog"
import { ApiClientError } from "@/lib/api/client"
import type { OrdenCompraApiRow } from "@/lib/api/ordenes-compra"
import { useState } from "react"
import { useOrdenesCompra } from "@/hooks/useOrdenesCompra"
import * as api from "@/lib/api/ordenes-compra"

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "mock-company" } }) }))
vi.mock("@/lib/api/ordenes-compra", () => ({ fetchOrdenesCompra: vi.fn(), recibirOrdenCompra: vi.fn(), createOrdenCompra: vi.fn(), emitirOrdenCompra: vi.fn(), enviarOrdenCompra: vi.fn() }))

const order: OrdenCompraApiRow = {
  id: "tracked-oc", proveedorId: "supplier", proveedorName: "Proveedor", total: "10", state: "Enviada", stateLabel: "Enviada",
  emitidaAt: null, enviadaAt: null, recibidaAt: null, canceladaAt: null, observaciones: null, necesidadCompraIds: [], createdAt: "2026-10-04T00:00:00Z",
  items: [{ id: "item", stockItemId: "article", name: "Implante", code: "SKU", quantity: "10", unitPrice: "1", subtotal: "10", received: "0", isArticuloZ: false, descripcionLibre: null }],
}
const label = (field: string, index = 1) => `${field} — Implante, asignación ${index}`
function change(field: string, value: string, index = 1) { fireEvent.change(screen.getByLabelText(label(field, index)), { target: { value } }) }
function add() { fireEvent.click(screen.getByRole("button", { name: "Agregar asignación de Implante" })) }
function submit() { fireEvent.click(screen.getByRole("button", { name: "Registrar recepción" })) }
function setup(policy: ReceiptTracePolicy | undefined, onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onOpenChange = vi.fn()
  const props = { open: true, ordenCompra: order, onSubmit, onOpenChange, tracePolicies: { item: policy } }
  const view = render(<ReceiveOrdenCompraDialog {...props} />)
  fireEvent.change(screen.getByLabelText("Destino del stock"), { target: { value: "DEV depósito" } })
  return { ...view, props, onSubmit, onOpenChange }
}
function fill(policy: ReceiptTracePolicy, index = 1) {
  if (!policy.includes("SERIAL")) change("Cantidad", "1", index)
  if (policy.includes("LOT")) change("Lote", `LOT-${index}`, index)
  if (policy.includes("SERIAL")) change("Número de serie", `SER-${index}`, index)
  if (policy.includes("EXPIRY")) change("Vencimiento", "2099-12-31", index)
}

function HookReceiving({ policy }: { policy: ReceiptTracePolicy }) {
  const { ordenes, recibir } = useOrdenesCompra()
  const [open, setOpen] = useState(true)
  return <ReceiveOrdenCompraDialog open={open} onOpenChange={setOpen} ordenCompra={ordenes[0] ?? null} tracePolicies={{ item: policy }} onSubmit={async payload => { await recibir(order.id, payload) }} />
}

describe("tracked receiving (mocked callbacks; no runtime/network/DB)", () => {
  afterEach(() => { cleanup(); vi.useRealTimers() })
  it.each<ReceiptTracePolicy>(["LOT", "LOT_EXPIRY", "SERIAL", "SERIAL_EXPIRY", "LOT_SERIAL_EXPIRY"])("requires current %s fields and sends only matching trace metadata", async policy => {
    const { onSubmit } = setup(policy)
    add(); submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Completá cada asignación/)).toBeInTheDocument()
    fill(policy); submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].receivedByItem).toEqual([{ itemId: "item", received: "1", allocations: [{ quantity: "1", ...(policy.includes("LOT") ? { lotCode: "LOT-1" } : {}), ...(policy.includes("SERIAL") ? { serialNumber: "SER-1" } : {}), ...(policy.includes("EXPIRY") ? { expirationDate: "2099-12-31" } : {}) }] }])
    expect(screen.getByLabelText("Recibir Implante")).toHaveAttribute("readonly")
    if (policy.includes("SERIAL")) expect(screen.getByLabelText(label("Cantidad"))).toHaveAttribute("readonly")
  })
  it("sums multiple lot decimals exactly and preserves stable selectors", async () => {
    const { onSubmit } = setup("LOT")
    add(); fill("LOT"); change("Cantidad", "0.1")
    add(); fill("LOT", 2); change("Cantidad", "0.2", 2)
    expect(screen.getByTestId("receipt-item-item")).toBeInTheDocument()
    expect(screen.getByTestId("receipt-allocation-item-1")).toBeInTheDocument()
    expect(screen.getByLabelText("Recibir Implante")).toHaveValue(0.3)
    submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].receivedByItem[0]).toEqual({ itemId: "item", received: "0.3", allocations: [{ quantity: "0.1", lotCode: "LOT-1" }, { quantity: "0.2", lotCode: "LOT-2" }] })
  })
  it("sends two serialized units as two quantity-one allocations and supports removal", async () => {
    const { onSubmit } = setup("LOT_SERIAL_EXPIRY")
    add(); fill("LOT_SERIAL_EXPIRY"); add(); fill("LOT_SERIAL_EXPIRY", 2)
    add(); fireEvent.click(screen.getByRole("button", { name: "Eliminar asignación 3 de Implante" }))
    submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].receivedByItem[0]).toMatchObject({ received: "2", allocations: [{ quantity: "1", serialNumber: "SER-1" }, { quantity: "1", serialNumber: "SER-2" }] })
  })
  it("rejects allocations exceeding remaining balance", () => {
    const { onSubmit } = setup("LOT")
    add(); fill("LOT"); change("Cantidad", "10.0001"); submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/sin superar el saldo pendiente/)).toBeInTheDocument()
  })
  it.each(["0", "-1", "0.00001"])("rejects invalid allocation quantity %s", quantity => {
    const { onSubmit } = setup("LOT")
    add(); fill("LOT"); change("Cantidad", quantity); submit()
    expect(onSubmit).not.toHaveBeenCalled()
  })
  it.each(["2026-02-29", "2026-04-31", ""])("rejects invalid calendar date %s", date => {
    const { onSubmit } = setup("LOT_EXPIRY")
    add(); fill("LOT_EXPIRY"); change("Vencimiento", date); submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/fecha válida/)).toBeInTheDocument()
  })
  it.each(["2026-10-03", "2026-10-04", "2028-02-29"])("accepts real expiry %s with warning only before UTC today", async date => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-04T23:30:00Z"))
    const { onSubmit } = setup("LOT_EXPIRY")
    add(); fill("LOT_EXPIRY"); change("Vencimiento", date)
    if (date < "2026-10-04") expect(screen.getByRole("alert")).toHaveTextContent("Material vencido: la recepción se registrará y generará un aviso")
    else expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    submit(); await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })
  it("fails closed for unknown policy, then preserves partial fields when metadata disappears", () => {
    const { onSubmit, rerender, props } = setup(undefined)
    expect(screen.getByLabelText("Recibir Implante")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Registrar recepción" })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
    rerender(<ReceiveOrdenCompraDialog {...props} tracePolicies={{ item: "LOT_EXPIRY" }} />)
    add(); change("Lote", "PARTIAL")
    rerender(<ReceiveOrdenCompraDialog {...props} />)
    expect(screen.getByLabelText(label("Lote"))).toHaveValue("PARTIAL")
    expect(screen.getByLabelText(label("Lote"))).toBeDisabled()
    rerender(<ReceiveOrdenCompraDialog {...props} tracePolicies={{ item: "LOT_EXPIRY" }} />)
    expect(screen.getByLabelText(label("Lote"))).toHaveValue("PARTIAL")
  })
  it.each([new Error("transport"), new Error("accepted but GET refresh failed"), new Error("GET refresh 403 after accepted POST")])("freezes every trace field and reconciles the same payload object (%s)", async cause => {
    const onSubmit = vi.fn().mockRejectedValueOnce(cause).mockRejectedValueOnce(new ApiClientError("Denied retry", 401)).mockResolvedValueOnce(undefined)
    const { onOpenChange, rerender, props } = setup("LOT_SERIAL_EXPIRY", onSubmit)
    add(); fill("LOT_SERIAL_EXPIRY"); submit()
    await screen.findByRole("button", { name: "Reconciliar recepción" })
    for (const field of ["Cantidad", "Lote", "Número de serie", "Vencimiento"]) expect(screen.getByLabelText(label(field))).toBeDisabled()
    for (const name of ["Agregar asignación de Implante", "Eliminar asignación 1 de Implante", "Cancelar"]) expect(screen.getByRole("button", { name })).toBeDisabled()
    expect(screen.getByLabelText("Destino del stock")).toBeDisabled()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }); expect(onOpenChange).not.toHaveBeenCalled()
    rerender(<ReceiveOrdenCompraDialog {...props} ordenCompra={{ ...order, state: "Recibida" }} tracePolicies={{}} />)
    fireEvent.click(screen.getByRole("button", { name: "Reconciliar recepción" }))
    await screen.findByText("Denied retry")
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Reconciliar recepción" }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onSubmit.mock.calls[1][0]).toBe(onSubmit.mock.calls[0][0])
    expect(onSubmit.mock.calls[2][0]).toBe(onSubmit.mock.calls[0][0])
  })
  it("allows correction and a fresh key after definitive POST rejection, then new receipt after success", async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new ApiClientError("Invalid lot", 422)).mockResolvedValue(undefined)
    const { rerender, props } = setup("LOT", onSubmit)
    add(); fill("LOT"); submit(); await screen.findByText("Invalid lot")
    expect(screen.getByLabelText(label("Lote"))).not.toBeDisabled()
    change("Lote", "CORRECTED"); submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    expect(onSubmit.mock.calls[1][0].operationKey).not.toBe(onSubmit.mock.calls[0][0].operationKey)
    rerender(<ReceiveOrdenCompraDialog {...props} open={false} />)
    rerender(<ReceiveOrdenCompraDialog {...props} />)
    fireEvent.change(screen.getByLabelText("Destino del stock"), { target: { value: "DEV" } })
    add(); fill("LOT"); submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(3))
    expect(onSubmit.mock.calls[2][0].operationKey).not.toBe(onSubmit.mock.calls[1][0].operationKey)
  })
  it("reads only explicit current supported Article metadata", () => {
    expect(readReceiptTracePolicy({ tracePolicies: [{ policy: "SERIAL" }, { policy: "NONE" }] })).toBe("SERIAL")
    for (const article of [{}, { tracePolicies: [] }, { tracePolicies: [{ policy: "UNKNOWN" }] }]) expect(readReceiptTracePolicy(article)).toBeUndefined()
  })
  it.each([
    ["NONE", new Error("GET 500")], ["NONE", new ApiClientError("GET forbidden", 403)],
    ["LOT_SERIAL_EXPIRY", new Error("GET 500")], ["LOT_SERIAL_EXPIRY", new ApiClientError("GET forbidden", 403)],
  ] as const)("preserves actual hook strict refresh and payload identity for %s (%s)", async (policy, failure) => {
    vi.mocked(api.fetchOrdenesCompra).mockReset().mockResolvedValueOnce([order]).mockRejectedValueOnce(failure).mockResolvedValueOnce([{ ...order, state: "Recibida" }])
    vi.mocked(api.recibirOrdenCompra).mockReset().mockResolvedValue({ ...order, state: "Recibida" })
    render(<HookReceiving policy={policy} />)
    await screen.findByLabelText("Recibir Implante")
    fireEvent.change(screen.getByLabelText("Destino del stock"), { target: { value: "DEV" } })
    if (policy === "NONE") fireEvent.change(screen.getByLabelText("Recibir Implante"), { target: { value: "1" } })
    else { add(); fill(policy) }
    submit()
    await screen.findByRole("button", { name: "Reconciliar recepción" })
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    expect(screen.getByLabelText("Destino del stock")).toBeDisabled()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    const intent = vi.mocked(api.recibirOrdenCompra).mock.calls[0][2]
    fireEvent.click(screen.getByRole("button", { name: "Reconciliar recepción" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(vi.mocked(api.recibirOrdenCompra).mock.calls[1][2]).toBe(intent)
    expect(api.fetchOrdenesCompra).toHaveBeenCalledTimes(3)
  })
})
