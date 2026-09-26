import { describe, expect, it } from "vitest";

import { listArticleCatalog } from "@/lib/services/article-catalog.service";

describe("article catalog service", () => {
  it("derives organization scope from the authoritative company before listing", async () => {
    const company = { findUnique: async () => ({ organizationId: "org-1" }) };
    const brand = { findMany: async ({ where }: { where: unknown }) => {
      expect(where).toEqual({ organizationId: "org-1", isActive: true });
      return [{ id: "brand-1", name: "Acme", code: "ACME", isActive: true }];
    } };
    const result = await listArticleCatalog({ company, brand } as never, "company-1", "brand");
    expect(result).toEqual([{ id: "brand-1", name: "Acme", code: "ACME", isActive: true, parentId: null, depth: null }]);
  });
});
