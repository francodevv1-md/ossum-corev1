"use client"
import React from "react"
import { CELL_BASE, CELL_BASE_COMPACT } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { CirugiaStatusCell } from "./CirugiaStatusCell"
import { CirugiaPreparationCell } from "./CirugiaPreparationCell"
import { CirugiaOperationalBadges } from "./CirugiaOperationalBadges"
import { CirugiaActionsCell } from "./CirugiaActionsCell"
import { CircuitProgressCell } from "./CircuitProgressCell"
import { CxAttentionMarker } from "@/components/cx-operations/CxAttentionMarker"
import { CxOperationsDerivedSummary } from "@/components/cx-operations/CxOperationsDerivedSummary"
import { deriveCxOperationsDisplay, type CxOperationsClosureSignals } from "@/lib/cx-operations-derived"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"
import type { CircuitStage } from "@/lib/circuit-progress"
import type { Surgery, SurgeryState } from "@/types"

interface StickyOffsets {
  left: Record<string, number>
  lastLeftKey: string | null
}

interface CirugiaRowProps {
  surgery: Surgery
  shipmentDate?: string
  isSelected: boolean
  visibleCols: Record<string, boolean>
  docStatus: string
  consumoState: string | null
  facturacionStatus: string
  prId: string | undefined
  onSelect: (id: string) => void
  onOpenExpediente: (id: string) => void
  onOpenPresupuestoDialog: (surgery: Surgery) => void
  onSetExpTab: (tab: string) => void
  onSetDialogSurgery: (s: Surgery) => void
  onSetNewState: (s: SurgeryState) => void
  onSetChangeStateDialogOpen: (open: boolean) => void
  onSetChangeDateDialogOpen: (open: boolean) => void
  onSetSuspendDialogOpen: (open: boolean) => void
  onSetCancelDialogOpen: (open: boolean) => void
  onSetNoteDialogOpen: (open: boolean) => void
  onSetFacturarDialogOpen: (open: boolean) => void
  onRecover: (s: Surgery) => void
  canFacturar: (s: Surgery) => { allowed: boolean; reason?: string }
  stickyColumns: boolean
  compactMode: boolean
  stickyOffsets: StickyOffsets
  pinnedLeftKeys: string[]
  columnOrder: string[]
  circuitProgress?: CircuitStage[]
  rowIndex?: number
  coordinatorCase?: CoordinatorCase | null
  closureSignals?: CxOperationsClosureSignals
}

/**
 * Returns the CSS classes for a sticky cell based on position and selection state.
 * - Normal rows: bg-white with group-hover:bg-slate-50
 * - Selected rows: bg-sky-50 with group-hover:bg-sky-100
 */
function stickyCellClasses(
  isSticky: boolean,
  isSelected: boolean,
  isLastLeft: boolean,
  isRight: boolean,
  isUrgent = false,
): string {
  if (!isSticky) return ""
  return cn(
    "sticky z-10",
    // Background: must be solid to cover scrolled content
    isSelected ? "bg-sky-50/90 dark:bg-sky-950/65" : isUrgent ? "bg-red-50/60 dark:bg-red-950/45" : "bg-white dark:bg-slate-950",
    // Hover effect (requires group on <tr>)
    isSelected ? "group-hover:bg-sky-100/90 dark:group-hover:bg-sky-950/80" : isUrgent ? "group-hover:bg-red-50/80 dark:group-hover:bg-red-950/60" : "group-hover:bg-slate-50 dark:group-hover:bg-slate-900/80",
    // Shadow on last left-sticky column
    isLastLeft && "shadow-[2px_0_4px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_8px_rgba(2,6,23,0.55)]",
    // Shadow on right-sticky column
    isRight && "shadow-[-2px_0_4px_rgba(0,0,0,0.06)] dark:shadow-[-2px_0_8px_rgba(2,6,23,0.55)]",
  )
}

/**
 * Sticky classes for Estado CX cell — does NOT include background override
 * because the cell already has its own colored background from CX_STATE_CELL_COLORS.
 * Those backgrounds are solid and sufficient to cover scrolled content.
 */
function stickyStateCellClasses(
  isSticky: boolean,
  isLastLeft: boolean,
): string {
  if (!isSticky) return ""
  return cn(
    "sticky z-10",
    // NO background — CX_STATE_CELL_COLORS provides a solid bg
    // Shadow on last left-sticky column
    isLastLeft && "shadow-[2px_0_4px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_8px_rgba(2,6,23,0.55)]",
  )
}

export function CirugiaRow({
  surgery, shipmentDate, isSelected, visibleCols, docStatus, consumoState,
  facturacionStatus, prId, onSelect, onOpenExpediente,
  onOpenPresupuestoDialog, onSetExpTab, onSetDialogSurgery,
  onSetNewState, onSetChangeStateDialogOpen, onSetChangeDateDialogOpen,
  onSetSuspendDialogOpen, onSetCancelDialogOpen, onSetNoteDialogOpen,
  onSetFacturarDialogOpen, onRecover, canFacturar,
  stickyColumns, compactMode, stickyOffsets, pinnedLeftKeys, columnOrder, circuitProgress, coordinatorCase = null, closureSignals = { documentationIncomplete: false, consumptionAbsent: false, invoiceAbsent: false },
}: CirugiaRowProps) {
  const s = surgery
  const cellBaseClassName = compactMode ? CELL_BASE_COMPACT : CELL_BASE
  const displaySurgeryCode = s.visibleNumber?.trim() || (s.id?.trim() ? `CX ${s.id}` : "CX sin número visible")
  const derivedOperations = deriveCxOperationsDisplay(coordinatorCase, closureSignals)

  const renderSecondaryDate = (
    cellKey: string,
    value: string | undefined,
    fallback: string,
    className: string,
    title?: string,
  ) => (
      <td
        key={cellKey}
        className={cn(
          cellBaseClassName,
          "text-[11px] text-slate-700 dark:text-slate-300",
          stickyCellClasses(isLeftSticky(cellKey), isSelected, isLastLeftSticky(cellKey), false, s.urgente),
        )}
      style={isLeftSticky(cellKey) ? { left: stickyOffsets.left[cellKey] } : undefined}
    >
      <div className="min-w-[116px] leading-tight">
        <span className={cn("block font-medium", className)} title={title}>
          {value ? formatDate(value) : fallback}
        </span>
      </div>
    </td>
  )

  // ── Helpers for sticky columns ──
  const isLeftSticky = (key: string) => stickyColumns && pinnedLeftKeys.includes(key)
  const isRightSticky = (key: string) => stickyColumns && key === "actions"
  const isLastLeftSticky = (key: string) => stickyColumns && key === stickyOffsets.lastLeftKey

  // ── Composite column keys (doc/consumo/facturado share one CirugiaOperationalBadges) ──
  const COMPOSITE_KEYS = ["doc", "consumo", "facturado"] as const
  const anyCompositeVisible = visibleCols["doc"] || visibleCols["consumo"] || visibleCols["facturado"]
  // Track whether we've already rendered the composite cell to avoid triple-rendering
  let compositeRendered = false

  // ── Map column key → cell JSX (respects visibleCols for each key) ──
  const renderCell = (key: string): React.ReactNode | null => {
    // Skip invisible columns
    if (!visibleCols[key]) return null

    // ── Composite columns: render once at the first visible key's position ──
    if (COMPOSITE_KEYS.includes(key as typeof COMPOSITE_KEYS[number])) {
      if (compositeRendered) return null // already rendered, skip
      if (!anyCompositeVisible) return null // none visible, skip entirely
      compositeRendered = true
      return (
        <CirugiaOperationalBadges
          key="operationalBadges"
          docStatus={docStatus}
          consumoState={consumoState}
          facturacionStatus={facturacionStatus}
          facturado={s.facturado}
        />
      )
    }

    switch (key) {
      case "id":
        return (
          <td
              key="id"
              className={cn(
                cellBaseClassName,
                "font-mono text-[11px] font-bold tracking-wide text-slate-800 dark:text-slate-100",
                isSelected ? "text-blue-700 dark:text-sky-300" : "text-slate-800 dark:text-slate-100",
                stickyCellClasses(isLeftSticky("id"), isSelected, isLastLeftSticky("id"), false, s.urgente),
              )}
            style={isLeftSticky("id") ? { left: stickyOffsets.left["id"] } : undefined}
          >
            <div className="space-y-1">
              <span>{displaySurgeryCode}</span>
              <CxAttentionMarker attentionReasons={coordinatorCase ? derivedOperations.attentionReasons : []} className="text-[9px]" />
              {coordinatorCase ? <CxOperationsDerivedSummary display={derivedOperations} className="text-[9px]" /> : null}
            </div>
          </td>
        )

      case "prNumber":
        return (
          <td
              key="prNumber"
              className={cn(
                cellBaseClassName,
                "text-[11px] text-slate-500 dark:text-slate-400",
                stickyCellClasses(isLeftSticky("prNumber"), isSelected, isLastLeftSticky("prNumber"), false, s.urgente),
              )}
            style={isLeftSticky("prNumber") ? { left: stickyOffsets.left["prNumber"] } : undefined}
          >
            {s.prNumber || prId || "—"}
          </td>
        )

      case "expedienteNumber":
        return (
          <td
              key="expedienteNumber"
              className={cn(
                cellBaseClassName,
                "text-[11px] text-slate-500 dark:text-slate-400",
                stickyCellClasses(isLeftSticky("expedienteNumber"), isSelected, isLastLeftSticky("expedienteNumber"), false, s.urgente),
              )}
            style={isLeftSticky("expedienteNumber") ? { left: stickyOffsets.left["expedienteNumber"] } : undefined}
          >
            {s.expedienteNumber || "—"}
          </td>
        )

      case "state":
        return (
          <CirugiaStatusCell
            key="state"
            state={s.state}
            tdClassName={stickyStateCellClasses(isLeftSticky("state"), isLastLeftSticky("state"))}
            tdStyle={isLeftSticky("state") ? { left: stickyOffsets.left["state"] } : undefined}
          />
        )

      case "date":
        return (
           <td
             key="date"
             className={cn(
                cellBaseClassName,
               "text-[11px]",
               stickyCellClasses(isLeftSticky("date"), isSelected, isLastLeftSticky("date"), false, s.urgente),
             )}
             style={isLeftSticky("date") ? { left: stickyOffsets.left["date"] } : undefined}
           >
                 <div className="min-w-[132px] border-l-2 border-slate-300 pl-2 leading-tight dark:border-slate-700">
                 <span className="font-semibold text-slate-900 dark:text-slate-100" title={s.date ? formatDate(s.date) : "Sin fecha"}>
                  {s.date ? formatDate(s.date) : "Sin fecha"}
                </span>
             </div>
          </td>
        )

      case "probableDate":
        return renderSecondaryDate(
          "probableDate",
          s.probableDate,
          "—",
           s.probableDate ? "font-normal italic text-slate-500 dark:text-slate-400" : "font-normal text-slate-400 dark:text-slate-500",
          s.probableDate ? "Estimated date" : undefined,
        )

      case "fechaLogistica":
        return renderSecondaryDate(
          "fechaLogistica",
          s.fechaEnvioMaterial,
          "—",
           s.fechaEnvioMaterial ? "font-normal text-amber-700/80 dark:text-amber-300" : "font-normal text-slate-400 dark:text-slate-500",
        )

      case "fechaEnvio":
        return renderSecondaryDate(
          "fechaEnvio",
          shipmentDate,
          "—",
           shipmentDate ? "font-medium text-emerald-700 dark:text-emerald-300" : "font-medium text-slate-500 dark:text-slate-400",
        )

      case "patient":
        return (
           <td
             key="patient"
             className={cn(
                cellBaseClassName,
                "text-slate-900 dark:text-slate-100",
               stickyCellClasses(isLeftSticky("patient"), isSelected, isLastLeftSticky("patient"), false, s.urgente),
             )}
             style={isLeftSticky("patient") ? { left: stickyOffsets.left["patient"] } : undefined}
           >
             <Tooltip><TooltipTrigger asChild><span className="block max-w-[130px] truncate text-[11px] font-semibold">{s.patient}</span></TooltipTrigger><TooltipContent>{s.patient}</TooltipContent></Tooltip>
           </td>
         )

      case "surgeon":
        return (
           <td
             key="surgeon"
             className={cn(
                cellBaseClassName,
                "text-slate-800 dark:text-slate-200",
               stickyCellClasses(isLeftSticky("surgeon"), isSelected, isLastLeftSticky("surgeon"), false, s.urgente),
             )}
             style={isLeftSticky("surgeon") ? { left: stickyOffsets.left["surgeon"] } : undefined}
           >
             <Tooltip><TooltipTrigger asChild><span className="block max-w-[110px] truncate text-[11px] font-medium">{s.surgeon}</span></TooltipTrigger><TooltipContent>{s.surgeon}</TooltipContent></Tooltip>
            </td>
          )

      case "institution":
        return (
           <td
             key="institution"
             className={cn(
                cellBaseClassName,
                "text-slate-800 dark:text-slate-200",
               stickyCellClasses(isLeftSticky("institution"), isSelected, isLastLeftSticky("institution"), false, s.urgente),
             )}
             style={isLeftSticky("institution") ? { left: stickyOffsets.left["institution"] } : undefined}
           >
             <Tooltip><TooltipTrigger asChild><span className="block max-w-[120px] truncate text-[11px] font-medium">{s.institution}</span></TooltipTrigger><TooltipContent>{s.institution}</TooltipContent></Tooltip>
            </td>
          )

      case "coordinadorCx":
        return (
          <td key="coordinadorCx" className={cellBaseClassName}>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.coordinadorCx || "Sin asignar"}</span>
          </td>
        )

      case "clientOs":
        return (
          <td key="clientOs" className={cn(cellBaseClassName, "text-slate-700 dark:text-slate-300")}>
            <Tooltip><TooltipTrigger asChild><span className="block max-w-[110px] truncate text-[11px]">{s.client}{s.obraSocial ? ` / ${s.obraSocial}` : ""}</span></TooltipTrigger><TooltipContent>{s.client} / {s.obraSocial || "—"}</TooltipContent></Tooltip>
          </td>
        )

      case "classification":
        return (
          <td key="classification" className={cn(cellBaseClassName, "text-[11px] text-slate-700 dark:text-slate-300")}>{s.classification}</td>
        )

      case "urgente":
        return (
          <td key="urgente" className={cn(cellBaseClassName, "text-center")}>
            {s.urgente && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">URGENTE</Badge>
            )}
          </td>
        )

      case "provincia":
        return (
          <td key="provincia" className={cn(cellBaseClassName, "text-[11px] text-slate-500 dark:text-slate-400")}>{s.provincia || "—"}</td>
        )

      case "vendedor":
        return (
          <td key="vendedor" className={cn(cellBaseClassName, "text-[11px] text-slate-500 dark:text-slate-400")}>{s.vendedor || "—"}</td>
        )

      case "instrumentador":
        return (
          <td key="instrumentador" className={cn(cellBaseClassName, "text-[11px] text-slate-500 dark:text-slate-400")}>{s.instrumentador || "—"}</td>
        )

      case "circuitProgress":
        if (!circuitProgress) return null
        return <CircuitProgressCell key="circuitProgress" stages={circuitProgress} />

      case "preparationState":
        return <CirugiaPreparationCell key="preparationState" preparationState={s.preparationState} />

      case "actions":
        return (
          <CirugiaActionsCell
            key="actions"
            surgery={s}
            prId={prId}
            docStatus={docStatus}
            consumoState={consumoState}
            onOpenExpediente={onOpenExpediente}
            onOpenPresupuestoDialog={onOpenPresupuestoDialog}
            onSetExpTab={onSetExpTab}
            onSetDialogSurgery={onSetDialogSurgery}
            onSetNewState={onSetNewState}
            onSetChangeStateDialogOpen={onSetChangeStateDialogOpen}
            onSetChangeDateDialogOpen={onSetChangeDateDialogOpen}
            onSetSuspendDialogOpen={onSetSuspendDialogOpen}
            onSetCancelDialogOpen={onSetCancelDialogOpen}
            onSetNoteDialogOpen={onSetNoteDialogOpen}
            onSetFacturarDialogOpen={onSetFacturarDialogOpen}
            onRecover={onRecover}
            canFacturar={canFacturar}
            tdClassName={stickyCellClasses(isRightSticky("actions"), isSelected, false, true, s.urgente)}
            tdStyle={isRightSticky("actions") ? { right: 0 } : undefined}
          />
        )

      default:
        return null
    }
  }

  return (
    <tr
      className={cn(
         isSelected && "border-l-[3px] border-l-sky-600 bg-sky-50/80 dark:border-l-sky-400 dark:bg-sky-950/35",
         s.urgente && !isSelected && "border-l-[3px] border-l-red-500 bg-red-50/50 dark:border-l-red-400 dark:bg-red-950/25",
         "group cursor-pointer border-b border-border/80 border-l-[3px] border-l-transparent transition-colors hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/60 last:border-0",
       )}
      onClick={() => onSelect(s.id)}
      onDoubleClick={() => onOpenExpediente(s.id)}
    >
      {columnOrder.map(key => renderCell(key))}
    </tr>
  )
}
