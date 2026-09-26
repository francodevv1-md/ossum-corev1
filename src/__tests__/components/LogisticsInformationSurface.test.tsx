import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Surgery } from "@/types"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn() }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: mocks.useAuth }))

import { LogisticsInformationSurface } from "@/components/expediente/LogisticsInformationSurface"
import { LogisticaTabContent } from "@/components/expediente/LogisticaTabContent"

const projection = {
  generatedAt: "2026-09-08T12:00:00.000Z",
  summary: { expected: "2", assigned: "2", dispatched: "1", consumed: "0", returned: "0", pending: "1", quarantine: "0" },
  assignments: [{ caja: { code: "CAJA-1" }, preparations: [{ status: "COMPLETE", expected: { quantity: "2" }, assigned: { quantity: "2" } }], dispatches: [{ acceptedAt: "2026-09-08T11:00:00.000Z" }] }],
  allocations: [{ assignmentId: "assignment-1", cajaCode: "CAJA-1", expected: { quantity: "2", unit: "u" }, assigned: { quantity: "2" }, dispatched: { quantity: "1" }, consumed: { quantity: "0" }, returned: { quantity: "0" }, pending: { quantity: "1" }, lot: "LOT-1", serial: "SER-1", identifiedCode: "CODE-1", remito: { id: "internal-remito-id" }, blockers: [], differences: [], returns: [], receipt: null, reconciliation: null }],
}

describe("LogisticsInformationSurface", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset()
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-1" } })
  })

  it("mounts the E1-only surface from the Ficha tab", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection)
    render(<LogisticaTabContent surgery={{ backendId: "surgery-1" } as Surgery} remitos={[]} materialTransito={[]} />)
    expect(await screen.findByText("Logística")).toBeInTheDocument()
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company-1/surgeries/surgery-1/logistics/operations")
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1)
  })

  it("renders E1 information with one read request and no operational controls", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection)
    const { container } = render(<LogisticsInformationSurface companyId="company/1" surgeryId="surgery/1" />)
    expect(await screen.findByText("Logística")).toBeInTheDocument()
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1)
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company%2F1/surgeries/surgery%2F1/logistics/operations")
    expect(screen.getByText("CAJA-1")).toBeInTheDocument()
    expect(screen.getByText("No disponible")).toBeInTheDocument()
    expect(screen.queryByText("internal-remito-id")).not.toBeInTheDocument()
    expect(container.querySelectorAll("input, button, form, dialog")).toHaveLength(0)
    expect(container.textContent).not.toMatch(/esc[aá]n|c[aá]mara|preparar|resolver|registrar consumo/i)
  })

  it("uses mobile material cards while retaining the table for desktop", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection)
    const { container } = render(<LogisticsInformationSurface companyId="company-1" surgeryId="surgery-1" />)
    await screen.findByText("Logística")
    expect(screen.getAllByTestId("material-card")).toHaveLength(1)
    expect(screen.getByTestId("material-card")).toHaveTextContent("Caja: CAJA-1")
    expect(screen.getByTestId("material-card")).toHaveTextContent("Material: No disponible")
    const table = container.querySelector("table")
    expect(table).toBeInTheDocument()
    expect(table?.parentElement?.className).toContain("hidden")
    expect(table?.parentElement?.className).toContain("md:block")
    expect(table?.className).toContain("min-w-[720px]")
  })

  it("uses explicit partial and mixed wording without inventing a global status", async () => {
    mocks.apiFetch.mockResolvedValueOnce({ ...projection, assignments: [projection.assignments[0], { caja: { code: "CAJA-2" }, preparations: [{ status: "DRAFT", requiresRecontrol: true }], dispatches: [] }] })
    render(<LogisticsInformationSurface companyId="company-1" surgeryId="surgery-1" />)
    expect(await screen.findAllByText("Resumen mixto")).not.toHaveLength(0)
    expect(screen.getByText("Sin datos de recepción, devolución o conciliación disponibles.")).toBeInTheDocument()
    expect(screen.getByText("Remito: No disponible")).toBeInTheDocument()
  })

  it("renders the empty, error, and stale read states without another endpoint", async () => {
    mocks.apiFetch.mockResolvedValueOnce({ ...projection, allocations: [], assignments: [] }).mockRejectedValueOnce(new Error("network"))
    const { rerender } = render(<LogisticsInformationSurface companyId="company-1" surgeryId="surgery-1" />)
    expect(await screen.findByText(/Todavía no hay preparación ni materiales asignados/i)).toBeInTheDocument()
    rerender(<LogisticsInformationSurface companyId="company-1" surgeryId="surgery-1" freshnessKey={1} />)
    await waitFor(() => expect(screen.getByText(/La información puede no estar al día/i)).toBeInTheDocument())
    expect(mocks.apiFetch.mock.calls.map(([url]) => url)).toEqual(["/api/companies/company-1/surgeries/surgery-1/logistics/operations", "/api/companies/company-1/surgeries/surgery-1/logistics/operations"])
  })

  it("renders no-company, no-server-surgery, and denied-read states", async () => {
    mocks.useAuth.mockReturnValue({ activeCompany: null })
    const { rerender } = render(<LogisticaTabContent surgery={{ backendId: "surgery-1" } as Surgery} remitos={[]} materialTransito={[]} />)
    expect(screen.getByText("Seleccioná una empresa para consultar la logística de esta cirugía.")).toBeInTheDocument()
    expect(mocks.apiFetch).not.toHaveBeenCalled()

    rerender(<LogisticaTabContent surgery={{ backendId: "" } as Surgery} remitos={[]} materialTransito={[]} />)
    expect(screen.getByText("La información logística todavía no está disponible para esta cirugía.")).toBeInTheDocument()

    mocks.apiFetch.mockRejectedValueOnce({ status: 403 })
    rerender(<LogisticsInformationSurface companyId="company-1" surgeryId="surgery-1" />)
    expect(await screen.findByText("No tenés acceso para consultar la información logística de esta cirugía.")).toBeInTheDocument()
  })

  it("renders published return, receipt, and reconciliation facts without raw states", async () => {
    mocks.apiFetch.mockResolvedValueOnce({ ...projection, allocations: [{ ...projection.allocations[0], returns: [{ state: "PENDING_IDENTIFICATION", quantity: "1", unit: "u" }], receipt: { outcome: "FIT", at: "2026-09-08T12:30:00.000Z" }, reconciliation: { kind: "CLOSED", at: "2026-09-08T13:00:00.000Z" } }] })
    render(<LogisticsInformationSurface companyId="company-1" surgeryId="surgery-1" />)
    expect(await screen.findByText(/Devolución: Devolución pendiente de identificación · 1 u/)).toBeInTheDocument()
    expect(screen.getByText(/Recepción: Recepción conforme · .*2026/)).toBeInTheDocument()
    expect(screen.getByText(/Conciliación: Conciliación cerrada · .*2026/)).toBeInTheDocument()
    expect(screen.queryByText("PENDING_IDENTIFICATION")).not.toBeInTheDocument()
    expect(screen.queryByText("Control registrado")).not.toBeInTheDocument()
  })
})
