import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createPayment,
  cancelPayment,
} from "@/lib/services/payment.service";

describe("ERP Backend - Billing & Payments Domain Engine", () => {
  const companyId = "company-tenant-101";
  const userId = "user-billing-101";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Payments - Input Validation & Imputation Integrity", () => {
    it("rejects non-positive payment amount", async () => {
      const mockPrisma = {} as any;
      await expect(
        createPayment({
          companyId,
          amount: 0,
          prisma: mockPrisma,
        })
      ).rejects.toThrow(/amount must be positive/);
    });

    it("rejects duplicate invoiceId within the same payment imputations list", async () => {
      const mockPrisma = {} as any;
      await expect(
        createPayment({
          companyId,
          amount: 1000,
          imputations: [
            { invoiceId: "inv-1", amount: 500 },
            { invoiceId: "inv-1", amount: 500 }, // Duplicate!
          ],
          prisma: mockPrisma,
        })
      ).rejects.toThrow(/duplicate invoiceId in imputations/);
    });

    it("rejects payment imputation exceeding total payment amount", async () => {
      const mockPrisma = {} as any;
      await expect(
        createPayment({
          companyId,
          amount: 1000,
          imputations: [
            { invoiceId: "inv-1", amount: 700 },
            { invoiceId: "inv-2", amount: 600 }, // 1300 > 1000!
          ],
          prisma: mockPrisma,
        })
      ).rejects.toThrow(/total imputations cannot exceed payment amount/);
    });

    it("rejects imputation to an invoice in Borrador or Anulada state", async () => {
      const mockPrisma = {
        invoice: {
          findMany: vi.fn().mockResolvedValue([
            { id: "inv-draft", balance: new Prisma.Decimal(1000), state: "Borrador" },
          ]),
        },
      } as any;

      await expect(
        createPayment({
          companyId,
          amount: 500,
          imputations: [{ invoiceId: "inv-draft", amount: 500 }],
          prisma: mockPrisma,
        })
      ).rejects.toThrow(/Cannot impute invoice in state Borrador/);
    });

    it("rejects over-imputation exceeding invoice remaining balance", async () => {
      const mockPrisma = {
        invoice: {
          findMany: vi.fn().mockResolvedValue([
            { id: "inv-low-balance", balance: new Prisma.Decimal(300), state: "Emitida" },
          ]),
        },
      } as any;

      await expect(
        createPayment({
          companyId,
          amount: 1000,
          imputations: [{ invoiceId: "inv-low-balance", amount: 500 }], // 500 > balance 300!
          prisma: mockPrisma,
        })
      ).rejects.toThrow(/Imputation exceeds invoice balance/);
    });
  });

  describe("2. Payment Cancellation & Reversion", () => {
    it("cancelPayment sets state to Anulado, triggers audit and recomputes invoice state", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        payment: {
          update: vi.fn().mockResolvedValue({
            id: "pay-100",
            visibleNumber: 42,
            companyId,
            state: "Anulado",
            amount: new Prisma.Decimal(1000),
            imputations: [{ invoiceId: "inv-100", amount: new Prisma.Decimal(1000) }],
          }),
        },
        auditEvent: {
          create: vi.fn(),
        },
        internalNotification: {
          create: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        userCompanyAccess: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        notificationPreference: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        paymentImputation: {
          aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal(0) } }),
        },
        invoice: {
          findFirst: vi.fn().mockResolvedValue({
            id: "inv-100",
            companyId,
            total: new Prisma.Decimal(1000),
            payments: [],
          }),
          update: vi.fn(),
        },
      };

      const mockPrisma = {
        payment: {
          findFirst: vi.fn().mockResolvedValue({
            id: "pay-100",
            companyId,
            state: "Registrado",
            imputations: [{ invoiceId: "inv-100" }],
          }),
        },
        $transaction: vi.fn(async (cb: any) => cb(mockTx)),
      } as any;

      const cancelled = await cancelPayment({
        companyId,
        paymentId: "pay-100",
        updatedById: userId,
        prisma: mockPrisma,
      });

      expect(cancelled.state).toBe("Anulado");
      expect(mockTx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-100" },
          data: expect.objectContaining({
            state: "Anulado",
            updatedById: userId,
          }),
        })
      );
    });
  });
});
