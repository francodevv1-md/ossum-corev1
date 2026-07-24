// OSSUM COR — Presupuesto validator (Fase 1C)
// Zod schemas for API body/query normalization. Decimal values stay string/number.

import { z } from "zod";
import {
  PRESUPUESTO_STATES,
  PRESUPUESTO_TRANSITIONS,
} from "../services/presupuesto.service";

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
  sku: z.string().trim().optional(),
  description: z.string().trim().min(1, "description is required"),
  quantity: positiveDecimal,
  unit: z.string().trim().optional(),
  unitPrice: nonNegativeDecimal.optional(),
  discount: nonNegativeDecimal.optional(),
  tax: nonNegativeDecimal.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const presupuestoCreateSchema = z.object({
  surgeryId: z.string().trim().optional(),
  title: z.string().trim().optional(),
  currency: z.string().trim().min(1).default("ARS").optional(),
  validUntil: z.coerce.date().optional(),
  items: z.array(presupuestoItemCreateSchema).min(1, "items must not be empty"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type PresupuestoCreateInput = z.infer<typeof presupuestoCreateSchema>;
export type PresupuestoItemCreateInput = z.infer<typeof presupuestoItemCreateSchema>;

export const presupuestoStateTransitionSchema = z.object({
  newState: z.enum(PRESUPUESTO_STATES as unknown as [string, ...string[]]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PresupuestoStateTransitionInput = z.infer<typeof presupuestoStateTransitionSchema>;

export const presupuestoCreateVersionSchema = z.object({
  items: z.array(presupuestoItemCreateSchema).min(1, "items must not be empty").optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PresupuestoCreateVersionInput = z.infer<typeof presupuestoCreateVersionSchema>;

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
