import { describe, expect, it, vi } from "vitest";

import { assertFiscalCancellationAllowed } from "@/lib/services/fiscal.service";

describe("fiscal cancellation guard", () => {
  it("blocks cancellation while company-scoped fiscal evidence is active", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "fiscal-1", state: "UNKNOWN" });

    await expect(assertFiscalCancellationAllowed({ fiscalDocument: { findFirst } } as never, "company-1", "invoice-1"))
      .rejects.toMatchObject({ code: "fiscal_cancellation_blocked", status: 409 });
    expect(findFirst).toHaveBeenCalledWith({
      where: { companyId: "company-1", invoiceId: "invoice-1", state: { in: ["SUBMITTED", "PENDING", "UNKNOWN", "AUTHORIZED"] } },
      select: { id: true, state: true },
    });
  });

  it("allows cancellation when no active fiscal evidence exists", async () => {
    await expect(assertFiscalCancellationAllowed({ fiscalDocument: { findFirst: vi.fn().mockResolvedValue(null) } } as never, "company-1", "invoice-1"))
      .resolves.toBeUndefined();
  });
});
