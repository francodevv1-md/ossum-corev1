import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ListRemitosParams, RemitoApiRow } from "@/lib/api/remitos"
import { isTechnicalId } from "@/lib/api/ids"

const mocks = vi.hoisted(() => ({
  company: "company-a" as string | undefined,
  user: "user-a",
  authLoading: false,
  userLoading: false,
  authenticated: true,
  list: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: mocks.company ? { id: mocks.company } : null,
    currentUser: { id: mocks.user },
    isLoading: mocks.authLoading,
    currentUserLoading: mocks.userLoading,
    isAuthenticated: mocks.authenticated,
  }),
}))
vi.mock("@/lib/api/remitos", () => ({
  fetchRemitos: mocks.list,
  fetchRemito: vi.fn(),
  createRemito: vi.fn(),
  emitirRemito: vi.fn(),
  updateRemitoDraft: vi.fn(),
  updateRemitoState: vi.fn(),
  registrarRemitoDevolucion: vi.fn(),
}))

import { useRemitos } from "@/hooks/useRemitos"

const PERSISTED = "clm9f7a2b0000123456abcdef" // cuid-shaped, 25 chars, starts with c
const UUID = "550e8400-e29b-41d4-a716-446655440000"
const LONG_HEX = "0123456789abcdef0123456789"
const STORE_ID = "store-xyz-001" // contains a dash, but starts with "s" not "c", not uuid, not hex
const VISIBLE_NUMBER = "CX-0001"

function row(id: string): RemitoApiRow {
  return { id, companyId: "company-a", state: "Borrador", items: [] } as unknown as RemitoApiRow
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.company = "company-a"
  mocks.authLoading = false
  mocks.userLoading = false
  mocks.authenticated = true
  mocks.list.mockResolvedValue([row("r-1")])
})
afterEach(cleanup)

describe("R9 surgery technical-id guard", () => {
  it.each([PERSISTED, UUID, LONG_HEX])("accepts technical id %s and forwards it", async (id) => {
    expect(isTechnicalId(id)).toBe(true)
    const { result } = renderHook(() => useRemitos({ surgeryId: id, take: 50 }))
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(mocks.list).toHaveBeenCalledWith("company-a", expect.objectContaining({ surgeryId: id }))
  })

  it.each([
    ["store id", STORE_ID],
    ["visible number", VISIBLE_NUMBER],
    ["empty", ""],
    ["nullish", undefined as unknown as string],
  ])("rejects %s and skips the backend query", async (_label, value) => {
    expect(isTechnicalId(value)).toBe(false)
    const { result } = renderHook(() => useRemitos({ surgeryId: value, take: 50 }))
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(mocks.list).toHaveBeenCalledWith("company-a", expect.objectContaining({ surgeryId: undefined }))
  })

  it("exposes an honest empty list when no technical id is available", async () => {
    mocks.list.mockResolvedValueOnce([])
    const { result } = renderHook(() => useRemitos({ surgeryId: STORE_ID, take: 50 }))
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.remitos).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it("does not leak the rejected id into the filter object", async () => {
    renderHook(() => useRemitos({ surgeryId: STORE_ID, take: 50 }))
    await waitFor(() => expect(mocks.list).toHaveBeenCalled())
    const filters: ListRemitosParams = mocks.list.mock.calls[0][1]
    expect(filters.surgeryId).toBeUndefined()
  })
})
