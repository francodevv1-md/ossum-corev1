import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Surgery } from "@/types"
import type { PresupuestoApiRow } from "@/lib/api/presupuestos"

const mocks = vi.hoisted(() => ({
  company: { id: "company-dev", name: "Synthetic DEV" },
  surgeries: [] as Surgery[], success: vi.fn(), error: vi.fn(), submit: vi.fn(),
}))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: mocks.company }) }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: async () => null }))
vi.mock("@/components/layout/app-shell", () => ({ useExpedienteDrawer: () => ({ openExpediente: vi.fn() }) }))
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: () => ({ surgeries: mocks.surgeries, getSurgeryById: (id: string) => mocks.surgeries.find(s => s.id === id) }) }))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))
import { PresupuestoFormDialog } from "@/components/presupuestos/PresupuestoFormDialog"
import PresupuestosPage from "@/app/ventas/presupuestos/page"

function fixture(): PresupuestoApiRow {
  return {
    id: "budget-edit", visibleNumber: null, companyId: "company-dev", familyId: "budget-edit", surgeryId: "backend-surgery",
    branchId: "branch-dev", clientContactId: "client-dev", payerContactId: "payer-dev", parentPresupuestoId: null, sourcePresupuestoId: null,
    versionNumber: 1, slot: "DRAFT", revision: 7, state: "Borrador", title: "Persisted title", currency: "USD",
    documentDate: "2026-10-02", paymentTerms: "30 días", priceListCode: "LP-OSDE-2026-04", legend: "Original commercial legend",
    notes: "Persisted observation", generalDiscountRate: "0", commercialSnapshot: { immutable: "snapshot" },
    commercial: { pricingMode: "FIRM", firmPrice: { coordinator: "DEV", quotationContact: "DEV", includedMaterials: ["implant"],
      excludedMaterials: [], availability: "DEV", operationalClarifications: "Synthetic", surgicalAssumptions: "Synthetic" } },
    client: "OSDE Binario", financiador: "DEV payer", patient: "Synthetic patient", institution: "Hospital DEV", vendedor: "Sin asignar",
    subtotal: "200", discountTotal: "5", taxTotal: "40.95", total: "235.95", validUntil: "2026-11-01T15:00:00.000Z",
    issuedAt: null, approvedAt: null, rejectedAt: null, createdById: "actor-dev", updatedById: null,
    metadata: { client: "OSDE Binario", patient: "Synthetic patient", institution: "Hospital DEV", vendedor: "Sin asignar", vigencia: "30 días",
      commercialSnapshot: { immutable: "snapshot" }, customCommercial: { preserve: true }, obraSocial: "DEV coverage", writeRevision: 7 },
    createdAt: "2026-10-02T10:00:00.000Z", updatedAt: "2026-10-02T11:00:00.000Z", actions: ["edit", "emit", "delete", "annul"],
    items: [{ id: "item-original", position: 1, sku: "QA-original", description: "Persisted item", quantity: "2", unit: "u", unitPrice: "100",
      discountRate: "2.5", discount: "5", taxRate: "21", tax: "40.95", vatRate: "21", vatTreatment: "GRAVADO", total: "235.95",
      metadata: { originalLot: "Synthetic-Lot", custom: { keep: true } } }],
  }
}
const surgery = { id: "CX-visible", backendId: "backend-surgery", patient: "Synthetic patient", client: "OSDE Binario",
  institution: "Hospital DEV", vendedor: "Sin asignar", state: "Pendiente" } as Surgery
function response(data: unknown, status = 200) { return new Response(JSON.stringify({ data }), { status }) }
function failure(status: number) { return new Response(JSON.stringify({ error: { code: "presupuesto_revision_conflict", message: "Synthetic rejection" } }), { status }) }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(accept => { resolve = accept })
  return { promise, resolve }
}
let http: ReturnType<typeof vi.fn<typeof fetch>>
async function choose(placeholder: string, option: string) {
  const button = screen.getByText(placeholder).closest("button")!
  fireEvent.keyDown(button, { key: "Enter" })
  fireEvent.click(await screen.findByRole("option", { name: option }))
}
async function fillNewForm() {
  await screen.findByDisplayValue("Synthetic patient")
  await choose("Seleccionar vigencia", "30 días")
  await choose("Seleccionar LP", "LP-OSDE-2026-04")
  fireEvent.click(screen.getByRole("button", { name: "Agregar artículo" }))
  fireEvent.change(screen.getByPlaceholderText("Buscar artículo..."), { target: { value: "Synthetic item" } })
  fireEvent.change(screen.getByPlaceholderText("$0"), { target: { value: "100" } })
}
function edit() { return render(<PresupuestoFormDialog mode="dialog" context="independent" presupuestoId="budget-edit" open onSubmit={mocks.submit} />) }

describe("presupuesto connected form and sales edit through real hook/client + HTTP", () => {
  beforeEach(() => {
    mocks.company = { id: "company-dev", name: "Synthetic DEV" }
    mocks.surgeries = [surgery]
    mocks.success.mockReset(); mocks.error.mockReset(); mocks.submit.mockReset()
    http = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => response(init?.method === "PATCH" ? { ...fixture(), revision: 8 } : fixture()))
    vi.stubGlobal("fetch", http)
    vi.stubGlobal("PointerEvent", MouseEvent)
    Element.prototype.scrollIntoView = vi.fn()
    vi.spyOn(window, "confirm").mockReturnValue(true)
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it("sends backendId rather than the deliberately different visible surgery ID", async () => {
    render(<PresupuestoFormDialog mode="dialog" context="surgery" surgeryId="CX-visible" open onSubmit={mocks.submit} />)
    await fillNewForm()
    fireEvent.click(screen.getByRole("button", { name: "Guardar presupuesto" }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))
    expect(http).toHaveBeenCalledTimes(1)
    expect(http.mock.calls[0][0]).toBe("/api/companies/company-dev/presupuestos")
    expect(JSON.parse(http.mock.calls[0][1]!.body as string).surgeryId).toBe("backend-surgery")
  })

  it("rejects selected surgery without backend identity, preserving form and never POSTing", async () => {
    mocks.surgeries = [{ ...surgery, backendId: undefined }]
    render(<PresupuestoFormDialog mode="dialog" context="surgery" surgeryId="CX-visible" open onSubmit={mocks.submit} />)
    await fillNewForm()
    fireEvent.click(screen.getByRole("button", { name: "Guardar presupuesto" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("no tiene identidad backend")
    expect(screen.getByPlaceholderText("Buscar artículo...")).toHaveValue("Synthetic item")
    expect(http).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it("hydrates persisted fields/items and sends displayed revision with commercial information intact", async () => {
    edit()
    await screen.findByDisplayValue("Persisted title")
    expect(screen.getByPlaceholderText("Buscar artículo...")).toHaveValue("Persisted item")
    expect(screen.getByPlaceholderText("$0")).toHaveValue(100)
    fireEvent.change(screen.getByPlaceholderText("Observaciones del presupuesto..."), { target: { value: "Edited observation" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar presupuesto" }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))
    expect(http).toHaveBeenCalledTimes(2) // GET only at open, no silent fresh-revision GET at save.
    expect(http.mock.calls[0][0]).toBe("/api/companies/company-dev/presupuestos/budget-edit")
    const patch = JSON.parse(http.mock.calls[1][1]!.body as string)
    expect(patch).toMatchObject({ expectedRevision: 7, notes: "Edited observation", branchId: "branch-dev", clientContactId: "client-dev",
      payerContactId: "payer-dev", currency: "USD", legend: fixture().legend, validUntil: fixture().validUntil, commercial: fixture().commercial,
      metadata: { customCommercial: { preserve: true }, commercialSnapshot: { immutable: "snapshot" } },
      items: [{ description: "Persisted item", quantity: "2", unitPrice: "100", discount: "5", tax: "40.95", unit: "u",
        metadata: { originalLot: "Synthetic-Lot", custom: { keep: true } } }] })
    expect(patch).not.toHaveProperty("surgeryId")
  })

  it.each(["conflict", "server", "network"])("preserves dirty draft on %s without success or revision refresh", async (kind) => {
    http.mockResolvedValueOnce(response(fixture()))
    if (kind === "network") http.mockRejectedValueOnce(new Error("offline"))
    else http.mockResolvedValueOnce(failure(kind === "conflict" ? 409 : 500))
    edit()
    await screen.findByDisplayValue("Persisted title")
    fireEvent.change(screen.getByPlaceholderText("Observaciones del presupuesto..."), { target: { value: "Unsaved draft to keep" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar presupuesto" }))
    await screen.findByRole("alert")
    expect(screen.getByPlaceholderText("Observaciones del presupuesto...")).toHaveValue("Unsaved draft to keep")
    expect(screen.getByPlaceholderText("Buscar artículo...")).toHaveValue("Persisted item")
    expect(http).toHaveBeenCalledTimes(2)
    expect(mocks.success).not.toHaveBeenCalled(); expect(mocks.submit).not.toHaveBeenCalled()
    if (kind === "conflict") expect(screen.getByRole("button", { name: "Guardar presupuesto" })).toBeDisabled()
  })

  it("preserves source metadata when one row is removed and other rows are edited", async () => {
    const data = fixture()
    data.items.push({ ...data.items[0], id: "item-second", position: 2, description: "Second persisted item", metadata: { rowIdentity: "second" } })
    data.subtotal = "400"; data.discountTotal = "10"; data.taxTotal = "81.9"; data.total = "471.9"
    http.mockResolvedValueOnce(response(data)).mockResolvedValueOnce(response({ ...data, revision: 8 }))
    edit()
    await screen.findByDisplayValue("Second persisted item")
    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar artículo" })[0])
    fireEvent.change(screen.getByPlaceholderText("$0"), { target: { value: "120" } })
    fireEvent.change(screen.getByPlaceholderText("Buscar artículo..."), { target: { value: "Renamed second item" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar presupuesto" }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalled())
    const patch = JSON.parse(http.mock.calls[1][1]!.body as string)
    expect(patch.items).toHaveLength(1)
    expect(patch.items[0]).toMatchObject({ description: "Renamed second item", unitPrice: 120, metadata: { rowIdentity: "second" } })
    expect(patch.items[0].metadata).not.toHaveProperty("originalLot")
  })

  it("blocks editing when the GET is failed or state is no longer Borrador", async () => {
    http.mockResolvedValue(response({ ...fixture(), state: "Emitido", actions: ["approve"] }))
    edit()
    expect(await screen.findByRole("alert")).toHaveTextContent("ya no es un borrador")
    expect(screen.queryByRole("button", { name: "Guardar presupuesto" })).not.toBeInTheDocument()
    expect(http).toHaveBeenCalledTimes(1)
  })

  it("protects input from late hydration after a company switch", async () => {
    const old = deferred<Response>()
    http.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response({ ...fixture(), companyId: "other", title: "New company title" }))
    const view = edit()
    mocks.company = { id: "other", name: "Other DEV" }
    view.rerender(<PresupuestoFormDialog mode="dialog" context="independent" presupuestoId="budget-edit" open onSubmit={mocks.submit} />)
    await screen.findByDisplayValue("New company title")
    await act(async () => old.resolve(response(fixture())))
    expect(screen.queryByDisplayValue("Persisted title")).not.toBeInTheDocument()
  })

  it("blocks duplicate saves while the PATCH is pending", async () => {
    const pending = deferred<Response>()
    http.mockResolvedValueOnce(response(fixture())).mockReturnValueOnce(pending.promise)
    edit()
    await screen.findByDisplayValue("Persisted title")
    const button = screen.getByRole("button", { name: "Guardar presupuesto" })
    fireEvent.click(button); fireEvent.click(button)
    await waitFor(() => expect(http).toHaveBeenCalledTimes(2))
    expect(button).toBeDisabled(); expect(mocks.success).not.toHaveBeenCalled()
    await act(async () => pending.resolve(response({ ...fixture(), revision: 8 })))
    expect(mocks.submit).toHaveBeenCalledTimes(1)
  })

  it("sales Editar borrador action opens the real persisted editor", async () => {
    http.mockImplementation(async url => response(String(url).split('?')[0].endsWith('/presupuestos') ? [fixture()] : fixture()))
    render(<PresupuestosPage />)
    const row = (await screen.findByText("budget-e", { exact: true })).closest("tr")!
    fireEvent.keyDown(within(row).getAllByRole("button")[1], { key: "Enter" })
    fireEvent.click(await screen.findByRole("menuitem", { name: "Editar borrador" }))
    expect(await screen.findByDisplayValue("Persisted title")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Editar Presupuesto" })).toBeVisible()
    expect(http.mock.calls.some(([url]) => url === "/api/companies/company-dev/presupuestos/budget-edit")).toBe(true)
  })
})
