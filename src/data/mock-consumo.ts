import type { Consumo } from "@/types"

export const mockConsumos: Consumo[] = [
  {
    id: "CON-0001",
    surgeryId: "CX-0003",
    boxId: "CAJ-0003",
    items: [
      { stockItemId: "STK-0003", name: "Placa LCP 4.5/5.0 8 orificios", code: "IMP-OST-003", lot: "LOT-2025-C123", department: "Traumatología", rubro: "Placas", brand: "DePuy Synthes", consumed: 1, returned: 0 },
      { stockItemId: "STK-0009", name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", lot: "LOT-2025-J456", department: "Traumatología", rubro: "Tornillos", brand: "DePuy Synthes", consumed: 4, returned: 2 },
    ],
    validatedBy: "María López",
    validatedAt: "2026-05-09",
    state: "Validado",
  },
  {
    id: "CON-0002",
    surgeryId: "CX-0005",
    boxId: "CAJ-0004",
    items: [
      { stockItemId: "STK-0005", name: "Cage interbody PEEK L4-L5", code: "IMP-COL-005", lot: "LOT-2025-E456", department: "Traumatología", rubro: "Cages", brand: "Medtronic", consumed: 1, returned: 0 },
      { stockItemId: "STK-0009", name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", lot: "LOT-2025-J456", department: "Traumatología", rubro: "Tornillos", brand: "DePuy Synthes", consumed: 4, returned: 2 },
    ],
    validatedBy: "María López",
    validatedAt: "2026-05-08",
    state: "Facturado",
  },
  {
    id: "CON-0003",
    surgeryId: "CX-0008",
    boxId: "CAJ-0005",
    items: [
      { stockItemId: "STK-0004", name: "Shaver blade 4.0mm", code: "INS-ART-004", lot: "LOT-2026-D001", department: "Traumatología", rubro: "Descartable", brand: "Stryker", consumed: 1, returned: 0 },
      { stockItemId: "STK-0008", name: "Kit artroscopía completo", code: "DES-ART-008", lot: "LOT-2026-H001", department: "Traumatología", rubro: "Kits", brand: "Arthrex", consumed: 1, returned: 0 },
    ],
    validatedBy: "",
    state: "Pendiente",
  },
]
