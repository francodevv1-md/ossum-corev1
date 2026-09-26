import { describe, expect, it, vi } from "vitest"
import {
  createRemitoActivationGate,
  type RemitoActivationConfig,
} from "@/lib/remito-verification/activation"

const allOn = (): RemitoActivationConfig => ({
  flags: {
    remitoLocatorIssuanceWrites: true,
    remitoInternalScanRead: true,
    remitoPublicPublicationWrites: true,
    remitoPublicCompatibilityRead: true,
    remitoPrintCodes: true,
  },
  cohort: { companyIds: ["company-a"], cohortStart: new Date("2026-08-12T00:00:00.000Z") },
})

describe("Remito DEV activation gate", () => {
  it("fails closed without config and rejects non-monotonic flags", async () => {
    expect((await createRemitoActivationGate(null)).flags).toEqual(expect.objectContaining({
      remitoLocatorIssuanceWrites: false,
      remitoPrintCodes: false,
    }))
    const invalid = allOn()
    invalid.flags.remitoInternalScanRead = false
    expect((await createRemitoActivationGate(invalid)).configured).toBe(false)
  })

  it("applies the explicit company/date cohort and uses an injected read-only repository", async () => {
    const gate = await createRemitoActivationGate(allOn())
    expect(gate.isCompanyDateEligible("company-a", new Date("2026-08-12T00:00:00.000Z"))).toBe(true)
    expect(gate.isCompanyDateEligible("company-b", new Date("2026-08-13T00:00:00.000Z"))).toBe(false)
    const repository = { countIncompleteEligibleRemitos: vi.fn().mockResolvedValue(0) }
    await expect(gate.evaluateCompleteness(repository)).resolves.toEqual({ eligible: true, incompleteCount: 0, complete: true })
    expect(repository.countIncompleteEligibleRemitos).toHaveBeenCalledWith(allOn().cohort)
  })

  it("forces compatibility read after evidence, including reader failure", async () => {
    const disabled = allOn()
    disabled.flags.remitoPrintCodes = false
    disabled.flags.remitoPublicCompatibilityRead = false
    await expect(createRemitoActivationGate(disabled, { hasDistributedPrintCodeEvidence: async () => true }))
      .resolves.toMatchObject({ hasDistributedEvidence: true, flags: { remitoPublicCompatibilityRead: true } })
    await expect(createRemitoActivationGate(disabled, { hasDistributedPrintCodeEvidence: async () => { throw new Error("unavailable") } }))
      .resolves.toMatchObject({ hasDistributedEvidence: true, flags: { remitoPublicCompatibilityRead: true } })
  })
})
