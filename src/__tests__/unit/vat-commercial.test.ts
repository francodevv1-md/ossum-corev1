/**
 * OSSUM COR — Commercial VAT (IVA) Engine Tests
 *
 * Validates:
 * 1. Line calculation for all supported rates (21%, 10.5%, 27%, 0%, Exento, No gravado).
 * 2. Discounts and rounding behavior with financial precision.
 * 3. Document totals & multi-rate breakdown.
 * 4. TusFacturas adapter mapping (-1 Exento, -2 No gravado, numeric rates).
 * 5. Snapshot immutability and commercial pipeline preservation (Article -> Presupuesto -> Invoice).
 */

import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import {
  calculateLineCommercial,
  calculateCommercialDocumentTotals,
  mapVatToTusFacturasAlicuota,
  parseVatOptionKey,
  getVatKeyFromTreatmentAndRate,
  DEFAULT_VAT_RATE,
  DEFAULT_VAT_TREATMENT,
} from "@/lib/commercial/vat";
import { mapInvoiceToTusFacturasRequest } from "@/lib/services/fiscal-tusfacturas.service";
import { calculateInvoiceTotals } from "@/lib/services/invoice.service";
import { recalculatePresupuestoTotals } from "@/lib/services/presupuesto.service";

describe("Commercial VAT Engine — Pure Calculations", () => {
  it("calculates 21% Gravado correctly", () => {
    const line = calculateLineCommercial({
      quantity: 2,
      unitPrice: 500,
      vatTreatment: "GRAVADO",
      vatRate: 21,
    });

    expect(line.netSubtotal.toNumber()).toBe(1000);
    expect(line.taxableAmount.toNumber()).toBe(1000);
    expect(line.tax.toNumber()).toBe(210);
    expect(line.total.toNumber()).toBe(1210);
    expect(line.vatTreatment).toBe("GRAVADO");
    expect(line.vatRate.toNumber()).toBe(21);
  });

  it("calculates 10.5% Gravado correctly", () => {
    const line = calculateLineCommercial({
      quantity: 1,
      unitPrice: 1000,
      vatTreatment: "GRAVADO",
      vatRate: 10.5,
    });

    expect(line.netSubtotal.toNumber()).toBe(1000);
    expect(line.taxableAmount.toNumber()).toBe(1000);
    expect(line.tax.toNumber()).toBe(105);
    expect(line.total.toNumber()).toBe(1105);
  });

  it("calculates 27% Gravado correctly", () => {
    const line = calculateLineCommercial({
      quantity: 1,
      unitPrice: 1000,
      vatTreatment: "GRAVADO",
      vatRate: 27,
    });

    expect(line.netSubtotal.toNumber()).toBe(1000);
    expect(line.taxableAmount.toNumber()).toBe(1000);
    expect(line.tax.toNumber()).toBe(270);
    expect(line.total.toNumber()).toBe(1270);
  });

  it("calculates 0% Gravado correctly", () => {
    const line = calculateLineCommercial({
      quantity: 1,
      unitPrice: 1000,
      vatTreatment: "GRAVADO",
      vatRate: 0,
    });

    expect(line.netSubtotal.toNumber()).toBe(1000);
    expect(line.taxableAmount.toNumber()).toBe(1000);
    expect(line.tax.toNumber()).toBe(0);
    expect(line.total.toNumber()).toBe(1000);
  });

  it("calculates EXENTO correctly (effective rate 0)", () => {
    const line = calculateLineCommercial({
      quantity: 3,
      unitPrice: 200,
      vatTreatment: "EXENTO",
      vatRate: 0,
    });

    expect(line.netSubtotal.toNumber()).toBe(600);
    expect(line.taxableAmount.toNumber()).toBe(600);
    expect(line.tax.toNumber()).toBe(0);
    expect(line.total.toNumber()).toBe(600);
    expect(line.vatTreatment).toBe("EXENTO");
    expect(line.vatRate.toNumber()).toBe(0);
  });

  it("calculates NO_GRAVADO correctly (effective rate 0)", () => {
    const line = calculateLineCommercial({
      quantity: 1,
      unitPrice: 750,
      vatTreatment: "NO_GRAVADO",
    });

    expect(line.netSubtotal.toNumber()).toBe(750);
    expect(line.taxableAmount.toNumber()).toBe(750);
    expect(line.tax.toNumber()).toBe(0);
    expect(line.total.toNumber()).toBe(750);
    expect(line.vatTreatment).toBe("NO_GRAVADO");
    expect(line.vatRate.toNumber()).toBe(0);
  });

  it("applies discounts before computing tax", () => {
    const line = calculateLineCommercial({
      quantity: 10,
      unitPrice: 100, // net = 1000
      discount: 200, // taxable = 800
      vatTreatment: "GRAVADO",
      vatRate: 21, // tax = 800 * 0.21 = 168
    });

    expect(line.netSubtotal.toNumber()).toBe(1000);
    expect(line.discount.toNumber()).toBe(200);
    expect(line.taxableAmount.toNumber()).toBe(800);
    expect(line.tax.toNumber()).toBe(168);
    expect(line.total.toNumber()).toBe(968);
  });

  it("handles decimal rounding consistently (round half up)", () => {
    const line = calculateLineCommercial({
      quantity: 1,
      unitPrice: 33.33,
      vatTreatment: "GRAVADO",
      vatRate: 10.5, // 33.33 * 0.105 = 3.49965 -> 3.5000
    });

    expect(line.tax.toNumber()).toBe(3.4997); // 4 decimal places
    expect(line.total.toNumber()).toBe(36.8297);
  });

  it("defaults to 21% Gravado when treatment and rate are omitted", () => {
    const line = calculateLineCommercial({
      quantity: 1,
      unitPrice: 100,
    });

    expect(line.vatTreatment).toBe(DEFAULT_VAT_TREATMENT);
    expect(line.vatRate.toNumber()).toBe(DEFAULT_VAT_RATE);
    expect(line.tax.toNumber()).toBe(21);
    expect(line.total.toNumber()).toBe(121);
  });
});

describe("Document Commercial Totals & Multi-Rate Breakdown", () => {
  it("calculates multi-rate document breakdown accurately", () => {
    const items = [
      calculateLineCommercial({ quantity: 1, unitPrice: 1000, vatTreatment: "GRAVADO", vatRate: 21 }),
      calculateLineCommercial({ quantity: 1, unitPrice: 2000, vatTreatment: "GRAVADO", vatRate: 10.5 }),
      calculateLineCommercial({ quantity: 1, unitPrice: 500, vatTreatment: "EXENTO" }),
      calculateLineCommercial({ quantity: 1, unitPrice: 300, vatTreatment: "NO_GRAVADO" }),
    ];

    const totals = calculateCommercialDocumentTotals(items);

    expect(totals.subtotal.toNumber()).toBe(3800);
    expect(totals.taxTotal.toNumber()).toBe(420); // 210 + 210
    expect(totals.total.toNumber()).toBe(4220);

    expect(totals.breakdown.gravado21.toNumber()).toBe(1000);
    expect(totals.breakdown.iva21.toNumber()).toBe(210);
    expect(totals.breakdown.gravado105.toNumber()).toBe(2000);
    expect(totals.breakdown.iva105.toNumber()).toBe(210);
    expect(totals.breakdown.exento.toNumber()).toBe(500);
    expect(totals.breakdown.noGravado.toNumber()).toBe(300);
  });
});

describe("TusFacturas Provider Adapter — VAT Mapping", () => {
  it("maps GRAVADO 21% to numeric 21", () => {
    expect(mapVatToTusFacturasAlicuota({ vatTreatment: "GRAVADO", vatRate: 21 })).toBe(21);
  });

  it("maps GRAVADO 10.5% to numeric 10.5", () => {
    expect(mapVatToTusFacturasAlicuota({ vatTreatment: "GRAVADO", vatRate: 10.5 })).toBe(10.5);
  });

  it("maps GRAVADO 27% to numeric 27", () => {
    expect(mapVatToTusFacturasAlicuota({ vatTreatment: "GRAVADO", vatRate: 27 })).toBe(27);
  });

  it("maps GRAVADO 0% to numeric 0", () => {
    expect(mapVatToTusFacturasAlicuota({ vatTreatment: "GRAVADO", vatRate: 0 })).toBe(0);
  });

  it("maps EXENTO to -1 (never -1 as internal rate)", () => {
    expect(mapVatToTusFacturasAlicuota({ vatTreatment: "EXENTO", vatRate: 0 })).toBe(-1);
  });

  it("maps NO_GRAVADO to -2 (never -2 as internal rate)", () => {
    expect(mapVatToTusFacturasAlicuota({ vatTreatment: "NO_GRAVADO", vatRate: 0 })).toBe(-2);
  });

  it("mapInvoiceToTusFacturasRequest uses persisted item VAT rates in payload", () => {
    const config = {
      apiKey: "12345",
      apiToken: "dev-api-token",
      userToken: "dev-user-token",
      puntoVenta: 1,
      apiUrl: "https://www.tusfacturas.app/app/api/v2",
    };

    const payload = mapInvoiceToTusFacturasRequest({
      companyId: "comp-dev-001",
      invoiceId: "inv-dev-001",
      visibleNumber: 101,
      invoiceType: "FA",
      total: 3500,
      config,
      items: [
        {
          description: "Prótesis Cadera (Gravado 21%)",
          quantity: 1,
          unitPrice: 1000,
          vatTreatment: "GRAVADO",
          vatRate: 21,
        },
        {
          description: "Insumo Médico (Gravado 10.5%)",
          quantity: 1,
          unitPrice: 1000,
          vatTreatment: "GRAVADO",
          vatRate: 10.5,
        },
        {
          description: "Medicamento Exento",
          quantity: 1,
          unitPrice: 500,
          vatTreatment: "EXENTO",
          vatRate: 0,
        },
        {
          description: "Gasto Administrativo No Gravado",
          quantity: 1,
          unitPrice: 300,
          vatTreatment: "NO_GRAVADO",
          vatRate: 0,
        },
      ],
      client: {
        legalName: "Sanatorio Demo",
        documentType: "CUIT",
        documentNumber: "30712293841",
        condicionIva: "RI",
      },
    });

    const items = payload.comprobante.detalle;
    expect(items).toHaveLength(4);

    expect(items[0].producto.alicuota).toBe(21);
    expect(items[0].producto.precio_unitario_sin_iva).toBe(1000);
    expect(items[0].producto.precio_unitario).toBe(1210);

    expect(items[1].producto.alicuota).toBe(10.5);
    expect(items[1].producto.precio_unitario_sin_iva).toBe(1000);
    expect(items[1].producto.precio_unitario).toBe(1105);

    expect(items[2].producto.alicuota).toBe(-1); // TusFacturas Exento
    expect(items[2].producto.precio_unitario_sin_iva).toBe(500);
    expect(items[2].producto.precio_unitario).toBe(500);

    expect(items[3].producto.alicuota).toBe(-2); // TusFacturas No Gravado
    expect(items[3].producto.precio_unitario_sin_iva).toBe(300);
    expect(items[3].producto.precio_unitario).toBe(300);

    expect(payload.comprobante.total).toBe(3115); // 1210 + 1105 + 500 + 300
  });
});

describe("Service Level — Presupuesto & Invoice VAT Snapshots", () => {
  it("preserves custom VAT treatment and rate in invoice totals calculation", () => {
    const totals = calculateInvoiceTotals([
      {
        description: "Artículo 10.5%",
        quantity: "2",
        unitPrice: "1000",
        vatTreatment: "GRAVADO",
        vatRate: "10.5",
      },
      {
        description: "Artículo Exento",
        quantity: "1",
        unitPrice: "500",
        vatTreatment: "EXENTO",
        vatRate: "0",
      },
    ]);

    expect(totals.items).toHaveLength(2);
    expect(totals.items[0].vatTreatment).toBe("GRAVADO");
    expect(totals.items[0].vatRate.toNumber()).toBe(10.5);
    expect(totals.items[0].tax.toNumber()).toBe(210); // 2000 * 0.105 = 210
    expect(totals.items[0].total.toNumber()).toBe(2210);

    expect(totals.items[1].vatTreatment).toBe("EXENTO");
    expect(totals.items[1].vatRate.toNumber()).toBe(0);
    expect(totals.items[1].tax.toNumber()).toBe(0);
    expect(totals.items[1].total.toNumber()).toBe(500);

    expect(totals.subtotal.toNumber()).toBe(2500);
    expect(totals.taxTotal.toNumber()).toBe(210);
    expect(totals.total.toNumber()).toBe(2710);
  });

  it("preserves custom VAT treatment and rate in presupuesto recalculation", () => {
    const totals = recalculatePresupuestoTotals([
      {
        description: "Prótesis Especial 27%",
        quantity: 1,
        unitPrice: 10000,
        vatTreatment: "GRAVADO",
        vatRate: 27,
      },
    ]);

    expect(totals.items[0].vatTreatment).toBe("GRAVADO");
    expect(totals.items[0].vatRate.toNumber()).toBe(27);
    expect(totals.items[0].tax.toNumber()).toBe(2700);
    expect(totals.items[0].total.toNumber()).toBe(12700);
    expect(totals.total.toNumber()).toBe(12700);
  });

  it("backfills default 21% Gravado when fields are omitted (regression guarantee)", () => {
    const totals = calculateInvoiceTotals([
      {
        description: "Item legacy",
        quantity: 1,
        unitPrice: 100,
      },
    ]);

    expect(totals.items[0].vatTreatment).toBe("GRAVADO");
    expect(totals.items[0].vatRate.toNumber()).toBe(21);
    expect(totals.items[0].tax.toNumber()).toBe(21);
    expect(totals.items[0].total.toNumber()).toBe(121);
  });
});

describe("VAT Key and Option Parsing Helpers", () => {
  it("parses valid keys to treatment and rate", () => {
    expect(parseVatOptionKey("21")).toEqual({ treatment: "GRAVADO", rate: 21 });
    expect(parseVatOptionKey("10.5")).toEqual({ treatment: "GRAVADO", rate: 10.5 });
    expect(parseVatOptionKey("27")).toEqual({ treatment: "GRAVADO", rate: 27 });
    expect(parseVatOptionKey("0")).toEqual({ treatment: "GRAVADO", rate: 0 });
    expect(parseVatOptionKey("exento")).toEqual({ treatment: "EXENTO", rate: 0 });
    expect(parseVatOptionKey("no_gravado")).toEqual({ treatment: "NO_GRAVADO", rate: 0 });
  });

  it("throws VatValidationError on invalid or unsupported vatOption keys", () => {
    expect(() => parseVatOptionKey("5")).toThrow();
    expect(() => parseVatOptionKey("15")).toThrow();
    expect(() => parseVatOptionKey("invalid")).toThrow();
  });

  it("derives UI key from treatment and rate", () => {
    expect(getVatKeyFromTreatmentAndRate("GRAVADO", 21)).toBe("21");
    expect(getVatKeyFromTreatmentAndRate("GRAVADO", 10.5)).toBe("10.5");
    expect(getVatKeyFromTreatmentAndRate("GRAVADO", 27)).toBe("27");
    expect(getVatKeyFromTreatmentAndRate("GRAVADO", 0)).toBe("0");
    expect(getVatKeyFromTreatmentAndRate("EXENTO", 0)).toBe("exento");
    expect(getVatKeyFromTreatmentAndRate("NO_GRAVADO", 0)).toBe("no_gravado");
  });
});

describe("Commercial Validation & Error Guardrails", () => {
  it("rejects discount exceeding line net subtotal", () => {
    expect(() =>
      calculateLineCommercial({
        quantity: 2,
        unitPrice: 500, // net = 1000
        discount: 1001, // discount > net
        vatTreatment: "GRAVADO",
        vatRate: 21,
      })
    ).toThrowError(/cannot exceed line net subtotal/);
  });

  it("allows discount equal to net subtotal (100% discount)", () => {
    const line = calculateLineCommercial({
      quantity: 2,
      unitPrice: 500, // net = 1000
      discount: 1000,
      vatTreatment: "GRAVADO",
      vatRate: 21,
    });

    expect(line.netSubtotal.toNumber()).toBe(1000);
    expect(line.discount.toNumber()).toBe(1000);
    expect(line.taxableAmount.toNumber()).toBe(0);
    expect(line.tax.toNumber()).toBe(0);
    expect(line.total.toNumber()).toBe(0);
  });

  it("rejects negative quantity or unit price", () => {
    expect(() =>
      calculateLineCommercial({
        quantity: -1,
        unitPrice: 500,
      })
    ).toThrowError(/Quantity must be greater than 0/);

    expect(() =>
      calculateLineCommercial({
        quantity: 1,
        unitPrice: -50,
      })
    ).toThrowError(/Unit price cannot be negative/);
  });

  it("rejects unsupported GRAVADO rate (e.g., 5%, 15%, 50%)", () => {
    expect(() =>
      calculateLineCommercial({
        quantity: 1,
        unitPrice: 1000,
        vatTreatment: "GRAVADO",
        vatRate: 15,
      })
    ).toThrowError(/Invalid VAT rate 15 for GRAVADO/);
  });

  it("rejects non-zero rate for EXENTO or NO_GRAVADO", () => {
    expect(() =>
      calculateLineCommercial({
        quantity: 1,
        unitPrice: 1000,
        vatTreatment: "EXENTO",
        vatRate: 21,
      })
    ).toThrowError(/requires rate to be 0/);

    expect(() =>
      calculateLineCommercial({
        quantity: 1,
        unitPrice: 1000,
        vatTreatment: "NO_GRAVADO",
        vatRate: 10.5,
      })
    ).toThrowError(/requires rate to be 0/);
  });

  it("calculateCommercialDocumentTotals rejects unsupported rates instead of grouping as 0%", () => {
    const invalidItem = {
      description: "Invalid item",
      quantity: new Prisma.Decimal(1),
      unitPrice: new Prisma.Decimal(100),
      discount: new Prisma.Decimal(0),
      netSubtotal: new Prisma.Decimal(100),
      taxableAmount: new Prisma.Decimal(100),
      vatTreatment: "GRAVADO" as const,
      vatRate: new Prisma.Decimal(99),
      tax: new Prisma.Decimal(99),
      total: new Prisma.Decimal(199),
    };

    expect(() => calculateCommercialDocumentTotals([invalidItem])).toThrowError(/Invalid VAT rate 99 for GRAVADO/);
  });
});

describe("Commercial Pipeline — End-to-End Snapshot Lifecycle & Immutability", () => {
  it("maintains immutable snapshots when Article VAT changes after document creation", () => {
    // 1. Initial article configured with 10.5%
    const articleV1 = {
      id: "art-001",
      sku: "PROT-KNEE-01",
      name: "Prótesis de Rodilla",
      vatTreatment: "GRAVADO" as const,
      vatRate: 10.5,
    };

    // 2. Presupuesto created copying Article VAT
    const presupuestoItem = calculateLineCommercial({
      quantity: 1,
      unitPrice: 50000,
      vatTreatment: articleV1.vatTreatment,
      vatRate: articleV1.vatRate,
    });

    expect(presupuestoItem.vatTreatment).toBe("GRAVADO");
    expect(presupuestoItem.vatRate.toNumber()).toBe(10.5);
    expect(presupuestoItem.tax.toNumber()).toBe(5250);
    expect(presupuestoItem.total.toNumber()).toBe(55250);

    // 3. Invoice created copying PresupuestoItem snapshot
    const invoiceItem = calculateLineCommercial({
      quantity: presupuestoItem.quantity.toNumber(),
      unitPrice: presupuestoItem.unitPrice.toNumber(),
      discount: presupuestoItem.discount.toNumber(),
      vatTreatment: presupuestoItem.vatTreatment,
      vatRate: presupuestoItem.vatRate.toNumber(),
    });

    expect(invoiceItem.vatTreatment).toBe("GRAVADO");
    expect(invoiceItem.vatRate.toNumber()).toBe(10.5);
    expect(invoiceItem.tax.toNumber()).toBe(5250);
    expect(invoiceItem.total.toNumber()).toBe(55250);

    // 4. TusFacturas payload generation from InvoiceItem snapshot
    const alicuotaTusFacturas = mapVatToTusFacturasAlicuota({
      vatTreatment: invoiceItem.vatTreatment,
      vatRate: invoiceItem.vatRate.toNumber(),
    });
    expect(alicuotaTusFacturas).toBe(10.5);

    // 5. Later, the Article is updated to 27% VAT in the catalog
    const articleV2 = {
      ...articleV1,
      vatTreatment: "GRAVADO" as const,
      vatRate: 27,
    };

    // 6. Existing Presupuesto and Invoice items REMAIN IMMUTABLE at 10.5%
    expect(presupuestoItem.vatRate.toNumber()).toBe(10.5);
    expect(presupuestoItem.tax.toNumber()).toBe(5250);
    expect(invoiceItem.vatRate.toNumber()).toBe(10.5);
    expect(invoiceItem.tax.toNumber()).toBe(5250);

    // 7. A NEW Presupuesto created today gets the new 27% rate
    const newPresupuestoItem = calculateLineCommercial({
      quantity: 1,
      unitPrice: 50000,
      vatTreatment: articleV2.vatTreatment,
      vatRate: articleV2.vatRate,
    });

    expect(newPresupuestoItem.vatRate.toNumber()).toBe(27);
    expect(newPresupuestoItem.tax.toNumber()).toBe(13500);
    expect(newPresupuestoItem.total.toNumber()).toBe(63500);
  });
});
