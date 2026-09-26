import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class GeorefLookupUnavailableError extends Error {
    readonly code = "georef_lookup_unavailable";
  }
  return { auth: vi.fn(), guard: vi.fn(), lookup: vi.fn(), GeorefLookupUnavailableError };
});
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: mocks.guard }));
vi.mock("@/lib/georef/georef-address.adapter", () => ({ GeorefLookupUnavailableError: mocks.GeorefLookupUnavailableError, lookupGeorefAddress: mocks.lookup }));

import { forbidden } from "@/lib/api/errors";
import { POST } from "@/app/api/companies/[companyId]/contacts/georef/lookup/route";

describe("contact Georef lookup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ companyId: "company-a", actorUserId: "actor-1", role: "operator" });
    mocks.lookup.mockResolvedValue([]);
  });

  it("reuses company mutation access and denies a foreign tenant before lookup", async () => {
    mocks.guard.mockImplementationOnce(() => { throw forbidden("Company access denied", "company_access_denied"); });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ street: "A" }) }), { params: Promise.resolve({ companyId: "company-b" }) });
    expect(response.status).toBe(403);
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "company-b");
    expect(mocks.guard).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-a" }), ["admin", "operator"]);
    expect(mocks.lookup).not.toHaveBeenCalled();
  });

  it.each(["upstream 502", "timeout or network failure", "invalid JSON", "malformed provider payload"])("maps %s to a safe 503 lookup error", async () => {
    mocks.lookup.mockRejectedValueOnce(new mocks.GeorefLookupUnavailableError("provider detail must not escape"));

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ street: "A" }) }), { params: Promise.resolve({ companyId: "company-a" }) });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: { code: "georef_lookup_unavailable", message: "Georef lookup is temporarily unavailable." } });
  });

  it("returns valid empty candidates and rejects invalid input", async () => {
    const empty = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ street: "A" }) }), { params: Promise.resolve({ companyId: "company-a" }) });
    const invalid = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ street: "" }) }), { params: Promise.resolve({ companyId: "company-a" }) });

    expect(empty.status).toBe(200);
    await expect(empty.json()).resolves.toEqual({ data: { candidates: [] } });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({ error: { code: "invalid_georef_lookup" } });
  });
});
