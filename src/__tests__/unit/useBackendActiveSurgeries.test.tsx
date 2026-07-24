import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  BackendActiveSurgeriesContext,
  useBackendActiveSurgeries as useBackendActiveSurgeriesType,
} from "@/hooks/useBackendActiveSurgeries"

const {
  fetchBackendActiveSurgeriesMock,
  clearBackendSurgeriesMock,
  hydrateBackendSurgeriesMock,
  useAuthMock,
  useOrtoTrackStoreMock,
} = vi.hoisted(() => ({
  fetchBackendActiveSurgeriesMock: vi.fn(),
  clearBackendSurgeriesMock: vi.fn(),
  hydrateBackendSurgeriesMock: vi.fn(),
  useAuthMock: vi.fn(),
  useOrtoTrackStoreMock: Object.assign(vi.fn(), {
    getState: vi.fn(),
  }),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: useAuthMock,
}))

vi.mock("@/lib/api/backend-surgeries", () => ({
  fetchBackendActiveSurgeries: fetchBackendActiveSurgeriesMock,
}))

vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: useOrtoTrackStoreMock,
}))

type UseBackendActiveSurgeries = typeof useBackendActiveSurgeriesType
type HookValue = ReturnType<UseBackendActiveSurgeries>

let useBackendActiveSurgeries: UseBackendActiveSurgeries

async function loadHook(defaultCompanyId?: string) {
  vi.resetModules()

  if (defaultCompanyId) {
    vi.stubEnv("NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID", defaultCompanyId)
  }

  const hookModule = await import("@/hooks/useBackendActiveSurgeries")
  useBackendActiveSurgeries = hookModule.useBackendActiveSurgeries
}

function HookHarness(props: {
  context?: BackendActiveSurgeriesContext
  onReady: (value: HookValue) => void
}) {
  const value = useBackendActiveSurgeries(props.context)
  props.onReady(value)
  return null
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe("useBackendActiveSurgeries", () => {
  let hookValue: HookValue

  beforeEach(() => {
    hookValue = undefined as never
    vi.unstubAllEnvs()
    fetchBackendActiveSurgeriesMock.mockReset()
    clearBackendSurgeriesMock.mockReset()
    hydrateBackendSurgeriesMock.mockReset()
    useOrtoTrackStoreMock.mockImplementation((selector?: (state: {
      clearBackendSurgeries: typeof clearBackendSurgeriesMock
      hydrateBackendSurgeries: typeof hydrateBackendSurgeriesMock
    }) => unknown) => {
      const state = { clearBackendSurgeries: clearBackendSurgeriesMock, hydrateBackendSurgeries: hydrateBackendSurgeriesMock }
      return typeof selector === "function" ? selector(state) : state
    })
    useOrtoTrackStoreMock.getState.mockReturnValue({ surgeries: [] })
  })

  it("mantiene estado neutral mientras auth/company siguen hidratando", async () => {
    await loadHook()

    useAuthMock.mockReturnValue({
      activeCompany: null,
      currentUserLoading: true,
      isAuthenticated: true,
      isLoading: false,
    })

    render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(hookValue.ready).toBe(false)
    })

    expect(hookValue.loading).toBe(false)
    expect(hookValue.error).toBeNull()
    expect(fetchBackendActiveSurgeriesMock).not.toHaveBeenCalled()
  })

  it("expone error real cuando la resolución terminó y sigue sin empresa activa", async () => {
    await loadHook()

    useAuthMock.mockReturnValue({
      activeCompany: null,
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
    })

    render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(hookValue.ready).toBe(true)
    })

    expect(hookValue.error).toBe("No hay empresa activa disponible para cargar cirugías")
    expect(fetchBackendActiveSurgeriesMock).not.toHaveBeenCalled()
  })

  it("fetches with fallback company id while current user is still loading", async () => {
    await loadHook("company-default")
    fetchBackendActiveSurgeriesMock.mockResolvedValue([{ id: "surgery-1" }])

    useAuthMock.mockReturnValue({
      activeCompany: null,
      currentUserLoading: true,
      isAuthenticated: true,
      isLoading: false,
    })

    render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledWith("company-default", [])
    })

    expect(hydrateBackendSurgeriesMock).toHaveBeenCalledWith([{ id: "surgery-1" }])
    expect(hookValue.error).toBeNull()
  })

  it("does not fetch twice when current user loading finishes with the same fallback company id", async () => {
    await loadHook("company-default")
    fetchBackendActiveSurgeriesMock.mockResolvedValue([])

    const authState = {
      activeCompany: null as { id: string } | null,
      currentUserLoading: true,
      isAuthenticated: true,
      isLoading: false,
    }
    useAuthMock.mockImplementation(() => authState)

    const { rerender } = render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(1)
    })
    expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledWith("company-default", [])

    authState.currentUserLoading = false
    rerender(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(1)
    expect(hookValue.error).toBeNull()
  })

  it("uses active company id instead of fallback company id", async () => {
    await loadHook("company-default")
    fetchBackendActiveSurgeriesMock.mockResolvedValue([])

    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-active" },
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
    })

    render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledWith("company-active", [])
    })
    expect(fetchBackendActiveSurgeriesMock).not.toHaveBeenCalledWith("company-default", [])
  })

  it("fetches again when active company changes to a different id", async () => {
    await loadHook("company-default")
    fetchBackendActiveSurgeriesMock.mockResolvedValue([])

    const authState = {
      activeCompany: null as { id: string } | null,
      currentUserLoading: true,
      isAuthenticated: true,
      isLoading: false,
    }
    useAuthMock.mockImplementation(() => authState)

    const { rerender } = render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(1)
    })
    expect(fetchBackendActiveSurgeriesMock).toHaveBeenLastCalledWith("company-default", [])

    authState.activeCompany = { id: "company-active" }
    authState.currentUserLoading = false
    rerender(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(2)
    })
    expect(fetchBackendActiveSurgeriesMock).toHaveBeenLastCalledWith("company-active", [])
  })

  it("does not fetch while auth session is loading", async () => {
    await loadHook("company-default")

    useAuthMock.mockReturnValue({
      activeCompany: null,
      currentUserLoading: true,
      isAuthenticated: true,
      isLoading: true,
    })

    render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(hookValue.ready).toBe(false)
    })

    expect(hookValue.loading).toBe(false)
    expect(hookValue.error).toBeNull()
    expect(fetchBackendActiveSurgeriesMock).not.toHaveBeenCalled()
  })

  it("no expone datos exitosos ni hidrata mientras la carga inicial sigue pendiente", async () => {
    await loadHook()
    const pendingRead = deferred<Array<{ id: string }>>()
    fetchBackendActiveSurgeriesMock.mockReturnValue(pendingRead.promise)
    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-active" },
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
      user: { id: "actor-1" },
    })

    render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => expect(hookValue.isInitialLoading).toBe(true))
    expect(hookValue.hasSuccessfulData).toBe(false)
    expect(hydrateBackendSurgeriesMock).not.toHaveBeenCalled()

    await act(async () => pendingRead.resolve([]))
    await waitFor(() => expect(hookValue.hasSuccessfulData).toBe(true))
    expect(hydrateBackendSurgeriesMock).toHaveBeenCalledWith([])
  })

  it("conserva el snapshot local heredado sólo como entrada del adaptador inicial", async () => {
    await loadHook()
    const existingSurgeries = [{ id: "legacy-local" }]
    useOrtoTrackStoreMock.getState.mockReturnValue({ surgeries: existingSurgeries })
    fetchBackendActiveSurgeriesMock.mockResolvedValue([{ id: "backend" }])
    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-active" },
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
      user: { id: "actor-1" },
    })

    render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => {
      expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledWith("company-active", existingSurgeries)
    })
    expect(clearBackendSurgeriesMock).toHaveBeenCalledBefore(hydrateBackendSurgeriesMock)
    expect(hydrateBackendSurgeriesMock).toHaveBeenCalledWith([{ id: "backend" }])
  })

  it("preserva filas durante refresh y distingue un error de actualización", async () => {
    await loadHook()
    const refreshRead = deferred<Array<{ id: string }>>()
    fetchBackendActiveSurgeriesMock
      .mockResolvedValueOnce([{ id: "surgery-1" }])
      .mockReturnValueOnce(refreshRead.promise)
    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-active" },
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
      user: { id: "actor-1" },
    })

    render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)
    await waitFor(() => expect(hookValue.hasSuccessfulData).toBe(true))
    expect(clearBackendSurgeriesMock).toHaveBeenCalledTimes(1)

    act(() => {
      void hookValue.refresh()
    })
    await waitFor(() => expect(hookValue.isRefreshing).toBe(true))
    expect(clearBackendSurgeriesMock).toHaveBeenCalledTimes(1)
    expect(hydrateBackendSurgeriesMock).toHaveBeenCalledTimes(1)

    await act(async () => refreshRead.reject(new Error("refresh failed")))
    await waitFor(() => expect(hookValue.isRefreshError).toBe(true))
    expect(hookValue.hasSuccessfulData).toBe(true)
    expect(hydrateBackendSurgeriesMock).toHaveBeenCalledTimes(1)
  })

  it("distingue error inicial y reintenta sin cambiar el contexto", async () => {
    await loadHook()
    fetchBackendActiveSurgeriesMock
      .mockRejectedValueOnce(new Error("initial failed"))
      .mockResolvedValueOnce([{ id: "recovered" }])
    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-active" },
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
      user: { id: "actor-1" },
    })

    render(<HookHarness context={{ subjectContactId: "contact-1" }} onReady={(value) => {
      hookValue = value
    }} />)
    await waitFor(() => expect(hookValue.isInitialError).toBe(true))
    expect(hookValue.hasSuccessfulData).toBe(false)
    expect(hydrateBackendSurgeriesMock).not.toHaveBeenCalled()
    const failedContextKey = hookValue.trustContextKey

    await act(async () => {
      await hookValue.refresh()
    })

    expect(hookValue.trustContextKey).toBe(failedContextKey)
    expect(clearBackendSurgeriesMock).toHaveBeenCalledTimes(1)
    expect(fetchBackendActiveSurgeriesMock).toHaveBeenNthCalledWith(2, "company-active", [])
    expect(hydrateBackendSurgeriesMock).toHaveBeenCalledWith([{ id: "recovered" }])
    expect(hookValue.hasSuccessfulData).toBe(true)
  })

  it("reintenta con el mismo actor, empresa y sujeto", async () => {
    await loadHook()
    fetchBackendActiveSurgeriesMock.mockResolvedValue([])
    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-active" },
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
      user: { id: "actor-1" },
    })

    render(<HookHarness context={{ subjectContactId: "contact-1" }} onReady={(value) => {
      hookValue = value
    }} />)
    await waitFor(() => expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(1))
    const initialContextKey = hookValue.trustContextKey

    await act(async () => {
      await hookValue.refresh()
    })

    expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(2)
    expect(fetchBackendActiveSurgeriesMock).toHaveBeenNthCalledWith(1, "company-active", [])
    expect(fetchBackendActiveSurgeriesMock).toHaveBeenNthCalledWith(2, "company-active", [])
    expect(hookValue.trustContextKey).toBe(initialContextKey)
  })

  it("limpia al cambiar el contexto y descarta respuestas del contexto anterior", async () => {
    await loadHook()
    const firstRead = deferred<Array<{ id: string }>>()
    const secondRead = deferred<Array<{ id: string }>>()
    fetchBackendActiveSurgeriesMock
      .mockReturnValueOnce(firstRead.promise)
      .mockReturnValueOnce(secondRead.promise)
    const authState = {
      activeCompany: { id: "company-1" },
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
      user: { id: "actor-1" },
    }
    useAuthMock.mockImplementation(() => authState)

    const { rerender } = render(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)
    await waitFor(() => expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(1))

    authState.activeCompany = { id: "company-2" }
    rerender(<HookHarness onReady={(value) => {
      hookValue = value
    }} />)
    await waitFor(() => expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(2))
    expect(clearBackendSurgeriesMock).toHaveBeenCalledTimes(2)

    await act(async () => secondRead.resolve([{ id: "company-2-surgery" }]))
    await waitFor(() => {
      expect(hydrateBackendSurgeriesMock).toHaveBeenCalledWith([{ id: "company-2-surgery" }])
    })

    await act(async () => firstRead.resolve([{ id: "company-1-stale" }]))
    expect(hydrateBackendSurgeriesMock).not.toHaveBeenCalledWith([{ id: "company-1-stale" }])
  })

  it.each([
    [{ blocked: true }, "identidad bloqueada"],
    [{ previewDenied: true }, "preview denegada"],
    [{ mode: "dev-preview" as const }, "filas preview-local"],
  ])("limpia y no hidrata ante %s (%s)", async (context, label) => {
    void label
    await loadHook()
    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-active" },
      currentUserLoading: false,
      isAuthenticated: true,
      isLoading: false,
      user: { id: "actor-1" },
    })

    render(<HookHarness context={context} onReady={(value) => {
      hookValue = value
    }} />)

    await waitFor(() => expect(clearBackendSurgeriesMock).toHaveBeenCalled())
    expect(fetchBackendActiveSurgeriesMock).not.toHaveBeenCalled()
    expect(hydrateBackendSurgeriesMock).not.toHaveBeenCalled()
    expect(hookValue.hasSuccessfulData).toBe(false)
  })
})
