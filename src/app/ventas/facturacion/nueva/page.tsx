import type { Metadata } from "next"
import { InvoiceWorkspace } from "@/components/facturacion/InvoiceWorkspace"

export const metadata: Metadata = {
  title: "Nueva Factura Operativa | OSSUM COR",
  description: "Carga ágil y estructurada de comprobante comercial y operativo.",
}

export default function NuevaFacturaPage() {
  return <InvoiceWorkspace />
}
