"use client"
import React from "react"
import { CELL_BASE, CELL_BASE_COMPACT, type CxStatusVariant } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { CirugiaStatusCell } from "./CirugiaStatusCell"
import { CirugiaPreparationCell } from "./CirugiaPreparationCell"
import { DocStatusBadgeCell, ConsumoStatusBadgeCell, FacturadoStatusBadgeCell } from "./CirugiaOperationalBadges"
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
  cxVariant?: CxStatusVariant
}

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
    isSelected
      ? "bg-sky-50 dark:bg-sky-950/90"
      : isUrgent
      ? "bg-[#FFF9F9] dark:bg-red-950/60"
      : "bg-white dark:bg-slate-950",
    // Hover effect (requires group on <tr>)
    isSelected
      ? "group-hover:bg-sky-100/90 dark:group-hover:bg-sky-950"
      : isUrgent
      ? "group-hover:bg-[#FFF2F2] dark:group-hover:bg-red-950/80"
      : "group-hover:bg-slate-50 dark:group-hover:bg-slate-900/80",
    // Shadow on last left-sticky column
    isLastLeft && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_8px_rgba(2,6,23,0.65)]",
    // Shadow on right-sticky column
    isRight && "shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-3px_0_8px_rgba(2,6,23,0.65)]",
  )
}

/**
 * Sticky classes for Estado CX cell.
 * When variant is "a" or "d", cellBg provides solid background; for "b" and "c",
 * a solid neutral/urgent/selected background is provided to cover scrolled content.
 */
function stickyStateCellClasses(
  isSticky: boolean,
  isLastLeft: boolean,
  isSelected: boolean,
  isUrgent = false,
  variant: CxStatusVariant = "b",
): string {
  if (!isSticky) return ""
  const bg = variant === "a" || variant === "d" ? "" : isSelected
    ? "bg-sky-50 dark:bg-sky-950/90"
    : isUrgent
    ? "bg-[#FFF9F9] dark:bg-red-950/60"
    : "bg-white dark:bg-slate-950"

  const hoverBg = variant === "a" || variant === "d" ? "" : isSelected
    ? "group-hover:bg-sky-100/90 dark:group-hover:bg-sky-950"
    : isUrgent
    ? "group-hover:bg-[#FFF2F2] dark:group-hover:bg-red-950/80"
    : "group-hover:bg-slate-50 dark:group-hover:bg-slate-900/80"

  return cn(
    "sticky z-10",
    bg,
    hoverBg,
    isLastLeft && "shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_8px_rgba(2,6,23,0.65)]",
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
  cxVariant = "b",
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

  // ── Map column key → cell JSX (respects visibleCols for each key) ──
  const renderCell = (key: string): React.ReactNode | null => {
    // Skip invisible columns
    if (!visibleCols[key]) return null

    switch (key) {
      case "id":
        return (
          <td
            key="id"
            className={cn(
              cellBaseClassName,
              "font-mono text-[11px] font-semibold tracking-wide",
              isSelected ? "text-blue-700 dark:text-sky-300" : "text-slate-800 dark:text-slate-100",
              s.urgente && "border-l-[3.5px] border-l-[#DC2626] dark:border-l-red-500",
              stickyCellClasses(isLeftSticky("id"), isSelected, isLastLeftSticky("id"), false, s.urgente),
            )}
            style={isLeftSticky("id") ? { left: stickyOffsets.left["id"] } : undefined}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span>{displaySurgeryCode}</span>
                {s.urgente && (
                  <span className="inline-flex items-center rounded px-1 py-0.2 text-[9px] font-extrabold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                    URG
                  </span>
                )}
              </div>
              <CxAttentionMarker attentionReasons={coordinatorCase ? derivedOperations.attentionReasons : []} className="text-[9px]" />
              {coordinatorCase ? <CxOperationsDerivedSummary display={derivedOperations} className="text-[9px]" /> : null}
            </div>
          </td>
        )

      case "state":
        return (
          <CirugiaStatusCell
            key="state"
            state={s.state}
            date={s.date}
            variant={cxVariant}
            compactMode={compactMode}
            tdClassName={stickyStateCellClasses(isLeftSticky("state"), isLastLeftSticky("state"), isSelected, s.urgente, cxVariant)}
            tdStyle={isLeftSticky("state") ? { left: stickyOffsets.left["state"] } : undefined}
          />
        )

      case "patient":
        return (
          <td
            key="patient"
            className={cn(
              cellBaseClassName,
              stickyCellClasses(isLeftSticky("patient"), isSelected, isLastLeftSticky("patient"), false, s.urgente),
            )}
            style={isLeftSticky("patient") ? { left: stickyOffsets.left["patient"] } : undefined}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block max-w-[160px] truncate text-[13px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {s.patient}
                </span>
              </TooltipTrigger>
              <TooltipContent>{s.patient}</TooltipContent>
            </Tooltip>
          </td>
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
            <div className="leading-tight">
              <span className="block font-semibold text-slate-900 dark:text-slate-100" title={s.date ? formatDate(s.date) : "Sin fecha"}>
                {s.date ? formatDate(s.date) : "Sin fecha"}
              </span>
              {!visibleCols.time && s.time && (
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {s.time} hs
                </span>
              )}
            </div>
          </td>
        )

      case "time":
        return (
          <td
            key="time"
            className={cn(
              cellBaseClassName,
              "text-[11px] font-mono text-slate-600 dark:text-slate-400",
              stickyCellClasses(isLeftSticky("time"), isSelected, isLastLeftSticky("time"), false, s.urgente),
            )}
            style={isLeftSticky("time") ? { left: stickyOffsets.left["time"] } : undefined}
          >
            {s.time ? s.time : "—"}
          </td>
        )

      case "institution":
        return (
          <td
            key="institution"
            className={cn(
              cellBaseClassName,
              stickyCellClasses(isLeftSticky("institution"), isSelected, isLastLeftSticky("institution"), false, s.urgente),
            )}
            style={isLeftSticky("institution") ? { left: stickyOffsets.left["institution"] } : undefined}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block max-w-[125px] truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">{s.institution}</span>
              </TooltipTrigger>
              <TooltipContent>{s.institution}</TooltipContent>
            </Tooltip>
          </td>
        )

      case "clientOs":
        return (
          <td key="clientOs" className={cn(cellBaseClassName, "text-slate-600 dark:text-slate-400")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block max-w-[125px] truncate text-[11px] font-normal">
                  {s.client}{s.obraSocial ? ` / ${s.obraSocial}` : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent>{s.client} / {s.obraSocial || "—"}</TooltipContent>
            </Tooltip>
          </td>
        )

      case "surgeon":
        return (
          <td
            key="surgeon"
            className={cn(
              cellBaseClassName,
              stickyCellClasses(isLeftSticky("surgeon"), isSelected, isLastLeftSticky("surgeon"), false, s.urgente),
            )}
            style={isLeftSticky("surgeon") ? { left: stickyOffsets.left["surgeon"] } : undefined}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block max-w-[115px] truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">{s.surgeon}</span>
              </TooltipTrigger>
              <TooltipContent>{s.surgeon}</TooltipContent>
            </Tooltip>
          </td>
        )

      case "classification":
        return (
          <td key="classification" className={cn(cellBaseClassName, "text-[11px] text-slate-700 dark:text-slate-300")}>{s.classification}</td>
        )

      case "prNumber": {
        const prValue = s.prNumber || prId
        return (
          <td
            key="prNumber"
            className={cn(
              cellBaseClassName,
              "text-[11px] font-mono",
              prValue ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500",
              stickyCellClasses(isLeftSticky("prNumber"), isSelected, isLastLeftSticky("prNumber"), false, s.urgente),
            )}
            style={isLeftSticky("prNumber") ? { left: stickyOffsets.left["prNumber"] } : undefined}
          >
            {prValue || "Sin PR"}
          </td>
        )
      }

      case "expedienteNumber":
        return (
          <td
            key="expedienteNumber"
            className={cn(
              cellBaseClassName,
              "text-[11px] text-slate-500 dark:text-slate-400 font-mono",
              stickyCellClasses(isLeftSticky("expedienteNumber"), isSelected, isLastLeftSticky("expedienteNumber"), false, s.urgente),
            )}
            style={isLeftSticky("expedienteNumber") ? { left: stickyOffsets.left["expedienteNumber"] } : undefined}
          >
            {s.expedienteNumber || "—"}
          </td>
        )

      case "doc":
        return <DocStatusBadgeCell key="doc" docStatus={docStatus} cellClassName={cellBaseClassName} />

      case "consumo":
        return <ConsumoStatusBadgeCell key="consumo" consumoState={consumoState} cellClassName={cellBaseClassName} />

      case "facturado":
        return <FacturadoStatusBadgeCell key="facturado" facturado={s.facturado} facturacionStatus={facturacionStatus} cellClassName={cellBaseClassName} />

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

      case "coordinadorCx":
        return (
          <td key="coordinadorCx" className={cellBaseClassName}>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.coordinadorCx || "Sin asignar"}</span>
          </td>
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
        "group cursor-pointer border-b border-border/80 transition-colors last:border-0",
        isSelected
          ? "border-l-[3.5px] border-l-sky-600 bg-sky-50/80 dark:border-l-sky-400 dark:bg-sky-950/35"
          : s.urgente
          ? "border-l-[3.5px] border-l-[#DC2626] bg-[#FFF9F9] hover:bg-[#FFF2F2] dark:border-l-red-500 dark:bg-red-950/25 dark:hover:bg-red-950/40"
          : "border-l-[3.5px] border-l-transparent hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/60",
      )}
      onClick={() => onSelect(s.id)}
      onDoubleClick={() => onOpenExpediente(s.id)}
    >
      {columnOrder.map(key => renderCell(key))}
    </tr>
  )
}
