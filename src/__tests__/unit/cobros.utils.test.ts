import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Comprobante, CobroV2, ImputacionCobro } from "@/types"
import { PLAZO_PAGO_DEFAULT_DIAS } from "@/lib/cobros.constants"
import {
  getImporteImputadoCobro,
  getImporteNoImputadoCobro,
  getTotalCobradoFactura,
  getSaldoPendienteFactura,
  getEstadoCobranzaFactura,
  getEstadoCobro,
  getVencimientoFV,
  isFacturaVencida,
  getCobrosByFacturaId,
  getFacturasAbiertasByCliente,
} from "@/lib/cobros.utils"

// ═══════════════════════════════════════════════════════════════
// Mock Data Factory
// ═══════════════════════════════════════════════════════════════

function makeComprobante(overrides: Partial<Comprobante> = {}): Comprobante {
  return {
    id: "comp-1",
    surgeryId: "surg-1",
    type: "FV",
    number: "FV-001",
    date: "2025-01-15",
    client: "cliente-1",
    amount: 10000,
    toCollect: 10000,
    concept: "Cirugía rodilla",
    state: "Facturada",
    ...overrides,
  }
}

function makeCobroV2(overrides: Partial<CobroV2> = {}): CobroV2 {
  return {
    id: "cobro-1",
    fecha: "2025-02-01",
    clienteId: "cliente-1",
    clienteNombre: "Hospital Central",
    importe: 5000,
    medioCobro: "transferencia",
    referencia: "REF-001",
    observaciones: "",
    fechaRegistro: "2025-02-01",
    ...overrides,
  }
}

function makeImputacion(overrides: Partial<ImputacionCobro> = {}): ImputacionCobro {
  return {
    id: "imp-1",
    cobroId: "cobro-1",
    facturaId: "FV-001",
    importeImputado: 3000,
    fechaImputacion: "2025-02-01",
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. getImporteImputadoCobro
// ═══════════════════════════════════════════════════════════════

describe("getImporteImputadoCobro", () => {
  it("returns 0 for cobro sin imputaciones", () => {
    const result = getImporteImputadoCobro("cobro-1", [])
    expect(result).toBe(0)
  })

  it("returns importeImputado for cobro with one imputacion", () => {
    const imputaciones = [makeImputacion({ cobroId: "cobro-1", importeImputado: 3500 })]
    const result = getImporteImputadoCobro("cobro-1", imputaciones)
    expect(result).toBe(3500)
  })

  it("returns sum of importes for cobro with multiple imputaciones", () => {
    const imputaciones = [
      makeImputacion({ id: "imp-1", cobroId: "cobro-1", importeImputado: 2000 }),
      makeImputacion({ id: "imp-2", cobroId: "cobro-1", importeImputado: 1500 }),
      makeImputacion({ id: "imp-3", cobroId: "cobro-1", importeImputado: 500 }),
    ]
    const result = getImporteImputadoCobro("cobro-1", imputaciones)
    expect(result).toBe(4000)
  })

  it("ignores imputaciones from other cobros", () => {
    const imputaciones = [
      makeImputacion({ id: "imp-1", cobroId: "cobro-1", importeImputado: 2000 }),
      makeImputacion({ id: "imp-2", cobroId: "cobro-2", importeImputado: 5000 }),
    ]
    const result = getImporteImputadoCobro("cobro-1", imputaciones)
    expect(result).toBe(2000)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. getImporteNoImputadoCobro
// ═══════════════════════════════════════════════════════════════

describe("getImporteNoImputadoCobro", () => {
  it("returns 0 when cobro is totally imputado", () => {
    const cobro = makeCobroV2({ importe: 5000 })
    const imputaciones = [makeImputacion({ cobroId: cobro.id, importeImputado: 5000 })]
    const result = getImporteNoImputadoCobro(cobro, imputaciones)
    expect(result).toBe(0)
  })

  it("returns importe - imputado when partially imputado", () => {
    const cobro = makeCobroV2({ importe: 5000 })
    const imputaciones = [makeImputacion({ cobroId: cobro.id, importeImputado: 2000 })]
    const result = getImporteNoImputadoCobro(cobro, imputaciones)
    expect(result).toBe(3000)
  })

  it("returns full importe when cobro has no imputaciones", () => {
    const cobro = makeCobroV2({ importe: 5000 })
    const result = getImporteNoImputadoCobro(cobro, [])
    expect(result).toBe(5000)
  })

  it("clamps to 0 when imputado exceeds importe (over-imputation)", () => {
    const cobro = makeCobroV2({ importe: 5000 })
    const imputaciones = [makeImputacion({ cobroId: cobro.id, importeImputado: 7000 })]
    const result = getImporteNoImputadoCobro(cobro, imputaciones)
    expect(result).toBe(0) // Math.max(0, 5000 - 7000)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. getTotalCobradoFactura
// ═══════════════════════════════════════════════════════════════

describe("getTotalCobradoFactura", () => {
  it("returns 0 for factura sin cobros", () => {
    const result = getTotalCobradoFactura("FV-001", [])
    expect(result).toBe(0)
  })

  it("returns importe imputado for factura with one cobro", () => {
    const imputaciones = [makeImputacion({ facturaId: "FV-001", importeImputado: 4000 })]
    const result = getTotalCobradoFactura("FV-001", imputaciones)
    expect(result).toBe(4000)
  })

  it("returns sum of imputaciones for factura with multiple cobros", () => {
    const imputaciones = [
      makeImputacion({ id: "imp-1", facturaId: "FV-001", cobroId: "cobro-1", importeImputado: 3000 }),
      makeImputacion({ id: "imp-2", facturaId: "FV-001", cobroId: "cobro-2", importeImputado: 2500 }),
      makeImputacion({ id: "imp-3", facturaId: "FV-001", cobroId: "cobro-3", importeImputado: 1500 }),
    ]
    const result = getTotalCobradoFactura("FV-001", imputaciones)
    expect(result).toBe(7000)
  })

  it("ignores imputaciones for other facturas", () => {
    const imputaciones = [
      makeImputacion({ id: "imp-1", facturaId: "FV-001", importeImputado: 3000 }),
      makeImputacion({ id: "imp-2", facturaId: "FV-002", importeImputado: 8000 }),
    ]
    const result = getTotalCobradoFactura("FV-001", imputaciones)
    expect(result).toBe(3000)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. getSaldoPendienteFactura
// ═══════════════════════════════════════════════════════════════

describe("getSaldoPendienteFactura", () => {
  it("returns amount when factura has no cobros", () => {
    const factura = makeComprobante({ amount: 10000 })
    const result = getSaldoPendienteFactura(factura, [])
    expect(result).toBe(10000)
  })

  it("returns amount - cobrado when factura has partial cobro", () => {
    const factura = makeComprobante({ amount: 10000 })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 3500 })]
    const result = getSaldoPendienteFactura(factura, imputaciones)
    expect(result).toBe(6500)
  })

  it("returns 0 when factura is totally cobrada", () => {
    const factura = makeComprobante({ amount: 10000 })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 10000 })]
    const result = getSaldoPendienteFactura(factura, imputaciones)
    expect(result).toBe(0)
  })

  it("returns 0 when cobro exceeds amount (Math.max clamps to 0)", () => {
    const factura = makeComprobante({ amount: 10000 })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 15000 })]
    const result = getSaldoPendienteFactura(factura, imputaciones)
    expect(result).toBe(0) // Math.max(0, 10000 - 15000)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. getEstadoCobranzaFactura
// ═══════════════════════════════════════════════════════════════

describe("getEstadoCobranzaFactura", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-15T12:00:00"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "sin_cobrar" for factura without cobros', () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-06-01",
    })
    const result = getEstadoCobranzaFactura(factura, [])
    expect(result).toBe("sin_cobrar")
  })

  it('returns "cobro_parcial" for factura with partial cobro', () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-06-01",
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 4000 })]
    const result = getEstadoCobranzaFactura(factura, imputaciones)
    expect(result).toBe("cobro_parcial")
  })

  it('returns "cobrada" for fully cobrada factura', () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-01-01",
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 10000 })]
    const result = getEstadoCobranzaFactura(factura, imputaciones)
    expect(result).toBe("cobrada")
  })

  it('returns "vencida" for vencida factura with saldo pendiente', () => {
    // date: 2025-01-01 → vencimiento = 2025-01-31 (past) → vencida
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-01-01",
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 3000 })]
    const result = getEstadoCobranzaFactura(factura, imputaciones)
    expect(result).toBe("vencida")
  })

  it('returns "cobrada" (not vencida) for vencida factura with saldo 0', () => {
    // date: 2025-01-01 → vencimiento = 2025-01-31 (past), pero saldo = 0 → cobrada
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-01-01",
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 10000 })]
    const result = getEstadoCobranzaFactura(factura, imputaciones)
    expect(result).toBe("cobrada")
  })

  it('returns "vencida" when using explicit expiry date in the past', () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-06-01",
      expiry: "2025-06-10", // past relative to "today" = 2025-06-15
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 3000 })]
    const result = getEstadoCobranzaFactura(factura, imputaciones)
    expect(result).toBe("vencida")
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. getEstadoCobro
// ═══════════════════════════════════════════════════════════════

describe("getEstadoCobro", () => {
  it('returns "registrado" for cobro without imputaciones', () => {
    const cobro = makeCobroV2({ importe: 5000 })
    const result = getEstadoCobro(cobro, [])
    expect(result).toBe("registrado")
  })

  it('returns "parcialmente_imputado" for partially imputado cobro', () => {
    const cobro = makeCobroV2({ importe: 5000 })
    const imputaciones = [makeImputacion({ cobroId: cobro.id, importeImputado: 2000 })]
    const result = getEstadoCobro(cobro, imputaciones)
    expect(result).toBe("parcialmente_imputado")
  })

  it('returns "imputado_completo" for fully imputado cobro', () => {
    const cobro = makeCobroV2({ importe: 5000 })
    const imputaciones = [makeImputacion({ cobroId: cobro.id, importeImputado: 5000 })]
    const result = getEstadoCobro(cobro, imputaciones)
    expect(result).toBe("imputado_completo")
  })

  it('returns "imputado_completo" when imputado exceeds cobro importe', () => {
    const cobro = makeCobroV2({ importe: 5000 })
    const imputaciones = [
      makeImputacion({ cobroId: cobro.id, importeImputado: 3000 }),
      makeImputacion({ id: "imp-2", cobroId: cobro.id, importeImputado: 3000 }),
    ]
    const result = getEstadoCobro(cobro, imputaciones)
    // imputado = 6000 >= importe 5000
    expect(result).toBe("imputado_completo")
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. getVencimientoFV
// ═══════════════════════════════════════════════════════════════

describe("getVencimientoFV", () => {
  it("uses expiry when comprobante has one", () => {
    const comprobante = makeComprobante({
      date: "2025-01-15",
      expiry: "2025-02-15",
    })
    const result = getVencimientoFV(comprobante)
    expect(result).toEqual(new Date("2025-02-15T00:00:00"))
  })

  it("uses date + PLAZO_PAGO_DEFAULT_DIAS when no expiry", () => {
    const comprobante = makeComprobante({
      date: "2025-01-15",
      expiry: undefined,
    })
    const result = getVencimientoFV(comprobante)
    const expected = new Date("2025-01-15T00:00:00")
    expected.setDate(expected.getDate() + PLAZO_PAGO_DEFAULT_DIAS)

    expect(result.getFullYear()).toBe(expected.getFullYear())
    expect(result.getMonth()).toBe(expected.getMonth())
    expect(result.getDate()).toBe(expected.getDate())
  })

  it(`defaults to ${PLAZO_PAGO_DEFAULT_DIAS} days after date when no expiry`, () => {
    const comprobante = makeComprobante({
      date: "2025-03-01",
      expiry: undefined,
    })
    const result = getVencimientoFV(comprobante)
    // 2025-03-01 + 30 days = 2025-03-31
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(2) // March = month index 2
    expect(result.getDate()).toBe(31)
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. isFacturaVencida
// ═══════════════════════════════════════════════════════════════

describe("isFacturaVencida", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-15T12:00:00"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns false when saldo is 0 (even if fecha is vencida)", () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-01-01", // vencimiento would be 2025-01-31 (past)
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 10000 })]
    const result = isFacturaVencida(factura, imputaciones)
    expect(result).toBe(false)
  })

  it("returns false when saldo > 0 but vencimiento is in the future", () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-06-01", // vencimiento = 2025-07-01 (future)
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 3000 })]
    const result = isFacturaVencida(factura, imputaciones)
    expect(result).toBe(false)
  })

  it("returns true when saldo > 0 and vencimiento is in the past", () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-01-01", // vencimiento = 2025-01-31 (past)
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 3000 })]
    const result = isFacturaVencida(factura, imputaciones)
    expect(result).toBe(true)
  })

  it("returns true when saldo > 0 and explicit expiry is in the past", () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-06-01",
      expiry: "2025-06-10", // past relative to 2025-06-15
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 2000 })]
    const result = isFacturaVencida(factura, imputaciones)
    expect(result).toBe(true)
  })

  it("returns false when saldo > 0 and expiry is today (not strictly past)", () => {
    const factura = makeComprobante({
      amount: 10000,
      date: "2025-05-01",
      expiry: "2025-06-15", // today
    })
    const imputaciones = [makeImputacion({ facturaId: factura.number, importeImputado: 3000 })]
    const result = isFacturaVencida(factura, imputaciones)
    // vencimiento (2025-06-15T00:00:00) is NOT < hoy (2025-06-15T00:00:00)
    expect(result).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. getCobrosByFacturaId
// ═══════════════════════════════════════════════════════════════

describe("getCobrosByFacturaId", () => {
  it("returns empty array for factura without imputaciones", () => {
    const cobros = [makeCobroV2({ id: "cobro-1" })]
    const result = getCobrosByFacturaId("FV-001", cobros, [])
    expect(result).toEqual([])
  })

  it("returns corresponding cobros for factura with imputaciones", () => {
    const cobros = [
      makeCobroV2({ id: "cobro-1", importe: 3000 }),
      makeCobroV2({ id: "cobro-2", importe: 5000 }),
      makeCobroV2({ id: "cobro-3", importe: 7000 }),
    ]
    const imputaciones = [
      makeImputacion({ id: "imp-1", cobroId: "cobro-1", facturaId: "FV-001" }),
      makeImputacion({ id: "imp-2", cobroId: "cobro-2", facturaId: "FV-001" }),
      // cobro-3 is NOT imputed to FV-001
      makeImputacion({ id: "imp-3", cobroId: "cobro-3", facturaId: "FV-002" }),
    ]
    const result = getCobrosByFacturaId("FV-001", cobros, imputaciones)
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.id).sort()).toEqual(["cobro-1", "cobro-2"])
  })

  it("deduplicates cobros when multiple imputaciones point to the same cobro", () => {
    const cobros = [makeCobroV2({ id: "cobro-1", importe: 10000 })]
    const imputaciones = [
      makeImputacion({ id: "imp-1", cobroId: "cobro-1", facturaId: "FV-001", importeImputado: 4000 }),
      makeImputacion({ id: "imp-2", cobroId: "cobro-1", facturaId: "FV-001", importeImputado: 3000 }),
    ]
    const result = getCobrosByFacturaId("FV-001", cobros, imputaciones)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("cobro-1")
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. getFacturasAbiertasByCliente
// ═══════════════════════════════════════════════════════════════

describe("getFacturasAbiertasByCliente", () => {
  it("returns empty array for cliente without facturas", () => {
    const comprobantes = [
      makeComprobante({ id: "comp-1", type: "FV", client: "cliente-2", number: "FV-002", amount: 5000 }),
    ]
    const result = getFacturasAbiertasByCliente("cliente-1", comprobantes, [])
    expect(result).toEqual([])
  })

  it("returns only facturas with saldo > 0 for cliente", () => {
    const comprobantes = [
      makeComprobante({
        id: "comp-1", type: "FV", client: "cliente-1", number: "FV-001", amount: 10000,
      }),
      makeComprobante({
        id: "comp-2", type: "FV", client: "cliente-1", number: "FV-002", amount: 8000,
      }),
    ]
    const imputaciones = [
      // FV-001 partially paid: saldo = 10000 - 3000 = 7000 > 0
      makeImputacion({ facturaId: "FV-001", importeImputado: 3000 }),
      // FV-002 fully paid: saldo = 8000 - 8000 = 0
      makeImputacion({ id: "imp-2", facturaId: "FV-002", importeImputado: 8000 }),
    ]
    const result = getFacturasAbiertasByCliente("cliente-1", comprobantes, imputaciones)
    expect(result).toHaveLength(1)
    expect(result[0].number).toBe("FV-001")
  })

  it("does not include fully cobrada facturas", () => {
    const comprobantes = [
      makeComprobante({
        id: "comp-1", type: "FV", client: "cliente-1", number: "FV-001", amount: 5000,
      }),
    ]
    const imputaciones = [
      makeImputacion({ facturaId: "FV-001", importeImputado: 5000 }),
    ]
    const result = getFacturasAbiertasByCliente("cliente-1", comprobantes, imputaciones)
    expect(result).toEqual([])
  })

  it("ignores non-FV comprobantes", () => {
    const comprobantes = [
      makeComprobante({
        id: "comp-1", type: "NC", client: "cliente-1", number: "NC-001", amount: 5000,
      }),
      makeComprobante({
        id: "comp-2", type: "FV", client: "cliente-1", number: "FV-001", amount: 10000,
      }),
    ]
    const result = getFacturasAbiertasByCliente("cliente-1", comprobantes, [])
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("FV")
  })

  it("only includes facturas for the specified cliente", () => {
    const comprobantes = [
      makeComprobante({
        id: "comp-1", type: "FV", client: "cliente-1", number: "FV-001", amount: 10000,
      }),
      makeComprobante({
        id: "comp-2", type: "FV", client: "cliente-2", number: "FV-002", amount: 8000,
      }),
    ]
    const result = getFacturasAbiertasByCliente("cliente-1", comprobantes, [])
    expect(result).toHaveLength(1)
    expect(result[0].client).toBe("cliente-1")
  })
})
