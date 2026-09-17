import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), surgeries: vi.fn(), store: vi.fn(), success: vi.fn(), error: vi.fn(), companyId: "company-1", role: "admin" }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.fetch }))
vi.mock("@/lib/api/backend-surgeries", () => ({ fetchBackendActiveSurgeries: mocks.surgeries }))
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: mocks.store }))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: mocks.companyId }, currentAccess: { role: mocks.role } }) }))
vi.mock("@/components/shared", () => ({
  SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />,
  FilterSelect: ({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) => <select aria-label="Estado" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>,
}))

import PresupuestosPage from "@/app/ventas/presupuestos/page"
import { SalesPresupuestoFormDialog } from "@/components/presupuestos/SalesPresupuestoFormDialog"
import { DISTRICORR_ESTIMATIVE_LEGEND, type PresupuestoApiRow } from "@/lib/api/presupuestos"
import { derivePendingInvoiceCandidates } from "@/hooks/usePendingInvoiceSources"
import { presupuestoReplaceDraftSchema } from "@/lib/validators/presupuesto"

const firmPrice = { coordinator: "Coordinator", quotationContact: "Contact", includedMaterials: ["Implant", "Screw"], excludedMaterials: ["Kit"], availability: "Confirmed", operationalClarifications: "Freight excluded", surgicalAssumptions: "One procedure" }
const budget = (overrides: Partial<PresupuestoApiRow> = {}): PresupuestoApiRow => ({
  id: "budget-1", companyId: "company-1", familyId: "family-1", surgeryId: "surgery-backend", visibleNumber: null,
  branchId: "branch-1", clientContactId: "client-1", payerContactId: "payer-1", parentPresupuestoId: null, sourcePresupuestoId: null,
  versionNumber: 1, revision: 4, slot: "DRAFT", state: "Borrador", title: "Backend quotation", currency: "USD",
  documentDate: "2026-09-01T15:12:34.000Z", validUntil: "2026-11-12T17:45:00.000Z", paymentTerms: "45 days", priceListCode: "CUSTOM-USD",
  legend: "Firm legend retained", notes: "Existing notes", generalDiscountRate: "5.5",
  commercialSnapshot: { pricingMode: "FIRM", firmPrice, client: { legalName: "Client backend" }, payer: { legalName: "Payer backend" }, branch: { name: "Centro" } },
  subtotal: "200", discountTotal: "29", taxTotal: "35.91", total: "206.91", issuedAt: null, approvedAt: null, rejectedAt: null, createdById: "actor", updatedById: "actor", metadata: null, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
  items: [{ id: "line-1", position: 1, sku: "I-1", description: "Implant backend", quantity: "2", unit: "box", unitPrice: "100", discountRate: "10", discount: "20", taxRate: "21", tax: "35.91", total: "206.91", metadata: { catalogItemId: "persisted-reference", trace: { lot: "L-1" } } }],
  actions: ["edit", "delete", "emit"], ...overrides,
})
let rows: PresupuestoApiRow[]
let command: (url: string, init: RequestInit) => Promise<unknown>
const writes = () => mocks.fetch.mock.calls.filter(([, init]) => init?.method)
const body = (index = 0) => JSON.parse(writes()[index][1].body)
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
function fillNew() {
  for (const [label, value] of Object.entries({ Sucursal: "branch-1", Cliente: "client-1", Pagador: "payer-1", Cirugía: "surgery-backend", Concepto: "Entered title", "Fecha del documento": "2026-09-16", "Válido hasta": "2026-10-30", "Condición de pago": "30 days", "Lista de precios": "EXPLICIT", "Descripción 1": "Free implant", "Precio unitario 1": "120", "IVA (%) 1": "21" })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
}
async function openNew() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo presupuesto" })).toBeEnabled())
  fireEvent.click(screen.getByRole("button", { name: "Nuevo presupuesto" }))
  await screen.findByRole("option", { name: "Centro" })
}
async function save() { fireEvent.click(screen.getByRole("button", { name: "Guardar presupuesto" })) }

describe("Sales actual rendered page and isolated form", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.companyId = "company-1"; mocks.role = "admin"; rows = []
    command = async () => budget()
    mocks.surgeries.mockResolvedValue([
      { id: "CX-VISIBLE", backendId: "surgery-backend", patient: "Backend patient", state: "Programada" },
      { id: "CX-CANCELLED", backendId: "cancelled", patient: "Cancelled", state: "Cancelada" },
      { id: "CX-SUSPENDED", backendId: "suspended", patient: "Suspended", state: "Suspendida" },
      { id: "local-only", patient: "No backend ID", state: "Programada" },
    ])
    mocks.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method) return command(url, init)
      if (url.endsWith("/branches")) return [{ id: "branch-1", name: "Centro" }]
      if (url.includes("/contacts?")) return [{ id: "client-1", legalName: "Client backend" }, { id: "payer-1", legalName: "Payer backend" }]
      if (url.includes("/presupuestos?")) return rows
      return rows.find((row) => url.endsWith(`/${row.id}`)) ?? budget()
    })
  })

  it("retains real create values on 409 without retry, uses backendId and explicit canonical inputs", async () => {
    command = async () => { throw Object.assign(new Error("409 presupuesto_conflict"), { status: 409 }) }
    render(<PresupuestosPage />)
    await openNew()
    expect(screen.queryByRole("option", { name: /CANCELLED|SUSPENDED|local-only/ })).not.toBeInTheDocument()
    fillNew()
    await save()
    await screen.findByText(/409 presupuesto_conflict.*Los datos/)
    expect(screen.getByLabelText("Concepto")).toHaveValue("Entered title")
    expect(screen.getByLabelText("Descripción 1")).toHaveValue("Free implant")
    expect(writes()).toHaveLength(1)
    expect(body()).toMatchObject({ surgeryId: "surgery-backend", branchId: "branch-1", clientContactId: "client-1", payerContactId: "payer-1", documentDate: "2026-09-16", validUntil: "2026-10-30", commercial: { pricingMode: "ESTIMATIVE" }, legend: DISTRICORR_ESTIMATIVE_LEGEND, items: [expect.objectContaining({ description: "Free implant", taxRate: "21" })] })
    expect(body()).not.toHaveProperty("companyId")
    expect(body()).not.toHaveProperty("total")
    expect(body()).not.toHaveProperty("state")
    expect(body()).not.toHaveProperty("versionNumber")
    expect(mocks.store).not.toHaveBeenCalled()
    expect(mocks.surgeries).toHaveBeenCalledWith("company-1")
  })

  it("preserves FIRM, currency, exact dates, legend, units and nested metadata on edit failure and explicit retry", async () => {
    rows = [budget()]
    command = async () => { throw new Error("PATCH failed") }
    render(<PresupuestosPage />)
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }))
    await screen.findByLabelText("Coordinador")
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar presupuesto" })).toBeEnabled())
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Edited title" } })
    await save()
    await screen.findByText(/PATCH failed.*Los datos/)
    expect(screen.getByLabelText("Concepto")).toHaveValue("Edited title")
    expect(body()).toMatchObject({ expectedRevision: 4, currency: "USD", documentDate: budget().documentDate, validUntil: budget().validUntil, legend: "Firm legend retained", commercial: { pricingMode: "FIRM", firmPrice }, generalDiscountRate: "5.5", items: [expect.objectContaining({ unit: "box", metadata: budget().items[0].metadata, taxRate: "21", discountRate: "10" })] })
    expect(body()).not.toHaveProperty("surgeryId")
    expect(body().commercial).not.toHaveProperty("client")
    command = async () => { rows = [budget({ title: "Edited title", revision: 5 })]; return rows[0] }
    await save()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(writes()).toHaveLength(2)
    expect(body(1).expectedRevision).toBe(4)
    expect(await screen.findByText("Edited title")).toBeInTheDocument()
  })

  it.each([
    { name: "cleared fields", included: "", excluded: "", expectedIncluded: [], expectedExcluded: [] },
    { name: "trailing and whitespace-only lines", included: "  Implant  \n\n Screw \n  \n", excluded: " Kit \n\t\n", expectedIncluded: ["Implant", "Screw"], expectedExcluded: ["Kit"] },
  ])("submits canonical FIRM materials for $name without changing raw textarea edits", async ({ included, excluded, expectedIncluded, expectedExcluded }) => {
    rows = [budget()]
    let validation: ReturnType<typeof presupuestoReplaceDraftSchema.safeParse> | undefined
    command = async (_url, init) => {
      validation = presupuestoReplaceDraftSchema.safeParse(JSON.parse(init.body as string))
      // Retain the editor to also prove submission never normalizes its raw state.
      throw new Error("Retain editor after validation")
    }
    render(<PresupuestosPage />)
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar presupuesto" })).toBeEnabled())
    expect(screen.getByLabelText("Materiales incluidos")).toHaveValue("Implant\nScrew")
    expect(screen.getByLabelText("Materiales excluidos")).toHaveValue("Kit")
    fireEvent.change(screen.getByLabelText("Materiales incluidos"), { target: { value: included } })
    fireEvent.change(screen.getByLabelText("Materiales excluidos"), { target: { value: excluded } })
    expect(screen.getByLabelText("Materiales incluidos")).toHaveValue(included)
    expect(screen.getByLabelText("Materiales excluidos")).toHaveValue(excluded)
    await save()
    await screen.findByText(/Retain editor after validation.*Los datos/)
    expect(validation?.error?.issues ?? []).toEqual([])
    expect(validation?.success).toBe(true)
    expect(body().commercial.firmPrice).toEqual({ ...firmPrice, includedMaterials: expectedIncluded, excludedMaterials: expectedExcluded })
    expect(body()).toMatchObject({ expectedRevision: 4, currency: "USD", documentDate: budget().documentDate, validUntil: budget().validUntil, legend: budget().legend })
    expect(screen.getByLabelText("Materiales incluidos")).toHaveValue(included)
    expect(screen.getByLabelText("Materiales excluidos")).toHaveValue(excluded)
    expect(firmPrice.includedMaterials).toEqual(["Implant", "Screw"])
    expect(firmPrice.excludedMaterials).toEqual(["Kit"])
    expect(writes()).toHaveLength(1)
  })

  it("closes a successful create even if refresh fails; retry is GET only", async () => {
    render(<PresupuestosPage />)
    await openNew(); fillNew()
    command = async () => {
      mocks.fetch.mockRejectedValue(new Error("refresh offline"))
      return budget()
    }
    await save()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(await screen.findByText(/Operación guardada/)).toBeInTheDocument()
    expect(writes()).toHaveLength(1)
    mocks.fetch.mockResolvedValue([])
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }))
    await screen.findByText("No hay presupuestos para mostrar.")
    expect(writes()).toHaveLength(1)
  })

  it("drives emit/approve/revise from backend actions/revisions and reloads persisted current/history", async () => {
    rows = [budget()]
    command = async (url) => {
      if (url.endsWith("/emitir")) rows = rows[0].slot === "DRAFT" && rows[0].versionNumber === 1
        ? [budget({ state: "Emitido", slot: "CURRENT", revision: 5, visibleNumber: 42, actions: ["approve", "revise"] })]
        : [budget({ id: "revision-2", versionNumber: 2, state: "Emitido", slot: "CURRENT", revision: 2, visibleNumber: 42, actions: ["approve"] }), budget({ state: "Reemplazado", slot: "HISTORY", revision: 7, visibleNumber: 42, actions: [] })]
      else if (url.endsWith("/state")) rows = [budget({ state: "Aprobado", slot: "CURRENT", revision: 6, visibleNumber: 42, actions: ["revise"] })]
      else if (url.endsWith("/versions")) rows = [...rows, budget({ id: "revision-2", sourcePresupuestoId: "budget-1", versionNumber: 2, revision: 1, actions: ["emit", "edit"] })]
      return rows[rows.length - 1]
    }
    const view = render(<PresupuestosPage />)
    fireEvent.click(await screen.findByRole("button", { name: "Emitir" }))
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }))
    await screen.findByText("Aprobado")
    expect(derivePendingInvoiceCandidates("company-1", rows, [], [])).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Pendientes de facturar" })).toHaveAttribute("href", "/ventas/pendientes-facturar")
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }))
    fireEvent.click(await screen.findByRole("button", { name: "Emitir" }))
    await screen.findByText("Reemplazado")
    expect(writes().map(([, init]) => JSON.parse(init.body))).toEqual([{ expectedRevision: 4 }, { command: "approve", expectedRevision: 5 }, { expectedRevision: 6 }, { expectedRevision: 1 }])
    view.unmount(); render(<PresupuestosPage />)
    expect(await screen.findByText("Reemplazado")).toBeInTheDocument()
    expect(screen.getByText("v1 · HISTORY · r7")).toBeInTheDocument()
    expect(screen.getByText("v2 · CURRENT · r2")).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "Detalle" })[0])
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Ítems persistidos")).toBeInTheDocument()
    expect(within(dialog).getByText("USD 206,91", { selector: "dd" })).toBeInTheDocument()
    expect(within(dialog).getByText("Freight excluded")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: /v1 · Reemplazado · HISTORY/ })).toBeInTheDocument()
    expect(derivePendingInvoiceCandidates("company-1", rows, [], [])).toEqual([])
  })

  it("does not duplicate commands and ignores old-company completion/toast", async () => {
    rows = [budget()]
    const pending = deferred<PresupuestoApiRow>()
    command = () => pending.promise
    const view = render(<PresupuestosPage />)
    const emit = await screen.findByRole("button", { name: "Emitir" })
    fireEvent.click(emit); fireEvent.click(emit)
    expect(writes()).toHaveLength(1)
    expect(emit).toBeDisabled()
    mocks.companyId = "company-2"; rows = []
    view.rerender(<PresupuestosPage />)
    await screen.findByText("No hay presupuestos para mostrar.")
    await act(async () => { pending.resolve(budget()) })
    expect(mocks.success).not.toHaveBeenCalled()
    expect(screen.queryByText("Backend quotation")).not.toBeInTheDocument()
  })

  it("does not open stale-company detail or edit a row whose backend actions changed", async () => {
    rows = [budget()]
    const fetch = mocks.fetch.getMockImplementation()!
    mocks.fetch.mockImplementation((url: string, init?: RequestInit) => url.endsWith("/budget-1") ? Promise.resolve(budget({ actions: [] })) : fetch(url, init))
    const view = render(<PresupuestosPage />)
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }))
    await screen.findByText(/ya no permite edición/)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    const pending = deferred<PresupuestoApiRow>()
    mocks.fetch.mockImplementation((url: string, init?: RequestInit) => url.endsWith("/budget-1") ? pending.promise : fetch(url, init))
    fireEvent.click(screen.getByRole("button", { name: "Detalle" }))
    mocks.companyId = "company-2"; rows = []
    view.rerender(<PresupuestosPage />)
    await act(async () => { pending.resolve(budget()) })
    await screen.findByText("No hay presupuestos para mostrar.")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("drops old form selections and ignores stale catalogs on a company switch", async () => {
    const oldCatalog = deferred<unknown>()
    mocks.fetch.mockImplementation((url: string) => {
      if (url.includes("company-1/contacts")) return oldCatalog.promise
      return Promise.resolve(url.endsWith("branches") ? [{ id: "branch-1", name: "Centro" }] : [])
    })
    const view = render(<SalesPresupuestoFormDialog companyId="company-1" linkedSurgeryIds={[]} onSave={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Old draft" } })
    view.rerender(<SalesPresupuestoFormDialog companyId="company-2" linkedSurgeryIds={[]} onSave={vi.fn()} onClose={vi.fn()} />)
    await screen.findByText(/No hay sucursales o contactos/)
    await act(async () => { oldCatalog.resolve([{ id: "old-contact", legalName: "OLD CONTACT" }]) })
    expect(screen.queryByRole("option", { name: "OLD CONTACT" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Concepto")).toHaveValue("")
    expect(screen.getByLabelText("Cliente")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Guardar presupuesto" })).toBeDisabled()
  })

  it("keeps form text during catalog failure/retry and disables empty catalogs", async () => {
    const fetch = mocks.fetch.getMockImplementation()!
    mocks.fetch.mockImplementation((url: string, init?: RequestInit) => url.endsWith("branches") ? Promise.reject(new Error("Catalog rejected")) : fetch(url, init))
    render(<SalesPresupuestoFormDialog companyId="company-1" linkedSurgeryIds={[]} onSave={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Keep me" } })
    await screen.findByText(/Catalog rejected/)
    expect(screen.getByRole("button", { name: "Guardar presupuesto" })).toBeDisabled()
    mocks.fetch.mockResolvedValue([])
    fireEvent.click(screen.getByRole("button", { name: "Reintentar catálogos" }))
    await screen.findByText(/No hay sucursales o contactos/)
    expect(screen.getByLabelText("Concepto")).toHaveValue("Keep me")
    expect(screen.getByRole("button", { name: "Guardar presupuesto" })).toBeDisabled()
    mocks.fetch.mockImplementation(fetch)
    fireEvent.click(screen.getByRole("button", { name: "Reintentar catálogos" }))
    await screen.findByRole("option", { name: "Centro" })
    expect(screen.getByLabelText("Concepto")).toHaveValue("Keep me")
  })

  it("shows list rejection with retry and does not expose mutations to disallowed roles", async () => {
    mocks.role = "logistica"
    mocks.fetch.mockRejectedValueOnce(new Error("List rejected"))
    render(<PresupuestosPage />)
    await screen.findByText("List rejected")
    expect(screen.queryByRole("button", { name: "Nuevo presupuesto" })).not.toBeInTheDocument()
    rows = [budget()]
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }))
    await screen.findByText("Backend quotation")
    expect(screen.queryByRole("button", { name: "Emitir" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument()
    expect(mocks.store).not.toHaveBeenCalled()
  })

  it("keeps standalone creation explicit and outside invoice handoff eligibility", async () => {
    render(<PresupuestosPage />)
    await openNew(); fillNew()
    fireEvent.change(screen.getByLabelText("Cirugía"), { target: { value: "" } })
    expect(screen.getByText(/independiente no es fuente/)).toBeInTheDocument()
    await save()
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(body()).not.toHaveProperty("surgeryId")
    expect(derivePendingInvoiceCandidates("company-1", [budget({ surgeryId: null, state: "Aprobado", slot: "CURRENT" })], [], [])).toEqual([])
  })
})
