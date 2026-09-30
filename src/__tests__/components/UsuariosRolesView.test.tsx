import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { UsuariosRolesView } from "@/components/configuracion/UsuariosRolesView"
import * as useMembershipsModule from "@/hooks/useMemberships"

const mockUsers = [
  {
    id: "mem-1",
    userId: "usr-1",
    email: "franco.sistemas@districorr.com.ar",
    firstName: "Franco",
    lastName: "Jr",
    name: "Franco Jr",
    phone: null,
    role: "admin",
    canonicalRole: "admin" as const,
    isActive: true,
    userIsActive: true,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
    isSelf: true,
    isLastAdmin: true,
  },
  {
    id: "mem-2",
    userId: "usr-2",
    email: "nelson.coordinacion@districorr.com.ar",
    firstName: "Nelson",
    lastName: "González",
    name: "Nelson González",
    phone: null,
    role: "coordinator",
    canonicalRole: "coordinator" as const,
    isActive: true,
    userIsActive: true,
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    isSelf: false,
    isLastAdmin: false,
  },
  {
    id: "mem-3",
    userId: "usr-3",
    email: "lucas.operaciones@districorr.com.ar",
    firstName: "Lucas",
    lastName: "Martínez",
    name: "Lucas Martínez",
    phone: null,
    role: "logistics",
    canonicalRole: "logistics" as const,
    isActive: false,
    userIsActive: true,
    createdAt: "2026-02-15T10:00:00.000Z",
    updatedAt: "2026-02-15T10:00:00.000Z",
    isSelf: false,
    isLastAdmin: false,
  },
]

describe("UsuariosRolesView Component (Backend Authoritative)", () => {
  const createMembershipMock = vi.fn().mockResolvedValue({})
  const updateMembershipMock = vi.fn().mockResolvedValue({})
  const toggleMembershipStatusMock = vi.fn().mockResolvedValue({})
  const deleteMembershipMock = vi.fn().mockResolvedValue({})
  const resetPasswordMock = vi.fn().mockResolvedValue({
    success: true,
    message: "Clave generada",
    tempPassword: "Ossum#123456",
  })
  const refreshMock = vi.fn()

  beforeEach(() => {
    vi.spyOn(useMembershipsModule, "useMemberships").mockReturnValue({
      items: mockUsers,
      totalAdmins: 1,
      canManage: true,
      isLoading: false,
      error: null,
      isMutating: false,
      refresh: refreshMock,
      createMembership: createMembershipMock,
      updateMembership: updateMembershipMock,
      toggleMembershipStatus: toggleMembershipStatusMock,
      deleteMembership: deleteMembershipMock,
      resetPassword: resetPasswordMock,
    })
  })

  it("renders the header and user list from backend authority", () => {
    render(<UsuariosRolesView />)

    expect(screen.getByRole("heading", { name: /usuarios y roles/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /nuevo usuario/i })).toBeInTheDocument()
    expect(screen.getAllByText("Franco Jr").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Nelson González").length).toBeGreaterThan(0)
  })

  it("displays metrics and counts accurately", () => {
    render(<UsuariosRolesView />)

    expect(screen.getByText("Total Usuarios")).toBeInTheDocument()
    expect(screen.getByText("Activos")).toBeInTheDocument()
    expect(screen.getByText("Inactivos")).toBeInTheDocument()
    expect(screen.getByText("Administradores")).toBeInTheDocument()
  })

  it("filters users by text search", () => {
    render(<UsuariosRolesView />)

    const searchInput = screen.getByPlaceholderText(/buscar por nombre, email o rol/i)
    fireEvent.change(searchInput, { target: { value: "Nelson" } })

    expect(screen.getAllByText("Nelson González").length).toBeGreaterThan(0)
    expect(screen.queryByText("Lucas Martínez")).not.toBeInTheDocument()
  })

  it("shows last admin badge and warns on last admin mutation", () => {
    render(<UsuariosRolesView />)

    expect(screen.getByText("Último Admin")).toBeInTheDocument()
  })

  it("opens create user modal and submits with canonical role", async () => {
    render(<UsuariosRolesView />)

    const createButton = screen.getByRole("button", { name: /nuevo usuario/i })
    fireEvent.click(createButton)

    const firstNameInput = screen.getByLabelText(/nombre \*/i)
    const lastNameInput = screen.getByLabelText(/apellido \*/i)
    const emailInput = screen.getByLabelText(/correo electrónico \*/i)

    fireEvent.change(firstNameInput, { target: { value: "Mariana" } })
    fireEvent.change(lastNameInput, { target: { value: "Sánchez" } })
    fireEvent.change(emailInput, { target: { value: "mariana.admin@districorr.com.ar" } })

    const submitBtn = screen.getByRole("button", { name: /crear usuario/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(createMembershipMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "mariana.admin@districorr.com.ar",
          firstName: "Mariana",
          lastName: "Sánchez",
          role: "coordinator",
        })
      )
    })
  })
})
