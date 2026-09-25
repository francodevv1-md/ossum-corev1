"use client"

import React, { useMemo } from "react"
import {
  CalendarDays,
  Building2,
  MapPin,
  AlertTriangle,
  Boxes,
  Truck,
  ArrowRight,
  ShieldAlert,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LogisticsInboxItem } from "@/hooks/useLogisticsGlobalInbox"
import { formatLogisticsStatus } from "./LogisticsTableView"

interface LogisticsCardsViewProps {
  items: LogisticsInboxItem[]
  onOpenDetail: (surgeryId: string) => void
  onShare?: (item: LogisticsInboxItem) => void
}

type GroupBucket = {
  id: string
  title: string
  description: string
  items: LogisticsInboxItem[]
  tone: "warning" | "info" | "success" | "danger"
}

export function LogisticsCardsView({ items, onOpenDetail, onShare }: LogisticsCardsViewProps) {
  const buckets: GroupBucket[] = useMemo(() => {
    const pending: LogisticsInboxItem[] = []
    const transit: LogisticsInboxItem[] = []
    const delivered: LogisticsInboxItem[] = []
    const exceptions: LogisticsInboxItem[] = []

    for (const item of items) {
      const logStatus = (item.surgery.logisticsStatus || "").toLowerCase()
      const prepStatus = (item.surgery.preparationStatus || "").toLowerCase()
      const hasBlocker = item.logistics.blockers.count > 0 || item.logistics.exceptions.count > 0

      if (hasBlocker) {
        exceptions.push(item)
      } else if (logStatus.includes("transito") || logStatus.includes("shipped") || logStatus.includes("enviado")) {
        transit.push(item)
      } else if (logStatus.includes("delivered") || logStatus.includes("entregado") || logStatus.includes("finalized")) {
        delivered.push(item)
      } else {
        pending.push(item)
      }
    }

    return [
      {
        id: "exceptions",
        title: "Con Bloqueos / Excepciones",
        description: "Requieren resolución inmediata para liberar despacho",
        items: exceptions,
        tone: "danger",
      },
      {
        id: "pending",
        title: "Por Despachar / En Almacén",
        description: "En preparación de instrumental o listas para retiro",
        items: pending,
        tone: "warning",
      },
      {
        id: "transit",
        title: "En Tránsito / En Reparto",
        description: "En camino a institución o profesional",
        items: transit,
        tone: "info",
      },
      {
        id: "delivered",
        title: "Entregadas / Completadas",
        description: "Recepcionadas en destino o en etapa de consumo",
        items: delivered,
        tone: "success",
      },
    ]
  }, [items])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-xl dark:bg-slate-900 dark:border-slate-800">
        <ShieldAlert className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No hay cirugías para mostrar en la vista de tarjetas
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Probá ajustar la búsqueda o limpiar los filtros activos.
        </p>
      </div>
    )
  }

  const getHeaderTone = (tone: GroupBucket["tone"]) => {
    switch (tone) {
      case "danger":
        return "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-900"
      case "warning":
        return "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900"
      case "info":
        return "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-900"
      case "success":
        return "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-900"
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {buckets.map((bucket) => (
        <div
          key={bucket.id}
          className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden dark:bg-slate-900/50 dark:border-slate-800"
        >
          {/* Column Header */}
          <div className={cn("p-3 border-b flex items-center justify-between", getHeaderTone(bucket.tone))}>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">{bucket.title}</h3>
              <p className="text-[10px] opacity-80 line-clamp-1">{bucket.description}</p>
            </div>
            <Badge variant="secondary" className="font-mono text-xs font-bold px-2">
              {bucket.items.length}
            </Badge>
          </div>

          {/* Cards List */}
          <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
            {bucket.items.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Sin expedientes en esta etapa
              </div>
            ) : (
              bucket.items.map((item) => {
                const isUrgent =
                  item.surgery.priority === "urgent" ||
                  item.surgery.priority === "URGENTE" ||
                  item.logistics.blockers.count > 0

                return (
                  <article
                    key={item.surgery.id}
                    className={cn(
                      "p-3 rounded-lg border bg-white shadow-2xs transition-all hover:shadow-xs hover:border-sky-300 dark:bg-slate-800 dark:border-slate-700",
                      isUrgent ? "border-l-4 border-l-rose-500" : "border-slate-200"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {item.surgery.reference ?? "S/R"}
                        </span>
                        {isUrgent && (
                          <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                            URG
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {item.surgery.date ? new Date(item.surgery.date).toLocaleDateString("es-AR") : "Sin fecha"}
                      </span>
                    </div>

                    {/* Patient & Doctor */}
                    <p className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {item.surgery.patient ?? "Sin paciente"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.surgery.doctor ? `Dr. ${item.surgery.doctor}` : "Sin médico"}
                    </p>

                    {/* Institution */}
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.surgery.institution ?? "Sin institución"}</span>
                    </div>

                    {/* Status pills */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0.2">
                        Prep: {formatLogisticsStatus(item.surgery.preparationStatus)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0.2">
                        Log: {formatLogisticsStatus(item.surgery.logisticsStatus)}
                      </Badge>
                    </div>

                    {/* Footer / Action */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between dark:border-slate-700/60">
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                        {item.logistics.blockers.count > 0 ? (
                          <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {item.logistics.blockers.count} bloqueo(s)
                          </span>
                        ) : (
                          <span>Todo listo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {onShare && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onShare(item)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                            title="Compartir estado"
                          >
                            <Share2 className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenDetail(item.surgery.id)}
                          className="h-6 px-2 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                        >
                          <span>Gestionar</span>
                          <ArrowRight className="w-2.5 h-2.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
