import type { OrdenCompra } from "@/types"

export const mockOrdenesCompra: OrdenCompra[] = [
  {
    id: "OC-0001",
    proveedorId: "PROV-0001",
    proveedorName: "Zimmer Argentina S.A.",
    items: [
      { stockItemId: "STK-0001", name: "Implante femoral NEXGEN CR", code: "IMP-RTR-001", quantity: 3, unitPrice: 2850000, subtotal: 8550000, received: 0 },
      { stockItemId: "STK-0010", name: "Inserto de polietileno NEXGEN", code: "IMP-RTR-010", quantity: 2, unitPrice: 890000, subtotal: 1780000, received: 0 },
      { stockItemId: "ART-Z-001", name: "Guía de corte a medida", code: "ART-Z-001", quantity: 1, unitPrice: 450000, subtotal: 450000, received: 0, isArticuloZ: true, descripcionLibre: "Guía de corte paciente específico - RX derecha" },
    ],
    total: 10780000,
    state: "Emitida",
    createdAt: "2026-05-03",
    observaciones: "OC urgente - incluye artículo Z para CX-0001",
    necesidadCompraIds: ["NEC-0001", "NEC-0004"],
  },
  {
    id: "OC-0002",
    proveedorId: "PROV-0002",
    proveedorName: "Synthes Argentina",
    items: [
      { stockItemId: "STK-0003", name: "Placa LCP 4.5/5.0 8 orificios", code: "IMP-OST-003", quantity: 4, unitPrice: 680000, subtotal: 2720000, received: 2 },
      { stockItemId: "STK-0009", name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", quantity: 15, unitPrice: 95000, subtotal: 1425000, received: 15 },
    ],
    total: 4145000,
    state: "Parcialmente recibida",
    createdAt: "2026-04-25",
    enviadaAt: "2026-04-26",
    observaciones: "Recepción parcial - placas pendientes",
    necesidadCompraIds: ["NEC-0006"],
  },
  {
    id: "OC-0003",
    proveedorId: "PROV-0004",
    proveedorName: "Medtronic Argentina",
    items: [
      { stockItemId: "STK-0005", name: "Cage interbody PEEK L4-L5", code: "IMP-COL-005", quantity: 2, unitPrice: 1950000, subtotal: 3900000, received: 0 },
    ],
    total: 3900000,
    state: "Borrador",
    createdAt: "2026-05-09",
    observaciones: "Pendiente confirmación de precio con Medtronic",
    necesidadCompraIds: ["NEC-0003"],
  },
]
