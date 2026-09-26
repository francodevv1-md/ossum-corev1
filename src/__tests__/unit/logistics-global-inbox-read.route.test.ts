import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), inbox: vi.fn() }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.read }))
vi.mock("@/lib/prisma", () => ({ default: { readOnly: true } }))
vi.mock("@/lib/services/logistics-global-inbox-read.service", () => ({ getLogisticsGlobalInbox: mocks.inbox }))

import { GET } from "@/app/api/companies/[companyId]/logistics/inbox/route"

describe("global logistics inbox route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ companyId: "company-authoritative", actorUserId: "actor-1", role: "viewer" }); mocks.inbox.mockResolvedValue({ items: [] }) })
  it("uses authenticated company identity and existing read guard", async () => {
    const response = await GET(new Request("http://test?limit=10"), { params: Promise.resolve({ companyId: "company-untrusted" }) })
    expect(response.status).toBe(200); expect(mocks.read).toHaveBeenCalled(); expect(mocks.inbox).toHaveBeenCalledWith({ readOnly: true }, "company-authoritative", expect.objectContaining({ actorUserId: "actor-1" }), expect.objectContaining({ limit: 10 }))
  })
})
