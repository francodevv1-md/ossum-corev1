import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  buildEstimativePresupuestoPayload,
  createPresupuestoRevision,
  fetchPresupuestoCatalogs,
  type PresupuestoApiRow,
} from "@/lib/api/presupuestos"
import type { FormItem, PresupuestoFormData } from "@/hooks/usePresupuestoForm"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { canMutatePresupuesto } from "@/lib/permissions/financial-document-email"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
const authState = vi.hoisted(() => ({ companyId: "company-1" }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: authState.companyId } }) }))

const row = (state: "Borrador" | "Emitido", slot: "DRAFT" | "CURRENT", revision: number) => ({
  id: "budget-1", surgeryId: "surgery-1", state, slot, revision, versionNumber: 1,
  visibleNumber: state === "Emitido" ? 7 : null, items: [],
}) as unknown as PresupuestoApiRow

describe("Presupuesto Sales canonical adapter", () => {
  beforeEach(() => {
    authState.companyId = "company-1"
    mocks.apiFetch.mockReset()
  })

  it("loads company-scoped branch and contact catalogs", async () => {
    mocks.apiFetch.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    await fetchPresupuestoCatalogs("company/1")
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(1, "/api/companies/company%2F1/branches")
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(2, "/api/companies/company%2F1/contacts?isActive=true&take=500")
  })

  it("keeps explicitly selected client and payer IDs distinct", () => {
    const form = {
      branchId: "branch-1",
      clientContactId: "client-1",
      payerContactId: "payer-2",
      concepto: "Implantes",
      fechaEmision: "2026-08-31",
      vigencia: "30 días",
      listaPrecios: "LP-1",
      condicionPago: "30 días",
      descuento: 0,
      observaciones: "",
    } as PresupuestoFormData
    const items = [{ code: "A-1", name: "Implante", quantity: 1, unitPrice: 100, discountPercent: 0, ivaKey: "21", catalogItemId: "", isArticuloLibre: true, descripcionLibre: "Implante", codeResolved: false }] as FormItem[]
    const payload = buildEstimativePresupuestoPayload(form, items)
    expect(payload).toMatchObject({ branchId: "branch-1", clientContactId: "client-1", payerContactId: "payer-2" })
    expect(payload.clientContactId).not.toBe(payload.payerContactId)
  })

  it("appends commands after the encoded record ID", async () => {
    mocks.apiFetch.mockResolvedValueOnce({ id: "budget-1" })
    await createPresupuestoRevision("company-1", "budget/1", 3)
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/companies/company-1/presupuestos/budget%2F1/versions",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ expectedRevision: 3 }) }),
    )
  })

  it("reloads Sales authority from the API after remount", async () => {
    mocks.apiFetch.mockResolvedValue([row("Emitido", "CURRENT", 2)])

    const first = renderHook(() => usePresupuestos({ take: 100 }))
    await waitFor(() => expect(first.result.current.current?.state).toBe("Emitido"))
    first.unmount()
    const second = renderHook(() => usePresupuestos({ take: 100 }))
    await waitFor(() => expect(second.result.current.current?.visibleNumber).toBe(7))

    expect(mocks.apiFetch).toHaveBeenCalledTimes(2)
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(2, "/api/companies/company-1/presupuestos?take=100")
  })

  it("refetches canonical state after a Sales command", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce([row("Borrador", "DRAFT", 1)])
      .mockResolvedValueOnce(row("Emitido", "CURRENT", 2))
      .mockResolvedValueOnce([row("Emitido", "CURRENT", 2)])
    const hook = renderHook(() => usePresupuestos({ surgeryId: "surgery-1", take: 100 }))
    await waitFor(() => expect(hook.result.current.draft?.state).toBe("Borrador"))

    await act(async () => { await hook.result.current.emit("budget-1", 1) })

    await waitFor(() => expect(hook.result.current.current?.state).toBe("Emitido"))
    expect(mocks.apiFetch).toHaveBeenLastCalledWith("/api/companies/company-1/presupuestos?surgeryId=surgery-1&take=100")
  })

  it("ignores a stale response after the active company changes", async () => {
    let resolveFirst!: (rows: PresupuestoApiRow[]) => void
    let resolveSecond!: (rows: PresupuestoApiRow[]) => void
    mocks.apiFetch
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))

    const hook = renderHook(() => usePresupuestos({ take: 100 }))
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company-1/presupuestos?take=100"))

    authState.companyId = "company-2"
    hook.rerender()
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company-2/presupuestos?take=100"))

    resolveSecond([{ ...row("Emitido", "CURRENT", 2), id: "company-2-budget" }])
    await waitFor(() => expect(hook.result.current.current?.id).toBe("company-2-budget"))
    resolveFirst([{ ...row("Emitido", "CURRENT", 2), id: "company-1-budget" }])
    await act(async () => {})

    expect(hook.result.current.current?.id).toBe("company-2-budget")
  })

  it("hides old-company rows while the new company is loading", async () => {
    let resolveSecond!: (rows: PresupuestoApiRow[]) => void
    mocks.apiFetch
      .mockResolvedValueOnce([{ ...row("Emitido", "CURRENT", 2), id: "company-1-budget" }])
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))

    const hook = renderHook(() => usePresupuestos({ take: 100 }))
    await waitFor(() => expect(hook.result.current.current?.id).toBe("company-1-budget"))

    authState.companyId = "company-2"
    hook.rerender()

    expect(hook.result.current.presupuestos).toEqual([])
    expect(hook.result.current.current).toBeNull()
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company-2/presupuestos?take=100"))
    expect(hook.result.current.presupuestos).toEqual([])

    resolveSecond([{ ...row("Emitido", "CURRENT", 2), id: "company-2-budget" }])
    await waitFor(() => expect(hook.result.current.current?.id).toBe("company-2-budget"))
  })

  it("does not let an old-company mutation refetch overwrite the current company", async () => {
    let resolveMutation!: (value: PresupuestoApiRow) => void
    mocks.apiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise((resolve) => { resolveMutation = resolve })
      if (url.includes("company-2")) return Promise.resolve([{ ...row("Emitido", "CURRENT", 2), id: "company-2-budget" }])
      return Promise.resolve([row("Borrador", "DRAFT", 1)])
    })

    const hook = renderHook(() => usePresupuestos({ take: 100 }))
    await waitFor(() => expect(hook.result.current.draft?.state).toBe("Borrador"))
    let mutation!: Promise<PresupuestoApiRow>
    act(() => { mutation = hook.result.current.emit("budget-1", 1) })

    authState.companyId = "company-2"
    hook.rerender()
    await waitFor(() => expect(hook.result.current.current?.id).toBe("company-2-budget"))

    resolveMutation(row("Emitido", "CURRENT", 2))
    await act(async () => { await mutation })

    expect(hook.result.current.current?.id).toBe("company-2-budget")
    expect(mocks.apiFetch).not.toHaveBeenCalledWith("/api/companies/company-1/presupuestos?take=100", expect.anything())
    expect(mocks.apiFetch).toHaveBeenCalledTimes(3)
  })

  it("uses the existing mutation role set to hide Sales write controls", () => {
    expect(["admin", "coordinador", "vendedor"].every(canMutatePresupuesto)).toBe(true)
    expect(canMutatePresupuesto("logistica")).toBe(false)
    const source = readFileSync(resolve(process.cwd(), "src/app/ventas/presupuestos/page.tsx"), "utf8")
    expect(source).toContain("canMutate && item.actions.includes")
    expect(source).toContain("{canMutate && <PresupuestoFormDialog")
  })
})
