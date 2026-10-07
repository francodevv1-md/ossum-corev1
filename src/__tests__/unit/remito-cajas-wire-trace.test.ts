import { describe, expect, it } from "vitest"
import { buildCajasDispatchPayload } from "@/lib/cajas-intent"
import type { BoxAssignmentDetail } from "@/lib/api/cajas-assignments"

// getBoxAssignment serializes DB snapshot columns as lotNumber/serialNumber on the wire.
const assignment = {
  id: "assignment", preparation: { version: 3, lines: [{
    id: "line", articleId: "article", sku: "SKU", isActive: true, lotNumber: "LOT", serialNumber: "SERIAL",
  }] },
} as unknown as BoxAssignmentDetail
const remito = { id: "remito", items: [{ id: "item", itemId: "article", quantity: "0.5", lotNumber: "LOT", serialNumber: "SERIAL" }] }

describe("Actual Cajas wire trace boundary", () => {
  it("accepts a matching backend serialized lot/serial", () => {
    expect(buildCajasDispatchPayload(assignment, remito)?.lines).toEqual([{ preparationLineId: "line", remitoItemId: "item", quantity: 0.5 }])
  })
  it.each(["lotNumber", "serialNumber"] as const)("rejects missing %s instead of accepting missing snapshot aliases", (field) => {
    expect(() => buildCajasDispatchPayload(assignment, { ...remito, items: [{ ...remito.items[0], [field]: null }] })).toThrow(`Incompatible ${field === "lotNumber" ? "lot" : "serial"} number "null"`)
  })
  it("rejects both missing trace fields on an actually traced backend line", () => {
    expect(() => buildCajasDispatchPayload(assignment, { ...remito, items: [{ ...remito.items[0], lotNumber: null, serialNumber: null }] })).toThrow(/Incompatible/)
  })
  it("disambiguates actual serialized lines by their lot/serial", () => {
    const multi = { ...assignment, preparation: { ...assignment.preparation!, lines: [assignment.preparation!.lines[0], { ...assignment.preparation!.lines[0], id: "other-line", lotNumber: "OTHER" }] } }
    expect(buildCajasDispatchPayload(multi, remito)?.lines[0].preparationLineId).toBe("line")
  })
  it("honors a canonical null rather than an old snapshot alias", () => {
    const noLot = { ...assignment, preparation: { ...assignment.preparation!, lines: [{ ...assignment.preparation!.lines[0], lotNumber: null, lotNumberSnapshot: "LEGACY" }] } }
    expect(buildCajasDispatchPayload(noLot, { ...remito, items: [{ ...remito.items[0], lotNumber: null }] })?.lines).toHaveLength(1)
  })
})
