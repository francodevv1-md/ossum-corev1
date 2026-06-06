"use client"

import React from "react"
import type { Surgery, HistoryEntry } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import {
  History,
  ArrowRight,
  Clock,
  User,
  FileText,
  ShieldCheck,
  RefreshCw,
  Pause,
  XCircle,
  Receipt,
  CircleDot,
  ListFilter,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────
interface HistorialPanelProps {
  surgery: Surgery
  history: HistoryEntry[]
}

// ─── Action type → color mapping ──────────────────────────────────
type ActionColorKey =
  | "Creación"
  | "Autorización"
  | "Cambio de estado"
  | "Suspensión"
  | "Cancelación"
  | "Facturación"

const ACTION_COLORS: Record<ActionColorKey, string> = {
  Creación: "bg-blue-600 text-white border-blue-600",
  Autorización: "bg-emerald-600 text-white border-emerald-600",
  "Cambio de estado": "bg-amber-500 text-white border-amber-500",
  Suspensión: "bg-violet-600 text-white border-violet-600",
  Cancelación: "bg-red-600 text-white border-red-600",
  Facturación: "bg-green-600 text-white border-green-600",
}

const ACTION_DOT_COLORS: Record<ActionColorKey, string> = {
  Creación: "bg-blue-600",
  Autorización: "bg-emerald-600",
  "Cambio de estado": "bg-amber-500",
  Suspensión: "bg-violet-600",
  Cancelación: "bg-red-600",
  Facturación: "bg-green-600",
}

const DEFAULT_BADGE_COLOR = "bg-gray-500 text-white border-gray-500"
const DEFAULT_DOT_COLOR = "bg-gray-500"

function getActionBadgeClass(action: string): string {
  return (ACTION_COLORS as Record<string, string>)[action] ?? DEFAULT_BADGE_COLOR
}

function getActionDotClass(action: string): string {
  return (ACTION_DOT_COLORS as Record<string, string>)[action] ?? DEFAULT_DOT_COLOR
}

// ─── Action type → icon mapping ───────────────────────────────────
function getActionIcon(action: string) {
  switch (action) {
    case "Creación":
      return FileText
    case "Autorización":
      return ShieldCheck
    case "Cambio de estado":
      return RefreshCw
    case "Suspensión":
      return Pause
    case "Cancelación":
      return XCircle
    case "Facturación":
      return Receipt
    default:
      return CircleDot
  }
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="rounded-full bg-muted p-4">
          <History className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Sin historial registrado</p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Aún no se registraron eventos en el historial de esta cirugía. Las acciones realizadas
            aparecerán aquí automáticamente.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Timeline Entry ───────────────────────────────────────────────
function TimelineEntry({
  entry,
  isLast,
}: {
  entry: HistoryEntry
  isLast: boolean
}) {
  const Icon = getActionIcon(entry.action)
  const dotColor = getActionDotClass(entry.action)
  const badgeColor = getActionBadgeClass(entry.action)
  const hasValueChange = entry.previousValue && entry.newValue

  return (
    <div className="relative flex gap-4 pb-6">
      {/* ── Vertical line + dot ── */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            "size-8 rounded-full flex items-center justify-center border-2 border-background shadow-sm shrink-0 z-10",
            dotColor
          )}
        >
          <Icon className="size-3.5 text-white" />
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div className="w-px flex-1 bg-border mt-1" />
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Action badge + timestamp row */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge
            className={cn(
              "text-[10px] px-2 py-0 border font-semibold",
              badgeColor
            )}
          >
            {entry.action}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {formatDateTime(entry.date, entry.time)}
          </span>
        </div>

        {/* Details text */}
        <p className="text-xs text-foreground leading-relaxed mb-1.5">
          {entry.details}
        </p>

        {/* Value change: previous → new */}
        {hasValueChange && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground line-through">
              {entry.previousValue}
            </span>
            <ArrowRight className="size-3 text-muted-foreground shrink-0" />
            <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-mono font-medium text-foreground">
              {entry.newValue}
            </span>
          </div>
        )}

        {/* User */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="size-3" />
          <span>{entry.userName}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────
export function HistorialPanel({ surgery, history }: HistorialPanelProps) {
  // Sort newest first
  const sorted = [...history].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time ?? "00:00"}`).getTime()
    const dateB = new Date(`${b.date}T${b.time ?? "00:00"}`).getTime()
    return dateB - dateA
  })

  // ── Empty state ──
  if (sorted.length === 0) {
    return <EmptyState />
  }

  // ── Summary stats ──
  const actionCounts: Record<string, number> = {}
  for (const entry of sorted) {
    actionCounts[entry.action] = (actionCounts[entry.action] ?? 0) + 1
  }
  const uniqueActionTypes = Object.keys(actionCounts)

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <History className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">
              Historial del expediente
            </h3>
            <p className="text-xs text-muted-foreground">
              {sorted.length} evento{sorted.length !== 1 ? "s" : ""} registrado{sorted.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Quick filter chips showing action types present */}
        <div className="flex flex-wrap items-center gap-1.5">
          <ListFilter className="size-3 text-muted-foreground" />
          {uniqueActionTypes.map((action) => (
            <Badge
              key={action}
              variant="outline"
              className="text-[10px] px-1.5 py-0 cursor-default"
            >
              {action}
              <span className="ml-1 text-muted-foreground">
                {actionCounts[action]}
              </span>
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Timeline ── */}
      <Card className="py-0">
        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="max-h-[520px] pr-2">
            <div className="space-y-0">
              {sorted.map((entry, idx) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  isLast={idx === sorted.length - 1}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Footer info ── */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span>
          Cirugía: {surgery.patient} — {surgery.procedure}
        </span>
        <span>
          Expediente: {surgery.expedienteNumber ?? "—"}
        </span>
      </div>
    </div>
  )
}
