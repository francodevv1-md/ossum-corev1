"use client"

import type { CoordinadorViewMode } from "@/types/coordinadores.types"
import { Calendar as CalendarIcon, CalendarDays, CalendarRange } from "lucide-react"

interface ViewModeSwitcherProps {
  currentView: CoordinadorViewMode
  onViewChange: (view: CoordinadorViewMode) => void
}

export function ViewModeSwitcher({ currentView, onViewChange }: ViewModeSwitcherProps) {
  const options: { id: CoordinadorViewMode; label: string; icon: React.ReactNode }[] = [
    { id: "day", label: "Período", icon: <CalendarIcon className="w-3.5 h-3.5" /> },
    { id: "week", label: "Semana", icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: "month", label: "Mes", icon: <CalendarRange className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {options.map((option) => {
        const isActive = currentView === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onViewChange(option.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              isActive
                ? "bg-white dark:bg-slate-900 text-[#1D2FC0] dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
