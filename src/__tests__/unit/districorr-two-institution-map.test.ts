import { describe, expect, it } from "vitest"
import { FACILITIES } from "../../../scripts/dev/districorr-two-institution-map-20261002"
import { geographyFromAddress, markerEligibility } from "@/lib/services/logistics-geography"

describe("two approved institution reference points", () => {
  it("uses only the two user-selected cases and publicly verified facility coordinates", () => {
    expect(FACILITIES.map(f => f.sourceCase)).toEqual(["CX-MOCK-7715", "CX-MOCK-7713"])
    expect(FACILITIES[0].latitude).toBe(-26.1815302)
    expect(FACILITIES[0].longitude).toBe(-58.1884300)
    expect(FACILITIES[1].latitude).toBe(-27.4657713)
    expect(FACILITIES[1].longitude).toBe(-58.8333934)
  })
  it("preserves campus/reference provenance, rejects unvalidated points and keeps EPSG4326", () => {
    for (const f of FACILITIES) {
      const address = { ...f, crs: "EPSG_4326", source: `OSM ${f.osmId}`, validationStatus: "MANUAL_VERIFIED" }
      expect(markerEligibility(geographyFromAddress(address)).eligible).toBe(true)
      expect(markerEligibility(geographyFromAddress({ ...address, validationStatus: "CANDIDATE" })).eligible).toBe(false)
      expect(f.note).toMatch(/referencia/)
    }
    expect(FACILITIES[0].coordinateType).toBe("CENTROID")
    expect(FACILITIES[1].street).toBe("Carlos Pellegrini")
    expect(FACILITIES[1].number).toBe("1453")
  })
})
