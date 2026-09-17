export type Gs1Scan = {
  rawValue: string;
  normalizedValue: string;
  gtin?: string;
  articleCode?: string;
  additionalReference?: string;
  lotCode?: string;
  serialNumber?: string;
  expirationDate?: Date;
};

function createUtcDate(year: number, month: number, day: number): Date | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : undefined;
}

export function parseGs1DataMatrix(rawValue: string): Gs1Scan {
  const raw = rawValue;
  const normalizedValue = raw.trim().replace(/^\]d2/, "").replace(/\s+(?=(?:10|17|21|22|240))/g, "\x1d");
  const rawGtin = normalizedValue.match(/(?:\(01\)|(?:^|\x1d)01)(\d{13,14})/)?.[1];
  const valueAfterGtin = rawGtin ? normalizedValue.slice(normalizedValue.indexOf(rawGtin) + rawGtin.length) : "";
  const parenthesized = (ai: string) => normalizedValue.match(new RegExp(`\\(${ai}\\)([^()\\x1d]+)`))?.[1]?.trim();
  const variable = (ai: string) => parenthesized(ai) ?? normalizedValue.match(new RegExp(`(?:\\x1d|^)${ai}([^()\\x1d]+)`))?.[1] ?? valueAfterGtin.match(new RegExp(`^${ai}([^()\\x1d]+)`))?.[1];
  // BIOPROTECE's DataMatrix labels may omit visible GS separators while keeping this fixed AI order.
  const compactSource = valueAfterGtin || normalizedValue;
  const compactUnit = compactSource.includes("\x1d") ? undefined : compactSource.match(/^21(.+?)10(.+?)17(\d{6})(?:22(.+))?$/);
  const compactExpiryLot = compactSource.includes("\x1d") ? undefined : compactSource.match(/^17(\d{6})10(.+)$/);
  const expiry = normalizedValue.match(/(?:\(17\)|\x1d17|^17)(\d{6})/)?.[1];
  const expiryValue = expiry ?? compactUnit?.[3];
  const compactExpiration = expiryValue ?? compactExpiryLot?.[1];
  const displayedExpiry = parenthesized("17")?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const expirationDate = displayedExpiry
    ? createUtcDate(Number(displayedExpiry[3]), Number(displayedExpiry[2]), Number(displayedExpiry[1]))
    : compactExpiration
      ? createUtcDate(2000 + Number(compactExpiration.slice(0, 2)), Number(compactExpiration.slice(2, 4)), Number(compactExpiration.slice(4, 6)))
      : undefined;
  return {
    rawValue: raw,
    normalizedValue,
    gtin: rawGtin?.padStart(14, "0"),
    articleCode: compactUnit?.[4] ?? variable("22"),
    additionalReference: variable("240"),
    lotCode: compactUnit?.[2] ?? compactExpiryLot?.[2] ?? variable("10"),
    serialNumber: compactUnit?.[1] ?? variable("21"),
    expirationDate,
  };
}
