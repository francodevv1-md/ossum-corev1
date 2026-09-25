"use client"

import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Truck } from "lucide-react"

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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-slate-200/75 bg-[#F2F5F9] px-3.5 py-2 text-[12px] dark:border-slate-800/80 dark:bg-slate-950/60">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className="flex items-center gap-1.5">
          <Truck className="size-3.5 text-slate-600 dark:text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Remitos
          </span>
          <Badge variant="outline" className="h-4.5 border-slate-300 bg-white px-1.5 text-[9px] font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {isPending ? "…" : remitos.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-400">Cantidad:</span>
          <span className="font-bold text-slate-950 dark:text-slate-50">
            {isUnavailable ? "—" : isPending ? "…" : remitos.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-400">Último:</span>
          <span className="font-bold text-slate-950 dark:text-slate-50">
            {isPending ? "…" : latestNumber}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-400">Estado:</span>
          <span className="font-bold text-slate-950 dark:text-slate-50">
            {isPending ? "…" : latestState}
          </span>
        </div>
      </div>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="group h-6.5 gap-1 px-2.5 text-[11px] font-bold text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
          onClick={onViewRemitos}
          disabled={!onViewRemitos}
        >
          <span>Ver remitos</span>
          <motion.div
            className="flex items-center"
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <ArrowRight className="size-3" />
          </motion.div>
        </Button>
      </motion.div>
    </div>
  )
}
