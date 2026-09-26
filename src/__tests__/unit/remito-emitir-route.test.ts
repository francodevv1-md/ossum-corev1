import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), guard: vi.fn(), authorize: vi.fn(), durableDenied: vi.fn(), emitir: vi.fn(), activation: vi.fn(), dependencies: vi.fn(),
}));
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: mocks.guard }));
vi.mock("@/lib/permissions/c14/authorize-insert-writer", () => ({ authorize: mocks.authorize, WCB06_CONTRACT_IDS: ["a"] }));
vi.mock("@/lib/services/c14/durable-attempt-audit", () => ({ appendWcb06TransportAuthorizationDenied: mocks.durableDenied }));
vi.mock("@/lib/prisma", () => ({ default: { db: true } }));
vi.mock("@/lib/remito-verification/activation", () => ({ getRemitoActivationGate: mocks.activation }));
vi.mock("@/lib/remito-verification/issuance-runtime", () => ({ getRemitoIssuanceDependencies: mocks.dependencies }));
vi.mock("@/lib/services/remito.service", () => ({ REMITO_MUTATION_ROLES: ["admin", "coordinador", "coordinator", "logistica"], emitirRemito: mocks.emitir }));

import { POST } from "@/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route";

describe("POST Remito emitir route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ companyId: "c1", actorUserId: "u1", role: "admin" });
    mocks.authorize.mockResolvedValue({ bundleId: "WCB-06", companyId: "c1", actorId: "u1" });
    mocks.activation.mockResolvedValue({ flags: { remitoLocatorIssuanceWrites: true, remitoPublicPublicationWrites: true }, isCompanyDateEligible: () => true });
    mocks.dependencies.mockReturnValue({ keyring: true });
    mocks.emitir.mockResolvedValue({ id: "r1", state: "Emitido" });
  });

  it("authorizes exact company and roles before service and forwards only transport idempotency", async () => {
    const response = await POST(new Request("http://test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: " transport-1 " }) }), { params: Promise.resolve({ companyId: "c1", remitoId: "r1" }) });
    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith({ db: true }, { actorId: "u1", companyId: "c1", bundleId: "WCB-06", contractIds: ["a"] });
    expect(mocks.authorize.mock.invocationCallOrder[0]).toBeLessThan(mocks.emitir.mock.invocationCallOrder[0]);
    expect(mocks.emitir).toHaveBeenCalledWith(expect.objectContaining({ companyId: "c1", remitoId: "r1", idempotencyKey: "transport-1", authorizationProof: expect.any(Object) }));
  });

  it("rejects client lineage before issuance", async () => {
    const response = await POST(new Request("http://test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ boxId: "forged" }) }), { params: Promise.resolve({ companyId: "c1", remitoId: "r1" }) });
    expect(response.status).toBe(400);
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.emitir).not.toHaveBeenCalled();
  });

  it("rejects blank transport idempotency before authorization", async () => {
    const response = await POST(new Request("http://test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: "   " }) }), { params: Promise.resolve({ companyId: "c1", remitoId: "r1" }) });
    expect(response.status).toBe(400);
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.emitir).not.toHaveBeenCalled();
  });

  it("durably records failed exact C14 role/company authorization before 403 without a domain transaction", async () => {
    mocks.authorize.mockRejectedValueOnce(new Error("denied"));
    const response = await POST(new Request("http://test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: " denied-1 " }) }), { params: Promise.resolve({ companyId: "c1", remitoId: "r1" }) });
    expect(response.status).toBe(403);
    expect(mocks.durableDenied).toHaveBeenCalledWith({ db: true }, { actorId: "u1", companyId: "c1", remitoId: "r1", idempotencyKey: "denied-1" });
    expect(mocks.emitir).not.toHaveBeenCalled();
  });
});
