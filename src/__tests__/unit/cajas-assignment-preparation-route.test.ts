import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  readGuard: vi.fn(),
  stockGuard: vi.fn(),
  get: vi.fn(),
  assign: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.readGuard }));
vi.mock("@/lib/permissions/stock-operations", () => ({ requireStockOperationAccess: mocks.stockGuard }));
vi.mock("@/lib/prisma", () => ({ default: { db: true } }));
vi.mock("@/lib/services/cajas-assignment-preparation.service", () => ({ assignAndPrepareCajas: mocks.assign, getSurgeryCajas: mocks.get }));

import { GET, POST } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/cajas/route";

const context = { params: Promise.resolve({ companyId: "company-route", surgeryId: "surgery-1" }) };

describe("Surgery Cajas route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ companyId: "company-authorized", actorUserId: "user-1", role: "operator" });
    mocks.get.mockResolvedValue({ assignments: [], candidates: [] });
    mocks.assign.mockResolvedValue({ replayed: false, assignment: { id: "assignment-1" } });
  });

  it("authenticates and scopes GET to the authorized company and Surgery", async () => {
    const response = await GET(new Request("http://test"), context);
    expect(response.status).toBe(200);
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "company-route");
    expect(mocks.readGuard).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-authorized" }));
    expect(mocks.get).toHaveBeenCalledWith({ db: true }, "company-authorized", "surgery-1");
  });

  it("requires Stock operation access and forwards only validated POST intent", async () => {
    const response = await POST(new Request("http://test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitId: "unit-1", idempotencyKey: "key-1" }) }), context);
    expect(response.status).toBe(201);
    expect(mocks.stockGuard.mock.invocationCallOrder[0]).toBeLessThan(mocks.assign.mock.invocationCallOrder[0]);
    expect(mocks.assign).toHaveBeenCalledWith({ db: true }, "company-authorized", "surgery-1", "user-1", { unitId: "unit-1", idempotencyKey: "key-1" });
  });

  it("returns 200 for an idempotent replay", async () => {
    mocks.assign.mockResolvedValue({ replayed: true, assignment: { id: "assignment-1" } });
    const response = await POST(new Request("http://test", { method: "POST", body: JSON.stringify({ unitId: "unit-1", idempotencyKey: "key-1" }) }), context);
    expect(response.status).toBe(200);
  });

  it("rejects invalid JSON, extra fields, and permission denial before the service", async () => {
    let response = await POST(new Request("http://test", { method: "POST", body: "{" }), context);
    expect(response.status).toBe(400);
    expect(mocks.assign).not.toHaveBeenCalled();

    response = await POST(new Request("http://test", { method: "POST", body: JSON.stringify({ unitId: "unit-1", idempotencyKey: "key-1", role: "admin" }) }), context);
    expect(response.status).toBe(400);
    expect(mocks.assign).not.toHaveBeenCalled();

    mocks.stockGuard.mockImplementationOnce(() => { throw forbidden("Company mutation access denied", "company_mutation_access_denied"); });
    response = await POST(new Request("http://test", { method: "POST", body: JSON.stringify({ unitId: "unit-1", idempotencyKey: "key-1" }) }), context);
    expect(response.status).toBe(403);
    expect(mocks.assign).not.toHaveBeenCalled();
  });
});
