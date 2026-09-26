import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import RemitosPage from "@/app/remitos/page"
import type { RemitoApiRow } from "@/lib/api/remitos"

const useRemitosMock = vi.fn()
const selectRemitoMock = vi.fn().mockResolvedValue(undefined)
const setSelectedRemitoMock = vi.fn()
const refreshMock = vi.fn().mockResolvedValue(undefined)
const pushMock = vi.fn()
const fetchPrintCodesMock = vi.fn()
const printCodes = {
  remitoShortCode: "RM1-04HM-ASW9-NF6Y-ZZPW-M",
  internalQrDataUrl: "data:image/png;base64,INTERNAL",
  publicQrDataUrl: "data:image/png;base64,PUBLIC",
  code128Svg: "<svg></svg>",
  labels: { internal: "Internal OSSUM access", public: "Public verification" },
} as const

vi.mock("@/hooks/useRemitos", () => ({ useRemitos: (filters: unknown) => useRemitosMock(filters) }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))
vi.mock("@/lib/api/remito-print-codes", () => ({ fetchRemitoPrintCodes: (...args: unknown[]) => fetchPrintCodesMock(...args) }))

const remito: RemitoApiRow = {
  id: "rem-1", visibleNumber: 12, companyId: "company-1", branchId: "SUC-1", issuedBranchId: null,
  documentType: "R", surgeryId: "CX-1", origin: "manual", salidaReason: "cirugia", boxId: "box-1", presupuestoId: null,
  destinatarioContactId: "contact-1", destinatarioSnapshot: { nombre: "Clínica Central", codigoContacto: "CC-01" },
  shippingAddressSnapshot: null, transportSnapshot: null, packageCount: null, declaredValue: null, state: "Borrador",
  issuedAt: null, deliveredAt: null, returnedAt: null, createdById: "user-1", updatedById: null, metadata: { observaciones: "Control urgente" },
  createdAt: "2026-07-15T10:30:00.000Z", updatedAt: "2026-07-15T10:30:00.000Z",
  items: [{ id: "item-1", itemId: "stock-1", sku: "SKU-1", description: "Placa", quantity: 2, unit: "un", boxId: null, presupuestoItemId: null, returnedQuantity: 0, lotNumber: null, serialNumber: null, expirationDate: null, metadata: null, createdAt: "2026-07-15T10:30:00.000Z", updatedAt: "2026-07-15T10:30:00.000Z" }],
}

const remitoParaDevolver: RemitoApiRow = {
  ...remito,
  state: "Entregado",
  items: [
    ...remito.items,
    { ...remito.items[0], id: "item-2", itemId: "stock-2" },
  ],
}

function hookValue(overrides: Partial<ReturnType<typeof useRemitosMock>> = {}) {
  return {
    remitos: [remito], selectedRemito: remito, loading: false, ready: true, error: null, mutatingId: null, blocked: false,
    refresh: refreshMock, selectRemito: selectRemitoMock, setSelectedRemito: setSelectedRemitoMock, emit: vi.fn(), transition: vi.fn(), devolucion: vi.fn(), createDraft: vi.fn(), updateDraft: vi.fn(),
    ...overrides,
  }
}

describe("RemitosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.removeItem("ossum.remitos.columns.v1")
    fetchPrintCodesMock.mockResolvedValue(printCodes)
    useRemitosMock.mockReturnValue(hookValue())
  })

  it("filtra localmente y permite limpiar sin cambiar el contrato del hook", () => {
    render(<RemitosPage />)
    fireEvent.change(screen.getByPlaceholderText(/buscar remito/i), { target: { value: "inexistente" } })
    expect(screen.getByText("No hay coincidencias")).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: /limpiar filtros/i })[0])
    expect(screen.getAllByText("Clínica Central")).toHaveLength(2)
    expect(useRemitosMock).toHaveBeenLastCalledWith({ state: undefined, take: 100 })
  })

  it("encuentra remitos por el artículo contenido y expone filtros progresivos", () => {
    render(<RemitosPage />)
    fireEvent.change(screen.getByPlaceholderText(/buscar remito/i), { target: { value: "Placa" } })
    expect(screen.getByRole("row", { name: /R-0012/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /más filtros/i }))
    expect(screen.getByRole("textbox", { name: /filtrar por artículo sku lote o serie/i })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: /filtrar por transporte/i })).toBeInTheDocument()
  })

  it("cambia vistas y prepara columnas configurables persistentes", () => {
    render(<RemitosPage />)
    fireEvent.change(screen.getByRole("combobox", { name: /seleccionar vista/i }), { target: { value: "logistica" } })
    expect(screen.getByRole("columnheader", { name: "Transporte" })).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: /cirugía/i })).not.toBeInTheDocument()
    fireEvent.pointerDown(screen.getByRole("button", { name: /columnas/i }), { button: 0, ctrlKey: false })
    expect(screen.getByRole("menuitemcheckbox", { name: /observación/i })).toBeInTheDocument()
  })

  it("selecciona una fila y expone únicamente acciones permitidas para un borrador", () => {
    render(<RemitosPage />)
    fireEvent.click(screen.getByRole("row", { name: /R-0012/i }))
    expect(selectRemitoMock).toHaveBeenCalledWith(remito)
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^emitir$/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /registrar devolución/i })).not.toBeInTheDocument()
  })

  it("permite abrir la edición de un remito Entregado", () => {
    const delivered = { ...remito, state: "Entregado", issuedAt: remito.createdAt, deliveredAt: remito.updatedAt }
    useRemitosMock.mockReturnValue(hookValue({ remitos: [delivered], selectedRemito: delivered }))
    render(<RemitosPage />)

    fireEvent.click(screen.getByRole("button", { name: /editar/i }))
    expect(pushMock).toHaveBeenCalledWith("/remitos/rem-1/editar")
  })

  it("mantiene la tabla visible y controla el inspector inferior por tabs, tamaño y cierre", () => {
    render(<RemitosPage />)

    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: /detalle del remito R-0012/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Material" }))
    expect(screen.getByRole("columnheader", { name: "Vencimiento" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /contraer detalle/i }))
    expect(screen.queryByRole("button", { name: "Material" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /expandir detalle/i }))
    expect(screen.getByRole("button", { name: "Material" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Adjuntos" }))
    expect(screen.getByText(/todavía no hay adjuntos/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /cerrar detalle/i }))
    expect(setSelectedRemitoMock).toHaveBeenCalledWith(null)
    expect(screen.getByRole("row", { name: /R-0012/i })).toBeInTheDocument()
  })

  it("oculta el grupo cirugía cuando el remito no tiene expediente", () => {
    const venta = { ...remito, surgeryId: null, surgeryLabel: null, surgeryDescription: null, salidaReason: "venta" }
    useRemitosMock.mockReturnValue(hookValue({ remitos: [venta], selectedRemito: venta }))
    render(<RemitosPage />)

    expect(screen.queryByRole("heading", { name: "Cirugía" })).not.toBeInTheDocument()
    expect(screen.getAllByText("Venta").length).toBeGreaterThan(0)
  })

  it.each([
    ["loading", { remitos: [], selectedRemito: null, loading: true, ready: false }, "Cargando remitos"],
    ["blocked", { remitos: [], selectedRemito: null, blocked: true }, "No hay empresa activa"],
    ["error", { remitos: [], selectedRemito: null, error: "Sin conexión" }, "Sin conexión"],
    ["empty", { remitos: [], selectedRemito: null }, "Todavía no hay remitos"],
  ])("muestra la superficie %s", (_state, overrides, expected) => {
    useRemitosMock.mockReturnValue(hookValue(overrides))
    render(<RemitosPage />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it("conserva el resumen seleccionado durante refresh", () => {
    useRemitosMock.mockReturnValue(hookValue({ loading: true, error: "Error puntual" }))
    render(<RemitosPage />)
    expect(screen.getAllByText("Clínica Central")).toHaveLength(2)
    expect(screen.getByText("Error puntual")).toBeInTheDocument()
  })

  it("ofrece reintento en error", () => {
    useRemitosMock.mockReturnValue(hookValue({ remitos: [], selectedRemito: null, error: "Sin conexión" }))
    render(<RemitosPage />)
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }))
    expect(refreshMock).toHaveBeenCalled()
  })

  it("nombra de forma única cada cantidad de devolución según su ítem", () => {
    useRemitosMock.mockReturnValue(hookValue({ remitos: [remitoParaDevolver], selectedRemito: remitoParaDevolver }))
    render(<RemitosPage />)

    fireEvent.click(screen.getByRole("button", { name: /registrar devolución/i }))

    expect(screen.getAllByRole("spinbutton", { name: "Devolver" })).toHaveLength(2)
  })

  it("navega al workspace para crear y editar un borrador", () => {
    render(<RemitosPage />)
    fireEvent.click(screen.getByRole("button", { name: /nuevo remito/i }))
    expect(pushMock).toHaveBeenCalledWith("/remitos/nuevo")
    fireEvent.click(screen.getByRole("button", { name: /editar/i }))
    expect(pushMock).toHaveBeenCalledWith("/remitos/rem-1/editar")
  })

  it("fails closed for drafts without requesting or opening print codes", () => {
    const open = vi.spyOn(window, "open")
    render(<RemitosPage />)

    fireEvent.pointerDown(screen.getByRole("button", { name: /^imprimir/i }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole("menuitem", { name: /remito a4/i }))

    expect(fetchPrintCodesMock).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it("awaits issued codes before opening the canonical browser print", async () => {
    const issued = {
      ...remito,
      state: "Emitido",
      issuedAt: remito.createdAt,
      remitoShortCode: printCodes.remitoShortCode,
      detailItems: [{
        groupLabel: "Caja / Fórmula 1",
        sku: "SNAP-1",
        description: "Tornillo snapshot detallado",
        quantity: 4,
        unit: "un",
        lotNumber: "LOT-DETAIL",
        serialNumber: null,
        expirationDate: null,
        identifiedCode: "UNIT-DETAIL",
      }],
    }
    const write = vi.fn()
    const print = vi.fn()
    const open = vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), print } as unknown as Window)
    useRemitosMock.mockReturnValue(hookValue({ remitos: [issued], selectedRemito: issued }))
    render(<RemitosPage />)

    fireEvent.pointerDown(screen.getByRole("button", { name: /^imprimir/i }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole("menuitem", { name: /remito a4/i }))

    expect(open).toHaveBeenCalledOnce()
    await waitFor(() => expect(fetchPrintCodesMock).toHaveBeenCalledWith("company-1", printCodes.remitoShortCode))
    expect(open).toHaveBeenCalledOnce()
    const html = String(write.mock.calls[0][0])
    const detailPageStart = html.indexOf('class="page detail-page"')
    expect(html).toContain("Uso interno OSSUM")
    expect(html).toContain('window.addEventListener("load"')
    expect(detailPageStart).toBeGreaterThan(-1)
    expect(html.slice(0, detailPageStart)).toContain("Placa")
    expect(html.slice(0, detailPageStart)).not.toContain("Tornillo snapshot detallado")
    expect(html.slice(detailPageStart)).toContain("Tornillo snapshot detallado")
    expect(html.slice(detailPageStart)).not.toContain(">Placa<")
    expect(print).not.toHaveBeenCalled()
  })

  it("fails closed instead of printing when issued codes are unavailable", async () => {
    const issued = { ...remito, state: "Emitido", issuedAt: remito.createdAt, remitoShortCode: printCodes.remitoShortCode }
    const write = vi.fn()
    const close = vi.fn()
    const open = vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), print: vi.fn(), close } as unknown as Window)
    fetchPrintCodesMock.mockRejectedValue(new Error("unavailable"))
    useRemitosMock.mockReturnValue(hookValue({ remitos: [issued], selectedRemito: issued }))
    render(<RemitosPage />)

    fireEvent.pointerDown(screen.getByRole("button", { name: /^imprimir/i }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole("menuitem", { name: /remito a4/i }))

    await waitFor(() => expect(fetchPrintCodesMock).toHaveBeenCalled())
    expect(open).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
    expect(write).not.toHaveBeenCalled()
  })

  it("does not print issued legacy remitos without codes", async () => {
    const legacy = { ...remito, state: "Entregado", issuedAt: remito.createdAt, remitoShortCode: null }
    const write = vi.fn()
    const close = vi.fn()
    const open = vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), print: vi.fn(), close } as unknown as Window)
    useRemitosMock.mockReturnValue(hookValue({ remitos: [legacy], selectedRemito: legacy }))
    render(<RemitosPage />)

    fireEvent.pointerDown(screen.getByRole("button", { name: /^imprimir/i }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole("menuitem", { name: /remito a4/i }))

    await waitFor(() => expect(open).toHaveBeenCalledOnce())
    expect(fetchPrintCodesMock).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
    expect(write).not.toHaveBeenCalled()
  })

  it("shows issued QR and Code 128 inside the codes tab", async () => {
    const issued = { ...remito, state: "Emitido", issuedAt: remito.createdAt, remitoShortCode: printCodes.remitoShortCode }
    useRemitosMock.mockReturnValue(hookValue({ remitos: [issued], selectedRemito: issued }))
    render(<RemitosPage />)

    fireEvent.click(screen.getByRole("button", { name: /qr y códigos/i }))

    await waitFor(() => expect(screen.getByRole("img", { name: /operación logística/i })).toBeInTheDocument())
    expect(screen.getByRole("img", { name: /verificar públicamente/i })).toBeInTheDocument()
    expect(screen.getByText(printCodes.remitoShortCode)).toBeInTheDocument()
  })

  it("offers a thermal 80 mm print option", async () => {
    const issued = { ...remito, state: "Emitido", issuedAt: remito.createdAt, remitoShortCode: printCodes.remitoShortCode }
    const write = vi.fn()
    vi.spyOn(window, "open").mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), print: vi.fn() } as unknown as Window)
    useRemitosMock.mockReturnValue(hookValue({ remitos: [issued], selectedRemito: issued }))
    render(<RemitosPage />)

    fireEvent.pointerDown(screen.getByRole("button", { name: /^imprimir/i }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole("menuitem", { name: /ticket térmico 80 mm/i }))

    await waitFor(() => expect(write).toHaveBeenCalled())
    expect(write.mock.calls[0][0]).toContain("@page { size: 80mm auto")
  })
})
