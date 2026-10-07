import React from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ContactLookupField } from "@/components/contactos/ContactLookupField"
import { CONTEXT_MEDICO } from "@/lib/contacts.constants"
import type { Contacto } from "@/types"

const mocks = vi.hoisted(() => ({
  activeCompanyId: "company-1" as string | undefined,
  listContacts: vi.fn(),
  updateContactApi: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({
  activeCompany: mocks.activeCompanyId ? { id: mocks.activeCompanyId, name: "Demo" } : null,
  currentUserLoading: false,
}) }))
vi.mock("@/lib/api/contacts", () => mocks)

// API-shape contact (as returned by listContacts / mapApiContactListToContactos)
const makeApiContact = (code: string, id: string) => ({
  id,
  code,
  firstName: "Ana",
  lastName: "Pérez",
  isCompany: false,
  linkIsActive: true,
  roles: ["cliente"],
  groupSlugs: ["medicos"],
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activeCompanyId = "company-1"
  mocks.listContacts.mockReset()
  mocks.updateContactApi.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("ContactLookupField — stale manual search invalidation", () => {
  it("type A then B before A resolves: B wins, A's response is discarded", async () => {
    let resolveA!: (value: ReturnType<typeof makeApiContact>[]) => void
    let resolveB!: (value: ReturnType<typeof makeApiContact>[]) => void
    const aApi = makeApiContact("C-0001", "backend-a")
    const bApi = makeApiContact("C-0002", "backend-b")
    mocks.listContacts
      .mockImplementationOnce(() => new Promise<ReturnType<typeof makeApiContact>[]>((resolve) => { resolveA = resolve }))
      .mockImplementationOnce(() => new Promise<ReturnType<typeof makeApiContact>[]>((resolve) => { resolveB = resolve }))
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = React.useState<Contacto | null>(null)
      return <ContactLookupField label="Médico" context={CONTEXT_MEDICO} value={value} onChange={(next) => { onChange(next); setValue(next) }} />
    }
    render(<Harness />)
    const input = screen.getByLabelText("Médico") as HTMLInputElement

    // Type A
    await act(async () => {
      fireEvent.change(input, { target: { value: "c-0001" } })
    })
    await waitFor(() => expect(input.value).toBe("c-0001"))
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" })
    })
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith("company-1", { search: "C-0001", take: 20 }))

    // Type B before A resolves.
    await act(async () => {
      fireEvent.change(input, { target: { value: "c-0002" } })
    })
    await waitFor(() => expect(input.value).toBe("c-0002"))
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" })
    })
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith("company-1", { search: "C-0002", take: 20 }))

    await act(async () => { resolveA([aApi]); await Promise.resolve() })
    await act(async () => { resolveB([bApi]); await Promise.resolve() })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "backend-b", codigoContacto: "C-0002" })))
    const calls = onChange.mock.calls.map(call => (call[0] as { id?: string } | null)?.id)
    expect(calls).not.toContain("backend-a")
  })

  it("keystroke before Enter bumps requestRef: no request fires from typing alone, only on Enter/blur", async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = React.useState<Contacto | null>(null)
      return <ContactLookupField label="Médico" context={CONTEXT_MEDICO} value={value} onChange={(next) => { onChange(next); setValue(next) }} />
    }
    render(<Harness />)
    const input = screen.getByLabelText("Médico") as HTMLInputElement
    fireEvent.change(input, { target: { value: "a" } })
    fireEvent.change(input, { target: { value: "ab" } })
    fireEvent.change(input, { target: { value: "abc" } })
    expect(mocks.listContacts).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: "Enter" })
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledWith("company-1", { search: "ABC", take: 20 }))
  })

  it("typing a new character clears any pending feedback so it does not linger", async () => {
    // First lookup is a not-found that resolves, so feedback says
    // "Contacto no encontrado." The next keystroke must clear that
    // feedback and not overwrite it with stale data.
    mocks.listContacts
      .mockImplementationOnce(async () => [])
      .mockImplementationOnce(async () => [makeApiContact("C-0001", "backend-a")])
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = React.useState<Contacto | null>(null)
      return <ContactLookupField label="Médico" context={CONTEXT_MEDICO} value={value} onChange={(next) => { onChange(next); setValue(next) }} />
    }
    render(<Harness />)
    const input = screen.getByLabelText("Médico") as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { value: "c-9999" } })
      fireEvent.keyDown(input, { key: "Enter" })
    })
    await waitFor(() => expect(screen.queryByText("Contacto no encontrado.")).toBeTruthy())
    // New keystroke must clear the feedback immediately.
    await act(async () => {
      fireEvent.change(input, { target: { value: "c-0001" } })
    })
    expect(screen.queryByText("Contacto no encontrado.")).toBeNull()
  })
})

