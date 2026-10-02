// @vitest-environment node
import type { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const FLAG = "OSSUM_RUN_CAJAS_DEV_INTEGRATION";
const REF = "yywqcdromnmmelijvspi";
const enabled = process.env[FLAG] === "true";
type Environment = Record<string, string | undefined>;

function gate(env: Environment) {
  if (env[FLAG] !== "true" || env.OSSUM_DEPLOYMENT_TIER !== "development" ||
      env.NODE_ENV === "production" || [env.VERCEL_ENV, env.APP_ENV].some((v) => v === "production" || v === "staging")) {
    throw new Error("Cajas integration refused: explicit disposable DEV gate required");
  }
  let url: URL;
  try { url = new URL(env.DATABASE_URL ?? ""); } catch {
    throw new Error("Cajas integration refused: invalid DEV target");
  }
  const direct = url.hostname === `db.${REF}.supabase.co` && decodeURIComponent(url.username) === "postgres" && url.port === "5432";
  const pooler = url.hostname === "aws-1-sa-east-1.pooler.supabase.com" && decodeURIComponent(url.username) === `postgres.${REF}` && url.port === "6543";
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.password || url.pathname !== "/postgres" || url.search || url.hash || (!direct && !pooler)) {
    throw new Error("Cajas integration refused: unapproved DEV target");
  }
}

async function gatedImport(env: Environment, importer: () => Promise<unknown>) {
  gate(env);
  return importer();
}

describe("Cajas PostgreSQL gate (no DB imports)", () => {
  it("rejects unset opt-in, staging, production and foreign targets before import", async () => {
    let imports = 0;
    const synthetic = { [FLAG]: "true", OSSUM_DEPLOYMENT_TIER: "development", NODE_ENV: "test",
      DATABASE_URL: `postgresql://postgres:synthetic@db.${REF}.supabase.co:5432/postgres` };
    gate(synthetic);
    for (const env of [
      { ...synthetic, [FLAG]: undefined }, { ...synthetic, NODE_ENV: "production" },
      { ...synthetic, OSSUM_DEPLOYMENT_TIER: "staging" }, { ...synthetic, APP_ENV: "staging" },
      { ...synthetic, DATABASE_URL: "postgresql://synthetic:synthetic@foreign.invalid:5432/postgres" },
    ]) await expect(gatedImport(env, async () => { imports++; })).rejects.toThrow("Cajas integration refused:");
    expect(imports).toBe(0);
  });
});

let db: PrismaClient;
let pool: typeof import("@/lib/prisma")["prismaPool"];
let selection: typeof import("@/lib/services/cajas-component-selection.service");
let reservations: typeof import("@/lib/services/stock-reservation.service");
let assignment: typeof import("@/lib/services/cajas-assignment.service");
let formula: typeof import("@/lib/services/cajas-formula.service");
let physical: typeof import("@/lib/services/stock-physical-unit.service");
let ledger: typeof import("@/lib/services/stock-ledger.service");
let validators: typeof import("@/lib/validators/cajas-assignment");
const owned: Array<{ companyId: string; organizationId: string; userId: string; patientId: string }> = [];

async function fixture(label: string, location?: string) {
  const prefix = `it-cajas-${label}-${randomUUID()}`;
  const ids = { companyId: `${prefix}-company`, organizationId: `${prefix}-org`, userId: `${prefix}-user`, patientId: `${prefix}-patient` };
  await db.$transaction(async (tx) => {
    await tx.organization.create({ data: { id: ids.organizationId, slug: prefix, name: prefix } });
    await tx.company.create({ data: { id: ids.companyId, organizationId: ids.organizationId, name: prefix } });
    await tx.user.create({ data: { id: ids.userId, email: `${prefix}@ossum.test`, firstName: "Synthetic", lastName: "QA", supabaseAuthId: `${prefix}-local-only` } });
    await tx.contact.create({ data: { id: ids.patientId, firstName: "Synthetic QA patient" } });
  }, { maxWait: 15000, timeout: 30000 });
  owned.push(ids);
  const box = await db.article.create({ data: { organizationId: ids.organizationId, sku: `${prefix}-box`, description: "Synthetic physical box", articleType: "Caja" } });
  const component = await db.article.create({ data: { organizationId: ids.organizationId, sku: `${prefix}-component`, description: "Synthetic fungible component" } });
  await db.stockArticleEligibility.createMany({ data: [box, component].map((a) => ({ companyId: ids.companyId, organizationId: ids.organizationId, articleId: a.id, version: 1 })) });
  const formulaValidator = await import("@/lib/validators/cajas-formula");
  await formula.createBoxFormula(db, ids.companyId, formulaValidator.cajasFormulaCreateSchema.parse({ articleId: box.id,
    lines: [{ articleId: component.id, expectedQuantity: 1, unit: "u" }], cause: "Synthetic QA formula" }), ids.userId);
  const movement = await ledger.recordStockMovement(db, { companyId: ids.companyId, articleId: component.id,
    movementType: "RECEIPT_IN", quantity: 1, location, idempotencyKey: `${prefix}-credit`, createdById: ids.userId });
  const unitsValidator = await import("@/lib/validators/stock-physical-unit");
  const assignments: any[] = [];
  for (let n = 0; n < 2; n++) {
    const surgery = await db.surgery.create({ data: { companyId: ids.companyId, patientId: ids.patientId, visibleNumber: `${prefix}-${n}`, cxStatus: "pending" } });
    const unit = await physical.createStockPhysicalUnit(db, ids.companyId, unitsValidator.stockPhysicalUnitCreateSchema.parse({ articleId: box.id, unitCode: `${prefix}-${n}` }), ids.userId);
    const a = await assignment.assignBoxToSurgery(db, ids.companyId, surgery.id,
      validators.cajasAssignmentCreateSchema.parse({ physicalUnitId: unit.id, idempotencyKey: `${prefix}-assign-${n}` }), ids.userId);
    if (!a.preparation || a.preparation.lines.length !== 1) throw new Error("Fixture requires one real formula-derived line");
    expect(a.preparation.lines[0].quantity).toBe(1);
    await selection.selectCajasComponent(db, ids.companyId, a.preparation.lines[0].id,
      validators.cajasComponentSelectionSchema.parse({ sourceMovementId: movement.id, quantity: 1,
        expectedVersion: a.preparation.version, idempotencyKey: `${prefix}-select-${n}`, cause: "Synthetic QA selection" }), ids.userId);
    assignments.push(await assignment.getBoxAssignment(db, ids.companyId, a.id));
  }
  return { ...ids, assignments, movement, prefix };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
function intent(f: Fixture, index: number) {
  return validators.cajasReservationSchema.parse({ idempotencyKey: `${f.prefix}-reserve-${index}`,
    expectedVersion: f.assignments[index].preparation!.version, cause: "Synthetic QA incorporation" });
}
async function state(companyId: string) {
  const where = { companyId };
  return {
    reservations: await db.stockReservation.findMany({ where, orderBy: { id: "asc" } }),
    correlations: await db.cajasReservationCorrelation.findMany({ where, orderBy: { id: "asc" } }),
    records: await db.cajasStockRecordReference.findMany({ where, orderBy: { id: "asc" } }),
    commands: await db.cajasCommandAcceptance.findMany({ where, orderBy: { id: "asc" } }),
    audits: await db.auditEvent.findMany({ where, orderBy: { id: "asc" } }),
    lines: await db.cajasPreparationLine.findMany({ where, orderBy: { id: "asc" } }),
    preparations: await db.cajasPreparation.findMany({ where, orderBy: { id: "asc" } }),
    scopes: await db.cajasStockScopeReference.findMany({ where, orderBy: { id: "asc" } }),
    changes: await db.cajasCompositionChange.findMany({ where, orderBy: { id: "asc" } }),
  };
}

async function cleanup() {
  for (const ids of owned) await db.$transaction(async (tx) => {
    // Only descendants of successfully created, random synthetic tenant IDs.
    const where = { companyId: ids.companyId };
    await tx.cajasCommandEffect.deleteMany({ where });
    await tx.cajasDispatchLineAccounting.deleteMany({ where });
    await tx.cajasDispatchLine.deleteMany({ where });
    await tx.cajasDispatchAccounting.deleteMany({ where });
    await tx.cajasDispatch.deleteMany({ where });
    await tx.cajasPreparation.updateMany({ where, data: { latestControlId: null } });
    await tx.cajasDifference.deleteMany({ where });
    await tx.cajasControlLine.deleteMany({ where });
    await tx.cajasControl.deleteMany({ where });
    await tx.cajasReservationCorrelation.deleteMany({ where });
    await tx.cajasStockRecordReference.deleteMany({ where });
    await tx.stockReservation.deleteMany({ where });
    await tx.cajasPreparation.updateMany({ where, data: { lastAcceptedChangeId: null } });
    await tx.cajasCompositionChangeLine.deleteMany({ where });
    await tx.cajasCompositionChange.deleteMany({ where });
    await tx.cajasPreparationLine.deleteMany({ where });
    await tx.cajasPreparation.deleteMany({ where });
    await tx.cajasAssignment.deleteMany({ where });
    await tx.cajasFormulaCurrent.deleteMany({ where });
    await tx.cajasFormulaLine.deleteMany({ where });
    await tx.cajasFormulaVersion.deleteMany({ where });
    await tx.cajasBoxFormula.deleteMany({ where });
    await tx.cajasStockScopeReference.deleteMany({ where });
    await tx.cajasArticleReference.deleteMany({ where });
    await tx.cajasCommandAcceptance.deleteMany({ where });
    await tx.auditEvent.deleteMany({ where });
    await tx.stockMovement.deleteMany({ where });
    await tx.remitoItem.deleteMany({ where: { remito: where } });
    await tx.remito.deleteMany({ where });
    await tx.internalNotification.deleteMany({ where });
    await tx.branch.deleteMany({ where });
    await tx.stockPhysicalUnit.deleteMany({ where });
    await tx.stockArticleEligibility.deleteMany({ where });
    await tx.article.deleteMany({ where: { organizationId: ids.organizationId } });
    await tx.surgery.deleteMany({ where });
    await tx.contact.delete({ where: { id: ids.patientId } });
    await tx.user.delete({ where: { id: ids.userId } });
    await tx.company.delete({ where: { id: ids.companyId } });
    await tx.organization.delete({ where: { id: ids.organizationId } });
  }, { maxWait: 15000, timeout: 30000 });
}

(enabled ? describe.sequential : describe.skip)("Cajas preparation actual PostgreSQL transactions", () => {
  beforeAll(async () => {
    // Reject deployment tier before loading config; validate target before Prisma/domain imports.
    if (process.env.OSSUM_DEPLOYMENT_TIER !== "development" || process.env.NODE_ENV === "production" ||
        [process.env.APP_ENV, process.env.VERCEL_ENV].some((v) => v === "production" || v === "staging")) {
      throw new Error("Cajas integration refused: explicit disposable DEV gate required");
    }
    const { config } = await import("dotenv");
    config({ path: ".env.local", override: false, quiet: true });
    config({ path: ".env", override: false, quiet: true });
    await gatedImport(process.env, async () => {
      const runtime = await import("@/lib/prisma");
      db = runtime.default;
      pool = runtime.prismaPool;
      selection = await import("@/lib/services/cajas-component-selection.service");
      reservations = await import("@/lib/services/stock-reservation.service");
      assignment = await import("@/lib/services/cajas-assignment.service");
      formula = await import("@/lib/services/cajas-formula.service");
      physical = await import("@/lib/services/stock-physical-unit.service");
      ledger = await import("@/lib/services/stock-ledger.service");
      validators = await import("@/lib/validators/cajas-assignment");
    });
  }, 60000);
  afterAll(async () => {
    if (!db) return;
    try { await cleanup(); } finally {
      try { await db.$disconnect(); } finally { await pool.end(); }
    }
  }, 120000);

  it("concurrent distinct assignments cannot oversell one fungible component or partially reserve the losing box", async () => {
    const f = await fixture("concurrency");
    const before = await state(f.companyId);
    const results = await Promise.allSettled(f.assignments.map((a, i) => reservations.reserveAssignedBox(db, f.companyId, a.id, f.userId, intent(f, i))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const loser = results.findIndex((r) => r.status === "rejected");
    expect(results[loser]).toMatchObject({ status: "rejected", reason: { code: "cajas_insufficient_stock" } });
    const after = await state(f.companyId);
    expect(after.reservations).toHaveLength(2);
    expect(after.reservations.filter((r) => r.assignmentId === f.assignments[loser].id)).toEqual([]);
    expect(after.reservations.filter((r) => !r.preparationLineId)).toHaveLength(1);
    expect(after.reservations.filter((r) => r.preparationLineId)).toHaveLength(1);
    expect(after.reservations.every((r) => r.status === "ACTIVE" && Number(r.remainingQuantity) === 1)).toBe(true);
    expect(after.correlations).toHaveLength(2);
    expect(after.records).toHaveLength(2);
    expect(after.commands).toHaveLength(before.commands.length + 1);
    expect(after.audits).toHaveLength(before.audits.length + 3);
    expect(after.commands.filter((c) => c.semanticKey === intent(f, loser).idempotencyKey)).toEqual([]);
    const eligible = await selection.eligibleCajasComponents(db, f.companyId, f.assignments[loser].preparation!.lines[0].id);
    expect(eligible.positions).toEqual([]);
  }, 60000);

  it("foreign existing IDs behave like missing IDs with no tenant disclosure or persisted effect", async () => {
    const local = await fixture("local");
    const foreign = await fixture("foreign");
    const beforeLocal = await state(local.companyId), beforeForeign = await state(foreign.companyId);
    for (const id of [foreign.assignments[0].preparation!.lines[0].id, `missing-${randomUUID()}`]) {
      await expect(selection.eligibleCajasComponents(db, local.companyId, id)).rejects.toMatchObject({ status: 404, code: "preparation_line_not_found" });
      await expect(selection.selectCajasComponent(db, local.companyId, id, validators.cajasComponentSelectionSchema.parse({ sourceMovementId: local.movement.id, quantity: 1,
        expectedVersion: 2, idempotencyKey: `${local.prefix}-foreign-select`, cause: "Synthetic tenant mismatch" }), local.userId)).rejects.toMatchObject({ status: 404, code: "preparation_line_not_found" });
    }
    for (const id of [foreign.assignments[0].id, `missing-${randomUUID()}`]) {
      await expect(reservations.reserveAssignedBox(db, local.companyId, id, local.userId, intent(local, 0))).rejects.toMatchObject({ status: 404, code: "assignment_not_found" });
    }
    expect(await state(local.companyId)).toEqual(beforeLocal);
    expect(await state(foreign.companyId)).toEqual(beforeForeign);
  }, 60000);

  it("a last acceptance write failure rolls back real reservations, correlations and audits; retry succeeds", async () => {
    const f = await fixture("rollback");
    const before = await state(f.companyId);
    let intercepted = false;
    await expect(db.$transaction(async (tx) => {
      const proxy = new Proxy(tx, { get(target, key) {
        if (key === "cajasCommandAcceptance") return new Proxy(target.cajasCommandAcceptance, { get(delegate, operation) {
          if (operation === "create") return async () => {
            expect(await tx.stockReservation.count({ where: { companyId: f.companyId } })).toBe(2);
            expect(await tx.cajasReservationCorrelation.count({ where: { companyId: f.companyId } })).toBe(2);
            expect(await tx.auditEvent.count({ where: { companyId: f.companyId } })).toBe(before.audits.length + 3);
            intercepted = true;
            throw new Error("Synthetic last acceptance failure");
          };
          const value = Reflect.get(delegate, operation);
          return typeof value === "function" ? value.bind(delegate) : value;
        } });
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      } });
      return reservations.reserveAssignedBox(proxy as Prisma.TransactionClient, f.companyId, f.assignments[0].id, f.userId, intent(f, 0));
    }, { isolationLevel: "Serializable", maxWait: 15000, timeout: 30000 })).rejects.toThrow("Synthetic last acceptance failure");
    expect(intercepted).toBe(true);
    expect(await state(f.companyId)).toEqual(before);
    await reservations.reserveAssignedBox(db, f.companyId, f.assignments[0].id, f.userId, intent(f, 0));
    expect((await state(f.companyId)).reservations).toHaveLength(2);
  }, 60000);

  it("same key and intent replay the accepted result; changed payload conflicts without extra writes", async () => {
    const f = await fixture("replay");
    const input = intent(f, 0);
    const first = await reservations.reserveAssignedBox(db, f.companyId, f.assignments[0].id, f.userId, input);
    const accepted = await state(f.companyId);
    expect(await reservations.reserveAssignedBox(db, f.companyId, f.assignments[0].id, f.userId, input)).toEqual(first);
    expect(await state(f.companyId)).toEqual(accepted);
    await expect(reservations.reserveAssignedBox(db, f.companyId, f.assignments[0].id, f.userId,
      validators.cajasReservationSchema.parse({ ...input, cause: "Different synthetic intent" }))).rejects.toMatchObject({ status: 409, code: "cajas_idempotency_conflict" });
    expect(await state(f.companyId)).toEqual(accepted);
  }, 60000);

  it("real control and Remito owner dispatch preserve nondefault stock position and partial balances on exact retry", async () => {
    const f = await fixture("dispatch", "qa-nondefault-shelf");
    const a = f.assignments[0], line = a.preparation!.lines[0];
    await reservations.reserveAssignedBox(db, f.companyId, a.id, f.userId, intent(f, 0));
    const { confirmCajasControl } = await import("@/lib/services/cajas-control.service");
    const control = await confirmCajasControl(db, f.companyId, a.id, "Synthetic control", f.userId);
    expect(control.result).toBe("clean");
    expect(control.lines[0].companyId).toBe(f.companyId);
    expect(control.lines[0].traceabilitySnapshot).toEqual(line.traceabilitySnapshot);
    const branch = await db.branch.create({ data: { id: `${f.prefix}-0001`, companyId: f.companyId, name: "0001" } });
    const { createRemito, emitirRemito } = await import("@/lib/services/remito.service");
    const draft = await createRemito({ prisma: db, companyId: f.companyId, branchId: branch.id, surgeryId: a.surgeryId, origin: "box", salidaReason: "cirugia", createdById: f.userId, metadata: { cajas: { assignmentId: a.id } }, items: [{ itemId: f.movement.articleId, description: "Synthetic component", quantity: 0.5, unit: "u" }] });
    const input: Parameters<typeof emitirRemito>[0] = { prisma: db, companyId: f.companyId, remitoId: draft.id, updatedById: f.userId, cajasDispatch: { assignmentId: a.id, expectedVersion: a.preparation!.version, idempotencyKey: `${f.prefix}-dispatch`, lines: [{ preparationLineId: line.id, remitoItemId: draft.items[0].id, quantity: 0.5 }] } };
    const emitted = await emitirRemito(input);
    expect(emitted.state).toBe("Emitido");
    const where = { companyId: f.companyId };
    expect(await db.cajasDispatch.count({ where })).toBe(1);
    const effects = await db.stockMovement.findMany({ where: { ...where, movementType: "DISPATCH_OUT" } });
    expect(effects).toHaveLength(1);
    expect(Number(effects[0].quantity)).toBe(0.5);
    expect(ledger.calculateMovementDelta("DISPATCH_OUT", effects[0].quantity)).toBe(-0.5);
    expect(effects[0].location).toBe("qa-nondefault-shelf");
    const dispatched = await db.cajasDispatchLine.findFirstOrThrow({ where });
    expect(dispatched.traceabilitySnapshot).toMatchObject(line.traceabilitySnapshot);
    expect(Number((await db.cajasDispatchLineAccounting.findFirstOrThrow({ where })).pendingQuantity)).toBe(0.5);
    expect(Number((await db.stockReservation.findFirstOrThrow({ where: { ...where, preparationLineId: line.id } })).remainingQuantity)).toBe(0.5);
    const accepted = await state(f.companyId);
    expect((await emitirRemito(input)).state).toBe("Emitido");
    expect(await state(f.companyId)).toEqual(accepted);
    expect(await db.cajasDispatch.count({ where })).toBe(1);
    expect(await db.stockMovement.count({ where: { ...where, movementType: "DISPATCH_OUT" } })).toBe(1);
  }, 60000);
});
