import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSurgeryDocumentation,
  initializeSurgeryDocumentation,
  type SurgeryDocumentationEffects,
} from "@/lib/services/surgery-documentation.service";

const context = { companyId: "company-1", actorUserId: "actor-1" };
const now = new Date("2026-07-28T10:00:00.000Z");
const allTypes = [
  "authorization", "billing_support", "box_photos", "implant_documentation", "medical_order",
  "signed_consumption", "signed_delivery_note", "surgical_report", "technical_sheet",
];

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
    userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ userId: "actor-1", role: "admin" }) },
    surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1" }) },
    surgeryDocumentChecklist: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    surgeryDocumentItem: { createMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  };
  const prisma = { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const effects: SurgeryDocumentationEffects = { writeAudit: vi.fn().mockResolvedValue({ id: "audit-1" }) };
  return { tx, effects, dependencies: { prisma: prisma as never, effects } };
}

describe("surgery documentation read and initialization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a side-effect-free missing read", async () => {
    const h = harness(); h.tx.surgeryDocumentChecklist.findFirst.mockResolvedValue(null);
    await expect(getSurgeryDocumentation(h.dependencies, context, "surgery-1")).resolves.toMatchObject({
      checklist: null, status: "not_required", progress: { approved: 0, total: 0 }, items: [],
    });
    expect(h.tx.surgeryDocumentChecklist.create).not.toHaveBeenCalled();
  });

  it("audits creation with null oldValue and deterministic resulting types", async () => {
    const h = harness();
    h.tx.surgeryDocumentChecklist.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(checklist([]));
    h.tx.surgeryDocumentChecklist.create.mockResolvedValue(checklist([]));
    h.tx.surgeryDocumentItem.createMany.mockResolvedValue({ count: 9 });
    await initializeSurgeryDocumentation(h.dependencies, context, "surgery-1");
    expect(h.effects.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      oldValue: null,
      newValue: { templateVersion: "documentation-v0.1", itemTypes: allTypes },
      metadata: expect.objectContaining({ createdChecklist: true }),
    }));
  });

  it("audits truthful prior and resulting types when repairing", async () => {
    const h = harness(); const partial = checklist([item({ state: "observed", observation: "Keep me" })]);
    h.tx.surgeryDocumentChecklist.findFirst.mockResolvedValueOnce(partial).mockResolvedValueOnce(partial);
    h.tx.surgeryDocumentItem.createMany.mockResolvedValue({ count: 8 });
    await initializeSurgeryDocumentation(h.dependencies, context, "surgery-1");
    expect(h.effects.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      oldValue: { templateVersion: "documentation-v0.1", itemTypes: ["medical_order"] },
      newValue: { templateVersion: "documentation-v0.1", itemTypes: allTypes },
      metadata: expect.objectContaining({ createdChecklist: false }),
    }));
  });

  it("preserves complete initialization without another audit", async () => {
    const h = harness();
    h.tx.surgeryDocumentChecklist.findFirst.mockResolvedValue(checklist(allTypes.map((type, index) => item({ id: `item-${index}`, type }))));
    const result = await initializeSurgeryDocumentation(h.dependencies, context, "surgery-1");
    expect(result).toMatchObject({ createdChecklist: false, insertedTypes: [] });
    expect(h.tx.surgeryDocumentItem.createMany).not.toHaveBeenCalled();
    expect(h.effects.writeAudit).not.toHaveBeenCalled();
  });
});
