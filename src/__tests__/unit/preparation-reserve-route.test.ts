import { beforeEach, describe, expect, it, vi } from "vitest";

const { getApiAuthContext, requireStockOperationAccess, reservePreparation } = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireStockOperationAccess: vi.fn(),
  reservePreparation: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));
vi.mock("@/lib/permissions/stock-operations", () => ({ requireStockOperationAccess }));
vi.mock("@/lib/prisma", () => ({ default: { __mockPrisma: true } }));
vi.mock("@/lib/services/preparation.service", () => ({ reservePreparation }));

import { POST } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/preparation/reserve/route";

describe("POST /preparation/reserve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue({ companyId: "company-a", actorUserId: "user-a", role: "operator" });
    reservePreparation.mockResolvedValue({ id: "reservation-a" });
  });

  it("passes the URL surgeryId to the server-side reservation service", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ preparationId: "prep-a", lineId: "line-a", positionId: "position-a", quantity: "1" }) }), { params: Promise.resolve({ companyId: "company-a", surgeryId: "surgery-url" }) });
    expect(response.status).toBe(200);
    expect(reservePreparation).toHaveBeenCalledWith({ __mockPrisma: true }, "company-a", "surgery-url", "prep-a", "user-a", expect.objectContaining({ lineId: "line-a" }));
  });
});
