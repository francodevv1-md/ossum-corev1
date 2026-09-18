import type { OrdenPago } from "@/types"

export const mockOrdenesPago: OrdenPago[] = [
  {
    id: "OP-0001",
    proveedorId: "PROV-0002",
    proveedorName: "Synthes Argentina",
    ordenCompraId: "OC-0002",
    importe: 2510000,
    vencimiento: "2026-06-08",
    state: "Pendiente",
    medioPago: "Transferencia",
    observaciones: "Primer pago OC-0002 - 60% del total",
  },
  {
    id: "OP-0002",
    proveedorId: "PROV-0002",
    proveedorName: "Synthes Argentina",
    ordenCompraId: "OC-0002",
    importe: 1635000,
    vencimiento: "2026-07-08",
    state: "Pendiente",
    medioPago: "Transferencia",
    observaciones: "Segundo pago OC-0002 - 40% restante",
  },
  {
    id: "OP-0003",
    proveedorId: "PROV-0005",
    proveedorName: "Arthrex Argentina",
    facturaCompraId: "FC-0001",
    importe: 950000,
    vencimiento: "2026-06-01",
    state: "Pagada",
    medioPago: "Cheque",
    fechaPago: "2026-05-28",
    observaciones: "Pago completo FC-0001 - Cheque Nº 123456",
  },
]
