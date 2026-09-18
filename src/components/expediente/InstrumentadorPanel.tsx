"use client"

import React, { useState } from "react"
import type { Surgery, InstrumentadorSurgery, InstrumentadorState } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import {
  Stethoscope,
  User,
  DollarSign,
  CheckCircle2,
  XCircle,
  FileCheck,
  FileX2,
  ShieldCheck,
  CreditCard,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertCircle,
  Calendar,
  Building2,
  BadgeCheck,
  Banknote,
  Send,
  FileText,
  Info,
} from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface InstrumentadorPanelProps {
  surgery: Surgery
  instrumentadorSurgery?: InstrumentadorSurgery
}

// ═══════════════════════════════════════════════════════════════
// STATE BADGE COLORS
// ═══════════════════════════════════════════════════════════════

const INST_STATE_BADGE: Record<InstrumentadorState, string> = {
  "Pendiente": "bg-amber-100 text-amber-800 border-amber-300",
  "Realizada": "bg-blue-100 text-blue-800 border-blue-300",
  "Finalizada": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "Doc. incompleta": "bg-red-100 text-red-800 border-red-300",
  "Doc. completa": "bg-sky-100 text-sky-800 border-sky-300",
  "Autorización OK": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "Pagada": "bg-green-100 text-green-800 border-green-300",
  "Facturada": "bg-green-200 text-green-900 border-green-400",
}

const INST_STATE_DOT: Record<InstrumentadorState, string> = {
  "Pendiente": "bg-amber-500",
  "Realizada": "bg-blue-500",
  "Finalizada": "bg-emerald-500",
  "Doc. incompleta": "bg-red-500",
  "Doc. completa": "bg-sky-500",
  "Autorización OK": "bg-emerald-500",
  "Pagada": "bg-green-500",
  "Facturada": "bg-green-700",
}

const INST_STATE_ICON: Record<InstrumentadorState, React.ElementType> = {
  "Pendiente": Clock,
  "Realizada": CheckCircle2,
  "Finalizada": BadgeCheck,
  "Doc. incompleta": FileX2,
  "Doc. completa": FileCheck,
  "Autorización OK": ShieldCheck,
  "Pagada": CreditCard,
  "Facturada": Banknote,
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getStateBadge(state: InstrumentadorState) {
  const config = INST_STATE_BADGE[state]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-none",
        config
      )}
    >
      <span className={cn("size-1.5 rounded-full", INST_STATE_DOT[state])} />
      {state}
    </span>
  )
}

/** Returns the next possible states given the current instrumentador state */
function getNextActions(state: InstrumentadorState, pagada: boolean): {
  label: string
  icon: React.ElementType
  variant: "default" | "outline" | "secondary" | "destructive"
  action: string
}[] {
  const actions: {
    label: string
    icon: React.ElementType
    variant: "default" | "outline" | "secondary" | "destructive"
    action: string
  }[] = []

  switch (state) {
    case "Pendiente":
      actions.push({ label: "Marcar Realizada", icon: CheckCircle2, variant: "outline", action: "realizada" })
      break
    case "Realizada":
      actions.push({ label: "Completar Documentación", icon: FileCheck, variant: "outline", action: "doc-completa" })
      break
    case "Doc. incompleta":
      actions.push({ label: "Completar Documentación", icon: FileCheck, variant: "outline", action: "doc-completa" })
      break
    case "Doc. completa":
      actions.push({ label: "Confirmar Autorización", icon: ShieldCheck, variant: "outline", action: "autorizacion" })
      break
    case "Autorización OK":
      if (!pagada) {
        actions.push({ label: "Registrar Pago", icon: CreditCard, variant: "default", action: "pagar" })
      }
      actions.push({ label: "Liquidación Futura", icon: Send, variant: "outline", action: "liquidacion-futura" })
      break
    case "Pagada":
      actions.push({ label: "Marcar Facturada", icon: Banknote, variant: "default", action: "facturar" })
      break
    case "Facturada":
      // Terminal state – no further actions
      break
    case "Finalizada":
      if (!pagada) {
        actions.push({ label: "Registrar Pago", icon: CreditCard, variant: "default", action: "pagar" })
      }
      break
  }

  // Always allow marking doc incomplete (if not terminal)
  if (!["Pagada", "Facturada"].includes(state) && state !== "Doc. incompleta") {
    actions.push({
      label: "Doc. Incompleta",
      icon: FileX2,
      variant: "destructive",
      action: "doc-incompleta",
    })
  }

  return actions
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className={cn("text-xs font-medium mt-0.5", mono && "font-mono")}>
          {value || "—"}
        </p>
      </div>
    </div>
  )
}

function StatusChip({
  checked,
  label,
  icon: Icon,
  className,
}: {
  checked: boolean
  label: string
  icon: React.ElementType
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2",
        checked
          ? "bg-emerald-50 border-emerald-200"
          : "bg-muted/30 border-border",
        className
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          checked ? "text-emerald-600" : "text-muted-foreground"
        )}
      />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {label}
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            checked ? "text-emerald-700" : "text-muted-foreground"
          )}
        >
          {checked ? "Sí" : "No"}
        </p>
      </div>
    </div>
  )
}

function StateTimeline({ state }: { state: InstrumentadorState }) {
  const steps: { label: string; active: boolean; done: boolean }[] = [
    {
      label: "Pendiente",
      active: true,
      done: !["Pendiente"].includes(state),
    },
    {
      label: "Realizada",
      active: [
        "Realizada",
        "Doc. completa",
        "Autorización OK",
        "Pagada",
        "Facturada",
        "Finalizada",
      ].includes(state),
      done: [
        "Doc. completa",
        "Autorización OK",
        "Pagada",
        "Facturada",
        "Finalizada",
      ].includes(state),
    },
    {
      label: "Documentación",
      active: [
        "Doc. completa",
        "Autorización OK",
        "Pagada",
        "Facturada",
        "Finalizada",
      ].includes(state),
      done: [
        "Autorización OK",
        "Pagada",
        "Facturada",
        "Finalizada",
      ].includes(state),
    },
    {
      label: "Autorización",
      active: [
        "Autorización OK",
        "Pagada",
        "Facturada",
        "Finalizada",
      ].includes(state),
      done: ["Pagada", "Facturada", "Finalizada"].includes(state),
    },
    {
      label: "Pago",
      active: ["Pagada", "Facturada", "Finalizada"].includes(state),
      done: ["Facturada", "Finalizada"].includes(state),
    },
    {
      label: "Facturada",
      active: ["Facturada"].includes(state),
      done: false,
    },
  ]

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((step, idx) => (
        <React.Fragment key={step.label}>
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={cn(
                "size-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                step.done
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : step.active
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-muted text-muted-foreground border-muted"
              )}
            >
              {step.done ? <CheckCircle2 className="size-3" /> : idx + 1}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                step.done || step.active
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={cn(
                "h-px flex-1 min-w-[12px]",
                step.done ? "bg-emerald-400" : "bg-border"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function ObservacionesSection() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Observaciones
          </span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground italic">
            Sin observaciones registradas para este instrumentador en esta
            cirugía.
          </p>
        </div>
      )}
    </div>
  )
}

function HistorialAsignacion() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Historial de Asignación
          </span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            Próximamente
          </Badge>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-center">
            <AlertCircle className="size-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              El historial de asignaciones estará disponible en futuras
              versiones. Aquí se registrará cada cambio de instrumentador, fecha
              de asignación y usuario que realizó la modificación.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="rounded-full bg-muted p-4">
          <Stethoscope className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            Sin instrumentador asignado
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            No se ha asignado un instrumentador a esta cirugía. Hacé clic en
            &quot;Asignar instrumentador&quot; para vincular uno y gestionar su
            liquidación.
          </p>
        </div>
        <Button size="sm" className="mt-2">
          <Plus className="size-4" />
          Asignar instrumentador
        </Button>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// ASSIGNED STATE — FULL PANEL
// ═══════════════════════════════════════════════════════════════

function AssignedPanel({
  surgery,
  instrumentadorSurgery: inst,
}: InstrumentadorPanelProps) {
  if (!inst) return null

  const StateIcon = INST_STATE_ICON[inst.state]
  const nextActions = getNextActions(inst.state, inst.pagada)

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Stethoscope className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Instrumentador
              </span>
              {getStateBadge(inst.state)}
            </div>
            <p className="text-xs text-muted-foreground">
              {inst.id} · Asignado a {inst.instrumentadorName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          {inst.pagada && (
            <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">
              <CheckCircle2 className="size-3 mr-1" />
              Pagada
            </Badge>
          )}
          {!inst.pagada && inst.price > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] text-amber-700 border-amber-300"
            >
              <Clock className="size-3 mr-1" />
              Pago pendiente
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* ── State Timeline ── */}
      <StateTimeline state={inst.state} />

      <Separator />

      {/* ── Instrumentador Info ── */}
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <User className="size-3.5 text-muted-foreground" />
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Datos del Instrumentador
            </h4>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1">
            <DetailRow
              icon={User}
              label="Nombre"
              value={inst.instrumentadorName}
            />
            <DetailRow
              icon={BadgeCheck}
              label="ID Instrumentador"
              value={inst.instrumentadorId}
              mono
            />
            <DetailRow
              icon={Calendar}
              label="Fecha CX"
              value={formatDate(inst.date)}
            />
            <DetailRow
              icon={Building2}
              label="Institución"
              value={inst.institution}
            />
          </div>
        </div>
      </div>

      {/* ── Liquidación Section ── */}
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="size-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Liquidación
              </h4>
            </div>
            {getStateBadge(inst.state)}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Honorarios
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {formatCurrency(inst.price)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Estado de Pago
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                {inst.pagada ? (
                  <>
                    <CheckCircle2 className="size-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                      Pagada
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      No pagada
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Documentation Status Chips ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatusChip
          checked={inst.documentacionCompleta}
          label="Documentación Completa"
          icon={inst.documentacionCompleta ? FileCheck : FileX2}
        />
        <StatusChip
          checked={inst.autorizacionOK}
          label="Autorización OK"
          icon={inst.autorizacionOK ? ShieldCheck : AlertCircle}
        />
      </div>

      {/* ── Payment Detail (if pagada) ── */}
      {inst.pagada && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-green-600" />
            <div>
              <p className="text-xs font-semibold text-green-800">
                Pago Registrado
              </p>
              <p className="text-[10px] text-green-700">
                El pago de {formatCurrency(inst.price)} ha sido registrado para{" "}
                {inst.instrumentadorName}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Doc. Incompleta Warning ── */}
      {inst.state === "Doc. incompleta" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <FileX2 className="size-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-800">
                Documentación Incompleta
              </p>
              <p className="text-[10px] text-red-700">
                La documentación del instrumentador no está completa. Complete la
                documentación para poder avanzar con la autorización y el pago.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Observaciones ── */}
      <ObservacionesSection />

      {/* ── Historial de Asignación ── */}
      <HistorialAsignacion />

      <Separator />

      {/* ── Action Buttons ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {nextActions.map((action) => {
            const ActionIcon = action.icon
            return (
              <Button
                key={action.action}
                size="sm"
                variant={action.variant}
                className="h-8 gap-1.5 text-xs"
              >
                <ActionIcon className="size-3.5" />
                {action.label}
              </Button>
            )
          })}
        </div>

        {/* Contextual hints */}
        {inst.state === "Pendiente" && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="size-3" />
            La cirugía aún no se ha realizado. Marque como &quot;Realizada&quot; una vez
            confirmada.
          </p>
        )}
        {inst.state === "Realizada" && !inst.documentacionCompleta && (
          <p className="text-[10px] text-amber-700 flex items-center gap-1">
            <AlertCircle className="size-3" />
            Complete la documentación para avanzar con la liquidación.
          </p>
        )}
        {inst.state === "Autorización OK" && !inst.pagada && (
          <p className="text-[10px] text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            Autorización confirmada. Puede registrar el pago o programar la
            liquidación futura.
          </p>
        )}
        {inst.state === "Facturada" && (
          <p className="text-[10px] text-green-700 flex items-center gap-1">
            <Banknote className="size-3" />
            La liquidación del instrumentador ha sido facturada correctamente.
          </p>
        )}
        {inst.state === "Finalizada" && inst.pagada && (
          <p className="text-[10px] text-green-700 flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            Liquidación finalizada y pago registrado.
          </p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function InstrumentadorPanel({
  surgery,
  instrumentadorSurgery,
}: InstrumentadorPanelProps) {
  // ── Empty state: no instrumentador assigned ──
  if (!instrumentadorSurgery) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Instrumentador</h2>
        </div>
        <EmptyState />
      </div>
    )
  }

  // ── Assigned state: full panel ──
  return (
    <div className="space-y-4">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Instrumentador</h2>
          <Badge variant="outline" className="text-[10px]">
            Asignado
          </Badge>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <User className="size-3.5" />
          Cambiar
        </Button>
      </div>

      {/* ── Full Assigned Panel ── */}
      <AssignedPanel
        surgery={surgery}
        instrumentadorSurgery={instrumentadorSurgery}
      />
    </div>
  )
}
