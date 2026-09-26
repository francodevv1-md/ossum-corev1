import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { canPerformStockOperations, STOCK_OPERATION_ROLES } from "@/lib/permissions/stock-operations-policy";
import { appendCajasUnitLogEntry, assignAndPrepareCajas, getSurgeryCajas } from "@/lib/services/cajas-assignment-preparation.service";
import { reservePreparation } from "@/lib/services/preparation.service";

const formulaLine = {
  id: "formula-line-1",
  companyId: "company-1",
  formulaVersionId: "formula-version-1",
  lineNumber: 1,
  articleId: "component-1",
  expectedQuantity: new Prisma.Decimal("2.5"),
  stockUnit: "u",
  scaleSnapshot: 1,
  skuSnapshot: "COMP-1",
  descriptionSnapshot: "Componente uno",
  createdAt: new Date("2026-08-25T10:00:00Z"),
};

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: "unit-1",
    companyId: "company-1",
    articleId: "box-article-1",
    createdAt: new Date("2026-08-25T10:00:00Z"),
    currentConfiguration: { internalCode: "BOX-001", serialNumber: "SER-001" },
    eligibility: {
      article: { sku: "BOX-DEMO", description: "Caja demo", articleType: "Caja", isActive: true },
      cajasBoxFormulas: [{ currentVersion: { id: "formula-version-1", versionNumber: 3, lines: [formulaLine] } }],
    },
    stockPositions: [{
      id: "position-1",
      positionProjection: { availableQuantity: new Prisma.Decimal(1) },
      reservations: [],
    }],
    cajasAssignments: [],
    ...overrides,
  };
}

function assignmentRecord(id = "assignment-1") {
  return {
    id,
    surgeryId: "surgery-1",
    boxArticleId: "box-article-1",
    boxIdentifiedUnitId: "unit-1",
    activeSlot: 1,
    assignedAt: new Date("2026-08-25T10:00:00Z"),
    endedAt: null,
    boxIdentifiedUnit: {
      currentConfiguration: { internalCode: "BOX-001", serialNumber: "SER-001" },
      eligibility: { article: { sku: "BOX-DEMO", description: "Caja demo" } },
    },
    preparations: [{
      id: "preparation-1",
      formulaVersionId: "formula-version-1",
      formulaVersion: { versionNumber: 3 },
      version: 1,
      requiresRecontrol: false,
      createdAt: new Date("2026-08-25T10:00:00Z"),
      lines: [{
        id: "preparation-line-1",
        lineKey: "expected:0001:formula-line-1",
        expectedFormulaLineId: "formula-line-1",
        expectedFormulaLine: formulaLine,
        articleId: "component-1",
        quantity: new Prisma.Decimal("2.5"),
        stockUnit: "u",
        scaleSnapshot: 1,
      }],
    }],
    unitLogEntries: [],
  };
}

function writableDb() {
  const tx = {
    operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "command-1" }) },
    surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1", cxStatus: "pending", archivedAt: null }) },
    stockIdentifiedUnit: { findFirst: vi.fn().mockResolvedValue(candidate()) },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    cajasAssignment: { create: vi.fn().mockResolvedValue({}), findFirst: vi.fn().mockResolvedValue(assignmentRecord()) },
    cajasPreparation: { create: vi.fn().mockResolvedValue({}) },
    cajasPreparationLine: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    $queryRaw: vi.fn().mockResolvedValue([{ id: "unit-1" }]),
  };
  const db = {
    ...tx,
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  return { db, tx };
}

describe("cajas-assignment-preparation.service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the shared Stock operation policy limited to the existing roles", () => {
    expect(STOCK_OPERATION_ROLES).toEqual(["admin", "operator"]);
    expect(canPerformStockOperations("admin")).toBe(true);
    expect(canPerformStockOperations("operator")).toBe(true);
    expect(canPerformStockOperations("coordinator")).toBe(false);
    expect(canPerformStockOperations("viewer")).toBe(false);
  });

  it("returns company-scoped assignments and every identified Box with an explicit availability reason", async () => {
    const unavailable = candidate({
      id: "unit-2",
      cajasAssignments: [{ surgery: { id: "other-surgery", visibleNumber: "CX-2" } }],
    });
    const db = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1", visibleNumber: "CX-1", cxStatus: "pending", archivedAt: null }) },
      cajasAssignment: { findMany: vi.fn().mockResolvedValue([]) },
      stockIdentifiedUnit: { findMany: vi.fn().mockResolvedValue([candidate(), unavailable]) },
    };

    const result = await getSurgeryCajas(db as never, "company-1", "surgery-1");

    expect(result.candidates.map((item) => item.availability)).toEqual([
      expect.objectContaining({ available: true, code: "available" }),
      expect.objectContaining({ available: false, code: "active_assignment" }),
    ]);
    expect(result.surgery).toEqual(expect.objectContaining({ acceptsNewCajasAssignments: true, newCajasAssignmentReason: expect.any(String) }));
    expect(db.cajasAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", surgeryId: "surgery-1" } }));
    expect(db.stockIdentifiedUnit.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", eligibility: { article: { articleType: "Caja" } } } }));
  });

  it("requests only the latest preparation for each assignment", async () => {
    const db = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1", visibleNumber: "CX-1", cxStatus: "pending", archivedAt: null }) },
      cajasAssignment: { findMany: vi.fn().mockResolvedValue([]) },
      stockIdentifiedUnit: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await getSurgeryCajas(db as never, "company-1", "surgery-1");

    expect(db.cajasAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ preparations: expect.objectContaining({ orderBy: { version: "desc" }, take: 1 }) }),
    }));
  });

  it("atomically accepts an eligible unit and copies the bound formula lines exactly", async () => {
    const { db, tx } = writableDb();

    const result = await assignAndPrepareCajas(db as never, "company-1", "surgery-1", "user-1", { unitId: "unit-1", idempotencyKey: "key-1" });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.stockIdentifiedUnit.findFirst.mock.invocationCallOrder[0]);
    expect(tx.surgery.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", id: "surgery-1" } }));
    expect(tx.auditEvent.create.mock.invocationCallOrder[0]).toBeLessThan(tx.operationalCommandAcceptance.create.mock.invocationCallOrder[0]);
    expect(tx.cajasAssignment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ activeSlot: 1, boxIdentifiedUnitId: "unit-1" }) }));
    expect(tx.cajasPreparation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ formulaVersionId: "formula-version-1", requiresRecontrol: false }) }));
    expect(tx.cajasPreparationLine.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      expectedFormulaLineId: "formula-line-1",
      articleId: "component-1",
      quantity: formulaLine.expectedQuantity,
      stockUnit: "u",
      scaleSnapshot: 1,
      stockPositionId: null,
    })] });
    expect(result).toEqual(expect.objectContaining({ replayed: false, assignment: expect.objectContaining({ id: "assignment-1" }) }));
  });

  it("returns the original aggregate for the same key and rejects a different intent before any transaction", async () => {
    const { db } = writableDb();
    await assignAndPrepareCajas(db as never, "company-1", "surgery-1", "user-1", { unitId: "unit-1", idempotencyKey: "key-1" });
    const accepted = (db.operationalCommandAcceptance.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    db.$transaction.mockClear();
    db.operationalCommandAcceptance.findFirst.mockResolvedValue({ intentHash: accepted.intentHash, resultEntityId: "assignment-1" });

    await expect(assignAndPrepareCajas(db as never, "company-1", "surgery-1", "user-1", { unitId: "unit-1", idempotencyKey: "key-1" })).resolves.toEqual(expect.objectContaining({ replayed: true }));
    await expect(assignAndPrepareCajas(db as never, "company-1", "surgery-1", "user-1", { unitId: "unit-2", idempotencyKey: "key-1" })).rejects.toMatchObject({ status: 409, code: "idempotency_key_reused" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    { id: "surgery-1", cxStatus: "finalized", archivedAt: null },
    { id: "surgery-1", cxStatus: "pending", archivedAt: new Date("2026-08-25T10:00:00Z") },
  ])("leaves audit, command, and domain writers untouched when the Surgery is ineligible", async (surgery) => {
    const { db, tx } = writableDb();
    tx.surgery.findFirst.mockResolvedValue(surgery);

    await expect(assignAndPrepareCajas(db as never, "company-1", "surgery-1", "user-1", { unitId: "unit-1", idempotencyKey: "key-1" })).rejects.toMatchObject({ status: 409, code: "surgery_not_eligible" });

    expect(tx.auditEvent.create).not.toHaveBeenCalled();
    expect(tx.operationalCommandAcceptance.create).not.toHaveBeenCalled();
    expect(tx.cajasAssignment.create).not.toHaveBeenCalled();
    expect(tx.cajasPreparation.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ archivedAt: new Date("2026-08-25T10:00:00Z"), cxStatus: "pending" }, "archivada"],
    [{ archivedAt: null, cxStatus: "finalized" }, "finalizada"],
  ])("keeps history readable but explicitly denies new assignments for an ineligible Surgery", async (state, reason) => {
    const db = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1", visibleNumber: "CX-1", ...state }) },
      cajasAssignment: { findMany: vi.fn().mockResolvedValue([assignmentRecord()]) },
      stockIdentifiedUnit: { findMany: vi.fn().mockResolvedValue([candidate()]) },
    };

    const result = await getSurgeryCajas(db as never, "company-1", "surgery-1");

    expect(result.surgery).toEqual(expect.objectContaining({ acceptsNewCajasAssignments: false, newCajasAssignmentReason: expect.stringContaining(reason) }));
    expect(result.assignments).toHaveLength(1);
  });

  it("maps the final unique race guard to an active-assignment conflict", async () => {
    const { db, tx } = writableDb();
    tx.cajasAssignment.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));

    await expect(assignAndPrepareCajas(db as never, "company-1", "surgery-1", "user-1", { unitId: "unit-1", idempotencyKey: "race-key" })).rejects.toMatchObject({ status: 409, code: "cajas_unit_already_assigned" });
  });

  it("serializes identified-unit reservations and rejects a unit with an active Box assignment", async () => {
    const tx = {
      surgeryPreparation: { findFirst: vi.fn().mockResolvedValue({ id: "preparation-1", surgeryId: "surgery-1" }) },
      surgeryPreparationLine: { findFirst: vi.fn().mockResolvedValue({ id: "line-1", requestedQuantity: new Prisma.Decimal(1), preparedQuantity: new Prisma.Decimal(0), stockUnit: "u", preparation: { id: "preparation-1" } }) },
      stockPosition: { findFirst: vi.fn().mockResolvedValue({ id: "position-1", identifiedUnitId: "unit-1", quantityScale: 0, positionProjection: { availableQuantity: new Prisma.Decimal(1) } }) },
      cajasAssignment: { findFirst: vi.fn().mockResolvedValue({ id: "assignment-1" }) },
      stockReservation: { findFirst: vi.fn(), create: vi.fn() },
      stockPositionProjection: { updateMany: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([{ id: "unit-1" }]),
    };
    const db = { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };

    await expect(reservePreparation(db as never, "company-1", "surgery-1", "preparation-1", "user-1", { lineId: "line-1", positionId: "position-1", quantity: "1" }))
      .rejects.toMatchObject({ status: 409, code: "identified_unit_assigned" });

    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.cajasAssignment.findFirst.mock.invocationCallOrder[0]);
    expect(tx.stockPositionProjection.updateMany).not.toHaveBeenCalled();
    expect(tx.stockReservation.create).not.toHaveBeenCalled();
  });

  it("appends a validated exception with audit and idempotency in one transaction, then replays it", async () => {
    const entry = { id: "entry-1", assignmentId: "assignment-1", boxIdentifiedUnitId: "unit-1", articleId: "component-1", eventKind: "REPAIR_SENT", note: "Juego en la articulación", occurredAt: new Date("2026-08-26T12:00:00Z"), actor: { firstName: "Ada", lastName: "Lovelace" }, article: { article: { description: "Componente uno" } } };
    const tx = {
      operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1" }) },
      cajasAssignment: { findFirst: vi.fn().mockResolvedValue({ id: "assignment-1", boxIdentifiedUnitId: "unit-1", preparations: [{ id: "preparation-1" }] }) },
      cajasPreparationLine: { findFirst: vi.fn().mockResolvedValue({ id: "line-1" }) },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      cajasUnitLogEntry: { create: vi.fn().mockResolvedValue(entry), findFirst: vi.fn().mockResolvedValue(entry) },
    };
    const db = { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const input = { assignmentId: "assignment-1", unitId: "unit-1", eventKind: "REPAIR_SENT" as const, articleId: "component-1", note: "Juego en la articulación", idempotencyKey: "log-key-1" };

    await expect(appendCajasUnitLogEntry(db as never, "company-1", "surgery-1", "user-1", input)).resolves.toEqual(expect.objectContaining({ replayed: false, entry: expect.objectContaining({ id: "entry-1" }) }));
    expect(tx.cajasAssignment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", surgeryId: "surgery-1", id: "assignment-1", boxIdentifiedUnitId: "unit-1" } }));
    expect(tx.cajasPreparationLine.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", preparationId: "preparation-1", articleId: "component-1", isActive: true } }));
    expect(tx.auditEvent.create.mock.invocationCallOrder[0]).toBeLessThan(tx.operationalCommandAcceptance.create.mock.invocationCallOrder[0]);
    expect(tx.operationalCommandAcceptance.create.mock.invocationCallOrder[0]).toBeLessThan(tx.cajasUnitLogEntry.create.mock.invocationCallOrder[0]);

    const acceptance = tx.operationalCommandAcceptance.create.mock.calls[0][0].data;
    db.operationalCommandAcceptance.findFirst.mockResolvedValue({ intentHash: acceptance.intentHash, resultEntityId: "entry-1" });
    db.$transaction.mockClear();
    await expect(appendCajasUnitLogEntry(db as never, "company-1", "surgery-1", "user-1", input)).resolves.toEqual(expect.objectContaining({ replayed: true }));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects company/Surgery/assignment/unit and preparation-article mismatches before audit", async () => {
    const tx = {
      operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null) },
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1" }) },
      cajasAssignment: { findFirst: vi.fn().mockResolvedValue(null) },
      cajasPreparationLine: { findFirst: vi.fn().mockResolvedValue(null) },
      auditEvent: { create: vi.fn() },
      cajasUnitLogEntry: { findFirst: vi.fn() },
    };
    const db = { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const input = { assignmentId: "foreign-assignment", unitId: "foreign-unit", eventKind: "PROBLEM_REPORTED" as const, articleId: "component-1", note: "Problema", idempotencyKey: "log-key-2" };
    await expect(appendCajasUnitLogEntry(db as never, "company-1", "surgery-1", "user-1", input)).rejects.toMatchObject({ status: 404, code: "cajas_assignment_not_found" });

    tx.cajasAssignment.findFirst.mockResolvedValue({ id: "assignment-1", boxIdentifiedUnitId: "unit-1", preparations: [{ id: "preparation-1" }] });
    await expect(appendCajasUnitLogEntry(db as never, "company-1", "surgery-1", "user-1", { ...input, assignmentId: "assignment-1", unitId: "unit-1", articleId: "foreign-article", idempotencyKey: "log-key-3" })).rejects.toMatchObject({ status: 409, code: "cajas_log_article_not_in_preparation" });
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("rejects an exception without an instrument before audit", async () => {
    const tx = {
      operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null) },
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1" }) },
      cajasAssignment: { findFirst: vi.fn().mockResolvedValue({ id: "assignment-1", boxIdentifiedUnitId: "unit-1", preparations: [{ id: "preparation-1" }] }) },
      cajasPreparationLine: { findFirst: vi.fn() },
      auditEvent: { create: vi.fn() },
      cajasUnitLogEntry: { findFirst: vi.fn() },
    };
    const db = { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };

    await expect(appendCajasUnitLogEntry(db as never, "company-1", "surgery-1", "user-1", { assignmentId: "assignment-1", unitId: "unit-1", eventKind: "REPAIR_SENT", note: "Juego", idempotencyKey: "missing-article" } as never))
      .rejects.toMatchObject({ status: 409, code: "cajas_log_article_required" });
    expect(tx.cajasPreparationLine.findFirst).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
});
