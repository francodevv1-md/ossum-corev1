import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  findGrant: vi.fn(),
  reassignPivot: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }));
vi.mock("@/lib/services/company-operational-assignee.service", () => ({ reassignPivot: mocks.reassignPivot }));
vi.mock("@/lib/services/internal-notifications.service", () => ({ emitAvailabilityPivotTransferNotifications: vi.fn() }));
vi.mock("@/lib/services/seguimiento.service", () => ({ createAvailabilitySeguimientoEvent: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditEvent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: {
  marker: "prisma",
  availabilityCapabilityGrant: { findFirst: mocks.findGrant },
} }));

import * as route from "@/app/api/companies/[companyId]/operational-assignees/pivot/route";

const ctx = { actorUserId: "actor-1", companyId: "authoritative-company", role: "admin" };
const key = "availability-key-0001";

function grantConfiguration() {
  vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "development");
  vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "true");
  vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", ctx.companyId);
  mocks.findGrant.mockResolvedValue({
    companyId: ctx.companyId, userId: ctx.actorUserId, capability: "availability.pivot.configure",
  });
}

function request(body: unknown, withKey = true) {
  return new Request("http://localhost/api", {
    method: "PUT",
    headers: withKey ? { "Idempotency-Key": key } : undefined,
    body: JSON.stringify(body),
  });
}

describe("company operational PÍVOT route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.getApiAuthContext.mockResolvedValue(ctx);
    vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "test");
    vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "false");
    vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", "");
    mocks.findGrant.mockResolvedValue(null);
    mocks.reassignPivot.mockResolvedValue({
      userId: "operator-2",
      version: 2,
      transferredRequestCount: 3,
    });
  });

  it("exports replacement PUT only", () => {
    expect(Object.keys(route).sort()).toEqual(["PUT"]);
  });

  it("keeps PÍVOT configuration hard-denied before parsing or service work", async () => {
    const response = await route.PUT(request({}), {
      params: Promise.resolve({ companyId: "route-company" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.findGrant).not.toHaveBeenCalled();
    expect(mocks.reassignPivot).not.toHaveBeenCalled();

    vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "development");
    vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "true");
    vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", ctx.companyId);
    mocks.findGrant.mockRejectedValueOnce(new Error("provider failed"));
    const failed = await route.PUT(request({}), {
      params: Promise.resolve({ companyId: "route-company" }),
    });
    expect(failed.status).toBe(403);
    expect(mocks.reassignPivot).not.toHaveBeenCalled();
  });

  it("performs replacement with validated input and authoritative company", async () => {
    grantConfiguration();
    const response = await route.PUT(
      request({
        userId: " operator-2 ",
        expectedVersion: 1,
        reason: "Operational handover",
      }),
      { params: Promise.resolve({ companyId: "route-company" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.reassignPivot).toHaveBeenCalledWith(
      expect.objectContaining({ prisma: expect.objectContaining({ marker: "prisma" }) }),
      { companyId: "authoritative-company", actorUserId: "actor-1" },
      {
        userId: "operator-2",
        expectedVersion: 1,
        reason: "Operational handover",
        idempotencyKey: key,
      }
    );
  });

  it("rejects initial designation and forged authority shapes", async () => {
    grantConfiguration();
    const response = await route.PUT(
      request({
        userId: "operator-2",
        reason: "Initial setup",
        companyId: "forged",
      }),
      { params: Promise.resolve({ companyId: "route-company" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.reassignPivot).not.toHaveBeenCalled();
  });

  it("requires a valid idempotency key when capability is enabled", async () => {
    grantConfiguration();
    const response = await route.PUT(
      request(
        { userId: "operator-2", expectedVersion: 1, reason: "Operational handover" },
        false
      ),
      { params: Promise.resolve({ companyId: "route-company" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.reassignPivot).not.toHaveBeenCalled();
  });
});
