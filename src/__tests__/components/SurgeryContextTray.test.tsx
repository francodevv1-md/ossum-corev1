import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SurgeryContextTray } from "@/components/cirugias/SurgeryContextTray"
import type { Surgery } from "@/types"

const mockStoreState = {
  presupuestos: [] as Array<Record<string, unknown>>,
  remitos: [] as Array<Record<string, unknown>>,
}

vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: () => mockStoreState,
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: { id: "company-test-123", name: "Empresa Test" },
    currentAccess: { role: "admin" },
  }),
}))

vi.mock("@/hooks/useSeguimientoFeed", () => ({
  useSeguimientoFeed: () => ({
    entries: [],
    loading: false,
    error: null,
  }),
}))

describe("SurgeryContextTray - Material Fallback Chain", () => {
  const baseSurgery: Surgery = {
    id: "cx-001",
    patient: "Juan Pérez",
    state: "Programada",
    date: "2026-10-01",
    time: "09:00",
    client: "OSDE",
    institution: "Sanatorio Güemes",
    surgeon: "Dr. Rossi",
    procedure: "Artroplastia de cadera",
    classification: "CADERA-01",
  } as unknown as Surgery

  it("prioritizes Presupuesto items when available", () => {
    mockStoreState.presupuestos = [
      {
        id: "pres-1",
        surgeryId: "cx-001",
        items: [
          {
            name: "Prótesis Total Cadera Cementada",
            code: "PTC-001",
            quantity: 2,
            unitPrice: 1500,
          },
        ],
      },
    ]
    mockStoreState.remitos = [
      {
        id: "rem-1",
        surgeryId: "cx-001",
        items: [
          {
            name: "Material Remitado Ignorado",
            code: "REM-001",
            sentQuantity: 5,
          },
        ],
      },
    ]

    render(
      <SurgeryContextTray
        surgery={baseSurgery}
        notes={[]}
        docStatus="Pendiente"
        onOpenExpediente={vi.fn()}
        onAddNote={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText("Prótesis Total Cadera Cementada")).toBeInTheDocument()
    expect(screen.getByText("2 uds.")).toBeInTheDocument()
    expect(screen.queryByText("Material Remitado Ignorado")).not.toBeInTheDocument()
  })

  it("falls back to Remito items when no Presupuesto is found", () => {
    mockStoreState.presupuestos = []
    mockStoreState.remitos = [
      {
        id: "rem-2",
        surgeryId: "cx-001",
        items: [
          {
            name: "Clavo Endomedular Femoral",
            code: "CLAVO-FEM",
            sentQuantity: 3,
            returnedQuantity: 0,
            consumedQuantity: 0,
          },
        ],
      },
    ]

    render(
      <SurgeryContextTray
        surgery={baseSurgery}
        notes={[]}
        docStatus="Pendiente"
        onOpenExpediente={vi.fn()}
        onAddNote={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText("Clavo Endomedular Femoral")).toBeInTheDocument()
    expect(screen.getByText("3 uds.")).toBeInTheDocument()
  })

  it("falls back to Surgery procedure / classification when neither Presupuesto nor Remito exist", () => {
    mockStoreState.presupuestos = []
    mockStoreState.remitos = []

    render(
      <SurgeryContextTray
        surgery={baseSurgery}
        notes={[]}
        docStatus="Pendiente"
        onOpenExpediente={vi.fn()}
        onAddNote={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText("Artroplastia de cadera")).toBeInTheDocument()
    expect(screen.getByText("1 ud.")).toBeInTheDocument()
  })
})
