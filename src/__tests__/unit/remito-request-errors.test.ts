import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/errors"
import { errorResponse } from "@/lib/api/responses"
import { DevolucionError } from "@/lib/services/devolucion.service"
import { emitirRemito, registrarDevolucion } from "@/lib/services/remito.service"
import { POST as emit } from "@/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route"
import { POST as returned } from "@/app/api/companies/[companyId]/remitos/[remitoId]/devolucion/route"

const auth = vi.hoisted(() => ({ read: vi.fn(), guard: vi.fn() }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: auth.read }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: auth.guard }))
vi.mock("@/lib/prisma", () => ({ default: { testDatabase: true } }))
vi.mock("@/lib/services/remito.service", async (original) => ({ ...await original<typeof import("@/lib/services/remito.service")>(), emitirRemito: vi.fn(), registrarDevolucion: vi.fn() }))
const context = () => ({ params: Promise.resolve({ companyId: "company", remitoId: "remito" }) })
const request = (body: string) => new Request("http://localhost/api/companies/company/remitos/remito", { method: "POST", body })

describe("Remito route error contracts", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    auth.read.mockResolvedValue({ companyId: "company", actorUserId: "actor", role: "logistica" })
    vi.mocked(emitirRemito).mockResolvedValue({ id: "remito" } as never)
  })
  it.each(["{", '{"cajasDispatch":', "undefined"])('maps malformed emission JSON %j to 400 without mutation', async (body) => {
    const result = await emit(request(body), context())
    expect(result.status).toBe(400)
    await expect(result.json()).resolves.toEqual({ error: { code: "invalid_json_body", message: "Invalid JSON body" } })
    expect(emitirRemito).not.toHaveBeenCalled()
  })
  it.each(["", " ", "{}"])("preserves supported optional emission body %j", async (body) => {
    expect((await emit(request(body), context())).status).toBe(200)
    expect(emitirRemito).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company", remitoId: "remito", updatedById: "actor" }))
  })
  it("keeps valid JSON schema rejection distinct from malformed JSON", async () => {
    const result = await emit(request('{"cajasDispatch":null}'), context())
    expect(result.status).toBe(400)
    expect((await result.json()).error.code).toBe("validation_failed")
    expect(emitirRemito).not.toHaveBeenCalled()
  })
  it.each([["devolucion_invalid_transition", 409], ["devolucion_not_found", 404], ["invalid_quantity", 400]] as const)("preserves canonical return error %s/%i through Remito HTTP", async (code, status) => {
    vi.mocked(registrarDevolucion).mockRejectedValue(new DevolucionError(code, "Canonical return rejected", status))
    const result = await returned(request(JSON.stringify({ items: [{ itemId: "item", returnedQuantity: "1" }] })), context())
    expect(result.status).toBe(status)
    await expect(result.json()).resolves.toEqual({ error: { code, message: "Canonical return rejected" } })
  })
  it("serializes Devolucion errors once through incumbent ApiError rather than endpoint mappings", async () => {
    const error = new DevolucionError("devolucion_conflict", "Conflict", 409)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe("DevolucionError")
    const result = errorResponse(error)
    expect(result.status).toBe(409)
    expect((await result.json()).error.code).toBe("devolucion_conflict")
  })
  it("still hides unknown internal errors", async () => {
    vi.mocked(registrarDevolucion).mockRejectedValue(new Error("Internal database detail"))
    const result = await returned(request(JSON.stringify({ items: [{ itemId: "item", returnedQuantity: "1" }] })), context())
    expect(result.status).toBe(500)
    await expect(result.json()).resolves.toEqual({ error: { code: "internal_error", message: "Internal server error" } })
  })
})
