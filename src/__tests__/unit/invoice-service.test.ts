/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma transaction mocks use intentionally partial dynamic clients. */
// OSSUM COR — Invoice service unit tests (Fase 1D)

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { errorResponse } from "@/lib/api/responses";

const { createAuditEvent } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
}));
const { assertFiscalCancellationAllowed } = vi.hoisted(() => ({
  assertFiscalCancellationAllowed: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ createAuditEvent }));
vi.mock("@/lib/services/fiscal.service", () => ({ assertFiscalCancellationAllowed }));

import {
  InvoiceError,
  calculateInvoiceTotals,
  createInvoice,
  createInvoiceFromSource,
  deleteInvoice,
  emitInvoice,
  recomputeInvoicePaymentState,
  updateInvoiceState,
} from "@/lib/services/invoice.service";

function buildInvoice(over: Record<string, any> = {}) {
  return {
    id: "invoice-1",
    visibleNumber: null,
    companyId: "company-1",
    surgeryId: "sx-1",
    presupuestoId: null,
    consumoId: null,
    base: "manual",
    state: "Borrador",
    type: "FV",
    currency: "ARS",
    subtotal: new Prisma.Decimal(100),
    discountTotal: new Prisma.Decimal(0),
    taxTotal: new Prisma.Decimal(21),
    total: new Prisma.Decimal(121),
    paidTotal: new Prisma.Decimal(0),
    balance: new Prisma.Decimal(121),
    issuedAt: null,
    cancelledAt: null,
    createdById: "user-1",
    updatedById: null,
    metadata: null,
    createdAt: new Date("2026-07-07T10:00:00.000Z"),
    updatedAt: new Date("2026-07-07T10:00:00.000Z"),
    items: [],
    ...over,
  };
}

beforeEach(() => {
  createAuditEvent.mockReset().mockResolvedValue(undefined);
  assertFiscalCancellationAllowed.mockReset().mockResolvedValue(undefined);
});

describe("calculateInvoiceTotals", () => {
  it("calculates decimal-friendly totals", () => {
    const result = calculateInvoiceTotals([
      { description: "A", quantity: "2", unitPrice: "100", discount: "10", tax: "21" },
      { description: "B", quantity: "1", unitPrice: "50", discount: "0", tax: "10.5" },
    ]);
    expect(result.subtotal.toString()).toBe("250");
    expect(result.discountTotal.toString()).toBe("10");
    expect(result.taxTotal.toString()).toBe("31.5");
    expect(result.total.toString()).toBe("271.5");
  });
});

describe("createInvoice", () => {
  it("creates manual invoice as Borrador with balance = total", async () => {
    const tx = { invoice: { create: vi.fn(async ({ data }) => buildInvoice({ ...data, items: data.items.create })) } };
    const prismaMock = { surgery: { findFirst: vi.fn().mockResolvedValue({ id: "sx-1" }) }, presupuesto: { findFirst: vi.fn() }, consumo: { findFirst: vi.fn() }, $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    const result = await createInvoice({ companyId: "company-1", surgeryId: "sx-1", items: [{ description: "Item", quantity: "1", unitPrice: "100" }], createdById: "user-1", prisma: prismaMock });
    expect(tx.invoice.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "Borrador", base: "manual", balance: new Prisma.Decimal(121) }) }));
    expect(result.balance.toString()).toBe("121");
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice_created" }));
  });

  it("validates presupuesto id belongs to company", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), $executeRaw: vi.fn().mockResolvedValue(1), invoice: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }) => buildInvoice({ ...data, presupuestoId: "presupuesto-1" })) } };
    const prismaMock = { surgery: { findFirst: vi.fn() }, presupuesto: { findFirst: vi.fn().mockResolvedValue({ id: "presupuesto-1" }) }, consumo: { findFirst: vi.fn() }, $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    await createInvoice({ companyId: "company-1", base: "presupuesto", presupuestoId: "presupuesto-1", items: [{ description: "Item", quantity: "1" }], prisma: prismaMock });
    expect(prismaMock.presupuesto.findFirst).toHaveBeenCalledWith({ where: { id: "presupuesto-1", companyId: "company-1" }, select: { id: true, surgeryId: true } });
  });

  it("keeps consumo Validado while a consumption-linked invoice is Borrador", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), $executeRaw: vi.fn().mockResolvedValue(1), consumo: { updateMany: vi.fn() }, invoice: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }) => buildInvoice({ ...data, base: "consumo", consumoId: "consumo-1" })) } };
    const prismaMock = { surgery: { findFirst: vi.fn() }, presupuesto: { findFirst: vi.fn() }, consumo: { findFirst: vi.fn().mockResolvedValue({ id: "consumo-1" }) }, $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    await createInvoice({ companyId: "company-1", base: "consumo", consumoId: "consumo-1", items: [{ description: "Item", quantity: "1" }], createdById: "user-1", prisma: prismaMock });
    expect(tx.consumo.updateMany).not.toHaveBeenCalled();
  });
});

describe("createInvoiceFromSource", () => {
  const budget = (over: Record<string, any> = {}) => ({
    id: "budget-real",
    surgeryId: "surgery-real",
    currency: "ARS",
    generalDiscountRate: new Prisma.Decimal(0),
    total: new Prisma.Decimal("108.9000"),
    items: [{
      id: "budget-item-real",
      sku: "SKU-1",
      description: "Implante real",
      quantity: new Prisma.Decimal("1"),
      unit: "unidad",
      unitPrice: new Prisma.Decimal("100.0000"),
      discountRate: new Prisma.Decimal("10.0000"),
      discount: new Prisma.Decimal("10.0000"),
      taxRate: new Prisma.Decimal("21.0000"),
      tax: new Prisma.Decimal("18.9000"),
      metadata: { catalogItemId: "catalog-real" },
    }],
    ...over,
  });

  function sourcePrisma(sourceBudget: ReturnType<typeof budget>, consumo?: Record<string, any>) {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]), $executeRaw: vi.fn().mockResolvedValue(1),
      presupuesto: { findFirst: vi.fn().mockResolvedValue(sourceBudget) },
      consumo: { findFirst: vi.fn().mockResolvedValue(consumo) },
      invoice: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }) => buildInvoice({ ...data, items: data.items.create })),
      },
    };
    return {
      tx,
      prisma: {
        surgery: { findFirst: vi.fn().mockResolvedValue({ id: sourceBudget.surgeryId }) },
        presupuesto: { findFirst: vi.fn().mockResolvedValueOnce(sourceBudget).mockResolvedValue({ id: sourceBudget.id, surgeryId: sourceBudget.surgeryId }) },
        consumo: { findFirst: vi.fn().mockResolvedValueOnce(consumo).mockResolvedValue({ id: consumo?.id, surgeryId: consumo?.surgeryId }) },
        $transaction: vi.fn((cb: any) => cb(tx)),
      } as any,
    };
  }

  it("creates a presupuesto draft from real backend ids and server-owned lines", async () => {
    const { prisma, tx } = sourcePrisma(budget());
    const result = await createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", createdById: "user-1", prisma });

    expect(result).toMatchObject({ surgeryId: "surgery-real", presupuestoId: "budget-real", base: "presupuesto", state: "Borrador" });
    expect(tx.invoice.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      surgeryId: "surgery-real",
      presupuestoId: "budget-real",
      currency: "ARS",
      items: { create: [expect.objectContaining({ sourceType: "presupuesto", sourceItemId: "budget-item-real" })] },
    }) }));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const [sql, ...params] = tx.$executeRaw.mock.calls[0];
    expect(Array.from(sql).join("?")).toBe("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))");
    expect(params).toEqual(["company-1:presupuesto:budget-real"]);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.findFirst.mock.invocationCallOrder[0]);
  });

  it("exposes duplicate source rejection as API 409 rather than a generic 500", async () => {
    const { prisma, tx } = sourcePrisma(budget());
    tx.invoice.findFirst.mockResolvedValue({ id: "existing-exact-source" });
    const caught = await createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", prisma }).catch(error => error);
    const response = errorResponse(caught);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "invoice_source_already_invoiced" } });
    expect(tx.invoice.create).not.toHaveBeenCalled();
  });

  it("reconciles persisted discounts including nonzero general discount to the exact approved total", async () => {
    const approved = budget({
      generalDiscountRate: new Prisma.Decimal("5.0000"),
      total: new Prisma.Decimal("103.4550"),
      items: [{
        ...budget().items[0],
        discount: new Prisma.Decimal("14.5000"),
        tax: new Prisma.Decimal("17.9550"),
      }],
    });
    const { prisma, tx } = sourcePrisma(approved);

    const result = await createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", prisma });

    expect(result.total.toString()).toBe("103.455");
    expect(tx.presupuesto.findFirst).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ total: true }) }));
  });

  it("rejects presupuesto-only source drift from the approved total", async () => {
    const { prisma, tx } = sourcePrisma(budget({ total: new Prisma.Decimal("999.0000") }));

    await expect(createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", prisma })).rejects.toMatchObject({
      code: "invoice_presupuesto_total_mismatch",
      status: 409,
    });
    expect(tx.invoice.create).not.toHaveBeenCalled();
  });

  it("locks and revalidates source rows through the transaction client before creating", async () => {
    const { prisma, tx } = sourcePrisma(budget());

    await createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", prisma });

    expect(prisma.presupuesto.findFirst).not.toHaveBeenCalled();
    expect(tx.presupuesto.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "budget-real", companyId: "company-1", state: "Aprobado" },
    }));
    const [lockSql, ...lockParams] = tx.$queryRaw.mock.calls[0];
    expect(Array.from(lockSql).join("?")).toContain('FROM "presupuesto" WHERE "id" = ? AND "companyId" = ? FOR UPDATE');
    expect(lockParams).toEqual(["budget-real", "company-1"]);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.presupuesto.findFirst.mock.invocationCallOrder[0]);
    expect(tx.presupuesto.findFirst.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.create.mock.invocationCallOrder[0]);
  });

  it("rejects a source that is no longer approved CURRENT when re-read after locking", async () => {
    const { prisma, tx } = sourcePrisma(budget());
    tx.presupuesto.findFirst.mockResolvedValue(null);

    await expect(createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", prisma })).rejects.toMatchObject({
      code: "invoice_presupuesto_not_eligible",
    });

    expect(prisma.presupuesto.findFirst).not.toHaveBeenCalled();
    expect(tx.invoice.create).not.toHaveBeenCalled();
  });

  it("prices validated consumption with Decimal(18,4) ROUND_HALF_UP without Number", async () => {
    const preciseBudget = budget({
      generalDiscountRate: new Prisma.Decimal("0"),
      items: [{
        ...budget().items[0],
        unitPrice: new Prisma.Decimal("1.2345"),
        discount: new Prisma.Decimal("0"),
        discountRate: new Prisma.Decimal("0"),
        tax: new Prisma.Decimal("0"),
        taxRate: new Prisma.Decimal("0"),
        vatRate: new Prisma.Decimal("0"),
      }],
    });
    const consumo = {
      id: "consumo-real",
      surgeryId: "surgery-real",
      items: [{
        id: "consumo-item-real",
        sku: " sku-1 ",
        description: "Implante consumido",
        consumedQuantity: new Prisma.Decimal("9007199254740.0001"),
        unit: "unidad",
        metadata: { lot: "LOT-1" },
      }],
    };
    const { prisma, tx } = sourcePrisma(preciseBudget, consumo);
    const result = await createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", consumoId: "consumo-real", prisma });

    expect(result).toMatchObject({ surgeryId: "surgery-real", presupuestoId: "budget-real", consumoId: "consumo-real", base: "mixto" });
    expect(result.total.toString()).toBe("11119387479976.5301");
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(tx.$executeRaw.mock.calls.map((call) => call.slice(1))).toEqual([
      ["company-1:consumo:consumo-real"], ["company-1:presupuesto:budget-real"],
    ]);
    expect(tx.$executeRaw.mock.invocationCallOrder[1]).toBeLessThan(tx.invoice.findFirst.mock.invocationCallOrder[0]);
    expect(tx.invoice.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      items: { create: [expect.objectContaining({
        sourceType: "consumo",
        sourceItemId: "consumo-item-real",
        metadata: expect.objectContaining({ presupuestoItemId: "budget-item-real", consumoId: "consumo-real" }),
      })] },
    }) }));
  });

  it("rejects mismatched, unpriced, and already-invoiced sources", async () => {
    const mismatched = sourcePrisma(budget(), { id: "consumo-real", surgeryId: "other-surgery", items: [] });
    await expect(createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", consumoId: "consumo-real", prisma: mismatched.prisma })).rejects.toMatchObject({ code: "invoice_source_surgery_mismatch" });

    const unpriced = sourcePrisma(budget(), { id: "consumo-real", surgeryId: "surgery-real", items: [{ id: "line-x", sku: "UNKNOWN", description: "Unknown", consumedQuantity: new Prisma.Decimal(1), unit: null, metadata: null }] });
    await expect(createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", consumoId: "consumo-real", prisma: unpriced.prisma })).rejects.toMatchObject({ code: "invoice_consumo_item_unpriced" });

    const invoiced = sourcePrisma(budget());
    invoiced.tx.invoice.findFirst.mockResolvedValue({ id: "invoice-active" });
    await expect(createInvoiceFromSource({ companyId: "company-1", presupuestoId: "budget-real", prisma: invoiced.prisma })).rejects.toMatchObject({ code: "invoice_source_already_invoiced", status: 409 });
  });
});

describe("emitInvoice", () => {
  it("assigns visibleNumber and state Emitida", async () => {
    const tx = { $executeRaw: vi.fn(), $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(7) }]), invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice()), update: vi.fn(async ({ data }) => buildInvoice({ ...data })) } };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    const result = await emitInvoice({ companyId: "company-1", invoiceId: "invoice-1", updatedById: "user-1", prisma: prismaMock });
    expect(result.visibleNumber).toBe(7);
    expect(result.state).toBe("Emitida");
    const [lockSql, ...lockParams] = tx.$queryRaw.mock.calls[0];
    expect(Array.from(lockSql).join("?")).toContain('FROM "invoice" WHERE "id" = ? AND "companyId" = ? FOR UPDATE');
    expect(lockParams).toEqual(["invoice-1", "company-1"]);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.findFirst.mock.invocationCallOrder[0]);
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  });

  it("marks a linked Validado consumo as Facturado only when emitting", async () => {
    const current = buildInvoice({ consumoId: "consumo-1", base: "mixto" });
    const tx = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(8) }]),
      consumo: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      invoice: { findFirst: vi.fn().mockResolvedValue(current), update: vi.fn(async ({ data }) => buildInvoice({ ...current, ...data })) },
    };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;

    await emitInvoice({ companyId: "company-1", invoiceId: "invoice-1", updatedById: "user-1", prisma: prismaMock });

    expect(tx.consumo.updateMany).toHaveBeenCalledWith({
      where: { id: "consumo-1", companyId: "company-1", state: "Validado" },
      data: { state: "Facturado", facturedAt: expect.any(Date), updatedById: "user-1" },
    });
  });
});

describe("updateInvoiceState", () => {
  it("rejects Borrador to Emitida so emission only occurs through emitInvoice", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice({ state: "Borrador" })), update: vi.fn() },
    };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;

    await expect(updateInvoiceState({ companyId: "company-1", invoiceId: "invoice-1", newState: "Emitida", prisma: prismaMock })).rejects.toMatchObject({ code: "invalid_invoice_transition", status: 409 });
    expect(tx.invoice.update).not.toHaveBeenCalled();
  });

  it("rejects invalid transitions", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice({ state: "Anulada" })) } };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    await expect(updateInvoiceState({ companyId: "company-1", invoiceId: "invoice-1", newState: "Emitida", prisma: prismaMock })).rejects.toMatchObject({ code: "invalid_invoice_transition", status: 409 });
  });

  it("annuls a consumption-linked draft without restoring consumo", async () => {
    const current = buildInvoice({ state: "Borrador", consumoId: "consumo-1", base: "mixto" });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      consumo: { updateMany: vi.fn() },
      invoice: { findFirst: vi.fn().mockResolvedValue(current), update: vi.fn(async ({ data }) => buildInvoice({ ...current, ...data })) },
    };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;

    await updateInvoiceState({ companyId: "company-1", invoiceId: "invoice-1", newState: "Anulada", updatedById: "user-1", prisma: prismaMock });

    expect(assertFiscalCancellationAllowed).toHaveBeenCalledWith(tx, "company-1", "invoice-1");
    expect(tx.consumo.updateMany).not.toHaveBeenCalled();
  });

  it("restores only the matching Facturado consumo when an emitted invoice is annulled", async () => {
    const current = buildInvoice({ state: "Emitida", consumoId: "consumo-1", base: "mixto" });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      consumo: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      invoice: { findFirst: vi.fn().mockResolvedValue(current), update: vi.fn(async ({ data }) => buildInvoice({ ...current, ...data })) },
    };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;

    await updateInvoiceState({ companyId: "company-1", invoiceId: "invoice-1", newState: "Anulada", updatedById: "user-1", prisma: prismaMock });

    expect(tx.consumo.updateMany).toHaveBeenCalledWith({
      where: { id: "consumo-1", companyId: "company-1", state: "Facturado" },
      data: { state: "Validado", facturedAt: null, updatedById: "user-1" },
    });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.findFirst.mock.invocationCallOrder[0]);
    expect(tx.invoice.findFirst.mock.invocationCallOrder[0]).toBeLessThan(tx.consumo.updateMany.mock.invocationCallOrder[0]);
  });

  it("locks the company-scoped invoice row before reading and changing state", async () => {
    const current = buildInvoice({ state: "Borrador" });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      invoice: { findFirst: vi.fn().mockResolvedValue(current), update: vi.fn(async ({ data }) => buildInvoice({ ...current, ...data })) },
    };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;

    await updateInvoiceState({ companyId: "company-1", invoiceId: "invoice-1", newState: "Anulada", prisma: prismaMock });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const [lockSql, ...lockParams] = tx.$queryRaw.mock.calls[0];
    expect(Array.from(lockSql).join("?")).toContain('FROM "invoice" WHERE "id" = ? AND "companyId" = ? FOR UPDATE');
    expect(lockParams).toEqual(["invoice-1", "company-1"]);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.findFirst.mock.invocationCallOrder[0]);
  });
});

describe("recomputeInvoicePaymentState", () => {
  it("locks before reading and preserves Anulada after payment recompute", async () => {
    const current = buildInvoice({ state: "Anulada" });
    const db = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      invoice: {
        findFirst: vi.fn().mockResolvedValue(current),
        update: vi.fn(async ({ data }) => buildInvoice({ ...current, ...data })),
      },
      paymentImputation: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal("50") } }) },
    } as any;

    await recomputeInvoicePaymentState({ companyId: "company-1", invoiceId: "invoice-1", prisma: db });

    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.invoice.findFirst.mock.invocationCallOrder[0]);
    expect(db.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "Anulada" }) }));
  });
});

describe("deleteInvoice", () => {
  it("deletes only Borrador", async () => {
    const current = buildInvoice({ state: "Borrador", consumoId: "consumo-1" });
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), consumo: { updateMany: vi.fn() }, invoice: { findFirst: vi.fn().mockResolvedValue(current), delete: vi.fn() } };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    await expect(deleteInvoice({ companyId: "company-1", invoiceId: "invoice-1", prisma: prismaMock })).resolves.toEqual({ id: "invoice-1", deleted: true });
    expect(tx.consumo.updateMany).not.toHaveBeenCalled();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.findFirst.mock.invocationCallOrder[0]);
    expect(tx.invoice.findFirst.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.delete.mock.invocationCallOrder[0]);
  });

  it("refuses delete when state is not Borrador", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice({ state: "Emitida" })), delete: vi.fn() } };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    await expect(deleteInvoice({ companyId: "company-1", invoiceId: "invoice-1", prisma: prismaMock })).rejects.toMatchObject({ code: "invoice_not_deletable" });
    expect(tx.invoice.delete).not.toHaveBeenCalled();
  });

  it("locks and re-reads inside the transaction so concurrent emission prevents stale delete", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      invoice: {
        findFirst: vi.fn().mockResolvedValue(buildInvoice({ state: "Emitida" })),
        delete: vi.fn(),
      },
    };
    const prismaMock = {
      invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice({ state: "Borrador" })) },
      $transaction: vi.fn((cb: any) => cb(tx)),
    } as any;

    await expect(deleteInvoice({ companyId: "company-1", invoiceId: "invoice-1", prisma: prismaMock })).rejects.toMatchObject({ code: "invoice_not_deletable" });

    expect(prismaMock.invoice.findFirst).not.toHaveBeenCalled();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.findFirst.mock.invocationCallOrder[0]);
    expect(tx.invoice.delete).not.toHaveBeenCalled();
  });

  it("InvoiceError carries code and status", () => {
    const e = new InvoiceError("x", "boom", 409);
    expect(e.code).toBe("x");
    expect(e.status).toBe(409);
  });
});
