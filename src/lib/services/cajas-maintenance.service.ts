import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

import { conflict, notFound } from "../api/errors";
import type { CajasMaintenanceCreateInput, CajasMaintenanceTransitionInput } from "../validators/cajas";

const DOMAIN = "cajas";
const CREATE_CHECKPOINT = "maintenance-case-create";
const TRANSITION_CHECKPOINT = "maintenance-case-transition";

const maintenanceInclude = Prisma.validator<Prisma.CajasMaintenanceCaseInclude>()({
  articleEligibility: { include: { article: true } },
  openedBy: { select: { id: true, firstName: true, lastName: true } },
  transitions: {
    include: { acceptedBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { sequence: "asc" },
  },
});

type Transaction = Prisma.TransactionClient;
type MaintenanceRecord = Prisma.CajasMaintenanceCaseGetPayload<{ include: typeof maintenanceInclude }>;

const legalTransitions = {
  OPEN: ["SENT", "CANCELLED"],
  SENT: ["RETURNED_PENDING_REVIEW"],
  RETURNED_PENDING_REVIEW: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
} as const satisfies Record<string, readonly string[]>;

function actorName(actor: { firstName: string; lastName: string }) {
  return [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim();
}

function mapCase(record: MaintenanceRecord) {
  const article = record.articleEligibility?.article;
  return {
    id: record.id,
    companyId: record.companyId,
    boxIdentifiedUnitId: record.boxIdentifiedUnitId,
    articleId: record.articleId,
    kind: record.kind,
    status: record.status,
    description: record.description,
    version: record.version,
    openedAt: record.openedAt.toISOString(),
    openedBy: { id: record.openedBy.id, name: actorName(record.openedBy) },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    article: article ? { id: article.id, sku: article.sku, description: article.description } : null,
    transitions: record.transitions.map((transition) => ({
      id: transition.id,
      sequence: transition.sequence,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      note: transition.note,
      acceptedAt: transition.acceptedAt.toISOString(),
      actor: { id: transition.acceptedBy.id, name: actorName(transition.acceptedBy) },
    })),
  };
}

function hashIntent(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function createIntentHash(companyId: string, unitId: string, input: CajasMaintenanceCreateInput) {
  return hashIntent({
    schema: "cajas-maintenance-create-v1",
    companyId,
    unitId,
    kind: input.kind,
    articleId: input.articleId ?? null,
    description: input.description,
  });
}

function transitionIntentHash(companyId: string, unitId: string, caseId: string, input: CajasMaintenanceTransitionInput) {
  return hashIntent({
    schema: "cajas-maintenance-transition-v1",
    companyId,
    unitId,
    caseId,
    toStatus: input.toStatus,
    expectedVersion: input.expectedVersion,
    note: input.note ?? null,
  });
}

async function findAcceptedCommand(
  db: PrismaClient | Transaction,
  companyId: string,
  checkpoint: string,
  idempotencyKey: string,
) {
  return db.operationalCommandAcceptance.findFirst({
    where: { companyId, domain: DOMAIN, checkpoint, sourceOperationId: idempotencyKey },
    select: { intentHash: true, resultEntityId: true },
  });
}

async function acceptedCase(db: PrismaClient | Transaction, companyId: string, caseId: string, replayed: boolean) {
  const record = await db.cajasMaintenanceCase.findFirst({ where: { companyId, id: caseId }, include: maintenanceInclude });
  if (!record) throw conflict("The accepted maintenance result is unavailable", "cajas_maintenance_conflict");
  return { replayed, case: mapCase(record) };
}

async function resolveReplay(
  db: PrismaClient | Transaction,
  companyId: string,
  checkpoint: string,
  idempotencyKey: string,
  expectedHash: string,
) {
  const accepted = await findAcceptedCommand(db, companyId, checkpoint, idempotencyKey);
  if (!accepted) return null;
  if (accepted.intentHash !== expectedHash) {
    throw conflict("Idempotency key was already used for a different intent", "idempotency_key_reused");
  }
  return acceptedCase(db, companyId, accepted.resultEntityId, true);
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    || Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
}

async function findPhysicalBox(db: PrismaClient | Transaction, companyId: string, unitId: string) {
  return db.stockIdentifiedUnit.findFirst({
    where: { companyId, id: unitId, eligibility: { article: { articleType: "Caja" } } },
    select: { id: true, currentConfiguration: { select: { internalCode: true } } },
  });
}

export async function getCajasMaintenance(db: PrismaClient, companyId: string, unitId: string) {
  const unit = await findPhysicalBox(db, companyId, unitId);
  if (!unit) throw notFound("Physical box not found", "cajas_unit_not_found");
  const cases = await db.cajasMaintenanceCase.findMany({
    where: { companyId, boxIdentifiedUnitId: unitId },
    include: maintenanceInclude,
    orderBy: { updatedAt: "desc" },
  });
  return {
    unit: { id: unit.id, code: unit.currentConfiguration?.internalCode ?? unit.id },
    cases: cases.map(mapCase),
  };
}

export async function createCajasMaintenanceCase(
  db: PrismaClient,
  companyId: string,
  unitId: string,
  actorUserId: string,
  input: CajasMaintenanceCreateInput,
) {
  const intentHash = createIntentHash(companyId, unitId, input);
  const replay = await resolveReplay(db, companyId, CREATE_CHECKPOINT, input.idempotencyKey, intentHash);
  if (replay) return replay;

  try {
    return await db.$transaction(async (tx) => {
      const transactionReplay = await resolveReplay(tx, companyId, CREATE_CHECKPOINT, input.idempotencyKey, intentHash);
      if (transactionReplay) return transactionReplay;

      const unit = await findPhysicalBox(tx, companyId, unitId);
      if (!unit) throw notFound("Physical box not found", "cajas_unit_not_found");
      if (input.articleId) {
        const article = await tx.stockArticleEligibility.findFirst({
          where: { companyId, articleId: input.articleId },
          select: { id: true },
        });
        if (!article) throw notFound("Maintenance article not found", "cajas_maintenance_article_not_found");
      }

      const acceptedAt = new Date();
      const caseId = randomUUID();
      const transitionId = randomUUID();
      const commandId = randomUUID();
      const audit = await tx.auditEvent.create({
        data: {
          companyId,
          userId: actorUserId,
          entityType: "CajasMaintenanceCase",
          entityId: caseId,
          action: "maintenance_case_opened",
          module: DOMAIN,
          newValue: { unitId, kind: input.kind, articleId: input.articleId ?? null, description: input.description, status: "OPEN", version: 1 },
          createdAt: acceptedAt,
        },
      });
      await tx.operationalCommandAcceptance.create({
        data: {
          id: commandId,
          companyId,
          domain: DOMAIN,
          sourceOperationId: input.idempotencyKey,
          checkpoint: CREATE_CHECKPOINT,
          scopeKey: `unit:${unitId}`,
          intentHash,
          acceptedAt,
          acceptedById: actorUserId,
          resultEntityType: "CajasMaintenanceCase",
          resultEntityId: caseId,
          auditEventId: audit.id,
          createdAt: acceptedAt,
        },
      });
      await tx.cajasMaintenanceCase.create({
        data: {
          id: caseId,
          companyId,
          boxIdentifiedUnitId: unitId,
          articleId: input.articleId ?? null,
          kind: input.kind,
          status: "OPEN",
          description: input.description,
          version: 1,
          openedAt: acceptedAt,
          openedById: actorUserId,
          createdAt: acceptedAt,
          updatedAt: acceptedAt,
        },
      });
      await tx.cajasMaintenanceTransition.create({
        data: {
          id: transitionId,
          companyId,
          caseId,
          sequence: 1,
          fromStatus: null,
          toStatus: "OPEN",
          note: null,
          acceptedAt,
          acceptedById: actorUserId,
          commandAcceptanceId: commandId,
          auditEventId: audit.id,
          createdAt: acceptedAt,
        },
      });
      return acceptedCase(tx, companyId, caseId, false);
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const racedReplay = await resolveReplay(db, companyId, CREATE_CHECKPOINT, input.idempotencyKey, intentHash);
    if (racedReplay) return racedReplay;
    throw conflict("The maintenance case was accepted concurrently", "cajas_maintenance_conflict");
  }
}

export async function transitionCajasMaintenanceCase(
  db: PrismaClient,
  companyId: string,
  unitId: string,
  caseId: string,
  actorUserId: string,
  input: CajasMaintenanceTransitionInput,
) {
  const intentHash = transitionIntentHash(companyId, unitId, caseId, input);
  const replay = await resolveReplay(db, companyId, TRANSITION_CHECKPOINT, input.idempotencyKey, intentHash);
  if (replay) return replay;

  try {
    return await db.$transaction(async (tx) => {
      const transactionReplay = await resolveReplay(tx, companyId, TRANSITION_CHECKPOINT, input.idempotencyKey, intentHash);
      if (transactionReplay) return transactionReplay;

      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "cajas_maintenance_case"
        WHERE "company_id" = ${companyId} AND "box_identified_unit_id" = ${unitId} AND "id" = ${caseId}
        FOR UPDATE
      `;
      if (locked.length !== 1) throw notFound("Maintenance case not found", "cajas_maintenance_case_not_found");
      const lockedReplay = await resolveReplay(tx, companyId, TRANSITION_CHECKPOINT, input.idempotencyKey, intentHash);
      if (lockedReplay) return lockedReplay;
      const current = await tx.cajasMaintenanceCase.findFirst({
        where: { companyId, boxIdentifiedUnitId: unitId, id: caseId },
        select: { id: true, status: true, version: true },
      });
      if (!current) throw notFound("Maintenance case not found", "cajas_maintenance_case_not_found");
      if (current.version !== input.expectedVersion) {
        throw conflict("Maintenance case version is stale", "cajas_maintenance_version_conflict");
      }
      if (!(legalTransitions[current.status] as readonly string[]).includes(input.toStatus)) {
        throw conflict("Maintenance transition is not allowed", "cajas_maintenance_transition_not_allowed");
      }

      const acceptedAt = new Date();
      const nextVersion = input.expectedVersion + 1;
      const updated = await tx.cajasMaintenanceCase.updateMany({
        where: { companyId, boxIdentifiedUnitId: unitId, id: caseId, version: input.expectedVersion, status: current.status },
        data: { status: input.toStatus, version: nextVersion, updatedAt: acceptedAt },
      });
      if (updated.count !== 1) throw conflict("Maintenance case version is stale", "cajas_maintenance_version_conflict");

      const commandId = randomUUID();
      const audit = await tx.auditEvent.create({
        data: {
          companyId,
          userId: actorUserId,
          entityType: "CajasMaintenanceCase",
          entityId: caseId,
          action: "maintenance_case_transitioned",
          module: DOMAIN,
          oldValue: { status: current.status, version: current.version },
          newValue: { status: input.toStatus, version: nextVersion, note: input.note ?? null },
          createdAt: acceptedAt,
        },
      });
      await tx.operationalCommandAcceptance.create({
        data: {
          id: commandId,
          companyId,
          domain: DOMAIN,
          sourceOperationId: input.idempotencyKey,
          checkpoint: TRANSITION_CHECKPOINT,
          scopeKey: `case:${caseId}`,
          intentHash,
          acceptedAt,
          acceptedById: actorUserId,
          resultEntityType: "CajasMaintenanceCase",
          resultEntityId: caseId,
          auditEventId: audit.id,
          createdAt: acceptedAt,
        },
      });
      await tx.cajasMaintenanceTransition.create({
        data: {
          id: randomUUID(),
          companyId,
          caseId,
          sequence: nextVersion,
          fromStatus: current.status,
          toStatus: input.toStatus,
          note: input.note ?? null,
          acceptedAt,
          acceptedById: actorUserId,
          commandAcceptanceId: commandId,
          auditEventId: audit.id,
          createdAt: acceptedAt,
        },
      });
      return acceptedCase(tx, companyId, caseId, false);
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const racedReplay = await resolveReplay(db, companyId, TRANSITION_CHECKPOINT, input.idempotencyKey, intentHash);
    if (racedReplay) return racedReplay;
    throw conflict("The maintenance transition was accepted concurrently", "cajas_maintenance_conflict");
  }
}
