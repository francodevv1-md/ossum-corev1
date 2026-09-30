import { describe, expect, it, vi } from "vitest";
import { GET as getReceiptsList, POST as createReceipt } from "@/app/api/companies/[companyId]/receipts/route";
import { GET as getReceiptDetail, POST as handleReceiptAction } from "@/app/api/companies/[companyId]/receipts/[receiptId]/route";
import { POST as scanReceipt } from "@/app/api/companies/[companyId]/receipts/[receiptId]/scan/route";
import { POST as resolveScan } from "@/app/api/companies/[companyId]/receipts/[receiptId]/scans/[scanId]/resolve/route";
import { POST as confirmReceiptRoute } from "@/app/api/companies/[companyId]/receipts/[receiptId]/confirm/route";
import * as receiptService from "@/lib/services/receipt.service";

vi.mock("@/lib/api/auth-context", () => ({
  getApiAuthContext: vi.fn().mockResolvedValue({
    companyId: "company-1",
    actorUserId: "user-1",
    role: "admin",
    canonicalRole: "admin",
    rawRole: "admin",
    organizationId: "org-1",
  }),
}));


vi.mock("@/lib/prisma", () => ({
  default: {},
}));

vi.mock("@/lib/services/receipt.service", () => ({
  listReceipts: vi.fn(),
  createReceiptDraft: vi.fn(),
  getReceipt: vi.fn(),
  scanReceiptUnit: vi.fn(),
  resolvePendingScan: vi.fn(),
  confirmReceipt: vi.fn(),
}));

describe("Receipt API Routes", () => {
  const companyParams = Promise.resolve({ companyId: "company-1" });
  const receiptParams = Promise.resolve({ companyId: "company-1", receiptId: "rec-100" });
  const scanParams = Promise.resolve({
    companyId: "company-1",
    receiptId: "rec-100",
    scanId: "scan-50",
  });

  describe("GET /api/companies/:companyId/receipts", () => {
    it("returns receipt list", async () => {
      vi.mocked(receiptService.listReceipts).mockResolvedValueOnce([
        { id: "rec-1", companyId: "company-1", status: "PREPARED", lines: [] } as any,
      ]);

      const req = new Request("http://localhost/api/companies/company-1/receipts");
      const res = await getReceiptsList(req, { params: companyParams });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("rec-1");
    });
  });

  describe("POST /api/companies/:companyId/receipts", () => {
    it("creates a receipt draft", async () => {
      vi.mocked(receiptService.createReceiptDraft).mockResolvedValueOnce({
        id: "rec-new",
        companyId: "company-1",
        status: "PREPARED",
        lines: [],
      } as any);

      const req = new Request("http://localhost/api/companies/company-1/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentReference: "REM-123",
          expectedLines: [],
        }),
      });

      const res = await createReceipt(req, { params: companyParams });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe("rec-new");
    });

    it("returns 400 on invalid json body", async () => {
      const req = new Request("http://localhost/api/companies/company-1/receipts", {
        method: "POST",
        body: "invalid-json",
      });

      const res = await createReceipt(req, { params: companyParams });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/companies/:companyId/receipts/:receiptId", () => {
    it("returns receipt detail", async () => {
      vi.mocked(receiptService.getReceipt).mockResolvedValueOnce({
        id: "rec-100",
        companyId: "company-1",
        status: "IN_CONTROL",
        lines: [],
      } as any);

      const req = new Request("http://localhost/api/companies/company-1/receipts/rec-100");
      const res = await getReceiptDetail(req, { params: receiptParams });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe("rec-100");
    });
  });

  describe("POST /api/companies/:companyId/receipts/:receiptId (action confirm)", () => {
    it("confirms receipt via action payload", async () => {
      vi.mocked(receiptService.confirmReceipt).mockResolvedValueOnce({
        id: "rec-100",
        companyId: "company-1",
        status: "CONFIRMED",
        lines: [],
      } as any);

      const req = new Request("http://localhost/api/companies/company-1/receipts/rec-100", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });

      const res = await handleReceiptAction(req, { params: receiptParams });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("CONFIRMED");
    });
  });

  describe("POST /api/companies/:companyId/receipts/:receiptId/scan", () => {
    it("processes a barcode scan", async () => {
      vi.mocked(receiptService.scanReceiptUnit).mockResolvedValueOnce({
        event: { id: "scan-1", resolutionStatus: "RESOLVED" } as any,
        status: "RESOLVED",
        candidates: [],
      });

      const req = new Request("http://localhost/api/companies/company-1/receipts/rec-100/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawValue: "(01)07798123456789" }),
      });

      const res = await scanReceipt(req, { params: receiptParams });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("RESOLVED");
    });

    it("rejects empty rawValue with 400", async () => {
      const req = new Request("http://localhost/api/companies/company-1/receipts/rec-100/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawValue: "   " }),
      });

      const res = await scanReceipt(req, { params: receiptParams });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/companies/:companyId/receipts/:receiptId/scans/:scanId/resolve", () => {
    it("resolves pending scan to article", async () => {
      vi.mocked(receiptService.resolvePendingScan).mockResolvedValueOnce({
        event: { id: "scan-50", resolutionStatus: "RESOLVED" } as any,
        line: { id: "line-1", receivedQuantity: "1" } as any,
      });

      const req = new Request(
        "http://localhost/api/companies/company-1/receipts/rec-100/scans/scan-50/resolve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: "art-target-1" }),
        }
      );

      const res = await resolveScan(req, { params: scanParams });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.event.resolutionStatus).toBe("RESOLVED");
    });
  });

  describe("POST /api/companies/:companyId/receipts/:receiptId/confirm", () => {
    it("confirms receipt directly", async () => {
      vi.mocked(receiptService.confirmReceipt).mockResolvedValueOnce({
        id: "rec-100",
        status: "CONFIRMED",
      } as any);

      const req = new Request(
        "http://localhost/api/companies/company-1/receipts/rec-100/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: "Todo verificado" }),
        }
      );

      const res = await confirmReceiptRoute(req, { params: receiptParams });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("CONFIRMED");
    });
  });
});
