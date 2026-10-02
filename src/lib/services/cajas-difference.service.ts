import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import { acceptCajasCommand, cajasId, cajasTransaction, lockCajasAssignment, replayCajasCommand, type CajasDb } from "./cajas-command.service";
import { cajasResolutionSchema } from "../validators/cajas-assignment";
import type { z } from "zod";

export async function openCajasDifference(db: CajasDb, companyId: string, assignmentId: string, kind: string, observedFacts: string, actorUserId: string) {
  if (!observedFacts.trim()) throw badRequest("Debe describir la diferencia", "difference_facts_required");
  return cajasTransaction(db, async (tx) => {
    await lockCajasAssignment(tx, companyId, assignmentId);
    const assignment = await tx.cajasAssignment.findFirst({ where: { id: assignmentId, companyId, activeSlot: 1 }, include: { preparation: true } });
    if (!assignment?.preparation) throw notFound("Asignación activa no encontrada", "active_assignment_not_found");
    const difference = await tx.cajasDifference.create({ data: { companyId, assignmentId, kind: kind.trim() || "observed", observedFacts: observedFacts.trim(), openedAt: new Date(), openedById: actorUserId } });
    await tx.cajasPreparation.update({ where: { id: assignment.preparation.id }, data: { requiresRecontrol: true, version: { increment: 1 }, evidenceWatermark: difference.id } });
    await createAuditEvent({ prisma: tx, companyId, userId: actorUserId, entityType: "CajasDifference", entityId: difference.id, action: "created", module: "stock", newValue: { assignmentId, kind, observedFacts } });
    return difference;
  });
}

export async function resolveCajasDifference(db: CajasDb, companyId: string, differenceId: string, raw: z.infer<typeof cajasResolutionSchema>, actorUserId: string) {
  const input = cajasResolutionSchema.parse(raw);
  return cajasTransaction(db, async (tx) => {
    const difference = await tx.cajasDifference.findFirst({ where: { id: differenceId, companyId }, include: { assignment: true } });
    if (!difference) throw notFound("Diferencia no encontrada", "difference_not_found");
    await lockCajasAssignment(tx, companyId, difference.assignmentId);
    const payload = { differenceId, ...input };
    const replay = await replayCajasCommand(tx, companyId, difference.assignmentId, "differenceResolution", input.idempotencyKey, payload);
    if (replay) return tx.cajasDifferenceResolution.findUniqueOrThrow({ where: { id: replay.resultEntityId } });
    const active = await tx.cajasAssignment.findFirst({ where: { id: difference.assignmentId, companyId, activeSlot: 1 }, select: { id: true } });
    if (!active) throw conflict("Asignación inactiva", "assignment_inactive");
    const prior = await tx.cajasDifferenceResolution.findFirst({ where: { companyId, differenceId }, orderBy: { sequence: "desc" } });
    if (input.expectedResolutionSequence !== (prior?.sequence ?? 0)) throw conflict("La resolución cambió; actualice la vista", "cajas_stale_resolution");
    if (prior?.closesDifference) throw conflict("Diferencia ya cerrada", "difference_already_closed");
    const id = cajasId();
    const command = await acceptCajasCommand(tx, { companyId, sourceOperationId: difference.assignmentId, checkpoint: "differenceResolution", semanticKey: input.idempotencyKey, payload, actorUserId, entityType: "CajasDifferenceResolution", entityId: id });
    const resolution = await tx.cajasDifferenceResolution.create({ data: { id, companyId, differenceId, sequence: (prior?.sequence ?? 0) + 1, closesDifference: input.closesDifference, explanation: input.explanation, supportingReference: input.supportingReference, cause: input.cause, acceptedAt: new Date(), acceptedById: actorUserId, commandAcceptanceId: command.id } });
    await tx.cajasPreparation.updateMany({ where: { companyId, assignmentId: difference.assignmentId }, data: { requiresRecontrol: true, version: { increment: 1 }, evidenceWatermark: command.id } });
    return resolution;
  });
}
