import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyReadAccess: vi.fn(),
  findGrant: vi.fn(),
  createAvailabilityRequest: vi.fn(),
  getAvailabilityRequestDetail: vi.fn(),
  completeAvailabilityRequest: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext: mocks.getApiAuthContext,
}));
vi.mock("@/lib/api/guards", () => ({
  requireCompanyReadAccess: mocks.requireCompanyReadAccess,
}));
vi.mock("@/lib/services/availability-request.service", () => ({
  createAvailabilityRequest: mocks.createAvailabilityRequest,
  getAvailabilityRequestDetail: mocks.getAvailabilityRequestDetail,
  completeAvailabilityRequest: mocks.completeAvailabilityRequest,
}));
vi.mock("@/lib/services/internal-notifications.service", () => ({
  emitAvailabilityActionableNotifications: vi.fn(),
  emitAvailabilityRequesterCompletionNotification: vi.fn(),
}));
vi.mock("@/lib/services/seguimiento.service", () => ({
  createAvailabilitySeguimientoEvent: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ createAuditEvent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: {
  marker: "prisma",
  availabilityCapabilityGrant: { findFirst: mocks.findGrant },
} }));

import * as createRoute from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/availability-requests/route";
import * as detailRoute from "@/app/api/companies/[companyId]/availability-requests/[requestId]/route";
import * as completeRoute from "@/app/api/companies/[companyId]/availability-requests/[requestId]/complete/route";
import { conflict, notFound, unauthorized } from "@/lib/api/errors";

const ctx = {
  actorUserId: "actor-1",
  companyId: "authoritative-company",
  role: "operator",
};
const key = "availability-key-0001";

function enableSource() {
  vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "development");
  vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "true");
  vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", ctx.companyId);
}

function grant(capability: string) {
  enableSource();
  mocks.findGrant.mockResolvedValue({ companyId: ctx.companyId, userId: ctx.actorUserId, capability });
}

function jsonRequest(method: string, body: unknown, withKey = true) {
  return new Request("http://localhost/api", {
    method,
    headers: withKey ? { "Idempotency-Key": key } : undefined,
    body: JSON.stringify(body),
  });
}

describe("availability request routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.getApiAuthContext.mockResolvedValue(ctx);
    vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "test");
    vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "false");
    vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", "");
    mocks.findGrant.mockResolvedValue(null);
    mocks.createAvailabilityRequest.mockResolvedValue({ id: "request-1" });
    mocks.getAvailabilityRequestDetail.mockResolvedValue({ id: "request-1" });
    mocks.completeAvailabilityRequest.mockResolvedValue({
      id: "request-1",
      status: "COMPLETED",
    });
  });

  it("exports only the approved method on each route", () => {
    expect(Object.keys(createRoute).sort()).toEqual(["POST"]);
    expect(Object.keys(detailRoute).sort()).toEqual(["GET"]);
    expect(Object.keys(completeRoute).sort()).toEqual(["POST"]);
  });

  it("keeps request creation hard-denied before parsing or service work", async () => {
    const response = await createRoute.POST(jsonRequest("POST", {}), {
      params: Promise.resolve({ companyId: "route-company", surgeryId: "surgery-1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "availability_forbidden" },
    });
    expect(mocks.findGrant).not.toHaveBeenCalled();
    expect(mocks.createAvailabilityRequest).not.toHaveBeenCalled();

    enableSource();
    mocks.findGrant.mockRejectedValueOnce(new Error("provider failed"));
    const failed = await createRoute.POST(jsonRequest("POST", {}), {
      params: Promise.resolve({ companyId: "route-company", surgeryId: "surgery-1" }),
    });
    expect(failed.status).toBe(403);
    expect(mocks.createAvailabilityRequest).not.toHaveBeenCalled();
  });

  it("uses validated route input and authoritative auth context when enabled in tests", async () => {
    grant("availability.request.create");
    const response = await createRoute.POST(jsonRequest("POST", {}), {
      params: Promise.resolve({ companyId: "route-company", surgeryId: " surgery-1 " }),
    });

    expect(response.status).toBe(201);
    expect(mocks.getApiAuthContext).toHaveBeenCalledWith(
      expect.any(Request),
      "route-company"
    );
    expect(mocks.createAvailabilityRequest).toHaveBeenCalledWith(
      expect.objectContaining({ prisma: expect.objectContaining({ marker: "prisma" }) }),
      { companyId: "authoritative-company", actorUserId: "actor-1" },
      { surgeryId: "surgery-1", idempotencyKey: key }
    );
  });

  it("rejects forged creation authority fields before the service", async () => {
    grant("availability.request.create");
    const response = await createRoute.POST(
      jsonRequest("POST", { companyId: "forged" }),
      {
        params: Promise.resolve({ companyId: "route-company", surgeryId: "surgery-1" }),
      }
    );

    expect(response.status).toBe(400);
    expect(mocks.createAvailabilityRequest).not.toHaveBeenCalled();
  });

  it("returns an early private 404 for detail while the source is disabled", async () => {
    const response = await detailRoute.GET(
      new Request("http://localhost/api"),
      {
        params: Promise.resolve({ companyId: "route-company", requestId: " request-1 " }),
      }
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toContain("private, no-store");
    expect(mocks.requireCompanyReadAccess).toHaveBeenCalledWith(ctx);
    expect(mocks.getAvailabilityRequestDetail).not.toHaveBeenCalled();
  });

  it("delegates detail recipient authorization when synthetically enabled", async () => {
    enableSource();
    const response = await detailRoute.GET(
      new Request("http://localhost/api"),
      {
        params: Promise.resolve({ companyId: "route-company", requestId: " request-1 " }),
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.getAvailabilityRequestDetail).toHaveBeenCalledWith(
      { prisma: expect.objectContaining({ marker: "prisma" }) },
      { companyId: "authoritative-company", actorUserId: "actor-1" },
      "request-1"
    );
  });

  it("preserves uniform non-disclosing detail 404 responses", async () => {
    enableSource();
    mocks.getAvailabilityRequestDetail.mockRejectedValueOnce(
      notFound("Availability request not found", "availability_request_not_found")
    );
    const response = await detailRoute.GET(new Request("http://localhost/api"), {
      params: Promise.resolve({ companyId: "route-company", requestId: "foreign-id" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "availability_request_not_found" },
    });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns an early 404 for completion while the source is disabled", async () => {
    const response = await completeRoute.POST(
      jsonRequest("POST", { date: "2026-07-24" }),
      {
        params: Promise.resolve({ companyId: "route-company", requestId: "request-1" }),
      }
    );

    expect(response.status).toBe(404);
    expect(mocks.completeAvailabilityRequest).not.toHaveBeenCalled();
  });

  it("completes by assignment authority without a broad capability when enabled", async () => {
    enableSource();
    const response = await completeRoute.POST(
      jsonRequest("POST", { date: "2026-07-24" }),
      {
        params: Promise.resolve({ companyId: "route-company", requestId: "request-1" }),
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.findGrant).not.toHaveBeenCalled();
    expect(mocks.completeAvailabilityRequest).toHaveBeenCalledWith(
      expect.objectContaining({ prisma: expect.objectContaining({ marker: "prisma" }) }),
      { companyId: "authoritative-company", actorUserId: "actor-1" },
      { requestId: "request-1", date: "2026-07-24", idempotencyKey: key }
    );
  });

  it("rejects invalid completion input before assignment service work", async () => {
    enableSource();
    const response = await completeRoute.POST(
      jsonRequest("POST", { date: "24/07/2026", completedByUserId: "forged" }),
      {
        params: Promise.resolve({ companyId: "route-company", requestId: "request-1" }),
      }
    );

    expect(response.status).toBe(400);
    expect(mocks.completeAvailabilityRequest).not.toHaveBeenCalled();
  });

  it("preserves stable same-company conflict responses", async () => {
    enableSource();
    mocks.completeAvailabilityRequest.mockRejectedValueOnce(
      conflict(
        "Availability request is already completed",
        "availability_request_completed"
      )
    );
    const response = await completeRoute.POST(
      jsonRequest("POST", { date: "2026-07-24" }),
      {
        params: Promise.resolve({ companyId: "route-company", requestId: "request-1" }),
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "availability_request_completed" },
    });
  });

  it("preserves authentication failures without invoking services", async () => {
    mocks.getApiAuthContext.mockRejectedValueOnce(
      unauthorized("Authentication required", "auth_required")
    );
    const response = await createRoute.POST(jsonRequest("POST", {}), {
      params: Promise.resolve({ companyId: "route-company", surgeryId: "surgery-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.createAvailabilityRequest).not.toHaveBeenCalled();
  });
});
