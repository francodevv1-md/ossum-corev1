import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { updateRemitoDraft } from "@/lib/api/remitos"
import { ApiClientError } from "@/lib/api/client"
import { PATCH } from "@/app/api/companies/[companyId]/remitos/[remitoId]/route"
import { POST as create } from "@/app/api/companies/[companyId]/remitos/route"
import { POST as returned } from "@/app/api/companies/[companyId]/remitos/[remitoId]/devolucion/route"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), guard: vi.fn(), update: vi.fn(), create: vi.fn(), returned: vi.fn() }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: vi.fn().mockResolvedValue("test-token") }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: mocks.guard, requireCompanyReadAccess: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ default: { testDatabase: true } }))
vi.mock("@/lib/services/remito.service", async (original) => ({ ...await original<typeof import("@/lib/services/remito.service")>(), updateRemitoDraft: mocks.update, createRemito: mocks.create, registrarDevolucion: mocks.returned }))
const context = () => ({ params: Promise.resolve({ companyId: "company", remitoId: "remito" }) })
const request = (body: unknown) => new Request("http://localhost/api/companies/company/remitos/remito", { method: "POST", body: JSON.stringify(body) })

describe("Remito real-client to route request contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ companyId: "company", actorUserId: "actor", role: "logistica" })
    mocks.update.mockResolvedValue({ id: "remito", companyId: "company" })
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => PATCH(new Request(`http://localhost${String(input)}`, init), context())))
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([{ surgeryId: null }, { metadata: { note: "Only metadata" } }, { items: [{ description: "Implant", quantity: "0.5" }] }])("sends partial PATCH %j through authenticated transport and unchanged route", async (payload) => {
    await expect(updateRemitoDraft("company", "remito", payload)).resolves.toEqual({ id: "remito", companyId: "company" })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ ...payload, companyId: "company", remitoId: "remito", updatedById: "actor" }))
    const init = vi.mocked(fetch).mock.calls[0][1]!
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token")
    expect(JSON.parse(init.body as string)).toEqual(payload)
    expect(mocks.guard).toHaveBeenCalledTimes(1)
  })
  it("preserves boundary error status/code in the client without reaching the update service", async () => {
    try {
      await updateRemitoDraft("company", "remito", { declaredValue: "0x10" })
      expect.fail("Invalid amount must reject")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError)
      expect(error).toMatchObject({ status: 400, code: "invalid_remito_draft_update_body" })
    }
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("normalizes surrounding whitespace without rounding exact decimal strings", async () => {
    await updateRemitoDraft("company", "remito", { declaredValue: " 99999999999999.9999 " })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ declaredValue: "99999999999999.9999" }))
  })
  it("blocks an unrepresentable create quantity before mutation", async () => {
    const result = await create(request({ branchId: "branch", origin: "manual", salidaReason: "cirugia", items: [{ description: "Implant", quantity: "0.00001" }] }), { params: Promise.resolve({ companyId: "company" }) })
    expect(result.status).toBe(400)
    expect((await result.json()).error.code).toBe("invalid_remito_body")
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it("blocks an unrepresentable return quantity before mutation", async () => {
    const result = await returned(request({ items: [{ itemId: "item", returnedQuantity: "100000000000000" }] }), context())
    expect(result.status).toBe(400)
    expect((await result.json()).error.code).toBe("invalid_remito_devolucion_body")
    expect(mocks.returned).not.toHaveBeenCalled()
  })
})
