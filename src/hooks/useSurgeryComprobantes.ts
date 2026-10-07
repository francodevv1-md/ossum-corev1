"use client"

import { useEffect, useState } from "react"
import { fetchPresupuestos, type PresupuestoApiRow } from "@/lib/api/presupuestos"
import { fetchAllInvoices, type InvoiceApiRow } from "@/lib/api/invoices"
import { fetchRemitos, type RemitoApiRow } from "@/lib/api/remitos"
import { fetchAllPayments, type PaymentApiRow } from "@/lib/api/payments"

type Snapshot = {
  key: string
  status: "loading" | "ready" | "error"
  budgets: PresupuestoApiRow[]
  invoices: InvoiceApiRow[]
  remittances: RemitoApiRow[]
  payments: PaymentApiRow[]
  error?: string
}

export function useSurgeryComprobantes(companyId?: string, surgeryId?: string) {
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([companyId, surgeryId, revision])
  const empty = { budgets: [], invoices: [], remittances: [], payments: [] }
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: "", status: "loading", ...empty })

  useEffect(() => {
    if (!companyId || !surgeryId) return
    let cancelled = false
    setSnapshot({ key, status: "loading", budgets: [], invoices: [], remittances: [], payments: [] })
    async function loadBudgets() {
      const rows: PresupuestoApiRow[] = []
      const take = 500
      for (let skip = 0; !cancelled; skip += take) {
        const page = await fetchPresupuestos(companyId!, { surgeryId, take, skip })
        rows.push(...page)
        if (page.length < take) break
      }
      return rows
    }
    async function loadRemittances() {
      const rows: RemitoApiRow[] = []
      const take = 500
      for (let skip = 0; !cancelled; skip += take) {
        const page = await fetchRemitos(companyId!, { surgeryId, take, skip })
        rows.push(...page)
        if (page.length < take) break
      }
      return rows
    }
    // Current API filters payments only by their own surgeryId. A company-scoped read
    // is necessary to include payments linked indirectly through invoice imputations.
    // ponytail: full company payment scan; replace with a backend relation filter if volume grows.
    Promise.all([loadBudgets(), fetchAllInvoices(companyId, { surgeryId }), loadRemittances(), fetchAllPayments(companyId)])
      .then(([budgets, invoices, remittances, companyPayments]) => {
        if (cancelled) return
        if ([...budgets, ...invoices, ...remittances].some(row => row.companyId !== companyId || row.surgeryId !== surgeryId) ||
          companyPayments.some(row => row.companyId !== companyId)) {
          throw new Error("La respuesta no corresponde a la empresa y cirugía seleccionadas.")
        }
        const invoiceIds = new Set(invoices.map(row => row.id))
        const payments = companyPayments.filter(row => row.surgeryId === surgeryId || row.imputations.some(line => invoiceIds.has(line.invoiceId)))
        setSnapshot({ key, status: "ready", budgets, invoices, remittances, payments })
      })
      .catch(error => {
        if (!cancelled) setSnapshot({ key, status: "error", budgets: [], invoices: [], remittances: [], payments: [], error: error instanceof Error ? error.message : "Error de lectura" })
      })
    return () => { cancelled = true }
  }, [companyId, surgeryId, key])

  // Hide previous scope synchronously, before effects run (including reloads).
  const current = snapshot.key === key ? snapshot : { status: "loading" as const, ...empty, error: undefined }
  const status = !companyId ? "missing-company" : !surgeryId ? "missing-identity" : current.status
  return {
    ...current, status,
    budgets: companyId && surgeryId ? current.budgets : [],
    invoices: companyId && surgeryId ? current.invoices : [],
    remittances: companyId && surgeryId ? current.remittances : [],
    payments: companyId && surgeryId ? current.payments : [],
    reload: () => setRevision(value => value + 1),
  }
}
