import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), projection: vi.fn() }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.read }))
vi.mock("@/lib/prisma", () => ({ default: { readOnly: true } }))
vi.mock("@/lib/services/logistics-geography-read.service", () => ({ getLogisticsMapProjection: mocks.projection }))

import { GET } from "@/app/api/companies/[companyId]/logistics/map/route"

describe("logistics map GPS projection route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ companyId: "company-authoritative" }); mocks.projection.mockResolvedValue({ generatedAt: "2026-09-14T10:00:00.000Z", source: "persisted_contact_address", markers: [], excluded: 0, audit: {}, feed: "unavailable", vehicles: [{ id: "v-1", name: "Unidad 1", state: "unknown", position: null }] }) })
  it("uses the authorized company instead of the URL and returns only the sanitized projection", async () => {
    const response = await GET(new Request("http://test?limit=10"), { params: Promise.resolve({ companyId: "company-untrusted" }) })
    const body = await response.json()
    expect(mocks.read).toHaveBeenCalled()
    expect(mocks.projection).toHaveBeenCalledWith({ readOnly: true }, "company-authoritative", 10)
    expect(JSON.stringify(body)).not.toContain("LOGISTICS_GPS_PROVIDER_TOKEN")
    expect(JSON.stringify(body)).not.toContain("provider.test")
  })
})
