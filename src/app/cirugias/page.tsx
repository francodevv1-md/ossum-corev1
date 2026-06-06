"use client"

import React, { useMemo, useState } from "react"
import { useOrtoTrackStore } from "@/lib/store"
// TooltipProvider is provided by the root layout — no page-level provider needed

// Hooks
import { useCirugiasFilters } from "@/hooks/useCirugiasFilters"
import { useCirugiaSelection } from "@/hooks/useCirugiaSelection"
import { useColumnVisibility } from "@/hooks/useColumnVisibility"
import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import { useCirugiasSorting } from "@/hooks/useCirugiasSorting"

// Utils
import { computeKpis, getFacturacionStatus, resolveKpiFilter } from "@/lib/cirugias.utils"
import { CIRUGIAS_COLUMNS } from "@/lib/cirugias.constants"

// Toolbar & Filters
import { CirugiasToolbar } from "@/components/cirugias/CirugiasToolbar"
import { ActiveFilterChips } from "@/components/cirugias/ActiveFilterChips"
import type { SearchChip } from "@/lib/cirugias.types"

// Table
import { CirugiasTable } from "@/components/cirugias/CirugiasTable"

// Expediente
import { ExpedienteFullView } from "@/components/expediente/ExpedienteFullView"

// Dialogs
import { NewSurgeryDialog } from "@/components/cirugias/dialogs/NewSurgeryDialog"
import { ChangeStateDialog } from "@/components/cirugias/dialogs/ChangeStateDialog"
import { ChangeDateDialog } from "@/components/cirugias/dialogs/ChangeDateDialog"
import { SuspendDialog } from "@/components/cirugias/dialogs/SuspendDialog"
import { CancelDialog } from "@/components/cirugias/dialogs/CancelDialog"
import { AddNoteDialog } from "@/components/cirugias/dialogs/AddNoteDialog"
import { FacturarDialog as FacturarDialogNuevo } from "@/components/facturacion/FacturarDialog"
import { PresupuestoDialog } from "@/components/cirugias/dialogs/PresupuestoDialog"
import { ReportsAndDocumentsDialog } from "@/components/cirugias/ReportsAndDocumentsDialog"

export default function CirugiasPage() {
  const store = useOrtoTrackStore()

  // ── Hooks ──
  const filters = useCirugiasFilters()
  const selection = useCirugiaSelection()
  const columns = useColumnVisibility()
  const actions = useCirugiaActions()
  const sorting = useCirugiasSorting()
  const [reportsDialogOpen, setReportsDialogOpen] = useState(false)

  // ── KPIs (kept for potential future use) ──
  const _kpis = useMemo(() => computeKpis(store.surgeries, store.getDocStatus), [store.surgeries, store])

  // ── Filtered + sorted data ──
  const filtered = useMemo(() => {
    const filteredData = filters.filterData(store.surgeries.slice())
    return sorting.sortData(filteredData)
  }, [store.surgeries, filters.filterData, sorting.sortData])

  // ── Facturacion helper ──
  const facturacionStatusFor = useMemo(() => (s: typeof store.surgeries[0]) =>
    getFacturacionStatus(s, store.getDocStatus, store.getResumenCobranzaBySurgeryId(s.id)),
    [store.getDocStatus, store])

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
    <div className="flex flex-col h-[calc(100vh-4.25rem)] lg:h-[calc(100vh-4.75rem)]">
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

            {/* ── Toolbar (search + filters + columns + count + new) ── */}
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
              clearFilters={filters.clearFilters}
              colVisOpen={columns.colVisOpen} setColVisOpen={columns.setColVisOpen}
              columns={CIRUGIAS_COLUMNS}
              visibleCols={columns.visibleCols} toggleColumn={columns.toggleColumn}
              stickyColumns={columns.stickyColumns}
              onToggleStickyColumns={columns.toggleStickyColumns}
              columnOrder={columns.columnOrder}
              onReorderColumns={columns.reorderColumns}
              onResetToDefault={columns.resetToDefault}
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

            {/* ── Active Filter Chips (CHATZAI-025: includes search chips) ── */}
            <div className="shrink-0 px-2">
              <ActiveFilterChips
                chips={filters.activeFilterChips}
                searchChips={filters.searchChips}
                onRemoveSearchChip={(chipId: string) =>
                  filters.setSearchChips(filters.searchChips.filter((c: SearchChip) => c.id !== chipId))
                }
                hasExtendedSearch={filters.hasExtendedSearch}
                onClearExtendedSearch={filters.clearExtendedSearch}
                onClearAll={filters.clearFilters}
              />
            </div>

            {/* ── Table — full width, no preview panel ── */}
            <div className="flex-1 min-h-0">
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
                columnOrder={columns.columnOrder}
              />
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOGS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <NewSurgeryDialog
        open={actions.newDialogOpen} onOpenChange={actions.setNewDialogOpen}
        wizardStep={actions.wizardStep} setWizardStep={actions.setWizardStep}
        newForm={actions.newForm} setNewForm={actions.setNewForm}
        createPRNow={actions.createPRNow} setCreatePRNow={actions.setCreatePRNow}
        prForm={actions.prForm}
        onConfirm={actions.handleNewSurgery}
        createdSurgeryId={actions.createdSurgeryId}
        instrumentadores={actions.instrumentadores}
      />
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
      <FacturarDialogNuevo
        surgeryId={actions.dialogSurgery?.id || selection.selectedSurgery?.id}
        open={actions.facturarDialogOpen}
        onOpenChange={actions.setFacturarDialogOpen}
        onFacturar={actions.handleFacturarConDatos}
      />
      <PresupuestoDialog
        open={actions.presupuestoDialogOpen} onOpenChange={actions.setPresupuestoDialogOpen}
        surgery={actions.dialogSurgery}
        onCreated={(prId) => {
          actions.setPresupuestoDialogOpen(false)
        }}
      />
      <ReportsAndDocumentsDialog
        open={reportsDialogOpen}
        onOpenChange={setReportsDialogOpen}
        hasSelectedSurgery={!!selection.selectedSurgery}
        selectedSurgeryLabel={selection.selectedSurgery ? `${selection.selectedSurgery.id} — ${selection.selectedSurgery.patient}` : undefined}
      />
    </>
  )
}
