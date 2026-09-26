import { describe, expect, it } from "vitest"
import {
  conformsToWriterRegistryV4,
  WRITER_REGISTRY_V4,
  WRITER_REGISTRY_V4_SHA256,
} from "@/lib/services/c14/writer-registry-v4"
import {
  conformsToScannerInputV2,
  SCANNER_INPUT_V2,
  SCANNER_INPUT_V2_SHA256,
  ZERO_SCANNER_VIOLATIONS,
} from "@/lib/services/c14/scanner-input-v2"

describe("C14 canonical topology", () => {
  it("encodes exact RegistryV4 identities, memberships, counts, and hash", () => {
    expect(WRITER_REGISTRY_V4_SHA256).toBe("52f8755d9bc2385f03dc0699c33e41f66e637e64adf6d8f5495d68ec6a4c2c47")
    expect(WRITER_REGISTRY_V4.bundleBindings).toHaveLength(11)
    expect(WRITER_REGISTRY_V4.contractBindings).toHaveLength(18)
    expect(WRITER_REGISTRY_V4.guardedWriterLocators).toHaveLength(3)
    expect(WRITER_REGISTRY_V4.privateContractWriterCount + WRITER_REGISTRY_V4.guardedWriterCount).toBe(21)
    expect(WRITER_REGISTRY_V4.bundleCount + WRITER_REGISTRY_V4.contractCount).toBe(29)
    expect(WRITER_REGISTRY_V4.bundleBindings[5]).toMatchObject({
      bundleId: "WCB-06",
      contractIds: ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"],
      payloadSectionIds: ["stockEvidenceHeader", "stockEvidenceLines", "reservationEvidence", "dispatchHeader", "dispatchLines", "reservationEffect", "stockEffect"],
    })
    expect(conformsToWriterRegistryV4(WRITER_REGISTRY_V4)).toBe(true)
  })

  it("encodes the exact ScannerInputV2 closed source sets", () => {
    expect(SCANNER_INPUT_V2_SHA256).toBe("69b3458e5d1390ef8ae87f32a0202465276c209b449cd1fc0a24e9f930493d4a")
    expect(SCANNER_INPUT_V2.routeEligibleBundleEntryPoints).toHaveLength(11)
    expect(SCANNER_INPUT_V2.nonRouteContractOwnerEntryPoints).toHaveLength(18)
    expect(SCANNER_INPUT_V2.sharedWrapperEntryPoint).toBe("src/lib/services/c14/bundles/wcb-06.ts#execute")
    expect([SCANNER_INPUT_V2.lockAdapterEntryPoint, SCANNER_INPUT_V2.rereadAdapterEntryPoint, SCANNER_INPUT_V2.deferredCheckAdapterEntryPoint]).toEqual([
      "src/lib/services/c14/bundles/wcb-06.ts#private",
      "src/lib/services/c14/bundles/wcb-06.ts#private",
      "src/lib/services/c14/bundles/wcb-06.ts#private",
    ])
    expect(SCANNER_INPUT_V2.databaseConstructionEntryPoint).toBe("src/lib/db.ts#db")
    expect(conformsToScannerInputV2(SCANNER_INPUT_V2, ZERO_SCANNER_VIOLATIONS)).toBe(true)
  })

  it("fails closed on topology, source-set, or zero-violation drift", () => {
    expect(conformsToWriterRegistryV4({ ...WRITER_REGISTRY_V4, contractCount: 17 })).toBe(false)
    expect(conformsToScannerInputV2({ ...SCANNER_INPUT_V2, unknown: true }, ZERO_SCANNER_VIOLATIONS)).toBe(false)
    expect(conformsToScannerInputV2(SCANNER_INPUT_V2, { ...ZERO_SCANNER_VIOLATIONS, dynamicEscapes: 1 })).toBe(false)
  })
})
