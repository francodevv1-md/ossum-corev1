import { beforeEach, describe, expect, it, vi } from "vitest";

const { getApiAuthContext, requireCompanyMutationAccess, updateSurgeryPrepStatus } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyMutationAccess: vi.fn(),
  updateSurgeryPrepStatus: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess }));
vi.mock("@/lib/prisma", () => ({ default: { __mockPrisma: true } }));
vi.mock("@/lib/services/surgery.service", () => ({ updateSurgeryPrepStatus }));

import { PATCH } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/preparation/route";

const companyId = "company-1";

function request(body: unknown) {
  return new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) });
}

describe("PATCH /preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue({ companyId, actorUserId: "user-1", role: "admin" });
    updateSurgeryPrepStatus.mockResolvedValue({ id: "surgery-1", cxStatus: "scheduled", prepStatus: "preparing" });
  });

  it("reuses the mutation guard and calls only the prep service", async () => {
    const response = await PATCH(request({ prepStatus: "preparing", source: "panel" }), {
      params: Promise.resolve({ companyId, surgeryId: "surgery-1" }),
    });

    expect(response.status).toBe(200);
    expect(requireCompanyMutationAccess).toHaveBeenCalledWith(expect.objectContaining({ companyId }), expect.any(Array));
    expect(updateSurgeryPrepStatus).toHaveBeenCalledWith(
      { __mockPrisma: true },
      { companyId, actorUserId: "user-1", source: "panel", module: "surgery" },
      "surgery-1",
      "preparing"
    );
  });

  it.each(["cxStatus", "status", "companyId", "metadata", "unexpected"])("rejects forbidden %s bodies before the service", async (field) => {
    const response = await PATCH(request({ prepStatus: "preparing", [field]: "x" }), {
      params: Promise.resolve({ companyId, surgeryId: "surgery-1" }),
    });

    expect(response.status).toBe(400);
    expect(updateSurgeryPrepStatus).not.toHaveBeenCalled();
  });

  it("rejects a non-preparation substatus before the service", async () => {
    const response = await PATCH(request({ prepStatus: "scheduled" }), {
      params: Promise.resolve({ companyId, surgeryId: "surgery-1" }),
    });

    expect(response.status).toBe(400);
    expect(updateSurgeryPrepStatus).not.toHaveBeenCalled();
  });

  it("preserves the existing mutation-role denial without invoking the service", async () => {
    const { forbidden } = await import("@/lib/api/errors");
    requireCompanyMutationAccess.mockImplementationOnce(() => {
      throw forbidden("Company mutation access denied", "company_mutation_access_denied");
    });

    const response = await PATCH(request({ prepStatus: "preparing" }), {
      params: Promise.resolve({ companyId, surgeryId: "surgery-1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "company_mutation_access_denied", message: "Company mutation access denied" },
    });
    expect(updateSurgeryPrepStatus).not.toHaveBeenCalled();
  });
});
