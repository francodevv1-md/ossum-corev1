"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Minimize2, Maximize2, X } from "lucide-react"
import { formatDate } from "@/lib/formatters"
import type { Surgery } from "@/types"

interface ExpedientePreviewHeaderProps {
  surgery: Surgery
  onMinimize: () => void
  onExpand: () => void
  onClose: () => void
}

export function ExpedientePreviewHeader({ surgery: s, onMinimize, onExpand, onClose }: ExpedientePreviewHeaderProps) {
  return (
    <div className="shrink-0 border-b px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[9px] font-bold text-muted-foreground tracking-[0.12em] uppercase">EXPEDIENTE</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-sm font-semibold text-blue-700">{s.id}</span>
            {s.expedienteNumber && <span className="text-xs text-muted-foreground">• Exp. {s.expedienteNumber}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onMinimize}><Minimize2 className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Colapsar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onExpand}><Maximize2 className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Expandir expediente</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}><X className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Cerrar</TooltipContent></Tooltip>
        </div>
      </div>
      <div className="mt-1.5 space-y-0.5">
        <p className="text-xs font-medium truncate">{s.patient}{s.patientDni ? ` — DNI ${s.patientDni}` : ""}</p>
        <p className="text-[10px] text-muted-foreground truncate">Dr. {s.surgeon} • {s.institution}</p>
        <p className="text-[10px] text-muted-foreground">{formatDate(s.date)} {s.time || ""}</p>
      </div>
    </div>
  )
}
