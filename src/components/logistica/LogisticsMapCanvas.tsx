"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Map, { Marker, NavigationControl, Popup, type MapRef } from "react-map-gl/maplibre"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import { Button } from "@/components/ui/button"
import type { LogisticsGeo } from "@/lib/services/logistics-geography"

export type LogisticsMapMarker = {
  surgery: { id: string; reference: string | null }
  institution: { id: string; name: string } | null
  geo: LogisticsGeo
}
type Vehicle = {
  id: string
  name: string
  state: "fresh" | "stale" | "unknown"
  position: { latitude: number; longitude: number; recordedAt: string; speedKmh: number | null } | null
  ignition?: boolean | null
  batteryLevel?: number | null
}
type RoutePoint = { latitude: number; longitude: number; recordedAt: string; speedKmh: number | null }
type Props = {
  markers: LogisticsMapMarker[]
  excluded: number
  vehicles: Vehicle[]
  feed: "active" | "unconfigured" | "unavailable"
  route?: RoutePoint[]
  onOpen: (surgeryId: string) => void
}

const coordinateLabel: Record<NonNullable<LogisticsGeo["coordinate"]["type"]>, string> = {
  centroid: "Centroide de localidad",
  address: "Dirección geocodificada",
  gps: "GPS real",
  survey: "Relevamiento",
  manual: "Punto validado manualmente",
  unknown: "Origen desconocido",
}
const vehicleStateLabel = { fresh: "Señal actualizada", stale: "Señal anterior", unknown: "Sin ubicación" }
const formatSignalTime = (value: string) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value))

export default function LogisticsMapCanvas({
  markers = [],
  excluded = 0,
  vehicles = [],
  feed,
  route = [],
  onOpen,
}: Props) {
  const [selectedMarker, setSelectedMarker] = useState<LogisticsMapMarker | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [routeOverlay, setRouteOverlay] = useState<{ height: number; path: string; width: number } | null>(null)
  const mapRef = useRef<MapRef>(null)
  const positionedVehicles = vehicles.filter((vehicle) => vehicle.position)
  const center = useMemo(
    () =>
      markers.length && markers[0].geo.coordinate.longitude && markers[0].geo.coordinate.latitude
        ? ([markers[0].geo.coordinate.longitude, markers[0].geo.coordinate.latitude] as [number, number])
        : positionedVehicles.length && positionedVehicles[0].position
        ? ([positionedVehicles[0].position.longitude, positionedVehicles[0].position.latitude] as [number, number])
        : ([-58.3816, -34.6037] as [number, number]), // Default to CABA center
    [markers, positionedVehicles]
  )

  useEffect(() => {
    if (!mapReady || route.length < 2) return
    const longitudes = route.map((point) => point.longitude)
    const latitudes = route.map((point) => point.latitude)
    mapRef.current?.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: 64, maxZoom: 15, duration: 500 }
    )
  }, [mapReady, route])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!mapReady || !map || route.length < 2) {
      setRouteOverlay(null)
      return
    }
    const drawRoute = () => {
      try {
        const canvas = map.getCanvas()
        setRouteOverlay({
          height: canvas.clientHeight,
          width: canvas.clientWidth,
          path: route
            .map((point) => {
              const pixel = map.project([point.longitude, point.latitude])
              return `${pixel.x},${pixel.y}`
            })
            .join(" "),
        })
      } catch {
        // ignore projection errors during resize
      }
    }
    drawRoute()
    map.on("moveend", drawRoute)
    return () => {
      map.off("moveend", drawRoute)
    }
  }, [mapReady, route])

  if (mapError) {
    return (
      <div className="flex h-[440px] flex-col items-center justify-center p-6 text-center bg-slate-50 border border-slate-200 rounded-xl">
        <p className="text-xs font-semibold text-slate-700">El visor del mapa no pudo inicializarse</p>
        <p className="mt-1 text-[11px] text-slate-500">{mapError}</p>
      </div>
    )
  }

  return (
    <div className="relative h-[52svh] min-h-80 overflow-hidden border border-slate-200 rounded-xl bg-slate-100 sm:h-[440px]">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        onLoad={() => setMapReady(true)}
        onError={(e) => {
          if (e?.error?.message?.includes("Worker")) {
            console.warn("MapLibre worker note:", e.error.message)
          } else if (e?.error) {
            setMapError(e.error.message || "Error al cargar mapa")
          }
        }}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: markers.length || positionedVehicles.length ? 12 : 10,
        }}
        mapStyle={{
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {route.length >= 2 && (
          <>
            <Marker longitude={route[0].longitude} latitude={route[0].latitude}>
              <span aria-label="Inicio del recorrido" className="block size-3 rounded-full border-2 border-white bg-emerald-700 shadow" />
            </Marker>
            <Marker longitude={route[route.length - 1].longitude} latitude={route[route.length - 1].latitude}>
              <span aria-label="Fin del recorrido" className="block size-3 rounded-full border-2 border-white bg-teal-950 shadow" />
            </Marker>
          </>
        )}
        {markers.map((marker) => (
          <Marker
            key={marker.surgery.id}
            longitude={marker.geo.coordinate.longitude!}
            latitude={marker.geo.coordinate.latitude!}
            anchor="bottom"
          >
            <div className="group relative">
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full border-2 border-white bg-sky-600 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
                aria-label={`Ver cirugía ${marker.surgery.reference ?? "sin referencia"}`}
                onClick={() => {
                  setSelectedVehicle(null)
                  setSelectedMarker(marker)
                }}
              >
                <span aria-hidden="true">⚕</span>
              </button>
              <span className="pointer-events-none absolute left-[calc(100%+6px)] top-1/2 w-max -translate-y-1/2 rounded-md border border-slate-200 bg-white/95 px-1.5 py-0.5 text-[11px] font-bold text-slate-900 shadow-xs">
                {marker.surgery.reference ?? "CX"}
              </span>
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <p className="font-semibold text-slate-900">{marker.surgery.reference ?? "Cirugía sin referencia"}</p>
                <p className="text-slate-600">{marker.institution?.name ?? "Sin institución"}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {coordinateLabel[marker.geo.coordinate.type!]} · {marker.geo.locality.name ?? "Localidad"}
                </p>
              </div>
            </div>
          </Marker>
        ))}
        {positionedVehicles.map((vehicle) => {
          const isMoving = (vehicle.position?.speedKmh ?? 0) > 0
          return (
            <Marker
              key={vehicle.id}
              longitude={vehicle.position!.longitude}
              latitude={vehicle.position!.latitude}
              anchor="bottom"
            >
              <div className="group relative">
                <button
                  type="button"
                  className={`grid size-9 place-items-center rounded-full border-2 border-white text-sm shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    vehicle.state === "fresh"
                      ? isMoving
                        ? "bg-emerald-600 text-white animate-pulse"
                        : "bg-emerald-700 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                  aria-label={`Vehículo ${vehicle.name}: ${vehicleStateLabel[vehicle.state]}`}
                  onClick={() => {
                    setSelectedMarker(null)
                    setSelectedVehicle(vehicle)
                  }}
                >
                  <span aria-hidden="true">🚐</span>
                </button>
                <div className="pointer-events-none absolute left-[calc(100%+6px)] top-1/2 flex items-center gap-1 -translate-y-1/2 w-max rounded-md border border-slate-200 bg-white/95 px-2 py-0.5 text-[11px] font-bold text-slate-900 shadow-xs">
                  <span>{vehicle.name}</span>
                  {vehicle.position?.speedKmh !== null && vehicle.position?.speedKmh !== undefined && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                      {Math.round(vehicle.position.speedKmh)} km/h
                    </span>
                  )}
                </div>
              </div>
            </Marker>
          )
        })}
        {selectedMarker && (
          <Popup
            longitude={selectedMarker.geo.coordinate.longitude!}
            latitude={selectedMarker.geo.coordinate.latitude!}
            anchor="top"
            closeButton
            onClose={() => setSelectedMarker(null)}
          >
            <div className="min-w-48 space-y-1 p-1 text-xs">
              <p className="font-bold text-slate-900">{selectedMarker.surgery.reference ?? "Cirugía sin referencia"}</p>
              <p className="text-slate-700">{selectedMarker.institution?.name ?? "Sin institución"}</p>
              <p className="text-[11px] text-slate-500">
                {selectedMarker.geo.locality.name ?? "Localidad"}
                {selectedMarker.geo.province.name ? `, ${selectedMarker.geo.province.name}` : ""}
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2 h-7 w-full text-xs font-semibold"
                onClick={() => onOpen(selectedMarker.surgery.id)}
              >
                Abrir cirugía
              </Button>
            </div>
          </Popup>
        )}
        {selectedVehicle && selectedVehicle.position && (
          <Popup
            longitude={selectedVehicle.position.longitude}
            latitude={selectedVehicle.position.latitude}
            anchor="top"
            closeButton
            onClose={() => setSelectedVehicle(null)}
          >
            <div className="min-w-52 space-y-1.5 p-1 text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                <p className="font-bold text-slate-900">{selectedVehicle.name}</p>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                    selectedVehicle.state === "fresh" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {vehicleStateLabel[selectedVehicle.state]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-0.5">
                <div>
                  <span className="text-slate-400 block text-[10px]">Velocidad:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedVehicle.position.speedKmh !== null
                      ? `${Math.round(selectedVehicle.position.speedKmh)} km/h`
                      : "0 km/h"}
                  </span>
                </div>
                {selectedVehicle.ignition !== undefined && selectedVehicle.ignition !== null && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contacto:</span>
                    <span className={`font-semibold ${selectedVehicle.ignition ? "text-emerald-700" : "text-slate-600"}`}>
                      {selectedVehicle.ignition ? "🔑 Encendido" : "🛑 Apagado"}
                    </span>
                  </div>
                )}
                {selectedVehicle.batteryLevel !== undefined && selectedVehicle.batteryLevel !== null && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Batería:</span>
                    <span className="font-semibold text-slate-900">🔋 {selectedVehicle.batteryLevel}%</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block text-[10px]">Última señal:</span>
                  <span className="text-slate-700 font-medium">
                    {formatSignalTime(selectedVehicle.position.recordedAt)}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {routeOverlay && (
        <svg
          aria-label="Trazado del recorrido"
          className="pointer-events-none absolute inset-0 z-10"
          viewBox={`0 0 ${routeOverlay.width} ${routeOverlay.height}`}
          preserveAspectRatio="none"
        >
          <polyline
            points={routeOverlay.path}
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
            opacity="0.9"
          />
          <polyline
            points={routeOverlay.path}
            fill="none"
            stroke="#0284c7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
            opacity="0.95"
          />
        </svg>
      )}

      <div
        aria-label="Leyenda del mapa"
        className="pointer-events-none absolute left-3 top-3 border border-slate-200/90 bg-white/95 px-2.5 py-1 rounded-md text-[11px] text-slate-700 shadow-xs backdrop-blur-xs"
      >
        <span className="font-semibold text-sky-700">⚕</span> destino ·{" "}
        <span className="font-semibold text-emerald-700">🚐</span> unidad activa ·{" "}
        <span className="font-semibold text-amber-700">🚐</span> sin señal reciente
      </div>
    </div>
  )
}
