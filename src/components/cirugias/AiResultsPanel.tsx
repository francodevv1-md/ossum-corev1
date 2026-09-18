"use client"

import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MaterialAutorizadoDetails } from "@/components/cirugias/MaterialAutorizadoDetails"
import { aiConfig } from "@/lib/services/ai/config"
import type { AutorizacionAIResponse } from "@/lib/validators/autorizacion-ai"

type AiResultsPanelProps = {
  result: AutorizacionAIResponse
  onApply: () => void
  onReset: () => void
}

type ReferenceEntry = {
  label: string
  value: string
}

function buildDetectedReferences(result: AutorizacionAIResponse): ReferenceEntry[] {
  const { extracted } = result

  return [
    extracted.dni ? { label: "DNI", value: extracted.dni } : null,
    extracted.numero_autorizacion ? { label: "Autorización", value: extracted.numero_autorizacion } : null,
    extracted.numero_siniestro ? { label: "Siniestro", value: extracted.numero_siniestro } : null,
    extracted.numero_poliza ? { label: "Póliza", value: extracted.numero_poliza } : null,
    extracted.obra_social ? { label: "Obra social", value: extracted.obra_social } : null,
    extracted.fecha_autorizacion ? { label: "Fecha autorización", value: extracted.fecha_autorizacion } : null,
  ].filter((item): item is ReferenceEntry => item !== null)
}

function hasLocationSuggestion(result: AutorizacionAIResponse): boolean {
  return Boolean(result.extracted.provincia_sugerida || result.extracted.localidad_sugerida)
}

function renderConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

function compactText(value: string, fallback: string): string {
  const trimmed = value.trim()
  return trimmed || fallback
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[11px]">
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground break-words">{value}</dd>
    </div>
  )
}

function CollapsibleSection({
  title,
  summary,
  children,
}: {
  title: string
  summary?: string
  children: ReactNode
}) {
  return (
    <details className="group rounded-md border border-border/60 bg-muted/10 px-2.5 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px]">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        {summary ? <span className="text-[10px] text-muted-foreground truncate">{summary}</span> : null}
      </summary>
      <div className="mt-2 space-y-1.5">{children}</div>
    </details>
  )
}

export function AiResultsPanel({ result, onApply, onReset }: AiResultsPanelProps) {
  const { extracted } = result
  const references = buildDetectedReferences(result)
  const isLowConfidence = result.confidence < aiConfig.confidenceThreshold
  const canApply = result.looks_like_authorization !== false

  return (
    <div className="rounded-lg border border-border/70 bg-background/95 p-3">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">Resultado de extracción IA</h4>
            <p className="text-xs text-muted-foreground">
              Revisá los datos detectados antes de aplicarlos al formulario.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[10px]">Provider: {result.provider}</Badge>
            <Badge variant={result.looks_like_authorization ? "success" : "warning"} className="text-[10px]">
              {result.looks_like_authorization ? "Parece autorización" : "Documento dudoso"}
            </Badge>
            {isLowConfidence ? (
              <span
                title="Confianza baja — revisá los datos antes de aplicar."
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <AlertTriangle className="size-3.5" />
                Confianza baja · {renderConfidence(result.confidence)}
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
          <CollapsibleSection
            title="Datos principales"
            summary={[compactText(extracted.paciente, "—"), compactText(extracted.fecha_probable, "—")].filter((value) => value !== "—").join(" · ") || "Sin datos clave"}
          >
            <dl className="space-y-1.5">
              <SummaryRow label="Paciente" value={compactText(extracted.paciente, "—")} />
              <SummaryRow label="Médico" value={compactText(extracted.medico, "—")} />
              <SummaryRow label="Institución" value={compactText(extracted.institucion, "—")} />
              <SummaryRow label="Fecha cirugía" value={compactText(extracted.fecha_cirugia, "—")} />
              <SummaryRow label="Fecha probable" value={compactText(extracted.fecha_probable, "—")} />
            </dl>
          </CollapsibleSection>

          <CollapsibleSection
            title="Referencias detectadas"
            summary={references.length > 0 ? `${references.length} referencias` : "Sin referencias"}
          >
            {references.length > 0 ? (
              <dl className="space-y-1.5">
                {references.map((reference) => (
                  <SummaryRow key={`${reference.label}-${reference.value}`} label={reference.label} value={reference.value} />
                ))}
              </dl>
            ) : (
              <p className="text-[11px] text-muted-foreground">No se detectaron referencias administrativas.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Patología sugerida"
            summary={compactText(extracted.patologia_sugerida, "Sin patología")}
          >
            <p className="text-[11px] text-foreground">{compactText(extracted.patologia_sugerida, "Sin patología detectada")}</p>
          </CollapsibleSection>

          <CollapsibleSection
            title="Ubicación sugerida"
            summary={hasLocationSuggestion(result)
              ? `${compactText(extracted.provincia_sugerida, "—")}${extracted.localidad_sugerida ? ` · ${extracted.localidad_sugerida}` : ""}`
              : "Sin ubicación"}
          >
            {hasLocationSuggestion(result) ? (
              <p className="text-[11px]">
                <span className="text-muted-foreground">Provincia:</span> {compactText(extracted.provincia_sugerida, "—")}
                {extracted.localidad_sugerida ? <><span className="text-muted-foreground"> · Localidad:</span> {extracted.localidad_sugerida}</> : null}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Sin ubicación detectada.</p>
            )}
          </CollapsibleSection>

          <MaterialAutorizadoDetails items={extracted.material_autorizado} />

          <CollapsibleSection
            title="Observaciones"
            summary={extracted.observaciones.trim() ? "Con observaciones" : "Sin observaciones"}
          >
            <p className="whitespace-pre-wrap text-[11px] text-muted-foreground">
              {compactText(extracted.observaciones, "Sin observaciones detectadas.")}
            </p>
          </CollapsibleSection>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <p className="text-[11px] text-muted-foreground">
            La acción aplica solo campos vacíos. Revisá antes de confirmar.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              Limpiar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              disabled={!canApply}
              title={!canApply ? "El documento no parece una autorización" : undefined}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Aplicar al formulario
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
