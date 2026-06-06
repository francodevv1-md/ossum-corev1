import type { NotaCredito } from "@/types"

export const mockNotasCredito: NotaCredito[] = [
  {
    id: "NC-0001",
    facturaId: "FV-2026-0089",
    surgeryId: "CX-0003",
    client: "Galeno",
    motivo: "Devolución de tornillos sobrantes",
    importe: 190000,
    state: "Emitida",
    createdAt: "2026-05-13",
    observaciones: "Se devolvieron 2 tornillos esponjosos no consumidos en CX",
  },
  {
    id: "NC-0002",
    facturaId: "FV-2026-0045",
    surgeryId: "CX-0005",
    client: "PAMI",
    motivo: "Diferencia de precio lista PAMI",
    importe: 85000,
    state: "Aplicada",
    createdAt: "2026-05-16",
    observaciones: "Ajuste por diferencia entre lista de precios original y lista PAMI actualizada",
  },
  {
    id: "NC-0003",
    facturaId: "FV-2026-0090",
    surgeryId: "CX-0001",
    client: "OSDE Binario",
    motivo: "Material no utilizado en cirugía",
    importe: 380000,
    state: "Borrador",
    createdAt: "2026-05-15",
    observaciones: "Tornillos presupuestados pero no utilizados - pendiente confirmación",
  },
]
