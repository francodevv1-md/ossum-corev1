import { z } from "zod";

const quantity = z.string().trim().regex(/^\d+(?:\.\d{1,4})?$/, "quantity must be a non-negative decimal with up to 4 fractional digits");

export const createReceiptSchema = z.object({
  supplierId: z.string().trim().min(1).optional(),
  documentReference: z.string().trim().min(1).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  expectedLines: z.array(z.object({
    articleId: z.string().trim().min(1).optional(),
    code: z.string().trim().optional(),
    description: z.string().trim().optional(),
    expectedQuantity: quantity,
    lotCode: z.string().trim().optional(),
    expirationDate: z.coerce.date().optional(),
  })).optional(),
});

export const receiptScanSchema = z.object({
  rawValue: z.string().min(1).refine((value) => value.trim().length > 0, "rawValue is required"),
});

export const resolveReceiptScanSchema = z.object({ articleId: z.string().trim().min(1) });
export const captureReceiptScanSchema = z.object({ rawValue: z.string().min(1).refine((value) => value.trim().length > 0, "rawValue is required") });

export const receiptLineSchema = z.object({
  articleId: z.string().trim().min(1),
  requestedQuantity: quantity,
  lotCode: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  expirationDate: z.coerce.date().optional(),
  rawScan: z.string().trim().optional(),
});

export const confirmReceiptSchema = z.object({ idempotencyKey: z.string().trim().min(1).max(200).optional() });

export const createPreparationSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  cajasAssignmentId: z.string().trim().min(1).optional(),
  lines: z.array(z.object({ articleId: z.string().trim().min(1), requestedQuantity: quantity, stockUnit: z.string().trim().min(1).default("u") })).min(1),
});

export const reservePreparationSchema = z.object({
  lineId: z.string().trim().min(1),
  positionId: z.string().trim().min(1),
  quantity,
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

export type ReceiptLineInput = z.infer<typeof receiptLineSchema>;
