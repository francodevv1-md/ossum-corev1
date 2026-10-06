"use client"

import { useState, useEffect, useRef } from "react"
import type { ReschedulingSaveResult } from "@/lib/surgery/rescheduling"
import type { Surgery, HistoryEntry } from "@/types"
import type { CoordinadorModalTab, SurgeryGestionFormData } from "@/types/coordinadores.types"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { CaseDetailModalHeader } from "./CaseDetailModalHeader"
import { TabPaneGestion } from "./TabPaneGestion"
import { TabPaneAdjuntos } from "./TabPaneAdjuntos"
import { TabPaneComprobantes } from "./TabPaneComprobantes"
import { TabPaneReportes } from "./TabPaneReportes"
import { NovedadesTabContent } from "@/components/expediente/NovedadesTabContent"
import { Check } from "lucide-react"
import { toast } from "sonner"

interface CaseDetailModalProps {
  surgery: Surgery | null
  isOpen: boolean
  onClose: () => void
  onSaveGestion: (surgeryId: string, updates: SurgeryGestionFormData) => Promise<void | ReschedulingSaveResult>
  onAddNote: (surgeryId: string, note: string) => void
  onShare?: (surgery: Surgery) => void
  history: HistoryEntry[]
  coordinators: string[]
}

export function CaseDetailModal({
  surgery,
  isOpen,
  onClose,
  onSaveGestion,
  onAddNote,
  onShare,
  history,
  coordinators,
}: CaseDetailModalProps) {
  const [activeTab, setActiveTab] = useState<CoordinadorModalTab>("gestion")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saving = useRef(false), session = useRef(0)
  useEffect(() => {
    session.current += 1; saving.current = false; setIsSaving(false); setSaveError(null)
    return () => { session.current += 1 }
  }, [surgery?.id, isOpen])
  const [formData, setFormData] = useState<SurgeryGestionFormData>({
    date: "",
    time: "",
    fechaEnvioMaterial: "",
    horaEnvio: "",
    coordinadorCx: "Sin asignar",
    state: "Pendiente",
    preparationState: "Sin preparar",
    materialAvailabilityDate: "",
    materialTransport: "",
    instrumentador: "",
    urgente: false,
    leyenda: "",
    notes: "",
    procedure: "",
    boxId: "",
    remitoId: "",
  })

  // Sync formData when surgery opens
  useEffect(() => {
    if (surgery) {
      setFormData({
        date: surgery.date || "",
        time: surgery.time || "",
        fechaEnvioMaterial: surgery.fechaEnvioMaterial || "",
        horaEnvio: surgery.horaEnvio || "",
        coordinadorCx: surgery.coordinadorCx || "Sin asignar",
        state: surgery.state || "Pendiente",
        preparationState: surgery.preparationState || "Sin preparar",
        materialAvailabilityDate: surgery.materialAvailabilityDate || "",
        materialTransport: surgery.materialTransport || "",
        instrumentador: surgery.instrumentador || "",
        urgente: Boolean(surgery.urgente),
        leyenda: surgery.leyenda || "",
        notes: surgery.notes || "",
        procedure: surgery.procedure || "",
        boxId: surgery.boxId || "",
        remitoId: surgery.remitoId || "",
      })
      setActiveTab("gestion")
    }
  }, [surgery, isOpen])

  const handleFormUpdate = (updates: Partial<SurgeryGestionFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    if (!surgery || saving.current) return
    const generation = session.current
    saving.current = true; setIsSaving(true); setSaveError(null)
    try {
      const result = await onSaveGestion(surgery.id, formData)
      if (generation === session.current) {
        if (result?.partialError) { setSaveError(result.partialError); if (result.noteSaved) setFormData((previous) => ({ ...previous, notes: "" })) }
        else { toast.success("Cambios guardados"); onClose() }
      }
    } catch (error) {
      if (generation === session.current) setSaveError(error instanceof Error ? error.message : "No se pudo guardar")
    } finally {
      if (generation === session.current) { saving.current = false; setIsSaving(false) }
    }
  }

  return (
    <Sheet
      open={isOpen && Boolean(surgery)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-full sm:max-w-[720px] md:max-w-[860px] lg:max-w-[980px] xl:max-w-[1100px] h-full p-0 flex flex-col gap-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden [&>button]:hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{surgery?.patient || "Detalle de Cirugía"}</SheetTitle>
          <SheetDescription>{surgery?.id || ""}</SheetDescription>
        </SheetHeader>

        {surgery && (
          <>
            {/* Header */}
            <CaseDetailModalHeader
              surgery={surgery}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={onClose}
              onSave={handleSave}
              isSaving={isSaving}
              onShare={onShare}
            />

            {/* Scrollable Body */}
            <fieldset disabled={isSaving} className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1 min-h-0 scrollbar-thin bg-slate-50/40 dark:bg-slate-900/40">
              {saveError && <p role="alert">{saveError}</p>}
              {activeTab === "gestion" && (
                <TabPaneGestion
                  formData={formData}
                  onChange={handleFormUpdate}
                  coordinators={coordinators}
                  patientName={surgery.patient}
                  visibleNumber={surgery.visibleNumber || surgery.id}
                />
              )}

              {activeTab === "seguimiento" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2 sm:p-4 shadow-2xs">
                  <NovedadesTabContent surgery={surgery} />
                </div>
              )}

              {activeTab === "adjuntos" && <TabPaneAdjuntos surgery={surgery} />}

              {activeTab === "comprobantes" && <TabPaneComprobantes surgery={surgery} />}

              {activeTab === "reportes" && <TabPaneReportes surgery={surgery} />}
            </fieldset>

            {/* Footer Actions */}
            <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
                Expediente: <strong className="text-slate-700 dark:text-slate-300">{surgery.visibleNumber || surgery.id}</strong>
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                <span className="text-slate-600 dark:text-slate-400">{surgery.patient}</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none text-center px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer rounded-lg shadow-2xs"
                >
                  Cancelar
                </button>

                {activeTab === "gestion" && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-[#1D2FC0] hover:bg-[#18269e] text-white shadow-xs hover:shadow active:scale-95 transition-all cursor-pointer rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
