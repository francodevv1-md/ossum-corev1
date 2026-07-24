// OSSUM COR — Payment validators (Fase 1D)

import { z } from "zod";
import { PAYMENT_STATES } from "../services/payment.service";

export { PAYMENT_STATES };

const decimalStringOrNumber = z.union([z.number(), z.string()]).transform((value) => String(value));
const positiveDecimal = decimalStringOrNumber.refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "must be a positive number");

export const paymentImputationCreateSchema = z.object({
  invoiceId: z.string().trim().min(1, "invoiceId is required"),
  amount: positiveDecimal,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const paymentCreateSchema = z.object({
  surgeryId: z.string().trim().optional(),
  method: z.string().trim().optional(),
  currency: z.string().trim().min(1).default("ARS").optional(),
  amount: positiveDecimal,
  receivedAt: z.coerce.date().optional(),
  imputations: z.array(paymentImputationCreateSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const paymentListQuerySchema = z
  .object({
    surgeryId: z.string().trim().optional(),
    state: z.enum(PAYMENT_STATES as unknown as [string, ...string[]]).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    take: z.coerce.number().int().nonnegative().optional(),
    skip: z.coerce.number().int().nonnegative().optional(),
  })
  .partial();

export const paymentCancelSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
}).optional();

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentListQueryInput = z.infer<typeof paymentListQuerySchema>;
