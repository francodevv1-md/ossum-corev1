import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ContactosPage from "@/app/contactos/page"
import { ContactLookupField } from "@/components/contactos/ContactLookupField"
import { ContactSearchModal } from "@/components/contactos/ContactSearchModal"
import { ContactoFormDialog } from "@/components/contactos/ContactoFormDialog"
import { CONTEXT_MEDICO } from "@/lib/contacts.constants"
import type { Contacto } from "@/types"

const mocks = vi.hoisted(() => ({
  activeCompanyId: "company-1",
  listContacts: vi.fn(),
  createContactApi: vi.fn(),
  updateContactApi: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: mocks.activeCompanyId, name: "Demo" } }) }))
vi.mock("@/lib/api/contacts", () => mocks)

const apiContact = {
  id: "backend-contact-7",
  code: "C-0042",
  firstName: "Ana",
  lastName: "Pérez",
  isCompany: false,
  linkIsActive: true,
  roles: ["cliente"],
  groupSlugs: ["medicos"],
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
}

describe("Contacts backend-authority UI", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.activeCompanyId = "company-1"
    mocks.listContacts.mockResolvedValue([apiContact])
    mocks.createContactApi.mockResolvedValue(apiContact)
    mocks.updateContactApi.mockResolvedValue(apiContact)
  })

  it("loads the master page with inactive contacts included and the API cap", async () => {
    render(<ContactosPage />)
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith("company-1", { includeInactive: true, take: 500 }))
    expect(await screen.findByText("C-0042")).toBeInTheDocument()
  })

  it("closes contact dialogs when the active company changes", async () => {
    const { rerender } = render(<ContactosPage />)
    await screen.findByText("C-0042")
    fireEvent.click(screen.getByRole("button", { name: "Nuevo contacto" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    mocks.activeCompanyId = "company-2"
    rerender(<ContactosPage />)

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("returns the canonical backend record after create without a local fallback", async () => {
    const onSaved = vi.fn()
    render(<ContactoFormDialog open onOpenChange={vi.fn()} onSaved={onSaved} defaultRoles={["cliente"]} />)
    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: "Nombre temporal" } })
    fireEvent.click(screen.getByRole("button", { name: "Crear contacto" }))

    await waitFor(() => expect(mocks.createContactApi).toHaveBeenCalledWith("company-1", expect.not.objectContaining({ codigo: expect.anything() })))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "backend-contact-7", codigoContacto: "C-0042", nombre: "Ana Pérez" })))
  })

  it("keeps a failed create unsaved instead of falling back to local state", async () => {
    mocks.createContactApi.mockRejectedValueOnce(new Error("Servidor no disponible"))
    const onSaved = vi.fn()
    render(<ContactoFormDialog open onOpenChange={vi.fn()} onSaved={onSaved} />)
    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: "Ana" } })
    fireEvent.click(screen.getByRole("button", { name: "Crear contacto" }))

    expect(await screen.findByText("Servidor no disponible")).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it("clears stale juridical identity fields when editing as a physical person", async () => {
    render(<ContactoFormDialog
      open
      onOpenChange={vi.fn()}
      contacto={{
        id: "contact-legal",
        codigoContacto: "C-0041",
        tipoPersona: "juridica",
        nombre: "Empresa SA",
        razonSocial: "Empresa SA",
        estado: "activo",
        roles: ["cliente"],
        groups: [],
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      }}
    />)
    fireEvent.change(screen.getByLabelText("Tipo de persona"), { target: { value: "fisica" } })
    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: "Ana" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(mocks.updateContactApi).toHaveBeenCalledWith("company-1", "contact-legal", expect.objectContaining({
      isCompany: false,
      firstName: "Ana",
      lastName: null,
      legalName: null,
    })))
  })

  it("preserves custom groups when roles change", async () => {
    render(<ContactoFormDialog open onOpenChange={vi.fn()} contacto={{ ...mapContact(), groups: ["legacy-custom"] }} />)
    fireEvent.click(screen.getByText("Proveedor"))
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(mocks.updateContactApi).toHaveBeenCalledWith("company-1", "backend-contact-7", expect.objectContaining({
      groupSlugs: ["legacy-custom"],
    })))
  })

  it("searches the backend while the selector is open", async () => {
    render(<ContactSearchModal open onOpenChange={vi.fn()} context={CONTEXT_MEDICO} onSelect={vi.fn()} />)
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith("company-1", expect.objectContaining({ role: "cliente", take: 100 })))
    fireEvent.change(screen.getByLabelText("Buscar contactos"), { target: { value: "Ana" } })
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith("company-1", expect.objectContaining({ search: "Ana", role: "cliente" })), { timeout: 1000 })
  })

  it("closes a nested contact draft when the active company changes", async () => {
    const { rerender } = render(<ContactSearchModal open onOpenChange={vi.fn()} context={CONTEXT_MEDICO} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Nuevo contacto" }))
    expect(screen.getAllByRole("dialog")).toHaveLength(2)

    mocks.activeCompanyId = "company-2"
    rerender(<ContactSearchModal open onOpenChange={vi.fn()} context={CONTEXT_MEDICO} onSelect={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1))
  })

  it("looks up an entered code through the backend and returns its canonical contact", async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = React.useState<Contacto | null>(null)
      return <ContactLookupField label="Médico" context={CONTEXT_MEDICO} value={value} onChange={(next) => { onChange(next); setValue(next) }} />
    }
    render(<Harness />)
    const input = screen.getByLabelText("Médico")
    fireEvent.change(input, { target: { value: "c-0042" } })
    fireEvent.keyDown(input, { key: "Enter" })

    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith("company-1", { search: "C-0042", take: 20 }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "backend-contact-7", codigoContacto: "C-0042" })))
    expect(screen.getByDisplayValue("C-0042")).toBeInTheDocument()
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument()
  })

  it("does not retain an internal selection after the parent resets its value", () => {
    function Harness() {
      const [value, setValue] = React.useState<Contacto | null>(mapContact())
      return <><ContactLookupField label="Médico" context={CONTEXT_MEDICO} value={value} onChange={setValue} /><button onClick={() => setValue(null)}>Reset</button></>
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByText("Sin contacto seleccionado")).toBeInTheDocument()
  })

  it("clears a selected contact when the active company changes", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ContactLookupField label="Médico" context={CONTEXT_MEDICO} value={mapContact()} onChange={onChange} />)

    mocks.activeCompanyId = "company-2"
    rerender(<ContactLookupField label="Médico" context={CONTEXT_MEDICO} value={mapContact()} onChange={onChange} />)

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null))
  })
})

function mapContact() {
  return {
    id: "backend-contact-7",
    codigoContacto: "C-0042",
    tipoPersona: "fisica" as const,
    nombre: "Ana Pérez",
    estado: "activo" as const,
    roles: ["cliente" as const],
    groups: ["medicos"],
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
  }
}
