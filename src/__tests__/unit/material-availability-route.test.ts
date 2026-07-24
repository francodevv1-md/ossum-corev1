import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyReadAccess: vi.fn(),
  findGrant: vi.fn(),
  getMaterialAvailability: vi.fn(),
  correctMaterialAvailability: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.requireCompanyReadAccess }));
vi.mock("@/lib/services/material-availability.service", () => ({
  getMaterialAvailability: mocks.getMaterialAvailability,
  correctMaterialAvailability: mocks.correctMaterialAvailability,
}));
vi.mock("@/lib/services/seguimiento.service", () => ({ createAvailabilitySeguimientoEvent: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditEvent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: {
  marker: "prisma",
  availabilityCapabilityGrant: { findFirst: mocks.findGrant },
} }));

import * as route from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/material-availability/route";
import { notFound } from "@/lib/api/errors";

const ctx = { actorUserId: "actor-1", companyId: "authoritative-company", role: "admin" };
const key = "availability-key-0001";
const params = Promise.resolve({ companyId: "route-company", surgeryId: "surgery-1" });

function enableSource() {
  vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "development");
  vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "true");
  vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", ctx.companyId);
}

function grantCorrection() {
  enableSource();
  mocks.findGrant.mockResolvedValue({
    companyId: ctx.companyId, userId: ctx.actorUserId, capability: "availability.date.correct",
  });
}

describe("material availability route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.getApiAuthContext.mockResolvedValue(ctx);
    vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "test");
    vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "false");
    vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", "");
    mocks.findGrant.mockResolvedValue(null);
    mocks.getMaterialAvailability.mockResolvedValue({ surgeryId: "surgery-1", date: null });
    mocks.correctMaterialAvailability.mockResolvedValue({ surgeryId: "surgery-1", date: "2026-07-25" });
  });

  it("exports only GET and PATCH", () => {
    expect(Object.keys(route).sort()).toEqual(["GET", "PATCH"]);
  });

  it("returns an early private 404 while the source is disabled", async () => {
    const response = await route.GET(new Request("http://localhost/api"), { params });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toContain("private, no-store");
    expect(mocks.requireCompanyReadAccess).toHaveBeenCalledWith(ctx);
    expect(mocks.getMaterialAvailability).not.toHaveBeenCalled();
  });

  it("serves a private read scoped by authoritative company when enabled", async () => {
    enableSource();
    const response = await route.GET(new Request("http://localhost/api"), { params });

    expect(response.status).toBe(200);
    expect(mocks.getMaterialAvailability).toHaveBeenCalledWith(
      { prisma: expect.objectContaining({ marker: "prisma" }) },
      { companyId: "authoritative-company", actorUserId: "actor-1" },
      "surgery-1"
    );
  });

  it("rejects any read query key before the service", async () => {
    enableSource();
    const response = await route.GET(new Request("http://localhost/api?companyId=forged"), { params });
    expect(response.status).toBe(400);
    expect(mocks.getMaterialAvailability).not.toHaveBeenCalled();
  });

  it("preserves uniform non-disclosing read 404", async () => {
    enableSource();
    mocks.getMaterialAvailability.mockRejectedValueOnce(
      notFound("Surgery not found", "availability_surgery_not_found")
    );
    const response = await route.GET(new Request("http://localhost/api"), { params });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "availability_surgery_not_found" },
    });
  });

  it("keeps corrections hard-denied before body parsing or service work", async () => {
    const response = await route.PATCH(new Request("http://localhost/api", { method: "PATCH", body: "{" }), { params });
    expect(response.status).toBe(403);
    expect(mocks.findGrant).not.toHaveBeenCalled();
    expect(mocks.correctMaterialAvailability).not.toHaveBeenCalled();

    enableSource();
    mocks.findGrant.mockRejectedValueOnce(new Error("provider failed"));
    const failed = await route.PATCH(new Request("http://localhost/api", { method: "PATCH", body: "{" }), { params });
    expect(failed.status).toBe(403);
    expect(mocks.correctMaterialAvailability).not.toHaveBeenCalled();
  });

  it("passes only validated correction input with server-derived Expediente origin", async () => {
    grantCorrection();
    const response = await route.PATCH(
      new Request("http://localhost/api", {
        method: "PATCH",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          date: "2026-07-25",
          expectedCurrentDate: "2026-07-24",
          reason: "Date confirmed by logistics",
        }),
      }),
      { params }
    );

    expect(response.status).toBe(200);
    expect(mocks.correctMaterialAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ prisma: expect.objectContaining({ marker: "prisma" }) }),
      { companyId: "authoritative-company", actorUserId: "actor-1" },
      {
        surgeryId: "surgery-1",
        date: "2026-07-25",
        expectedCurrentDate: "2026-07-24",
        reason: "Date confirmed by logistics",
        idempotencyKey: key,
        origin: "expediente",
      }
    );
  });

  it("rejects forged correction authority before the service", async () => {
    grantCorrection();
    const response = await route.PATCH(
      new Request("http://localhost/api", {
        method: "PATCH",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          date: "2026-07-25",
          expectedCurrentDate: "2026-07-24",
          reason: "Valid reason",
          actorUserId: "forged",
        }),
      }),
      { params }
    );
    expect(response.status).toBe(400);
    expect(mocks.correctMaterialAvailability).not.toHaveBeenCalled();
  });
});
