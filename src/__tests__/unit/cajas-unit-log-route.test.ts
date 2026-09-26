import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), stockGuard: vi.fn(), append: vi.fn() }));
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }));
vi.mock("@/lib/permissions/stock-operations", () => ({ requireStockOperationAccess: mocks.stockGuard }));
vi.mock("@/lib/prisma", () => ({ default: { db: true } }));
vi.mock("@/lib/services/cajas-assignment-preparation.service", () => ({ appendCajasUnitLogEntry: mocks.append }));

import { POST } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/cajas/log/route";

const context = { params: Promise.resolve({ companyId: "company-route", surgeryId: "surgery-1" }) };
const body = { assignmentId: "assignment-1", unitId: "unit-1", eventKind: "PROBLEM_REPORTED", articleId: "article-1", note: "Punta deformada", idempotencyKey: "log-key-1" };

describe("Cajas unit log route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ companyId: "company-authorized", actorUserId: "user-1", role: "operator" });
    mocks.append.mockResolvedValue({ replayed: false, entry: { id: "entry-1" } });
  });

  it("requires Stock operation access and forwards only the validated exception intent", async () => {
    const response = await POST(new Request("http://test", { method: "POST", body: JSON.stringify(body) }), context);
    expect(response.status).toBe(201);
    expect(mocks.stockGuard.mock.invocationCallOrder[0]).toBeLessThan(mocks.append.mock.invocationCallOrder[0]);
    expect(mocks.append).toHaveBeenCalledWith({ db: true }, "company-authorized", "surgery-1", "user-1", body);
  });

  it("returns 200 for replay and rejects invalid kinds, blank notes, extra fields, and denied access", async () => {
    mocks.append.mockResolvedValueOnce({ replayed: true, entry: { id: "entry-1" } });
    expect((await POST(new Request("http://test", { method: "POST", body: JSON.stringify(body) }), context)).status).toBe(200);

    for (const invalid of [{ ...body, eventKind: "USE" }, { ...body, note: "  " }, { ...body, articleId: undefined }, { ...body, role: "admin" }]) {
      expect((await POST(new Request("http://test", { method: "POST", body: JSON.stringify(invalid) }), context)).status).toBe(400);
    }

    mocks.stockGuard.mockImplementationOnce(() => { throw forbidden("Denied", "company_mutation_access_denied"); });
    expect((await POST(new Request("http://test", { method: "POST", body: JSON.stringify(body) }), context)).status).toBe(403);
  });
});
