import { fireEvent, render, screen } from "@testing-library/react"
import type React from "react"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), create: vi.fn(), update: vi.fn(), role: "operator" }))
vi.mock("react-map-gl/maplibre", () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>, Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock("@/lib/api/contacts", () => ({ lookupContactAddressGeoref: mocks.lookup, createContactApi: mocks.create, updateContactApi: mocks.update }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-1", name: "Demo" }, currentAccess: { role: mocks.role } }) }))

import { InstitutionGeographySection } from "@/components/contactos/InstitutionGeographySection"
import { ContactoFormDialog } from "@/components/contactos/ContactoFormDialog"

const candidate = { georefId: "address-1", entityType: "ADDRESS" as const, displayName: "Av. Siempre Viva 742", city: "Rosario", provinceGeorefId: "82", provinceName: "Santa Fe", latitude: -32.95, longitude: -60.64, coordinateType: "ADDRESS" as const, crs: "EPSG:4326" as const, source: "Georef Argentina" as const, sourceVersion: "v2.0" as const, retrievedAt: "2026-09-10T00:00:00.000Z" }

describe("InstitutionGeographySection", () => {
  it("is mounted by the contact form only for instituciones", () => {
    const base = { id: "contact-1", codigoContacto: "C-0001", tipoPersona: "juridica" as const, nombre: "Hospital", estado: "activo" as const, roles: ["cliente" as const], createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z" }
    const { unmount } = render(<ContactoFormDialog open onOpenChange={vi.fn()} contacto={{ ...base, groups: ["medicos"] }} />)
    expect(screen.queryByRole("heading", { name: "Ubicación geográfica" })).not.toBeInTheDocument()
    unmount()
    render(<ContactoFormDialog open onOpenChange={vi.fn()} contacto={{ ...base, groups: ["instituciones"] }} />)
    expect(screen.getByRole("heading", { name: "Ubicación geográfica" })).toBeInTheDocument()
  })

  it("requires an explicit candidate selection and keeps the preview responsive", async () => {
    const onChange = vi.fn()
    mocks.lookup.mockResolvedValue({ candidates: [candidate] })
    render(<InstitutionGeographySection companyId="company-1" actorRole="operator" address={{ street: "Av. Siempre Viva 742", city: "Rosario", state: "Santa Fe" }} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Buscar ubicación" }))
    expect(await screen.findByText(candidate.displayName)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText(candidate.displayName))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ latitude: -32.95, validationStatus: "candidate" }))
    render(<InstitutionGeographySection companyId="company-1" actorRole="operator" address={{ street: "A", city: "", state: "" }} value={{ latitude: -32.95, longitude: -60.64, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina", validationStatus: "candidate" }} onChange={onChange} />)
    expect(screen.getByLabelText("Vista previa geográfica")).toBeInTheDocument()
    expect(screen.getByLabelText("Vista previa geográfica").querySelector('[class*="sm:h-56"]')).toBeInTheDocument()
  })

  it("preserves existing geo for ambiguous or empty lookups until a candidate or manual coordinates are explicitly entered", async () => {
    const onChange = vi.fn()
    mocks.lookup.mockResolvedValueOnce({ candidates: [candidate, { ...candidate, georefId: "address-2", displayName: "Av. Siempre Viva 740", latitude: -32.96 }] }).mockResolvedValueOnce({ candidates: [] })
    render(<InstitutionGeographySection companyId="company-1" actorRole="operator" address={{ street: "Av. Siempre Viva", city: "Rosario", state: "Santa Fe" }} value={{ latitude: -32.95, longitude: -60.64, coordinateType: "ADDRESS", crs: "EPSG:4326", source: "Georef Argentina", validationStatus: "candidate" }} onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "Buscar ubicación" }))
    expect(await screen.findByText("Av. Siempre Viva 740")).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Vista previa geográfica")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Buscar ubicación" }))
    expect(await screen.findByRole("status")).toHaveTextContent("No se encontraron ubicaciones utilizables")
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText("Latitud manual"), { target: { value: "-34.6" } })
    fireEvent.change(screen.getByLabelText("Longitud manual"), { target: { value: "-58.4" } })
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ coordinateType: "MANUAL", validationStatus: "candidate" }))
  })

  it("does not expose validation controls to operators and accepts valid manual coordinates", () => {
    const onChange = vi.fn()
    render(<InstitutionGeographySection companyId="company-1" actorRole="operator" address={{ street: "A", city: "", state: "" }} onChange={onChange} />)
    expect(screen.queryByLabelText("Estado de validación geográfica")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Latitud manual"), { target: { value: "-34.6" } })
    fireEvent.change(screen.getByLabelText("Longitud manual"), { target: { value: "-58.4" } })
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ coordinateType: "MANUAL", validationStatus: "candidate" }))
  })

  it("splits a pasted latitude/longitude pair into both manual fields", () => {
    const onChange = vi.fn()
    render(<InstitutionGeographySection companyId="company-1" actorRole="admin" address={{ street: "A", city: "", state: "" }} onChange={onChange} />)

    fireEvent.paste(screen.getByLabelText("Latitud manual"), { clipboardData: { getData: () => "-27.465365784750702, -58.83354324547284" } })

    expect(screen.getByLabelText("Latitud manual")).toHaveValue("-27.465365784750702")
    expect(screen.getByLabelText("Longitud manual")).toHaveValue("-58.83354324547284")
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: -27.465365784750702, longitude: -58.83354324547284, coordinateType: "MANUAL" }))
  })

  it("labels a persisted manually verified point as validated", () => {
    render(<InstitutionGeographySection companyId="company-1" actorRole="admin" address={{ street: "A", city: "", state: "" }} value={{ latitude: -34.6, longitude: -58.4, coordinateType: "MANUAL", crs: "EPSG:4326", source: "Manual", validationStatus: "manual_verified" }} onChange={vi.fn()} />)

    expect(screen.getByLabelText("Vista previa geográfica")).toHaveTextContent("Punto manual validado")
    expect(screen.getByLabelText("Vista previa geográfica")).not.toHaveTextContent("Punto manual pendiente de validación")
  })

  it("hydrates a persisted candidate and lets an admin validate it after reopening", async () => {
    mocks.role = "admin"
    const contacto = { id: "contact-1", codigoContacto: "C-0001", tipoPersona: "juridica" as const, nombre: "Hospital", estado: "activo" as const, roles: ["cliente" as const], groups: ["instituciones"], domicilio: "Av. Siempre Viva 742", mainAddressGeo: { latitude: -32.95, longitude: -60.64, coordinateType: "ADDRESS" as const, crs: "EPSG:4326" as const, source: "Georef Argentina" as const, validationStatus: "candidate" as const }, createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z" }
    mocks.update.mockResolvedValue({ id: "contact-1", code: "C-0001", isCompany: true, legalName: "Hospital", linkIsActive: true, groupSlugs: ["instituciones"], mainAddress: { ...contacto.mainAddressGeo }, createdAt: contacto.createdAt, updatedAt: contacto.updatedAt })

    render(<ContactoFormDialog open onOpenChange={vi.fn()} contacto={contacto} />)
    fireEvent.change(screen.getByLabelText("Estado de validación geográfica"), { target: { value: "verified" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledWith("company-1", "contact-1", expect.objectContaining({ mainAddress: expect.objectContaining({ geo: expect.objectContaining({ validationStatus: "verified", latitude: -32.95 }) }) })))
    mocks.role = "operator"
  })
})
