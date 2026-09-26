import { z } from "zod";

export const articleCatalogKindSchema = z.enum(["category", "clinical-family", "brand", "manufacturer", "product-line"]);
export type ArticleCatalogKind = z.infer<typeof articleCatalogKindSchema>;

export const articleCatalogCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.string().trim().min(1).optional(),
});

export type ArticleCatalogCreateInput = z.infer<typeof articleCatalogCreateSchema>;

export function normalizeCatalogName(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").trim().replace(/\s+/g, " ").toLowerCase();
}
