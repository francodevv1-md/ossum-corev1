import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-1" }, user: { id: "user-1", name: "QA" } }) }))
const updateBackendSurgeryState = vi.fn()
const mapApiSurgeryListToSurgeries = vi.fn()
vi.mock("@/lib/api/backend-surgeries", () => ({
  fetchBackendActiveSurgeries: vi.fn(),
  updateBackendSurgeryManagement: vi.fn(),
  updateBackendSurgeryState: (...args: unknown[]) => updateBackendSurgeryState(...args),
}))
vi.mock("@/lib/api/surgery-adapter", () => ({
  mapApiSurgeryListToSurgeries: (...args: unknown[]) => mapApiSurgeryListToSurgeries(...args),
}))
vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn() }))
vi.mock("@/hooks/usePresupuestoForm", () => ({ usePresupuestoForm: () => ({ formData: {}, items: [], setFormData: vi.fn(), resetForm: vi.fn(), validate: () => true, subtotal: 0, descuentoMonto: 0, total: 0 }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))

import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import { useOrtoTrackStore } from "@/lib/store"
import type { Surgery } from "@/types"

function makeSurgery(state: Surgery["state"]): Surgery {
  return {
    id: "CX-1",
    state,
    date: "2026-10-07",
    time: "08:00",
    patient: "Paciente QA",
    institution: "Sanatorio QA",
    client: "OS QA",
    surgeon: "Dr QA",
    classification: "Otro",
    preparationState: "Sin preparar",
    urgente: false,
    backendId: "backend-1",
  } as Surgery
}

describe("surgery status handlers persist before local mutation", () => {
  beforeEach(() => {
    useOrtoTrackStore.getState().replaceSurgeries([])
    updateBackendSurgeryState.mockReset()
    mapApiSurgeryListToSurgeries.mockReset()
  })

  it("handleChangeState persists new state to backend before mutating the store", async () => {
    useOrtoTrackStore.getState().replaceSurgeries([makeSurgery("Pendiente")])
    const mapped = makeSurgery("Autorizada")
    updateBackendSurgeryState.mockResolvedValue({ id: "backend-1", cxStatus: "authorized" })
    mapApiSurgeryListToSurgeries.mockReturnValue([mapped])
    const { result } = renderHook(() => useCirugiaActions())
    act(() => { result.current.setDialogSurgery(makeSurgery("Pendiente")) })
    await act(async () => { await result.current.handleChangeState() })
    expect(updateBackendSurgeryState).toHaveBeenCalledWith("company-1", "backend-1", "Pendiente", "cirugias-ui:change-state")
    expect(useOrtoTrackStore.getState().getSurgeryById("CX-1")?.state).toBe("Autorizada")
  })

  it("does not mutate the store when the backend rejects the change", async () => {
    useOrtoTrackStore.getState().replaceSurgeries([makeSurgery("Autorizada")])
    updateBackendSurgeryState.mockRejectedValue(new Error("cxStatus: terminal Cancelled"))
    const { result } = renderHook(() => useCirugiaActions())
    act(() => { result.current.setDialogSurgery(makeSurgery("Autorizada")); result.current.setNewState("Suspendida") })
    await act(async () => { await result.current.handleChangeState() })
    expect(updateBackendSurgeryState).toHaveBeenCalledOnce()
    expect(useOrtoTrackStore.getState().getSurgeryById("CX-1")?.state).toBe("Autorizada")
  })

  it("handleSuspend persists before store update", async () => {
    useOrtoTrackStore.getState().replaceSurgeries([makeSurgery("Autorizada")])
    const mapped = makeSurgery("Suspendida")
    updateBackendSurgeryState.mockResolvedValue({ id: "backend-1", cxStatus: "suspended" })
    mapApiSurgeryListToSurgeries.mockReturnValue([mapped])
    const { result } = renderHook(() => useCirugiaActions())
    const surgery = makeSurgery("Autorizada")
    act(() => { result.current.setDialogSurgery(surgery); result.current.setSuspendDialogOpen(true) })
    await act(async () => { await result.current.handleSuspend() })
    expect(updateBackendSurgeryState).toHaveBeenCalledWith("company-1", "backend-1", "Suspendida", "cirugias-ui:suspend")
    expect(useOrtoTrackStore.getState().getSurgeryById("CX-1")?.state).toBe("Suspendida")
  })

  it("handleCancel persists before store update", async () => {
    useOrtoTrackStore.getState().replaceSurgeries([makeSurgery("Pendiente")])
    const mapped = makeSurgery("Cancelada")
    updateBackendSurgeryState.mockResolvedValue({ id: "backend-1", cxStatus: "cancelled" })
    mapApiSurgeryListToSurgeries.mockReturnValue([mapped])
    const { result } = renderHook(() => useCirugiaActions())
    const surgery = makeSurgery("Pendiente")
    act(() => { result.current.setDialogSurgery(surgery); result.current.setCancelDialogOpen(true) })
    await act(async () => { await result.current.handleCancel() })
    expect(updateBackendSurgeryState).toHaveBeenCalledWith("company-1", "backend-1", "Cancelada", "cirugias-ui:cancel")
    expect(useOrtoTrackStore.getState().getSurgeryById("CX-1")?.state).toBe("Cancelada")
  })

  it("handleRecover from Suspendida persists Pendiente", async () => {
    useOrtoTrackStore.getState().replaceSurgeries([makeSurgery("Suspendida")])
    const mapped = makeSurgery("Pendiente")
    updateBackendSurgeryState.mockResolvedValue({ id: "backend-1", cxStatus: "pending" })
    mapApiSurgeryListToSurgeries.mockReturnValue([mapped])
    const { result } = renderHook(() => useCirugiaActions())
    await act(async () => { await result.current.handleRecover(makeSurgery("Suspendida")) })
    expect(updateBackendSurgeryState).toHaveBeenCalledWith("company-1", "backend-1", "Pendiente", "cirugias-ui:recover")
    expect(useOrtoTrackStore.getState().getSurgeryById("CX-1")?.state).toBe("Pendiente")
  })
})
