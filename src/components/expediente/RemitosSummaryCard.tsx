"use client"

import React, { useMemo } from "react"
import { FileText, Truck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRemitos } from "@/hooks/useRemitos"
import { formatDate } from "@/lib/formatters"
import { getRemitoVisibleNumber, type RemitoApiRow } from "@/lib/api/remitos"

type RemitosSummaryCardProps = {
  surgeryId?: string | null
  onViewRemitos?: () => void
}

function remitoDateValue(remito: Pick<RemitoApiRow, "issuedAt" | "createdAt">) {
  return new Date(remito.issuedAt ?? remito.createdAt).getTime()
}

function formatState(state?: string) {
  return state ? state.replaceAll("_", " ") : "Sin estado"
}

export function RemitosSummaryCard({ surgeryId, onViewRemitos }: RemitosSummaryCardProps) {
  const filters = useMemo(() => ({ surgeryId: surgeryId ?? "__missing_surgery__", take: 5 }), [surgeryId])
  const { remitos, loading, ready, error, blocked } = useRemitos(filters)

  const latestRemito = useMemo(() => {
    return [...remitos].sort((a, b) => remitoDateValue(b) - remitoDateValue(a))[0]
  }, [remitos])

  const isUnavailable = !surgeryId || blocked
  const isPending = !ready || loading
  const latestNumber = latestRemito ? getRemitoVisibleNumber(latestRemito) : "—"
  const latestState = latestRemito ? formatState(latestRemito.state) : "Sin remitos"

  return (
    <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Truck className="size-4 shrink-0 text-sky-700 dark:text-sky-300" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">
              Remitos
            </p>
            <Badge variant="outline" className="h-5 text-[10px]">
              {isPending ? "…" : remitos.length}
            </Badge>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Resumen operativo de remitos asociados a esta CX.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 gap-1 border-slate-300 bg-white text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          onClick={onViewRemitos}
          disabled={!onViewRemitos}
        >
          <FileText className="size-3.5" />
          Ver remitos
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Cantidad</p>
          <p className="text-[13px] font-semibold leading-5 text-slate-950 dark:text-slate-100">
            {isUnavailable ? "—" : isPending ? "Cargando…" : remitos.length}
          </p>
        </div>
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Último</p>
          <p className="truncate text-[13px] font-semibold leading-5 text-slate-950 dark:text-slate-100">{isPending ? "Cargando…" : latestNumber}</p>
        </div>
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Estado</p>
          <p className="truncate text-[13px] font-semibold leading-5 text-slate-950 dark:text-slate-100">{isPending ? "Cargando…" : latestState}</p>
        </div>
      </div>

      {latestRemito ? (
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          Fecha: {formatDate(latestRemito.issuedAt ?? latestRemito.createdAt)}
        </p>
      ) : null}

      {isUnavailable ? (
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">Sin empresa activa o CX sin ID server-side.</p>
      ) : error && ready ? (
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">No se pudo cargar el resumen de remitos.</p>
      ) : null}
    </div>
  )
}
