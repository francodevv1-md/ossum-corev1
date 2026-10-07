import { describe, expect, it } from "vitest"
import {
  CX_STATUS,
  CX_STATUS_LABELS,
  CX_STATUS_TRANSITIONS,
  mapUiToCanonicalCxStatus,
  validateCxStatus,
  validateCxStatusTransition,
} from "@/lib/validators/surgery.validator"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"
import { mapUiStateToCanonicalCxStatus } from "@/lib/api/backend-surgeries"

describe("Surgery in_transit canonical mapping", () => {
  it("includes in_transit in CX_STATUS and CX_STATUS_LABELS", () => {
    expect(CX_STATUS).toContain("in_transit")
    expect(CX_STATUS_LABELS.in_transit).toBe("En tránsito")
  })

  it("keeps scheduled as Programada (separate from in_transit)", () => {
    expect(CX_STATUS).toContain("scheduled")
    expect(CX_STATUS_LABELS.scheduled).toBe("Programada")
  })

  it.each([
    "En tránsito", "en transito", "EN TRANSITO",
    "in transit", "in_transit", "IN_TRANSIT",
  ])("maps UI %s to in_transit", (ui) => {
    expect(mapUiStateToCanonicalCxStatus(ui)).toBe("in_transit")
  })

  it.each(["En tránsito", "in transit", "in_transit"])("validator accepts %s", (ui) => {
    expect(validateCxStatus(ui)).toBe("in_transit")
  })

  it("adapter preserves in_transit as En tránsito with date", () => {
    const [mapped] = mapApiSurgeryListToSurgeries([{ id: "backend-1", cxStatus: "in_transit", surgeryDate: "2026-10-07" }])
    expect(mapped.state).toBe("En tránsito")
  })

  it("scheduled stays as Pendiente in the adapter (Programada has its own UX path)", () => {
    const [mapped] = mapApiSurgeryListToSurgeries([{ id: "backend-1", cxStatus: "scheduled", surgeryDate: "2026-10-07" }])
    expect(mapped.state).toBe("Pendiente")
  })

  it("validates transitions that involve in_transit", () => {
    expect(validateCxStatusTransition("authorized", "in_transit")).toBe("in_transit")
    expect(validateCxStatusTransition("in_transit", "performed")).toBe("performed")
    expect(validateCxStatusTransition("in_transit", "suspended")).toBe("suspended")
    expect(validateCxStatusTransition("in_transit", "cancelled")).toBe("cancelled")
  })

  it("scheduled is its own canonical state (Programada), in_transit does not shadow it", () => {
    expect(validateCxStatus("scheduled")).toBe("scheduled")
    expect(validateCxStatus("in_transit")).toBe("in_transit")
    expect(CX_STATUS_LABELS.scheduled).toBe("Programada")
    expect(CX_STATUS_LABELS.in_transit).toBe("En tránsito")
  })

  it("rejects unrelated jumps", () => {
    expect(() => validateCxStatusTransition("pending", "finalized")).toThrow()
    expect(() => validateCxStatusTransition("in_transit", "pending")).toThrow()
  })

  it("CX_STATUS_TRANSITIONS includes the new edges", () => {
    expect(CX_STATUS_TRANSITIONS.authorized).toContain("in_transit")
    expect(CX_STATUS_TRANSITIONS.pending).toContain("in_transit")
    expect(CX_STATUS_TRANSITIONS.scheduled).toContain("in_transit")
    expect(CX_STATUS_TRANSITIONS.in_transit).toEqual(["performed", "suspended", "cancelled"])
  })
})
