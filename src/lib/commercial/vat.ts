// OSSUM COR — Centralized Commercial VAT (IVA) Engine
// Single source of truth for VAT rates, treatments, line calculations,
// document totals, and external provider adapter transformations.

import { Prisma } from "@prisma/client";

export const SUPPORTED_VAT_TREATMENTS = ["GRAVADO", "EXENTO", "NO_GRAVADO"] as const;
export type VatTreatment = (typeof SUPPORTED_VAT_TREATMENTS)[number];

export const SUPPORTED_VAT_RATES = [0, 10.5, 21, 27] as const;
export type SupportedVatRate = (typeof SUPPORTED_VAT_RATES)[number];

export const DEFAULT_VAT_TREATMENT: VatTreatment = "GRAVADO";
export const DEFAULT_VAT_RATE = 21;

export class VatValidationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "invalid_vat_configuration", status = 400) {
    super(message);
    this.name = "VatValidationError";
    this.code = code;
    this.status = status;
  }
}

export interface VatOption {
  key: string;
  label: string;
  treatment: VatTreatment;
  rate: number;
}

export const COMMERCIAL_VAT_OPTIONS: readonly VatOption[] = [
  { key: "21", label: "21%", treatment: "GRAVADO", rate: 21 },
  { key: "10.5", label: "10.5%", treatment: "GRAVADO", rate: 10.5 },
  { key: "27", label: "27%", treatment: "GRAVADO", rate: 27 },
  { key: "0", label: "0%", treatment: "GRAVADO", rate: 0 },
  { key: "exento", label: "Exento", treatment: "EXENTO", rate: 0 },
  { key: "no_gravado", label: "No gravado", treatment: "NO_GRAVADO", rate: 0 },
] as const;

export function isVatTreatment(val: unknown): val is VatTreatment {
  return typeof val === "string" && (SUPPORTED_VAT_TREATMENTS as readonly string[]).includes(val);
}

export function isSupportedVatRate(val: unknown): val is SupportedVatRate {
  if (typeof val === "number") {
    return (SUPPORTED_VAT_RATES as readonly number[]).includes(val);
  }
  if (val instanceof Prisma.Decimal || typeof val === "string") {
    const num = Number(val);
    return Number.isFinite(num) && (SUPPORTED_VAT_RATES as readonly number[]).includes(num);
  }
  return false;
}

/**
 * Validates VAT treatment and numeric rate strictly against business rules.
 * Throws VatValidationError on unsupported rates, invalid treatments, or mismatched combinations.
 */
export function validateVatTreatmentAndRate(
  treatmentInput?: string | null,
  rateInput?: Prisma.Decimal | number | string | null,
): { treatment: VatTreatment; rate: Prisma.Decimal } {
  let treatment: VatTreatment = DEFAULT_VAT_TREATMENT;

  if (treatmentInput !== undefined && treatmentInput !== null) {
    if (!isVatTreatment(treatmentInput)) {
      throw new VatValidationError(
        `Invalid VAT treatment: '${treatmentInput}'. Supported treatments: ${(SUPPORTED_VAT_TREATMENTS as readonly string[]).join(", ")}`,
        "invalid_vat_treatment",
      );
    }
    treatment = treatmentInput;
  }

  if (treatment === "EXENTO" || treatment === "NO_GRAVADO") {
    if (rateInput !== undefined && rateInput !== null) {
      const numRate = Number(toDecimal(rateInput));
      if (Number.isFinite(numRate) && numRate !== 0) {
        throw new VatValidationError(
          `VAT treatment '${treatment}' requires rate to be 0 (received ${rateInput})`,
          "invalid_vat_rate_for_treatment",
        );
      }
    }
    return { treatment, rate: new Prisma.Decimal(0) };
  }

  // GRAVADO treatment
  let rate: Prisma.Decimal;
  if (rateInput === undefined || rateInput === null) {
    rate = new Prisma.Decimal(DEFAULT_VAT_RATE);
  } else {
    const decRate = quantizeMoney(toDecimal(rateInput));
    const num = Number(decRate);
    const isSupported = (SUPPORTED_VAT_RATES as readonly number[]).some(
      (supported) => Math.abs(supported - num) < 0.0001,
    );
    if (!isSupported) {
      throw new VatValidationError(
        `Invalid VAT rate ${rateInput} for GRAVADO. Supported rates: ${SUPPORTED_VAT_RATES.join("%, ")}%`,
        "invalid_vat_rate",
      );
    }
    rate = decRate;
  }

  return { treatment, rate };
}

/**
 * Parses a standard VAT option key strictly (e.g. "21", "10.5", "exento").
 * Throws VatValidationError if key is unsupported.
 */
export function parseVatOptionKey(key: string): { treatment: VatTreatment; rate: number } {
  if (typeof key !== "string") {
    throw new VatValidationError("VAT option key must be a string", "invalid_vat_option_key");
  }
  const raw = key.trim().toLowerCase();
  const stripped = raw.endsWith("%") ? raw.slice(0, -1).trim() : raw;
  const match = COMMERCIAL_VAT_OPTIONS.find(
    (opt) => opt.key.toLowerCase() === raw || opt.key.toLowerCase() === stripped,
  );
  if (match) {
    return { treatment: match.treatment, rate: match.rate };
  }
  throw new VatValidationError(
    `Invalid VAT option key: '${key}'. Supported options: ${COMMERCIAL_VAT_OPTIONS.map((o) => o.key).join(", ")}`,
    "invalid_vat_option_key",
  );
}

export function getVatKeyFromTreatmentAndRate(treatment: VatTreatment, rate: number | Prisma.Decimal): string {
  if (treatment === "EXENTO") return "exento";
  if (treatment === "NO_GRAVADO") return "no_gravado";
  const numRate = Number(rate);
  if (Math.abs(numRate - 10.5) < 0.001) return "10.5";
  if (Math.abs(numRate - 27) < 0.001) return "27";
  if (Math.abs(numRate - 0) < 0.001) return "0";
  return "21";
}

export function toDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  try {
    return new Prisma.Decimal(value);
  } catch {
    throw new VatValidationError(`Invalid numeric decimal value: ${value}`, "invalid_decimal_value");
  }
}

export function quantizeMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export function round2Money(value: Prisma.Decimal | number): number {
  const dec = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return Number(dec.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toString());
}

export interface CalculateLineCommercialParams {
  quantity: number | string | Prisma.Decimal;
  unitPrice: number | string | Prisma.Decimal;
  discount?: number | string | Prisma.Decimal;
  vatTreatment?: string | VatTreatment;
  vatRate?: number | string | Prisma.Decimal;
}

export interface CalculatedLineCommercial {
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  netSubtotal: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  vatTreatment: VatTreatment;
  vatRate: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
}

/**
 * Pure helper for single-line commercial & tax calculation.
 * Preserves financial decimal precision with Prisma.Decimal.
 * Enforces business rule: discount cannot exceed line net amount.
 */
export function calculateLineCommercial(params: CalculateLineCommercialParams): CalculatedLineCommercial {
  const quantity = quantizeMoney(toDecimal(params.quantity));
  const unitPrice = quantizeMoney(toDecimal(params.unitPrice ?? 0));
  const discount = quantizeMoney(toDecimal(params.discount ?? 0));

  if (quantity.lte(0)) {
    throw new VatValidationError("Quantity must be greater than 0", "invalid_commercial_quantity");
  }
  if (unitPrice.lt(0)) {
    throw new VatValidationError("Unit price cannot be negative", "invalid_commercial_unit_price");
  }
  if (discount.lt(0)) {
    throw new VatValidationError("Discount cannot be negative", "invalid_commercial_discount");
  }

  const netSubtotal = quantizeMoney(quantity.mul(unitPrice));
  if (discount.gt(netSubtotal)) {
    throw new VatValidationError(
      `Discount (${discount.toFixed(4)}) cannot exceed line net subtotal (${netSubtotal.toFixed(4)})`,
      "invalid_commercial_discount",
    );
  }

  const { treatment: vatTreatment, rate: vatRate } = validateVatTreatmentAndRate(
    params.vatTreatment,
    params.vatRate,
  );

  const taxableAmount = quantizeMoney(netSubtotal.minus(discount));

  let tax: Prisma.Decimal;
  if (vatTreatment === "EXENTO" || vatTreatment === "NO_GRAVADO" || vatRate.isZero()) {
    tax = new Prisma.Decimal(0);
  } else {
    tax = quantizeMoney(taxableAmount.mul(vatRate).div(100));
  }

  const total = quantizeMoney(taxableAmount.plus(tax));

  return {
    quantity,
    unitPrice,
    discount,
    netSubtotal,
    taxableAmount,
    vatTreatment,
    vatRate,
    tax,
    total,
  };
}

export interface DocumentCommercialTotals {
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  breakdown: {
    gravado21: Prisma.Decimal;
    iva21: Prisma.Decimal;
    gravado105: Prisma.Decimal;
    iva105: Prisma.Decimal;
    gravado27: Prisma.Decimal;
    iva27: Prisma.Decimal;
    gravado0: Prisma.Decimal;
    exento: Prisma.Decimal;
    noGravado: Prisma.Decimal;
  };
}

/**
 * Calculates document-level commercial totals and VAT breakdown.
 * Rejects invalid rates and treatments without silent fallbacks.
 */
export function calculateCommercialDocumentTotals(
  items: Array<{
    netSubtotal?: Prisma.Decimal;
    discount?: Prisma.Decimal;
    taxableAmount?: Prisma.Decimal;
    tax?: Prisma.Decimal;
    total?: Prisma.Decimal;
    vatTreatment?: string | VatTreatment;
    vatRate?: number | string | Prisma.Decimal;
    quantity?: number | string | Prisma.Decimal;
    unitPrice?: number | string | Prisma.Decimal;
  }>,
): DocumentCommercialTotals {
  let subtotal = new Prisma.Decimal(0);
  let discountTotal = new Prisma.Decimal(0);
  let taxTotal = new Prisma.Decimal(0);
  let total = new Prisma.Decimal(0);

  let gravado21 = new Prisma.Decimal(0);
  let iva21 = new Prisma.Decimal(0);
  let gravado105 = new Prisma.Decimal(0);
  let iva105 = new Prisma.Decimal(0);
  let gravado27 = new Prisma.Decimal(0);
  let iva27 = new Prisma.Decimal(0);
  let gravado0 = new Prisma.Decimal(0);
  let exento = new Prisma.Decimal(0);
  let noGravado = new Prisma.Decimal(0);

  for (const item of items) {
    const netSubtotal = item.netSubtotal !== undefined
      ? quantizeMoney(toDecimal(item.netSubtotal))
      : quantizeMoney(toDecimal(item.quantity ?? 1).mul(toDecimal(item.unitPrice ?? 0)));
    const discount = quantizeMoney(toDecimal(item.discount ?? 0));

    if (discount.gt(netSubtotal)) {
      throw new VatValidationError(
        `Discount (${discount.toFixed(4)}) cannot exceed line net subtotal (${netSubtotal.toFixed(4)})`,
        "invalid_commercial_discount",
      );
    }

    const { treatment: vatTreatment, rate: vatRate } = validateVatTreatmentAndRate(
      item.vatTreatment,
      item.vatRate,
    );

    const taxableAmount = item.taxableAmount !== undefined
      ? quantizeMoney(toDecimal(item.taxableAmount))
      : quantizeMoney(netSubtotal.minus(discount));

    const lineTax = item.tax !== undefined
      ? quantizeMoney(toDecimal(item.tax))
      : (vatTreatment === "EXENTO" || vatTreatment === "NO_GRAVADO" || vatRate.isZero())
        ? new Prisma.Decimal(0)
        : quantizeMoney(taxableAmount.mul(vatRate).div(100));

    const lineTotal = item.total !== undefined
      ? quantizeMoney(toDecimal(item.total))
      : quantizeMoney(taxableAmount.plus(lineTax));

    subtotal = quantizeMoney(subtotal.plus(netSubtotal));
    discountTotal = quantizeMoney(discountTotal.plus(discount));
    taxTotal = quantizeMoney(taxTotal.plus(lineTax));
    total = quantizeMoney(total.plus(lineTotal));

    if (vatTreatment === "EXENTO") {
      exento = quantizeMoney(exento.plus(taxableAmount));
    } else if (vatTreatment === "NO_GRAVADO") {
      noGravado = quantizeMoney(noGravado.plus(taxableAmount));
    } else {
      const rateNum = Number(vatRate);
      if (Math.abs(rateNum - 21) < 0.001) {
        gravado21 = quantizeMoney(gravado21.plus(taxableAmount));
        iva21 = quantizeMoney(iva21.plus(lineTax));
      } else if (Math.abs(rateNum - 10.5) < 0.001) {
        gravado105 = quantizeMoney(gravado105.plus(taxableAmount));
        iva105 = quantizeMoney(iva105.plus(lineTax));
      } else if (Math.abs(rateNum - 27) < 0.001) {
        gravado27 = quantizeMoney(gravado27.plus(taxableAmount));
        iva27 = quantizeMoney(iva27.plus(lineTax));
      } else if (Math.abs(rateNum - 0) < 0.001) {
        gravado0 = quantizeMoney(gravado0.plus(taxableAmount));
      } else {
        throw new VatValidationError(
          `Unknown VAT rate ${vatRate.toFixed(4)} for GRAVADO`,
          "invalid_vat_rate",
        );
      }
    }
  }

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total,
    breakdown: {
      gravado21,
      iva21,
      gravado105,
      iva105,
      gravado27,
      iva27,
      gravado0,
      exento,
      noGravado,
    },
  };
}

/**
 * Adapter mapping to TusFacturas API v2 'alicuota' field:
 * - GRAVADO: numeric rate (0, 10.5, 21, 27)
 * - EXENTO: -1
 * - NO_GRAVADO: -2
 */
export function mapVatToTusFacturasAlicuota(params: {
  vatTreatment?: string | VatTreatment | null;
  vatRate?: number | string | Prisma.Decimal | null;
}): number {
  const { treatment, rate } = validateVatTreatmentAndRate(params.vatTreatment, params.vatRate);

  if (treatment === "EXENTO") {
    return -1;
  }
  if (treatment === "NO_GRAVADO") {
    return -2;
  }

  return Number(rate);
}
