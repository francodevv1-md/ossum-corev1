"use client"

import React, { useMemo } from "react"
import type { Surgery } from "@/types"
import { useOrtoTrackStore } from "@/lib/store"
import { ComprobantesAsociados } from "@/components/expediente/ComprobantesAsociados"

interface TabPaneComprobantesProps {
  surgery: Surgery
}

export function TabPaneComprobantes({ surgery }: TabPaneComprobantesProps) {
  const store = useOrtoTrackStore()

  const comprobantes = useMemo(() => {
    return store.getComprobantesBySurgeryId(surgery.id) || []
  }, [store, surgery.id])

  const presupuestos = useMemo(() => {
    return store.getPresupuestosBySurgeryId(surgery.id) || []
  }, [store, surgery.id])

  const resumenCobranza = useMemo(() => {
    return store.getResumenCobranzaBySurgeryId(surgery.id) || {
      totalFacturado: 0,
      totalCobrado: 0,
      saldoPendiente: 0,
      facturas: [],
    }
  }, [store, surgery.id])

  return (
    <div className="flex flex-col gap-4">
      <ComprobantesAsociados
        surgery={surgery}
        comprobantes={comprobantes}
        presupuestos={presupuestos}
        resumenCobranza={resumenCobranza}
      />
    </div>
  )
}
