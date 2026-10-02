import { createHash, randomUUID } from "node:crypto";
import { Prisma, type CajasCheckpoint, type PrismaClient } from "@prisma/client";
import { conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";

export type CajasDb = PrismaClient | Prisma.TransactionClient;
export const cajasId = () => randomUUID();
export const cajasIntent = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function isCajasWriteConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; sqlState?: string; cause?: unknown; meta?: unknown };
  return e.code === "P2034" || e.sqlState === "40001" || e.sqlState === "40P01" ||
    (!!e.cause && isCajasWriteConflict(e.cause)) || (!!e.meta && isCajasWriteConflict(e.meta));
}

// Nested owners must reuse their transaction; only the outer boundary may retry.
export async function cajasTransaction<T>(db: CajasDb, run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  if (!("$connect" in db && typeof db.$connect === "function" &&
    "$transaction" in db && typeof db.$transaction === "function")) return run(db);
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(run, { isolationLevel: "Serializable", maxWait: 15000, timeout: 30000 });
    } catch (error) {
      if (attempt >= 2 || !isCajasWriteConflict(error)) throw error;
    }
  }
}

export async function lockCajasAssignment(tx: Prisma.TransactionClient, companyId: string, assignmentId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM cajas_assignment WHERE company_id = ${companyId} AND id = ${assignmentId} FOR UPDATE`;
  if (!rows.length) throw notFound("Asignación no encontrada", "assignment_not_found");
}

export async function replayCajasCommand(tx: Prisma.TransactionClient, companyId: string, sourceOperationId: string, checkpoint: CajasCheckpoint, semanticKey: string, payload: unknown) {
  const command = await tx.cajasCommandAcceptance.findUnique({ where: {
    companyId_sourceOperationId_checkpoint_semanticKey: { companyId, sourceOperationId, checkpoint, semanticKey },
  } });
  if (command && command.intentHash !== cajasIntent(payload)) throw conflict("La clave ya fue usada con otro contenido", "cajas_idempotency_conflict");
  return command;
}

export async function acceptCajasCommand(tx: Prisma.TransactionClient, input: {
  companyId: string; sourceOperationId: string; checkpoint: CajasCheckpoint; semanticKey: string;
  payload: unknown; actorUserId: string; entityType: string; entityId: string; acceptedResult?: unknown;
}) {
  const audit = await createAuditEvent({ prisma: tx, companyId: input.companyId, userId: input.actorUserId,
    entityType: input.entityType, entityId: input.entityId, action: `cajas.${input.checkpoint}`, module: "stock",
    newValue: input.payload, metadata: input.acceptedResult === undefined ? undefined : { acceptedResult: input.acceptedResult } });
  return tx.cajasCommandAcceptance.create({ data: {
    companyId: input.companyId, sourceOperationId: input.sourceOperationId, checkpoint: input.checkpoint,
    semanticKey: input.semanticKey, intentHash: cajasIntent(input.payload), acceptedAt: new Date(), acceptedById: input.actorUserId,
    resultEntityType: input.entityType, resultEntityId: input.entityId, auditEventId: audit.id,
  } });
}

export async function openCajasDifferences(tx: CajasDb, companyId: string, assignmentId: string) {
  const differences = await tx.cajasDifference.findMany({ where: { companyId, assignmentId },
    include: { resolutions: { orderBy: { sequence: "desc" }, take: 1 } } });
  return differences.filter((difference) => !difference.resolutions[0]?.closesDifference);
}
