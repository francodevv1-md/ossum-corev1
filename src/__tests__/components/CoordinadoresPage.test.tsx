import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/app/coordinadores/page.tsx"), "utf8")
const sidebarSource = readFileSync(resolve(process.cwd(), "src/components/layout/sidebar.tsx"), "utf8")

describe("CoordinadoresPage CX operations adoption", () => {
  it("renders the locally polished derived summary without duplicating the resolver", () => {
    expect(source).toContain('import { deriveCxOperationsDisplay } from "@/lib/cx-operations-derived"')
    expect(source).not.toContain("CxOperationsDerivedSummary")
    expect(source).toContain("<LocalCxOperationsSummary display={operationsDisplay} />")
    expect(source).toContain("Próxima acción:</dt>")
    expect(source).toContain("Área sugerida:</dt>")
    expect(source).toContain("Derivada · {display.nextActionLabel}")
    expect(source).toContain("Derivada · {display.responsibleAreaLabel}")
    expect(source).not.toContain("(derivada): Derivada")
    expect(source).not.toContain("function getGlobalNextActionLabel")
  })

  it("derives finalized closure signals from existing coordinator page data", () => {
    expect(source).toContain('documentationIncomplete: store.getDocStatus(surgery.id) === "Incompleta"')
    expect(source).toContain("consumptionAbsent: !store.getConsumoBySurgeryId(surgery.id)")
    expect(source.match(/invoiceAbsent: !surgery\.facturado && !store\.getComprobantesBySurgeryId\(surgery\.id\)\.find\(\(comprobante\) => comprobante\.type === "FV"\)/g)).toHaveLength(2)
  })

  it("keeps identifier hierarchy and existing operational callbacks", () => {
    expect(source).toContain('surgery.visibleNumber?.trim() || `CX ${surgery.id}`')
    for (const metadata of ["{surgery.patient}", "Dr. {surgery.surgeon", "{surgery.institution", "{getCoordinatorLabel(surgery)}", "formatDate(surgery.date)", "{surgery.time}"]) {
      expect(source).toContain(metadata)
    }
    for (const callback of ["setManagingCase({ entry, initialView: \"gestion\" })", "setManagingCase({ entry, initialView: \"seguimiento\" })", 'openExpedienteTab(surgery.id, "logistica")', "selection.openExpediente(surgery.id)"]) {
      expect(source).toContain(callback)
    }
  })

  it("renames the visible module while preserving its route", () => {
    expect(source).toContain(">Coordinación</h1>")
    expect(sidebarSource).toContain('{ label: "Coordinación", href: "/coordinadores"')
    expect(sidebarSource).not.toContain('{ label: "Coordinadores", href: "/coordinadores"')
  })

  it("orders attention and the case queue before secondary workload reporting", () => {
    expect(source.indexOf("Requieren atención")).toBeLessThan(source.indexOf("Filtros del panel global") === -1 ? source.indexOf("Buscar casos de coordinación") : source.indexOf("Filtros del panel global"))
    expect(source.indexOf("Buscar casos de coordinación")).toBeLessThan(source.indexOf("Resumen de carga"))
    expect(source.indexOf("(Object.keys(BUCKET_CONFIG)")).toBeLessThan(source.lastIndexOf("Resumen de carga"))
  })

  it("keeps metrics compact and reduces status and incident chip fragmentation", () => {
    expect(source).not.toContain("min-h-20")
    expect(source.match(/min-h-12 items-center justify-between/g)).toHaveLength(2)
    expect(source).toContain("setOnlyIncidents((prev) => !prev)")
    expect(source).toContain('setCoordFilter((prev) => (prev === "Sin asignar" ? "" : "Sin asignar"))')
    expect(source.match(/Estado CX: \{surgery\.state\}/g)).toHaveLength(2)
    expect(source.match(/Preparación: \{surgery\.preparationState\}/g)).toHaveLength(2)
    expect(source.match(/Atención: \{incidentReasons\.join\(" · "\)\}/g)).toHaveLength(2)
    expect(source).not.toContain("incidentReasons.map")
    expect(source.match(/entry\.materialAvailabilityLabel\}<\/span>/g)).toHaveLength(2)
    expect(source.match(/getSlaDisplayLabel\(entry\.sla\.tone\)/g)).toHaveLength(2)
    expect(source.match(/surgery\.urgente/g)).toHaveLength(2)
  })

  it("exposes pressed-state filters and one primary action with tertiary destinations", () => {
    expect(source).toContain("aria-pressed={onlyIncidents}")
    expect(source).toContain("Abrir seguimiento")
    expect(source).toContain("Más acciones")
    expect(source).toContain(">Logística</DropdownMenuItem>")
    expect(source).toContain(">Expediente</DropdownMenuItem>")
  })

  it("loads the productive global view through the released controller and state model", () => {
    expect(source).toContain("<CoordinationGlobalAccessBoundary>")
    expect(source).toContain("<GlobalCoordinationPage />")
    expect(source).toContain('useCoordinationView({ surface: "global" })')
    expect(source).toContain("deriveCoordinationUiState")
    expect(source).toContain('<CoordinationStateSurface state={coordinationState} surface="global"')
  })

  it("derives only the Coordination sidebar destination from current role", () => {
    expect(sidebarSource).toContain("getCoordinationDestination(currentAccess?.role)")
    expect(sidebarSource).toContain('item.label === "Coordinación"')
    expect(sidebarSource).toContain(': item)')
  })

  it("keeps the productive global component tree separate from preview presentation", () => {
    expect(source).not.toContain("CoordinationPreviewRoot")
    expect(source).not.toContain("previewRows")
  })
})
