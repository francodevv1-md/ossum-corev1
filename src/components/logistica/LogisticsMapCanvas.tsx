"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Map, { Marker, NavigationControl, Popup, type MapRef } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"

import { Button } from "@/components/ui/button"
import type { LogisticsGeo } from "@/lib/services/logistics-geography"

export type LogisticsMapMarker = { surgery: { id: string; reference: string | null }; institution: { id: string; name: string } | null; geo: LogisticsGeo }
type Vehicle = { id: string; name: string; state: "fresh" | "stale" | "unknown"; position: { latitude: number; longitude: number; recordedAt: string; speedKmh: number | null } | null }
type RoutePoint = { latitude: number; longitude: number; recordedAt: string; speedKmh: number | null }
type Props = { markers: LogisticsMapMarker[]; excluded: number; vehicles: Vehicle[]; feed: "active" | "unconfigured" | "unavailable"; route?: RoutePoint[]; onOpen: (surgeryId: string) => void }

const coordinateLabel: Record<NonNullable<LogisticsGeo["coordinate"]["type"]>, string> = { centroid: "Centroide de localidad", address: "Dirección geocodificada", gps: "GPS real", survey: "Relevamiento", manual: "Punto validado manualmente", unknown: "Origen desconocido" }
const vehicleStateLabel = { fresh: "Señal actualizada", stale: "Señal anterior", unknown: "Sin ubicación" }
const formatSignalTime = (value: string) => new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))

export default function LogisticsMapCanvas({ markers = [], excluded = 0, vehicles = [], feed, route = [], onOpen }: Props) {
  const [selected, setSelected] = useState<LogisticsMapMarker | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [routeOverlay, setRouteOverlay] = useState<{ height: number; path: string; width: number } | null>(null)
  const mapRef = useRef<MapRef>(null)
  const positionedVehicles = vehicles.filter((vehicle) => vehicle.position)
  const center = useMemo(() => markers.length ? [markers[0].geo.coordinate.longitude!, markers[0].geo.coordinate.latitude!] as [number, number] : positionedVehicles.length ? [positionedVehicles[0].position!.longitude, positionedVehicles[0].position!.latitude] as [number, number] : [-64, -38] as [number, number], [markers, positionedVehicles])
  useEffect(() => {
    if (!mapReady || route.length < 2) return
    const longitudes = route.map((point) => point.longitude)
    const latitudes = route.map((point) => point.latitude)
    mapRef.current?.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], { padding: 64, maxZoom: 15, duration: 500 })
  }, [mapReady, route])
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!mapReady || !map || route.length < 2) {
      setRouteOverlay(null)
      return
    }
    const drawRoute = () => {
      const canvas = map.getCanvas()
      setRouteOverlay({ height: canvas.clientHeight, width: canvas.clientWidth, path: route.map((point) => {
        const pixel = map.project([point.longitude, point.latitude])
        return `${pixel.x},${pixel.y}`
      }).join(" ") })
    }
    drawRoute()
    map.on("moveend", drawRoute)
    return () => { map.off("moveend", drawRoute) }
  }, [mapReady, route])
  return <div className="relative h-[52svh] min-h-80 overflow-hidden border border-[var(--ossum-line)] bg-slate-100 sm:h-[440px]">
      <Map ref={mapRef} onLoad={() => setMapReady(true)} initialViewState={{ longitude: center[0], latitude: center[1], zoom: markers.length || positionedVehicles.length ? 13 : 3.5 }} mapStyle={{ version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] }}>
        <NavigationControl position="top-right" showCompass={false} />
        {route.length >= 2 && <><Marker longitude={route[0].longitude} latitude={route[0].latitude}><span aria-label="Inicio del recorrido" className="block size-3 rounded-full border-2 border-white bg-emerald-700 shadow" /></Marker><Marker longitude={route[route.length - 1].longitude} latitude={route[route.length - 1].latitude}><span aria-label="Fin del recorrido" className="block size-3 rounded-full border-2 border-white bg-teal-950 shadow" /></Marker></>}
        {markers.map((marker) => <Marker key={marker.surgery.id} longitude={marker.geo.coordinate.longitude!} latitude={marker.geo.coordinate.latitude!} anchor="bottom"><div className="group relative"><button type="button" className="grid size-11 place-items-center rounded-full border-2 border-white bg-gradient-to-b from-[#4c62e8] to-[var(--ossum-action)] text-lg font-bold text-white shadow-[0_3px_0_#122991,0_8px_16px_rgba(29,47,192,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ossum-action)] focus-visible:ring-offset-2" aria-label={`Ver cirugía ${marker.surgery.reference ?? "sin referencia"}`} onClick={() => setSelected(marker)}><span aria-hidden="true">⚕</span></button><span className="pointer-events-none absolute left-[calc(100%+7px)] top-1/2 w-max -translate-y-1/2 rounded-md border border-white/80 bg-white/95 px-2 py-1 text-xs font-bold text-[var(--ossum-navy)] shadow-sm">{marker.surgery.reference ?? "CX"}</span><div role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+9px)] left-1/2 z-10 w-56 -translate-x-1/2 rounded-lg border border-[var(--ossum-line-strong)] bg-white px-3 py-2 text-left text-xs text-slate-700 opacity-0 shadow-[0_8px_18px_rgba(7,25,53,0.2)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><p className="font-semibold text-[var(--ossum-navy)]">{marker.surgery.reference ?? "Cirugía sin referencia"}</p><p>{marker.institution?.name ?? "Sin institución"}</p><p className="mt-1 text-slate-500">{coordinateLabel[marker.geo.coordinate.type!]} · {marker.geo.locality.name ?? "Localidad no publicada"}</p></div></div></Marker>)}
        {positionedVehicles.map((vehicle) => <Marker key={vehicle.id} longitude={vehicle.position!.longitude} latitude={vehicle.position!.latitude} anchor="bottom"><div className="group relative"><span className={`grid size-10 place-items-center rounded-full border-2 border-white text-lg shadow-[0_3px_0_rgba(6,78,59,0.9),0_8px_16px_rgba(5,150,105,0.35)] transition-transform group-hover:-translate-y-0.5 ${vehicle.state === "fresh" ? "bg-gradient-to-b from-emerald-400 to-emerald-700" : "bg-gradient-to-b from-amber-300 to-amber-700"}`} aria-label={`Vehículo ${vehicle.name}: ${vehicleStateLabel[vehicle.state]}`}><span aria-hidden="true">🚐</span></span><span className="pointer-events-none absolute left-[calc(100%+7px)] top-1/2 w-max -translate-y-1/2 rounded-md border border-white/80 bg-white/95 px-2 py-1 text-xs font-bold text-[var(--ossum-navy)] shadow-sm">{vehicle.name}</span><div role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+9px)] left-1/2 z-10 w-56 -translate-x-1/2 rounded-lg border border-[var(--ossum-line-strong)] bg-white px-3 py-2 text-left text-xs text-slate-700 opacity-0 shadow-[0_8px_18px_rgba(7,25,53,0.2)] transition-opacity group-hover:opacity-100"><p className="font-semibold text-[var(--ossum-navy)]">{vehicle.name}</p><p>{vehicleStateLabel[vehicle.state]}</p><p className="mt-1 text-slate-500">Última señal: {formatSignalTime(vehicle.position!.recordedAt)}</p>{vehicle.position!.speedKmh != null && <p className="text-slate-500">Velocidad: {Math.round(vehicle.position!.speedKmh)} km/h</p>}</div></div></Marker>)}
        {selected && <Popup longitude={selected.geo.coordinate.longitude!} latitude={selected.geo.coordinate.latitude!} anchor="top" closeButton onClose={() => setSelected(null)}><div className="min-w-48 space-y-1 p-1 text-sm"><p className="font-semibold text-slate-900">{selected.surgery.reference ?? "Cirugía sin referencia"}</p><p className="text-slate-700">{selected.institution?.name ?? "Sin institución"}</p><p className="text-xs text-slate-500">{coordinateLabel[selected.geo.coordinate.type!]}</p><p className="text-xs text-slate-500">{selected.geo.locality.name ?? "Localidad no publicada"}{selected.geo.province.name ? `, ${selected.geo.province.name}` : ""}</p><Button type="button" size="sm" className="mt-2 min-h-10" onClick={() => onOpen(selected.surgery.id)}>Abrir cirugía</Button></div></Popup>}
      </Map>
      {routeOverlay && <svg aria-label="Trazado del recorrido" className="pointer-events-none absolute inset-0 z-10" viewBox={`0 0 ${routeOverlay.width} ${routeOverlay.height}`} preserveAspectRatio="none"><polyline points={routeOverlay.path} fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10" opacity="0.92" /><polyline points={routeOverlay.path} fill="none" stroke="#1D2FC0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" opacity="0.96" /></svg>}
      <div aria-label="Leyenda del mapa" className="pointer-events-none absolute left-3 top-3 border border-slate-200 bg-white/95 px-2 py-1 text-xs text-slate-700 shadow-sm"><span className="font-semibold text-[var(--ossum-action)]">⚕</span> cirugía · <span className="font-semibold text-emerald-700">🚐</span> unidad actualizada · <span className="font-semibold text-amber-700">🚐</span> unidad sin señal reciente</div>
     {feed !== "active" && <div className="pointer-events-none absolute inset-x-3 top-12 border border-amber-200 bg-amber-50/95 p-2 text-xs text-amber-950">{feed === "unconfigured" ? "La conexión de flota todavía no está configurada." : "La señal de flota no está disponible ahora."}</div>}
     {vehicles.some((vehicle) => vehicle.state === "unknown") && <div className="pointer-events-none absolute right-3 top-12 border border-slate-200 bg-white/95 p-2 text-xs text-slate-700">{vehicles.filter((vehicle) => vehicle.state === "unknown").length} vehículo{vehicles.filter((vehicle) => vehicle.state === "unknown").length === 1 ? " sin ubicación disponible" : "s sin ubicación disponible"}</div>}
    {markers.length === 0 && <div className="pointer-events-none absolute inset-x-3 bottom-3 border border-amber-200 bg-amber-50/95 p-3 text-sm text-amber-950 shadow-sm"><strong>Mapa sin ubicaciones elegibles.</strong> {excluded} cirugía{excluded === 1 ? " quedó" : "s quedaron"} fuera por ubicación ausente, incompleta o no validada.</div>}
  </div>
}
