import { beforeEach, describe, expect, it, vi } from "vitest"

const db = vi.hoisted(() => ({
  surgery: { findFirst: vi.fn() }, remito: { findMany: vi.fn() }, cajasAssignment: { findMany: vi.fn() }, cajasReservationCorrelation: { findMany: vi.fn() }, cajasDispatchLine: { findMany: vi.fn() }, cajasPhaseDOperation: { findMany: vi.fn() }, cajasDifference: { findMany: vi.fn() }, cajasPhaseDActionGrant: { findMany: vi.fn() }, cajasPhaseDReconciliationEvent: { findMany: vi.fn() }, $transaction: vi.fn(),
}))
const auth = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ default: db }))

import { GET } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/logistics/operations/route"

describe("logistics operations source route boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks(); auth.mockResolvedValue({ companyId: "company-authoritative", actorUserId: "actor-1", role: "viewer" })
    db.surgery.findFirst.mockResolvedValue({ id: "surgery-1" }); for (const repository of [db.remito, db.cajasAssignment, db.cajasReservationCorrelation, db.cajasDispatchLine, db.cajasPhaseDOperation, db.cajasDifference, db.cajasPhaseDActionGrant, db.cajasPhaseDReconciliationEvent]) repository.findMany.mockResolvedValue([])
  })
  it("does not disclose path-tenant data: the real route invokes every source read with the authenticated company", async () => {
    const response = await GET(new Request("http://test"), { params: Promise.resolve({ companyId: "company-untrusted", surgeryId: "surgery-1" }) })
    expect(response.status).toBe(200)
    expect(db.surgery.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-authoritative", id: "surgery-1" } }))
    for (const repository of [db.remito, db.cajasAssignment, db.cajasReservationCorrelation, db.cajasDispatchLine, db.cajasPhaseDOperation, db.cajasDifference, db.cajasPhaseDActionGrant]) expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company-authoritative" }) }))
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})
