// OSSUM COR — Presupuesto validator (Fase 1C)
// Zod schemas for API body/query normalization. Decimal values stay string/number.

import { z } from "zod";
import {
  PRESUPUESTO_STATES,
  PRESUPUESTO_TRANSITIONS,
} from "../services/presupuesto.service";
import { SUPPORTED_VAT_TREATMENTS } from "../commercial/vat";

export { PRESUPUESTO_STATES, PRESUPUESTO_TRANSITIONS };

export type PresupuestoState = (typeof PRESUPUESTO_STATES)[number];

const decimalStringOrNumber = z.union([z.number(), z.string()]).transform((value) => String(value));

const positiveDecimal = decimalStringOrNumber.refine((value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}, "must be a positive number");

const nonNegativeDecimal = decimalStringOrNumber.refine((value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}, "must be a non-negative number");

export const presupuestoItemCreateSchema = z.object({
  sku: z.string().trim().optional().nullable(),
  description: z.string().trim().min(1, "description is required"),
  quantity: positiveDecimal,
  unit: z.string().trim().optional().nullable(),
  unitPrice: nonNegativeDecimal.optional().nullable(),
  discount: nonNegativeDecimal.optional().nullable(),
  discountRate: nonNegativeDecimal.optional().nullable(),
  discountPercent: nonNegativeDecimal.optional().nullable(),
  tax: nonNegativeDecimal.optional().nullable(),
  taxRate: nonNegativeDecimal.optional().nullable(),
  vatTreatment: z.enum(SUPPORTED_VAT_TREATMENTS as unknown as [string, ...string[]]).default("GRAVADO").optional(),
  vatRate: nonNegativeDecimal.optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
}).superRefine((data, ctx) => {
  const qty = Number(data.quantity);
  const price = data.unitPrice !== undefined && data.unitPrice !== null ? Number(data.unitPrice) : 0;
  let disc = data.discount !== undefined && data.discount !== null ? Number(data.discount) : 0;
  const rate = data.discountRate !== undefined && data.discountRate !== null
    ? Number(data.discountRate)
    : data.discountPercent !== undefined && data.discountPercent !== null
      ? Number(data.discountPercent)
      : undefined;

  if (rate !== undefined && (data.discount === undefined || data.discount === null)) {
    disc = (qty * price * Math.min(Math.max(rate, 0), 100)) / 100;
  }

  const net = qty * price;
  if (disc > net + 0.0001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Discount (${disc}) cannot exceed line net amount (${net})`,
      path: ["discount"],
    });
  }
  if (data.vatTreatment && (data.vatTreatment === "EXENTO" || data.vatTreatment === "NO_GRAVADO")) {
    const rawRate = data.vatRate ?? data.taxRate;
    if (rawRate !== undefined && rawRate !== null && Number(rawRate) !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.vatTreatment} requires vatRate to be 0`,
        path: ["vatRate"],
      });
    }
  }
});

export const presupuestoCreateSchema = z.object({
  surgeryId: z.string().trim().optional().nullable(),
  branchId: z.string().trim().optional().nullable(),
  clientContactId: z.string().trim().optional().nullable(),
  payerContactId: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  currency: z.string().trim().min(1).default("ARS").optional(),
  documentDate: z.union([z.string(), z.date()]).optional().nullable(),
  paymentTerms: z.string().trim().optional().nullable(),
  priceListCode: z.string().trim().optional().nullable(),
  legend: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  generalDiscountRate: nonNegativeDecimal.optional().nullable(),
  commercial: z.record(z.string(), z.unknown()).optional().nullable(),
  items: z.array(presupuestoItemCreateSchema).min(1, "items must not be empty"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type PresupuestoCreateInput = z.infer<typeof presupuestoCreateSchema>;
export type PresupuestoItemCreateInput = z.infer<typeof presupuestoItemCreateSchema>;

export const presupuestoUpdateDraftSchema = z.object({
  branchId: z.string().trim().optional().nullable(),
  clientContactId: z.string().trim().optional().nullable(),
  payerContactId: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  currency: z.string().trim().min(1).default("ARS").optional(),
  documentDate: z.union([z.string(), z.date()]).optional().nullable(),
  paymentTerms: z.string().trim().optional().nullable(),
  priceListCode: z.string().trim().optional().nullable(),
  legend: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  generalDiscountRate: nonNegativeDecimal.optional().nullable(),
  commercial: z.record(z.string(), z.unknown()).optional().nullable(),
  expectedRevision: z.coerce.number().int().positive("expectedRevision must be a positive integer"),
  items: z.array(presupuestoItemCreateSchema).min(1, "items must not be empty"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type PresupuestoUpdateDraftInput = z.infer<typeof presupuestoUpdateDraftSchema>;

export const PRESUPUESTO_COMMAND_MAP: Record<string, PresupuestoState> = {
  approve: "Aprobado",
  reject: "Rechazado",
  expire: "Vencido",
  annul: "Anulado",
};

export const presupuestoStateTransitionSchema = z.object({
  newState: z.enum(PRESUPUESTO_STATES as unknown as [string, ...string[]]).optional(),
  command: z.enum(["approve", "reject", "expire", "annul"]).optional(),
  expectedRevision: z.coerce.number().int().positive("expectedRevision must be a positive integer"),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.newState && !data.command) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either newState or command must be provided",
      path: ["newState"],
    });
  }
});

export type PresupuestoStateTransitionInput = z.infer<typeof presupuestoStateTransitionSchema>;

export const presupuestoCreateVersionSchema = z.object({
  items: z.array(presupuestoItemCreateSchema).min(1, "items must not be empty").optional(),
  expectedRevision: z.coerce.number().int().positive("expectedRevision must be a positive integer"),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type PresupuestoCreateVersionInput = z.infer<typeof presupuestoCreateVersionSchema>;

export const presupuestoEmitSchema = z.object({
  expectedRevision: z.coerce.number().int().positive("expectedRevision must be a positive integer"),
});

export type PresupuestoEmitInput = z.infer<typeof presupuestoEmitSchema>;

export const presupuestoDeleteDraftSchema = z.object({
  expectedRevision: z.coerce.number().int().positive("expectedRevision must be a positive integer"),
});

export type PresupuestoDeleteDraftInput = z.infer<typeof presupuestoDeleteDraftSchema>;

export const presupuestoListQuerySchema = z
  .object({
    surgeryId: z.string().trim().optional(),
    state: z.enum(PRESUPUESTO_STATES as unknown as [string, ...string[]]).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    take: z.coerce.number().int().nonnegative().optional(),
    skip: z.coerce.number().int().nonnegative().optional(),
  })
  .partial();

export type PresupuestoListQueryInput = z.infer<typeof presupuestoListQuerySchema>;
