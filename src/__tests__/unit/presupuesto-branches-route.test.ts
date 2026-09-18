import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ auth: vi.fn(), guard: vi.fn(), list: vi.fn() }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.guard }))
vi.mock("@/lib/prisma", () => ({ default: { mocked: true } }))
vi.mock("@/lib/services/branch.service", () => ({ listBranchesByCompany: mocks.list }))
import { GET } from "@/app/api/companies/[companyId]/branches/route"

describe("recovered branches GET", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ companyId: "authorized-company" }); mocks.list.mockResolvedValue([{ id: "branch", name: "Centro" }]) })
  it("reads through existing guard and uses authenticated scope, never request body", async () => {
    const request = new Request("http://localhost/branches")
    const response = await GET(request, { params: Promise.resolve({ companyId: "requested-company" }) })
    expect(response.status).toBe(200)
    expect(mocks.auth).toHaveBeenCalledWith(request, "requested-company")
    expect(mocks.guard).toHaveBeenCalledWith({ companyId: "authorized-company" })
    expect(mocks.list).toHaveBeenCalledWith({ mocked: true }, "authorized-company")
    expect(await response.json()).toEqual({ data: [{ id: "branch", name: "Centro" }] })
  })
  it("does not query when read access is rejected", async () => {
    mocks.guard.mockImplementation(() => { throw new Error("denied") })
    const response = await GET(new Request("http://localhost/branches"), { params: Promise.resolve({ companyId: "other" }) })
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(mocks.list).not.toHaveBeenCalled()
  })
})
