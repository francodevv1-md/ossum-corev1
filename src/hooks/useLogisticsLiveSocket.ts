"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"

export type LiveVehiclePosition = {
  deviceId: string
  latitude: number
  longitude: number
  speedKmh: number
  course: number
  recordedAt: string
  ignition: boolean | null
  motion: boolean | null
  batteryLevel: number | null
}

export type LiveFleetEvent = {
  id: string
  type: string
  deviceId: string
  label: string
  eventTime: string
}

export type SocketStatus = "connecting" | "connected" | "disconnected" | "disabled" | "error"

const EVENT_LABELS: Record<string, string> = {
  deviceOnline: "🟢 Unidad en línea",
  deviceOffline: "⚪ Unidad desconectada",
  ignitionOn: "🔑 Motor encendido",
  ignitionOff: "🛑 Motor apagado",
  deviceMoving: "🚐 En movimiento",
  deviceStopped: "🅿️ Detenido",
  deviceOverspeed: "⚠️ Exceso de velocidad",
  geofenceEnter: "📍 Ingreso a geocerca",
  geofenceExit: "🚀 Salida de geocerca",
  alarm: "🚨 Alarma de telemetría",
}

export function useLogisticsLiveSocket() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [status, setStatus] = useState<SocketStatus>("connecting")
  const [positions, setPositions] = useState<Record<string, LiveVehiclePosition>>({})
  const [events, setEvents] = useState<LiveFleetEvent[]>([])
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activeRef = useRef(true)

  const pushEvent = useCallback((event: LiveFleetEvent) => {
    setEvents((prev) => [event, ...prev.slice(0, 19)]) // keep last 20 events
  }, [])

  useEffect(() => {
    activeRef.current = true

    if (!companyId) {
      setStatus("disabled")
      return
    }

    let isMounted = true

    async function initSocket() {
      try {
        const config = await apiFetch<{ enabled: boolean; socketUrl: string | null }>(
          `/api/companies/${encodeURIComponent(companyId!)}/logistics/live-config`
        )

        if (!isMounted || !config.enabled || !config.socketUrl) {
          setStatus("disabled")
          return
        }

        connect(config.socketUrl)
      } catch {
        if (isMounted) setStatus("disabled")
      }
    }

    function connect(url: string) {
      if (!activeRef.current) return

      try {
        setStatus("connecting")
        const ws = new WebSocket(url)
        socketRef.current = ws

        ws.onopen = () => {
          if (!activeRef.current) return
          setStatus("connected")
          setLastHeartbeat(new Date())
        }

        ws.onmessage = (event) => {
          if (!activeRef.current) return
          try {
            const data = JSON.parse(event.data)
            setLastHeartbeat(new Date())

            // Process Positions
            if (Array.isArray(data.positions) && data.positions.length > 0) {
              setPositions((prev) => {
                const next = { ...prev }
                for (const p of data.positions) {
                  if (p && typeof p.deviceId !== "undefined" && typeof p.latitude === "number" && typeof p.longitude === "number") {
                    const devId = String(p.deviceId)
                    const speedKnots = typeof p.speed === "number" ? p.speed : 0
                    const speedKmh = Math.round(speedKnots * 1.852)

                    next[devId] = {
                      deviceId: devId,
                      latitude: p.latitude,
                      longitude: p.longitude,
                      speedKmh,
                      course: typeof p.course === "number" ? p.course : 0,
                      recordedAt: p.fixTime || p.deviceTime || p.serverTime || new Date().toISOString(),
                      ignition: typeof p.attributes?.ignition === "boolean" ? p.attributes.ignition : null,
                      motion: typeof p.attributes?.motion === "boolean" ? p.attributes.motion : null,
                      batteryLevel: typeof p.attributes?.batteryLevel === "number" ? p.attributes.batteryLevel : null,
                    }
                  }
                }
                return next
              })
            }

            // Process Events
            if (Array.isArray(data.events) && data.events.length > 0) {
              for (const e of data.events) {
                if (e && e.type) {
                  pushEvent({
                    id: String(e.id || `${Date.now()}-${Math.random()}`),
                    type: String(e.type),
                    deviceId: String(e.deviceId || ""),
                    label: EVENT_LABELS[String(e.type)] || `Evento: ${e.type}`,
                    eventTime: e.eventTime || new Date().toISOString(),
                  })
                }
              }
            }
          } catch {
            // ignore non-JSON messages
          }
        }

        ws.onclose = () => {
          if (!activeRef.current) return
          setStatus("disconnected")
          // Reconnect in 5 seconds
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = setTimeout(() => {
            if (activeRef.current) connect(url)
          }, 5000)
        }

        ws.onerror = () => {
          if (!activeRef.current) return
          setStatus("error")
        }
      } catch {
        setStatus("error")
      }
    }

    void initSocket()

    return () => {
      isMounted = false
      activeRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [companyId, pushEvent])

  return {
    status,
    positions,
    events,
    lastHeartbeat,
    isConnected: status === "connected",
  }
}
