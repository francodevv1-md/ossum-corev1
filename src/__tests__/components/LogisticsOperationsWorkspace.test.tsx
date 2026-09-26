import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))

import { LogisticsOperationsWorkspace } from "@/components/expediente/LogisticsOperationsWorkspace"

const projection = {
  generatedAt: "2026-09-07T12:00:00.000Z",
  summary: { expected: "2", assigned: "2", dispatched: "1", consumed: "0", returned: "0", pending: "1", quarantine: "0", blockers: "0", differences: "0" },
  assignments: [{ id: "assignment-1", caja: { code: "BOX-1" }, preparations: [{ status: "COMPLETE", version: 1 }], dispatches: [], actions: [] }],
  allocations: [{ id: "allocation-1", assignmentId: "assignment-1", remito: { id: "remito-1" }, expected: { quantity: "2", unit: "UNIT" }, assigned: { quantity: "2" }, dispatched: { quantity: "1" }, consumed: { quantity: "0" }, returned: { quantity: "0" }, pending: { quantity: "1" }, quarantine: { quantity: "0" }, positionId: "position-1", lot: "LOT-1", serial: "SER-1", identifiedCode: "CODE-1", cajaCode: "BOX-1", blockers: [], differences: [], returns: [], lineage: { dispatchId: "dispatch-1" }, snapshots: null, actions: [{ type: "RECORD_CONSUMPTION", command: "consume", method: "POST", route: "/phase-d", targets: { dispatchId: "dispatch-1", dispatchLineId: "line-1" }, permitted: { quantity: "1", unit: "UNIT" }, requiredInputs: ["quantity"], blockers: [], idempotency: { required: true, field: "commandKey" } }] }],
}

describe("LogisticsOperationsWorkspace", () => {
  beforeEach(() => mocks.apiFetch.mockReset())

  it("renders the physical projection and resolves an exact manual scan", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection).mockResolvedValueOnce({ kind: "exact", code: "CODE-1", allocation: { id: "allocation-1" } })
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    expect(await screen.findByText("Control físico de despacho")).toBeInTheDocument()
    expect(screen.getAllByText("BOX-1")).not.toHaveLength(0)
    const scan = screen.getAllByLabelText("Escanear asignación").at(-1)!
    fireEvent.change(scan, { target: { value: "CODE-1" } })
    fireEvent.keyDown(scan, { key: "Enter" })
    expect(await screen.findByText("Asignación seleccionada por escaneo.")).toBeInTheDocument()
  })

  it("submits only the descriptor target and human quantity after confirmation", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection).mockResolvedValueOnce({}).mockResolvedValueOnce(projection)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    fireEvent.click((await screen.findAllByRole("button", { name: "Registrar consumo" }))[0])
    fireEvent.change(screen.getByLabelText("Cantidad (UNIT)"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(3))
    expect(mocks.apiFetch.mock.calls[1][0]).toBe("/phase-d")
    expect(JSON.parse(mocks.apiFetch.mock.calls[1][1].body)).toMatchObject({ action: "consume", dispatchId: "dispatch-1", dispatchLineId: "line-1", quantity: "1" })
    expect(JSON.parse(mocks.apiFetch.mock.calls[1][1].body)).toEqual(expect.objectContaining({ commandKey: expect.any(String) }))
  })

  it("announces a completed mutation and returns focus to its allocation", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection).mockResolvedValueOnce({}).mockResolvedValueOnce(projection)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    fireEvent.click((await screen.findAllByRole("button", { name: "Registrar consumo" }))[0])
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    expect(await screen.findByText(/Operación completada/i)).toHaveAttribute("role", "status")
  })

  it("notifies its host after an authoritative mutation refreshes the projection", async () => {
    const onOperationComplete = vi.fn()
    mocks.apiFetch.mockResolvedValueOnce(projection).mockResolvedValueOnce({}).mockResolvedValueOnce(projection)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" onOperationComplete={onOperationComplete} />)
    fireEvent.click((await screen.findAllByRole("button", { name: "Registrar consumo" }))[0])
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(onOperationComplete).toHaveBeenCalledTimes(1))
  })

  it("renders scanner none and ambiguous states, camera fallback, filtering, and Escape dismissal", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection).mockResolvedValueOnce({ kind: "none", code: "MISS" }).mockResolvedValueOnce({ kind: "ambiguous", code: "DUP", candidates: [{ id: "allocation-1", identifiedCode: "CODE-1", serial: null }] })
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    const scan = (await screen.findAllByLabelText("Escanear asignación")).at(-1)!
    fireEvent.change(scan, { target: { value: "MISS" } }); fireEvent.keyDown(scan, { key: "Enter" })
    expect(await screen.findByText(/No hay una asignación elegible/i)).toBeInTheDocument()
    fireEvent.change(scan, { target: { value: "DUP" } }); fireEvent.keyDown(scan, { key: "Enter" })
    expect(await screen.findByText(/El código es ambiguo/i)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "Registrar consumo" })[0])
    const dialog = await screen.findByRole("dialog")
    await waitFor(() => expect(screen.getByLabelText("Cantidad (UNIT)")).toHaveFocus())
    fireEvent.keyDown(dialog, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Filtrar asignaciones"), { target: { value: "missing" } })
    expect(screen.getByText(/No hay asignaciones que coincidan/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Usar cámara" }))
    expect(await screen.findByText(/Cámara no disponible/i)).toBeInTheDocument()
  })

  it("cycles Tab focus from the final dialog control back to the first control", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    fireEvent.click((await screen.findAllByRole("button", { name: "Registrar consumo" }))[0])
    await waitFor(() => expect(screen.getByLabelText("Cantidad (UNIT)")).toHaveFocus())
    const confirm = await screen.findByRole("button", { name: "Confirmar" })
    confirm.focus()
    fireEvent.keyDown(confirm, { key: "Tab" })
    await waitFor(() => expect(screen.getByLabelText("Cantidad (UNIT)")).toHaveFocus())
  })

  it("renders loading, error retry, stale refresh, and denied capability reason", async () => {
    let resolve!: (value: typeof projection) => void
    mocks.apiFetch.mockReturnValueOnce(new Promise<typeof projection>((done) => { resolve = done }))
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    expect(screen.getByText(/Cargando proyección logística/i)).toBeInTheDocument()
    resolve(projection)
    expect(await screen.findByText("Control físico de despacho")).toBeInTheDocument()
  })

  it("retries an initial error and marks a failed refresh as stale", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new Error("Sin red")).mockResolvedValueOnce(projection).mockRejectedValueOnce(new Error("Sin red"))
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin red")
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(await screen.findByText("Control físico de despacho")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/desactualizada/i)
    expect(mocks.apiFetch).toHaveBeenCalledTimes(3)
  })

  it("renders a projected denied-capability reason", async () => {
    const denied = structuredClone(projection)
    denied.allocations[0].actions = []
    ;(denied.allocations[0] as typeof denied.allocations[number] & { capabilities: Record<string, { allowed: boolean; reason: string | null }> }).capabilities = { RECORD_CONSUMPTION: { allowed: false, reason: "Falta control autorizado" } }
    mocks.apiFetch.mockResolvedValueOnce(denied)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    expect(await screen.findByText("Falta control autorizado")).toBeInTheDocument()
  })

  it("deduplicates restrictions and shows authoritative process details with unavailable fallbacks", async () => {
    const denied = structuredClone(projection)
    ;(denied.allocations[0] as typeof denied.allocations[number] & { capabilities: Record<string, { allowed: boolean; reason: string | null }> }).capabilities = {
      consume: { allowed: false, reason: "Control pendiente" },
      return: { allowed: false, reason: "Control pendiente" },
    }
    mocks.apiFetch.mockResolvedValueOnce(denied)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    expect(await screen.findByText("Restricciones operativas")).toBeInTheDocument()
    expect(screen.getAllByText("Control pendiente")).toHaveLength(1)
    expect(screen.getByText("COMPLETE")).toBeInTheDocument()
    expect(screen.getAllByText("No disponible")).not.toHaveLength(0)
    expect(screen.getAllByText(`Actor: No disponible`)).toHaveLength(5)
  })

  it("uses closed Spanish labels for the operational summary", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    expect((await screen.findAllByText("Esperado")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Asignado").length).toBeGreaterThan(0)
    expect(screen.queryByText("expected")).not.toBeInTheDocument()
    expect(screen.queryByText("assigned")).not.toBeInTheDocument()
  })

  it("places the mobile scanner between next task and process stages", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    await screen.findByText("Control físico de despacho")
    const nextTask = screen.getByText("Siguiente tarea").closest("section")!
    const scanner = screen.getByLabelText("Escanear asignación móvil").closest("section")!
    const stages = screen.getByLabelText("Mapa de proceso")
    expect(nextTask.compareDocumentPosition(scanner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(scanner.compareDocumentPosition(stages) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("returns focus after confirm, cancel, Escape, mutation error, and detached-origin refresh", async () => {
    const next = structuredClone(projection); next.allocations[0].actions = []
    mocks.apiFetch.mockResolvedValueOnce(projection).mockResolvedValueOnce({}).mockResolvedValueOnce(projection).mockRejectedValueOnce(new Error("Falló")).mockResolvedValueOnce(projection).mockResolvedValueOnce({}).mockResolvedValueOnce(next)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    const trigger = (await screen.findAllByRole("button", { name: "Registrar consumo" }))[0]
    trigger.focus(); fireEvent.click(trigger); fireEvent.click(screen.getByRole("button", { name: "Cancelar" })); await waitFor(() => expect(trigger).toHaveFocus())
    trigger.focus(); fireEvent.click(trigger); fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }); await waitFor(() => expect(trigger).toHaveFocus())
    trigger.focus(); fireEvent.click(trigger); fireEvent.click(screen.getByRole("button", { name: "Confirmar" })); await waitFor(() => expect(trigger).toHaveFocus())
    trigger.focus(); fireEvent.click(trigger); fireEvent.click(screen.getByRole("button", { name: "Confirmar" })); await waitFor(() => expect(trigger).toHaveFocus())
    trigger.focus(); fireEvent.click(trigger); fireEvent.click(screen.getByRole("button", { name: "Confirmar" })); await waitFor(() => expect(document.getElementById("allocation-allocation-1")).toHaveFocus())
  })

  it("cycles focus in both directions and prevents background Tab focus", async () => {
    mocks.apiFetch.mockResolvedValueOnce(projection)
    render(<LogisticsOperationsWorkspace companyId="company-1" surgeryId="surgery-1" />)
    const update = await screen.findByRole("button", { name: "Actualizar" })
    fireEvent.click((await screen.findAllByRole("button", { name: "Registrar consumo" }))[0])
    const input = await screen.findByLabelText("Cantidad (UNIT)"); const confirm = screen.getByRole("button", { name: "Confirmar" })
    confirm.focus(); fireEvent.keyDown(confirm, { key: "Tab" }); expect(input).toHaveFocus()
    input.focus(); fireEvent.keyDown(input, { key: "Tab", shiftKey: true }); expect(confirm).toHaveFocus()
    update.focus(); fireEvent.keyDown(update, { key: "Tab" }); expect(update).not.toHaveFocus()
  })
})
