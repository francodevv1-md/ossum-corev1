import { afterEach, describe, expect, it, vi } from "vitest"
import { getLogisticsVehicleProjection, getLogisticsVehicleRoute } from "@/lib/services/logistics-vehicle-gps.server"
import { normalizeGpsPosition, validateGpsRouteHours } from "@/lib/validators/logistics-vehicle-gps"

const originalFetch = global.fetch
afterEach(() => { vi.unstubAllEnvs(); global.fetch = originalFetch })

describe("logistics vehicle GPS", () => {
  it("normalizes valid provider positions and converts knots to km/h", () => {
    expect(normalizeGpsPosition({ deviceId: 7, latitude: -34.6037, longitude: -58.3816, fixTime: "2026-09-14T10:00:00Z", speed: 12, outdated: false })).toEqual({ status: "accepted", position: { deviceId: "7", latitude: -34.6037, longitude: -58.3816, recordedAt: "2026-09-14T10:00:00.000Z", speedKmh: 22.224, outdated: false } })
    expect(normalizeGpsPosition({ deviceId: 7, latitude: 91, longitude: 0, fixTime: "2026-09-14T10:00:00Z" })).toEqual({ status: "rejected" })
  })
  it("accepts only bounded route hour windows", () => { expect(validateGpsRouteHours(null)).toBe(6); expect(validateGpsRouteHours("24")).toBe(24); expect(() => validateGpsRouteHours("2")).toThrow("hours must be one of 1, 3, 6, 12, or 24") })
  it("fails closed without configuration and does not call the provider", async () => {
    vi.stubEnv("LOGISTICS_GPS_PROVIDER_BASE_URL", ""); vi.stubEnv("LOGISTICS_GPS_PROVIDER_TOKEN", ""); global.fetch = vi.fn()
    await expect(getLogisticsVehicleProjection({ vehicle: { findMany: vi.fn().mockResolvedValue([{ id: "v-1", name: "Unidad 1", trackingDeviceId: "7" }]) } }, "company-a")).resolves.toEqual({ feed: "unconfigured", vehicles: [{ id: "v-1", name: "Unidad 1", routeAvailable: true, state: "unknown", position: null }] })
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it("uses the newest position for a mapped vehicle", async () => {
    vi.stubEnv("LOGISTICS_GPS_PROVIDER_BASE_URL", "https://provider.test/api"); vi.stubEnv("LOGISTICS_GPS_PROVIDER_TOKEN", "test-token")
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([{ id: 7 }]), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify([{ deviceId: 7, latitude: -34.6, longitude: -58.4, fixTime: "2026-09-14T09:00:00Z" }, { deviceId: 7, latitude: -34.61, longitude: -58.41, fixTime: "2026-09-14T10:00:00Z" }]), { status: 200 }))
    const result = await getLogisticsVehicleProjection({ vehicle: { findMany: vi.fn().mockResolvedValue([{ id: "v-1", name: "Unidad 1", trackingDeviceId: "7" }]) } }, "company-a", new Date("2026-09-14T10:10:00Z"))
    expect(result.vehicles[0]?.position).toMatchObject({ latitude: -34.61, longitude: -58.41 })
  })
  it("does not classify a future provider position as fresh", async () => {
    vi.stubEnv("LOGISTICS_GPS_PROVIDER_BASE_URL", "https://provider.test/api"); vi.stubEnv("LOGISTICS_GPS_PROVIDER_TOKEN", "test-token")
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([{ id: 7 }]), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify([{ deviceId: 7, latitude: -34.6, longitude: -58.4, fixTime: "2026-09-14T10:11:00Z" }]), { status: 200 }))
    const result = await getLogisticsVehicleProjection({ vehicle: { findMany: vi.fn().mockResolvedValue([{ id: "v-1", name: "Unidad 1", trackingDeviceId: "7" }]) } }, "company-a", new Date("2026-09-14T10:10:00Z"))
    expect(result.vehicles[0]?.state).toBe("stale")
  })
  it("isolates the requested company vehicle and returns sorted, capped, sanitized history", async () => {
    vi.stubEnv("LOGISTICS_GPS_PROVIDER_BASE_URL", "https://provider.test/api"); vi.stubEnv("LOGISTICS_GPS_PROVIDER_TOKEN", "test-token")
    const raw = Array.from({ length: 1002 }, (_, index) => ({ deviceId: 7, latitude: -34.6, longitude: -58.4, fixTime: new Date(Date.UTC(2026, 8, 14, 0, 0, index)).toISOString(), speed: 10, attributes: { secret: "nope" } })).reverse()
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([...raw, { deviceId: 8, latitude: -35, longitude: -59, fixTime: "2026-09-14T10:00:00Z" }]), { status: 200 }))
    const db: any = { vehicle: { findFirst: vi.fn().mockResolvedValue({ id: "v-1", name: "Unidad 1", trackingDeviceId: "7" }) } }
    const result = await getLogisticsVehicleRoute(db, "company-a", "v-1", 24, new Date("2026-09-14T10:00:00Z"))
    const points = result!.points
    expect(db.vehicle.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company-a", id: "v-1" }) })); expect(points).toHaveLength(1000); expect(points[0]!.recordedAt < points.at(-1)!.recordedAt).toBe(true); expect(JSON.stringify(result)).not.toContain("test-token")
  })
  it.each([["HTTP failure", () => new Response("provider error", { status: 502 })], ["network failure", () => Promise.reject(new Error("provider error"))], ["invalid payload", () => new Response("{invalid-json", { status: 200 })]])("returns a sanitized unavailable route for a provider %s", async (_, failure) => {
    vi.stubEnv("LOGISTICS_GPS_PROVIDER_BASE_URL", "https://provider.test/api"); vi.stubEnv("LOGISTICS_GPS_PROVIDER_TOKEN", "test-token"); global.fetch = vi.fn().mockImplementation(failure)
    const result = await getLogisticsVehicleRoute({ vehicle: { findFirst: vi.fn().mockResolvedValue({ id: "v-1", name: "Unidad 1", trackingDeviceId: "7" }) } }, "company-a", "v-1", 6)
    expect(result).toEqual({ vehicle: { id: "v-1", name: "Unidad 1" }, feed: "unavailable", points: [] })
  })
  it("rejects non-array payloads and locally clips provider points to the requested window", async () => {
    vi.stubEnv("LOGISTICS_GPS_PROVIDER_BASE_URL", "https://provider.test/api"); vi.stubEnv("LOGISTICS_GPS_PROVIDER_TOKEN", "test-token")
    const db: any = { vehicle: { findFirst: vi.fn().mockResolvedValue({ id: "v-1", name: "Unidad 1", trackingDeviceId: "7" }) } }
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ positions: [] }), { status: 200 }))
    await expect(getLogisticsVehicleRoute(db, "company-a", "v-1", 1, new Date("2026-09-14T10:00:00Z"))).resolves.toMatchObject({ feed: "unavailable", points: [] })
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ deviceId: 7, latitude: -34.6, longitude: -58.4, fixTime: "2026-09-14T08:59:59Z" }, { deviceId: 7, latitude: -34.6, longitude: -58.4, fixTime: "2026-09-14T09:00:00Z" }, { deviceId: 7, latitude: -34.6, longitude: -58.4, fixTime: "2026-09-14T10:00:00Z" }, { deviceId: 7, latitude: -34.6, longitude: -58.4, fixTime: "2026-09-14T10:00:01Z" }]), { status: 200 }))
    await expect(getLogisticsVehicleRoute(db, "company-a", "v-1", 1, new Date("2026-09-14T10:00:00Z"))).resolves.toMatchObject({ feed: "active", points: [{ recordedAt: "2026-09-14T09:00:00.000Z" }, { recordedAt: "2026-09-14T10:00:00.000Z" }] })
  })
})
