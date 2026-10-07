"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { buildReschedulingPatch, type ReschedulingSaveResult } from "@/lib/surgery/rescheduling"
import { fetchBackendSurgery, updateBackendSurgeryManagement, updateBackendSurgeryState, addBackendSurgeryNote } from "@/lib/api/backend-surgeries"
import { useActiveCoordination } from "./useActiveCoordination"
import { canMutateSeguimientoEvents } from "@/lib/permissions/seguimiento"
import { canManageCoordination } from "@/lib/permissions/coordination"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"
import { useAuth } from "@/components/auth/AuthProvider"
import type { Surgery } from "@/types"
import type { SurgeryGestionFormData } from "@/types/coordinadores.types"
import { useTemporalNavigation } from "@/hooks/useTemporalNavigation"
import { useCoordinadoresFilters } from "@/hooks/useCoordinadoresFilters"
import { useCoordinadoresColumnVisibility } from "@/hooks/useCoordinadoresColumnVisibility"

import { IncidentsMetricsStrip } from "./topbar/IncidentsMetricsStrip"
import { ViewModeSwitcher } from "./controls/ViewModeSwitcher"
import { TimelinePeriodNavigator } from "./controls/TimelinePeriodNavigator"
import { FiltersToolbar } from "./controls/FiltersToolbar"
import { PaginationControls } from "./controls/PaginationControls"

import { DayViewDesktopTable } from "./views/DayViewDesktopTable"
import { DayViewMobileCards } from "./views/DayViewMobileCards"
import { WeekViewGroupedView } from "./views/WeekViewGroupedView"
import { MonthLoadCalendar } from "./views/MonthLoadCalendar"
import { CaseDetailModal } from "./modal/CaseDetailModal"
import { DefineDateModal, type DefineDateNotePayload } from "./modal/DefineDateModal"
import { CoordinatorShareDialog } from "./CoordinatorShareDialog"
import type { CoordinatorCase } from "./coordinator-queue.helpers"
import { UserCheck, Shield } from "lucide-react"

export function CoordinatorPersonalClient() {
  const { currentAccess, activeCompany } = useAuth()
  const view = useActiveCoordination("personal")
  const canManage = view.hasSuccessfulData && view.response?.context.personalResolution?.status === "resolved" && !view.response.context.readOnly && canManageCoordination(currentAccess?.role)
  const contextKey = `${view.trustContextKey}:${view.waitingForAuth}:${currentAccess?.role}`
  const identity = useRef({ companyId: activeCompany?.id, contextKey, date: 0, gestion: 0, load: 0 })
  const confirmed = useRef<Partial<Record<"date" | "gestion", { generation: number; record: Surgery }>>>({})
  if (identity.current.contextKey !== contextKey) {
    identity.current.contextKey = contextKey
    identity.current.companyId = activeCompany?.id
    identity.current.date += 1; identity.current.gestion += 1
  }
  useEffect(() => () => { identity.current.date += 1; identity.current.gestion += 1 }, [])
  useEffect(() => {
    identity.current.date += 1; identity.current.gestion += 1
    setIsModalOpen(false); setIsDefineDateOpen(false); setIsShareOpen(false)
    confirmed.current = {}
  }, [contextKey])
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [defineDateSurgery, setDefineDateSurgery] = useState<Surgery | null>(null)
  const [isDefineDateOpen, setIsDefineDateOpen] = useState(false)
  const [shareCase, setShareCase] = useState<CoordinatorCase | null>(null)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Identify active coordinator name
  const currentCoordinatorName = view.response?.context.viewSubject?.label ?? "Identidad sin resolver"

  // Filter surgeries scoped to this coordinator
  const mySurgeries = view.surgeries

  // Temporal navigation hook
  const {
    viewMode,
    setViewMode,
    periodTitle,
    goToToday,
    goToPrev,
    goToNext,
    startDateStr,
    endDateStr,
    activePreset,
    setDateRange,
    applyPreset,
    isDateInPeriod,
    getMonthMatrix,
    getWeekGroups,
  } = useTemporalNavigation()

  // Filter & Incidents hook (scoped to coordinator's surgeries)
  const filterState = useCoordinadoresFilters(mySurgeries)
  const {
    filters,
    setSearch,
    toggleState,
    togglePrep,
    toggleSoloIncidencias,
    toggleIncidentFilter,
    clearAllFilters,
    incidentMetrics,
    filteredSurgeries,
    hasActiveFilters,
  } = filterState

  // Column visibility & density hook
  const {
    columns,
    visibleCols,
    columnOrder,
    compactMode,
    setCompactMode,
    stickyColumns,
    setStickyColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault: resetColumns,
  } = useCoordinadoresColumnVisibility()

  // Open & Close modal handlers
  const handleSelectSurgery = useCallback((surgery: Surgery) => {
    identity.current.gestion += 1
    setSelectedSurgery(surgery)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    identity.current.gestion += 1
    setIsModalOpen(false)
  }, [])

  const handleOpenDefineDate = useCallback((surgery: Surgery) => {
    identity.current.date += 1
    setDefineDateSurgery(surgery)
    setIsDefineDateOpen(true)
  }, [])

  const handleCloseDefineDate = useCallback(() => {
    identity.current.date += 1
    setIsDefineDateOpen(false)
  }, [])

  const saveRescheduling = async (kind: "date" | "gestion", surgeryId: string, updates: Partial<Surgery>, note?: DefineDateNotePayload): Promise<void | ReschedulingSaveResult> => {
    const generation = identity.current[kind], companyId = activeCompany?.id
    if (!canManage) throw new Error("Sin permiso para modificar Coordinación")
    const existing = confirmed.current[kind]?.generation === generation ? confirmed.current[kind]!.record : mySurgeries.find((s) => s.id === surgeryId || s.backendId === surgeryId)
    if (!companyId || !existing?.backendId) throw new Error("Se requiere empresa activa e identificador de backend")
    const isCurrent = () => identity.current.companyId === companyId && identity.current[kind] === generation
    const content = note?.content ?? (kind === "gestion" ? updates.notes : undefined)
    if (content?.trim() && !canMutateSeguimientoEvents(currentAccess?.role)) throw new Error("Sin permiso para crear notas")
    const patch: Parameters<typeof updateBackendSurgeryManagement>[2] = buildReschedulingPatch(existing, updates)
    if (updates.coordinadorContactId !== undefined && updates.coordinadorContactId !== (existing.coordinadorContactId ?? "")) patch.coordinatorContactId = updates.coordinadorContactId || null
    identity.current.load += 1
    const saved = Object.keys(patch).length ? await updateBackendSurgeryManagement(companyId, existing.backendId, patch) : null
    if (!isCurrent()) return
    let record = saved ? mapApiSurgeryListToSurgeries([saved], [existing])[0] : existing
    confirmed.current[kind] = { generation, record }
    let stateFailed = false, noteFailed = false
    if (kind === "gestion" && updates.state && updates.state !== record.state) {
      try {
        const stateRecord = await updateBackendSurgeryState(companyId, existing.backendId, updates.state, "coordinadores:gestion")
        if (!isCurrent()) return
        record = mapApiSurgeryListToSurgeries([stateRecord], [record])[0]
        confirmed.current[kind] = { generation, record }
      } catch (error) {
        stateFailed = true
        throw new Error(error instanceof Error ? `No se pudo cambiar el estado: ${error.message}` : "No se pudo cambiar el estado")
      }
    }
    if (!isCurrent()) return
    if (content?.trim()) {
      try { await addBackendSurgeryNote(companyId, existing.backendId, { content, noteType: note?.noteType || "Coordinación", priority: note?.priority || "Media", isUrgent: Boolean(updates.urgente), mentions: note?.mentions }) }
      catch { noteFailed = true }
    }
    if (!isCurrent()) return
    try {
      const canonical = await fetchBackendSurgery(companyId, existing.backendId)
      if (!isCurrent()) return
      confirmed.current[kind] = { generation, record: mapApiSurgeryListToSurgeries([canonical], [])[0] }
    } catch {
      window.dispatchEvent(new Event("coordination-updated"))
      return { partialError: "Cambios enviados; no se pudo confirmar la lectura. Actualiza antes de reintentar.", noteSaved: Boolean(content?.trim()) && !noteFailed }
    }
    window.dispatchEvent(new Event("coordination-updated"))
    if (stateFailed || noteFailed) return { partialError: `Guardado parcial. Pendiente: ${[stateFailed ? "estado" : "", noteFailed ? "nota sigue pendiente" : ""].filter(Boolean).join(" y ")}. Los cambios confirmados se conservaron.`, noteSaved: Boolean(content?.trim()) && !noteFailed }
  }
  const handleSaveDefineDate = (id: string, updates: Partial<Surgery>, note?: DefineDateNotePayload) => saveRescheduling("date", id, updates, note)
  const handleSaveGestion = (id: string, updates: SurgeryGestionFormData) => saveRescheduling("gestion", id, updates)


  const handleOpenShare = useCallback(
    (surgery: Surgery) => {
      const entry: CoordinatorCase = {
        surgery,
        history: [],
        bucket: surgery.state === "Autorizada" ? "autorizado" : surgery.state === "En tránsito" ? "transito" : null,
        subgroup: null,
        materialAvailabilityLabel: surgery.materialAvailabilityDate || "Disponibilidad sin definir",
        materialAvailabilityDefined: Boolean(surgery.materialAvailabilityDate),
        sla: {
          tone: "ok",
          label: "En plazo",
          hoursElapsed: null,
        },
      }
      setShareCase(entry)
      setIsShareOpen(true)
    },
    []
  )

  // Temporal grouped views
  const weekGroups = useMemo(() => {
    return getWeekGroups(filteredSurgeries)
  }, [getWeekGroups, filteredSurgeries])

  const monthMatrix = useMemo(() => {
    return getMonthMatrix(filteredSurgeries)
  }, [getMonthMatrix, filteredSurgeries])

  // Reset pagination when filters or view mode change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, viewMode, startDateStr, endDateStr, filteredSurgeries])

  const periodSurgeries = useMemo(() => filteredSurgeries.filter(s => !s.date || isDateInPeriod(s.date)), [filteredSurgeries, isDateInPeriod])

  // Paginated surgeries for day view
  const paginatedSurgeries = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return periodSurgeries.slice(start, start + pageSize)
  }, [periodSurgeries, currentPage, pageSize])

  const unscheduledSurgeries = useMemo(() => {
    return filteredSurgeries.filter((s) => !s.date || s.date.trim() === "")
  }, [filteredSurgeries])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {view.loading && <p role="status">Cargando Coordinación…</p>}
      {view.error && <p role="alert">{view.error} <button onClick={() => void view.refresh()}>Reintentar</button></p>}
      {view.hasSuccessfulData && view.response?.context.personalResolution?.status !== "resolved" && <p role="status">No se pudo vincular tu identidad a un coordinador de esta empresa.</p>}
      {/* 1. Incidents Metrics Strip (Personal) */}
      <IncidentsMetricsStrip
        metrics={incidentMetrics}
        activeFilter={filters.activeIncidentFilter}
        onToggleFilter={toggleIncidentFilter}
      />

      {/* 2. Main Dashboard Body */}
      <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 py-4 max-w-[1920px] w-full mx-auto flex flex-col gap-4">
        {/* Temporal Navigation + View Switcher Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
          <TimelinePeriodNavigator
            periodTitle={periodTitle}
            visibleCount={periodSurgeries.length}
            totalCount={mySurgeries.length}
            onPrev={goToPrev}
            onNext={goToNext}
            onToday={goToToday}
            startDateStr={startDateStr}
            endDateStr={endDateStr}
            activePreset={activePreset}
            onSelectRange={setDateRange}
            onApplyPreset={applyPreset}
          />

          <div className="flex items-center gap-3">
            {/* Coordinator Identification Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-[#1D2FC0] dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-lg text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Bandeja: {currentCoordinatorName}</span>
            </div>

            <ViewModeSwitcher
              currentView={viewMode}
              onViewChange={setViewMode}
            />
          </div>
        </div>

        {/* Filters Toolbar (Without Coordinator selector - locked to personal queue) */}
        <FiltersToolbar
          surgeries={mySurgeries}
          search={filters.search}
          onSearchChange={setSearch}
          coordinators={[]}
          selectedCoordinators={[]}
          onToggleCoordinator={() => {}}
          selectedStates={filters.selectedStates}
          onToggleState={toggleState}
          selectedPreps={filters.selectedPreps}
          onTogglePrep={togglePrep}
          soloIncidencias={filters.soloIncidencias}
          onToggleSoloIncidencias={toggleSoloIncidencias}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAllFilters}
          columns={columns}
          visibleCols={visibleCols}
          onToggleColumn={toggleColumn}
          columnOrder={columnOrder}
          onReorderColumns={reorderColumns}
          onResetColumns={resetColumns}
          stickyColumns={stickyColumns}
          onToggleStickyColumns={() => setStickyColumns(!stickyColumns)}
          compactMode={compactMode}
          onToggleCompactMode={() => setCompactMode(!compactMode)}
          showColumnControls={viewMode === "day" || viewMode === "week"}
          // Advanced Filters
          classFilters={filterState.classFilters}
          setClassFilters={filterState.setClassFilters}
          clientFilters={filterState.clientFilters}
          setClientFilters={filterState.setClientFilters}
          institutionFilters={filterState.institutionFilters}
          setInstitutionFilters={filterState.setInstitutionFilters}
          urgenteFilter={filterState.urgenteFilter}
          setUrgenteFilter={filterState.setUrgenteFilter}
          provinciaFilters={filterState.provinciaFilters}
          setProvinciaFilters={filterState.setProvinciaFilters}
          vendedorFilters={filterState.vendedorFilters}
          setVendedorFilters={filterState.setVendedorFilters}
          searchInMedico={filterState.searchInMedico}
          setSearchInMedico={filterState.setSearchInMedico}
          searchInInstitucion={filterState.searchInInstitucion}
          setSearchInInstitucion={filterState.setSearchInInstitucion}
          searchInCliente={filterState.searchInCliente}
          setSearchInCliente={filterState.setSearchInCliente}
          searchInPR={filterState.searchInPR}
          setSearchInPR={filterState.setSearchInPR}
          searchInExpediente={filterState.searchInExpediente}
          setSearchInExpediente={filterState.setSearchInExpediente}
          searchInNR={filterState.searchInNR}
          setSearchInNR={filterState.setSearchInNR}
          searchInFV={filterState.searchInFV}
          setSearchInFV={filterState.setSearchInFV}
          hasActiveSecondary={filterState.hasActiveSecondary}
          expedienteNumFilter={filterState.expedienteNumFilter}
          setExpedienteNumFilter={filterState.setExpedienteNumFilter}
          nrNumFilter={filterState.nrNumFilter}
          setNrNumFilter={filterState.setNrNumFilter}
          fvNumFilter={filterState.fvNumFilter}
          setFvNumFilter={filterState.setFvNumFilter}
          numeroAutorizacionFilter={filterState.numeroAutorizacionFilter}
          setNumeroAutorizacionFilter={filterState.setNumeroAutorizacionFilter}
          instrumentadorFilter={filterState.instrumentadorFilter}
          setInstrumentadorFilter={filterState.setInstrumentadorFilter}
          localidadFilter={filterState.localidadFilter}
          setLocalidadFilter={filterState.setLocalidadFilter}
          fechaAutorizacionFrom={filterState.fechaAutorizacionFrom}
          setFechaAutorizacionFrom={filterState.setFechaAutorizacionFrom}
          fechaAutorizacionTo={filterState.fechaAutorizacionTo}
          setFechaAutorizacionTo={filterState.setFechaAutorizacionTo}
          fechaFacturaFrom={filterState.fechaFacturaFrom}
          setFechaFacturaFrom={filterState.setFechaFacturaFrom}
          fechaFacturaTo={filterState.fechaFacturaTo}
          setFechaFacturaTo={filterState.setFechaFacturaTo}
          sinFechaCx={filterState.sinFechaCx}
          setSinFechaCx={filterState.setSinFechaCx}
          conPrFilter={filterState.conPrFilter}
          setConPrFilter={filterState.setConPrFilter}
          conConsumoFilter={filterState.conConsumoFilter}
          setConConsumoFilter={filterState.setConConsumoFilter}
          conFacturaFilter={filterState.conFacturaFilter}
          setConFacturaFilter={filterState.setConFacturaFilter}
          clearAdvancedFilters={filterState.clearAdvancedFilters}
        />

        {/* 3. Active View Presentation */}
        <div className="flex-1">
          {viewMode === "day" && (
            <div className="flex flex-col gap-3.5">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <DayViewDesktopTable
                  surgeries={paginatedSurgeries}
                  selectedSurgeryId={selectedSurgery?.id || null}
                  onSelectSurgery={handleSelectSurgery}
                  onDefineDate={handleOpenDefineDate}
                  onShareSurgery={handleOpenShare}
                  isCoordinatorPersonalView={true}
                  visibleCols={visibleCols}
                  columnOrder={columnOrder}
                  compactMode={compactMode}
                  stickyColumns={stickyColumns}
                />
              </div>

              {/* Mobile Cards */}
              <div className="block md:hidden">
                <DayViewMobileCards
                  surgeries={paginatedSurgeries}
                  selectedSurgeryId={selectedSurgery?.id || null}
                  onSelectSurgery={handleSelectSurgery}
                  onDefineDate={handleOpenDefineDate}
                  onShareSurgery={handleOpenShare}
                  isCoordinatorPersonalView={true}
                />
              </div>

              {/* Pagination Controls */}
              {filteredSurgeries.length > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalItems={periodSurgeries.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize)
                    setCurrentPage(1)
                  }}
                  pageSizeOptions={[10, 15, 25, 50]}
                />
              )}
            </div>
          )}

          {viewMode === "week" && (
            <WeekViewGroupedView
              weekGroups={weekGroups}
              selectedSurgeryId={selectedSurgery?.id || null}
              onSelectSurgery={handleSelectSurgery}
              onDefineDate={handleOpenDefineDate}
              onShareSurgery={handleOpenShare}
              isCoordinatorPersonalView={true}
              unscheduledSurgeries={unscheduledSurgeries}
              visibleCols={visibleCols}
              columnOrder={columnOrder}
              compactMode={compactMode}
              stickyColumns={stickyColumns}
            />
          )}

          {viewMode === "month" && (
            <MonthLoadCalendar
              monthCells={monthMatrix}
              selectedSurgeryId={selectedSurgery?.id || null}
              onSelectSurgery={handleSelectSurgery}
              unscheduledSurgeries={unscheduledSurgeries}
            />
          )}
        </div>
      </main>

      {/* 4. Case Management Modal / Drawer */}
      <CaseDetailModal
        key={`gestion-${activeCompany?.id}-${identity.current.gestion}`}
        surgery={selectedSurgery}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveGestion={handleSaveGestion}
        onShare={handleOpenShare}
        history={[]}
        coordinators={[currentCoordinatorName]}
        readOnly={!canManage}
      />

      {/* 5. Quick Define Date & Scheduling Modal */}
      <DefineDateModal
        key={`date-${activeCompany?.id}-${identity.current.date}`}
        surgery={defineDateSurgery}
        isOpen={isDefineDateOpen && canManage}
        onClose={handleCloseDefineDate}
        onSave={handleSaveDefineDate}
      />

      {/* 6. Complete Coordinator Share Dialog */}
      <CoordinatorShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        entry={shareCase}
      />
    </div>
  )
}
