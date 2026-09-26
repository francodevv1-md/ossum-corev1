import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PresupuestoPanel } from "@/components/expediente/PresupuestoPanel"
import type { PresupuestoApiRow } from "@/lib/api/presupuestos"
import type { Surgery } from "@/types"

const mocks = vi.hoisted(() => ({
  emit: vi.fn().mockResolvedValue({}),
  refresh: vi.fn(),
  transition: vi.fn(),
  revise: vi.fn(),
  deleteDraft: vi.fn(),
  usePresupuestos: vi.fn(),
}))
const authState = vi.hoisted(() => ({ role: "admin" }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ currentAccess: { role: authState.role } }) }))
vi.mock("@/hooks/usePresupuestos", () => ({
  usePresupuestos: mocks.usePresupuestos,
}))
vi.mock("@/components/presupuestos/PresupuestoFormDialog", () => ({ PresupuestoFormDialog: () => null }))

describe("Presupuesto Expediente authority", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.role = "admin"
    mocks.usePresupuestos.mockReturnValue({
      presupuestos: [{ id: "budget-1", visibleNumber: 7, versionNumber: 1, state: "Borrador", slot: "DRAFT", revision: 2, total: "121", documentDate: "2026-08-31", createdAt: "2026-08-31T12:00:00Z", commercialSnapshot: { branch: { name: "Sucursal Norte" }, client: { legalName: "Cliente A" }, payer: { legalName: "Pagador B" } }, actions: ["emit"], items: [] }] as unknown as PresupuestoApiRow[],
      current: null,
      draft: { id: "budget-1" },
      loading: false,
      error: null,
      emit: mocks.emit,
      refresh: mocks.refresh,
      transition: mocks.transition,
      revise: mocks.revise,
      deleteDraft: mocks.deleteDraft,
    })
  })

  it("renders canonical snapshots and executes server-valid actions", async () => {
    render(<PresupuestoPanel surgery={{ id: "CX-7", backendId: "surgery-7" } as Surgery} />)
    expect(screen.getByText("Cliente A")).toBeInTheDocument()
    expect(screen.getByText("Pagador B")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Emitir" }))
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledWith("budget-1", 2))
  })

  it("shows API failures without inventing an empty local result or mutating data", () => {
    mocks.usePresupuestos.mockReturnValue({
      presupuestos: [], current: null, draft: null, loading: false, error: "Backend unavailable",
      emit: mocks.emit, refresh: mocks.refresh, transition: mocks.transition, revise: mocks.revise, deleteDraft: mocks.deleteDraft,
    })

    render(<PresupuestoPanel surgery={{ id: "CX-7", backendId: "surgery-7" } as Surgery} />)

    expect(screen.getByText("Backend unavailable")).toBeInTheDocument()
    expect(screen.queryByText("La cirugía todavía no tiene presupuesto.")).not.toBeInTheDocument()
    expect(mocks.emit).not.toHaveBeenCalled()
    expect(mocks.transition).not.toHaveBeenCalled()
    expect(mocks.deleteDraft).not.toHaveBeenCalled()
  })

  it("reloads Expediente from canonical hook state and exposes manual refetch", () => {
    const first = render(<PresupuestoPanel surgery={{ id: "CX-7", backendId: "surgery-7" } as Surgery} />)
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }))
    expect(mocks.refresh).toHaveBeenCalledOnce()
    first.unmount()

    mocks.usePresupuestos.mockReturnValue({
      presupuestos: [{ id: "budget-1", visibleNumber: 7, versionNumber: 1, state: "Emitido", slot: "CURRENT", revision: 3, total: "242", documentDate: "2026-08-31", createdAt: "2026-08-31T12:00:00Z", commercialSnapshot: { branch: { name: "Sucursal Norte" }, client: { legalName: "Cliente recargado" }, payer: { legalName: "Pagador B" } }, actions: ["approve"], items: [] }] as unknown as PresupuestoApiRow[],
      current: { id: "budget-1" }, draft: null, loading: false, error: null,
      emit: mocks.emit, refresh: mocks.refresh, transition: mocks.transition, revise: mocks.revise, deleteDraft: mocks.deleteDraft,
    })

    render(<PresupuestoPanel surgery={{ id: "CX-7", backendId: "surgery-7" } as Surgery} />)
    expect(screen.getByText("Cliente recargado")).toBeInTheDocument()
    expect(screen.getByText(/Emitido/)).toBeInTheDocument()
  })

  it("hides every Presupuesto mutation from read-only roles", () => {
    authState.role = "logistica"
    mocks.usePresupuestos.mockReturnValue({
      presupuestos: [{ id: "budget-1", visibleNumber: null, versionNumber: 1, state: "Borrador", slot: "DRAFT", revision: 2, total: "121", documentDate: "2026-08-31", createdAt: "2026-08-31T12:00:00Z", commercialSnapshot: {}, actions: ["edit", "emit", "approve", "reject", "revise", "annul", "delete"], items: [] }] as unknown as PresupuestoApiRow[],
      current: null, draft: null, loading: false, error: null,
      emit: mocks.emit, refresh: mocks.refresh, transition: mocks.transition, revise: mocks.revise, deleteDraft: mocks.deleteDraft,
    })

    render(<PresupuestoPanel surgery={{ id: "CX-7", backendId: "surgery-7" } as Surgery} />)

    for (const name of ["Nuevo", "Editar", "Emitir", "Aprobar", "Rechazar", "Revisar", "Anular", "Eliminar"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument()
  })

  it("gates every Presupuesto mutation on the still-routable legacy Expediente page", () => {
    const source = readFileSync("src/app/expediente/page.tsx", "utf8")
    const gatedActions = source.match(/\{canMutate && \(\s*<div className="flex gap-2">([\s\S]*?)<\/div>\s*\)\}/)?.[1] ?? ""
    const emptyStateGate = source.slice(source.indexOf("{canMutate && (", source.indexOf("No hay presupuesto asociado")), source.indexOf(")}", source.indexOf("No hay presupuesto asociado")))

    expect(source).toContain('import { useAuth } from "@/components/auth/AuthProvider"')
    expect(source).toContain('import { canMutatePresupuesto } from "@/lib/permissions/financial-document-email"')
    expect(source).toContain("const canMutate = canMutatePresupuesto(currentAccess?.role)")
    for (const action of ['"enviar"', '"aprobar"', '"rechazar"']) expect(gatedActions).toContain(action)
    expect(emptyStateGate).toContain("Crear presupuesto")
  })

  it("keeps visible integration seams free of Zustand Presupuesto authority", () => {
    const files = [
      "../../app/cirugias/page.tsx",
      "../../app/tablero/page.tsx",
      "../../app/expediente/page.tsx",
      "../../app/ventas/facturacion/page.tsx",
      "../../app/ventas/pendientes-facturar/page.tsx",
      "../../components/consumos/consumos/ConsumoFormDialog.tsx",
      "../../components/cirugias/SmartSurgerySearch.tsx",
      "../../components/coordinadores/workspace/CaseDetail.tsx",
      "../../components/remitos/RemitoFormDialog.tsx",
      "../../hooks/useCirugiaSelection.ts",
      "../../hooks/useCirugiasFilters.ts",
      "../../hooks/useConsumo.ts",
    ]
    const forbidden = /(?:store\.(?:presupuestos|getPresupuestosBySurgeryId|getPresupuestoVigenteBySurgeryId|createBudgetForSurgery|createBudgetIndependent|authorizeBudget|enviarPresupuesto|rechazarPresupuesto|bloquearPresupuesto|generateOrderFromBudget)|useOrtoTrackStore\(\(s\) => s\.presupuestos)/

    for (const file of files) {
      expect(readFileSync(new URL(file, import.meta.url), "utf8"), file).not.toMatch(forbidden)
    }

    for (const file of [
      "../../components/cirugias/SmartSurgerySearch.tsx",
      "../../app/tablero/page.tsx",
      "../../components/coordinadores/workspace/CaseDetail.tsx",
    ]) {
      expect(readFileSync(new URL(file, import.meta.url), "utf8"), file).not.toMatch(/\b(?:surgery|s)\.(?:presupuestoId|prNumber)\b/)
    }
  })
})
