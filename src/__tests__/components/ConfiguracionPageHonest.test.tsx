import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import ConfiguracionPage from "@/app/configuracion/page"

const replaceMock = vi.fn()
let currentTab: string | null = null

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "tab" ? currentTab : null),
  }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: vi.fn(),
  }),
}))

vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: () => ({
    users: [{ id: "u-1", name: "Admin Test", email: "admin@ossum.local", role: "admin" }],
    currentUserId: "u-1",
  }),
}))

vi.mock("@/components/configuracion/UsuariosRolesView", () => ({
  UsuariosRolesView: () => <div data-testid="usuarios-roles-view">Usuarios y Roles View Mock</div>,
}))

vi.mock("@/components/configuracion/NotificacionesConfigView", () => ({
  NotificacionesConfigView: () => <div data-testid="notificaciones-config-view">Notificaciones Config View Mock</div>,
}))

describe("ConfiguracionPage (honest presentation)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentTab = null
  })

  it("renders General tab with honest read-only banner and disabled inputs", () => {
    render(<ConfiguracionPage />)

    expect(screen.getByRole("status")).toHaveTextContent(/Parámetros generales en modo solo lectura/i)
    expect(screen.getByText(/Solo lectura \(no persistido\)/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /No persistido/i })).toBeDisabled()
    expect(screen.getByDisplayValue("OrtoTrack")).toBeDisabled()
  })

  it("renders UsuariosRolesView when tab=usuarios", () => {
    currentTab = "usuarios"
    render(<ConfiguracionPage />)

    expect(screen.getByTestId("usuarios-roles-view")).toBeInTheDocument()
  })

  it("renders NotificacionesConfigView when tab=notificaciones", () => {
    currentTab = "notificaciones"
    render(<ConfiguracionPage />)

    expect(screen.getByTestId("notificaciones-config-view")).toBeInTheDocument()
  })
})
