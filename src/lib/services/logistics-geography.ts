export type GeographicCoordinateType = "centroid" | "address" | "gps" | "survey" | "manual" | "unknown"
export type GeographicValidationStatus = "verified" | "candidate" | "conflict" | "missing" | "manual_verified" | "deprecated"

type GeographicAddress = {
  georefId?: string | null
  entityType?: string | null
  city?: string | null
  provinceGeorefId?: string | null
  provinceName?: string | null
  latitude?: { toString(): string } | number | string | null
  longitude?: { toString(): string } | number | string | null
  coordinateType?: string | null
  crs?: string | null
  source?: string | null
  sourceVersion?: string | null
  sourceRetrievedAt?: Date | string | null
  validationStatus?: string | null
  validationNotes?: string | null
  geometry?: unknown
  geometrySource?: string | null
}

export type LogisticsGeo = {
  georefId: string | null
  entityType: string | null
  locality: { name: string | null }
  province: { georefId: string | null; name: string | null }
  coordinate: { latitude: number | null; longitude: number | null; type: GeographicCoordinateType | null; crs: "EPSG:4326" | null }
  source: { name: string | null; version: string | null; retrievedAt: string | null }
  validation: { status: GeographicValidationStatus | null; notes: string | null }
  geometry: { available: boolean; source: string | null }
}

export type MarkerEligibility = { eligible: true } | { eligible: false; reason: "missing" | "incomplete" | "unvalidated" | "incompatible_crs" | "conflict" }

const coordinateTypes: Record<string, GeographicCoordinateType> = { CENTROID: "centroid", ADDRESS: "address", GPS: "gps", SURVEY: "survey", MANUAL: "manual", UNKNOWN: "unknown" }
const validationStatuses: Record<string, GeographicValidationStatus> = { verified: "verified", candidate: "candidate", conflict: "conflict", missing: "missing", manual_verified: "manual_verified", deprecated: "deprecated", VERIFIED: "verified", CANDIDATE: "candidate", CONFLICT: "conflict", MISSING: "missing", MANUAL_VERIFIED: "manual_verified", DEPRECATED: "deprecated" }

const value = (input: GeographicAddress["latitude"]) => input == null || input === "" ? null : Number(input)
const text = (input: string | null | undefined) => input?.trim() || null
const timestamp = (input: Date | string | null | undefined) => input instanceof Date ? input.toISOString() : input ?? null

export function geographyFromAddress(address?: GeographicAddress | null): LogisticsGeo {
  const coordinateType = address?.coordinateType ? coordinateTypes[address.coordinateType] ?? null : null
  const validationStatus = address?.validationStatus ? validationStatuses[address.validationStatus] ?? null : null
  return {
    georefId: text(address?.georefId), entityType: text(address?.entityType), locality: { name: text(address?.city) },
    province: { georefId: text(address?.provinceGeorefId), name: text(address?.provinceName) },
    coordinate: { latitude: value(address?.latitude), longitude: value(address?.longitude), type: coordinateType, crs: address?.crs === "EPSG:4326" || address?.crs === "EPSG_4326" ? "EPSG:4326" : null },
    source: { name: text(address?.source), version: text(address?.sourceVersion), retrievedAt: timestamp(address?.sourceRetrievedAt) },
    validation: { status: validationStatus, notes: text(address?.validationNotes) },
    geometry: { available: address?.geometry != null, source: text(address?.geometrySource) },
  }
}

export function markerEligibility(geo: LogisticsGeo): MarkerEligibility {
  const { latitude, longitude, type, crs } = geo.coordinate
  if (geo.validation.status === "conflict") return { eligible: false, reason: "conflict" }
  if (latitude == null && longitude == null && !geo.georefId) return { eligible: false, reason: "missing" }
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || !type || !geo.source.name) return { eligible: false, reason: "incomplete" }
  if (crs !== "EPSG:4326") return { eligible: false, reason: "incompatible_crs" }
  if (geo.validation.status !== "verified" && geo.validation.status !== "manual_verified") return { eligible: false, reason: "unvalidated" }
  return { eligible: true }
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function calculateEtaMinutes(distanceKm: number, averageSpeedKmh: number = 30): number {
  if (distanceKm <= 0) return 0
  const hours = distanceKm / Math.max(averageSpeedKmh, 10)
  return Math.round(hours * 60)
}

export type NearbyVehicleMatch = {
  vehicleId: string
  vehicleName: string
  distanceKm: number
  etaMinutes: number
  isNearby: boolean // < 1.0 km
}

export function findNearestVehicle(
  targetLat: number,
  targetLon: number,
  vehicles: Array<{
    id: string
    name: string
    position?: { latitude: number; longitude: number } | null
  }>,
  maxRadiusKm: number = 25
): NearbyVehicleMatch | null {
  let nearest: NearbyVehicleMatch | null = null

  for (const v of vehicles) {
    if (!v.position) continue
    const dist = calculateDistanceKm(targetLat, targetLon, v.position.latitude, v.position.longitude)
    if (dist <= maxRadiusKm) {
      if (!nearest || dist < nearest.distanceKm) {
        nearest = {
          vehicleId: v.id,
          vehicleName: v.name,
          distanceKm: Math.round(dist * 10) / 10,
          etaMinutes: calculateEtaMinutes(dist),
          isNearby: dist < 1.0,
        }
      }
    }
  }

  return nearest
}

export function auditGeography(addresses: Array<GeographicAddress | null | undefined>) {
  const summary = { total: addresses.length, eligible: 0, missing: 0, incomplete: 0, unvalidated: 0, incompatibleCrs: 0, conflict: 0 }
  for (const address of addresses) {
    const eligibility = markerEligibility(geographyFromAddress(address))
    if (eligibility.eligible) summary.eligible += 1
    else if (eligibility.reason === "incompatible_crs") summary.incompatibleCrs += 1
    else summary[eligibility.reason] += 1
  }
  return summary
}

