import type { NotaDebito } from "@/types"

export const mockNotasDebito: NotaDebito[] = [
  {
    id: "ND-0001",
    facturaId: "FV-2026-0045",
    surgeryId: "CX-0005",
    client: "PAMI",
    motivo: "Cargo adicional por instrumentador extra",
    importe: 50000,
    state: "Emitida",
    createdAt: "2026-05-17",
    observaciones: "Se requirió instrumentador adicional por complejidad de la cirugía",
  },
  {
    id: "ND-0002",
    facturaId: "FV-2026-0089",
    surgeryId: "CX-0003",
    client: "Galeno",
    motivo: "Diferencia de consumo - implante adicional",
    importe: 95000,
    state: "Aplicada",
    createdAt: "2026-05-14",
    observaciones: "Se utilizó 1 tornillo adicional al presupuesto original",
  },
]
