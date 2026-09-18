"use client"

import React from "react"
import { Separator } from "@/components/ui/separator"
import { DocumentacionPanel } from "@/components/expediente/DocumentacionPanel"
import { TrazabilidadPanel } from "@/components/expediente/TrazabilidadPanel"
import type {
  Surgery,
  SurgeryDocumentChecklist,
  Remito,
  Consumo,
  Box,
} from "@/types"

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface DocumentacionTrazabilidadTabProps {
  /** Shared */
  surgery: Surgery
  /** DocumentacionPanel */
  docChecklist?: SurgeryDocumentChecklist
  docStatus: string
  /** TrazabilidadPanel */
  remitos: Remito[]
  consumo?: Consumo
  box?: Box
  freshnessKey?: number
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DocumentacionTrazabilidadTab({
  surgery,
  docChecklist,
  docStatus,
  remitos,
  consumo,
  box,
  freshnessKey,
}: DocumentacionTrazabilidadTabProps) {
  return (
    <div className="space-y-3">
      {/* ── Documentación ── */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
          Documentación
        </h3>
        <DocumentacionPanel
          surgery={surgery}
          docChecklist={docChecklist}
          docStatus={docStatus}
        />
      </section>

      <Separator className="opacity-50" />

      {/* ── Trazabilidad ── */}
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
          Trazabilidad
        </h3>
        <TrazabilidadPanel
          surgery={surgery}
          remitos={remitos}
          consumo={consumo}
          box={box}
          freshnessKey={freshnessKey}
        />
      </section>
    </div>
  )
}
