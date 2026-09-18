import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import RemitosPage from "@/app/remitos/page"
import type { RemitoApiRow } from "@/lib/api/remitos"

const useRemitosMock = vi.fn()
const selectRemitoMock = vi.fn().mockResolvedValue(undefined)
const refreshMock = vi.fn().mockResolvedValue(undefined)
const pushMock = vi.fn()

vi.mock("@/hooks/useRemitos", () => ({ useRemitos: (filters: unknown) => useRemitosMock(filters) }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

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
    refresh: refreshMock, selectRemito: selectRemitoMock, emit: vi.fn(), transition: vi.fn(), devolucion: vi.fn(), createDraft: vi.fn(), updateDraft: vi.fn(),
    ...overrides,
  }
}

describe("RemitosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRemitosMock.mockReturnValue(hookValue())
  })

  it("filtra localmente y permite limpiar sin cambiar el contrato del hook", () => {
    render(<RemitosPage />)
    fireEvent.change(screen.getByPlaceholderText(/número, destinatario/i), { target: { value: "inexistente" } })
    expect(screen.getByText("No hay coincidencias")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /limpiar filtros/i }))
    expect(screen.getAllByText("Clínica Central")).toHaveLength(2)
    expect(useRemitosMock).toHaveBeenLastCalledWith({ state: undefined, take: 100 })
  })

  it("selecciona una fila y expone únicamente acciones permitidas para un borrador", () => {
    render(<RemitosPage />)
    fireEvent.click(screen.getByRole("button", { name: /R-0012/i }))
    expect(selectRemitoMock).toHaveBeenCalledWith(remito)
    expect(screen.getByRole("button", { name: /modificar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^emitir$/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /devolución/i })).not.toBeInTheDocument()
  })

  it.each([
    ["loading", { remitos: [], selectedRemito: null, loading: true, ready: false }, "Cargando remitos"],
    ["blocked", { remitos: [], selectedRemito: null, blocked: true }, "No hay empresa activa"],
    ["error", { remitos: [], selectedRemito: null, error: "Sin conexión" }, "No se pudieron cargar los remitos"],
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

    fireEvent.click(screen.getByRole("button", { name: /devolución/i }))

    expect(screen.getByRole("spinbutton", { name: "Devolver Placa (item-1)" })).toBeInTheDocument()
    expect(screen.getByRole("spinbutton", { name: "Devolver Placa (item-2)" })).toBeInTheDocument()
  })

  it("navega al workspace para crear y editar un borrador", () => {
    render(<RemitosPage />)
    fireEvent.click(screen.getByRole("button", { name: /nuevo remito/i }))
    expect(pushMock).toHaveBeenCalledWith("/remitos/nuevo")
    fireEvent.click(screen.getByRole("button", { name: /modificar/i }))
    expect(pushMock).toHaveBeenCalledWith("/remitos/rem-1/editar")
  })
})
