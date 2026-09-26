"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { ReceiptOperationalWorkspace, type Receipt } from "@/components/compras/ReceiptOperationalWorkspace"
import { apiFetch } from "@/lib/api/client"

type SupplierRemittance = { id: string; number: string }

export default function SupplierRemittanceReceiptPage() {
  const { remitoId } = useParams<{ remitoId: string }>()
  const { activeCompany } = useAuth()
  const [remittance, setRemittance] = useState<SupplierRemittance | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!activeCompany || !remitoId) return
    let cancelled = false
    const basePath = `/api/companies/${encodeURIComponent(activeCompany.id)}/supplier-remittances/${encodeURIComponent(remitoId)}`
    void apiFetch<SupplierRemittance>(basePath)
      .then(async (loadedRemittance) => {
        const linkedReceipt = await apiFetch<Receipt>(`${basePath}/goods-receipt`, { method: "POST" })
        if (!cancelled) { setRemittance(loadedRemittance); setReceipt(linkedReceipt) }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo abrir la recepción del remito") })
    return () => { cancelled = true }
  }, [activeCompany, remitoId])

  if (!activeCompany) return <p className="p-6 text-sm text-muted-foreground">Seleccioná una empresa para operar recepciones.</p>
  if (error) return <p role="alert" className="p-6 text-sm text-red-700">{error}</p>
  if (!remittance || !receipt) return <p className="p-6 text-sm text-muted-foreground">Abriendo recepción del remito…</p>

  return <ReceiptOperationalWorkspace companyId={activeCompany.id} sourceRemito={remittance} initialReceipt={receipt} />
}
