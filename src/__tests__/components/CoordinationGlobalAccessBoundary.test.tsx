import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clear: vi.fn(),
  replace: vi.fn(),
  store: vi.fn(),
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: mocks.auth }))
vi.mock("@/lib/store", () => ({ useOrtoTrackStore: mocks.store }))

import { CoordinationGlobalAccessBoundary } from "@/components/coordinadores/CoordinationGlobalAccessBoundary"

function auth(role: string | null, overrides: Record<string, unknown> = {}) {
  return {
    currentAccess: role ? { role } : null,
    currentUserLoading: false,
    isAuthenticated: true,
    isLoading: false,
    ...overrides,
  }
}

describe("CoordinationGlobalAccessBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.store.mockImplementation((selector) => selector({ clearBackendSurgeries: mocks.clear }))
  })

  it.each(["admin", "operator"])("mounts the global tree for %s", (role) => {
    mocks.auth.mockReturnValue(auth(role))
    render(<CoordinationGlobalAccessBoundary><div>Global controller mounted</div></CoordinationGlobalAccessBoundary>)
    expect(screen.getByText("Global controller mounted")).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("replaces coordinator with Mi bandeja, clears stale global rows and never mounts global", async () => {
    const globalMount = vi.fn()
    function GlobalTree() {
      globalMount()
      return <div>Global controller mounted</div>
    }
    mocks.auth.mockReturnValue(auth("coordinator"))

    render(<CoordinationGlobalAccessBoundary><GlobalTree /></CoordinationGlobalAccessBoundary>)

    expect(globalMount).not.toHaveBeenCalled()
    expect(screen.queryByText("Global controller mounted")).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Redirigiendo a Mi bandeja")
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/coordinadores/mi-bandeja"))
    expect(mocks.clear).toHaveBeenCalledOnce()
  })

  it("shows a non-flashing status and neither mounts nor redirects while role is loading", () => {
    mocks.auth.mockReturnValue(auth(null, { currentUserLoading: true }))
    render(<CoordinationGlobalAccessBoundary><div>Global controller mounted</div></CoordinationGlobalAccessBoundary>)
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveTextContent("Verificando acceso")
    expect(screen.queryByText("Global controller mounted")).not.toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.clear).not.toHaveBeenCalled()
  })

  it("fails closed during the authenticated gap before access context is available", () => {
    mocks.auth.mockReturnValue(auth(null))
    render(<CoordinationGlobalAccessBoundary><div>Global controller mounted</div></CoordinationGlobalAccessBoundary>)
    expect(screen.getByRole("status")).toHaveTextContent("Verificando acceso")
    expect(screen.queryByText("Global controller mounted")).not.toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
