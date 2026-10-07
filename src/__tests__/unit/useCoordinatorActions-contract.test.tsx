import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Surgery } from "@/types"
const mocks = vi.hoisted(() => ({ note: vi.fn(), success: vi.fn(), error: vi.fn(), role: "admin" }))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-1" }, user: { id: "actor" }, currentAccess: { role: mocks.role } }) }))
vi.mock("@/lib/api/backend-surgeries", () => ({ addBackendSurgeryNote: mocks.note }))
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }))
vi.mock("@/components/coordinadores/modal/CoordinatorActionConfirmDialog", () => ({ CoordinatorActionConfirmDialog: () => null }))
import { useCoordinatorActions } from "@/hooks/useCoordinatorActions"
const surgery = { id: "ui-1", backendId: "c123456789012345678901234", coordinadorCx: "Alex" } as Surgery
describe("coordination operational action truth", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.role = "admin" })
  it("keeps the request open on backend failure and never claims success", async () => {
    mocks.note.mockRejectedValueOnce(new Error("Denied by backend"))
    const { result } = renderHook(useCoordinatorActions)
    act(() => result.current.requestDate(surgery))
    await act(async () => result.current.executeConfirmedAction("Please confirm"))
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith("Denied by backend")
    expect(result.current.confirmState.isOpen).toBe(true)
  })
  it("confirms only the persisted request, never delivery, and uses the backend ID", async () => {
    mocks.note.mockResolvedValueOnce({ id: "entry" })
    const { result } = renderHook(useCoordinatorActions)
    act(() => result.current.requestDate(surgery))
    await act(async () => result.current.executeConfirmedAction())
    expect(mocks.note).toHaveBeenCalledWith("company-1", "c123456789012345678901234", expect.objectContaining({ noteType: "Coordinación" }))
    expect(mocks.success).toHaveBeenCalledWith("Solicitud registrada en Seguimiento")
    expect(result.current.confirmState.isOpen).toBe(false)
    expect(result.current.canNotify).toBe(false)
  })
  it("does not open or execute unsupported roles", async () => {
    mocks.role = "manager"
    const { result } = renderHook(useCoordinatorActions)
    act(() => result.current.requestDate(surgery))
    await act(async () => result.current.executeConfirmedAction())
    expect(result.current.confirmState.isOpen).toBe(false)
    expect(mocks.note).not.toHaveBeenCalled()
  })
})
