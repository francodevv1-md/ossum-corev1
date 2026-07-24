/**
 * CirugiasTable regression tests
 *
 * CHATZAI-014B: These tests guard against the "Maximum update depth exceeded"
 * runtime bug that crashed /cirugias.
 *
 * Root cause (14B): `columns` was computed as `CIRUGIAS_COLUMNS.filter(...)` producing
 * a new array reference every render. Since `columns` was a dependency of a
 * useEffect that called `setScrollState(...)`, this created an infinite loop.
 * Fix: Memoize `columns` with useMemo + functional state updater.
 *
 * CHATZAI-014C: The Tooltip component wrapped each instance in its own TooltipProvider,
 * creating N×M nested providers that triggered infinite re-render cascades.
 * Fix: Remove TooltipProvider from inside Tooltip(); rely on single root-level provider.
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen, act } from "@testing-library/react"
import React from "react"

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: useAuthMock,
}))

import { CirugiasTable } from "@/components/cirugias/CirugiasTable"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DEFAULT_VISIBLE_COLS, CIRUGIAS_COLUMNS } from "@/lib/cirugias.constants"
import type { Surgery } from "@/types"

// ─── Mock surgery data ─────────────────────────────────────────────────────────
const mockSurgery: Surgery = {
  id: "1",
  patient: "Juan Pérez",
  patientDni: "12345678",
  surgeon: "Dr. García",
  institution: "Hospital Alemán",
  institutionCity: "CABA",
  procedure: "Reemplazo total de rodilla",
  date: "2025-06-15",
  time: "09:00",
  state: "Realizada",
  client: "OSDE",
  obraSocial: "OSDE 210",
  financiador: "OSDE",
  classification: "Reemplazo total de rodilla",
  preparationState: "Retirado",
  facturado: false,
  autorizado: true,
  prNumber: "PR-001",
  expedienteNumber: "EXP-001",
  coordinadorCx: "Coordinador 1",
  urgente: false,
  leyendaDestacada: false,
  referenciasAdministrativas: [],
}

const mockSurgery2: Surgery = {
  ...mockSurgery,
  id: "2",
  patient: "María López",
  state: "Pendiente",
  prNumber: "PR-002",
  autorizado: false,
}

// ─── Shared props factory ──────────────────────────────────────────────────────
function createTableProps(overrides: Partial<Parameters<typeof CirugiasTable>[0]> = {}) {
  return {
    data: [mockSurgery, mockSurgery2],
    selectedSurgeryId: null as string | null,
    visibleCols: { ...DEFAULT_VISIBLE_COLS },
    sortKey: "id" as string,
    sortDir: "asc" as const,
    onSort: vi.fn(),
    getDocStatus: vi.fn(() => "Incompleta"),
    getConsumoState: vi.fn(() => null),
    getFacturacionStatus: vi.fn(() => "Sin facturar"),
    getPrId: vi.fn(() => undefined),
    onSelect: vi.fn(),
    onOpenExpediente: vi.fn(),
    onOpenPresupuestoDialog: vi.fn(),
    onSetExpTab: vi.fn(),
    onSetDialogSurgery: vi.fn(),
    onSetNewState: vi.fn(() => {}),
    onSetChangeStateDialogOpen: vi.fn(),
    onSetChangeDateDialogOpen: vi.fn(),
    onSetSuspendDialogOpen: vi.fn(),
    onSetCancelDialogOpen: vi.fn(),
    onSetNoteDialogOpen: vi.fn(),
    onSetFacturarDialogOpen: vi.fn(),
    onRecover: vi.fn(),
    canFacturar: vi.fn(() => ({ allowed: false, reason: "No autorizada" })),
    stickyColumns: false,
    columnOrder: CIRUGIAS_COLUMNS.map((c) => c.key),
    ...overrides,
  }
}

/**
 * Wrap component with TooltipProvider (required since CHATZAI-014C:
 * Tooltip no longer wraps itself in TooltipProvider internally).
 */
function wrapWithProviders(ui: React.ReactElement) {
  return <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>
}

describe("CirugiasTable", () => {
  useAuthMock.mockReturnValue({ activeCompany: { id: "company-1" } })

  // ═══════════════════════════════════════════════════════════════
  // REGRESSION: Maximum update depth exceeded (CHATZAI-014B + 014C)
  // ═══════════════════════════════════════════════════════════════
  describe("infinite re-render regression (CHATZAI-014B/014C)", () => {
    it("renders without Maximum update depth exceeded error", async () => {
      const props = createTableProps()

      // This should NOT throw "Maximum update depth exceeded"
      let result: ReturnType<typeof render> | null = null
      await act(async () => {
        result = render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      expect(result).toBeTruthy()
      expect(result!.container).toBeInTheDocument()
    })

    it("renders table rows for each surgery in data", async () => {
      const props = createTableProps()

      await act(async () => {
        render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      // Table should have 2 data rows (one per surgery)
      const rows = screen.getAllByRole("row")
      // 1 header row + 2 data rows = 3 rows
      expect(rows.length).toBeGreaterThanOrEqual(3)
    })

    it("renders patient column with tooltip (no infinite loop from Tooltip)", async () => {
      const props = createTableProps()

      await act(async () => {
        render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      // Patient name should be visible
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
      expect(screen.getByText("María López")).toBeInTheDocument()
    })

    it("does not cause excessive re-renders from scroll state updates", async () => {
      const props = createTableProps()
      const consoleError = vi.spyOn(console, "error")

      await act(async () => {
        render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      // Should NOT have React's "Maximum update depth exceeded" error
      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining("Maximum update depth exceeded"),
        expect.anything(),
        expect.anything()
      )

      consoleError.mockRestore()
    })

    it("handles empty data without crashing", async () => {
      const props = createTableProps({ data: [] })

      await act(async () => {
        render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      expect(screen.getByText(/No se encontraron cirugías/)).toBeInTheDocument()
    })

    it("stable columns ref does not trigger re-renders on parent re-render", async () => {
      // Simulate a parent re-render by rendering twice with same visibleCols
      const props = createTableProps()
      const { rerender } = render(wrapWithProviders(<CirugiasTable {...props} />))

      // Re-render with same props (simulating parent re-render due to store change)
      await act(async () => {
        rerender(wrapWithProviders(<CirugiasTable {...props} />))
      })

      // Should not crash or show error
      const rows = screen.getAllByRole("row")
      expect(rows.length).toBeGreaterThanOrEqual(3)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Basic rendering sanity
  // ═══════════════════════════════════════════════════════════════
  describe("basic rendering", () => {
    it("renders column headers for visible columns", async () => {
      const props = createTableProps()

      await act(async () => {
        render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      expect(screen.getByText("ID CX")).toBeInTheDocument()
      expect(screen.getByText("Paciente")).toBeInTheDocument()
      expect(screen.getByText("Estado CX")).toBeInTheDocument()
    })

    it("uses the legacy CX fallback only when no visible number is available", async () => {
      const props = createTableProps()

      await act(async () => {
        render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      expect(screen.getByText("CX 1")).toBeInTheDocument()
      expect(screen.getByText("CX 2")).toBeInTheDocument()
    })

    it("prioritizes visibleNumber and uses the explicit unavailable fallback", async () => {
      const props = createTableProps({
        data: [
          { ...mockSurgery, visibleNumber: "CX-0042" },
          { ...mockSurgery2, id: "" } as Surgery,
        ],
      })

      await act(async () => {
        render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      expect(screen.getByText("CX-0042")).toBeInTheDocument()
      expect(screen.getByText("CX sin número visible")).toBeInTheDocument()
    })

    it("renders selected row with different styling", async () => {
      const props = createTableProps({ selectedSurgeryId: "1" })

      await act(async () => {
        render(wrapWithProviders(<CirugiasTable {...props} />))
      })

      // The row for surgery 1 should have a selected class
      const cell = screen.getByText("CX 1")
      expect(cell.closest("tr")).toHaveClass("bg-sky-50/80")
    })
  })
})
