import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }))
vi.mock("@/lib/api/contacts", () => ({ lookupContactAddressGeoref: lookup }))
vi.mock("@/components/contactos/ContactAddressMapPreview", () => ({ ContactAddressMapPreview: () => null }))

import { InstitutionGeographySection } from "@/components/contactos/InstitutionGeographySection"

describe("InstitutionGeographySection", () => {
  it("aborts an in-flight lookup when its address changes", async () => {
    lookup.mockImplementation(() => new Promise(() => undefined))
    const onChange = vi.fn()
    const { rerender } = render(<InstitutionGeographySection companyId="company-1" address={{ street: "Av. Siempre Viva 1", city: "La Plata", state: "Buenos Aires" }} onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "Buscar ubicación" }))
    await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1))
    const signal = lookup.mock.calls[0][2] as AbortSignal

    rerender(<InstitutionGeographySection companyId="company-1" address={{ street: "Av. Siempre Viva 2", city: "La Plata", state: "Buenos Aires" }} onChange={onChange} />)

    expect(signal.aborted).toBe(true)
  })

  it("ignores a stale lookup response after the company changes", async () => {
    let resolveLookup!: (value: { candidates: Array<{ georefId: string; entityType: "ADDRESS"; provinceGeorefId: string | null; provinceName: string | null; latitude: number; longitude: number; coordinateType: "ADDRESS"; crs: "EPSG:4326"; source: "Georef Argentina"; sourceVersion: string | null; retrievedAt: string | null; displayName: string; city: string | null }> }) => void
    lookup.mockImplementation(() => new Promise((resolve) => { resolveLookup = resolve }))
    const onChange = vi.fn()
    const { rerender } = render(<InstitutionGeographySection companyId="company-1" address={{ street: "Av. Siempre Viva 1", city: "La Plata", state: "Buenos Aires" }} onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "Buscar ubicación" }))
    rerender(<InstitutionGeographySection companyId="company-2" address={{ street: "Av. Siempre Viva 1", city: "La Plata", state: "Buenos Aires" }} onChange={onChange} />)
    resolveLookup({ candidates: [{ georefId: "geo-1", entityType: "ADDRESS", provinceGeorefId: null, provinceName: null, latitude: -34.9, longitude: -57.9, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina", sourceVersion: null, retrievedAt: null, displayName: "Respuesta vieja", city: "La Plata" }] })

    await waitFor(() => expect(screen.queryByText("Respuesta vieja")).not.toBeInTheDocument())
  })

  it("only clears selected geography through the explicit action", () => {
    const onChange = vi.fn()
    render(<InstitutionGeographySection companyId="company-1" address={{ street: "Av. Siempre Viva 1", city: "La Plata", state: "Buenos Aires" }} value={{ latitude: -34.9, longitude: -57.9, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina", validationStatus: "verified" }} onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "Quitar ubicación" }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("clears stale geography while manual coordinates are incomplete", () => {
    const onChange = vi.fn()
    render(<InstitutionGeographySection companyId="company-1" address={{ street: "Av. Siempre Viva 1", city: "La Plata", state: "Buenos Aires" }} value={{ latitude: -34.9, longitude: -57.9, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina", validationStatus: "candidate" }} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText("Latitud manual"), { target: { value: "-34.8" } })

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("clears selected geography when the address changes", () => {
    const onChange = vi.fn()
    const value = { latitude: -34.9, longitude: -57.9, coordinateType: "ADDRESS" as const, crs: "EPSG:4326" as const, source: "Georef Argentina" as const, validationStatus: "candidate" as const }
    const { rerender } = render(<InstitutionGeographySection companyId="company-1" address={{ street: "Av. Siempre Viva 1", city: "La Plata", state: "Buenos Aires" }} value={value} onChange={onChange} />)

    rerender(<InstitutionGeographySection companyId="company-1" address={{ street: "Av. Siempre Viva 2", city: "La Plata", state: "Buenos Aires" }} value={value} onChange={onChange} />)

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
