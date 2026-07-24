// OSSUM COR — Invoice service unit tests (Fase 1D)

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { createAuditEvent, markConsumoAsFacturado } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
  markConsumoAsFacturado: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ createAuditEvent }));
vi.mock("@/lib/services/consumo.service", () => ({ markConsumoAsFacturado }));

import {
  InvoiceError,
  calculateInvoiceTotals,
  createInvoice,
  deleteInvoice,
  emitInvoice,
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
  markConsumoAsFacturado.mockReset().mockResolvedValue(undefined);
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
    expect(tx.invoice.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "Borrador", base: "manual", balance: new Prisma.Decimal(100) }) }));
    expect(result.balance.toString()).toBe("100");
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice_created" }));
  });

  it("validates presupuesto id belongs to company", async () => {
    const tx = { invoice: { create: vi.fn(async ({ data }) => buildInvoice({ ...data, presupuestoId: "presupuesto-1" })) } };
    const prismaMock = { surgery: { findFirst: vi.fn() }, presupuesto: { findFirst: vi.fn().mockResolvedValue({ id: "presupuesto-1" }) }, consumo: { findFirst: vi.fn() }, $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    await createInvoice({ companyId: "company-1", base: "presupuesto", presupuestoId: "presupuesto-1", items: [{ description: "Item", quantity: "1" }], prisma: prismaMock });
    expect(prismaMock.presupuesto.findFirst).toHaveBeenCalledWith({ where: { id: "presupuesto-1", companyId: "company-1" }, select: { id: true, surgeryId: true } });
  });

  it("marks consumo as Facturado when base includes consumo", async () => {
    const tx = { invoice: { create: vi.fn(async ({ data }) => buildInvoice({ ...data, base: "consumo", consumoId: "consumo-1" })) } };
    const prismaMock = { surgery: { findFirst: vi.fn() }, presupuesto: { findFirst: vi.fn() }, consumo: { findFirst: vi.fn().mockResolvedValue({ id: "consumo-1" }) }, $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    await createInvoice({ companyId: "company-1", base: "consumo", consumoId: "consumo-1", items: [{ description: "Item", quantity: "1" }], createdById: "user-1", prisma: prismaMock });
    expect(markConsumoAsFacturado).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-1", consumoId: "consumo-1", prisma: tx }));
  });
});

describe("emitInvoice", () => {
  it("assigns visibleNumber and state Emitida", async () => {
    const tx = { $executeRaw: vi.fn(), $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(7) }]), invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice()), update: vi.fn(async ({ data }) => buildInvoice({ ...data })) } };
    const prismaMock = { $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    const result = await emitInvoice({ companyId: "company-1", invoiceId: "invoice-1", updatedById: "user-1", prisma: prismaMock });
    expect(result.visibleNumber).toBe(7);
    expect(result.state).toBe("Emitida");
  });
});

describe("updateInvoiceState", () => {
  it("rejects invalid transitions", async () => {
    const prismaMock = { invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice({ state: "Anulada" })) }, $transaction: vi.fn() } as any;
    await expect(updateInvoiceState({ companyId: "company-1", invoiceId: "invoice-1", newState: "Emitida", prisma: prismaMock })).rejects.toMatchObject({ code: "invalid_invoice_transition", status: 409 });
  });
});

describe("deleteInvoice", () => {
  it("deletes only Borrador", async () => {
    const tx = { invoice: { delete: vi.fn() } };
    const prismaMock = { invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice({ state: "Borrador" })) }, $transaction: vi.fn((cb: any) => cb(tx)) } as any;
    await expect(deleteInvoice({ companyId: "company-1", invoiceId: "invoice-1", prisma: prismaMock })).resolves.toEqual({ id: "invoice-1", deleted: true });
  });

  it("refuses delete when state is not Borrador", async () => {
    const prismaMock = { invoice: { findFirst: vi.fn().mockResolvedValue(buildInvoice({ state: "Emitida" })) }, $transaction: vi.fn() } as any;
    await expect(deleteInvoice({ companyId: "company-1", invoiceId: "invoice-1", prisma: prismaMock })).rejects.toMatchObject({ code: "invoice_not_deletable" });
  });

  it("InvoiceError carries code and status", () => {
    const e = new InvoiceError("x", "boom", 409);
    expect(e.code).toBe("x");
    expect(e.status).toBe(409);
  });
});
