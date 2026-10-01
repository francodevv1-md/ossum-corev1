"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useOrtoTrackStore } from "@/lib/store"
import { useCirugiaSelection } from "@/hooks/useCirugiaSelection"
import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExpedienteFullView } from "@/components/expediente/ExpedienteFullView"
import { ChangeStateDialog } from "@/components/cirugias/dialogs/ChangeStateDialog"
import { ChangeDateDialog } from "@/components/cirugias/dialogs/ChangeDateDialog"
import { SuspendDialog } from "@/components/cirugias/dialogs/SuspendDialog"
import { CancelDialog } from "@/components/cirugias/dialogs/CancelDialog"
import { AddNoteDialog } from "@/components/cirugias/dialogs/AddNoteDialog"
import { PresupuestoDialog } from "@/components/cirugias/dialogs/PresupuestoDialog"
import { FacturarDialog as FacturarDialogNuevo } from "@/components/facturacion/FacturarDialog"
import { CoordinatorManagementDialog } from "@/components/coordinadores/CoordinatorManagementDialog"
import { CoordinatorShareDialog } from "@/components/coordinadores/CoordinatorShareDialog"
import {
  getAuthorizedSubgroup,
  getCoordinatorAssignmentBaseDate,
  getCoordinatorBucket,
  getCoordinatorCardAlertDisplay,
  getCoordinatorCardMetadata,
  getCoordinatorLabel,
  getMaterialAvailability,
  getPendingClosureItems,
  getSlaMeta,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import { cn } from "@/lib/utils"
import { SURGERY_STATE_OPTIONS } from "@/lib/statusHelpers"

const COORDINATION_STATE_OPTIONS = SURGERY_STATE_OPTIONS
  .map((option) => option.value)
  .filter(Boolean)
import { getFacturacionStatus } from "@/lib/cirugias.utils"
import { CX_STATE_COLORS } from "@/lib/shared-constants"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Building2, CalendarDays, ChevronDown, ClipboardList, Loader2, MapPin, MessageSquarePlus, Share2, Stethoscope, TriangleAlert, Truck } from "lucide-react"
import { useCoordinationView, type CoordinationViewController } from "@/hooks/useCoordinationView"
import { CoordinationPreviewRoot } from "@/components/coordinadores/preview/CoordinationPreviewRoot"
import { CoordinationStateSurface } from "@/components/coordinadores/CoordinationStateSurface"
import { deriveCoordinationUiState } from "@/components/coordinadores/coordination-ui-state"
import { useAuth } from "@/components/auth/AuthProvider"
import { coordinationEzequielDevDiagnostic } from "@/lib/api/surgery-adapter"
import { canAccessGlobalCoordination } from "@/lib/permissions/coordination"
import { deriveCoordinatorCaseAdvisory } from "@/lib/cx-operations-derived"
import { createEmptyAdvancedFilters } from "@/components/coordinadores/CoordinationAdvancedFilters"
import { CoordinationWorkspace } from "@/components/coordinadores/workspace/CoordinationWorkspace"
import {
  countActiveAdvancedFilters,
  acceptCoordinationEzequielDevFacts,
  filterCoordinationCases,
  hasFilterContradiction,
  normalizeCoordinationBaseSnapshot,
  type AdvancedFilters,
  type AcceptedCoordinationDevFacts,
  type MetricKey,
} from "@/components/coordinadores/coordination-filtering"

const STATE_COLORS = CX_STATE_COLORS

type ManagingCaseState = {
  entry: CoordinatorCase
  initialView: "gestion" | "seguimiento"
  initialManagementFocus?: "urgency"
  initialTrackingFilter?: "todo" | "notas" | "archivos" | "fotos" | "autorizado" | "correo"
  initialTrackingAction?: "note" | "mail" | "image" | "auth"
}

function mapCoordinationDevMetric(metric: AcceptedCoordinationDevFacts["metrics"][number]): MetricKey {
  if (metric === "Poner fecha") return "put-date"
  if (metric === "Fuera de plazo") return "overdue"
  if (metric === "Coordinadas") return "coordinated"
  return "in-transit"
}

function PersonalCasePath({ entry }: { entry: CoordinatorCase }) {
  if (entry.bucket === "finalizado") {
    return <p className="text-[10px] font-medium text-slate-600" aria-label="Recorrido estimado del caso">Recorrido completado · {entry.surgery.state}</p>
  }

  const steps = [
    { label: "Ingreso", done: true },
    { label: "Fecha", done: Boolean(entry.surgery.date?.trim()) },
    { label: "Disponibilidad", done: entry.materialAvailabilityDefined },
    { label: "Preparación", done: entry.surgery.preparationState !== "Sin preparar" },
    { label: "Envío", done: entry.bucket === "transito" || entry.surgery.preparationState === "Enviado" || entry.surgery.preparationState === "Entregado" },
  ]
  const activeIndex = Math.max(0, steps.findIndex((step) => !step.done))
  return <ol className="flex min-w-0 flex-wrap items-center gap-1 text-[10px]" aria-label="Recorrido estimado del caso">{steps.map((step, index) => <li key={step.label} className="flex items-center gap-1"><span className={cn("font-semibold", step.done ? "text-[var(--ossum-action)]" : index === activeIndex ? "text-[var(--ossum-navy)]" : "text-slate-400")}>{step.done ? "✓" : index === activeIndex ? "●" : "○"}</span><span className={step.done || index === activeIndex ? "text-slate-700" : "text-slate-400"}>{step.label}</span>{index < steps.length - 1 ? <span className="text-slate-300">›</span> : null}</li>)}</ol>
}

export function CaseCard({
  entry,
  onManage,
  onTracking,
  onOpenLogistics,
  onShare,
  onUrgent,
  showCoordinator = false,
  acceptedDevFacts = null,
}: {
  entry: CoordinatorCase
  onManage: () => void
  onTracking: () => void
  onOpenLogistics: () => void
  onShare: () => void
  onUrgent: () => void
  showCoordinator?: boolean
  acceptedDevFacts?: AcceptedCoordinationDevFacts | null
}) {
  const store = useOrtoTrackStore()
  const surgery = entry.surgery
  const stateClassName = STATE_COLORS[surgery.state] || "bg-slate-400 text-white"
  const metadata = getCoordinatorCardMetadata(surgery)
  const context = deriveCoordinatorCaseAdvisory(entry)
  const { highestPriorityRisk, hiddenAlerts } = getCoordinatorCardAlertDisplay(entry)
  const closureSignals = {
    documentationIncomplete: store.getDocStatus(surgery.id) === "Incompleta",
    consumptionAbsent: !store.getConsumoBySurgeryId(surgery.id),
    invoiceAbsent: !surgery.facturado && !store.getComprobantesBySurgeryId(surgery.id).find((comprobante) => comprobante.type === "FV"),
  }
  const pendingClosureItems = acceptedDevFacts ? [...acceptedDevFacts.pending] : entry.bucket === "finalizado" ? getPendingClosureItems(closureSignals) : []
  const caseReference = surgery.visibleNumber?.trim() || `CX ${surgery.id}`
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [closureOpen, setClosureOpen] = useState(false)
  const latestHistory = entry.history[entry.history.length - 1]
  const metadataItems = [
    { label: "Fecha", value: metadata.date, icon: CalendarDays },
    { label: "Médico", value: metadata.doctor, icon: Stethoscope },
    { label: "Lugar", value: metadata.place, icon: MapPin },
    { label: "Cliente", value: metadata.client, icon: Building2 },
  ]

  return (
    <Card className="min-w-0 gap-0 rounded border-[var(--ossum-line-strong)] bg-white py-0 shadow-none" data-coordinator-case-card="compact-responsive">
      <CardContent className="space-y-2 p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="min-w-0 truncate text-[13px] font-semibold text-[var(--ossum-navy)]">{surgery.patient}</p>
              <span className="shrink-0 text-[11px] text-slate-500">· {caseReference}</span>
            </div>
            {showCoordinator && <p className="mt-0.5 truncate text-xs text-slate-500">Coordinador: {getCoordinatorLabel(surgery)}</p>}
          </div>
        </div>

        <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4" aria-label={`Datos de ${surgery.patient}`}>
          {metadataItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex min-w-0 items-center gap-2" aria-label={`${label}: ${value}`}>
              <Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-[10px] font-medium text-slate-500">{label}</dt>
                <dd className="truncate text-[11px] text-slate-800" title={value}>{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="grid gap-2 border-y border-[var(--ossum-line)] bg-[var(--ossum-surface)] px-2 py-2 sm:grid-cols-[1fr_1fr_1fr]">
          <div><p className="text-[9px] font-semibold text-slate-500">SITUACIÓN</p><p className="text-[11px] font-semibold text-slate-900">{context.situation}</p><p className="text-[10px] text-slate-500">{context.missing}</p></div>
          <div><p className="text-[9px] font-semibold text-slate-500">QUIÉN DEBE ACTUAR</p><p className="text-[11px] font-semibold text-[var(--ossum-navy)]">{context.actor}</p><p className="text-[10px] text-slate-500">Intervención sugerida</p></div>
          <div><p className="text-[9px] font-semibold text-slate-500">PRÓXIMO PASO</p><p className="text-[11px] text-slate-700">{context.next}</p></div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px]">
          <span className={cn("rounded px-1.5 py-0.5 font-medium", stateClassName)}>{surgery.state}</span>
          <span className="text-slate-600">Preparación: {surgery.preparationState}</span>
          {highestPriorityRisk && <span className="font-semibold text-amber-800">{highestPriorityRisk}</span>}

          {hiddenAlerts.length > 0 && <Collapsible open={alertsOpen} onOpenChange={setAlertsOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="min-h-11 rounded-full px-2 text-xs font-medium text-slate-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-7" aria-expanded={alertsOpen}>
                +{hiddenAlerts.length} {hiddenAlerts.length === 1 ? "alerta" : "alertas"}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="basis-full">
              <ul className="mt-1 flex flex-wrap gap-1" aria-label="Alertas adicionales">
                {hiddenAlerts.map((alert) => <li key={alert} className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">{alert}</li>)}
              </ul>
            </CollapsibleContent>
          </Collapsible>}

          {pendingClosureItems.length > 0 && <Collapsible open={closureOpen} onOpenChange={setClosureOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="inline-flex size-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Cierre pendiente: ${pendingClosureItems.length} ${pendingClosureItems.length === 1 ? "requisito faltante" : "requisitos faltantes"}`} aria-expanded={closureOpen}>
                <ClipboardList className="size-4" aria-hidden="true" />
                <span className="ml-0.5 text-xs font-bold tabular-nums" aria-hidden="true">{pendingClosureItems.length}</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="basis-full">
              <p className="mt-1 text-xs font-medium text-slate-700">Falta: {pendingClosureItems.join(", ")}</p>
            </CollapsibleContent>
          </Collapsible>}
        </div>

        <div className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-center">
          <PersonalCasePath entry={entry} />
          <p className="truncate text-[10px] text-slate-500">{latestHistory ? `Último cambio: ${latestHistory.action}` : "Sin cambios recientes disponibles"}</p>
        </div>

        <div className="grid min-w-0 grid-cols-4 gap-1.5 sm:flex sm:items-center sm:justify-end">
          <Button size="sm" className="col-span-4 min-h-11 text-xs sm:order-last sm:col-span-1 sm:px-4" onClick={onManage}>
            Gestionar
          </Button>
          {[
            { label: "Novedad", icon: MessageSquarePlus, action: onTracking },
            { label: "Compartir", icon: Share2, action: onShare },
            { label: "Urgente", icon: TriangleAlert, action: onUrgent },
            { label: "Logística", icon: Truck, action: onOpenLogistics },
          ].map(({ label, icon: Icon, action }) => <Button key={label} type="button" size="sm" variant="ghost" className="min-h-11 min-w-0 flex-col gap-0.5 px-1 text-xs sm:flex-row sm:gap-1.5 sm:px-2" onClick={action}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Button>)}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductiveRecentFinalized({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null

  return <Collapsible open={open} onOpenChange={setOpen}>
    <section className="rounded-2xl border border-emerald-200 bg-white" data-productive-recent-finalized="collapsed-by-default">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl bg-emerald-50/70 px-3 py-3 text-left text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open}>
          <span className="text-sm font-semibold">Finalizadas recientes</span>
          <span className="flex items-center gap-2"><Badge variant="outline" className="bg-white/80 text-xs">{count}</Badge><ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} /></span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 border-t border-emerald-100 p-2">{children}</CollapsibleContent>
    </section>
  </Collapsible>
}

export function CoordinatorInboxView() {
  const controller = useCoordinationView({ surface: "personal", discoverPreview: true })

  if (controller.mode !== "production") return <CoordinationPreviewRoot controller={controller} />
  return <ProductiveCoordinatorInbox key={controller.acceptedContextKey ?? controller.trustContextKey} controller={controller} />
}

export function GlobalCoordinationLink() {
  const { currentAccess } = useAuth()

  if (!canAccessGlobalCoordination(currentAccess?.role)) return null

  return (
    <Button asChild variant="outline" size="sm" className="min-h-11 w-full shrink-0 text-xs sm:w-auto">
      <Link href="/coordinadores">Panel global</Link>
    </Button>
  )
}

function ProductiveCoordinatorInbox({ controller }: { controller: CoordinationViewController }) {
  const store = useOrtoTrackStore()
  const { activeCompany, isAuthenticated } = useAuth()
  const selection = useCirugiaSelection()
  const actions = useCirugiaActions()
  const acceptedContextKey = controller.acceptedContextKey ?? controller.trustContextKey

  const [selectedMetrics, setSelectedMetrics] = useState<ReadonlySet<MetricKey>>(() => new Set())
  const [appliedAdvanced, setAppliedAdvanced] = useState<AdvancedFilters>(() => createEmptyAdvancedFilters())
  const [managingCase, setManagingCase] = useState<ManagingCaseState | null>(null)
  const [sharingCase, setSharingCase] = useState<CoordinatorCase | null>(null)

  const selectedFacturacionStatus = selection.selectedSurgery
    ? getFacturacionStatus(selection.selectedSurgery, store.getDocStatus, selection.selResumenCobranza)
    : ""

  const baseCoordinatorCases = useMemo<CoordinatorCase[]>(() => {
    return store.surgeries
      .map((surgery) => {
        const logistics = store.getLogisticsBySurgeryId(surgery.id)
        const history = store.getHistoryBySurgeryId(surgery.id)
        const box = store.getBoxBySurgeryId(surgery.id)
        const materialAvailability = getMaterialAvailability(surgery, logistics, box)
        const bucket = getCoordinatorBucket(surgery, logistics, box)
        const subgroup = bucket === "autorizado" ? getAuthorizedSubgroup(surgery, logistics, box) : null
        const sla = getSlaMeta(getCoordinatorAssignmentBaseDate(surgery, history))

        return {
          surgery,
          logistics,
          history,
          box,
          bucket,
          subgroup,
          materialAvailabilityDate: materialAvailability.date,
          materialAvailabilityDefined: materialAvailability.defined,
          materialAvailabilityLabel: materialAvailability.label,
          sla,
        }
      })
  }, [store])

  const acceptedDevFacts = useMemo(() => {
    const accepted = new Map<string, AcceptedCoordinationDevFacts>()
    const context = controller.response?.context
    for (const entry of baseCoordinatorCases) {
      const decision = acceptCoordinationEzequielDevFacts({
        diagnostic: coordinationEzequielDevDiagnostic(entry.surgery),
        isAuthenticated,
        activeCompany,
        mode: context?.mode ?? (controller.mode === "production" ? "production" : "dev-preview"),
        surface: context?.surface ?? controller.surface,
        readOnly: context?.readOnly ?? true,
        hasSuccessfulData: controller.hasSuccessfulData,
        contextAccepted: Boolean(controller.acceptedContextKey),
        subject: context?.viewSubject ?? null,
        entry,
      })
      if (decision.accepted) accepted.set(decision.facts.surgeryId, decision.facts)
    }
    return accepted
  }, [activeCompany, baseCoordinatorCases, controller.acceptedContextKey, controller.hasSuccessfulData, controller.mode, controller.response, controller.surface, isAuthenticated])

  const coordinatorCases = useMemo<CoordinatorCase[]>(() => baseCoordinatorCases.map((entry) => {
    const facts = entry.surgery.backendId ? acceptedDevFacts.get(entry.surgery.backendId) : undefined
    if (!facts) return entry
    return {
      ...entry,
      surgery: {
        ...entry.surgery,
        visibleNumber: facts.cxName,
        date: facts.cxDate ?? "",
        institution: facts.institution ?? entry.surgery.institution,
        client: facts.client ?? entry.surgery.client,
        state: facts.state,
        autorizado: facts.state === "Autorizada",
      },
      materialAvailabilityDate: facts.availabilityDate ?? undefined,
      materialAvailabilityDefined: Boolean(facts.availabilityDate),
      materialAvailabilityLabel: facts.availabilityDate ?? "Disponibilidad sin definir",
    }
  }), [acceptedDevFacts, baseCoordinatorCases])
  const directMetricMemberships = useMemo(() => new Map(
    [...acceptedDevFacts].map(([backendId, facts]) => [backendId, new Set(facts.metrics.map(mapCoordinationDevMetric))] as const),
  ), [acceptedDevFacts])

  const acceptedResponse = controller.hasSuccessfulData ? controller.response : null
  const acceptedAt = controller.hasSuccessfulData ? controller.acceptedAt ?? null : null
  const [acceptedSnapshot, setAcceptedSnapshot] = useState(() => ({
    response: acceptedResponse,
    contextKey: acceptedContextKey,
    value: acceptedAt === null ? null : normalizeCoordinationBaseSnapshot({
      hasSuccessfulData: true,
      contextKey: acceptedContextKey,
      acceptedContextKey,
      subjectContactId: acceptedResponse?.context.viewSubject?.contactId,
      cases: coordinatorCases,
      directMetricMemberships,
      evaluationNow: acceptedAt,
    }),
  }))
  if (acceptedSnapshot.response !== acceptedResponse || acceptedSnapshot.contextKey !== acceptedContextKey) {
    setAcceptedSnapshot({
      response: acceptedResponse,
      contextKey: acceptedContextKey,
      value: acceptedAt === null ? null : normalizeCoordinationBaseSnapshot({
        hasSuccessfulData: true,
        contextKey: acceptedContextKey,
        acceptedContextKey,
        subjectContactId: acceptedResponse?.context.viewSubject?.contactId,
        cases: coordinatorCases,
        directMetricMemberships,
        evaluationNow: acceptedAt,
      }),
    })
  }
  const snapshot = acceptedSnapshot.value

  const visibleCases = useMemo(
    () => snapshot ? [...filterCoordinationCases(snapshot, selectedMetrics, appliedAdvanced)] : [],
    [appliedAdvanced, selectedMetrics, snapshot],
  )
  const hasContradiction = snapshot ? hasFilterContradiction(selectedMetrics, appliedAdvanced) : false

  const advancedCount = countActiveAdvancedFilters(appliedAdvanced)
  const hasActiveFilters = selectedMetrics.size > 0 || advancedCount > 0
  const blockedStatus = controller.response?.context.personalResolution?.status
  const coordinationState = deriveCoordinationUiState({
    waitingForAuth: controller.waitingForAuth,
    blockedReason: blockedStatus === "unresolved" || blockedStatus === "ambiguous" ? blockedStatus : null,
    loading: controller.loading,
    error: controller.error,
    hasSuccessfulData: controller.hasSuccessfulData,
    unfilteredCount: snapshot?.cases.length ?? 0,
    filteredCount: visibleCases.length,
    hasActiveFilters,
    hasContradiction,
  })
  const clearFilters = () => {
    setSelectedMetrics(new Set())
    setAppliedAdvanced(createEmptyAdvancedFilters())
  }
  const toggleMetric = (metric: MetricKey) => setSelectedMetrics((current) => {
    const next = new Set(current)
    if (next.has(metric)) next.delete(metric)
    else next.add(metric)
    return next
  })
  const liveMessage = !snapshot
    ? ""
    : coordinationState.tag === "refreshing"
      ? "Actualizando…"
      : coordinationState.tag === "error-refresh"
        ? "No pudimos actualizar. Seguís viendo la última información cargada."
        : coordinationState.tag === "ready-empty"
          ? "No tenés casos asignados en esta etapa."
          : hasContradiction
      ? "Los filtros seleccionados se contradicen."
      : `${visibleCases.length} ${visibleCases.length === 1 ? "resultado" : "resultados"}. ${selectedMetrics.size} ${selectedMetrics.size === 1 ? "métrica activa" : "métricas activas"} y ${advancedCount} ${advancedCount === 1 ? "filtro avanzado activo" : "filtros avanzados activos"}.`

  const openExpedienteTab = (surgeryId: string, tab: string) => {
    selection.setSelectedSurgeryId(surgeryId)
    selection.setPanelState("expanded")
    selection.setExpTab(tab)
  }

  return (
    <>
      {selection.panelState === "expanded" && selection.selectedSurgery ? (
        <div className="flex min-h-0 flex-1 flex-col bg-slate-100/70">
          <ExpedienteFullView
            surgery={selection.selectedSurgery}
            presupuestos={selection.selPresupuestos}
            comprobantes={selection.selComprobantes}
            remitos={selection.selRemitos}
            consumo={selection.selConsumo}
            notes={selection.selNotes}
            history={selection.selHistory}
            docChecklist={selection.selDocChecklist}
            logistics={selection.selLogistics}
            docStatus={selection.selDocStatus}
            materialTransito={selection.selMaterialTransito}
            instrumentadorSurgery={selection.selInstrumentadorSurgery}
            box={selection.selBox}
            resumenCobranza={selection.selResumenCobranza}
            facturacionStatus={selectedFacturacionStatus}
            expTab={selection.expTab}
            setExpTab={selection.setExpTab}
            onBack={selection.closeExpediente}
            onSetDialogSurgery={actions.setDialogSurgery}
            onSetFacturarDialogOpen={actions.setFacturarDialogOpen}
            onSetNoteDialogOpen={actions.setNoteDialogOpen}
            onAddNoteToSeguimiento={(s) => {
              actions.setDialogSurgery(s)
              actions.setNoteDialogOpen(true)
            }}
            onSetSuspendDialogOpen={actions.setSuspendDialogOpen}
            onSetCancelDialogOpen={actions.setCancelDialogOpen}
            onSetChangeStateDialogOpen={actions.setChangeStateDialogOpen}
            onSetChangeDateDialogOpen={actions.setChangeDateDialogOpen}
            onSetNewState={actions.setNewState}
            onRecover={actions.handleRecover}
            onAutorizar={actions.handleAutorizar}
            onOpenPresupuestoDialog={actions.openPresupuestoDialog}
            editingConsumo={actions.editingConsumo}
            setEditingConsumo={actions.setEditingConsumo}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--ossum-surface)]">
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{liveMessage}</p>
          <CoordinationStateSurface state={coordinationState} surface="personal" emptyStateVariant="productive-personal" loadedAnnouncements="external" onRetry={() => void controller.refresh()} onClearFilters={clearFilters}>
            <CoordinationWorkspace
              subjectLabel={controller.response?.context.viewSubject?.label || "Coordinador"}
              snapshot={snapshot}
              visibleCases={visibleCases}
              selectedMetrics={selectedMetrics}
              onToggleMetric={toggleMetric}
              appliedAdvanced={appliedAdvanced}
              onApplyAdvanced={setAppliedAdvanced}
              onClearAdvanced={() => setAppliedAdvanced(createEmptyAdvancedFilters())}
              institutionOptions={snapshot?.institutionOptions ?? []}
              clientOptions={snapshot?.clientOptions ?? []}
              stateOptions={COORDINATION_STATE_OPTIONS}
              globalLink={<GlobalCoordinationLink />}
              handlers={{
                onManage: (entry, initialView, focus) => setManagingCase({ entry, initialView, initialManagementFocus: focus }),
                onUrgent: (entry) => setManagingCase({ entry, initialView: "gestion", initialManagementFocus: "urgency" }),
                onShare: (entry) => setSharingCase(entry),
                onOpenLogistics: (surgeryId) => openExpedienteTab(surgeryId, "logistica"),
                onOpenExpediente: (surgeryId) => selection.openExpediente(surgeryId),
              }}
            />
          </CoordinationStateSurface>
          {controller.hasMore ? (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <Button type="button" variant="outline" className="min-h-11" disabled={controller.loadingMore} onClick={() => void controller.loadMore()}>
                {controller.loadingMore ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {controller.loadMoreError ? "Reintentar carga" : "Cargar 50 más"}
              </Button>
              <span className="text-xs text-slate-500">{controller.loadedCount} casos cargados</span>
              {controller.loadMoreError ? <span role="alert" className="text-xs text-red-700">{controller.loadMoreError}</span> : null}
            </div>
          ) : null}
        </div>
      )}

      <ChangeStateDialog
        open={actions.changeStateDialogOpen}
        onOpenChange={actions.setChangeStateDialogOpen}
        dialogSurgery={actions.dialogSurgery}
        newState={actions.newState}
        setNewState={actions.setNewState}
        onConfirm={actions.handleChangeState}
      />
      <ChangeDateDialog
        open={actions.changeDateDialogOpen}
        onOpenChange={actions.setChangeDateDialogOpen}
        dialogSurgery={actions.dialogSurgery}
        newDate={actions.newDate}
        setNewDate={actions.setNewDate}
        newTime={actions.newTime}
        setNewTime={actions.setNewTime}
        onConfirm={actions.handleChangeDate}
      />
      <SuspendDialog
        open={actions.suspendDialogOpen}
        onOpenChange={actions.setSuspendDialogOpen}
        dialogSurgery={actions.dialogSurgery}
        reason={actions.reason}
        setReason={actions.setReason}
        onConfirm={actions.handleSuspend}
      />
      <CancelDialog
        open={actions.cancelDialogOpen}
        onOpenChange={actions.setCancelDialogOpen}
        dialogSurgery={actions.dialogSurgery}
        reason={actions.reason}
        setReason={actions.setReason}
        onConfirm={actions.handleCancel}
      />
      <AddNoteDialog
        open={actions.noteDialogOpen}
        onOpenChange={actions.setNoteDialogOpen}
        surgeryId={actions.dialogSurgery?.id || selection.selectedSurgeryId || undefined}
        noteText={actions.noteText}
        setNoteText={actions.setNoteText}
        noteType={actions.noteType}
        setNoteType={actions.setNoteType}
        notePriority={actions.notePriority}
        setNotePriority={actions.setNotePriority}
        onConfirm={() => actions.handleAddNote(selection.selectedSurgery ?? null)}
      />
      <FacturarDialogNuevo
        surgeryId={actions.dialogSurgery?.id || selection.selectedSurgery?.id}
        open={actions.facturarDialogOpen}
        onOpenChange={actions.setFacturarDialogOpen}
        onFacturar={actions.handleFacturarConDatos}
      />
      <PresupuestoDialog
        open={actions.presupuestoDialogOpen}
        onOpenChange={actions.setPresupuestoDialogOpen}
        surgery={actions.dialogSurgery}
        onCreated={() => {
          actions.setPresupuestoDialogOpen(false)
        }}
      />
      <CoordinatorManagementDialog
        open={Boolean(managingCase)}
        onOpenChange={(open) => {
          if (!open) setManagingCase(null)
        }}
        surgery={managingCase?.entry.surgery ?? null}
        materialAvailabilityDate={managingCase?.entry.materialAvailabilityDate}
        materialAvailabilityLabel={managingCase?.entry.materialAvailabilityLabel}
        initialView={managingCase?.initialView ?? "gestion"}
        initialManagementFocus={managingCase?.initialManagementFocus}
        initialTrackingFilter={managingCase?.initialTrackingFilter}
        initialTrackingAction={managingCase?.initialTrackingAction}
      />
      <CoordinatorShareDialog open={Boolean(sharingCase)} onOpenChange={(open) => {
        if (!open) setSharingCase(null)
      }} entry={sharingCase} />
    </>
  )
}
