import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ identity: vi.fn(), memberships: vi.fn(), select: vi.fn(), resolve: vi.fn() }));
vi.mock("@/lib/api/identity-context", () => ({ getApiIdentity: mocks.identity }));
vi.mock("@/lib/api/guards", () => ({
  getActiveCompanyMemberships: mocks.memberships,
  requireSelectedCompanyMembership: mocks.select,
}));
vi.mock("@/lib/services/remito-scan.service", () => ({ resolveRemitoScan: mocks.resolve }));
vi.mock("@/lib/prisma", () => ({ default: { mock: true } }));

import { POST } from "@/app/api/remitos/scan/resolve/route";
import { conflict, forbidden } from "@/lib/api/errors";
import { installRemitoActivationRuntime } from "@/lib/remito-verification/activation";

const valid = "rm1zzzzzzzzzzzzzzzzh";
const request = (body: unknown) => new Request("http://localhost/api/remitos/scan/resolve", {
  method: "POST", body: JSON.stringify(body),
});

describe("POST /api/remitos/scan/resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity.mockResolvedValue({ actorUserId: "user-1" });
    mocks.memberships.mockResolvedValue([]);
    installRemitoActivationRuntime({ flags: {
      remitoLocatorIssuanceWrites: true, remitoInternalScanRead: true,
      remitoPublicPublicationWrites: false, remitoPublicCompatibilityRead: false, remitoPrintCodes: false,
    }, cohort: { companyIds: ["company-a"], cohortStart: new Date(0) } });
  });

  it.each([
    [conflict("Select a company before scanning", "company_selection_required"), 409],
    [forbidden("Company access denied", "company_access_denied"), 403],
  ])("returns company gate errors before locator normalization", async (error, status) => {
    mocks.select.mockImplementation(() => { throw error; });
    const response = await POST(request({ locator: "invalid", selectedCompanyId: "company-x" }));
    expect(response.status).toBe(status);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it("authenticates before membership and resolves a normalized locator in the selected tenant", async () => {
    const order: string[] = [];
    mocks.identity.mockImplementation(async () => { order.push("identity"); return { actorUserId: "u" }; });
    mocks.memberships.mockImplementation(async () => { order.push("memberships"); return [{ companyId: "company-a" }]; });
    mocks.select.mockImplementation(() => { order.push("selection"); return { companyId: "company-a", role: "admin" }; });
    mocks.resolve.mockImplementation(async () => { order.push("lookup"); return { capabilities: { canDeliver: false, canReturn: false } }; });

    const response = await POST(request({ locator: valid, selectedCompanyId: "company-a" }));
    expect(response.status).toBe(200);
    expect(order).toEqual(["identity", "memberships", "selection", "lookup"]);
    expect(mocks.resolve).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-a", role: "admin", locator: "RM1-ZZZZ-ZZZZ-ZZZZ-ZZZZ-H",
    }));
  });
});
