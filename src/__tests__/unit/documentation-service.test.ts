// Error constructor only: no PrismaClient, repository singleton, environment loading, or DB connection.
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSurgeryDocumentation,
  initializeSurgeryDocumentation,
  transitionSurgeryDocumentationItem,
  type SurgeryDocumentationEffects,
} from "@/lib/services/surgery-documentation.service";

const context = { companyId: "company-1", actorUserId: "actor-1" };
const now = new Date("2026-07-28T10:00:00.000Z");
function access(role = "admin") {
  return { userId: context.actorUserId, role };
}

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1", companyId: context.companyId, checklistId: "checklist-1",
    type: "medical_order", label: "Orden médica", required: true, sortOrder: 10,
    state: "received", observation: null, createdById: "actor-1", updatedById: "actor-1",
    createdAt: now, updatedAt: now, ...overrides,
  };
}

function checklist(items = [item()]) {
  return {
    id: "checklist-1", companyId: context.companyId, surgeryId: "surgery-1",
    templateVersion: "documentation-v0.1", createdById: "actor-1", updatedById: "actor-1",
    createdAt: now, updatedAt: now, items,
  };
}

function harness() {
  const tx = {
    userCompanyAccess: { findFirst: vi.fn() },
    surgery: { findFirst: vi.fn() },
    surgeryDocumentChecklist: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    surgeryDocumentItem: { createMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const effects: SurgeryDocumentationEffects = { writeAudit: vi.fn().mockResolvedValue({ id: "audit-1" }) };
  return { tx, prisma, effects, dependencies: { prisma: prisma as never, effects } };
}

describe("surgery documentation service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a side-effect-free missing read for an active member", async () => {
    const h = harness();
    h.tx.userCompanyAccess.findFirst.mockResolvedValue(access("operator"));
    h.tx.surgery.findFirst.mockResolvedValue({ id: "surgery-1" });
    h.tx.surgeryDocumentChecklist.findFirst.mockResolvedValue(null);

    await expect(getSurgeryDocumentation(h.dependencies, context, "surgery-1")).resolves.toEqual({
      checklist: null, status: "not_required", progress: { approved: 0, total: 0 }, items: [],
    });
    expect(h.tx.surgeryDocumentChecklist.create).not.toHaveBeenCalled();
    expect(h.effects.writeAudit).not.toHaveBeenCalled();
  });

  it("uses uniform 404 for inactive membership and foreign surgery", async () => {
    for (const setup of [
      (h: ReturnType<typeof harness>) => h.tx.userCompanyAccess.findFirst.mockResolvedValue(null),
      (h: ReturnType<typeof harness>) => {
        h.tx.userCompanyAccess.findFirst.mockResolvedValue(access());
        h.tx.surgery.findFirst.mockResolvedValue(null);
      },
    ]) {
      const h = harness(); setup(h);
      await expect(getSurgeryDocumentation(h.dependencies, context, "foreign")).rejects.toMatchObject({ status: 404, code: "documentation_not_found" });
    }
  });

  it("initializes missing template snapshots once and audits only the change", async () => {
    const h = harness();
    h.tx.userCompanyAccess.findFirst.mockResolvedValue(access("coordinador"));
    h.tx.surgery.findFirst.mockResolvedValue({ id: "surgery-1" });
    h.tx.surgeryDocumentChecklist.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(checklist([]));
    h.tx.surgeryDocumentChecklist.create.mockResolvedValue(checklist([]));
    h.tx.surgeryDocumentItem.createMany.mockResolvedValue({ count: 9 });

    const result = await initializeSurgeryDocumentation(h.dependencies, context, "surgery-1");
    expect(result.createdChecklist).toBe(true);
    expect(result.insertedTypes).toHaveLength(9);
    expect(h.tx.surgeryDocumentItem.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([
      expect.objectContaining({ type: "medical_order", required: true, sortOrder: 10 }),
      expect.objectContaining({ type: "billing_support", required: false, sortOrder: 90 }),
    ]) });
    expect(h.effects.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      tx: h.tx,
      action: "documentation.checklist_initialized",
      companyId: context.companyId,
      oldValue: null,
      newValue: {
        templateVersion: "documentation-v0.1",
        itemTypes: [
          "authorization", "billing_support", "box_photos", "implant_documentation", "medical_order",
          "signed_consumption", "signed_delivery_note", "surgical_report", "technical_sheet",
        ],
      },
    }));
  });

  it("audits deterministic item-type snapshots when repairing a partial checklist", async () => {
    const h = harness();
    h.tx.userCompanyAccess.findFirst.mockResolvedValue(access("admin"));
    h.tx.surgery.findFirst.mockResolvedValue({ id: "surgery-1" });
    const partial = checklist([item({ state: "observed", observation: "Keep me" })]);
    h.tx.surgeryDocumentChecklist.findFirst
      .mockResolvedValueOnce(partial)
      .mockResolvedValueOnce(checklist([item({ state: "observed", observation: "Keep me" })]));
    h.tx.surgeryDocumentItem.createMany.mockResolvedValue({ count: 8 });

    const result = await initializeSurgeryDocumentation(h.dependencies, context, "surgery-1");

    expect(result).toMatchObject({ createdChecklist: false });
    expect(result.insertedTypes).toHaveLength(8);
    expect(h.effects.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      oldValue: {
        templateVersion: "documentation-v0.1",
        itemTypes: ["medical_order"],
      },
      newValue: {
        templateVersion: "documentation-v0.1",
        itemTypes: [
          "authorization", "billing_support", "box_photos", "implant_documentation", "medical_order",
          "signed_consumption", "signed_delivery_note", "surgical_report", "technical_sheet",
        ],
      },
      metadata: expect.objectContaining({
        createdChecklist: false,
        insertedTypes: expect.not.arrayContaining(["medical_order"]),
      }),
    }));
  });

  it("preserves partial data and emits no audit for an already complete template", async () => {
    const h = harness();
    h.tx.userCompanyAccess.findFirst.mockResolvedValue(access("coordinator"));
    h.tx.surgery.findFirst.mockResolvedValue({ id: "surgery-1" });
    const allItems = Array.from({ length: 9 }, (_, index) => item({ id: `item-${index}`, type: [
      "medical_order", "authorization", "signed_delivery_note", "signed_consumption", "implant_documentation",
      "technical_sheet", "box_photos", "surgical_report", "billing_support",
    ][index], state: index === 0 ? "observed" : "pending", observation: index === 0 ? "Keep me" : null }));
    h.tx.surgeryDocumentChecklist.findFirst.mockResolvedValue(checklist(allItems));

    const result = await initializeSurgeryDocumentation(h.dependencies, context, "surgery-1");
    expect(result).toMatchObject({ createdChecklist: false, insertedTypes: [] });
    expect(result.documentation.items[0]).toMatchObject({ state: "observed", observation: "Keep me" });
    expect(h.tx.surgeryDocumentItem.createMany).not.toHaveBeenCalled();
    expect(h.effects.writeAudit).not.toHaveBeenCalled();
  });

  it("denies foreign-company initialize and PATCH without disclosing or writing", async () => {
    const foreignInitialize = harness();
    foreignInitialize.tx.userCompanyAccess.findFirst.mockResolvedValue(null);
    await expect(initializeSurgeryDocumentation(
      foreignInitialize.dependencies,
      context,
      "foreign-surgery"
    )).rejects.toMatchObject({ status: 404, code: "documentation_not_found" });
    expect(foreignInitialize.tx.surgery.findFirst).not.toHaveBeenCalled();
    expect(foreignInitialize.tx.surgeryDocumentChecklist.create).not.toHaveBeenCalled();
    expect(foreignInitialize.tx.surgeryDocumentItem.createMany).not.toHaveBeenCalled();
    expect(foreignInitialize.effects.writeAudit).not.toHaveBeenCalled();

    const foreignPatch = harness();
    foreignPatch.tx.userCompanyAccess.findFirst.mockResolvedValue(access());
    foreignPatch.tx.surgeryDocumentItem.findFirst.mockResolvedValue(null);
    await expect(transitionSurgeryDocumentationItem(foreignPatch.dependencies, context, {
      surgeryId: "foreign-surgery",
      itemId: "foreign-item",
      state: "received",
      expectedUpdatedAt: now.toISOString(),
    })).rejects.toMatchObject({ status: 404, code: "documentation_not_found" });
    expect(foreignPatch.tx.surgeryDocumentItem.updateMany).not.toHaveBeenCalled();
    expect(foreignPatch.tx.surgeryDocumentChecklist.updateMany).not.toHaveBeenCalled();
    expect(foreignPatch.effects.writeAudit).not.toHaveBeenCalled();
  });

  it.each([
    "uq_sdc_company_surgery",
    "uq_sdi_checklist_type",
    ["companyId", "surgeryId"],
    ["checklistId", "type"],
  ])("retries approved initialization conflict target %j three times before 409", async (target) => {
    const h = harness();
    h.prisma.$transaction.mockRejectedValue(new PrismaClientKnownRequestError("race", {
      code: "P2002", clientVersion: "test", meta: { target },
    }));
    await expect(initializeSurgeryDocumentation(h.dependencies, context, "surgery-1")).rejects.toMatchObject({
      status: 409, code: "documentation_write_conflict",
    });
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it.each([
    { code: "P2034", target: undefined },
    { code: "P2002", target: ["companyId", "surgeryId"] },
  ])("retries $code and succeeds on the next attempt", async ({ code, target }) => {
    const h = harness();
    const expected = { documentation: { checklist: null }, createdChecklist: false, insertedTypes: [] };
    h.prisma.$transaction
      .mockRejectedValueOnce(new PrismaClientKnownRequestError("race", {
        code, clientVersion: "test", meta: target ? { target } : undefined,
      }))
      .mockResolvedValueOnce(expected);
    await expect(initializeSurgeryDocumentation(h.dependencies, context, "surgery-1")).resolves.toBe(expected);
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it.each([
    "other_unique",
    ["companyId", "id"],
    ["surgeryId", "companyId"],
    ["companyId", "surgeryId", "type"],
  ])("does not retry unrelated P2002 target %j", async (target) => {
    const h = harness();
    h.prisma.$transaction.mockRejectedValue(new PrismaClientKnownRequestError("other", {
      code: "P2002", clientVersion: "test", meta: { target },
    }));
    await expect(initializeSurgeryDocumentation(h.dependencies, context, "surgery-1")).rejects.toMatchObject({ code: "P2002" });
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("performs one company/state/timestamp CAS and clears observation when leaving observed", async () => {
    const h = harness();
    h.tx.userCompanyAccess.findFirst.mockResolvedValue(access());
    h.tx.surgeryDocumentItem.findFirst.mockResolvedValue({ ...item({ state: "observed", observation: "Old" }), checklist: { surgeryId: "surgery-1", templateVersion: "documentation-v0.1" } });
    h.tx.surgeryDocumentItem.updateMany.mockResolvedValue({ count: 1 });
    h.tx.surgeryDocumentChecklist.updateMany.mockResolvedValue({ count: 1 });
    h.tx.surgeryDocumentChecklist.findFirst.mockResolvedValue(checklist([item({ state: "received", updatedAt: new Date("2026-07-28T10:01:00.000Z") })]));

    const result = await transitionSurgeryDocumentationItem(h.dependencies, context, {
      surgeryId: "surgery-1", itemId: "item-1", state: "received", expectedUpdatedAt: now.toISOString(),
    });
    expect(h.tx.surgeryDocumentItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        companyId: "company-1",
        id: "item-1",
        checklist: { companyId: "company-1", surgeryId: "surgery-1" },
      },
    }));
    expect(h.tx.surgeryDocumentItem.updateMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", id: "item-1", state: "observed", updatedAt: now },
      data: { state: "received", observation: null, updatedById: "actor-1" },
    });
    expect(h.effects.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      oldValue: { state: "observed", observation: "Old" }, newValue: { state: "received", observation: null },
    }));
    expect(h.tx.surgeryDocumentChecklist.updateMany).toHaveBeenCalledWith({
      where: { id: "checklist-1", companyId: "company-1" },
      data: { updatedById: "actor-1" },
    });
    expect(result.documentation.items[0].updatedAt).toBe("2026-07-28T10:01:00.000Z");
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("rolls back before audit when the company-scoped checklist actor update loses", async () => {
    const h = harness();
    h.tx.userCompanyAccess.findFirst.mockResolvedValue(access());
    h.tx.surgeryDocumentItem.findFirst.mockResolvedValue({
      ...item(), checklist: { surgeryId: "surgery-1", templateVersion: "documentation-v0.1" },
    });
    h.tx.surgeryDocumentItem.updateMany.mockResolvedValue({ count: 1 });
    h.tx.surgeryDocumentChecklist.updateMany.mockResolvedValue({ count: 0 });

    await expect(transitionSurgeryDocumentationItem(h.dependencies, context, {
      surgeryId: "surgery-1", itemId: "item-1", state: "approved", expectedUpdatedAt: now.toISOString(),
    })).rejects.toMatchObject({ status: 409, code: "documentation_write_conflict" });
    expect(h.effects.writeAudit).not.toHaveBeenCalled();
    expect(h.tx.surgeryDocumentChecklist.findFirst).not.toHaveBeenCalled();
  });

  it("denies read-only roles and translates stale/P2034 writes without retry", async () => {
    const denied = harness();
    denied.tx.userCompanyAccess.findFirst.mockResolvedValue(access("operator"));
    await expect(transitionSurgeryDocumentationItem(denied.dependencies, context, {
      surgeryId: "surgery-1", itemId: "item-1", state: "approved", expectedUpdatedAt: now.toISOString(),
    })).rejects.toMatchObject({ status: 403, code: "company_mutation_access_denied" });

    const stale = harness();
    stale.tx.userCompanyAccess.findFirst.mockResolvedValue(access());
    stale.tx.surgeryDocumentItem.findFirst.mockResolvedValue({ ...item(), checklist: { surgeryId: "surgery-1", templateVersion: "documentation-v0.1" } });
    stale.tx.surgeryDocumentItem.updateMany.mockResolvedValue({ count: 0 });
    await expect(transitionSurgeryDocumentationItem(stale.dependencies, context, {
      surgeryId: "surgery-1", itemId: "item-1", state: "approved", expectedUpdatedAt: now.toISOString(),
    })).rejects.toMatchObject({ status: 409, code: "documentation_write_conflict" });
    expect(stale.effects.writeAudit).not.toHaveBeenCalled();

    for (const code of ["P2034", "P2002"]) {
      const race = harness();
      race.prisma.$transaction.mockRejectedValue(new PrismaClientKnownRequestError("race", {
        code, clientVersion: "test",
      }));
      await expect(transitionSurgeryDocumentationItem(race.dependencies, context, {
        surgeryId: "surgery-1", itemId: "item-1", state: "approved", expectedUpdatedAt: now.toISOString(),
      })).rejects.toMatchObject({ status: 409, code: "documentation_write_conflict" });
      expect(race.prisma.$transaction).toHaveBeenCalledTimes(1);
    }
  });

  it("rejects forbidden graph edges before mutation and propagates audit failure atomically", async () => {
    const forbidden = harness();
    forbidden.tx.userCompanyAccess.findFirst.mockResolvedValue(access());
    forbidden.tx.surgeryDocumentItem.findFirst.mockResolvedValue({ ...item({ state: "pending" }), checklist: { surgeryId: "surgery-1", templateVersion: "documentation-v0.1" } });
    await expect(transitionSurgeryDocumentationItem(forbidden.dependencies, context, {
      surgeryId: "surgery-1", itemId: "item-1", state: "approved", expectedUpdatedAt: now.toISOString(),
    })).rejects.toMatchObject({ status: 409, code: "documentation_transition_forbidden" });
    expect(forbidden.tx.surgeryDocumentItem.updateMany).not.toHaveBeenCalled();

    const rollback = harness();
    rollback.tx.userCompanyAccess.findFirst.mockResolvedValue(access());
    rollback.tx.surgeryDocumentItem.findFirst.mockResolvedValue({ ...item(), checklist: { surgeryId: "surgery-1", templateVersion: "documentation-v0.1" } });
    rollback.tx.surgeryDocumentItem.updateMany.mockResolvedValue({ count: 1 });
    rollback.tx.surgeryDocumentChecklist.updateMany.mockResolvedValue({ count: 1 });
    vi.mocked(rollback.effects.writeAudit).mockRejectedValue(new Error("audit failed"));
    await expect(transitionSurgeryDocumentationItem(rollback.dependencies, context, {
      surgeryId: "surgery-1", itemId: "item-1", state: "approved", expectedUpdatedAt: now.toISOString(),
    })).rejects.toThrow("audit failed");
    expect(rollback.tx.surgeryDocumentChecklist.findFirst).not.toHaveBeenCalled();
  });
});
