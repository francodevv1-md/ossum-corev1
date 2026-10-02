import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Surgery } from "@/types"
import type { SurgeryDocumentationView } from "@/lib/services/surgery-documentation.service"
import { deriveDocumentationAggregate } from "@/lib/validators/documentation.validator"

const mocks = vi.hoisted(() => ({
  auth: { activeCompany: { id: "company-a" }, currentAccess: { role: "admin" }, currentUser: { id: "actor" }, isLoading: false, currentUserLoading: false },
  success: vi.fn(),
}))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => mocks.auth }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: async () => null }))
vi.mock("sonner", () => ({ toast: { success: mocks.success } }))
// Any accidental return to local authority must fail, not be hidden by a store mock.
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: () => { throw new Error("Local checklist forbidden") } }))
import { DocumentacionPanel } from "@/components/expediente/DocumentacionPanel"

const time = "2026-07-28T10:00:00.000Z"
const surgery = { id: "CX-123", backendId: "backend-a" } as Surgery
const absent: SurgeryDocumentationView = { checklist: null, status: "not_required", progress: { approved: 0, total: 0 }, items: [] }
function fixture(state = "received", label = "Orden médica"): SurgeryDocumentationView {
  const aggregate = deriveDocumentationAggregate([{ required: true, state }])
  return {
    checklist: { id: "checklist-a", templateVersion: "documentation-v0.1", createdAt: time, updatedAt: time },
    status: aggregate.status, progress: { approved: aggregate.approved, total: aggregate.total },
    items: [{ id: "item-a", type: "medical_order", label, required: true, sortOrder: 10, state, observation: null, updatedAt: time }],
  }
}
function response(documentation: SurgeryDocumentationView) {
  return new Response(JSON.stringify({ data: { documentation } }), { status: 200 })
}
function failure(status: number, code = "server_error") {
  return new Response(JSON.stringify({ error: { code, message: "Backend rechazó la operación" } }), { status })
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => { resolve = accept })
  return { promise, resolve }
}
function mount(value = surgery) {
  return render(<DocumentacionPanel surgery={value} docStatus="Legacy ready" docChecklist={{ items: [{ type: "Legacy document", completed: true }] } as never} />)
}
let http: ReturnType<typeof vi.fn<typeof fetch>>

describe("documentation panel through real hook/client and mocked HTTP boundary", () => {
  beforeEach(() => {
    mocks.auth.activeCompany = { id: "company-a" }
    mocks.auth.currentAccess = { role: "admin" }
    mocks.success.mockReset()
    http = vi.fn<typeof fetch>().mockResolvedValue(response(fixture()))
    vi.stubGlobal("fetch", http)
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it("reads backend identity/company, displays persisted response and ignores legacy props", async () => {
    const data = fixture("observed")
    data.status = "observed"
    data.items[0].observation = "Falta firma persistida"
    http.mockResolvedValue(response(data))
    mount()
    expect(await screen.findByText("Obs: Falta firma persistida")).toBeVisible()
    expect(screen.getByText("Observada")).toBeVisible()
    expect(screen.queryByText("Legacy document")).not.toBeInTheDocument()
    expect(http).toHaveBeenCalledWith("/api/companies/company-a/surgeries/backend-a/documentation", expect.objectContaining({ cache: "no-store" }))
  })

  it("does not initialize on absent GET; explicit initialization sends POST without a body", async () => {
    http.mockResolvedValueOnce(response(absent)).mockResolvedValueOnce(response(fixture("pending")))
    mount()
    const button = await screen.findByRole("button", { name: "Inicializar checklist" })
    expect(http).toHaveBeenCalledTimes(1)
    fireEvent.click(button)
    await screen.findByRole("button", { name: "Recibido: Orden médica" })
    const [url, init] = http.mock.calls[1]
    expect(url).toBe("/api/companies/company-a/surgeries/backend-a/documentation/initialize")
    expect(init?.method).toBe("POST")
    expect(init?.body).toBeUndefined()
    expect(mocks.success).toHaveBeenCalledWith("Checklist inicializado")
  })

  it("distinguishes all four states and offers only canonical transitions", async () => {
    const data = fixture("pending")
    data.items.push(...["received", "observed", "approved"].map((state, index) => ({ ...data.items[0], id: `item-${index}`, type: ["authorization", "signed_delivery_note", "signed_consumption"][index], sortOrder: 20 + index * 10, label: `Doc ${state}`, state })))
    data.status = "observed"
    data.progress = { approved: 1, total: 4 }
    http.mockResolvedValue(response(data))
    mount()
    await screen.findByText("Doc approved")
    for (const text of ["Pendiente", "Recibido", "Observado", "Aprobado"]) expect(screen.getByText(text, { selector: "span" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Aprobado: Orden médica" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Observado: Orden médica" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aprobado: Doc observed" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Recibido: Doc approved" })).not.toBeInTheDocument()
  })

  it("uses exact item ID/state/CAS timestamp and replaces data only with accepted response", async () => {
    const accepted = fixture("approved")
    accepted.status = "ready"
    accepted.progress.approved = 1
    http.mockResolvedValueOnce(response(fixture())).mockResolvedValueOnce(response(accepted))
    mount()
    fireEvent.click(await screen.findByRole("button", { name: "Aprobado: Orden médica" }))
    expect(await screen.findByText("Lista")).toBeVisible()
    const [url, init] = http.mock.calls[1]
    expect(url).toBe("/api/companies/company-a/surgeries/backend-a/documentation/items/item-a/state")
    expect(init?.method).toBe("PATCH")
    expect(JSON.parse(init!.body as string)).toEqual({ state: "approved", expectedUpdatedAt: time })
  })

  it("persists observation payload and recovers accepted text after refresh and reopen", async () => {
    const accepted = fixture("observed")
    accepted.status = "observed"
    accepted.items[0].observation = "Falta firma"
    accepted.items[0].updatedAt = "2026-07-28T10:01:00.000Z"
    http.mockResolvedValueOnce(response(fixture())).mockImplementation(async () => response(accepted))
    const view = mount()
    fireEvent.click(await screen.findByRole("button", { name: "Observado: Orden médica" }))
    fireEvent.change(screen.getByLabelText("Observación"), { target: { value: "  Falta firma  " } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar observación" }))
    expect(await screen.findByText("Obs: Falta firma")).toBeVisible()
    expect(JSON.parse(http.mock.calls[1][1]!.body as string)).toEqual({ state: "observed", expectedUpdatedAt: time, observation: "Falta firma" })
    fireEvent.click(screen.getByRole("button", { name: "Actualizar checklist" }))
    await waitFor(() => expect(http).toHaveBeenCalledTimes(3))
    view.unmount()
    mount()
    expect(await screen.findByText("Obs: Falta firma")).toBeVisible()
  })

  it.each(["network", "server", "conflict"])("preserves observation and never reports success on %s failure", async (kind) => {
    http.mockResolvedValueOnce(response(fixture()))
    if (kind === "network") http.mockRejectedValueOnce(new Error("offline"))
    else http.mockResolvedValueOnce(failure(kind === "conflict" ? 409 : 500, kind === "conflict" ? "documentation_write_conflict" : "server_error"))
    mount()
    fireEvent.click(await screen.findByRole("button", { name: "Observado: Orden médica" }))
    fireEvent.change(screen.getByLabelText("Observación"), { target: { value: "Conservar borrador" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar observación" }))
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0))
    expect(screen.getByLabelText("Observación")).toHaveValue("Conservar borrador")
    expect(mocks.success).not.toHaveBeenCalled()
    if (kind === "conflict") {
      expect(screen.getByRole("button", { name: "Registrar observación" })).toBeDisabled()
      expect(http).toHaveBeenCalledTimes(2)
      const latest = fixture()
      latest.items[0].updatedAt = "2026-07-28T10:02:00.000Z"
      http.mockResolvedValueOnce(response(latest)).mockResolvedValueOnce(response({ ...latest, status: "observed", items: [{ ...latest.items[0], state: "observed", observation: "Conservar borrador" }] }))
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Actualizar checklist" }))
      await waitFor(() => expect(screen.getByRole("button", { name: "Registrar observación" })).toBeEnabled())
      expect(screen.getByLabelText("Observación")).toHaveValue("Conservar borrador")
      fireEvent.click(screen.getByRole("button", { name: "Registrar observación" }))
      await screen.findByText("Obs: Conservar borrador")
      expect(JSON.parse(http.mock.calls[3][1]!.body as string).expectedUpdatedAt).toBe(latest.items[0].updatedAt)
    }
  })

  it("does not save observation if refresh reveals a forbidden transition", async () => {
    http.mockResolvedValueOnce(response(fixture())).mockResolvedValueOnce(failure(409)).mockResolvedValueOnce(response(fixture("pending")))
    mount()
    fireEvent.click(await screen.findByRole("button", { name: "Observado: Orden médica" }))
    fireEvent.change(screen.getByLabelText("Observación"), { target: { value: "Borrador" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar observación" }))
    await screen.findAllByRole("alert")
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Actualizar checklist" }))
    await screen.findByText("El estado actual no permite observar. Cierre y revise el documento.")
    expect(screen.getByRole("button", { name: "Registrar observación" })).toBeDisabled()
    expect(screen.getByLabelText("Observación")).toHaveValue("Borrador")
    expect(http).toHaveBeenCalledTimes(3)
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it.each(["company", "surgery"])("ignores late reads after changing %s", async (change) => {
    const old = deferred<Response>()
    http.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response(fixture("pending", "Documento nuevo")))
    const view = mount()
    if (change === "company") mocks.auth.activeCompany = { id: "company-b" }
    view.rerender(<DocumentacionPanel surgery={change === "surgery" ? { ...surgery, backendId: "backend-b" } : surgery} docStatus="legacy" />)
    await screen.findByText("Documento nuevo")
    await act(async () => old.resolve(response(fixture("approved", "Documento anterior"))))
    expect(screen.queryByText("Documento anterior")).not.toBeInTheDocument()
    expect(screen.getByText("Documento nuevo")).toBeVisible()
  })

  it.each(["company", "surgery"])("ignores an old mutation and its success after changing %s", async (change) => {
    const old = deferred<Response>()
    http.mockResolvedValueOnce(response(fixture())).mockReturnValueOnce(old.promise).mockResolvedValueOnce(response(fixture("pending", "Documento nuevo")))
    const view = mount()
    fireEvent.click(await screen.findByRole("button", { name: "Aprobado: Orden médica" }))
    await waitFor(() => expect(http).toHaveBeenCalledTimes(2))
    if (change === "company") mocks.auth.activeCompany = { id: "company-b" }
    view.rerender(<DocumentacionPanel surgery={change === "surgery" ? { ...surgery, backendId: "backend-b" } : surgery} docStatus="legacy" />)
    await screen.findByText("Documento nuevo")
    await act(async () => old.resolve(response(fixture("approved", "Documento anterior"))))
    expect(screen.queryByText("Documento anterior")).not.toBeInTheDocument()
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it("blocks duplicate submissions while awaiting acceptance", async () => {
    const pending = deferred<Response>()
    http.mockResolvedValueOnce(response(fixture())).mockReturnValueOnce(pending.promise)
    mount()
    const button = await screen.findByRole("button", { name: "Aprobado: Orden médica" })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(http).toHaveBeenCalledTimes(2))
    expect(button).toBeDisabled()
    expect(mocks.success).not.toHaveBeenCalled()
    await act(async () => pending.resolve(response(fixture("approved"))))
    expect(mocks.success).toHaveBeenCalledTimes(1)
  })

  it("uses the backend aggregate, not all item counts or a local readiness rule", async () => {
    const data = fixture("approved")
    data.status = "ready"
    data.progress = { approved: 1, total: 1 }
    data.items.push({ ...data.items[0], id: "optional", type: "technical_sheet", sortOrder: 60, label: "Opcional observado", required: false, state: "observed" })
    http.mockResolvedValue(response(data))
    mount()
    expect(await screen.findByText("Lista")).toBeVisible()
    expect(screen.getByText("1/1 documentos requeridos aprobados")).toBeVisible()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })

  it.each(["operator", "viewer"])("shows read-only data without mutation controls for %s", async (role) => {
    mocks.auth.currentAccess = { role }
    mount()
    await screen.findByText("Orden médica")
    expect(screen.queryByRole("button", { name: "Aprobado: Orden médica" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Observado: Orden médica" })).not.toBeInTheDocument()
    expect(http).toHaveBeenCalledTimes(1)
  })

  it("read-only absent checklist cannot initialize and unsupported actions cannot report delivery", async () => {
    mocks.auth.currentAccess = { role: "viewer" }
    http.mockResolvedValue(response(absent))
    mount()
    await screen.findByText(/Sin checklist/)
    expect(screen.queryByRole("button", { name: "Inicializar checklist" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Solicitar|Enviar|Adjuntar|Ver archivo/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Solicitud, carga y visualización de archivos no disponibles/)).toBeVisible()
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it("does not send a visible number when backend identity is missing", () => {
    mount({ ...surgery, backendId: undefined })
    expect(screen.getByText(/Documentación no disponible/)).toBeVisible()
    expect(http).not.toHaveBeenCalled()
  })

  it("failed read is not replaced by legacy checklist; retry recovers", async () => {
    http.mockResolvedValueOnce(failure(500)).mockResolvedValueOnce(response(fixture()))
    mount()
    await screen.findByRole("alert")
    expect(screen.queryByText("Legacy document")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Inicializar checklist" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Actualizar checklist" }))
    expect(await screen.findByText("Orden médica")).toBeVisible()
  })

  it("initialization failure remains absent without false success", async () => {
    http.mockResolvedValueOnce(response(absent)).mockResolvedValueOnce(failure(403))
    mount()
    fireEvent.click(await screen.findByRole("button", { name: "Inicializar checklist" }))
    await screen.findByRole("alert")
    expect(screen.getByText(/Sin checklist/)).toBeVisible()
    expect(screen.queryByText("Orden médica")).not.toBeInTheDocument()
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it("empty persisted checklist is not confused with absent data", async () => {
    http.mockResolvedValue(response({ ...fixture(), items: [], status: "not_required", progress: { approved: 0, total: 0 } }))
    mount()
    expect(await screen.findByText("Checklist persistido sin ítems.")).toBeVisible()
    expect(screen.queryByRole("button", { name: "Inicializar checklist" })).not.toBeInTheDocument()
    expect(screen.getByText("0/0 documentos requeridos aprobados")).toBeVisible()
  })

  it("revoked UI mutation permission prevents submitting an already open dialog", async () => {
    const view = mount()
    fireEvent.click(await screen.findByRole("button", { name: "Observado: Orden médica" }))
    fireEvent.change(screen.getByLabelText("Observación"), { target: { value: "Borrador" } })
    mocks.auth.currentAccess = { role: "viewer" }
    view.rerender(<DocumentacionPanel surgery={surgery} docStatus="legacy" />)
    expect(screen.getByRole("button", { name: "Registrar observación" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Registrar observación" }))
    expect(http).toHaveBeenCalledTimes(1)
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it("a newer refresh wins over an earlier pending refresh", async () => {
    const older = deferred<Response>()
    const newer = deferred<Response>()
    http.mockResolvedValueOnce(response(fixture())).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    mount()
    const refresh = await screen.findByRole("button", { name: "Actualizar checklist" })
    await screen.findByText("Orden médica")
    // Same-event duplicate refresh calls simulate overlapping reads before React commits disabled state.
    act(() => { refresh.click(); refresh.click() })
    await waitFor(() => expect(http).toHaveBeenCalledTimes(3))
    await act(async () => newer.resolve(response(fixture("approved", "Más reciente"))))
    await screen.findByText("Más reciente")
    await act(async () => older.resolve(response(fixture("pending", "Más antiguo"))))
    expect(screen.queryByText("Más antiguo")).not.toBeInTheDocument()
  })
})
