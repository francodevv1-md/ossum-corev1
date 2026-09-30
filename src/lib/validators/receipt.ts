import { z } from "zod";

export const expectedLineInputSchema = z.object({
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
  expectedQuantity: z.union([z.string(), z.number()]).transform((val, ctx) => {
    const s = String(val).trim().replace(",", ".");
    const num = Number(s);
    if (!Number.isFinite(num) || num <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "expectedQuantity must be a positive number",
      });
      return z.NEVER;
    }
    return s;
  }),
  lotCode: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  expirationDate: z.string().trim().optional(),
});

export const receiptCreateSchema = z.object({
  documentReference: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expectedLines: z.array(expectedLineInputSchema).default([]),
});

export const receiptScanSchema = z.object({
  rawValue: z.string().trim().min(1, "rawValue cannot be empty"),
});

export const receiptResolveScanSchema = z.object({
  articleId: z.string().trim().min(1, "articleId is required"),
});

export const receiptConfirmSchema = z.object({
  notes: z.string().trim().optional(),
  action: z.literal("confirm").optional(),
});

export type ExpectedLineInput = z.infer<typeof expectedLineInputSchema>;
export type ReceiptCreateInput = z.infer<typeof receiptCreateSchema>;
export type ReceiptScanInput = z.infer<typeof receiptScanSchema>;
export type ReceiptResolveScanInput = z.infer<typeof receiptResolveScanSchema>;
export type ReceiptConfirmInput = z.infer<typeof receiptConfirmSchema>;

export interface ParsedBarcode {
  gtin?: string;
  lotCode?: string;
  serialNumber?: string;
  expirationDate?: string;
  articleCode?: string;
  rawCode: string;
}

/**
 * Parses GS1 DataMatrix / Barcode or raw strings.
 * Supports bracket format e.g. (01)07798123456789(17)271231(10)LOT123(21)SN999
 * as well as raw standard streams or simple alphanumeric codes.
 */
export function parseBarcode(rawValue: string): ParsedBarcode {
  const trimmed = rawValue.trim();
  const result: ParsedBarcode = { rawCode: trimmed };

  if (!trimmed) return result;

  // Bracket notation parsing (common in software decoders)
  if (trimmed.includes("(") && trimmed.includes(")")) {
    const aiRegex = /\((\d{2,4})\)([^(]+)/g;
    let match: RegExpExecArray | null;
    while ((match = aiRegex.exec(trimmed)) !== null) {
      const ai = match[1];
      const val = match[2].trim();
      assignAi(result, ai, val);
    }
    return result;
  }

  // Stream parsing for GS1 without brackets (e.g. starts with 01 + 14 digits)
  if (/^01\d{14}/.test(trimmed)) {
    result.gtin = trimmed.slice(2, 16);
    let rest = trimmed.slice(16);

    while (rest.length > 0) {
      if (rest.startsWith("17") && rest.length >= 8) {
        const yymmdd = rest.slice(2, 8);
        result.expirationDate = formatGs1Date(yymmdd);
        rest = rest.slice(8);
      } else if (rest.startsWith("15") && rest.length >= 8) {
        const yymmdd = rest.slice(2, 8);
        result.expirationDate = formatGs1Date(yymmdd);
        rest = rest.slice(8);
      } else if (rest.startsWith("10")) {
        // Variable length AI 10: take until GS (ASCII 29) or next known AI
        const sub = rest.slice(2);
        const gsIdx = sub.indexOf("\u001d");
        if (gsIdx !== -1) {
          result.lotCode = sub.slice(0, gsIdx);
          rest = sub.slice(gsIdx + 1);
        } else {
          // Check for embedded 21 (serial) or 17 (exp)
          const nextAiMatch = sub.match(/(?:17\d{6}|21[A-Za-z0-9]+)/);
          if (nextAiMatch && nextAiMatch.index !== undefined && nextAiMatch.index > 0) {
            result.lotCode = sub.slice(0, nextAiMatch.index);
            rest = sub.slice(nextAiMatch.index);
          } else {
            result.lotCode = sub;
            rest = "";
          }
        }
      } else if (rest.startsWith("21")) {
        const sub = rest.slice(2);
        const gsIdx = sub.indexOf("\u001d");
        if (gsIdx !== -1) {
          result.serialNumber = sub.slice(0, gsIdx);
          rest = sub.slice(gsIdx + 1);
        } else {
          result.serialNumber = sub;
          rest = "";
        }
      } else if (rest.startsWith("22")) {
        const sub = rest.slice(2);
        const gsIdx = sub.indexOf("\u001d");
        if (gsIdx !== -1) {
          result.articleCode = sub.slice(0, gsIdx);
          rest = sub.slice(gsIdx + 1);
        } else {
          result.articleCode = sub;
          rest = "";
        }
      } else {
        // Unrecognized AI segment, stop stream parse
        break;
      }
    }
    return result;
  }

  // Plain alphanumeric barcode / SKU / EAN-13
  if (/^\d{8,14}$/.test(trimmed)) {
    result.gtin = trimmed;
  } else {
    result.articleCode = trimmed;
  }

  return result;
}

function assignAi(result: ParsedBarcode, ai: string, val: string) {
  if (ai === "01" || ai === "02") {
    result.gtin = val;
  } else if (ai === "10") {
    result.lotCode = val;
  } else if (ai === "17" || ai === "15") {
    result.expirationDate = formatGs1Date(val);
  } else if (ai === "21") {
    result.serialNumber = val;
  } else if (ai === "22") {
    result.articleCode = val;
  }
}

function formatGs1Date(yymmdd: string): string | undefined {
  if (yymmdd.length !== 6 || !/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  // GS1 rule: year 51-99 is 1951-1999, 00-50 is 2000-2050
  const yyyy = yy >= 51 ? 1900 + yy : 2000 + yy;
  const day = dd === "00" ? "28" : dd; // "00" means last day of month in GS1
  return `${yyyy}-${mm}-${day}`;
}
