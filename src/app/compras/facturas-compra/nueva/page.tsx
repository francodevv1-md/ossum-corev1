"use client"

import { ComprasOcrWorkspace } from "@/components/compras/ComprasOcrWorkspace"

export default function NuevaFacturaCompraPage() {
  return <ComprasOcrWorkspace tipo="factura-compra" backHref="/compras/facturas-compra" />
}
