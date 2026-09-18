"use client"
import React from "react"
import { cn } from "@/lib/utils"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { CX_STATE_COLORS, PREP_STATE_COLORS } from "@/lib/cirugias.constants"

function ColoredBadge({ label, status, colorMap, className }: { label: string; status: string; colorMap: Record<string, string>; className?: string }) {
  const colorClass = colorMap[status] || "bg-gray-400 text-white"
  return <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none", colorClass, className)}><span className="uppercase opacity-75">{label}</span>{status}</span>
}

interface ExpedientePreviewSummaryProps {
  surgery: { patient: string; obraSocial?: string; financiador?: string; date: string; time: string; institution: string; prNumber?: string; facturaNumber?: string; state: string; preparationState: string }
  presupuestoId?: string; remitoId?: string; fvNumber?: string; consumoState?: string; cobrosTotal?: number
}

export function ExpedientePreviewSummary({ surgery: s, presupuestoId, remitoId, fvNumber, consumoState, cobrosTotal }: ExpedientePreviewSummaryProps) {
  return (
    <div className="shrink-0 grid grid-cols-2 gap-2 px-4 py-2.5 border-b">
      <div className="rounded-md border p-2 space-y-0.5">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Paciente / Cobertura</p>
        <p className="text-[11px] font-medium truncate">{s.patient}</p>
        <p className="text-[10px] text-muted-foreground truncate">OS: {s.obraSocial || "—"}{s.financiador ? ` • ${s.financiador}` : ""}</p>
      </div>
      <div className="rounded-md border p-2 space-y-0.5">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Programación</p>
        <p className="text-[11px] font-medium">{formatDate(s.date)}{s.time ? ` ${s.time}` : ""}</p>
        <p className="text-[10px] text-muted-foreground truncate">{s.institution}</p>
      </div>
      <div className="rounded-md border p-2 space-y-0.5">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Comprobantes</p>
        <p className="text-[10px]">PR: <span className="font-medium">{s.prNumber || presupuestoId || "—"}</span></p>
        <p className="text-[10px]">NR: <span className="font-medium">{remitoId || "—"}</span></p>
        <p className="text-[10px]">FV: <span className="font-medium">{s.facturaNumber || fvNumber || "—"}</span></p>
      </div>
      <div className="rounded-md border p-2 space-y-0.5">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Estados</p>
        <div className="flex flex-wrap gap-0.5">
          <ColoredBadge label="Estado CX" status={s.state} colorMap={CX_STATE_COLORS} className="text-[8px] px-1" />
          <ColoredBadge label="Preparación" status={s.preparationState} colorMap={PREP_STATE_COLORS} className="text-[8px] px-1" />
        </div>
        {consumoState && <p className="text-[10px] mt-0.5">Consumo: <span className="font-medium">{consumoState}</span></p>}
        {cobrosTotal !== undefined && cobrosTotal > 0 && <p className="text-[10px] mt-0.5">Cobro: <span className="font-medium text-emerald-600">{formatCurrency(cobrosTotal)}</span></p>}
      </div>
    </div>
  )
}
