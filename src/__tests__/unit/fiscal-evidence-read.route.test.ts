import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getApiAuthContext: vi.fn(), requireCompanyReadAccess: vi.fn(), getFiscalEvidence: vi.fn() }));
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.requireCompanyReadAccess }));
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma" } }));
vi.mock("@/lib/services/fiscal-evidence-read.service", () => ({ getFiscalEvidence: mocks.getFiscalEvidence }));

import { forbidden, notFound, unauthorized } from "@/lib/api/errors";
import { GET } from "@/app/api/companies/[companyId]/invoices/[invoiceId]/fiscal-evidence/route";

const context = { params: Promise.resolve({ companyId: "company-route", invoiceId: "invoice-1" }) };
const auth = { companyId: "company-authoritative", actorUserId: "user-1", role: "operator" };

describe("GET fiscal evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue(auth);
    mocks.getFiscalEvidence.mockResolvedValue({ document: { id: "fiscal-1", state: "UNKNOWN" }, attempts: [] });
  });

  it("uses the authorized company and read-only projection", async () => {
    const response = await GET(new Request("http://localhost/api"), context);
    expect(response.status).toBe(200);
    expect(mocks.getFiscalEvidence).toHaveBeenCalledWith({ marker: "prisma" }, "company-authoritative", "invoice-1");
  });

  it("uses standard errors for authorization and absent evidence", async () => {
    mocks.getApiAuthContext.mockRejectedValueOnce(unauthorized());
    expect((await GET(new Request("http://localhost/api"), context)).status).toBe(401);
    mocks.requireCompanyReadAccess.mockImplementationOnce(() => { throw forbidden(); });
    expect((await GET(new Request("http://localhost/api"), context)).status).toBe(403);
    mocks.getFiscalEvidence.mockRejectedValueOnce(notFound("Fiscal evidence not found", "fiscal_evidence_not_found"));
    expect((await GET(new Request("http://localhost/api"), context)).status).toBe(404);
  });
});
