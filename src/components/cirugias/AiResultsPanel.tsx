"use client"

import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MaterialAutorizadoDetails } from "@/components/cirugias/MaterialAutorizadoDetails"
import type { AutorizacionAIResponse } from "@/lib/validators/autorizacion-ai"

type AiResultsPanelProps = {
  result: AutorizacionAIResponse
  onApply: () => void
  onReset: () => void
}

type DetectedEntry = {
  label: string
  value: string
}

function buildDetectedEntries(result: AutorizacionAIResponse): DetectedEntry[] {
  const { extracted } = result

  return [
    extracted.paciente ? { label: "Paciente", value: extracted.paciente } : null,
    extracted.dni ? { label: "DNI", value: extracted.dni } : null,
    extracted.medico ? { label: "Médico", value: extracted.medico } : null,
    extracted.institucion ? { label: "Institución", value: extracted.institucion } : null,
    extracted.obra_social ? { label: "Obra social", value: extracted.obra_social } : null,
    extracted.patologia_sugerida ? { label: "Patología", value: extracted.patologia_sugerida } : null,
    extracted.numero_autorizacion ? { label: "Autorización", value: extracted.numero_autorizacion } : null,
    extracted.numero_siniestro ? { label: "Siniestro", value: extracted.numero_siniestro } : null,
    extracted.numero_poliza ? { label: "Póliza", value: extracted.numero_poliza } : null,
    extracted.fecha_autorizacion ? { label: "Fecha autorización", value: extracted.fecha_autorizacion } : null,
    extracted.fecha_cirugia ? { label: "Fecha cirugía", value: extracted.fecha_cirugia } : null,
    extracted.fecha_probable ? { label: "Fecha probable", value: extracted.fecha_probable } : null,
    extracted.provincia_sugerida ? { label: "Provincia", value: extracted.provincia_sugerida } : null,
    extracted.localidad_sugerida ? { label: "Localidad", value: extracted.localidad_sugerida } : null,
    extracted.observaciones ? { label: "Observaciones", value: extracted.observaciones } : null,
  ].filter((item): item is DetectedEntry => item !== null)
}

function renderConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[11px]">
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] whitespace-pre-wrap text-right font-medium text-foreground break-words">{value}</dd>
    </div>
  )
}

export function AiResultsPanel({ result, onApply, onReset }: AiResultsPanelProps) {
  const { extracted } = result
  const detectedEntries = buildDetectedEntries(result)
  const confidenceLevel = result.confidence < 0.4 ? "low" : result.confidence < 0.8 ? "medium" : "high"
  const canApply = detectedEntries.length > 0 || extracted.material_autorizado.length > 0

  return (
    <div className="rounded-lg border border-border/70 bg-background p-3">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">Autorización leída</h4>
            <p className="text-xs text-muted-foreground">
              Revisá las propuestas junto a cada campo. Nada existente se reemplaza automáticamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!result.looks_like_authorization && (
              <Badge variant="warning" className="text-[10px]">Tipo de documento sin confirmar</Badge>
            )}
            {confidenceLevel !== "high" ? (
              <span
                title="Revisá los datos detectados antes de aplicarlos."
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <AlertTriangle className="size-3.5" />
                Confianza {confidenceLevel === "low" ? "baja" : "media"} · {renderConfidence(result.confidence)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Confianza {renderConfidence(result.confidence)}
              </span>
            )}
          </div>
        </div>

        {result.warnings.length > 0 && (
          <section className="space-y-1">
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Advertencias</h5>
            <ul className="list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
              {result.warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-2">
          <details className="rounded-md border border-border/60 bg-muted/10 px-2.5 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-medium text-foreground">
              <span>Ver datos detectados</span>
              <span className="text-muted-foreground">{detectedEntries.length}</span>
            </summary>
            <dl className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
              {detectedEntries.map((entry) => (
                <SummaryRow key={`${entry.label}-${entry.value}`} label={entry.label} value={entry.value} />
              ))}
            </dl>
          </details>

          <MaterialAutorizadoDetails items={extracted.material_autorizado} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              Leer otro archivo
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              disabled={!canApply}
              title={!canApply ? "No hay datos detectados para completar" : undefined}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Completar campos vacíos
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
