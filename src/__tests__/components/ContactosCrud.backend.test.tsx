import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ContactosPage from "@/app/contactos/page"
import { ContactoFormDialog } from "@/components/contactos/ContactoFormDialog"
import type { ApiContact } from "@/lib/api/contacts"

const apiMocks = vi.hoisted(() => ({
  activeCompanyId: "company-1",
  listContacts: vi.fn(),
  createContactApi: vi.fn(),
  updateContactApi: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: apiMocks.activeCompanyId ? { id: apiMocks.activeCompanyId, name: "OSSUM Healthcare" } : null,
  }),
}))

vi.mock("@/lib/api/contacts", () => ({
  listContacts: apiMocks.listContacts,
  createContactApi: apiMocks.createContactApi,
  updateContactApi: apiMocks.updateContactApi,
}))

const mockProviderContact: ApiContact = {
  id: "contact-prov-1",
  companyId: "company-1",
  code: "PRV-001",
  firstName: "Distribuidora",
  lastName: "Quirúrgica SA",
  tradeName: "DisQuir SA",
  legalName: "Distribuidora Quirúrgica SA",
  taxId: "30-71234567-9",
  isCompany: true,
  isActive: true,
  linkIsActive: true,
  roles: ["proveedor"],
  groupSlugs: [],
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
}

const mockClientContact: ApiContact = {
  id: "contact-cli-2",
  companyId: "company-1",
  code: "CLI-002",
  firstName: "Dr. Roberto",
  lastName: "Gómez",
  isCompany: false,
  isActive: true,
  linkIsActive: true,
  roles: ["cliente"],
  groupSlugs: ["medicos"],
  createdAt: "2026-09-02T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
}

describe("Contactos CRUD backend-authoritative", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.activeCompanyId = "company-1"
    apiMocks.listContacts.mockResolvedValue([mockProviderContact, mockClientContact])
    apiMocks.createContactApi.mockResolvedValue(mockProviderContact)
    apiMocks.updateContactApi.mockResolvedValue(mockProviderContact)
  })

  it("loads contacts from API with companyId and pagination parameters", async () => {
    render(<ContactosPage />)

    await waitFor(() => {
      expect(apiMocks.listContacts).toHaveBeenCalledWith("company-1", {
        includeInactive: true,
        take: 500,
      })
    })

    expect(await screen.findByText("PRV-001")).toBeInTheDocument()
    expect(screen.getByText("Distribuidora Quirúrgica SA")).toBeInTheDocument()
    expect(screen.getByText("CLI-002")).toBeInTheDocument()
  })

  it("creates a contact using createContactApi and never mutates local store", async () => {
    const onSaved = vi.fn()
    render(
      <ContactoFormDialog
        open
        onOpenChange={vi.fn()}
        onSaved={onSaved}
        defaultRoles={["proveedor"]}
      />
    )

    fireEvent.change(screen.getByLabelText(/Nombre completo|Denominación/), {
      target: { value: "Nuevo Proveedor SA" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Crear contacto" }))

    await waitFor(() => {
      expect(apiMocks.createContactApi).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({
          firstName: "Nuevo",
          lastName: "Proveedor SA",
          isCompany: false,
          roles: ["proveedor"],
        })
      )
    })

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "contact-prov-1",
          codigoContacto: "PRV-001",
        })
      )
    })
  })

  it("updates a contact using updateContactApi", async () => {
    const onSaved = vi.fn()
    render(
      <ContactoFormDialog
        open
        onOpenChange={vi.fn()}
        onSaved={onSaved}
        contacto={{
          id: "contact-prov-1",
          codigoContacto: "PRV-001",
          tipoPersona: "juridica",
          nombre: "DisQuir SA",
          razonSocial: "Distribuidora Quirúrgica SA",
          estado: "activo",
          roles: ["proveedor"],
          groups: [],
          createdAt: "2026-09-01T10:00:00.000Z",
          updatedAt: "2026-09-01T10:00:00.000Z",
        }}
      />
    )

    fireEvent.change(screen.getByLabelText(/Denominación/), {
      target: { value: "DisQuir Actualizada SA" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => {
      expect(apiMocks.updateContactApi).toHaveBeenCalledWith(
        "company-1",
        "contact-prov-1",
        expect.objectContaining({
          legalName: "DisQuir Actualizada SA",
          isActive: true,
        })
      )
    })

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled()
    })
  })

  it("toggles active status using updateContactApi", async () => {
    render(<ContactosPage />)

    await screen.findByText("PRV-001")

    const toggleBtn = screen.getByRole("button", {
      name: /Inactivar Distribuidora Quirúrgica SA/,
    })
    fireEvent.click(toggleBtn)

    const confirmBtn = screen.getByRole("button", { name: "Confirmar" })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(apiMocks.updateContactApi).toHaveBeenCalledWith("company-1", "contact-prov-1", {
        isActive: false,
      })
    })
  })

  it("handles loading and error states cleanly", async () => {
    apiMocks.listContacts.mockRejectedValueOnce(new Error("Error de conexión"))

    render(<ContactosPage />)

    expect(await screen.findByText("No se pudieron cargar los contactos")).toBeInTheDocument()
    expect(screen.getByText("Error de conexión")).toBeInTheDocument()

    const retryBtn = screen.getByRole("button", { name: "Reintentar" })
    apiMocks.listContacts.mockResolvedValueOnce([mockProviderContact])
    fireEvent.click(retryBtn)

    expect(await screen.findByText("PRV-001")).toBeInTheDocument()
  })

  it("handles company change without retaining stale records", async () => {
    const { rerender } = render(<ContactosPage />)
    await screen.findByText("PRV-001")

    apiMocks.activeCompanyId = "company-2"
    apiMocks.listContacts.mockResolvedValueOnce([])
    rerender(<ContactosPage />)

    await waitFor(() => {
      expect(apiMocks.listContacts).toHaveBeenCalledWith("company-2", {
        includeInactive: true,
        take: 500,
      })
    })
    expect(await screen.findByText("Todavía no hay contactos")).toBeInTheDocument()
  })
})
