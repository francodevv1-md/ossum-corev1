import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { selectCajasComponent, stockPositionKey } from "@/lib/services/cajas-component-selection.service";
import { reserveAssignedBox, reserveCajasComponent } from "@/lib/services/stock-reservation.service";
import { confirmCajasControl } from "@/lib/services/cajas-control.service";
import { resolveCajasDifference } from "@/lib/services/cajas-difference.service";
import { cajasTransaction, cajasIntent, openCajasDifferences } from "@/lib/services/cajas-command.service";
import { endBoxAssignment } from "@/lib/services/cajas-assignment.service";

// Real service functions; Prisma boundaries are doubles, not PostgreSQL evidence.
function fixture() {
  const d = (n: number) => new Prisma.Decimal(n);
  const scope = { id: "scope", articleReferenceId: "ref", kind: "identifiedUnit", sourceStockScopeId: "unit", serialNumberSnapshot: "serial" };
  const formulaVersion = { id: "formula", versionNumber: 1, lines: [{ id: "fline", expectedQuantity: d(1), unit: "u", articleReferenceId: "ref" }] };
  const prep: any = { id: "prep", assignmentId: "assignment", version: 1, requiresRecontrol: true, formulaVersionId: "formula", formulaVersion, latestControlId: null, assignment: { activeSlot: 1 } };
  const line: any = { id: "line", companyId: "company", expectedFormulaLineId: "fline", articleReferenceId: "ref", articleReference: { sourceArticleId: "article", skuSnapshot: "SKU", descriptionSnapshot: "Component" }, quantity: d(1), dispatchedQuantity: d(0), unit: "u", isActive: true, preparation: prep, stockScopeReferenceId: "scope", stockScopeReference: scope };
  prep.lines = [line];
  const assignment = { id: "assignment", activeSlot: 1, preparation: prep, boxStockScopeReference: { ...scope, id: "box-scope", sourceStockScopeId: "box" } };
  const commands = new Map<string, any>();
  const audits = new Map<string, any>();
  const db: any = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "assignment" }]),
    company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org" }) },
    auditEvent: {
      create: vi.fn(async ({ data }) => { const id = `audit-${audits.size}`; audits.set(id, data); return { id }; }),
      findFirstOrThrow: vi.fn(async ({ where }) => audits.get(where.id)),
    },
    cajasCommandAcceptance: {
      findUnique: vi.fn(async ({ where }) => commands.get(where.companyId_sourceOperationId_checkpoint_semanticKey.semanticKey) ?? null),
      create: vi.fn(async ({ data }) => { const result = { id: `command-${commands.size}`, ...data }; commands.set(data.semanticKey, result); return result; }),
    },
    cajasAssignment: { findFirst: vi.fn().mockResolvedValue(assignment), update: vi.fn() },
    cajasPreparationLine: { findFirst: vi.fn().mockResolvedValue(line), findFirstOrThrow: vi.fn().mockResolvedValue(line), findMany: vi.fn().mockResolvedValue([]), update: vi.fn(async ({ data }) => ({ ...line, ...data })) },
    cajasPreparation: { update: vi.fn(), updateMany: vi.fn() },
    article: { findFirst: vi.fn().mockResolvedValue({ id: "article", tracePolicies: [] }) },
    cajasArticleReference: { findFirstOrThrow: vi.fn().mockResolvedValue({ sourceArticleId: "article" }) },
    stockPhysicalUnit: { findFirst: vi.fn().mockResolvedValue({ id: "unit", unitCode: "U1", serialNumber: "serial", location: "shelf" }) },
    cajasStockScopeReference: { findUnique: vi.fn().mockResolvedValue(scope), upsert: vi.fn(async ({ create }) => ({ id: "position-scope", ...create })) },
    stockMovement: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    stockReservation: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), aggregate: vi.fn().mockResolvedValue({ _sum: { remainingQuantity: null } }), count: vi.fn().mockResolvedValue(0), create: vi.fn(async ({ data }) => ({ id: `reservation-${data.semanticKey}`, ...data, status: "ACTIVE", dispatchedQuantity: d(0) })) },
    remitoItem: { findMany: vi.fn().mockResolvedValue([]) },
    cajasStockRecordReference: { create: vi.fn().mockResolvedValue({ id: "record" }) },
    cajasReservationCorrelation: { create: vi.fn() },
    cajasCompositionChange: { create: vi.fn(async ({ data }) => data), findUniqueOrThrow: vi.fn() },
    cajasDifference: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: "difference", assignmentId: "assignment", assignment }) },
    cajasDifferenceResolution: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }) => data), findUniqueOrThrow: vi.fn() },
    cajasControl: { findFirst: vi.fn().mockResolvedValue({ sequence: 2 }), create: vi.fn(async ({ data }) => data), findUniqueOrThrow: vi.fn() },
    cajasDispatchLineAccounting: { count: vi.fn().mockResolvedValue(0) },
  };
  return { db, line, prep, assignment, scope, commands, d };
}
const selection = { physicalUnitId: "unit", expectedVersion: 1, idempotencyKey: "select", cause: "Select component" };
const reservation = { expectedVersion: 1, idempotencyKey: "reserve", cause: "Reserve complete preparation" };

describe("bounded preparation recovery", () => {
  it("selects identified content, appends evidence and invalidates control", async () => {
    const { db } = fixture();
    const result = await selectCajasComponent(db, "company", "line", selection, "actor");
    expect(result.resultingPreparationVersion).toBe(2);
    expect(db.cajasCompositionChange.create.mock.calls[0][0].data.lines.create.priorStockScopeReferenceId).toBe("scope");
    expect(db.cajasPreparation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requiresRecontrol: true, version: { increment: 1 } }) }));
  });
  it.each(["lot", "fungible"])("selects an eligible %s position with captured traceability", async (kind) => {
    const { db, d } = fixture();
    const movement = { id: "movement", articleId: "article", lotCode: kind === "lot" ? "LOT" : null, serialNumber: null, expirationDate: null, location: "shelf", movementType: "RECEIPT_IN", quantity: d(4) };
    db.stockMovement.findFirst.mockResolvedValue(movement);
    db.stockMovement.findMany.mockResolvedValue([movement]);
    const result = await selectCajasComponent(db, "company", "line", { sourceMovementId: "movement", quantity: 2, expectedVersion: 1, idempotencyKey: "position", cause: "Select stock" }, "actor");
    expect(db.cajasCompositionChange.create.mock.calls[0][0].data.lines.create.resultingQuantity.toNumber()).toBe(2);
    expect(db.cajasStockScopeReference.upsert.mock.calls[0][0].create.sourceStockScopeId).toBe(stockPositionKey(movement));
  });
  it("blocks a stale preparation read after acquiring its lock", async () => {
    const { db, line, prep } = fixture();
    db.cajasPreparationLine.findFirstOrThrow.mockResolvedValue({ ...line, preparation: { ...prep, version: 2 } });
    await expect(selectCajasComponent(db, "company", "line", selection, "actor")).rejects.toThrow("actualice");
    expect(db.cajasCompositionChange.create).not.toHaveBeenCalled();
  });
  it("blocks selection of another line's exclusively reserved unit", async () => {
    const { db } = fixture();
    db.stockReservation.findFirst.mockResolvedValue({ preparationLineId: "other" });
    await expect(selectCajasComponent(db, "company", "line", selection, "actor")).rejects.toThrow("reservada");
  });
  it("blocks edits to dispatched content", async () => {
    const { db, line, d } = fixture(); line.dispatchedQuantity = d(1);
    await expect(selectCajasComponent(db, "company", "line", selection, "actor")).rejects.toThrow("despachado");
  });
  it("reserves box and components together and replays the full accepted snapshot after closure", async () => {
    const { db, assignment } = fixture();
    const first = await reserveAssignedBox(db, "company", "assignment", "actor", reservation);
    expect(first).toHaveLength(2);
    assignment.activeSlot = 0;
    const replay = await reserveAssignedBox(db, "company", "assignment", "actor", reservation);
    expect(replay).toEqual(first);
    expect(db.stockReservation.create).toHaveBeenCalledTimes(2);
  });
  it("replays reused reservations, not just new batch members", async () => {
    const { db, d } = fixture();
    db.stockReservation.findMany.mockResolvedValue([{ id: "existing-box", preparationLineId: null, remainingQuantity: d(1) }, { id: "existing-line", preparationLineId: "line", remainingQuantity: d(1) }]);
    const first = await reserveAssignedBox(db, "company", "assignment", "actor", reservation);
    expect(await reserveAssignedBox(db, "company", "assignment", "actor", reservation)).toEqual(first);
    expect(db.stockReservation.create).not.toHaveBeenCalled();
  });
  it("rejects reuse of an accepted key with different intent", async () => {
    const { db } = fixture();
    await reserveAssignedBox(db, "company", "assignment", "actor", reservation);
    await expect(reserveAssignedBox(db, "company", "assignment", "actor", { ...reservation, cause: "Different" })).rejects.toThrow("otro contenido");
  });
  it("rejects capacity exhaustion and exclusive-unit contention", async () => {
    const { db, scope, line } = fixture();
    await expect(reserveCajasComponent(db, "company", "assignment", line, { ...scope, kind: "lot" } as any, "actor", "key")).rejects.toThrow("insuficiente");
    db.stockReservation.findFirst.mockResolvedValue({ id: "contender" });
    await expect(reserveCajasComponent(db, "company", "assignment", line, scope as any, "actor", "key")).rejects.toThrow("reservada");
  });
  it("keeps a rejected individual resolution open and requires recontrol", async () => {
    const { db } = fixture();
    const result = await resolveCajasDifference(db, "company", "difference", { expectedResolutionSequence: 0, idempotencyKey: "reject", closesDifference: false, explanation: "Evidence rejected", supportingReference: "inspection-1", cause: "Review" }, "actor");
    db.cajasDifference.findMany.mockResolvedValue([{ resolutions: [result] }]);
    expect(await openCajasDifferences(db, "company", "assignment")).toHaveLength(1);
    expect(result.sequence).toBe(1);
    expect(db.cajasPreparation.updateMany).toHaveBeenCalled();
  });
  it("requires explicit fresh recontrol and appends immutable history", async () => {
    const { db, prep } = fixture(); prep.latestControlId = "prior";
    await expect(confirmCajasControl(db, "company", "assignment", undefined, "actor", { expectedVersion: 1, idempotencyKey: "control", cause: "Check", kind: "control" })).rejects.toThrow("Recontrolar");
    const result = await confirmCajasControl(db, "company", "assignment", undefined, "actor", { expectedVersion: 1, idempotencyKey: "recontrol", cause: "Fresh check", kind: "recontrol" });
    expect(result).toMatchObject({ result: "clean", sequence: 3, priorControlId: "prior", sourcePreparationVersion: 1 });
    expect(db.cajasControl.create.mock.calls[0][0].data.lines.create).toHaveLength(1);
  });
  it("blocks recontrol with open differences and closure with pending reservations", async () => {
    const { db, prep, line, d } = fixture();
    db.cajasDifference.findMany.mockResolvedValue([{ resolutions: [] }]);
    await expect(confirmCajasControl(db, "company", "assignment", undefined, "actor", { expectedVersion: 1, idempotencyKey: "check", cause: "Check", kind: "recontrol" })).rejects.toThrow("diferencia");
    db.cajasDifference.findMany.mockResolvedValue([]);
    prep.requiresRecontrol = false; prep.latestControl = { result: "clean", sourcePreparationVersion: 1 };
    await expect(endBoxAssignment(db, "company", "assignment", { cause: "Close" }, "actor")).rejects.toThrow("despacho");
    line.dispatchedQuantity = d(1);
    db.stockReservation.count.mockResolvedValue(1);
    await expect(endBoxAssignment(db, "company", "assignment", { cause: "Close" }, "actor")).rejects.toThrow("pendientes");
  });
  it("retries serialization conflicts only at the transaction owner", async () => {
    const run = vi.fn().mockResolvedValue("accepted");
    const tx = { $transaction: vi.fn(() => { throw new Error("Unexpected nested transaction"); }) };
    const db: any = { $connect: vi.fn(), $transaction: vi.fn().mockRejectedValueOnce({ code: "P2034" }).mockImplementation((callback) => callback(tx)) };
    expect(await cajasTransaction(db, run)).toBe("accepted");
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(cajasIntent({ intent: 1 })).not.toBe(cajasIntent({ intent: 2 }));
  });
});
