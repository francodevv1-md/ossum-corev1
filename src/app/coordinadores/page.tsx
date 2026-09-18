"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useOrtoTrackStore } from "@/lib/store"
import { useCirugiaSelection } from "@/hooks/useCirugiaSelection"
import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import { SearchInput, FilterSelect } from "@/components/shared"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExpedienteFullView } from "@/components/expediente/ExpedienteFullView"
import { ChangeStateDialog } from "@/components/cirugias/dialogs/ChangeStateDialog"
import { ChangeDateDialog } from "@/components/cirugias/dialogs/ChangeDateDialog"
import { SuspendDialog } from "@/components/cirugias/dialogs/SuspendDialog"
import { CancelDialog } from "@/components/cirugias/dialogs/CancelDialog"
import { AddNoteDialog } from "@/components/cirugias/dialogs/AddNoteDialog"
import { PresupuestoDialog } from "@/components/cirugias/dialogs/PresupuestoDialog"
import { FacturarDialog as FacturarDialogNuevo } from "@/components/facturacion/FacturarDialog"
import { CoordinatorManagementDialog } from "@/components/coordinadores/CoordinatorManagementDialog"
import {
  AUTHORIZED_SECTION_CONFIG,
  BUCKET_CONFIG,
  getAuthorizedSubgroup,
  getCoordinatorAssignmentBaseDate,
  getCoordinatorBucket,
  getCoordinatorLabel,
  getIncidentReasons,
  getMaterialAvailability,
  getSlaBadgeClass,
  getSlaDisplayLabel,
  getSlaDotClass,
  getSlaMeta,
  hasScheduledDate,
  isIncidentCase,
  isTodayDate,
  sortSurgeriesBySchedule,
  type CoordinatorBucketKey,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { SURGERY_STATE_OPTIONS } from "@/lib/statusHelpers"
import { getFacturacionStatus } from "@/lib/cirugias.utils"
import { deriveCxOperationsDisplay } from "@/lib/cx-operations-derived"
import { deriveCoordinatorCaseAdvisory } from "@/lib/cx-operations-derived"
import type { CxOperationsDerivedDisplay } from "@/lib/cx-operations-derived"
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  FilterX,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  UserCircle,
} from "lucide-react"
import { useCoordinationView, type CoordinationViewController } from "@/hooks/useCoordinationView"
import { CoordinationStateSurface } from "@/components/coordinadores/CoordinationStateSurface"
import { deriveCoordinationUiState } from "@/components/coordinadores/coordination-ui-state"
import { CoordinationGlobalAccessBoundary } from "@/components/coordinadores/CoordinationGlobalAccessBoundary"

type ManagingCaseState = {
  entry: CoordinatorCase
  initialView: "gestion" | "seguimiento"
}

function LocalCxOperationsSummary({ display }: { display: Pick<CxOperationsDerivedDisplay, "nextActionLabel" | "responsibleAreaLabel"> }) {
  return (
    <dl className="grid gap-0.5 text-[11px]">
      <div className="flex flex-wrap gap-x-1">
        <dt className="font-semibold text-slate-500">Próximo paso:</dt>
        <dd>{display.nextActionLabel}</dd>
      </div>
      <div className="flex flex-wrap gap-x-1">
        <dt className="font-semibold text-slate-500">Quién actúa:</dt>
        <dd>Intervención sugerida · {display.responsibleAreaLabel}</dd>
      </div>
    </dl>
  )
}

export default function CoordinadoresPage() {
  return (
    <CoordinationGlobalAccessBoundary>
      <GlobalCoordinationPage />
    </CoordinationGlobalAccessBoundary>
  )
}

export function GlobalCoordinationPage() {
  const controller = useCoordinationView({ surface: "global" })
  return <ProductiveCoordinadoresPage controller={controller} />
}

function ProductiveCoordinadoresPage({ controller }: { controller: CoordinationViewController }) {
  const store = useOrtoTrackStore()
  const selection = useCirugiaSelection()
  const actions = useCirugiaActions()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [coordFilter, setCoordFilter] = useState("")
  const [onlyIncidents, setOnlyIncidents] = useState(false)
  const [situationFilter, setSituationFilter] = useState("")
  const [managingCase, setManagingCase] = useState<ManagingCaseState | null>(null)

  const coordinatorOptions = useMemo(() => {
    const coords = Array.from(new Set(store.surgeries.map((s) => s.coordinadorCx || "Sin asignar"))).sort((a, b) => {
      if (a === "Sin asignar") return 1
      if (b === "Sin asignar") return -1
      return a.localeCompare(b)
    })

    return [
      { value: "", label: "Todos los coordinadores" },
      ...coords.map((c) => ({ value: c, label: c })),
    ]
  }, [store.surgeries])

  const filtered = useMemo(() => {
    let data = store.surgeries.slice()

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (s) =>
          s.patient.toLowerCase().includes(q) ||
          s.surgeon.toLowerCase().includes(q) ||
          s.institution.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      )
    }

    if (stateFilter) data = data.filter((s) => s.state === stateFilter)
    if (coordFilter) data = data.filter((s) => (s.coordinadorCx || "Sin asignar") === coordFilter)

    return data
  }, [store.surgeries, search, stateFilter, coordFilter])

  const selectedFacturacionStatus = selection.selectedSurgery
    ? getFacturacionStatus(selection.selectedSurgery, store.getDocStatus, selection.selResumenCobranza)
    : ""

  const coordinatorCases = useMemo<CoordinatorCase[]>(() => {
    return filtered
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
      .sort((a, b) => sortSurgeriesBySchedule(a.surgery, b.surgery))
  }, [filtered, store])

  const operationalCases = useMemo(() => coordinatorCases.filter((entry) => entry.bucket !== null), [coordinatorCases])
  const visibleCases = useMemo(() => {
    const scoped = onlyIncidents ? operationalCases.filter(isIncidentCase) : operationalCases
    const situated = situationFilter ? scoped.filter((entry) => deriveCoordinatorCaseAdvisory(entry).situation === situationFilter) : scoped
    return situated.sort((a, b) => Number(isIncidentCase(b)) - Number(isIncidentCase(a)))
  }, [operationalCases, onlyIncidents, situationFilter])

  const bucketedCases = useMemo(() => {
    return {
      autorizado: visibleCases.filter((entry) => entry.bucket === "autorizado"),
      transito: visibleCases.filter((entry) => entry.bucket === "transito"),
      finalizado: visibleCases.filter((entry) => entry.bucket === "finalizado"),
    }
  }, [visibleCases])

  const coordinatorSummary = useMemo(() => {
    const map: Record<string, { total: number; buckets: Record<CoordinatorBucketKey, number>; overdue: number }> = {}

    for (const entry of visibleCases) {
      const coord = getCoordinatorLabel(entry.surgery)
      if (!map[coord]) {
        map[coord] = {
          total: 0,
          buckets: { autorizado: 0, transito: 0, finalizado: 0 },
          overdue: 0,
        }
      }

      map[coord].total += 1
      if (entry.bucket) map[coord].buckets[entry.bucket] += 1
      if (entry.bucket === "autorizado" && entry.sla.tone === "overdue") map[coord].overdue += 1
    }

    return Object.entries(map).sort(([a], [b]) => {
      if (a === "Sin asignar") return 1
      if (b === "Sin asignar") return -1
      return a.localeCompare(b)
    })
  }, [visibleCases])

  const totalSurgeries = filtered.length
  const hiddenByPhaseCount = totalSurgeries - visibleCases.length
  const authorizedOverdueCount = bucketedCases.autorizado.filter((entry) => entry.sla.tone === "overdue").length
  const undefinedAvailabilityCount = bucketedCases.autorizado.filter((entry) => !entry.materialAvailabilityDefined).length
  const transitCount = bucketedCases.transito.length
  const finalizedTodayCount = bucketedCases.finalizado.filter((entry) => isTodayDate(entry.surgery.date)).length
  const situationCounts = useMemo(() => ({
    missing: operationalCases.filter((entry) => deriveCoordinatorCaseAdvisory(entry).situation === "Falta información").length,
    problem: operationalCases.filter((entry) => deriveCoordinatorCaseAdvisory(entry).situation === "Hay un problema").length,
    decision: operationalCases.filter((entry) => deriveCoordinatorCaseAdvisory(entry).situation === "Necesita definición").length,
    overdue: operationalCases.filter((entry) => deriveCoordinatorCaseAdvisory(entry).situation === "Fuera de plazo").length,
  }), [operationalCases])
  const unfilteredOperationalCount = useMemo(
    () => store.surgeries.filter((surgery) => getCoordinatorBucket(
      surgery,
      store.getLogisticsBySurgeryId(surgery.id),
      store.getBoxBySurgeryId(surgery.id),
    ) !== null).length,
    [store],
  )
  const hasActiveFilters = Boolean(search || stateFilter || coordFilter || onlyIncidents || situationFilter)
  const coordinationState = deriveCoordinationUiState({
    waitingForAuth: controller.waitingForAuth,
    loading: controller.loading,
    error: controller.error,
    hasSuccessfulData: controller.hasSuccessfulData,
    unfilteredCount: unfilteredOperationalCount,
    filteredCount: visibleCases.length,
    hasActiveFilters,
  })
  const clearFilters = () => {
    setSearch("")
    setStateFilter("")
    setCoordFilter("")
    setOnlyIncidents(false)
    setSituationFilter("")
  }

  const openExpedienteTab = (surgeryId: string, tab: string) => {
    selection.setSelectedSurgeryId(surgeryId)
    selection.setPanelState("expanded")
    selection.setExpTab(tab)
  }

  if (coordinationState.tag === "waiting-auth" || coordinationState.tag === "loading-initial" || coordinationState.tag === "error-initial") {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-5">
        <header><h1 className="text-xl font-semibold tracking-tight text-slate-950">Coordinación</h1></header>
        <CoordinationStateSurface state={coordinationState} surface="global" onRetry={() => void controller.refresh()} />
      </div>
    )
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
        <div className="flex flex-col gap-3 bg-[var(--ossum-surface)] p-3 sm:p-4 md:p-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[var(--ossum-navy)]">Centro de Control</h1>
              <p className="text-[11px] text-slate-500">Vista global del circuito · {visibleCases.length} casos visibles</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline" className="min-h-11 text-xs">
                <Link href="/coordinadores/mi-bandeja">
                  <UserCircle className="mr-1 size-3.5" />
                  Mi bandeja
                </Link>
              </Button>
              <Badge variant="outline" className="min-h-9 gap-1 text-xs">
                <ShieldCheck className="size-3.5" />
                Vista global
              </Badge>
            </div>
          </header>

          <section aria-labelledby="attention-heading" className="grid border border-[var(--ossum-line-strong)] bg-white sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              className={cn("flex min-h-11 items-center justify-between gap-3 border-b bg-white px-3 py-2 text-left text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:border-r lg:border-b-0", situationFilter === "Falta información" && "border-b-2 border-b-[var(--ossum-action)] text-[var(--ossum-navy)]")}
              onClick={() => setSituationFilter((current) => current === "Falta información" ? "" : "Falta información")}
              aria-pressed={situationFilter === "Falta información"}
            >
              <span id="attention-heading" className="text-[11px] font-semibold">Falta información</span>
              <strong className="text-sm font-semibold tabular-nums">{situationCounts.missing}</strong>
            </button>
            <button
              type="button"
              className={cn("flex min-h-11 items-center justify-between gap-3 border-b bg-white px-3 py-2 text-left text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:border-b-0 lg:border-r", situationFilter === "Necesita definición" && "border-b-2 border-b-[var(--ossum-action)] text-[var(--ossum-navy)]")}
              onClick={() => setSituationFilter((current) => current === "Necesita definición" ? "" : "Necesita definición")}
              aria-pressed={situationFilter === "Necesita definición"}
            >
              <span className="text-[11px] font-semibold">Necesita definición</span>
              <strong className="text-sm font-semibold tabular-nums">{situationCounts.decision}</strong>
            </button>
            <button type="button" className={cn("flex min-h-11 items-center justify-between gap-3 border-b px-3 py-2 text-left lg:border-b-0 lg:border-r", situationFilter === "Hay un problema" && "bg-red-50")} onClick={() => setSituationFilter((current) => current === "Hay un problema" ? "" : "Hay un problema")} aria-pressed={situationFilter === "Hay un problema"}><span className="text-[11px] font-semibold">Hay un problema</span><strong className="text-sm tabular-nums">{situationCounts.problem}</strong></button>
            <button type="button" className={cn("flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-left text-red-800", situationFilter === "Fuera de plazo" && "bg-red-50")} onClick={() => setSituationFilter((current) => current === "Fuera de plazo" ? "" : "Fuera de plazo")} aria-pressed={situationFilter === "Fuera de plazo"}><span className="text-[11px] font-semibold">Fuera de plazo</span><strong className="text-sm tabular-nums">{situationCounts.overdue}</strong></button>
          </section>

          <div className="border border-[var(--ossum-line-strong)] bg-white px-3 py-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
              <label className="w-full sm:col-span-2 lg:w-72">
                <span className="sr-only">Buscar casos de coordinación</span>
                <SearchInput value={search} onChange={setSearch} placeholder="Paciente, médico, institución, ID..." className="min-h-11 w-full" />
              </label>
              <label className="w-full lg:w-44">
                <span className="sr-only">Filtrar por estado</span>
                <FilterSelect value={stateFilter} onChange={setStateFilter} options={SURGERY_STATE_OPTIONS} className="min-h-11 w-full" />
              </label>
              <label className="w-full lg:w-52">
                <span className="sr-only">Filtrar por responsable</span>
                <FilterSelect value={coordFilter} onChange={setCoordFilter} options={coordinatorOptions} className="min-h-11 w-full" />
              </label>
              <Button
                variant={onlyIncidents ? "secondary" : "outline"}
                size="sm"
                className="min-h-11 w-full text-xs lg:w-auto"
                onClick={() => setOnlyIncidents((prev) => !prev)}
                aria-pressed={onlyIncidents}
              >
                <AlertTriangle className="mr-1 size-3" />
                Ver solo incidencias
              </Button>
              {(search || stateFilter || coordFilter || onlyIncidents || situationFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11 w-full text-xs lg:ml-auto lg:w-auto"
                  onClick={() => {
                    setSearch("")
                    setStateFilter("")
                     setCoordFilter("")
                     setOnlyIncidents(false)
                     setSituationFilter("")
                  }}
                >
                  <FilterX className="mr-1 size-3" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          <CoordinationStateSurface state={coordinationState} surface="global" onRetry={() => void controller.refresh()} onClearFilters={clearFilters}>
            <div className="space-y-4">
              {(Object.keys(BUCKET_CONFIG) as CoordinatorBucketKey[]).map((bucketKey) => {
                const entries = bucketedCases[bucketKey]
                if (entries.length === 0) return null

                const bucketConfig = BUCKET_CONFIG[bucketKey]
                const BucketIcon = bucketConfig.icon

                return (
                  <section key={bucketKey} className="space-y-2.5">
                    <details open={bucketKey === "autorizado"} className={cn("border bg-white", bucketKey === "autorizado" && "border-sky-200", bucketKey === "transito" && "border-violet-200", bucketKey === "finalizado" && "border-emerald-200")}>
                      <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2", bucketConfig.tone)}>
                        <div className="flex items-center gap-2.5">
                          <div className="bg-white/80 p-1.5">
                            <BucketIcon className="size-3.5" />
                          </div>
                          <div>
                            <h2 className="text-sm font-semibold leading-none">{bucketConfig.title}</h2>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white/80 text-xs">
                            {entries.length} casos
                          </Badge>
                          <ChevronDown className="size-4 text-slate-500" />
                        </div>
                      </summary>

                      <div className="space-y-2.5 p-2.5">
                    {bucketKey === "autorizado" ? (
                      <div className="space-y-2.5">
                        {AUTHORIZED_SECTION_CONFIG.map((section) => {
                          const subgroupEntries = entries.filter((entry) => entry.subgroup && section.matches.has(entry.subgroup))
                          if (subgroupEntries.length === 0) return null

                          return (
                            <details key={section.key} open={section.key === "pendiente-coordinar"} className="rounded-lg border border-slate-200 bg-slate-50/60">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                                <div>
                                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">{section.title}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {subgroupEntries.length}
                                  </Badge>
                                  <ChevronDown className="size-3.5 text-slate-500" />
                                </div>
                              </summary>

                              <div className="space-y-1 border-t border-slate-200 bg-white p-2">
                                {subgroupEntries.map((entry) => {
                                  const surgery = entry.surgery
                                  const incidentReasons = getIncidentReasons(entry)
                                  const operationsDisplay = deriveCxOperationsDisplay(entry, {
                                    documentationIncomplete: store.getDocStatus(surgery.id) === "Incompleta",
                                    consumptionAbsent: !store.getConsumoBySurgeryId(surgery.id),
                                    invoiceAbsent: !surgery.facturado && !store.getComprobantesBySurgeryId(surgery.id).find((comprobante) => comprobante.type === "FV"),
                                  })
                                  const caseReference = surgery.visibleNumber?.trim() || `CX ${surgery.id}`

                                  return (
                                    <React.Fragment key={surgery.id}>
                                    <div
                                      className={cn(
                                        "border border-slate-200 bg-white px-3 py-2.5",
                                        incidentReasons.length > 0 && "border-amber-200"
                                      )}
                                    >
                                      <div className="grid gap-2 xl:grid-cols-[1.2fr,1.25fr,1fr,auto] xl:items-center">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold leading-none text-slate-950">{surgery.patient}</p>
                                            <span className="text-xs text-muted-foreground">{caseReference}</span>
                                            {surgery.urgente && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">Urgente</span>}
                                          </div>
                                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                            <span>Dr. {surgery.surgeon || "Sin definir"}</span>
                                            <span>{surgery.institution || "Sin definir"}</span>
                                            <span>{getCoordinatorLabel(surgery)}</span>
                                          </div>
                                        </div>

                                        <div className={cn("rounded-xl border px-2.5 py-2 text-xs", incidentReasons.length > 0 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50/80 text-sky-900")}>
                                          <LocalCxOperationsSummary display={operationsDisplay} />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                          <span className="inline-flex items-center gap-1">
                                            <CalendarDays className="size-3" />
                                            {hasScheduledDate(surgery) ? formatDate(surgery.date) : "Sin fecha CX"}
                                            {surgery.time && <> · {surgery.time}</>}
                                          </span>
                                          <span>Estado CX: {surgery.state}</span>
                                          <span>Preparación: {surgery.preparationState}</span>
                                          <span className={cn("rounded-full px-2 py-0.5 font-medium", entry.materialAvailabilityDefined ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{entry.materialAvailabilityLabel}</span>
                                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium", getSlaBadgeClass(entry.sla.tone))}>
                                            <span className={cn("size-1.5 rounded-full", getSlaDotClass(entry.sla.tone))} />
                                            {getSlaDisplayLabel(entry.sla.tone)}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap sm:items-center xl:justify-end">
                                          <Button size="sm" className="min-h-11 text-xs" onClick={() => setManagingCase({ entry, initialView: "seguimiento" })}>
                                            Abrir seguimiento
                                          </Button>
                                          <Button size="sm" variant="outline" className="min-h-11 text-xs" onClick={() => setManagingCase({ entry, initialView: "gestion" })}>
                                            Gestionar
                                          </Button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button size="sm" variant="ghost" className="col-span-2 min-h-11 text-xs" aria-label={`Más acciones para ${surgery.patient}`}>
                                                <MoreHorizontal className="mr-1 size-4" />
                                                Más acciones
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onSelect={() => openExpedienteTab(surgery.id, "logistica")}>Logística</DropdownMenuItem>
                                              <DropdownMenuItem onSelect={() => selection.openExpediente(surgery.id)}>Expediente</DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>

                                        {incidentReasons.length > 0 && (
                                          <p className="mt-2 text-xs font-medium text-amber-700 xl:col-span-4">
                                            Atención: {incidentReasons.join(" · ")}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    </React.Fragment>
                                  )
                                })}
                              </div>
                            </details>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {entries.map((entry) => {
                          const surgery = entry.surgery
                          const incidentReasons = getIncidentReasons(entry)
                          const operationsDisplay = deriveCxOperationsDisplay(entry, {
                            documentationIncomplete: store.getDocStatus(surgery.id) === "Incompleta",
                            consumptionAbsent: !store.getConsumoBySurgeryId(surgery.id),
                            invoiceAbsent: !surgery.facturado && !store.getComprobantesBySurgeryId(surgery.id).find((comprobante) => comprobante.type === "FV"),
                          })
                          const caseReference = surgery.visibleNumber?.trim() || `CX ${surgery.id}`

                          return (
                            <Card key={surgery.id} className="rounded border-slate-200/80 bg-white shadow-none">
                              <CardContent className="px-3 py-2.5">
                                <div className="grid gap-2 xl:grid-cols-[1.2fr,1.25fr,1fr,auto] xl:items-center">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold leading-none text-slate-950">{surgery.patient}</p>
                                      <span className="text-xs text-muted-foreground">{caseReference}</span>
                                      {surgery.urgente && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">Urgente</span>}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      <span>Dr. {surgery.surgeon || "Sin definir"}</span>
                                      <span>{surgery.institution || "Sin definir"}</span>
                                      <span>{getCoordinatorLabel(surgery)}</span>
                                    </div>
                                  </div>

                                  <div className={cn("rounded-xl border px-2.5 py-2 text-xs", incidentReasons.length > 0 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50/80 text-sky-900")}>
                                    <LocalCxOperationsSummary display={operationsDisplay} />
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      <CalendarDays className="size-3" />
                                      {hasScheduledDate(surgery) ? formatDate(surgery.date) : "Sin fecha CX"}
                                      {surgery.time && <> · {surgery.time}</>}
                                    </span>
                                    <span>Estado CX: {surgery.state}</span>
                                    <span>Preparación: {surgery.preparationState}</span>
                                    <span className={cn("rounded-full px-2 py-0.5 font-medium", entry.materialAvailabilityDefined ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{entry.materialAvailabilityLabel}</span>
                                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium", getSlaBadgeClass(entry.sla.tone))}>
                                      <span className={cn("size-1.5 rounded-full", getSlaDotClass(entry.sla.tone))} />
                                    {getSlaDisplayLabel(entry.sla.tone)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap sm:items-center xl:justify-end">
                                    <Button size="sm" className="min-h-11 text-xs" onClick={() => setManagingCase({ entry, initialView: "seguimiento" })}>
                                      Abrir seguimiento
                                    </Button>
                                    <Button size="sm" variant="outline" className="min-h-11 text-xs" onClick={() => setManagingCase({ entry, initialView: "gestion" })}>
                                      Gestionar
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost" className="col-span-2 min-h-11 text-xs" aria-label={`Más acciones para ${surgery.patient}`}>
                                          <MoreHorizontal className="mr-1 size-4" />
                                          Más acciones
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => openExpedienteTab(surgery.id, "logistica")}>Logística</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => selection.openExpediente(surgery.id)}>Expediente</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {incidentReasons.length > 0 && (
                                  <p className="mt-2 text-xs font-medium text-amber-700">
                                    Atención: {incidentReasons.join(" · ")}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                      </div>
                    </details>
                  </section>
                )
              })}
            </div>
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

          <details className="rounded-xl border border-slate-200 bg-white">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <span>Resumen de carga</span>
              <span className="flex items-center gap-2 text-xs font-normal text-slate-600">
                {coordinatorSummary.length} responsables
                <ChevronDown className="size-4" />
              </span>
            </summary>
            <div className="space-y-3 border-t border-slate-200 p-3 sm:p-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{bucketedCases.autorizado.length} autorizados</Badge>
                <Badge variant="outline">{authorizedOverdueCount} fuera de 48 h</Badge>
                <Badge variant="outline">{undefinedAvailabilityCount} sin disponibilidad</Badge>
                <Badge variant="outline">{transitCount} en tránsito</Badge>
                <Badge variant="outline">{finalizedTodayCount} finalizados hoy</Badge>
                {hiddenByPhaseCount > 0 && <Badge variant="outline">{hiddenByPhaseCount} fuera de esta vista</Badge>}
              </div>
              <div className="divide-y divide-slate-100">
                {coordinatorSummary.map(([coord, data]) => (
                  <div key={coord} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <UserCircle className={cn("size-4", coord === "Sin asignar" ? "text-slate-500" : "text-primary")} />
                      <span className="text-sm font-medium">{coord}</span>
                      <span className="text-xs text-slate-500">{data.total} casos</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>{data.buckets.autorizado} autorizados</span>
                      <span>{data.buckets.transito} en tránsito</span>
                      <span>{data.buckets.finalizado} finalizados</span>
                      {data.overdue > 0 && <span className="font-medium text-red-700">{data.overdue} fuera de 48 h</span>}
                      <Button
                        size="sm"
                        variant={coordFilter === coord ? "secondary" : "ghost"}
                        className="min-h-11 text-xs"
                        onClick={() => setCoordFilter(coordFilter === coord ? "" : coord)}
                        aria-pressed={coordFilter === coord}
                      >
                        Ver casos
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
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
      />
    </>
  )
}
