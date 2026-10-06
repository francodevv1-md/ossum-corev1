import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CoordinadoresAdminClient } from "@/components/coordinadores/CoordinadoresAdminClient"
import { CoordinatorPersonalClient } from "@/components/coordinadores/CoordinatorPersonalClient"

const mocks = vi.hoisted(() => {
  const surgery = { id: "cx-1", backendId: "backend-1", date: "2026-10-06", time: "08:00", surgeryTimeSpecified: null, fechaEnvioMaterial: "2026-10-06", urgente: false, state: "Pendiente" }
  return { surgery, realForms: false, open: {} as any, companyId: "company-1" as string | undefined, define: {} as any, gestion: {} as any, save: vi.fn(), state: vi.fn(), note: vi.fn(), urgent: vi.fn(), assigned: vi.fn(), update: vi.fn(), hydrate: vi.fn(), filters: { activeIncidentFilter: null }, warning: vi.fn() }
})
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: mocks.companyId ? { id: mocks.companyId } : null, currentUser: { id: "user-1" }, currentAccess: {} }) }))
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: () => ({ surgeries: [mocks.surgery], updateSurgery: mocks.update, hydrateBackendSurgeries: mocks.hydrate, getHistoryBySurgeryId: () => [], addAuditEvent: vi.fn() }) }))
vi.mock("@/lib/api/backend-surgeries", () => ({ fetchBackendActiveSurgeries: () => new Promise(() => {}), updateBackendSurgeryManagement: mocks.save, updateBackendSurgeryState: mocks.state, addBackendSurgeryNote: mocks.note }))
vi.mock("@/lib/services/ntfy.service", () => ({ dispatchSurgeryUrgentAlert: mocks.urgent, dispatchCoordinatorAssignedAlert: mocks.assigned }))
vi.mock("@/hooks/useTemporalNavigation", () => ({ useTemporalNavigation: () => ({ viewMode: mocks.realForms ? "day" : "month", isDateInPeriod: () => true, getMonthMatrix: () => [], getWeekGroups: () => [] }) }))
vi.mock("@/hooks/useCoordinadoresFilters", () => ({ useCoordinadoresFilters: () => ({ filters: mocks.filters, filteredSurgeries: [mocks.surgery] }) }))
vi.mock("@/hooks/useCoordinadoresColumnVisibility", () => ({ useCoordinadoresColumnVisibility: () => ({ columns: [], visibleCols: [], columnOrder: [] }) }))
vi.mock("@/components/coordinadores/modal/DefineDateModal", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/coordinadores/modal/DefineDateModal")>()
  return { DefineDateModal: (props: any) => { mocks.define = props; return mocks.realForms ? <real.DefineDateModal {...props} /> : null } }
})
vi.mock("@/components/coordinadores/modal/CaseDetailModal", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/coordinadores/modal/CaseDetailModal")>()
  return { CaseDetailModal: (props: any) => { mocks.gestion = props; return mocks.realForms ? <real.CaseDetailModal {...props} /> : null } }
})
vi.mock("@/components/shared/mentions/MentionComposer", () => ({ MentionComposer: ({ value, onChange }: any) => <textarea aria-label="Nota" value={value.content} onChange={(event) => onChange({ content: event.target.value, mentions: [] })} /> }))
vi.mock("@/components/coordinadores/modal/CaseDetailModalHeader", () => ({ CaseDetailModalHeader: () => null }))
vi.mock("@/components/coordinadores/modal/EditMaterialsModal", () => ({ EditMaterialsModal: () => null }))
vi.mock("@/components/shared/selectors/SurgeryStateSelect", () => ({ SurgeryStateSelect: ({ value, onChange }: any) => <select aria-label="Estado" value={value} onChange={(event) => onChange(event.target.value)}><option>Pendiente</option><option>Autorizada</option></select> }))
vi.mock("@/components/coordinadores/modal/TabPaneAdjuntos", () => ({ TabPaneAdjuntos: () => null }))
vi.mock("@/components/coordinadores/modal/TabPaneComprobantes", () => ({ TabPaneComprobantes: () => null }))
vi.mock("@/components/coordinadores/modal/TabPaneReportes", () => ({ TabPaneReportes: () => null }))
vi.mock("@/components/expediente/NovedadesTabContent", () => ({ NovedadesTabContent: () => null }))
vi.mock("@/components/coordinadores/CoordinatorShareDialog", () => ({ CoordinatorShareDialog: () => null }))
vi.mock("@/components/coordinadores/topbar/IncidentsMetricsStrip", () => ({ IncidentsMetricsStrip: () => null }))
vi.mock("@/components/coordinadores/controls/ViewModeSwitcher", () => ({ ViewModeSwitcher: () => null }))
vi.mock("@/components/coordinadores/controls/TimelinePeriodNavigator", () => ({ TimelinePeriodNavigator: () => null }))
vi.mock("@/components/coordinadores/controls/FiltersToolbar", () => ({ FiltersToolbar: () => null }))
vi.mock("@/components/coordinadores/controls/PaginationControls", () => ({ PaginationControls: () => null }))
vi.mock("@/components/coordinadores/views/MonthLoadCalendar", () => ({ MonthLoadCalendar: () => null }))
vi.mock("@/components/coordinadores/views/DayViewDesktopTable", () => ({ DayViewDesktopTable: (props: any) => { mocks.open = props; return null } }))
vi.mock("@/components/coordinadores/views/DayViewMobileCards", () => ({ DayViewMobileCards: () => null }))
vi.mock("@/components/coordinadores/views/WeekViewGroupedView", () => ({ WeekViewGroupedView: () => null }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: mocks.warning } }))

describe.each([CoordinadoresAdminClient, CoordinatorPersonalClient])("active %s callbacks", (Client) => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.realForms = false; mocks.companyId = "company-1"; mocks.surgery.backendId = "backend-1"
    mocks.note.mockReset().mockResolvedValue({}); mocks.state.mockReset().mockResolvedValue({})
    mocks.save.mockResolvedValue({ id: "backend-1", surgeryDate: "2026-10-07T03:00:00Z", surgeryTimeSpecified: false, materialShippingDate: "2026-10-06T00:00:00Z" })
  })
  it.each(["define", "gestion"] as const)("%s saves Argentina optional time and applies server result", async (kind) => {
    render(<Client />)
    await act(async () => { await (kind === "define" ? mocks.define.onSave : mocks.gestion.onSaveGestion)("cx-1", { date: "2026-10-07", time: "" }) })
    expect(mocks.save).toHaveBeenCalledWith("company-1", "backend-1", { surgeryDate: "2026-10-07T03:00:00.000Z", surgeryTimeSpecified: false })
    expect(mocks.update).toHaveBeenCalledWith("cx-1", expect.objectContaining({ date: "2026-10-07", surgeryTimeSpecified: false }))
  })
  it.each(["define", "gestion"] as const)("%s rejects missing company/backend instead of local save", async (kind) => {
    mocks.companyId = undefined
    const view = render(<Client />)
    await expect((kind === "define" ? mocks.define.onSave : mocks.gestion.onSaveGestion)("cx-1", {})).rejects.toThrow()
    mocks.companyId = "company-1"; mocks.surgery.backendId = ""; view.rerender(<Client />)
    await expect((kind === "define" ? mocks.define.onSave : mocks.gestion.onSaveGestion)("cx-1", {})).rejects.toThrow()
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled()
  })
  it("ignores company changes and late same-case closed responses", async () => {
    let resolve!: (value: unknown) => void
    mocks.save.mockImplementation(() => new Promise((done) => { resolve = done }))
    const view = render(<Client />)
    const promise = mocks.define.onSave("cx-1", { fechaEnvioMaterial: "2026-10-07" })
    act(() => mocks.define.onClose())
    mocks.companyId = "company-2"; view.rerender(<Client />)
    mocks.companyId = "company-1"; view.rerender(<Client />)
    await act(async () => { resolve({ id: "backend-1" }); await promise })
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("reports state failure as partial success after confirmed date save", async () => {
    mocks.state.mockRejectedValue(new Error("State failed"))
    render(<Client />)
    let result: any
    await act(async () => { result = await mocks.gestion.onSaveGestion("cx-1", { date: "2026-10-07", time: "", state: "Autorizada" }) })
    expect(mocks.update).toHaveBeenCalled()
    expect(result.partialError).toContain("estado")
  })
  it.each(["define", "gestion"] as const)("%s never dispatches real notifications", async (kind) => {
    mocks.save.mockResolvedValue({ id: "backend-1", surgeryDate: "2026-10-07T03:00:00Z", surgeryTimeSpecified: false, priority: "urgent" })
    render(<Client />)
    await act(async () => { await (kind === "define" ? mocks.define.onSave : mocks.gestion.onSaveGestion)("cx-1", { date: "2026-10-07", time: "", urgente: true, state: "Autorizada", coordinadorCx: "New coordinator" }) })
    expect(mocks.urgent).not.toHaveBeenCalled(); expect(mocks.assigned).not.toHaveBeenCalled()
  })
  it("actual define form preserves a failed note and retries without a date PATCH", async () => {
    mocks.realForms = true
    mocks.note.mockRejectedValueOnce(new Error("Note failed")).mockResolvedValueOnce({})
    render(<Client />)
    act(() => mocks.open.onDefineDate(mocks.surgery))
    fireEvent.change(screen.getByLabelText(/Fecha de Cirugía/), { target: { value: "2026-10-07" } })
    fireEvent.change(screen.getByLabelText(/Hora de Cirugía/), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "Keep failed note" } })
    fireEvent.click(screen.getByRole("button", { name: /Guardar y Programar/ }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("nota sigue pendiente"))
    expect(screen.getByLabelText("Nota")).toHaveValue("Keep failed note")
    expect(screen.getByLabelText(/Fecha de Cirugía/)).toHaveValue("2026-10-07")
    expect(mocks.update).toHaveBeenCalledWith("cx-1", expect.objectContaining({ date: "2026-10-07" }))
    fireEvent.click(screen.getByRole("button", { name: /Guardar y Programar/ }))
    await waitFor(() => expect(screen.queryByRole("button", { name: /Guardar y Programar/ })).toBeNull())
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.note).toHaveBeenCalledTimes(2)
    expect(mocks.urgent).not.toHaveBeenCalled()
  })
  it("actual management form keeps failed state but clears a saved note before retry", async () => {
    mocks.realForms = true
    mocks.save.mockImplementation(async (_company, _id, patch) => ({ id: "backend-1", surgeryDate: patch.surgeryDate, surgeryTimeSpecified: patch.surgeryTimeSpecified, materialShippingDate: "2026-10-06T00:00:00Z", priority: patch.priority || "normal" }))
    mocks.state.mockRejectedValueOnce(new Error("State failed")).mockResolvedValueOnce({})
    const view = render(<Client />)
    act(() => mocks.open.onSelectSurgery(mocks.surgery))
    fireEvent.change(view.container.ownerDocument.querySelector('input[type="date"]')!, { target: { value: "2026-10-07" } })
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "Autorizada" } })
    fireEvent.change(screen.getByPlaceholderText(/Indicaciones para el equipo/), { target: { value: "Saved once" } })
    fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/ }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Pendiente: estado"))
    expect(screen.getByLabelText("Estado")).toHaveValue("Autorizada")
    expect(screen.getByPlaceholderText(/Indicaciones para el equipo/)).toHaveValue("")
    fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/ }))
    await waitFor(() => expect(screen.queryByRole("button", { name: /Guardar Cambios/ })).toBeNull())
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.state).toHaveBeenCalledTimes(2); expect(mocks.note).toHaveBeenCalledTimes(1)
  })
})
