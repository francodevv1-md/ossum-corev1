import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { emitirRemito } from "@/lib/services/remito.service";
import { remitoEmitSchema } from "@/lib/validators/remito";

vi.mock("@/lib/services/internal-notifications.service", () => ({ emitCrossDomainNotification: vi.fn().mockResolvedValue(undefined) }));
const d = (n: number) => new Prisma.Decimal(n);
const intent = { assignmentId: "assignment", expectedVersion: 1, idempotencyKey: "dispatch-1", lines: [{ preparationLineId: "line", remitoItemId: "item", quantity: 2 }] };

// In-memory transaction double exercises the real owner, dispatch, command,
// audit and ledger services. It is NOT PostgreSQL rollback/concurrency proof.
function fixture() {
  const evidence = { id: "control-line", sourcePreparationLineId: "line", articleReferenceId: "ref", stockScopeReferenceId: "scope", quantity: d(5), unit: "u", skuSnapshot: "sku", descriptionSnapshot: "Component", lotNumberSnapshot: null, serialNumberSnapshot: null, expirationDateSnapshot: null, traceabilitySnapshot: { location: "A" } };
  const line = { ...evidence, id: "line", articleReference: { sourceArticleId: "article" }, isActive: true, dispatchedQuantity: d(0) };
  const prep = { version: 1, requiresRecontrol: false, latestControl: { id: "control", sourcePreparationVersion: 1, result: "clean", lines: [evidence] }, lines: [line] };
  const assignment = { id: "assignment", surgeryId: "surgery", activeSlot: 1, boxStockScopeReferenceId: "box-scope", preparation: prep };
  let remito: any = { id: "remito", companyId: "company", surgeryId: "surgery", state: "Borrador", branchId: "branch", issuedBranchId: "branch", documentType: "REMITO_SALIDA", salidaReason: "cirugia", visibleNumber: null, metadata: null, items: [{ id: "item", itemId: "article", unit: "u", quantity: d(2), description: "Component", lotNumber: null, serialNumber: null, expirationDate: null }] };
  let commands: any[] = [];
  let dispatches: any[] = [];
  let movements: any[] = [{ id: "receipt", articleId: "article", quantity: d(5), movementType: "RECEIPT_IN", lotCode: null, serialNumber: null, expirationDate: null, location: "A" }];
  const reservation = { id: "reservation", articleId: "article", preparationLineId: "line", stockScopeReferenceId: "scope", activeSlot: 1, remainingQuantity: d(5), dispatchedQuantity: d(0) };
  const reservations = [{ ...reservation, id: "box-reservation", preparationLineId: null, stockScopeReferenceId: "box-scope", remainingQuantity: d(1) }, reservation];
  const create = () => vi.fn(async ({ data }: any) => ({ id: "generated", ...data }));
  const tx: any = {
    $queryRaw: vi.fn(async (sql: TemplateStringsArray) => sql.join("").includes("MAX") ? [{ next: 1 }] : [{ id: "locked" }]),
    $executeRaw: vi.fn(),
    remito: { findFirst: vi.fn(async () => remito), update: vi.fn(async ({ data }: any) => (remito = { ...remito, ...data })) },
    cajasAssignment: { findFirst: vi.fn(async () => assignment.activeSlot === 1 ? assignment : null) },
    cajasCommandAcceptance: { findUnique: vi.fn(async ({ where }: any) => commands.find((c) => c.semanticKey === where.companyId_sourceOperationId_checkpoint_semanticKey.semanticKey) ?? null), create: vi.fn(async ({ data }: any) => { const c = { id: "command", ...data }; commands.push(c); return c; }) },
    cajasDispatch: { findFirst: vi.fn(async ({ where }: any) => dispatches.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null), findFirstOrThrow: vi.fn(async ({ where }: any) => { const result = dispatches.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)); if (!result) throw Error("dispatch missing"); return result; }), create: vi.fn(async ({ data }: any) => { dispatches.push(data); return data; }) },
    cajasDifference: { findMany: vi.fn(async () => []) },
    stockReservation: { findMany: vi.fn(async () => reservations), update: vi.fn(async ({ data }: any) => { reservation.remainingQuantity = reservation.remainingQuantity.minus(data.remainingQuantity.decrement); reservation.dispatchedQuantity = reservation.dispatchedQuantity.plus(data.dispatchedQuantity.increment); return reservation; }) },
    stockMovement: { findMany: vi.fn(async () => movements), upsert: vi.fn(async ({ create }: any) => { const movement = { id: "movement", ...create }; movements.push(movement); return movement; }) },
    cajasPreparationLine: { update: vi.fn(async ({ data }: any) => { line.dispatchedQuantity = line.dispatchedQuantity.plus(data.dispatchedQuantity.increment); return line; }) },
    auditEvent: { create: create() }, cajasDispatchAccounting: { create: create() }, cajasStockRecordReference: { create: create() }, cajasDispatchLine: { create: create() }, cajasDispatchLineAccounting: { create: create() }, cajasCommandEffect: { create: create() },
  };
  const prisma: any = { $transaction: vi.fn(async (run: any) => {
    const snapshot = { remito, commands: [...commands], dispatches: [...dispatches], movements: [...movements], remaining: reservation.remainingQuantity, dispatched: reservation.dispatchedQuantity, lineDispatched: line.dispatchedQuantity };
    try { return await run(tx); } catch (error) { remito = snapshot.remito; commands = snapshot.commands; dispatches = snapshot.dispatches; movements = snapshot.movements; reservation.remainingQuantity = snapshot.remaining; reservation.dispatchedQuantity = snapshot.dispatched; line.dispatchedQuantity = snapshot.lineDispatched; throw error; }
  }) };
  const emit = (cajasDispatch: any = intent, remitoId = "remito") => emitirRemito({ companyId: "company", remitoId, updatedById: "actor", cajasDispatch, prisma });
  return { tx, prisma, emit, prep, line, evidence, assignment, reservation, reservations, get remito() { return remito; }, get commands() { return commands; }, get dispatches() { return dispatches; }, get movements() { return movements; } };
}

describe("Cajas dispatch behind actual emitirRemito", () => {
  it("accepts partial dispatch, same tx immutable effects and pending accounting; retains remainder", async () => {
    const f = fixture(); const result = await f.emit();
    expect(result).toMatchObject({ state: "Emitido", visibleNumber: 1, cajasDispatch: { remitoId: "remito", sourceControlId: "control" } });
    expect(f.reservation.remainingQuantity.eq(3)).toBe(true);
    expect(f.reservations[0].remainingQuantity.eq(1)).toBe(true);
    expect(f.tx.cajasDispatchLineAccounting.create).toHaveBeenCalledWith({ data: expect.objectContaining({ pendingQuantity: d(2) }) });
    expect(f.tx.cajasDispatchLine.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sourceControlLineId: "control-line", traceabilitySnapshot: { location: "A", reservationId: "reservation" } }) });
    expect(f.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(f.tx.auditEvent.create.mock.calls.map(([a]: any) => a.data.action)).toEqual(["cajas.dispatch", "remito.issued"]);
  });
  it("returns same acceptance on exact replay without another number or stock effect, even after closure", async () => {
    const f = fixture(); const first = await f.emit(); f.assignment.activeSlot = null as any;
    const replay = await f.emit(); expect(replay).toEqual(first);
    expect(f.tx.remito.update).toHaveBeenCalledTimes(1); expect(f.tx.$executeRaw).toHaveBeenCalledTimes(1); expect(f.tx.stockMovement.upsert).toHaveBeenCalledTimes(1);
  });
  it.each(["missing", "stale", "recontrol"])("rejects %s control and propagates owner transaction rejection", async (kind) => {
    const f = fixture();
    if (kind === "missing") f.prep.latestControl = null as any;
    if (kind === "stale") f.prep.latestControl.sourcePreparationVersion = 0;
    if (kind === "recontrol") f.prep.requiresRecontrol = true;
    await expect(f.emit()).rejects.toMatchObject({ code: "cajas_dispatch_control_required" });
    expect(f.remito.state).toBe("Borrador"); expect(f.remito.visibleNumber).toBeNull(); expect(f.commands).toHaveLength(0); expect(f.movements).toHaveLength(1);
  });
  it("rejects changed payload or owning Remito on the same semantic key", async () => {
    const f = fixture(); await f.emit();
    await expect(f.emit({ ...intent, lines: [{ ...intent.lines[0], quantity: 1 }] })).rejects.toMatchObject({ code: "cajas_idempotency_conflict" });
    f.tx.remito.findFirst.mockResolvedValue({ ...f.remito, id: "other", state: "Borrador" });
    f.tx.remito.update.mockResolvedValue({ ...f.remito, id: "other", state: "Emitido" });
    await expect(f.emit(intent, "other")).rejects.toMatchObject({ code: "cajas_idempotency_conflict" });
    expect(f.tx.stockMovement.upsert).toHaveBeenCalledTimes(1);
  });
  it.each(["duplicate", "overdispatch", "trace", "stock", "reservation", "inactive", "differences"])("rejects %s with no accepted effects", async (kind) => {
    const f = fixture(); let request: any = intent;
    if (kind === "duplicate") request = { ...intent, lines: [intent.lines[0], intent.lines[0]] };
    if (kind === "overdispatch") request = { ...intent, lines: [{ ...intent.lines[0], quantity: 6 }] };
    if (kind === "trace") f.evidence.lotNumberSnapshot = "different" as any;
    if (kind === "stock") f.tx.stockMovement.findMany.mockResolvedValue([]);
    if (kind === "reservation") f.reservations[0].stockScopeReferenceId = "wrong";
    if (kind === "inactive") f.assignment.activeSlot = null as any;
    if (kind === "differences") f.tx.cajasDifference.findMany.mockResolvedValue([{ resolutions: [] }]);
    await expect(f.emit(request)).rejects.toBeDefined(); expect(f.dispatches).toHaveLength(0); expect(f.commands).toHaveLength(0); expect(f.remito.visibleNumber).toBeNull();
  });
  it("rejects linked Remito without intent and preserves legacy soft-box generic issuance", async () => {
    const f = fixture(); f.remito.metadata = { cajas: { assignmentId: "assignment" } };
    await expect(emitirRemito({ companyId: "company", remitoId: "remito", updatedById: "actor", prisma: f.prisma })).rejects.toMatchObject({ code: "cajas_dispatch_intent_required" });
    f.remito.metadata = null; f.remito.boxId = "legacy-soft-box";
    const result = await emitirRemito({ companyId: "company", remitoId: "remito", updatedById: "actor", prisma: f.prisma });
    expect(result.state).toBe("Emitido"); expect(f.tx.cajasAssignment.findFirst).not.toHaveBeenCalled();
  });
  it("validates the optional API intent and rejects unexpected fields", () => {
    expect(remitoEmitSchema.parse({ cajasDispatch: intent })).toEqual({ cajasDispatch: intent });
    expect(remitoEmitSchema.safeParse({ cajasDispatch: { ...intent, expectedVersion: 0 } }).success).toBe(false);
    expect(remitoEmitSchema.safeParse({ other: true }).success).toBe(false);
  });
});
