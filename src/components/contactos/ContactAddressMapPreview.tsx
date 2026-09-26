"use client"

import Map, { Marker } from "react-map-gl/maplibre"

export type ContactAddressMapPreviewProps = {
  latitude: number
  longitude: number
  coordinateType: "ADDRESS" | "CENTROID" | "MANUAL"
  validationStatus?: string | null
}

const coordinateTypeLabel = {
  ADDRESS: "Dirección geocodificada",
  CENTROID: "Centroide de localidad",
  MANUAL: "Punto manual pendiente de validación",
} as const

export function ContactAddressMapPreview({ latitude, longitude, coordinateType, validationStatus }: ContactAddressMapPreviewProps) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  return <section aria-label="Vista previa geográfica" className="overflow-hidden border border-[var(--ossum-line)] bg-slate-50">
    <div className="h-48 w-full sm:h-56"><Map
      initialViewState={{ latitude, longitude, zoom: 15 }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      interactive={false}
      attributionControl={false}
    >
      <Marker latitude={latitude} longitude={longitude} anchor="bottom" draggable={false}>
        <span aria-label="Ubicación seleccionada" className="grid size-8 place-items-center rounded-full border-2 border-white bg-[var(--ossum-action)] text-xs font-bold text-white shadow">●</span>
      </Marker>
    </Map></div>
    <p className="border-t border-[var(--ossum-line)] px-3 py-2 text-xs text-slate-700">{coordinateType === "MANUAL" && validationStatus === "manual_verified" ? "Punto manual validado" : coordinateTypeLabel[coordinateType]} · {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
  </section>
}
