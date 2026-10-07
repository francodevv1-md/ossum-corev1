"use client"

import React, { useState } from "react"
import {
  Sparkles,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Stethoscope,
  Building2,
  CreditCard,
  Calendar,
  FileCheck,
  RotateCcw,
  AlertTriangle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AiUploadZone } from "@/components/cirugias/AiUploadZone"
import { AiResultsPanel } from "@/components/cirugias/AiResultsPanel"
import type { AutorizacionAIResponse } from "@/lib/validators/autorizacion-ai"
import type { Contacto } from "@/types"
import { cn } from "@/lib/utils"

export type AiLateralRailProps = {
  isOpen: boolean
  onClose: () => void
  companyId: string | null
  isProcessing: boolean
  error: string | null
  result: AutorizacionAIResponse | null
  uploadedFile: File | null
  saveAuthorizationImage: boolean
  onToggleSaveAuthorizationImage: (checked: boolean) => void
  onFileSelected: (file: File) => void
  onApplyAll: () => void
  onReset: () => void
  hasApplied: boolean
  onReviewData: () => void
  // Fast field actions
  onApplyField: (field: "patient" | "surgeon" | "institution" | "client" | "date" | "probableDate" | "provincia") => void
  patientValue?: string
  surgeonValue?: string
  institutionValue?: string
  clientValue?: string
  dateValue?: string
}

export function AiLateralRail({
  isOpen,
  onClose,
  companyId,
  isProcessing,
  error,
  result,
  uploadedFile,
  saveAuthorizationImage,
  onToggleSaveAuthorizationImage,
  onFileSelected,
  onApplyAll,
  onReset,
  hasApplied,
  onReviewData,
  onApplyField,
  patientValue,
  surgeonValue,
  institutionValue,
  clientValue,
  dateValue,
}: AiLateralRailProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  if (!isOpen) return null

  const extracted = result?.extracted

  return (
    <aside
      aria-label="Panel asistente de IA"
      className={cn(
        "flex flex-col border-l border-border/80 bg-muted/15 min-h-0",
        "w-80 max-w-[340px] shrink-0 overflow-hidden transition-all duration-200"
      )}
    >
      {/* Header del Riel */}
      <div className="shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b border-border/80 bg-background/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center size-6 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
            <Sparkles className="size-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-foreground truncate">Asistente IA</h4>
            <p className="text-[10px] text-muted-foreground truncate">
              {result ? "Propuestas de extracción" : "Carga de autorización"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {result && (
            <Badge
              variant={result.looks_like_authorization ? "default" : "secondary"}
              className={cn(
                "text-[9px] px-1.5 py-0 h-4",
                result.looks_like_authorization && "bg-emerald-600 hover:bg-emerald-600"
              )}
            >
              {Math.round(result.confidence * 100)}% conf.
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Cerrar panel IA"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
        {!companyId ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            No se detectó una empresa activa. Verificá la sesión para usar esta opción.
          </div>
        ) : !result ? (
          /* Zona de subida compacta */
          <div className="space-y-2">
            <div className="rounded-lg border border-border/80 bg-card p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">
                Cargá la orden o autorización médica
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                El asistente extraerá automáticamente paciente, médico, pagador y fechas para completar el caso en segundos.
              </p>
            </div>
            <AiUploadZone
              isProcessing={isProcessing}
              error={error}
              onFileSelected={onFileSelected}
            />
          </div>
        ) : (
          /* Propuestas detectadas con acciones rápidas */
          <div className="space-y-3">
            {/* Banner de estado global */}
            {hasApplied ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Propuestas aplicadas
                    </p>
                    <p className="text-[10px] text-emerald-800/90 dark:text-emerald-300/80">
                      Los datos fueron volcados a las columnas correspondientes.
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={onReviewData}
                  >
                    Revisar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={onReset}
                  >
                    <RotateCcw className="size-2.5 mr-1" /> Reintentar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 bg-card p-2 rounded-lg border border-border/70">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {uploadedFile?.name || "Documento analizado"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Revisá las sugerencias por entidad
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 px-2.5 shrink-0"
                  onClick={onApplyAll}
                >
                  Aplicar todo
                </Button>
              </div>
            )}

            {/* Tarjetas resumidas de propuesta por entidad */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                Entidades detectadas
              </p>

              {/* Paciente */}
              {extracted?.paciente && (
                <div className="rounded-lg border border-border/80 bg-card p-2.5 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="size-3" />
                      <span className="text-[11px] font-medium">Paciente</span>
                    </div>
                    {patientValue?.trim() ? (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="size-2.5" /> Asignado
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-foreground break-words">
                    Sugerido: {extracted.paciente}
                  </p>
                  {extracted.dni && (
                    <p className="text-[10px] text-muted-foreground">DNI: {extracted.dni}</p>
                  )}
                  <div className="pt-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                      onClick={() => onApplyField("patient")}
                    >
                      Pasar a campo
                    </Button>
                  </div>
                </div>
              )}

              {/* Médico */}
              {extracted?.medico && (
                <div className="rounded-lg border border-border/80 bg-card p-2.5 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Stethoscope className="size-3" />
                      <span className="text-[11px] font-medium">Médico</span>
                    </div>
                    {surgeonValue?.trim() ? (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="size-2.5" /> Asignado
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-foreground break-words">
                    Sugerido: {extracted.medico}
                  </p>
                  <div className="pt-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                      onClick={() => onApplyField("surgeon")}
                    >
                      Pasar a campo
                    </Button>
                  </div>
                </div>
              )}

              {/* Institución */}
              {extracted?.institucion && (
                <div className="rounded-lg border border-border/80 bg-card p-2.5 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="size-3" />
                      <span className="text-[11px] font-medium">Institución</span>
                    </div>
                    {institutionValue?.trim() ? (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="size-2.5" /> Asignada
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-foreground break-words">
                    Sugerido: {extracted.institucion}
                  </p>
                  <div className="pt-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                      onClick={() => onApplyField("institution")}
                    >
                      Pasar a campo
                    </Button>
                  </div>
                </div>
              )}

              {/* Cliente / Pagador / Obra Social */}
              {extracted?.obra_social && (
                <div className="rounded-lg border border-border/80 bg-card p-2.5 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CreditCard className="size-3" />
                      <span className="text-[11px] font-medium">Pagador / Cobertura</span>
                    </div>
                    {clientValue?.trim() ? (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="size-2.5" /> Asignado
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-foreground break-words">
                    Sugerido: {extracted.obra_social}
                  </p>
                  <div className="pt-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                      onClick={() => onApplyField("client")}
                    >
                      Pasar a campo
                    </Button>
                  </div>
                </div>
              )}

              {/* Fecha detectada */}
              {extracted?.fecha_cirugia && (
                <div className="rounded-lg border border-border/80 bg-card p-2.5 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="size-3" />
                      <span className="text-[11px] font-medium">Fecha de Cirugía</span>
                    </div>
                    {dateValue?.trim() ? (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="size-2.5" /> Asignada
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Sugerido: {extracted.fecha_cirugia}
                  </p>
                  <div className="pt-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                      onClick={() => onApplyField("date")}
                    >
                      Pasar a campo
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox para guardar comprobante de autorización */}
            {uploadedFile && (
              <div className="flex items-start space-x-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <Checkbox
                  id="save-auth-file-checkbox"
                  checked={saveAuthorizationImage}
                  onCheckedChange={(checked) => onToggleSaveAuthorizationImage(Boolean(checked))}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="save-auth-file-checkbox"
                  className="cursor-pointer text-[11px] font-medium text-emerald-950 dark:text-emerald-200 leading-tight"
                >
                  Fijar imagen como comprobante de autorización en Seguimiento
                </Label>
              </div>
            )}

            {/* Acordeón de detalles de extracción técnica */}
            <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-2.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                onClick={() => setDetailsExpanded(!detailsExpanded)}
              >
                <span className="flex items-center gap-1.5">
                  <FileCheck className="size-3.5 text-muted-foreground" />
                  Detalles técnicos de extracción
                </span>
                {detailsExpanded ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </button>

              {detailsExpanded && (
                <div className="p-2.5 pt-0 border-t border-border/60">
                  <AiResultsPanel
                    result={result}
                    onApply={onApplyAll}
                    onReset={onReset}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
