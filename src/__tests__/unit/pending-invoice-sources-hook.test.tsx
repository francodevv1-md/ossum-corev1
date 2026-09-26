import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), fetchPresupuestos: vi.fn(), fetchConsumos: vi.fn(), fetchBackendActiveSurgeries: vi.fn() }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: mocks.useAuth }))
vi.mock("@/lib/api/presupuestos", () => ({ fetchPresupuestos: mocks.fetchPresupuestos }))
vi.mock("@/lib/api/consumos", () => ({ fetchConsumos: mocks.fetchConsumos }))
vi.mock("@/lib/api/backend-surgeries", () => ({ fetchBackendActiveSurgeries: mocks.fetchBackendActiveSurgeries }))

import { derivePendingInvoiceCandidates, usePendingInvoiceSources } from "@/hooks/usePendingInvoiceSources"
import type { ConsumoApiRow } from "@/lib/api/consumos"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { PresupuestoApiRow } from "@/lib/api/presupuestos"

const budget = (id: string, surgeryId: string, companyId = "company-a") => ({ id, surgeryId, companyId, state: "Aprobado", slot: "CURRENT", currency: "ARS", total: "100.1234" }) as PresupuestoApiRow
const consumo = (id: string, surgeryId: string, companyId = "company-a") => ({ id, surgeryId, companyId, state: "Validado" }) as ConsumoApiRow

describe("pending invoice sources", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-a" } })
    mocks.fetchBackendActiveSurgeries.mockResolvedValue([])
  })

  it("adds human-readable case and document labels without replacing backend ids", () => {
    const presupuesto = { ...budget("budget-1", "surgery-1"), visibleNumber: 17, title: "Prótesis de cadera" }
    const consumoRow = { ...consumo("consumo-1", "surgery-1"), visibleNumber: 8 }
    const [row] = derivePendingInvoiceCandidates("company-a", [presupuesto], [consumoRow], [], [{
      id: "CX-2041",
      backendId: "surgery-1",
      visibleNumber: "CX-2041",
      patient: "Ana Pérez",
      institution: "Hospital Central",
    } as never])

    expect(row).toEqual(expect.objectContaining({
      surgeryId: "surgery-1",
      surgeryNumber: "CX-2041",
      patientName: "Ana Pérez",
      institutionName: "Hospital Central",
      presupuestoNumber: "P-0017",
      consumoNumber: "C-0008",
      title: "Prótesis de cadera",
    }))
  })

  it("prefers validated consumption, suppresses its budget, and excludes active origins", () => {
    const rows = derivePendingInvoiceCandidates(
      "company-a",
      [budget("budget-1", "surgery-1"), budget("budget-2", "surgery-2"), budget("budget-3", "surgery-3")],
      [consumo("consumo-1", "surgery-1")],
      [{ state: "Emitida", presupuestoId: "budget-3", consumoId: null } as InvoiceApiRow],
    )
    expect(rows).toEqual([
      expect.objectContaining({ kind: "consumo", surgeryId: "surgery-1", presupuestoId: "budget-1", consumoId: "consumo-1" }),
      expect.objectContaining({ kind: "presupuesto", surgeryId: "surgery-2", presupuestoId: "budget-2", amount: "100.1234" }),
    ])
  })

  it("fully paginates both sources in 500-row pages", async () => {
    mocks.fetchPresupuestos.mockResolvedValueOnce(Array.from({ length: 500 }, (_, index) => budget(`budget-${index}`, `surgery-${index}`))).mockResolvedValueOnce([])
    mocks.fetchConsumos.mockResolvedValueOnce(Array.from({ length: 500 }, (_, index) => consumo(`consumo-${index}`, `surgery-${index}`))).mockResolvedValueOnce([])
    renderHook(() => usePendingInvoiceSources([]))

    await waitFor(() => expect(mocks.fetchPresupuestos).toHaveBeenCalledTimes(2))
    expect(mocks.fetchPresupuestos).toHaveBeenNthCalledWith(2, "company-a", { state: "Aprobado", take: 500, skip: 500 })
    expect(mocks.fetchConsumos).toHaveBeenNthCalledWith(2, "company-a", { state: "Validado", take: 500, skip: 500 })
  })

  it("keeps core pending sources available when optional surgery labels fail", async () => {
    mocks.fetchPresupuestos.mockResolvedValueOnce([budget("budget-1", "surgery-1")])
    mocks.fetchConsumos.mockResolvedValueOnce([])
    mocks.fetchBackendActiveSurgeries.mockRejectedValueOnce(new Error("surgeries unavailable"))

    const { result } = renderHook(() => usePendingInvoiceSources([]))

    await waitFor(() => expect(result.current.candidates[0]?.presupuestoId).toBe("budget-1"))
    expect(result.current.error).toBeNull()
  })

  it("drops stale source responses immediately after company change", async () => {
    type PendingCompany = {
      budgets?: (rows: PresupuestoApiRow[]) => void
      consumos?: (rows: ConsumoApiRow[]) => void
    }
    const pending = new Map<string, PendingCompany>()
    mocks.fetchPresupuestos.mockImplementation((companyId: string) => new Promise((resolve) => {
      const entry = pending.get(companyId) ?? {}
      entry.budgets = resolve
      pending.set(companyId, entry)
    }))
    mocks.fetchConsumos.mockImplementation((companyId: string) => new Promise((resolve) => {
      const entry = pending.get(companyId) ?? {}
      entry.consumos = resolve
      pending.set(companyId, entry)
    }))
    const { result, rerender } = renderHook(() => usePendingInvoiceSources([]))
    await waitFor(() => expect(pending.get("company-a")?.consumos).toBeTypeOf("function"))

    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-b" } })
    rerender()
    expect(result.current.candidates).toEqual([])
    await waitFor(() => expect(pending.get("company-b")?.consumos).toBeTypeOf("function"))

    await act(async () => {
      pending.get("company-b")!.budgets!([budget("budget-b", "surgery-b", "company-b")])
      pending.get("company-b")!.consumos!([])
    })
    await waitFor(() => expect(result.current.candidates[0]?.presupuestoId).toBe("budget-b"))
    await act(async () => {
      pending.get("company-a")!.budgets!([budget("budget-a", "surgery-a")])
      pending.get("company-a")!.consumos!([])
    })
    expect(result.current.candidates[0]?.presupuestoId).toBe("budget-b")
  })
})
