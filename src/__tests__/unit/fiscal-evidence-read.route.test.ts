import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyReadAccess: vi.fn(),
  getFiscalEvidence: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.requireCompanyReadAccess }));
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma" } }));
vi.mock("@/lib/services/fiscal-evidence-read.service", () => ({ getFiscalEvidence: mocks.getFiscalEvidence }));

import { forbidden, notFound, unauthorized } from "@/lib/api/errors";
import { GET } from "@/app/api/companies/[companyId]/invoices/[invoiceId]/fiscal-evidence/route";

const context = { params: Promise.resolve({ companyId: "company-route", invoiceId: "invoice-1" }) };
const auth = { companyId: "company-authoritative", actorUserId: "user-1", role: "operator" };

describe("GET /api/companies/[companyId]/invoices/[invoiceId]/fiscal-evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue(auth);
    mocks.getFiscalEvidence.mockResolvedValue({ document: { id: "fiscal-1", state: "UNKNOWN" }, attempts: [] });
  });

  it("uses the authorized company and exposes the read projection", async () => {
    const response = await GET(new Request("http://localhost/api"), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { document: { id: "fiscal-1", state: "UNKNOWN" }, attempts: [] } });
    expect(mocks.getApiAuthContext).toHaveBeenCalledWith(expect.any(Request), "company-route");
    expect(mocks.requireCompanyReadAccess).toHaveBeenCalledWith(auth);
    expect(mocks.getFiscalEvidence).toHaveBeenCalledWith({ marker: "prisma" }, "company-authoritative", "invoice-1");
    expect(mocks.getFiscalEvidence).not.toHaveBeenCalledWith({ marker: "prisma" }, "company-route", "invoice-1");
  });

  it("returns the standard envelope when authentication fails", async () => {
    mocks.getApiAuthContext.mockRejectedValueOnce(unauthorized());

    const response = await GET(new Request("http://localhost/api"), context);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: { code: "unauthorized", message: "Unauthorized" } });
  });

  it("returns the standard envelope when company access is denied", async () => {
    mocks.requireCompanyReadAccess.mockImplementationOnce(() => { throw forbidden(); });

    const response = await GET(new Request("http://localhost/api"), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { code: "forbidden", message: "Forbidden" } });
  });

  it("does not disclose fiscal evidence outside the authorized company", async () => {
    mocks.getFiscalEvidence.mockRejectedValueOnce(notFound("Fiscal evidence not found", "fiscal_evidence_not_found"));

    const response = await GET(new Request("http://localhost/api"), context);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "fiscal_evidence_not_found" } });
  });

  it("returns the standard 500 envelope for an unexpected service failure", async () => {
    mocks.getFiscalEvidence.mockRejectedValueOnce(new Error("database detail must not escape"));

    const response = await GET(new Request("http://localhost/api"), context);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: { code: "internal_error", message: "Internal server error" } });
  });
});
