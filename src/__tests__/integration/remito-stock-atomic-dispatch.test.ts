import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ durable: vi.fn() }));
vi.mock("@/lib/remito-verification/repository", () => ({
  persistRemitoIssuanceVerification: vi.fn(),
  runRemitoIssuanceTransaction: (run: () => Promise<unknown>) => run(),
  runSurgicalRemitoIssuanceTransaction: (run: () => Promise<unknown>, lifecycle: { onAttemptStart?: (attempt: number) => Promise<void> }) => lifecycle.onAttemptStart?.(1).then(run),
}));
vi.mock("@/lib/services/c14/durable-attempt-audit", () => ({
  appendDurableAttemptEvent: mocks.durable,
  deriveDurableEventId: (_id: string, ordinal: number) => `event-${ordinal}`,
  newCorrelationId: () => "0198a000-0000-7000-8000-000000000001",
  newTransactionId: () => "0198a000-0000-7000-8000-000000000002",
}));

import { emitirRemito } from "@/lib/services/remito.service";
import { DURABLE_RECONCILIATION_LEASE_MS, reconcileDurableAttempts } from "@/lib/services/c14/reconcile-durable-attempts";
import { authorize, WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer";

const now = new Date("2026-08-13T12:00:00.000Z");
const contracts = ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"];
const proof = { bundleId: "WCB-06", companyId: "company-1", actorId: "user-1", contractIds: contracts, authorizationProofSha256: "b".repeat(64) };

type State = ReturnType<typeof initialState>;
function initialState(surgical = true) {
  const item = { id: "item-1", itemId: null, sku: "SKU-1", description: "Tornillo", quantity: new Prisma.Decimal(2), unit: "UNIT", boxId: null, presupuestoItemId: null, lotNumber: null, serialNumber: null, expirationDate: null, returnedQuantity: new Prisma.Decimal(0), metadata: null, createdAt: now, updatedAt: now };
  const position = { id: "position-1", articleId: "article-1", identifiedUnitId: null, traceMode: "NONE", stockUnit: "UNIT", quantityScale: 0, lot: null, identifiedUnit: null };
  const prepLine = { id: "prep-line-1", isActive: true, articleId: "article-1", stockPositionId: "position-1", quantity: new Prisma.Decimal(2), stockUnit: "UNIT", scaleSnapshot: 0 };
  const controlLine = { id: "control-line-1", sourcePreparationId: "prep-1", sourcePreparationLineId: prepLine.id, articleId: "article-1", stockPositionId: "position-1", quantity: new Prisma.Decimal(2), stockUnit: "UNIT", scaleSnapshot: 0, skuSnapshot: "SKU-1", descriptionSnapshot: "Tornillo", traceCapture: null };
  const reservation = { id: "reservation-1", position, projection: { status: "ACTIVE", activeQuantity: new Prisma.Decimal(2), version: 1 } };
  return {
    remito: { id: "remito-1", visibleNumber: null as number | null, companyId: "company-1", branchId: "branch-1", issuedBranchId: "branch-1", documentType: "REMITO_SALIDA", surgeryId: surgical ? "surgery-1" : null, origin: "box", salidaReason: surgical ? "cirugia" : "venta", boxId: null, presupuestoId: null, destinatarioContactId: null, destinatarioSnapshot: null, shippingAddressSnapshot: null, transportSnapshot: null, packageCount: null, declaredValue: null, state: "Borrador", issuedAt: null as Date | null, deliveredAt: null, returnedAt: null, createdById: "user-1", updatedById: null, metadata: null, createdAt: now, updatedAt: now, items: [item] },
    assignments: [{ id: "assignment-1", companyId: "company-1", boxIdentifiedUnitId: "box-unit-1", dispatches: [] as unknown[], preparations: [{ id: "prep-1", version: 1, requiresRecontrol: false, lines: [prepLine], latestControl: { id: "control-1", result: "CLEAN", sourcePreparationVersion: 1, lines: [controlLine] }, reservationCorrelations: [{ preparationLineId: prepLine.id, stockPositionId: position.id, quantity: new Prisma.Decimal(2), stockUnit: "UNIT", scaleSnapshot: 0, stockReservation: reservation }] }] }],
    audit: new Map<string, any>(), acceptances: new Map<string, any>(), stock: new Map<string, any>(), stockLines: new Map<string, any>(), reservations: new Map<string, any>(), dispatches: new Map<string, any>(), dispatchLines: new Map<string, any>(), effects: new Map<string, any>(),
  };
}

const clone = <T>(value: T): T => {
  if (value instanceof Prisma.Decimal) return new Prisma.Decimal(value) as T;
  if (value instanceof Date) return new Date(value) as T;
  if (value instanceof Map) return new Map([...value].map(([key, item]) => [key, clone(item)])) as T;
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T;
  return value;
};
function database(seed = initialState(), failAt?: string) {
  let state = seed;
  const fail = (section: string) => { if (section === failAt) throw new Error(`forced:${section}`); };
  const txFor = (s: State) => {
    const create = (section: string, store: Map<string, any>) => vi.fn(async ({ data }: any) => { fail(section); store.set(data.id, data); return data; });
    return {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(async () => [{ next: BigInt(1) }]),
      $queryRawUnsafe: vi.fn(async (sql: string) => sql.includes("transaction_timestamp") ? [{ now }] : [{ id: "anchor" }]),
      $executeRawUnsafe: vi.fn(),
      remito: { findFirst: vi.fn(async ({ where }: any) => s.remito.id === where.id && s.remito.companyId === where.companyId ? s.remito : null), update: vi.fn(async ({ data }: any) => Object.assign(s.remito, data)) },
      cajasAssignment: { findMany: vi.fn(async ({ where }: any) => s.assignments.filter(a => a.companyId === where.companyId && s.remito.surgeryId === where.surgeryId)) },
      auditEvent: { create: vi.fn(async ({ data }: any) => { fail("audit"); const persisted = { ...data, oldValue: null }; s.audit.set(data.id, persisted); return persisted; }), findUnique: vi.fn(async ({ where }: any) => s.audit.get(where.id) ?? null) },
      operationalCommandAcceptance: { create: create("acceptance", s.acceptances), findUnique: vi.fn(async ({ where }: any) => s.acceptances.get(where.id) ?? null) },
      stockEvidence: { create: create("stockEvidenceHeader", s.stock), findUnique: vi.fn(async ({ where }: any) => { const row = s.stock.get(where.id); return row ? { ...row, lines: [...s.stockLines.values()].filter(x => x.evidenceId === row.id) } : null; }) },
      stockEvidenceLine: { create: create("stockEvidenceLines", s.stockLines) },
      stockReservationEvidence: { create: create("reservationEvidence", s.reservations), findUnique: vi.fn(async ({ where }: any) => s.reservations.get(where.id) ?? null) },
      cajasDispatch: { create: create("dispatchHeader", s.dispatches), findUnique: vi.fn(async ({ where }: any) => { const row = s.dispatches.get(where.id); return row ? { ...row, lines: [...s.dispatchLines.values()].filter(x => x.dispatchId === row.id) } : null; }) },
      cajasDispatchLine: { create: create("dispatchLines", s.dispatchLines) },
      operationalCommandEffect: { create: vi.fn(async ({ data }: any) => { fail(data.effectKey === "reservation-application" ? "reservationEffect" : "stockEffect"); s.effects.set(data.id, data); return data; }), findMany: vi.fn(async ({ where }: any) => [...s.effects.values()].filter(x => x.companyId === where.companyId && x.commandAcceptanceId === where.commandAcceptanceId).sort((a, b) => a.effectKey.localeCompare(b.effectKey))) },
    };
  };
  const prisma = {
    remito: { findFirst: vi.fn(async ({ where }: any) => state.remito.id === where.id && state.remito.companyId === where.companyId ? { surgeryId: state.remito.surgeryId } : null) },
    $transaction: vi.fn(async (run: any, options?: unknown) => {
      if (!options) return run({ durableAttemptAuditEvent: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() } });
      const working = clone(state);
      const result = await run(txFor(working));
      state = working;
      return result;
    }),
  };
  return { prisma: prisma as any, get state() { return state; }, txFor };
}

async function emit(db: ReturnType<typeof database>, companyId = "company-1", idempotencyKey = "retry-1") {
  const authorizationProof = companyId === "company-1" ? await authorize({ userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "m1", role: "admin", userId: "user-1", companyId, isActive: true }) } } as never,
    { actorId: "user-1", companyId, bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS }) : proof;
  return emitirRemito({ companyId, remitoId: "remito-1", updatedById: "user-1", prisma: db.prisma, issuanceDependencies: {} as never, idempotencyKey, authorizationProof });
}

describe("Remito–Stock atomic dispatch integration", () => {
  beforeEach(() => { process.env.OSSUM_C14_WCB06_ENABLED = "true"; mocks.durable.mockReset().mockResolvedValue({ eventSha256: "c".repeat(64) }); });

  it("commits the surgical Remito and all seven WCB-06 sections with line bijection and totals", async () => {
    const db = database();
    await expect(emit(db)).resolves.toMatchObject({ state: "Emitido", visibleNumber: 1 });
    expect([db.state.stock.size, db.state.stockLines.size, db.state.reservations.size, db.state.dispatches.size, db.state.dispatchLines.size, db.state.effects.size]).toEqual([1, 1, 1, 1, 1, 2]);
    const stock = [...db.state.stockLines.values()][0], dispatch = [...db.state.dispatchLines.values()][0], reservation = [...db.state.reservations.values()][0];
    expect(dispatch).toMatchObject({ stockEvidenceLineId: stock.id, articleId: stock.articleId, stockPositionId: stock.fromPositionId, quantity: stock.quantity });
    expect(reservation.quantity).toBe(stock.quantity);
  });

  it("consolidates one commercial Article while retaining two physical reservation/evidence/dispatch lines", async () => {
    const seed = initialState();
    const preparation = seed.assignments[0].preparations[0] as any;
    const position = { id: "position-2", articleId: "article-1", identifiedUnitId: null, traceMode: "NONE", stockUnit: "UNIT", quantityScale: 0, lot: null, identifiedUnit: null };
    const prepLine = preparation.lines[0];
    preparation.lines[0].quantity = new Prisma.Decimal(2);
    preparation.latestControl.lines[0].quantity = new Prisma.Decimal(1);
    preparation.latestControl.lines.push({ id: "control-line-2", sourcePreparationId: "prep-1", sourcePreparationLineId: prepLine.id, articleId: "article-1", stockPositionId: position.id, quantity: new Prisma.Decimal(1), stockUnit: "UNIT", scaleSnapshot: 0, skuSnapshot: "SKU-1", descriptionSnapshot: "Tornillo", traceCapture: null });
    preparation.reservationCorrelations[0].quantity = new Prisma.Decimal(1);
    preparation.reservationCorrelations[0].stockReservation.projection.activeQuantity = new Prisma.Decimal(1);
    preparation.reservationCorrelations.push({ preparationLineId: prepLine.id, stockPositionId: position.id, quantity: new Prisma.Decimal(1), stockUnit: "UNIT", scaleSnapshot: 0, stockReservation: { id: "reservation-2", position, projection: { status: "ACTIVE", activeQuantity: new Prisma.Decimal(1), version: 1 } } });
    const db = database(seed);
    await expect(emit(db)).resolves.toMatchObject({ state: "Emitido" });
    expect([db.state.stockLines.size, db.state.reservations.size, db.state.dispatchLines.size, db.state.effects.size]).toEqual([2, 2, 2, 3]);
    expect(new Set([...db.state.dispatchLines.values()].map(line => line.remitoItemId))).toEqual(new Set(["item-1"]));
    expect(new Set([...db.state.stockLines.values()].map(line => line.reservationId))).toEqual(new Set(["reservation-1", "reservation-2"]));
  });

  it("uses immutable control trace after current stock trace mutates", async () => {
    const seed = initialState() as any;
    seed.assignments[0].preparations[0].latestControl.lines[0].traceCapture = { traceMode: "LOT", lotCode: "captured-lot", expirationDate: "2027-01-01" };
    seed.assignments[0].preparations[0].reservationCorrelations[0].stockReservation.position.traceMode = "LOT";
    seed.assignments[0].preparations[0].reservationCorrelations[0].stockReservation.position.lot = { normalizedLotCode: "mutated-lot", primaryObservation: { expirationDate: new Date("2030-01-01") } };
    const db = database(seed); await emit(db);
    expect([...db.state.stockLines.values()][0]).toMatchObject({ lotCodeSnapshot: "captured-lot", expirationDateSnapshot: "2027-01-01" });
  });

  it("keeps captured identified-unit serial and physical position after source mutation", async () => {
    const seed = initialState() as any, allocation = seed.assignments[0].preparations[0].reservationCorrelations[0];
    seed.assignments[0].preparations[0].latestControl.lines[0].traceCapture = { traceMode: "IDENTIFIED_UNIT", identifiedCode: "captured-unit", serialNumber: "captured-serial" };
    allocation.stockReservation.position.traceMode = "IDENTIFIED_UNIT";
    allocation.stockReservation.position.id = "mutated-position";
    allocation.stockReservation.position.identifiedUnit = { currentConfiguration: { internalCode: "mutated-unit", serialNumber: "mutated-serial" } };
    const db = database(seed); await emit(db);
    expect([...db.state.stockLines.values()][0]).toMatchObject({ fromPositionId: "position-1", identifiedCodeSnapshot: "captured-unit", serialNumberSnapshot: "captured-serial" });
  });

  it.each(["stockEvidenceHeader", "stockEvidenceLines", "reservationEvidence", "dispatchHeader", "dispatchLines", "reservationEffect", "stockEffect"])("rolls back Remito and emits no dispatch when %s fails", async section => {
    const db = database(initialState(), section);
    await expect(emit(db)).rejects.toThrow(`forced:${section}`);
    expect(db.state.remito).toMatchObject({ state: "Borrador", visibleNumber: null, issuedAt: null });
    expect([db.state.audit.size, db.state.acceptances.size, db.state.stock.size, db.state.reservations.size, db.state.dispatches.size, db.state.effects.size]).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("rejects stale control and tenant mismatch before any committed emission", async () => {
    const stale = initialState(); stale.assignments[0].preparations[0].requiresRecontrol = true;
    const db = database(stale);
    await expect(emit(db)).rejects.toMatchObject({ code: "remito_dispatch_control_stale", status: 422 });
    await expect(emit(db, "company-2")).rejects.toMatchObject({ code: "remito_not_found", status: 404 });
    expect(db.state.remito.state).toBe("Borrador");
  });

  it("blocks issuance for an open rejected difference and after a composition recontrol invalidation", async () => {
    const rejected = initialState() as any; rejected.assignments[0].differences = [{ resolutions: [{ closesDifference: false }] }];
    await expect(emit(database(rejected))).rejects.toMatchObject({ code: "remito_dispatch_difference_open", status: 422 });
    const changed = initialState(); changed.assignments[0].preparations[0].requiresRecontrol = true;
    await expect(emit(database(changed))).rejects.toMatchObject({ code: "remito_dispatch_control_stale", status: 422 });
  });

  it("replays the public same semantic key without duplicates and rejects changed intent with 409", async () => {
    const db = database();
    await expect(emit(db, "company-1", "same-key")).resolves.toMatchObject({ state: "Emitido" });
    await expect(emit(db, "company-1", "same-key")).resolves.toMatchObject({ state: "Emitido" });
    db.state.remito.items[0].sku = "SKU-CHANGED";
    db.state.assignments[0].preparations[0].latestControl.lines[0].skuSnapshot = "SKU-CHANGED";
    await expect(emit(db, "company-1", "same-key")).rejects.toMatchObject({ code: "C14_INSERT_CONFLICT", status: 409 });
    expect([db.state.acceptances.size, db.state.stock.size, db.state.dispatches.size, db.state.effects.size]).toEqual([1, 1, 1, 2]);
  });

  it("uses the serializable Remito lock as the deterministic no-double-dispatch concurrency guard", async () => {
    const db = database();
    await expect(Promise.all([emit(db, "company-1", "concurrent-key"), emit(db, "company-1", "concurrent-key")])).resolves.toHaveLength(2);
    expect([db.state.acceptances.size, db.state.stock.size, db.state.dispatches.size]).toEqual([1, 1, 1]);
  });

  it("preserves the non-surgical issuance path without WCB-06 writes", async () => {
    const db = database(initialState(false));
    await expect(emit(db)).resolves.toMatchObject({ state: "Emitido" });
    expect([db.state.acceptances.size, db.state.stock.size, db.state.dispatches.size, db.state.effects.size]).toEqual([0, 0, 0, 0]);
    expect(mocks.durable).not.toHaveBeenCalled();
  });

  it("recovers only durable attempts whose fixed 60-second lease expired", async () => {
    const started = { correlationId: "correlation-1", companyId: "company-1", bundleSemanticKeySha256: "a".repeat(64), completePayloadSha256: "b".repeat(64), attemptOrdinal: 1, transactionId: null, anchorSetSha256: null, eventOrdinal: 1, eventKind: "ATTEMPT_STARTED", eventSha256: "c".repeat(64), occurredAt: new Date(now.getTime() - DURABLE_RECONCILIATION_LEASE_MS) };
    const prisma = { durableAttemptAuditEvent: { findMany: vi.fn().mockResolvedValue([started]), findFirst: vi.fn().mockResolvedValue(started) } } as any;
    mocks.durable.mockResolvedValueOnce({ eventOrdinal: 2, eventSha256: "d".repeat(64) }).mockResolvedValueOnce({ eventOrdinal: 3, eventSha256: "e".repeat(64) });
    await expect(reconcileDurableAttempts(prisma, async () => "SUCCESS", now)).resolves.toBe(1);
    expect(prisma.durableAttemptAuditEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ occurredAt: { lte: new Date(now.getTime() - 60_000) } }) }));
    expect(mocks.durable).toHaveBeenNthCalledWith(2, prisma, expect.objectContaining({ eventKind: "SUCCESS_RECOVERED", domainCommitState: "COMMITTED" }));
  });
});
