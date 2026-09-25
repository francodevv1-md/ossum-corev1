"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/formatters"
import {
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  History,
  MapPin,
  MessageSquareText,
  Package,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  User,
  UserRoundCog,
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

// ─── Props ────────────────────────────────────────────────────────
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

const PREP_TEXT_COLOR: Record<string, string> = {
  "Sin preparar": "text-slate-700 dark:text-slate-200",
  "En preparación": "text-sky-700 dark:text-sky-300",
  "Congelado": "text-amber-700 dark:text-amber-300",
  "Congelado con faltantes": "text-orange-700 dark:text-orange-300",
  "Entregado": "text-teal-700 dark:text-teal-300",
  "Retirado": "text-slate-700 dark:text-slate-200",
}

const PREP_DOT_COLOR: Record<string, string> = {
  "Sin preparar": "bg-slate-400",
  "En preparación": "bg-sky-500 ring-2 ring-sky-200 dark:ring-sky-900",
  "Congelado": "bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900",
  "Congelado con faltantes": "bg-orange-500 ring-2 ring-orange-200 dark:ring-orange-900",
  "Entregado": "bg-teal-500 ring-2 ring-teal-200 dark:ring-teal-900",
  "Retirado": "bg-slate-500 ring-2 ring-slate-200 dark:ring-slate-800",
}

// ─── Section Container with subtle Hover Microinteraction ─────────
function SectionContainer({
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
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)

  return (
    <section className="rounded-lg border border-slate-200/90 bg-[#F9FBFD] shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
      <div
        className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white/70 px-3.5 py-2 transition-colors dark:border-slate-800 dark:bg-slate-900/60"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={isHeaderHovered ? { scale: 1.15, rotate: -4 } : { scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="flex items-center justify-center text-slate-600 dark:text-slate-400"
          >
            <Icon className="size-3.5" />
          </motion.div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="p-3 sm:p-3.5">{children}</div>
    </section>
  )
}

// ─── Property Field (Microcontenedor con jerarquía de dominio) ────
function PropertyField({
  label,
  value,
  emptyText = "—",
  className,
  valueClassName,
  icon: Icon,
  accentColor,
  children,
}: {
  label: string
  value?: React.ReactNode
  emptyText?: string
  className?: string
  valueClassName?: string
  icon?: React.ComponentType<{ className?: string }>
  accentColor?: string
  children?: React.ReactNode
}) {
  const isSimpleEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")

  const isOperativeAbsence =
    value === "Sin asignar" ||
    value === "Sin PR asociado" ||
    value === "Sin definir" ||
    emptyText === "Sin asignar" ||
    emptyText === "Sin PR asociado"

  return (
    <div
      className={cn(
        "group flex min-w-0 flex-col justify-center rounded-[6px] border border-slate-200/80 bg-[#F2F5F9] px-3 py-1.5 transition-all hover:border-slate-300 hover:shadow-2xs dark:border-slate-800/80 dark:bg-slate-950/60 dark:hover:border-slate-700",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            className={cn(
              "size-3 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300",
              accentColor
            )}
          />
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "truncate pt-0.5 text-[13px] font-bold leading-snug text-slate-950 dark:text-slate-50",
          isSimpleEmpty && !isOperativeAbsence && "font-normal italic text-slate-400 dark:text-slate-500",
          isOperativeAbsence && isSimpleEmpty && "text-[12px] font-medium text-slate-500 dark:text-slate-400",
          valueClassName
        )}
      >
        {children ?? (isSimpleEmpty ? emptyText : value)}
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

  const findRef = (tipo: string) =>
    surgery.referenciasAdministrativas?.find((r) => r.tipo === tipo && r.valor)
  const refInterna = findRef("Ref") || findRef("Expediente") || findRef("Otro")
  const refAutorizacion = findRef("Autorización")
  const refSiniestro = findRef("Siniestro")

  const prepDot = PREP_DOT_COLOR[surgery.preparationState] || "bg-slate-400"

  return (
    <div className="space-y-3">
      {/* ─────────────────────────────────────────────────────────
          SECCIÓN 1 — Datos de la cirugía
      ───────────────────────────────────────────────────────── */}
      <SectionContainer
        title="Datos de la cirugía"
        icon={ClipboardList}
        action={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              className="group h-6.5 gap-1.5 rounded border-slate-300 bg-white px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={onEditFicha}
            >
              <motion.div
                className="flex items-center"
                whileHover={{ rotate: -15 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Pencil className="size-3 text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200" />
              </motion.div>
              <span>Editar ficha</span>
            </Button>
          </motion.div>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-2.5">
          {/* Dominio Temporal / Fechas */}
          <PropertyField
            label="Fecha CX"
            icon={Calendar}
            accentColor="text-sky-600 dark:text-sky-400"
            value={formatDate(surgery.date)}
            valueClassName="text-sky-900 dark:text-sky-200 text-[13.5px] font-extrabold"
          />

          <PropertyField
            label="Clasificación"
            icon={ClipboardList}
            accentColor="text-indigo-500 dark:text-indigo-400"
            value={surgery.classification}
            valueClassName="text-slate-900 dark:text-slate-100"
          />

          {/* Dominio Profesional / Médico */}
          <PropertyField
            label="Médico"
            icon={Stethoscope}
            accentColor="text-teal-600 dark:text-teal-400"
            value={surgery.surgeon}
            valueClassName="text-slate-950 dark:text-slate-50"
          />

          {/* Dominio Operativo / Material */}
          <PropertyField
            label="Disponibilidad"
            icon={Package}
            accentColor="text-amber-600 dark:text-amber-400"
            value={
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-bold",
                  PREP_TEXT_COLOR[surgery.preparationState] || "text-slate-950"
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", prepDot)} />
                <span className="truncate">{surgery.preparationState}</span>
              </span>
            }
          />

          <PropertyField
            label="Envío material"
            icon={Clock}
            value={surgery.fechaEnvioMaterial ? formatDate(surgery.fechaEnvioMaterial) : ""}
            emptyText="—"
          />

          <PropertyField
            label="Fecha probable"
            icon={Calendar}
            value={surgery.probableDate ? formatDate(surgery.probableDate) : ""}
            emptyText="—"
          />

          {/* Dominio Lugar / Institución */}
          <PropertyField
            label="Institución"
            icon={Building2}
            accentColor="text-emerald-600 dark:text-emerald-400"
            value={surgery.institution}
            valueClassName="text-emerald-950 dark:text-emerald-200 font-bold"
            className="col-span-2"
          />

          {/* Dominio Comercial / Cliente */}
          <PropertyField
            label="Cliente / Financiador"
            icon={ShieldCheck}
            accentColor="text-blue-600 dark:text-blue-400"
            value={surgery.client || surgery.financiador || surgery.obraSocial}
            valueClassName="text-slate-950 dark:text-slate-50 font-bold"
            className="col-span-2"
          />

          <PropertyField
            label="Notas internas"
            icon={FileText}
            value={surgery.leyenda}
            emptyText="—"
            className="col-span-2"
          />
        </div>
      </SectionContainer>

      {/* ─────────────────────────────────────────────────────────
          SECCIÓN 2 — Gestión del caso
      ───────────────────────────────────────────────────────── */}
      <SectionContainer title="Gestión del caso" icon={FolderKanban}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-2.5">
          <PropertyField
            label="Urgente"
            value={
              surgery.urgente ? (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
                  Sí
                  <Badge variant="destructive" className="h-4 px-1 text-[9px] font-bold">
                    URGENTE
                  </Badge>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                  No <X className="size-3" />
                </span>
              )
            }
          />

          <PropertyField
            label="Coordinador"
            icon={UserRoundCog}
            accentColor="text-violet-600 dark:text-violet-400"
            value={surgery.coordinadorCx}
            emptyText="Sin asignar"
            valueClassName="text-slate-950 dark:text-slate-50"
          />

          <PropertyField
            label="Vendedor"
            icon={User}
            value={surgery.vendedor}
            emptyText="Sin asignar"
          />

          <PropertyField
            label="Instrumentista"
            icon={User}
            value={surgery.instrumentador}
            emptyText="Sin asignar"
          />

          {/* Comprobante PR */}
          <PropertyField
            label="PR asociado"
            icon={FileText}
            accentColor="text-sky-600 dark:text-sky-400"
            value={
              pr ? (
                <span className="inline-flex items-center gap-1 font-bold text-sky-950 dark:text-sky-200">
                  <span>{pr.id}</span>
                  {pr.createdAt && (
                    <span className="text-[10px] font-normal text-slate-500">
                      ({formatDate(pr.createdAt)})
                    </span>
                  )}
                </span>
              ) : (
                "Sin PR asociado"
              )
            }
            emptyText="Sin PR asociado"
          />

          <PropertyField label="Ref. interna" value={refInterna?.valor} emptyText="—" />
          <PropertyField label="N° autorización" value={refAutorizacion?.valor} emptyText="—" />
          <PropertyField label="Siniestro" value={refSiniestro?.valor} emptyText="—" />
        </div>
      </SectionContainer>

      {/* ─────────────────────────────────────────────────────────
          SECCIÓN 3 — Destino y facturación
      ───────────────────────────────────────────────────────── */}
      <SectionContainer title="Destino y facturación" icon={MapPin}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Destino */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <MapPin className="size-3" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider">
                Destino (Sanatorio / Entrega)
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PropertyField
                label="Remitir a"
                icon={Building2}
                value={surgery.aQuienRemitir || surgery.institution || "Sin definir"}
                valueClassName="text-emerald-950 dark:text-emerald-200 font-bold"
              />
              <PropertyField label="Ciudad" value={surgery.institutionCity} emptyText="—" />
              {surgery.institution && surgery.aQuienRemitir && surgery.institution !== surgery.aQuienRemitir ? (
                <PropertyField
                  label="Institución"
                  icon={Building2}
                  value={surgery.institution}
                  className="sm:col-span-2"
                  valueClassName="text-emerald-950 dark:text-emerald-200 font-bold"
                />
              ) : null}
            </div>
          </div>

          {/* Facturación */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
              <ReceiptText className="size-3" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider">
                Facturación (Entidad comercial)
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PropertyField
                label="Facturar a"
                icon={ReceiptText}
                value={surgery.aQuienFacturar || surgery.client || surgery.financiador || "Sin definir"}
                valueClassName="text-slate-950 dark:text-slate-50 font-bold"
              />
              <PropertyField
                label="Financiador / Cliente"
                icon={ShieldCheck}
                value={[surgery.client, surgery.financiador, surgery.obraSocial].filter(Boolean).join(" · ")}
                emptyText="—"
                valueClassName="text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <RemitosSummaryCard surgeryId={surgery.id} onViewRemitos={onViewRemitos} />
        </div>
      </SectionContainer>

      {/* ─────────────────────────────────────────────────────────
          SECCIÓN 4 — Novedades e historial
      ───────────────────────────────────────────────────────── */}
      <SectionContainer
        title="Novedades e historial"
        icon={History}
        action={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              className="group h-6.5 gap-1.5 rounded border-slate-300 bg-white px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={onAddNote}
            >
              <motion.div
                className="flex items-center"
                whileHover={{ rotate: 90 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Plus className="size-3 text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200" />
              </motion.div>
              <span>Agregar nota</span>
            </Button>
          </motion.div>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-slate-200/80 dark:lg:divide-slate-800">
          {/* Últimas notas */}
          <div className="lg:pr-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MessageSquareText className="size-3" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider">
                Últimas notas
              </h4>
            </div>
            {notes.length > 0 ? (
              <div className="space-y-1.5">
                {notes
                  .slice(-3)
                  .reverse()
                  .filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="rounded-[6px] border border-slate-200/70 bg-[#F2F5F9] p-2 dark:border-slate-800/80 dark:bg-slate-950/60"
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="px-1 py-0 text-[8px] font-semibold">
                          {n.type}
                        </Badge>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400">
                          {formatDate(n.date)} {n.time}
                        </span>
                        <span className="ml-auto text-[9px] font-medium text-slate-500">{n.userName}</span>
                      </div>
                      <p className="mt-1 text-[12px] font-medium leading-snug text-slate-900 dark:text-slate-100">
                        {n.text}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-[6px] border border-slate-200/60 bg-[#F2F5F9]/60 px-3 py-2 text-[11px] italic text-slate-400 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-500">
                Sin notas registradas
              </div>
            )}
          </div>

          {/* Actividad reciente */}
          <div className="pt-2 lg:pl-4 lg:pt-0">
            <div className="mb-1.5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <History className="size-3" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider">
                Actividad reciente
              </h4>
            </div>
            {recentHistory.length > 0 ? (
              <div className="space-y-1.5 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                {recentHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="relative rounded-[6px] border border-slate-200/70 bg-[#F2F5F9] p-2 dark:border-slate-800/80 dark:bg-slate-950/60"
                  >
                    <span className="absolute -left-[18px] top-3 size-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <p className="text-[12px] font-bold text-slate-950 dark:text-slate-50">
                      {entry.action}
                    </p>
                    {entry.details && (
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {entry.details}
                      </p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400">
                      <Clock className="size-2.5" />
                      {entry.userName} · {formatDate(entry.date)} {entry.time}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[6px] border border-slate-200/60 bg-[#F2F5F9]/60 px-3 py-2 text-[11px] italic text-slate-400 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-500">
                Sin actividad reciente
              </div>
            )}
          </div>
        </div>
      </SectionContainer>
    </div>
  )
}
