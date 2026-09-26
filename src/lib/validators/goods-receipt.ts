import { z } from "zod";

const line = z.object({
  articleId: z.string().trim().min(1),
  depositId: z.string().trim().min(1),
  quantity: z.coerce.number().finite().positive(),
  lotCode: z.string().trim().min(1).optional(),
  expirationDate: z.string().date().optional(),
});

export const goodsReceiptCreateSchema = z.object({
  supplierId: z.string().trim().min(1).optional(),
  documentReference: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().min(1).max(120).optional(),
  supplierRemittanceId: z.string().trim().min(1).optional(),
  lines: z.array(line),
}).strict().superRefine((value, context) => {
  if (value.lines.length === 0 && !value.supplierRemittanceId) context.addIssue({ code: "custom", path: ["lines"], message: "Only supplier remittances may be registered without receipt lines" });
});

export type GoodsReceiptCreateInput = z.infer<typeof goodsReceiptCreateSchema>;
