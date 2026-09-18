import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { OperationalRemitoWorkspace } from "@/components/remitos/OperationalRemitoWorkspace"
import { ApiClientError } from "@/lib/api/client"
import type { RemitoApiRow } from "@/lib/api/remitos"
import { remitoWorkspaceDraftKey, writeRemitoWorkspaceDraft } from "@/lib/remito-workspace-draft-recovery"

const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn() }
const api = vi.hoisted(() => ({ create: vi.fn(), fetch: vi.fn(), preset: vi.fn(), patch: vi.fn(), emit: vi.fn() }))
const notifications = vi.hoisted(() => ({ success: vi.fn() }))
const auth = vi.hoisted(() => ({ current: { activeCompany: { id: "company-1" }, currentUser: { id: "user-1" }, currentUserLoading: false, isLoading: false } }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth.current }))
vi.mock("sonner", () => ({ toast: notifications }))
vi.mock("@/lib/api/remitos", async (original) => ({ ...await original<typeof import("@/lib/api/remitos")>(), createRemito: api.create, fetchRemito: api.fetch, fetchRemitoDevPreset: api.preset, updateRemitoDraft: api.patch, emitirRemito: api.emit }))

const row: RemitoApiRow = { id: "rem-1", visibleNumber: 12, companyId: "company-1", branchId: "suc-1", issuedBranchId: "suc-1", documentType: "R", surgeryId: null, origin: "manual", salidaReason: "cirugia", boxId: null, presupuestoId: null, destinatarioContactId: null, destinatarioSnapshot: null, shippingAddressSnapshot: null, transportSnapshot: null, packageCount: null, declaredValue: null, state: "Borrador", issuedAt: null, deliveredAt: null, returnedAt: null, createdById: null, updatedById: null, metadata: null, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-02T00:00:00Z", items: [{ id: "line-1", itemId: null, sku: null, description: "Implante", quantity: "2", unit: "unidad", boxId: null, presupuestoItemId: null, returnedQuantity: null, lotNumber: null, serialNumber: null, expirationDate: null, metadata: null, createdAt: "", updatedAt: "" }] }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason?: unknown) => void; const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise }); return { promise, resolve, reject } }
const switchToB = () => { auth.current = { activeCompany: { id: "company-2" }, currentUser: { id: "user-2" }, currentUserLoading: false, isLoading: false } }

describe("OperationalRemitoWorkspace", () => {
  beforeEach(() => { vi.clearAllMocks(); window.sessionStorage.clear(); auth.current = { activeCompany: { id: "company-1" }, currentUser: { id: "user-1" }, currentUserLoading: false, isLoading: false }; api.preset.mockResolvedValue({ available: false }); api.fetch.mockResolvedValue(row); api.create.mockResolvedValue(row); api.patch.mockResolvedValue(row) })
  afterEach(() => vi.useRealTimers())

  it("creates only after manual context and a valid row, then replaces the route", async () => {
    render(<OperationalRemitoWorkspace />)
    expect(screen.getByRole("button", { name: /buscar producto/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /importar desde/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/sucursal de salida/i), { target: { value: "suc-1" } })
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Implante" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))
    await waitFor(() => expect(api.create).toHaveBeenCalled())
    expect(router.replace).toHaveBeenCalledWith("/remitos/rem-1/editar")
  })

  it("applies only DEV preset branch defaults to a clean create workspace", async () => {
    api.preset.mockResolvedValue({ available: true, branch: { id: "dev-branch", label: "Sucursal DEV" }, example: { surgeryId: "sample-surgery", origin: "box", salidaReason: "prestamo", recipientSnapshot: { nombre: "Hospital de ejemplo" }, shippingAddressSnapshot: { domicilio: "Calle ejemplo" }, transportSnapshot: { nombre: "Transporte ejemplo" }, packageCount: 2, declaredValue: "100", metadata: { observaciones: "Ejemplo" }, items: [{ description: "Material de ejemplo", quantity: "2" }] } })

    render(<OperationalRemitoWorkspace />)

    await waitFor(() => expect(screen.getByLabelText(/sucursal de salida/i)).toHaveValue("dev-branch"))
    expect(screen.getByLabelText(/sucursal emisora/i)).toHaveValue("dev-branch")
    expect(screen.getByText("Sucursal", { exact: true }).parentElement).toHaveTextContent("dev-branch")
    expect(screen.getByRole("button", { name: "Cargar ejemplo DEV" })).toBeInTheDocument()
    expect(screen.getByLabelText(/cirugía \/ expediente/i)).toHaveValue("")
    expect(screen.getByLabelText(/destinatario/i)).toHaveValue("")
    expect(screen.getByRole("textbox", { name: "Descripción del renglón 1" })).toHaveValue("")
  })

  it("keeps an explicit branch when the DEV preset resolves later", async () => {
    const pendingPreset = deferred<{ available: true; branch: { id: string; label: string }; example: { surgeryId: string; origin: "manual"; salidaReason: "cirugia"; recipientSnapshot: { nombre: string }; shippingAddressSnapshot: null; transportSnapshot: null; packageCount: null; declaredValue: null; metadata: null; items: [] } }>()
    api.preset.mockImplementationOnce(() => pendingPreset.promise)
    render(<OperationalRemitoWorkspace />)

    fireEvent.change(screen.getByLabelText(/sucursal de salida/i), { target: { value: "caller-branch" } })
    await act(async () => { pendingPreset.resolve({ available: true, branch: { id: "dev-branch", label: "Sucursal DEV" }, example: { surgeryId: "", origin: "manual", salidaReason: "cirugia", recipientSnapshot: { nombre: "" }, shippingAddressSnapshot: null, transportSnapshot: null, packageCount: null, declaredValue: null, metadata: null, items: [] } }); await pendingPreset.promise })

    expect(screen.getByLabelText(/sucursal de salida/i)).toHaveValue("caller-branch")
  })

  it("loads a draft, preserves origin and sends the loaded concurrency baseline", async () => {
    render(<OperationalRemitoWorkspace remitoId="rem-1" />)
    await screen.findByRole("textbox", { name: "Descripción del renglón 1" })
    expect(screen.getByDisplayValue("Carga manual")).toBeDisabled()
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Implante ajustado" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(api.patch).toHaveBeenCalled())
    expect(api.patch.mock.calls[0][2]).toMatchObject({ expectedUpdatedAt: "2026-07-02T00:00:00Z", items: [{ description: "Implante ajustado" }] })
    expect(api.patch.mock.calls[0][2]).not.toHaveProperty("origin")
  })

  it("offers the secure new-tab edit link only after the remito is persisted", async () => {
    const { unmount } = render(<OperationalRemitoWorkspace remitoId="rem-1" />)

    const savedLink = await screen.findByRole("link", { name: /abrir en nueva pestaña/i })
    expect(savedLink).toHaveAttribute("href", "/remitos/rem-1/editar")
    expect(savedLink).toHaveAttribute("target", "_blank")
    expect(savedLink).toHaveAttribute("rel", "noopener noreferrer")
    expect(savedLink).toHaveAccessibleDescription(/edición simultánea se verifica al guardar/i)

    unmount()
    render(<OperationalRemitoWorkspace />)
    expect(screen.queryByRole("link", { name: /abrir en nueva pestaña/i })).not.toBeInTheDocument()
  })

  it("shows the lock state for an emitted document", async () => {
    api.fetch.mockResolvedValue({ ...row, state: "Emitido" })
    render(<OperationalRemitoWorkspace remitoId="rem-1" />)
    expect(await screen.findByText(/edición no disponible/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /volver a remitos/i })).toBeInTheDocument()
  })

  it("pushes /remitos from the clean header action without using history back", () => {
    render(<OperationalRemitoWorkspace />)

    fireEvent.click(screen.getByRole("button", { name: "Remitos" }))

    expect(router.push).toHaveBeenCalledWith("/remitos")
    expect(router.back).not.toHaveBeenCalled()
  })

  it("keeps editing when dirty header navigation is cancelled, then pushes after discard", () => {
    render(<OperationalRemitoWorkspace />)
    fireEvent.change(screen.getByLabelText(/sucursal de salida/i), { target: { value: "suc-1" } })
    fireEvent.click(screen.getByRole("button", { name: "Remitos" }))

    expect(screen.getByRole("dialog", { name: /cambios sin guardar/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /seguir editando/i }))
    expect(router.push).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog", { name: /cambios sin guardar/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Remitos" }))
    fireEvent.click(screen.getByRole("button", { name: /descartar cambios/i }))
    expect(router.push).toHaveBeenCalledWith("/remitos")
  })

  it("saves a dirty draft before applying the requested header navigation", async () => {
    render(<OperationalRemitoWorkspace />)
    fireEvent.change(screen.getByLabelText(/sucursal de salida/i), { target: { value: "suc-1" } })
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Implante" } })
    fireEvent.click(screen.getByRole("button", { name: "Remitos" }))
    fireEvent.click(within(screen.getByRole("dialog", { name: /cambios sin guardar/i })).getByRole("button", { name: /guardar borrador/i }))

    await waitFor(() => expect(api.create).toHaveBeenCalled())
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/remitos"))
  })

  it("replaces /remitos after a successful emit", async () => {
    api.emit.mockResolvedValue(undefined)
    render(<OperationalRemitoWorkspace remitoId="rem-1" />)
    await screen.findByRole("button", { name: /emitir/i })

    fireEvent.click(screen.getByRole("button", { name: /emitir/i }))

    await waitFor(() => expect(api.emit).toHaveBeenCalledWith("company-1", "rem-1"))
    expect(router.replace).toHaveBeenCalledWith("/remitos")
  })

  it("offers a matching temporary draft without auto-applying it, and recovers only on confirmation", async () => {
    const context = { userId: "user-1", companyId: "company-1", mode: "create" as const }
    writeRemitoWorkspaceDraft(context, { origin: "manual", salidaReason: "cirugia", branchId: "recovered-branch", issuedBranchId: "", surgeryId: "", boxId: "", presupuestoId: "", destinatarioContactId: "recipient-1", destinatarioNombre: "Hospital recuperado", domicilio: "Calle 1", localidad: "CABA", provincia: "Buenos Aires", transporte: "", packageCount: "", declaredValue: "", observaciones: "", items: [{ sku: "", description: "Implante recuperado", quantity: "1", unit: "unidad", lotNumber: "L-1", serialNumber: "S-1", expirationDate: "" }] }, null)
    render(<OperationalRemitoWorkspace />)

    const dialog = await screen.findByRole("dialog", { name: /recuperar cambios sin guardar/i })
    expect(screen.getByLabelText(/sucursal de salida/i)).not.toHaveValue("recovered-branch")
    fireEvent.click(within(dialog).getByRole("button", { name: "Recuperar" }))
    expect(screen.getByLabelText(/sucursal de salida/i)).toHaveValue("recovered-branch")
    expect(screen.getAllByDisplayValue("Implante recuperado")).toHaveLength(2)
  })

  it("discards recovery explicitly and clears it after successful save or emit", async () => {
    const createContext = { userId: "user-1", companyId: "company-1", mode: "create" as const }
    writeRemitoWorkspaceDraft(createContext, { origin: "manual", salidaReason: "cirugia", branchId: "old", issuedBranchId: "", surgeryId: "", boxId: "", presupuestoId: "", destinatarioContactId: "", destinatarioNombre: "", domicilio: "", localidad: "", provincia: "", transporte: "", packageCount: "", declaredValue: "", observaciones: "", items: [{ sku: "", description: "x", quantity: "1", unit: "unidad", lotNumber: "", serialNumber: "", expirationDate: "" }] }, null)
    const { unmount } = render(<OperationalRemitoWorkspace />)
    fireEvent.click(within(await screen.findByRole("dialog", { name: /recuperar cambios/i })).getByRole("button", { name: "Descartar" }))
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(createContext))).toBeNull()
    unmount()

    const editContext = { userId: "user-1", companyId: "company-1", mode: "edit" as const, remitoId: "rem-1" }
    writeRemitoWorkspaceDraft(editContext, { origin: "manual", salidaReason: "cirugia", branchId: "suc-1", issuedBranchId: "suc-1", surgeryId: "", boxId: "", presupuestoId: "", destinatarioContactId: "", destinatarioNombre: "", domicilio: "", localidad: "", provincia: "", transporte: "", packageCount: "", declaredValue: "", observaciones: "", items: [{ sku: "", description: "Implante", quantity: "2", unit: "unidad", lotNumber: "", serialNumber: "", expirationDate: "" }] }, row.updatedAt)
    render(<OperationalRemitoWorkspace remitoId="rem-1" />)
    fireEvent.click(within(await screen.findByRole("dialog", { name: /recuperar cambios/i })).getByRole("button", { name: "Descartar" }))
    fireEvent.click(await screen.findByRole("button", { name: /emitir/i }))
    await waitFor(() => expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(editContext))).toBeNull())
  })

  it("unmounts A before B can inherit its pending debounce or draft payload", async () => {
    vi.useFakeTimers()
    const contextA = { userId: "user-1", companyId: "company-1", mode: "create" as const }
    const contextB = { userId: "user-2", companyId: "company-2", mode: "create" as const }
    const view = render(<OperationalRemitoWorkspace />)

    fireEvent.change(screen.getByLabelText(/sucursal de salida/i), { target: { value: "a-persisted" } })
    await act(async () => { await vi.advanceTimersByTimeAsync(750) })
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(contextA))).toContain("a-persisted")

    fireEvent.change(screen.getByLabelText(/sucursal de salida/i), { target: { value: "a-pending" } })
    auth.current = { activeCompany: { id: "company-2" }, currentUser: { id: "user-2" }, currentUserLoading: false, isLoading: false }
    view.rerender(<OperationalRemitoWorkspace />)
    expect(screen.getByLabelText(/sucursal de salida/i)).toHaveValue("")

    await act(async () => { await vi.advanceTimersByTimeAsync(750) })
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(contextB))).toBeNull()
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(contextA))).toContain("a-persisted")
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(contextA))).not.toContain("a-pending")
  })

  it("uses Radix dialogs with requested initial focus, Escape retention, and opener restoration", async () => {
    const recoveryContext = { userId: "user-1", companyId: "company-1", mode: "create" as const }
    writeRemitoWorkspaceDraft(recoveryContext, { origin: "manual", salidaReason: "cirugia", branchId: "recovery", issuedBranchId: "", surgeryId: "", boxId: "", presupuestoId: "", destinatarioContactId: "", destinatarioNombre: "", domicilio: "", localidad: "", provincia: "", transporte: "", packageCount: "", declaredValue: "", observaciones: "", items: [{ sku: "", description: "x", quantity: "1", unit: "unidad", lotNumber: "", serialNumber: "", expirationDate: "" }] }, null)
    const recoveryOpener = document.createElement("button")
    document.body.append(recoveryOpener)
    recoveryOpener.focus()
    const { unmount } = render(<OperationalRemitoWorkspace />)

    const recoveryDialog = await screen.findByRole("dialog", { name: /recuperar cambios sin guardar/i })
    expect(within(recoveryDialog).getByRole("button", { name: "Recuperar" })).toHaveFocus()
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }) })
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /recuperar cambios sin guardar/i })).not.toBeInTheDocument())
    expect(recoveryOpener).toHaveFocus()
    expect(window.sessionStorage.getItem(remitoWorkspaceDraftKey(recoveryContext))).not.toBeNull()
    unmount()
    recoveryOpener.remove()
    window.sessionStorage.removeItem(remitoWorkspaceDraftKey(recoveryContext))

    render(<OperationalRemitoWorkspace />)
    const leaveOpener = screen.getByRole("button", { name: "Remitos" })
    fireEvent.change(screen.getByLabelText(/sucursal de salida/i), { target: { value: "suc-1" } })
    fireEvent.click(leaveOpener)
    const leaveDialog = screen.getByRole("dialog", { name: /cambios sin guardar/i })
    expect(within(leaveDialog).getByRole("button", { name: /seguir editando/i })).toHaveFocus()
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }) })
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /cambios sin guardar/i })).not.toBeInTheDocument())
    expect(leaveOpener).toHaveFocus()
    expect(screen.getByLabelText(/sucursal de salida/i)).toHaveValue("suc-1")
  })

  it("no aplica create tardío de A después de cambiar a B", async () => {
    const pending = deferred<RemitoApiRow>(); api.create.mockImplementationOnce(() => pending.promise)
    const view = render(<OperationalRemitoWorkspace />)
    fireEvent.change(screen.getByLabelText(/sucursal de salida/i), { target: { value: "suc-1" } })
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Implante A" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))
    await waitFor(() => expect(api.create).toHaveBeenCalled())
    switchToB(); view.rerender(<OperationalRemitoWorkspace />)
    await act(async () => { pending.resolve(row); await pending.promise })
    expect(router.replace).not.toHaveBeenCalled()
    expect(notifications.success).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "Nuevo remito" })).toBeInTheDocument()
  })

  it("no aplica PATCH tardío de A después de cambiar a B", async () => {
    const pending = deferred<RemitoApiRow>(); api.patch.mockImplementationOnce(() => pending.promise)
    const view = render(<OperationalRemitoWorkspace remitoId="rem-1" />)
    await screen.findByRole("button", { name: "Guardar cambios" })
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Implante A" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(api.patch).toHaveBeenCalled())
    switchToB(); view.rerender(<OperationalRemitoWorkspace />)
    await act(async () => { pending.resolve(row); await pending.promise })
    expect(notifications.success).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "Nuevo remito" })).toBeInTheDocument()
  })

  it("no aplica emisión tardía de A después de cambiar a B", async () => {
    const pending = deferred<void>(); api.emit.mockImplementationOnce(() => pending.promise)
    const view = render(<OperationalRemitoWorkspace remitoId="rem-1" />)
    fireEvent.click(await screen.findByRole("button", { name: "Emitir" }))
    await waitFor(() => expect(api.emit).toHaveBeenCalled())
    switchToB(); view.rerender(<OperationalRemitoWorkspace />)
    await act(async () => { pending.resolve(); await pending.promise })
    expect(router.replace).not.toHaveBeenCalled()
    expect(notifications.success).not.toHaveBeenCalled()
  })

  it("no aplica recarga tardía de A después de cambiar a B", async () => {
    api.patch.mockRejectedValueOnce(new ApiClientError("Conflicto", 409, "remito_update_conflict"))
    const view = render(<OperationalRemitoWorkspace remitoId="rem-1" />)
    await screen.findByRole("button", { name: "Guardar cambios" })
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción del renglón 1" }), { target: { value: "Implante A" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    const reloadButton = await screen.findByRole("button", { name: /actualizar desde servidor/i })
    const pending = deferred<RemitoApiRow>(); api.fetch.mockImplementationOnce(() => pending.promise)
    vi.spyOn(window, "confirm").mockReturnValue(true)
    fireEvent.click(reloadButton)
    await waitFor(() => expect(api.fetch).toHaveBeenCalledTimes(2))
    switchToB(); view.rerender(<OperationalRemitoWorkspace />)
    await act(async () => { pending.resolve({ ...row, branchId: "stale-a" }); await pending.promise })
    expect(screen.getByRole("heading", { name: "Nuevo remito" })).toBeInTheDocument()
    expect(screen.queryByDisplayValue("stale-a")).not.toBeInTheDocument()
  })

  it("no aplica fetch ni preset tardíos de A después de cambiar a B", async () => {
    const pendingFetch = deferred<RemitoApiRow>(); api.fetch.mockImplementationOnce(() => pendingFetch.promise)
    const editView = render(<OperationalRemitoWorkspace remitoId="rem-1" />)
    switchToB(); editView.rerender(<OperationalRemitoWorkspace />)
    await act(async () => { pendingFetch.resolve({ ...row, branchId: "stale-fetch" }); await pendingFetch.promise })
    expect(screen.queryByDisplayValue("stale-fetch")).not.toBeInTheDocument()
    editView.unmount()

    const pendingPreset = deferred<{ available: false }>(); auth.current = { activeCompany: { id: "company-1" }, currentUser: { id: "user-1" }, currentUserLoading: false, isLoading: false }; api.preset.mockImplementationOnce(() => pendingPreset.promise)
    const createView = render(<OperationalRemitoWorkspace />)
    await waitFor(() => expect(api.preset).toHaveBeenCalled())
    switchToB(); createView.rerender(<OperationalRemitoWorkspace />)
    await act(async () => { pendingPreset.resolve({ available: false }); await pendingPreset.promise })
    expect(screen.getByRole("heading", { name: "Nuevo remito" })).toBeInTheDocument()
  })

  it("restaura el foco en el encabezado cuando el opener de recuperación ya no existe", async () => {
    const recoveryContext = { userId: "user-1", companyId: "company-1", mode: "create" as const }
    writeRemitoWorkspaceDraft(recoveryContext, { origin: "manual", salidaReason: "cirugia", branchId: "recovery", issuedBranchId: "", surgeryId: "", boxId: "", presupuestoId: "", destinatarioContactId: "", destinatarioNombre: "", domicilio: "", localidad: "", provincia: "", transporte: "", packageCount: "", declaredValue: "", observaciones: "", items: [{ sku: "", description: "x", quantity: "1", unit: "unidad", lotNumber: "", serialNumber: "", expirationDate: "" }] }, null)
    const opener = document.createElement("button"); document.body.append(opener); opener.focus()
    render(<OperationalRemitoWorkspace />)
    await screen.findByRole("dialog", { name: /recuperar cambios sin guardar/i })
    opener.remove()
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }) })
    await waitFor(() => expect(screen.getByRole("heading", { name: "Nuevo remito" })).toHaveFocus())
  })
})
