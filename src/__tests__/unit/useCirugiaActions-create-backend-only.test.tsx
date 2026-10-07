import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import { EMPTY_NEW_FORM } from "@/lib/cirugias.types"
import type { Surgery } from "@/types"
import { ApiClientError } from "@/lib/api/client"

const {
  apiFetchMock,
  fetchBackendActiveSurgeriesMock,
  storeMock,
  storeState,
  toastSuccessMock,
  toastErrorMock,
  toastWarningMock,
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
  toastWarningMock: vi.fn(),
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

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api/client")>(),
  apiFetch: apiFetchMock,
}))

vi.mock("@/lib/api/backend-surgeries", () => ({
  fetchBackendActiveSurgeries: fetchBackendActiveSurgeriesMock,
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
    warning: toastWarningMock,
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
    items: [{ id: "line-1", name: "Implant", code: "IMP", quantity: 2, unitPrice: 100, discountPercent: 10, ivaKey: "21", catalogItemId: "catalog-1" }],
    subtotal: 0,
    descuentoMonto: 0,
    total: 0,
    formData: { fechaEmision: "2026-10-07", vigencia: "30 días", descuento: 5, client: "Client", clientContactId: "payer-1" },
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
    toastWarningMock.mockReset()
    storeMock.getContactoById.mockReset()
    storeMock.replaceSurgeries.mockClear()
    storeMock.createBudgetForSurgery.mockClear()
    storeMock.createSurgery.mockClear()

    render(<HookHarness onReady={(value) => {
      actions = value
    }} />)
  })

  it("sends selected IDs only with Argentine time precision and shipping", async () => {
    apiFetchMock.mockResolvedValue({ id: "db-1", visibleNumber: "CX-9001" })
    fetchBackendActiveSurgeriesMock.mockResolvedValue([])
    act(() => actions.setNewForm({ ...EMPTY_NEW_FORM, patient: "Patient", patientContactId: "wrong-id", surgeonContactId: "doctor-1", institutionContactId: "institution-1", clientContactId: "payer-1", coordinadorContactId: "coordinator-1", vendedorContactId: "salesperson-1", instrumentadorContactId: "instrumentator-1", date: "2026-10-07", time: "00:00", fechaEnvioMaterial: "2026-10-06" }))
    await act(async () => { await actions.handleNewSurgery() })
    const payload = JSON.parse(apiFetchMock.mock.calls[0][1].body)
    expect(payload).toMatchObject({ patientId: "wrong-id", doctorId: "doctor-1", institutionId: "institution-1", payerContactId: "payer-1", coordinatorContactId: "coordinator-1", salespersonContactId: "salesperson-1", instrumentatorContactId: "instrumentator-1", surgeryDate: "2026-10-07T03:00:00.000Z", surgeryTimeSpecified: true, materialShippingDate: "2026-10-06" })
    for (const field of ["patientContact", "doctorContact", "institutionContact", "payerContact"]) expect(payload).not.toHaveProperty(field)
  })

  it.each([
    { date: "2026-02-30" }, { date: "2026-10-07", time: "24:00" }, { time: "10:00" },
    { fechaEnvioMaterial: "2026-02-30" }, { probableDate: "2026-02-30" },
    { leyenda: "Important" }, { leyendaDestacada: true },
    { referenciasAdministrativas: [{ id: "ref-1", tipo: "Autorización" as const, valor: "AUTH-1" }] },
    { provincia: "Manual province" }, { localidad: "Manual town" }, { institutionCity: "Manual city" },
    { surgeon: "Text only" }, { coordinadorCx: "Text only" }, { vendedor: "Text only" }, { instrumentador: "Text only" },
  ])("fails before POST for invalid or unsupported input: %j", async fields => {
    act(() => actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1", ...fields }))
    await act(async () => { expect(await actions.handleNewSurgery()).toBe(false) })
    expect(apiFetchMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalled()
  })

  it("accepts institution-derived geography without claiming a manual location write", async () => {
    storeMock.getContactoById.mockReturnValue({ id: "institution-1", provincia: "Corrientes", localidad: "Goya" })
    apiFetchMock.mockResolvedValue({ id: "db-1", visibleNumber: "CX-9001" })
    fetchBackendActiveSurgeriesMock.mockResolvedValue([])
    act(() => actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1", institutionContactId: "institution-1", provincia: "Corrientes", localidad: "Goya", date: "2026-10-07" }))
    await act(async () => { await actions.handleNewSurgery() })
    expect(JSON.parse(apiFetchMock.mock.calls[0][1].body)).toMatchObject({ institutionId: "institution-1", surgeryDate: "2026-10-07T03:00:00.000Z", surgeryTimeSpecified: false })
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

    let result: Awaited<ReturnType<ActionsHandle["handleNewSurgery"]>> = false
    await act(async () => {
      result = await actions.handleNewSurgery()
    })

    expect(result).toMatchObject({ surgeryId: "db-1", refreshFailed: true })
    expect(storeMock.createSurgery).not.toHaveBeenCalled()
    expect(storeMock.replaceSurgeries).not.toHaveBeenCalled()
    expect(storeState.surgeries).toEqual([])
    expect(actions.createdSurgeryId).toBe("db-1")
    expect(storeMock.createBudgetForSurgery).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith("backend caído")
  })

  it("posts the optional budget with the persisted surgery ID even when refresh fails", async () => {
    apiFetchMock.mockResolvedValueOnce({ id: "db-1", visibleNumber: "CX-9001" })
      .mockResolvedValueOnce({ id: "pr-1" })
    fetchBackendActiveSurgeriesMock.mockRejectedValue(new Error("backend caído"))
    act(() => {
      actions.setNewForm({ ...EMPTY_NEW_FORM, patient: "Paciente Test", patientContactId: "patient-1" })
      actions.setCreatePRNow(true)
    })
    await act(async () => { await actions.handleNewSurgery() })
    expect(apiFetchMock).toHaveBeenCalledWith("/api/companies/company-1/presupuestos", expect.objectContaining({
      method: "POST", body: expect.any(String),
    }))
    expect(JSON.parse(apiFetchMock.mock.calls[1][1].body)).toMatchObject({
      surgeryId: "db-1", clientContactId: "payer-1", generalDiscountRate: 5,
      commercial: { pricingMode: "ESTIMATIVE" },
      items: [{ description: "Implant", quantity: 2, unitPrice: 100, discountPercent: 10, vatRate: 21, metadata: { catalogItemId: "catalog-1" } }],
    })
    expect(storeMock.createBudgetForSurgery).not.toHaveBeenCalled()
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

    let result: Awaited<ReturnType<ActionsHandle["handleNewSurgery"]>> = false
    await act(async () => {
      result = await actions.handleNewSurgery()
    })

    await waitFor(() => {
      expect(actions.createdSurgeryId).toBe("db-1")
    })

    expect(result).toMatchObject({ surgeryId: "db-1", budget: "not-requested", refreshFailed: false })
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

    let firstCreate!: ReturnType<ActionsHandle["handleNewSurgery"]>
    let secondCreate!: ReturnType<ActionsHandle["handleNewSurgery"]>
    act(() => {
      firstCreate = actions.handleNewSurgery()
      secondCreate = actions.handleNewSurgery()
    })

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(fetchBackendActiveSurgeriesMock).not.toHaveBeenCalled()

    let firstResult: Awaited<typeof firstCreate> = false
    let secondResult: Awaited<typeof secondCreate> = false
    await act(async () => {
      resolvePost({ id: "db-1", visibleNumber: "CX-9001" })
      ;[firstResult, secondResult] = await Promise.all([firstCreate, secondCreate])
    })

    await waitFor(() => {
      expect(actions.createdSurgeryId).toBe("db-1")
    })

    expect(firstResult).toMatchObject({ surgeryId: "db-1" })
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

  it.each(["missing", "unverified", "confirmed"] as const)("reconciles a failed budget response as %s without recreating surgery", async (status) => {
    apiFetchMock.mockResolvedValueOnce({ id: "db-1", visibleNumber: "CX-9001" })
      .mockRejectedValueOnce(status === "missing" ? new ApiClientError("Rejected", 422) : new Error("Response lost"))
    if (status === "unverified") apiFetchMock.mockRejectedValueOnce(new Error("Offline"))
    else apiFetchMock.mockResolvedValueOnce(status === "confirmed" ? [{ id: "pr-1" }] : [])
    fetchBackendActiveSurgeriesMock.mockResolvedValue([makeBackendSurgery()])
    act(() => {
      actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1", patient: "Keep patient", notes: "Keep notes" })
      actions.setCreatePRNow(true)
    })
    let result: unknown
    await act(async () => { result = await actions.handleNewSurgery() })
    expect(result).toMatchObject({ surgeryId: "db-1", budget: status })
    expect(apiFetchMock).toHaveBeenCalledWith("/api/companies/company-1/presupuestos?surgeryId=db-1&take=1")
    expect(actions.newForm.notes).toBe("Keep notes")
    await act(async () => { await actions.handleNewSurgery() })
    expect(apiFetchMock).toHaveBeenCalledTimes(3)
    if (status !== "confirmed") expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it.each([new Error("Response lost"), new ApiClientError("Server failed", 500)])("keeps an ambiguous budget unverified after an empty read", async (error) => {
    apiFetchMock.mockResolvedValueOnce({ id: "db-1", visibleNumber: "CX-9001" })
      .mockRejectedValueOnce(error).mockResolvedValueOnce([])
    fetchBackendActiveSurgeriesMock.mockResolvedValue([makeBackendSurgery()])
    act(() => {
      actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1" })
      actions.setCreatePRNow(true)
    })
    let result: unknown
    await act(async () => { result = await actions.handleNewSurgery() })
    expect(result).toMatchObject({ budget: "unverified" })
  })

  it("does not claim an attachment succeeded after upload failure", async () => {
    apiFetchMock.mockResolvedValueOnce({ id: "db-1", visibleNumber: "CX-9001" })
      .mockRejectedValueOnce(new Error("Upload failed"))
    fetchBackendActiveSurgeriesMock.mockResolvedValue([makeBackendSurgery()])
    act(() => { actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1" }) })
    let result: unknown
    await act(async () => { result = await actions.handleNewSurgery({ authorizationFile: new File(["x"], "auth.png") }) })
    expect(result).toMatchObject({ attachment: "unverified", surgeryId: "db-1" })
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(toastWarningMock).toHaveBeenCalled()
  })

  it.each([new Error("Response lost"), new ApiClientError("Server failed", 500)])("does not replay an unverified initial surgery write", async (error) => {
    apiFetchMock.mockRejectedValue(error)
    act(() => { actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1", notes: "Keep this draft" }) })
    await act(async () => { await actions.handleNewSurgery() })
    await act(async () => { await actions.handleNewSurgery() })
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(actions.newForm.notes).toBe("Keep this draft")
    expect(toastErrorMock).toHaveBeenLastCalledWith(expect.stringContaining("verificar"))
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it("allows correction and retry after a definitive surgery validation rejection", async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiClientError("Invalid patient", 400))
      .mockResolvedValueOnce({ id: "db-1", visibleNumber: "CX-9001" })
    fetchBackendActiveSurgeriesMock.mockResolvedValue([makeBackendSurgery()])
    act(() => { actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1" }) })
    await act(async () => { await actions.handleNewSurgery() })
    await act(async () => { await actions.handleNewSurgery() })
    expect(apiFetchMock).toHaveBeenCalledTimes(2)
    expect(actions.createdSurgeryId).toBe("db-1")
  })

  it.each(["company", "close"])("does not replace the store with stale refresh results after %s change", async (change) => {
    let resolveRefresh!: (value: Surgery[]) => void
    apiFetchMock.mockResolvedValue({ id: "db-1", visibleNumber: "CX-9001" })
    fetchBackendActiveSurgeriesMock.mockImplementation(() => new Promise(resolve => { resolveRefresh = resolve }))
    act(() => { actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1" }) })
    let pending!: ReturnType<ActionsHandle["handleNewSurgery"]>
    await act(async () => { pending = actions.handleNewSurgery() })
    expect(actions.createdSurgeryId).toBe("db-1")
    act(() => {
      if (change === "company") {
        useAuthMock.mockReturnValue({ activeCompany: { id: "company-2" } })
        actions.setWizardStep(1)
      } else actions.setNewDialogOpen(false)
    })
    await act(async () => { resolveRefresh([makeBackendSurgery()]); await pending })
    expect(actions.createdSurgeryId).toBeUndefined()
    expect(storeMock.replaceSurgeries).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it.each(["company", "close"])("ignores pending intake after %s change", async (change) => {
    let resolvePost!: (value: unknown) => void
    apiFetchMock.mockImplementation(() => new Promise(resolve => { resolvePost = resolve }))
    act(() => {
      actions.setNewForm({ ...EMPTY_NEW_FORM, patientContactId: "patient-1" })
      actions.setCreatePRNow(true)
    })
    let pending!: ReturnType<ActionsHandle["handleNewSurgery"]>
    act(() => { pending = actions.handleNewSurgery() })
    act(() => {
      if (change === "company") {
        useAuthMock.mockReturnValue({ activeCompany: { id: "company-2" } })
        actions.setWizardStep(1)
      } else actions.setNewDialogOpen(false)
    })
    await act(async () => { resolvePost({ id: "db-1", visibleNumber: "CX-9001" }); await pending })
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(actions.createdSurgeryId).toBeUndefined()
    expect(storeMock.replaceSurgeries).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })
})
