import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"

const mockedStore = vi.hoisted(() => ({
  getComprobantesBySurgeryId: vi.fn(),
  getConsumoBySurgeryId: vi.fn(),
  getDocStatus: vi.fn(),
}))

const mockedAuth = vi.hoisted(() => ({ role: "admin" }))

vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: () => mockedStore,
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ currentAccess: { role: mockedAuth.role } }),
}))

import {
  CaseCard,
  GlobalCoordinationLink,
  ProductiveRecentFinalized,
} from "@/components/coordinadores/CoordinatorInboxView"
import { acceptCoordinationEzequielDevFacts } from "@/components/coordinadores/coordination-filtering"
import type { CoordinationEzequielDevDiagnostic } from "@/lib/api/surgery-adapter"

const source = readFileSync(resolve(process.cwd(), "src/components/coordinadores/CoordinatorInboxView.tsx"), "utf8")
const shareDialogSource = readFileSync(resolve(process.cwd(), "src/components/coordinadores/CoordinatorShareDialog.tsx"), "utf8")
const managementDialogSource = readFileSync(resolve(process.cwd(), "src/components/coordinadores/CoordinatorManagementDialog.tsx"), "utf8")

describe("CoordinatorInboxView compact case card", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development")
    mockedStore.getDocStatus.mockReturnValue("Completa")
    mockedStore.getConsumoBySurgeryId.mockReturnValue({ id: "consumo-1" })
    mockedStore.getComprobantesBySurgeryId.mockReturnValue([{ id: "fv-1", type: "FV" }])
  })

  it("removes the verbose derived block and its copy", () => {
    renderCaseCard(makeFinalizedEntry())
    expect(screen.queryByText(/Próxima acción \(derivada\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Área sugerida \(derivada\)/i)).not.toBeInTheDocument()
    expect(source).not.toContain("CxOperationsDerivedSummary")
  })

  it("keeps the visible case identifier primary with the existing fallback", () => {
    expect(source).toContain('surgery.visibleNumber?.trim() || `CX ${surgery.id}`')
  })

  it("renders icon-led metadata in approved order with payer as Cliente", () => {
    const entry = makeFinalizedEntry()
    entry.surgery = { ...entry.surgery, date: "2026-07-20", time: "09:30", financiador: "OSDE", client: "Otro" }
    renderCaseCard(entry)

    const metadata = screen.getByLabelText("Datos de Paciente FV")
    expect(within(metadata).getAllByRole("term").map((term) => term.textContent)).toEqual(["Fecha", "Médico", "Lugar", "Cliente"])
    expect(screen.getByLabelText("Fecha: 20/07/2026 · 09:30")).toBeInTheDocument()
    expect(screen.getByLabelText("Cliente: OSDE")).toBeInTheDocument()
  })

  it("shows the current situation, suggested actor, next step, and compact path", () => {
    const entry = makeFinalizedEntry()
    entry.bucket = "autorizado"
    entry.surgery = { ...entry.surgery, state: "Autorizada", date: "2026-08-16", preparationState: "Sin preparar" }
    entry.materialAvailabilityDefined = false
    renderCaseCard(entry)

    expect(screen.getByText("Falta información")).toBeInTheDocument()
    expect(screen.getByText("Gestión de Implantes")).toBeInTheDocument()
    expect(screen.getByText("Confirmar disponibilidad antes de preparación")).toBeInTheDocument()
    expect(screen.getByLabelText("Recorrido estimado del caso")).toBeInTheDocument()
  })

  it("does not show incomplete path steps for finalized cases", () => {
    renderCaseCard(makeFinalizedEntry())

    expect(screen.getByText("Recorrido completado · Finalizada")).toBeInTheDocument()
    expect(screen.queryByText("Disponibilidad")).not.toBeInTheDocument()
  })

  it("uses concise metadata fallbacks without an orphan time separator", () => {
    const entry = makeFinalizedEntry()
    entry.surgery = { ...entry.surgery, date: "", time: "09:30", surgeon: "", institution: "", financiador: "", obraSocial: "", client: "" }
    renderCaseCard(entry)
    for (const name of ["Fecha: Sin fecha", "Médico: Médico sin definir", "Lugar: Lugar sin definir", "Cliente: Cliente sin definir"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument()
    }
    expect(screen.queryByText(/Sin fecha ·/)).not.toBeInTheDocument()
  })

  it("maps the five approved actions and omits Correo and generic overflow", () => {
    const onManage = vi.fn()
    const onTracking = vi.fn()
    const onShare = vi.fn()
    const onUrgent = vi.fn()
    const onOpenLogistics = vi.fn()
    renderCaseCard(makeFinalizedEntry(), { onManage, onTracking, onShare, onUrgent, onOpenLogistics })

    for (const [label, handler] of [["Gestionar", onManage], ["Novedad", onTracking], ["Compartir", onShare], ["Urgente", onUrgent], ["Logística", onOpenLogistics]] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }))
      expect(handler).toHaveBeenCalledOnce()
    }
    expect(screen.queryByText("Correo")).not.toBeInTheDocument()
    expect(screen.queryByText("Más acciones")).not.toBeInTheDocument()
    expect(source).toContain('initialManagementFocus: "urgency"')
    expect(managementDialogSource).toContain('initialManagementFocus === "urgency"')
  })

  it("shows at most three chips and discloses additional alerts by touch or keyboard focus", () => {
    const entry = makeFinalizedEntry()
    entry.bucket = "autorizado"
    entry.surgery = { ...entry.surgery, state: "Autorizada", urgente: true, coordinadorCx: "", coordinadorContactId: "", coordinatorAssignmentState: undefined }
    entry.materialAvailabilityDefined = false
    entry.sla = { tone: "overdue", label: ">=48 hs", hoursElapsed: 50 }
    renderCaseCard(entry)

    expect(screen.getByText("SLA vencido")).toBeInTheDocument()
    const disclosure = screen.getByRole("button", { name: "+3 alertas" })
    expect(disclosure).toHaveAttribute("aria-expanded", "false")
    disclosure.focus()
    expect(disclosure).toHaveFocus()
    fireEvent.click(disclosure)
    expect(disclosure).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByLabelText("Alertas adicionales")).toHaveTextContent("Sin asignarSin disponibilidadUrgente")
  })

  it("shows an accessible pending-close count only for finalized cases and discloses missing items", () => {
    mockedStore.getDocStatus.mockReturnValue("Incompleta")
    mockedStore.getConsumoBySurgeryId.mockReturnValue(undefined)
    mockedStore.getComprobantesBySurgeryId.mockReturnValue([])
    const { rerender } = renderCaseCard(makeFinalizedEntry())
    const trigger = screen.getByRole("button", { name: "Cierre pendiente: 3 requisitos faltantes" })
    expect(trigger).toHaveClass("size-11")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    trigger.focus()
    fireEvent.keyDown(trigger, { key: "Enter" })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(trigger).toHaveFocus()
    expect(screen.getByText("Falta: Documentación, Consumo, Facturación")).toBeInTheDocument()
    fireEvent.keyDown(trigger, { key: " " })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(trigger).toHaveFocus()

    const active = makeFinalizedEntry()
    active.bucket = "autorizado"
    active.surgery = { ...active.surgery, state: "Autorizada" }
    rerender(caseCard(active))
    expect(screen.queryByRole("button", { name: /Cierre pendiente/ })).not.toBeInTheDocument()
  })

  it("accepts canonical DEV facts only for the exact productive personal company/subject/assignment context", () => {
    const entry = makeAcceptedDevEntry()
    const valid = acceptedDevInput(entry, devDiagnostic("G", ["Documentación", "Consumo", "Facturación"]))
    expect(acceptCoordinationEzequielDevFacts(valid)).toMatchObject({ accepted: true, facts: { stableKey: "G" } })
    for (const patch of [
      { mode: "dev-preview" as const },
      { surface: "global" as const },
      { activeCompany: { id: "foreign", name: "Districorr DEV" } },
      { subject: { contactId: "foreign", label: "Ezequiel DEV" } },
      { contextAccepted: false },
    ]) expect(acceptCoordinationEzequielDevFacts({ ...valid, ...patch }).accepted).toBe(false)
  })

  it("keeps productive acceptance inert in production mode", () => {
    vi.stubEnv("NODE_ENV", "production")
    const entry = makeAcceptedDevEntry()
    expect(acceptCoordinationEzequielDevFacts(acceptedDevInput(entry, devDiagnostic("G", ["Documentación"]))).accepted).toBe(false)
  })

  it.each([
    ["E", ["Documentación"], "Cierre pendiente: 1 requisito faltante"],
    ["F", ["Consumo"], "Cierre pendiente: 1 requisito faltante"],
    ["G", ["Documentación", "Consumo", "Facturación"], "Cierre pendiente: 3 requisitos faltantes"],
    ["H", [], null],
  ] as const)("renders active accepted %s pending facts without lifecycle finalization", (key, pending, accessibleName) => {
    const entry = makeAcceptedDevEntry()
    const decision = acceptCoordinationEzequielDevFacts(acceptedDevInput(entry, devDiagnostic(key, pending)))
    if (!decision.accepted) throw new Error("expected accepted DEV facts")
    render(caseCard(entry, {}, false, decision.facts))
    if (!accessibleName) {
      expect(screen.queryByRole("button", { name: /Cierre pendiente/ })).not.toBeInTheDocument()
      return
    }
    const trigger = screen.getByRole("button", { name: accessibleName })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    trigger.focus(); fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true"); expect(trigger).toHaveFocus()
    expect(screen.getByText(`Falta: ${pending.join(", ")}`)).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false"); expect(trigger).toHaveFocus()
  })

  it.each([
    ["Documentación", "Cierre pendiente: 1 requisito faltante"],
    ["Consumo", "Cierre pendiente: 1 requisito faltante"],
    ["none", null],
  ])("renders only the %s pending-close fixture contract", (pending, accessibleName) => {
    mockedStore.getDocStatus.mockReturnValue(pending === "Documentación" ? "Incompleta" : "Completa")
    mockedStore.getConsumoBySurgeryId.mockReturnValue(pending === "Consumo" ? undefined : { id: "consumo-1" })
    mockedStore.getComprobantesBySurgeryId.mockReturnValue([{ id: "fv-1", type: "FV" }])
    renderCaseCard(makeFinalizedEntry())

    if (!accessibleName) {
      expect(screen.queryByRole("button", { name: /Cierre pendiente/ })).not.toBeInTheDocument()
      return
    }
    const trigger = screen.getByRole("button", { name: accessibleName })
    fireEvent.click(trigger)
    expect(screen.getByText(`Falta: ${pending}`)).toBeInTheDocument()
    expect(screen.queryByText(/Falta: Remitos/)).not.toBeInTheDocument()
  })

  it("hides the coordinator in personal cards and can show it for a global/admin context", () => {
    const { rerender } = renderCaseCard(makeFinalizedEntry())
    expect(screen.queryByText("Coordinador: Nelson")).not.toBeInTheDocument()
    rerender(caseCard(makeFinalizedEntry(), {}, true))
    expect(screen.getByText("Coordinador: Nelson")).toBeInTheDocument()
  })

  it("keeps a fixed server-resolved personal owner and removes production subject switching", () => {
    expect(source).toContain("controller.response?.context.viewSubject?.label")
    expect(source).toContain("normalizeCoordinationBaseSnapshot")
    expect(source).not.toContain("useSearchParams")
    expect(source).not.toContain("Ver otros coordinadores")
    expect(source).not.toContain("Seleccionar coordinador")
    expect(source).not.toContain("DEFAULT_COORDINATOR")
    expect(source).toContain("CoordinationMetricFilters")
  })

  it("integrates the released state surface and the isolated preview root", () => {
    expect(source).toContain("deriveCoordinationUiState")
    expect(source).toContain('<CoordinationStateSurface state={coordinationState} surface="personal"')
    expect(source).toContain("<CoordinationPreviewRoot controller={controller} />")
  })

  it.each(["admin", "operator"])("shows Panel global for %s", (role) => {
    mockedAuth.role = role
    render(<GlobalCoordinationLink />)
    expect(screen.getByRole("link", { name: "Panel global" })).toHaveAttribute("href", "/coordinadores")
  })

  it("does not render a hidden or focusable global control for coordinator", () => {
    mockedAuth.role = "coordinator"
    render(<GlobalCoordinationLink />)
    expect(screen.queryByRole("link", { name: "Panel global" })).not.toBeInTheDocument()
    expect(screen.queryByText("Panel global")).not.toBeInTheDocument()
  })

  it("replaces legacy productive metrics and filter strip only in the personal graph", () => {
    expect(source).toContain("<CoordinationMetricFilters")
    expect(source).toContain("<CoordinationAdvancedFilters")
    expect(source).not.toContain("ProductiveQuickFilters")
    expect(source).not.toContain("ProductiveCoordinationMetrics")
    expect(source).not.toContain("CoordinationSecondaryFilters")
    expect(source).toContain("<CoordinationPreviewRoot controller={controller} />")
  })

  it("uses the pure AND pipeline, contradiction state, aggregate live region, and context key reset", () => {
    expect(source).toContain("filterCoordinationCases(snapshot, selectedMetrics, appliedAdvanced)")
    expect(source).toContain("hasFilterContradiction(selectedMetrics, appliedAdvanced)")
    expect(source).toContain("hasContradiction")
    expect(source).toContain('aria-live="polite"')
    expect(source.match(/aria-live="polite"/g)).toHaveLength(1)
    expect(source).toContain('loadedAnnouncements="external"')
    expect(source).toContain('emptyStateVariant="productive-personal"')
    expect(source).not.toContain("evaluationNow: Date.now()")
    expect(source).toContain("evaluationNow: acceptedAt")
    expect(source).toContain("controller.acceptedContextKey ?? controller.trustContextKey")
    expect(source).not.toContain("localStorage")
    expect(source).not.toContain("useSearchParams")
    expect(source).not.toContain("AvailabilityRequest")
  })

  it("keeps productive recent finalized collapsed by default and expands accessibly", () => {
    render(<ProductiveRecentFinalized count={2}><p>Fila finalizada</p></ProductiveRecentFinalized>)
    const trigger = screen.getByRole("button", { name: /Finalizadas recientes/ })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Fila finalizada")).not.toBeInTheDocument()
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Fila finalizada")).toBeInTheDocument()
  })

  it("keeps plain 48-hour copy in the share dialog", () => {
    expect(shareDialogSource).toContain("{getSlaDisplayLabel(entry.sla.tone)}")
    expect(shareDialogSource).not.toContain("SLA {entry.sla.label}")
  })

  it("uses responsive no-overflow structure and 44px mobile action targets", () => {
    renderCaseCard(makeFinalizedEntry())
    expect(document.querySelector("[data-coordinator-case-card='compact-responsive']")).toHaveClass("min-w-0")
    expect(source).toContain("grid-cols-2")
    expect(source).toContain("sm:grid-cols-4")
    for (const label of ["Gestionar", "Novedad", "Compartir", "Urgente", "Logística"]) {
      expect(screen.getByRole("button", { name: label })).toHaveClass("min-h-11")
    }
    expect(managementDialogSource).toContain('side="bottom"')
    expect(managementDialogSource).toContain('h-[100dvh]')
  })

  it("uses the OSSUM ERP Modern management hierarchy", () => {
    expect(managementDialogSource).toContain('aria-label="Contexto del expediente"')
    for (const section of ["Cirugía", "Disponibilidad y envío", "Coordinación", "Novedad"]) {
      expect(managementDialogSource).toContain(`>${section}</h3>`)
    }
    expect(managementDialogSource).toContain("var(--ossum-action)")
    expect(managementDialogSource).toContain("Guardar gestión")
    expect(managementDialogSource).toContain('htmlFor="coord-priority"')
    expect(managementDialogSource).toContain('id="coord-priority"')
    expect(managementDialogSource).not.toContain("Gestión simple, mismo seguimiento")
  })

  it("does not expose unnamed icon-only controls", () => {
    renderCaseCard(makeFinalizedEntry())
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName()
    }
  })
})

type CaseCardHandlers = Partial<{
  onManage: () => void
  onTracking: () => void
  onOpenLogistics: () => void
  onShare: () => void
  onUrgent: () => void
}>

function caseCard(entry: CoordinatorCase, handlers: CaseCardHandlers = {}, showCoordinator = false, acceptedDevFacts: Parameters<typeof CaseCard>[0]["acceptedDevFacts"] = null) {
  return <CaseCard
    entry={entry}
    onManage={handlers.onManage ?? vi.fn()}
    onTracking={handlers.onTracking ?? vi.fn()}
    onOpenLogistics={handlers.onOpenLogistics ?? vi.fn()}
    onShare={handlers.onShare ?? vi.fn()}
    onUrgent={handlers.onUrgent ?? vi.fn()}
    showCoordinator={showCoordinator}
    acceptedDevFacts={acceptedDevFacts}
  />
}

function makeAcceptedDevEntry(): CoordinatorCase {
  const entry = makeFinalizedEntry()
  entry.bucket = "autorizado"
  entry.surgery = {
    ...entry.surgery,
    backendId: "b318570e-2007-545c-9dd6-75182343c88f",
    state: "Autorizada",
    autorizado: true,
    coordinadorContactId: "target-dev",
    coordinadorCx: "Ezequiel DEV",
    coordinatorAssignmentState: "resolved",
    coordinatorAssignments: [{ assignmentId: "assignment-dev", contactId: "target-dev", label: "Ezequiel DEV", isPrimary: true, slaBasis: { status: "missing", diagnosticCode: "assignment_created_at_missing" } }],
  }
  return entry
}

function devDiagnostic(stableKey: "E" | "F" | "G" | "H", pending: readonly ("Documentación" | "Consumo" | "Facturación")[]): CoordinationEzequielDevDiagnostic {
  return { code: "accepted", stableKey, facts: { surgeryId: "b318570e-2007-545c-9dd6-75182343c88f", companyId: "company-dev", companyMarker: "Districorr DEV", organizationMarker: "ossum-dev", targetContactId: "target-dev", targetLabel: "Ezequiel DEV", targetRole: "coordinator", cxName: `SYN-${stableKey}`, cxDate: null, institution: null, client: null, state: "Autorizada", metrics: [], availabilityDate: null, pending, matrixDigest: "matrix", idAuthorityDigest: "identity" } }
}

function acceptedDevInput(entry: CoordinatorCase, diagnostic: CoordinationEzequielDevDiagnostic) {
  return { diagnostic, isAuthenticated: true, activeCompany: { id: "company-dev", name: "Districorr DEV" }, mode: "production" as const, surface: "personal" as const, readOnly: false, hasSuccessfulData: true, contextAccepted: true, subject: { contactId: "target-dev", label: "Ezequiel DEV" }, entry }
}

function renderCaseCard(entry: CoordinatorCase, handlers: CaseCardHandlers = {}) {
  return render(caseCard(entry, handlers))
}

function makeFinalizedEntry(): CoordinatorCase {
  return {
    surgery: {
      id: "cx-1",
      patient: "Paciente FV",
      surgeon: "Dra. Prueba",
      institution: "Institución",
      coordinadorCx: "Nelson",
      state: "Finalizada",
      preparationState: "Retirado",
      facturado: false,
    } as CoordinatorCase["surgery"],
    history: [],
    bucket: "finalizado",
    subgroup: null,
    materialAvailabilityDefined: true,
    materialAvailabilityLabel: "15/07/2026",
    sla: { tone: "ok", label: "<24 hs", hoursElapsed: 1 },
  }
}
