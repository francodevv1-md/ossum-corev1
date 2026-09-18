"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError } from "@/lib/api/client"
import { fetchConsumos, type ConsumoApiRow } from "@/lib/api/consumos"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import { fetchPresupuestos, type PresupuestoApiRow } from "@/lib/api/presupuestos"

export type PendingInvoiceCandidate = {
  key: string
  companyId: string
  kind: "presupuesto" | "consumo"
  surgeryId: string
  presupuestoId: string
  consumoId?: string
  currency: string
  amount?: string
}

async function fetchEveryPage<T>(fetchPage: (skip: number) => Promise<T[]>) {
  const rows: T[] = []
  const take = 500
  for (let skip = 0; ; skip += take) {
    const page = await fetchPage(skip)
    rows.push(...page)
    if (page.length < take) return rows
  }
}

export function derivePendingInvoiceCandidates(
  companyId: string,
  presupuestos: PresupuestoApiRow[],
  consumos: ConsumoApiRow[],
  invoices: InvoiceApiRow[],
) {
  const activeBudgetIds = new Set(invoices.filter((row) => row.state !== "Anulada" && row.presupuestoId).map((row) => row.presupuestoId!))
  const activeConsumoIds = new Set(invoices.filter((row) => row.state !== "Anulada" && row.consumoId).map((row) => row.consumoId!))
  const budgets = presupuestos.filter((row) => row.companyId === companyId && row.state === "Aprobado" && row.slot === "CURRENT" && row.surgeryId)
  const budgetBySurgery = new Map(budgets.map((row) => [row.surgeryId!, row]))
  const consumptionCandidates = consumos.flatMap((consumo): PendingInvoiceCandidate[] => {
    if (consumo.companyId !== companyId || consumo.state !== "Validado" || !consumo.surgeryId || activeConsumoIds.has(consumo.id)) return []
    const presupuesto = budgetBySurgery.get(consumo.surgeryId)
    if (!presupuesto || activeBudgetIds.has(presupuesto.id)) return []
    return [{
      key: `${companyId}:consumo:${consumo.id}`,
      companyId,
      kind: "consumo",
      surgeryId: consumo.surgeryId,
      presupuestoId: presupuesto.id,
      consumoId: consumo.id,
      currency: presupuesto.currency,
    }]
  })
  const surgeriesWithConsumption = new Set(consumptionCandidates.map((row) => row.surgeryId))
  const budgetCandidates = budgets.flatMap((presupuesto): PendingInvoiceCandidate[] => (
    activeBudgetIds.has(presupuesto.id) || surgeriesWithConsumption.has(presupuesto.surgeryId!)
      ? []
      : [{
        key: `${companyId}:presupuesto:${presupuesto.id}`,
        companyId,
        kind: "presupuesto",
        surgeryId: presupuesto.surgeryId!,
        presupuestoId: presupuesto.id,
        currency: presupuesto.currency,
        amount: presupuesto.total,
      }]
  ))
  return [...consumptionCandidates, ...budgetCandidates]
}

export function usePendingInvoiceSources(invoices: InvoiceApiRow[], enabled = true) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const scopeKey = `${companyId ?? ""}:${enabled}`
  const scope = useMemo(() => ({ key: scopeKey, companyId }), [companyId, scopeKey])
  const activeScopeRef = useRef(scope)
  const requestRef = useRef(0)
  const [stored, setStored] = useState<{ scopeKey: string; presupuestos: PresupuestoApiRow[]; consumos: ConsumoApiRow[] }>({ scopeKey, presupuestos: [], consumos: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    activeScopeRef.current = scope
    requestRef.current += 1
  }, [scope])

  const refresh = useCallback(async () => {
    if (activeScopeRef.current !== scope) return
    const requestId = ++requestRef.current
    if (!companyId || !enabled) {
      setStored({ scopeKey, presupuestos: [], consumos: [] })
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [presupuestos, consumos] = await Promise.all([
        fetchEveryPage((skip) => fetchPresupuestos(companyId, { state: "Aprobado", take: 500, skip })),
        fetchEveryPage((skip) => fetchConsumos(companyId, { state: "Validado", take: 500, skip })),
      ])
      if (requestId === requestRef.current && activeScopeRef.current === scope) setStored({ scopeKey, presupuestos, consumos })
    } catch (cause) {
      if (requestId === requestRef.current && activeScopeRef.current === scope) {
        setStored({ scopeKey, presupuestos: [], consumos: [] })
        setError(cause instanceof ApiClientError ? cause.message : "No se pudieron cargar los pendientes de facturar")
      }
    } finally {
      if (requestId === requestRef.current && activeScopeRef.current === scope) setLoading(false)
    }
  }, [companyId, enabled, scope, scopeKey])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    return () => { requestRef.current += 1 }
  }, [refresh])

  const rows = stored.scopeKey === scopeKey ? stored : { presupuestos: [], consumos: [] }
  const candidates = useMemo(
    () => companyId ? derivePendingInvoiceCandidates(companyId, rows.presupuestos, rows.consumos, invoices) : [],
    [companyId, invoices, rows.consumos, rows.presupuestos],
  )

  return { companyId, candidates, loading, error, refresh }
}
