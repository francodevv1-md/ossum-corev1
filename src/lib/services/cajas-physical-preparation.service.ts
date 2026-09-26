import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

import { badRequest, conflict, notFound } from "../api/errors";
import type { CajasDifferenceAcknowledgementInput, CajasPhysicalAllocationInput, CajasPhysicalReleaseInput } from "../validators/cajas";
import { invalidateCajasControlForComposition } from "./cajas-control.service";

type Db = PrismaClient | Prisma.TransactionClient;
const decimal = (value: string | number) => new Prisma.Decimal(value);
const checkpoint = "cajas-physical-preparation";

const positionInclude = Prisma.validator<Prisma.StockPositionInclude>()({
  positionProjection: true,
  lot: { include: { primaryObservation: true } },
  identifiedUnit: { include: { currentConfiguration: true } },
});

const correlationInclude = Prisma.validator<Prisma.CajasReservationCorrelationInclude>()({
  stockPosition: { include: positionInclude },
  stockReservationEvidence: true,
  stockReservation: { include: { projection: true } },
  followingCorrelations: { select: { id: true } },
});

type Position = Prisma.StockPositionGetPayload<{ include: typeof positionInclude }>;
type Correlation = Prisma.CajasReservationCorrelationGetPayload<{ include: typeof correlationInclude }>;

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function traceSnapshot(position: Position, quantity: Prisma.Decimal) {
  const lot = position.lot?.primaryObservation;
  const unit = position.identifiedUnit?.currentConfiguration;
  return {
    articleId: position.articleId,
    stockPositionId: position.id,
    stockUnit: position.stockUnit,
    traceMode: position.traceMode,
    lotCode: lot?.displayLotCode ?? null,
    expirationDate: lot?.expirationDate?.toISOString().slice(0, 10) ?? null,
    identifiedUnitId: position.identifiedUnitId ?? null,
    identifiedCode: unit?.internalCode ?? null,
    serialNumber: unit?.serialNumber ?? null,
    quantity: quantity.toString(),
    capturedAt: new Date().toISOString(),
  };
}

function hasCompleteAllocationTraceSnapshot(correlation: Correlation) {
  const snapshot = correlation.allocationTraceSnapshot;
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== "object") return false;
  const trace = snapshot as Record<string, unknown>;
  const required = ["articleId", "stockPositionId", "stockUnit", "traceMode", "lotCode", "expirationDate", "identifiedUnitId", "identifiedCode", "serialNumber", "quantity", "capturedAt"];
  return required.every((key) => Object.hasOwn(trace, key))
    && trace.stockPositionId === correlation.stockPositionId
    && trace.stockUnit === correlation.stockUnit
    && trace.quantity === correlation.quantity?.toString()
    && typeof trace.capturedAt === "string";
}

function status(expected: Prisma.Decimal, expectedArticleId: string, correlations: Correlation[]) {
  const active = correlations.filter((row) => row.followingCorrelations.length === 0 && row.stockReservationEvidence.kind !== "RELEASE" && row.stockReservationEvidence.kind !== "CANCEL" && row.stockReservation.projection?.status === "ACTIVE");
  if (active.some((row) => row.stockPosition.articleId !== expectedArticleId)) return "DIFFERENT";
  const found = active.reduce((total, row) => total.add(row.quantity ?? decimal(0)), decimal(0));
  if (found.isZero()) return "DRAFT";
  return found.gte(expected) ? "COMPLETE" : "PARTIAL";
}

function activeAllocations(correlations: Correlation[]) {
  return correlations.filter((row) => row.followingCorrelations.length === 0 && row.stockReservationEvidence.kind !== "RELEASE" && row.stockReservationEvidence.kind !== "CANCEL" && row.stockReservation.projection?.status === "ACTIVE");
}

async function accepted(db: Db, companyId: string, key: string, intent: string) {
  const row = await db.operationalCommandAcceptance.findFirst({ where: { companyId, domain: "cajas", sourceOperationId: key, checkpoint } });
  if (!row) return null;
  if (row.intentHash !== intent) throw conflict("Idempotency key was already used for a different intent", "idempotency_key_reused");
  return row;
}

async function projection(db: Db, companyId: string, assignmentId: string, lineId: string) {
  const line = await db.cajasPreparationLine.findFirst({
    where: { companyId, id: lineId, preparation: { assignmentId }, role: "EXPECTED", isActive: true },
    include: { reservationCorrelations: { include: correlationInclude, orderBy: { createdAt: "asc" } } },
  });
  if (!line) throw notFound("Expected Caja preparation line not found", "cajas_expected_line_not_found");
  const correlations = line.reservationCorrelations;
  const active = activeAllocations(correlations);
  return {
    expectedLineId: line.id,
    expected: { articleId: line.articleId, quantity: line.quantity.toString(), stockUnit: line.stockUnit, scale: line.scaleSnapshot },
    reservedQuantity: active.reduce((total, row) => total.add(row.quantity ?? decimal(0)), decimal(0)).toString(),
    allocations: correlations.filter((row) => row.followingCorrelations.length === 0).map((row) => ({
      correlationId: row.id,
      reservationId: row.stockReservationId,
      quantity: row.quantity?.toString() ?? null,
      trace: row.allocationTraceSnapshot,
      reservationStatus: row.stockReservation.projection?.status ?? null,
      event: row.stockReservationEvidence.kind,
    })),
    status: status(line.quantity, line.articleId, correlations),
    differenceAcknowledged: line.differenceAcknowledged,
  };
}

export async function getEligibleCajasPhysicalPositions(db: PrismaClient, companyId: string, surgeryId: string, assignmentId: string, lineId: string) {
  const line = await db.cajasPreparationLine.findFirst({
    where: { companyId, id: lineId, role: "EXPECTED", isActive: true, preparation: { id: { not: "" }, assignmentId, assignment: { surgeryId, activeSlot: 1 } } },
    select: { articleId: true, stockUnit: true, scaleSnapshot: true },
  });
  if (!line) throw notFound("Expected Caja preparation line not found", "cajas_expected_line_not_found");
  const positions = await db.stockPosition.findMany({
    where: { companyId, articleId: line.articleId, stockUnit: line.stockUnit, quantityScale: line.scaleSnapshot, positionProjection: { availableQuantity: { gt: decimal(0) } } },
    include: positionInclude,
    orderBy: { createdAt: "asc" },
  });
  return {
    expected: { articleId: line.articleId, stockUnit: line.stockUnit, scale: line.scaleSnapshot },
    positions: positions.map((row) => ({ id: row.id, availableQuantity: row.positionProjection!.availableQuantity.toString(), trace: traceSnapshot(row, decimal(0)) })),
  };
}

async function release(tx: Prisma.TransactionClient, companyId: string, assignmentId: string, lineId: string, actorUserId: string, correlation: Correlation, reason: string, commandId: string) {
  if (!hasCompleteAllocationTraceSnapshot(correlation)) throw conflict("Legacy allocation cannot be released without its immutable trace snapshot", "cajas_allocation_trace_snapshot_missing");
  await tx.$queryRaw`SELECT "id" FROM "cajas_preparation_line" WHERE "company_id"=${companyId} AND "id"=${lineId} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "StockPosition" WHERE "companyId"=${companyId} AND "id"=${correlation.stockPositionId} FOR UPDATE`;
  if (correlation.stockPosition.identifiedUnitId) await tx.$queryRaw`SELECT "id" FROM "StockIdentifiedUnit" WHERE "companyId"=${companyId} AND "id"=${correlation.stockPosition.identifiedUnitId} FOR UPDATE`;
  const quantity = correlation.stockReservation.projection?.activeQuantity ?? decimal(0);
  if (quantity.lte(0)) throw conflict("Allocation is no longer active", "cajas_allocation_not_active");
  const updated = await tx.stockPositionProjection.updateMany({ where: { companyId, positionId: correlation.stockPositionId, reservedQuantity: { gte: quantity } }, data: { availableQuantity: { increment: quantity }, reservedQuantity: { decrement: quantity }, version: { increment: 1 } } });
  if (updated.count !== 1) throw conflict("Allocation cannot be released safely", "cajas_allocation_release_conflict");
  const audit = await tx.auditEvent.create({ data: { companyId, userId: actorUserId, entityType: "CajasReservationCorrelation", entityId: correlation.id, action: "physical_allocation_released", module: "cajas", newValue: { assignmentId, lineId, reason } } });
  const evidence = await tx.stockReservationEvidence.create({ data: { companyId, reservationId: correlation.stockReservationId, sequence: 2, kind: "RELEASE", quantity, stockUnit: correlation.stockReservationEvidence.stockUnit, scaleSnapshot: correlation.stockReservationEvidence.scaleSnapshot, replacesEvidenceId: correlation.stockReservationEvidenceId, acceptedAt: new Date(), acceptedById: actorUserId, cause: reason, commandAcceptanceId: commandId, auditEventId: audit.id } });
  await tx.stockReservationProjection.update({ where: { companyId_reservationId: { companyId, reservationId: correlation.stockReservationId } }, data: { activeQuantity: decimal(0), status: "RELEASED", version: { increment: 1 }, evidenceWatermark: commandId } });
  await tx.cajasReservationCorrelation.create({ data: { companyId, assignmentId, preparationId: correlation.preparationId, preparationLineId: lineId, stockPositionId: correlation.stockPositionId, stockReservationId: correlation.stockReservationId, stockReservationEvidenceId: evidence.id, sourceCheckpoint: checkpoint, semanticKey: `${commandId}:release`, quantity, stockUnit: correlation.stockReservationEvidence.stockUnit, scaleSnapshot: correlation.stockReservationEvidence.scaleSnapshot, allocationTraceSnapshot: correlation.allocationTraceSnapshot ?? Prisma.JsonNull, replacesCorrelationId: correlation.id } });
}

export async function confirmCajasPhysicalAllocation(db: PrismaClient, companyId: string, surgeryId: string, assignmentId: string, lineId: string, actorUserId: string, input: CajasPhysicalAllocationInput) {
  const quantity = decimal(input.quantity);
  const intent = hash({ assignmentId, lineId, positionId: input.positionId, quantity: quantity.toString(), replacesCorrelationId: input.replacesCorrelationId ?? null, reason: input.reason ?? null });
  const replay = await accepted(db, companyId, input.idempotencyKey, intent);
  if (replay) return { replayed: true, projection: await projection(db, companyId, assignmentId, lineId) };
  return db.$transaction(async (tx) => {
    const repeated = await accepted(tx, companyId, input.idempotencyKey, intent);
    if (repeated) return { replayed: true, projection: await projection(tx, companyId, assignmentId, lineId) };
    await tx.$queryRaw`SELECT "id" FROM "cajas_preparation_line" WHERE "company_id"=${companyId} AND "id"=${lineId} FOR UPDATE`;
    const line = await tx.cajasPreparationLine.findFirst({ where: { companyId, id: lineId, role: "EXPECTED", isActive: true, preparation: { assignmentId, assignment: { surgeryId, activeSlot: 1 } } } });
    if (!line) throw notFound("Expected Caja preparation line not found", "cajas_expected_line_not_found");
    await tx.$queryRaw`SELECT "id" FROM "StockPosition" WHERE "companyId"=${companyId} AND "id"=${input.positionId} FOR UPDATE`;
    const position = await tx.stockPosition.findFirst({ where: { companyId, id: input.positionId }, include: positionInclude });
    if (!position?.positionProjection) throw notFound("Available stock position not found", "cajas_stock_position_not_found");
    if (position.articleId === line.articleId && (position.stockUnit !== line.stockUnit || position.quantityScale !== line.scaleSnapshot)) throw conflict("Stock position unit or scale does not match the expected line", "cajas_stock_unit_mismatch");
    if (position.articleId !== line.articleId && !input.replacesCorrelationId) throw conflict("A different article requires an explicit replacement", "cajas_different_article_requires_replacement");
    if (position.traceMode === "LOT" && !position.lot?.primaryObservation) throw conflict("Lot traceability is incomplete", "cajas_lot_trace_incomplete");
    if (position.traceMode === "IDENTIFIED_UNIT" && !position.identifiedUnit?.currentConfiguration) throw conflict("Identified-unit traceability is incomplete", "cajas_identified_trace_incomplete");
    if (position.identifiedUnitId) await tx.$queryRaw`SELECT "id" FROM "StockIdentifiedUnit" WHERE "companyId"=${companyId} AND "id"=${position.identifiedUnitId} FOR UPDATE`;
    const commandId = randomUUID();
    const prior = input.replacesCorrelationId
      ? await tx.cajasReservationCorrelation.findFirst({ where: { companyId, id: input.replacesCorrelationId, assignmentId, preparationLineId: lineId }, include: correlationInclude })
      : null;
    if (input.replacesCorrelationId && !prior) throw notFound("Allocation to replace not found", "cajas_allocation_not_found");
    const before = await projection(tx, companyId, assignmentId, lineId);
    const priorQuantity = prior?.stockReservation.projection?.activeQuantity ?? decimal(0);
    if (position.articleId === line.articleId && decimal(before.reservedQuantity).sub(priorQuantity).add(quantity).gt(line.quantity)) throw conflict("Physical allocation exceeds the expected quantity", "cajas_allocation_exceeds_expected");
    if (input.replacesCorrelationId) {
      await release(tx, companyId, assignmentId, lineId, actorUserId, prior!, input.reason!, commandId);
    }
    const updated = await tx.stockPositionProjection.updateMany({ where: { companyId, positionId: position.id, availableQuantity: { gte: quantity } }, data: { availableQuantity: { decrement: quantity }, reservedQuantity: { increment: quantity }, version: { increment: 1 } } });
    if (updated.count !== 1) throw conflict("Insufficient available stock", "stock_oversubscribed");
    const correlationId = randomUUID();
    const audit = await tx.auditEvent.create({ data: { companyId, userId: actorUserId, entityType: "CajasReservationCorrelation", entityId: correlationId, action: "physical_allocation_confirmed", module: "cajas", newValue: { assignmentId, lineId, positionId: position.id, quantity: quantity.toString(), replacesCorrelationId: input.replacesCorrelationId ?? null } } });
    await tx.operationalCommandAcceptance.create({ data: { id: commandId, companyId, domain: "cajas", sourceOperationId: input.idempotencyKey, checkpoint, scopeKey: lineId, intentHash: intent, acceptedAt: new Date(), acceptedById: actorUserId, resultEntityType: "CajasReservationCorrelation", resultEntityId: correlationId, auditEventId: audit.id } });
    const reservationId = randomUUID();
    const reservation = await tx.stockReservation.create({ data: { id: reservationId, companyId, sourceDomain: "cajas", sourceEntityType: "CajasPreparation", sourceEntityId: line.preparationId, sourceLineId: line.id, sourceScopeKind: "LINE", sourceScopeKey: `C:${assignmentId}:${lineId}:${commandId}`, positionId: position.id, identifiedUnitId: position.identifiedUnitId } });
    const evidence = await tx.stockReservationEvidence.create({ data: { companyId, reservationId, sequence: 1, kind: "RESERVE", quantity, stockUnit: position.stockUnit, scaleSnapshot: position.quantityScale, acceptedAt: new Date(), acceptedById: actorUserId, cause: input.reason, commandAcceptanceId: commandId, auditEventId: audit.id } });
    await tx.stockReservationProjection.create({ data: { companyId, reservationId, activeQuantity: quantity, appliedQuantity: decimal(0), status: "ACTIVE", version: 1, evidenceWatermark: commandId } });
    await tx.cajasReservationCorrelation.create({ data: { id: correlationId, companyId, assignmentId, preparationId: line.preparationId, preparationLineId: line.id, stockPositionId: position.id, stockReservationId: reservation.id, stockReservationEvidenceId: evidence.id, sourceCheckpoint: checkpoint, semanticKey: `${companyId}:${commandId}`, quantity, stockUnit: position.stockUnit, scaleSnapshot: position.quantityScale, allocationTraceSnapshot: traceSnapshot(position, quantity), replacesCorrelationId: input.replacesCorrelationId } });
    await invalidateCajasControlForComposition(tx, companyId, assignmentId, actorUserId, commandId, input.reason ?? "physical allocation changed");
    return { replayed: false, projection: await projection(tx, companyId, assignmentId, lineId) };
  });
}

export async function releaseCajasPhysicalAllocation(db: PrismaClient, companyId: string, surgeryId: string, assignmentId: string, lineId: string, correlationId: string, actorUserId: string, input: CajasPhysicalReleaseInput) {
  const intent = hash({ assignmentId, lineId, correlationId, reason: input.reason, action: "release" });
  if (await accepted(db, companyId, input.idempotencyKey, intent)) return { replayed: true, projection: await projection(db, companyId, assignmentId, lineId) };
  return db.$transaction(async (tx) => {
    if (await accepted(tx, companyId, input.idempotencyKey, intent)) return { replayed: true, projection: await projection(tx, companyId, assignmentId, lineId) };
    const line = await tx.cajasPreparationLine.findFirst({ where: { companyId, id: lineId, preparation: { assignmentId, assignment: { surgeryId, activeSlot: 1 } } } });
    if (!line) throw notFound("Expected Caja preparation line not found", "cajas_expected_line_not_found");
    const correlation = await tx.cajasReservationCorrelation.findFirst({ where: { companyId, id: correlationId, assignmentId, preparationLineId: lineId }, include: correlationInclude });
    if (!correlation) throw notFound("Allocation not found", "cajas_allocation_not_found");
    const commandId = randomUUID();
    const audit = await tx.auditEvent.create({ data: { companyId, userId: actorUserId, entityType: "CajasReservationCorrelation", entityId: correlationId, action: "physical_allocation_release_accepted", module: "cajas", newValue: { assignmentId, lineId, reason: input.reason } } });
    await tx.operationalCommandAcceptance.create({ data: { id: commandId, companyId, domain: "cajas", sourceOperationId: input.idempotencyKey, checkpoint, scopeKey: lineId, intentHash: intent, acceptedAt: new Date(), acceptedById: actorUserId, resultEntityType: "CajasReservationCorrelation", resultEntityId: correlationId, auditEventId: audit.id } });
    await release(tx, companyId, assignmentId, lineId, actorUserId, correlation, input.reason, commandId);
    await invalidateCajasControlForComposition(tx, companyId, assignmentId, actorUserId, commandId, input.reason);
    return { replayed: false, projection: await projection(tx, companyId, assignmentId, lineId) };
  });
}

export async function acknowledgeCajasPhysicalDifference(db: PrismaClient, companyId: string, surgeryId: string, assignmentId: string, lineId: string, actorUserId: string, input: CajasDifferenceAcknowledgementInput) {
  const intent = hash({ assignmentId, lineId, reason: input.reason, observation: input.observation ?? null, action: "acknowledge-difference" });
  if (await accepted(db, companyId, input.idempotencyKey, intent)) return { replayed: true, projection: await projection(db, companyId, assignmentId, lineId) };
  return db.$transaction(async (tx) => {
    if (await accepted(tx, companyId, input.idempotencyKey, intent)) return { replayed: true, projection: await projection(tx, companyId, assignmentId, lineId) };
    const current = await projection(tx, companyId, assignmentId, lineId);
    if (current.status !== "DIFFERENT") throw badRequest("Only a current difference can be acknowledged", "cajas_difference_not_open");
    const commandId = randomUUID();
    const audit = await tx.auditEvent.create({ data: { companyId, userId: actorUserId, entityType: "CajasPreparationLine", entityId: lineId, action: "physical_difference_acknowledged", module: "cajas", newValue: { assignmentId, lineId, reason: input.reason, observation: input.observation ?? null, finalApproval: false } } });
    await tx.operationalCommandAcceptance.create({ data: { id: commandId, companyId, domain: "cajas", sourceOperationId: input.idempotencyKey, checkpoint, scopeKey: lineId, intentHash: intent, acceptedAt: new Date(), acceptedById: actorUserId, resultEntityType: "CajasPreparationLine", resultEntityId: lineId, auditEventId: audit.id } });
    await tx.cajasPreparationLine.update({ where: { id: lineId }, data: { differenceAcknowledged: true } });
    return { replayed: false, projection: await projection(tx, companyId, assignmentId, lineId) };
  });
}
