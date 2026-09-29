import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyMutationRole: vi.fn(),
  issueFiscalInvoiceDev: vi.fn(),
  reconcileFiscalInvoiceDev: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({
  requireCompanyMutationRole: mocks.requireCompanyMutationRole,
  requireCompanyMutationAccess: mocks.requireCompanyMutationRole,
}));
vi.mock("@/lib/services/fiscal-issuance.service", () => ({
  issueFiscalInvoiceDev: mocks.issueFiscalInvoiceDev,
  reconcileFiscalInvoiceDev: mocks.reconcileFiscalInvoiceDev,
}));
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma" } }));

import { POST as postIssue } from "@/app/api/companies/[companyId]/invoices/[invoiceId]/fiscal-issue/route";
import { POST as postReconcile } from "@/app/api/companies/[companyId]/invoices/[invoiceId]/fiscal-reconcile/route";

describe("fiscal routes", () => {
  it("routes issue action with company guard and returns 200", async () => {
    mocks.getApiAuthContext.mockResolvedValue({ companyId: "company-auth", userId: "user-1" });
    mocks.issueFiscalInvoiceDev.mockResolvedValue({ document: { id: "doc-1", state: "UNKNOWN", displayState: "SIMULATED" }, attempts: [] });

    const request = new Request("http://localhost/api/companies/company-auth/invoices/inv-1/fiscal-issue", { method: "POST" });
    const response = await postIssue(request, { params: Promise.resolve({ companyId: "company-auth", invoiceId: "inv-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.requireCompanyMutationRole).toHaveBeenCalled();
    expect(mocks.issueFiscalInvoiceDev).toHaveBeenCalledWith({ marker: "prisma" }, "company-auth", "inv-1", "user-1");
  });

  it("routes reconcile action with company guard and returns 200", async () => {
    mocks.getApiAuthContext.mockResolvedValue({ companyId: "company-auth", userId: "user-1" });
    mocks.reconcileFiscalInvoiceDev.mockResolvedValue({ document: { id: "doc-1", state: "AUTHORIZED", displayState: "AUTHORIZED" }, attempts: [] });

    const request = new Request("http://localhost/api/companies/company-auth/invoices/inv-1/fiscal-reconcile", { method: "POST" });
    const response = await postReconcile(request, { params: Promise.resolve({ companyId: "company-auth", invoiceId: "inv-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.requireCompanyMutationRole).toHaveBeenCalled();
    expect(mocks.reconcileFiscalInvoiceDev).toHaveBeenCalledWith({ marker: "prisma" }, "company-auth", "inv-1", "user-1");
  });
});
