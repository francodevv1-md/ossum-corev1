"use client"

import { useMemo } from "react"
import type { ResumenComparativaMateriales } from "@/types"
import { useOrtoTrackStore } from "@/lib/store"
import { getComparativaMaterialesBySurgery } from "@/lib/comparativa.utils"

/**
 * CHATZAI-024B.1: Fixed infinite re-render loop (React #185).
 *
 * Previous code used inline selectors that called store getters returning
 * new array references via .filter() on every invocation:
 *   useOrtoTrackStore((s) => s.getPresupuestosBySurgeryId(surgeryId))
 *
 * Zustand's default Object.is comparison saw different references each time,
 * triggering re-render → selector → new reference → re-render → infinite loop.
 *
 * Fix: subscribe to stable state slices (s.presupuestos, s.remitos, s.consumos, s.stock)
 * and derive data via useMemo with stable dependencies.
 */
export function useComparativa(surgeryId: string): {
  resumen: ResumenComparativaMateriales | null
  tieneDatosSuficientes: boolean
} {
  // Subscribe to stable state slices instead of calling getters in selectors
  const presupuestos = useOrtoTrackStore((s) => s.presupuestos)
  const remitosAll = useOrtoTrackStore((s) => s.remitos)
  const consumos = useOrtoTrackStore((s) => s.consumos)
  const stockItems = useOrtoTrackStore((s) => s.stock)

  // Derive surgery-specific data via useMemo — stable references until underlying data changes
  const presupuesto = useMemo(
    () => presupuestos.find((p) => p.surgeryId === surgeryId),
    [presupuestos, surgeryId]
  )

  const remitos = useMemo(
    () => remitosAll.filter((r) => r.surgeryId === surgeryId),
    [remitosAll, surgeryId]
  )

  const consumo = useMemo(
    () => consumos.find((c) => c.surgeryId === surgeryId),
    [consumos, surgeryId]
  )

  const resumen = useMemo(() => {
    if (!presupuesto && remitos.length === 0 && !consumo) return null

    return getComparativaMaterialesBySurgery(
      presupuesto,
      remitos,
      consumo,
      stockItems,
    )
  }, [presupuesto, remitos, consumo, stockItems])

  const tieneDatosSuficientes = !!(presupuesto || remitos.length > 0 || consumo)

  return { resumen, tieneDatosSuficientes }
}
