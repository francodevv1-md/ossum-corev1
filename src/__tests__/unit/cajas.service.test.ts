import { describe, expect, it, vi } from "vitest"

import { searchBoxFormulas } from "@/lib/services/cajas.service"

describe("searchBoxFormulas", () => {
  it("exposes the current formula revision instead of the internal aggregate version", async () => {
    const db = {
      cajasBoxFormula: {
        findMany: vi.fn().mockResolvedValue([{
          id: "formula-1",
          version: 2,
          nextVersionNumber: 2,
          createdAt: new Date("2026-08-25T10:00:00Z"),
          updatedAt: new Date("2026-08-25T10:00:00Z"),
          boxEligibility: { article: { sku: "DEMO-BOX", description: "Caja demo", brand: null, manufacturer: null, family: null } },
          currentVersion: { versionNumber: 1, lines: [] },
        }]),
      },
    }

    const [result] = await searchBoxFormulas(db as never, "company-1", { take: 100 })

    expect(result.version).toBe(1)
    expect(result.nextVersionNumber).toBe(2)
  })
})
