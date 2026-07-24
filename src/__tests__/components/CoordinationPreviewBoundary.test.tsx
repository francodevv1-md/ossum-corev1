import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CoordinationPreviewRoot } from "@/components/coordinadores/preview/CoordinationPreviewRoot"
import { deriveCoordinationPreviewPresentation } from "@/components/coordinadores/preview/CoordinationPreviewCaseRow"
import type { CoordinationViewController } from "@/hooks/useCoordinationView"

const previewDirectory = resolve(process.cwd(), "src/components/coordinadores/preview")
const sources = readdirSync(previewDirectory).filter((file) => file.endsWith(".tsx")).map((file) => ({ file, source: readFileSync(join(previewDirectory, file), "utf8") }))
const joinedSource = sources.map(({ source }) => source).join("\n")

function controller(overrides: Partial<CoordinationViewController> = {}): CoordinationViewController {
  const target = { contactId: "contact-1", label: "Nelson DEV" }
  const row = {
    id: "surgery-1",
    companyId: "company-1",
    branchId: null,
    visibleNumber: "CX-001",
    patientId: "patient-1",
    doctorId: null,
    institutionId: null,
    payerContactId: null,
    classification: null,
    description: "Rodilla",
    priority: null,
    cxStatus: "AUTHORIZED",
    prepStatus: null,
    probableDate: null,
    scheduledDate: null,
    surgeryDate: null,
    performedDate: null,
    cancelledDate: null,
    source: null,
    notes: null,
    createdAt: new Date("2026-07-18T10:00:00Z"),
    updatedAt: new Date("2026-07-18T10:00:00Z"),
    patient: { id: "patient-1", firstName: "Paciente", lastName: "Prueba", legalName: null },
    doctor: null,
    institution: null,
    payer: null,
    coordinatorAssignments: [],
    coordinatorAssignment: { status: "resolved" as const, resolved: target },
  }
  return {
    mode: "dev-preview",
    surface: "personal",
    selectedTarget: target,
    response: {
      context: { mode: "dev-preview", surface: "personal", readOnly: true, actor: { userId: "actor-1", label: "Ana Admin" }, personalResolution: { status: "resolved", subject: target }, viewSubject: target },
      previewCapability: { enabled: true, targets: [target] },
      surgeries: [row],
    },
    previewRows: [row],
    previewDenied: false,
    waitingForAuth: false,
    loading: false,
    error: null,
    hasSuccessfulData: true,
    isInitialLoading: false,
    isRefreshing: false,
    isInitialError: false,
    isRefreshError: false,
    trustContextKey: "actor-1:company-1:dev-preview:personal:contact-1",
    refresh: vi.fn(),
    changePreviewSurface: vi.fn(),
    changePreviewTarget: vi.fn(),
    exitPreview: vi.fn(),
    ...overrides,
  }
}

describe("dedicated Coordination preview boundary", () => {
  it("accounts for every local static import and has no dynamic imports", () => {
    const localNames = new Set(sources.map(({ file }) => file.replace(/\.tsx$/, "")))
    const allowedImports = [
      "react",
      "@/components/ui/button",
      "@/components/coordinadores/CoordinationSecondaryFilters",
      "@/components/coordinadores/CoordinationStateSurface",
      "@/components/coordinadores/coordination-ui-state",
      "@/components/coordinadores/coordinator-queue.helpers",
      "@/hooks/useCoordinationView",
      "@/lib/services/coordination-view.service",
      "@/lib/services/personal-coordinator-resolver.service",
      "@/lib/cx-operations-derived",
    ]
    for (const { source } of sources) {
      for (const match of source.matchAll(/from\s+["']@\/components\/coordinadores\/preview\/([^"']+)["']/g)) {
        expect(localNames.has(match[1])).toBe(true)
      }
      for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
        expect(match[1].startsWith("@/components/coordinadores/preview/") || allowedImports.includes(match[1])).toBe(true)
      }
    }
    expect(joinedSource).not.toMatch(/import\s*\(/)
  })

  it("reaches networking only through the approved GET controller", () => {
    const hookSource = readFileSync(resolve(process.cwd(), "src/hooks/useCoordinationView.ts"), "utf8")
    const clientSource = readFileSync(resolve(process.cwd(), "src/lib/api/coordination-view.ts"), "utf8")
    expect(joinedSource).not.toMatch(/\bfetch\s*\(/)
    expect(hookSource).toContain("fetchCoordinationView")
    expect(clientSource).toContain('{ method: "GET", cache: "no-store" }')
    for (const token of [["PO", "ST"], ["P", "UT"], ["PA", "TCH"], ["DEL", "ETE"]].map((parts) => parts.join(""))) {
      expect(clientSource).not.toContain(`method: "${token}"`)
    }
  })

  it("contains no write-capable descendant, method, workspace, or route target", () => {
    const prohibited = [
      ["useCirugia", "Actions"].join(""),
      ["CoordinatorManagement", "Dialog"].join(""),
      ["Expediente", "FullView"].join(""),
      ["ChangeState", "Dialog"].join(""),
      ["PO", "ST"].join(""), ["P", "UT"].join(""), ["PA", "TCH"].join(""), ["DEL", "ETE"].join(""),
      ["router", "."].join(""),
      ["href", "="].join(""),
    ]
    for (const token of prohibited) expect(joinedSource).not.toContain(token)
  })

  it("renders actor and subject separately with read-only semantics", () => {
    render(<CoordinationPreviewRoot controller={controller()} />)
    expect(screen.getByText("Vista de prueba DEV · Solo lectura")).toBeInTheDocument()
    expect(screen.getByText("Sesión real: Ana Admin")).toBeInTheDocument()
    expect(screen.getByText("Bandeja visualizada: Nelson DEV")).toBeInTheDocument()
  })

  it("keeps filtering and row disclosure local without network refetch", () => {
    const refresh = vi.fn()
    render(<CoordinationPreviewRoot controller={controller({ refresh })} />)
    fireEvent.click(screen.getByRole("button", { name: /Más filtros/ }))
    fireEvent.change(screen.getByLabelText("Buscar casos de coordinación"), { target: { value: "sin coincidencia" } })
    expect(screen.getByText("No hay casos con estos filtros.")).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it("tears down the rendered row before invoking exit", () => {
    const exitPreview = vi.fn()
    render(<CoordinationPreviewRoot controller={controller({ exitPreview })} />)
    expect(document.querySelector("[data-preview-case-id='surgery-1']")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Volver a mi bandeja" }))
    expect(document.querySelector("[data-preview-case-id='surgery-1']")).not.toBeInTheDocument()
    expect(exitPreview).toHaveBeenCalledOnce()
  })

  it("does not render preview controls without server-issued capability", () => {
    const value = controller()
    render(<CoordinationPreviewRoot controller={controller({ response: { ...value.response!, previewCapability: undefined } })} />)
    expect(screen.queryByLabelText("Controles de vista de prueba")).not.toBeInTheDocument()
  })

  it("tears down rows synchronously when subject or trust context changes", () => {
    const initial = controller()
    const { rerender } = render(<CoordinationPreviewRoot controller={initial} />)
    expect(document.querySelector("[data-preview-case-id='surgery-1']")).toBeInTheDocument()

    rerender(<CoordinationPreviewRoot controller={controller({
      selectedTarget: { contactId: "contact-2", label: "Ezequiel DEV" },
      hasSuccessfulData: false,
      trustContextKey: "actor-1:company-1:dev-preview:personal:contact-2",
      response: initial.response,
      previewRows: initial.previewRows,
    })} />)
    expect(document.querySelector("[data-preview-case-id='surgery-1']")).not.toBeInTheDocument()
    expect(screen.queryByText("Bandeja visualizada: Nelson DEV")).not.toBeInTheDocument()

    rerender(<CoordinationPreviewRoot controller={controller({
      hasSuccessfulData: false,
      trustContextKey: "actor-1:company-2:dev-preview:personal:contact-1",
      response: initial.response,
      previewRows: initial.previewRows,
    })} />)
    expect(document.querySelector("[data-preview-case-id='surgery-1']")).not.toBeInTheDocument()
  })

  it("preserves shared subgroup, preparation, SLA, availability, incidents, and next-action semantics", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-18T12:00:00.000Z"))
    const row = {
      ...controller().previewRows[0],
      prepStatus: "FROZEN",
      scheduledDate: new Date("2026-07-20T12:00:00.000Z"),
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      coordinatorAssignments: [{ assignmentId: "assignment-1", contactId: "contact-1", label: "Nelson DEV", isPrimary: true, createdAt: "2026-07-16T11:00:00.000Z" }],
    }
    const presentation = deriveCoordinationPreviewPresentation(row)

    expect(presentation.entry.surgery.state).toBe("Autorizada")
    expect(presentation.entry.surgery.preparationState).toBe("Congelado")
    expect(presentation.entry.bucket).toBe("autorizado")
    expect(presentation.entry.subgroup).toBe("congelada")
    expect(presentation.entry.sla.tone).toBe("overdue")
    expect(presentation.entry.sla.baseDate).toBe("2026-07-16T11:00:00.000Z")
    expect(presentation.entry.materialAvailabilityDefined).toBe(false)
    expect(presentation.entry.materialAvailabilityLabel).toBe("Disponibilidad sin definir")
    expect(presentation.incidentReasons).toEqual(expect.arrayContaining(["SLA vencido", "Sin disponibilidad"]))
    expect(presentation.nextActionLabel).toBe("Resolver coordinación y fecha")
  })

  it("renders four metrics, mobile quick filters, and recent finalized collapsed by default", () => {
    const base = controller()
    const rows = [
      base.previewRows[0],
      { ...base.previewRows[0], id: "transit", cxStatus: "IN_TRANSIT" },
      { ...base.previewRows[0], id: "final", cxStatus: "FINALIZED", performedDate: new Date("2026-07-18T10:00:00Z") },
    ]
    render(<CoordinationPreviewRoot controller={controller({ previewRows: rows, response: { ...base.response!, surgeries: rows } })} />)

    const metrics = screen.getByLabelText("Métricas de coordinación")
    for (const label of ["Pendientes", "SLA vencido", "Sin disponibilidad", "En tránsito"]) expect(metrics).toHaveTextContent(label)
    const quickFilters = document.querySelector("[data-preview-quick-filters='horizontal-scroll']")
    expect(quickFilters).toHaveClass("overflow-x-auto")
    for (const label of ["Mi bandeja", "Vence hoy", "Vencidas", "Sin fecha"]) expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
    const recent = document.querySelector("[data-preview-recent-finalized='collapsed']") as HTMLDetailsElement
    expect(recent).toBeInTheDocument()
    expect(recent.open).toBe(false)
  })

  afterEach(() => vi.useRealTimers())
})
