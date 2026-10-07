import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import RolesPage from "@/app/roles/page"

const replaceMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
}))

describe("RolesPage redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects automatically to /configuracion?tab=usuarios", () => {
    render(<RolesPage />)

    expect(replaceMock).toHaveBeenCalledWith("/configuracion?tab=usuarios")
    expect(screen.getByText(/Redirigiendo a Usuarios y Roles/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Ir a Configuración de Usuarios/i })).toHaveAttribute(
      "href",
      "/configuracion?tab=usuarios"
    )
  })
})
