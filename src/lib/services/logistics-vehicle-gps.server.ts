import { normalizeGpsPositions, type GpsPosition, type GpsRouteHours } from "@/lib/validators/logistics-vehicle-gps"

type Db = any
type Vehicle = { id: string; name: string; trackingDeviceId: string | null }
export type LogisticsVehicle = { id: string; name: string; routeAvailable: boolean; state: "fresh" | "stale" | "unknown"; position: { latitude: number; longitude: number; recordedAt: string; speedKmh: number | null } | null }
export type VehicleFeed = "active" | "unconfigured" | "unavailable"
export type LogisticsVehicleRoute = { vehicle: { id: string; name: string }; feed: VehicleFeed; points: Array<{ latitude: number; longitude: number; recordedAt: string; speedKmh: number | null }> }

const FRESHNESS_MS = 15 * 60 * 1000

function providerConfig() {
  const baseUrl = process.env.LOGISTICS_GPS_PROVIDER_BASE_URL?.trim().replace(/\/$/, "")
  const token = process.env.LOGISTICS_GPS_PROVIDER_TOKEN?.trim()
  if (!baseUrl || !token) return null
  try { if (new URL(baseUrl).protocol !== "https:") return null } catch { return null }
  return { baseUrl, token }
}

async function getProviderSnapshot(config: { baseUrl: string; token: string }) {
  const headers = { Authorization: `Bearer ${config.token}`, Accept: "application/json" }
  const [devicesResponse, positionsResponse] = await Promise.all([
    fetch(`${config.baseUrl}/devices`, { headers }),
    fetch(`${config.baseUrl}/positions`, { headers }),
  ])
  if (!devicesResponse.ok || !positionsResponse.ok) throw new Error("gps_provider_unavailable")
  const [devices, positions] = await Promise.all([devicesResponse.json(), positionsResponse.json()])
  if (!Array.isArray(devices) || !Array.isArray(positions)) throw new Error("gps_provider_invalid_payload")
  const deviceList: Array<{ id: string; name: string }> = devices.flatMap((device) =>
    device && typeof device === "object" && (typeof device.id === "string" || typeof device.id === "number")
      ? [{ id: String(device.id), name: String(device.name || `Unidad ${device.id}`) }]
      : []
  )
  const deviceIds = new Set(deviceList.map((d) => d.id))
  return {
    devices: deviceList,
    positions: normalizeGpsPositions(positions).filter((position) => deviceIds.has(position.deviceId)),
  }
}

function state(position: GpsPosition | undefined, now: Date): LogisticsVehicle["state"] {
  if (!position) return "unknown"
  return position.outdated || now.getTime() - new Date(position.recordedAt).getTime() > FRESHNESS_MS ? "stale" : "fresh"
}

export async function getLogisticsVehicleProjection(db: Db, companyId: string, now = new Date()): Promise<{ feed: VehicleFeed; vehicles: LogisticsVehicle[] }> {
  let dbVehicles: Vehicle[] = []
  try {
    if (db.vehicle) {
      dbVehicles = await db.vehicle.findMany({ where: { companyId, provider: "rastreo_satelital" }, select: { id: true, name: true, trackingDeviceId: true } })
    }
  } catch {
    dbVehicles = []
  }

  const config = providerConfig()
  if (!config) {
    return { feed: "unconfigured", vehicles: dbVehicles.map(({ id, name, trackingDeviceId }) => ({ id, name, routeAvailable: Boolean(trackingDeviceId), state: "unknown", position: null })) }
  }

  try {
    const { devices, positions } = await getProviderSnapshot(config)
    const byDevice = new Map(positions.map((position) => [position.deviceId, position]))

    // If no DB vehicles are configured, use live provider devices directly
    const effectiveVehicles: Vehicle[] = dbVehicles.length > 0
      ? dbVehicles
      : devices.map((d) => ({ id: d.id, name: d.name, trackingDeviceId: d.id }))

    return {
      feed: "active",
      vehicles: effectiveVehicles.map(({ id, name, trackingDeviceId }) => {
        const position = trackingDeviceId ? byDevice.get(trackingDeviceId) : undefined
        return {
          id,
          name,
          routeAvailable: Boolean(trackingDeviceId),
          state: state(position, now),
          position: position ? { latitude: position.latitude, longitude: position.longitude, recordedAt: position.recordedAt, speedKmh: position.speedKmh } : null,
        }
      }),
    }
  } catch {
    return { feed: "unavailable", vehicles: dbVehicles.map(({ id, name, trackingDeviceId }) => ({ id, name, routeAvailable: Boolean(trackingDeviceId), state: "unknown", position: null })) }
  }
}

export async function getLogisticsVehicleRoute(db: Db, companyId: string, vehicleId: string, hours: GpsRouteHours, now = new Date()): Promise<LogisticsVehicleRoute | null> {
  let trackingDeviceId: string | null = null
  let vehicleName = `Unidad ${vehicleId}`

  try {
    if (db.vehicle) {
      const vehicle = await db.vehicle.findFirst({ where: { id: vehicleId, companyId, provider: "rastreo_satelital", trackingDeviceId: { not: null } }, select: { id: true, name: true, trackingDeviceId: true } })
      if (vehicle) {
        trackingDeviceId = vehicle.trackingDeviceId
        vehicleName = vehicle.name
      }
    }
  } catch {
    // fallback
  }

  if (!trackingDeviceId) {
    // Fallback: vehicleId directly corresponds to provider deviceId
    trackingDeviceId = vehicleId
  }

  const config = providerConfig()
  const result = { vehicle: { id: vehicleId, name: vehicleName }, feed: "unconfigured" as VehicleFeed, points: [] as LogisticsVehicleRoute["points"] }
  if (!config) return result

  const to = now.toISOString()
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
  try {
    const url = new URL(`${config.baseUrl}/positions`)
    url.searchParams.set("deviceId", trackingDeviceId)
    url.searchParams.set("from", from)
    url.searchParams.set("to", to)
    const response = await fetch(url, { headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" } })
    if (!response.ok) throw new Error("gps_provider_unavailable")
    const points = normalizeGpsPositions(await response.json())
      .filter((point) => point.deviceId === trackingDeviceId)
      .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
      .slice(-1000)
      .map(({ latitude, longitude, recordedAt, speedKmh }) => ({ latitude, longitude, recordedAt, speedKmh }))
    return { ...result, feed: "active", points }
  } catch { return { ...result, feed: "unavailable" } }
}
