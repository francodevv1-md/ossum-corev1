import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import type { Surgery } from "@/types"

const {
  updateBackendSurgeryManagementMock,
  storeMock,
  storeState,
  toastSuccessMock,
  toastErrorMock,
  useOrtoTrackStoreMock,
  useAuthMock,
} = vi.hoisted(() => ({
  updateBackendSurgeryManagementMock: vi.fn(),
  storeState: {
    surgeries: [] as Surgery[],
  },
  storeMock: {
    surgeries: [] as Surgery[],
    instrumentadores: [],
    updateSurgery: vi.fn(),
    changeSurgeryDate: vi.fn(),
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

vi.mock("@/lib/api/backend-surgeries", () => ({
  fetchBackendActiveSurgeries: vi.fn(),
  updateBackendSurgeryManagement: updateBackendSurgeryManagementMock,
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
    warning: vi.fn(),
  },
}))

vi.mock("@/lib/businessRules", () => ({
  canAutorizarFV: vi.fn(() => true),
  canRemitirNR: vi.fn(() => true),
  canCargarConsumo: vi.fn(() => true),
}))

const sampleSurgery: Surgery = {
  id: "CX-1001",
  backendId: "backend-cx-1001",
  visibleNumber: "CX-1001",
  patient: "Juan Perez",
  patientDni: "12345678",
  surgeon: "Dr. Test",
  institution: "Clinica Test",
  institutionCity: "Buenos Aires",
  procedure: "Artroplastia",
  date: "2026-08-10",
  time: "09:00",
  state: "Pendiente",
  client: "OSDE",
  classification: "Prótesis de cadera",
  preparationState: "Sin preparar",
  facturado: false,
  autorizado: false,
  urgente: false,
  leyendaDestacada: false,
  referenciasAdministrativas: [],
}

function TestHarness({
  onHookReady,
}: {
  onHookReady: (hook: ReturnType<typeof useCirugiaActions>) => void
}) {
  const hook = useCirugiaActions()
  onHookReady(hook)
  return null
}

describe("useCirugiaActions - handleChangeDate", () => {
  let hookInstance: ReturnType<typeof useCirugiaActions>
  let renderResult: ReturnType<typeof render>

  beforeEach(() => {
    vi.clearAllMocks()
    storeState.surgeries = [{ ...sampleSurgery }]
    storeMock.surgeries = storeState.surgeries

    useOrtoTrackStoreMock.mockImplementation((selector?: (state: typeof storeMock) => unknown) => {
      if (typeof selector === "function") {
        return selector(storeMock)
      }
      return storeMock
    })
    useOrtoTrackStoreMock.getState.mockReturnValue(storeMock)

    useAuthMock.mockReturnValue({
      activeCompany: { id: "company-test-1", name: "Empresa Test" },
      currentUser: { id: "user-1", displayName: "Tester" },
    })

    renderResult = render(<TestHarness onHookReady={(h) => { hookInstance = h }} />)
  })

  it("changes only shipping using a UTC date anchor", async () => {
    updateBackendSurgeryManagementMock.mockResolvedValueOnce({ id: "backend-cx-1001", materialShippingDate: "2026-08-21T00:00:00Z" })
    act(() => hookInstance.openChangeDateDialog(sampleSurgery))
    act(() => hookInstance.setDateType("shipping"))
    act(() => hookInstance.setNewDate("2026-08-21"))
    await act(async () => { await hookInstance.handleChangeDate() })
    expect(updateBackendSurgeryManagementMock).toHaveBeenCalledWith("company-test-1", "backend-cx-1001", { materialShippingDate: "2026-08-21" })
    expect(storeMock.updateSurgery).toHaveBeenCalledWith("CX-1001", { fechaEnvioMaterial: "2026-08-21" })
  })

  it("updates date and explicit time server-first in America/Argentina/Buenos_Aires offset (-03:00)", async () => {
    updateBackendSurgeryManagementMock.mockResolvedValueOnce({
      id: "backend-cx-1001",
      visibleNumber: "CX-1001",
      surgeryDate: "2026-08-21T17:30:00.000Z", // 14:30 in UTC-3
      surgeryTimeSpecified: true,
      cxStatus: "pending",
    })

    act(() => {
      hookInstance.setDialogSurgery(sampleSurgery)
      hookInstance.setNewDate("2026-08-21")
      hookInstance.setNewTime("14:30")
    })

    await act(async () => {
      await hookInstance.handleChangeDate()
    })

    expect(updateBackendSurgeryManagementMock).toHaveBeenCalledTimes(1)
    expect(updateBackendSurgeryManagementMock).toHaveBeenCalledWith(
      "company-test-1",
      "backend-cx-1001",
      {
        surgeryDate: "2026-08-21T17:30:00.000Z",
        surgeryTimeSpecified: true,
      }
    )

    // Hydrates store without calling changeSurgeryDate (which has fictitious local audit)
    expect(storeMock.updateSurgery).toHaveBeenCalledTimes(1)
    expect(storeMock.updateSurgery).toHaveBeenCalledWith("CX-1001", {
      date: "2026-08-21",
      time: "14:30",
      surgeryTimeSpecified: true,
    })
    expect(storeMock.changeSurgeryDate).not.toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalledWith("Fecha actualizada")
    expect(hookInstance.changeDateDialogOpen).toBe(false)
  })

  it("updates date without time (sin hora) anchored at technical midnight in Argentina (-03:00 -> 03:00Z)", async () => {
    updateBackendSurgeryManagementMock.mockResolvedValueOnce({
      id: "backend-cx-1001",
      visibleNumber: "CX-1001",
      surgeryDate: "2026-08-21T03:00:00.000Z", // 00:00 in UTC-3
      surgeryTimeSpecified: false,
      cxStatus: "pending",
    })

    act(() => {
      hookInstance.setDialogSurgery(sampleSurgery)
      hookInstance.setNewDate("2026-08-21")
      hookInstance.setNewTime("") // sin hora
    })

    await act(async () => {
      await hookInstance.handleChangeDate()
    })

    expect(updateBackendSurgeryManagementMock).toHaveBeenCalledWith(
      "company-test-1",
      "backend-cx-1001",
      {
        surgeryDate: "2026-08-21T03:00:00.000Z",
        surgeryTimeSpecified: false,
      }
    )

    expect(storeMock.updateSurgery).toHaveBeenCalledWith("CX-1001", {
      date: "2026-08-21",
      time: "",
      surgeryTimeSpecified: false,
    })
    expect(toastSuccessMock).toHaveBeenCalledWith("Fecha actualizada")
  })

  it("distinguishes explicit midnight (00:00) with surgeryTimeSpecified: true", async () => {
    updateBackendSurgeryManagementMock.mockResolvedValueOnce({
      id: "backend-cx-1001",
      visibleNumber: "CX-1001",
      surgeryDate: "2026-08-21T03:00:00.000Z",
      surgeryTimeSpecified: true,
      cxStatus: "pending",
    })

    act(() => {
      hookInstance.setDialogSurgery(sampleSurgery)
      hookInstance.setNewDate("2026-08-21")
      hookInstance.setNewTime("00:00")
    })

    await act(async () => {
      await hookInstance.handleChangeDate()
    })

    expect(updateBackendSurgeryManagementMock).toHaveBeenCalledWith(
      "company-test-1",
      "backend-cx-1001",
      {
        surgeryDate: "2026-08-21T03:00:00.000Z",
        surgeryTimeSpecified: true,
      }
    )

    expect(storeMock.updateSurgery).toHaveBeenCalledWith("CX-1001", {
      date: "2026-08-21",
      time: "00:00",
      surgeryTimeSpecified: true,
    })
  })

  it("protects against double submission while request is pending", async () => {
    let resolvePatch!: (v: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePatch = resolve
    })
    updateBackendSurgeryManagementMock.mockReturnValueOnce(pendingPromise)

    act(() => {
      hookInstance.setDialogSurgery(sampleSurgery)
      hookInstance.setNewDate("2026-08-21")
      hookInstance.setNewTime("10:00")
    })

    let firstCall: Promise<void>
    let secondCall: Promise<void>
    act(() => {
      firstCall = hookInstance.handleChangeDate()
      secondCall = hookInstance.handleChangeDate()
    })

    expect(updateBackendSurgeryManagementMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePatch({
        id: "backend-cx-1001",
        surgeryDate: "2026-08-21T13:00:00.000Z",
        surgeryTimeSpecified: true,
      })
      await Promise.all([firstCall, secondCall])
    })

    expect(updateBackendSurgeryManagementMock).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).toHaveBeenCalledTimes(1)
  })

  it("handles backend error: preserves dialog open, shows error, does not mutate store", async () => {
    updateBackendSurgeryManagementMock.mockRejectedValueOnce(new Error("Error en servidor al reprogramar"))

    act(() => {
      hookInstance.setDialogSurgery(sampleSurgery)
      hookInstance.setNewDate("2026-08-21")
      hookInstance.setNewTime("10:00")
      hookInstance.setChangeDateDialogOpen(true)
    })

    await act(async () => {
      await hookInstance.handleChangeDate()
    })

    expect(updateBackendSurgeryManagementMock).toHaveBeenCalledTimes(1)
    expect(storeMock.updateSurgery).not.toHaveBeenCalled()
    expect(storeMock.changeSurgeryDate).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith("Error en servidor al reprogramar")
    expect(hookInstance.dateChangeError).toBe("Error en servidor al reprogramar")
    expect(hookInstance.changeDateDialogOpen).toBe(true)
  })

  it("openChangeDateDialog populates date and time, clearing time if surgeryTimeSpecified is false", () => {
    act(() => {
      hookInstance.openChangeDateDialog({
        ...sampleSurgery,
        date: "2026-08-25",
        time: "11:30",
        surgeryTimeSpecified: false,
      })
    })

    expect(hookInstance.changeDateDialogOpen).toBe(true)
    expect(hookInstance.newDate).toBe("2026-08-25")
    expect(hookInstance.newTime).toBe("")
    expect(hookInstance.dateChangeError).toBeNull()

    act(() => {
      hookInstance.openChangeDateDialog({
        ...sampleSurgery,
        date: "2026-08-26",
        time: "11:30",
        surgeryTimeSpecified: true,
      })
    })

    expect(hookInstance.newDate).toBe("2026-08-26")
    expect(hookInstance.newTime).toBe("11:30")

    // Precision null does NOT preload time (Finding 6)
    act(() => {
      hookInstance.openChangeDateDialog({
        ...sampleSurgery,
        date: "2026-08-27",
        time: "11:30",
        surgeryTimeSpecified: null,
      })
    })

    expect(hookInstance.newDate).toBe("2026-08-27")
    expect(hookInstance.newTime).toBe("")
  })

  it("requires active company and technical backendId without local fallback or local-only success (Finding 3)", async () => {
    // 1. Missing active company
    useAuthMock.mockReturnValueOnce({
      activeCompany: null,
      currentUser: { id: "user-1", displayName: "Tester" },
    })

    act(() => {
      hookInstance.setDialogSurgery(sampleSurgery)
      hookInstance.setNewDate("2026-08-21")
      hookInstance.setNewTime("10:00")
    })

    await act(async () => {
      await hookInstance.handleChangeDate()
    })

    expect(updateBackendSurgeryManagementMock).not.toHaveBeenCalled()
    expect(storeMock.updateSurgery).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith("Se requiere una empresa activa para reprogramar la fecha quirúrgica")
    expect(hookInstance.dateChangeError).toBe("Se requiere una empresa activa para reprogramar la fecha quirúrgica")

    // 2. Missing technical backendId
    act(() => {
      hookInstance.setDialogSurgery({
        ...sampleSurgery,
        backendId: undefined,
      })
      storeMock.surgeries = []
    })

    await act(async () => {
      await hookInstance.handleChangeDate()
    })

    expect(updateBackendSurgeryManagementMock).not.toHaveBeenCalled()
    expect(storeMock.updateSurgery).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith("Se requiere el identificador técnico de backend para reprogramar la cirugía")
    expect(hookInstance.dateChangeError).toBe("Se requiere el identificador técnico de backend para reprogramar la cirugía")
  })

  it("associates pending responses to their operation context and protects against dialog mutation/closure if replaced (Finding 4)", async () => {
    let resolvePatch!: (v: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePatch = resolve
    })
    updateBackendSurgeryManagementMock.mockReturnValueOnce(pendingPromise)

    act(() => {
      hookInstance.openChangeDateDialog(sampleSurgery)
      hookInstance.setNewDate("2026-08-21")
      hookInstance.setNewTime("10:00")
    })

    let patchPromise: Promise<void>
    act(() => {
      patchPromise = hookInstance.handleChangeDate()
    })

    // User switches to a different surgery B while request A is in-flight
    const surgeryB: Surgery = {
      ...sampleSurgery,
      id: "CX-2002",
      backendId: "backend-cx-2002",
      date: "2026-09-01",
      time: "15:00",
      surgeryTimeSpecified: true,
    }
    act(() => {
      hookInstance.openChangeDateDialog(surgeryB)
    })

    // Resolve patch A
    await act(async () => {
      resolvePatch({
        id: "backend-cx-1001",
        surgeryDate: "2026-08-21T13:00:00.000Z",
        surgeryTimeSpecified: true,
      })
      await patchPromise
    })

    // Late response for surgery A is discarded because active dialog session belongs to surgery B
    expect(storeMock.updateSurgery).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()

    // But dialog for surgery B remains OPEN and preserved!
    expect(hookInstance.changeDateDialogOpen).toBe(true)
    expect(hookInstance.dialogSurgery?.id).toBe("CX-2002")
    expect(hookInstance.newDate).toBe("2026-09-01")
    expect(hookInstance.newTime).toBe("15:00")
  })

  it("controlled close: closeChangeDateDialog closes when idle and ignores when submitting (Finding 2)", async () => {
    let resolvePatch!: (v: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePatch = resolve
    })
    updateBackendSurgeryManagementMock.mockReturnValueOnce(pendingPromise)

    act(() => {
      hookInstance.openChangeDateDialog(sampleSurgery)
    })
    expect(hookInstance.changeDateDialogOpen).toBe(true)

    act(() => { hookInstance.setNewDate("2026-08-21") })
    let patchPromise: Promise<void>
    act(() => {
      patchPromise = hookInstance.handleChangeDate()
    })

    // Try to close while submitting -> ignored!
    act(() => {
      hookInstance.closeChangeDateDialog()
    })
    expect(hookInstance.changeDateDialogOpen).toBe(true)

    // Resolve
    await act(async () => {
      resolvePatch({
        id: "backend-cx-1001",
        surgeryDate: "2026-08-21T13:00:00.000Z",
        surgeryTimeSpecified: true,
      })
      await patchPromise
    })

    // Dialog closed after resolution
    expect(hookInstance.changeDateDialogOpen).toBe(false)
  })

  describe("Defecto 2: Identidad Asíncrona (generación, companyId, backendId)", () => {
    it("invalidates a pending save across A -> B -> A company transitions", async () => {
      let resolve!: (value: unknown) => void
      updateBackendSurgeryManagementMock.mockReturnValueOnce(new Promise((done) => { resolve = done }))
      act(() => { hookInstance.openChangeDateDialog(sampleSurgery); hookInstance.setNewDate("2026-08-21") })
      let pending!: Promise<void>
      act(() => { pending = hookInstance.handleChangeDate() })
      useAuthMock.mockReturnValue({ activeCompany: { id: "company-B" } })
      renderResult.rerender(<TestHarness onHookReady={(hook) => { hookInstance = hook }} />)
      useAuthMock.mockReturnValue({ activeCompany: { id: "company-test-1" } })
      renderResult.rerender(<TestHarness onHookReady={(hook) => { hookInstance = hook }} />)
      act(() => { hookInstance.openChangeDateDialog(sampleSurgery); hookInstance.setNewDate("2026-09-30") })
      await act(async () => { resolve({ id: "backend-cx-1001", surgeryDate: "2026-08-21T03:00:00Z", surgeryTimeSpecified: false }); await pending })
      expect(storeMock.updateSurgery).not.toHaveBeenCalled()
      expect(toastSuccessMock).not.toHaveBeenCalled()
      expect(hookInstance.changeDateDialogOpen).toBe(true)
      expect(hookInstance.newDate).toBe("2026-09-30")
    })
    it("late response after closing dialog: discards store hydration, toast, and dialog mutation", async () => {
      let resolvePatch!: (v: unknown) => void
      updateBackendSurgeryManagementMock.mockReturnValueOnce(new Promise((res) => { resolvePatch = res }))

      act(() => {
        hookInstance.openChangeDateDialog(sampleSurgery)
        hookInstance.setNewDate("2026-08-21")
      })

      let patchPromise: Promise<void>
      act(() => {
        patchPromise = hookInstance.handleChangeDate()
      })

      // Dialog is closed/dismissed
      act(() => {
        hookInstance.setChangeDateDialogOpen(false)
      })

      await act(async () => {
        resolvePatch({
          id: "backend-cx-1001",
          surgeryDate: "2026-08-21T13:00:00.000Z",
          surgeryTimeSpecified: true,
        })
        await patchPromise
      })

      // Must not hydrate store or toast when closed
      expect(storeMock.updateSurgery).not.toHaveBeenCalled()
      expect(toastSuccessMock).not.toHaveBeenCalled()
    })

    it("late response after reopening the same surgery: protects generation, does not close or overwrite newer session", async () => {
      let resolvePatch1!: (v: unknown) => void
      updateBackendSurgeryManagementMock.mockReturnValueOnce(new Promise((res) => { resolvePatch1 = res }))

      // Session 1: surgery A
      act(() => {
        hookInstance.openChangeDateDialog(sampleSurgery)
        hookInstance.setNewDate("2026-08-21")
        hookInstance.setNewTime("10:00")
      })

      let patchPromise1: Promise<void>
      act(() => {
        patchPromise1 = hookInstance.handleChangeDate()
      })

      // Session 2: User reopens surgery A with different newDate
      act(() => {
        hookInstance.openChangeDateDialog(sampleSurgery)
        hookInstance.setNewDate("2026-09-30")
        hookInstance.setNewTime("16:00")
      })

      // Resolve old patch from Session 1
      await act(async () => {
        resolvePatch1({
          id: "backend-cx-1001",
          surgeryDate: "2026-08-21T13:00:00.000Z",
          surgeryTimeSpecified: true,
        })
        await patchPromise1
      })

      // Old session 1 must NOT close Session 2's dialog or wipe its new inputs!
      expect(hookInstance.changeDateDialogOpen).toBe(true)
      expect(hookInstance.newDate).toBe("2026-09-30")
      expect(hookInstance.newTime).toBe("16:00")
      expect(storeMock.updateSurgery).not.toHaveBeenCalled()
      expect(toastSuccessMock).not.toHaveBeenCalled()
    })

    it("late error after switching surgery: does not set error or toast on different surgery", async () => {
      let rejectPatch!: (err: unknown) => void
      updateBackendSurgeryManagementMock.mockReturnValueOnce(new Promise((_, rej) => { rejectPatch = rej }))

      act(() => {
        hookInstance.openChangeDateDialog(sampleSurgery)
        hookInstance.setNewDate("2026-08-21")
      })

      let patchPromise: Promise<void>
      act(() => {
        patchPromise = hookInstance.handleChangeDate()
      })

      // Switch to surgery B
      const surgeryB: Surgery = {
        ...sampleSurgery,
        id: "CX-2002",
        backendId: "backend-cx-2002",
      }
      act(() => {
        hookInstance.openChangeDateDialog(surgeryB)
      })

      // Late error from surgery A
      await act(async () => {
        rejectPatch(new Error("Error de red en CX-1001"))
        await patchPromise
      })

      // Surgery B must NOT display surgery A's error and toastErrorMock must not fire
      expect(hookInstance.dateChangeError).toBeNull()
      expect(toastErrorMock).not.toHaveBeenCalled()
    })

    it("late response after switching company: does not hydrate or toast in different company", async () => {
      let resolvePatch!: (v: unknown) => void
      updateBackendSurgeryManagementMock.mockReturnValueOnce(new Promise((res) => { resolvePatch = res }))

      act(() => {
        hookInstance.openChangeDateDialog(sampleSurgery)
        hookInstance.setNewDate("2026-08-21")
      })

      let patchPromise: Promise<void>
      act(() => {
        patchPromise = hookInstance.handleChangeDate()
      })

      // Active company changes and harness is re-rendered
      useAuthMock.mockReturnValue({
        activeCompany: { id: "company-different-999" },
      })
      renderResult.rerender(<TestHarness onHookReady={(h) => { hookInstance = h }} />)

      await act(async () => {
        resolvePatch({
          id: "backend-cx-1001",
          surgeryDate: "2026-08-21T13:00:00.000Z",
          surgeryTimeSpecified: true,
        })
        await patchPromise
      })

      // Must not hydrate or toast when company switched
      expect(storeMock.updateSurgery).not.toHaveBeenCalled()
      expect(toastSuccessMock).not.toHaveBeenCalled()
    })
  })
})
