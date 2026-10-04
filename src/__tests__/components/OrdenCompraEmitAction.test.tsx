import React from "react"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import OrdenesCompraPage from "@/app/compras/ordenes-compra/page"
import type { OrdenCompraApiRow, OrdenCompraState } from "@/lib/api/ordenes-compra"

const mocks = vi.hoisted(() => ({
  ordenes: [] as OrdenCompraApiRow[],
  emitir: vi.fn(), enviar: vi.fn(), recibir: vi.fn(), create: vi.fn(),
  success: vi.fn(), error: vi.fn(), warning: vi.fn(), articles: vi.fn(), article: vi.fn(), receiptProps: vi.fn(),
  role: "admin" as string | null,
}))

vi.mock("@/hooks/useOrdenesCompra", () => ({ useOrdenesCompra: () => ({ ...mocks, error: null }) }))
vi.mock("@/hooks/useProveedores", () => ({ useProveedores: () => ({ proveedores: [] }) }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "mock-company" }, currentAccess: mocks.role ? { role: mocks.role } : null }) }))
vi.mock("@/lib/api/articles", () => ({ searchArticlesApi: mocks.articles, getArticleApi: mocks.article }))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error, warning: mocks.warning } }))
vi.mock("@/components/compras/CreateOrdenCompraDialog", () => ({ CreateOrdenCompraDialog: () => null }))
vi.mock("@/components/compras/ReceiveOrdenCompraDialog", async importOriginal => ({
  ...await importOriginal<typeof import("@/components/compras/ReceiveOrdenCompraDialog")>(),
  ReceiveOrdenCompraDialog: (props: { open: boolean; onSubmit: (payload: unknown) => Promise<void> }) => {
    mocks.receiptProps(props)
    return props.open ? <button onClick={() => void props.onSubmit({ operationKey: "mock-receipt", location: "DEV", receivedByItem: [] })}>Mock receipt submit</button> : null
  },
}))
vi.mock("@/components/shared", () => ({
  StatsCard: () => null, SearchInput: () => null, FilterSelect: () => null,
  StateBadge: ({ status }: { status: string }) => <span>{status}</span>,
  SurgeryDrawer: () => null,
}))

const order = (id: string, state: OrdenCompraState): OrdenCompraApiRow => ({
  id, state, stateLabel: state, proveedorId: "mock-supplier", proveedorName: "Mock supplier",
  total: "10", createdAt: "2026-10-03T12:00:00.000Z", emitidaAt: null,
  enviadaAt: null, recibidaAt: null, canceladaAt: null, observaciones: null,
  necesidadCompraIds: [], items: [],
})

async function openActions(id: string) {
  const row = screen.getByText(id).closest("tr")!
  const trigger = within(row).getAllByRole("button").find(button => button.getAttribute("aria-haspopup") === "menu")!
  fireEvent.keyDown(trigger, { key: "ArrowDown" })
  return screen.findByRole("menu")
}

describe("purchase order Emitir action (mocked hooks/providers; real menu)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.role = "admin"
    mocks.articles.mockResolvedValue([])
    mocks.emitir.mockResolvedValue(undefined)
    mocks.ordenes = [order("draft-owned", "Borrador"), order("draft-other", "Borrador")]
  })
  afterEach(cleanup)

  it("emits only the selected draft ID and shows success feedback", async () => {
    render(<OrdenesCompraPage />)
    const menu = await openActions("draft-owned")
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Emitir" }))
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("OC emitida"))
    expect(mocks.emitir.mock.calls).toEqual([["draft-owned"]])
    expect(mocks.enviar).not.toHaveBeenCalled()
    expect(mocks.recibir).not.toHaveBeenCalled()
  })

  it.each<OrdenCompraState>(["Emitida", "Enviada", "Parcialmente_recibida", "Recibida", "Cancelada"])(
    "does not offer Emitir for %s and preserves existing actions", async state => {
      mocks.ordenes = [order("non-draft", state)]
      render(<OrdenesCompraPage />)
      const menu = await openActions("non-draft")
      expect(within(menu).queryByRole("menuitem", { name: "Emitir" })).not.toBeInTheDocument()
      expect(within(menu).getByRole("menuitem", { name: "Ver detalle" })).toBeInTheDocument()
      if (state === "Emitida") expect(within(menu).getByRole("menuitem", { name: "Marcar enviada" })).toBeInTheDocument()
      if (state === "Enviada" || state === "Parcialmente_recibida") expect(within(menu).getByRole("menuitem", { name: "Registrar recepción" })).toBeInTheDocument()
      expect(mocks.emitir).not.toHaveBeenCalled()
    },
  )

  it.each([
    [new Error("Cannot transition from Borrador"), "Cannot transition from Borrador"],
    ["unexpected rejection", "No se pudo emitir la OC"],
  ])("shows rejection feedback without success (%s)", async (error, message) => {
    mocks.emitir.mockRejectedValue(error)
    render(<OrdenesCompraPage />)
    const menu = await openActions("draft-owned")
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Emitir" }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(message))
    expect(mocks.emitir.mock.calls).toEqual([["draft-owned"]])
    expect(mocks.success).not.toHaveBeenCalled()
  })
  it.each(["coordinator", null])("hides physical receiving without stock access (%s)", async role => {
    mocks.role = role
    mocks.ordenes = [order("sent-order", "Enviada")]
    render(<OrdenesCompraPage />)
    const menu = await openActions("sent-order")
    expect(within(menu).queryByRole("menuitem", { name: "Registrar recepción" })).not.toBeInTheDocument()
  })
  it("offers physical receiving to logistics", async () => {
    mocks.role = "logistics"
    mocks.ordenes = [order("sent-order", "Enviada")]
    render(<OrdenesCompraPage />)
    expect(within(await openActions("sent-order")).getByRole("menuitem", { name: "Registrar recepción" })).toBeInTheDocument()
  })
  it.each([true, false])("resolves authoritative article policy from catalog or exact lookup (catalog=%s)", async inCatalog => {
    const article = { id: "article-1", sku: "SKU", description: "Article", tracePolicies: [{ policy: "LOT_EXPIRY" }] }
    mocks.articles.mockResolvedValue(inCatalog ? [article] : [])
    mocks.article.mockResolvedValue(article)
    mocks.recibir.mockResolvedValue({ receiptWarnings: [{ code: "EXPIRED_RECEIPT_ACCEPTED" }] })
    mocks.ordenes = [{ ...order("sent-order", "Enviada"), items: [{ id: "item-1", stockItemId: "article-1", name: "Article", code: "SKU", quantity: "1", unitPrice: "1", subtotal: "1", received: "0", isArticuloZ: false, descripcionLibre: null }] }]
    render(<OrdenesCompraPage />)
    fireEvent.click(within(await openActions("sent-order")).getByRole("menuitem", { name: "Registrar recepción" }))
    await waitFor(() => expect(mocks.receiptProps.mock.lastCall?.[0].tracePolicies).toEqual({ "item-1": "LOT_EXPIRY" }))
    if (!inCatalog) expect(mocks.article).toHaveBeenCalledWith("mock-company", "article-1")
    fireEvent.click(screen.getByRole("button", { name: "Mock receipt submit" }))
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith("Material vencido: la recepción se registró y generó un aviso"))
  })
  it("keeps missing policy unknown when exact lookup fails", async () => {
    mocks.article.mockRejectedValue(new Error("unavailable"))
    mocks.ordenes = [{ ...order("sent-order", "Enviada"), items: [{ id: "item-1", stockItemId: "article-1", name: "Article", code: "SKU", quantity: "1", unitPrice: "1", subtotal: "1", received: "0", isArticuloZ: false, descripcionLibre: null }] }]
    render(<OrdenesCompraPage />)
    fireEvent.click(within(await openActions("sent-order")).getByRole("menuitem", { name: "Registrar recepción" }))
    await waitFor(() => expect(mocks.article).toHaveBeenCalledWith("mock-company", "article-1"))
    expect(mocks.receiptProps.mock.lastCall?.[0].tracePolicies?.["item-1"]).toBeUndefined()
  })
})
