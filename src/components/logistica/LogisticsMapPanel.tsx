"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { MapPinned, Truck, Clock, Radio, Activity, Zap, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLogisticsLiveSocket } from "@/hooks/useLogisticsLiveSocket"

import type { LogisticsGeo } from "@/lib/services/logistics-geography"

const LogisticsMapCanvas = dynamic(() => import("@/components/logistica/LogisticsMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-[52svh] min-h-80 animate-pulse border border-slate-200 rounded-xl bg-slate-100 sm:h-[440px]" />
  ),
})

type Marker = {
  surgery: { id: string; reference: string | null }
  institution: { id: string; name: string } | null
  geo: LogisticsGeo
}
type Vehicle = {
  id: string
  name: string
  routeAvailable?: boolean
  state: "fresh" | "stale" | "unknown"
  position: { latitude: number; longitude: number; recordedAt: string; speedKmh: number | null } | null
  ignition?: boolean | null
  batteryLevel?: number | null
}
type Route = {
  vehicle: { id: string; name: string }
  feed: "active" | "unconfigured" | "unavailable"
  points: Array<{ latitude: number; longitude: number; recordedAt: string; speedKmh: number | null }>
}

export function LogisticsMapPanel({
  markers = [],
  excluded = 0,
  vehicles = [],
  feed = "unconfigured",
  route,
  routeLoading = false,
  routeError = null,
  onShowRoute,
  onHideRoute,
  onOpen,
}: {
  markers?: Marker[]
  excluded?: number
  vehicles?: Vehicle[]
  feed?: "active" | "unconfigured" | "unavailable"
  route?: Route | null
  routeLoading?: boolean
  routeError?: string | null
  onShowRoute: (vehicleId: string, hours: number) => void
  onHideRoute: () => void
  onOpen: (surgeryId: string) => void
}) {
  const [vehicleId, setVehicleId] = useState("")
  const [hours, setHours] = useState("6")
  const [showEvents, setShowEvents] = useState(false)

  // Real-time WebSocket hook
  const liveSocket = useLogisticsLiveSocket()

  // Merge static snapshot with live WebSocket updates
  const liveVehicles = useMemo(() => {
    return vehicles.map((v) => {
      const livePos = liveSocket.positions[v.id]
      if (livePos) {
        return {
          ...v,
          state: "fresh" as const,
          position: {
            latitude: livePos.latitude,
            longitude: livePos.longitude,
            recordedAt: livePos.recordedAt,
            speedKmh: livePos.speedKmh,
          },
          ignition: livePos.ignition,
          batteryLevel: livePos.batteryLevel,
        }
      }
      return v
    })
  }, [vehicles, liveSocket.positions])

  const changeVehicle = (value: string) => {
    setVehicleId(value)
    onHideRoute()
  }

  const mappedVehicles = liveVehicles.filter((vehicle) => vehicle.routeAvailable !== false)
  const routeStatus =
    routeError ??
    (route?.feed === "unconfigured"
      ? "La conexión de flota todavía no está configurada."
      : route?.feed === "unavailable"
      ? "La señal de flota no está disponible ahora."
      : route
      ? route.points.length < 2
        ? "No hay puntos suficientes para trazar un recorrido."
        : `${route.points.length} puntos registrados en el recorrido.`
      : "Seleccioná una unidad para consultar su recorrido.")

  return (
    <section aria-label="Mapa de destinos logísticos" className="space-y-3">
      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <MapPinned className="size-4 text-sky-600" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Geolocalización & Telemetría en Vivo
              </h2>
              {liveSocket.isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  WebSocket en vivo
                </span>
              ) : liveSocket.status === "connecting" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Conectando…
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500">
              Transmisión continua de posiciones, velocidad y estado de ignición de la flota.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mappedVehicles.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs dark:bg-slate-800 dark:border-slate-700">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                <select
                  aria-label="Unidad para recorrido"
                  className="bg-transparent text-xs font-medium text-slate-800 outline-none dark:text-slate-200"
                  value={vehicleId}
                  onChange={(event) => changeVehicle(event.target.value)}
                >
                  <option value="">Seleccionar unidad</option>
                  {mappedVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs dark:bg-slate-800 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <select
                  aria-label="Horas de recorrido"
                  className="bg-transparent text-xs font-medium text-slate-800 outline-none dark:text-slate-200"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                >
                  {[1, 3, 6, 12, 24].map((value) => (
                    <option key={value} value={value}>
                      Últimas {value}h
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-semibold"
                disabled={!vehicleId || routeLoading}
                onClick={() => onShowRoute(vehicleId, Number(hours))}
              >
                {routeLoading ? "Cargando…" : "Ver recorrido"}
              </Button>

              {route && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={onHideRoute}
                >
                  Ocultar
                </Button>
              )}
            </>
          )}

          {liveSocket.events.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEvents(!showEvents)}
              className="h-8 px-2 gap-1 text-xs border-slate-200"
            >
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              <span>Eventos ({liveSocket.events.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Live Event Drawer / Ticker if toggled */}
      {showEvents && liveSocket.events.length > 0 && (
        <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Feed de Eventos en Tiempo Real
            </span>
            <button
              type="button"
              onClick={() => setShowEvents(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-2 grid gap-1.5 max-h-40 overflow-y-auto font-mono text-xs">
            {liveSocket.events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/80 border border-slate-700/50"
              >
                <span className="font-semibold text-slate-200">{evt.label}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(evt.eventTime).toLocaleTimeString("es-AR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Canvas with live telemetry */}
      <LogisticsMapCanvas
        markers={markers}
        excluded={excluded}
        vehicles={liveVehicles}
        feed={feed}
        route={route?.points ?? []}
        onOpen={onOpen}
      />
    </section>
  )
}
