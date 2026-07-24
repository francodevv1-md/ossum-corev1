import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getApiAuthContext,
  requireCompanyMutationAccess,
  registrarDevolucion,
} = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyMutationAccess: vi.fn(),
  registrarDevolucion: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext,
}));

vi.mock("@/lib/api/guards", () => ({
  requireCompanyMutationAccess,
}));

vi.mock("@/lib/prisma", () => ({
  default: { __mockPrisma: true },
}));

vi.mock("@/lib/services/remito.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/remito.service")>();
  return {
    ...actual,
    registrarDevolucion,
  };
});

import { POST } from "@/app/api/companies/[companyId]/remitos/[remitoId]/devolucion/route";

describe("POST /api/companies/[companyId]/remitos/[remitoId]/devolucion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue({
      companyId: "company-1",
      actorUserId: "user-1",
      role: "logistica",
    });
    registrarDevolucion.mockResolvedValue({
      id: "remito-1",
      visibleNumber: 42,
      companyId: "company-1",
      state: "Parcialmente_devuelto",
      returnedAt: null,
      updatedById: "user-1",
      items: [
        {
          id: "remito-item-1",
          description: "Tornillo 4.0",
          quantity: "10",
          returnedQuantity: "2",
        },
      ],
    });
  });

  it("delegates to registrarDevolucion and returns the updated Remito shape", async () => {
    const response = await POST(
      new Request("http://localhost/api/companies/company-1/remitos/remito-1/devolucion", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              itemId: " remito-item-1 ",
              returnedQuantity: 2,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ companyId: "company-1", remitoId: "remito-1" }) }
    );

    const json = await response.json();

    expect(response.status).toBe(200);
    expect(getApiAuthContext).toHaveBeenCalledWith(expect.any(Request), "company-1");
    expect(requireCompanyMutationAccess).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: "company-1", actorUserId: "user-1" }),
      expect.arrayContaining(["logistica"])
    );
    expect(registrarDevolucion).toHaveBeenCalledTimes(1);
    expect(registrarDevolucion).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        remitoId: "remito-1",
        updatedById: "user-1",
        prisma: { __mockPrisma: true },
        items: [{ itemId: "remito-item-1", returnedQuantity: "2" }],
      })
    );
    expect(json).toEqual({
      data: expect.objectContaining({
        id: "remito-1",
        companyId: "company-1",
        state: "Parcialmente_devuelto",
        items: [
          expect.objectContaining({
            id: "remito-item-1",
            returnedQuantity: "2",
          }),
        ],
      }),
    });
  });
});
