import { parseBarcode } from "./validators/receipt";

export interface ParsedGs1DataMatrix {
  rawValue: string;
  normalizedValue: string;
  gtin?: string;
  lotCode?: string;
  serialNumber?: string;
  expirationDate?: Date;
  articleCode?: string;
  additionalReference?: string;
}

export function parseGs1DataMatrix(rawValue: string): ParsedGs1DataMatrix {
  const parsed = parseBarcode(rawValue);

  let expirationDate: Date | undefined = undefined;
  if (parsed.expirationDate) {
    const d = new Date(parsed.expirationDate);
    if (!Number.isNaN(d.getTime())) {
      expirationDate = d;
    }
  }

  return {
    rawValue: parsed.rawCode,
    normalizedValue: parsed.gtin || parsed.articleCode || parsed.rawCode,
    gtin: parsed.gtin,
    lotCode: parsed.lotCode,
    serialNumber: parsed.serialNumber,
    expirationDate,
    articleCode: parsed.articleCode,
    additionalReference: undefined,
  };
}
