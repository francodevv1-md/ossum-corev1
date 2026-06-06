"use client"
import React from "react"
import { cn } from "@/lib/utils"
import { CX_STATE_COLORS, PREP_STATE_COLORS, DOC_STATUS_COLORS, FACTURACION_COLORS } from "@/lib/cirugias.constants"
import { getFacturacionBadgeLabel } from "@/lib/cirugias.utils"

function ColoredBadge({ status, colorMap, className }: { status: string; colorMap: Record<string, string>; className?: string }) {
  const colorClass = colorMap[status] || "bg-gray-400 text-white"
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none", colorClass, className)}>{status}</span>
}

interface ExpedientePreviewStatusChipsProps {
  state: string; preparationState: string; docStatus: string
  facturacionStatus: string; facturado: boolean
  presupuestoId?: string; remitoId?: string; fvNumber?: string
}

export function ExpedientePreviewStatusChips({ state, preparationState, docStatus, facturacionStatus, facturado, presupuestoId, remitoId, fvNumber }: ExpedientePreviewStatusChipsProps) {
  return (
    <div className="shrink-0 px-4 py-2.5 border-b">
      <div className="flex flex-wrap gap-1">
        <ColoredBadge status={state} colorMap={CX_STATE_COLORS} className="text-[9px] px-1.5" />
        <ColoredBadge status={preparationState} colorMap={PREP_STATE_COLORS} className="text-[9px] px-1.5" />
        <ColoredBadge status={docStatus} colorMap={DOC_STATUS_COLORS} className="text-[9px] px-1.5" />
        <ColoredBadge status={facturado ? "Facturada" : getFacturacionBadgeLabel(facturacionStatus)} colorMap={FACTURACION_COLORS} className="text-[9px] px-1.5" />
        {presupuestoId && <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-slate-600 text-white">PR {presupuestoId}</span>}
        {remitoId && <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-slate-600 text-white">NR {remitoId}</span>}
        {fvNumber && <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-slate-600 text-white">FV {fvNumber}</span>}
      </div>
    </div>
  )
}
