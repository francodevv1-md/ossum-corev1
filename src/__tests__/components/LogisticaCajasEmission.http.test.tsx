import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LogisticaTabContent } from "@/components/expediente/LogisticaTabContent"
import type { RemitosPanelRemito } from "@/components/expediente/RemitosPanel"
import type { RemitoApiRow } from "@/lib/api/remitos"
import type { BoxAssignmentDetail } from "@/lib/api/cajas-assignments"
import { cajasDispatchSchema } from "@/lib/validators/cajas-assignment"
import type { Surgery } from "@/types"

const auth = vi.hoisted(() => ({ companyId: "company-1", userId: "user-1", isLoading: false, currentUserLoading: false }))
const refreshTrace = vi.hoisted(() => vi.fn())
const panel = vi.hoisted(() => ({ accepted: vi.fn(), rejected: vi.fn(), onEmit: null as null | ((remito: RemitosPanelRemito) => Promise<unknown>), remito: null as RemitosPanelRemito | null }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: auth.companyId }, currentUser: { id: auth.userId }, currentUserLoading: auth.currentUserLoading, isAuthenticated: true, isLoading: auth.isLoading }) }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: vi.fn().mockResolvedValue(null) }))
vi.mock("@/hooks/useTrazabilidad", () => ({ useTrazabilidad: () => ({ trace: null, refresh: refreshTrace }) }))
vi.mock("@/components/expediente/LogisticaPanel", () => ({ LogisticaPanel: () => null }))
vi.mock("@/components/expediente/MaterialTransitoPanel", () => ({ MaterialTransitoPanel: () => null }))
// Only presentation is replaced. useRemitos, emitirRemito, Cajas clients and apiFetch stay real.
vi.mock("@/components/expediente/RemitosPanel", () => ({ RemitosPanel: ({ remitos, onEmit, mutatingId }: { remitos: RemitosPanelRemito[]; onEmit: (remito: RemitosPanelRemito) => Promise<unknown>; mutatingId?: string | null }) => {
  panel.onEmit = onEmit; panel.remito = remitos[0] ?? null
  return remitos[0] ? <button disabled={Boolean(mutatingId)} onClick={() => void onEmit(remitos[0]).then(panel.accepted, panel.rejected)}>Emit panel</button> : null
} }))

const response = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 })
const conflict = () => new Response(JSON.stringify({ error: { code: "cajas_version_conflict", message: "Observed version rejected" } }), { status: 409 })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }
const surgery = { id: "CX-0042", backendId: "surgery-backend", institution: "Hospital", institutionCity: "City", patient: "Patient", surgeon: "Surgeon" } as Surgery
const makeRemito = (): RemitoApiRow => ({
  id: "remito-backend", visibleNumber: 12, companyId: "company-1", branchId: "branch-1", issuedBranchId: "branch-1", documentType: "R", surgeryId: "surgery-backend", origin: "box", salidaReason: "cirugia", boxId: null, presupuestoId: null, destinatarioContactId: null, destinatarioSnapshot: null, shippingAddressSnapshot: null, transportSnapshot: null, packageCount: null, declaredValue: null, state: "Borrador", issuedAt: null, deliveredAt: null, returnedAt: null, createdById: null, updatedById: null, metadata: { cajas: { assignmentId: "linked-assignment" } }, createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T01:00:00Z",
  items: [{ id: "remito-item-backend", itemId: "article-1", sku: "SKU-1", description: "Implant", quantity: "0.5", unit: "u", boxId: null, presupuestoItemId: null, returnedQuantity: null, lotNumber: "LOT-1", serialNumber: "SERIAL-1", expirationDate: null, metadata: null, createdAt: "", updatedAt: "" }],
})
const makeAssignment = (): BoxAssignmentDetail => ({
  id: "linked-assignment", companyId: "company-1", surgeryId: "surgery-backend", surgeryVisibleNumber: "CX-0042", surgeryPatientName: null, surgeryInstitutionName: null, physicalUnitId: "unit-1", unitCode: null, serialNumber: null, boxArticleId: "box-article", boxSku: null, boxDescription: null, isActive: true, assignedAt: "", assignedById: "user-1", assignedByName: null, endedAt: null, endedById: null, endedByName: null, endCause: null, createdAt: "",
  preparation: { id: "preparation-backend", version: 7, formulaVersionId: "formula-1", formulaVersionNumber: 1, formulaCause: null, formulaAcceptedAt: "", requiresRecontrol: false, lines: [{ id: "preparation-line-backend", lineKey: "line-1", role: "component", articleId: "article-1", sku: "SKU-1", description: "Implant", quantity: 2, unit: "u", isActive: true, lotNumber: "LOT-1", serialNumber: "SERIAL-1" }] },
})

describe("Logistics Cajas emission HTTP boundary", () => {
  let remito: RemitoApiRow
  let assignment: BoxAssignmentDetail
  let assignmentRead: () => Promise<Response>
  let mutation: () => Promise<Response>
  let listRead: () => Promise<Response>
  const posts: RequestInit[] = []
  const paths: string[] = []
  beforeEach(() => {
    vi.clearAllMocks(); Object.assign(auth, { companyId: "company-1", userId: "user-1", isLoading: false, currentUserLoading: false }); panel.onEmit = null; panel.remito = null; posts.length = 0; paths.length = 0
    remito = makeRemito(); assignment = makeAssignment()
    assignmentRead = async () => response(assignment)
    mutation = async () => response({ ...remito, state: "Emitido" })
    listRead = async () => response([{ ...remito, companyId: auth.companyId }])
    vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000002" })
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input); paths.push(path)
      if (init.method === "POST" && path.endsWith("/emitir")) { posts.push(init); return mutation() }
      if (path.includes("/remitos?")) return listRead()
      if (path.endsWith("/cajas/assignments/linked-assignment")) return assignmentRead()
      if (path.endsWith("/surgeries/surgery-backend/cajas/assignments")) return response([])
      throw new Error(`Unexpected HTTP request: ${path}`)
    }))
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  const props = () => ({ surgery, remitos: [], materialTransito: [] })
  const mount = async () => { const view = render(<LogisticaTabContent {...props()} />); await screen.findByRole("button", { name: "Emit panel" }); return view }
  const emit = () => fireEvent.click(screen.getByRole("button", { name: "Emit panel" }))

  it("honors the persisted marker, backend surgery and exact dispatch schema over active lookup", async () => {
    await mount(); emit()
    await waitFor(() => expect(panel.accepted).toHaveBeenCalledTimes(1))
    const body = JSON.parse(posts[0].body as string)
    expect(body).toEqual({ cajasDispatch: { assignmentId: "linked-assignment", expectedVersion: 7, idempotencyKey: "dispatch-00000000-0000-4000-8000-000000000002", lines: [{ preparationLineId: "preparation-line-backend", remitoItemId: "remito-item-backend", quantity: 0.5 }] } })
    expect(cajasDispatchSchema.parse(body.cajasDispatch)).toEqual(body.cajasDispatch)
    expect(paths.some((path) => path.includes("surgeryId=surgery-backend"))).toBe(true)
    expect(paths.some((path) => path.includes("CX-0042"))).toBe(false)
    expect(paths.some((path) => path.includes("/surgeries/"))).toBe(false)
    expect(panel.rejected).not.toHaveBeenCalled()
  })

  it.each(["missing preparation", "missing assignment", "ambiguous lines", "wrong company", "wrong surgery", "missing lot", "wrong serial"])("rejects %s without POST or accepted UI", async (failure) => {
    if (failure === "missing preparation") assignment.preparation = null
    if (failure === "missing assignment") assignmentRead = async () => response(null)
    if (failure === "ambiguous lines") assignment.preparation!.lines.push({ ...assignment.preparation!.lines[0], id: "duplicate-line" })
    if (failure === "wrong company") assignment.companyId = "other-company"
    if (failure === "wrong surgery") assignment.surgeryId = "CX-0042"
    if (failure === "missing lot") remito.items[0].lotNumber = null
    if (failure === "wrong serial") remito.items[0].serialNumber = "WRONG"
    await mount(); emit()
    await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(1))
    expect(panel.rejected.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(posts).toHaveLength(0); expect(panel.accepted).not.toHaveBeenCalled()
    expect(paths.some((path) => path.includes("/surgeries/"))).toBe(false)
  })

  it("rejects a missing raw backend row instead of emitting the panel reference", async () => {
    await mount()
    await expect(panel.onEmit!({ ...panel.remito!, apiId: "not-a-backend-row" })).rejects.toThrow("El remito backend no está disponible")
    expect(posts).toHaveLength(0)
    expect(paths.some((path) => path.includes("/cajas/"))).toBe(false)
  })

  it("does not issue a second command while the same preflight is pending", async () => {
    const pending = deferred<Response>(); assignmentRead = () => pending.promise
    await mount(); emit()
    await waitFor(() => expect(paths.some((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toBe(true))
    await expect(panel.onEmit!(panel.remito!)).rejects.toThrow("La emisión ya está en curso")
    expect(posts).toHaveLength(0)
    await act(async () => { pending.resolve(response(assignment)); await pending.promise })
    await waitFor(() => expect(panel.accepted).toHaveBeenCalledTimes(1))
    expect(posts).toHaveLength(1)
  })

  it.each(["409", "network"])("retains an identical command on %s retries until accepted", async (failure) => {
    mutation = failure === "409" ? async () => conflict() : async () => { throw new TypeError("Network uncertain") }
    await mount(); emit(); await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(1))
    expect(panel.accepted).not.toHaveBeenCalled()
    const original = posts[0].body
    assignment.preparation!.version = 99
    emit(); await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(2))
    expect(posts[1].body).toBe(original)
    expect(paths.filter((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toHaveLength(1)
    mutation = async () => response({ ...remito, state: "Emitido" })
    emit(); await waitFor(() => expect(panel.accepted).toHaveBeenCalledTimes(1))
    expect(posts[2].body).toBe(original)
  })

  it.each(["company", "surgery", "reload"])("cancels stale %s preflight before any POST", async (change) => {
    const pending = deferred<Response>(); assignmentRead = () => pending.promise
    const view = await mount(); emit()
    await waitFor(() => expect(paths.some((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toBe(true))
    if (change === "company") auth.companyId = "company-2"
    view.rerender(<LogisticaTabContent {...props()} surgery={change === "surgery" ? { ...surgery, backendId: "new-backend-surgery" } : surgery} freshnessKey={change === "reload" ? 1 : 0} />)
    await act(async () => { pending.resolve(response(assignment)); await pending.promise })
    await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(1))
    expect(posts).toHaveLength(0); expect(panel.accepted).not.toHaveBeenCalled()
  })

  it("starts a fresh observed command only after explicit reload", async () => {
    mutation = async () => conflict()
    const view = await mount(); emit(); await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(1))
    assignment.preparation!.version = 8
    view.rerender(<LogisticaTabContent {...props()} freshnessKey={1} />)
    await waitFor(() => expect(paths.filter((path) => path.includes("/remitos?"))).toHaveLength(2))
    emit(); await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(2))
    expect(JSON.parse(posts[1].body as string).cajasDispatch.expectedVersion).toBe(8)
    expect(paths.filter((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toHaveLength(2)
  })

  it("keeps accepted emission accepted even if subsequent list refresh fails", async () => {
    await mount()
    listRead = async () => new Response(JSON.stringify({ error: { message: "Read refresh unavailable" } }), { status: 503 })
    emit(); await waitFor(() => expect(panel.accepted).toHaveBeenCalledTimes(1))
    expect(posts).toHaveLength(1); expect(panel.rejected).not.toHaveBeenCalled()
  })

  it("allows generic legacy emission only after a backend no-assignment result", async () => {
    remito.metadata = null
    await mount(); emit(); await waitFor(() => expect(panel.accepted).toHaveBeenCalledTimes(1))
    expect(posts[0].body).toBeUndefined()
    expect(paths).toContain("/api/companies/company-1/surgeries/surgery-backend/cajas/assignments")
  })

  it.each(["user", "auth", "unmount", "company round trip"])('cancels obsolete %s preflight', async (change) => {
    const pending = deferred<Response>(); assignmentRead = () => pending.promise
    const view = await mount(); emit()
    await waitFor(() => expect(paths.some((path) => path.endsWith("/cajas/assignments/linked-assignment"))).toBe(true))
    if (change === "unmount") view.unmount()
    else {
      if (change === "user") auth.userId = "user-2"
      if (change === "auth") auth.currentUserLoading = true
      if (change === "company round trip") auth.companyId = "company-2"
      view.rerender(<LogisticaTabContent {...props()} />)
      if (change === "company round trip") { auth.companyId = "company-1"; view.rerender(<LogisticaTabContent {...props()} />) }
    }
    await act(async () => { pending.resolve(response(assignment)); await pending.promise })
    await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(1))
    expect(posts).toHaveLength(0); expect(panel.accepted).not.toHaveBeenCalled()
  })

  it("creates a new semantic key only after explicit reload", async () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("first-command").mockReturnValueOnce("reloaded-command") })
    mutation = async () => conflict()
    const view = await mount(); emit(); await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(1))
    view.rerender(<LogisticaTabContent {...props()} freshnessKey={1} />)
    await waitFor(() => expect(paths.filter((path) => path.includes("/remitos?"))).toHaveLength(2))
    emit(); await waitFor(() => expect(panel.rejected).toHaveBeenCalledTimes(2))
    expect(JSON.parse(posts[0].body as string).cajasDispatch.idempotencyKey).toBe("dispatch-first-command")
    expect(JSON.parse(posts[1].body as string).cajasDispatch.idempotencyKey).toBe("dispatch-reloaded-command")
  })
})
