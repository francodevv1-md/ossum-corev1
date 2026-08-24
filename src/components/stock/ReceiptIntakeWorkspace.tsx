"use client"

import { useState } from "react"
import { ComprasOcrWorkspace } from "@/components/compras/ComprasOcrWorkspace"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import type { RemitoProveedor } from "@/types"
import { ReceiptOperationalWorkspace, type Receipt } from "./ReceiptOperationalWorkspace"

const companyPath = (companyId: string) => `/api/companies/${encodeURIComponent(companyId)}`

export function ReceiptIntakeWorkspace() {
  const { activeCompany } = useAuth()
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (receipt) return <ReceiptOperationalWorkspace initialReceipt={receipt} />

  return <div className="min-w-0">
    {error && <p role="alert" className="mx-auto max-w-5xl border-b border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:px-4">{error}</p>}
    <ComprasOcrWorkspace
      tipo="remito-proveedor"
      backHref="/recepciones"
      persistToStore={false}
      onRemitoConfirmed={async (remito: Omit<RemitoProveedor, "id">) => {
        if (!activeCompany) throw new Error("No hay una empresa activa")
        setError(null)
        try {
          const created = await apiFetch<Receipt>(`${companyPath(activeCompany.id)}/receipts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplierId: remito.proveedorId || undefined,
              documentReference: remito.number || undefined,
              expectedLines: remito.items.map((item) => ({
                code: item.code || undefined,
                description: item.name || undefined,
                expectedQuantity: String(item.quantity),
                lotCode: item.lot || undefined,
                expirationDate: item.expiry || undefined,
              })),
            }),
          })
          setReceipt(created)
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "No se pudo iniciar la recepción"
          setError(message)
          throw caught
        }
      }}
    />
  </div>
}
