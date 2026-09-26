import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  readGuard: vi.fn(),
  stockGuard: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  transition: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.readGuard }));
vi.mock("@/lib/permissions/stock-operations", () => ({ requireStockOperationAccess: mocks.stockGuard }));
vi.mock("@/lib/prisma", () => ({ default: { db: true } }));
vi.mock("@/lib/services/cajas-maintenance.service", () => ({
  getCajasMaintenance: mocks.get,
  createCajasMaintenanceCase: mocks.create,
  transitionCajasMaintenanceCase: mocks.transition,
}));

import { GET, POST as CREATE } from "@/app/api/companies/[companyId]/cajas/units/[unitId]/maintenance/route";
import { POST as TRANSITION } from "@/app/api/companies/[companyId]/cajas/units/[unitId]/maintenance/[caseId]/transition/route";

const unitContext = { params: Promise.resolve({ companyId: "company-route", unitId: "unit-1" }) };
const transitionContext = { params: Promise.resolve({ companyId: "company-route", unitId: "unit-1", caseId: "case-1" }) };
const createBody = { kind: "REPAIR", articleId: null, description: "Repair hinge", idempotencyKey: "create-1" };
const transitionBody = { toStatus: "SENT", expectedVersion: 1, note: "Sent to vendor", idempotencyKey: "transition-1" };

describe("Cajas maintenance routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ companyId: "company-authorized", actorUserId: "user-1", role: "operator" });
    mocks.get.mockResolvedValue({ unit: { id: "unit-1", code: "BOX-001" }, cases: [] });
    mocks.create.mockResolvedValue({ replayed: false, case: { id: "case-1" } });
    mocks.transition.mockResolvedValue({ replayed: false, case: { id: "case-1", status: "SENT" } });
  });

  it("uses the read guard and trusted company for GET", async () => {
    const response = await GET(new Request("http://test"), unitContext);
    expect(response.status).toBe(200);
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "company-route");
    expect(mocks.readGuard).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-authorized" }));
    expect(mocks.get).toHaveBeenCalledWith({ db: true }, "company-authorized", "unit-1");
  });

  it("uses the unchanged Stock guard, validates create, and returns 201 or 200 replay", async () => {
    let response = await CREATE(new Request("http://test", { method: "POST", body: JSON.stringify(createBody) }), unitContext);
    expect(response.status).toBe(201);
    expect(mocks.stockGuard.mock.invocationCallOrder[0]).toBeLessThan(mocks.create.mock.invocationCallOrder[0]);
    expect(mocks.create).toHaveBeenCalledWith({ db: true }, "company-authorized", "unit-1", "user-1", createBody);

    mocks.create.mockResolvedValueOnce({ replayed: true, case: { id: "case-1" } });
    response = await CREATE(new Request("http://test", { method: "POST", body: JSON.stringify(createBody) }), unitContext);
    expect(response.status).toBe(200);
  });

  it("validates legal transition targets and always returns 200", async () => {
    const response = await TRANSITION(new Request("http://test", { method: "POST", body: JSON.stringify(transitionBody) }), transitionContext);
    expect(response.status).toBe(200);
    expect(mocks.transition).toHaveBeenCalledWith({ db: true }, "company-authorized", "unit-1", "case-1", "user-1", transitionBody);

    for (const invalid of [
      { ...transitionBody, toStatus: "OPEN" },
      { ...transitionBody, expectedVersion: 0 },
      { ...transitionBody, note: " " },
      { ...transitionBody, extra: true },
    ]) {
      expect((await TRANSITION(new Request("http://test", { method: "POST", body: JSON.stringify(invalid) }), transitionContext)).status).toBe(400);
    }
  });

  it("returns exact invalid-body errors and denies mutation before the service", async () => {
    let response = await CREATE(new Request("http://test", { method: "POST", body: "{" }), unitContext);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid_json_body", message: "Invalid JSON body" } });

    response = await CREATE(new Request("http://test", { method: "POST", body: JSON.stringify({ ...createBody, kind: "INSPECTION" }) }), unitContext);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid_cajas_maintenance_body", message: "Invalid Cajas maintenance body" } });

    mocks.stockGuard.mockImplementationOnce(() => { throw forbidden("Denied", "company_mutation_access_denied"); });
    response = await CREATE(new Request("http://test", { method: "POST", body: JSON.stringify(createBody) }), unitContext);
    expect(response.status).toBe(403);
  });
});
