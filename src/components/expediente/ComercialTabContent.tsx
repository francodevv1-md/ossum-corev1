"use client"

import React from "react"
import { ComprobantesAsociados } from "@/components/expediente/ComprobantesAsociados"
import { Receipt } from "lucide-react"
import type { Surgery, Presupuesto, Remito, Box, Comprobante } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"

interface ComercialTabContentProps {
  surgery: Surgery
  presupuestos: Presupuesto[]
  onOpenPresupuestoDialog?: (surgery: Surgery) => void
  onAutorizar?: (surgery: Surgery) => void
  remitos: Remito[]
  box?: Box
  comprobantes: Comprobante[]
  resumenCobranza: ResumenCobranzaSurgery
}

const SECTION_TITLE_CLS = "text-[13px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100"

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
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-sky-50 p-1.5 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
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
  return (
    <div className="space-y-3">
      <SectionCard
        title="Comprobantes asociados"
        icon={Receipt}
      >
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
