import { z } from "zod";

export const boxFormulaLineSchema = z.object({
  articleId: z.string().trim().min(1),
  expectedQuantity: z.coerce.number().positive(),
  stockUnit: z.string().trim().min(1).default("u"),
});

export const boxFormulaCreateSchema = z.object({
  description: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  family: z.string().trim().optional(),
  lines: z.array(boxFormulaLineSchema).min(1, "At least one component is required"),
});

export const boxFormulaLookupQuerySchema = z.object({
  q: z.string().trim().optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
});

export const cajasAssignmentPreparationSchema = z.object({
  unitId: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();

export const cajasPhysicalAllocationSchema = z.object({
  positionId: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().positive(),
  idempotencyKey: z.string().trim().min(1).max(200),
  replacesCorrelationId: z.string().trim().min(1).max(200).optional(),
  reason: z.string().trim().min(1).max(4000).optional(),
}).strict().superRefine((value, context) => {
  if (value.replacesCorrelationId && !value.reason) context.addIssue({ code: "custom", message: "A replacement reason is required", path: ["reason"] });
});

export const cajasPhysicalReleaseSchema = z.object({
  reason: z.string().trim().min(1).max(4000),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();

export const cajasDifferenceAcknowledgementSchema = z.object({
  reason: z.string().trim().min(1).max(4000),
  observation: z.string().trim().max(4000).optional(),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();

export const cajasControlSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(4000).optional(),
}).strict();

export const cajasDifferenceResolutionSchema = z.object({
  decision: z.enum(["accept", "reject"]),
  reason: z.string().trim().min(1).max(4000),
  evidenceReference: z.string().trim().min(1).max(4000),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();

export const cajasUnitLogEventKinds = ["PROBLEM_REPORTED", "REPAIR_SENT", "REPAIR_RETURNED"] as const;

export const cajasUnitLogEntrySchema = z.object({
  assignmentId: z.string().trim().min(1).max(200),
  unitId: z.string().trim().min(1).max(200),
  eventKind: z.enum(cajasUnitLogEventKinds),
  articleId: z.string().trim().min(1).max(200),
  note: z.string().trim().min(1, "A note is required").max(4000),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();

export const cajasMaintenanceKinds = ["REPAIR", "PREVENTIVE_MAINTENANCE"] as const;
export const cajasMaintenanceStatuses = ["OPEN", "SENT", "RETURNED_PENDING_REVIEW", "CLOSED", "CANCELLED"] as const;
export const cajasMaintenanceTransitionTargets = ["SENT", "RETURNED_PENDING_REVIEW", "CLOSED", "CANCELLED"] as const;

export const cajasMaintenanceCreateSchema = z.object({
  kind: z.enum(cajasMaintenanceKinds),
  articleId: z.string().trim().min(1).max(200).nullable().optional(),
  description: z.string().trim().min(1).max(4000),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();

export const cajasMaintenanceTransitionSchema = z.object({
  toStatus: z.enum(cajasMaintenanceTransitionTargets),
  expectedVersion: z.number().int().positive(),
  note: z.string().trim().min(1).max(4000).optional(),
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();

export type BoxFormulaCreateInput = z.infer<typeof boxFormulaCreateSchema>;
export type BoxFormulaLookupQuery = z.infer<typeof boxFormulaLookupQuerySchema>;
export type CajasAssignmentPreparationInput = z.infer<typeof cajasAssignmentPreparationSchema>;
export type CajasPhysicalAllocationInput = z.infer<typeof cajasPhysicalAllocationSchema>;
export type CajasPhysicalReleaseInput = z.infer<typeof cajasPhysicalReleaseSchema>;
export type CajasDifferenceAcknowledgementInput = z.infer<typeof cajasDifferenceAcknowledgementSchema>;
export type CajasControlInput = z.infer<typeof cajasControlSchema>;
export type CajasDifferenceResolutionInput = z.infer<typeof cajasDifferenceResolutionSchema>;
export type CajasUnitLogEntryInput = z.infer<typeof cajasUnitLogEntrySchema>;
export type CajasMaintenanceCreateInput = z.infer<typeof cajasMaintenanceCreateSchema>;
export type CajasMaintenanceTransitionInput = z.infer<typeof cajasMaintenanceTransitionSchema>;
