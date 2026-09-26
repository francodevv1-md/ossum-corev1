import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { Session } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(),
  replace: vi.fn(), signOut: vi.fn(), unsubscribe: vi.fn(),
  getApiIdentity: vi.fn(), getActiveCompanyMemberships: vi.fn(),
}))

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: mocks.replace }) }))
vi.mock("@/lib/auth/client", () => ({
  supabaseBrowserClient: { auth: {
    getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange, signOut: mocks.signOut,
  } },
}))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/lib/api/identity-context", () => ({ getApiIdentity: mocks.getApiIdentity }))
vi.mock("@/lib/api/guards", () => ({ getActiveCompanyMemberships: mocks.getActiveCompanyMemberships }))

import { AuthProvider, useAuth } from "@/components/auth/AuthProvider"
import { GET } from "@/app/api/me/companies/route"

const companies = [{ id: "company-a", name: "Alpha" }, { id: "company-b", name: "Beta" }]
const session = { access_token: "token", user: { id: "auth-user" } } as Session

function State() {
  const { activeCompany, availableCompanies, selectActiveCompany } = useAuth()
  return <>
    <output aria-label="active-company">{activeCompany?.id ?? "none"}</output>
    <output aria-label="available-companies">{availableCompanies.map(({ id }) => id).join(",")}</output>
    <button onClick={() => selectActiveCompany("company-b")}>Select Beta</button>
  </>
}

describe("identity-first company bootstrap", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mocks.apiFetch.mockReset()
    mocks.getSession.mockResolvedValue({ data: { session } })
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } })
    mocks.signOut.mockResolvedValue(undefined)
  })

  it("auto-selects the sole server membership", async () => {
    mocks.apiFetch.mockImplementation((path: string) => path === "/api/me/companies"
      ? Promise.resolve({ companies: [companies[0]], singleCompanyId: "company-a" })
      : Promise.resolve({ user: {}, access: { role: "admin" }, activeCompany: companies[0] }))
    render(<AuthProvider><State /></AuthProvider>)
    await waitFor(() => expect(screen.getByLabelText("active-company")).toHaveTextContent("company-a"))
  })

  it("requires explicit selection for many memberships and keeps it in session memory", async () => {
    mocks.apiFetch.mockImplementation((path: string) => path === "/api/me/companies"
      ? Promise.resolve({ companies, singleCompanyId: null })
      : Promise.resolve({ user: {}, access: { role: "admin" }, activeCompany: companies[1] }))
    render(<AuthProvider><State /></AuthProvider>)
    await waitFor(() => expect(screen.getByLabelText("available-companies")).toHaveTextContent("company-a,company-b"))
    expect(screen.getByLabelText("active-company")).toHaveTextContent("none")
    fireEvent.click(screen.getByRole("button", { name: "Select Beta" }))
    expect(screen.getByLabelText("active-company")).toHaveTextContent("company-b")
    expect(window.sessionStorage.getItem("ossum.activeCompanyId")).toBe("company-b")
  })

  it("rejects a restored candidate absent from the server memberships", async () => {
    window.sessionStorage.setItem("ossum.activeCompanyId", "untrusted-company")
    mocks.apiFetch.mockResolvedValue({ companies, singleCompanyId: null })
    render(<AuthProvider><State /></AuthProvider>)
    await waitFor(() => expect(screen.getByLabelText("available-companies")).toHaveTextContent("company-a,company-b"))
    expect(screen.getByLabelText("active-company")).toHaveTextContent("none")
    expect(window.sessionStorage.getItem("ossum.activeCompanyId")).toBeNull()
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1)
  })
})

describe("GET /api/me/companies", () => {
  it("returns only the exact membership projection", async () => {
    mocks.getApiIdentity.mockResolvedValue({ actorUserId: "user-1" })
    mocks.getActiveCompanyMemberships.mockResolvedValue([
      { companyId: "company-a", role: "admin", company: companies[0] },
    ])
    const response = await GET(new Request("http://localhost/api/me/companies"))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { companies: [companies[0]], singleCompanyId: "company-a" } })
  })
})
