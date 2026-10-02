import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { confirmCajasControl } from "@/lib/services/cajas-control.service";
import { selectCajasComponent } from "@/lib/services/cajas-component-selection.service";
import { resolveCajasDifference } from "@/lib/services/cajas-difference.service";

// Stateful transaction doubles exercise source paths; no PostgreSQL claim.
function fixture(expected = 2) {
  const d = (n: number) => new Prisma.Decimal(n);
  const formula = { id: "f1", articleReferenceId: "ref", expectedQuantity: d(expected), unit: "u" };
  const prep: any = { id: "prep", assignmentId: "assignment", companyId: "company", formulaVersionId: "formula", formulaVersion: { lines: [formula] }, version: 1, requiresRecontrol: true, latestControlId: null };
  const assignment: any = { id: "assignment", activeSlot: 1, preparation: prep };
  prep.assignment = assignment;
  const line: any = { id: "line", preparationId: "prep", companyId: "company", lineKey: "f1", expectedFormulaLineId: "f1", role: "expected", articleReferenceId: "ref", articleReference: { sourceArticleId: "article", skuSnapshot: "A", descriptionSnapshot: "A" }, quantity: d(1), unit: "u", isActive: true, dispatchedQuantity: d(0), stockScopeReferenceId: "scope-u1", stockScopeReference: { kind: "identifiedUnit", sourceStockScopeId: "u1" }, preparation: prep };
  prep.lines = [line];
  const scopes = new Map<string, any>([[line.stockScopeReferenceId, line.stockScopeReference]]);
  const commands = new Map<string, any>(), changes = new Map<string, any>(), controls = new Map<string, any>();
  const differences: any[] = [], resolutions: any[] = [];
  const db: any = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "assignment" }]),
    company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org" }) },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit" }) },
    cajasCommandAcceptance: {
      findUnique: vi.fn(async ({ where }) => { const k = where.companyId_sourceOperationId_checkpoint_semanticKey; return commands.get(`${k.checkpoint}:${k.semanticKey}`) ?? null; }),
      create: vi.fn(async ({ data }) => { const c = { id: `c${commands.size}`, ...data }; commands.set(`${data.checkpoint}:${data.semanticKey}`, c); return c; }),
    },
    cajasAssignment: { findFirst: vi.fn(async ({ where }) => where.activeSlot === 1 && assignment.activeSlot !== 1 ? null : assignment) },
    cajasPreparation: { update: vi.fn(async ({ data }) => { Object.assign(prep, { ...data, version: data.version ? prep.version + 1 : prep.version }); return prep; }), updateMany: vi.fn() },
    cajasPreparationLine: {
      findFirst: vi.fn(async ({ where }) => prep.lines.find((l: any) => l.id === where.id) ?? null),
      findFirstOrThrow: vi.fn(async ({ where }) => prep.lines.find((l: any) => l.id === where.id)),
      findMany: vi.fn(async ({ where }) => prep.lines.filter((l: any) => (!where.isActive || l.isActive) && (!where.stockScopeReferenceId || l.stockScopeReferenceId === where.stockScopeReferenceId) && (!where.id?.not || l.id !== where.id.not))),
      create: vi.fn(async ({ data }) => { const child = { ...line, ...data, stockScopeReference: scopes.get(data.stockScopeReferenceId), preparation: prep }; prep.lines.push(child); return child; }),
      update: vi.fn(async ({ where, data }) => { const l = prep.lines.find((l: any) => l.id === where.id); Object.assign(l, data, { stockScopeReference: scopes.get(data.stockScopeReferenceId) }); return l; }),
    },
    article: { findFirst: vi.fn().mockResolvedValue({ id: "article", tracePolicies: [] }) },
    stockPhysicalUnit: { findFirst: vi.fn(async ({ where }) => ({ id: where.id, unitCode: where.id, serialNumber: where.id, location: "shelf" })) },
    cajasStockScopeReference: { findUnique: vi.fn(async ({ where }) => { const s = { id: `scope-${where.companyId_sourceStockScopeId.sourceStockScopeId}`, kind: "identifiedUnit", sourceStockScopeId: where.companyId_sourceStockScopeId.sourceStockScopeId }; scopes.set(s.id, s); return s; }), upsert: vi.fn(async ({ create }) => { const s = { id: create.sourceStockScopeId, ...create }; scopes.set(s.id, s); return s; }) },
    stockMovement: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    stockReservation: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    cajasCompositionChange: { create: vi.fn(async ({ data }) => { changes.set(data.id, data); return data; }), findUniqueOrThrow: vi.fn(async ({ where }) => changes.get(where.id)) },
    cajasDifference: { findMany: vi.fn(async () => differences.map((v) => ({ ...v, resolutions: resolutions.filter((r) => r.differenceId === v.id).slice(-1) }))), findFirst: vi.fn(async () => ({ id: "diff", assignmentId: "assignment", assignment })), create: vi.fn(async ({ data }) => { const v = { id: `diff${differences.length}`, ...data }; differences.push(v); return v; }) },
    cajasDifferenceResolution: { findFirst: vi.fn(async () => resolutions.at(-1) ?? null), create: vi.fn(async ({ data }) => { resolutions.push(data); return data; }), findUniqueOrThrow: vi.fn(async ({ where }) => resolutions.find((r) => r.id === where.id)) },
    cajasControl: { findFirst: vi.fn(async () => ({ sequence: controls.size })), create: vi.fn(async ({ data }) => { controls.set(data.id, data); return data; }), findUniqueOrThrow: vi.fn(async ({ where }) => controls.get(where.id)) },
  };
  const control = (key = "check", kind: "control" | "recontrol" = "control") => confirmCajasControl(db, "company", "assignment", undefined, "actor", { idempotencyKey: key, kind, cause: "Check", expectedVersion: prep.version });
  const select = (input: any) => selectCajasComponent(db, "company", "line", { cause: "Select", expectedVersion: prep.version, ...input }, "actor");
  return { db, d, prep, line, assignment, formula, differences, resolutions, control, select };
}

describe("PREPARATION-A source correctness", () => {
  it.each(["shortfall", "removed", "unselected", "missing", "excess", "wrong-unit"])("never certifies %s against immutable formula", async (mode) => {
    const f = fixture();
    if (mode === "removed") f.line.isActive = false;
    if (mode === "unselected") f.line.stockScopeReferenceId = null;
    if (mode === "missing") f.prep.lines = [];
    if (mode === "excess") f.line.quantity = f.d(3);
    if (mode === "wrong-unit") f.line.unit = "kg";
    expect((await f.control()).result).toBe("withDifferences");
    expect(f.differences.length).toBeGreaterThan(0);
    expect(f.prep.requiresRecontrol).toBe(true);
  });
  it("appends two identified units and preserves exact accepted replay", async () => {
    const f = fixture();
    const input = { append: true, physicalUnitId: "u2", quantity: 1, idempotencyKey: "second", expectedVersion: 1 };
    const first: any = await f.select(input);
    expect(f.prep.lines).toHaveLength(2);
    expect(f.line.stockScopeReferenceId).toBe("scope-u1");
    expect(first.lines.create.priorPreparationLineId).toBeNull();
    expect(first.lines.create.resultingPreparationLineId).toBe(f.prep.lines[1].id);
    expect(f.prep.lines[1]).toMatchObject({ expectedFormulaLineId: "f1", quantity: f.d(1), articleReferenceId: "ref", unit: "u" });
    expect(await f.select(input)).toEqual(first);
    expect((await f.control()).result).toBe("clean");
  });
  it.each([1, 2])("splits lots without overwrite with second quantity %s", async (secondQuantity) => {
    const f = fixture(3);
    const movements = ["L1", "L2"].map((lotCode) => ({ id: lotCode, articleId: "article", lotCode, serialNumber: null, expirationDate: null, location: "shelf", movementType: "RECEIPT_IN", quantity: f.d(2) }));
    f.db.stockMovement.findFirst.mockImplementation(async ({ where }: any) => movements.find((m) => m.id === where.id));
    f.db.stockMovement.findMany.mockResolvedValue(movements);
    await f.select({ sourceMovementId: "L1", quantity: 2, idempotencyKey: "lot1" });
    await f.select({ append: true, sourceMovementId: "L2", quantity: secondQuantity, idempotencyKey: "lot2" });
    expect(f.prep.lines).toHaveLength(2);
    expect(f.line.lotNumberSnapshot).toBe("L1");
    expect(f.prep.lines[1].lotNumberSnapshot).toBe("L2");
    expect((await f.control()).result).toBe(secondQuantity === 1 ? "clean" : "withDifferences");
  });
  it("rejects duplicate physical allocations and non-unit physical quantity", async () => {
    const f = fixture();
    await expect(f.select({ append: true, physicalUnitId: "u1", quantity: 1, idempotencyKey: "duplicate" })).rejects.toThrow("seleccionada");
    await expect(f.select({ append: true, physicalUnitId: "u2", quantity: 2, idempotencyKey: "two" })).rejects.toThrow("cantidad 1");
    expect(f.prep.lines).toHaveLength(1);
  });
  it("revalidates sibling lot capacity even before explicit reservation", async () => {
    const f = fixture(3);
    const movement = { id: "L", articleId: "article", lotCode: "L", serialNumber: null, expirationDate: null, location: "shelf", movementType: "RECEIPT_IN", quantity: f.d(2) };
    f.db.stockMovement.findFirst.mockResolvedValue(movement);
    f.db.stockMovement.findMany.mockResolvedValue([movement]);
    await f.select({ sourceMovementId: "L", quantity: 2, idempotencyKey: "first" });
    await expect(f.select({ append: true, sourceMovementId: "L", quantity: 1, idempotencyKey: "overcapacity" })).rejects.toThrow("insuficiente");
    expect(f.prep.lines).toHaveLength(1);
  });
  it("manual closure cannot hide shortfall; corrected composition needs explicit recontrol with history", async () => {
    const f = fixture();
    const first = await f.control();
    f.resolutions.push({ differenceId: f.differences[0].id, closesDifference: true, sequence: 1 });
    expect((await f.control("still-short", "recontrol")).result).toBe("withDifferences");
    await f.select({ append: true, physicalUnitId: "u2", quantity: 1, idempotencyKey: "correct" });
    for (const difference of f.differences) f.resolutions.push({ differenceId: difference.id, closesDifference: true, sequence: 2 });
    await expect(f.control("implicit")).rejects.toThrow("Recontrolar");
    const corrected = await f.control("corrected", "recontrol");
    expect(corrected.result).toBe("clean");
    expect(corrected.priorControlId).not.toBeNull();
    expect(first.result).toBe("withDifferences");
  });
  it("reactivates a removed expected line with composition evidence", async () => {
    const f = fixture(1); f.line.isActive = false;
    await f.select({ physicalUnitId: "u1", quantity: 1, idempotencyKey: "reactivate" });
    expect(f.line.isActive).toBe(true);
    expect(f.db.cajasCompositionChange.create).toHaveBeenCalledOnce();
  });
  it("rejects stale close after reject and replays the accepted reject before freshness", async () => {
    const f = fixture();
    const input: any = { idempotencyKey: "reject", expectedResolutionSequence: 0, closesDifference: false, explanation: "Reject evidence", supportingReference: "inspection", cause: "Review" };
    const first = await resolveCajasDifference(f.db, "company", "diff", input, "actor");
    await expect(resolveCajasDifference(f.db, "company", "diff", { ...input, idempotencyKey: "stale-close", closesDifference: true }, "actor")).rejects.toThrow("cambió");
    expect(await resolveCajasDifference(f.db, "company", "diff", input, "actor")).toEqual(first);
  });
  it("replays accepted control after closure and conflicts on changed payload", async () => {
    const f = fixture(1);
    const first = await f.control(); f.assignment.activeSlot = null;
    expect(await f.control()).toEqual(first);
    await expect(confirmCajasControl(f.db, "company", "assignment", undefined, "actor", { idempotencyKey: "check", kind: "control", cause: "Different", expectedVersion: 1 })).rejects.toThrow("otro contenido");
    await expect(f.control("new")).rejects.toThrow();
  });
  it("exposes return/accounting boundary instead of counting consumed units as initial shortages", async () => {
    const f = fixture(); f.line.dispatchedQuantity = f.d(1);
    await expect(f.control()).rejects.toThrow("retorno");
    expect(f.db.cajasControl.create).not.toHaveBeenCalled();
  });
});
