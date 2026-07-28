import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(), requireCompanyReadAccess: vi.fn(), requireCompanyMutationAccess: vi.fn(),
  getSurgeryDocumentation: vi.fn(), initializeSurgeryDocumentation: vi.fn(), transitionSurgeryDocumentationItem: vi.fn(),
  createAuditEvent: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({
  requireCompanyReadAccess: mocks.requireCompanyReadAccess,
  requireCompanyMutationAccess: mocks.requireCompanyMutationAccess,
}));
vi.mock("@/lib/services/surgery-documentation.service", () => ({
  getSurgeryDocumentation: mocks.getSurgeryDocumentation,
  initializeSurgeryDocumentation: mocks.initializeSurgeryDocumentation,
  transitionSurgeryDocumentationItem: mocks.transitionSurgeryDocumentationItem,
}));
vi.mock("@/lib/audit", () => ({ createAuditEvent: mocks.createAuditEvent }));
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma" } }));

import * as readRoute from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/documentation/route";
import * as initializeRoute from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/documentation/initialize/route";
import * as stateRoute from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/documentation/items/[itemId]/state/route";
import { conflict, forbidden, unauthorized } from "@/lib/api/errors";
import { DOCUMENTATION_MUTATION_ROLES } from "@/lib/permissions/documentation";

const ctx = { actorUserId: "actor-1", companyId: "authoritative-company", role: "admin" };
const baseParams = { companyId: "route-company", surgeryId: "surgery-1" };
const documentation = { checklist: null, status: "not_required", progress: { approved: 0, total: 0 }, items: [] };

describe("documentation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue(ctx);
    mocks.getSurgeryDocumentation.mockResolvedValue(documentation);
    mocks.initializeSurgeryDocumentation.mockResolvedValue({ documentation, createdChecklist: true, insertedTypes: ["medical_order"] });
    mocks.transitionSurgeryDocumentationItem.mockResolvedValue({ documentation });
    mocks.createAuditEvent.mockResolvedValue({ id: "audit-1" });
  });

  it("exports only GET, POST, and PATCH on their exact endpoints", () => {
    expect(Object.keys(readRoute).sort()).toEqual(["GET"]);
    expect(Object.keys(initializeRoute).sort()).toEqual(["POST"]);
    expect(Object.keys(stateRoute).sort()).toEqual(["PATCH"]);
  });

  it("returns a private GET envelope using authoritative auth scope", async () => {
    const response = await readRoute.GET(new Request("http://localhost/api"), { params: Promise.resolve(baseParams) });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("private, no-store");
    await expect(response.json()).resolves.toEqual({ data: { documentation } });
    expect(mocks.getApiAuthContext).toHaveBeenCalledWith(expect.any(Request), "route-company");
    expect(mocks.requireCompanyReadAccess).toHaveBeenCalledWith(ctx);
    expect(mocks.getSurgeryDocumentation).toHaveBeenCalledWith(
      { prisma: expect.objectContaining({ marker: "prisma" }) },
      { companyId: "authoritative-company", actorUserId: "actor-1" }, "surgery-1"
    );
  });

  it("initializes with the exact roles and no request body", async () => {
    const response = await initializeRoute.POST(new Request("http://localhost/api", { method: "POST" }), {
      params: Promise.resolve(baseParams),
    });
    expect(response.status).toBe(200);
    expect(mocks.requireCompanyMutationAccess).toHaveBeenCalledWith(ctx, DOCUMENTATION_MUTATION_ROLES);
    await expect(response.json()).resolves.toEqual({ data: { documentation, createdChecklist: true, insertedTypes: ["medical_order"] } });

    for (const body of [" ", "{}", "{"]) {
      const invalid = await initializeRoute.POST(new Request("http://localhost/api", { method: "POST", body }), {
        params: Promise.resolve(baseParams),
      });
      expect(invalid.status).toBe(400);
      await expect(invalid.json()).resolves.toMatchObject({
        error: { code: "documentation_invalid_initialize_body" },
      });
    }
    expect(mocks.initializeSurgeryDocumentation).toHaveBeenCalledTimes(1);
  });

  it("strictly parses PATCH and passes only validated CAS intent", async () => {
    const response = await stateRoute.PATCH(new Request("http://localhost/api", {
      method: "PATCH", body: JSON.stringify({
        state: "observed", expectedUpdatedAt: "2026-07-28T10:00:00.000Z", observation: "  Missing signature  ",
      }),
    }), { params: Promise.resolve({ ...baseParams, itemId: "item-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.requireCompanyMutationAccess).toHaveBeenCalledWith(ctx, DOCUMENTATION_MUTATION_ROLES);
    expect(mocks.transitionSurgeryDocumentationItem).toHaveBeenCalledWith(
      expect.objectContaining({ prisma: expect.objectContaining({ marker: "prisma" }) }),
      { companyId: "authoritative-company", actorUserId: "actor-1" },
      { surgeryId: "surgery-1", itemId: "item-1", state: "observed", expectedUpdatedAt: "2026-07-28T10:00:00.000Z", observation: "Missing signature" }
    );
  });

  it("rejects malformed JSON, unknown fields, and mutation denial before service", async () => {
    const malformed = await stateRoute.PATCH(new Request("http://localhost/api", { method: "PATCH", body: "{" }), {
      params: Promise.resolve({ ...baseParams, itemId: "item-1" }),
    });
    expect(malformed.status).toBe(400);

    const unknown = await stateRoute.PATCH(new Request("http://localhost/api", {
      method: "PATCH", body: JSON.stringify({ state: "received", expectedUpdatedAt: "2026-07-28T10:00:00.000Z", actorUserId: "forged" }),
    }), { params: Promise.resolve({ ...baseParams, itemId: "item-1" }) });
    expect(unknown.status).toBe(400);

    mocks.requireCompanyMutationAccess.mockImplementationOnce(() => { throw forbidden("Company mutation access denied", "company_mutation_access_denied"); });
    const denied = await stateRoute.PATCH(new Request("http://localhost/api", {
      method: "PATCH", body: JSON.stringify({ state: "received", expectedUpdatedAt: "2026-07-28T10:00:00.000Z" }),
    }), { params: Promise.resolve({ ...baseParams, itemId: "item-1" }) });
    expect(denied.status).toBe(403);
    expect(mocks.transitionSurgeryDocumentationItem).not.toHaveBeenCalled();
  });

  it("maps auth and conflict errors and marks errors private", async () => {
    mocks.getApiAuthContext.mockRejectedValueOnce(unauthorized("Authentication required", "auth_required"));
    const unauthorizedResponse = await readRoute.GET(new Request("http://localhost/api"), { params: Promise.resolve(baseParams) });
    expect(unauthorizedResponse.status).toBe(401);
    expect(unauthorizedResponse.headers.get("Cache-Control")).toContain("no-store");

    mocks.transitionSurgeryDocumentationItem.mockRejectedValueOnce(conflict("Refresh", "documentation_write_conflict"));
    const conflictResponse = await stateRoute.PATCH(new Request("http://localhost/api", {
      method: "PATCH", body: JSON.stringify({ state: "received", expectedUpdatedAt: "2026-07-28T10:00:00.000Z" }),
    }), { params: Promise.resolve({ ...baseParams, itemId: "item-1" }) });
    expect(conflictResponse.status).toBe(409);
    await expect(conflictResponse.json()).resolves.toMatchObject({ error: { code: "documentation_write_conflict" } });
    expect(conflictResponse.headers.get("Cache-Control")).toContain("private, no-store");
  });
});
