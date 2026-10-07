import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as getMovimientos } from "@/app/api/companies/[companyId]/compras/movimientos/route";

// Mock the service module at the route layer only.
const findManyMock = vi.fn();
vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext: vi.fn().mockResolvedValue({
    companyId: "company-1",
    actorUserId: "user-1",
    role: "admin",
    canonicalRole: "admin",
    rawRole: "admin",
    organizationId: "org-1",
  }),
}));

vi.mock("@/lib/prisma", () => ({
  default: {},
}));

vi.mock("@/lib/services/compras-movimientos.service", () => ({
  listComprasMovimientos: (...args: unknown[]) =>
    (findManyMock as (...a: unknown[]) => unknown)(...args),
}));

const companyParams = Promise.resolve({ companyId: "company-1" });

describe("compras/movimientos route — ordenCompraId rejection and supplierId acceptance", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    findManyMock.mockResolvedValue([]);
  });

  it("returns 400 with explicit error code when ordenCompraId is supplied", async () => {
    const req = new Request(
      "http://localhost/api/companies/company-1/compras/movimientos?ordenCompraId=oc-1",
    );
    const res = await getMovimientos(req, { params: companyParams });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe(
      "movimientos_orden_compra_filter_unsupported",
    );
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("accepts supplierId and forwards it to the service unchanged", async () => {
    const req = new Request(
      "http://localhost/api/companies/company-1/compras/movimientos?supplierId=sup-1&take=2",
    );
    const res = await getMovimientos(req, { params: companyParams });
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledTimes(1);
    const arg = findManyMock.mock.calls[0][0] as {
      supplierId?: string;
      take?: number;
    };
    expect(arg.supplierId).toBe("sup-1");
    expect(arg.take).toBe(2);
  });
});