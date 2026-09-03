// OSSUM COR — Invoice validators (Fase 1D)

import { z } from "zod";
import { INVOICE_BASES, INVOICE_STATES, INVOICE_TRANSITIONS } from "../services/invoice.service";

export { INVOICE_BASES, INVOICE_STATES, INVOICE_TRANSITIONS };

const decimalStringOrNumber = z.union([z.number(), z.string()]).transform((value) => String(value));
const positiveDecimal = decimalStringOrNumber.refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "must be a positive number");
const nonNegativeDecimal = decimalStringOrNumber.refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "must be a non-negative number");

export const invoiceItemCreateSchema = z.object({
  sku: z.string().trim().optional(),
  description: z.string().trim().min(1, "description is required"),
  quantity: positiveDecimal,
  unit: z.string().trim().optional(),
  unitPrice: nonNegativeDecimal.optional(),
  discount: nonNegativeDecimal.optional(),
  tax: nonNegativeDecimal.optional(),
  sourceType: z.string().trim().optional(),
  sourceItemId: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const invoiceCreateSchema = z.object({
  surgeryId: z.string().trim().optional(),
  base: z.enum(INVOICE_BASES as unknown as [string, ...string[]]).default("manual").optional(),
  type: z.string().trim().min(1).default("FV").optional(),
  currency: z.string().trim().min(1).default("ARS").optional(),
  items: z.array(invoiceItemCreateSchema).min(1, "items must not be empty"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const invoiceSourceDraftCreateSchema = z.object({
  presupuestoId: z.string().trim().min(1, "presupuestoId is required"),
  consumoId: z.string().trim().min(1, "consumoId is required").optional(),
}).strict();

export const invoiceStateTransitionSchema = z.object({
  newState: z.enum(INVOICE_STATES as unknown as [string, ...string[]]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const invoiceListQuerySchema = z
  .object({
    surgeryId: z.string().trim().optional(),
    state: z.enum(INVOICE_STATES as unknown as [string, ...string[]]).optional(),
    base: z.enum(INVOICE_BASES as unknown as [string, ...string[]]).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    take: z.coerce.number().int().nonnegative().optional(),
    skip: z.coerce.number().int().nonnegative().optional(),
  })
  .partial();

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceSourceDraftCreateInput = z.infer<typeof invoiceSourceDraftCreateSchema>;
export type InvoiceListQueryInput = z.infer<typeof invoiceListQuerySchema>;
