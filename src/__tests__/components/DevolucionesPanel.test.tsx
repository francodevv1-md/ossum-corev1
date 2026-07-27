import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DevolucionesPanel } from "@/components/expediente/DevolucionesPanel"

const { toastError, toastSuccess, useDevolucionesMock } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  useDevolucionesMock: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}))

vi.mock("@/hooks/useDevoluciones", () => ({
  useDevoluciones: useDevolucionesMock,
}))

const draft = {
  id: "devolucion-1",
  visibleNumber: 1,
  companyId: "company-1",
  surgeryId: "surgery-1",
  remitoId: "remito-1",
  consumoId: null,
  state: "Borrador",
  reason: null,
  validatedAt: null,
  createdById: "user-1",
  updatedById: null,
  metadata: null,
  createdAt: "2026-07-15T10:00:00.000Z",
  updatedAt: "2026-07-15T10:00:00.000Z",
  items: [{ id: "item-1", description: "Tornillo", returnedQuantity: 1 }],
}

function setHook(overrides: Record<string, unknown> = {}) {
  useDevolucionesMock.mockReturnValue({
    devoluciones: [draft],
    loading: false,
    ready: true,
    error: null,
    blocked: false,
    mutatingId: null,
    refresh: vi.fn(),
    transition: vi.fn().mockResolvedValue({ ...draft, state: "Pendiente" }),
    confirm: vi.fn(),
    createDraft: vi.fn(),
    removeDraft: vi.fn(),
    ...overrides,
  })
}

function renderPanel() {
  render(<DevolucionesPanel surgeryId="surgery-1" />)
  fireEvent.click(screen.getByRole("button", { name: /D-0001/i }))
}

describe("DevolucionesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sends a Borrador to Pendiente through the canonical transition", async () => {
    const transition = vi.fn().mockResolvedValue({ ...draft, state: "Pendiente" })
    setHook({ transition })

    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Enviar a pendiente" }))

    await waitFor(() => {
      expect(transition).toHaveBeenCalledWith("devolucion-1", "Pendiente")
    })
    expect(toastSuccess).toHaveBeenCalledWith("Devolución D-0001 enviada a pendiente")
  })

  it("reports a transition error locally without removing the draft actions", async () => {
    const transition = vi.fn().mockRejectedValue(new Error("Transition failed"))
    setHook({ transition })

    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Enviar a pendiente" }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Transition failed")
    })
    expect(screen.getByRole("button", { name: "Eliminar borrador" })).toBeEnabled()
  })

  it("disables draft actions while its transition is pending", () => {
    setHook({ mutatingId: "devolucion-1" })

    renderPanel()

    expect(screen.getByRole("button", { name: "Enviar a pendiente" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Eliminar borrador" })).toBeDisabled()
  })

  it("refreshes dependent Ficha CX surfaces only after confirmation succeeds", async () => {
    const pending = { ...draft, state: "Pendiente" }
    const confirm = vi.fn().mockResolvedValue({ ...pending, state: "Confirmada" })
    const onConfirmed = vi.fn()
    setHook({ devoluciones: [pending], confirm })

    render(<DevolucionesPanel surgeryId="surgery-1" onConfirmed={onConfirmed} />)
    fireEvent.click(screen.getByRole("button", { name: /D-0001/i }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar devolución" }))

    await waitFor(() => {
      expect(onConfirmed).toHaveBeenCalledTimes(1)
    })
  })

  it("does not refresh dependent Ficha CX surfaces when confirmation fails", async () => {
    const pending = { ...draft, state: "Pendiente" }
    const confirm = vi.fn().mockRejectedValue(new Error("Confirmation failed"))
    const onConfirmed = vi.fn()
    setHook({ devoluciones: [pending], confirm })

    render(<DevolucionesPanel surgeryId="surgery-1" onConfirmed={onConfirmed} />)
    fireEvent.click(screen.getByRole("button", { name: /D-0001/i }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar devolución" }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Confirmation failed")
    })
    expect(onConfirmed).not.toHaveBeenCalled()
  })

  it("creates a draft from the selected remito and optional consumo payload", async () => {
    const createDraft = vi.fn().mockResolvedValue(draft)
    setHook({ devoluciones: [], createDraft })
    const selectedRemito = {
      id: "remito-2",
      visibleNumber: 22,
      items: [{
        id: "remito-item-2",
        itemId: "stock-item-2",
        sku: "SKU-2",
        description: "Placa",
        quantity: 3,
        unit: "u",
        lotNumber: "LOT-R",
        serialNumber: null,
        expirationDate: null,
        metadata: null,
      }],
    }
    const selectedConsumo = {
      id: "consumo-2",
      visibleNumber: 12,
      items: [{
        id: "consumo-item-2",
        remitoItemId: "remito-item-2",
        sku: "SKU-2",
        description: "Placa consumida",
        requestedQuantity: 3,
        consumedQuantity: 2,
        unit: "u",
        lotNumber: "LOT-C",
        serialNumber: "SER-2",
        expirationDate: "2027-01-01T00:00:00.000Z",
        metadata: null,
      }],
    }

    render(
      <DevolucionesPanel
        surgeryId="surgery-1"
        selectedRemito={selectedRemito as any}
        selectedConsumo={selectedConsumo as any}
      />
    )
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "2" } })
    fireEvent.change(screen.getByPlaceholderText("Opcional"), { target: { value: " Material sin usar " } })
    fireEvent.click(screen.getByRole("button", { name: "Crear borrador" }))

    await waitFor(() => {
      expect(createDraft).toHaveBeenCalledWith({
        surgeryId: "surgery-1",
        remitoId: "remito-2",
        consumoId: "consumo-2",
        reason: "Material sin usar",
        items: [{
          remitoItemId: "remito-item-2",
          consumoItemId: "consumo-item-2",
          sku: "SKU-2",
          description: "Placa consumida",
          returnedQuantity: 2,
          unit: "u",
          lotNumber: "LOT-C",
          serialNumber: "SER-2",
          expirationDate: "2027-01-01T00:00:00.000Z",
        }],
        metadata: {
          source: "ficha_cx",
          remitoVisibleNumber: "R-0022",
          consumoVisibleNumber: "C-0012",
        },
      })
    })
  })
})
