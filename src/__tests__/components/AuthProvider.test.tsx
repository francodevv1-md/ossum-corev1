import { act, fireEvent, render, screen } from "@testing-library/react"
import type { Session } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  replace: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID = "company-1"
})

vi.mock("next/navigation", () => ({
  usePathname: () => "/coordinadores",
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock("@/lib/auth/client", () => ({
  supabaseBrowserClient: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}))

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))

vi.mock("@/components/layout/app-shell", () => ({ AppShellProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/components/layout/header", () => ({ Header: () => null }))
vi.mock("@/components/layout/main-layout", () => ({ MainLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/components/layout/sidebar", () => ({ Sidebar: () => null }))
vi.mock("@/components/StoreHydration", () => ({ StoreHydration: () => null }))
vi.mock("@/components/ui/tooltip", () => ({ TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

import { AuthGuard } from "@/components/auth/AuthGuard"
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider"

function AuthState() {
  const { isAuthenticated, isLoading } = useAuth()
  return <output>{isLoading ? "loading" : isAuthenticated ? "authenticated" : "anonymous"}</output>
}

function AvailabilityFeatureState() {
  const { features, signOut } = useAuth()
  return (
    <>
      <output>{features.availabilityRequests ? "availability-enabled" : "availability-disabled"}</output>
      <button onClick={() => void signOut()}>Sign out</button>
    </>
  )
}

const session = (token: string) => ({ access_token: token, user: { id: "user-1" } }) as Session

const currentUserResponse = (availabilityRequests?: boolean) => ({
  user: { id: "user-1", email: "user@example.com", firstName: null, lastName: null, displayName: "User" },
  access: { role: "operator" },
  activeCompany: { id: "company-1", name: "Company" },
  ...(availabilityRequests === undefined ? {} : { features: { availabilityRequests } }),
})

function renderProvider(children: React.ReactNode = <AuthState />) {
  return render(<AuthProvider>{children}</AuthProvider>)
}

async function flushBootstrap() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("AuthProvider initial session bootstrap", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.replace.mockReset()
    mocks.apiFetch.mockReset()
    mocks.apiFetch.mockResolvedValue(currentUserResponse(false))
    mocks.getSession.mockReset()
    mocks.signOut.mockReset()
    mocks.signOut.mockResolvedValue(undefined)
    mocks.unsubscribe.mockReset()
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("completes loading with a valid initial session", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } as Session } })

    renderProvider()
    await flushBootstrap()

    expect(screen.getByText("authenticated")).toBeInTheDocument()
  })

  it("completes loading without a session", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })

    renderProvider()
    await flushBootstrap()

    expect(screen.getByText("anonymous")).toBeInTheDocument()
  })

  it("completes loading and lets AuthGuard redirect after getSession rejects", async () => {
    mocks.getSession.mockRejectedValue(new Error("bootstrap failed"))

    renderProvider(<AuthGuard>Contenido protegido</AuthGuard>)
    await flushBootstrap()

    expect(mocks.replace).toHaveBeenCalledWith("/login?next=%2Fcoordinadores")
  })

  it("bounds a pending bootstrap without replacing a session that resolves before the timeout", async () => {
    let resolveSession: (value: { data: { session: Session | null } }) => void = () => undefined
    mocks.getSession.mockReturnValue(new Promise((resolve) => { resolveSession = resolve }))

    renderProvider()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_999)
      resolveSession({ data: { session: { user: { id: "user-2" } } as Session } })
      await Promise.resolve()
    })

    expect(screen.getByText("authenticated")).toBeInTheDocument()
  })

  it("completes loading when getSession remains pending", async () => {
    mocks.getSession.mockReturnValue(new Promise(() => undefined))

    renderProvider()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(screen.getByText("anonymous")).toBeInTheDocument()
  })

  it("cleans up the bootstrap timeout on unmount", () => {
    mocks.getSession.mockReturnValue(new Promise(() => undefined))
    const clearTimeout = vi.spyOn(window, "clearTimeout")

    const { unmount } = renderProvider()
    unmount()

    expect(clearTimeout).toHaveBeenCalled()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe("AuthProvider availability feature projection", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.apiFetch.mockReset()
    mocks.getSession.mockReset()
    mocks.replace.mockReset()
    mocks.signOut.mockReset()
    mocks.signOut.mockResolvedValue(undefined)
    mocks.unsubscribe.mockReset()
    mocks.onAuthStateChange.mockReset()
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each([
    [true, "availability-enabled"],
    [false, "availability-disabled"],
  ])("exposes a server-projected %s feature value", async (enabled, expected) => {
    mocks.getSession.mockResolvedValue({ data: { session: session("token-1") } })
    mocks.apiFetch.mockResolvedValue(currentUserResponse(enabled))

    renderProvider(<AvailabilityFeatureState />)
    await flushBootstrap()

    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it("fails closed when the response omits the feature field", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session("token-1") } })
    mocks.apiFetch.mockResolvedValue(currentUserResponse())

    renderProvider(<AvailabilityFeatureState />)
    await flushBootstrap()

    expect(screen.getByText("availability-disabled")).toBeInTheDocument()
  })

  it("fails closed when the current-user request fails", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session("token-1") } })
    mocks.apiFetch.mockRejectedValue(new Error("request failed"))

    renderProvider(<AvailabilityFeatureState />)
    await flushBootstrap()

    expect(screen.getByText("availability-disabled")).toBeInTheDocument()
  })

  it("resets the feature before loading a changed auth context", async () => {
    let resolveSecondRequest: (value: ReturnType<typeof currentUserResponse>) => void = () => undefined
    mocks.getSession.mockResolvedValue({ data: { session: session("token-1") } })
    mocks.apiFetch
      .mockResolvedValueOnce(currentUserResponse(true))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecondRequest = resolve }))

    renderProvider(<AvailabilityFeatureState />)
    await flushBootstrap()
    expect(screen.getByText("availability-enabled")).toBeInTheDocument()

    const authStateCallback = mocks.onAuthStateChange.mock.calls[0][0]
    await act(async () => {
      authStateCallback("TOKEN_REFRESHED", session("token-2"))
      await Promise.resolve()
    })
    expect(screen.getByText("availability-disabled")).toBeInTheDocument()

    await act(async () => {
      resolveSecondRequest(currentUserResponse(true))
      await Promise.resolve()
    })
    expect(screen.getByText("availability-enabled")).toBeInTheDocument()
  })

  it("resets the feature when signing out", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session("token-1") } })
    mocks.apiFetch.mockResolvedValue(currentUserResponse(true))

    renderProvider(<AvailabilityFeatureState />)
    await flushBootstrap()
    expect(screen.getByText("availability-enabled")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))
    await flushBootstrap()

    expect(screen.getByText("availability-disabled")).toBeInTheDocument()
    expect(mocks.replace).toHaveBeenCalledWith("/login")
  })
})
