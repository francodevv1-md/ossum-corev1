import type { ImputacionCobro } from "@/types"

export const mockImputaciones: ImputacionCobro[] = [
  {
    id: "IMP-0001",
    cobroId: "COB2-0001",
    facturaId: "FV-2026-0045",
    importeImputado: 2330000,
    fechaImputacion: "2026-05-15T10:00:00.000Z",
  },
  {
    id: "IMP-0002",
    cobroId: "COB2-0002",
    facturaId: "FV-2026-0089",
    importeImputado: 625000,
    fechaImputacion: "2026-05-20T14:30:00.000Z",
  },
  {
    id: "IMP-0003",
    cobroId: "COB2-0003",
    facturaId: "FV-2026-0089",
    importeImputado: 625000,
    fechaImputacion: "2026-05-28T09:15:00.000Z",
  },
  {
    id: "IMP-0004",
    cobroId: "COB2-0004",
    facturaId: "FV-2026-0091",
    importeImputado: 0,
    fechaImputacion: "2026-06-12T11:45:00.000Z",
  },
  {
    id: "IMP-0005",
    cobroId: "COB2-0005",
    facturaId: "FV-2026-0102",
    importeImputado: 3390000,
    fechaImputacion: "2026-05-18T16:00:00.000Z",
  },
]
