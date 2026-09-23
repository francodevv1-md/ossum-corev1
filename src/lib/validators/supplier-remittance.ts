import { z } from "zod";

const line = z.object({
  expectedCode: z.string().trim().max(120).optional(),
  expectedDescription: z.string().trim().min(1).max(500),
  expectedQuantity: z.coerce.number().finite().positive(),
  articleId: z.string().trim().min(1).optional(),
  lotCode: z.string().trim().min(1).optional(),
  expirationDate: z.string().date().optional(),
});

export const supplierRemittanceCreateSchema = z.object({
  supplierId: z.string().trim().min(1),
  number: z.string().trim().min(1).max(120),
  documentDate: z.string().date(),
  observations: z.string().trim().max(4000).optional(),
  lines: z.array(line).min(1),
}).strict();

export type SupplierRemittanceCreateInput = z.infer<typeof supplierRemittanceCreateSchema>;
export const manualSupplierRemittanceLinkSchema = z.object({ supplierRemittanceId: z.string().trim().min(1) }).strict();
