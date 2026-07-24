// OSSUM COR — Payment service unit tests (Fase 1D)

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { createAuditEvent } = vi.hoisted(() => ({ createAuditEvent: vi.fn() }));

vi.mock("@/lib/audit", () => ({ createAuditEvent }));

import { PaymentError, cancelPayment, createPayment } from "@/lib/services/payment.service";

function buildInvoice(over: Record<string, any> = {}) {
  return { id: "invoice-1", companyId: "company-1", state: "Emitida", total: new Prisma.Decimal(100), balance: new Prisma.Decimal(100), ...over };
}

function buildPayment(over: Record<string, any> = {}) {
  return {
    id: "payment-1",
    visibleNumber: 1,
    companyId: "company-1",
    surgeryId: null,
    state: "Registrado",
    method: "transfer",
    currency: "ARS",
    amount: new Prisma.Decimal(50),
    receivedAt: new Date("2026-07-07T10:00:00.000Z"),
    createdById: "user-1",
    updatedById: null,
    metadata: null,
    createdAt: new Date("2026-07-07T10:00:00.000Z"),
    updatedAt: new Date("2026-07-07T10:00:00.000Z"),
    imputations: [{ id: "imp-1", invoiceId: "invoice-1", amount: new Prisma.Decimal(50), metadata: null }],
    ...over,
  };
}

beforeEach(() => {
  createAuditEvent.mockReset().mockResolvedValue(undefined);
});

describe("createPayment", () => {
  it("creates payment and imputation by invoiceId FK", async () => {
    const tx = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(3) }]),
      payment: { create: vi.fn(async ({ data }) => buildPayment({ visibleNumber: data.visibleNumber, amount: data.amount, imputations: data.imputations.create })) },
      invoice: {
        findFirst: vi.fn().mockResolvedValue(buildInvoice()),
        update: vi.fn(async ({ data }) => ({ ...buildInvoice(), ...data })),
      },
      paymentImputation: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal(50) } }) },
    };
    const prismaMock = {
      surgery: { findFirst: vi.fn() },
      invoice: { findMany: vi.fn().mockResolvedValue([buildInvoice()]) },
      $transaction: vi.fn((cb: any) => cb(tx)),
    } as any;

    const result = await createPayment({
      companyId: "company-1",
      amount: "50",
      imputations: [{ invoiceId: "invoice-1", amount: "50" }],
      createdById: "user-1",
      prisma: prismaMock,
    });

    expect(tx.payment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ visibleNumber: 3, imputations: { create: [expect.objectContaining({ invoiceId: "invoice-1", amount: expect.any(Prisma.Decimal) })] } }) }));
    expect(tx.paymentImputation.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { invoiceId: "invoice-1", payment: { state: "Registrado" } } }));
    expect(tx.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "invoice-1" }, data: expect.objectContaining({ paidTotal: new Prisma.Decimal(50), state: "Parcialmente_cobrada" }) }));
    expect(result.visibleNumber).toBe(3);
  });

  it("refuses over-imputation", async () => {
    const prismaMock = { surgery: { findFirst: vi.fn() }, invoice: { findMany: vi.fn().mockResolvedValue([buildInvoice({ balance: new Prisma.Decimal(40) })]) }, $transaction: vi.fn() } as any;
    await expect(createPayment({ companyId: "company-1", amount: "50", imputations: [{ invoiceId: "invoice-1", amount: "50" }], prisma: prismaMock })).rejects.toMatchObject({ code: "payment_over_imputation", status: 409 });
  });
});

describe("cancelPayment", () => {
  it("sets Anulado and recomputes invoice excluding cancelled payment", async () => {
    const tx = {
      payment: { update: vi.fn(async ({ data }) => buildPayment({ state: data.state })) },
      invoice: {
        findFirst: vi.fn().mockResolvedValue(buildInvoice({ total: new Prisma.Decimal(100), state: "Parcialmente_cobrada" })),
        update: vi.fn(async ({ data }) => ({ ...buildInvoice(), ...data })),
      },
      paymentImputation: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }) },
    };
    const prismaMock = {
      payment: { findFirst: vi.fn().mockResolvedValue(buildPayment({ imputations: [{ invoiceId: "invoice-1" }] })) },
      $transaction: vi.fn((cb: any) => cb(tx)),
    } as any;

    const result = await cancelPayment({ companyId: "company-1", paymentId: "payment-1", updatedById: "user-1", prisma: prismaMock });

    expect(result.state).toBe("Anulado");
    expect(tx.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paidTotal: new Prisma.Decimal(0), balance: new Prisma.Decimal(100), state: "Emitida" }) }));
  });

  it("PaymentError carries code and status", () => {
    const e = new PaymentError("x", "boom", 409);
    expect(e.code).toBe("x");
    expect(e.status).toBe(409);
  });
});
