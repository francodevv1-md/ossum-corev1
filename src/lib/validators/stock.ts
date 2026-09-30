import { z } from "zod";

export const stockMovementTypeSchema = z.enum([
  "RECEIPT_IN",
  "DISPATCH_OUT",
  "ADJUSTMENT",
  "RETURN_IN",
  "TRANSFER",
]);

export const stockAvailabilityQuerySchema = z.object({
  search: z.string().trim().optional(),
  family: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  articleType: z.string().trim().optional(),
  deposit: z.string().trim().optional(),
  quickFilter: z.enum(["bajo", "sinstock", "transito", ""]).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  sortKey: z.string().trim().optional().default("articulo"),
  sortDir: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const stockAdjustmentCreateSchema = z.object({
  articleId: z.string().trim().min(1, "articleId is required"),
  quantity: z.union([z.string(), z.number()]).transform((val, ctx) => {
    const s = String(val).trim().replace(",", ".");
    const num = Number(s);
    if (!Number.isFinite(num) || num === 0) {
      ctx.addIssue({
        code: "custom",
        message: "quantity must be a non-zero number",
      });
      return z.NEVER;
    }
    return s;
  }),
  lotCode: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  expirationDate: z.string().trim().optional(),
  location: z.string().trim().optional(),
  boxId: z.string().trim().optional(),
  reason: z.string().trim().min(1, "reason is required for audited adjustments"),
  idempotencyKey: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type StockMovementTypeInput = z.infer<typeof stockMovementTypeSchema>;
export type StockAvailabilityQuery = z.infer<typeof stockAvailabilityQuerySchema>;
export type StockAdjustmentCreateInput = z.infer<typeof stockAdjustmentCreateSchema>;
