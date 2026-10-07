import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ContactosPage from "@/app/contactos/page"

const mocks = vi.hoisted(() => ({
  activeCompanyId: "company-1" as string | undefined,
  currentUserLoading: false,
  listContacts: vi.fn(),
  createContactApi: vi.fn(),
  getContactCodePreviewApi: vi.fn(),
  updateContactApi: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({
  activeCompany: mocks.activeCompanyId ? { id: mocks.activeCompanyId, name: "Demo" } : null,
  currentUserLoading: mocks.currentUserLoading,
}) }))
vi.mock("@/lib/api/contacts", () => mocks)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activeCompanyId = "company-1"
  mocks.currentUserLoading = false
  mocks.listContacts.mockReset()
  mocks.createContactApi.mockReset()
  mocks.getContactCodePreviewApi.mockReset()
  mocks.updateContactApi.mockReset()
})

const makeContact = (code: string, id: string) => ({
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

describe("Contactos master page — last + next correlative badge", () => {
  it("renders Último and Próximo from existing list data without an extra request", async () => {
    mocks.listContacts.mockResolvedValue([
      makeContact("C-0007", "a"),
      makeContact("C-0042", "b"),
      makeContact("C-0009", "c"),
      makeContact("LEGACY", "d"),
    ])
    render(<ContactosPage />)
    await waitFor(() => expect(mocks.listContacts).toHaveBeenCalledTimes(1))
    const badge = await screen.findByTestId("contactos-correlative-badge")
    expect(badge.textContent).toMatch(/Último/)
    expect(badge.textContent).toMatch(/C-0042/)
    expect(badge.textContent).toMatch(/Próximo/)
    expect(badge.textContent).toMatch(/C-0043/)
    // No preview call: the badge is derived from the in-memory list.
    expect(mocks.getContactCodePreviewApi).not.toHaveBeenCalled()
  })

  it("falls back to C-0001 when the list has no numeric codes", async () => {
    mocks.listContacts.mockResolvedValue([makeContact("LEGACY", "x")])
    render(<ContactosPage />)
    await screen.findByTestId("contactos-correlative-badge")
    const badge = screen.getByTestId("contactos-correlative-badge")
    expect(badge.textContent).toMatch(/Último/)
    expect(badge.textContent).toMatch(/—/)
    expect(badge.textContent).toMatch(/Próximo/)
    expect(badge.textContent).toMatch(/C-0001/)
  })
})
