import { describe, expect, it } from "vitest"
import { parseIsoTimestamp } from "@/lib/validators/surgery.validator"

describe("surgery ISO timestamp narrowing", () => {
  it("preserves explicit offset conversion", () => {
    expect(parseIsoTimestamp("2026-09-16T10:30:00-03:00", "surgeryDate").toISOString()).toBe("2026-09-16T13:30:00.000Z")
  })
  it.each([null, undefined, 123, {}, new Date(), "2026-09-16", "2026-02-30T10:30:00Z", "2026-09-16T24:30:00Z"])("rejects invalid input %j", (value) => {
    expect(() => parseIsoTimestamp(value, "surgeryDate")).toThrow()
  })
})
