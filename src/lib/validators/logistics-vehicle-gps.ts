export type GpsPosition = { deviceId: string; latitude: number; longitude: number; recordedAt: string; speedKmh: number | null; outdated: boolean }
export const GPS_ROUTE_HOURS = [1, 3, 6, 12, 24] as const
export type GpsRouteHours = typeof GPS_ROUTE_HOURS[number]

type ProviderPosition = { deviceId?: unknown; latitude?: unknown; longitude?: unknown; fixTime?: unknown; deviceTime?: unknown; serverTime?: unknown; speed?: unknown; valid?: unknown; outdated?: unknown }

const deviceId = (value: unknown) => (typeof value === "string" || typeof value === "number") && String(value).trim() ? String(value) : null

export function normalizeGpsPosition(input: unknown): { status: "accepted"; position: GpsPosition } | { status: "rejected" } {
  if (!input || typeof input !== "object") return { status: "rejected" }
  const value = input as ProviderPosition
  const id = deviceId(value.deviceId)
  const latitude = typeof value.latitude === "number" ? value.latitude : Number.NaN
  const longitude = typeof value.longitude === "number" ? value.longitude : Number.NaN
  const observedAt = [value.fixTime, value.deviceTime, value.serverTime].find((time): time is string => typeof time === "string" && !Number.isNaN(Date.parse(time)))
  if (!id || value.valid === false || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || !observedAt) return { status: "rejected" }
  const speedKnots = typeof value.speed === "number" && Number.isFinite(value.speed) ? value.speed : null
  return { status: "accepted", position: { deviceId: id, latitude, longitude, recordedAt: new Date(observedAt).toISOString(), speedKmh: speedKnots == null ? null : speedKnots * 1.852, outdated: value.outdated === true } }
}

export function normalizeGpsPositions(input: unknown): GpsPosition[] {
  if (!Array.isArray(input)) return []
  return input.flatMap((position) => { const result = normalizeGpsPosition(position); return result.status === "accepted" ? [result.position] : [] })
}

export function validateGpsRouteHours(value: string | null): GpsRouteHours {
  if (value === null) return 6
  if (!GPS_ROUTE_HOURS.some((hours) => String(hours) === value)) throw badRequest("hours must be one of 1, 3, 6, 12, or 24", "invalid_gps_route_hours")
  return Number(value) as GpsRouteHours
}
import { badRequest } from "@/lib/api/errors"
