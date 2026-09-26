import { z } from "zod";

export const ARTICLE_TRACEABILITY_REQUIREMENTS = ["NONE", "LOT", "SERIAL", "LOT_OR_SERIAL", "LOT_AND_SERIAL"] as const;
export type ArticleTraceabilityRequirement = (typeof ARTICLE_TRACEABILITY_REQUIREMENTS)[number];

export const articleIdentifierSchema = z.object({
  type: z.enum(["MANUFACTURER_REF", "GTIN_EAN", "GS1_AI_22", "SUPPLIER_CODE", "ALTERNATIVE_CODE", "OSSUM_CODE"]),
  value: z.string().trim().min(1),
  sourcePayload: z.string().trim().min(1).optional(),
  manufacturerContext: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
});

export const articleCreateSchema = z.object({
  description: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  articleType: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  family: z.string().trim().optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  clinicalFamilyId: z.string().trim().min(1).nullable().optional(),
  brandId: z.string().trim().min(1).nullable().optional(),
  manufacturerId: z.string().trim().min(1).nullable().optional(),
  productLineId: z.string().trim().min(1).nullable().optional(),
  modelVariant: z.string().trim().optional(),
  measure: z.string().trim().optional(),
  unit: z.string().trim().min(1).default("u"),
  traceabilityRequirement: z.enum(ARTICLE_TRACEABILITY_REQUIREMENTS).default("NONE"),
  expirationRequired: z.boolean().default(false),
  identifiers: z.array(articleIdentifierSchema).default([]),
  supplierMappings: z.array(z.object({ supplierId: z.string().trim().min(1), supplierCode: z.string().trim().min(1) })).default([]),
});

export const articleUpdateSchema = articleCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const articleLookupQuerySchema = z.object({
  q: z.string().trim().optional(),
  identifier: z.string().trim().optional(),
  identifierType: articleIdentifierSchema.shape.type.optional(),
  manufacturerContext: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  supplierCode: z.string().trim().optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
});

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
export type ArticleLookupQuery = z.infer<typeof articleLookupQuerySchema>;

export function normalizeArticleIdentifier(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function identifierScopeKey(input: { manufacturerContext?: string; supplierId?: string }): string {
  return input.supplierId ? `SUPPLIER:${input.supplierId}` : input.manufacturerContext ? `MANUFACTURER:${normalizeArticleIdentifier(input.manufacturerContext)}` : "GLOBAL";
}

export function resolutionStatus(candidateCount: number): "resolved" | "not_found" | "ambiguous" {
  return candidateCount === 1 ? "resolved" : candidateCount === 0 ? "not_found" : "ambiguous";
}
