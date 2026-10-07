import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { POST } from "@/app/api/companies/[companyId]/contacts/cuit-lookup/route";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { contactLookupResultSchema } from "@/lib/validators/cuit-lookup";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }));

const CUITS = {
  happy: "30712293840",
  bad: "30012293840", // chk digit expected 0, but actual here is for testing
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockImplementation(async (_request, companyId) => ({ companyId, actorUserId: "actor-1", canonicalRole: "admin", role: "admin" }));
  process.env = { ...process.env, NODE_ENV: "development" };
  delete process.env.OSSUM_CUIT_LOOKUP_DRIVER;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cuit-lookup POST route integration (DEV stub driver)", () => {
  it("returns 200 with mapped subset for the canonical CUIT and no-store header", async () => {
    const request = new Request("http://test/api/companies/company-A/contacts/cuit-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit: CUITS.happy }),
    });
    const response = await POST(request, { params: Promise.resolve({ companyId: "company-A" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = z.object({ data: contactLookupResultSchema }).parse(await response.json());
    expect(json.data).toMatchObject({
      source: "stub",
      found: true,
      legalName: "DISTRIBUIDORA ANTIGRAVITY SA",
      vatCondition: "Responsable Inscripto",
      mainAddress: expect.objectContaining({ country: "AR" }),
    });
  });

  it("returns 401 when auth fails before lookup", async () => {
    mocks.auth.mockRejectedValueOnce(unauthorized("Authentication required", "auth_required"));
    const request = new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit: CUITS.happy }),
    });
    const response = await POST(request, { params: Promise.resolve({ companyId: "company-A" }) });
    expect(response.status).toBe(401);
  });

  it("returns 403 when company membership is denied", async () => {
    mocks.auth.mockRejectedValueOnce(forbidden("Company access denied", "company_access_denied"));
    const request = new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit: CUITS.happy }),
    });
    const response = await POST(request, { params: Promise.resolve({ companyId: "company-B" }) });
    expect(response.status).toBe(403);
  });

  it("returns 400 for malformed JSON body", async () => {
    const request = new Request("http://test", { method: "POST", body: "{" });
    const response = await POST(request, { params: Promise.resolve({ companyId: "company-A" }) });
    expect(response.status).toBe(400);
  });

  it("returns 400 invalid_cuit_format for missing body field", async () => {
    const request = new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: Promise.resolve({ companyId: "company-A" }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_cuit_format");
  });

  it("returns 400 invalid_cuit_format when CUIT has wrong digits count", async () => {
    const request = new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit: "1234567890" }),
    });
    const response = await POST(request, { params: Promise.resolve({ companyId: "company-A" }) });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_cuit_format");
  });

  it("returns 422 cuit_provider_conflict when the stub bucket raises it", async () => {
    // bucket 4 fixture has last 5 digits 00002 -> 20000000002 (valid mod 11). Pick conflict: 20000000229.
    const request = new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit: "20000000229" }),
    });
    const response = await POST(request, { params: Promise.resolve({ companyId: "company-A" }) });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("cuit_provider_conflict");
  });

  it("returns 422 cuit_no_iva_condition when the stub bucket raises it", async () => {
    const request = new Request("http://test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit: "20000000140" }),
    });
    const response = await POST(request, { params: Promise.resolve({ companyId: "company-A" }) });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("cuit_no_iva_condition");
  });
});