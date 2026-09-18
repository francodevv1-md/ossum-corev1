// OSSUM COR — Devolución validator (Fase 1B)
// Zod schemas for API body normalization of Devolución operations.
// Catálogos (states / transitions) re-exported from
// src/lib/services/devolucion.service.ts to keep a single source of truth.

import { z } from "zod";
import { DEVOLUCION_STATES, DEVOLUCION_TRANSITIONS } from "../services/devolucion.service";

export { DEVOLUCION_STATES, DEVOLUCION_TRANSITIONS };

export type DevolucionState = (typeof DEVOLUCION_STATES)[number];

// ─── Decimal-friendly quantity schema ──────────────────────────────────────
const positiveQuantity = z
  .union([z.number(), z.string()])
  .transform((value) => String(value))
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }, "quantity must be a positive number");

const optionalTraceDate = z.coerce.date().optional();

// ─── Create Devolución ────────────────────────────────────────────────────
export const devolucionItemCreateSchema = z.object({
  remitoItemId: z.string().trim().optional(),
  consumoItemId: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  description: z.string().trim().min(1, "description is required"),
  returnedQuantity: positiveQuantity,
  unit: z.string().trim().optional(),
  lotNumber: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  expirationDate: optionalTraceDate,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const devolucionCreateSchema = z.object({
  surgeryId: z.string().trim().optional(),
  remitoId: z.string().trim().min(1, "remitoId is required"),
  consumoId: z.string().trim().optional(),
  items: z.array(devolucionItemCreateSchema).min(1, "items must not be empty"),
  reason: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type DevolucionCreateInput = z.infer<typeof devolucionCreateSchema>;
export type DevolucionItemCreateInput = z.infer<typeof devolucionItemCreateSchema>;

// ─── State transition ──────────────────────────────────────────────────────
export const devolucionStateTransitionSchema = z
  .object({
    newState: z.enum(DEVOLUCION_STATES as unknown as [string, ...string[]]),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (value): value is { newState: DevolucionState; metadata?: Record<string, unknown> } =>
      DEVOLUCION_STATES.includes(value.newState as DevolucionState),
    "Invalid devolucion state"
  );

export type DevolucionStateTransitionInput = z.infer<typeof devolucionStateTransitionSchema>;

// ─── Reject ────────────────────────────────────────────────────────────────
export const devolucionRejectSchema = z.object({
  reason: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DevolucionRejectInput = z.infer<typeof devolucionRejectSchema>;

// ─── List filters ──────────────────────────────────────────────────────────
export const devolucionListQuerySchema = z
  .object({
    surgeryId: z.string().trim().optional(),
    state: z.enum(DEVOLUCION_STATES as unknown as [string, ...string[]]).optional(),
    remitoId: z.string().trim().optional(),
    consumoId: z.string().trim().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    take: z.coerce.number().int().nonnegative().optional(),
    skip: z.coerce.number().int().nonnegative().optional(),
  })
  .partial();

export type DevolucionListQueryInput = z.infer<typeof devolucionListQuerySchema>;
