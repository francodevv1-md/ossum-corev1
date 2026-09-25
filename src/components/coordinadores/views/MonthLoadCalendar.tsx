"use client"

import type { MonthDayCell } from "@/types/coordinadores.types"
import type { Surgery } from "@/types"
import { AlertTriangle, Clock, CalendarClock, ChevronRight, UserCircle } from "lucide-react"

interface MonthLoadCalendarProps {
  monthCells: MonthDayCell[]
  selectedSurgeryId: string | null
  onSelectSurgery: (surgery: Surgery) => void
  unscheduledSurgeries?: Surgery[]
}

export function MonthLoadCalendar({
  monthCells,
  selectedSurgeryId,
  onSelectSurgery,
  unscheduledSurgeries = [],
}: MonthLoadCalendarProps) {
  const dayHeaders = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

  const getLoadBadge = (level: MonthDayCell["loadLevel"], count: number) => {
    if (count === 0) return null
    switch (level) {
      case "high":
        return "bg-red-600 text-white font-bold"
      case "medium":
        return "bg-amber-500 text-slate-950 font-bold"
      case "low":
      default:
        return "bg-emerald-600 text-white font-medium"
    }
  }

  const getStateDotColor = (state: string) => {
    switch (state) {
      case "Autorizada":
        return "bg-emerald-500 ring-emerald-300 dark:ring-emerald-900"
      case "En tránsito":
        return "bg-sky-500 ring-sky-300 dark:ring-sky-900"
      case "Pendiente":
        return "bg-amber-500 ring-amber-300 dark:ring-amber-900"
      case "Suspendida":
      case "Cancelada":
        return "bg-red-500 ring-red-300 dark:ring-red-900"
      default:
        return "bg-slate-400 ring-slate-300 dark:ring-slate-700"
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Main 7xN Calendar Grid */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-center py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          {dayHeaders.map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>

        {/* 7xN Matrix */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
          {monthCells.map((cell) => {
            return (
              <div
                key={cell.dateString + cell.dayNumber}
                className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                  !cell.isCurrentMonth
                    ? "bg-slate-50/50 dark:bg-slate-950/40 opacity-45"
                    : cell.isToday
                    ? "bg-blue-50/30 dark:bg-blue-950/20"
                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={`text-xs font-mono font-bold ${
                      cell.isToday
                        ? "w-6 h-6 rounded-full bg-[#1D2FC0] text-white flex items-center justify-center text-[11px] shadow-2xs"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  <div className="flex items-center gap-1">
                    {cell.alertCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {cell.alertCount}
                      </span>
                    )}

                    {cell.count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${getLoadBadge(
                          cell.loadLevel,
                          cell.count
                        )}`}
                      >
                        {cell.count} cx
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Surgeries preview pills with rich signs */}
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[85px] scrollbar-none">
                  {cell.surgeries.slice(0, 3).map((s) => {
                    const isSelected = selectedSurgeryId === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectSurgery(s)}
                        title={`CX ${s.visibleNumber || s.id}: ${s.patient} (${s.state})`}
                        className={`w-full text-left px-2 py-1 rounded-md text-[11px] truncate transition-colors cursor-pointer border flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? "bg-[#1D2FC0] text-white border-[#1D2FC0] shadow-xs"
                            : s.urgente
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300"
                            : "bg-slate-50 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Status Color Dot */}
                          <span
                            className={`w-2 h-2 rounded-full ring-2 shrink-0 ${getStateDotColor(
                              s.state
                            )}`}
                          />
                          <span className="font-mono font-bold truncate">
                            {s.visibleNumber || s.id}
                          </span>
                          <span className="truncate text-[10px] text-slate-600 dark:text-slate-300">
                            {s.patient.split(",")[0]}
                          </span>
                        </div>

                        {s.time && (
                          <span className="font-mono text-[9px] text-slate-400 shrink-0">
                            {s.time}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {cell.surgeries.length > 3 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold text-center font-mono">
                      +{cell.surgeries.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Unscheduled Surgeries Section (Cirugías pendientes de programar) */}
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
              Requieren definición de hito quirúrgico
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
    </div>
  )
}

