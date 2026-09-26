import { describe, expect, it } from "vitest";

import { articleCatalogCreateSchema, articleCatalogKindSchema, normalizeCatalogName } from "@/lib/validators/article-catalog";

describe("article catalog validators", () => {
  it("normalizes catalog names and accepts only supported kinds", () => {
    expect(normalizeCatalogName(" Prótesis  CÁDERA ")).toBe("protesis cadera");
    expect(articleCatalogKindSchema.safeParse("brand").success).toBe(true);
    expect(articleCatalogKindSchema.safeParse("supplier").success).toBe(false);
    expect(articleCatalogCreateSchema.parse({ name: " Acme " })).toEqual({ name: "Acme" });
  });
});
