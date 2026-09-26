/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { acknowledgeCajasPhysicalDifference, confirmCajasPhysicalAllocation, releaseCajasPhysicalAllocation } from "@/lib/services/cajas-physical-preparation.service";

const D = (value: string | number) => new Prisma.Decimal(value);

function physicalDb({ articleId = "expected", quantity = "2", available = "10", positions: suppliedPositions }: { articleId?: string; quantity?: string; available?: string; positions?: any[] } = {}) {
  const correlations: any[] = [];
  const line = { id: "line-1", preparationId: "prep-1", articleId: "expected", quantity: D(quantity), stockUnit: "u", scaleSnapshot: 0, role: "EXPECTED", isActive: true, differenceAcknowledged: false };
  const positions = suppliedPositions ?? [{ id: "position-1", articleId, stockUnit: "u", quantityScale: 0, traceMode: "NONE", identifiedUnitId: null, positionProjection: { availableQuantity: D(available) }, lot: null, identifiedUnit: null }];
  const positionById = new Map(positions.map((position) => [position.id, position]));
  let evidence = 0;
  const tx: any = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    cajasPreparationLine: {
      findFirst: vi.fn(async ({ where, include }: any) => {
        const assignmentId = where.preparation?.assignmentId;
        const surgeryId = where.preparation?.assignment?.surgeryId;
        if (where.companyId !== "company-1" || where.id !== line.id || (assignmentId && assignmentId !== "assignment-1") || (surgeryId && surgeryId !== "surgery-1")) return null;
        return include ? { ...line, reservationCorrelations: correlations } : line;
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    stockPosition: { findFirst: vi.fn(async ({ where }: any) => where.companyId === "company-1" ? positionById.get(where.id) ?? null : null) },
    stockPositionProjection: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    cajasPreparation: { findFirst: vi.fn().mockResolvedValue({ id: "prep-1", version: 1, latestControlId: null, formulaVersionId: "fv" }), update: vi.fn().mockResolvedValue({}) },
    cajasCompositionChange: { create: vi.fn().mockResolvedValue({}) },
    stockReservation: { create: vi.fn(async ({ data }: any) => data) },
    stockReservationEvidence: { create: vi.fn(async ({ data }: any) => ({ ...data, id: `evidence-${++evidence}` })) },
    stockReservationProjection: { create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}) },
    cajasReservationCorrelation: {
      findFirst: vi.fn(async ({ where }: any) => correlations.find((row) => row.id === where.id) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const releasing = String(data.semanticKey).endsWith(":release");
        const row = { ...data, stockPosition: positionById.get(data.stockPositionId), stockReservationEvidence: { id: data.stockReservationEvidenceId, kind: releasing ? "RELEASE" : "RESERVE", stockUnit: "u", scaleSnapshot: 0 }, stockReservation: { projection: { activeQuantity: D(data.quantity), status: releasing ? "RELEASED" : "ACTIVE" } }, followingCorrelations: [] };
        const replaced = correlations.find((item) => item.id === data.replacesCorrelationId);
        if (replaced) replaced.followingCorrelations.push({ id: row.id });
        correlations.push(row);
        return row;
      }),
    },
  };
  return { db: { ...tx, $transaction: vi.fn((work: any) => work(tx)) }, tx, correlations };
}

describe("cajas physical preparation", () => {
  it("B1 retains independent immutable lot and identified-unit snapshots without line trace conflation", async () => {
    const lotPosition = { id: "lot-position", articleId: "expected", stockUnit: "u", quantityScale: 0, traceMode: "LOT", identifiedUnitId: null, positionProjection: { availableQuantity: D(10) }, lot: { primaryObservation: { displayLotCode: "LOT-A", expirationDate: new Date("2030-01-02") } }, identifiedUnit: null };
    const identifiedPosition = { id: "identified-position", articleId: "expected", stockUnit: "u", quantityScale: 0, traceMode: "IDENTIFIED_UNIT", identifiedUnitId: "unit-1", positionProjection: { availableQuantity: D(10) }, lot: null, identifiedUnit: { currentConfiguration: { internalCode: "UNIT-001", serialNumber: "SERIAL-001" } } };
    const { db, tx, correlations } = physicalDb({ positions: [lotPosition, identifiedPosition] });
    await confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: lotPosition.id, quantity: 1, idempotencyKey: "one" });
    const result = await confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: identifiedPosition.id, quantity: 1, idempotencyKey: "two" });

    expect(correlations).toHaveLength(2);
    expect(correlations.map((row) => row.allocationTraceSnapshot)).toEqual(expect.arrayContaining([
      expect.objectContaining({ stockPositionId: lotPosition.id, lotCode: "LOT-A", expirationDate: "2030-01-02", identifiedUnitId: null, serialNumber: null, quantity: "1" }),
      expect.objectContaining({ stockPositionId: identifiedPosition.id, lotCode: null, identifiedUnitId: "unit-1", identifiedCode: "UNIT-001", serialNumber: "SERIAL-001", quantity: "1" }),
    ]));
    expect(tx.cajasPreparationLine.update).not.toHaveBeenCalled();
    expect(result.projection.allocations.map((row) => row.trace)).toEqual(expect.arrayContaining([
      expect.objectContaining({ stockPositionId: lotPosition.id, lotCode: "LOT-A" }),
      expect.objectContaining({ stockPositionId: identifiedPosition.id, serialNumber: "SERIAL-001" }),
    ]));
    expect(result.projection.status).toBe("COMPLETE");
  });

  it("B2 rejects an unpaired different article before any stock write", async () => {
    const { db, tx } = physicalDb({ articleId: "different" });
    await expect(confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: "position-1", quantity: 1, idempotencyKey: "different" }))
      .rejects.toMatchObject({ code: "cajas_different_article_requires_replacement" });
    expect(tx.stockPositionProjection.updateMany).not.toHaveBeenCalled();
    expect(tx.cajasReservationCorrelation.create).not.toHaveBeenCalled();
  });

  it("B2 releases then appends a replacement correlation instead of overwriting history", async () => {
    const { db, tx, correlations } = physicalDb({ articleId: "different" });
    correlations.push({ id: "prior-1", preparationId: "prep-1", stockPositionId: "old-position", quantity: D(1), stockUnit: "u", stockReservationEvidenceId: "old-evidence", stockPosition: { id: "old-position", articleId: "expected" }, stockReservationEvidence: { id: "old-evidence", kind: "RESERVE", stockUnit: "u", scaleSnapshot: 0 }, stockReservation: { projection: { activeQuantity: D(1), status: "ACTIVE" } }, followingCorrelations: [], allocationTraceSnapshot: { articleId: "expected", stockPositionId: "old-position", stockUnit: "u", traceMode: "NONE", lotCode: null, expirationDate: null, identifiedUnitId: null, identifiedCode: null, serialNumber: null, quantity: "1", capturedAt: "2026-09-07T00:00:00.000Z" } });
    const result = await confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: "position-1", quantity: 1, replacesCorrelationId: "prior-1", reason: "Alternative component", idempotencyKey: "replace" });
    expect(tx.stockReservationProjection.update).toHaveBeenCalledTimes(1);
    expect(tx.cajasReservationCorrelation.create).toHaveBeenCalledTimes(2);
    expect(result.projection.status).toBe("DIFFERENT");
    expect(result.projection.expected).toMatchObject({ articleId: "expected" });
    expect(result.projection.allocations).toEqual(expect.arrayContaining([expect.objectContaining({ trace: expect.objectContaining({ articleId: "different" }) })]));
    expect(result.projection.differenceAcknowledged).toBe(false);
    expect(tx.stockReservationEvidence.create.mock.calls.map(([{ data }]: any) => data.kind)).toEqual(["RELEASE", "RESERVE"]);
    expect(tx.stockReservationEvidence.create.mock.calls[0][0].data).toMatchObject({ replacesEvidenceId: "old-evidence", cause: "Alternative component" });
    expect(tx.auditEvent.create.mock.calls.map(([{ data }]: any) => data.action)).toEqual(["physical_allocation_released", "physical_allocation_confirmed"]);
  });

  it("B4 keeps a partial reservation active until an explicit release command", async () => {
    const { db, tx, correlations } = physicalDb();
    const result = await confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: "position-1", quantity: 1, idempotencyKey: "partial" });
    expect(result.projection.status).toBe("PARTIAL");
    expect(tx.stockReservationProjection.update).not.toHaveBeenCalled();
    const released = await releaseCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", correlations[0].id, "user-1", { reason: "Cancelled", idempotencyKey: "release" });
    expect(released.projection.status).toBe("DRAFT");
    expect(tx.stockReservationProjection.update).toHaveBeenCalledTimes(1);
    expect(correlations).toHaveLength(2);
    expect(correlations[1].allocationTraceSnapshot).toEqual(correlations[0].allocationTraceSnapshot);
    expect(correlations[1]).toMatchObject({ replacesCorrelationId: correlations[0].id, semanticKey: expect.stringMatching(/:release$/) });
    expect(tx.stockReservationEvidence.create.mock.calls.map(([{ data }]: any) => data.kind)).toEqual(["RESERVE", "RELEASE"]);
    expect(tx.stockReservationEvidence.create.mock.calls[1][0].data).toMatchObject({ replacesEvidenceId: correlations[0].stockReservationEvidenceId, cause: "Cancelled" });
    expect(tx.auditEvent.create.mock.calls.map(([{ data }]: any) => data.action)).toEqual(["physical_allocation_confirmed", "physical_allocation_release_accepted", "physical_allocation_released"]);
  });

  it("real allocation release after control invalidates it and requires recontrol", async () => {
    const { db, tx, correlations } = physicalDb();
    await confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: "position-1", quantity: 1, idempotencyKey: "allocate" });
    tx.cajasPreparation.findFirst.mockResolvedValue({ id: "prep-1", version: 1, latestControlId: "control-1", formulaVersionId: "fv" });
    await releaseCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", correlations[0].id, "user-1", { reason: "changed", idempotencyKey: "release-control" });
    expect(tx.cajasCompositionChange.create).toHaveBeenCalled();
    expect(tx.cajasPreparation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requiresRecontrol: true }) }));
  });

  it("rejects legacy no-snapshot release without appending a correlation", async () => {
    const { db, tx, correlations } = physicalDb();
    await confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: "position-1", quantity: 1, idempotencyKey: "legacy-source" });
    correlations[0].allocationTraceSnapshot = null;
    await expect(releaseCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", correlations[0].id, "user-1", { reason: "Cancelled", idempotencyKey: "legacy-release" }))
      .rejects.toMatchObject({ code: "cajas_allocation_trace_snapshot_missing" });
    expect(tx.stockPositionProjection.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.cajasReservationCorrelation.create).toHaveBeenCalledTimes(1);
  });

  it("replays the same intent without a second reservation", async () => {
    const { db, tx } = physicalDb();
    const input = { positionId: "position-1", quantity: 1, idempotencyKey: "replay" };
    await confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", input);
    const accepted = tx.operationalCommandAcceptance.create.mock.calls[0][0].data;
    tx.operationalCommandAcceptance.findFirst.mockResolvedValue({ intentHash: accepted.intentHash });
    await expect(confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", input)).resolves.toMatchObject({ replayed: true });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.stockReservation.create).toHaveBeenCalledTimes(1);
  });

  it("B3 records a non-final difference acknowledgement without control or dispatch writers", async () => {
    const { db, tx, correlations } = physicalDb();
    correlations.push({ id: "different-1", quantity: D(1), stockPosition: { articleId: "different" }, stockReservationEvidence: { kind: "RESERVE" }, stockReservation: { projection: { status: "ACTIVE" } }, followingCorrelations: [], allocationTraceSnapshot: {} });
    const result = await acknowledgeCajasPhysicalDifference(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { reason: "Alternative component", idempotencyKey: "ack" });
    expect(result.projection.status).toBe("DIFFERENT");
    expect(tx.cajasPreparationLine.update).toHaveBeenCalledWith(expect.objectContaining({ data: { differenceAcknowledged: true } }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "physical_difference_acknowledged", newValue: expect.objectContaining({ finalApproval: false }) }) }));
    expect(tx.auditEvent.create.mock.calls.some(([{ data }]: any) => data.newValue?.finalApproval === true)).toBe(false);
    expect((tx as any).cajasControl).toBeUndefined();
    expect((tx as any).cajasDispatch).toBeUndefined();
  });

  it("rejects cross-company assignment, line, and position IDs before stock or correlation writes", async () => {
    const { db, tx } = physicalDb();
    await expect(confirmCajasPhysicalAllocation(db as never, "company-2", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: "position-1", quantity: 1, idempotencyKey: "foreign-company" }))
      .rejects.toMatchObject({ code: "cajas_expected_line_not_found" });
    await expect(confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-2", "line-1", "user-1", { positionId: "position-1", quantity: 1, idempotencyKey: "foreign-assignment" }))
      .rejects.toMatchObject({ code: "cajas_expected_line_not_found" });
    await expect(confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-2", "user-1", { positionId: "position-1", quantity: 1, idempotencyKey: "foreign-line" }))
      .rejects.toMatchObject({ code: "cajas_expected_line_not_found" });
    await expect(confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: "position-2", quantity: 1, idempotencyKey: "foreign-position" }))
      .rejects.toMatchObject({ code: "cajas_stock_position_not_found" });
    expect(tx.stockPositionProjection.updateMany).not.toHaveBeenCalled();
    expect(tx.stockReservation.create).not.toHaveBeenCalled();
    expect(tx.cajasReservationCorrelation.create).not.toHaveBeenCalled();
  });

  it("fails atomically on the final availability guard without evidence or correlation", async () => {
    const { db, tx } = physicalDb();
    tx.stockPositionProjection.updateMany.mockResolvedValue({ count: 0 });
    await expect(confirmCajasPhysicalAllocation(db as never, "company-1", "surgery-1", "assignment-1", "line-1", "user-1", { positionId: "position-1", quantity: 1, idempotencyKey: "race" }))
      .rejects.toMatchObject({ code: "stock_oversubscribed" });
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
    expect(tx.stockReservation.create).not.toHaveBeenCalled();
    expect(tx.cajasReservationCorrelation.create).not.toHaveBeenCalled();
    expect((tx as any).cajasControl).toBeUndefined();
    expect((tx as any).cajasDispatch).toBeUndefined();
  });
});
