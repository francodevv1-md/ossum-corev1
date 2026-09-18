/* eslint-disable @typescript-eslint/no-explicit-any -- Offline transaction double preserves actual producer writes. */
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/audit", () => ({ createAuditEvent: vi.fn().mockResolvedValue(undefined) }));
import * as budgetService from "@/lib/services/presupuesto.service";
import { createInvoiceFromSource } from "@/lib/services/invoice.service";
import { presupuestoCreateSchema, presupuestoExpectedRevisionSchema, presupuestoStateCommandSchema } from "@/lib/validators/presupuesto";

// Only database defaults are supplied here; all commercial fields, amounts and lifecycle
// changes come from the real producer. No hand-authored approved budget fixture.
function database() {
  const budgets: any[] = [];
  const invoices: any[] = [];
  const matches = (row: any, where: any) => Object.entries(where).every(([key, value]) => row[key] === value);
  const tx: any = {
    $queryRaw: vi.fn(async () => [{ id: "family", next: BigInt(1) }]),
    $executeRaw: vi.fn(),
    company: { findUnique: vi.fn(async () => ({ id: "company", name: "Test company" })) },
    branch: { findFirst: vi.fn(async () => ({ id: "branch", name: "Test branch" })) },
    contactCompanyLink: { findUnique: vi.fn(async ({ where }) => ({ isActive: true, contact: { id: where.contactId_companyId.contactId } })) },
    user: { findUnique: vi.fn(async () => ({ id: "actor", firstName: "Test", lastName: "Actor" })) },
    surgery: { findFirst: vi.fn(async () => ({ id: "surgery" })) },
    presupuestoFamily: { create: vi.fn(async () => ({ id: "family" })) },
    presupuesto: {
      create: vi.fn(async ({ data }) => {
        const row = { visibleNumber: null, parentPresupuestoId: null, sourcePresupuestoId: null,
          issuedAt: null, approvedAt: null, rejectedAt: null, metadata: null,
          createdAt: new Date(), updatedAt: new Date(), ...data, id: `budget-${budgets.length + 1}`,
          items: data.items.create.map((item: any, index: number) => ({ ...item, id: `item-${budgets.length}-${index}` })) };
        budgets.push(row);
        return row;
      }),
      findFirst: vi.fn(async ({ where }) => budgets.find((row) => matches(row, where)) ?? null),
      aggregate: vi.fn(async () => ({ _max: { versionNumber: Math.max(...budgets.map((row) => row.versionNumber)) } })),
      update: vi.fn(async ({ where, data }) => {
        const row = budgets.find((row) => matches(row, where));
        Object.assign(row, { ...data, revision: row.revision + data.revision.increment });
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        const row = budgets.find((row) => matches(row, where));
        if (!row) return { count: 0 };
        Object.assign(row, { ...data, revision: row.revision + (data.revision?.increment ?? 0) });
        return { count: 1 };
      }),
    },
    consumo: { findFirst: vi.fn(async () => ({ id: "consumption", surgeryId: "surgery", items: [
      { id: "consumed-line", sku: "SKU", description: "Consumed", consumedQuantity: new Prisma.Decimal(1), unit: "unit", metadata: null },
    ] })) },
    invoice: {
      findFirst: vi.fn(async () => invoices[0] ?? null),
      create: vi.fn(async ({ data }) => {
        const row = { ...data, id: "invoice", visibleNumber: null, issuedAt: null, cancelledAt: null,
          updatedById: null, createdAt: new Date(), updatedAt: new Date(), items: data.items.create };
        invoices.push(row);
        return row;
      }),
    },
  };
  return { tx, budgets, prisma: { $transaction: vi.fn(async (work) => work(tx)) } as any };
}

const draftInput = () => ({
  companyId: "company", surgeryId: "surgery", actorUserId: "actor", branchId: "branch",
  clientContactId: "client", payerContactId: "payer", documentDate: new Date("2026-09-16"),
  validUntil: new Date("2026-10-16"), paymentTerms: "Cash", priceListCode: "GENERAL",
  legend: budgetService.DISTRICORR_ESTIMATIVE_LEGEND, commercial: { pricingMode: "ESTIMATIVE" as const },
  generalDiscountRate: "5", items: [{ sku: "SKU", description: "Implant", quantity: "2", unitPrice: "100", discountRate: "10", taxRate: "21" }],
});

describe("recovered budget producer → unchanged Invoice consumer (offline)", () => {
  it("calculates canonical line/general discounts and VAT, not legacy amount defaults", () => {
    const result = budgetService.recalculatePresupuestoTotals(draftInput().items, "5");
    expect(result.total.toString()).toBe("206.91");
    expect(result.items[0].discountRate.toString()).toBe("10");
  });

  it.each([false, true])("feeds actual create/emit/approve rows to Invoice, consumption=%s", async (consumption) => {
    const { tx, budgets, prisma } = database();
    const draft = await budgetService.createFamilyDraft({ ...draftInput(), prisma });
    const command = { companyId: "company", presupuestoId: draft.id, actorUserId: "actor", prisma };
    expect(budgets[0]).toMatchObject({ familyId: "family", slot: "DRAFT", branchId: "branch", clientContactId: "client", payerContactId: "payer" });
    expect(budgets[0].commercialSnapshot).toMatchObject({ pricingMode: "ESTIMATIVE", client: { id: "client" } });
    await expect(createInvoiceFromSource({ ...command })).rejects.toMatchObject({ code: "invoice_presupuesto_not_eligible" });
    const emitted = await budgetService.emitDraft({ ...command, expectedRevision: draft.revision });
    await expect(createInvoiceFromSource({ ...command })).rejects.toMatchObject({ code: "invoice_presupuesto_not_eligible" });
    await budgetService.approve({ ...command, expectedRevision: emitted.revision });
    // Extra untrusted price input is ignored by the source consumer; only producer data is priced.
    const result = await createInvoiceFromSource({ ...command, ...(consumption ? { consumoId: "consumption" } : {}),
      items: [{ unitPrice: 999999 }], total: 999999 } as any);
    expect(result.total.toString()).toBe(consumption ? "103.455" : "206.91");
    expect(result.discountTotal.toString()).toBe(consumption ? "14.5" : "29");
    expect(result.items[0].unitPrice.toString()).toBe("100");
    expect(result.items[0].sourceType).toBe(consumption ? "consumo" : "presupuesto");
    expect(tx.presupuesto.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: draft.id, companyId: "company", state: "Aprobado", slot: "CURRENT" } }));
    await expect(createInvoiceFromSource({ ...command })).rejects.toMatchObject({ code: "invoice_source_already_invoiced" });
    expect(tx.invoice.create).toHaveBeenCalledTimes(1);
  });

  it("rejects missing commercial references and client-computed amounts at the API boundary", () => {
    const { companyId: _company, actorUserId: _actor, ...body } = draftInput();
    expect(presupuestoCreateSchema.safeParse(body).success).toBe(true);
    expect(presupuestoCreateSchema.safeParse({ ...body, branchId: undefined }).success).toBe(false);
    expect(presupuestoCreateSchema.safeParse({ ...body, total: "1" }).success).toBe(false);
    expect(presupuestoCreateSchema.safeParse({ ...body, items: [{ ...body.items[0], discount: "1", tax: "1" }] }).success).toBe(false);
    expect(presupuestoExpectedRevisionSchema.safeParse({}).success).toBe(false);
    expect(presupuestoExpectedRevisionSchema.safeParse({ expectedRevision: 1, items: body.items }).success).toBe(false);
    expect(presupuestoStateCommandSchema.safeParse({ expectedRevision: 1, newState: "Aprobado" }).success).toBe(false);
  });

  it("keeps current on revision, rejects stale/foreign commands, replaces only on emission", async () => {
    const { tx, budgets, prisma } = database();
    const draft = await budgetService.createFamilyDraft({ ...draftInput(), prisma });
    const command = { companyId: "company", presupuestoId: draft.id, actorUserId: "actor", prisma };
    const emitted = await budgetService.emitDraft({ ...command, expectedRevision: draft.revision });
    const approved = await budgetService.approve({ ...command, expectedRevision: emitted.revision });
    await expect(budgetService.createRevisionDraft({ ...command, expectedRevision: 1 })).rejects.toMatchObject({ code: "presupuesto_conflict" });
    await expect(budgetService.createRevisionDraft({ ...command, companyId: "foreign", expectedRevision: approved.revision })).rejects.toMatchObject({ code: "presupuesto_not_found" });
    const revision = await budgetService.createRevisionDraft({ ...command, expectedRevision: approved.revision });
    expect(budgets[0]).toMatchObject({ slot: "CURRENT", state: "Aprobado", revision: approved.revision });
    expect(budgets[1]).toMatchObject({ slot: "DRAFT", sourcePresupuestoId: approved.id, generalDiscountRate: budgets[0].generalDiscountRate, commercialSnapshot: budgets[0].commercialSnapshot });
    expect(tx.presupuesto.update).not.toHaveBeenCalled();
    await budgetService.emitDraft({ ...command, presupuestoId: revision.id, expectedRevision: revision.revision });
    expect(budgets[0]).toMatchObject({ slot: "HISTORY", state: "Reemplazado" });
    expect(budgets[1]).toMatchObject({ slot: "CURRENT", state: "Emitido" });
    await expect(createInvoiceFromSource(command)).rejects.toMatchObject({ code: "invoice_presupuesto_not_eligible" });
    await expect(createInvoiceFromSource({ ...command, presupuestoId: revision.id })).rejects.toMatchObject({ code: "invoice_presupuesto_not_eligible" });
    expect(tx.invoice.create).not.toHaveBeenCalled();
  });

  it("pins both recovered SQL artifacts byte-for-byte without executing SQL", () => {
    for (const [name, hash] of [
      ["20260831010000_presupuesto_authority_unification_dev_001", "0c9cb55bfc5b5c2a9246cbbd4878e03ac5e768c656472186efc0fb3bed0664e3"],
      ["20260831073000_presupuesto_authority_corrective_dev_001", "9cb832c817a905fb280b1fab6c4ab451c797631954d202e52f1a61efad79c8b0"],
    ]) {
      expect(createHash("sha256").update(readFileSync(`prisma/migrations/${name}/migration.sql`)).digest("hex")).toBe(hash);
    }
  });
});
