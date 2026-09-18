"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Eye, Receipt, Truck, Activity, BookOpen, Search, Maximize2, MoreHorizontal, StickyNote } from "lucide-react"
import { canAutorizarFV, canRemitirNR, canCargarConsumo } from "@/lib/businessRules"
import type { Surgery, ConsumoState } from "@/types"

interface ExpedientePreviewActionsProps {
  surgery: Surgery; docStatus: string; consumoState?: ConsumoState; hasPresupuesto: boolean
  onExpand: () => void; onSetExpTab: (tab: string) => void; onOpenPresupuestoDialog: () => void
  onSetFacturarDialogOpen: (open: boolean) => void; onSetDialogSurgery: (s: Surgery) => void; onSetNoteDialogOpen: (open: boolean) => void
}

export function ExpedientePreviewActions({ surgery: s, docStatus, consumoState, hasPresupuesto, onExpand, onSetExpTab, onOpenPresupuestoDialog, onSetFacturarDialogOpen, onSetDialogSurgery, onSetNoteDialogOpen }: ExpedientePreviewActionsProps) {
  const canAuthFV = canAutorizarFV(s, docStatus, consumoState)
  const canRemit = canRemitirNR(s)
  const canLoadConsumo = canCargarConsumo(s)
  return (
    <>
      <div className="shrink-0 px-4 py-2.5 border-b">
        <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5">Acciones rápidas</p>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={onExpand}><Eye className="size-3" /> Ver expediente</Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => { if (hasPresupuesto) { onExpand(); onSetExpTab("presupuesto") } else { onOpenPresupuestoDialog() } }}><Receipt className="size-3" /> {hasPresupuesto ? "Ver PR" : "Generar PR"}</Button>
          {canRemit.allowed && <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => {}}><Truck className="size-3" /> Remitir NR</Button>}
          {canLoadConsumo.allowed && <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => { onExpand(); onSetExpTab("consumo") }}><Activity className="size-3" /> Cargar consumo</Button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]"><MoreHorizontal className="size-3" /> Más...</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canAuthFV.allowed && <DropdownMenuItem onClick={() => { onSetDialogSurgery(s); onSetFacturarDialogOpen(true) }}><Receipt className="size-4" /> Autorizar FV</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => { onSetDialogSurgery(s); onSetNoteDialogOpen(true) }}><StickyNote className="size-4" /> Agregar nota</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onExpand(); onSetExpTab("documentacion") }}><BookOpen className="size-4" /> Ver documentación</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onExpand(); onSetExpTab("trazabilidad") }}><Search className="size-4" /> Ver trazabilidad</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="shrink-0 px-4 py-3 mt-auto">
        <Button className="w-full gap-2 h-9" onClick={onExpand}><Maximize2 className="size-4" /> Expandir expediente</Button>
      </div>
    </>
  )
}
