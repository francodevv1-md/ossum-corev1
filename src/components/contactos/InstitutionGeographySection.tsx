"use client"

import { useEffect, useRef, useState } from "react"

import { ContactAddressMapPreview } from "@/components/contactos/ContactAddressMapPreview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { lookupContactAddressGeoref } from "@/lib/api/contacts"
import type { GeoCandidate } from "@/lib/georef/georef-address.adapter"
import type { ContactAddressGeoInput } from "@/lib/validators/contact"

type Props = {
  companyId: string
  actorRole?: string
  address: { street: string; city: string; state: string }
  value?: ContactAddressGeoInput | null
  onChange: (value: ContactAddressGeoInput | null | undefined) => void
}

const toCandidateGeo = (candidate: GeoCandidate): ContactAddressGeoInput => ({
  georefId: candidate.georefId,
  entityType: candidate.entityType,
  provinceGeorefId: candidate.provinceGeorefId,
  provinceName: candidate.provinceName,
  latitude: candidate.latitude,
  longitude: candidate.longitude,
  coordinateType: candidate.coordinateType,
  crs: candidate.crs,
  source: candidate.source,
  sourceVersion: candidate.sourceVersion,
  sourceRetrievedAt: candidate.retrievedAt,
  validationStatus: "candidate",
})

const validManualCoordinate = (latitude: string, longitude: string) => {
  const lat = Number(latitude), lng = Number(longitude)
  return latitude.trim() !== "" && longitude.trim() !== "" && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { latitude: lat, longitude: lng } : null
}

export function InstitutionGeographySection({ companyId, actorRole, address, value, onChange }: Props) {
  const lookupRef = useRef(0)
  const lookupContext = `${companyId}\u0000${address.street}\u0000${address.city}\u0000${address.state}`
  const lookupContextRef = useRef(lookupContext)
  const addressContextRef = useRef(lookupContext)
  lookupContextRef.current = lookupContext
  const controllerRef = useRef<AbortController | null>(null)
  const [candidates, setCandidates] = useState<GeoCandidate[]>([])
  const [lookupError, setLookupError] = useState("")
  const [lookingUp, setLookingUp] = useState(false)
  const [latitude, setLatitude] = useState(value?.coordinateType === "MANUAL" && value.latitude != null ? String(value.latitude) : "")
  const [longitude, setLongitude] = useState(value?.coordinateType === "MANUAL" && value.longitude != null ? String(value.longitude) : "")

  useEffect(() => {
    lookupRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
    setCandidates([])
    setLookupError("")
    setLookingUp(false)
    if (addressContextRef.current !== lookupContext) {
      addressContextRef.current = lookupContext
      setLatitude("")
      setLongitude("")
      onChange(null)
    }
  }, [address.street, address.city, address.state, companyId, lookupContext, onChange])

  useEffect(() => () => controllerRef.current?.abort(), [])

  const lookup = async () => {
    if (!address.street.trim()) {
      setLookupError("Ingresá el domicilio antes de buscar.")
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const request = ++lookupRef.current
    const requestContext = lookupContext
    setLookingUp(true)
    setLookupError("")
    try {
      const result = await lookupContactAddressGeoref(companyId, { street: address.street, city: address.city || null, state: address.state || null, country: "AR" }, controller.signal)
      if (request !== lookupRef.current || requestContext !== lookupContextRef.current || controller.signal.aborted) return
      setCandidates(result.candidates)
      if (!result.candidates.length) setLookupError("No se encontraron ubicaciones utilizables. Elegí coordenadas manuales si corresponde.")
    } catch {
      if (request !== lookupRef.current || requestContext !== lookupContextRef.current || controller.signal.aborted) return
      setCandidates([])
      setLookupError("No se pudo consultar Georef. Podés ingresar coordenadas manuales.")
    } finally {
      if (request === lookupRef.current && !controller.signal.aborted) setLookingUp(false)
    }
  }

  const updateManual = (nextLatitude: string, nextLongitude: string) => {
    setLatitude(nextLatitude)
    setLongitude(nextLongitude)
    const coordinate = validManualCoordinate(nextLatitude, nextLongitude)
    if (coordinate) onChange({ ...coordinate, coordinateType: "MANUAL", crs: "EPSG:4326", source: "Manual", validationStatus: "candidate" })
    else onChange(null)
  }

  const setStatus = (validationStatus: "candidate" | "verified" | "manual_verified") => {
    if (value && !(["verified", "manual_verified"].includes(value.validationStatus ?? "") && validationStatus === "candidate")) onChange({ ...value, validationStatus })
  }

  return <section className="border border-[var(--ossum-line)] bg-white" aria-labelledby="institution-geography"><h2 id="institution-geography" className="border-b border-[var(--ossum-line)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Ubicación geográfica</h2><div className="space-y-3 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><div className="flex-1"><Label className="text-xs font-medium">Buscar dirección</Label><p className="mt-1 text-xs text-muted-foreground">La selección es manual; ningún resultado se guarda automáticamente.</p></div><Button type="button" variant="outline" className="h-11 sm:h-8" disabled={lookingUp} onClick={() => void lookup()}>{lookingUp ? "Buscando…" : "Buscar ubicación"}</Button></div>{lookupError && <p role="status" className="text-xs text-amber-800">{lookupError}</p>}{candidates.length > 0 && <div className="space-y-2" aria-label="Resultados de ubicación">{candidates.map((candidate) => <button type="button" key={`${candidate.georefId}:${candidate.latitude}:${candidate.longitude}`} onClick={() => onChange(toCandidateGeo(candidate))} className="w-full border border-[var(--ossum-line)] p-3 text-left text-sm"><span className="block font-medium">{candidate.displayName}</span><span className="block text-xs text-muted-foreground">{candidate.city ?? "Localidad no informada"}{candidate.provinceName ? `, ${candidate.provinceName}` : ""}</span></button>)}</div>}<div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="institution-geo-latitude" className="text-xs font-medium">Latitud manual</Label><Input id="institution-geo-latitude" inputMode="decimal" value={latitude} onChange={(event) => updateManual(event.target.value, longitude)} className="mt-1 h-11 sm:h-8" /></div><div><Label htmlFor="institution-geo-longitude" className="text-xs font-medium">Longitud manual</Label><Input id="institution-geo-longitude" inputMode="decimal" value={longitude} onChange={(event) => updateManual(latitude, event.target.value)} className="mt-1 h-11 sm:h-8" /></div></div>{value && <div className="flex flex-col gap-1 text-xs"><span>Estado: <strong>{value.validationStatus ?? "candidate"}</strong></span><Button type="button" variant="outline" className="h-11 w-fit sm:h-8" onClick={() => onChange(null)}>Quitar ubicación</Button>{actorRole === "admin" ? <label className="flex items-center gap-2">Validación<select aria-label="Estado de validación geográfica" value={value.validationStatus ?? "candidate"} onChange={(event) => setStatus(event.target.value as "candidate" | "verified" | "manual_verified")}><option value="candidate">Pendiente</option><option value="verified" disabled={value.coordinateType === "MANUAL"}>Verificada</option><option value="manual_verified" disabled={value.coordinateType !== "MANUAL"}>Manual verificada</option></select></label> : <span className="text-muted-foreground">Solo un administrador puede validar la ubicación.</span>}</div>}{value?.latitude != null && value.longitude != null && value.coordinateType && <ContactAddressMapPreview latitude={value.latitude} longitude={value.longitude} coordinateType={value.coordinateType} validationStatus={value.validationStatus} />}</div></section>
}
