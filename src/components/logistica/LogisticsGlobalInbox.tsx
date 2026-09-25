"use client"

import React, { useMemo, useRef, useState } from "react"
import {
  Truck,
  RefreshCw,
  ArrowLeft,
  CircleAlert,
  Loader2,
  CalendarDays,
  Building2,
  User,
  ShieldCheck,
  Package,
  Share2,
} from "lucide-react"

import { LogisticsOperationsWorkspace } from "@/components/expediente/LogisticsOperationsWorkspace"
import { LogisticsMapPanel } from "@/components/logistica/LogisticsMapPanel"
import { LogisticsMetricsStrip, type LogisticsMetricKey } from "@/components/logistica/LogisticsMetricsStrip"
import {
  LogisticsControlsToolbar,
  type LogisticsViewMode,
} from "@/components/logistica/LogisticsControlsToolbar"
import { LogisticsTableView } from "@/components/logistica/LogisticsTableView"
import { LogisticsCardsView } from "@/components/logistica/LogisticsCardsView"
import { LogisticsShareDialog } from "@/components/logistica/LogisticsShareDialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  type LogisticsInboxFilters,
  type LogisticsInboxItem,
  useLogisticsGlobalInbox,
} from "@/hooks/useLogisticsGlobalInbox"
import { useLogisticsMap } from "@/hooks/useLogisticsMap"

const EMPTY_FILTERS: LogisticsInboxFilters = {}

export function LogisticsGlobalInbox() {
  const [viewMode, setViewMode] = useState<LogisticsViewMode>("table")
  const [filters, setFilters] = useState<LogisticsInboxFilters>(EMPTY_FILTERS)
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string | null>(null)
  const [shareItem, setShareItem] = useState<LogisticsInboxItem | null>(null)
  const inboxScrollPosition = useRef(0)

  const inbox = useLogisticsGlobalInbox(filters)
  const map = useLogisticsMap()

  const items = useMemo(() => inbox.data?.items ?? [], [inbox.data])
  const selectedItem = items.find((item) => item.surgery.id === selectedSurgeryId) ?? null

  // Dropdown options
  const options = useMemo(() => {
    const instMap = new Map<string, string>()
    const localitiesSet = new Set<string>()
    const prepSet = new Set<string>()
    const logSet = new Set<string>()

    for (const item of items) {
      if (item.surgery.institutionId && item.surgery.institution) {
        instMap.set(item.surgery.institutionId, item.surgery.institution)
      }
      if (item.surgery.locality) localitiesSet.add(item.surgery.locality)
      if (item.surgery.preparationStatus) prepSet.add(item.surgery.preparationStatus)
      if (item.surgery.logisticsStatus) logSet.add(item.surgery.logisticsStatus)
    }

    return {
      institutions: Array.from(instMap.entries()).map(([value, label]) => ({ value, label })),
      localities: Array.from(localitiesSet).map((value) => ({ value, label: value })),
      preparation: Array.from(prepSet).map((value) => ({ value, label: value })),
      logistics: Array.from(logSet).map((value) => ({ value, label: value })),
    }
  }, [items])

  const setFilter = (key: keyof LogisticsInboxFilters, value: string | boolean | undefined) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }))
  }

  const clearFilters = () => setFilters(EMPTY_FILTERS)
  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== "")

  // Metric key resolution
  const activeMetricKey: LogisticsMetricKey | null = useMemo(() => {
    if (filters.exception === "blocker") return "exceptions"
    if (filters.priority === "urgent") return "urgent"
    if (filters.news === true) return "news"
    if (filters.logisticsStatus === "en_transito") return "transit"
    if (filters.prepStatus === "pending") return "pending_prep"
    return null
  }, [filters])

  const handleToggleMetric = (key: LogisticsMetricKey) => {
    if (activeMetricKey === key) {
      clearFilters()
      return
    }

    switch (key) {
      case "exceptions":
        setFilters({ exception: "blocker", hasBlockers: true })
        break
      case "urgent":
        setFilters({ priority: "urgent" })
        break
      case "news":
        setFilters({ news: true })
        break
      case "transit":
        setFilters({ logisticsStatus: "en_transito" })
        break
      case "pending_prep":
        setFilters({ prepStatus: "pending" })
        break
    }
  }

  const handleOpenDetail = (surgeryId: string) => {
    inboxScrollPosition.current = window.scrollY
    setSelectedSurgeryId(surgeryId)
  }

  const handleBackToInbox = () => {
    setSelectedSurgeryId(null)
    requestAnimationFrame(() => window.scrollTo({ top: inboxScrollPosition.current }))
  }

  // Not ready or no company selected
  if (!inbox.ready) {
    return (
      <main className="flex min-h-[400px] items-center justify-center p-6" aria-busy="true">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <p className="text-xs font-medium">Cargando sesión y contexto de logística…</p>
        </div>
      </main>
    )
  }

  if (!inbox.hasCompany) {
    return (
      <main className="p-6">
        <div className="max-w-xl mx-auto p-6 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
          <Truck className="w-10 h-10 mx-auto text-amber-600 mb-2" />
          <h2 className="text-base font-bold text-amber-900">Empresa no seleccionada</h2>
          <p className="mt-1 text-xs text-amber-700">
            Por favor, seleccioná una empresa activa en la barra superior para acceder a la bandeja global de logística.
          </p>
        </div>
      </main>
    )
  }

  // Detail / Operation Workspace View
  if (selectedItem && inbox.companyId) {
    return (
      <main className="mx-auto w-full max-w-[1700px] p-4 sm:p-6 space-y-4">
        {/* Detail Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBackToInbox}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a bandeja</span>
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {selectedItem.surgery.reference ?? "Expediente sin referencia"}
                </span>
                <Badge variant="outline" className="text-xs">
                  {selectedItem.surgery.surgeryStatus ?? "Estado general"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <User className="w-3 h-3 text-slate-400" />
                  {selectedItem.surgery.patient ?? "Sin paciente"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {selectedItem.surgery.institution ?? "Sin institución"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 text-slate-400" />
                  {selectedItem.surgery.date ? new Date(selectedItem.surgery.date).toLocaleDateString("es-AR") : "Sin fecha"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShareItem(selectedItem)}
              className="h-9 text-xs gap-1.5 font-semibold text-slate-700 hover:text-sky-700 hover:border-sky-300 dark:text-slate-300"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Compartir aviso</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inbox.refresh()}
              disabled={inbox.refreshing}
              className="h-9 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${inbox.refreshing ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </header>

        {/* Operations Workspace */}
        <LogisticsOperationsWorkspace
          companyId={inbox.companyId}
          surgeryId={selectedItem.surgery.id}
          onOperationComplete={() => inbox.refresh()}
        />
      </main>
    )
  }

  // Main Logistics Control Center
  return (
    <main
      className="mx-auto w-full max-w-[1700px] p-4 sm:p-6 space-y-4 bg-slate-50/50 min-h-screen dark:bg-slate-950"
      aria-busy={inbox.loading || inbox.refreshing}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight dark:text-white">
              Centro de Control Logístico & Despacho
            </h1>
            <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[11px] font-semibold dark:bg-sky-950/60 dark:text-sky-300">
              Operaciones
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Seguimiento en tiempo real de cirugías, preparación de instrumental, remitos y geolocalización.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inbox.refresh()}
            disabled={inbox.loading || inbox.refreshing}
            className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${inbox.refreshing ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Metrics Strip */}
      <LogisticsMetricsStrip
        counts={{
          news: inbox.data?.counts.news ?? 0,
          urgent: inbox.data?.counts.urgent ?? 0,
          exceptions: inbox.data?.counts.exceptions ?? 0,
          overdue: inbox.data?.counts.overdue,
          transit: items.filter((i) => (i.surgery.logisticsStatus || "").toLowerCase().includes("transito")).length,
          pendingPrep: items.filter((i) => (i.surgery.preparationStatus || "").toLowerCase().includes("pending")).length,
        }}
        activeKey={activeMetricKey}
        onToggle={handleToggleMetric}
      />

      {/* Controls & Filters Toolbar */}
      <LogisticsControlsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={filters.q ?? ""}
        onSearchChange={(q) => setFilter("q", q)}
        prepStatus={filters.prepStatus ?? ""}
        onPrepStatusChange={(v) => setFilter("prepStatus", v)}
        logisticsStatus={filters.logisticsStatus ?? ""}
        onLogisticsStatusChange={(v) => setFilter("logisticsStatus", v)}
        institutionId={filters.institutionId ?? ""}
        onInstitutionChange={(v) => setFilter("institutionId", v)}
        locality={filters.locality ?? ""}
        onLocalityChange={(v) => setFilter("locality", v)}
        hasBlockers={filters.hasBlockers}
        onToggleBlockers={() => setFilter("hasBlockers", filters.hasBlockers ? undefined : true)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        options={options}
        totalCount={items.length}
      />

      {/* Error alert */}
      {inbox.error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900"
        >
          <div className="flex items-center gap-2">
            <CircleAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{inbox.error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => inbox.refresh()} className="h-7 text-xs">
            Reintentar
          </Button>
        </div>
      )}

      {/* Main View Mode Content */}
      {inbox.loading && !inbox.data ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl dark:bg-slate-900 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Cargando expedientes logísticos…
          </p>
        </div>
      ) : viewMode === "map" ? (
        <div className="space-y-3">
          {map.error ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              El mapa de destinos no está disponible: {map.error}
            </div>
          ) : map.data ? (
            <LogisticsMapPanel
              markers={map.data.markers}
              excluded={map.data.excluded}
              vehicles={map.data.vehicles}
              feed={map.data.feed}
              route={map.route}
              routeLoading={map.routeLoading}
              routeError={map.routeError}
              onShowRoute={map.showRoute}
              onHideRoute={map.hideRoute}
              onOpen={handleOpenDetail}
            />
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-white border rounded-xl">
              Cargando mapa de destinos…
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <LogisticsCardsView items={items} onOpenDetail={handleOpenDetail} onShare={setShareItem} />
      ) : (
        <LogisticsTableView items={items} onOpenDetail={handleOpenDetail} onShare={setShareItem} />
      )}

      {/* Pagination Footer */}
      {inbox.data?.page.hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={inbox.loadMore}
            disabled={inbox.loadingMore}
            className="h-9 px-4 text-xs font-semibold border-slate-200 dark:border-slate-700"
          >
            {inbox.loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                <span>Cargando más…</span>
              </>
            ) : (
              <span>Cargar más resultados</span>
            )}
          </Button>
        </div>
      )}
      {/* Logistics Share Dialog */}
      <LogisticsShareDialog
        open={Boolean(shareItem)}
        onOpenChange={(open) => !open && setShareItem(null)}
        item={shareItem}
      />
    </main>
  )
}
