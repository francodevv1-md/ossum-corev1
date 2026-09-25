"use client"

import { useState, useEffect } from "react"
import type { PreparationState } from "@/types"
import type { SurgeryGestionFormData } from "@/types/coordinadores.types"
import { PreparationStateSelect } from "@/components/shared/selectors/PreparationStateSelect"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Package, Box, Truck, FileText, Check, X } from "lucide-react"

interface EditMaterialsModalProps {
  isOpen: boolean
  onClose: () => void
  formData: SurgeryGestionFormData
  onSave: (updates: Partial<SurgeryGestionFormData>) => void
  patientName?: string
  visibleNumber?: string
}

const TRANSPORT_OPTIONS = [
  "",
  "Flete propio",
  "Remis / Mensajería",
  "Transporte expreso",
  "Retira instrumentador",
  "Retira médico / particular",
  "Logística tercerizada",
]

export function EditMaterialsModal({
  isOpen,
  onClose,
  formData,
  onSave,
  patientName,
  visibleNumber,
}: EditMaterialsModalProps) {
  const [procedure, setProcedure] = useState(formData.procedure || "")
  const [boxId, setBoxId] = useState(formData.boxId || "")
  const [remitoId, setRemitoId] = useState(formData.remitoId || "")
  const [preparationState, setPreparationState] = useState<PreparationState>(
    formData.preparationState || "Sin preparar"
  )
  const [materialTransport, setMaterialTransport] = useState(
    formData.materialTransport || ""
  )

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setProcedure(formData.procedure || "")
      setBoxId(formData.boxId || "")
      setRemitoId(formData.remitoId || "")
      setPreparationState(formData.preparationState || "Sin preparar")
      setMaterialTransport(formData.materialTransport || "")
    }
  }, [isOpen, formData])

  const handleApply = () => {
    onSave({
      procedure,
      boxId,
      remitoId,
      preparationState,
      materialTransport,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-lg p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-[#1D2FC0] dark:text-blue-400 shadow-2xs border border-blue-100 dark:border-blue-900">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Editar Pedido de Materiales y Logística
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {visibleNumber ? <strong className="text-slate-700 dark:text-slate-300">{visibleNumber}</strong> : "Expediente"}{" "}
                  {patientName ? `· ${patientName}` : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Procedimiento / Pedido */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
              Detalle del Pedido de Materiales / Procedimiento
            </label>
            <textarea
              rows={3}
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              placeholder="Ej: Reemplazo Total de Rodilla - Caja Instrumental + Prótesis..."
              className="w-full p-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Caja / Set Asignado */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                Caja / Set Asignado
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={boxId}
                  onChange={(e) => setBoxId(e.target.value)}
                  placeholder="Ej: BOX-01 / Set Rodilla..."
                  className="w-full h-9 pl-8 pr-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
                />
                <Box className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Remito de Despacho */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                Remito de Despacho Asignado
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={remitoId}
                  onChange={(e) => setRemitoId(e.target.value)}
                  placeholder="Ej: R-0001-00001234..."
                  className="w-full h-9 pl-8 pr-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors"
                />
                <FileText className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Estado de Preparación */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                Estado de Preparación
              </label>
              <PreparationStateSelect
                value={preparationState}
                onChange={(newPrep) => {
                  if (newPrep) setPreparationState(newPrep)
                }}
                includeAllOption={false}
                className="h-9"
              />
            </div>

            {/* Transporte / Envío */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                Transporte / Envío
              </label>
              <div className="relative">
                <select
                  value={materialTransport}
                  onChange={(e) => setMaterialTransport(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-[#1D2FC0]/20 focus:border-[#1D2FC0] transition-colors cursor-pointer"
                >
                  <option value="">Sin definir</option>
                  {TRANSPORT_OPTIONS.filter(Boolean).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Truck className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all rounded-lg cursor-pointer shadow-2xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1D2FC0] hover:bg-[#18269e] text-white rounded-lg shadow-xs hover:shadow active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aplicar Cambios</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
