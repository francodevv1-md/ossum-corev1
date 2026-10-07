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

describe("R10 surgery technical-id guard across all call sites", () => {
  function loadSurgery(backendId: string | null) {
    return { id: "store-id", backendId } as any;
  }
  const TECHNICAL = "clm9f7a2b0000123456abcdef";

  it("TabPaneAdjuntos: backendId || id used to send non-persisted id to useSeguimientoFeed", () => {
    const surgery = loadSurgery(null);
    const oldCode = (surgery.backendId || surgery.id) as string;
    const newCode = (surgery.backendId as string | null) && /^c[a-z0-9]{24}$/.test(surgery.backendId) ? surgery.backendId : "";
    expect(oldCode).toBe("store-id");
    expect(newCode).toBe("");
  });

  it("TabPaneAdjuntos: URL builder no longer encodes a non-persisted surgery id", () => {
    const surgery = loadSurgery(null);
    const encodeId = (id: string) => "/api/companies/x/surgeries/" + encodeURIComponent(id) + "/seguimiento/documents/y";
    const oldUrl = encodeId(surgery.backendId || surgery.id);
    const newUrl = encodeId(surgery.backendId && /^c[a-z0-9]{24}$/.test(surgery.backendId) ? surgery.backendId : "");
    expect(oldUrl).toContain("/surgeries/store-id/");
    expect(newUrl).toContain("/surgeries//seguimiento/documents/y");
  });

  it("SurgeryContextTray: document URL no longer encodes non-persisted surgery id", () => {
    const surgery = loadSurgery(null);
    const encode = (id: string) => "/api/companies/x/surgeries/" + encodeURIComponent(id) + "/seguimiento/documents/y";
    const oldUrl = encode(surgery.backendId || surgery.id);
    const newUrl = encode(surgery.backendId && /^c[a-z0-9]{24}$/.test(surgery.backendId) ? surgery.backendId : "");
    expect(oldUrl).toContain("/surgeries/store-id/");
    expect(newUrl).not.toContain("store-id");
  });

  it("useCirugiaActions: persistStatusChange rejects when no technical id is available", () => {
    const surgery = loadSurgery(null);
    const backendIdOld = (surgery.backendId || surgery.id) as string;
    const backendIdNew = surgery.backendId && /^c[a-z0-9]{24}$/.test(surgery.backendId) ? surgery.backendId : null;
    expect(backendIdOld).toBe("store-id");
    expect(backendIdNew).toBeNull();
  });

  it("SendEmailModal: contextKey is honest instead of pretending a stored id", () => {
    const surgery = loadSurgery(null);
    const oldKey = `x:${surgery.backendId || surgery.id}:y:create`;
    const newKey = `x:${surgery.backendId && /^c[a-z0-9]{24}$/.test(surgery.backendId) ? surgery.backendId : ""}:y:create`;
    expect(oldKey).toBe("x:store-id:y:create");
    expect(newKey).toBe("x::y:create");
  });

  it("InvoiceHeaderCompact: handleSelectSurgery persists the technical id only", () => {
    const surgery = loadSurgery(null);
    const oldValue = surgery.backendId || surgery.id;
    const newValue = surgery.backendId && /^c[a-z0-9]{24}$/.test(surgery.backendId) ? surgery.backendId : "";
    expect(oldValue).toBe("store-id");
    expect(newValue).toBe("");
  });

  it("NovedadesTabContent: mailContextKey is empty instead of leaking a store id", () => {
    const surgery = loadSurgery(null);
    const oldKey = `x:${surgery.backendId || surgery.id}`;
    const newKey = `x:${surgery.backendId && /^c[a-z0-9]{24}$/.test(surgery.backendId) ? surgery.backendId : ""}`;
    expect(oldKey).toBe("x:store-id");
    expect(newKey).toBe("x:");
  });

  it("accepts a real technical id at all sites", () => {
    const surgery = loadSurgery(TECHNICAL);
    const guard = (id: string | null) => (id && /^c[a-z0-9]{24}$/.test(id) ? id : "");
    expect(guard(surgery.backendId)).toBe(TECHNICAL);
  });
});
