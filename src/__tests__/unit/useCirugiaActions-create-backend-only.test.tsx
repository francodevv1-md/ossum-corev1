import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import { EMPTY_NEW_FORM } from "@/lib/cirugias.types"
import type { Surgery } from "@/types"

const {
  apiFetchMock,
  fetchBackendActiveSurgeriesMock,
  storeMock,
  storeState,
  toastSuccessMock,
  toastErrorMock,
  useOrtoTrackStoreMock,
  useAuthMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  fetchBackendActiveSurgeriesMock: vi.fn(),
  storeState: {
    surgeries: [] as Surgery[],
  },
  storeMock: {
    surgeries: [] as Surgery[],
    instrumentadores: [],
    getContactoById: vi.fn(),
    replaceSurgeries: vi.fn(),
    createBudgetForSurgery: vi.fn(),
    authorizeSurgery: vi.fn(),
    authorizeInvoice: vi.fn(),
    changeSurgeryStatus: vi.fn(),
    changeSurgeryDate: vi.fn(),
    suspendSurgery: vi.fn(),
    cancelSurgery: vi.fn(),
    addSurgeryNote: vi.fn(),
    recoverSurgery: vi.fn(),
    getDocStatus: vi.fn(),
    getConsumoBySurgeryId: vi.fn(),
    createSurgery: vi.fn(),
  },
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  useOrtoTrackStoreMock: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
    }
  ),
  useAuthMock: vi.fn(),
}))

vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: useOrtoTrackStoreMock,
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: useAuthMock,
}))

vi.mock("@/lib/api/client", () => ({
  apiFetch: apiFetchMock,
}))

vi.mock("@/lib/api/backend-surgeries", () => ({
  fetchBackendActiveSurgeries: fetchBackendActiveSurgeriesMock,
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock("@/lib/businessRules", () => ({
  canAutorizarFV: vi.fn(() => true),
  canRemitirNR: vi.fn(() => true),
  canCargarConsumo: vi.fn(() => true),
}))

vi.mock("@/hooks/usePresupuestoForm", () => ({
  usePresupuestoForm: () => ({
    validate: vi.fn(() => true),
    items: [],
    subtotal: 0,
    descuentoMonto: 0,
    total: 0,
    formData: {},
    resetForm: vi.fn(),
    setFormData: vi.fn(),
  }),
}))

type ActionsHandle = ReturnType<typeof useCirugiaActions>

function makeBackendSurgery(id = "CX-9001"): Surgery {
  return {
    id,
    patient: "Paciente Test",
    patientDni: "",
    surgeon: "Dr. Test",
    institution: "Hospital Test",
    institutionCity: "CABA",
    procedure: "",
    date: "2026-07-07",
    time: "10:00",
    state: "Pendiente",
    preparationState: "Sin preparar",
    facturado: false,
    autorizado: false,
    client: "Cliente Test",
    classification: "Otro",
    urgente: false,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
  }
}

function HookHarness(props: { onReady: (actions: ActionsHandle) => void }) {
  const actions = useCirugiaActions()
  props.onReady(actions)
  return null
}

describe("useCirugiaActions create flow backend-only", () => {
  let actions: ActionsHandle

  beforeEach(() => {
    actions = undefined as never
    storeState.surgeries = []
    storeMock.surgeries = []
    useOrtoTrackStoreMock.mockImplementation(() => storeMock)
    useOrtoTrackStoreMock.getState.mockImplementation(() => ({ surgeries: storeState.surgeries }))
    storeMock.replaceSurgeries.mockImplementation((surgeries: Surgery[]) => {
      storeState.surgeries = surgeries
      storeMock.surgeries = surgeries
    })
    useAuthMock.mockReturnValue({ activeCompany: { id: "company-1" } })

    apiFetchMock.mockReset()
    fetchBackendActiveSurgeriesMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    storeMock.getContactoById.mockReset()
    storeMock.replaceSurgeries.mockClear()
    storeMock.createBudgetForSurgery.mockClear()
    storeMock.createSurgery.mockClear()

    render(<HookHarness onReady={(value) => {
      actions = value
    }} />)
  })

  it("no inyecta cirugía local si el refresh backend falla después del POST", async () => {
    apiFetchMock.mockResolvedValue({ id: "db-1", visibleNumber: "CX-9001" })
    fetchBackendActiveSurgeriesMock.mockRejectedValue(new Error("backend caído"))

    act(() => {
      actions.setNewForm({
        ...EMPTY_NEW_FORM,
        patient: "Paciente Test",
        patientContactId: "patient-1",
      })
    })

    let result = false
    await act(async () => {
      result = await actions.handleNewSurgery()
    })

    expect(result).toBe(true)
    expect(storeMock.createSurgery).not.toHaveBeenCalled()
    expect(storeMock.replaceSurgeries).not.toHaveBeenCalled()
    expect(storeState.surgeries).toEqual([])
    expect(actions.createdSurgeryId).toBeUndefined()
    expect(storeMock.createBudgetForSurgery).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith("backend caído")
  })

  it("mantiene el happy path cuando POST y refresh backend salen bien", async () => {
    const refreshedSurgeries = [makeBackendSurgery("CX-9001")]
    apiFetchMock.mockResolvedValue({ id: "db-1", visibleNumber: "CX-9001" })
    fetchBackendActiveSurgeriesMock.mockResolvedValue(refreshedSurgeries)

    act(() => {
      actions.setNewForm({
        ...EMPTY_NEW_FORM,
        patient: "Paciente Test",
        patientContactId: "patient-1",
      })
    })

    let result = false
    await act(async () => {
      result = await actions.handleNewSurgery()
    })

    await waitFor(() => {
      expect(actions.createdSurgeryId).toBe("CX-9001")
    })

    expect(result).toBe(true)
    expect(storeMock.createSurgery).not.toHaveBeenCalled()
    expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledWith("company-1", [])
    expect(storeMock.replaceSurgeries).toHaveBeenCalledWith(refreshedSurgeries)
    expect(storeState.surgeries).toEqual(refreshedSurgeries)
    expect(toastSuccessMock).toHaveBeenCalledWith("Cirugía creada exitosamente")
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it("ignora una segunda creación concurrente mientras el primer POST sigue en curso", async () => {
    const refreshedSurgeries = [makeBackendSurgery("CX-9001")]
    let resolvePost!: (value: { id: string; visibleNumber: string }) => void
    apiFetchMock.mockImplementation(
      () => new Promise((resolve) => {
        resolvePost = resolve
      })
    )
    fetchBackendActiveSurgeriesMock.mockResolvedValue(refreshedSurgeries)

    act(() => {
      actions.setNewForm({
        ...EMPTY_NEW_FORM,
        patient: "Paciente Test",
        patientContactId: "patient-1",
      })
    })

    let firstCreate!: Promise<boolean>
    let secondCreate!: Promise<boolean>
    act(() => {
      firstCreate = actions.handleNewSurgery()
      secondCreate = actions.handleNewSurgery()
    })

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(fetchBackendActiveSurgeriesMock).not.toHaveBeenCalled()

    let firstResult = false
    let secondResult = true
    await act(async () => {
      resolvePost({ id: "db-1", visibleNumber: "CX-9001" })
      ;[firstResult, secondResult] = await Promise.all([firstCreate, secondCreate])
    })

    await waitFor(() => {
      expect(actions.createdSurgeryId).toBe("CX-9001")
    })

    expect(firstResult).toBe(true)
    expect(secondResult).toBe(false)
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(fetchBackendActiveSurgeriesMock).toHaveBeenCalledTimes(1)
    expect(storeMock.replaceSurgeries).toHaveBeenCalledTimes(1)
    expect(storeMock.replaceSurgeries).toHaveBeenCalledWith(refreshedSurgeries)
    expect(storeMock.createSurgery).not.toHaveBeenCalled()
    expect(storeState.surgeries).toEqual(refreshedSurgeries)
    expect(toastSuccessMock).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).toHaveBeenCalledWith("Cirugía creada exitosamente")
    expect(toastErrorMock).not.toHaveBeenCalled()
  })
})
