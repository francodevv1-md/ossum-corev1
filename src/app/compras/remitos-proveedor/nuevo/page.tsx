"use client"

import * as React from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ComprasOcrWorkspace } from "@/components/compras/ComprasOcrWorkspace"
import type { ProveedorOption } from "@/hooks/useComprasOcrForm"
import { apiFetch } from "@/lib/api/client"
import type { RemitoProveedor } from "@/types"

type SupplierCatalog = {
  suppliers: Array<{
    contactId: string
    contact: {
      legalName: string | null
      tradeName: string | null
      firstName: string | null
      lastName: string | null
    }
  }>
}

export default function NuevoRemitoProveedorPage() {
  const { activeCompany } = useAuth()
  const [supplierOptions, setSupplierOptions] = React.useState<ProveedorOption[]>()

  React.useEffect(() => {
    if (!activeCompany?.id) return
    let cancelled = false
    apiFetch<SupplierCatalog>(`/api/companies/${encodeURIComponent(activeCompany.id)}/goods-receipts?catalog=1`)
      .then(({ suppliers }) => {
        if (cancelled) return
        setSupplierOptions(suppliers.map(({ contactId, contact }) => ({
          id: contactId,
          name: contact.legalName || contact.tradeName || [contact.firstName, contact.lastName].filter(Boolean).join(" "),
        })).filter((supplier) => supplier.name))
      })
      .catch(() => {
        if (!cancelled) setSupplierOptions([])
      })
    return () => { cancelled = true }
  }, [activeCompany?.id])

  return <ComprasOcrWorkspace
    tipo="remito-proveedor"
    backHref="/compras/remitos-proveedor"
    supplierOptions={supplierOptions}
    persistToStore={false}
    onRemitoConfirmed={async (remito: Omit<RemitoProveedor, "id">) => {
      if (!activeCompany) throw new Error("No hay una empresa activa")
       await apiFetch(`/api/companies/${encodeURIComponent(activeCompany.id)}/supplier-remittances`, { method: "POST", body: JSON.stringify({ supplierId: remito.proveedorId, number: remito.number, documentDate: remito.date, observations: remito.observaciones, lines: remito.items.map((item) => ({ expectedCode: item.code || undefined, expectedDescription: item.name, expectedQuantity: item.quantity, articleId: item.stockItemId || undefined, lotCode: item.lot || undefined, expirationDate: item.expiry || undefined })) }) })
    }}
  />
}
