import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getApiAuthContext: vi.fn(), requireCompanyReadAccess: vi.fn(), requireArticleMutationAccess: vi.fn(), listArticleCatalog: vi.fn(), createArticleCatalog: vi.fn() }));
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess: mocks.requireCompanyReadAccess }));
vi.mock("@/lib/permissions/article", () => ({ requireArticleMutationAccess: mocks.requireArticleMutationAccess }));
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma" } }));
vi.mock("@/lib/services/article-catalog.service", () => ({ listArticleCatalog: mocks.listArticleCatalog, createArticleCatalog: mocks.createArticleCatalog }));

import { GET, POST } from "@/app/api/companies/[companyId]/article-catalogs/[kind]/route";

const context = { params: Promise.resolve({ companyId: "company-route", kind: "brand" }) };
describe("article catalog route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getApiAuthContext.mockResolvedValue({ companyId: "company-authoritative", role: "admin" }); });
  it("reads with the authoritative company context", async () => {
    mocks.listArticleCatalog.mockResolvedValue([{ id: "brand-1", name: "Acme" }]);
    const response = await GET(new Request("http://localhost/api"), context);
    expect(response.status).toBe(200);
    expect(mocks.listArticleCatalog).toHaveBeenCalledWith(expect.objectContaining({ marker: "prisma" }), "company-authoritative", "brand");
  });
  it("requires article mutation access and admin for quick-create", async () => {
    mocks.createArticleCatalog.mockResolvedValue({ id: "brand-1", name: "Acme" });
    const response = await POST(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ name: "Acme" }) }), context);
    expect(response.status).toBe(201);
    expect(mocks.requireArticleMutationAccess).toHaveBeenCalled();
    mocks.getApiAuthContext.mockResolvedValueOnce({ companyId: "company-authoritative", role: "operator" });
    expect((await POST(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ name: "Other" }) }), context)).status).toBe(403);
  });
});
