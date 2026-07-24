import { describe, expect, it, vi, beforeEach } from "vitest";

const { getApiAuthContext, requireCompanyMutationAccess, createDevolucion } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyMutationAccess: vi.fn(),
  createDevolucion: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext,
}));

vi.mock("@/lib/api/guards", () => ({
  requireCompanyMutationAccess,
  requireCompanyReadAccess: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: { __mockPrisma: true },
}));

vi.mock("@/lib/services/devolucion.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/devolucion.service")>();
  return {
    ...actual,
    createDevolucion,
    listDevoluciones: vi.fn(),
  };
});

import { POST } from "@/app/api/companies/[companyId]/devoluciones/route";

describe("POST /api/companies/[companyId]/devoluciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue({
      companyId: "company-1",
      actorUserId: "user-1",
      role: "logistica",
    });
    createDevolucion.mockResolvedValue({ id: "devolucion-1" });
  });

  it("forwards item trace fields to createDevolucion", async () => {
    const response = await POST(
      new Request("http://localhost/api/companies/company-1/devoluciones", {
        method: "POST",
        body: JSON.stringify({
          remitoId: "remito-1",
          items: [
            {
              description: "Tornillo 4.0",
              returnedQuantity: 2,
              lotNumber: " LOT-77 ",
              serialNumber: " SN-77 ",
              expirationDate: "2027-03-31T00:00:00.000Z",
            },
          ],
        }),
      }),
      { params: Promise.resolve({ companyId: "company-1" }) }
    );

    expect(response.status).toBe(201);
    expect(createDevolucion).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        remitoId: "remito-1",
        createdById: "user-1",
        items: [
          expect.objectContaining({
            description: "Tornillo 4.0",
            returnedQuantity: "2",
            lotNumber: "LOT-77",
            serialNumber: "SN-77",
            expirationDate: new Date("2027-03-31T00:00:00.000Z"),
          }),
        ],
      })
    );
  });
});
