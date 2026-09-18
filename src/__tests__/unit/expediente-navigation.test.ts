import { describe, expect, it } from "vitest"
import {
  buildExpedienteLink,
  buildNotificationExpedienteLink,
  getExpedienteEntryParam,
  normalizeExpedienteTabParam,
  resolveExpedienteLandingTab,
} from "@/lib/expediente-navigation"

describe("expediente-navigation", () => {
  it("builds deep links to seguimiento with optional entry focus", () => {
    expect(buildExpedienteLink({
      surgeryId: "CX-101",
      tab: "novedades",
      entryId: "seg-1",
    })).toBe("/expediente?id=CX-101&tab=novedades&entryId=seg-1")
  })

  it("routes notification links by whether they include a seguimiento entry", () => {
    expect(buildNotificationExpedienteLink({
      surgeryId: "CX-101",
      entryId: "seg-1",
    })).toBe("/expediente?id=CX-101&tab=novedades&entryId=seg-1")

    expect(buildNotificationExpedienteLink({
      surgeryId: "CX-202",
    })).toBe("/expediente?id=CX-202")
  })

  it("keeps old links valid and normalizes seguimiento aliases", () => {
    const legacy = new URLSearchParams("id=CX-101")
    const deepLink = new URLSearchParams("id=CX-101&tab=seguimiento&sourceEntityId=seg-9")
    const tabWithoutEntry = new URLSearchParams("id=CX-101&tab=novedades")

    expect(normalizeExpedienteTabParam(legacy.get("tab"))).toBeNull()
    expect(getExpedienteEntryParam(legacy)).toBeUndefined()
    expect(resolveExpedienteLandingTab(legacy)).toBeNull()

    expect(resolveExpedienteLandingTab(tabWithoutEntry)).toBeNull()

    expect(normalizeExpedienteTabParam(deepLink.get("tab"))).toBe("novedades")
    expect(getExpedienteEntryParam(deepLink)).toBe("seg-9")
    expect(resolveExpedienteLandingTab(deepLink)).toBe("novedades")
  })
})
