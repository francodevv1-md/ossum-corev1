import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { FichaTabContent } from "@/components/expediente/FichaTabContent"
import { RemitosSummaryCard } from "@/components/expediente/RemitosSummaryCard"
import type { RemitoApiRow } from "@/lib/api/remitos"
import type { Surgery } from "@/types"

const auth = vi.hoisted(() => ({
  activeCompany: { id: "company-test" } as { id: string } | null,
  currentUserLoading: false,
  isAuthenticated: true,
  isLoading: false,
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: async () => "test-token" }))

const technicalId = "surgery-db-test"
const visibleId = "CX-0042"
const surgery: Surgery = {
  id: visibleId, backendId: technicalId, patient: "Test patient", patientDni: "",
  surgeon: "Test doctor", institution: "Test institution", institutionCity: "",
  procedure: "Test procedure", date: "2026-10-06", time: "12:00", state: "Pendiente",
  client: "Test client", classification: "Otro", preparationState: "Sin preparar",
  facturado: false, autorizado: false, urgente: false, leyendaDestacada: false,
  referenciasAdministrativas: [],
}

function remito(index: number, overrides: Partial<RemitoApiRow> = {}): RemitoApiRow {
  return {
    id: `remito-${index}`, visibleNumber: index, companyId: "company-test",
    branchId: "branch-test", issuedBranchId: null, documentType: "remito",
    surgeryId: technicalId, origin: "manual", salidaReason: "cirugia",
    boxId: null, presupuestoId: null, destinatarioContactId: null,
    destinatarioSnapshot: null, shippingAddressSnapshot: null, transportSnapshot: null,
    packageCount: null, declaredValue: null, state: "Emitido",
    issuedAt: "2026-10-06T12:00:00Z", deliveredAt: null, returnedAt: null,
    createdById: null, updatedById: null, metadata: null,
    createdAt: "2026-10-06T11:00:00Z", updatedAt: "2026-10-06T12:00:00Z", items: [],
    ...overrides,
  }
}

function renderFicha(backendId: string | undefined) {
  return render(
    <FichaTabContent
      surgery={{ ...surgery, backendId }} presupuestos={[]} comprobantes={[]}
      remitos={[]} notes={[]} history={[]} onAddNote={vi.fn()} onEditFicha={vi.fn()}
    />
  )
}

function value(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent
}

let rows: RemitoApiRow[] = []
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  rows = []
  auth.activeCompany = { id: "company-test" }
  auth.isLoading = false
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input), "http://localhost")
    const matching = rows.filter((row) => row.surgeryId === url.searchParams.get("surgeryId"))
    return new Response(JSON.stringify({ data: matching.slice(0, Number(url.searchParams.get("take"))) }))
  })
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Remitos summary backend identity and truthful states", () => {
  it("queries the trimmed technical surgery ID, never the visible CX number", async () => {
    rows = [remito(42)]
    renderFicha(` ${technicalId} `)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost")
    expect(url.searchParams.get("surgeryId")).toBe(technicalId)
    expect(url.searchParams.get("surgeryId")).not.toBe(visibleId)
    expect(await screen.findByText("R-0042")).toBeInTheDocument()
  })

  it.each([undefined, "", "   "])("does not fall back to the visible ID when backendId is %j", async (backendId) => {
    renderFicha(backendId)

    expect(screen.getByText("Remitos no disponibles")).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost")
    expect(url.searchParams.get("surgeryId")).toBe("__missing_surgery__")
    expect(value("Cantidad:")).toBe("—")
    expect(screen.queryByText("Sin remitos")).not.toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("shows unavailable rather than empty when there is no active company", async () => {
    auth.activeCompany = null
    render(<RemitosSummaryCard surgeryId={technicalId} />)

    expect(await screen.findByText("Remitos no disponibles")).toBeInTheDocument()
    expect(value("Cantidad:")).toBe("—")
    expect(screen.queryByText("Sin remitos")).not.toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(["auth", "request"])("shows an explicit loading state while %s is pending", (pending) => {
    auth.isLoading = pending === "auth"
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    render(<RemitosSummaryCard surgeryId={technicalId} />)

    expect(screen.getByText("Cargando remitos")).toBeInTheDocument()
    expect(value("Cantidad:")).toBe("…")
    expect(screen.queryByText("Sin remitos")).not.toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("shows API failure rather than an authoritative zero or empty result", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: "No se pudieron cargar los remitos" } }), { status: 503 }))
    render(<RemitosSummaryCard surgeryId={technicalId} />)

    expect(await screen.findByText("No se pudieron cargar los remitos")).toBeInTheDocument()
    expect(value("Cantidad:")).toBe("—")
    expect(value("Último:")).toBe("—")
    expect(screen.queryByText("Sin remitos")).not.toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("supports more than five related remitos using the existing bounded API", async () => {
    rows = Array.from({ length: 8 }, (_, index) => remito(index + 1))
    render(<RemitosSummaryCard surgeryId={technicalId} />)

    await waitFor(() => expect(value("Cantidad:")).toBe("8"))
    expect(screen.getAllByText("8")).toHaveLength(2)
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost")
    expect(url.searchParams.get("take")).toBe("100")
  })

  it.each([100, 101])("reports a lower bound, not an exact total, for %i matching records", async (total) => {
    rows = Array.from({ length: total }, (_, index) => remito(index + 1))
    render(<RemitosSummaryCard surgeryId={technicalId} />)

    await waitFor(() => expect(value("Cantidad:")).toBe("≥100"))
    expect(screen.getAllByText("≥100")).toHaveLength(2)
    expect(screen.queryByText("100")).not.toBeInTheDocument()
  })

  it("shows empty only after a successful empty backend response", async () => {
    render(<RemitosSummaryCard surgeryId={technicalId} />)

    expect(await screen.findByText("Sin remitos")).toBeInTheDocument()
    expect(value("Cantidad:")).toBe("0")
    expect(value("Último:")).toBe("—")
  })

  it("preserves latest number/state selection and navigation", async () => {
    rows = [
      remito(1, { issuedAt: "2026-10-01T12:00:00Z" }),
      remito(42, { issuedAt: "2026-10-05T12:00:00Z", state: "En_transito" }),
      remito(2, { issuedAt: null, createdAt: "2026-10-03T12:00:00Z" }),
    ]
    const onViewRemitos = vi.fn()
    render(<RemitosSummaryCard surgeryId={technicalId} onViewRemitos={onViewRemitos} />)

    expect(await screen.findByText("R-0042")).toBeInTheDocument()
    expect(value("Estado:")).toBe("En transito")
    fireEvent.click(screen.getByRole("button", { name: "Ver remitos" }))
    expect(onViewRemitos).toHaveBeenCalledOnce()
  })
})
