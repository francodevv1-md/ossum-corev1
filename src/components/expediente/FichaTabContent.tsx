"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/formatters"
import {
  CalendarDays,
  Clock,
  FileText,
  History,
  MapPin,
  PencilLine,
  Plus,
  StickyNote,
  Wrench,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RemitosSummaryCard } from "./RemitosSummaryCard"
import type {
  Comprobante,
  HistoryEntry,
  Presupuesto,
  Remito,
  Surgery,
  SurgeryNote,
} from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"

// ─── Props (preserved exactly) ───────────────────────────────────
interface FichaTabContentProps {
  surgery: Surgery
  presupuestos: Presupuesto[]
  comprobantes: Comprobante[]
  remitos: Remito[]
  notes: SurgeryNote[]
  history: HistoryEntry[]
  resumenCobranza?: ResumenCobranzaSurgery
  onAddNote: () => void
  onEditFicha: () => void
  onViewRemitos?: () => void
}

// ─── Local style tokens ──────────────────────────────────────────
/**
 * NOTE: project has no `text-primary` token; spec fallback
 * `text-slate-800` is used for section titles, and `text-sky-700`
 * for section icons (closest canonical primary tone).
 */
const SECTION_TITLE_CLS = "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100"
const SUBSECTION_TITLE_CLS = "text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300"
const LABEL_CLS = "text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400"
const VALUE_CLS = "text-[13px] font-semibold leading-5 text-slate-950 dark:text-slate-100"
const EMPTY_CLS = "italic text-slate-500 dark:text-slate-400"

const PREP_TEXT_COLOR: Record<string, string> = {
  "Sin preparar": "text-slate-700 dark:text-slate-200",
  "En preparación": "text-sky-700 dark:text-sky-300",
  "Congelado": "text-amber-700 dark:text-amber-300",
  "Congelado con faltantes": "text-orange-700 dark:text-orange-300",
  "Entregado": "text-teal-700 dark:text-teal-300",
  "Retirado": "text-slate-700 dark:text-slate-200",
}

// Availability dot color derived from preparationState (bg-only subset).
const PREP_DOT_COLOR: Record<string, string> = {
  "Sin preparar": "bg-slate-400",
  "En preparación": "bg-sky-500",
  "Congelado": "bg-amber-500",
  "Congelado con faltantes": "bg-orange-500",
  "Entregado": "bg-teal-500",
  "Retirado": "bg-slate-500",
}

// ─── Section card wrapper ────────────────────────────────────────
function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="text-slate-700 dark:text-slate-300">
            <Icon className="size-4" />
          </div>
          <h3 className={SECTION_TITLE_CLS}>{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  )
}

// ─── Read-only field ─────────────────────────────────────────────
function Field({
  label,
  value,
  emptyText = "Sin asignar",
}: {
  label: string
  value?: React.ReactNode
  emptyText?: string
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  return (
    <div className="space-y-0.5">
      <p className={LABEL_CLS}>{label}</p>
      {isEmpty ? (
        <p className={cn(VALUE_CLS, EMPTY_CLS)}>{emptyText}</p>
      ) : (
        <p className={VALUE_CLS}>{value}</p>
      )}
    </div>
  )
}

function CompactListRow({
  label,
  value,
  emptyText = "Sin asignar",
  valueClassName = VALUE_CLS,
}: {
  label: string
  value?: React.ReactNode
  emptyText?: string
  valueClassName?: string
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")

  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0 dark:border-slate-800">
      <span className="min-w-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("min-w-0 text-right", isEmpty ? EMPTY_CLS : valueClassName)}>{isEmpty ? emptyText : value}</span>
    </div>
  )
}

function CompactGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className={SUBSECTION_TITLE_CLS}>{title}</p>
      <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-950/50">
        {children}
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────
export function FichaTabContent({
  surgery,
  presupuestos,
  notes,
  history,
  onAddNote,
  onEditFicha,
  onViewRemitos,
}: FichaTabContentProps) {
  const pr = presupuestos[0]
  const recentHistory = [...history]
    .sort(
      (a, b) =>
        new Date(`${b.date}T${b.time ?? "00:00"}`).getTime() -
        new Date(`${a.date}T${a.time ?? "00:00"}`).getTime()
    )
    .slice(0, 4)

  // Referencias administrativas lookup by tipo.
  const findRef = (tipo: string) =>
    surgery.referenciasAdministrativas?.find((r) => r.tipo === tipo && r.valor)
  const refInterna =
    findRef("Ref") || findRef("Expediente") || findRef("Otro")
  const refAutorizacion = findRef("Autorización")
  const refSiniestro = findRef("Siniestro")

  const prepDot = PREP_DOT_COLOR[surgery.preparationState] || "bg-slate-400"

  return (
    <div className="space-y-2.5">
      {/* ─────────────────────────────────────────────────────────
          SECCIÓN 1 — Datos de la cirugía
      ───────────────────────────────────────────────────────── */}
      <SectionCard
        title="Datos de la cirugía"
        icon={CalendarDays}
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-slate-300 bg-white text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={onEditFicha}
          >
            <PencilLine className="size-3.5" />
            Editar ficha
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <CompactGroup title="Programación">
            <CompactListRow label="Fecha CX" value={formatDate(surgery.date)} valueClassName="text-[13px] font-bold text-sky-900 dark:text-sky-200" />
            <CompactListRow label="Envío" value={surgery.fechaEnvioMaterial ? formatDate(surgery.fechaEnvioMaterial) : ""} emptyText="—" />
            <CompactListRow label="Probable" value={surgery.probableDate ? formatDate(surgery.probableDate) : ""} emptyText="—" />
            <CompactListRow label="Logística" value={surgery.fechaEnvioMaterial ? formatDate(surgery.fechaEnvioMaterial) : ""} emptyText="—" />
          </CompactGroup>

          <CompactGroup title="Caso">
            <CompactListRow label="Clasificación" value={surgery.classification} />
            <CompactListRow label="Médico" value={surgery.surgeon} />
            <CompactListRow label="Institución" value={surgery.institution} />
            <CompactListRow label="Cliente" value={surgery.client || surgery.financiador || surgery.obraSocial} />
          </CompactGroup>

          <CompactGroup title="Material">
            <CompactListRow
              label="Disponibilidad"
              value={<span className={cn("inline-flex items-center gap-2", PREP_TEXT_COLOR[surgery.preparationState] || "text-slate-950")}><span className={cn("size-2 rounded-full", prepDot)} />{surgery.preparationState}</span>}
            />
            <CompactListRow label="Notas internas" value={surgery.leyenda} emptyText="—" />
          </CompactGroup>
        </div>
      </SectionCard>

      {/* ─────────────────────────────────────────────────────────
          SECCIÓN 2 — Gestión operativa
      ───────────────────────────────────────────────────────── */}
      <SectionCard title="Gestión operativa" icon={Wrench}>
        {/* Subgroup: Equipo */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <CompactGroup title="Equipo">
            <CompactListRow
              label="Urgente"
               value={surgery.urgente ? <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-300">Sí <Badge variant="destructive" className="h-4 px-1 text-[8px]">URGENTE</Badge></span> : <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">No <X className="size-3" /></span>}
            />
            <CompactListRow label="Coordinador" value={surgery.coordinadorCx} />
            <CompactListRow label="Vendedor" value={surgery.vendedor} />
            <CompactListRow label="Instrumentista" value={surgery.instrumentador} />
          </CompactGroup>

        {/* Subgroup: Documentación y Referencias */}
          <div className="space-y-1.5">
            <p className={SUBSECTION_TITLE_CLS}>Documentación y referencias</p>
            <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/50">
            {/* Comprobante PR clickable card */}
            {pr ? (
               <div className="flex cursor-pointer items-center gap-2.5 rounded-md border border-slate-300 bg-white px-3 py-2 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/80">
                  <FileText className="size-4 shrink-0 text-sky-700 dark:text-sky-300" />
                   <span className="text-[13px] font-medium text-slate-950 dark:text-slate-100">
                     {pr.id}
                  </span>
                  {pr.createdAt && (
                    <span className="text-[10px] text-slate-600 dark:text-slate-400">
                      {formatDate(pr.createdAt)}
                    </span>
                  )}
                 <Badge variant="outline" className="ml-auto border-blue-200 bg-blue-50 text-[9px] font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                  Presupuesto
                </Badge>
              </div>
             ) : (
               <p className={cn(VALUE_CLS, EMPTY_CLS)}>
                 Sin comprobante PR asociado
               </p>
             )}

              <div className="mt-2.5 grid grid-cols-1 gap-3 border-t border-slate-200 pt-2.5 dark:border-slate-700 sm:grid-cols-1 lg:grid-cols-1">
                <CompactListRow label="Ref. interna" value={refInterna?.valor} emptyText="—" />
                <CompactListRow label="N° autorización" value={refAutorizacion?.valor} emptyText="—" />
                <CompactListRow label="Siniestro" value={refSiniestro?.valor} emptyText="—" />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ─────────────────────────────────────────────────────────
          SECCIÓN 3 — Destino y facturación
      ───────────────────────────────────────────────────────── */}
      <SectionCard title="Destino y facturación" icon={MapPin}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Remitir a */}
          <CompactGroup title="Destino">
            <CompactListRow label="Remitir a" value={surgery.aQuienRemitir || surgery.institution || "Sin definir"} />
            <CompactListRow label="Ciudad" value={surgery.institutionCity} emptyText="—" />
            {surgery.institution && surgery.aQuienRemitir ? <CompactListRow label="Institución" value={surgery.institution} emptyText="—" /> : null}
          </CompactGroup>
          {/* Facturar a */}
          <CompactGroup title="Facturación">
            <CompactListRow label="Facturar a" value={surgery.aQuienFacturar || surgery.client || surgery.financiador || "Sin definir"} />
            <CompactListRow label="Cliente / financiador" value={[surgery.client, surgery.financiador, surgery.obraSocial].filter(Boolean).join(" · ")} emptyText="—" />
          </CompactGroup>
        </div>

        <div className="mt-3">
          <RemitosSummaryCard surgeryId={surgery.id} onViewRemitos={onViewRemitos} />
        </div>
      </SectionCard>

      {/* ─────────────────────────────────────────────────────────
          SECCIÓN 4 — Novedades e historial
      ───────────────────────────────────────────────────────── */}
      <SectionCard
        title="Novedades e historial"
        icon={History}
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-slate-300 bg-white text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={onAddNote}
          >
            <Plus className="size-3.5" />
            Agregar nota
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-slate-200 dark:lg:divide-slate-800">
          {/* Últimas notas */}
          <div className="lg:pr-6">
            <p className={LABEL_CLS}>Últimas notas</p>
            {notes.length > 0 ? (
              <div className="mt-2 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {notes.slice(-3).reverse().filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i).map((n) => (
                  <div
                    key={n.id}
                    className="py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] font-semibold">
                        {n.type}
                      </Badge>
                      <span className="text-[9px] text-slate-600 dark:text-slate-400">
                        {formatDate(n.date)} {n.time}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] font-medium text-slate-800 dark:text-slate-200">{n.text}</p>
                    <p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">
                      {n.userName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-md border border-dashed border-slate-300 px-3 py-4 text-center dark:border-slate-700 dark:bg-slate-950/40">
                <StickyNote className="mx-auto size-4.5 text-slate-400 dark:text-slate-500" />
                <p className="mt-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200">
                  Sin notas registradas
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Hacé clic en &quot;Agregar nota&quot; para registrar una
                  novedad.
                </p>
              </div>
            )}
          </div>

          {/* Actividad reciente */}
          <div className="lg:pl-6">
            <p className={LABEL_CLS}>Actividad reciente</p>
            {recentHistory.length > 0 ? (
              <>
                <div className="mt-2 space-y-2.5 border-l border-slate-300 pl-3 dark:border-slate-700">
                  {recentHistory.map((entry) => (
                    <div key={entry.id} className="relative">
                      <span className="absolute -left-[15px] top-1.5 size-1.5 rounded-full bg-slate-500 dark:bg-slate-400" />
                      <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                        {entry.action}
                      </p>
                      {entry.details && (
                        <p className="mt-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                          {entry.details}
                        </p>
                      )}
                      <p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400">
                        <Clock className="size-3" />
                        {entry.userName} · {formatDate(entry.date)}{" "}
                        {entry.time}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-3 h-auto p-0 text-[11px] text-slate-700 dark:text-slate-300"
                >
                  Ver historial completo
                </Button>
              </>
            ) : (
              <div className="mt-2 rounded-md border border-dashed border-slate-300 px-3 py-4 text-center dark:border-slate-700 dark:bg-slate-950/40">
                <History className="mx-auto size-4.5 text-slate-400 dark:text-slate-500" />
                <p className="mt-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200">
                  Sin actividad reciente
                </p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
