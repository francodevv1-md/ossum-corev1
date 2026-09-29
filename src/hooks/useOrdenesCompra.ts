"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import * as api from "@/lib/api/ordenes-compra"

export function useOrdenesCompra() {
  const { activeCompany } = useAuth()
  const [ordenes, setOrdenes] = useState<api.OrdenCompraApiRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!activeCompany?.id) return setOrdenes([])
    try {
      setOrdenes(await api.fetchOrdenesCompra(activeCompany.id))
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudieron cargar las OC")
    }
  }, [activeCompany?.id])

  useEffect(() => { void refresh() }, [refresh])

  const mutate = async <T,>(fn: (companyId: string) => Promise<T>) => {
    if (!activeCompany?.id) throw new Error("No hay empresa activa")
    const result = await fn(activeCompany.id)
    await refresh()
    return result
  }

  return {
    ordenes,
    error,
    refresh,
    create: (payload: api.CreateOrdenCompraPayload) => mutate(companyId => api.createOrdenCompra(companyId, payload)),
    emitir: (id: string) => mutate(companyId => api.emitirOrdenCompra(companyId, id)),
    enviar: (id: string) => mutate(companyId => api.enviarOrdenCompra(companyId, id)),
    recibir: (id: string, payload: api.ReceiveOrdenCompraPayload) => mutate(companyId => api.recibirOrdenCompra(companyId, id, payload)),
  }
}
