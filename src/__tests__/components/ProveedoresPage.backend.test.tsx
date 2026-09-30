import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ProveedoresPage from "@/app/compras/proveedores/page"
import type { ProveedorRow } from "@/lib/api/proveedores"

const mockUseProveedores = vi.fn()

vi.mock("@/hooks/useProveedores", () => ({
  useProveedores: () => mockUseProveedores(),
}))

const mockProveedoresList: ProveedorRow[] = [
  { id: "prov-1", code: "PRV-001", name: "Distribuidora Quirúrgica SA", active: true },
  { id: "prov-2", code: "PRV-002", name: "Implantes & Prótesis Médicas", active: true },
  { id: "prov-3", code: "PRV-003", name: "Biomateriales del Sur", active: true },
]

describe("ProveedoresPage (backend-authoritative)", () => {
  const refreshMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseProveedores.mockReturnValue({
      proveedores: mockProveedoresList,
      loading: false,
      error: null,
      refresh: refreshMock,
    })
  })

  it("renders active providers from the contacts master with honest copy", () => {
    render(<ProveedoresPage />)

    expect(screen.getByRole("heading", { name: "Proveedores", level: 1 })).toBeInTheDocument()
    expect(
      screen.getByText(/Proveedores activos provenientes del maestro de contactos/)
    ).toBeInTheDocument()

    // Table rows
    expect(screen.getByText("PRV-001")).toBeInTheDocument()
    expect(screen.getByText("Distribuidora Quirúrgica SA")).toBeInTheDocument()
    expect(screen.getByText("PRV-002")).toBeInTheDocument()
    expect(screen.getByText("Implantes & Prótesis Médicas")).toBeInTheDocument()

    // Status badges
    const activeBadges = screen.getAllByText("Activo")
    expect(activeBadges.length).toBe(3)
  })

  it("does not render fake CTAs or dialogues (no create, no edit, no rating, no OC history)", () => {
    render(<ProveedoresPage />)

    expect(screen.queryByText(/Nuevo Proveedor/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Editar Proveedor/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Rating promedio/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Evaluar/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Órdenes de Compra/i)).not.toBeInTheDocument()
  })

  it("filters suppliers locally by code or name", () => {
    render(<ProveedoresPage />)

    const searchInput = screen.getByLabelText("Buscar proveedores")
    fireEvent.change(searchInput, { target: { value: "PRV-002" } })

    expect(screen.getByText("PRV-002")).toBeInTheDocument()
    expect(screen.getByText("Implantes & Prótesis Médicas")).toBeInTheDocument()
    expect(screen.queryByText("PRV-001")).not.toBeInTheDocument()

    // Filter by name
    fireEvent.change(searchInput, { target: { value: "Biomateriales" } })
    expect(screen.getByText("PRV-003")).toBeInTheDocument()
    expect(screen.queryByText("PRV-002")).not.toBeInTheDocument()
  })

  it("shows empty search state when no results match search text", () => {
    render(<ProveedoresPage />)

    const searchInput = screen.getByLabelText("Buscar proveedores")
    fireEvent.change(searchInput, { target: { value: "Inexistente" } })

    expect(screen.getByText("No se encontraron proveedores")).toBeInTheDocument()

    const clearButtons = screen.getAllByRole("button", { name: "Limpiar búsqueda" })
    fireEvent.click(clearButtons[0])

    expect(screen.getByText("PRV-001")).toBeInTheDocument()
  })

  it("triggers refresh when clicking Actualizar button", () => {
    render(<ProveedoresPage />)

    const refreshBtn = screen.getByRole("button", { name: /Actualizar/i })
    fireEvent.click(refreshBtn)

    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it("renders loading state when initial fetch is pending", () => {
    mockUseProveedores.mockReturnValue({
      proveedores: [],
      loading: true,
      error: null,
      refresh: refreshMock,
    })

    render(<ProveedoresPage />)

    expect(screen.getByText("Cargando proveedores…")).toBeInTheDocument()
  })

  it("renders error state with retry action when fetch fails", () => {
    mockUseProveedores.mockReturnValue({
      proveedores: [],
      loading: false,
      error: "Error de red al consultar API",
      refresh: refreshMock,
    })

    render(<ProveedoresPage />)

    expect(screen.getByText("No se pudieron cargar los proveedores")).toBeInTheDocument()
    expect(screen.getByText("Error de red al consultar API")).toBeInTheDocument()

    const retryBtn = screen.getByRole("button", { name: "Reintentar" })
    fireEvent.click(retryBtn)

    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it("renders empty state when there are no providers registered in contacts master", () => {
    mockUseProveedores.mockReturnValue({
      proveedores: [],
      loading: false,
      error: null,
      refresh: refreshMock,
    })

    render(<ProveedoresPage />)

    expect(screen.getByText("No hay proveedores registrados")).toBeInTheDocument()
    expect(
      screen.getByText(/Los proveedores se administran desde el maestro de Contactos/)
    ).toBeInTheDocument()
  })
})
