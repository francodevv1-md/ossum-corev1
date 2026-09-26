import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), projection: vi.fn(), resolve: vi.fn() }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.read }))
vi.mock("@/lib/prisma", () => ({ default: { readOnly: true } }))
vi.mock("@/lib/services/logistics-operations-read.service", () => ({ getSurgeryLogisticsOperations: mocks.projection, resolveSurgeryLogisticsCode: mocks.resolve }))

import { GET } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/logistics/operations/route"
import { POST } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/logistics/operations/resolve-code/route"

const context = { params: Promise.resolve({ companyId: "company-path", surgeryId: "surgery-1" }) }
describe("logistics operations routes", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ companyId: "company-authoritative", actorUserId: "actor-1", role: "operator" }); mocks.projection.mockResolvedValue({ allocations: [] }); mocks.resolve.mockResolvedValue({ kind: "none", code: "NONE" }) })
  it("uses authoritative tenant identity for the projection route", async () => {
    const response = await GET(new Request("http://test"), context)
    expect(response.status).toBe(200); expect(mocks.read).toHaveBeenCalled(); expect(mocks.projection).toHaveBeenCalledWith({ readOnly: true }, "company-authoritative", "surgery-1", expect.objectContaining({ actorUserId: "actor-1" }))
  })
  it("returns each resolver result as a read response and rejects invalid input before service execution", async () => {
    mocks.resolve.mockResolvedValueOnce({ kind: "ambiguous", code: "DUP", candidates: [{ id: "a" }, { id: "b" }] })
    let response = await POST(new Request("http://test", { method: "POST", body: JSON.stringify({ code: "dup" }) }), context)
    expect(response.status).toBe(200); expect(mocks.resolve).toHaveBeenCalledWith({ readOnly: true }, "company-authoritative", "surgery-1", expect.anything(), "DUP")
    response = await POST(new Request("http://test", { method: "POST", body: JSON.stringify({ code: "ok", injected: true }) }), context)
    expect(response.status).toBe(400); expect(mocks.resolve).toHaveBeenCalledTimes(1)
  })
})
