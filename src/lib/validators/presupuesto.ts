import { z } from "zod";

import { PRESUPUESTO_STATES } from "../services/presupuesto.service";

export { PRESUPUESTO_STATES };
export type PresupuestoState = (typeof PRESUPUESTO_STATES)[number];

const decimal = z.union([z.number(), z.string().trim().min(1)])
  .transform(String)
  .refine((value) => Number.isFinite(Number(value)), "must be finite");
const positiveDecimal = decimal.refine((value) => new Number(value).valueOf() > 0, "must be positive");
const percentage = decimal.refine((value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}, "must be between 0 and 100");

const firmPriceSchema = z.object({
  coordinator: z.string().trim().min(1),
  quotationContact: z.string().trim().min(1),
  includedMaterials: z.array(z.string().trim().min(1)),
  excludedMaterials: z.array(z.string().trim().min(1)),
  availability: z.string().trim().min(1),
  operationalClarifications: z.string().trim().min(1),
  surgicalAssumptions: z.string().trim().min(1),
}).strict();

export const presupuestoCommercialSchema = z.discriminatedUnion("pricingMode", [
  z.object({ pricingMode: z.literal("ESTIMATIVE") }).strict(),
  z.object({ pricingMode: z.literal("FIRM"), firmPrice: firmPriceSchema }).strict(),
]);

export const presupuestoItemCreateSchema = z.object({
  sku: z.string().trim().optional(),
  description: z.string().trim().min(1, "description is required"),
  quantity: positiveDecimal,
  unit: z.string().trim().optional(),
  unitPrice: decimal.refine((value) => Number(value) >= 0, "must be non-negative"),
  discountRate: percentage.default("0"),
  taxRate: percentage.default("0"),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

const draftFields = {
  branchId: z.string().trim().min(1),
  clientContactId: z.string().trim().min(1),
  payerContactId: z.string().trim().min(1),
  title: z.string().trim().optional(),
  currency: z.string().trim().min(1).default("ARS"),
  documentDate: z.coerce.date(),
  paymentTerms: z.string().trim().min(1),
  priceListCode: z.string().trim().min(1),
  legend: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  validUntil: z.coerce.date(),
  generalDiscountRate: percentage.default("0"),
  commercial: presupuestoCommercialSchema,
  items: z.array(presupuestoItemCreateSchema).min(1, "items must not be empty"),
} as const;

export const presupuestoCreateSchema = z.object({
  surgeryId: z.string().trim().min(1).optional(),
  ...draftFields,
}).strict();

export const presupuestoReplaceDraftSchema = z.object({
  expectedRevision: z.number().int().positive(),
  ...draftFields,
}).strict();

export const presupuestoExpectedRevisionSchema = z.object({
  expectedRevision: z.number().int().positive(),
}).strict();

export const presupuestoStateCommandSchema = z.object({
  command: z.enum(["approve", "reject", "expire", "annul"]),
  expectedRevision: z.number().int().positive(),
}).strict();

export const presupuestoListQuerySchema = z.object({
  surgeryId: z.string().trim().min(1).optional(),
  state: z.enum(PRESUPUESTO_STATES).optional(),
  take: z.coerce.number().int().nonnegative().optional(),
  skip: z.coerce.number().int().nonnegative().optional(),
}).strict();

export type PresupuestoCreateInput = z.infer<typeof presupuestoCreateSchema>;
export type PresupuestoReplaceDraftInput = z.infer<typeof presupuestoReplaceDraftSchema>;
export type PresupuestoItemCreateInput = z.infer<typeof presupuestoItemCreateSchema>;
