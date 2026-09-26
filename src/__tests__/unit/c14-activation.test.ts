import { describe, expect, it } from "vitest"
import { isC14BundleEnabled } from "@/lib/services/c14/activation"
import { WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer"

describe("C14 activation", () => {
  it("is disabled by default and enables only exact WCB-06 identity", () => {
    const exact = { bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS }
    expect(isC14BundleEnabled(exact, {})).toBe(false)
    expect(isC14BundleEnabled(exact, { OSSUM_C14_WCB06_ENABLED: "true" })).toBe(true)
    expect(isC14BundleEnabled({ ...exact, bundleId: "WCB-03" }, { OSSUM_C14_WCB06_ENABLED: "true" })).toBe(false)
    expect(isC14BundleEnabled({ ...exact, contractIds: [...WCB06_CONTRACT_IDS].reverse() }, { OSSUM_C14_WCB06_ENABLED: "true" })).toBe(false)
  })
})
