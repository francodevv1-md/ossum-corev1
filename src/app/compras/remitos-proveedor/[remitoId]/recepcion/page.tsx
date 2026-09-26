"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { ReceiptOperationalWorkspace, type Receipt } from "@/components/stock/ReceiptOperationalWorkspace"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api/client"
import { useOrtoTrackStore } from "@/lib/store"
import { findSupplierReceipt, supplierReceiptErrorMessage, supplierReceiptPayload, type SupplierReceipt } from "../../receipt-flow"

export default function SupplierReceiptPage() {
  const { remitoId } = useParams<{ remitoId: string }>()
  const { activeCompany } = useAuth()
  const remito = useOrtoTrackStore().remitosProveedor.find((item) => item.id === remitoId)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!activeCompany || !remito) return
    let cancelled = false
    const receiptsPath = `/api/companies/${encodeURIComponent(activeCompany.id)}/receipts`
    void apiFetch<SupplierReceipt[]>(receiptsPath)
      .then(async (receipts) => {
        const existing = findSupplierReceipt(receipts, remito)
        if (existing) return apiFetch<Receipt>(`${receiptsPath}/${encodeURIComponent(existing.id)}`)
        return apiFetch<Receipt>(receiptsPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(supplierReceiptPayload(remito)) })
      })
      .then((row) => { if (!cancelled) setReceipt(row) })
      .catch((cause) => { if (!cancelled) setError(supplierReceiptErrorMessage(cause, "No se pudo abrir la recepción")) })
    return () => { cancelled = true }
  }, [activeCompany, remito])

  if (!remito) return <div className="p-6"><p className="text-sm text-red-700">No se encontró el remito de proveedor.</p><Button asChild variant="outline" className="mt-3"><Link href="/compras/remitos-proveedor?tab=recepciones">Volver</Link></Button></div>
  if (error) return <div className="p-6"><p role="alert" className="text-sm text-red-700">{error}</p></div>
  if (!receipt) return <div className="p-6 text-sm text-muted-foreground">Abriendo recepción de {remito.number}…</div>

  return <ReceiptOperationalWorkspace initialReceipt={receipt} backHref="/compras/remitos-proveedor?tab=recepciones" sourceLabel={`Compras · ${remito.number}`} />
}
