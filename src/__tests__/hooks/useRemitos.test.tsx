import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CreateRemitoPayload, ListRemitosParams, RemitoApiRow } from "@/lib/api/remitos"

const mocks = vi.hoisted(() => ({
  company: "company-a" as string | undefined, user: "user-a", authLoading: false,
  userLoading: false, authenticated: true,
  list: vi.fn(), detail: vi.fn(), create: vi.fn(), edit: vi.fn(), emit: vi.fn(), state: vi.fn(), returns: vi.fn(),
}))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({
  activeCompany: mocks.company ? { id: mocks.company } : null, currentUser: { id: mocks.user },
  isLoading: mocks.authLoading, currentUserLoading: mocks.userLoading, isAuthenticated: mocks.authenticated,
}) }))
vi.mock("@/lib/api/remitos", () => ({
  fetchRemitos: mocks.list, fetchRemito: mocks.detail, createRemito: mocks.create,
  updateRemitoDraft: mocks.edit, emitirRemito: mocks.emit, updateRemitoState: mocks.state,
  registrarRemitoDevolucion: mocks.returns,
}))
import { useRemitos } from "@/hooks/useRemitos"

function row(id: string, companyId = "company-a"): RemitoApiRow {
  return { id, companyId, visibleNumber: null, state: "Borrador", updatedAt: "2026-10-07T12:00:00Z", items: [] } as unknown as RemitoApiRow
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.company = "company-a"; mocks.user = "user-a"
  mocks.authLoading = false; mocks.userLoading = false; mocks.authenticated = true
  mocks.list.mockResolvedValue([row("first"), row("second")])
  mocks.detail.mockImplementation(async (_company: string, id: string) => row(id))
  mocks.emit.mockResolvedValue({ id: "first", state: "Emitido" })
})
afterEach(cleanup)

describe("R7 scoped return command retries", () => {
  it.each([false, true])("coalesces identical in-flight returns, response loss=%s", async (failed) => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const response = deferred<RemitoApiRow>()
    mocks.returns.mockReturnValueOnce(response.promise).mockResolvedValue(row("first"))
    const items = [{ itemId: "item", returnedQuantity: "1" }]
    let first!: Promise<RemitoApiRow>, second!: Promise<RemitoApiRow>
    act(() => { first = result.current.devolucion("first", items); second = result.current.devolucion("first", items) })
    expect(first).toBe(second)
    expect(mocks.returns).toHaveBeenCalledTimes(1)
    const key = mocks.returns.mock.calls[0][3]
    if (failed) {
      await act(async () => { const check = expect(first).rejects.toThrow("Response lost"); response.reject(new Error("Response lost")); await check })
      await act(async () => { await result.current.devolucion("first", items) })
      expect(mocks.returns.mock.calls[1][3]).toBe(key)
    } else {
      await act(async () => { response.resolve(row("first")); await Promise.all([first, second]) })
      await act(async () => { await result.current.devolucion("first", items) })
      expect(mocks.returns.mock.calls[1][3]).not.toBe(key)
    }
  })
  it("does not let an obsolete callback replace the current view's retained failed command", async () => {
    const { result, rerender } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const obsolete = result.current.devolucion
    mocks.company = "company-b"; rerender()
    await waitFor(() => expect(result.current.ready).toBe(true))
    mocks.returns.mockRejectedValue(new Error("Response lost"))
    const items = [{ itemId: "item", returnedQuantity: "1" }]
    await act(async () => { await expect(result.current.devolucion("first", items)).rejects.toThrow("Response lost") })
    const key = mocks.returns.mock.calls[0][3]
    await expect(obsolete("other", items)).rejects.toThrow("La vista de remitos cambió")
    await act(async () => { await expect(result.current.devolucion("first", items)).rejects.toThrow("Response lost") })
    expect(mocks.returns.mock.calls[1][3]).toBe(key)
  })
  it("retains one key for the same failed return and clears it after success", async () => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    mocks.returns.mockRejectedValueOnce(new Error("Response lost")).mockResolvedValue({ id: "first" })
    const items = [{ itemId: "item", returnedQuantity: "1" }]
    await act(async () => { await expect(result.current.devolucion("first", items)).rejects.toThrow("Response lost") })
    await act(async () => { await result.current.devolucion("first", items) })
    const first = mocks.returns.mock.calls[0][3], retry = mocks.returns.mock.calls[1][3]
    expect(first).toEqual(expect.any(String))
    expect(retry).toBe(first)
    await act(async () => { await result.current.devolucion("first", items) })
    expect(mocks.returns.mock.calls[2][3]).not.toBe(first)
  })
  it("changes the command key when content or current company changes", async () => {
    const { result, rerender } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    mocks.returns.mockRejectedValue(new Error("Response lost"))
    const send = async (quantity: string) => { await expect(result.current.devolucion("first", [{ itemId: "item", returnedQuantity: quantity }])).rejects.toThrow("Response lost") }
    await act(async () => send("1"))
    await act(async () => send("2"))
    const original = mocks.returns.mock.calls[0][3], edited = mocks.returns.mock.calls[1][3]
    expect(original).toEqual(expect.any(String)); expect(edited).not.toBe(original)
    mocks.company = "company-b"; rerender()
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => send("2"))
    expect(mocks.returns.mock.calls[2][3]).not.toBe(edited)
  })
})

describe("useRemitos stable scoped reads", () => {
  it("does not restart a pending request for equal-valued inline filters", async () => {
    const pending = deferred<RemitoApiRow[]>()
    mocks.list.mockReturnValue(pending.promise)
    const { rerender, unmount } = renderHook(() => useRemitos({ surgeryId: "cx-a", take: 50 }))
    rerender(); rerender()
    expect(mocks.list).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("does not expose previous-company rows while the next company loads", async () => {
    const { result, rerender } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    mocks.company = "company-b"; mocks.list.mockReturnValue(new Promise(() => {})); rerender()
    expect(result.current.remitos).toEqual([])
    expect(result.current.selectedRemito).toBeNull()
  })

  it("ignores late previous-company success after the new company has loaded", async () => {
    const old = deferred<RemitoApiRow[]>()
    mocks.list.mockReturnValueOnce(old.promise).mockResolvedValue([row("new", "company-b")])
    const { result, rerender } = renderHook(() => useRemitos())
    mocks.company = "company-b"; rerender()
    await waitFor(() => expect(result.current.remitos[0]?.id).toBe("new"))
    await act(async () => old.resolve([row("old")]))
    expect(result.current.remitos[0]?.id).toBe("new")
  })

  it("ignores late filter errors without clearing the current list", async () => {
    const old = deferred<RemitoApiRow[]>()
    mocks.list.mockReturnValueOnce(old.promise).mockResolvedValue([row("filtered")])
    const { result, rerender } = renderHook(({ filters }) => useRemitos(filters), { initialProps: { filters: { state: "Borrador" } as ListRemitosParams } })
    rerender({ filters: { state: "Emitido" } })
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => old.reject(new Error("old failure")))
    expect(result.current.remitos[0]?.id).toBe("filtered")
    expect(result.current.error).toBeNull()
  })

  it("latest refresh wins when requests complete out of order", async () => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const old = deferred<RemitoApiRow[]>(), latest = deferred<RemitoApiRow[]>()
    mocks.list.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    let first!: Promise<void>, second!: Promise<void>
    act(() => { first = result.current.refresh(); second = result.current.refresh() })
    await act(async () => { latest.resolve([row("latest")]); await second })
    await act(async () => { old.resolve([row("old")]); await first })
    expect(result.current.remitos[0]?.id).toBe("latest")
    expect(result.current.loading).toBe(false)
  })

  it("latest selection wins when detail requests finish out of order", async () => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const old = deferred<RemitoApiRow>(), latest = deferred<RemitoApiRow>()
    mocks.detail.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    let first!: Promise<void>, second!: Promise<void>
    act(() => { first = result.current.selectRemito(row("first")); second = result.current.selectRemito(row("second")) })
    await act(async () => { latest.resolve(row("second")); await second })
    await act(async () => { old.resolve(row("first")); await first })
    expect(result.current.selectedRemito?.id).toBe("second")
  })

  it("does not apply old detail errors after a later selection succeeds", async () => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const old = deferred<RemitoApiRow>()
    mocks.detail.mockReturnValueOnce(old.promise)
    let first!: Promise<void>
    act(() => { first = result.current.selectRemito(row("first")) })
    await act(async () => { await result.current.selectRemito(row("second")) })
    await act(async () => { old.reject(new Error("old detail failure")); await first })
    expect(result.current.error).toBeNull()
    expect(result.current.selectedRemito?.id).toBe("second")
  })

  it("invalidates pending reads during auth loading", async () => {
    const pending = deferred<RemitoApiRow[]>()
    mocks.list.mockReturnValue(pending.promise)
    const { result, rerender } = renderHook(() => useRemitos())
    mocks.authLoading = true; rerender()
    await act(async () => pending.resolve([row("late")]))
    expect(result.current.ready).toBe(false)
    expect(result.current.remitos).toEqual([])
  })

  it("invalidates old user data even within the same company", async () => {
    const { result, rerender } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    mocks.user = "user-b"; mocks.list.mockReturnValue(new Promise(() => {})); rerender()
    expect(result.current.remitos).toEqual([])
  })

  it("survives StrictMode cleanup/replay without accepting the first response", async () => {
    const old = deferred<RemitoApiRow[]>()
    mocks.list.mockReturnValueOnce(old.promise).mockResolvedValue([row("latest")])
    const { result } = renderHook(() => useRemitos({ take: 100 }), { reactStrictMode: true })
    expect(mocks.list).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(result.current.remitos[0]?.id).toBe("latest"))
    await act(async () => old.resolve([row("old")]))
    expect(result.current.remitos[0]?.id).toBe("latest")
  })

  it("keeps a selection made while a list refresh was pending", async () => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const pending = deferred<RemitoApiRow[]>()
    mocks.list.mockReturnValueOnce(pending.promise)
    let refresh!: Promise<void>
    act(() => { refresh = result.current.refresh() })
    await act(async () => { await result.current.selectRemito(row("second")) })
    await act(async () => { pending.resolve([row("first")]); await refresh })
    expect(result.current.selectedRemito?.id).toBe("second")
  })

  it("invalidates detail reads started before a mutation", async () => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const pending = deferred<RemitoApiRow>()
    mocks.detail.mockReturnValueOnce(pending.promise)
    let detail!: Promise<void>
    act(() => { detail = result.current.selectRemito(row("first")) })
    mocks.list.mockResolvedValue([{ ...row("first"), state: "Emitido" }])
    await act(async () => { await result.current.emit("first") })
    await act(async () => { pending.resolve(row("first")); await detail })
    expect(result.current.selectedRemito?.state).toBe("Emitido")
  })

  it.each(["success", "error"])("does not refresh or change new-company state after old mutation %s", async outcome => {
    const { result, rerender } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const pending = deferred<RemitoApiRow>()
    mocks.emit.mockReturnValueOnce(pending.promise)
    let mutation!: Promise<RemitoApiRow | undefined>
    act(() => { mutation = result.current.emit("first").catch(() => undefined) })
    mocks.company = "company-b"; mocks.list.mockResolvedValue([row("new", "company-b")]); rerender()
    await waitFor(() => expect(result.current.remitos[0]?.id).toBe("new"))
    const count = mocks.list.mock.calls.length
    await act(async () => { outcome === "success" ? pending.resolve(row("first")) : pending.reject(new Error("old mutation")); await mutation })
    expect(mocks.list).toHaveBeenCalledTimes(count)
    expect(result.current.remitos[0]?.id).toBe("new")
    expect(result.current.error).toBeNull()
    expect(result.current.mutatingId).toBeNull()
  })

  it("does not fetch old-company detail after late draft creation", async () => {
    const { result, rerender } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const pending = deferred<RemitoApiRow>()
    mocks.create.mockReturnValueOnce(pending.promise)
    let creation!: Promise<RemitoApiRow>
    act(() => { creation = result.current.createDraft({ branchId: "branch-a", origin: "manual", salidaReason: "cirugia", items: [{ description: "Item", quantity: "1" }] }) })
    mocks.company = "company-b"; mocks.list.mockResolvedValue([row("new", "company-b")]); rerender()
    await waitFor(() => expect(result.current.remitos[0]?.id).toBe("new"))
    await act(async () => { pending.resolve(row("created")); await creation })
    expect(mocks.detail).not.toHaveBeenCalled()
    expect(result.current.selectedRemito?.id).toBe("new")
  })

  it("keeps ordinary creation hydrated and selected", async () => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    mocks.create.mockResolvedValue(row("created"))
    const payload: CreateRemitoPayload = { branchId: "branch-a", origin: "manual", salidaReason: "cirugia", items: [{ description: "Item", quantity: "1" }] }
    await act(async () => { await result.current.createDraft(payload) })
    expect(mocks.create).toHaveBeenCalledWith("company-a", payload)
    expect(mocks.detail).toHaveBeenCalledWith("company-a", "created")
    expect(result.current.selectedRemito?.id).toBe("created")
    expect(result.current.remitos.filter(remito => remito.id === "created")).toHaveLength(1)
  })

  it("retains a new selection made while created detail was loading", async () => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    mocks.create.mockResolvedValue(row("created"))
    const pending = deferred<RemitoApiRow>()
    mocks.detail.mockReturnValueOnce(pending.promise)
    let creation!: Promise<RemitoApiRow>
    act(() => { creation = result.current.createDraft({ branchId: "branch-a", origin: "manual", salidaReason: "cirugia", items: [{ description: "Item", quantity: "1" }] }) })
    await waitFor(() => expect(mocks.detail).toHaveBeenCalledTimes(1))
    await act(async () => { await result.current.selectRemito(row("second")) })
    await act(async () => { pending.resolve(row("created")); await creation })
    expect(result.current.selectedRemito?.id).toBe("second")
  })

  it("rejects an obsolete mutation callback before sending a request", async () => {
    const { result, rerender } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const oldEmit = result.current.emit
    mocks.company = "company-b"; rerender()
    await expect(oldEmit("first")).rejects.toThrow("vista de remitos cambió")
    expect(mocks.emit).not.toHaveBeenCalled()
  })

  it("does not continue with reads after unmounting during mutation", async () => {
    const { result, unmount } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const pending = deferred<RemitoApiRow>()
    mocks.emit.mockReturnValueOnce(pending.promise)
    let mutation!: Promise<RemitoApiRow>
    act(() => { mutation = result.current.emit("first") })
    unmount()
    await act(async () => { pending.resolve(row("first")); await mutation })
    expect(mocks.list).toHaveBeenCalledTimes(1)
  })

  it("blocks gracefully without an active company", async () => {
    mocks.company = undefined
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.blocked).toBe(true))
    expect(mocks.list).not.toHaveBeenCalled()
    expect(result.current.remitos).toEqual([])
  })

  it.each(["emit", "create"])("does not deadlock loading when %s cancels a refresh then fails", async action => {
    const { result } = renderHook(() => useRemitos())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const pending = deferred<RemitoApiRow[]>()
    mocks.list.mockReturnValueOnce(pending.promise)
    let refresh!: Promise<void>
    act(() => { refresh = result.current.refresh() })
    expect(result.current.loading).toBe(true)
    mocks.emit.mockRejectedValueOnce(new Error("Rejected mutation"))
    mocks.create.mockRejectedValueOnce(new Error("Rejected mutation"))
    await act(async () => {
      const request = action === "emit" ? result.current.emit("first") : result.current.createDraft({ branchId: "branch-a", origin: "manual", salidaReason: "cirugia", items: [{ description: "Item", quantity: "1" }] })
      await expect(request).rejects.toThrow("Rejected mutation")
    })
    await act(async () => { pending.resolve([row("obsolete")]); await refresh })
    expect(result.current.loading).toBe(false)
    expect(result.current.mutatingId).toBeNull()
    expect(result.current.remitos[0]?.id).toBe("first")
  })
})
