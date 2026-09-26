import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import type { ChangeEvent } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  openExpediente: vi.fn(),
  createFromSource: vi.fn(),
  refreshInvoices: vi.fn(),
  refreshSources: vi.fn(),
}))

vi.mock("@/components/layout/app-shell", () => ({ useExpedienteDrawer: () => ({ openExpediente: mocks.openExpediente }) }))
vi.mock("@/components/shared", () => ({
  SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => <input aria-label={placeholder} value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} />,
  SurgeryDrawer: () => null,
}))
vi.mock("@/hooks/useInvoices", () => ({ useInvoices: () => ({
  invoices: [], loading: false, error: null, mutatingId: null,
  createFromSource: mocks.createFromSource,
  refresh: mocks.refreshInvoices,
}) }))
vi.mock("@/hooks/usePendingInvoiceSources", () => ({ usePendingInvoiceSources: () => ({
  companyId: "company-real",
  loading: false,
  error: null,
  refresh: mocks.refreshSources,
  candidates: [{
    key: "company-real:consumo:consumo-real",
    companyId: "company-real",
    kind: "consumo",
    surgeryId: "surgery-real",
    presupuestoId: "budget-real",
    consumoId: "consumo-real",
    surgeryNumber: "CX-2041",
    patientName: "Ana Pérez",
    institutionName: "Hospital Central",
    presupuestoNumber: "P-0017",
    consumoNumber: "C-0008",
    currency: "ARS",
  }],
}) }))

import PendientesFacturarPage from "@/app/ventas/pendientes-facturar/page"

describe("PendientesFacturarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createFromSource.mockResolvedValue({ id: "invoice-real" })
    mocks.refreshSources.mockResolvedValue(undefined)
  })

  it("creates from backend source ids and refreshes pending sources", async () => {
    render(<PendientesFacturarPage />)
    fireEvent.click(screen.getByRole("button", { name: "Preparar factura para Ana Pérez" }))
    fireEvent.click(screen.getByRole("button", { name: "Crear borrador" }))

    await waitFor(() => expect(mocks.createFromSource).toHaveBeenCalledWith({ presupuestoId: "budget-real", consumoId: "consumo-real" }))
    expect(mocks.refreshSources).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Abrir expediente CX-2041" }))
    expect(mocks.openExpediente).toHaveBeenCalledWith("surgery-real")
  })

  it("shows operational labels instead of backend ids", () => {
    render(<PendientesFacturarPage />)
    expect(screen.getByText("CX-2041")).toBeInTheDocument()
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument()
    expect(screen.getByText("Hospital Central")).toBeInTheDocument()
    expect(screen.getByText("P-0017 · C-0008")).toBeInTheDocument()
    expect(screen.queryByText("surgery-real")).not.toBeInTheDocument()
    expect(screen.queryByText("budget-real")).not.toBeInTheDocument()
  })

  it("contains no local financial authority", () => {
    const source = readFileSync("src/app/ventas/pendientes-facturar/page.tsx", "utf8")
    expect(source).not.toMatch(/useOrtoTrackStore|localStorage|authorizeInvoice|@\/lib\/store|mock/i)
    expect(source).toContain("usePendingInvoiceSources")
    expect(source).toContain("createFromSource")
  })
})
