import type { FacturaCompra } from "@/types"

export const mockFacturasCompra: FacturaCompra[] = [
  {
    id: "FC-0001",
    proveedorId: "PROV-0005",
    proveedorName: "Arthrex Argentina",
    number: "FC-ARTHREX-2026-045",
    date: "2026-05-02",
    items: [
      { name: "Kit artroscopía completo", code: "DES-ART-008", quantity: 10, unitPrice: 95000, subtotal: 950000 },
    ],
    total: 950000,
    state: "Pagada",
    ordenCompraId: "OC-ARTHREX-001",
  },
  {
    id: "FC-0002",
    proveedorId: "PROV-0002",
    proveedorName: "Synthes Argentina",
    number: "FC-SYNTHES-2026-112",
    date: "2026-05-10",
    items: [
      { name: "Placa LCP 4.5/5.0 8 orificios", code: "IMP-OST-003", quantity: 4, unitPrice: 680000, subtotal: 2720000 },
      { name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", quantity: 15, unitPrice: 95000, subtotal: 1425000 },
    ],
    total: 4145000,
    state: "Pendiente",
    ordenCompraId: "OC-0002",
  },
]
