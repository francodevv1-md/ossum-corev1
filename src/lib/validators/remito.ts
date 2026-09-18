// OSSUM COR — Remito validator (Fase 1A.1)
// Zod schemas for API body normalization of Remito operations.
// Catálogos (origin / states / transitions) re-exported from
// src/lib/services/remito.service.ts to keep a single source of truth.

import { z } from "zod";
import { REMITO_ORIGINS, REMITO_SALIDA_REASONS, REMITO_STATES, REMITO_TRANSITIONS } from "../services/remito.service";

export { REMITO_ORIGINS, REMITO_SALIDA_REASONS, REMITO_STATES, REMITO_TRANSITIONS };

export type RemitoOrigin = (typeof REMITO_ORIGINS)[number];
export type RemitoSalidaReason = (typeof REMITO_SALIDA_REASONS)[number];
export type RemitoState = (typeof REMITO_STATES)[number];

// ─── Decimal-friendly item quantity schema ────────────────────────────────
// quantity reaches the service as number/string; we coerce to string for
// safe Decimal construction alongside Prisma's @db.Decimal(18,4).
const positiveQuantity = z
  .union([z.number(), z.string()])
  .transform((value) => String(value))
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }, "quantity must be a positive number");

const nonNegativeDecimal = z
  .union([z.number(), z.string()])
  .transform((value) => String(value))
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }, "value must be a non-negative number");

const optionalTraceDate = z.coerce.date().optional();

// ─── Create Remito ────────────────────────────────────────────────────────
export const remitoItemCreateSchema = z.object({
  itemId: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  description: z.string().trim().min(1, "description is required"),
  quantity: positiveQuantity,
  unit: z.string().trim().optional(),
  boxId: z.string().trim().optional(),
  presupuestoItemId: z.string().trim().optional(),
  lotNumber: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  expirationDate: optionalTraceDate,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const remitoCreateSchema = z.object({
  branchId: z.string().trim().min(1, "branchId is required"),
  issuedBranchId: z.string().trim().optional(),
  surgeryId: z.string().trim().optional(),
  origin: z.enum(REMITO_ORIGINS as unknown as [string, ...string[]]),
  salidaReason: z.enum(REMITO_SALIDA_REASONS as unknown as [string, ...string[]]),
  boxId: z.string().trim().nullable().optional(),
  presupuestoId: z.string().trim().nullable().optional(),
  destinatarioContactId: z.string().trim().nullable().optional(),
  destinatarioSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  shippingAddressSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  transportSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  packageCount: z.coerce.number().int().nonnegative().nullable().optional(),
  declaredValue: nonNegativeDecimal.nullable().optional(),
  items: z.array(remitoItemCreateSchema).min(1, "items must not be empty"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type RemitoCreateInput = z.infer<typeof remitoCreateSchema>;
export type RemitoItemCreateInput = z.infer<typeof remitoItemCreateSchema>;

// ─── Draft update Remito ───────────────────────────────────────────────────
// Draft updates intentionally keep origin immutable for now. Mutable fields are
// the nullable linkage/snapshot/metadata fields and optional full item replace.
export const remitoDraftUpdateSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime().optional(),
    branchId: z.string().trim().min(1).optional(),
    issuedBranchId: z.string().trim().min(1).optional(),
    surgeryId: z.string().trim().nullable().optional(),
    salidaReason: z.enum(REMITO_SALIDA_REASONS as unknown as [string, ...string[]]).optional(),
    boxId: z.string().trim().nullable().optional(),
    presupuestoId: z.string().trim().nullable().optional(),
    destinatarioContactId: z.string().trim().nullable().optional(),
    destinatarioSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
    shippingAddressSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
    transportSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
    packageCount: z.coerce.number().int().nonnegative().nullable().optional(),
    declaredValue: nonNegativeDecimal.nullable().optional(),
    items: z.array(remitoItemCreateSchema).min(1, "items must not be empty").optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "expectedUpdatedAt"),
    "At least one draft field is required"
  );

export type RemitoDraftUpdateInput = z.infer<typeof remitoDraftUpdateSchema>;

// ─── State transition ──────────────────────────────────────────────────────
export const remitoStateTransitionSchema = z
  .object({
    newState: z.enum(REMITO_STATES as unknown as [string, ...string[]]).optional(),
    state: z.enum(REMITO_STATES as unknown as [string, ...string[]]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .transform((value) => ({
    ...value,
    newState: value.newState ?? value.state,
  }))
  .refine(
    (value): value is { newState: RemitoState; state?: RemitoState; metadata?: Record<string, unknown> } =>
      REMITO_STATES.includes(value.newState as RemitoState),
    "Invalid remito state"
  );

export type RemitoStateTransitionInput = z.infer<typeof remitoStateTransitionSchema>;

// ─── Devolución ─────────────────────────────────────────────────────────────
export const remitoDevolucionItemSchema = z.object({
  itemId: z.string().trim().min(1, "itemId is required"),
  returnedQuantity: positiveQuantity,
});

export const remitoDevolucionSchema = z.object({
  items: z.array(remitoDevolucionItemSchema).min(1, "devolucion items must not be empty"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type RemitoDevolucionInput = z.infer<typeof remitoDevolucionSchema>;
export type RemitoDevolucionItemInput = z.infer<typeof remitoDevolucionItemSchema>;

// ─── List filters (used loosely as query-param normalizer) ──────────────────
export const remitoListQuerySchema = z
  .object({
    surgeryId: z.string().trim().optional(),
    branchId: z.string().trim().optional(),
    state: z.enum(REMITO_STATES as unknown as [string, ...string[]]).optional(),
    origin: z.enum(REMITO_ORIGINS as unknown as [string, ...string[]]).optional(),
    salidaReason: z.enum(REMITO_SALIDA_REASONS as unknown as [string, ...string[]]).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    take: z.coerce.number().int().nonnegative().optional(),
    skip: z.coerce.number().int().nonnegative().optional(),
  })
  .partial();

export type RemitoListQueryInput = z.infer<typeof remitoListQuerySchema>;
