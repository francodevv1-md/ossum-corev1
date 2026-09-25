import React from "react"
import { CalendarDays, MoreHorizontal, User, ShieldAlert, FileText, CheckCircle2, HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import {
  getSlaBadgeClass,
  getSlaDisplayLabel,
  getSlaDotClass,
  getCoordinatorLabel,
  hasScheduledDate,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import type { CxOperationsDerivedDisplay } from "@/lib/cx-operations-derived"
import { CoordinatorSupervisionActions } from "@/components/coordinadores/CoordinatorSupervisionActions"

export type CoordinatorCaseViewModel = {
  entry: CoordinatorCase
  caseReference: string
  incidentReasons: string[]
  operationsDisplay: Pick<CxOperationsDerivedDisplay, "nextActionLabel" | "responsibleAreaLabel">
}

type Props = {
  view: CoordinatorCaseViewModel
  variant: "autorizado" | "standard"
  onOpenSeguimiento: (entry: CoordinatorCase) => void
  onOpenGestion: (entry: CoordinatorCase) => void
  onOpenLogistica: (surgeryId: string) => void
  onOpenExpediente: (surgeryId: string) => void
}

function CaseOperationsSummary({ display }: { display: CoordinatorCaseViewModel["operationsDisplay"] }) {
  return (
    <dl className="grid gap-1 text-[11px] leading-relaxed">
          <div className="flex flex-wrap gap-x-1.5 items-baseline">
        <dt className="font-semibold text-[var(--op-text-secondary)]">Resolver:</dt>
        <dd className="text-[var(--op-text-primary)] font-medium">{display.nextActionLabel}</dd>
      </div>
      <div className="flex flex-wrap gap-x-1.5 items-baseline border-t border-[var(--op-border-subtle)] mt-1 pt-1">
        <dt className="font-semibold text-[var(--op-text-secondary)]">Quién actúa:</dt>
        <dd className="text-[var(--op-text-primary)]">
          Intervención sugerida · <span className="font-medium text-[var(--op-primary-highlight)]">{display.responsibleAreaLabel}</span>
        </dd>
      </div>
    </dl>
  )
}

export function CoordinatorCaseCard({ view, variant, onOpenSeguimiento, onOpenGestion, onOpenLogistica, onOpenExpediente }: Props) {
  const { entry, caseReference, incidentReasons, operationsDisplay } = view
  const surgery = entry.surgery
  const hasIncidents = incidentReasons.length > 0

  const incidentBanner = hasIncidents ? (
    <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-[var(--op-danger-bg)] border border-[var(--op-danger-border)] px-3 py-2 text-xs text-[var(--op-danger)] xl:col-span-4">
      <ShieldAlert className="size-4 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <strong className="font-semibold">Atención requerida:</strong>{" "}
        <span className="opacity-90">{incidentReasons.join(" · ")}</span>
      </div>
    </div>
  ) : null

  const cardBody = (
    <div className="grid gap-3 xl:grid-cols-[1.3fr,1.3fr,1fr,auto] xl:items-center">
      {/* 1. Patient & Professionals */}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold tracking-tight text-[var(--op-text-primary)] truncate">
            {surgery.patient}
          </p>
          <span className="text-[11px] font-mono bg-[var(--op-secondary)] border border-[var(--op-border-default)] px-1.5 py-0.5 rounded text-[var(--op-text-muted)]">
            {caseReference}
          </span>
          {surgery.urgente && (
            <span className="inline-flex items-center gap-1 rounded bg-[var(--op-danger-bg)] border border-[var(--op-danger-border)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--op-danger)] animate-pulse">
              Urgente
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--op-text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <User className="size-3 text-[var(--op-text-muted)]" />
            Dr. {surgery.surgeon || "Sin definir"}
          </span>
          <span className="text-[var(--op-text-disabled)]">•</span>
          <span className="truncate">{surgery.institution || "Sin definir"}</span>
        </div>
        <div className="text-[11px] text-[var(--op-text-muted)] flex items-center gap-1">
          <span className="font-medium">Coordina:</span>
          <span>{getCoordinatorLabel(surgery)}</span>
        </div>
      </div>

      {/* 2. Operations flow status / Next action */}
      <div
        className={cn(
          "rounded-xl border px-3 py-2.5 text-xs shadow-2xs transition-colors",
          hasIncidents 
            ? "border-[var(--op-danger-border)] bg-[var(--op-danger-bg)] text-[var(--op-danger)]" 
            : "border-[var(--op-border-default)] bg-[var(--op-secondary)]"
        )}
      >
        <CaseOperationsSummary display={operationsDisplay} />
      </div>

      {/* 3. Date & Availability Badges */}
      <div className="flex flex-col gap-1.5 text-xs text-[var(--op-text-secondary)]">
        <div className="inline-flex items-center gap-1.5 font-medium text-[var(--op-text-primary)]">
          <CalendarDays className="size-3.5 text-[var(--op-primary-highlight)]" />
          <span>{hasScheduledDate(surgery) ? formatDate(surgery.date) : "Sin fecha CX"}</span>
          {surgery.time && <span className="tabular-nums font-semibold">· {surgery.time}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] bg-[var(--op-surface)] border border-[var(--op-border-default)] rounded px-1.5 py-0.5">
            Estado CX: <strong className="text-[var(--op-text-primary)]">{surgery.state}</strong>
          </span>
          <span className="text-[10px] bg-[var(--op-surface)] border border-[var(--op-border-default)] rounded px-1.5 py-0.5">
            Prep: <strong className="text-[var(--op-text-primary)]">{surgery.preparationState || "Sin preparar"}</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold border",
              entry.materialAvailabilityDefined
                ? "bg-[var(--op-success-bg)] border-[var(--op-success-border)] text-[var(--op-success)]"
                : "bg-[var(--op-warning-bg)] border-[var(--op-warning-border)] text-[var(--op-warning)]"
            )}
          >
            {entry.materialAvailabilityDefined ? <CheckCircle2 className="size-3" /> : <HelpCircle className="size-3" />}
            {entry.materialAvailabilityLabel}
          </span>
          <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold", getSlaBadgeClass(entry.sla.tone))}>
            <span className={cn("size-1.5 rounded-full", getSlaDotClass(entry.sla.tone))} />
            {getSlaDisplayLabel(entry.sla.tone)}
          </span>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap sm:items-center xl:justify-end">
        <Button 
          size="sm" 
          className="min-h-11 text-xs bg-[var(--op-primary)] hover:bg-[var(--op-primary-hover)] text-[var(--op-text-inverse)] font-medium shadow-xs" 
          onClick={() => onOpenSeguimiento(entry)}
        >
          <FileText className="size-3.5 mr-1" />
          Seguimiento
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="min-h-11 text-xs border-[var(--op-border-default)] hover:bg-[var(--op-hover)] text-[var(--op-text-primary)]" 
          onClick={() => onOpenGestion(entry)}
        >
          Gestionar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="sm" 
              variant="ghost" 
              className="col-span-2 min-h-11 text-xs border border-transparent hover:bg-[var(--op-hover)] text-[var(--op-text-secondary)]" 
              aria-label={`Más acciones para ${surgery.patient}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[var(--op-surface)] border border-[var(--op-border-default)] text-xs text-[var(--op-text-primary)] shadow-md">
            <DropdownMenuItem 
              className="focus:bg-[var(--op-hover)] focus:text-[var(--op-text-primary)] py-2 cursor-pointer"
              onSelect={() => onOpenLogistica(surgery.id)}
            >
              Logística
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="focus:bg-[var(--op-hover)] focus:text-[var(--op-text-primary)] py-2 cursor-pointer"
              onSelect={() => onOpenExpediente(surgery.id)}
            >
              Expediente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CoordinatorSupervisionActions surgery={surgery} coordinatorName={getCoordinatorLabel(surgery)} />
      </div>

      {incidentBanner}
    </div>
  )

  if (variant === "autorizado") {
    return (
      <div 
        className={cn(
          "border bg-[var(--op-surface)] px-4 py-3 rounded-xl transition-all duration-200 shadow-2xs hover:shadow-xs", 
          hasIncidents ? "border-[var(--op-danger-border)] bg-[rgba(192,57,43,0.02)]" : "border-[var(--op-border-default)]"
        )}
      >
        {cardBody}
      </div>
    )
  }

  return (
    <Card className="rounded-xl border border-[var(--op-border-default)] bg-[var(--op-surface)] shadow-2xs hover:shadow-xs transition-all duration-200">
      <CardContent className="px-4 py-3">{cardBody}</CardContent>
    </Card>
  )
}
