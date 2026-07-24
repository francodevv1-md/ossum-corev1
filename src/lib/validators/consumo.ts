// OSSUM COR — Consumo validator (Fase 1B)
// Zod schemas for API body normalization of Consumo operations.
// Catálogos (states / transitions) re-exported from
// src/lib/services/consumo.service.ts to keep a single source of truth.

import { z } from "zod";
import { CONSUMO_STATES, CONSUMO_TRANSITIONS } from "../services/consumo.service";

export { CONSUMO_STATES, CONSUMO_TRANSITIONS };

export type ConsumoState = (typeof CONSUMO_STATES)[number];

// ─── Decimal-friendly quantity schema ──────────────────────────────────────
const positiveQuantity = z
  .union([z.number(), z.string()])
  .transform((value) => String(value))
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }, "quantity must be a positive number");

const nonNegativeQuantity = z
  .union([z.number(), z.string()])
  .transform((value) => String(value))
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }, "quantity must be a non-negative number");

const optionalTraceDate = z.coerce.date().optional();

// ─── Create Consumo ──────────────────────────────────────────────────────
export const consumoItemCreateSchema = z.object({
  remitoItemId: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  description: z.string().trim().min(1, "description is required"),
  requestedQuantity: positiveQuantity,
  consumedQuantity: nonNegativeQuantity.optional(),
  unit: z.string().trim().optional(),
  lotNumber: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  expirationDate: optionalTraceDate,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const consumoCreateSchema = z.object({
  surgeryId: z.string().trim().optional(),
  remitoId: z.string().trim().min(1, "remitoId is required"),
  items: z.array(consumoItemCreateSchema).min(1, "items must not be empty"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type ConsumoCreateInput = z.infer<typeof consumoCreateSchema>;
export type ConsumoItemCreateInput = z.infer<typeof consumoItemCreateSchema>;

// ─── State transition ──────────────────────────────────────────────────────
export const consumoStateTransitionSchema = z
  .object({
    newState: z.enum(CONSUMO_STATES as unknown as [string, ...string[]]),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (value): value is { newState: ConsumoState; metadata?: Record<string, unknown> } =>
      CONSUMO_STATES.includes(value.newState as ConsumoState),
    "Invalid consumo state"
  );

export type ConsumoStateTransitionInput = z.infer<typeof consumoStateTransitionSchema>;

// ─── List filters ──────────────────────────────────────────────────────────
export const consumoListQuerySchema = z
  .object({
    surgeryId: z.string().trim().optional(),
    state: z.enum(CONSUMO_STATES as unknown as [string, ...string[]]).optional(),
    remitoId: z.string().trim().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    take: z.coerce.number().int().nonnegative().optional(),
    skip: z.coerce.number().int().nonnegative().optional(),
  })
  .partial();

export type ConsumoListQueryInput = z.infer<typeof consumoListQuerySchema>;
