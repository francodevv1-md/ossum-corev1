import { Prisma } from "@prisma/client"
import { describe, expect, it } from "vitest"
import { requirePhaseDAction } from "@/lib/permissions/phase-d-logistics"
import { assertIdentifiedWhole, assertPhysicalCeiling, reconciliationTotals } from "@/lib/services/phase-d-logistics.rules"

describe("Phase D physical reconciliation rules", () => {
  it("enforces shared consumption/return ceiling and identified-unit integrity", () => {
    expect(() => assertPhysicalCeiling(2, [1, 1], 0.0001)).toThrow(/exceeds/)
    expect(() => assertIdentifiedWhole("serial-1", null, 1, 0.5)).toThrow(/whole/)
    expect(() => assertIdentifiedWhole(null, "identified-1", 1, 1)).not.toThrow()
  })

  it("keeps unidentified quantities quarantined and prevents automatic close", () => {
    const totals = reconciliationTotals([{ id: "line-1", quantity: new Prisma.Decimal(2) }], [
      { dispatchLineId: "line-1", quantity: 2, returnState: "IDENTIFIED" },
      { dispatchLineId: null, quantity: 1, returnState: "PENDING_IDENTIFICATION" },
    ])
    expect(totals).toMatchObject({ unidentifiedPending: "1", closeEligible: false, physical: [{ pending: "0" }] })
  })

  it("requires an explicit action grant rather than a generic role", async () => {
    await expect(requirePhaseDAction({ cajasPhaseDActionGrant: { findFirst: async () => null } }, "company-1", "user-1", "CONSUME")).rejects.toMatchObject({ code: "phase_d_action_denied" })
  })
})
