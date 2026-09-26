import { describe, expect, it } from "vitest";
import { vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ default: {} }));
import { requireCajasControlAccess, requireCajasDifferenceResolutionAccess, requireCajasDispatchAccess } from "@/lib/permissions/stock-operations";

const context = (role: string) => ({ role } as any);

describe("Phase C explicit Caja action permissions", () => {
  it.each([requireCajasControlAccess, requireCajasDifferenceResolutionAccess, requireCajasDispatchAccess])("allows admin and operator only", guard => {
    expect(() => guard(context("admin"))).not.toThrow();
    expect(() => guard(context("operator"))).not.toThrow();
    expect(() => guard(context("coordinador"))).toThrow(expect.objectContaining({ code: "company_mutation_access_denied" }));
  });
});
