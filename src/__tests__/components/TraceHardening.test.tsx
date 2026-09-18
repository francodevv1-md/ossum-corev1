import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LogisticaTabContent } from "@/components/expediente/LogisticaTabContent"
import { TrazabilidadPanel } from "@/components/expediente/TrazabilidadPanel"
import { useTrazabilidad } from "@/hooks/useTrazabilidad"
import { fetchSurgeryTrace, type TraceResponse } from "@/lib/api/trazabilidad"
import type { Remito, Surgery } from "@/types"

const { apiFetchMock, remitosPanelMock, useAuthMock, useRemitosMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  remitosPanelMock: vi.fn(),
  useAuthMock: vi.fn(),
  useRemitosMock: vi.fn(),
}))

vi.mock("@/lib/api/client", () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiFetch: apiFetchMock,
}))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: useAuthMock }))
vi.mock("@/hooks/useRemitos", () => ({ useRemitos: useRemitosMock }))
vi.mock("@/components/expediente/LogisticaPanel", () => ({ LogisticaPanel: () => null }))
vi.mock("@/components/expediente/MaterialTransitoPanel", () => ({ MaterialTransitoPanel: () => null }))
vi.mock("@/components/expediente/RemitosPanel", () => ({
  RemitosPanel: (props: unknown) => {
    remitosPanelMock(props)
    return null
  },
}))

const surgery = {
  id: "CX-0006",
  backendId: "db-surgery-1",
  expedienteNumber: "CX-0006",
  patient: "Paciente",
  surgeon: "Cirujano",
  institution: "Institución",
  institutionCity: "Ciudad",
} as Surgery

const componentViewports = [["desktop-like", 1280, 800], ["mobile", 412, 915]] as const

function setComponentViewport(width: number, height: number) {
  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: width },
    innerHeight: { configurable: true, value: height },
  })
  window.dispatchEvent(new Event("resize"))
}

const localRemito = {
  id: "R-LOCAL-1",
  surgeryId: surgery.id,
  boxId: "box-local-1",
  destination: "Institución",
  date: "2026-07-16T09:00:00.000Z",
  state: "Enviado",
  items: [{
    stockItemId: "local-item-1",
    name: "Artículo histórico local",
    code: "LOCAL-1",
    sentQuantity: 2,
    consumedQuantity: 0,
    returnedQuantity: 0,
  }],
} as Remito

function traceFor(surgeryId: string, description = "Artículo backend"): TraceResponse {
  return {
    companyId: "company-1",
    surgeryId,
    generatedAt: "2026-07-30T12:00:00.000Z",
    sourceVersion: "v0-derived",
    summary: {
      remitosCount: 1, consumosCount: 0, devolucionesCount: 0, eventsCount: 0,
      itemRowsCount: 1, totalSentQuantity: 1, totalConsumedQuantity: 0,
      totalReturnedQuantity: 0, rowsWithDifference: 1, rowsWithUnknownLotOrSerial: 1,
      hasStockMovements: false,
    },
    timeline: [],
    gaps: [],
    items: [{
      id: `trace-${surgeryId}`, remitoId: "remito-1", remitoItemId: "remito-item-1",
      consumoIds: [], consumoItemIds: [], devolucionIds: [], devolucionItemIds: [],
      description, sentQuantity: 1, consumedQuantity: 0, returnedQuantity: 0,
      pendingQuantity: 1, matchConfidence: "direct", status: "pending",
      sourceFlags: { hasRemito: true, hasConsumo: false, hasDevolucion: false, hasStockMovement: false },
      warnings: [],
    }],
  }
}

describe("Trace backend ID and fallback hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-1" }, currentUserLoading: false,
      isAuthenticated: true, isLoading: false,
    })
    useRemitosMock.mockReturnValue({
      remitos: [], loading: false, ready: true, error: null, blocked: false,
      mutatingId: null, refresh: vi.fn(), emit: vi.fn(), transition: vi.fn(),
    })
  })

  it("keeps the adapter GET-only and addresses the technical backend ID", async () => {
    apiFetchMock.mockResolvedValue(traceFor("db-surgery-1"))

    await fetchSurgeryTrace("company-1", "db-surgery-1", { includeItems: true })

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/companies/company-1/surgeries/db-surgery-1/trace?includeItems=true"
    )
    expect(apiFetchMock.mock.calls[0]).toHaveLength(1)
  })

  it("issues no request for a blank technical ID and never lets an old request replace a new surgery", async () => {
    const pending = new Map<string, (value: TraceResponse) => void>()
    apiFetchMock.mockImplementation((path: string) => new Promise((resolve) => pending.set(path, resolve)))
    const { result, rerender } = renderHook(({ id }) => useTrazabilidad(id), {
      initialProps: { id: "db-old" },
    })

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1))
    rerender({ id: "db-new" })
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.trace).toBeNull())

    await act(async () => pending.get("/api/companies/company-1/surgeries/db-new/trace")?.(traceFor("db-new")))
    await waitFor(() => expect(result.current.trace?.surgeryId).toBe("db-new"))
    await act(async () => pending.get("/api/companies/company-1/surgeries/db-old/trace")?.(traceFor("db-old")))
    expect(result.current.trace?.surgeryId).toBe("db-new")

    rerender({ id: "   " })
    await waitFor(() => expect(result.current.failureReason).toBe("technical_id_missing"))
    expect(result.current.trace).toBeNull()
    expect(apiFetchMock).toHaveBeenCalledTimes(2)
  })

  it("uses backendId in both Trace callers and sends no visible ID when backendId is blank", async () => {
    apiFetchMock.mockResolvedValue(traceFor("db-surgery-1"))
    const view = render(
      <>
        <TrazabilidadPanel surgery={surgery} remitos={[]} />
        <LogisticaTabContent surgery={surgery} remitos={[]} materialTransito={[]} />
      </>
    )
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2))
    expect(apiFetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/companies/company-1/surgeries/db-surgery-1/trace",
      "/api/companies/company-1/surgeries/db-surgery-1/trace",
    ])
    expect(useRemitosMock).toHaveBeenCalledWith({ surgeryId: "db-surgery-1", take: 100 })
    expect(useRemitosMock).not.toHaveBeenCalledWith({ surgeryId: surgery.id, take: 100 })

    apiFetchMock.mockClear()
    useRemitosMock.mockClear()
    view.rerender(
      <>
        <TrazabilidadPanel surgery={{ ...surgery, backendId: "   " }} remitos={[]} />
        <LogisticaTabContent surgery={{ ...surgery, backendId: "   " }} remitos={[]} materialTransito={[]} />
      </>
    )
    await waitFor(() => expect(screen.getByText("Sin datos de trazabilidad")).toBeInTheDocument())
    expect(apiFetchMock).not.toHaveBeenCalled()
    expect(useRemitosMock).not.toHaveBeenCalled()
  })

  it("shows local legacy data as display-only fallback without requesting a blank backendId", async () => {
    render(<TrazabilidadPanel surgery={{ ...surgery, backendId: "   " }} remitos={[localRemito]} />)

    expect(await screen.findByText("Histórico local · no autoritativo")).toBeVisible()
    expect(screen.getByText(/solo visualización/i)).toBeVisible()
    expect(screen.getByText("Artículo histórico local")).toBeVisible()
    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it.each(componentViewports)("does not feed local fallback quantities into Logística at %s viewport", async (_name, width, height) => {
    setComponentViewport(width, height)
    apiFetchMock.mockRejectedValue(new Error("offline"))
    useRemitosMock.mockReturnValue({
      remitos: [{
        id: "backend-remito-1", visibleNumber: 9, surgeryId: "db-surgery-1", boxId: null,
        state: "Entregado", createdAt: "2026-07-30T12:00:00.000Z", destinatarioSnapshot: { nombre: "Hospital" },
        items: [{ id: "backend-item-1", itemId: "stock-1", sku: "BACK-1", description: "Artículo backend remito", quantity: 7 }],
      }],
      loading: false, ready: true, error: null, blocked: false, mutatingId: null,
      refresh: vi.fn(), emit: vi.fn(), transition: vi.fn(),
    })

    render(<LogisticaTabContent surgery={surgery} remitos={[localRemito]} materialTransito={[]} />)

    await waitFor(() => expect(remitosPanelMock).toHaveBeenCalled())
    expect(remitosPanelMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      remitos: [expect.objectContaining({
        items: [expect.objectContaining({ sentQuantity: 7, consumedQuantity: 0, returnedQuantity: 0 })],
      })],
    }))
    expect(remitosPanelMock.mock.calls.at(-1)?.[0]).not.toEqual(expect.objectContaining({
      remitos: [expect.objectContaining({ items: [expect.objectContaining({ sentQuantity: 2 })] })],
    }))
  })

  it.each(componentViewports)("provides accessible fallback and retry component evidence at %s viewport", async (_name, width, height) => {
    setComponentViewport(width, height)
    apiFetchMock.mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(traceFor("db-surgery-1"))
    render(<TrazabilidadPanel surgery={surgery} remitos={[localRemito]} />)

    expect(await screen.findByText("Histórico local · no autoritativo")).toBeVisible()
    expect(screen.getByText(/solo visualización/i)).toBeVisible()
    expect(screen.getByText("Artículo histórico local")).toBeVisible()
    expect(screen.queryByText("Artículo backend")).not.toBeInTheDocument()

    const retry = screen.getByRole("button", { name: "Reintentar trazabilidad" })
    expect(retry).toBeVisible()
    expect(retry).toBeEnabled()
    fireEvent.click(retry)
    expect(await screen.findByText("Artículo backend")).toBeInTheDocument()
    expect(screen.queryByText("Histórico local · no autoritativo")).not.toBeInTheDocument()
    expect(screen.queryByText("Artículo histórico local")).not.toBeInTheDocument()
  })
})
