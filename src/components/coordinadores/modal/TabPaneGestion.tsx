import { useState } from "react"
import type { SurgeryGestionFormData } from "@/types/coordinadores.types"
import type { SurgeryState, PreparationState } from "@/types"
import { SurgeryStateSelect } from "@/components/shared/selectors/SurgeryStateSelect"
import {
  PreparationStateSelect,
  PREPARATION_STATE_CONFIGS,
} from "@/components/shared/selectors/PreparationStateSelect"
import { EditMaterialsModal } from "./EditMaterialsModal"
import {
  AlertTriangle,
  Calendar,
  Clock,
  Truck,
  UserCheck,
  ShieldAlert,
  Package,
  Box,
  FileText,
  Pencil,
} from "lucide-react"

interface TabPaneGestionProps {
  formData: SurgeryGestionFormData
  onChange: (updates: Partial<SurgeryGestionFormData>) => void
  coordinators: string[]
  patientName?: string
  visibleNumber?: string
}

const PREPARATION_OPTIONS: PreparationState[] = [
  "Sin preparar",
  "En preparación",
  "Congelado",
  "Congelado con faltantes",
  "Enviado",
  "Entregado",
  "Retirado",
]

const TRANSPORT_OPTIONS = [
  "",
  "Flete propio",
  "Remis / Mensajería",
  "Transporte expreso",
  "Retira instrumentador",
  "Retira médico / particular",
  "Logística tercerizada",
]

export function TabPaneGestion({
  formData,
  onChange,
  coordinators,
  patientName,
  visibleNumber,
}: TabPaneGestionProps) {
  const [isEditMaterialsOpen, setIsEditMaterialsOpen] = useState(false)

  const prepConfig =
    PREPARATION_STATE_CONFIGS[formData.preparationState] ||
    PREPARATION_STATE_CONFIGS["Sin preparar"]

  return (
    <div className="flex flex-col gap-5 text-xs">
      {/* 1. Pedido de Materiales y Logística Quirúrgica (Visualización Compacta + Edición en Modal) */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1D2FC0] dark:text-blue-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Pedido de Materiales y Logística
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Detalle del pedido de instrumental, sets asignados y logística
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditMaterialsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1D2FC0] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-900 rounded-lg shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar Materiales</span>
          </button>
        </div>

        {/* Visualización del Pedido y Datos de Material */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Detalle del Pedido */}
          <div className="sm:col-span-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
              Detalle del Pedido / Procedimiento
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
              {formData.procedure || (
                <span className="text-slate-400 italic font-normal">Sin detalle especificado</span>
              )}
            </p>
          </div>

          {/* Caja / Set Asignado */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Box className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Caja / Set Asignado
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {formData.boxId || <span className="text-slate-400 font-normal italic">Sin asignar</span>}
              </span>
            </div>
          </div>

          {/* Remito de Despacho */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Remito de Despacho
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {formData.remitoId || <span className="text-slate-400 font-normal italic">Sin remito</span>}
              </span>
            </div>
          </div>

          {/* Estado de Preparación */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 shrink-0">
              <span className={`w-3.5 h-3.5 rounded-full inline-block ${prepConfig.dotClass}`} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Preparación
              </span>
              <PreparationStateSelect
                value={formData.preparationState || ""}
                onChange={(preparationState) => onChange({ preparationState: preparationState as PreparationState })}
                includeAllOption={false}
                className="h-8 w-full bg-transparent text-xs font-semibold"
              />
            </div>
          </div>

          {/* Transporte / Envío */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Transporte / Envío
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {formData.materialTransport || <span className="text-slate-400 font-normal italic">Sin definir</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Modal para editar materiales */}
        <EditMaterialsModal
          isOpen={isEditMaterialsOpen}
          onClose={() => setIsEditMaterialsOpen(false)}
          formData={formData}
          onSave={onChange}
          patientName={patientName}
          visibleNumber={visibleNumber}
        />
      </div>

      {/* 2. Fechas, Horarios y Disponibilidad */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1D2FC0] dark:text-blue-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Fechas, Horarios y Disponibilidad
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cronograma quirúrgico, despacho y disponibilidad de stock en depósito
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fecha CX */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
              Fecha de Cirugía (CX)
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className="w-full h-9 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
            />
          </div>

          {/* Hora CX */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
              Hora de Cirugía
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className="w-full h-9 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
            />
          </div>

          {/* Fecha Envío Material */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
              Fecha de Envío de Material
            </label>
            <input
              type="date"
              value={formData.fechaEnvioMaterial}
              onChange={(e) => onChange({ fechaEnvioMaterial: e.target.value })}
              className="w-full h-9 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
            />
          </div>

          {/* Hora Envío Material */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
              Hora Límite de Envío
            </label>
            <input
              type="time"
              value={formData.horaEnvio}
              onChange={(e) => onChange({ horaEnvio: e.target.value })}
              className="w-full h-9 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
            />
          </div>

          {/* Disponibilidad de Material */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                Fecha de Disponibilidad de Material en Depósito
              </label>
              {formData.materialAvailabilityDate ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Definida: {formData.materialAvailabilityDate}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Sin definir en depósito
                </span>
              )}
            </div>
            <input
              type="date"
              value={formData.materialAvailabilityDate}
              onChange={(e) => onChange({ materialAvailabilityDate: e.target.value })}
              className="w-full h-9 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 3. Responsables y Asignaciones */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1D2FC0] dark:text-blue-400">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Responsables y Asignaciones
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Coordinador de caso e instrumentación en quirófano
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Coordinador Asignado */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
              Coordinador Asignado
            </label>
            <select
              value={formData.coordinadorCx}
              onChange={(e) => onChange({ coordinadorCx: e.target.value })}
              className="w-full h-9 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors cursor-pointer"
            >
              <option value="Sin asignar">Sin asignar</option>
              {coordinators.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Instrumentador Asignado */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
              Instrumentador Quirúrgico
            </label>
            <input
              type="text"
              placeholder="Nombre del instrumentador..."
              value={formData.instrumentador}
              onChange={(e) => onChange({ instrumentador: e.target.value })}
              className="w-full h-9 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 4. Estado General de Cirugía */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1D2FC0] dark:text-blue-400">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Estado General del Caso
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Estado general del expediente y flujo quirúrgico
            </p>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
            Estado de Cirugía
          </label>
          <SurgeryStateSelect
            value={formData.state}
            onChange={(newState) => {
              if (newState) {
                onChange({ state: newState })
              }
            }}
            includeAllOption={false}
            className="h-9"
          />
        </div>
      </div>

      {/* 4. Marca de Urgencia y Observaciones */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1D2FC0] dark:text-blue-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Prioridad y Observaciones
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Marcas operativas visibles para el equipo y notas internas
            </p>
          </div>
        </div>

        {/* Urgente Checkbox Card */}
        <div
          className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
            formData.urgente
              ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-800 dark:text-red-200 shadow-2xs"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          }`}
          onClick={() => onChange({ urgente: !formData.urgente })}
        >
          <input
            type="checkbox"
            id="urgente-toggle"
            checked={formData.urgente}
            onChange={(e) => onChange({ urgente: e.target.checked })}
            className="w-4 h-4 text-[#1D2FC0] rounded focus:ring-[#1D2FC0] cursor-pointer"
          />
          <label htmlFor="urgente-toggle" className="font-semibold cursor-pointer flex items-center gap-2 text-xs">
            <AlertTriangle
              className={`w-4 h-4 ${
                formData.urgente ? "text-red-600 animate-pulse" : "text-slate-400"
              }`}
            />
            <span>Marcar caso como Atención Urgente / Prioritaria</span>
          </label>
        </div>

        {/* Leyenda / Observación Operativa */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
            Observación / Leyenda Operativa Visible
          </label>
          <input
            type="text"
            value={formData.leyenda}
            onChange={(e) => onChange({ leyenda: e.target.value })}
            placeholder="Ej: Material listo para retirar por instrumentador a las 14hs..."
            className="w-full h-9 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
          />
        </div>

        {/* Notas Rápidas de Supervisión */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
            Notas de Coordinación / Supervisión
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Indicaciones para el equipo o registro interno..."
            className="w-full p-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors resize-y"
          />
        </div>
      </div>
    </div>
  )
}
