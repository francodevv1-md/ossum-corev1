import type { Box } from "@/types"

export const mockBoxes: Box[] = [
  {
    id: "CAJ-0001",
    name: "Caja RX Derecha - CX-0001",
    type: "Rodilla",
    surgeryId: "CX-0001",
    contents: [
      { stockItemId: "STK-0001", name: "Implante femoral NEXGEN CR", code: "IMP-RTR-001", quantity: 1, consumed: 0, returned: 0 },
      { stockItemId: "STK-0010", name: "Inserto de polietileno NEXGEN", code: "IMP-RTR-010", quantity: 1, consumed: 0, returned: 0 },
      { stockItemId: "STK-0009", name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", quantity: 4, consumed: 0, returned: 0 },
    ],
    state: "Preparado",
    preparedAt: "2026-05-10",
  },
  {
    id: "CAJ-0003",
    name: "Caja Osteosíntesis - CX-0003",
    type: "Osteosíntesis",
    surgeryId: "CX-0003",
    contents: [
      { stockItemId: "STK-0003", name: "Placa LCP 4.5/5.0 8 orificios", code: "IMP-OST-003", quantity: 1, consumed: 1, returned: 0 },
      { stockItemId: "STK-0009", name: "Tornillo esponjoso 6.5mm x 40mm", code: "INS-OST-009", quantity: 6, consumed: 4, returned: 2 },
    ],
    state: "Devuelto",
    preparedAt: "2026-05-06",
    sentAt: "2026-05-07",
    returnedAt: "2026-05-09",
  },
  {
    id: "CAJ-0005",
    name: "Caja Descartable - CX-0008",
    type: "Descartable",
    surgeryId: "CX-0008",
    contents: [
      { stockItemId: "STK-0004", name: "Shaver blade 4.0mm", code: "INS-ART-004", quantity: 1, consumed: 0, returned: 0 },
      { stockItemId: "STK-0008", name: "Kit artroscopía completo", code: "DES-ART-008", quantity: 1, consumed: 0, returned: 0 },
    ],
    state: "Enviado",
    preparedAt: "2026-05-08",
    sentAt: "2026-05-09",
  },
]
