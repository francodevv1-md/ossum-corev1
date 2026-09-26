import { describe, expect, it } from "vitest";
import { confirmReceiptSchema, receiptLineSchema, receiptScanSchema, reservePreparationSchema } from "@/lib/validators/receipt-preparation";
import { Prisma } from "@prisma/client";
import { assertLotExpirationCompatible, assertUniqueReceiptSerials, buildSerialLookupWhere, nextReceiptTraceAction, traceMode, validateReceiptTrace } from "@/lib/services/receipt.service";
import { parseGs1DataMatrix } from "@/lib/gs1";
import { assertPreparationQuantity, assertPreparationSurgeryLink } from "@/lib/services/preparation.service";

describe("receipt and preparation input contracts", () => {
  it("preserves trace fields and rejects unsafe quantity representations", () => {
    expect(receiptLineSchema.parse({ articleId: "a", requestedQuantity: "2.5000", lotCode: "LOT-1", serialNumber: "S-1", expirationDate: "2027-01-01" })).toMatchObject({ lotCode: "LOT-1", serialNumber: "S-1" });
    expect(() => receiptLineSchema.parse({ articleId: "a", requestedQuantity: "2.50000" })).toThrow();
    expect(() => receiptLineSchema.parse({ articleId: "a", requestedQuantity: "-1" })).toThrow();
  });

  it("keeps unknown and ambiguous scans actionable instead of inventing an article", () => {
    expect(receiptScanSchema.parse({ rawValue: "  779123  ", lotCode: "L1" }).rawValue).toBe("  779123  ");
    expect(confirmReceiptSchema.parse({ idempotencyKey: "receipt-confirm-1" }).idempotencyKey).toBe("receipt-confirm-1");
    expect(reservePreparationSchema.parse({ lineId: "l", positionId: "p", quantity: "1" }).quantity).toBe("1");
  });

  it("parses a BIOPROTECE DataMatrix server-side while preserving unit traces", () => {
    expect(parseGs1DataMatrix("(21)GU6423(17)250431(10)260821(22)22152BP")).toMatchObject({ articleCode: "22152BP", lotCode: "260821", serialNumber: "GU6423" });
    expect(parseGs1DataMatrix("21GZ7932102614959173107222233271BP")).toMatchObject({ articleCode: "33271BP", lotCode: "2614959", serialNumber: "GZ7932" });
  });

  it("scopes serial identity by company and article", () => {
    expect(buildSerialLookupWhere("company-a", "article-a", "S-1")).toEqual({ companyId: "company-a", serialNumber: "S-1", identifiedUnit: { articleId: "article-a" } });
  });

  it("rejects preparation oversubscription and trace-policy mismatches", () => {
    expect(() => assertPreparationQuantity(new Prisma.Decimal("2"), new Prisma.Decimal("1.5"), new Prisma.Decimal("0.6"))).toThrowError(/exceeds/);
    expect(() => validateReceiptTrace("SERIAL", { requestedQuantity: new Prisma.Decimal("2"), lotCode: null, serialNumber: "S-1", expirationDate: null })).toThrow();
    expect(() => validateReceiptTrace("NONE", { requestedQuantity: new Prisma.Decimal("1"), lotCode: "L-1", serialNumber: null, expirationDate: null })).not.toThrow();
  });

  it("keeps LOT_SERIAL_EXPIRY as identified stock with both trace axes", () => {
    expect(traceMode("LOT_SERIAL_EXPIRY")).toBe("IDENTIFIED_UNIT");
    expect(() => validateReceiptTrace("LOT_SERIAL_EXPIRY", { requestedQuantity: new Prisma.Decimal("1"), lotCode: "L-1", serialNumber: "S-1", expirationDate: new Date("2027-01-01") })).not.toThrow();
  });

  it("requests only the next missing field and accepts extra GS1 trace data", () => {
    const profile = { minimumRequirement: "LOT_OR_SERIAL", expirationRequired: true };
    expect(nextReceiptTraceAction(profile, { lotCode: null, serialNumber: null, expirationDate: null })).toBe("lot");
    expect(nextReceiptTraceAction(profile, { lotCode: "L-1", serialNumber: "S-1", expirationDate: null })).toBe("expiry");
    expect(() => validateReceiptTrace(profile, { requestedQuantity: new Prisma.Decimal("1"), lotCode: "L-1", serialNumber: "S-1", expirationDate: new Date("2027-01-01") })).not.toThrow();
    expect(traceMode(profile, { lotCode: "L-1" })).toBe("LOT");
    expect(traceMode(profile, { serialNumber: "S-1" })).toBe("IDENTIFIED_UNIT");
  });

  it("rejects lot expiration conflicts and surgery-link mismatches", () => {
    expect(() => assertLotExpirationCompatible(new Date("2027-01-01"), new Date("2027-02-01"))).toThrowError(/conflicts/);
    expect(() => assertPreparationSurgeryLink("surgery-a", "surgery-b")).toThrowError(/does not belong/);
    expect(() => assertLotExpirationCompatible(new Date("2027-01-01"), new Date("2027-01-01"))).not.toThrow();
  });

  it("rejects duplicate serialized scans in one receipt", () => {
    expect(() => assertUniqueReceiptSerials([{ articleId: "a", serialNumber: "S-1" }, { articleId: "a", serialNumber: "s-1" }])).toThrowError(/Duplicate serial/);
  });
});
