import type { MovimientoCompra } from "@/types"

export const mockMovimientosCompra: MovimientoCompra[] = [
  {
    id: "MVC-0001",
    ordenCompraId: "OC-0002",
    proveedorId: "PROV-0002",
    proveedorName: "Synthes Argentina",
    remitoEntrada: "RE-2026-001",
    date: "2026-05-08",
    items: [
      { stockItemId: "STK-0009", name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", quantity: 15, unitPrice: 95000 },
      { stockItemId: "STK-0003", name: "Placa LCP 4.5/5.0 8 orificios", code: "IMP-OST-003", quantity: 2, unitPrice: 680000 },
    ],
    total: 2510000,
    state: "Verificado",
  },
  {
    id: "MVC-0002",
    ordenCompraId: "OC-0002",
    proveedorId: "PROV-0002",
    proveedorName: "Synthes Argentina",
    remitoEntrada: "RE-2026-003",
    date: "2026-05-12",
    items: [
      { stockItemId: "STK-0003", name: "Placa LCP 4.5/5.0 8 orificios", code: "IMP-OST-003", quantity: 2, unitPrice: 680000 },
    ],
    total: 1360000,
    state: "Recibido",
  },
  {
    id: "MVC-0003",
    ordenCompraId: "OC-0001",
    proveedorId: "PROV-0001",
    proveedorName: "Zimmer Argentina S.A.",
    date: "2026-05-14",
    items: [
      { stockItemId: "STK-0001", name: "Implante femoral NEXGEN CR", code: "IMP-RTR-001", quantity: 3, unitPrice: 2850000 },
    ],
    total: 8550000,
    state: "Pendiente",
  },
]
