"use client"
import React from "react"
import { cn } from "@/lib/utils"
import type { PendientePrincipal } from "@/lib/cirugias.types"

interface ExpedientePreviewPendingProps { pendiente: PendientePrincipal }

export function ExpedientePreviewPending({ pendiente }: ExpedientePreviewPendingProps) {
  return (
    <div className="shrink-0 px-4 py-2.5 border-b">
      <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-1">Pendiente principal</p>
      <div className={cn("rounded-md border px-3 py-2 text-xs font-medium", pendiente.color)}>{pendiente.text}</div>
    </div>
  )
}
