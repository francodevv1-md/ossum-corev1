import { describe, expect, it } from "vitest"

import {
  RemitoProveedorAIResponseSchema,
  FacturaCompraAIResponseSchema,
  normalizeDate,
  normalizeCuit,
  parseArgNumber,
  mapAiToRemitoProveedor,
  mapAiToFacturaCompra,
  emptyRemitoProveedorResponse,
  emptyFacturaCompraResponse,
  type RemitoProveedorExtracted,
  type FacturaCompraExtracted,
} from "@/lib/validators/compras-document-ai"

describe("compras-document-ai normalizers", () => {
  it("normalizeDate converts DD/MM/YYYY to ISO", () => {
    expect(normalizeDate("08/05/2026")).toBe("2026-05-08")
  })

  it("normalizeDate keeps YYYY-MM-DD as-is", () => {
    expect(normalizeDate("2026-05-08")).toBe("2026-05-08")
  })

  it("normalizeDate returns empty string for unrecognized formats", () => {
    expect(normalizeDate("mayo 8")).toBe("")
  })

  it("normalizeCuit strips non-digits", () => {
    expect(normalizeCuit("30-71234567-3")).toBe("30712345673")
    expect(normalizeCuit("")).toBe("")
  })

  it("parseArgNumber handles AR thousand+decimal format", () => {
    expect(parseArgNumber("$1.234,56")).toBeCloseTo(1234.56, 2)
  })

  it("parseArgNumber handles AR thousands-only ($95.000 → 95000)", () => {
    expect(parseArgNumber("$95.000")).toBe(95000)
  })

  it("parseArgNumber handles comma-only decimal", () => {
    expect(parseArgNumber("95000,50")).toBeCloseTo(95000.5, 1)
  })

  it("parseArgNumber handles plain integer", () => {
    expect(parseArgNumber("10")).toBe(10)
  })

  it("parseArgNumber returns 0 for garbage", () => {
    expect(parseArgNumber("")).toBe(0)
    expect(parseArgNumber("abc")).toBe(0)
  })
})

describe("compras-document-ai schemas", () => {
  it("RemitoProveedorAIResponseSchema parses a valid response with defaults", () => {
    const raw = {
      provider: "azure-document-intelligence+openai",
      confidence: 0.8,
      looks_like_remito_proveedor: true,
      extracted: {
        proveedor_name: "Synthes",
        numero_remito: "RP-1",
        items: [{ codigo: "A", descripcion: "Item", cantidad: "2" }],
      },
    }
    const parsed = RemitoProveedorAIResponseSchema.parse(raw)
    expect(parsed.extracted.cuit_proveedor).toBe("")
    expect(parsed.extracted.fecha_remito).toBe("")
    expect(parsed.extracted.items[0].lote).toBe("")
    expect(parsed.warnings).toEqual([])
  })

  it("FacturaCompraAIResponseSchema parses a valid response with defaults", () => {
    const raw = {
      provider: "azure-document-intelligence+openai",
      confidence: 0.7,
      looks_like_factura_compra: true,
      extracted: { proveedor_name: "X", numero_factura: "F-1", items: [] },
    }
    const parsed = FacturaCompraAIResponseSchema.parse(raw)
    expect(parsed.extracted.tipo_factura).toBe("")
    expect(parsed.extracted.total).toBe("")
    expect(parsed.extracted.items).toEqual([])
  })

  it("emptyRemitoProveedorResponse returns a safe empty response", () => {
    const r = emptyRemitoProveedorResponse()
    expect(r.confidence).toBe(0)
    expect(r.looks_like_remito_proveedor).toBe(false)
    expect(r.extracted.items).toEqual([])
  })

  it("emptyFacturaCompraResponse returns a safe empty response", () => {
    const r = emptyFacturaCompraResponse()
    expect(r.confidence).toBe(0)
    expect(r.looks_like_factura_compra).toBe(false)
    expect(r.extracted.items).toEqual([])
  })
})

describe("mapAiToRemitoProveedor", () => {
  it("maps extracted fields to store payload", () => {
    const extracted: RemitoProveedorExtracted = {
      proveedor_name: "Synthes Argentina",
      cuit_proveedor: "30-71234567-3",
      numero_remito: "RP-001",
      fecha_remito: "08/05/2026",
      orden_compra_ref: "OC-0002",
      items: [
        { codigo: "IMP-OST-003", descripcion: "Placa LCP", cantidad: "4", lote: "L1", vencimiento: "01/03/2029" },
      ],
      observaciones: "ok",
    }

    const { payload, warnings } = mapAiToRemitoProveedor(extracted, { proveedorId: "PROV-0002" })

    expect(payload.proveedorId).toBe("PROV-0002")
    expect(payload.proveedorName).toBe("Synthes Argentina")
    expect(payload.number).toBe("RP-001")
    expect(payload.date).toBe("2026-05-08")
    expect(payload.state).toBe("Pendiente")
    expect(payload.ordenCompraId).toBe("OC-0002")
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].quantity).toBe(4)
    expect(payload.items[0].received).toBe(4)
    expect(payload.items[0].lot).toBe("L1")
    expect(payload.items[0].expiry).toBe("2029-03-01")
    expect(warnings).toEqual([])
  })

  it("warns when key fields are missing", () => {
    const extracted: RemitoProveedorExtracted = {
      proveedor_name: "",
      cuit_proveedor: "",
      numero_remito: "",
      fecha_remito: "",
      orden_compra_ref: "",
      items: [],
      observaciones: "",
    }

    const { warnings } = mapAiToRemitoProveedor(extracted)
    expect(warnings.some((w) => w.includes("proveedor"))).toBe(true)
    expect(warnings.some((w) => w.includes("número de remito"))).toBe(true)
    expect(warnings.some((w) => w.includes("fecha"))).toBe(true)
    expect(warnings.some((w) => w.includes("items"))).toBe(true)
  })

  it("warns when quantities cannot be parsed", () => {
    const extracted: RemitoProveedorExtracted = {
      proveedor_name: "X",
      cuit_proveedor: "",
      numero_remito: "RP-1",
      fecha_remito: "2026-05-08",
      orden_compra_ref: "",
      items: [{ codigo: "A", descripcion: "B", cantidad: "abc", lote: "", vencimiento: "" }],
      observaciones: "",
    }

    const { warnings, payload } = mapAiToRemitoProveedor(extracted)
    expect(warnings.some((w) => w.includes("cantidades"))).toBe(true)
    expect(payload.items[0].quantity).toBe(0)
  })
})

describe("mapAiToFacturaCompra", () => {
  it("maps extracted fields and computes total from items when total is empty", () => {
    const extracted: FacturaCompraExtracted = {
      proveedor_name: "Arthrex",
      cuit_proveedor: "30712345673",
      tipo_factura: "A",
      numero_factura: "FC-001",
      fecha_factura: "2026-05-02",
      orden_compra_ref: "",
      items: [
        { codigo: "A", descripcion: "Item", cantidad: "10", precio_unitario: "95000", subtotal: "950000" },
      ],
      total: "",
      observaciones: "",
    }

    const { payload, warnings } = mapAiToFacturaCompra(extracted)

    expect(payload.proveedorName).toBe("Arthrex")
    expect(payload.number).toBe("FC-001")
    expect(payload.date).toBe("2026-05-02")
    expect(payload.state).toBe("Pendiente")
    expect(payload.items[0].quantity).toBe(10)
    expect(payload.items[0].unitPrice).toBe(95000)
    expect(payload.items[0].subtotal).toBe(950000)
    expect(payload.total).toBe(950000)
    expect(warnings).toEqual([])
  })

  it("warns when total does not match sum of subtotals", () => {
    const extracted: FacturaCompraExtracted = {
      proveedor_name: "X",
      cuit_proveedor: "",
      tipo_factura: "",
      numero_factura: "F-1",
      fecha_factura: "2026-05-02",
      orden_compra_ref: "",
      items: [{ codigo: "A", descripcion: "B", cantidad: "1", precio_unitario: "100", subtotal: "100" }],
      total: "500",
      observaciones: "",
    }

    const { warnings } = mapAiToFacturaCompra(extracted)
    expect(warnings.some((w) => w.includes("no coincide"))).toBe(true)
  })

  it("uses explicit total when provided", () => {
    const extracted: FacturaCompraExtracted = {
      proveedor_name: "X",
      cuit_proveedor: "",
      tipo_factura: "",
      numero_factura: "F-1",
      fecha_factura: "2026-05-02",
      orden_compra_ref: "",
      items: [],
      total: "1234,56",
      observaciones: "",
    }

    const { payload } = mapAiToFacturaCompra(extracted)
    expect(payload.total).toBeCloseTo(1234.56, 2)
  })
})
