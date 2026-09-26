import { describe, expect, it } from "vitest"

import { auditGeography, geographyFromAddress, markerEligibility } from "@/lib/services/logistics-geography"
import { getLogisticsMapProjection } from "@/lib/services/logistics-geography-read.service"

const centroidFixture = { georefId: "82070010", entityType: "LOCALITY", city: "Rosario", provinceGeorefId: "82", provinceName: "Santa Fe", latitude: "-32.944242", longitude: "-60.650539", coordinateType: "CENTROID", crs: "EPSG:4326", source: "Georef Argentina", sourceVersion: "v2.0", sourceRetrievedAt: new Date("2026-09-10T00:00:00.000Z"), validationStatus: "verified" }

describe("logistics geography contract", () => {
  it("publishes an explicitly verified DEV centroid fixture as an eligible marker", () => {
    const geo = geographyFromAddress(centroidFixture)
    expect(geo).toMatchObject({ georefId: "82070010", locality: { name: "Rosario" }, province: { georefId: "82", name: "Santa Fe" }, coordinate: { latitude: -32.944242, longitude: -60.650539, type: "centroid", crs: "EPSG:4326" }, validation: { status: "verified" } })
    expect(markerEligibility(geo)).toEqual({ eligible: true })
  })

  it("never promotes missing, malformed, conflicting, or unvalidated data to a marker", () => {
    expect(markerEligibility(geographyFromAddress({ city: "Rosario" }))).toEqual({ eligible: false, reason: "missing" })
    expect(markerEligibility(geographyFromAddress({ ...centroidFixture, longitude: null }))).toEqual({ eligible: false, reason: "incomplete" })
    expect(markerEligibility(geographyFromAddress({ ...centroidFixture, validationStatus: "candidate" }))).toEqual({ eligible: false, reason: "unvalidated" })
    expect(markerEligibility(geographyFromAddress({ ...centroidFixture, validationStatus: "conflict" }))).toEqual({ eligible: false, reason: "conflict" })
    expect(auditGeography([centroidFixture, { city: "Rosario" }, { ...centroidFixture, validationStatus: "candidate" }])).toEqual({ total: 3, eligible: 1, missing: 1, incomplete: 0, unvalidated: 1, incompatibleCrs: 0, conflict: 0 })
  })

  it("projects only persisted eligible geography and performs no write", async () => {
    const db: any = { surgery: { findMany: async () => [{ id: "s-dev-1", visibleNumber: "DEV-CX-001", institution: { id: "i-dev-1", legalName: "Hospital fixture DEV", tradeName: null, addresses: [centroidFixture] } }, { id: "s-legacy", visibleNumber: "DEV-CX-002", institution: { id: "i-legacy", legalName: "Legacy fixture DEV", tradeName: null, addresses: [{ city: "Rosario" }] } }] } }
    const result = await getLogisticsMapProjection(db, "company-dev", 250)
    expect(result.markers).toHaveLength(1)
    expect(result.markers[0]).toMatchObject({ surgery: { id: "s-dev-1", reference: "DEV-CX-001" }, geo: { coordinate: { type: "centroid" } } })
    expect(result.excluded).toBe(1)
    expect(db.surgery.create).toBeUndefined()
    expect(db.surgery.update).toBeUndefined()
  })
})
