import { beforeEach, describe, expect, it, vi } from "vitest";

const { getApiAuthContext, requireCompanyReadAccess, getRemitoDevPreset } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyReadAccess: vi.fn(),
  getRemitoDevPreset: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess }));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/services/remito-dev-preset.service", () => ({ getRemitoDevPreset }));

import { GET } from "@/app/api/companies/[companyId]/remitos/dev-preset/route";

describe("GET /api/companies/[companyId]/remitos/dev-preset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue({ companyId: "company-dev", role: "admin" });
    getRemitoDevPreset.mockResolvedValue({ available: false });
  });

  it("uses authenticated company scope and returns the safe capability contract", async () => {
    const response = await GET(new Request("http://localhost/api/companies/path-company/remitos/dev-preset"), { params: Promise.resolve({ companyId: "path-company" }) });

    expect(requireCompanyReadAccess).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-dev" }));
    expect(getRemitoDevPreset).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-dev" }));
    await expect(response.json()).resolves.toEqual({ data: { available: false } });
  });
});
