"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/formatters"
import { CX_STATE_COLORS, PREP_STATE_COLORS } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"
import type { Surgery } from "@/types"

interface FichaCirugiaProps {
  surgery: Surgery
}

function Section({ title, accent = false, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border p-4", accent ? "border-sky-200 bg-sky-50/60" : "border-slate-200 bg-white")}>
      <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{title}</h3>
      {children}
    </section>
  )
}

function ReadonlyField({ label, value, prominent = false }: { label: string; value: React.ReactNode; prominent?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={cn("text-[13px] leading-5 text-slate-900", prominent && "text-[22px] font-semibold leading-none text-sky-800")}>{value || "—"}</p>
    </div>
  )
}

function ReferencePill({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-slate-900">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  )
}

export function FichaCirugia({ surgery }: FichaCirugiaProps) {
  const cxColorClass = CX_STATE_COLORS[surgery.state] || "bg-gray-400 text-white"
  const prepColorClass = PREP_STATE_COLORS[surgery.preparationState] || "bg-gray-400 text-white"

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Section title="Programación" accent>
          <div className="space-y-4">
            <ReadonlyField label="Fecha CX" value={formatDate(surgery.date)} prominent />
            <div className="grid gap-4 border-t border-sky-100 pt-3 sm:grid-cols-3">
              <ReadonlyField label="Hora" value={surgery.time || "—"} />
              <ReadonlyField label="Fecha probable" value={surgery.probableDate ? formatDate(surgery.probableDate) : "—"} />
              <ReadonlyField label="Envío material" value={surgery.fechaEnvioMaterial ? formatDate(surgery.fechaEnvioMaterial) : "—"} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">Estado CX</p>
                <Badge className={cn("mt-1 rounded-md px-2 py-1 text-xs font-semibold hover:opacity-100", cxColorClass)}>{surgery.state}</Badge>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Preparación</p>
                <Badge className={cn("mt-1 rounded-md px-2 py-1 text-xs font-semibold hover:opacity-100", prepColorClass)}>{surgery.preparationState}</Badge>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Contexto clínico">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <ReadonlyField label="Clasificación" value={surgery.classification} />
            <ReadonlyField label="Procedimiento" value={surgery.procedure} />
            <ReadonlyField label="Médico" value={surgery.surgeon} />
            <ReadonlyField label="Institución" value={surgery.institution} />
            <ReadonlyField label="Ciudad" value={surgery.institutionCity} />
            <ReadonlyField label="Provincia / localidad" value={[surgery.provincia, surgery.localidad].filter(Boolean).join(" · ") || "—"} />
          </div>
        </Section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Gestión operativa">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <ReadonlyField label="Urgente" value={surgery.urgente ? <Badge variant="destructive" className="h-5 px-2 text-[10px]">URGENTE</Badge> : "No"} />
            <ReadonlyField label="Coordinador" value={surgery.coordinadorCx || "Sin asignar"} />
            <ReadonlyField label="Vendedor" value={surgery.vendedor || "Sin asignar"} />
            <ReadonlyField label="Instrumentador" value={surgery.instrumentador || "Sin asignar"} />
            <ReadonlyField label="Tipo de gestión" value={surgery.tipoGestion || "—"} />
            <ReadonlyField label="Titular" value={surgery.titular || "—"} />
          </div>
        </Section>

        <Section title="Referencias administrativas">
          {surgery.referenciasAdministrativas?.some((ref) => ref.valor) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {surgery.referenciasAdministrativas.filter((ref) => ref.valor).map((ref) => (
                <ReferencePill key={ref.id} label={ref.tipo} value={ref.valor} detail={ref.observacion} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin referencias administrativas cargadas.</p>
          )}
        </Section>
      </div>

      <Section title="Observaciones">
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <ReadonlyField label="Leyenda / observaciones" value={surgery.leyenda || "—"} />
        </div>
      </Section>
    </div>
  )
}
