import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DeleteSurgeryDialog } from "@/components/cirugias/dialogs/DeleteSurgeryDialog"
import type { Surgery } from "@/types"

const { apiFetchMock, useAuthMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  useAuthMock: vi.fn(),
}))

vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => useAuthMock(),
}))

const mockSurgery: Surgery = {
  id: "CX-0010",
  backendId: "uuid-surgery-0010",
  patient: "Juan Pérez",
  patientDni: "12345678",
  surgeon: "Dr. House",
  institution: "Hospital DEV",
  institutionCity: "Córdoba",
  procedure: "Cirugía de prueba",
  date: "2026-09-30",
  time: "10:00",
  state: "Pendiente",
  client: "OSDE",
  classification: "Otro",
  preparationState: "Sin preparar",
  facturado: false,
  autorizado: true,
  urgente: false,
  leyendaDestacada: false,
  referenciasAdministrativas: [],
}

const previewResponse = {
  surgery: {
    id: "uuid-surgery-0010",
    visibleNumber: "CX-0010",
    patientName: "Juan Pérez",
    institutionName: "Hospital DEV",
  },
  dependencies: {
    presupuestos: 0,
    remitos: 0,
    consumos: 0,
    devoluciones: 0,
    invoices: 0,
    payments: 0,
    digitalReceipts: 0,
    seguimientoEntries: 0,
    internalNotifications: 0,
  },
  policy: {
    recommendedAction: "delete" as const,
    canDelete: true,
    canArchive: true,
    blockedReasons: [],
    requiresHighPrivilege: false,
    hasFiscalDocuments: false,
    hasOperationalDocuments: false,
    confirmationText: "confirmo eliminar" as const,
  },
}

describe("DeleteSurgeryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-dev-1", name: "Empresa DEV" },
      user: { id: "user-1", email: "dev@example.com" },
      isAuthenticated: true,
    })
  })

  it("fetches delete preview using surgery.backendId instead of visible ID", async () => {
    apiFetchMock.mockResolvedValueOnce(previewResponse)

    render(
      <DeleteSurgeryDialog
        open={true}
        onOpenChange={vi.fn()}
        surgery={mockSurgery}
      />
    )

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/companies/company-dev-1/surgeries/uuid-surgery-0010/delete-preview"
      )
    })

    expect(await screen.findByText("CX-0010")).toBeInTheDocument()
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
  })

  it("submits archive using surgery.backendId when confirmed", async () => {
    apiFetchMock.mockResolvedValueOnce(previewResponse)
    apiFetchMock.mockResolvedValueOnce({ ok: true })

    const onArchived = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <DeleteSurgeryDialog
        open={true}
        onOpenChange={onOpenChange}
        surgery={mockSurgery}
        onArchived={onArchived}
      />
    )

    await screen.findByText("CX-0010")

    const reasonInput = screen.getByLabelText("Motivo obligatorio")
    fireEvent.change(reasonInput, { target: { value: "Carga duplicada en DEV" } })

    const confirmInput = screen.getByLabelText("Confirmación exacta")
    fireEvent.change(confirmInput, { target: { value: "confirmo eliminar" } })

    const submitButton = screen.getByRole("button", { name: "Eliminar cirugía" })
    expect(submitButton).not.toBeDisabled()

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/companies/company-dev-1/surgeries/uuid-surgery-0010/archive",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            confirmationText: "confirmo eliminar",
            reason: "Carga duplicada en DEV",
          }),
        })
      )
    })

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(onArchived).toHaveBeenCalled()
    })
  })

  it("falls back to surgery.id if backendId is not present", async () => {
    apiFetchMock.mockResolvedValueOnce(previewResponse)

    const surgeryWithoutBackendId = { ...mockSurgery, backendId: undefined }

    render(
      <DeleteSurgeryDialog
        open={true}
        onOpenChange={vi.fn()}
        surgery={surgeryWithoutBackendId}
      />
    )

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/companies/company-dev-1/surgeries/CX-0010/delete-preview"
      )
    })
  })
})
