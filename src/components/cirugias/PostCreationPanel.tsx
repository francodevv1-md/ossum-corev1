"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, Mail, MessageCircle, ExternalLink, CheckCircle2, FileText, Clock } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * CHATZAI-025 — Post-creation actions panel (BLOQUE 3).
 *
 * Two modes:
 * 1. With presupuesto: Imprimir PR (próximamente), Enviar por correo (próximamente),
 *    WhatsApp (próximamente), Ir al expediente (funcional)
 * 2. Without presupuesto: Ir al expediente (funcional), Crear presupuesto luego (funcional)
 *
 * Actions without complete real implementation show as dimmed with a
 * "Próximamente" badge and descriptive tooltip. Only "Ir al expediente"
 * and "Crear presupuesto luego" are fully functional.
 */

interface PostCreationPanelProps {
  hasPresupuesto: boolean
  surgeryId: string
  patientName: string
  classification: string
  onGoToExpediente?: () => void
  onCreatePresupuestoLater?: () => void
}

/** Scaffolded action button — dimmed with "Próximamente" badge and tooltip */
function ProximamenteButton({
  icon: Icon,
  label,
  tooltipText,
  testId,
}: {
  icon: React.ElementType
  label: string
  tooltipText: string
  testId: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" data-testid={testId}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 opacity-50 cursor-not-allowed border-dashed"
            disabled
            tabIndex={-1}
          >
            <Icon className="size-3.5" />
            {label}
            <Badge
              variant="secondary"
              className="ml-1 px-1 py-0 text-[9px] leading-none font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0"
            >
              <Clock className="size-2.5 mr-0.5" />
              Próximamente
            </Badge>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        <p className="text-xs font-medium">{tooltipText}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Esta acción estará disponible cuando se complete la integración.
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

export function PostCreationPanel({
  hasPresupuesto,
  surgeryId,
  patientName,
  classification,
  onGoToExpediente,
  onCreatePresupuestoLater,
}: PostCreationPanelProps) {
  return (
    <div className="space-y-5">
      {/* ─── Success indicator ─── */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {hasPresupuesto
              ? "Cirugía y presupuesto creados exitosamente"
              : "Cirugía creada exitosamente"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: {surgeryId} — {patientName} — {classification}
          </p>
        </div>
      </div>

      {/* ─── Actions panel ─── */}
      {hasPresupuesto ? (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Acciones disponibles
          </p>
          <div className="flex flex-wrap gap-2">
            <TooltipProvider delayDuration={200}>
              {/* Imprimir PR — próximamente (PDF generation pending) */}
              <ProximamenteButton
                icon={Printer}
                label="Imprimir PR"
                tooltipText="La generación e impresión del PDF del presupuesto estará disponible próximamente."
                testId="action-print"
              />

              {/* Enviar por correo — próximamente (email integration pending) */}
              <ProximamenteButton
                icon={Mail}
                label="Enviar por correo"
                tooltipText="El envío automático del presupuesto por correo electrónico estará disponible próximamente."
                testId="action-email"
              />

              {/* WhatsApp — próximamente (integration pending) */}
              <ProximamenteButton
                icon={MessageCircle}
                label="WhatsApp"
                tooltipText="El envío del presupuesto por WhatsApp estará disponible próximamente."
                testId="action-whatsapp"
              />

              {/* Ir al expediente — fully functional */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={onGoToExpediente}
                    data-testid="action-expediente"
                  >
                    <ExternalLink className="size-3.5" /> Ir al expediente
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Abre el expediente de la cirugía creada</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-[10px] text-muted-foreground">
            La generación PDF, envío por correo y WhatsApp estarán disponibles cuando se complete la integración. Desde el expediente podrá gestionar toda la información de la cirugía.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Acciones disponibles
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Ir al expediente — fully functional */}
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={onGoToExpediente}
              data-testid="action-expediente"
            >
              <ExternalLink className="size-3.5" /> Ir al expediente
            </Button>

            {/* Crear presupuesto luego — fully functional */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={onCreatePresupuestoLater}
              data-testid="action-create-pr-later"
            >
              <FileText className="size-3.5" /> Crear presupuesto luego
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Podrá crear el presupuesto más tarde desde el expediente de la cirugía.
          </p>
        </div>
      )}
    </div>
  )
}
