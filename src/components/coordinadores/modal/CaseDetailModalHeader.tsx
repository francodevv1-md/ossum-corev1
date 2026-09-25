"use client"

import type { Surgery } from "@/types"
import type { CoordinadorModalTab } from "@/types/coordinadores.types"
import {
  X,
  Sliders,
  MessageSquare,
  Paperclip,
  User,
  Calendar,
  MapPin,
  CalendarClock,
  Bell,
  Share2,
  Loader2,
  Receipt,
  FileBarChart2,
} from "lucide-react"
import { formatDate } from "@/lib/formatters"
import { useCoordinatorActions } from "@/hooks/useCoordinatorActions"

interface CaseDetailModalHeaderProps {
  surgery: Surgery
  activeTab: CoordinadorModalTab
  onTabChange: (tab: CoordinadorModalTab) => void
  onClose: () => void
  onSave?: () => void
  onShare?: (surgery: Surgery) => void
}

export function CaseDetailModalHeader({
  surgery,
  activeTab,
  onTabChange,
  onClose,
  onSave,
  onShare,
}: CaseDetailModalHeaderProps) {
  const { requestDate, notifyCoordinator, loadingAction, confirmDialog } = useCoordinatorActions()
  const currentLoading = loadingAction[surgery.id]

  const tabs: { id: CoordinadorModalTab; label: string; icon: React.ReactNode }[] = [
    { id: "gestion", label: "Gestión", icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: "seguimiento", label: "Seguimiento", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "adjuntos", label: "Adjuntos", icon: <Paperclip className="w-3.5 h-3.5" /> },
    { id: "comprobantes", label: "Comprobantes", icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: "reportes", label: "Reportes", icon: <FileBarChart2 className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="bg-[#071935] text-white border-b border-slate-800 shrink-0 select-none">
      {/* Top Header Row: Patient Info + Actions */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
        {/* Left: Identifier, Title, and Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="px-2 py-0.5 font-mono font-bold text-xs bg-[#1D2FC0] text-white rounded">
              {surgery.visibleNumber || surgery.id}
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
              {surgery.patient}
            </h2>
            {surgery.urgente && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase animate-pulse">
                Urgente
              </span>
            )}
          </div>

          {/* Metadata Strip */}
          <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Dr. {surgery.surgeon || "Sin asignar"}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{surgery.institution || "Sin institución"}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className={!surgery.date ? "text-amber-400 font-semibold" : ""}>
                {surgery.date ? formatDate(surgery.date) : "Sin fecha confirmada"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Quick Actions */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {!surgery.date && (
            <button
              type="button"
              onClick={() => requestDate(surgery)}
              disabled={currentLoading === "request-date"}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer rounded-lg"
            >
              {currentLoading === "request-date" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CalendarClock className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Solicitar fecha</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => notifyCoordinator(surgery)}
            disabled={currentLoading === "notify"}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-transform active:scale-95 cursor-pointer rounded-lg"
          >
            {currentLoading === "notify" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span className="hidden sm:inline">Notificar</span>
          </button>

          {onShare && (
            <button
              type="button"
              onClick={() => onShare(surgery)}
              title="Compartir caso"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-transform active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {activeTab === "gestion" && onSave && (
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1D2FC0] hover:bg-[#18269e] text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer rounded-lg"
            >
              <span>Guardar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            aria-label="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="px-5 flex items-center gap-1 border-t border-slate-800/80 bg-slate-900/40">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-[#1D2FC0] text-white bg-slate-800/60"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      {confirmDialog}
    </div>
  )
}
