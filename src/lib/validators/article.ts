import { z } from "zod";
import { SUPPORTED_VAT_RATES, SUPPORTED_VAT_TREATMENTS, type SupportedVatRate, type VatTreatment } from "../commercial/vat";

export const ARTICLE_TRACEABILITY_POLICIES = ["NONE", "LOT", "LOT_EXPIRY", "SERIAL", "SERIAL_EXPIRY", "LOT_SERIAL_EXPIRY"] as const;
export type ArticleTraceabilityPolicy = (typeof ARTICLE_TRACEABILITY_POLICIES)[number];

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
  modelVariant: z.string().trim().optional(),
  measure: z.string().trim().optional(),
  unit: z.string().trim().min(1).default("u"),
  vatTreatment: z.enum(SUPPORTED_VAT_TREATMENTS).default("GRAVADO"),
  vatRate: z.coerce.number().refine(
    (val) => (SUPPORTED_VAT_RATES as readonly number[]).includes(val),
    { message: `Invalid VAT rate. Supported rates: ${SUPPORTED_VAT_RATES.join(", ")}` }
  ).default(21),
  traceabilityPolicy: z.enum(ARTICLE_TRACEABILITY_POLICIES).default("NONE"),
  identifiers: z.array(articleIdentifierSchema).default([]),
  supplierMappings: z.array(z.object({ supplierId: z.string().trim().min(1), supplierCode: z.string().trim().min(1) })).default([]),
}).superRefine((data, ctx) => {
  if ((data.vatTreatment === "EXENTO" || data.vatTreatment === "NO_GRAVADO") && data.vatRate !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${data.vatTreatment} requires vatRate to be 0`,
      path: ["vatRate"],
    });
  }
});

export const articleUpdateSchema = z.object({
  description: z.string().trim().min(1).optional(),
  sku: z.string().trim().optional(),
  articleType: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  family: z.string().trim().optional(),
  modelVariant: z.string().trim().optional(),
  measure: z.string().trim().optional(),
  unit: z.string().trim().min(1).optional(),
  vatTreatment: z.enum(SUPPORTED_VAT_TREATMENTS).optional(),
  vatRate: z.coerce.number().refine(
    (val) => (SUPPORTED_VAT_RATES as readonly number[]).includes(val),
    { message: `Invalid VAT rate. Supported rates: ${SUPPORTED_VAT_RATES.join(", ")}` }
  ).optional(),
  traceabilityPolicy: z.enum(ARTICLE_TRACEABILITY_POLICIES).optional(),
  identifiers: z.array(articleIdentifierSchema).optional(),
  supplierMappings: z.array(z.object({ supplierId: z.string().trim().min(1), supplierCode: z.string().trim().min(1) })).optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.vatTreatment && (data.vatTreatment === "EXENTO" || data.vatTreatment === "NO_GRAVADO") && data.vatRate !== undefined && data.vatRate !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${data.vatTreatment} requires vatRate to be 0`,
      path: ["vatRate"],
    });
  }
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
