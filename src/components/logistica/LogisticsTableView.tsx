"use client"

import React from "react"
import {
  CalendarDays,
  Clock3,
  Truck,
  Building2,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  MapPin,
  FileText,
  Boxes,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LogisticsInboxItem } from "@/hooks/useLogisticsGlobalInbox"

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programada",
  pending: "Pendiente",
  performed: "Realizada",
  cancelled: "Cancelada",
  suspended: "Suspendida",
  draft: "Borrador",
  ready: "Lista",
  en_transito: "En tránsito",
  available: "Disponible",
  unavailable: "No disponible",
  mixed: "Mixto",
  prepare: "Preparar",
  dispatch: "Despacho",
  receive: "Recepción",
  return: "Devolución",
  reconcile: "Conciliación",
  unauthorized: "No disponible",
  "frozen with missing": "Congelada con faltantes",
  frozen_with_missing: "Congelada con faltantes",
  shipped: "Enviado",
  preparing: "En preparación",
  delivered: "Entregado",
  returned: "Devuelto",
  finalized: "Finalizado",
}

export const formatLogisticsStatus = (value: string | null | undefined) => {
  if (!value) return "Sin dato"
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase()
  return STATUS_LABELS[normalized] ?? value.replaceAll("_", " ")
}

const formatDate = (value: string | null) => {
  if (!value) return "Sin fecha"
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function StatusPill({
  kind,
  value,
}: {
  kind: "surgery" | "preparation" | "logistics"
  value: string | null | undefined
}) {
  const Icon = kind === "surgery" ? CalendarDays : kind === "preparation" ? Boxes : Truck
  const normalized = (value || "").toLowerCase()

  let tone = "border-slate-200 bg-slate-50 text-slate-700"
  if (kind === "preparation") {
    if (normalized.includes("ready") || normalized.includes("lista")) {
      tone = "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
    } else if (normalized.includes("prep") || normalized.includes("en preparación")) {
      tone = "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
    } else {
      tone = "border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
  } else if (kind === "logistics") {
    if (normalized.includes("transito") || normalized.includes("shipped") || normalized.includes("enviado")) {
      tone = "border-sky-200 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900"
    } else if (normalized.includes("delivered") || normalized.includes("entregado") || normalized.includes("finalized")) {
      tone = "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
    } else if (normalized.includes("return") || normalized.includes("devolucion")) {
      tone = "border-purple-200 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900"
    } else {
      tone = "border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold select-none",
        tone
      )}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{formatLogisticsStatus(value)}</span>
    </span>
  )
}

function getRowAlertText(item: LogisticsInboxItem) {
  const parts: string[] = []
  if (item.logistics.blockers.count > 0) {
    parts.push(`${item.logistics.blockers.count} bloqueo${item.logistics.blockers.count === 1 ? "" : "s"}`)
  }
  if (item.logistics.differences.open > 0) {
    parts.push(`${item.logistics.differences.open} diferencia${item.logistics.differences.open === 1 ? "" : "s"}`)
  }
  if (item.logistics.alerts.count > 0) {
    parts.push(`${item.logistics.alerts.count} alerta${item.logistics.alerts.count === 1 ? "" : "s"}`)
  }
  return parts.length ? parts.join(" · ") : null
}

interface LogisticsTableViewProps {
  items: LogisticsInboxItem[]
  onOpenDetail: (surgeryId: string) => void
  onShare?: (item: LogisticsInboxItem) => void
}

export function LogisticsTableView({ items, onOpenDetail, onShare }: LogisticsTableViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-xl dark:bg-slate-900 dark:border-slate-800">
        <ShieldAlert className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No hay cirugías en la bandeja para los filtros seleccionados
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Probá ajustar la búsqueda o limpiar los filtros activos.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-white border border-slate-200/80 rounded-xl shadow-xs dark:bg-slate-900 dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 dark:bg-slate-800/60 dark:border-slate-800">
              <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 w-[140px]">
                Expediente / ID
              </th>
              <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 w-[110px]">
                Fecha
              </th>
              <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 min-w-[200px]">
                Paciente & Cirujano
              </th>
              <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 min-w-[180px]">
                Institución & Destino
              </th>
              <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 w-[130px]">
                Preparación
              </th>
              <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 w-[130px]">
                Logística
              </th>
              <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 min-w-[150px]">
                Estado / Alertas
              </th>
              <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 text-right w-[100px]">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.map((item) => {
              const alertText = getRowAlertText(item)
              const isUrgent =
                item.surgery.priority === "urgent" ||
                item.surgery.priority === "URGENTE" ||
                item.logistics.blockers.count > 0

              const nextActionText =
                typeof item.logistics.nextAction === "string"
                  ? item.logistics.nextAction
                  : item.logistics.nextAction?.label ?? null

              return (
                <tr
                  key={item.surgery.id}
                  className={cn(
                    "transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 group",
                    isUrgent ? "bg-rose-50/20" : ""
                  )}
                >
                  {/* ID / Ref */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                        {item.surgery.reference ?? "S/R"}
                      </span>
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900">
                          🚨 URG
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(item.surgery.date)}</span>
                    </div>
                  </td>

                  {/* Patient & Doctor */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.surgery.patient ?? "Sin paciente"}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.surgery.doctor ? `Dr. ${item.surgery.doctor}` : "Sin médico asignado"}
                      </span>
                    </div>
                  </td>

                  {/* Institution & Locality */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-medium truncate">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.surgery.institution ?? "Sin institución"}</span>
                      </div>
                      {item.surgery.locality && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.surgery.locality}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Prep status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusPill kind="preparation" value={item.surgery.preparationStatus} />
                  </td>

                  {/* Logistics status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusPill kind="logistics" value={item.surgery.logisticsStatus} />
                  </td>

                  {/* Alerts & Next Action */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                      {alertText ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400 text-[11px]">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {alertText}
                        </span>
                      ) : nextActionText ? (
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate">
                          {nextActionText}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Sin alertas</span>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {onShare && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onShare(item)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                          title="Compartir estado de logística"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenDetail(item.surgery.id)}
                        className="h-7 px-2.5 gap-1 text-xs font-semibold hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 dark:hover:bg-sky-950/50"
                      >
                        <span>Operar</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
