"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  List, BarChart3, Receipt, DollarSign, TrendingUp,
  PackageSearch, Award, FolderOpen, FileText, StickyNote,
  Truck, Clock,
} from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ReportsAndDocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasSelectedSurgery: boolean
  selectedSurgeryLabel?: string
}

// ═══════════════════════════════════════════════════════════════
// Item definitions
// ═══════════════════════════════════════════════════════════════

interface ReportItem {
  id: string
  icon: React.ElementType
  label: string
  description: string
  requiresSurgery: boolean
  implemented: boolean
  tooltipText?: string
}

const SECTION_A_ITEMS: ReportItem[] = [
  {
    id: "listado-cirugias",
    icon: List,
    label: "Listado de cirugías",
    description: "Exportá el listado completo de cirugías filtradas con todos sus datos.",
    requiresSurgery: false,
    implemented: false,
    tooltipText: "La exportación del listado de cirugías estará disponible próximamente.",
  },
  {
    id: "estadisticas-presupuestacion",
    icon: BarChart3,
    label: "Estadísticas de presupuestación",
    description: "Resumen de presupuestos emitidos, aprobados y pendientes.",
    requiresSurgery: false,
    implemented: false,
    tooltipText: "Las estadísticas de presupuestación estarán disponibles próximamente.",
  },
  {
    id: "estadisticas-facturacion",
    icon: Receipt,
    label: "Estadísticas de facturación",
    description: "Análisis de facturación por período, estado y cliente.",
    requiresSurgery: false,
    implemented: false,
    tooltipText: "Las estadísticas de facturación estarán disponibles próximamente.",
  },
  {
    id: "estadisticas-mensuales",
    icon: TrendingUp,
    label: "Estadísticas mensuales de cirugías",
    description: "Evolución mensual de cirugías realizadas por clasificación.",
    requiresSurgery: false,
    implemented: false,
    tooltipText: "Las estadísticas mensuales estarán disponibles próximamente.",
  },
  {
    id: "reporte-comisiones",
    icon: DollarSign,
    label: "Reporte de comisiones",
    description: "Comisiones por vendedor, instrumentador y período.",
    requiresSurgery: false,
    implemented: false,
    tooltipText: "El reporte de comisiones estará disponible próximamente.",
  },
  {
    id: "informe-facturar",
    icon: Receipt,
    label: "Informe de cirugías para facturar",
    description: "Cirugías pendientes de facturación con requisitos cumplidos.",
    requiresSurgery: false,
    implemented: false,
    tooltipText: "El informe de cirugías para facturar estará disponible próximamente.",
  },
]

const SECTION_B_ITEMS: ReportItem[] = [
  {
    id: "pedido-materiales",
    icon: PackageSearch,
    label: "Pedido de materiales para CX",
    description: "Generá el pedido de materiales con los ítems del presupuesto.",
    requiresSurgery: true,
    implemented: false,
    tooltipText: "La generación del pedido de materiales estará disponible próximamente.",
  },
  {
    id: "certificado-implantes",
    icon: Award,
    label: "Certificado de implantes",
    description: "Certificado oficial de implantes utilizados en la cirugía.",
    requiresSurgery: true,
    implemented: false,
    tooltipText: "El certificado de implantes estará disponible próximamente.",
  },
  {
    id: "legajo-paciente",
    icon: FolderOpen,
    label: "Legajo de paciente",
    description: "Expediente completo del paciente con documentación asociada.",
    requiresSurgery: true,
    implemented: false,
    tooltipText: "El legajo de paciente estará disponible próximamente.",
  },
  {
    id: "caratula",
    icon: FileText,
    label: "Carátula",
    description: "Carátula del expediente con datos de la cirugía y presupuesto.",
    requiresSurgery: true,
    implemented: false,
    tooltipText: "La carátula del expediente estará disponible próximamente.",
  },
  {
    id: "notas",
    icon: StickyNote,
    label: "Notas",
    description: "Imprimí las notas y observaciones de la cirugía.",
    requiresSurgery: true,
    implemented: false,
    tooltipText: "La impresión de notas estará disponible próximamente.",
  },
]

const SECTION_C_ITEMS: ReportItem[] = [
  {
    id: "rotulo-envio",
    icon: Truck,
    label: "Rótulo para envío",
    description: "Etiqueta de envío con datos de destino y logística.",
    requiresSurgery: true,
    implemented: false,
    tooltipText: "El rótulo para envío estará disponible próximamente.",
  },
]

// ═══════════════════════════════════════════════════════════════
// Proximamente item (dashed border, dimmed, disabled)
// ═══════════════════════════════════════════════════════════════

function ReportItemButton({ item, disabled, disabledReason }: {
  item: ReportItem
  disabled: boolean
  disabledReason?: string
}) {
  const Icon = item.icon
  const isProximamente = !item.implemented

  // Not implemented → always show as proximamente
  if (isProximamente) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-full">
            <button
              className="w-full flex items-start gap-3 rounded-lg border border-dashed p-3 text-left opacity-50 cursor-not-allowed transition-colors"
              disabled
              tabIndex={-1}
            >
              <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{item.label}</span>
                  <Badge
                    variant="secondary"
                    className="px-1 py-0 text-[9px] leading-none font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0"
                  >
                    <Clock className="size-2.5 mr-0.5" />
                    Próximamente
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  {item.description}
                </p>
              </div>
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px]">
          <p className="text-xs font-medium">{item.tooltipText || item.label}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Esta acción estará disponible cuando se complete la integración.
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Implemented but disabled (e.g. requires surgery selection)
  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-full">
            <button
              className="w-full flex items-start gap-3 rounded-lg border border-dashed p-3 text-left opacity-50 cursor-not-allowed transition-colors"
              disabled
              tabIndex={-1}
            >
              <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{item.label}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  {disabledReason || item.description}
                </p>
              </div>
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px]">
          <p className="text-xs font-medium">{item.label}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {disabledReason || "Seleccioná una cirugía para generar este documento."}
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Implemented and enabled
  return (
    <button
      className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => {/* TODO: implement action */}}
    >
      <Icon className="size-4 mt-0.5 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">{item.label}</span>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
          {item.description}
        </p>
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function ReportsAndDocumentsDialog({
  open,
  onOpenChange,
  hasSelectedSurgery,
  selectedSurgeryLabel,
}: ReportsAndDocumentsDialogProps) {
  const noSurgeryReason = "Seleccioná una cirugía para generar este documento."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informes y documentos</DialogTitle>
          <DialogDescription>
            Generá listados, reportes y documentos a partir de la vista actual o de una cirugía seleccionada.
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider delayDuration={200}>
          <div className="space-y-5 mt-2">
            {/* ── Section A: Based on filtered view ── */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Basados en la vista filtrada actual
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {SECTION_A_ITEMS.map((item) => (
                  <ReportItemButton
                    key={item.id}
                    item={item}
                    disabled={false}
                  />
                ))}
              </div>
            </section>

            <Separator />

            {/* ── Section B: Surgery-specific documents ── */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Documentos de cirugía seleccionada
              </h3>
              {!hasSelectedSurgery && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                  <FolderOpen className="size-3" />
                  Seleccioná una cirugía para generar estos documentos.
                </p>
              )}
              {hasSelectedSurgery && selectedSurgeryLabel && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                  <FolderOpen className="size-3" />
                  Cirugía: {selectedSurgeryLabel}
                </p>
              )}
              <div className="grid grid-cols-1 gap-2">
                {SECTION_B_ITEMS.map((item) => (
                  <ReportItemButton
                    key={item.id}
                    item={item}
                    disabled={!hasSelectedSurgery}
                    disabledReason={noSurgeryReason}
                  />
                ))}
              </div>
            </section>

            <Separator />

            {/* ── Section C: Logistics ── */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Logística / despacho
              </h3>
              {!hasSelectedSurgery && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                  <FolderOpen className="size-3" />
                  Seleccioná una cirugía para generar este documento.
                </p>
              )}
              <div className="grid grid-cols-1 gap-2">
                {SECTION_C_ITEMS.map((item) => (
                  <ReportItemButton
                    key={item.id}
                    item={item}
                    disabled={!hasSelectedSurgery}
                    disabledReason={noSurgeryReason}
                  />
                ))}
              </div>
            </section>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}
