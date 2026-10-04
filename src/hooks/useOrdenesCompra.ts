"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import * as api from "@/lib/api/ordenes-compra"

export function useOrdenesCompra() {
  const { activeCompany } = useAuth()
  const [ordenes, setOrdenes] = useState<api.OrdenCompraApiRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async (reconcileReceipt = false) => {
    if (!activeCompany?.id) return setOrdenes([])
    try {
      setOrdenes(await api.fetchOrdenesCompra(activeCompany.id))
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudieron cargar las OC")
      if (reconcileReceipt === true) throw new Error("La recepción fue aceptada, pero no se pudo actualizar la OC. Reconciliá la misma recepción.")
    }
  }, [activeCompany?.id])

  useEffect(() => { void refresh() }, [refresh])

  const mutate = async <T,>(fn: (companyId: string) => Promise<T>, reconcileReceipt = false) => {
    if (!activeCompany?.id) throw new Error("No hay empresa activa")
    const result = await fn(activeCompany.id)
    await refresh(reconcileReceipt)
    return result
  }

  return {
    ordenes,
    error,
    refresh,
    create: (payload: api.CreateOrdenCompraPayload) => mutate(companyId => api.createOrdenCompra(companyId, payload)),
    emitir: (id: string) => mutate(companyId => api.emitirOrdenCompra(companyId, id)),
    enviar: (id: string) => mutate(companyId => api.enviarOrdenCompra(companyId, id)),
    recibir: (id: string, payload: api.ReceiveOrdenCompraPayload) => mutate(companyId => api.recibirOrdenCompra(companyId, id, payload), true),
  }
}
