import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), route: vi.fn() }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.read }))
vi.mock("@/lib/prisma", () => ({ default: { readOnly: true } }))
vi.mock("@/lib/services/logistics-vehicle-gps.server", () => ({ getLogisticsVehicleRoute: mocks.route }))

import { GET } from "@/app/api/companies/[companyId]/logistics/vehicles/[vehicleId]/route/route"

describe("logistics vehicle history route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ companyId: "company-authoritative" }); mocks.route.mockResolvedValue({ vehicle: { id: "v-1", name: "Unidad 1" }, feed: "active", points: [] }) })
  it("uses the authorized company and bounded hours, never the URL company", async () => {
    await GET(new Request("http://test?hours=3"), { params: Promise.resolve({ companyId: "company-untrusted", vehicleId: "v-1" }) })
    expect(mocks.route).toHaveBeenCalledWith({ readOnly: true }, "company-authoritative", "v-1", 3)
  })
  it("rejects unsupported hour windows", async () => {
    const response = await GET(new Request("http://test?hours=2"), { params: Promise.resolve({ companyId: "company-untrusted", vehicleId: "v-1" }) })
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(mocks.route).not.toHaveBeenCalled()
  })
})
