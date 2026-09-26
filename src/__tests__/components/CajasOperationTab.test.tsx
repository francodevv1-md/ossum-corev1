import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { apiFetch, toastError } = vi.hoisted(() => ({ apiFetch: vi.fn(), toastError: vi.fn() }))
vi.mock("@/lib/api/client", () => ({ apiFetch }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

import { OperationTab } from "@/app/cajas/page"
import type { BoxPresentationSku } from "@/features/boxes/presentation/boxes-presentation-fixtures"

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe("Cajas OperationTab", () => {
  beforeEach(() => vi.clearAllMocks())

  it("settles deterministically without requesting data when no company is active", async () => {
    render(<OperationTab />)

    expect(await screen.findByText("Todavía no hay cajas para mostrar")).toBeInTheDocument()
    expect(screen.queryByLabelText("Cargando unidades físicas")).not.toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it("clears a prior company error when the active company disappears", async () => {
    apiFetch.mockRejectedValue(new Error("unavailable"))
    const { rerender } = render(<OperationTab companyId="company-1" />)
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    rerender(<OperationTab />)

    expect(await screen.findByText("Todavía no hay cajas para mostrar")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Cargando unidades físicas")).not.toBeInTheDocument()
  })

  it("clears prior company items when the active company disappears", async () => {
    apiFetch.mockResolvedValue([{ id: "BOX-1", name: "Caja trauma", description: "Caja trauma", category: "Trauma", expectedContent: { label: "v1", nextLabel: "v2", context: "Fórmula vigente", items: [] }, units: [{ unitId: "unit-a", code: "UNIT-A", condition: "Disponible", evidence: [] }] }])
    const { rerender } = render(<OperationTab companyId="company-1" />)
    expect(await screen.findByText("UNIT-A")).toBeInTheDocument()

    rerender(<OperationTab />)

    expect(await screen.findByText("Todavía no hay cajas para mostrar")).toBeInTheDocument()
    expect(screen.queryByText("UNIT-A")).not.toBeInTheDocument()
  })

  it("ignores evidence responses from an older unit selection", async () => {
    const evidenceA = deferred<never[]>()
    const evidenceB = deferred<never[]>()
    const items: BoxPresentationSku[] = [{
      id: "BOX-1",
      name: "Caja trauma",
      description: "Caja trauma",
      category: "Trauma",
      expectedContent: { label: "v1", nextLabel: "v2", context: "Fórmula vigente", items: [] },
      units: [
        { unitId: "unit-a", code: "UNIT-A", condition: "Disponible", evidence: [] },
        { unitId: "unit-b", code: "UNIT-B", condition: "Disponible", evidence: [] },
      ],
    }]

    apiFetch.mockImplementation((url: string) => {
      if (url.endsWith("/cajas/operational")) return Promise.resolve(items)
      if (url.endsWith("/maintenance")) return Promise.resolve({ unit: { id: "unit", code: "UNIT" }, cases: [] })
      if (url.includes("unit-a") && url.endsWith("/evidence")) return evidenceA.promise
      if (url.includes("unit-b") && url.endsWith("/evidence")) return evidenceB.promise
      throw new Error(`Unexpected URL: ${url}`)
    })

    render(<OperationTab companyId="company-1" />)
    fireEvent.click((await screen.findAllByRole("button", { name: /Abrir Caja/ }))[0])
    fireEvent.click(screen.getByRole("button", { name: "Abrir Caja identificada UNIT-A" }))
    expect(await screen.findByRole("heading", { name: "UNIT-A" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Volver a BOX-1" }))
    fireEvent.click(screen.getByRole("button", { name: "Abrir Caja identificada UNIT-B" }))

    evidenceB.resolve([])
    await screen.findByRole("heading", { name: "UNIT-B" })

    await act(async () => {
      evidenceA.resolve([])
      await evidenceA.promise
    })
    expect(screen.getByRole("heading", { name: "UNIT-B" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "UNIT-A" })).not.toBeInTheDocument()
  })

  it("shows evidence failure honestly while maintenance loads independently", async () => {
    const items: BoxPresentationSku[] = [{
      id: "BOX-1",
      name: "Caja trauma",
      description: "Caja trauma",
      category: "Trauma",
      expectedContent: { label: "v1", nextLabel: "v2", context: "Fórmula vigente", items: [] },
      units: [{ unitId: "unit-a", code: "UNIT-A", condition: "Disponible", evidence: [] }],
    }]
    apiFetch.mockImplementation((url: string) => {
      if (url.endsWith("/cajas/operational")) return Promise.resolve(items)
      if (url.endsWith("/maintenance")) return Promise.resolve({ unit: { id: "unit-a", code: "UNIT-A" }, cases: [] })
      if (url.endsWith("/evidence")) return Promise.reject(new Error("evidence unavailable"))
      throw new Error(`Unexpected URL: ${url}`)
    })

    render(<OperationTab companyId="company-1" />)
    fireEvent.click((await screen.findAllByRole("button", { name: /Abrir Caja/ }))[0])
    fireEvent.click(screen.getByRole("button", { name: "Abrir Caja identificada UNIT-A" }))

    expect(await screen.findByRole("heading", { name: "UNIT-A" })).toBeInTheDocument()
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar la evidencia")
    expect(screen.getByText("Sin casos de mantenimiento")).toBeInTheDocument()
    expect(toastError).not.toHaveBeenCalled()
  })
})
