import { describe, expect, it, vi } from "vitest";
import { captureReceiptScan, getReceiptForOperation, resolveReceiptScan, scanReceipt } from "@/lib/services/receipt.service";

const article = { id: "article-1", sku: "BIO-1", description: "BIOPROTECE implant" };
const receipt = { id: "receipt-1" };

describe("receipt unit scans", () => {
  it("hydrates unresolved scans and the next guided trace action for resuming", async () => {
    const line = { id: "line-1", scans: [] };
    const db = { goodsReceipt: { findFirst: vi.fn().mockResolvedValue({
      ...receipt,
      lines: [line],
      scanEvents: [{ id: "scan-1", lineId: line.id, resolutionStatus: "PENDING_TRACE", candidates: [], lotCode: null, serialNumber: null, expirationDate: null, article: { tracePolicies: [{ minimumRequirement: "LOT", expirationRequired: false }] } }],
    }) } };

    const result = await getReceiptForOperation(db as never, "company-1", receipt.id);

    expect(result.pendingScans).toEqual([expect.objectContaining({ status: "PENDING_TRACE", nextAction: "lot", line })]);
  });

  it("reuses the matching expected remittance line instead of creating a false surplus", async () => {
    const expectedLine = { id: "expected-line", articleId: null, expectedCode: "BIO-1", receivedQuantity: "0" };
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      articleIdentifier: { findMany: vi.fn().mockResolvedValue([{ article, type: "ALTERNATIVE_CODE", value: "BIO-1" }]) },
      article: { findUniqueOrThrow: vi.fn().mockResolvedValue({ ...article, tracePolicies: [{ minimumRequirement: "NONE", expirationRequired: false }] }) },
      goodsReceiptLine: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([expectedLine]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ ...expectedLine, articleId: article.id }),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({ id: "surplus-line" }),
        update: vi.fn().mockResolvedValue({ ...expectedLine, articleId: article.id, receivedQuantity: "1" }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ ...expectedLine, articleId: article.id }),
      },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-1" }), findFirst: vi.fn().mockResolvedValue({ id: "scan-1", articleId: article.id, lineId: expectedLine.id, lotCode: null, serialNumber: null, expirationDate: null }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn().mockResolvedValue({ id: "scan-1", resolutionStatus: "RESOLVED" }) },
    };

    const result = await scanReceipt({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", receipt.id, "user-1", { rawValue: "BIO-1" });

    expect(result).toMatchObject({ line: { id: expectedLine.id } });
    expect(tx.goodsReceiptLine.create).not.toHaveBeenCalled();
  });

  it("resolves a known BIOPROTECE AI(22) scan and increments its aggregate line once", async () => {
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      articleIdentifier: { findMany: vi.fn().mockResolvedValue([{ article }]) },
      article: { findUniqueOrThrow: vi.fn().mockResolvedValue({ ...article, tracePolicies: [{ minimumRequirement: "NONE", expirationRequired: false }] }) },
      goodsReceiptLine: { findFirst: vi.fn().mockResolvedValue({ id: "line-1" }), update: vi.fn().mockResolvedValue({ id: "line-1", receivedQuantity: "1" }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "line-1" }) },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-1" }), findFirst: vi.fn().mockResolvedValue({ id: "scan-1", articleId: "article-1", lineId: "line-1", lotCode: null, serialNumber: null, expirationDate: null }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn().mockResolvedValue({ id: "scan-1", resolutionStatus: "RESOLVED" }) },
    };
    const result = await scanReceipt({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "user-1", { rawValue: "(21)S-1(17)250431(10)L-1(22)22152BP" });

    expect(result).toMatchObject({ status: "RESOLVED", line: { id: "line-1" } });
    expect(tx.articleIdentifier.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: "GS1_AI_22" }) }));
    expect(tx.goodsReceiptLine.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ receivedQuantity: { increment: 1 } }) }));
  });

  it("resolves AI(240) through MANUFACTURER_REF and retains the matching identifier as evidence", async () => {
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      articleIdentifier: { findMany: vi.fn().mockResolvedValue([{ article, type: "MANUFACTURER_REF", value: "MFG-240" }]) },
      article: { findUniqueOrThrow: vi.fn().mockResolvedValue({ ...article, tracePolicies: [{ minimumRequirement: "NONE", expirationRequired: false }] }) },
      goodsReceiptLine: { findFirst: vi.fn().mockResolvedValue({ id: "line-1" }), update: vi.fn().mockResolvedValue({ id: "line-1", receivedQuantity: "1" }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "line-1" }) },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-1" }), findFirst: vi.fn().mockResolvedValue({ id: "scan-1", articleId: "article-1", lineId: "line-1", lotCode: null, serialNumber: null, expirationDate: null }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn().mockResolvedValue({ id: "scan-1", resolutionStatus: "RESOLVED" }) },
    };

    await scanReceipt({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "user-1", { rawValue: "(240)MFG-240" });

    expect(tx.articleIdentifier.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: "MANUFACTURER_REF", normalizedValue: "MFG240" }) }));
    expect(tx.scanEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ candidates: [expect.objectContaining({ identifier: expect.objectContaining({ type: "MANUFACTURER_REF", value: "MFG-240" }) })] }) }));
  });

  it.each([
    ["GTIN", "(01)07712345678903", "GTIN_EAN", "07712345678903"],
    ["manufacturer reference", "MFG-42", "MANUFACTURER_REF", "MFG42"],
    ["supplier code", "SUP-42", "SUPPLIER_CODE", "SUP42"],
    ["alternative code", "ALT-42", "ALTERNATIVE_CODE", "ALT42"],
  ] as const)("resolves a %s identity route at receipt scan time", async (_route, rawValue, identifierType, normalizedValue) => {
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      articleIdentifier: { findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(where.type === identifierType && where.normalizedValue === normalizedValue ? [{ article, type: identifierType, value: rawValue }] : [])) },
      article: { findUniqueOrThrow: vi.fn().mockResolvedValue({ ...article, tracePolicies: [{ minimumRequirement: "NONE", expirationRequired: false }] }) },
      goodsReceiptLine: { findFirst: vi.fn().mockResolvedValue({ id: "line-1" }), update: vi.fn().mockResolvedValue({ id: "line-1", receivedQuantity: "1" }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "line-1" }) },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-1" }), findFirst: vi.fn().mockResolvedValue({ id: "scan-1", articleId: "article-1", lineId: "line-1", lotCode: null, serialNumber: null, expirationDate: null }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn().mockResolvedValue({ id: "scan-1", resolutionStatus: "RESOLVED" }) },
    };

    const result = await scanReceipt({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "user-1", { rawValue });

    expect(result).toMatchObject({ status: "RESOLVED" });
    expect(tx.articleIdentifier.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: identifierType, normalizedValue }) }));
  });

  it("persists an unknown scan as pending without creating a commercial line", async () => {
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      articleIdentifier: { findMany: vi.fn().mockResolvedValue([]) },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-pending" }) },
    };
    const result = await scanReceipt({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "user-1", { rawValue: "unknown-unit" });

    expect(result).toMatchObject({ status: "PENDING", event: { id: "scan-pending" } });
    expect(tx.scanEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rawValue: "unknown-unit", resolutionStatus: "PENDING" }) }));
  });

  it("resolves a pending scan against an existing article and creates an aggregate line when needed", async () => {
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      article: { findFirst: vi.fn().mockResolvedValue({ ...article, identifiers: [], tracePolicies: [{ minimumRequirement: "NONE", expirationRequired: false }] }) },
      goodsReceiptLine: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(1), create: vi.fn().mockResolvedValue({ id: "line-2" }), update: vi.fn().mockResolvedValue({ id: "line-2", receivedQuantity: "1" }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "line-2" }) },
      scanEvent: { findFirst: vi.fn().mockResolvedValueOnce({ id: "scan-pending" }).mockResolvedValueOnce({ id: "scan-pending", articleId: "article-1", lineId: "line-2", lotCode: null, serialNumber: null, expirationDate: null }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn().mockResolvedValue({ id: "scan-pending", resolutionStatus: "RESOLVED" }) },
    };
    const result = await resolveReceiptScan({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "scan-pending", "user-1", "article-1");

    expect(result.line).toMatchObject({ id: "line-2" });
    expect(tx.goodsReceiptLine.create).toHaveBeenCalled();
    expect(tx.scanEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ articleId: "article-1", resolutionStatus: "PENDING_TRACE" }) }));
  });

  it("claims a pending scan once before incrementing its commercial line", async () => {
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      scanEvent: { findFirst: vi.fn().mockResolvedValue({ id: "scan-pending" }), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    await expect(resolveReceiptScan({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "scan-pending", "user-1", "article-1")).rejects.toMatchObject({ code: "receipt_scan_already_resolved" });
  });

  it("retains every GS1 trace value present and asks only for the missing expiry", async () => {
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      articleIdentifier: { findMany: vi.fn().mockResolvedValue([{ article }]) },
      article: { findUniqueOrThrow: vi.fn().mockResolvedValue({ ...article, tracePolicies: [{ minimumRequirement: "LOT_AND_SERIAL", expirationRequired: true }] }) },
      goodsReceiptLine: { findFirst: vi.fn().mockResolvedValue({ id: "line-1" }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "line-1" }) },
      scanEvent: {
        create: vi.fn().mockResolvedValue({ id: "scan-1" }),
        findFirst: vi.fn().mockResolvedValue({ id: "scan-1", articleId: "article-1", lineId: "line-1", lotCode: "LOT-1", serialNumber: "SERIAL-1", expirationDate: null }),
      },
    };

    const result = await scanReceipt({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "user-1", { rawValue: "(01)07712345678903(10)LOT-1(21)SERIAL-1" });

    expect(result).toMatchObject({ status: "PENDING_TRACE", nextAction: "expiry" });
    expect(tx.scanEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lotCode: "LOT-1", serialNumber: "SERIAL-1", expirationDate: undefined }) }));
  });

  it("resolves a complete GS1 payload and persists every supported trace value", async () => {
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "org-1" }) },
      articleIdentifier: { findMany: vi.fn().mockResolvedValue([{ article, type: "GTIN_EAN", value: "07712345678903" }]) },
      article: { findUniqueOrThrow: vi.fn().mockResolvedValue({ ...article, tracePolicies: [{ minimumRequirement: "LOT_AND_SERIAL", expirationRequired: true }] }) },
      goodsReceiptLine: { findFirst: vi.fn().mockResolvedValue({ id: "line-1" }), update: vi.fn().mockResolvedValue({ id: "line-1", receivedQuantity: "1" }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "line-1" }) },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-1" }), findFirst: vi.fn().mockResolvedValue({ id: "scan-1", articleId: "article-1", lineId: "line-1", lotCode: "LOT-1", serialNumber: "SERIAL-1", expirationDate: new Date("2025-04-30T00:00:00.000Z") }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn().mockResolvedValue({ id: "scan-1", resolutionStatus: "RESOLVED" }) },
    };

    const result = await scanReceipt({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "user-1", { rawValue: "(01)07712345678903(240)MFG-240(22)22152BP(10)LOT-1(21)SERIAL-1(17)250430" });

    expect(result).toMatchObject({ status: "RESOLVED", line: { id: "line-1" }, candidates: [expect.objectContaining({ identifier: expect.objectContaining({ type: "GTIN_EAN", value: "07712345678903" }) })] });
    expect(tx.articleIdentifier.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: "GTIN_EAN", normalizedValue: "07712345678903" }) }));
    expect(tx.articleIdentifier.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: "MANUFACTURER_REF", normalizedValue: "MFG240" }) }));
    expect(tx.scanEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lotCode: "LOT-1", serialNumber: "SERIAL-1", expirationDate: new Date("2025-04-30T00:00:00.000Z") }) }));
  });

  it("writes an unstructured capture only to the server-requested trace field", async () => {
    const rawValue = "(10)NOT-A-LOT";
    const tx = {
      goodsReceipt: { findFirst: vi.fn().mockResolvedValue(receipt) },
      scanEvent: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({ id: "scan-1", articleId: "article-1", lineId: "line-1", lotCode: "LOT-1", serialNumber: null, expirationDate: null, captureHistory: [], article: { tracePolicies: [{ minimumRequirement: "LOT_AND_SERIAL", expirationRequired: false }] } })
          .mockResolvedValueOnce({ id: "scan-1", articleId: "article-1", lineId: "line-1", lotCode: "LOT-1", serialNumber: rawValue, expirationDate: null }),
        update: vi.fn().mockResolvedValue({ id: "scan-1" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      goodsReceiptLine: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "line-1" }), update: vi.fn().mockResolvedValue({ id: "line-1", receivedQuantity: "1" }) },
    };

    const result = await captureReceiptScan({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never, "company-1", "receipt-1", "scan-1", "user-1", rawValue);

    expect(result).toMatchObject({ status: "RESOLVED", nextAction: "ready" });
    expect(tx.scanEvent.update).toHaveBeenCalledWith({ where: { id: "scan-1" }, data: { serialNumber: rawValue, captureHistory: [{ action: "serial", rawValue, capturedById: "user-1" }] } });
  });
});
