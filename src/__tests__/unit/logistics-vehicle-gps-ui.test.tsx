import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const { apiFetch, auth, map, resizeObservers } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  auth: { activeCompany: { id: "company-1" }, currentUserLoading: false, isLoading: false },
  map: { getCanvas: () => ({ clientHeight: 100, clientWidth: 100 }), getContainer: () => document.createElement("div"), project: () => ({ x: 10, y: 20 }), on: vi.fn(), off: vi.fn(), resize: vi.fn(), fitBounds: vi.fn() },
  resizeObservers: [] as Array<() => void>,
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth }))
vi.mock("@/lib/api/client", () => ({ apiFetch }))

vi.mock("react-map-gl/maplibre", async () => {
  const React = await import("react")
  return {
    default: React.forwardRef(({ children, onLoad }: { children: React.ReactNode; onLoad: () => void }, ref) => {
      React.useImperativeHandle(ref, () => ({ getMap: () => map, fitBounds: map.fitBounds }))
      React.useEffect(onLoad, [onLoad])
      return <div>{children}</div>
    }),
    Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    NavigationControl: () => null,
    Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }
})
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}))

import LogisticsMapCanvas from "@/components/logistica/LogisticsMapCanvas"
import { LogisticsMapPanel } from "@/components/logistica/LogisticsMapPanel"
import { useLogisticsMap } from "@/hooks/useLogisticsMap"

const route = [{ latitude: -34.6, longitude: -58.4, recordedAt: "2026-09-14T10:00:00Z", speedKmh: null }, { latitude: -34.61, longitude: -58.41, recordedAt: "2026-09-14T10:01:00Z", speedKmh: null }]

describe("logistics vehicle map", () => {
  it("renders surgery/fleet markers and SVG route endpoints", () => {
    render(<LogisticsMapCanvas markers={[{ surgery: { id: "s-1", reference: "CX-1" }, institution: { id: "i-1", name: "Hospital" }, geo: { coordinate: { latitude: -34.6, longitude: -58.4, type: "gps", crs: "EPSG:4326" }, georefId: null, entityType: null, locality: { name: null }, province: { georefId: null, name: null }, source: { name: null, version: null, retrievedAt: null }, validation: { status: "verified", notes: null }, geometry: { available: false, source: null } } }]} excluded={0} vehicles={[{ id: "v-1", name: "Unidad 1", state: "fresh", position: { latitude: -34.61, longitude: -58.41, recordedAt: "2026-09-14T10:00:00.000Z", speedKmh: 20 } }]} feed="active" route={route} onOpen={() => undefined} />)
    expect(screen.getByLabelText("Ver cirugía CX-1")).toBeInTheDocument()
    expect(screen.getByLabelText("Vehículo Unidad 1: Señal actualizada")).toBeInTheDocument()
    expect(screen.getByLabelText("Inicio del recorrido")).toBeInTheDocument()
    expect(screen.getByLabelText("Fin del recorrido")).toBeInTheDocument()
  })

  it("redraws the route when its map container resizes", async () => {
    vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resizeObservers.push(callback) } observe() {} disconnect() {} })
    render(<LogisticsMapCanvas markers={[]} excluded={0} vehicles={[]} feed="active" route={route} onOpen={() => undefined} />)
    await waitFor(() => expect(resizeObservers).toHaveLength(1))
    resizeObservers[0]()
    expect(map.resize).toHaveBeenCalled()
  })

  it("uses the selected unit and allowed hour selector", () => {
    const show = vi.fn(), hide = vi.fn()
    render(<LogisticsMapPanel vehicles={[{ id: "v-1", name: "Unidad 1", state: "fresh", position: null }]} onShowRoute={show} onHideRoute={hide} onOpen={() => undefined} />)
    fireEvent.change(screen.getByLabelText("Unidad para recorrido"), { target: { value: "v-1" } })
    fireEvent.change(screen.getByLabelText("Horas de recorrido"), { target: { value: "24" } })
    fireEvent.click(screen.getByText("Mostrar recorrido"))
    expect(show).toHaveBeenCalledWith("v-1", 24)
    expect(hide).toHaveBeenCalled()
  })

  it("ignores an older map failure after a newer company request succeeds", async () => {
    let rejectFirst!: (error: Error) => void
    apiFetch.mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject })).mockResolvedValueOnce({ generatedAt: "2026-09-14T10:00:00Z", source: "persisted_contact_address", excluded: 0, audit: {}, markers: [], feed: "active", vehicles: [] })
    const { result, rerender } = renderHook(() => useLogisticsMap())

    auth.activeCompany = { id: "company-2" }
    rerender()
    await waitFor(() => expect(result.current.data?.generatedAt).toBe("2026-09-14T10:00:00Z"))
    rejectFirst(new Error("stale failure"))
    await Promise.resolve()

    expect(result.current.error).toBeNull()
  })
})
