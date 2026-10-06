import { describe, expect, it } from "vitest"
import { argentinaDay, buildReschedulingPatch, encodeReschedulingDate } from "@/lib/surgery/rescheduling"

const existing = { date: "2026-10-06", time: "08:00", surgeryTimeSpecified: null, fechaEnvioMaterial: "2026-10-05", urgente: false }
describe("rescheduling payload", () => {
  it("uses Argentina midnight and preserves explicit midnight precision", () => {
    expect(buildReschedulingPatch(existing, { date: "2026-10-07", time: "" })).toEqual({ surgeryDate: "2026-10-07T03:00:00.000Z", surgeryTimeSpecified: false })
    expect(buildReschedulingPatch(existing, { date: "2026-10-07", time: "00:00" })).toEqual({ surgeryDate: "2026-10-07T03:00:00.000Z", surgeryTimeSpecified: true })
  })
  it("omits unchanged legacy precision and untouched fields", () => {
    expect(buildReschedulingPatch(existing, { date: existing.date, time: existing.time, fechaEnvioMaterial: existing.fechaEnvioMaterial })).toEqual({})
  })
  it("shipping uses UTC day anchor without touching surgery", () => {
    expect(buildReschedulingPatch(existing, { fechaEnvioMaterial: "2026-10-07" })).toEqual({ materialShippingDate: "2026-10-07" })
  })
  it("handles the UTC/Argentina day boundary", () => {
    expect(argentinaDay(new Date("2026-10-07T02:59:59Z"))).toBe("2026-10-06")
    expect(argentinaDay(new Date("2026-10-07T03:00:00Z"))).toBe("2026-10-07")
  })
  it.each(["2026-02-30", "invalid", "2026-13-01"])("rejects invalid date %s", (date) => {
    expect(() => encodeReschedulingDate(date, "")).toThrow()
  })
  it("rejects invalid time", () => { expect(() => encodeReschedulingDate(existing.date, "24:00")).toThrow() })
})
