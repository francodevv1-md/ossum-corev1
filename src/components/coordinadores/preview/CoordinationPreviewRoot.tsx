import { useMemo, useState } from "react"

import { CoordinationSecondaryFilters } from "@/components/coordinadores/CoordinationSecondaryFilters"
import { CoordinationStateSurface } from "@/components/coordinadores/CoordinationStateSurface"
import { deriveCoordinationUiState } from "@/components/coordinadores/coordination-ui-state"
import { CoordinationPreviewBanner } from "@/components/coordinadores/preview/CoordinationPreviewBanner"
import { CoordinationPreviewControls } from "@/components/coordinadores/preview/CoordinationPreviewControls"
import { CoordinationPreviewGlobal } from "@/components/coordinadores/preview/CoordinationPreviewGlobal"
import { CoordinationPreviewPersonal } from "@/components/coordinadores/preview/CoordinationPreviewPersonal"
import { deriveCoordinationPreviewPresentation } from "@/components/coordinadores/preview/CoordinationPreviewCaseRow"
import type { CoordinationViewController } from "@/hooks/useCoordinationView"
import { Button } from "@/components/ui/button"
import { isTodayDate } from "@/components/coordinadores/coordinator-queue.helpers"

const PREVIEW_STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "AUTHORIZED", label: "Autorizada" },
  { value: "IN_TRANSIT", label: "En tránsito" },
  { value: "FINALIZED", label: "Finalizada" },
]

type PreviewQuickFilter = "all" | "due-today" | "overdue" | "no-date"

const PREVIEW_QUICK_FILTERS: Array<{ key: PreviewQuickFilter; label: string }> = [
  { key: "all", label: "Mi bandeja" },
  { key: "due-today", label: "Vence hoy" },
  { key: "overdue", label: "Vencidas" },
  { key: "no-date", label: "Sin fecha" },
]

function rowText(row: CoordinationViewController["previewRows"][number]) {
  return [row.visibleNumber, row.description, row.patient?.legalName, row.patient?.firstName, row.patient?.lastName, row.doctor?.legalName, row.institution?.legalName].filter(Boolean).join(" ").toLowerCase()
}

export function CoordinationPreviewRoot({ controller }: { controller: CoordinationViewController }) {
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [quickFilter, setQuickFilter] = useState<PreviewQuickFilter>("all")
  const [exiting, setExiting] = useState(false)

  const context = controller.response?.context
  const responseMatchesRenderIdentity = Boolean(
    !exiting &&
    controller.hasSuccessfulData &&
    context?.mode === "dev-preview" &&
    context.readOnly === true &&
    context.surface === controller.surface &&
    (controller.surface === "global" || (
      context.viewSubject?.contactId === controller.selectedTarget?.contactId
    )),
  )
  const trustedRows = responseMatchesRenderIdentity ? controller.previewRows : []

  const uniqueRows = useMemo(() => Array.from(new Map(trustedRows.map((row) => [row.id, row])).values()), [trustedRows])
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return uniqueRows.filter((row) => {
      const presentation = deriveCoordinationPreviewPresentation(row)
      if (query && !rowText(row).includes(query)) return false
      if (stateFilter && row.cxStatus !== stateFilter) return false
      if (quickFilter === "due-today" && !isTodayDate(presentation.entry.surgery.date)) return false
      if (quickFilter === "overdue" && presentation.entry.sla.tone !== "overdue") return false
      if (quickFilter === "no-date" && presentation.entry.surgery.date) return false
      return true
    })
  }, [quickFilter, search, stateFilter, uniqueRows])
  const presentations = useMemo(() => uniqueRows.map(deriveCoordinationPreviewPresentation), [uniqueRows])
  const metrics = useMemo(() => ({
    pending: presentations.filter(({ entry }) => entry.bucket === "autorizado").length,
    overdue: presentations.filter(({ entry }) => entry.sla.tone === "overdue").length,
    unavailable: presentations.filter(({ entry }) => !entry.materialAvailabilityDefined).length,
    transit: presentations.filter(({ entry }) => entry.bucket === "transito").length,
  }), [presentations])
  const hasActiveFilters = Boolean(search || stateFilter || quickFilter !== "all")
  const state = deriveCoordinationUiState({
    waitingForAuth: controller.waitingForAuth,
    previewDenied: controller.previewDenied,
    loading: controller.loading,
    error: controller.error,
    hasSuccessfulData: controller.hasSuccessfulData,
    unfilteredCount: uniqueRows.length,
    filteredCount: filteredRows.length,
    hasActiveFilters,
  })
  const trustedContext = responseMatchesRenderIdentity ? context : null
  const capability = responseMatchesRenderIdentity ? controller.response?.previewCapability : undefined

  const clearFilters = () => { setSearch(""); setStateFilter(""); setQuickFilter("all") }
  const exit = () => {
    setExiting(true)
    clearFilters()
    controller.exitPreview()
  }

  if (controller.previewDenied) {
    return <div className="mx-auto w-full max-w-6xl p-3 sm:p-5"><CoordinationStateSurface state={state} surface={controller.surface} onExitPreview={exit} /></div>
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 pb-6 sm:p-5" aria-busy={controller.loading}>
      {trustedContext && <CoordinationPreviewBanner actorLabel={trustedContext.actor.label} surface={controller.surface} subjectLabel={trustedContext.viewSubject?.label} />}
      {capability?.enabled === true && (
        <CoordinationPreviewControls
          surface={controller.surface}
          targets={capability.targets}
          selectedContactId={controller.selectedTarget?.contactId}
          onSurfaceChange={controller.changePreviewSurface}
          onTargetChange={controller.changePreviewTarget}
          onExit={exit}
        />
      )}
      {responseMatchesRenderIdentity && <section className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="Métricas de coordinación">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><span className="text-slate-500">Pendientes</span><strong className="mt-1 block text-lg text-slate-900">{metrics.pending}</strong></div>
        <div className={metrics.overdue > 0 ? "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800" : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600"}><span>SLA vencido</span><strong className="mt-1 block text-lg">{metrics.overdue}</strong></div>
        <div className={metrics.unavailable > 0 ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800" : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600"}><span>Sin disponibilidad</span><strong className="mt-1 block text-lg">{metrics.unavailable}</strong></div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><span className="text-slate-500">En tránsito</span><strong className="mt-1 block text-lg text-slate-900">{metrics.transit}</strong></div>
      </section>}
      {capability?.enabled === true && <div className="overflow-x-auto pb-1" data-preview-quick-filters="horizontal-scroll">
        <div className="flex min-w-max gap-2" role="group" aria-label="Filtros rápidos de coordinación">
          {PREVIEW_QUICK_FILTERS.map((filter) => <Button key={filter.key} type="button" variant={quickFilter === filter.key ? "default" : "outline"} className="min-h-11 shrink-0" aria-pressed={quickFilter === filter.key} onClick={() => setQuickFilter(filter.key)}>{filter.label}</Button>)}
        </div>
      </div>}
      {capability?.enabled === true && (
        <CoordinationSecondaryFilters search={search} stateFilter={stateFilter} stateOptions={PREVIEW_STATE_OPTIONS} onSearchChange={setSearch} onStateFilterChange={setStateFilter} />
      )}
      <CoordinationStateSurface state={state} surface={controller.surface} onRetry={() => void controller.refresh()} onClearFilters={clearFilters} onExitPreview={exit}>
        {controller.surface === "personal" ? <CoordinationPreviewPersonal rows={filteredRows} /> : <CoordinationPreviewGlobal rows={filteredRows} />}
      </CoordinationStateSurface>
    </div>
  )
}
