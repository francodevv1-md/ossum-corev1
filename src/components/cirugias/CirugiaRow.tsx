"use client"
import React from "react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { CirugiaStatusCell } from "./CirugiaStatusCell"
import { CirugiaPreparationCell } from "./CirugiaPreparationCell"
import { CirugiaOperationalBadges } from "./CirugiaOperationalBadges"
import { CirugiaActionsCell } from "./CirugiaActionsCell"
import type { Surgery, SurgeryState } from "@/types"

// ── Sticky column keys (same order as in CirugiasTable) ──
const STICKY_LEFT_KEYS = ["id", "prNumber", "expedienteNumber", "state"]

interface StickyOffsets {
  left: Record<string, number>
  lastLeftKey: string | null
}

interface CirugiaRowProps {
  surgery: Surgery
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
  stickyOffsets: StickyOffsets
  columnOrder: string[]
}

/**
 * Returns the CSS classes for a sticky cell based on position and selection state.
 * - Normal rows: bg-background with group-hover:bg-muted/30
 * - Selected rows: bg-primary/5 with group-hover:bg-primary/8
 */
function stickyCellClasses(
  isSticky: boolean,
  isSelected: boolean,
  isLastLeft: boolean,
  isRight: boolean,
): string {
  if (!isSticky) return ""
  return cn(
    "sticky z-10",
    // Background: must be solid to cover scrolled content
    isSelected ? "bg-primary/5" : "bg-background",
    // Hover effect (requires group on <tr>)
    isSelected ? "group-hover:bg-primary/8" : "group-hover:bg-muted/30",
    // Shadow on last left-sticky column
    isLastLeft && "shadow-[2px_0_4px_rgba(0,0,0,0.06)]",
    // Shadow on right-sticky column
    isRight && "shadow-[-2px_0_4px_rgba(0,0,0,0.06)]",
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
    isLastLeft && "shadow-[2px_0_4px_rgba(0,0,0,0.06)]",
  )
}

export function CirugiaRow({
  surgery, isSelected, visibleCols, docStatus, consumoState,
  facturacionStatus, prId, onSelect, onOpenExpediente,
  onOpenPresupuestoDialog, onSetExpTab, onSetDialogSurgery,
  onSetNewState, onSetChangeStateDialogOpen, onSetChangeDateDialogOpen,
  onSetSuspendDialogOpen, onSetCancelDialogOpen, onSetNoteDialogOpen,
  onSetFacturarDialogOpen, onRecover, canFacturar,
  stickyColumns, stickyOffsets, columnOrder,
}: CirugiaRowProps) {
  const s = surgery

  // ── Helpers for sticky columns ──
  const isLeftSticky = (key: string) => stickyColumns && STICKY_LEFT_KEYS.includes(key)
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
              "px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-wide",
              isSelected ? "text-blue-700" : "text-primary",
              stickyCellClasses(isLeftSticky("id"), isSelected, isLastLeftSticky("id"), false),
            )}
            style={isLeftSticky("id") ? { left: stickyOffsets.left["id"] } : undefined}
          >
            {s.id}
          </td>
        )

      case "prNumber":
        return (
          <td
            key="prNumber"
            className={cn(
              "px-2.5 py-1.5 text-[11px] text-muted-foreground",
              stickyCellClasses(isLeftSticky("prNumber"), isSelected, isLastLeftSticky("prNumber"), false),
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
              "px-2.5 py-1.5 text-[11px] text-muted-foreground",
              stickyCellClasses(isLeftSticky("expedienteNumber"), isSelected, isLastLeftSticky("expedienteNumber"), false),
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
          <td key="date" className="px-2.5 py-1.5 whitespace-nowrap text-[11px]">
            {formatDate(s.date)}
          </td>
        )

      case "patient":
        return (
          <td key="patient" className="px-2.5 py-1.5">
            <Tooltip><TooltipTrigger asChild><span className="block max-w-[130px] truncate text-[11px]">{s.patient}</span></TooltipTrigger><TooltipContent>{s.patient}</TooltipContent></Tooltip>
          </td>
        )

      case "surgeon":
        return (
          <td key="surgeon" className="px-2.5 py-1.5">
            <Tooltip><TooltipTrigger asChild><span className="block max-w-[110px] truncate text-[11px]">{s.surgeon}</span></TooltipTrigger><TooltipContent>{s.surgeon}</TooltipContent></Tooltip>
          </td>
        )

      case "institution":
        return (
          <td key="institution" className="px-2.5 py-1.5">
            <Tooltip><TooltipTrigger asChild><span className="block max-w-[120px] truncate text-[11px]">{s.institution}</span></TooltipTrigger><TooltipContent>{s.institution}</TooltipContent></Tooltip>
          </td>
        )

      case "coordinadorCx":
        return (
          <td key="coordinadorCx" className="px-2.5 py-1.5">
            <span className="text-[11px] text-muted-foreground">{s.coordinadorCx || "Sin asignar"}</span>
          </td>
        )

      case "clientOs":
        return (
          <td key="clientOs" className="px-2.5 py-1.5">
            <Tooltip><TooltipTrigger asChild><span className="block max-w-[110px] truncate text-[11px]">{s.client}{s.obraSocial ? ` / ${s.obraSocial}` : ""}</span></TooltipTrigger><TooltipContent>{s.client} / {s.obraSocial || "—"}</TooltipContent></Tooltip>
          </td>
        )

      case "classification":
        return (
          <td key="classification" className="px-2.5 py-1.5 text-[11px]">{s.classification}</td>
        )

      case "urgente":
        return (
          <td key="urgente" className="px-2.5 py-1.5 text-center">
            {s.urgente && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">URGENTE</Badge>
            )}
          </td>
        )

      case "provincia":
        return (
          <td key="provincia" className="px-2.5 py-1.5 text-[11px] text-muted-foreground">{s.provincia || "—"}</td>
        )

      case "vendedor":
        return (
          <td key="vendedor" className="px-2.5 py-1.5 text-[11px] text-muted-foreground">{s.vendedor || "—"}</td>
        )

      case "instrumentador":
        return (
          <td key="instrumentador" className="px-2.5 py-1.5 text-[11px] text-muted-foreground">{s.instrumentador || "—"}</td>
        )

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
            tdClassName={stickyCellClasses(isRightSticky("actions"), isSelected, false, true)}
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
        "group border-b last:border-0 transition-colors cursor-pointer",
        isSelected
          ? "bg-primary/5 border-l-[3px] border-l-primary"
          : "hover:bg-muted/30 border-l-[3px] border-l-transparent"
      )}
      onClick={() => onSelect(s.id)}
      onDoubleClick={() => onOpenExpediente(s.id)}
    >
      {columnOrder.map(key => renderCell(key))}
    </tr>
  )
}
