import { z } from "zod";

export const cajasAssignmentCreateSchema = z.object({
  physicalUnitId: z.string().trim().min(1, "El ID de la caja física identificada es obligatorio"),
  notes: z.string().trim().max(500).nullable().optional(),
  idempotencyKey: z.string().trim().min(1).max(150).optional(),
});

export type CajasAssignmentCreateInput = z.input<typeof cajasAssignmentCreateSchema>;

export const cajasAssignmentEndSchema = z.object({
  cause: z.string().trim().min(1, "El motivo de finalización es obligatorio").max(500),
  idempotencyKey: z.string().trim().min(1).max(150).optional(),
});

export type CajasAssignmentEndInput = z.input<typeof cajasAssignmentEndSchema>;

const commandFields = { idempotencyKey: z.string().trim().min(1).max(150), expectedVersion: z.number().int().positive(), cause: z.string().trim().min(1).max(1000) };
export const cajasComponentSelectionSchema = z.object({ ...commandFields, physicalUnitId: z.string().trim().min(1).optional(), sourceMovementId: z.string().trim().min(1).optional(), quantity: z.number().positive().max(1e9).refine((n) => Math.round(n * 10000) === n * 10000).optional(), append: z.boolean().optional(), remove: z.boolean().default(false) }).strict().refine((v) => v.remove ? !v.append && !v.physicalUnitId && !v.sourceMovementId : !!v.physicalUnitId !== !!v.sourceMovementId, "Seleccione una unidad o posición de stock");
export type CajasComponentSelectionInput = z.input<typeof cajasComponentSelectionSchema>;
export const cajasControlSchema = z.object({ ...commandFields, kind: z.enum(["control", "recontrol"]) }).strict();
export const cajasResolutionSchema = z.object({ idempotencyKey: commandFields.idempotencyKey, expectedResolutionSequence: z.number().int().nonnegative(), closesDifference: z.boolean(), explanation: z.string().trim().min(1).max(2000), supportingReference: z.string().trim().min(1).max(1000), cause: commandFields.cause }).strict();
export const cajasReservationSchema = z.object({ ...commandFields }).strict();
export const cajasDispatchSchema = z.object({ assignmentId: z.string().min(1), idempotencyKey: commandFields.idempotencyKey, expectedVersion: commandFields.expectedVersion, lines: z.array(z.object({ preparationLineId: z.string().min(1), remitoItemId: z.string().min(1), quantity: z.number().positive().max(1e9) }).strict()).min(1).max(200) }).strict();
export const cajasAccountingSchema = z.object({ dispatchId: z.string().min(1), idempotencyKey: commandFields.idempotencyKey, lines: z.array(z.object({ dispatchLineId: z.string().min(1), sourceItemId: z.string().min(1), quantity: z.number().positive().max(1e9), kind: z.enum(["unchanged", "consumed", "missing", "damaged", "underReview"]), recognizedReturnDispositionId: z.string().min(1).optional() }).strict()).min(1).max(200) }).strict();
