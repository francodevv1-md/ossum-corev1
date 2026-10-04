import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/companies/[companyId]/ordenes-compra/[ordenCompraId]/recibir/route";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), receive: vi.fn() }));
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/services/orden-compra.service", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/services/orden-compra.service")>(), recibirOrdenCompra: mocks.receive }));

const payload = { location: "QA destination", operationKey: "stable-operation", receivedByItem: [{ itemId: "owned-item", received: "1" }] };
const run = (body: unknown = payload) => POST(new Request("http://mock.invalid/recibir", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ companyId: "company", ordenCompraId: "oc" }) });
describe("physical OC receiving route (MOCKED Auth/service; actual existing stock guard, no HTTP/DB)", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.receive.mockResolvedValue({ id: "oc" }); });
  it("rejects coordinator 403 before body parsing/service", async () => {
    mocks.auth.mockResolvedValue({ companyId: "company", actorUserId: "actor", role: "coordinator", canonicalRole: "coordinator" });
    expect((await run({})).status).toBe(403); expect(mocks.receive).not.toHaveBeenCalled();
  });
  it.each(["admin", "logistics"])("allows %s and forwards explicit scoped intent", async role => {
    mocks.auth.mockResolvedValue({ companyId: "company", actorUserId: "actor", role, canonicalRole: role });
    expect((await run()).status).toBe(200);
    expect(mocks.receive).toHaveBeenCalledWith({ ...payload, companyId: "company", ordenCompraId: "oc", updatedById: "actor", prisma: {} });
  });
  it("rejects the old quantity-only contract", async () => {
    mocks.auth.mockResolvedValue({ companyId: "company", actorUserId: "actor", role: "admin", canonicalRole: "admin" });
    expect((await run({ receivedByItem: payload.receivedByItem })).status).toBe(400); expect(mocks.receive).not.toHaveBeenCalled();
  });
});
