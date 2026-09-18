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

export default function LogisticsMapCanvas({ markers = [], excluded = 0, vehicles = [], feed, route = [], onOpen }: Props) {
  const [selected, setSelected] = useState<LogisticsMapMarker | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [routeOverlay, setRouteOverlay] = useState<{ height: number; path: string; width: number } | null>(null)
  const mapRef = useRef<MapRef>(null)
  const positionedVehicles = vehicles.filter((vehicle) => vehicle.position)
  const center = useMemo(() => markers.length ? [markers[0].geo.coordinate.longitude!, markers[0].geo.coordinate.latitude!] as [number, number] : positionedVehicles.length ? [positionedVehicles[0].position!.longitude, positionedVehicles[0].position!.latitude] as [number, number] : [-64, -38] as [number, number], [markers, positionedVehicles])

  useEffect(() => {
    if (!mapReady || route.length < 2) return
    mapRef.current?.fitBounds([[Math.min(...route.map((point) => point.longitude)), Math.min(...route.map((point) => point.latitude))], [Math.max(...route.map((point) => point.longitude)), Math.max(...route.map((point) => point.latitude))]], { padding: 64, maxZoom: 15, duration: 500 })
  }, [mapReady, route])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!mapReady || !map || route.length < 2) {
      setRouteOverlay(null)
      return
    }
    const draw = () => {
      const canvas = map.getCanvas()
      setRouteOverlay({ height: canvas.clientHeight, width: canvas.clientWidth, path: route.map((point) => { const pixel = map.project([point.longitude, point.latitude]); return `${pixel.x},${pixel.y}` }).join(" ") })
    }
    draw()
    map.on("moveend", draw)
    map.on("resize", draw)
    window.addEventListener("resize", draw)
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      map.resize()
      draw()
    })
    resizeObserver?.observe(map.getContainer())
    return () => {
      map.off("moveend", draw)
      map.off("resize", draw)
      window.removeEventListener("resize", draw)
      resizeObserver?.disconnect()
    }
  }, [mapReady, route])

  return <div className="relative h-[52svh] min-h-80 overflow-hidden border border-[var(--ossum-line)] bg-slate-100 sm:h-[440px]"><Map ref={mapRef} onLoad={() => setMapReady(true)} initialViewState={{ longitude: center[0], latitude: center[1], zoom: markers.length || positionedVehicles.length ? 13 : 3.5 }} mapStyle={{ version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] }}><NavigationControl position="top-right" showCompass={false} />{route.length >= 2 && <><Marker longitude={route[0].longitude} latitude={route[0].latitude}><span aria-label="Inicio del recorrido" className="block size-3 rounded-full bg-emerald-700" /></Marker><Marker longitude={route.at(-1)!.longitude} latitude={route.at(-1)!.latitude}><span aria-label="Fin del recorrido" className="block size-3 rounded-full bg-teal-950" /></Marker></>}{markers.map((marker) => <Marker key={marker.surgery.id} longitude={marker.geo.coordinate.longitude!} latitude={marker.geo.coordinate.latitude!} anchor="bottom"><button type="button" aria-label={`Ver cirugía ${marker.surgery.reference ?? "sin referencia"}`} onClick={() => setSelected(marker)} className="grid size-11 place-items-center rounded-full bg-[var(--ossum-action)] text-white">⚕</button><span>{marker.surgery.reference ?? "CX"}</span></Marker>)}{positionedVehicles.map((vehicle) => <Marker key={vehicle.id} longitude={vehicle.position!.longitude} latitude={vehicle.position!.latitude} anchor="bottom"><span aria-label={`Vehículo ${vehicle.name}: ${vehicle.state === "fresh" ? "Señal actualizada" : "Señal anterior"}`} className="grid size-10 place-items-center rounded-full bg-emerald-700 text-white">🚐</span><span>{vehicle.name}</span><span>Última señal: {new Date(vehicle.position!.recordedAt).toLocaleString("es-AR")}</span></Marker>)}{selected && <Popup longitude={selected.geo.coordinate.longitude!} latitude={selected.geo.coordinate.latitude!} onClose={() => setSelected(null)}><Button onClick={() => onOpen(selected.surgery.id)}>Abrir cirugía</Button></Popup>}</Map>{routeOverlay && <svg aria-label="Trazado del recorrido" className="pointer-events-none absolute inset-0 z-10" width="100%" height="100%" viewBox={`0 0 ${routeOverlay.width} ${routeOverlay.height}`} preserveAspectRatio="none"><polyline points={routeOverlay.path} fill="none" stroke="white" strokeWidth="10" /><polyline points={routeOverlay.path} fill="none" stroke="#1D2FC0" strokeWidth="6" /></svg>}<div aria-label="Leyenda del mapa" className="absolute left-3 top-3 bg-white p-1 text-xs">⚕ cirugía · 🚐 unidad actualizada</div>{feed !== "active" && <div className="absolute inset-x-3 top-12 bg-amber-50 p-2 text-xs">{feed === "unconfigured" ? "La conexión de flota todavía no está configurada." : "La señal de flota no está disponible ahora."}</div>}{vehicles.some((vehicle) => vehicle.state === "unknown") && <div className="absolute right-3 top-12 bg-white p-2 text-xs">{vehicles.filter((vehicle) => vehicle.state === "unknown").length} vehículo{vehicles.filter((vehicle) => vehicle.state === "unknown").length === 1 ? " sin ubicación disponible" : "s sin ubicación disponible"}</div>}{markers.length === 0 && <div className="absolute inset-x-3 bottom-3 bg-amber-50 p-3 text-sm"><strong>Mapa sin ubicaciones elegibles.</strong> {excluded} cirugía{excluded === 1 ? " quedó" : "s quedaron"} fuera por ubicación ausente, incompleta o no validada.</div>}</div>
}
