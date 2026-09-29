import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { UsuariosRolesView } from "@/components/configuracion/UsuariosRolesView"

describe("UsuariosRolesView Component", () => {
  it("renders the header and initial user list", () => {
    render(<UsuariosRolesView />)

    expect(screen.getByRole("heading", { name: /usuarios y roles/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /nuevo usuario/i })).toBeInTheDocument()
    expect(screen.getAllByText("Franco Jr").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Nelson González").length).toBeGreaterThan(0)
  })

  it("calculates and displays stats correctly", () => {
    render(<UsuariosRolesView />)

    expect(screen.getByText("Total Usuarios")).toBeInTheDocument()
    expect(screen.getByText("Activos")).toBeInTheDocument()
    expect(screen.getByText("Inactivos")).toBeInTheDocument()
    expect(screen.getByText("Administradores")).toBeInTheDocument()
  })

  it("filters users by text search", async () => {
    render(<UsuariosRolesView />)

    const searchInput = screen.getByPlaceholderText(/buscar por nombre, email o rol/i)
    fireEvent.change(searchInput, { target: { value: "Mariana" } })

    expect(screen.getAllByText("Mariana Sánchez").length).toBeGreaterThan(0)
    expect(screen.queryByText("Franco Jr")).not.toBeInTheDocument()
  })

  it("displays empty state when search finds no matches and allows clearing filters", async () => {
    render(<UsuariosRolesView />)

    const searchInput = screen.getByPlaceholderText(/buscar por nombre, email o rol/i)
    fireEvent.change(searchInput, { target: { value: "UsuarioInexistenteXYZ" } })

    expect(screen.getByText("No se encontraron usuarios")).toBeInTheDocument()

    // Clear filters button
    const clearButton = screen.getByRole("button", { name: /limpiar filtros/i })
    fireEvent.click(clearButton)

    expect(screen.getAllByText("Franco Jr").length).toBeGreaterThan(0)
  })

  it("opens create user modal and validates required fields", async () => {
    render(<UsuariosRolesView />)

    const createButton = screen.getByRole("button", { name: /nuevo usuario/i })
    fireEvent.click(createButton)

    expect(
      screen.getByText(
        "Completá los datos requeridos para registrar una nueva cuenta de usuario en el sistema."
      )
    ).toBeInTheDocument()

    const submitBtn = screen.getByRole("button", { name: /crear usuario/i })
    fireEvent.click(submitBtn)

    // Form errors should be visible
    expect(screen.getByText(/el nombre completo es requerido/i)).toBeInTheDocument()
    expect(screen.getByText(/el correo electrónico es requerido/i)).toBeInTheDocument()
  })

  it("successfully creates a new user and adds it to the list", async () => {
    render(<UsuariosRolesView />)

    const createButton = screen.getByRole("button", { name: /nuevo usuario/i })
    fireEvent.click(createButton)

    const nameInput = screen.getByLabelText(/nombre completo/i)
    const emailInput = screen.getByLabelText(/correo electrónico/i)

    fireEvent.change(nameInput, { target: { value: "Agustina Doctora" } })
    fireEvent.change(emailInput, { target: { value: "agustina.medica@districorr.com.ar" } })

    const submitBtn = screen.getByRole("button", { name: /crear usuario/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getAllByText("Agustina Doctora").length).toBeGreaterThan(0)
      expect(screen.getAllByText("agustina.medica@districorr.com.ar").length).toBeGreaterThan(0)
    })
  })

  it("opens password reset dialog and triggers password refresh", async () => {
    render(<UsuariosRolesView />)

    const resetButtons = screen.getAllByTitle(/refrescar \/ restablecer contraseña/i)
    fireEvent.click(resetButtons[0])

    expect(screen.getByText(/refrescar contraseña de acceso/i)).toBeInTheDocument()
    expect(screen.getByText(/enlace por email/i)).toBeInTheDocument()
    expect(screen.getByText(/clave provisoria/i)).toBeInTheDocument()

    // Switch to temporary password
    const tempKeyOption = screen.getByText(/clave provisoria/i)
    fireEvent.click(tempKeyOption)

    expect(screen.getByText(/contraseña generada/i)).toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /confirmar clave temporal/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(screen.queryByText(/refrescar contraseña de acceso/i)).not.toBeInTheDocument()
    })
  })
})
