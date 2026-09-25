import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { LogisticsGlobalInbox } from "@/components/logistica/LogisticsGlobalInbox"

// Mock useAuth
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: { id: "comp-1", name: "Empresa Test" },
    currentUserLoading: false,
    isLoading: false,
  }),
}))

// Mock hooks
const mockInboxData = {
  generatedAt: "2026-09-25T10:00:00Z",
  counts: { news: 2, urgent: 1, overdue: 0, exceptions: 1 },
  items: [
    {
      surgery: {
        id: "surg-1",
        reference: "CX-2026-001",
        date: "2026-09-26T10:00:00Z",
        patient: "Juan Pérez",
        doctor: "Gómez",
        institution: "Sanatorio Central",
        institutionId: "inst-1",
        locality: "CABA",
        surgeryStatus: "Programada",
        preparationStatus: "Lista",
        logisticsStatus: "en_transito",
        priority: "urgent",
      },
      logistics: {
        availability: "available",
        stages: ["dispatch"],
        blockers: { count: 1, highest: "missing_serial" },
        differences: { open: 0, closed: 0 },
        alerts: { count: 0, highest: null },
        exceptions: { count: 1, highest: "blocker" },
        lastNovelty: null,
        nextAction: "Despachar a quirófano",
      },
    },
    {
      surgery: {
        id: "surg-2",
        reference: "CX-2026-002",
        date: "2026-09-27T14:00:00Z",
        patient: "María Rossi",
        doctor: "López",
        institution: "Hospital Alemán",
        institutionId: "inst-2",
        locality: "CABA",
        surgeryStatus: "Programada",
        preparationStatus: "En preparación",
        logisticsStatus: "pending",
        priority: "normal",
      },
      logistics: {
        availability: "available",
        stages: ["prepare"],
        blockers: { count: 0, highest: null },
        differences: { open: 0, closed: 0 },
        alerts: { count: 0, highest: null },
        exceptions: { count: 0, highest: null },
        lastNovelty: null,
        nextAction: "Armar caja",
      },
    },
  ],
  page: { nextCursor: null, hasMore: false },
}

vi.mock("@/hooks/useLogisticsGlobalInbox", () => ({
  useLogisticsGlobalInbox: () => ({
    ready: true,
    hasCompany: true,
    companyId: "comp-1",
    data: mockInboxData,
    loading: false,
    refreshing: false,
    loadingMore: false,
    error: null,
    refresh: vi.fn(),
    loadMore: vi.fn(),
  }),
}))

vi.mock("@/hooks/useLogisticsMap", () => ({
  useLogisticsMap: () => ({
    data: null,
    error: null,
    loading: false,
    refresh: vi.fn(),
    route: null,
    routeLoading: false,
    routeError: null,
    showRoute: vi.fn(),
    hideRoute: vi.fn(),
  }),
}))

vi.mock("@/components/expediente/LogisticsOperationsWorkspace", () => ({
  LogisticsOperationsWorkspace: ({ surgeryId }: { surgeryId: string }) => (
    <div data-testid="operations-workspace">Workspace for {surgeryId}</div>
  ),
}))

describe("LogisticsGlobalInbox", () => {
  it("renders the header and high-level metrics strip", () => {
    render(<LogisticsGlobalInbox />)

    expect(screen.getByText("Centro de Control Logístico & Despacho")).toBeInTheDocument()
    expect(screen.getByText("Bloqueos / Alertas")).toBeInTheDocument()
    expect(screen.getByText("Urgentes")).toBeInTheDocument()
    expect(screen.getByText("Novedades")).toBeInTheDocument()
  })

  it("renders the table with surgery entries and details", () => {
    render(<LogisticsGlobalInbox />)

    expect(screen.getByText("CX-2026-001")).toBeInTheDocument()
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
    expect(screen.getByText("Sanatorio Central")).toBeInTheDocument()

    expect(screen.getByText("CX-2026-002")).toBeInTheDocument()
    expect(screen.getByText("María Rossi")).toBeInTheDocument()
  })

  it("allows switching to grid view", () => {
    render(<LogisticsGlobalInbox />)

    const cardsTab = screen.getByRole("tab", { name: /tarjetas/i })
    fireEvent.click(cardsTab)

    expect(screen.getByText(/Por Despachar \/ En Almacén/i)).toBeInTheDocument()
    expect(screen.getByText(/En Tránsito \/ En Reparto/i)).toBeInTheDocument()
  })

  it("opens detail workspace when clicking Operar", () => {
    render(<LogisticsGlobalInbox />)

    const operateButtons = screen.getAllByRole("button", { name: /operar/i })
    fireEvent.click(operateButtons[0])

    expect(screen.getByTestId("operations-workspace")).toBeInTheDocument()
    expect(screen.getByText("Volver a bandeja")).toBeInTheDocument()
  })

  it("opens share dialog when clicking share button", () => {
    render(<LogisticsGlobalInbox />)

    const shareButtons = screen.getAllByTitle("Compartir estado de logística")
    expect(shareButtons.length).toBeGreaterThan(0)
    fireEvent.click(shareButtons[0])

    expect(screen.getByText("Compartir Estado de Despacho")).toBeInTheDocument()
    expect(screen.getByText(/Plantilla de Comunicación/i)).toBeInTheDocument()
    expect(screen.getByText(/Enviar por WhatsApp/i)).toBeInTheDocument()
  })
})
