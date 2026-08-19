import type { RemitoProveedor } from "@/types"

export const mockRemitosProveedor: RemitoProveedor[] = [
  {
    id: "RP-0001",
    proveedorId: "PROV-0002",
    proveedorName: "Synthes Argentina",
    number: "RP-SYNTHES-2026-207",
    date: "2026-05-08",
    items: [
      { name: "Placa LCP 4.5/5.0 8 orificios", code: "IMP-OST-003", quantity: 4, received: 4, lot: "SYN-26A-1182", expiry: "2029-03-01" },
      { name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", quantity: 15, received: 15, lot: "SYN-26B-4410", expiry: "2029-06-01" },
    ],
    state: "Recibido",
    ordenCompraId: "OC-0002",
  },
  {
    id: "RP-0002",
    proveedorId: "PROV-0005",
    proveedorName: "Arthrex Argentina",
    number: "RP-ARTHREX-2026-091",
    date: "2026-05-03",
    items: [
      { name: "Kit artroscopía completo", code: "DES-ART-008", quantity: 10, received: 10, lot: "AR-26-7732" },
    ],
    state: "Verificado",
    ordenCompraId: "OC-ARTHREX-001",
    facturaCompraId: "FC-0001",
  },
  {
    id: "RP-0003",
    proveedorId: "PROV-0002",
    proveedorName: "Synthes Argentina",
    number: "RP-SYNTHES-2026-218",
    date: "2026-05-12",
    items: [
      { name: "Tornillo cortical 4.5mm x 40mm", code: "INS-OST-014", quantity: 20, received: 18, lot: "SYN-26C-2204", expiry: "2029-09-01" },
    ],
    state: "Pendiente",
  },
]
