import { describe, expect, it } from "vitest";
import {
  parseBarcode,
  receiptCreateSchema,
  receiptScanSchema,
  receiptResolveScanSchema,
  receiptConfirmSchema,
} from "@/lib/validators/receipt";

describe("Receipt Validators & GS1 Barcode Parser", () => {
  describe("parseBarcode", () => {
    it("parses GS1 bracket notation with GTIN, Lot, Expiration and Serial", () => {
      const raw = "(01)07798123456789(17)271231(10)LOT-2026-X(21)SN-998811";
      const parsed = parseBarcode(raw);

      expect(parsed.gtin).toBe("07798123456789");
      expect(parsed.lotCode).toBe("LOT-2026-X");
      expect(parsed.expirationDate).toBe("2027-12-31");
      expect(parsed.serialNumber).toBe("SN-998811");
      expect(parsed.rawCode).toBe(raw);
    });

    it("parses GS1 bracket notation with AI (22) for internal article reference", () => {
      const raw = "(01)07798000111222(22)ART-IMPLANT-01(10)L-99";
      const parsed = parseBarcode(raw);

      expect(parsed.gtin).toBe("07798000111222");
      expect(parsed.articleCode).toBe("ART-IMPLANT-01");
      expect(parsed.lotCode).toBe("L-99");
    });

    it("parses GS1 continuous stream starting with 01 + 14 digits", () => {
      const raw = "01077981234567891728053110LOT-ABC";
      const parsed = parseBarcode(raw);

      expect(parsed.gtin).toBe("07798123456789");
      expect(parsed.expirationDate).toBe("2028-05-31");
      expect(parsed.lotCode).toBe("LOT-ABC");
    });

    it("parses simple alphanumeric article code or SKU", () => {
      const raw = "PROD-PLACA-TITANIO-4H";
      const parsed = parseBarcode(raw);

      expect(parsed.articleCode).toBe("PROD-PLACA-TITANIO-4H");
      expect(parsed.gtin).toBeUndefined();
    });

    it("parses plain numeric EAN-13", () => {
      const raw = "7798123456789";
      const parsed = parseBarcode(raw);

      expect(parsed.gtin).toBe("7798123456789");
    });
  });

  describe("Zod Schemas", () => {
    it("validates receiptCreateSchema with expectedLines", () => {
      const payload = {
        documentReference: "REM-2026-001",
        supplierId: "supplier-123",
        expectedLines: [
          {
            code: "SKU-001",
            description: "Placa titanio",
            expectedQuantity: "5",
            lotCode: "LOT-A",
            expirationDate: "2027-10-10",
          },
        ],
      };

      const result = receiptCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expectedLines[0].expectedQuantity).toBe("5");
      }
    });

    it("rejects invalid expectedQuantity", () => {
      const payload = {
        expectedLines: [
          {
            code: "SKU-001",
            expectedQuantity: "-2",
          },
        ],
      };

      const result = receiptCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("validates receiptScanSchema and trims input", () => {
      const result = receiptScanSchema.safeParse({ rawValue: "  (01)12345  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rawValue).toBe("(01)12345");
      }
    });

    it("rejects empty rawValue in receiptScanSchema", () => {
      const result = receiptScanSchema.safeParse({ rawValue: "   " });
      expect(result.success).toBe(false);
    });

    it("validates receiptResolveScanSchema", () => {
      const result = receiptResolveScanSchema.safeParse({ articleId: "art-1" });
      expect(result.success).toBe(true);
    });

    it("validates receiptConfirmSchema", () => {
      const result = receiptConfirmSchema.safeParse({ action: "confirm", notes: "Llegó completo" });
      expect(result.success).toBe(true);
    });
  });
});
