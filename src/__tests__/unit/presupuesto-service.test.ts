/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAuditEvent } = vi.hoisted(() => ({ createAuditEvent: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditEvent }));

import {
  createFamilyDraft,
  createRevisionDraft,
  emitDraft,
  recalculatePresupuestoTotals,
  replaceDraft,
  toPresupuestoDto,
} from "@/lib/services/presupuesto.service";
import { presupuestoItemCreateSchema } from "@/lib/validators/presupuesto";

function record(over: Record<string, unknown> = {}) {
  return {
    id: "budget-1",
    visibleNumber: 4,
    companyId: "company-1",
    familyId: "family-1",
    surgeryId: "surgery-1",
    branchId: "branch-1",
    clientContactId: "client-1",
    payerContactId: "payer-1",
    parentPresupuestoId: null,
    sourcePresupuestoId: null,
    versionNumber: 1,
    slot: "CURRENT",
    revision: 3,
    state: "Aprobado",
    title: "Implantes",
    currency: "ARS",
    documentDate: new Date("2026-08-31T00:00:00Z"),
    paymentTerms: "Contado",
    priceListCode: "GENERAL",
    legend: "Commercial legend",
    notes: null,
    generalDiscountRate: new Prisma.Decimal(10),
    commercialSnapshot: { pricingMode: "FIRM" },
    subtotal: new Prisma.Decimal(200),
    discountTotal: new Prisma.Decimal(20),
    taxTotal: new Prisma.Decimal(37.8),
    total: new Prisma.Decimal(217.8),
    validUntil: new Date("2026-09-30T00:00:00Z"),
    issuedAt: new Date("2026-08-31T00:00:00Z"),
    approvedAt: new Date("2026-08-31T01:00:00Z"),
    rejectedAt: null,
    createdById: "user-1",
    updatedById: "user-1",
    metadata: null,
    createdAt: new Date("2026-08-31T00:00:00Z"),
    updatedAt: new Date("2026-08-31T01:00:00Z"),
    items: [{
      id: "item-1",
      position: 0,
      sku: "SKU-1",
      description: "Implante",
      quantity: new Prisma.Decimal(2),
      unit: "unidad",
      unitPrice: new Prisma.Decimal(100),
      discountRate: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(20),
      taxRate: new Prisma.Decimal(21),
      tax: new Prisma.Decimal(37.8),
      total: new Prisma.Decimal(217.8),
      metadata: null,
    }],
    ...over,
  } as any;
}

beforeEach(() => {
  createAuditEvent.mockReset();
  createAuditEvent.mockResolvedValue(undefined);
});

describe("recalculatePresupuestoTotals", () => {
  it("uses Decimal rates and applies line then apportioned general discount before VAT", () => {
    const result = recalculatePresupuestoTotals([
      { description: "A", quantity: "2", unitPrice: "100", discountRate: "10", taxRate: "21" },
      { description: "B", quantity: "1", unitPrice: "50", discountRate: "0", taxRate: "10.5" },
    ], "5");

    expect(result.subtotal.toString()).toBe("250");
    expect(result.discountTotal.toString()).toBe("31.5");
    expect(result.taxTotal.toString()).toBe("40.8975");
    expect(result.total.toString()).toBe("259.3975");
    expect(result.items.map((item) => item.position)).toEqual([0, 1]);
  });

  it("quantizes persisted operands and totals to Decimal scale 4 before summing", () => {
    const result = recalculatePresupuestoTotals([
      { description: "A", quantity: "1.234567", unitPrice: "10.123456", discountRate: "3.333333", taxRate: "21.987654" },
      { description: "B", quantity: "2.000009", unitPrice: "0.333355", discountRate: "0", taxRate: "10.5" },
    ], "1.234567");

    const persisted = [result.generalDiscountRate, result.subtotal, result.discountTotal, result.taxTotal, result.total,
      ...result.items.flatMap((item) => [item.quantity, item.unitPrice, item.discountRate, item.discount, item.taxRate, item.tax, item.total])];
    expect(persisted.every((value) => value.decimalPlaces() <= 4)).toBe(true);
    expect(result.total.equals(result.items.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0)))).toBe(true);
  });

  it("rejects non-finite decimal values at both validation and service boundaries", () => {
    expect(presupuestoItemCreateSchema.safeParse({ description: "A", quantity: "Infinity", unitPrice: "1" }).success).toBe(false);
    expect(presupuestoItemCreateSchema.safeParse({ description: "A", quantity: "1", unitPrice: "NaN" }).success).toBe(false);
    expect(() => recalculatePresupuestoTotals([{ description: "A", quantity: "Infinity", unitPrice: "1" }])).toThrow("Invalid decimal value");
  });
});

describe("canonical projection", () => {
  it("serializes decimals/dates and derives actions from authoritative state and slot", () => {
    const dto = toPresupuestoDto(record());
    expect(dto.total).toBe("217.8");
    expect(dto.documentDate).toBe("2026-08-31T00:00:00.000Z");
    expect(dto.actions).toEqual(["annul", "revise"]);
  });
});

describe("createFamilyDraft", () => {
  it("fails closed if a linked-family uniqueness conflict cannot be audited", async () => {
    const race = new Prisma.PrismaClientKnownRequestError("family race", {
      code: "P2002",
      clientVersion: "7.8.0",
    });
    const prisma = { $transaction: vi.fn().mockRejectedValue(race) } as any;
    createAuditEvent.mockRejectedValueOnce(new Error("conflict audit unavailable"));

    await expect(createFamilyDraft({
      companyId: "company-1", surgeryId: "surgery-1", actorUserId: "user-1", prisma,
      branchId: "branch-1", clientContactId: "client-1", payerContactId: "payer-1",
      documentDate: new Date(), paymentTerms: "Contado", priceListCode: "GENERAL", legend: "Commercial legend", validUntil: new Date(),
      commercial: { pricingMode: "FIRM", firmPrice: { coordinator: "A", quotationContact: "B", includedMaterials: [], excludedMaterials: [], availability: "Now", operationalClarifications: "None", surgicalAssumptions: "Known" } },
      items: [{ description: "A", quantity: "1", unitPrice: "1" }],
    })).rejects.toThrow("conflict audit unavailable");
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-1", userId: "user-1", entityId: "surgery-1", action: "presupuesto_conflict",
      metadata: expect.objectContaining({ command: "createFamilyDraft", surgeryId: "surgery-1" }),
    }));
  });
});

describe("createRevisionDraft", () => {
  it("copies the immutable current snapshot without replacing the source", async () => {
    const source = record();
    const created = record({
      id: "budget-2",
      visibleNumber: null,
      sourcePresupuestoId: source.id,
      parentPresupuestoId: source.id,
      versionNumber: 2,
      slot: "DRAFT",
      revision: 1,
      state: "Borrador",
    });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "family-1" }]),
      presupuesto: {
        findFirst: vi.fn().mockResolvedValue(source),
        aggregate: vi.fn().mockResolvedValue({ _max: { versionNumber: 1 } }),
        create: vi.fn().mockResolvedValue(created),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    const prisma = { $transaction: vi.fn((work: any) => work(tx)) } as any;

    const result = await createRevisionDraft({
      companyId: "company-1",
      presupuestoId: source.id,
      expectedRevision: 3,
      actorUserId: "user-1",
      prisma,
    });

    expect(result.state).toBe("Borrador");
    expect(tx.presupuesto.update).not.toHaveBeenCalled();
    expect(tx.presupuesto.updateMany).not.toHaveBeenCalled();
    expect(tx.presupuesto.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sourcePresupuestoId: source.id, slot: "DRAFT", state: "Borrador" }),
    }));
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "presupuesto_revision_draft_created" }));
  });

  it("does not accept the mutation when transactional audit fails", async () => {
    const source = record();
    const persisted = [source];
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "family-1" }]),
      presupuesto: {
        findFirst: vi.fn().mockResolvedValue(source),
        aggregate: vi.fn().mockResolvedValue({ _max: { versionNumber: 1 } }),
        create: vi.fn().mockImplementation(async () => {
          const created = record({ id: "budget-2", slot: "DRAFT", state: "Borrador" });
          persisted.push(created);
          return created;
        }),
      },
    };
    createAuditEvent.mockRejectedValueOnce(new Error("audit failed"));
    const prisma = { $transaction: vi.fn(async (work: any) => {
      const snapshot = [...persisted];
      try {
        return await work(tx);
      } catch (error) {
        persisted.splice(0, persisted.length, ...snapshot);
        throw error;
      }
    }) } as any;

    await expect(createRevisionDraft({
      companyId: "company-1",
      presupuestoId: source.id,
      expectedRevision: 3,
      actorUserId: "user-1",
      prisma,
    })).rejects.toThrow("audit failed");
    expect(persisted.map((item) => item.id)).toEqual([source.id]);
  });

  it("audits accepted revisions with actor, lineage, complete header, and item evidence", async () => {
    const source = record();
    const created = record({
      id: "budget-2", visibleNumber: null, sourcePresupuestoId: source.id,
      parentPresupuestoId: source.id, versionNumber: 2, slot: "DRAFT", revision: 1, state: "Borrador",
    });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "family-1" }]),
      presupuesto: {
        findFirst: vi.fn().mockResolvedValue(source),
        aggregate: vi.fn().mockResolvedValue({ _max: { versionNumber: 1 } }),
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const prisma = { $transaction: vi.fn((work: any) => work(tx)) } as any;

    await createRevisionDraft({ companyId: "company-1", presupuestoId: source.id, expectedRevision: 3, actorUserId: "user-1", prisma });

    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-1",
      userId: "user-1",
      entityId: "budget-2",
      oldValue: expect.objectContaining({ familyId: "family-1", branchId: "branch-1", items: [expect.objectContaining({ id: "item-1", description: "Implante" })] }),
      newValue: expect.objectContaining({ familyId: "family-1", parentPresupuestoId: source.id, sourcePresupuestoId: source.id, createdById: "user-1", items: [expect.objectContaining({ description: "Implante" })] }),
    }));
  });
});

describe("replaceDraft", () => {
  it("returns a deterministic stale conflict, records it, and performs no update", async () => {
    const stale = record({ slot: "DRAFT", state: "Borrador", revision: 2 });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "family-1" }]),
      presupuesto: { findFirst: vi.fn().mockResolvedValue(stale), updateMany: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((work: any) => work(tx)) } as any;

    await expect(replaceDraft({
      companyId: "company-1",
      presupuestoId: stale.id,
      expectedRevision: 1,
      actorUserId: "user-1",
      prisma,
      branchId: "branch-1",
      clientContactId: "client-1",
      payerContactId: "payer-1",
      documentDate: new Date(),
      paymentTerms: "Contado",
      priceListCode: "GENERAL",
      legend: "Commercial legend",
      validUntil: new Date(),
      commercial: { pricingMode: "FIRM", firmPrice: { coordinator: "A", quotationContact: "B", includedMaterials: [], excludedMaterials: [], availability: "Now", operationalClarifications: "None", surgicalAssumptions: "Known" } },
      items: [{ description: "A", quantity: "1", unitPrice: "1" }],
    })).rejects.toMatchObject({ status: 409, code: "presupuesto_conflict" });

    expect(tx.presupuesto.updateMany).not.toHaveBeenCalled();
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "presupuesto_conflict" }));
  });

  it("fails closed when the required conflict audit cannot be recorded", async () => {
    const stale = record({ slot: "DRAFT", state: "Borrador", revision: 2 });
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ id: "family-1" }]), presupuesto: { findFirst: vi.fn().mockResolvedValue(stale), updateMany: vi.fn() } };
    const prisma = { $transaction: vi.fn((work: any) => work(tx)) } as any;
    createAuditEvent.mockRejectedValueOnce(new Error("conflict audit unavailable"));

    await expect(replaceDraft({
      companyId: "company-1", presupuestoId: stale.id, expectedRevision: 1, actorUserId: "user-1", prisma,
      branchId: "branch-1", clientContactId: "client-1", payerContactId: "payer-1",
      documentDate: new Date(), paymentTerms: "Contado", priceListCode: "GENERAL", legend: "Commercial legend", validUntil: new Date(),
      commercial: { pricingMode: "FIRM", firmPrice: { coordinator: "A", quotationContact: "B", includedMaterials: [], excludedMaterials: [], availability: "Now", operationalClarifications: "None", surgicalAssumptions: "Known" } },
      items: [{ description: "A", quantity: "1", unitPrice: "1" }],
    })).rejects.toThrow("conflict audit unavailable");
    expect(tx.presupuesto.updateMany).not.toHaveBeenCalled();
  });
});

describe("emitDraft", () => {
  it("audits the post-replacement snapshot of the prior current version", async () => {
    const draft = record({ id: "budget-2", visibleNumber: 5, sourcePresupuestoId: "budget-1", parentPresupuestoId: "budget-1", versionNumber: 2, slot: "DRAFT", revision: 1, state: "Borrador" });
    const current = record({ id: "budget-1", state: "Emitido", revision: 2 });
    const replaced = record({ id: "budget-1", state: "Reemplazado", slot: "HISTORY", revision: 3 });
    const emitted = record({ ...draft, state: "Emitido", slot: "CURRENT", revision: 2 });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: "family-1" }]),
      presupuesto: {
        findFirst: vi.fn().mockResolvedValueOnce(draft).mockResolvedValueOnce(current).mockResolvedValueOnce(emitted),
        update: vi.fn().mockResolvedValue(replaced),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = { $transaction: vi.fn((work: any) => work(tx)) } as any;

    await emitDraft({ companyId: "company-1", presupuestoId: draft.id, expectedRevision: 1, actorUserId: "user-1", prisma });

    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "presupuesto_emitted",
      oldValue: expect.objectContaining({ priorCurrent: expect.objectContaining({ id: "budget-1", state: "Emitido", revision: 2 }) }),
      newValue: expect.objectContaining({ priorCurrent: expect.objectContaining({ id: "budget-1", state: "Reemplazado", slot: "HISTORY", revision: 3 }) }),
    }));
  });
});
