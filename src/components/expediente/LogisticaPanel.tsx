"use client"

import React, { useMemo } from "react"
import type { Surgery, LogisticsDetail, Box, BoxContent, LogisticsState } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { PREP_STATE_COLORS, LOGISTICS_STATE_OUTLINED_COLORS } from "@/lib/shared-constants"
import { cn } from "@/lib/utils"
import {
  MapPin,
  Package,
  ArrowRight,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  CalendarClock,
  AlertTriangle,
  FileText,
  Eye,
  PlusCircle,
  CornerDownLeft,
  BoxIcon,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────

interface LogisticaPanelProps {
  surgery: Surgery
  logistics?: LogisticsDetail
  box?: Box
}

// ─── Logistics state color map — imported from shared-constants ───
const LOGISTICS_STATE_COLORS = LOGISTICS_STATE_OUTLINED_COLORS
const LOGISTICS_STATE_BADGE_COLORS = PREP_STATE_COLORS

// ─── Progress steps for Ida/Vuelta ────────────────────────────────

const IDA_STEPS: LogisticsState[] = [
  "Sin preparar", "Congelado", "Congelado con faltantes", "Preparado", "Enviado",
]

const VUELTA_STEPS: LogisticsState[] = [
  "Sin preparar", "Retirado", "Devuelto", "Controlado",
]

function getStepIndex(steps: LogisticsState[], state: LogisticsState): number {
  const idx = steps.indexOf(state)
  // "Congelado con faltantes" shares progress with "Congelado" in ida
  if (idx === -1 && state === "Congelado con faltantes") {
    return steps.indexOf("Congelado con faltantes") !== -1
      ? steps.indexOf("Congelado con faltantes")
      : steps.indexOf("Congelado")
  }
  return idx
}

// ─── Sub-components ───────────────────────────────────────────────

function StateBadge({ state }: { state: LogisticsState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
        LOGISTICS_STATE_COLORS[state] ?? "bg-gray-100 text-gray-700 border-gray-300"
      )}
    >
      {state}
    </span>
  )
}

function StatePill({ state }: { state: LogisticsState }) {
  return (
    <Badge
      className={cn(
        "text-[10px] px-1.5 py-0 border-0",
        LOGISTICS_STATE_BADGE_COLORS[state] ?? "bg-gray-400 text-white"
      )}
    >
      {state}
    </Badge>
  )
}

/** Horizontal progress bar for Ida or Vuelta */
function ProgressSteps({
  steps,
  currentState,
  label,
}: {
  steps: LogisticsState[]
  currentState: LogisticsState
  label: string
}) {
  const activeIdx = getStepIndex(steps, currentState)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <StatePill state={currentState} />
      </div>
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const isActive = idx === activeIdx
          const isDone = idx < activeIdx
          const isFuture = idx > activeIdx
          // Skip "Congelado con faltantes" in the visual timeline to avoid clutter
          if (step === "Congelado con faltantes" && steps === IDA_STEPS) return null

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <div
                  className={cn(
                    "size-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors",
                    isDone
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : isActive
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-muted text-muted-foreground border-muted-foreground/20"
                  )}
                >
                  {isDone ? <CheckCircle2 className="size-3" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "text-[9px] leading-tight text-center",
                    isDone || isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
              {idx < steps.length - 1 && step !== "Congelado con faltantes" && (
                <div
                  className={cn(
                    "h-px flex-1 min-w-[12px] mt-[-12px]",
                    isDone ? "bg-emerald-400" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

/** Info row for a single field */
function InfoRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-[10px] text-muted-foreground min-w-[90px]">{label}</span>
      <span className={cn("text-xs font-medium", valueClass)}>{value}</span>
    </div>
  )
}

/** Days since a given date string */
function daysSince(dateStr: string): number {
  const then = new Date(dateStr + "T00:00:00")
  const now = new Date()
  const diff = now.getTime() - then.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

// ─── Empty State ──────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="rounded-full bg-muted p-4">
          <MapPin className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Sin datos de logística</p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            No hay información logística registrada para esta cirugía. Los datos de envío,
            retiro y devolución aparecerán aquí cuando se inicie el proceso de preparación.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function LogisticaPanel({ surgery, logistics, box }: LogisticaPanelProps) {
  // ── Summary computations ──
  const summaryStats = useMemo(() => {
    if (!logistics) return null

    // Count distinct events based on available registros
    let eventsCount = 0
    if (logistics.registroSalida) eventsCount++
    if (logistics.fechaEnvioMateriales) eventsCount++
    if (logistics.registroRetiro) eventsCount++
    if (logistics.registroDevolucion) eventsCount++

    const daysSinceSent = logistics.fechaEnvioMateriales
      ? daysSince(logistics.fechaEnvioMateriales)
      : null

    // Pending return: ida is "Enviado" or beyond but vuelta is still "Sin preparar" or early
    const idaAdvanced = ["Enviado", "Retirado"].includes(logistics.ida)
    const vueltaPending = ["Sin preparar", "Congelado", "Congelado con faltantes"].includes(logistics.vuelta)
    const pendingReturn = idaAdvanced && vueltaPending

    return { eventsCount, daysSinceSent, pendingReturn }
  }, [logistics])

  // ── Empty state ──
  if (!logistics) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <MapPin className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Logística</span>
              <StatePill state={logistics.ida} />
              <ArrowRight className="size-3 text-muted-foreground" />
              <StatePill state={logistics.vuelta} />
            </div>
            <p className="text-xs text-muted-foreground">
              CX {surgery.id} &middot; {surgery.institution}
            </p>
          </div>
        </div>

        {logistics.amount > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Valor materiales</p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(logistics.amount)}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Ida (Outbound) Section ── */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Truck className="size-3.5" />
            Ida (Envío)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          {/* Progress steps */}
          <ProgressSteps steps={IDA_STEPS} currentState={logistics.ida} label="Ida" />

          <Separator />

          {/* Detail rows */}
          <div className="space-y-2">
            <InfoRow
              icon={MapPin}
              label="Estado ida"
              value={logistics.ida}
            />
            {logistics.fechaEnvioMateriales && (
              <InfoRow
                icon={CalendarClock}
                label="Fecha envío"
                value={formatDate(logistics.fechaEnvioMateriales)}
              />
            )}
            <InfoRow
              icon={Package}
              label="Preparación"
              value={logistics.preparation}
            />
            {logistics.registroSalida && (
              <InfoRow
                icon={Clock}
                label="Registro salida"
                value={logistics.registroSalida}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Vuelta (Return) Section ── */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <RotateCcw className="size-3.5" />
            Vuelta (Retorno)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          {/* Progress steps */}
          <ProgressSteps steps={VUELTA_STEPS} currentState={logistics.vuelta} label="Vuelta" />

          <Separator />

          {/* Detail rows */}
          <div className="space-y-2">
            <InfoRow
              icon={ArrowLeftRight}
              label="Estado vuelta"
              value={logistics.vuelta}
            />
            {logistics.registroRetiro && (
              <InfoRow
                icon={Clock}
                label="Registro retiro"
                value={logistics.registroRetiro}
              />
            )}
            {logistics.registroDevolucion && (
              <InfoRow
                icon={CornerDownLeft}
                label="Registro devolución"
                value={logistics.registroDevolucion}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Box Info Section ── */}
      {box && (
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <BoxIcon className="size-3.5" />
              Caja / Material
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {/* Box details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md border bg-muted/20 p-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Caja</p>
                <p className="text-xs font-medium truncate" title={box.name}>
                  {box.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Tipo</p>
                <p className="text-xs">{box.type}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Estado caja</p>
                <StateBadge state={box.state} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Contenidos</p>
                <p className="text-xs">{box.contents.length} ítem{box.contents.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Timestamps row */}
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
              {box.preparedAt && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  <span>Preparado: {formatDate(box.preparedAt)}</span>
                </div>
              )}
              {box.sentAt && (
                <div className="flex items-center gap-1">
                  <Truck className="size-3" />
                  <span>Enviado: {formatDate(box.sentAt)}</span>
                </div>
              )}
              {box.returnedAt && (
                <div className="flex items-center gap-1">
                  <RotateCcw className="size-3" />
                  <span>Devuelto: {formatDate(box.returnedAt)}</span>
                </div>
              )}
            </div>

            {/* Box contents list */}
            {box.contents.length > 0 && (
              <div className="rounded-md border">
                <div className="px-3 py-2 bg-muted/50 border-b">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    Contenido de la caja
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {box.contents.map((item: BoxContent) => (
                    <div
                      key={item.stockItemId}
                      className="flex items-center justify-between px-3 py-1.5 border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">{item.code}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] ml-3">
                        <span className="text-muted-foreground">
                          Cant: <strong className="text-foreground">{item.quantity}</strong>
                        </span>
                        {item.consumed > 0 && (
                          <span className="text-emerald-700">
                            Cons: {item.consumed}
                          </span>
                        )}
                        {item.returned > 0 && (
                          <span className="text-orange-700">
                            Dev: {item.returned}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Summary Stats ── */}
      {summaryStats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-lg font-bold text-foreground">{summaryStats.eventsCount}</p>
            <p className="text-[10px] text-muted-foreground">Eventos registrados</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-lg font-bold text-foreground">
              {summaryStats.daysSinceSent !== null ? summaryStats.daysSinceSent : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">Días desde envío</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            {summaryStats.pendingReturn ? (
              <>
                <div className="flex items-center justify-center gap-1">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <p className="text-lg font-bold text-amber-600">Sí</p>
                </div>
                <p className="text-[10px] text-amber-700 font-medium">Retorno pendiente</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 text-emerald-600 mx-auto" />
                <p className="text-[10px] text-muted-foreground">Retorno OK</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Pending return alert ── */}
      {summaryStats?.pendingReturn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">Retorno pendiente</span>
          </div>
          <p className="text-[10px] text-amber-700">
            Los materiales fueron enviados pero aún no se ha registrado el retorno. 
            {summaryStats.daysSinceSent !== null && summaryStats.daysSinceSent > 2 && (
              <span className="font-semibold">
                {" "}Han pasado {summaryStats.daysSinceSent} días desde el envío.
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── Preparation state alert (if con faltantes) ── */}
      {logistics.preparation === "Congelado con faltantes" && (
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-4 text-orange-600" />
            <span className="text-xs font-semibold text-orange-800">Preparación con faltantes</span>
          </div>
          <p className="text-[10px] text-orange-700">
            La preparación está congelada con faltantes de materiales. Verificar los artículos 
            pendientes antes de proceder con el envío.
          </p>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" variant="outline">
          <MapPin className="size-3.5" />
          Ver mapa
        </Button>
        <Button size="sm" variant="outline">
          <FileText className="size-3.5" />
          Registrar evento
        </Button>
        {summaryStats?.pendingReturn && (
          <Button size="sm" variant="outline">
            <AlertTriangle className="size-3.5" />
            Reclamar retorno
          </Button>
        )}
        {logistics.vuelta === "Retirado" && (
          <Button size="sm" variant="outline">
            <CornerDownLeft className="size-3.5" />
            Registrar devolución
          </Button>
        )}
        {box && (
          <Button size="sm" variant="secondary">
            <Eye className="size-3.5" />
            Ver caja
          </Button>
        )}
      </div>
    </div>
  )
}
