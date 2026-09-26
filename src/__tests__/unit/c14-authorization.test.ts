import { describe, expect, it, vi } from "vitest"
import { authorize, C14CompanyDeniedError, WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer"

const client = (membership: unknown) => ({ userCompanyAccess: { findFirst: vi.fn().mockResolvedValue(membership) } }) as never

describe("C14 WCB-06 authorization", () => {
  it.each(["admin", "operator"])("binds active %s membership to a frozen proof", async (role) => {
    const proof = await authorize(client({ id: "m1", role, userId: "u1", companyId: "c1", isActive: true }),
      { actorId: "u1", companyId: "c1", bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS })
    expect(proof).toMatchObject({ actorId: "u1", companyId: "c1", bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS, decision: "ALLOW" })
    expect(proof.authorizationProofSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(Object.isFrozen(proof)).toBe(true)
  })

  it("fails before proof for wrong order, role, or company evidence", async () => {
    await expect(authorize(client({ id: "m1", role: "coordinador", userId: "u1", companyId: "c1", isActive: true }),
      { actorId: "u1", companyId: "c1", bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS })).rejects.toBeInstanceOf(C14CompanyDeniedError)
    await expect(authorize(client(null), { actorId: "u1", companyId: "c1", bundleId: "WCB-06",
      contractIds: [...WCB06_CONTRACT_IDS].reverse() })).rejects.toBeInstanceOf(C14CompanyDeniedError)
  })
})
