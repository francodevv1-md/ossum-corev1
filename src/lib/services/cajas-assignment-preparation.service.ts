import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

import { conflict, notFound } from "../api/errors";
import type { CajasAssignmentPreparationInput, CajasUnitLogEntryInput } from "../validators/cajas";

const COMMAND_DOMAIN = "cajas";
const COMMAND_CHECKPOINT = "assignment-preparation";
const COMMAND_SCOPE = "surgery-box-assignment";
const UNIT_LOG_CHECKPOINT = "unit-log-entry";
const UNIT_LOG_SCOPE = "assignment-unit";

const unitLogInclude = Prisma.validator<Prisma.CajasUnitLogEntryInclude>()({
  actor: { select: { firstName: true, lastName: true } },
  article: { include: { article: true } },
});

const assignmentInclude = Prisma.validator<Prisma.CajasAssignmentInclude>()({
  boxIdentifiedUnit: {
    include: {
      currentConfiguration: true,
      eligibility: { include: { article: true } },
    },
  },
  preparations: {
    include: {
      formulaVersion: true,
      lines: { include: { expectedFormulaLine: true }, orderBy: { lineKey: "asc" } },
    },
    orderBy: { version: "desc" },
    take: 1,
  },
  unitLogEntries: {
    include: unitLogInclude,
    orderBy: { occurredAt: "desc" },
    take: 20,
  },
});

const candidateInclude = Prisma.validator<Prisma.StockIdentifiedUnitInclude>()({
  currentConfiguration: true,
  eligibility: {
    include: {
      article: true,
      cajasBoxFormulas: {
        include: {
          currentVersion: { include: { lines: { orderBy: { lineNumber: "asc" } } } },
        },
      },
    },
  },
  stockPositions: {
    where: { traceMode: "IDENTIFIED_UNIT" },
    include: { positionProjection: true, reservations: { include: { projection: true } } },
  },
  cajasAssignments: {
    where: { activeSlot: 1 },
    include: { surgery: { select: { id: true, visibleNumber: true } } },
    take: 1,
  },
});

type AssignmentRecord = Prisma.CajasAssignmentGetPayload<{ include: typeof assignmentInclude }>;
type CandidateRecord = Prisma.StockIdentifiedUnitGetPayload<{ include: typeof candidateInclude }>;
type Transaction = Prisma.TransactionClient;
type UnitLogRecord = Prisma.CajasUnitLogEntryGetPayload<{ include: typeof unitLogInclude }>;

function cajasAssignmentEligibility(surgery: { archivedAt: Date | null; cxStatus: string }) {
  if (surgery.archivedAt) return { acceptsNewCajasAssignments: false, newCajasAssignmentReason: "La cirugía está archivada y no admite nuevas asignaciones de Cajas." };
  if (surgery.cxStatus === "cancelled") return { acceptsNewCajasAssignments: false, newCajasAssignmentReason: "La cirugía está cancelada y no admite nuevas asignaciones de Cajas." };
  if (surgery.cxStatus === "finalized") return { acceptsNewCajasAssignments: false, newCajasAssignmentReason: "La cirugía está finalizada y no admite nuevas asignaciones de Cajas." };
  return { acceptsNewCajasAssignments: true, newCajasAssignmentReason: "La cirugía admite nuevas asignaciones de Cajas." };
}

function intentHash(companyId: string, surgeryId: string, unitId: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ schema: "cajas-assignment-preparation-v1", companyId, surgeryId, unitId }))
    .digest("hex");
}

function unitLogIntentHash(companyId: string, surgeryId: string, input: CajasUnitLogEntryInput): string {
  return createHash("sha256")
    .update(JSON.stringify({
      schema: "cajas-unit-log-v1",
      companyId,
      surgeryId,
      assignmentId: input.assignmentId,
      unitId: input.unitId,
      eventKind: input.eventKind,
      articleId: input.articleId,
      note: input.note,
    }))
    .digest("hex");
}

function mapUnitLogEntry(record: UnitLogRecord) {
  const actor = [record.actor.firstName, record.actor.lastName].filter(Boolean).join(" ").trim();
  return {
    id: record.id,
    assignmentId: record.assignmentId,
    unitId: record.boxIdentifiedUnitId,
    eventKind: record.eventKind,
    articleId: record.articleId,
    articleDescription: record.article.article.description,
    note: record.note,
    occurredAt: record.occurredAt.toISOString(),
    actor: actor || undefined,
  };
}

function mapAssignment(record: AssignmentRecord) {
  const preparation = record.preparations[0] ?? null;
  return {
    id: record.id,
    surgeryId: record.surgeryId,
    boxArticleId: record.boxArticleId,
    unitId: record.boxIdentifiedUnitId,
    unitCode: record.boxIdentifiedUnit.currentConfiguration?.internalCode ?? record.boxIdentifiedUnitId,
    serialNumber: record.boxIdentifiedUnit.currentConfiguration?.serialNumber ?? null,
    boxSku: record.boxIdentifiedUnit.eligibility.article.sku,
    boxDescription: record.boxIdentifiedUnit.eligibility.article.description,
    active: record.activeSlot === 1,
    assignedAt: record.assignedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
    preparation: preparation ? {
      id: preparation.id,
      formulaVersionId: preparation.formulaVersionId,
      formulaVersionNumber: preparation.formulaVersion.versionNumber,
      version: preparation.version,
      requiresRecontrol: preparation.requiresRecontrol,
      lines: preparation.lines.map((line) => ({
        id: line.id,
        lineKey: line.lineKey,
        expectedFormulaLineId: line.expectedFormulaLineId,
        lineNumber: line.expectedFormulaLine?.lineNumber ?? null,
        articleId: line.articleId,
        sku: line.expectedFormulaLine?.skuSnapshot ?? null,
        description: line.expectedFormulaLine?.descriptionSnapshot ?? null,
        quantity: line.quantity.toString(),
        stockUnit: line.stockUnit,
        scaleSnapshot: line.scaleSnapshot,
      })),
    } : null,
    recentLogEntries: (record.unitLogEntries ?? []).map(mapUnitLogEntry),
  };
}

function candidateAvailability(unit: CandidateRecord) {
  const formula = unit.eligibility.cajasBoxFormulas[0];
  const position = unit.stockPositions[0];
  if (unit.cajasAssignments.length > 0) return { available: false, code: "active_assignment", reason: "La caja ya está asignada a otro expediente." };
  if (!unit.currentConfiguration) return { available: false, code: "missing_configuration", reason: "La caja no tiene configuración vigente." };
  if (!unit.eligibility.article.isActive) return { available: false, code: "inactive_article", reason: "El artículo Caja está inactivo." };
  if (!formula?.currentVersion) return { available: false, code: "missing_formula", reason: "La caja no tiene una fórmula vigente." };
  if (unit.stockPositions.length !== 1 || !position?.positionProjection) return { available: false, code: "invalid_stock_position", reason: "La caja no tiene una única posición identificada vigente." };
  if (position.reservations.some((reservation) => reservation.projection?.status === "ACTIVE" && reservation.projection.activeQuantity.gt(0))) {
    return { available: false, code: "active_stock_reservation", reason: "La caja tiene una reserva de stock activa." };
  }
  if (position.positionProjection.availableQuantity.lte(0)) return { available: false, code: "no_available_stock", reason: "La caja no tiene disponibilidad física." };
  return { available: true, code: "available", reason: "Disponible para asignar." };
}

function mapCandidate(unit: CandidateRecord) {
  const formula = unit.eligibility.cajasBoxFormulas[0];
  const position = unit.stockPositions.length === 1 ? unit.stockPositions[0] : null;
  const activeAssignment = unit.cajasAssignments[0];
  return {
    unitId: unit.id,
    unitCode: unit.currentConfiguration?.internalCode ?? unit.id,
    serialNumber: unit.currentConfiguration?.serialNumber ?? null,
    boxArticleId: unit.articleId,
    boxSku: unit.eligibility.article.sku,
    boxDescription: unit.eligibility.article.description,
    formulaVersionId: formula?.currentVersion?.id ?? null,
    formulaVersionNumber: formula?.currentVersion?.versionNumber ?? null,
    expectedLineCount: formula?.currentVersion?.lines.length ?? 0,
    availableQuantity: position?.positionProjection?.availableQuantity.toString() ?? "0",
    assignedSurgery: activeAssignment ? {
      id: activeAssignment.surgery.id,
      visibleNumber: activeAssignment.surgery.visibleNumber,
    } : null,
    availability: candidateAvailability(unit),
  };
}

async function findAcceptedCommand(db: PrismaClient | Transaction, companyId: string, idempotencyKey: string) {
  return db.operationalCommandAcceptance.findFirst({
    where: { companyId, domain: COMMAND_DOMAIN, sourceOperationId: idempotencyKey, checkpoint: COMMAND_CHECKPOINT },
    select: { intentHash: true, resultEntityId: true },
  });
}

async function acceptedAggregate(db: PrismaClient | Transaction, companyId: string, assignmentId: string, replayed: boolean) {
  const assignment = await db.cajasAssignment.findFirst({ where: { companyId, id: assignmentId }, include: assignmentInclude });
  if (!assignment) throw conflict("The accepted assignment result is unavailable", "cajas_assignment_result_unavailable");
  return { replayed, assignment: mapAssignment(assignment) };
}

async function resolveReplay(db: PrismaClient | Transaction, companyId: string, idempotencyKey: string, expectedIntentHash: string) {
  const accepted = await findAcceptedCommand(db, companyId, idempotencyKey);
  if (!accepted) return null;
  if (accepted.intentHash !== expectedIntentHash) throw conflict("Idempotency key was already used for a different intent", "idempotency_key_reused");
  return acceptedAggregate(db, companyId, accepted.resultEntityId, true);
}

async function resolveUnitLogReplay(db: PrismaClient | Transaction, companyId: string, idempotencyKey: string, expectedIntentHash: string) {
  const accepted = await db.operationalCommandAcceptance.findFirst({
    where: { companyId, domain: COMMAND_DOMAIN, sourceOperationId: idempotencyKey, checkpoint: UNIT_LOG_CHECKPOINT },
    select: { intentHash: true, resultEntityId: true },
  });
  if (!accepted) return null;
  if (accepted.intentHash !== expectedIntentHash) throw conflict("Idempotency key was already used for a different intent", "idempotency_key_reused");
  const entry = await db.cajasUnitLogEntry.findFirst({ where: { companyId, id: accepted.resultEntityId }, include: unitLogInclude });
  if (!entry) throw conflict("The accepted unit log result is unavailable", "cajas_unit_log_result_unavailable");
  return { replayed: true, entry: mapUnitLogEntry(entry) };
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    || Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
}

export async function getSurgeryCajas(db: PrismaClient, companyId: string, surgeryId: string) {
  const surgery = await db.surgery.findFirst({
    where: { companyId, id: surgeryId },
    select: { id: true, visibleNumber: true, cxStatus: true, archivedAt: true },
  });
  if (!surgery) throw notFound("Surgery not found", "surgery_not_found");

  const [assignments, candidates] = await Promise.all([
    db.cajasAssignment.findMany({ where: { companyId, surgeryId }, include: assignmentInclude, orderBy: { assignedAt: "desc" } }),
    db.stockIdentifiedUnit.findMany({
      where: { companyId, eligibility: { article: { articleType: "Caja" } } },
      include: candidateInclude,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    surgery: { ...surgery, ...cajasAssignmentEligibility(surgery) },
    assignments: assignments.map(mapAssignment),
    candidates: candidates.map(mapCandidate),
  };
}

export async function assignAndPrepareCajas(
  db: PrismaClient,
  companyId: string,
  surgeryId: string,
  actorUserId: string,
  input: CajasAssignmentPreparationInput,
) {
  const hash = intentHash(companyId, surgeryId, input.unitId);
  const replay = await resolveReplay(db, companyId, input.idempotencyKey, hash);
  if (replay) return replay;

  try {
    return await db.$transaction(async (tx) => {
      const transactionReplay = await resolveReplay(tx, companyId, input.idempotencyKey, hash);
      if (transactionReplay) return transactionReplay;

      const surgery = await tx.surgery.findFirst({
        where: { companyId, id: surgeryId },
        select: { id: true, cxStatus: true, archivedAt: true },
      });
      if (!surgery) throw notFound("Surgery not found", "surgery_not_found");
      const surgeryEligibility = cajasAssignmentEligibility(surgery);
      if (!surgeryEligibility.acceptsNewCajasAssignments) throw conflict(surgeryEligibility.newCajasAssignmentReason, "surgery_not_eligible");

      const lockedUnits = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "StockIdentifiedUnit"
        WHERE "companyId" = ${companyId} AND "id" = ${input.unitId}
        FOR UPDATE
      `;
      if (lockedUnits.length !== 1) throw notFound("Physical box not found", "cajas_unit_not_found");
      const unit = await tx.stockIdentifiedUnit.findFirst({ where: { companyId, id: input.unitId }, include: candidateInclude });
      if (!unit) throw notFound("Physical box not found", "cajas_unit_not_found");
      if (unit.eligibility.article.articleType !== "Caja") throw conflict("The selected unit is not a physical Box", "cajas_unit_not_box");
      const availability = candidateAvailability(unit);
      if (!availability.available) throw conflict(availability.reason, `cajas_unit_${availability.code}`);

      const formulaVersion = unit.eligibility.cajasBoxFormulas[0]?.currentVersion;
      const position = unit.stockPositions[0];
      if (!formulaVersion || !position?.positionProjection) throw conflict("The physical Box is not assignable", "cajas_unit_unavailable");

      const acceptedAt = new Date();
      const assignmentId = randomUUID();
      const preparationId = randomUUID();
      const commandId = randomUUID();
      const audit = await tx.auditEvent.create({
        data: {
          companyId,
          userId: actorUserId,
          entityType: "CajasAssignment",
          entityId: assignmentId,
          action: "assignment_preparation_accepted",
          module: "cajas",
          newValue: { surgeryId, unitId: input.unitId, formulaVersionId: formulaVersion.id },
        },
      });
      await tx.operationalCommandAcceptance.create({
        data: {
          id: commandId,
          companyId,
          domain: COMMAND_DOMAIN,
          sourceOperationId: input.idempotencyKey,
          checkpoint: COMMAND_CHECKPOINT,
          scopeKey: COMMAND_SCOPE,
          intentHash: hash,
          acceptedAt,
          acceptedById: actorUserId,
          resultEntityType: "CajasAssignment",
          resultEntityId: assignmentId,
          auditEventId: audit.id,
        },
      });
      await tx.cajasAssignment.create({
        data: {
          id: assignmentId,
          companyId,
          surgeryId,
          boxArticleId: unit.articleId,
          boxIdentifiedUnitId: unit.id,
          activeSlot: 1,
          assignedAt: acceptedAt,
          assignedById: actorUserId,
          startCommandAcceptanceId: commandId,
        },
      });
      await tx.cajasPreparation.create({
        data: {
          id: preparationId,
          companyId,
          assignmentId,
          boxArticleId: unit.articleId,
          formulaVersionId: formulaVersion.id,
          requiresRecontrol: false,
          version: 1,
          evidenceWatermark: commandId,
        },
      });
      await tx.cajasPreparationLine.createMany({
        data: formulaVersion.lines.map((line) => ({
          companyId,
          preparationId,
          formulaVersionId: formulaVersion.id,
          lineKey: `expected:${String(line.lineNumber).padStart(4, "0")}:${line.id}`,
          expectedFormulaLineId: line.id,
          role: "EXPECTED" as const,
          articleId: line.articleId,
          stockPositionId: null,
          quantity: line.expectedQuantity,
          stockUnit: line.stockUnit,
          scaleSnapshot: line.scaleSnapshot,
          differenceAcknowledged: false,
          dispatchedQuantity: new Prisma.Decimal(0),
          version: 1,
          isActive: true,
        })),
      });
      return acceptedAggregate(tx, companyId, assignmentId, false);
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const racedReplay = await resolveReplay(db, companyId, input.idempotencyKey, hash);
    if (racedReplay) return racedReplay;
    throw conflict("The physical Box was assigned concurrently", "cajas_unit_already_assigned");
  }
}

export async function appendCajasUnitLogEntry(
  db: PrismaClient,
  companyId: string,
  surgeryId: string,
  actorUserId: string,
  input: CajasUnitLogEntryInput,
) {
  if (!input.articleId) throw conflict("An instrument from the assignment preparation is required", "cajas_log_article_required");
  const hash = unitLogIntentHash(companyId, surgeryId, input);
  const replay = await resolveUnitLogReplay(db, companyId, input.idempotencyKey, hash);
  if (replay) return replay;

  try {
    return await db.$transaction(async (tx) => {
      const transactionReplay = await resolveUnitLogReplay(tx, companyId, input.idempotencyKey, hash);
      if (transactionReplay) return transactionReplay;

      const surgery = await tx.surgery.findFirst({ where: { companyId, id: surgeryId }, select: { id: true } });
      if (!surgery) throw notFound("Surgery not found", "surgery_not_found");
      const assignment = await tx.cajasAssignment.findFirst({
        where: { companyId, surgeryId, id: input.assignmentId, boxIdentifiedUnitId: input.unitId },
        select: { id: true, boxIdentifiedUnitId: true, preparations: { select: { id: true }, orderBy: { version: "desc" }, take: 1 } },
      });
      if (!assignment) throw notFound("Cajas assignment not found", "cajas_assignment_not_found");

      const preparationId = assignment.preparations[0]?.id;
      const article = preparationId ? await tx.cajasPreparationLine.findFirst({
        where: { companyId, preparationId, articleId: input.articleId, isActive: true },
        select: { id: true },
      }) : null;
      if (!article) throw conflict("The selected article does not belong to the assignment preparation", "cajas_log_article_not_in_preparation");

      const entryId = randomUUID();
      const commandId = randomUUID();
      const occurredAt = new Date();
      const audit = await tx.auditEvent.create({
        data: {
          companyId,
          userId: actorUserId,
          entityType: "CajasUnitLogEntry",
          entityId: entryId,
          action: "unit_log_entry_appended",
          module: "cajas",
          newValue: { surgeryId, assignmentId: assignment.id, unitId: assignment.boxIdentifiedUnitId, eventKind: input.eventKind, articleId: input.articleId, note: input.note },
        },
      });
      await tx.operationalCommandAcceptance.create({
        data: {
          id: commandId,
          companyId,
          domain: COMMAND_DOMAIN,
          sourceOperationId: input.idempotencyKey,
          checkpoint: UNIT_LOG_CHECKPOINT,
          scopeKey: UNIT_LOG_SCOPE,
          intentHash: hash,
          acceptedAt: occurredAt,
          acceptedById: actorUserId,
          resultEntityType: "CajasUnitLogEntry",
          resultEntityId: entryId,
          auditEventId: audit.id,
        },
      });
      const entry = await tx.cajasUnitLogEntry.create({
        data: {
          id: entryId,
          companyId,
          assignmentId: assignment.id,
          boxIdentifiedUnitId: assignment.boxIdentifiedUnitId,
          articleId: input.articleId,
          eventKind: input.eventKind,
          note: input.note,
          occurredAt,
          actorUserId,
          commandAcceptanceId: commandId,
        },
        include: unitLogInclude,
      });
      return { replayed: false, entry: mapUnitLogEntry(entry) };
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const racedReplay = await resolveUnitLogReplay(db, companyId, input.idempotencyKey, hash);
    if (racedReplay) return racedReplay;
    throw conflict("The Cajas unit log entry was accepted concurrently", "cajas_unit_log_conflict");
  }
}
