"use client"

import { useState } from "react"
import type { Surgery } from "@/types"
import { formatDate } from "@/lib/formatters"
import {
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCircle,
  MapPin,
  Stethoscope,
  Building2,
  CalendarClock,
  Bell,
  Share2,
  Loader2,
  Clock,
  Calendar,
  ShieldAlert,
  CreditCard,
  FileText,
} from "lucide-react"
import { useCoordinatorActions } from "@/hooks/useCoordinatorActions"
import { cn } from "@/lib/utils"

interface DayViewMobileCardsProps {
  surgeries: Surgery[]
  selectedSurgeryId: string | null
  onSelectSurgery: (surgery: Surgery) => void
  onDefineDate?: (surgery: Surgery) => void
  onShareSurgery?: (surgery: Surgery) => void
  isCoordinatorPersonalView?: boolean
}

export function DayViewMobileCards({
  surgeries,
  selectedSurgeryId,
  onSelectSurgery,
  onDefineDate,
  onShareSurgery,
  isCoordinatorPersonalView = false,
}: DayViewMobileCardsProps) {
  const { requestDate, notifyCoordinator, loadingAction, confirmDialog } = useCoordinatorActions()
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  if (surgeries.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 text-xs animate-in fade-in duration-300">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="font-semibold text-slate-700 dark:text-slate-300">No se encontraron cirugías</p>
        <p className="text-[11px] text-slate-400 mt-1">Ajustá los filtros para ver casos.</p>
      </div>
    )
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case "Pendiente":
        return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/70"
      case "Autorizada":
      case "Confirmada":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700/70"
      case "En tránsito":
      case "En preparación":
        return "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700/70"
      case "Realizada":
      case "Completada":
        return "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-700/70"
      case "Suspendida":
      case "Cancelada":
        return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700/70"
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {surgeries.map((s) => {
        const isAlert = s.urgente || s.state === "Suspendida" || s.state === "Cancelada"
        const isSelected = selectedSurgeryId === s.id
        const isExpanded = !!expandedIds[s.id]
        const currentLoading = loadingAction[s.id]

        return (
          <div
            key={s.id}
            onClick={() => toggleExpand(s.id)}
            className={cn(
              "rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900 shadow-2xs",
              isSelected
                ? "border-[#1D2FC0] ring-2 ring-[#1D2FC0]/30 bg-blue-50/20"
                : isAlert
                ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/15 hover:border-rose-300"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
            )}
          >
            {/* Alert Left Border */}
            {isAlert && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />}

            {/* Main Header / Top Line */}
            <div className="p-3.5 pb-2.5">
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {s.visibleNumber || s.id}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-2xs tracking-wide",
                      getStateColor(s.state)
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        s.state === "Pendiente"
                          ? "bg-amber-500"
                          : s.state === "Autorizada" || s.state === "Confirmada"
                          ? "bg-emerald-500"
                          : s.state === "En tránsito" || s.state === "En preparación"
                          ? "bg-blue-500"
                          : s.state === "Realizada" || s.state === "Completada"
                          ? "bg-teal-500"
                          : s.state === "Suspendida" || s.state === "Cancelada"
                          ? "bg-rose-500"
                          : "bg-slate-400"
                      )}
                    />
                    <span>{s.state}</span>
                  </span>
                  {s.urgente && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                      <ShieldAlert className="w-2.5 h-2.5" /> Urgente
                    </span>
                  )}
                </div>

                {/* Fecha / Alerta */}
                {s.date ? (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatDate(s.date)}</span>
                    {s.time && <span className="font-bold">· {s.time}</span>}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                    <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                    <span>Sin fecha</span>
                  </span>
                )}
              </div>

              {/* Paciente y Procedimiento */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {s.patient}
                  </h3>
                  {s.procedure && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{s.procedure}</p>
                  )}
                </div>

                {/* Coordinador chip */}
                <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                  <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-[11px]">
                    {s.coordinadorCx || "Sin asignar"}
                  </span>
                </div>
              </div>

              {/* Resumen Compacto: Institución y Médico */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{s.institution || "Sin institución"}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Dr. {s.surgeon || "Sin asignar"}</span>
                </div>
              </div>

              {/* Toggle de detalles desplegables */}
              <button
                type="button"
                onClick={(e) => toggleExpand(s.id, e)}
                className="mt-2.5 w-full py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-1 bg-slate-50/70 dark:bg-slate-800/50 rounded-md transition-colors"
              >
                <span>{isExpanded ? "Menos detalles" : "Ver más información (OS, Provincia, Notas)"}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Panel Desplegable con más información */}
              {isExpanded && (
                <div
                  className="mt-2.5 p-3 rounded-lg bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Provincia / Localidad
                      </span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {s.institutionCity || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Obra Social / Prepaga
                      </span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1 mt-0.5">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        {s.obraSocial || s.client || s.financiador || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Preparación Logística
                      </span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium mt-0.5 block">
                        {s.preparationState || "Sin preparar"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        DNI Paciente
                      </span>
                      <span className="text-slate-700 dark:text-slate-200 font-mono mt-0.5 block">
                        {s.patientDni || "—"}
                      </span>
                    </div>
                  </div>

                  {(s.notes || s.leyenda) && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Notas / Pendientes
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 italic">
                        {s.notes || s.leyenda}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer con Acciones Rápidas y Gestión */}
            <div
              className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {isCoordinatorPersonalView ? (
                  <>
                    {!s.date && (
                      <button
                        type="button"
                        onClick={() => (onDefineDate ? onDefineDate(s) : onSelectSurgery(s))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold shadow-2xs active:scale-95 transition-transform"
                      >
                        <CalendarClock className="w-3 h-3" />
                        <span>Definir fecha</span>
                      </button>
                    )}

                    {onShareSurgery && (
                      <button
                        type="button"
                        onClick={() => onShareSurgery(s)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold active:scale-95 transition-transform"
                      >
                        <Share2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Compartir</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {!s.date && (
                      <button
                        type="button"
                        onClick={() => requestDate(s)}
                        disabled={currentLoading === "request-date"}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-semibold active:scale-95 transition-transform"
                      >
                        {currentLoading === "request-date" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CalendarClock className="w-3 h-3 text-amber-600" />
                        )}
                        <span>Pedir fecha</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => notifyCoordinator(s)}
                      disabled={currentLoading === "notify"}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold active:scale-95 transition-transform"
                    >
                      {currentLoading === "notify" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Bell className="w-3 h-3 text-slate-500" />
                      )}
                      <span>Notificar</span>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectSurgery(s)
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D2FC0] hover:bg-[#18269e] text-white text-xs font-semibold shadow-2xs active:scale-95 transition-all"
              >
                <span>Gestionar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
      {confirmDialog}
    </div>
  )
}
