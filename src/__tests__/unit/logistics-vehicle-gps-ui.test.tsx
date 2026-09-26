import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  NavigationControl: () => null,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Source: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Layer: () => null,
}))
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}))

import LogisticsMapCanvas from "@/components/logistica/LogisticsMapCanvas"
import { LogisticsMapPanel } from "@/components/logistica/LogisticsMapPanel"

describe("logistics vehicle map", () => {
  it("keeps destination and vehicle markers visually and textually separate", () => {
    render(<LogisticsMapCanvas markers={[{ surgery: { id: "s-1", reference: "CX-1" }, institution: { id: "i-1", name: "Hospital" }, geo: { coordinate: { latitude: -34.6, longitude: -58.4, type: "gps", crs: "EPSG:4326" }, georefId: null, entityType: null, locality: { name: null }, province: { georefId: null, name: null }, source: { name: null, version: null, retrievedAt: null }, validation: { status: "verified", notes: null }, geometry: { available: false, source: null } } }]} excluded={0} vehicles={[{ id: "v-1", name: "Unidad 1", state: "fresh", position: { latitude: -34.61, longitude: -58.41, recordedAt: "2026-09-14T10:00:00.000Z", speedKmh: 20 } }, { id: "v-2", name: "Unidad 2", state: "unknown", position: null }]} feed="active" onOpen={() => undefined} />)
    expect(screen.getByLabelText("Ver cirugía CX-1")).toHaveTextContent("⚕")
    expect(screen.getAllByText("CX-1").length).toBeGreaterThan(0)
    expect(screen.getByLabelText("Vehículo Unidad 1: Señal actualizada")).toHaveTextContent("🚐")
    expect(screen.getByText("Última señal:", { exact: false })).toBeInTheDocument()
    expect(screen.getByLabelText("Leyenda del mapa")).toHaveTextContent("unidad actualizada")
    expect(screen.getByText("1 vehículo sin ubicación disponible")).toBeInTheDocument()
  })

  it("renders a route line with start and end dots only with two points", () => {
    render(<LogisticsMapCanvas markers={[]} excluded={0} vehicles={[]} feed="active" route={[{ latitude: -34.6, longitude: -58.4, recordedAt: "2026-09-14T10:00:00Z", speedKmh: null }, { latitude: -34.61, longitude: -58.41, recordedAt: "2026-09-14T10:01:00Z", speedKmh: null }]} onOpen={() => undefined} />)
    expect(screen.getByLabelText("Inicio del recorrido")).toBeInTheDocument()
    expect(screen.getByLabelText("Fin del recorrido")).toBeInTheDocument()
  })

  it("clears the route when the selected vehicle changes and hides it on request", () => {
    const hide = vi.fn()
    const show = vi.fn()
    render(<LogisticsMapPanel vehicles={[{ id: "v-1", name: "Unidad 1", state: "fresh", position: null }]} route={{ vehicle: { id: "v-1", name: "Unidad 1" }, feed: "active", points: [] }} onHideRoute={hide} onShowRoute={show} onOpen={() => undefined} />)
    fireEvent.change(screen.getByLabelText("Unidad para recorrido"), { target: { value: "v-1" } })
    expect(hide).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText("Mostrar recorrido"))
    expect(show).toHaveBeenCalledWith("v-1", 6)
    fireEvent.click(screen.getByText("Ocultar recorrido"))
    expect(hide).toHaveBeenCalledTimes(2)
  })

  it("shows a non-secret unavailable route state", () => {
    render(<LogisticsMapPanel route={{ vehicle: { id: "v-1", name: "Unidad 1" }, feed: "unavailable", points: [] }} onHideRoute={() => undefined} onShowRoute={() => undefined} onOpen={() => undefined} />)
    expect(screen.getByRole("status")).toHaveTextContent("La señal de flota no está disponible ahora.")
  })
})
