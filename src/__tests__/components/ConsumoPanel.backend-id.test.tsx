import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConsumoPanel } from "@/components/expediente/ConsumoPanel"
import type { Surgery } from "@/types"

const { createDraftMock, useConsumosMock, useRemitosMock, useTrazabilidadMock, devolucionesPanelMock } = vi.hoisted(() => ({
  createDraftMock: vi.fn(),
  useConsumosMock: vi.fn(),
  useRemitosMock: vi.fn(),
  useTrazabilidadMock: vi.fn(),
  devolucionesPanelMock: vi.fn(),
}))

vi.mock("@/hooks/useConsumos", () => ({ useConsumos: useConsumosMock }))
vi.mock("@/hooks/useRemitos", () => ({ useRemitos: useRemitosMock }))
vi.mock("@/hooks/useTrazabilidad", () => ({ useTrazabilidad: useTrazabilidadMock }))
vi.mock("@/components/expediente/DevolucionesPanel", () => ({
  DevolucionesPanel: (props: { surgeryId: string }) => {
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

describe("ConsumoPanel backend surgery ID", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createDraftMock.mockResolvedValue({ id: "consumo-1", visibleNumber: 1 })
    useConsumosMock.mockReturnValue({
      consumos: [], loading: false, ready: true, error: null, blocked: false, mutatingId: null,
      refresh: vi.fn(), createDraft: createDraftMock, emit: vi.fn(), validate: vi.fn(), removeDraft: vi.fn(),
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
})
