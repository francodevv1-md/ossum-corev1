"use client"

import React, { useMemo, useState } from "react"
import type { Surgery, LogisticsDetail, Box, LogisticsState, PreparationState, Remito } from "@/types"
import { useOrtoTrackStore } from "@/lib/store"
import { useAuth } from "@/components/auth/AuthProvider"
import { updateSurgeryPreparation } from "@/lib/api/surgery-preparation-client"
import type { PrepStatus } from "@/lib/validators/surgery.validator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { PREP_STATE_COLORS, LOGISTICS_STATE_OUTLINED_COLORS } from "@/lib/shared-constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AlertTriangle, BoxIcon, CheckCircle2, MapPin, RotateCcw, Truck } from "lucide-react"

interface LogisticaPanelProps {
  surgery: Surgery
  logistics?: LogisticsDetail
  box?: Box
  remitos: Remito[]
}

const PREPARATION_OPTIONS: PreparationState[] = [
  "En preparación",
  "Congelado",
  "Congelado con faltantes",
  "Enviado",
  "Entregado",
  "Retirado",
]

const PREP_STATUS_BY_PREPARATION_STATE: Partial<Record<PreparationState, PrepStatus>> = {
  "En preparación": "preparing",
  "Congelado": "frozen",
  "Congelado con faltantes": "frozen_with_missing",
  "Enviado": "shipped",
  "Entregado": "delivered",
  "Retirado": "returned",
}

const SUBSECTION_TITLE_CLS = "text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300"
const LABEL_CLS = "text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400"
const VALUE_CLS = "text-[13px] font-semibold leading-5 text-slate-950 dark:text-slate-100"
const EMPTY_CLS = "italic text-slate-500 dark:text-slate-400"

function daysSince(dateStr: string): number {
  const then = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)))
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
      {children}
    </div>
  )
}

function CompactGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className={SUBSECTION_TITLE_CLS}>{title}</p>
      <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">{children}</div>
    </div>
  )
}

function CompactListRow({
  label,
  value,
  emptyText = "—",
  valueClassName = VALUE_CLS,
}: {
  label: string
  value?: React.ReactNode
  emptyText?: string
  valueClassName?: string
}) {
  const isEmpty = value === null || value === undefined || value === "" || (typeof value === "string" && value.trim() === "")

  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0 dark:border-slate-800">
      <span className="min-w-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("min-w-0 text-right", isEmpty ? EMPTY_CLS : valueClassName)}>{isEmpty ? emptyText : value}</span>
    </div>
  )
}

function StateBadge({ state }: { state?: LogisticsState }) {
  if (!state) return null
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
        LOGISTICS_STATE_OUTLINED_COLORS[state] ?? "bg-gray-100 text-gray-700 border-gray-300"
      )}
    >
      {state}
    </span>
  )
}

function StatePill({ state }: { state?: LogisticsState }) {
  if (!state) return null
  return (
    <Badge className={cn("border-0 px-1.5 py-0 text-[10px]", PREP_STATE_COLORS[state] ?? "bg-gray-400 text-white")}>
      {state}
    </Badge>
  )
}

function EmptyState() {
  return (
      <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 dark:border-slate-700">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
          <MapPin className="size-6 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Sin datos logísticos visibles</p>
          <p className="max-w-[320px] text-xs text-slate-500 dark:text-slate-400">
            Cuando existan remitos, señales de preparación o registros de retorno se consolidarán acá.
          </p>
        </div>
      </div>
    </div>
  )
}

export function LogisticaPanel({ surgery, logistics, box, remitos }: LogisticaPanelProps) {
  const { activeCompany } = useAuth()
  const changePreparationState = useOrtoTrackStore((state) => state.changePreparationState)
  const [isUpdatingPreparation, setIsUpdatingPreparation] = useState(false)

  const updatePreparation = async (value: PreparationState) => {
    const prepStatus = PREP_STATUS_BY_PREPARATION_STATE[value]
    if (!prepStatus) {
      toast.error("Seleccioná un subestado de preparación válido.")
      return
    }

    if (!surgery.backendId || !activeCompany?.id) {
      toast.error("La preparación requiere una cirugía y empresa sincronizadas con el servidor.")
      return
    }

    setIsUpdatingPreparation(true)
    try {
      await updateSurgeryPreparation(activeCompany.id, surgery.backendId, {
        prepStatus,
        source: "expediente-logistics-panel",
      })
      changePreparationState(surgery.id, value)
      toast.success(`Preparación actualizada a ${value}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la preparación.")
    } finally {
      setIsUpdatingPreparation(false)
    }
  }

  const latestRemito = useMemo(
    () => remitos.slice().sort((a, b) => b.date.localeCompare(a.date))[0],
    [remitos]
  )

  const summary = useMemo(() => {
    const remitoOpenUnits = remitos.reduce(
      (sum, remito) => sum + remito.items.reduce((itemSum, item) => itemSum + Math.max(0, item.sentQuantity - item.returnedQuantity - item.consumedQuantity), 0),
      0
    )
    const sentDate = latestRemito?.date ?? logistics?.fechaEnvioMateriales ?? box?.sentAt ?? surgery.fechaEnvioMaterial
    const sentSource = latestRemito
      ? `Remito ${latestRemito.id}`
      : logistics?.fechaEnvioMateriales
        ? "Logística"
        : box?.sentAt
          ? "Caja"
          : surgery.fechaEnvioMaterial
            ? "Ficha CX"
            : null

    const hasRetiro = Boolean(logistics?.registroRetiro)
    const hasDevolucion = Boolean(logistics?.registroDevolucion)
    const hasBoxReturn = Boolean(box?.returnedAt)
    const prepReturned = surgery.preparationState === "Retirado"
    const wasSent = Boolean(latestRemito || logistics?.registroSalida || logistics?.fechaEnvioMateriales || box?.sentAt)
    const returnResolved = remitoOpenUnits === 0 || hasDevolucion || hasBoxReturn || prepReturned || logistics?.vuelta === "Controlado"
    const pendingReturn = wasSent && !returnResolved

    let returnLabel = "Sin señales"
    let returnTone = "text-slate-700"
    if (remitoOpenUnits === 0 && remitos.length > 0) {
      returnLabel = "Remitos cerrados"
      returnTone = "text-emerald-700"
    } else if (hasDevolucion || hasBoxReturn) {
      returnLabel = "Retorno registrado"
      returnTone = "text-emerald-700"
    } else if (prepReturned) {
      returnLabel = "Retorno reflejado en preparación"
      returnTone = "text-emerald-700"
    } else if (hasRetiro || logistics?.vuelta === "Retirado") {
      returnLabel = "Retiro registrado"
      returnTone = "text-amber-700"
    } else if (pendingReturn) {
      returnLabel = "Pendiente de registro"
      returnTone = "text-amber-700"
    }

    return {
      remitoOpenUnits,
      sentDate,
      sentSource,
      daysSinceSent: sentDate ? daysSince(sentDate) : null,
      pendingReturn,
      returnResolved,
      returnLabel,
      returnTone,
      eventsCount: [logistics?.registroSalida, logistics?.fechaEnvioMateriales, logistics?.registroRetiro, logistics?.registroDevolucion, box?.preparedAt, box?.sentAt, box?.returnedAt, latestRemito?.id].filter(Boolean).length,
    }
  }, [box?.preparedAt, box?.returnedAt, box?.sentAt, latestRemito, logistics?.fechaEnvioMateriales, logistics?.registroDevolucion, logistics?.registroRetiro, logistics?.registroSalida, logistics?.vuelta, remitos, surgery.fechaEnvioMaterial, surgery.preparationState])

  const hasDirectTransfer = useMemo(() => {
    return remitos.some((r: any) => {
      const meta = (r as any).metadata || {}
      return meta.directTransfer === true || meta.transferType === "direct_cx_transfer" || r.salidaReason === "traslado"
    })
  }, [remitos])

  if (!logistics && remitos.length === 0 && !box) {
    return <EmptyState />
  }

  return (
    <div className="space-y-2.5">
      {hasDirectTransfer && (
        <div className="rounded-md border border-amber-300 bg-amber-50/80 p-2.5 text-[11px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Caja transferida directamente entre nosocomios</p>
            <p className="text-[10px] text-amber-800 dark:text-amber-400 mt-0.5">
              Material trasladado desde otra cirugía sin control físico de depósito intermedio. Revisión de contenido pendiente.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-slate-950 dark:text-slate-100">Resumen operativo</span>
            <StatePill state={logistics?.ida ?? latestRemito?.state} />
            <StateBadge state={logistics?.vuelta} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">CX {surgery.id} · {surgery.institution}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Preparación CX: {surgery.preparationState}</span>
            {summary.returnResolved ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Retorno resuelto</span>
            ) : summary.pendingReturn ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Retorno pendiente</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Sin cierre de retorno</span>
            )}
            {summary.sentSource && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Salida base: {summary.sentSource}</span>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/60">
            <p className={LABEL_CLS}>Preparación CX</p>
            <Select
              value={surgery.preparationState}
              onValueChange={(value) => {
                if (value === surgery.preparationState) return
                void updatePreparation(value as PreparationState)
              }}
              disabled={isUpdatingPreparation}
            >
               <SelectTrigger className="mt-1 h-7.5 text-[11px]">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {PREPARATION_OPTIONS.map((state) => (
                  <SelectItem key={state} value={state} className="text-[11px]">
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {logistics?.amount ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-right dark:border-slate-800 dark:bg-slate-950/60">
              <p className={LABEL_CLS}>Valor materiales</p>
              <p className="text-[13px] font-semibold text-slate-950 dark:text-slate-100">{formatCurrency(logistics.amount)}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <CompactGroup title="Preparación">
          <CompactListRow label="Estado logística" value={logistics?.preparation} />
          <CompactListRow label="Preparación CX" value={surgery.preparationState} />
          <CompactListRow label="Registro salida" value={logistics?.registroSalida} />
          <CompactListRow label="Caja preparada" value={box?.preparedAt ? formatDate(box.preparedAt) : ""} />
        </CompactGroup>

        <CompactGroup title="Envío">
          <CompactListRow label="Estado" value={logistics?.ida ?? latestRemito?.state} />
          <CompactListRow label="Fecha salida" value={summary.sentDate ? formatDate(summary.sentDate) : ""} />
          <CompactListRow label="Fuente" value={summary.sentSource ?? ""} valueClassName="text-[11px] font-medium text-slate-700" />
          <CompactListRow label="Días desde salida" value={summary.daysSinceSent !== null ? String(summary.daysSinceSent) : ""} />
        </CompactGroup>

        <CompactGroup title="Retorno">
          <CompactListRow label="Resumen" value={summary.returnLabel} valueClassName={cn("text-[13px] font-semibold", summary.returnTone)} />
          <CompactListRow label="Registro retiro" value={logistics?.registroRetiro} />
          <CompactListRow label="Registro devolución" value={logistics?.registroDevolucion} />
          <CompactListRow label="Caja devuelta" value={box?.returnedAt ? formatDate(box.returnedAt) : ""} />
        </CompactGroup>
      </div>

      <InfoNote>
        Días desde salida prioriza <strong>fecha de remito</strong>. Solo cae a logística, caja o ficha si no hay remito visible.
      </InfoNote>

      {box && (
        <div className="rounded-md border border-slate-200 bg-white/70 px-2.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-1.5 flex items-center gap-2">
            <BoxIcon className="size-3.5 text-slate-700 dark:text-slate-300" />
            <p className={SUBSECTION_TITLE_CLS}>Caja / material</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-4">
            <div>
              <p className="mb-0.5 text-[10px] text-slate-500 dark:text-slate-400">Caja</p>
              <p className="truncate text-xs font-medium" title={box.name}>{box.name}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] text-slate-500 dark:text-slate-400">Tipo</p>
              <p className="text-xs">{box.type}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] text-slate-500 dark:text-slate-400">Estado caja</p>
              <StateBadge state={box.state} />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] text-slate-500 dark:text-slate-400">Contenidos</p>
              <p className="text-xs">{box.contents.length} ítem{box.contents.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
            {box.preparedAt && <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3" />Preparado: {formatDate(box.preparedAt)}</span>}
            {box.sentAt && <span className="inline-flex items-center gap-1"><Truck className="size-3" />Enviado: {formatDate(box.sentAt)}</span>}
            {box.returnedAt && <span className="inline-flex items-center gap-1"><RotateCcw className="size-3" />Devuelto: {formatDate(box.returnedAt)}</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-center dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">{summary.eventsCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Registros</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-center dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">{summary.daysSinceSent ?? "—"}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Días desde salida</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-center dark:border-slate-800 dark:bg-slate-950/60">
          <p className={cn("text-base font-bold", summary.remitoOpenUnits > 0 ? "text-amber-600" : "text-emerald-600")}>{summary.remitoOpenUnits}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Unidades abiertas por remito</p>
        </div>
      </div>

    </div>
  )
}
