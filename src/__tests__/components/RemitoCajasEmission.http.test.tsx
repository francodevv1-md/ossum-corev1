import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { OperationalRemitoWorkspace } from "@/components/remitos/OperationalRemitoWorkspace"
import type { RemitoApiRow } from "@/lib/api/remitos"
import type { BoxAssignmentDetail } from "@/lib/api/cajas-assignments"
import { buildCajasDispatchPayload } from "@/lib/cajas-intent"
import { cajasDispatchSchema } from "@/lib/validators/cajas-assignment"
import { remitoWorkspaceDraftKey } from "@/lib/remito-workspace-draft-recovery"

const auth = vi.hoisted(() => ({ companyId: "company-1", userId: "user-1", isLoading: false, currentUserLoading: false, isAuthenticated: true }))
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
const notifications = vi.hoisted(() => ({ success: vi.fn() }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: auth.companyId }, currentUser: { id: auth.userId }, currentUserLoading: auth.currentUserLoading, isLoading: auth.isLoading, isAuthenticated: auth.isAuthenticated }) }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: vi.fn().mockResolvedValue(null) }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("sonner", () => ({ toast: notifications }))

const response = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 })
const rejected = () => new Response(JSON.stringify({ error: { code: "cajas_version_conflict", message: "Observed version rejected" } }), { status: 409 })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }
const makeRemito = (): Omit<RemitoApiRow, "items"> & { items: Array<RemitoApiRow["items"][number] & { preparationLineId?: string }> } => ({
  id: "remito-backend", visibleNumber: 12, companyId: "company-1", branchId: "branch-1", issuedBranchId: "branch-1", documentType: "R", surgeryId: "surgery-backend", origin: "box", salidaReason: "cirugia", boxId: null, presupuestoId: null, destinatarioContactId: null, destinatarioSnapshot: null, shippingAddressSnapshot: null, transportSnapshot: null, packageCount: null, declaredValue: null, state: "Borrador", issuedAt: null, deliveredAt: null, returnedAt: null, createdById: null, updatedById: null, metadata: { cajas: { assignmentId: "linked-assignment" } }, createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T01:00:00Z",
  items: [{ id: "remito-item-backend", preparationLineId: "preparation-line-backend", itemId: "article-1", sku: "SKU-1", description: "Implant", quantity: "0.5", unit: "u", boxId: null, presupuestoItemId: null, returnedQuantity: null, lotNumber: "LOT-1", serialNumber: "SERIAL-1", expirationDate: null, metadata: null, createdAt: "", updatedAt: "" }],
})
const makeAssignment = (): BoxAssignmentDetail => ({
  id: "linked-assignment", companyId: "company-1", surgeryId: "surgery-backend", surgeryVisibleNumber: "CX-0042", surgeryPatientName: null, surgeryInstitutionName: null, physicalUnitId: "unit-1", unitCode: null, serialNumber: null, boxArticleId: "box-article", boxSku: null, boxDescription: null, isActive: true, assignedAt: "", assignedById: "user-1", assignedByName: null, endedAt: null, endedById: null, endedByName: null, endCause: null, createdAt: "",
  preparation: { id: "preparation-backend", version: 7, formulaVersionId: "formula-1", formulaVersionNumber: 1, formulaCause: null, formulaAcceptedAt: "", requiresRecontrol: false, lines: [{ id: "preparation-line-backend", lineKey: "line-1", role: "component", articleId: "article-1", sku: "SKU-1", description: "Implant", quantity: 2, unit: "u", isActive: true, lotNumber: "LOT-1", serialNumber: "SERIAL-1" }] },
})

describe("Remito workspace Cajas emission HTTP boundary", () => {
  let remito: ReturnType<typeof makeRemito>
  let assignment: BoxAssignmentDetail
  let assignmentRead: () => Promise<Response>
  let mutation: () => Promise<Response>
  let fetchMock: ReturnType<typeof vi.fn>
  const posts: RequestInit[] = []
  const reads: string[] = []

  beforeEach(() => {
    vi.clearAllMocks(); window.sessionStorage.clear(); Object.assign(auth, { companyId: "company-1", userId: "user-1", isLoading: false, currentUserLoading: false, isAuthenticated: true }); posts.length = 0; reads.length = 0
    remito = makeRemito(); assignment = makeAssignment()
    assignmentRead = async () => response(assignment)
    mutation = async () => response({ ...remito, state: "Emitido" })
    vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000001" })
    fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input)
      if (init.method === "POST" && path.endsWith("/emitir")) { posts.push(init); return mutation() }
      if (init.method === "PATCH") return response(remito)
      reads.push(path)
      if (path.endsWith("/cajas/assignments/linked-assignment")) return assignmentRead()
      if (path.endsWith("/cajas/assignments")) return response([])
      if (path.endsWith("/remitos/remito-backend")) return response({ ...remito, companyId: auth.companyId })
      throw new Error(`Unexpected HTTP request: ${path}`)
    })
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  const mount = async () => { const view = render(<OperationalRemitoWorkspace remitoId="remito-backend" />); await screen.findByRole("button", { name: "Emitir" }); return view }
  const emit = () => fireEvent.click(screen.getByRole("button", { name: "Emitir" }))

  it("sends explicit persisted IDs, observed version and trace-compatible quantities through the real client", async () => {
    await mount(); emit()
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/remitos"))
    const body = JSON.parse(posts[0].body as string)
    expect(body).toEqual({ cajasDispatch: { assignmentId: "linked-assignment", expectedVersion: 7, idempotencyKey: "dispatch-00000000-0000-4000-8000-000000000001", lines: [{ preparationLineId: "preparation-line-backend", remitoItemId: "remito-item-backend", quantity: 0.5 }] } })
    expect(cajasDispatchSchema.parse(body.cajasDispatch)).toEqual(body.cajasDispatch)
    expect(new Headers(posts[0].headers).get("Content-Type")).toBe("application/json")
    expect(reads).not.toContain("/api/companies/company-1/surgeries/surgery-backend/cajas/assignments")
    expect(notifications.success).toHaveBeenCalledWith("Remito emitido")
  })

  it.each(["null assignment", "missing preparation", "missing items", "ambiguous lines", "wrong company", "wrong surgery", "missing explicit line", "wrong lot", "wrong serial", "missing lot", "missing serial"])("blocks %s before any emission POST", async (failure) => {
    if (failure === "null assignment") assignmentRead = async () => response(null)
    if (failure === "missing preparation") assignment.preparation = null
    if (failure === "missing items") remito.items = []
    if (failure === "ambiguous lines") {
      delete remito.items[0].preparationLineId
      assignment.preparation!.lines.push({ ...assignment.preparation!.lines[0], id: "duplicate-line" })
    }
    if (failure === "wrong company") assignment.companyId = "other-company"
    if (failure === "wrong surgery") assignment.surgeryId = "CX-0042"
    if (failure === "missing explicit line") remito.items[0].preparationLineId = "missing-line"
    if (failure === "wrong lot") remito.items[0].lotNumber = "WRONG"
    if (failure === "wrong serial") remito.items[0].serialNumber = "WRONG"
    if (failure === "missing lot") remito.items[0].lotNumber = null
    if (failure === "missing serial") remito.items[0].serialNumber = null
    await mount(); emit()
    await waitFor(() => expect(screen.getByRole("button", { name: "Emitir" })).toBeEnabled())
    expect(posts).toHaveLength(0)
    expect(notifications.success).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/unavailable|requires|Ambiguous|match|Explicit|Incompatible|missing/i)
    expect(screen.getByRole("textbox", { name: "Descripción del renglón 1" })).toHaveValue(remito.items[0]?.description ?? "")
  })

  it("rejects unavailable linked detail instead of switching to the surgery's active assignment", async () => {
    assignmentRead = async () => new Response(JSON.stringify({ error: { message: "Linked detail unavailable" } }), { status: 404 })
    await mount(); emit()
    await screen.findByText("Linked detail unavailable")
    expect(posts).toHaveLength(0)
    expect(reads.filter((path) => path.includes("/surgeries/"))).toHaveLength(0)
  })

  it.each(["409", "network"])("keeps the draft/recovery and exact command after %s; retry does not read a newer version", async (failure) => {
    mutation = failure === "409" ? async () => rejected() : async () => { throw new TypeError("Network uncertain") }
    await mount()
    const key = remitoWorkspaceDraftKey({ userId: "user-1", companyId: "company-1", mode: "edit", remitoId: remito.id })
    window.sessionStorage.setItem(key, "retained recovery sentinel")
    emit()
    await screen.findByText(failure === "409" ? "Observed version rejected" : "Network uncertain")
    expect(router.replace).not.toHaveBeenCalled(); expect(notifications.success).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(key)).toBe("retained recovery sentinel")
    expect(screen.getByRole("textbox", { name: "Descripción del renglón 1" })).toHaveValue("Implant")
    const original = posts[0].body
    assignment.preparation!.version = 99
    emit()
    await waitFor(() => expect(posts).toHaveLength(2))
    await waitFor(() => expect(screen.getByRole("button", { name: "Emitir" })).toBeEnabled())
    expect(posts[1].body).toBe(original)
    expect(reads.filter((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toHaveLength(1)
    mutation = async () => response({ ...remito, state: "Emitido" })
    emit()
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/remitos"))
    expect(posts[2].body).toBe(original)
    expect(window.sessionStorage.getItem(key)).toBeNull()
  })

  it("invalidates an uncertain command after an accepted draft edit", async () => {
    mutation = async () => rejected()
    await mount(); emit(); await screen.findByText("Observed version rejected")
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Edited implant" } })
    remito = { ...remito, updatedAt: "2026-10-02T02:00:00Z", items: [{ ...remito.items[0], description: "Edited implant" }] }
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(notifications.success).toHaveBeenCalledWith("Borrador guardado"))
    assignment.preparation!.version = 8
    emit(); await waitFor(() => expect(posts).toHaveLength(2))
    expect(JSON.parse(posts[1].body as string).cajasDispatch.expectedVersion).toBe(8)
    expect(reads.filter((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toHaveLength(2)
  })

  it.each(["company", "document"])("cancels a stale %s preflight before mutation", async (change) => {
    const pending = deferred<Response>(); assignmentRead = () => pending.promise
    const view = await mount(); emit()
    await waitFor(() => expect(reads.some((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toBe(true))
    if (change === "company") auth.companyId = "company-2"
    view.rerender(<OperationalRemitoWorkspace remitoId={change === "document" ? "different-document" : remito.id} />)
    await act(async () => { pending.resolve(response(assignment)); await pending.promise })
    expect(posts).toHaveLength(0); expect(router.replace).not.toHaveBeenCalled(); expect(notifications.success).not.toHaveBeenCalled()
  })

  it("retains a surgery edit made during preflight and cancels the old document command", async () => {
    const pending = deferred<Response>(); assignmentRead = () => pending.promise
    await mount(); emit()
    await waitFor(() => expect(reads.some((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toBe(true))
    fireEvent.change(screen.getByLabelText(/cirugía \/ expediente/i), { target: { value: "new-backend-surgery" } })
    await act(async () => { pending.resolve(response(assignment)); await pending.promise })
    await screen.findByText("El contexto cambió; la emisión fue cancelada.")
    expect(screen.getByLabelText(/cirugía \/ expediente/i)).toHaveValue("new-backend-surgery")
    expect(posts).toHaveLength(0); expect(router.replace).not.toHaveBeenCalled()
  })

  it("uses backend surgery lookup only for unmarked docs and rejects ambiguous active assignments", async () => {
    remito.metadata = null
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input); reads.push(path)
      if (path.endsWith("/remitos/remito-backend")) return response(remito)
      if (path.endsWith("/surgeries/surgery-backend/cajas/assignments")) return response([{ id: "a", isActive: true }, { id: "b", isActive: true }])
      throw new Error(`Unexpected request ${path}`)
    })
    await mount(); emit(); await screen.findByText(/Ambiguous active Cajas assignments/)
    expect(posts).toHaveLength(0)
    expect(reads).toContain("/api/companies/company-1/surgeries/surgery-backend/cajas/assignments")
  })

  it("preserves generic emission only when the backend confirms there is no assignment", async () => {
    remito.metadata = null
    await mount(); emit()
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/remitos"))
    expect(posts).toHaveLength(1); expect(posts[0].body).toBeUndefined()
    expect(reads).toContain("/api/companies/company-1/surgeries/surgery-backend/cajas/assignments")
  })

  it.each(["valid", "missing detail", "missing preparation"])("uses the selected active assignment honestly: %s", async (result) => {
    remito.metadata = null
    if (result === "missing detail") assignmentRead = async () => response(null)
    if (result === "missing preparation") assignment.preparation = null
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input); reads.push(path)
      if (init.method === "POST" && path.endsWith("/emitir")) { posts.push(init); return mutation() }
      if (path.endsWith("/remitos/remito-backend")) return response(remito)
      if (path.endsWith("/surgeries/surgery-backend/cajas/assignments")) return response([{ id: "linked-assignment", isActive: true }])
      if (path.endsWith("/cajas/assignments/linked-assignment")) return assignmentRead()
      throw new Error(`Unexpected request ${path}`)
    })
    await mount(); emit()
    if (result === "valid") {
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/remitos"))
      expect(JSON.parse(posts[0].body as string).cajasDispatch.assignmentId).toBe("linked-assignment")
    } else {
      await screen.findByText(result === "missing detail" ? /Selected active Cajas assignment is unavailable/ : /Cajas emission requires preparation/)
      expect(posts).toHaveLength(0); expect(router.replace).not.toHaveBeenCalled()
    }
  })

  it("keeps the pure builder's nullable preparation contract", () => {
    assignment.preparation = null
    expect(buildCajasDispatchPayload(assignment, remito)).toBeNull()
  })

  it.each(["user", "auth", "auth lost", "unmount", "company round trip"])('cancels obsolete %s preflight', async (change) => {
    const pending = deferred<Response>(); assignmentRead = () => pending.promise
    const view = await mount(); emit()
    await waitFor(() => expect(reads.some((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toBe(true))
    if (change === "unmount") view.unmount()
    else {
      if (change === "user") auth.userId = "user-2"
      if (change === "auth") auth.isLoading = true
      if (change === "auth lost") auth.isAuthenticated = false
      if (change === "company round trip") auth.companyId = "company-2"
      view.rerender(<OperationalRemitoWorkspace remitoId={remito.id} />)
      if (change === "company round trip") { auth.companyId = "company-1"; view.rerender(<OperationalRemitoWorkspace remitoId={remito.id} />) }
    }
    await act(async () => { pending.resolve(response(assignment)); await pending.promise })
    expect(posts).toHaveLength(0); expect(router.replace).not.toHaveBeenCalled(); expect(notifications.success).not.toHaveBeenCalled()
  })

  it("creates a new semantic key after an accepted draft edit", async () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("first-command").mockReturnValueOnce("edited-command") })
    mutation = async () => rejected()
    await mount(); emit(); await screen.findByText("Observed version rejected")
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Edited implant" } })
    remito = { ...remito, updatedAt: "2026-10-02T02:00:00Z", items: [{ ...remito.items[0], description: "Edited implant" }] }
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(notifications.success).toHaveBeenCalledWith("Borrador guardado"))
    emit(); await waitFor(() => expect(posts).toHaveLength(2))
    expect(JSON.parse(posts[0].body as string).cajasDispatch.idempotencyKey).toBe("dispatch-first-command")
    expect(JSON.parse(posts[1].body as string).cajasDispatch.idempotencyKey).toBe("dispatch-edited-command")
  })

  it("cancels emission immediately when a same-version server reload starts", async () => {
    mutation = async () => rejected()
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input)
      if (init.method === "PATCH") return new Response(JSON.stringify({ error: { code: "remito_update_conflict", message: "Draft changed" } }), { status: 409 })
      if (init.method === "POST" && path.endsWith("/emitir")) { posts.push(init); return mutation() }
      reads.push(path)
      if (path.endsWith("/cajas/assignments/linked-assignment")) return assignmentRead()
      if (path.endsWith("/remitos/remito-backend")) return response(remito)
      throw new Error(`Unexpected request: ${path}`)
    })
    await mount()
    const original = screen.getByRole("textbox", { name: "Descripción del renglón 1" })
    fireEvent.change(original, { target: { value: "Edited" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    const reload = await screen.findByRole("button", { name: "Actualizar desde servidor" })
    fireEvent.change(original, { target: { value: "Implant" } })
    const preflight = deferred<Response>(); assignmentRead = () => preflight.promise
    emit()
    await waitFor(() => expect(reads.some((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toBe(true))
    const loading = deferred<Response>()
    fetchMock.mockImplementationOnce(() => loading.promise)
    fireEvent.click(reload)
    await act(async () => { preflight.resolve(response(assignment)); await preflight.promise })
    expect(posts).toHaveLength(0)
    await act(async () => { loading.resolve(response(remito)); await loading.promise })
    await screen.findByRole("button", { name: "Emitir" })
    assignmentRead = async () => response(assignment)
    emit(); await screen.findByText("Observed version rejected")
    expect(reads.filter((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toHaveLength(2)
  })
})
