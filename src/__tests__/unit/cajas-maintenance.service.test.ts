import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCajasMaintenanceCase,
  getCajasMaintenance,
  transitionCajasMaintenanceCase,
} from "@/lib/services/cajas-maintenance.service";

const acceptedAt = new Date("2026-08-27T01:00:00.000Z");

function maintenanceRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-1",
    companyId: "company-1",
    boxIdentifiedUnitId: "unit-1",
    articleId: "article-1",
    kind: "REPAIR",
    status: "OPEN",
    description: "Repair hinge",
    version: 1,
    openedAt: acceptedAt,
    createdAt: acceptedAt,
    updatedAt: acceptedAt,
    openedBy: { id: "user-1", firstName: "Ada", lastName: "Lovelace" },
    articleEligibility: { article: { id: "article-1", sku: "ART-1", description: "Hinge" } },
    transitions: [{
      id: "transition-1",
      sequence: 1,
      fromStatus: null,
      toStatus: "OPEN",
      note: null,
      acceptedAt,
      acceptedBy: { id: "user-1", firstName: "Ada", lastName: "Lovelace" },
    }],
    ...overrides,
  };
}

function createDb() {
  const tx = {
    operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    stockIdentifiedUnit: { findFirst: vi.fn().mockResolvedValue({ id: "unit-1", currentConfiguration: { internalCode: "BOX-001" } }) },
    stockArticleEligibility: { findFirst: vi.fn().mockResolvedValue({ id: "eligibility-1" }) },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    cajasMaintenanceCase: { create: vi.fn().mockResolvedValue({}), findFirst: vi.fn().mockResolvedValue(maintenanceRecord()), findMany: vi.fn() },
    cajasMaintenanceTransition: { create: vi.fn().mockResolvedValue({}) },
  };
  const db = { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  return { db, tx };
}

function transitionDb(status: string, version: number, resultStatus: string) {
  const result = maintenanceRecord({
    status: resultStatus,
    version: version + 1,
    transitions: [],
  });
  const tx = {
    operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    cajasMaintenanceCase: {
      findFirst: vi.fn().mockResolvedValueOnce({ id: "case-1", status, version }).mockResolvedValue(result),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    cajasMaintenanceTransition: { create: vi.fn().mockResolvedValue({}) },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    $queryRaw: vi.fn().mockResolvedValue([{ id: "case-1" }]),
  };
  return { db: { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) }, tx };
}

describe("cajas-maintenance.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(acceptedAt);
  });

  it("returns only company/unit-scoped maintenance and rejects inaccessible units uniformly", async () => {
    const { db } = createDb();
    db.cajasMaintenanceCase.findMany.mockResolvedValue([maintenanceRecord()]);

    await expect(getCajasMaintenance(db as never, "company-1", "unit-1")).resolves.toEqual({
      unit: { id: "unit-1", code: "BOX-001" },
      cases: [expect.objectContaining({ id: "case-1", article: { id: "article-1", sku: "ART-1", description: "Hinge" } })],
    });
    expect(db.stockIdentifiedUnit.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1", id: "unit-1", eligibility: { article: { articleType: "Caja" } } },
    }));
    expect(db.cajasMaintenanceCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1", boxIdentifiedUnitId: "unit-1" },
      orderBy: { updatedAt: "desc" },
    }));

    db.stockIdentifiedUnit.findFirst.mockResolvedValue(null);
    await expect(getCajasMaintenance(db as never, "company-1", "foreign-unit")).rejects.toMatchObject({ status: 404, code: "cajas_unit_not_found" });
  });

  it("creates OPEN plus immutable opening evidence with one actor/server timestamp and optional Article eligibility", async () => {
    const { db, tx } = createDb();
    const input = { kind: "REPAIR" as const, articleId: "article-1", description: "Repair hinge", idempotencyKey: "create-1" };

    const result = await createCajasMaintenanceCase(db as never, "company-1", "unit-1", "user-1", input);

    expect(result).toEqual(expect.objectContaining({ replayed: false, case: expect.objectContaining({ status: "OPEN", version: 1 }) }));
    expect(tx.stockArticleEligibility.findFirst).toHaveBeenCalledWith({ where: { companyId: "company-1", articleId: "article-1" }, select: { id: true } });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "company-1", userId: "user-1", createdAt: acceptedAt }) });
    expect(tx.operationalCommandAcceptance.create).toHaveBeenCalledWith({ data: expect.objectContaining({ checkpoint: "maintenance-case-create", scopeKey: "unit:unit-1", acceptedAt, createdAt: acceptedAt }) });
    expect(tx.cajasMaintenanceCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "OPEN", version: 1, openedAt: acceptedAt, createdAt: acceptedAt, updatedAt: acceptedAt }) });
    expect(tx.cajasMaintenanceTransition.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sequence: 1, fromStatus: null, toStatus: "OPEN", acceptedAt, createdAt: acceptedAt }) });
  });

  it("allows no-Article creation, rejects a foreign Article before audit, and replays the original result", async () => {
    const { db, tx } = createDb();
    const noArticle = { kind: "PREVENTIVE_MAINTENANCE" as const, description: "Annual control", idempotencyKey: "create-2" };
    await createCajasMaintenanceCase(db as never, "company-1", "unit-1", "user-1", noArticle);
    expect(tx.stockArticleEligibility.findFirst).not.toHaveBeenCalled();
    expect(tx.cajasMaintenanceCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ articleId: null }) });

    const acceptance = tx.operationalCommandAcceptance.create.mock.calls[0][0].data;
    db.operationalCommandAcceptance.findFirst.mockResolvedValue({ intentHash: acceptance.intentHash, resultEntityId: "case-1" });
    db.$transaction.mockClear();
    await expect(createCajasMaintenanceCase(db as never, "company-1", "unit-1", "user-1", noArticle)).resolves.toEqual(expect.objectContaining({ replayed: true }));
    expect(db.$transaction).not.toHaveBeenCalled();

    db.operationalCommandAcceptance.findFirst.mockResolvedValue(null);
    tx.stockArticleEligibility.findFirst.mockResolvedValue(null);
    await expect(createCajasMaintenanceCase(db as never, "company-1", "unit-1", "user-1", { ...noArticle, articleId: "foreign", idempotencyKey: "create-3" }))
      .rejects.toMatchObject({ status: 404, code: "cajas_maintenance_article_not_found" });
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of a create key for a different intent", async () => {
    const { db } = createDb();
    db.operationalCommandAcceptance.findFirst.mockResolvedValue({ intentHash: "different", resultEntityId: "case-1" });
    await expect(createCajasMaintenanceCase(db as never, "company-1", "unit-1", "user-1", { kind: "REPAIR", description: "Repair", idempotencyKey: "same" }))
      .rejects.toMatchObject({ status: 409, code: "idempotency_key_reused" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["OPEN", 1, "SENT"],
    ["OPEN", 1, "CANCELLED"],
    ["SENT", 2, "RETURNED_PENDING_REVIEW"],
    ["RETURNED_PENDING_REVIEW", 3, "CLOSED"],
  ])("accepts legal %s v%s -> %s transitions with CAS, audit, and append-only evidence", async (status, version, toStatus) => {
    const { db, tx } = transitionDb(status, version, toStatus);
    const result = await transitionCajasMaintenanceCase(db as never, "company-1", "unit-1", "case-1", "user-1", {
      toStatus: toStatus as "SENT",
      expectedVersion: version,
      note: "Checked",
      idempotencyKey: `transition-${status}-${toStatus}`,
    });

    expect(result).toEqual(expect.objectContaining({ replayed: false }));
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.cajasMaintenanceCase.findFirst.mock.invocationCallOrder[0]);
    expect(tx.cajasMaintenanceCase.updateMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", boxIdentifiedUnitId: "unit-1", id: "case-1", version, status },
      data: { status: toStatus, version: version + 1, updatedAt: acceptedAt },
    });
    expect(tx.cajasMaintenanceTransition.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sequence: version + 1, fromStatus: status, toStatus, note: "Checked", acceptedAt }) });
  });

  it("replays a transition without a second transaction and rejects the same key with changed intent", async () => {
    const { db, tx } = transitionDb("OPEN", 1, "SENT");
    const input = { toStatus: "SENT" as const, expectedVersion: 1, note: "Sent", idempotencyKey: "transition-replay" };
    await transitionCajasMaintenanceCase(db as never, "company-1", "unit-1", "case-1", "user-1", input);
    const acceptance = tx.operationalCommandAcceptance.create.mock.calls[0][0].data;
    db.operationalCommandAcceptance.findFirst.mockResolvedValue({ intentHash: acceptance.intentHash, resultEntityId: "case-1" });
    tx.cajasMaintenanceCase.findFirst.mockResolvedValue(maintenanceRecord({ status: "SENT", version: 2 }));
    db.$transaction.mockClear();

    await expect(transitionCajasMaintenanceCase(db as never, "company-1", "unit-1", "case-1", "user-1", input))
      .resolves.toEqual(expect.objectContaining({ replayed: true }));
    expect(db.$transaction).not.toHaveBeenCalled();
    await expect(transitionCajasMaintenanceCase(db as never, "company-1", "unit-1", "case-1", "user-1", { ...input, note: "Changed" }))
      .rejects.toMatchObject({ status: 409, code: "idempotency_key_reused" });
  });

  it("rechecks idempotency after the row lock so a concurrent retry becomes a replay", async () => {
    const first = transitionDb("OPEN", 1, "SENT");
    const input = { toStatus: "SENT" as const, expectedVersion: 1, idempotencyKey: "concurrent-retry" };
    await transitionCajasMaintenanceCase(first.db as never, "company-1", "unit-1", "case-1", "user-1", input);
    const acceptance = first.tx.operationalCommandAcceptance.create.mock.calls[0][0].data;

    const retry = transitionDb("OPEN", 1, "SENT");
    retry.tx.operationalCommandAcceptance.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ intentHash: acceptance.intentHash, resultEntityId: "case-1" });
    retry.tx.cajasMaintenanceCase.findFirst.mockReset().mockResolvedValue(maintenanceRecord({ status: "SENT", version: 2 }));

    await expect(transitionCajasMaintenanceCase(retry.db as never, "company-1", "unit-1", "case-1", "user-1", input))
      .resolves.toEqual(expect.objectContaining({ replayed: true }));
    expect(retry.tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(retry.tx.cajasMaintenanceCase.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale, illegal, missing, and lost-CAS transitions before appending evidence", async () => {
    let state = transitionDb("OPEN", 2, "SENT");
    await expect(transitionCajasMaintenanceCase(state.db as never, "company-1", "unit-1", "case-1", "user-1", { toStatus: "SENT", expectedVersion: 1, idempotencyKey: "stale" }))
      .rejects.toMatchObject({ status: 409, code: "cajas_maintenance_version_conflict" });
    expect(state.tx.auditEvent.create).not.toHaveBeenCalled();

    state = transitionDb("OPEN", 1, "CLOSED");
    await expect(transitionCajasMaintenanceCase(state.db as never, "company-1", "unit-1", "case-1", "user-1", { toStatus: "CLOSED", expectedVersion: 1, idempotencyKey: "illegal" }))
      .rejects.toMatchObject({ status: 409, code: "cajas_maintenance_transition_not_allowed" });

    state = transitionDb("OPEN", 1, "SENT");
    state.tx.$queryRaw.mockResolvedValue([]);
    await expect(transitionCajasMaintenanceCase(state.db as never, "company-1", "foreign-unit", "case-1", "user-1", { toStatus: "SENT", expectedVersion: 1, idempotencyKey: "missing" }))
      .rejects.toMatchObject({ status: 404, code: "cajas_maintenance_case_not_found" });

    state = transitionDb("OPEN", 1, "SENT");
    state.tx.cajasMaintenanceCase.updateMany.mockResolvedValue({ count: 0 });
    await expect(transitionCajasMaintenanceCase(state.db as never, "company-1", "unit-1", "case-1", "user-1", { toStatus: "SENT", expectedVersion: 1, idempotencyKey: "cas" }))
      .rejects.toMatchObject({ status: 409, code: "cajas_maintenance_version_conflict" });
    expect(state.tx.cajasMaintenanceTransition.create).not.toHaveBeenCalled();
  });
});
