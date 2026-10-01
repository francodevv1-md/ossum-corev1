"use client"

import React from "react"
import {
  Banknote,
  Calendar,
  FileText,
  FilePlus,
  Layers,
  Pencil,
  Receipt,
  Truck,
  XCircle,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Surgery } from "@/types"
import { cn } from "@/lib/utils"

interface MobileCirugiaActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgery: Surgery | null
  onOpenExpediente: (s: Surgery) => void
  onChangeState?: (s: Surgery) => void
  onChangeDate?: (s: Surgery) => void
  onAddNoteToSeguimiento: (s: Surgery) => void
  onCreatePresupuesto?: (s: Surgery) => void
  onViewPresupuesto?: (s: Surgery) => void
  onRemitir?: (s: Surgery) => void
  onConsumo?: (s: Surgery) => void
  onFacturar?: (s: Surgery) => void
  hasPresupuesto: boolean
}

interface ActionDef {
  id: string
  label: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
  onSelect: (s: Surgery) => void
  destructive?: boolean
  hide?: boolean
}

export function MobileCirugiaActionSheet({
  open,
  onOpenChange,
  surgery,
  onOpenExpediente,
  onChangeState,
  onChangeDate,
  onAddNoteToSeguimiento,
  onCreatePresupuesto,
  onViewPresupuesto,
  onRemitir,
  onConsumo,
  onFacturar,
  hasPresupuesto,
}: MobileCirugiaActionSheetProps) {
  if (!surgery) return null

  const identifier =
    surgery.visibleNumber || surgery.expedienteNumber || surgery.id.slice(0, 8).toUpperCase()

  const actions: ActionDef[] = [
    {
      id: "open",
      label: "Abrir expediente",
      description: "Ver la ficha completa y todas las pestañas",
      Icon: FileText,
      onSelect: onOpenExpediente,
    },
    {
      id: "note",
      label: "Agregar nota al seguimiento",
      description: "Abre el composer de Novedades",
      Icon: Pencil,
      onSelect: onAddNoteToSeguimiento,
    },
    hasPresupuesto
      ? {
          id: "view-pr",
          label: "Ver presupuesto",
          description: "Abre la pestaña de comprobantes",
          Icon: Receipt,
          onSelect: onViewPresupuesto ?? (() => undefined),
        }
      : onCreatePresupuesto
        ? {
            id: "create-pr",
            label: "Generar presupuesto",
            description: "Crear PR para esta cirugía",
            Icon: FilePlus,
            onSelect: onCreatePresupuesto,
          }
        : { id: "noop-pr", label: "", description: "", Icon: () => null, onSelect: () => undefined, hide: true },
    {
      id: "state",
      label: "Cambiar estado",
      description: "Pasar a otro estado CX",
      Icon: Layers,
      onSelect: onChangeState ?? (() => undefined),
      hide: !onChangeState,
    },
    {
      id: "date",
      label: "Cambiar fecha",
      description: "Reprogramar fecha y hora",
      Icon: Calendar,
      onSelect: onChangeDate ?? (() => undefined),
      hide: !onChangeDate,
    },
    {
      id: "remito",
      label: "Remitir (NR)",
      description: "Generar nota de remisión",
      Icon: Truck,
      onSelect: onRemitir ?? (() => undefined),
      hide: !onRemitir,
    },
    {
      id: "consumo",
      label: "Cargar consumo",
      description: "Registrar consumo/devolución",
      Icon: Layers,
      onSelect: onConsumo ?? (() => undefined),
      hide: !onConsumo,
    },
    {
      id: "facturar",
      label: "Facturar",
      description: "Emitir comprobante",
      Icon: Banknote,
      onSelect: onFacturar ?? (() => undefined),
      hide: !onFacturar,
    },
  ]

  const handleSelect = (action: ActionDef) => {
    action.onSelect(surgery)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <SheetHeader className="px-5 pt-3">
          <SheetTitle className="text-base font-semibold tracking-tight">
            Acciones
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {identifier} · {surgery.patient || "Sin paciente"}
          </SheetDescription>
        </SheetHeader>
        <ul className="max-h-[70vh] overflow-y-auto px-3 pb-3 pt-2" role="list">
          {actions
            .filter((a) => !a.hide && a.label)
            .map((action) => {
              const Icon = action.Icon
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(action)}
                    className={cn(
                      "flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 py-3 text-left",
                      "transition-[background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99] active:bg-slate-100",
                      "hover:bg-slate-50 dark:active:bg-slate-800 dark:hover:bg-slate-900",
                      action.destructive &&
                        "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        action.destructive
                          ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {action.label}
                      </span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {action.description}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          <li>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-1 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.99] active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:active:bg-slate-800"
            >
              <XCircle className="h-4 w-4" aria-hidden />
              Cancelar
            </button>
          </li>
        </ul>
      </SheetContent>
    </Sheet>
  )
}