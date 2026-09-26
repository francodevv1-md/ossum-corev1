import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn() }))
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: mocks.useAuth }))

import CajasPage from "@/app/cajas/page"
import CajaDetailPage from "@/app/cajas/[id]/page"

function box(id: string, description: string) {
  return {
    id,
    sku: `BOX-${id}`,
    description,
    brand: "Marca importada",
    manufacturer: "Fabricante",
    family: "Trauma",
    version: 1,
    lineCount: 2,
    lines: [],
    createdAt: "2026-08-25T14:30:00.000Z",
    updatedAt: "2026-08-25T14:30:00.000Z",
  }
}

describe("Cajas catalog", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset()
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-a" } })
  })

  it("uses model/revision language and never renders a stale previous-company catalog", async () => {
    const pending = new Map<string, (value: unknown) => void>()
    mocks.apiFetch.mockImplementation((path: string) => new Promise((resolve) => pending.set(path, resolve)))
    const { rerender } = render(<CajasPage />)

    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-b" } })
    rerender(<CajasPage />)
    await waitFor(() => expect(pending.has("/api/companies/company-b/cajas?take=100")).toBe(true))
    pending.get("/api/companies/company-b/cajas?take=100")?.([box("B", "Modelo B")])

    expect(await screen.findAllByText("Modelo B")).toHaveLength(2)
    expect(screen.getByText("modelo de caja")).toBeInTheDocument()
    expect(screen.getAllByText("Revisión 1")).toHaveLength(2)
    expect(screen.queryByText(/demo|demostración|referencias importadas/i)).not.toBeInTheDocument()

    pending.get("/api/companies/company-a/cajas?take=100")?.([box("A", "Modelo A")])
    await Promise.resolve()
    expect(screen.queryByText("Modelo A")).not.toBeInTheDocument()
  })

  it("shows API failures honestly and retries", async () => {
    mocks.apiFetch
      .mockRejectedValueOnce(new Error("Servicio no disponible"))
      .mockResolvedValueOnce([box("A", "Modelo recuperado")])

    render(<CajasPage />)

    expect(await screen.findByText("No se pudieron cargar los modelos de caja")).toBeInTheDocument()
    expect(screen.queryByText("No se encontraron modelos de caja")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(await screen.findAllByText("Modelo recuperado")).toHaveLength(2)
  })

  it("shows article-loading failures in the new-model dialog and retries", async () => {
    let articleAttempts = 0
    mocks.apiFetch.mockImplementation((path: string) => {
      if (path.includes("/cajas?")) return Promise.resolve([])
      if (path.includes("/articles?")) {
        articleAttempts += 1
        return articleAttempts === 1
          ? Promise.reject(new Error("Catálogo no disponible"))
          : Promise.resolve([{ id: "article-1", sku: "PIN-1", description: "Pinza", unit: "u" }])
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    render(<CajasPage />)
    await screen.findByText("No se encontraron modelos de caja")
    fireEvent.click(screen.getByRole("button", { name: "Nuevo modelo" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Catálogo no disponible")
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(await screen.findByRole("option", { name: "PIN-1 — Pinza" })).toBeInTheDocument()
  })

  it("supports arrow-key navigation between Cajas tabs", async () => {
    mocks.apiFetch.mockResolvedValue([])
    render(<CajasPage />)
    const catalogTab = screen.getByRole("tab", { name: "Modelos y contenido" })
    const operationTab = screen.getByRole("tab", { name: "Unidades físicas" })

    expect(catalogTab).toHaveAttribute("aria-controls", "cajas-panel")
    expect(operationTab).toHaveAttribute("aria-controls", "cajas-panel")
    expect(document.getElementById("cajas-panel")).toBeInTheDocument()

    fireEvent.keyDown(catalogTab, { key: "ArrowRight" })

    expect(operationTab).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "cajas-tab-operacion")
  })
})

describe("Caja detail", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset()
  })

  it("does not remain loading when there is no active company", async () => {
    mocks.useAuth.mockReturnValue({ activeCompany: null })

    await act(async () => {
      render(<CajaDetailPage params={Promise.resolve({ id: "box-a" })} />)
    })

    expect(await screen.findByText("Seleccioná una empresa para consultar el modelo.")).toBeInTheDocument()
    expect(screen.queryByText("Cargando modelo de caja…")).not.toBeInTheDocument()
    expect(mocks.apiFetch).not.toHaveBeenCalled()
  })
})
