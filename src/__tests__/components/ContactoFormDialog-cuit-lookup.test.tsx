import React from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import "@testing-library/jest-dom/vitest"

import { ContactoFormDialog } from "@/components/contactos/ContactoFormDialog"

const mocks = vi.hoisted(() => ({
  activeCompanyId: "company-1" as string | undefined,
  currentUserLoading: false,
  cuitLookupApi: vi.fn(),
  createContactApi: vi.fn(),
  getContactCodePreviewApi: vi.fn(),
  updateContactApi: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({
  activeCompany: mocks.activeCompanyId ? { id: mocks.activeCompanyId, name: "Demo" } : null,
  currentUserLoading: mocks.currentUserLoading,
}) }))
vi.mock("@/lib/api/contacts", () => ({
  cuitLookupApi: mocks.cuitLookupApi,
  createContactApi: mocks.createContactApi,
  getContactCodePreviewApi: mocks.getContactCodePreviewApi,
  updateContactApi: mocks.updateContactApi,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activeCompanyId = "company-1"
  mocks.currentUserLoading = false
  mocks.createContactApi.mockResolvedValue({ id: "x", code: "C-0001" })
  mocks.getContactCodePreviewApi.mockResolvedValue({ lastCode: null, nextCode: "C-0001" })
  mocks.updateContactApi.mockResolvedValue({ id: "x", code: "C-0001" })
})

afterEach(() => {
  cleanup()
})

describe("ContactoFormDialog — CUIT lookup MVP", () => {
  function getCuitInput() {
    // The CUIT input is identified by its placeholder text.
    return document.querySelector('input[placeholder="00-00000000-0"]') as HTMLInputElement
  }

  it("button is disabled when CUIT is empty", async () => {
    render(<ContactoFormDialog open onOpenChange={vi.fn()} />)
    const button = screen.getByTestId("contact-cuit-lookup-btn") as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it("button is enabled only when CUIT is module-11 valid", async () => {
    render(<ContactoFormDialog open onOpenChange={vi.fn()} />)
    const button = screen.getByTestId("contact-cuit-lookup-btn") as HTMLButtonElement
    const cuitInput = getCuitInput()
    // malformed: too short
    await act(async () => { fireEvent.change(cuitInput, { target: { value: "123" } }) })
    expect(button.disabled).toBe(true)
    // invalid check digit
    await act(async () => { fireEvent.change(cuitInput, { target: { value: "30712293849" } }) })
    expect(button.disabled).toBe(true)
    // valid module-11 fixture
    await act(async () => { fireEvent.change(cuitInput, { target: { value: "30712293840" } }) })
    expect(button.disabled).toBe(false)
  })

  it("click triggers exactly one client call (mocked)", async () => {
    mocks.cuitLookupApi.mockResolvedValue({
      source: "stub",
      found: true,
      legalName: "DISTRIBUIDORA ANTIGRAVITY SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: { street: "Av 1234", city: "CABA", state: "Buenos Aires", zipCode: "1059", country: "AR" },
      estado: "ACTIVO",
      extra: { apocExiste: false },
    })
    render(<ContactoFormDialog open onOpenChange={vi.fn()} />)
    const button = screen.getByTestId("contact-cuit-lookup-btn") as HTMLButtonElement
    const cuitInput = getCuitInput()
    fireEvent.change(cuitInput, { target: { value: "30712293840" } })
    await act(async () => { fireEvent.click(button) })
    await waitFor(() => expect(mocks.cuitLookupApi).toHaveBeenCalledTimes(1))
    expect(mocks.cuitLookupApi).toHaveBeenCalledWith("company-1", "30712293840")
  })

  it("double click is collapsed: in-flight UI ref keeps one client call", async () => {
    let resolve!: (value: unknown) => void
    mocks.cuitLookupApi.mockReturnValueOnce(new Promise((res) => { resolve = res }))
    render(<ContactoFormDialog open onOpenChange={vi.fn()} />)
    const button = screen.getByTestId("contact-cuit-lookup-btn") as HTMLButtonElement
    const cuitInput = getCuitInput()
    fireEvent.change(cuitInput, { target: { value: "30712293840" } })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(mocks.cuitLookupApi).toHaveBeenCalledTimes(1)
    await act(async () => { resolve({
      source: "stub",
      found: true,
      legalName: "DISTRIBUIDORA ANTIGRAVITY SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: { street: "Av 1234", city: "CABA", state: "Buenos Aires", zipCode: "1059", country: "AR" },
      estado: "ACTIVO",
      extra: { apocExiste: false },
    }) })
    await waitFor(() => expect(screen.queryByTestId("contact-cuit-lookup-diff")).toBeTruthy())
  })

  it("diff panel renders current vs proposed and ticking a row keeps the apply button enabled", async () => {
    mocks.cuitLookupApi.mockResolvedValueOnce({
      source: "stub",
      found: true,
      legalName: "DISTRIBUIDORA ANTIGRAVITY SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: { street: "Av 1234", city: "CABA", state: "Buenos Aires", zipCode: "1059", country: "AR" },
      estado: "ACTIVO",
      extra: { apocExiste: false },
    })
    render(<ContactoFormDialog open onOpenChange={vi.fn()} />)
    const button = screen.getByTestId("contact-cuit-lookup-btn") as HTMLButtonElement
    const cuitInput = getCuitInput()
    fireEvent.change(cuitInput, { target: { value: "30712293840" } })
    await act(async () => { fireEvent.click(button) })
    await waitFor(() => expect(screen.queryByTestId("contact-cuit-lookup-diff")).toBeTruthy())
    const legalNameRow = screen.getByTestId("contact-cuit-lookup-row-legalName")
    expect(legalNameRow).toBeInTheDocument()
    const applyBtn = screen.getByTestId("contact-cuit-lookup-apply") as HTMLButtonElement
    expect(applyBtn.disabled).toBe(false)
  })

  it("ticking and apply calls setNombre and setCondicionIva via existing setters", async () => {
    mocks.cuitLookupApi.mockResolvedValueOnce({
      source: "stub",
      found: true,
      legalName: "ACME SA",
      vatCondition: "Monotributo",
      mainAddress: { street: "Av Corrientes 100", city: "CABA", state: "Buenos Aires", zipCode: "1000", country: "AR" },
      estado: "ACTIVO",
      extra: { apocExiste: false },
    })
    render(<ContactoFormDialog open onOpenChange={vi.fn()} defaultRoles={["cliente"]} />)
    const button = screen.getByTestId("contact-cuit-lookup-btn") as HTMLButtonElement
    const cuitInput = getCuitInput()
    fireEvent.change(cuitInput, { target: { value: "30712293840" } })
    await act(async () => { fireEvent.click(button) })
    await waitFor(() => screen.getByTestId("contact-cuit-lookup-diff"))
    fireEvent.click(screen.getByTestId("contact-cuit-lookup-apply"))
    await waitFor(() => {
      // Default placeholder for persona física is "Nombre y apellido...".
      const nombreField = document.querySelector('input[placeholder="Nombre y apellido..."]') as HTMLInputElement | null
      expect(nombreField?.value).toBe("ACME SA")
    })
    const selects = Array.from(document.querySelectorAll('select'))
    const ivaSelectElement = selects.find((select) => Array.from(select.options).some((opt) => opt.text === "Responsable Monotributo")) as HTMLSelectElement | undefined
    expect(ivaSelectElement?.value).toBe("Responsable Monotributo")
  })

  it("closing (Cerrar) discards suggestion", async () => {
    mocks.cuitLookupApi.mockResolvedValueOnce({
      source: "stub",
      found: true,
      legalName: "DISTRIBUIDORA ANTIGRAVITY SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: { street: "Av 1234", city: "CABA", state: "Buenos Aires", zipCode: "1059", country: "AR" },
      estado: "ACTIVO",
      extra: { apocExiste: false },
    })
    render(<ContactoFormDialog open onOpenChange={vi.fn()} />)
    const button = screen.getByTestId("contact-cuit-lookup-btn") as HTMLButtonElement
    const cuitInput = getCuitInput()
    fireEvent.change(cuitInput, { target: { value: "30712293840" } })
    await act(async () => { fireEvent.click(button) })
    await waitFor(() => screen.getByTestId("contact-cuit-lookup-diff"))
    fireEvent.click(screen.getByTestId("contact-cuit-lookup-discard"))
    expect(screen.queryByTestId("contact-cuit-lookup-diff")).toBeNull()
  })

  it("error surface: error:'S' shows error path and never auto-applies", async () => {
    mocks.cuitLookupApi.mockRejectedValueOnce(Object.assign(new Error("ARCA bloquea la constancia"), { code: "cuit_provider_conflict" }))
    render(<ContactoFormDialog open onOpenChange={vi.fn()} />)
    const button = screen.getByTestId("contact-cuit-lookup-btn") as HTMLButtonElement
    const cuitInput = getCuitInput()
    fireEvent.change(cuitInput, { target: { value: "30712293840" } })
    await act(async () => { fireEvent.click(button) })
    await waitFor(() => expect(screen.queryByTestId("contact-cuit-lookup-error")).toBeTruthy())
    expect(screen.queryByTestId("contact-cuit-lookup-diff")).toBeNull()
  })
})