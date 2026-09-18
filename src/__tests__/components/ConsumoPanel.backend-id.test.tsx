import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConsumoPanel } from "@/components/expediente/ConsumoPanel"
import type { Surgery } from "@/types"

const { comparativaMock, createDraftMock, emitMock, useConsumosMock, useRemitosMock, useTrazabilidadMock, devolucionesPanelMock } = vi.hoisted(() => ({
  comparativaMock: vi.fn(),
  createDraftMock: vi.fn(),
  emitMock: vi.fn(),
  useConsumosMock: vi.fn(),
  useRemitosMock: vi.fn(),
  useTrazabilidadMock: vi.fn(),
  devolucionesPanelMock: vi.fn(),
}))

vi.mock("@/hooks/useConsumos", () => ({ useConsumos: useConsumosMock }))
vi.mock("@/hooks/useRemitos", () => ({ useRemitos: useRemitosMock }))
vi.mock("@/hooks/useTrazabilidad", () => ({ useTrazabilidad: useTrazabilidadMock }))
vi.mock("@/components/comparativa/ComparativaOperativaV0", () => ({
  ComparativaOperativaV0: (props: unknown) => {
    comparativaMock(props)
    return <div data-testid="comparativa-operativa" />
  },
}))
vi.mock("@/components/expediente/DevolucionesPanel", () => ({
  DevolucionesPanel: (props: { surgeryId: string; selectedRemito?: { id: string } | null; selectedConsumo?: { id: string } | null }) => {
    devolucionesPanelMock(props)
    return <div data-testid="devoluciones-panel" />
  },
}))

const surgery: Surgery = {
  id: "CX-0006",
  backendId: "db-surgery-1",
  patient: "Paciente",
  patientDni: "12345678",
  surgeon: "Dr. Cirujano",
  institution: "Institución",
  institutionCity: "Ciudad",
  procedure: "Procedimiento",
  date: "2026-07-16",
  time: "09:00",
  state: "Pendiente",
  client: "Cliente",
  classification: "Otro",
  preparationState: "Sin preparar",
  facturado: false,
  autorizado: false,
  urgente: false,
  leyendaDestacada: false,
  referenciasAdministrativas: [],
}

const deliveredRemito = {
  id: "remito-1",
  visibleNumber: 1,
  companyId: "company-1",
  branchId: null,
  issuedBranchId: null,
  documentType: "R",
  surgeryId: "db-surgery-1",
  origin: "manual",
  salidaReason: "cirugia",
  boxId: null,
  presupuestoId: null,
  destinatarioContactId: null,
  destinatarioSnapshot: null,
  shippingAddressSnapshot: null,
  transportSnapshot: null,
  packageCount: null,
  declaredValue: null,
  state: "Entregado",
  issuedAt: null,
  deliveredAt: null,
  returnedAt: null,
  createdById: null,
  updatedById: null,
  metadata: null,
  createdAt: "2026-07-16T09:00:00.000Z",
  updatedAt: "2026-07-16T09:00:00.000Z",
  items: [{
    id: "remito-item-1",
    itemId: "item-1",
    sku: "SKU-1",
    description: "Tornillo",
    quantity: 1,
    unit: "u",
    boxId: null,
    presupuestoItemId: null,
    returnedQuantity: null,
    lotNumber: null,
    serialNumber: null,
    expirationDate: null,
    metadata: null,
    createdAt: "2026-07-16T09:00:00.000Z",
    updatedAt: "2026-07-16T09:00:00.000Z",
  }],
}

function buildConsumo(id: string, visibleNumber: number, remitoId: string) {
  return {
    id,
    visibleNumber,
    companyId: "company-1",
    surgeryId: "db-surgery-1",
    remitoId,
    state: "Borrador",
    validatedAt: null,
    createdById: "user-1",
    updatedById: null,
    metadata: null,
    createdAt: "2026-07-16T09:00:00.000Z",
    updatedAt: "2026-07-16T09:00:00.000Z",
    items: [{
      id: `${id}-item-1`,
      remitoItemId: "remito-item-1",
      sku: "SKU-1",
      description: `Item ${id}`,
      requestedQuantity: 1,
      consumedQuantity: 0,
      unit: "u",
      lotNumber: null,
      serialNumber: null,
      expirationDate: null,
      metadata: null,
    }],
  }
}

describe("ConsumoPanel backend surgery ID", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createDraftMock.mockResolvedValue({ id: "consumo-1", visibleNumber: 1 })
    emitMock.mockResolvedValue({ id: "consumo-1", state: "Pendiente" })
    useConsumosMock.mockReturnValue({
      consumos: [], loading: false, ready: true, error: null, blocked: false, mutatingId: null,
      refresh: vi.fn(), createDraft: createDraftMock, emit: emitMock, validate: vi.fn(), removeDraft: vi.fn(),
    })
    useRemitosMock.mockReturnValue({ remitos: [deliveredRemito], loading: false, refresh: vi.fn() })
    useTrazabilidadMock.mockReturnValue({ trace: null, refresh: vi.fn() })
  })

  it("uses backendId, never the visible ID, for all server-backed panel paths", async () => {
    render(<ConsumoPanel surgery={surgery} remitos={[]} editingConsumo={{}} setEditingConsumo={vi.fn()} />)

    expect(useConsumosMock).toHaveBeenCalledWith({ surgeryId: "db-surgery-1", take: 50 })
    expect(useRemitosMock).toHaveBeenCalledWith({ surgeryId: "db-surgery-1", take: 100 })
    expect(useTrazabilidadMock).toHaveBeenCalledWith("db-surgery-1")
    expect(devolucionesPanelMock).toHaveBeenLastCalledWith(expect.objectContaining({ surgeryId: "db-surgery-1" }))

    fireEvent.click(screen.getByRole("button", { name: "Crear consumo desde remito" }))

    await waitFor(() => {
      expect(createDraftMock).toHaveBeenCalledWith(expect.objectContaining({ surgeryId: "db-surgery-1" }))
    })

    const serverValues = [
      useConsumosMock.mock.calls[0][0].surgeryId,
      useRemitosMock.mock.calls[0][0].surgeryId,
      useTrazabilidadMock.mock.calls[0][0],
      devolucionesPanelMock.mock.calls.at(-1)![0].surgeryId,
      createDraftMock.mock.calls[0][0].surgeryId,
    ]
    expect(serverValues).toEqual(["db-surgery-1", "db-surgery-1", "db-surgery-1", "db-surgery-1", "db-surgery-1"])
    expect(serverValues).not.toContain("CX-0006")
  })

  it("blocks every server-backed path instead of substituting the visible ID when backendId is missing", () => {
    render(
      <ConsumoPanel
        surgery={{ ...surgery, backendId: "   " }}
        remitos={[]}
        editingConsumo={{}}
        setEditingConsumo={vi.fn()}
      />
    )

    expect(screen.getByText("Consumo no disponible")).toBeInTheDocument()
    expect(useConsumosMock).not.toHaveBeenCalled()
    expect(useRemitosMock).not.toHaveBeenCalled()
    expect(useTrazabilidadMock).not.toHaveBeenCalled()
    expect(devolucionesPanelMock).not.toHaveBeenCalled()
    expect(createDraftMock).not.toHaveBeenCalled()
  })

  it("selects the remito and consumo used by Ficha CX and emits the selected consumo", async () => {
    const secondRemito = {
      ...deliveredRemito,
      id: "remito-2",
      visibleNumber: 2,
      items: [{ ...deliveredRemito.items[0], id: "remito-item-2", description: "Placa" }],
    }
    const firstConsumo = buildConsumo("consumo-1", 1, "remito-1")
    const secondConsumo = buildConsumo("consumo-2", 2, "remito-2")
    useRemitosMock.mockReturnValue({ remitos: [deliveredRemito, secondRemito], loading: false, refresh: vi.fn() })
    useConsumosMock.mockReturnValue({
      consumos: [firstConsumo, secondConsumo], loading: false, ready: true, error: null, blocked: false, mutatingId: null,
      refresh: vi.fn(), createDraft: createDraftMock, emit: emitMock, validate: vi.fn(), removeDraft: vi.fn(),
    })

    render(<ConsumoPanel surgery={surgery} remitos={[]} editingConsumo={{}} setEditingConsumo={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Remito base"), { target: { value: "remito-2" } })
    fireEvent.change(screen.getByLabelText("Consumo seleccionado"), { target: { value: "consumo-2" } })

    await waitFor(() => {
      expect(devolucionesPanelMock).toHaveBeenLastCalledWith(expect.objectContaining({
        selectedRemito: expect.objectContaining({ id: "remito-2" }),
        selectedConsumo: expect.objectContaining({ id: "consumo-2" }),
      }))
    })

    fireEvent.click(screen.getByRole("button", { name: "Emitir consumo" }))
    await waitFor(() => expect(emitMock).toHaveBeenCalledWith("consumo-2"))
  })

  it("keeps every surgery trace row when the selected remito changes", () => {
    const secondRemito = { ...deliveredRemito, id: "remito-2", visibleNumber: 2 }
    const traceRows = [
      { id: "trace-1", remitoId: "remito-1", remitoItemId: "item-1", consumoItemIds: [] },
      { id: "trace-2", remitoId: "remito-2", remitoItemId: "item-2", consumoItemIds: [] },
    ]
    useRemitosMock.mockReturnValue({ remitos: [deliveredRemito, secondRemito], loading: false, refresh: vi.fn() })
    useTrazabilidadMock.mockReturnValue({
      trace: { items: traceRows, summary: null }, loading: false, ready: true, error: null, refresh: vi.fn(),
    })

    render(<ConsumoPanel surgery={surgery} remitos={[]} editingConsumo={{}} setEditingConsumo={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Remito base"), { target: { value: "remito-2" } })

    expect(comparativaMock).toHaveBeenLastCalledWith(expect.objectContaining({
      rows: traceRows,
      remitoLabels: { "remito-1": "R-0001", "remito-2": "R-0002" },
    }))
  })

  it.each([
    ["desktop-like", 1280, 800],
    ["mobile", 412, 915],
  ])("never feeds legacy local remito quantities into Comparativa at %s viewport", (_name, width, height) => {
    Object.defineProperties(window, {
      innerWidth: { configurable: true, value: width },
      innerHeight: { configurable: true, value: height },
    })
    window.dispatchEvent(new Event("resize"))
    const legacyRemito = {
      id: "R-LOCAL-1", surgeryId: surgery.id, boxId: "box-local", destination: "Institución",
      date: "2026-07-16", state: "Enviado",
      items: [{ stockItemId: "local-1", name: "Artículo local", code: "LOCAL", sentQuantity: 99, consumedQuantity: 3, returnedQuantity: 1 }],
    }

    render(<ConsumoPanel surgery={surgery} remitos={[legacyRemito as never]} editingConsumo={{}} setEditingConsumo={vi.fn()} />)

    expect(comparativaMock).toHaveBeenLastCalledWith(expect.objectContaining({ rows: [], summary: null }))
    expect(comparativaMock.mock.calls.at(-1)?.[0]).not.toEqual(expect.objectContaining({ rows: legacyRemito.items }))
  })
})
