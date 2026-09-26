import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { FiscalError, buildDevOnlyFiscalSnapshot, createDevOnlyFiscalDocument } from "@/lib/services/fiscal.service";

const policy = () => ({
  environment: "DEV_ONLY" as const,
  version: "fiscal-dev-only-v1" as const,
  documentType: "DEV_TEST_INVOICE",
  pointOfSale: "DEV-001",
  issuer: { taxId: "20-00000000-1", legalName: "DEV Issuer", vatCondition: "RESPONSABLE_INSCRIPTO" },
  recipient: { taxId: "27-00000000-2", legalName: "DEV Recipient", vatCondition: "CONSUMIDOR_FINAL" },
  ivaRate: "21.0000",
  rounding: { precision: 4 as const, mode: "HALF_UP" as const },
  dueDate: "2026-12-31",
});

const invoice = (state = "Emitida") => ({
  id: "invoice-1", visibleNumber: 7, companyId: "company-1", state, type: "FV", currency: "ARS",
  subtotal: new Prisma.Decimal("100"), discountTotal: new Prisma.Decimal("10"), taxTotal: new Prisma.Decimal("18.9"), total: new Prisma.Decimal("108.9"),
  items: [{ description: "DEV implant", quantity: new Prisma.Decimal("1"), unit: "unit", unitPrice: new Prisma.Decimal("100"), discount: new Prisma.Decimal("10"), tax: new Prisma.Decimal("18.9"), total: new Prisma.Decimal("108.9") }],
});

describe("DEV_ONLY fiscal eligibility and snapshots", () => {
  it("builds a detached immutable snapshot from an operationally emitted invoice", () => {
    const inputPolicy = policy();
    const snapshot = buildDevOnlyFiscalSnapshot(invoice(), inputPolicy);
    inputPolicy.issuer.legalName = "Changed after snapshot";

    expect(snapshot).toMatchObject({ environment: "DEV_ONLY", invoice: { id: "invoice-1", currency: "ARS" }, totals: { total: "108.9000" }, items: [{ total: "108.9000", ivaRate: "21.0000" }] });
    expect(snapshot.policy.issuer.legalName).toBe("DEV Issuer");
  });

  it("rejects a non-emitted invoice before a fiscal snapshot exists", () => {
    try {
      buildDevOnlyFiscalSnapshot(invoice("Borrador"), policy());
      throw new Error("Expected fiscal eligibility to reject Borrador");
    } catch (error) {
      expect(error).toMatchObject({ code: "fiscal_invoice_not_emitted", status: 422 } satisfies Partial<FiscalError>);
    }
  });
});

describe("DEV_ONLY fiscal persistence", () => {
  it("persists one READY document and issuance attempt without changing invoice state", async () => {
    const persisted = { id: "fiscal-1", state: "READY", attempts: [{ attemptNumber: 1, state: "READY" }] };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      invoice: { findFirst: vi.fn().mockResolvedValue(invoice()) },
      fiscalDocument: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(persisted) },
    };
    const prisma = { $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)) } as any;

    await expect(createDevOnlyFiscalDocument({ companyId: "company-1", invoiceId: "invoice-1", policy: policy(), prisma })).resolves.toEqual(persisted);
    const [{ data }] = tx.fiscalDocument.create.mock.calls[0];
    expect(data.environment).toBe("DEV_ONLY");
    expect(data.state).toBe("READY");
    expect(data.snapshot).toMatchObject({ invoice: { id: "invoice-1" } });
    expect(data.attempts.create).toMatchObject({ attemptNumber: 1, state: "READY" });
  });

  it("refuses a second fiscal request identity for the same invoice", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      invoice: { findFirst: vi.fn().mockResolvedValue(invoice()) },
      fiscalDocument: { findUnique: vi.fn().mockResolvedValue({ id: "fiscal-existing" }), create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)) } as any;

    await expect(createDevOnlyFiscalDocument({ companyId: "company-1", invoiceId: "invoice-1", policy: policy(), prisma })).rejects.toMatchObject({ code: "fiscal_document_already_exists" });
    expect(tx.fiscalDocument.create).not.toHaveBeenCalled();
  });
});
