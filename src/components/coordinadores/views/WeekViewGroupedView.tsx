"use client"

import React from "react"
import type { WeekDayGroup } from "@/types/coordinadores.types"
import type { Surgery } from "@/types"
import { formatDate } from "@/lib/formatters"
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  UserCircle,
  CalendarClock,
  Bell,
  Share2,
  Loader2,
  Building2,
  MapPin,
  ShieldAlert,
  Calendar,
} from "lucide-react"
import { useCoordinatorActions } from "@/hooks/useCoordinatorActions"
import { cn } from "@/lib/utils"

interface WeekViewGroupedViewProps {
  weekGroups: WeekDayGroup[]
  selectedSurgeryId: string | null
  onSelectSurgery: (surgery: Surgery) => void
  onDefineDate?: (surgery: Surgery) => void
  onShareSurgery?: (surgery: Surgery) => void
  isCoordinatorPersonalView?: boolean
  unscheduledSurgeries?: Surgery[]
  visibleCols?: Record<string, boolean>
  columnOrder?: string[]
  compactMode?: boolean
  stickyColumns?: boolean
}

export function WeekViewGroupedView({
  weekGroups,
  selectedSurgeryId,
  onSelectSurgery,
  onDefineDate,
  onShareSurgery,
  isCoordinatorPersonalView = false,
  unscheduledSurgeries = [],
  visibleCols = {
    date: true,
    cx: true,
    patient: true,
    surgeon: true,
    institution: true,
    provincia: true,
    clientOs: false,
    coordinadorCx: true,
    state: true,
    pendientes: true,
    quick_actions: true,
    actions: true,
  },
  columnOrder = [
    "date",
    "cx",
    "patient",
    "surgeon",
    "institution",
    "provincia",
    "clientOs",
    "coordinadorCx",
    "state",
    "pendientes",
    "quick_actions",
    "actions",
  ],
  compactMode = false,
  stickyColumns = true,
}: WeekViewGroupedViewProps) {
  const { requestDate, notifyCoordinator, loadingAction, confirmDialog } = useCoordinatorActions()

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

  const pyClass = compactMode ? "py-1.5" : "py-2.5"
  const activeCols = columnOrder.filter((key) => visibleCols[key] !== false)

  const getHeaderTitle = (key: string) => {
    switch (key) {
      case "date":
        return "Fecha / Hito"
      case "cx":
        return "ID CX"
      case "patient":
        return "Paciente"
      case "surgeon":
        return "Médico"
      case "institution":
        return "Institución"
      case "provincia":
        return "Provincia"
      case "clientOs":
        return "Obra Social / Financiador"
      case "coordinadorCx":
        return "Coordinador"
      case "state":
        return "Estado & Prep"
      case "pendientes":
        return "Pendiente / Alerta"
      case "quick_actions":
        return "Acciones Rápidas"
      case "actions":
        return "Gestión"
      default:
        return key
    }
  }

  const renderFechaBlock = (s: Surgery) => {
    if (!s.date || s.date.trim() === "") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/60 whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
          <span>Sin fecha</span>
        </span>
      )
    }

    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">
          {formatDate(s.date)}
        </span>
        {s.time && (
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap">
            <Clock className="w-2.5 h-2.5 text-slate-400" /> {s.time}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Main Grouped Week Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs animate-in fade-in-50 duration-200">
        <table className="w-full text-left border-collapse text-xs min-w-[1250px]">
          <thead>
            <tr className="bg-slate-50/95 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              {activeCols.map((colKey) => {
                const isStickyLeftDate = stickyColumns && colKey === "date"
                const isStickyLeftCx = stickyColumns && colKey === "cx"
                const isStickyRight = stickyColumns && colKey === "actions"

                return (
                  <th
                    key={colKey}
                    className={cn(
                      "px-3 font-semibold",
                      pyClass,
                      isStickyLeftDate && "sticky left-0 z-20 bg-slate-50/95 dark:bg-slate-850 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)]",
                      isStickyLeftCx && "sticky left-[100px] z-20 bg-slate-50/95 dark:bg-slate-850 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]",
                      isStickyRight && "sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-850 text-right shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.3)]",
                      colKey === "actions" && !isStickyRight && "text-right"
                    )}
                  >
                    {getHeaderTitle(colKey)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {weekGroups.map((group) => {
              return (
                <React.Fragment key={group.dateString}>
                  {/* Day Separator Subheader Row */}
                  <tr
                    className={cn(
                      "border-y border-slate-200 dark:border-slate-800 select-none",
                      group.isToday
                        ? "bg-blue-50/90 dark:bg-blue-950/60 border-l-4 border-l-[#1D2FC0]"
                        : "bg-slate-100/80 dark:bg-slate-800/70 border-l-4 border-l-slate-300 dark:border-l-slate-600"
                    )}
                  >
                    <td colSpan={activeCols.length} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Calendar className={cn("w-3.5 h-3.5", group.isToday ? "text-[#1D2FC0]" : "text-slate-500")} />
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                            {group.dayName} {group.formattedDate}
                          </span>
                          {group.isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1D2FC0] text-white shadow-2xs">
                              HOY
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {group.alertCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                              <AlertTriangle className="w-3 h-3" />
                              {group.alertCount} {group.alertCount === 1 ? "alerta" : "alertas"}
                            </span>
                          )}
                          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {group.surgeries.length} {group.surgeries.length === 1 ? "cirugía" : "cirugías"}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Day Surgeries Rows */}
                  {group.surgeries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeCols.length}
                        className="px-6 py-4 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-white/50 dark:bg-slate-900/50"
                      >
                        Sin cirugías programadas para este día
                      </td>
                    </tr>
                  ) : (
                    group.surgeries.map((s) => {
                      const isAlert = s.urgente || s.state === "Suspendida" || s.state === "Cancelada"
                      const isSelected = selectedSurgeryId === s.id
                      const currentLoading = loadingAction[s.id]

                      return (
                        <tr
                          key={s.id}
                          onClick={() => onSelectSurgery(s)}
                          className={cn(
                            "transition-colors duration-100 cursor-pointer group",
                            isSelected
                              ? "bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-inset ring-[#1D2FC0]/30"
                              : isAlert
                              ? "bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/50 dark:hover:bg-rose-950/30"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                          )}
                        >
                          {activeCols.map((colKey) => {
                            const isStickyLeftDate = stickyColumns && colKey === "date"
                            const isStickyLeftCx = stickyColumns && colKey === "cx"
                            const isStickyRight = stickyColumns && colKey === "actions"

                            const stickyBg = isSelected
                              ? "bg-[#EEF2FF] dark:bg-blue-950"
                              : isAlert
                              ? "bg-[#FFF9F9] dark:bg-slate-900"
                              : "bg-white dark:bg-slate-900 group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/80"

                            switch (colKey) {
                              case "date":
                                return (
                                  <td
                                    key={colKey}
                                    className={cn(
                                      "px-3 relative",
                                      pyClass,
                                      isStickyLeftDate && `sticky left-0 z-10 ${stickyBg} shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)]`
                                    )}
                                  >
                                    {isAlert && (
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                                    )}
                                    {renderFechaBlock(s)}
                                  </td>
                                )

                              case "cx":
                                return (
                                  <td
                                    key={colKey}
                                    className={cn(
                                      "px-3 whitespace-nowrap",
                                      pyClass,
                                      isStickyLeftCx && `sticky left-[100px] z-10 ${stickyBg} shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]`
                                    )}
                                  >
                                    <span className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-[#1D2FC0] transition-colors">
                                      {s.visibleNumber || s.id}
                                    </span>
                                    {s.procedure && !compactMode && (
                                      <span className="block text-[10px] text-slate-400 truncate max-w-[130px]">
                                        {s.procedure}
                                      </span>
                                    )}
                                  </td>
                                )

                              case "patient":
                                return (
                                  <td key={colKey} className={cn("px-3 max-w-[200px]", pyClass)}>
                                    <span className="font-semibold text-slate-900 dark:text-white block truncate">
                                      {s.patient}
                                    </span>
                                    {s.patientDni && !compactMode && (
                                      <span className="text-slate-400 text-[10px] block font-mono">
                                        DNI: {s.patientDni}
                                      </span>
                                    )}
                                  </td>
                                )

                              case "surgeon":
                                return (
                                  <td key={colKey} className={cn("px-3 max-w-[170px]", pyClass)}>
                                    <span className="text-slate-700 dark:text-slate-200 block truncate font-medium">
                                      {s.surgeon ? `Dr. ${s.surgeon}` : "Sin asignar"}
                                    </span>
                                  </td>
                                )

                              case "institution":
                                return (
                                  <td key={colKey} className={cn("px-3 max-w-[180px]", pyClass)}>
                                    <div className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-300">
                                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{s.institution || "—"}</span>
                                    </div>
                                  </td>
                                )

                              case "provincia":
                                return (
                                  <td key={colKey} className={cn("px-3 whitespace-nowrap", pyClass)}>
                                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{s.institutionCity || "—"}</span>
                                    </div>
                                  </td>
                                )

                              case "clientOs":
                                return (
                                  <td key={colKey} className={cn("px-3 max-w-[160px]", pyClass)}>
                                    <span className="text-slate-600 dark:text-slate-400 block truncate">
                                      {s.obraSocial || s.client || s.financiador || "—"}
                                    </span>
                                  </td>
                                )

                              case "coordinadorCx":
                                return (
                                  <td key={colKey} className={cn("px-3 whitespace-nowrap", pyClass)}>
                                    <div className="flex items-center gap-1.5">
                                      <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                                      <span
                                        className={`text-xs ${
                                          !s.coordinadorCx || s.coordinadorCx === "Sin asignar"
                                            ? "text-slate-500 dark:text-slate-400 italic"
                                            : "text-slate-800 dark:text-slate-200 font-medium"
                                        }`}
                                      >
                                        {s.coordinadorCx || "Sin asignar"}
                                      </span>
                                    </div>
                                  </td>
                                )

                              case "state":
                                return (
                                  <td key={colKey} className={cn("px-3 whitespace-nowrap", pyClass)}>
                                    <div className="flex flex-col gap-0.5">
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-2xs tracking-wide w-fit",
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
                                      {s.preparationState && !compactMode && (
                                        <span className="text-[10px] text-slate-500 font-medium pl-0.5">
                                          Prep: <strong className="text-slate-700 dark:text-slate-300">{s.preparationState}</strong>
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )

                              case "pendientes":
                                return (
                                  <td key={colKey} className={cn("px-3 max-w-[170px]", pyClass)}>
                                    {s.urgente ? (
                                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-[11px] whitespace-nowrap">
                                        <ShieldAlert className="w-3 h-3" /> Urgente
                                      </span>
                                    ) : !s.date ? (
                                      <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] whitespace-nowrap">
                                        Definir fecha
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[11px] truncate block">
                                        {s.leyenda || "En seguimiento"}
                                      </span>
                                    )}
                                  </td>
                                )

                              case "quick_actions":
                                return (
                                  <td key={colKey} className={cn("px-3 whitespace-nowrap", pyClass)}>
                                    <div
                                      className="flex items-center gap-1.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {isCoordinatorPersonalView ? (
                                        /* In Personal Coordinator View */
                                        <>
                                          {!s.date && (
                                            <button
                                              type="button"
                                              onClick={() => (onDefineDate ? onDefineDate(s) : onSelectSurgery(s))}
                                              title="Definir fecha de cirugía"
                                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold shadow-2xs transition-transform active:scale-95 cursor-pointer"
                                            >
                                              <CalendarClock className="w-3 h-3" />
                                              <span>Definir fecha</span>
                                            </button>
                                          )}

                                          {onShareSurgery && (
                                            <button
                                              type="button"
                                              onClick={() => onShareSurgery(s)}
                                              title="Compartir caso (Plantilla médico / Correo formal)"
                                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-transform active:scale-95 cursor-pointer"
                                            >
                                              <Share2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                              <span>Compartir</span>
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        /* In Admin View */
                                        <>
                                          {!s.date && (
                                            <button
                                              type="button"
                                              onClick={() => requestDate(s)}
                                              disabled={currentLoading === "request-date"}
                                              title="Solicitar fecha de cirugía al coordinador"
                                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-semibold hover:bg-amber-100 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                                            >
                                              {currentLoading === "request-date" ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <CalendarClock className="w-3 h-3 text-amber-600" />
                                              )}
                                              <span>Solicitar fecha</span>
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => notifyCoordinator(s)}
                                            disabled={currentLoading === "notify"}
                                            title="Enviar notificación interna al coordinador"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-medium hover:bg-slate-200 transition-transform active:scale-95 cursor-pointer"
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
                                  </td>
                                )

                              case "actions":
                                return (
                                  <td
                                    key={colKey}
                                    className={cn(
                                      "px-3 text-right whitespace-nowrap",
                                      pyClass,
                                      isStickyRight && `sticky right-0 z-10 ${stickyBg} shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.3)]`
                                    )}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onSelectSurgery(s)
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1D2FC0] text-white hover:bg-[#152399] font-medium text-[11px] shadow-2xs transition-all active:scale-95 cursor-pointer"
                                    >
                                      <span>Gestionar</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </td>
                                )

                              default:
                                return null
                            }
                          })}
                        </tr>
                      )
                    })
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Unscheduled Surgeries Section */}
      {unscheduledSurgeries.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-amber-100 dark:border-amber-950">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Cirugías pendientes de fecha ({unscheduledSurgeries.length})
              </h4>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
              Casos activos que requieren programación
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {unscheduledSurgeries.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSurgery(s)}
                className="p-3 rounded-lg border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/40 dark:hover:bg-amber-900/40 transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {s.visibleNumber || s.id}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                      Sin fecha
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {s.patient}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Dr. {s.surgeon || "Sin asignar"} · {s.institution}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectSurgery(s)
                  }}
                  className="px-2.5 py-1.5 rounded-md bg-[#1D2FC0] hover:bg-[#18269e] text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                >
                  <span>Poner fecha</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  )
}
