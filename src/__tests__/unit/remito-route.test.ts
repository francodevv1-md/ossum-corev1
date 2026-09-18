import { beforeEach, describe, expect, it, vi } from "vitest";

const { getApiAuthContext, requireCompanyMutationAccess, updateRemitoDraft } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyMutationAccess: vi.fn(),
  updateRemitoDraft: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({
  requireCompanyMutationAccess,
  requireCompanyReadAccess: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: { __mockPrisma: true } }));
vi.mock("@/lib/services/remito.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/remito.service")>();
  return { ...actual, updateRemitoDraft };
});

import { PATCH } from "@/app/api/companies/[companyId]/remitos/[remitoId]/route";
import { RemitoError } from "@/lib/services/remito.service";

describe("PATCH /api/companies/[companyId]/remitos/[remitoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue({
      companyId: "company-1",
      actorUserId: "user-1",
      role: "logistica",
    });
  });

  it("maps an atomic update conflict to HTTP 409 with remito_update_conflict", async () => {
    updateRemitoDraft.mockRejectedValue(
      new RemitoError(
        "remito_update_conflict",
        "El remito fue actualizado por otro usuario.",
        409
      )
    );

    const response = await PATCH(
      new Request("http://localhost/api/companies/company-1/remitos/remito-1", {
        method: "PATCH",
        body: JSON.stringify({
          expectedUpdatedAt: "2026-07-07T10:00:00.000Z",
          metadata: { note: "competing write" },
        }),
      }),
      { params: Promise.resolve({ companyId: "company-1", remitoId: "remito-1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "remito_update_conflict",
        message: "El remito fue actualizado por otro usuario.",
      },
    });
    expect(updateRemitoDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        remitoId: "remito-1",
        expectedUpdatedAt: "2026-07-07T10:00:00.000Z",
        updatedById: "user-1",
        prisma: { __mockPrisma: true },
      })
    );
  });
});
