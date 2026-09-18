import type { Remito } from "@/types"

export const mockRemitos: Remito[] = [
  {
    id: "NR-0001",
    surgeryId: "CX-0003",
    boxId: "CAJ-0003",
    destination: "Hospital Alemán - Depósito Central",
    date: "2026-05-07",
    state: "Devuelto",
    items: [
      { stockItemId: "STK-0003", name: "Placa LCP 4.5/5.0 8 orificios", code: "IMP-OST-003", sentQuantity: 1, returnedQuantity: 0, consumedQuantity: 1 },
      { stockItemId: "STK-0009", name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", sentQuantity: 6, returnedQuantity: 2, consumedQuantity: 4 },
    ],
  },
  {
    id: "NR-0002",
    surgeryId: "CX-0005",
    boxId: "CAJ-0004",
    destination: "Sanatorio Güemes - Depósito",
    date: "2026-05-05",
    state: "Controlado",
    items: [
      { stockItemId: "STK-0005", name: "Cage interbody PEEK L4-L5", code: "IMP-COL-005", sentQuantity: 1, returnedQuantity: 0, consumedQuantity: 1 },
      { stockItemId: "STK-0009", name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", sentQuantity: 6, returnedQuantity: 2, consumedQuantity: 4 },
    ],
  },
  {
    id: "NR-0003",
    surgeryId: "CX-0008",
    boxId: "CAJ-0005",
    destination: "Sanatorio Güemes - Depósito",
    date: "2026-05-09",
    state: "Enviado",
    items: [
      { stockItemId: "STK-0004", name: "Shaver blade 4.0mm", code: "INS-ART-004", sentQuantity: 1, returnedQuantity: 0, consumedQuantity: 0 },
      { stockItemId: "STK-0008", name: "Kit artroscopía completo", code: "DES-ART-008", sentQuantity: 1, returnedQuantity: 0, consumedQuantity: 0 },
    ],
  },
]
