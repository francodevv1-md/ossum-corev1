"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/components/auth/AuthProvider"
import { useOrtoTrackStore } from "@/lib/store"
// TooltipProvider is provided by the root layout — no page-level provider needed

// Hooks
import { useCirugiasFilters } from "@/hooks/useCirugiasFilters"
import { useCirugiaSelection } from "@/hooks/useCirugiaSelection"
import { useColumnVisibility } from "@/hooks/useColumnVisibility"
import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import { useCirugiasSorting } from "@/hooks/useCirugiasSorting"
import { useBackendActiveSurgeries } from "@/hooks/useBackendActiveSurgeries"

// Utils
import { computeKpis, getFacturacionStatus, resolveKpiFilter } from "@/lib/cirugias.utils"
import { CIRUGIAS_COLUMNS } from "@/lib/cirugias.constants"
import { getCircuitProgress } from "@/lib/circuit-progress"
import { deriveCxOperationsDisplay } from "@/lib/cx-operations-derived"

// Toolbar & Filters
import { CirugiasToolbar } from "@/components/cirugias/CirugiasToolbar"
import { CirugiasModuleBar } from "@/components/cirugias/CirugiasModuleBar"
import { ActiveFilterChips } from "@/components/cirugias/ActiveFilterChips"
import { CxOperationPresets, applyCxOperationPreset, clearCxOperationPreset, type CxOperationPresetKey, type CxOperationPresetOwnership } from "@/components/cirugias/CxOperationPresets"
import type { SearchChip } from "@/lib/cirugias.types"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"
import { getAuthorizedSubgroup, getCoordinatorAssignmentBaseDate, getCoordinatorBucket, getMaterialAvailability, getSlaMeta } from "@/components/coordinadores/coordinator-queue.helpers"

// Table
import { CirugiasTable } from "@/components/cirugias/CirugiasTable"

// Dialogs
import { ChangeStateDialog } from "@/components/cirugias/dialogs/ChangeStateDialog"
import { ChangeDateDialog } from "@/components/cirugias/dialogs/ChangeDateDialog"
import { SuspendDialog } from "@/components/cirugias/dialogs/SuspendDialog"
import { CancelDialog } from "@/components/cirugias/dialogs/CancelDialog"
import { AddNoteDialog } from "@/components/cirugias/dialogs/AddNoteDialog"
import { PresupuestoDialog } from "@/components/cirugias/dialogs/PresupuestoDialog"

const ExpedienteFullView = dynamic(
  () => import("@/components/expediente/ExpedienteFullView").then((m) => m.ExpedienteFullView),
  { loading: () => null },
)

const NewSurgeryDialog = dynamic(
  () => import("@/components/cirugias/dialogs/NewSurgeryDialog").then((m) => m.NewSurgeryDialog),
  { loading: () => null },
)

const FacturarDialogNuevo = dynamic(
  () => import("@/components/facturacion/FacturarDialog").then((m) => m.FacturarDialog),
  { loading: () => null },
)

const DeleteSurgeryDialog = dynamic(
  () => import("@/components/cirugias/dialogs/DeleteSurgeryDialog").then((m) => m.DeleteSurgeryDialog),
  { loading: () => null },
)

const ReportsAndDocumentsDialog = dynamic(
  () => import("@/components/cirugias/ReportsAndDocumentsDialog").then((m) => m.ReportsAndDocumentsDialog),
  { loading: () => null },
)

const ViewCustomizationDialog = dynamic(
  () => import("@/components/cirugias/ViewCustomizationDialog").then((m) => m.ViewCustomizationDialog),
  { loading: () => null },
)

export default function CirugiasPage() {
  const { activeCompany } = useAuth()
  const store = useOrtoTrackStore()

  // ── Hooks ──
  const filters = useCirugiasFilters()
  const selection = useCirugiaSelection()
  const columns = useColumnVisibility({ companyId: activeCompany?.id })
  const actions = useCirugiaActions()
  const sorting = useCirugiasSorting()
  const backendSurgeries = useBackendActiveSurgeries()
  const [reportsDialogOpen, setReportsDialogOpen] = useState(false)
  const [viewCustomizationOpen, setViewCustomizationOpen] = useState(false)
  const [showOperationPresets, setShowOperationPresets] = useState(true)
  const presetOwnershipRef = useRef<CxOperationPresetOwnership | null>(null)

  useEffect(() => {
    const handleOpenDeleteDialog = (event: Event) => {
      const surgery = (event as CustomEvent<{ surgery?: typeof store.surgeries[number] }>).detail?.surgery
      if (!surgery) return
      actions.openDeleteSurgeryDialog(surgery)
    }

    window.addEventListener("ossum:open-delete-surgery-dialog", handleOpenDeleteDialog)
    return () => window.removeEventListener("ossum:open-delete-surgery-dialog", handleOpenDeleteDialog)
  }, [actions, store.surgeries])

  useEffect(() => {
    const refreshSurgeries = () => void backendSurgeries.refresh()
    window.addEventListener("ossum:surgeries-refresh", refreshSurgeries)
    return () => window.removeEventListener("ossum:surgeries-refresh", refreshSurgeries)
  }, [backendSurgeries.refresh])

  // ── KPIs (kept for potential future use) ──
  const _kpis = useMemo(() => computeKpis(store.surgeries, store.getDocStatus), [store.surgeries, store])

  // ── Filtered + sorted data ──
  const coordinatorCases = useMemo<Record<string, CoordinatorCase>>(() => Object.fromEntries(store.surgeries.map((surgery) => {
    const logistics = store.getLogisticsBySurgeryId(surgery.id)
    const history = store.getHistoryBySurgeryId(surgery.id)
    const box = store.getBoxBySurgeryId(surgery.id)
    const materialAvailability = getMaterialAvailability(surgery, logistics, box)
    const bucket = getCoordinatorBucket(surgery, logistics, box)
    return [surgery.id, {
      surgery, logistics, history, box, bucket,
      subgroup: bucket === "autorizado" ? getAuthorizedSubgroup(surgery, logistics, box) : null,
      materialAvailabilityDate: materialAvailability.date,
      materialAvailabilityDefined: materialAvailability.defined,
      materialAvailabilityLabel: materialAvailability.label,
      sla: getSlaMeta(getCoordinatorAssignmentBaseDate(surgery, history)),
    }]
  })), [store.surgeries, store])

  const closureSignalsMap = useMemo(() => Object.fromEntries(store.surgeries.map((surgery) => [surgery.id, {
    documentationIncomplete: store.getDocStatus(surgery.id) === "Incompleta",
    consumptionAbsent: !store.getConsumoBySurgeryId(surgery.id),
    invoiceAbsent: !surgery.facturado && !store.getComprobantesBySurgeryId(surgery.id).some((document) => document.type === "FV"),
  }])), [store.surgeries, store])

  const filtered = useMemo(() => {
    const filteredData = filters.filterData(store.surgeries.slice())
    const attentionFiltered = filters.needsAttention
      ? filteredData.filter((surgery) => deriveCxOperationsDisplay(coordinatorCases[surgery.id] ?? null, closureSignalsMap[surgery.id]).attentionReasons.length > 0)
      : filteredData
    return sorting.sortData(attentionFiltered)
  }, [store.surgeries, filters.filterData, filters.needsAttention, sorting.sortData, coordinatorCases, closureSignalsMap])

  const presetSetters = {
    setNeedsAttention: filters.setNeedsAttention,
    setUrgenteFilter: filters.setUrgenteFilter,
    setSinFechaCx: filters.setSinFechaCx,
    setPrepFilters: filters.setPrepFilters,
    setDocFilters: filters.setDocFilters,
    setConPrFilter: filters.setConPrFilter,
    setConConsumoFilter: filters.setConConsumoFilter,
    setConFacturaFilter: filters.setConFacturaFilter,
  }

  const presetState = {
    needsAttention: filters.needsAttention,
    urgenteFilter: filters.urgenteFilter,
    sinFechaCx: filters.sinFechaCx,
    prepFilters: filters.prepFilters,
    docFilters: filters.docFilters,
    conPrFilter: filters.conPrFilter,
    conConsumoFilter: filters.conConsumoFilter,
    conFacturaFilter: filters.conFacturaFilter,
  }

  const clearPreset = () => {
    const nextPresetState = presetOwnershipRef.current
      ? clearCxOperationPreset(presetOwnershipRef.current, presetState, presetSetters)
      : presetState
    presetOwnershipRef.current = null
    filters.setSelectedPreset(null)
    return nextPresetState
  }

  const applyPreset = (preset: CxOperationPresetKey) => {
    const nextPresetState = clearPreset()
    presetOwnershipRef.current = applyCxOperationPreset(preset, nextPresetState, presetSetters)
    filters.setSelectedPreset(preset)
  }

  const clearAllFilters = () => {
    presetOwnershipRef.current = null
    filters.clearFilters()
  }

  // ── Facturacion helper ──
  const facturacionStatusFor = useMemo(() => (s: typeof store.surgeries[0]) =>
    getFacturacionStatus(s, store.getDocStatus, store.getResumenCobranzaBySurgeryId(s.id)),
    [store.getDocStatus, store])

  const circuitProgressMap = useMemo(
    () => Object.fromEntries(
      store.surgeries.map((s) => [
        s.id,
        getCircuitProgress(
          s,
          store.getPresupuestosBySurgeryId,
          store.getRemitosBySurgeryId,
          store.getConsumoBySurgeryId,
          store.getDocStatus,
          store.getResumenCobranzaBySurgeryId,
        ),
      ])
    ),
    [
      store.surgeries,
      store.getPresupuestosBySurgeryId,
      store.getRemitosBySurgeryId,
      store.getConsumoBySurgeryId,
      store.getDocStatus,
      store.getResumenCobranzaBySurgeryId,
    ]
  )

  const shipmentDateMap = useMemo(
    () => Object.fromEntries(
      store.surgeries.map((s) => [s.id, store.getLogisticsBySurgeryId(s.id)?.fechaEnvioMateriales])
    ),
    [store.surgeries, store]
  )

  // ── KPI click handler (kept for potential future use) ──
  const _handleKpiClick = (filterKey: string | null) => {
    const { newKpiFilter, newStateFilters } = resolveKpiFilter(filters.kpiFilter, filterKey)
    if (newKpiFilter !== undefined) filters.setKpiFilter(newKpiFilter)
    if (newStateFilters) filters.setStateFilters(newStateFilters)
  }

  // ── Selected surgery helpers (for ExpedienteFullView) ──
  const selectedFacturacionStatus = selection.selectedSurgery
    ? getFacturacionStatus(
        selection.selectedSurgery,
        store.getDocStatus,
        selection.selResumenCobranza,
      )
    : ""
  const selectedPresupuestoId = selection.selPresupuestos[0]?.id
  const selectedRemitoId = selection.selRemitos[0]?.id
  const selectedFvNumber = selection.selectedSurgery
    ? (selection.selectedSurgery.facturaNumber || selection.selComprobantes.find(c => c.type === "FV")?.number || undefined)
    : undefined
  const selectedConsumoState = selection.selConsumo?.state
  const selectedCobrosTotal = selection.selResumenCobranza?.totalCobrado ?? 0

  return (
    <>
    {!backendSurgeries.ready ? (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Cargando cirugías desde backend…
      </div>
    ) : backendSurgeries.error ? (
      <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-red-600 dark:text-red-400">
        Error al cargar cirugías desde backend: {backendSurgeries.error}
      </div>
    ) : (
     <div className="flex min-h-0 flex-1 flex-col bg-slate-100/70 dark:bg-slate-950">
        {/* ── EXPANDED VIEW: Full Expediente replaces everything ── */}
        {selection.panelState === "expanded" && selection.selectedSurgery ? (
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
            onBack={() => selection.closeExpediente()}
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
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* LIST VIEW: Toolbar + Chips + Table (full width)           */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="mx-1 mt-1 shrink-0 border border-slate-300 bg-gradient-to-b from-white via-slate-50 to-slate-100/80 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/90 lg:mx-2 lg:mt-2">
              <CirugiasModuleBar
                searchChips={filters.searchChips}
                onSearchChipsChange={filters.setSearchChips}
                onSmartSearch={() => {}}
                colVisOpen={columns.colVisOpen}
                setColVisOpen={columns.setColVisOpen}
                columns={CIRUGIAS_COLUMNS}
                visibleCols={columns.visibleCols}
                toggleColumn={columns.toggleColumn}
                stickyColumns={columns.stickyColumns}
                onToggleStickyColumns={columns.toggleStickyColumns}
                columnOrder={columns.columnOrder}
                onReorderColumns={columns.reorderColumns}
                onResetToDefault={columns.resetToDefault}
                resultCount={filtered.length}
                activeFilterCount={filters.activeFilterCount}
                hasActiveFilters={filters.hasActiveFilters}
                clearFilters={clearAllFilters}
                onNewSurgery={actions.openNewSurgeryDialog}
                onReportsDialogOpenChange={setReportsDialogOpen}
              />

              {/* ── Toolbar (quick/date/more filters) ── */}
              <CirugiasToolbar
                searchChips={filters.searchChips}
                onSearchChipsChange={filters.setSearchChips}
                onSmartSearch={() => {}}
                search={filters.search} setSearch={filters.setSearch}
                filtersOpen={filters.filtersOpen} setFiltersOpen={filters.setFiltersOpen}
                hasActiveFilters={filters.hasActiveFilters}
                activeFilterCount={filters.activeFilterCount}
                stateFilters={filters.stateFilters} setStateFilters={filters.setStateFilters}
                prepFilters={filters.prepFilters} setPrepFilters={filters.setPrepFilters}
                docFilters={filters.docFilters} setDocFilters={filters.setDocFilters}
                factFilters={filters.factFilters} setFactFilters={filters.setFactFilters}
                classFilters={filters.classFilters} setClassFilters={filters.setClassFilters}
                clientFilters={filters.clientFilters} setClientFilters={filters.setClientFilters}
                institutionFilters={filters.institutionFilters} setInstitutionFilters={filters.setInstitutionFilters}
                coordinadorFilters={filters.coordinadorFilters} setCoordinadorFilters={filters.setCoordinadorFilters}
                urgenteFilter={filters.urgenteFilter} setUrgenteFilter={filters.setUrgenteFilter}
                provinciaFilters={filters.provinciaFilters} setProvinciaFilters={filters.setProvinciaFilters}
                vendedorFilters={filters.vendedorFilters} setVendedorFilters={filters.setVendedorFilters}
                dateFrom={filters.dateFrom} setDateFrom={filters.setDateFrom}
                dateTo={filters.dateTo} setDateTo={filters.setDateTo}
                dateFilters={filters.dateFilters} onDateFiltersChange={filters.setDateFilters}
                searchInMedico={filters.searchInMedico} setSearchInMedico={filters.setSearchInMedico}
                searchInInstitucion={filters.searchInInstitucion} setSearchInInstitucion={filters.setSearchInInstitucion}
                searchInCliente={filters.searchInCliente} setSearchInCliente={filters.setSearchInCliente}
                searchInPR={filters.searchInPR} setSearchInPR={filters.setSearchInPR}
                searchInExpediente={filters.searchInExpediente} setSearchInExpediente={filters.setSearchInExpediente}
                searchInNR={filters.searchInNR} setSearchInNR={filters.setSearchInNR}
                searchInFV={filters.searchInFV} setSearchInFV={filters.setSearchInFV}
                clearFilters={clearAllFilters}
                colVisOpen={columns.colVisOpen} setColVisOpen={columns.setColVisOpen}
                columns={CIRUGIAS_COLUMNS}
                visibleCols={columns.visibleCols} toggleColumn={columns.toggleColumn}
                stickyColumns={columns.stickyColumns}
                onToggleStickyColumns={columns.toggleStickyColumns}
                columnOrder={columns.columnOrder}
                onReorderColumns={columns.reorderColumns}
                onResetToDefault={columns.resetToDefault}
                onOpenViewCustomization={() => setViewCustomizationOpen(true)}
                resultCount={filtered.length}
                onNewSurgery={actions.openNewSurgeryDialog}
                reportsDialogOpen={reportsDialogOpen}
                onReportsDialogOpenChange={setReportsDialogOpen}
                expedienteNumFilter={filters.expedienteNumFilter} setExpedienteNumFilter={filters.setExpedienteNumFilter}
                nrNumFilter={filters.nrNumFilter} setNrNumFilter={filters.setNrNumFilter}
                fvNumFilter={filters.fvNumFilter} setFvNumFilter={filters.setFvNumFilter}
                numeroAutorizacionFilter={filters.numeroAutorizacionFilter} setNumeroAutorizacionFilter={filters.setNumeroAutorizacionFilter}
                instrumentadorFilter={filters.instrumentadorFilter} setInstrumentadorFilter={filters.setInstrumentadorFilter}
                localidadFilter={filters.localidadFilter} setLocalidadFilter={filters.setLocalidadFilter}
                fechaAutorizacionFrom={filters.fechaAutorizacionFrom} setFechaAutorizacionFrom={filters.setFechaAutorizacionFrom}
                fechaAutorizacionTo={filters.fechaAutorizacionTo} setFechaAutorizacionTo={filters.setFechaAutorizacionTo}
                fechaFacturaFrom={filters.fechaFacturaFrom} setFechaFacturaFrom={filters.setFechaFacturaFrom}
                fechaFacturaTo={filters.fechaFacturaTo} setFechaFacturaTo={filters.setFechaFacturaTo}
                sinFechaCx={filters.sinFechaCx} setSinFechaCx={filters.setSinFechaCx}
                conPrFilter={filters.conPrFilter} setConPrFilter={filters.setConPrFilter}
                conConsumoFilter={filters.conConsumoFilter} setConConsumoFilter={filters.setConConsumoFilter}
                conFacturaFilter={filters.conFacturaFilter} setConFacturaFilter={filters.setConFacturaFilter}
              />

              {showOperationPresets ? (
                <div className="border-b border-slate-200 px-3 dark:border-slate-800">
                  <CxOperationPresets selectedPreset={filters.selectedPreset as CxOperationPresetKey | null} onApply={applyPreset} onClear={clearPreset} />
                </div>
              ) : null}

              {/* ── Active Filter Chips (CHATZAI-025: includes search chips) ── */}
              <div className="shrink-0 px-3 pb-1.5 pt-1">
                <ActiveFilterChips
                  chips={filters.activeFilterChips}
                  searchChips={filters.searchChips}
                  onRemoveSearchChip={(chipId: string) =>
                    filters.setSearchChips(filters.searchChips.filter((c: SearchChip) => c.id !== chipId))
                  }
                  hasExtendedSearch={filters.hasExtendedSearch}
                  onClearExtendedSearch={filters.clearExtendedSearch}
                  onClearAll={clearAllFilters}
                  selectedPreset={filters.selectedPreset as CxOperationPresetKey | null}
                  onClearPreset={clearPreset}
                />
              </div>
            </div>

            {/* ── Table — full width, no preview panel ── */}
            <div className="mx-1 -mt-px flex min-h-0 flex-1 flex-col border border-slate-300 border-t-0 bg-white dark:border-slate-800 dark:bg-slate-950 lg:mx-2">
              <div className="min-h-0 min-w-0 flex-1">
                <CirugiasTable
                data={filtered}
                selectedSurgeryId={selection.selectedSurgeryId}
                visibleCols={columns.visibleCols}
                sortKey={sorting.sortKey}
                sortDir={sorting.sortDir}
                onSort={sorting.handleSort}
                getDocStatus={store.getDocStatus}
                getConsumoState={(id: string) => store.getConsumoBySurgeryId(id)?.state ?? null}
                getFacturacionStatus={facturacionStatusFor}
                getPrId={(id: string) => store.getPresupuestosBySurgeryId(id)[0]?.id}
                onSelect={selection.selectSurgery}
                onOpenExpediente={selection.openExpediente}
                onOpenPresupuestoDialog={actions.openPresupuestoDialog}
                onSetExpTab={selection.setExpTab}
                onSetDialogSurgery={actions.setDialogSurgery}
                onSetNewState={actions.setNewState}
                onSetChangeStateDialogOpen={actions.setChangeStateDialogOpen}
                onSetChangeDateDialogOpen={actions.setChangeDateDialogOpen}
                onSetSuspendDialogOpen={actions.setSuspendDialogOpen}
                onSetCancelDialogOpen={actions.setCancelDialogOpen}
                onSetNoteDialogOpen={actions.setNoteDialogOpen}
                onSetFacturarDialogOpen={actions.setFacturarDialogOpen}
                onRecover={actions.handleRecover}
                canFacturar={actions.canFacturar}
                stickyColumns={columns.stickyColumns}
                compactMode={columns.compactMode}
                fixedLeftColumns={columns.fixedLeftColumns}
                columnOrder={columns.columnOrder}
                columnWidths={columns.columnWidths}
                groups={columns.columnGroups}
                showGroupedHeaders={columns.showGroupedHeaders}
                 onClearFilters={clearAllFilters}
                onNewSurgery={actions.openNewSurgeryDialog}
                hasActiveFilters={filters.hasActiveFilters}
                circuitProgressMap={circuitProgressMap}
                 shipmentDateMap={shipmentDateMap}
                 coordinatorCaseMap={coordinatorCases}
                 closureSignalsMap={closureSignalsMap}
              />
              </div>

            </div>
          </>
        )}
      </div>
    )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOGS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {actions.newDialogOpen ? (
        <NewSurgeryDialog
          open={actions.newDialogOpen} onOpenChange={actions.setNewDialogOpen}
          wizardStep={actions.wizardStep} setWizardStep={actions.setWizardStep}
          newForm={actions.newForm} setNewForm={actions.setNewForm}
          createPRNow={actions.createPRNow} setCreatePRNow={actions.setCreatePRNow}
          prForm={actions.prForm}
          onConfirm={actions.handleNewSurgery}
          createdSurgeryId={actions.createdSurgeryId}
          instrumentadores={actions.instrumentadores}
          onOpenCreatedSurgery={selection.openExpediente}
        />
      ) : null}
      <ChangeStateDialog
        open={actions.changeStateDialogOpen} onOpenChange={actions.setChangeStateDialogOpen}
        dialogSurgery={actions.dialogSurgery}
        newState={actions.newState} setNewState={actions.setNewState}
        onConfirm={actions.handleChangeState}
      />
      <ChangeDateDialog
        open={actions.changeDateDialogOpen} onOpenChange={actions.setChangeDateDialogOpen}
        dialogSurgery={actions.dialogSurgery}
        newDate={actions.newDate} setNewDate={actions.setNewDate}
        newTime={actions.newTime} setNewTime={actions.setNewTime}
        onConfirm={actions.handleChangeDate}
      />
      <SuspendDialog
        open={actions.suspendDialogOpen} onOpenChange={actions.setSuspendDialogOpen}
        dialogSurgery={actions.dialogSurgery}
        reason={actions.reason} setReason={actions.setReason}
        onConfirm={actions.handleSuspend}
      />
      <CancelDialog
        open={actions.cancelDialogOpen} onOpenChange={actions.setCancelDialogOpen}
        dialogSurgery={actions.dialogSurgery}
        reason={actions.reason} setReason={actions.setReason}
        onConfirm={actions.handleCancel}
      />
      <AddNoteDialog
        open={actions.noteDialogOpen} onOpenChange={actions.setNoteDialogOpen}
        surgeryId={actions.dialogSurgery?.id || selection.selectedSurgeryId || undefined}
        noteText={actions.noteText} setNoteText={actions.setNoteText}
        noteType={actions.noteType} setNoteType={actions.setNoteType}
        notePriority={actions.notePriority} setNotePriority={actions.setNotePriority}
        onConfirm={() => actions.handleAddNote(selection.selectedSurgery ?? null)}
      />
      {actions.facturarDialogOpen ? (
        <FacturarDialogNuevo
          surgeryId={actions.dialogSurgery?.id || selection.selectedSurgery?.id}
          open={actions.facturarDialogOpen}
          onOpenChange={actions.setFacturarDialogOpen}
          onFacturar={actions.handleFacturarConDatos}
        />
      ) : null}
      <PresupuestoDialog
        open={actions.presupuestoDialogOpen} onOpenChange={actions.setPresupuestoDialogOpen}
        surgery={actions.dialogSurgery}
        onCreated={(prId) => {
          actions.setPresupuestoDialogOpen(false)
        }}
      />
      {actions.deleteDialogOpen ? (
        <DeleteSurgeryDialog
          open={actions.deleteDialogOpen}
          onOpenChange={actions.setDeleteDialogOpen}
          surgery={actions.dialogSurgery}
          onArchived={backendSurgeries.refresh}
        />
      ) : null}
      {reportsDialogOpen ? (
        <ReportsAndDocumentsDialog
          open={reportsDialogOpen}
          onOpenChange={setReportsDialogOpen}
          hasSelectedSurgery={!!selection.selectedSurgery}
          selectedSurgeryLabel={selection.selectedSurgery ? `${selection.selectedSurgery.id} — ${selection.selectedSurgery.patient}` : undefined}
        />
      ) : null}
      {viewCustomizationOpen ? (
        <ViewCustomizationDialog
          open={viewCustomizationOpen}
          onOpenChange={setViewCustomizationOpen}
          columns={CIRUGIAS_COLUMNS}
          visibleCols={columns.visibleCols}
          columnOrder={columns.columnOrder}
          stickyColumns={columns.stickyColumns}
          columnWidths={columns.columnWidths}
          compactMode={columns.compactMode}
          fixedColumns={columns.fixedLeftColumns}
          groups={columns.columnGroups}
          showGroupedHeaders={columns.showGroupedHeaders}
          showOperationPresets={showOperationPresets}
          onShowOperationPresetsChange={setShowOperationPresets}
          onApply={({ visibleCols, columnOrder, stickyColumns, columnWidths, compactMode, fixedColumns, groups, showGroupedHeaders }) => {
            columns.applyViewPreferences({
              visibleCols,
              columnOrder,
              stickyColumns,
              columnWidths,
              compactMode,
              fixedLeftColumns: fixedColumns,
              columnGroups: groups,
              showGroupedHeaders,
            })
          }}
          onResetToDefault={columns.resetToDefault}
        />
      ) : null}
    </>
  )
}
