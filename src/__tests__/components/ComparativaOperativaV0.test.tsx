import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ComparativaOperativaV0 } from "@/components/comparativa/ComparativaOperativaV0"
import type { SurgeryComparativaResponse } from "@/lib/api/comparativa"

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ activeCompany: { id: "company-1" }, currentAccess: { role: "admin" } }),
}))

const mockComparativa: SurgeryComparativaResponse = {
  companyId: "company-1",
  surgeryId: "surg-1",
  generatedAt: "2026-09-30T10:00:00.000Z",
  sources: {
    hasPresupuesto: true,
    presupuestoId: "pr-1",
    presupuestoVisibleNumber: 1,
    presupuestoState: "aprobado",
    hasRemitos: true,
    remitosCount: 2,
    remitoNumbers: ["R-0001", "remito-2"],
    hasConsumos: true,
    consumosCount: 1,
    consumoNumbers: ["CON-0001"],
    hasDevoluciones: true,
    devolucionesCount: 1,
    devolucionNumbers: ["DEV-0001"],
    hasInvoices: false,
    invoicesCount: 0,
    invoiceNumbers: [],
    fuentesFaltantes: [],
  },
  summary: {
    totalPresupuestado: 10,
    totalRemitido: 11,
    totalConsumido: 8,
    totalDevuelto: 3,
    totalFacturado: 0,
    totalPendienteFacturar: 8,
    totalUnidadesPresupuestadas: 10,
    totalUnidadesRemitidas: 11,
    totalUnidadesConsumidas: 8,
    totalUnidadesDevueltas: 3,
    totalUnidadesFacturadas: 0,
    totalUnidadesPendienteFacturar: 8,
    deltaEconomico: -200,
    deltaEconomicoEstimado: false,
    lineasCount: 2,
    lineasCoincidentes: 1,
    lineasConDiferencia: 1,
    lineasRevisionManual: 0,
  },
  lineas: [
    {
      key: "sku:sku-shared",
      catalogItemId: "cat-1",
      sku: "SKU-SHARED",
      codigo: "SKU-SHARED",
      descripcion: "Tornillo",
      unit: "u",
      metodoMatch: "codigo",
      necesitaRevision: false,
      observaciones: [],
      presupuestado: 7,
      remitido: 7,
      consumido: 5,
      devuelto: 1,
      facturado: 0,
      pendienteFisico: 1,
      pendienteFacturar: 5,
      precioUnitario: 100,
      precioEstimado: false,
      importePresupuestado: 700,
      importeConsumido: 500,
      importeFacturado: 0,
      deltaCantidad: -2,
      deltaEconomico: -200,
      estadoLinea: "consumido_de_menos",
      explicacion: "Consumo menor al presupuestado",
      presupuestoItemIds: ["pr-1"],
      remitoItemIds: ["rem-1"],
      consumoItemIds: ["con-1"],
      devolucionItemIds: ["dev-1"],
      invoiceItemIds: [],
    },
    {
      key: "sku:sku-2",
      catalogItemId: "cat-2",
      sku: "SKU-2",
      codigo: "SKU-2",
      descripcion: "Placa",
      unit: "u",
      metodoMatch: "codigo",
      necesitaRevision: false,
      observaciones: [],
      presupuestado: 4,
      remitido: 4,
      consumido: 3,
      devuelto: 1,
      facturado: 0,
      pendienteFisico: 0,
      pendienteFacturar: 3,
      precioUnitario: 300,
      precioEstimado: false,
      importePresupuestado: 1200,
      importeConsumido: 900,
      importeFacturado: 0,
      deltaCantidad: -1,
      deltaEconomico: -300,
      estadoLinea: "consumido_de_menos",
      explicacion: "Consumo menor al presupuestado",
      presupuestoItemIds: ["pr-2"],
      remitoItemIds: ["rem-2"],
      consumoItemIds: ["con-2"],
      devolucionItemIds: ["dev-2"],
      invoiceItemIds: [],
    },
  ],
}

describe("ComparativaOperativaV0", () => {
  it("renders comparative lines and metrics from canonical backend response", () => {
    render(
      <ComparativaOperativaV0
        comparativa={mockComparativa}
        loading={false}
        error={null}
      />
    )

    expect(screen.getByText("Tornillo")).toBeInTheDocument()
    expect(screen.getByText("Placa")).toBeInTheDocument()
    expect(screen.getByText("SKU-SHARED")).toBeInTheDocument()
    expect(screen.getByText("SKU-2")).toBeInTheDocument()

    expect(screen.getByRole("columnheader", { name: "Presup." })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Remitido" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Consumido" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Devuelto" })).toBeInTheDocument()
  })

  it("suppresses stale content and shows loading / error status", () => {
    const { rerender } = render(
      <ComparativaOperativaV0
        comparativa={null}
        loading={true}
        error={null}
      />
    )

    expect(screen.getByText(/calculando comparativa/i)).toBeInTheDocument()

    rerender(
      <ComparativaOperativaV0
        comparativa={null}
        loading={false}
        error="Comparativa no disponible"
      />
    )

    expect(screen.getByText(/comparativa no disponible/i)).toBeInTheDocument()
  })

  it("shows an empty state when comparativa has 0 lines", () => {
    render(
      <ComparativaOperativaV0
        comparativa={{
          ...mockComparativa,
          lineas: [],
          summary: {
            ...mockComparativa.summary,
            lineasCount: 0,
          },
        }}
        loading={false}
        error={null}
      />
    )

    expect(screen.getByText(/sin movimientos de materiales/i)).toBeInTheDocument()
  })
})
