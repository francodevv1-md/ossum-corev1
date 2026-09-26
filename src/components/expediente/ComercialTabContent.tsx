"use client"

import React from "react"
import { ComprobantesAsociados } from "@/components/expediente/ComprobantesAsociados"
import { formatCurrency } from "@/lib/formatters"
import { Receipt } from "lucide-react"
import { PresupuestoPanel } from "./PresupuestoPanel"
import type { Surgery, Presupuesto, Remito, Box, Comprobante } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"

interface ComercialTabContentProps {
  surgery: Surgery
  presupuestos: Presupuesto[]
  onOpenPresupuestoDialog?: (surgery: Surgery) => void
  remitos: Remito[]
  box?: Box
  comprobantes: Comprobante[]
  resumenCobranza: ResumenCobranzaSurgery
}

const SECTION_TITLE_CLS = "text-[13px] font-bold uppercase tracking-wider text-slate-800"
const LABEL_CLS = "text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500"

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-sky-50 p-1.5 text-sky-700">
            <Icon className="size-4" />
          </div>
          <h3 className={SECTION_TITLE_CLS}>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  )
}

export function ComercialTabContent({
  surgery,
  presupuestos,
  comprobantes,
  resumenCobranza,
}: ComercialTabContentProps) {
  const latestPR = presupuestos[0]

  return (
    <div className="space-y-3">
      <PresupuestoPanel surgery={surgery} />
      <SectionCard
        title="Comprobantes asociados"
        icon={Receipt}
      >
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2">
            <p className={LABEL_CLS}>Cliente</p>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{surgery.client || surgery.financiador || surgery.obraSocial || "—"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2">
            <p className={LABEL_CLS}>Presupuesto base</p>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{latestPR?.id || "Sin PR generado"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2">
            <p className={LABEL_CLS}>Saldo pendiente</p>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{resumenCobranza.saldoPendiente > 0 ? formatCurrency(resumenCobranza.saldoPendiente) : "Sin saldo"}</p>
          </div>
        </div>

        <ComprobantesAsociados
          surgery={surgery}
          comprobantes={comprobantes}
          resumenCobranza={resumenCobranza}
          presupuestos={presupuestos}
        />
      </SectionCard>
    </div>
  )
}
