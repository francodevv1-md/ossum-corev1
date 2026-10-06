import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateBackendSurgeryManagement } from "@/lib/api/backend-surgeries";
import { buildReschedulingPatch } from "@/lib/surgery/rescheduling";
import { apiFetch } from "@/lib/api/client";
vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn() }));

const { getApiAuthContext, requireCompanyMutationAccess, updateSurgery } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyMutationAccess: vi.fn(),
  updateSurgery: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({
  requireCompanyMutationAccess,
  requireCompanyReadAccess: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: { __mockPrisma: true } }));
vi.mock("@/lib/services/surgery.service", () => ({
  getSurgeryById: vi.fn(),
  updateSurgery,
}));

import { PATCH } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/route";

const companyId = "company-1";
const params = { params: Promise.resolve({ companyId, surgeryId: "surgery-1" }) };

function request(body: unknown) {
  return new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) });
}

describe("PATCH /surgeries/:surgeryId", () => {
  it("accepts the real shipping builder and backend client through the actual PATCH parser", async () => {
    vi.mocked(apiFetch).mockImplementation(async (_path, init) => {
      const response = await PATCH(new Request("http://localhost", init), params);
      expect(response.status).toBe(200);
      return response.json();
    });
    await updateBackendSurgeryManagement(companyId, "surgery-1", buildReschedulingPatch({ date: "2026-10-06", time: "", urgente: false }, { fechaEnvioMaterial: "2026-10-07" }));
    expect(updateSurgery).toHaveBeenCalledWith(expect.anything(), expect.anything(), "surgery-1", { materialShippingDate: new Date("2026-10-07T00:00:00Z") });
  });
  it.each([true, false, null])("accepts explicit precision %s", async (surgeryTimeSpecified) => {
    const response = await PATCH(request({ surgeryDate: "2026-10-07T03:00:00Z", surgeryTimeSpecified }), params);
    expect(response.status).toBe(200);
    expect(updateSurgery).toHaveBeenCalledWith(expect.anything(), expect.anything(), "surgery-1", { surgeryDate: new Date("2026-10-07T03:00:00Z"), surgeryTimeSpecified });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue({ companyId, actorUserId: "user-1", role: "admin" });
    updateSurgery.mockResolvedValue({ id: "surgery-1", priority: "urgent" });
  });

  it("persists date/time and urgency through the existing surgery service", async () => {
    const response = await PATCH(request({
      surgeryDate: "2026-08-20T13:30:00.000Z",
      priority: "urgent",
    }), params);

    expect(response.status).toBe(200);
    expect(requireCompanyMutationAccess).toHaveBeenCalledWith(
      expect.objectContaining({ companyId }),
      ["admin", "manager", "coordinator", "owner", "super_admin"]
    );
    expect(updateSurgery).toHaveBeenCalledWith(
      { __mockPrisma: true },
      { companyId, actorUserId: "user-1", source: "coordination-management", module: "surgery" },
      "surgery-1",
      { surgeryDate: new Date("2026-08-20T13:30:00.000Z"), surgeryTimeSpecified: null, priority: "urgent" }
    );
  });

  it("persists and clears canonical shipping and transport fields", async () => {
    const response = await PATCH(request({
      materialShippingDate: "2026-08-21",
      materialTransport: "  Logística Sur  ",
    }), params);

    expect(response.status).toBe(200);
    expect(updateSurgery).toHaveBeenCalledWith(
      { __mockPrisma: true },
      expect.objectContaining({ companyId, actorUserId: "user-1" }),
      "surgery-1",
      {
        materialShippingDate: new Date("2026-08-21T00:00:00.000Z"),
        materialTransport: "Logística Sur",
      }
    );

    await PATCH(request({ materialShippingDate: null, materialTransport: null }), params);
    expect(updateSurgery).toHaveBeenLastCalledWith(
      { __mockPrisma: true },
      expect.any(Object),
      "surgery-1",
      { materialShippingDate: null, materialTransport: null }
    );
  });

  it.each([
    {},
    { priority: "critical" },
    { surgeryDate: "not-a-date" },
    { surgeryDate: "2026-08-20T13:30:00" },
    { surgeryDate: "2026-02-30T13:30:00Z" },
    { materialShippingDate: "2026-02-30" },
    { materialTransport: 123 },
    { materialTransport: "x".repeat(201) },
    { notes: "unsupported" },
  ])("rejects unsupported management payload %#", async (body) => {
    const response = await PATCH(request(body), params);

    expect(response.status).toBe(400);
    expect(updateSurgery).not.toHaveBeenCalled();
  });
});
