import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { badRequest, conflict, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";

type Db = PrismaClient | Prisma.TransactionClient;
const D = (value: string | number) => new Prisma.Decimal(value);
const intentHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const OPERATIONAL_SEMANTIC_FIELDS = ["companyId", "domain", "sourceOperationId", "checkpoint", "scopeKey"];

async function inTransaction<T>(db: Db, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return "$transaction" in db ? db.$transaction(work) : work(db);
}

function isOperationalSemanticCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  if (error.meta?.target === "uq_oca_semantic") return true;
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target
    : (error.meta?.driverAdapterError as { cause?: { constraint?: { fields?: unknown } } } | undefined)?.cause?.constraint?.fields;
  if (!Array.isArray(target) || target.length !== OPERATIONAL_SEMANTIC_FIELDS.length) return false;
  const fields = target.map((field) => String(field).replaceAll('"', ""));
  return OPERATIONAL_SEMANTIC_FIELDS.every((field) => fields.includes(field));
}

function assertPreparationReplayIntent(existing: { surgeryId: string; cajasAssignmentId: string | null; lines: Array<{ articleId: string; requestedQuantity: Prisma.Decimal; stockUnit: string }> }, surgeryId: string, input: { cajasAssignmentId?: string; lines: Array<{ articleId: string; requestedQuantity: string; stockUnit: string }> }) {
  const expected = intentHash({ surgeryId, cajasAssignmentId: input.cajasAssignmentId ?? null, lines: input.lines.map((line) => ({ ...line, requestedQuantity: D(line.requestedQuantity).toString() })) });
  const actual = intentHash({ surgeryId: existing.surgeryId, cajasAssignmentId: existing.cajasAssignmentId, lines: existing.lines.map((line) => ({ articleId: line.articleId, requestedQuantity: line.requestedQuantity.toString(), stockUnit: line.stockUnit })) });
  if (actual !== expected) throw conflict("Idempotency key was already used for a different preparation", "idempotency_key_reused");
}

async function resolveReservationReplay(tx: Db, companyId: string, idempotencyKey: string | undefined, expectedIntent: string) {
  if (!idempotencyKey) return null;
  const accepted = await tx.operationalCommandAcceptance.findFirst({ where: { companyId, domain: "stock", sourceOperationId: idempotencyKey, checkpoint: "preparation-reserve", scopeKey: idempotencyKey } });
  if (!accepted) return null;
  if (accepted.intentHash !== expectedIntent) throw conflict("Idempotency key was already used for a different reservation", "idempotency_key_reused");
  const replay = await tx.stockReservation.findFirst({ where: { companyId, id: accepted.resultEntityId } });
  if (!replay) throw conflict("Idempotent reservation result is missing", "idempotency_result_missing");
  return replay;
}

export function assertPreparationQuantity(requested: Prisma.Decimal, prepared: Prisma.Decimal, additional: Prisma.Decimal): void {
  if (prepared.add(additional).gt(requested)) throw conflict("Preparation quantity exceeds the requested quantity", "preparation_quantity_exceeded");
}

export function assertPreparationSurgeryLink(routeSurgeryId: string, preparationSurgeryId: string): void {
  if (routeSurgeryId !== preparationSurgeryId) throw conflict("Preparation does not belong to this surgery", "preparation_surgery_mismatch");
}

export async function createPreparation(db: Db, companyId: string, surgeryId: string, userId: string, input: { idempotencyKey?: string; cajasAssignmentId?: string; lines: Array<{ articleId: string; requestedQuantity: string; stockUnit: string }> }) {
  const surgery = await db.surgery.findFirst({ where: { companyId, id: surgeryId }, select: { id: true } });
  if (!surgery) throw notFound("Surgery not found", "surgery_not_found");
  if (input.cajasAssignmentId) {
    const assignment = await db.cajasAssignment.findFirst({ where: { companyId, id: input.cajasAssignmentId, surgeryId, endedAt: null } });
    if (!assignment) throw badRequest("CajasAssignment is not active for this surgery", "cajas_assignment_invalid");
  }
  const eligibleArticles = await db.article.findMany({ where: { id: { in: input.lines.map((line) => line.articleId) }, stockEligibilities: { some: { companyId } } }, select: { id: true } });
  if (eligibleArticles.length !== new Set(input.lines.map((line) => line.articleId)).size) throw badRequest("Preparation contains an article outside the company stock scope", "article_company_scope_invalid");
  if (input.idempotencyKey) {
    const existing = await db.surgeryPreparation.findFirst({ where: { companyId, idempotencyKey: input.idempotencyKey }, include: { lines: { orderBy: { lineNumber: "asc" } } } });
    if (existing) {
      assertPreparationReplayIntent(existing, surgeryId, input);
      return existing;
    }
  }
  try {
    return await inTransaction(db, async (tx) => {
      const preparation = await tx.surgeryPreparation.create({ data: { companyId, surgeryId, cajasAssignmentId: input.cajasAssignmentId, createdById: userId, idempotencyKey: input.idempotencyKey, lines: { create: input.lines.map((line, index) => ({ lineNumber: index + 1, articleId: line.articleId, requestedQuantity: D(line.requestedQuantity), stockUnit: line.stockUnit })) } }, include: { lines: true } });
      await createAuditEvent({ prisma: tx, companyId, userId, entityType: "SurgeryPreparation", entityId: preparation.id, action: "created", module: "stock" });
      return preparation;
    });
  } catch (error) {
    if (!(input.idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    const replay = await db.surgeryPreparation.findFirst({ where: { companyId, idempotencyKey: input.idempotencyKey }, include: { lines: { orderBy: { lineNumber: "asc" } } } });
    if (!replay) throw error;
    assertPreparationReplayIntent(replay, surgeryId, input);
    return replay;
  }
}

export async function getPreparation(db: Db, companyId: string, surgeryId: string) {
  const preparation = await db.surgeryPreparation.findFirst({ where: { companyId, surgeryId }, include: { lines: { include: { reservations: { include: { projection: true } } } }, cajasAssignment: true } });
  if (!preparation) throw notFound("Preparation not found", "preparation_not_found");
  const positionIds = preparation.lines.flatMap((line) => line.reservations.map((reservation) => reservation.positionId));
  const positions = await db.stockPositionProjection.findMany({ where: { companyId, positionId: { in: positionIds } } });
  const byPosition = new Map(positions.map((position) => [position.positionId, position]));
  return { ...preparation, lines: preparation.lines.map((line) => ({ ...line, available: line.reservations.reduce((sum, reservation) => sum.add(byPosition.get(reservation.positionId)?.availableQuantity ?? D(0)), D(0)) })) };
}

export async function reservePreparation(db: Db, companyId: string, surgeryId: string, preparationId: string, userId: string, input: { lineId: string; positionId: string; quantity: string; idempotencyKey?: string }) {
  const quantity = D(input.quantity);
  if (quantity.lte(0)) throw badRequest("Quantity must be positive", "invalid_quantity");
  const expectedIntent = intentHash({ preparationId, lineId: input.lineId, positionId: input.positionId, quantity: quantity.toString() });
  try {
    return await inTransaction(db, async (tx) => {
    const preparation = await tx.surgeryPreparation.findFirst({ where: { companyId, id: preparationId }, select: { id: true, surgeryId: true } });
    if (!preparation) throw notFound("Preparation not found", "preparation_not_found");
    assertPreparationSurgeryLink(surgeryId, preparation.surgeryId);
    const initialReplay = await resolveReservationReplay(tx, companyId, input.idempotencyKey, expectedIntent);
    if (initialReplay) return initialReplay;
    await tx.$queryRaw`
      SELECT "id" FROM "SurgeryPreparationLine"
      WHERE "companyId" = ${companyId} AND "preparationId" = ${preparationId} AND "id" = ${input.lineId}
      FOR UPDATE
    `;
    const contendedReplay = await resolveReservationReplay(tx, companyId, input.idempotencyKey, expectedIntent);
    if (contendedReplay) return contendedReplay;
    const line = await tx.surgeryPreparationLine.findFirst({ where: { companyId, id: input.lineId, preparationId }, include: { preparation: true } });
    if (!line) throw notFound("Preparation line not found", "preparation_line_not_found");
    const existing = await tx.stockReservation.findFirst({ where: { companyId, sourceEntityId: preparationId, sourceLineId: line.id, sourceScopeKind: "LINE", sourceScopeKey: `L:${line.id}` } });
    if (existing) throw conflict("Preparation line is already reserved", "preparation_line_reserved");
    assertPreparationQuantity(line.requestedQuantity, line.preparedQuantity, quantity);
    const position = await tx.stockPosition.findFirst({ where: { companyId, id: input.positionId, articleId: line.articleId }, include: { positionProjection: true } });
    if (!position || !position.positionProjection) throw notFound("Available stock position not found", "stock_position_not_found");
    if (position.identifiedUnitId) {
      const lockedUnits = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "StockIdentifiedUnit"
        WHERE "companyId" = ${companyId} AND "id" = ${position.identifiedUnitId}
        FOR UPDATE
      `;
      if (lockedUnits.length !== 1) throw notFound("Identified unit not found", "identified_unit_not_found");
      const assignment = await tx.cajasAssignment.findFirst({ where: { companyId, boxIdentifiedUnitId: position.identifiedUnitId, activeSlot: 1 } });
      if (assignment) throw conflict("Identified unit is assigned to a Surgery", "identified_unit_assigned");
      const duplicate = await tx.stockReservation.findFirst({ where: { companyId, identifiedUnitId: position.identifiedUnitId, projection: { status: "ACTIVE" } } });
      if (duplicate) throw conflict("Identified unit is already reserved", "identified_unit_reserved");
    }
    const updated = await tx.stockPositionProjection.updateMany({ where: { companyId, positionId: position.id, availableQuantity: { gte: quantity } }, data: { availableQuantity: { decrement: quantity }, reservedQuantity: { increment: quantity }, version: { increment: 1 } } });
    if (updated.count !== 1) throw conflict("Insufficient available stock", "stock_oversubscribed");
    const audit = await createAuditEvent({ prisma: tx, companyId, userId, entityType: "SurgeryPreparationLine", entityId: line.id, action: "reserved", module: "stock" });
    const reservationId = randomUUID();
    const command = await tx.operationalCommandAcceptance.create({ data: { companyId, domain: "stock", sourceOperationId: input.idempotencyKey ?? `reserve:${line.id}:${position.id}`, checkpoint: "preparation-reserve", scopeKey: input.idempotencyKey ?? `${line.id}:${position.id}`, intentHash: expectedIntent, acceptedAt: new Date(), acceptedById: userId, resultEntityType: "StockReservation", resultEntityId: reservationId, auditEventId: audit.id } });
    const reservation = await tx.stockReservation.create({ data: { id: reservationId, companyId, sourceDomain: "stock", sourceEntityType: "SurgeryPreparation", sourceEntityId: line.preparation.id, sourceLineId: line.id, sourceScopeKind: "LINE", sourceScopeKey: `L:${line.id}`, positionId: position.id, identifiedUnitId: position.identifiedUnitId, preparationLineId: line.id } });
    await tx.stockReservationEvidence.create({ data: { companyId, reservationId: reservation.id, sequence: 1, kind: "RESERVE", quantity, stockUnit: line.stockUnit, scaleSnapshot: position.quantityScale, acceptedAt: new Date(), acceptedById: userId, commandAcceptanceId: command.id, auditEventId: audit.id } });
    await tx.stockReservationProjection.create({ data: { companyId, reservationId: reservation.id, activeQuantity: quantity, appliedQuantity: D(0), status: "ACTIVE", version: 1, evidenceWatermark: command.id } });
    await tx.surgeryPreparationLine.update({ where: { id: line.id }, data: { preparedQuantity: { increment: quantity } } });
    return reservation;
    });
  } catch (error) {
    if (!input.idempotencyKey || !isOperationalSemanticCollision(error)) throw error;
    const replay = await resolveReservationReplay(db, companyId, input.idempotencyKey, expectedIntent);
    if (!replay) throw error;
    return replay;
  }
}
