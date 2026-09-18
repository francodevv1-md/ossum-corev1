import { describe, expect, it, vi } from "vitest"

const { vehicles } = vi.hoisted(() => ({ vehicles: vi.fn().mockResolvedValue({ feed: "unavailable", vehicles: [] }) }))
vi.mock("@/lib/services/logistics-vehicle-gps.server", () => ({ getLogisticsVehicleProjection: vehicles }))

import { getLogisticsMapProjection } from "@/lib/services/logistics-geography-read.service"

describe("logistics geography projection", () => {
  it("takes the most recent operational destinations within the requested limit", async () => {
    const findMany = vi.fn().mockResolvedValue([])
    await getLogisticsMapProjection({ surgery: { findMany } }, "company-1", 250)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 250, orderBy: [{ surgeryDate: "desc" }, { scheduledDate: "desc" }, { id: "desc" }] }))
  })
})
