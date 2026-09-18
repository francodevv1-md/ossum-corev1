import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  createPresupuestoRevision, deletePresupuestoDraft, emitPresupuesto, fetchPresupuestoCatalogs,
  replacePresupuestoDraft, transitionPresupuesto, type PresupuestoApiRow, type CreatePresupuestoPayload,
} from "@/lib/api/presupuestos"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { canMutatePresupuesto } from "@/lib/permissions/financial-document-email"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), companyId: "company-1" }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: mocks.companyId } }) }))
const row = (id = "budget-1", slot = "DRAFT", revision = 1) => ({ id, slot, revision, state: slot === "DRAFT" ? "Borrador" : "Emitido", items: [] }) as unknown as PresupuestoApiRow
const payload = { title: "Entered data" } as CreatePresupuestoPayload
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe("Sales canonical adapter and hook (adapted source recovery)", () => {
  beforeEach(() => { mocks.companyId = "company-1"; mocks.apiFetch.mockReset() })

  it("loads complete scoped catalogs beyond 500 contacts", async () => {
    mocks.apiFetch.mockImplementation((url: string) => Promise.resolve(url.endsWith("branches") ? [{ id: "branch" }] : url.endsWith("skip=0") ? Array.from({ length: 500 }, (_, id) => ({ id: String(id) })) : [{ id: "last" }]))
    const result = await fetchPresupuestoCatalogs("company/1")
    expect(result.contacts).toHaveLength(501)
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/companies/company%2F1/contacts?isActive=true&take=500&skip=500")
    expect(result.branches).toEqual([{ id: "branch" }])
  })

  it("never returns a partial catalog when later pages fail", async () => {
    mocks.apiFetch.mockResolvedValueOnce([]).mockResolvedValueOnce(Array(500).fill({ id: "contact" })).mockRejectedValueOnce(new Error("page two failed"))
    await expect(fetchPresupuestoCatalogs("company-1")).rejects.toThrow("page two failed")
  })

  it("uses expected revisions and named commands on encoded URLs", async () => {
    mocks.apiFetch.mockResolvedValue(row())
    await createPresupuestoRevision("company/1", "budget/1", 3)
    await emitPresupuesto("company/1", "budget/1", 4)
    await transitionPresupuesto("company/1", "budget/1", "approve", 5)
    await deletePresupuestoDraft("company/1", "budget/1", 6)
    await replacePresupuestoDraft("company/1", "budget/1", { ...payload, expectedRevision: 7 })
    const calls = mocks.apiFetch.mock.calls
    expect(calls.map(([url]) => url)).toEqual(["/versions", "/emitir", "/state", "", ""].map((suffix) => `/api/companies/company%2F1/presupuestos/budget%2F1${suffix}`))
    expect(calls.map(([, init]) => JSON.parse(init.body))).toEqual([{ expectedRevision: 3 }, { expectedRevision: 4 }, { command: "approve", expectedRevision: 5 }, { expectedRevision: 6 }, { ...payload, expectedRevision: 7 }])
    expect(calls.map(([, init]) => init.method)).toEqual(["POST", "POST", "PATCH", "DELETE", "PATCH"])
  })

  it("loads every list page beyond 100, including persisted current and history after remount", async () => {
    mocks.apiFetch.mockImplementation((url: string) => Promise.resolve(url.endsWith("skip=0") ? Array.from({ length: 100 }, (_, id) => row(String(id))) : [row("current", "CURRENT", 3), row("history", "HISTORY", 2)]))
    const first = renderHook(() => usePresupuestos({ take: 100 }))
    await waitFor(() => expect(first.result.current.presupuestos).toHaveLength(102))
    expect(first.result.current.current?.id).toBe("current")
    expect(first.result.current.history[0].id).toBe("history")
    first.unmount()
    const second = renderHook(() => usePresupuestos({ take: 100 }))
    await waitFor(() => expect(second.result.current.presupuestos).toHaveLength(102))
    expect(mocks.apiFetch).toHaveBeenCalledTimes(4)
  })

  it("discards partial lists on failure and allows explicit read retry", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValue([row()])
    const hook = renderHook(() => usePresupuestos())
    await waitFor(() => expect(hook.result.current.error).toBe("offline"))
    expect(hook.result.current.presupuestos).toEqual([])
    await act(async () => { await hook.result.current.refresh() })
    expect(hook.result.current.presupuestos).toHaveLength(1)
  })

  it("keeps accepted create successful when its refresh fails, without POST retry", async () => {
    mocks.apiFetch.mockResolvedValueOnce([]).mockResolvedValueOnce(row()).mockRejectedValueOnce(new Error("GET failed"))
    const hook = renderHook(() => usePresupuestos())
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    await act(async () => { expect(await hook.result.current.create(payload)).toMatchObject({ id: "budget-1" }) })
    expect(hook.result.current.refreshWarning).toContain("Operación guardada")
    expect(hook.result.current.error).toBe("GET failed")
    expect(mocks.apiFetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("surfaces 409 without refreshing, retrying, or changing revisions", async () => {
    const conflict = Object.assign(new Error("409 presupuesto_conflict"), { status: 409 })
    mocks.apiFetch.mockResolvedValueOnce([row()]).mockRejectedValueOnce(conflict)
    const hook = renderHook(() => usePresupuestos())
    await waitFor(() => expect(hook.result.current.draft).not.toBeNull())
    await act(async () => { await expect(hook.result.current.emit("budget-1", 1)).rejects.toThrow("409") })
    expect(hook.result.current.draft?.revision).toBe(1)
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2)
  })

  it("blocks duplicate in-flight commands synchronously", async () => {
    const pending = deferred<PresupuestoApiRow>()
    mocks.apiFetch.mockResolvedValueOnce([row()]).mockReturnValueOnce(pending.promise).mockResolvedValue([])
    const hook = renderHook(() => usePresupuestos())
    await waitFor(() => expect(hook.result.current.draft).not.toBeNull())
    let mutation!: Promise<PresupuestoApiRow>
    await act(async () => {
      mutation = hook.result.current.emit("budget-1", 1)
      await expect(hook.result.current.emit("budget-1", 1)).rejects.toThrow("operación en curso")
    })
    pending.resolve(row())
    await act(async () => { await mutation })
    expect(mocks.apiFetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("hides old-company rows immediately and ignores stale load completion", async () => {
    const oldRead = deferred<PresupuestoApiRow[]>()
    const newRead = deferred<PresupuestoApiRow[]>()
    mocks.apiFetch.mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(newRead.promise)
    const hook = renderHook(() => usePresupuestos())
    mocks.companyId = "company-2"
    hook.rerender()
    expect(hook.result.current.presupuestos).toEqual([])
    await act(async () => { newRead.resolve([row("new")]) })
    await act(async () => { oldRead.resolve([row("old")]) })
    expect(hook.result.current.presupuestos[0].id).toBe("new")
  })

  it("does not refresh a stale mutation or leak its busy/error state after company switch", async () => {
    const pending = deferred<PresupuestoApiRow>()
    mocks.apiFetch.mockImplementation((url: string, init?: RequestInit) => init?.method === "POST" ? pending.promise : Promise.resolve([row(url.includes("company-2") ? "new" : "old")]))
    const hook = renderHook(() => usePresupuestos())
    await waitFor(() => expect(hook.result.current.draft?.id).toBe("old"))
    let mutation!: Promise<PresupuestoApiRow>
    act(() => { mutation = hook.result.current.emit("old", 1) })
    mocks.companyId = "company-2"
    hook.rerender()
    await waitFor(() => expect(hook.result.current.draft?.id).toBe("new"))
    expect(hook.result.current.mutatingId).toBeNull()
    await act(async () => { pending.resolve(row("old")); await mutation })
    expect(hook.result.current.draft?.id).toBe("new")
    expect(mocks.apiFetch).toHaveBeenCalledTimes(3)
  })

  it("retains role policy and excludes local/legacy authority from every Sales production seam", () => {
    expect(["admin", "coordinador", "vendedor"].every(canMutatePresupuesto)).toBe(true)
    expect(canMutatePresupuesto("logistica")).toBe(false)
    for (const file of ["src/app/ventas/presupuestos/page.tsx", "src/components/presupuestos/SalesPresupuestoFormDialog.tsx", "src/hooks/usePresupuestos.ts", "src/lib/api/presupuestos.ts"]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8")
      expect(source).not.toMatch(/from ["']@\/lib\/store|localStorage|usePresupuestoForm|from ["']@\/types|buildEstimativePresupuestoPayload/)
    }
    const page = readFileSync(resolve(process.cwd(), "src/app/ventas/presupuestos/page.tsx"), "utf8")
    expect(page).toContain('canMutate && item.actions.includes')
  })
})
