import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchView: vi.fn(),
  hydrate: vi.fn(),
  clear: vi.fn(),
  mapRows: vi.fn((rows: unknown[]) => rows),
  auth: vi.fn(),
  store: Object.assign(vi.fn(), { getState: vi.fn() }),
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: mocks.auth }))
vi.mock("@/lib/api/coordination-view", () => ({ fetchCoordinationView: mocks.fetchView }))
vi.mock("@/lib/api/surgery-adapter", () => ({ mapApiSurgeryListToSurgeries: mocks.mapRows }))
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: mocks.store }))

import { useCoordinationView } from "@/hooks/useCoordinationView"

type Controller = ReturnType<typeof useCoordinationView>

function Harness({ discoverPreview = false, surface = "personal", onValue }: { discoverPreview?: boolean; surface?: "personal" | "global"; onValue: (value: Controller) => void }) {
  const value = useCoordinationView({ surface, discoverPreview })
  onValue(value)
  return null
}

function response(mode: "production" | "dev-preview", surgeryId: string, subject = { contactId: "contact-1", label: "Nelson DEV" }) {
  return {
    context: { mode, surface: "personal", readOnly: mode === "dev-preview", actor: { userId: "actor-1", label: "Ana Admin" }, personalResolution: { status: "resolved", subject }, viewSubject: subject },
    ...(mode === "dev-preview" ? { previewCapability: { enabled: true, targets: [subject, { contactId: "contact-2", label: "Ezequiel DEV" }] } } : {}),
    surgeries: [{ id: surgeryId }],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe("useCoordinationView", () => {
  let value: Controller

  beforeEach(() => {
    mocks.fetchView.mockReset()
    mocks.hydrate.mockReset()
    mocks.clear.mockReset()
    mocks.mapRows.mockClear()
    mocks.auth.mockReturnValue({ activeCompany: { id: "company-1" }, currentUserLoading: false, isAuthenticated: true, isLoading: false, user: { id: "actor-1" } })
    mocks.store.mockImplementation((selector?: (state: { hydrateBackendSurgeries: typeof mocks.hydrate; clearBackendSurgeries: typeof mocks.clear }) => unknown) => {
      const state = { hydrateBackendSurgeries: mocks.hydrate, clearBackendSurgeries: mocks.clear }
      return selector ? selector(state) : state
    })
    mocks.store.getState.mockReturnValue({ surgeries: [] })
  })

  it("hydrates the productive store only after a successful production read", async () => {
    mocks.fetchView.mockResolvedValue(response("production", "cx-1"))
    render(<Harness onValue={(next) => { value = next }} />)
    await waitFor(() => expect(value.hasSuccessfulData).toBe(true))
    expect(value.acceptedContextKey).toBe("actor-1:company-1:production:personal:contact-1")
    expect(mocks.fetchView).toHaveBeenCalledWith("company-1", { surface: "personal" })
    expect(mocks.clear).toHaveBeenCalledBefore(mocks.hydrate)
    expect(mocks.hydrate).toHaveBeenCalledWith([{ id: "cx-1" }])
  })

  it("captures acceptedAt on success, preserves it during refresh, and replaces it atomically", async () => {
    const refresh = deferred<ReturnType<typeof response>>()
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000)
    mocks.fetchView.mockResolvedValueOnce(response("production", "cx-1")).mockReturnValueOnce(refresh.promise)
    render(<Harness onValue={(next) => { value = next }} />)
    await waitFor(() => expect(value.acceptedAt).toBe(1_000))

    now.mockReturnValue(2_000)
    act(() => { void value.refresh() })
    await waitFor(() => expect(value.isRefreshing).toBe(true))
    expect(value.acceptedAt).toBe(1_000)

    await act(async () => refresh.resolve(response("production", "cx-2")))
    await waitFor(() => expect(value.acceptedAt).toBe(2_000))
    now.mockRestore()
  })

  it("keeps preview rows local and never hydrates them into the store", async () => {
    const subject = { contactId: "contact-1", label: "Nelson DEV" }
    mocks.fetchView
      .mockResolvedValueOnce({ ...response("dev-preview", "global"), context: { ...response("dev-preview", "global").context, surface: "global", viewSubject: null }, previewCapability: { enabled: true, targets: [subject] } })
      .mockResolvedValue(response("dev-preview", "personal", subject))
    render(<Harness discoverPreview onValue={(next) => { value = next }} />)
    await waitFor(() => expect(value.mode).toBe("dev-preview"))
    await waitFor(() => expect(value.previewRows.map((row) => row.id)).toContain("personal"))
    expect(mocks.hydrate).not.toHaveBeenCalled()
    expect(mocks.fetchView.mock.calls.every(([, request]) => request.preview === true)).toBe(true)
  })

  it("rejects a stale target response and keeps the newest contact rows", async () => {
    const first = deferred<ReturnType<typeof response>>()
    const second = deferred<ReturnType<typeof response>>()
    const subject1 = { contactId: "contact-1", label: "Nelson DEV" }
    const subject2 = { contactId: "contact-2", label: "Ezequiel DEV" }
    mocks.fetchView
      .mockResolvedValueOnce({ ...response("dev-preview", "global"), context: { ...response("dev-preview", "global").context, surface: "global", viewSubject: null }, previewCapability: { enabled: true, targets: [subject1, subject2] } })
      .mockResolvedValueOnce(response("dev-preview", "initial", subject1))
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    render(<Harness discoverPreview onValue={(next) => { value = next }} />)
    await waitFor(() => expect(value.previewRows.map((row) => row.id)).toEqual(["initial"]))
    act(() => { void value.refresh() })
    await waitFor(() => expect(mocks.fetchView).toHaveBeenCalledTimes(3))
    act(() => value.changePreviewTarget("contact-2"))
    await waitFor(() => expect(mocks.fetchView).toHaveBeenCalledTimes(4))
    await act(async () => second.resolve(response("dev-preview", "newest", subject2)))
    await waitFor(() => expect(value.previewRows.map((row) => row.id)).toEqual(["newest"]))
    await act(async () => first.resolve(response("dev-preview", "stale", subject1)))
    expect(value.previewRows.map((row) => row.id)).toEqual(["newest"])
    expect(mocks.hydrate).not.toHaveBeenCalled()
  })

  it("tears preview rows down before returning to productive mode", async () => {
    const subject = { contactId: "contact-1", label: "Nelson DEV" }
    mocks.fetchView
      .mockResolvedValueOnce({ ...response("dev-preview", "global"), context: { ...response("dev-preview", "global").context, surface: "global", viewSubject: null }, previewCapability: { enabled: true, targets: [subject] } })
      .mockResolvedValueOnce(response("dev-preview", "preview", subject))
      .mockResolvedValue(response("production", "production"))
    render(<Harness discoverPreview onValue={(next) => { value = next }} />)
    await waitFor(() => expect(value.previewRows).toHaveLength(1))
    act(() => value.exitPreview())
    expect(value.previewRows).toHaveLength(0)
    await waitFor(() => expect(value.mode).toBe("production"))
  })

  it("refetches a server-issued target when moving from global to personal preview", async () => {
    const subject = { contactId: "contact-1", label: "Nelson DEV" }
    const global = { ...response("dev-preview", "global"), context: { ...response("dev-preview", "global").context, surface: "global" as const, viewSubject: null }, previewCapability: { enabled: true as const, targets: [subject] } }
    mocks.fetchView.mockResolvedValueOnce(global).mockResolvedValueOnce(response("dev-preview", "personal", subject))
    render(<Harness discoverPreview surface="global" onValue={(next) => { value = next }} />)
    await waitFor(() => expect(value.surface).toBe("global"))
    act(() => value.changePreviewSurface("personal"))
    await waitFor(() => expect(mocks.fetchView).toHaveBeenLastCalledWith("company-1", { surface: "personal", preview: true, target: subject }))
    expect(mocks.hydrate).not.toHaveBeenCalled()
  })

  it("clears previously hydrated global rows before loading a new actor context", async () => {
    mocks.fetchView
      .mockResolvedValueOnce(response("production", "global-old"))
      .mockResolvedValueOnce(response("production", "global-new"))
    const rendered = render(<Harness surface="global" onValue={(next) => { value = next }} />)
    await waitFor(() => expect(mocks.hydrate).toHaveBeenCalledWith([{ id: "global-old" }]))
    mocks.clear.mockClear()
    mocks.hydrate.mockClear()
    mocks.auth.mockReturnValue({ activeCompany: { id: "company-1" }, currentUserLoading: false, isAuthenticated: true, isLoading: false, user: { id: "actor-2" } })

    rendered.rerender(<Harness surface="global" onValue={(next) => { value = next }} />)

    await waitFor(() => expect(mocks.fetchView).toHaveBeenLastCalledWith("company-1", { surface: "global" }))
    await waitFor(() => expect(mocks.hydrate).toHaveBeenLastCalledWith([{ id: "global-new" }]))
    expect(mocks.clear).toHaveBeenCalledBefore(mocks.hydrate)
  })

  it("changes accepted context identity when the server-resolved production subject changes", async () => {
    const nextContext = deferred<ReturnType<typeof response>>()
    mocks.fetchView
      .mockResolvedValueOnce(response("production", "first", { contactId: "contact-1", label: "Uno" }))
      .mockReturnValueOnce(nextContext.promise)
    const rendered = render(<Harness onValue={(next) => { value = next }} />)
    await waitFor(() => expect(value.acceptedContextKey).toContain("contact-1"))
    expect(value.acceptedAt).not.toBeNull()

    mocks.auth.mockReturnValue({ activeCompany: { id: "company-1" }, currentUserLoading: false, isAuthenticated: true, isLoading: false, user: { id: "actor-2" } })
    rendered.rerender(<Harness onValue={(next) => { value = next }} />)

    await waitFor(() => expect(value.loading).toBe(true))
    expect(value.acceptedAt).toBeNull()
    expect(value.acceptedContextKey).toBeNull()
    await act(async () => nextContext.resolve(response("production", "second", { contactId: "contact-2", label: "Dos" })))
    await waitFor(() => expect(value.acceptedContextKey).toBe("actor-2:company-1:production:personal:contact-2"))
    expect(value.acceptedAt).not.toBeNull()
  })
})
