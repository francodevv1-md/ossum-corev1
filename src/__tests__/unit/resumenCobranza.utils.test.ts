import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Comprobante, CobroV2, ImputacionCobro } from "@/types"
import { PLAZO_PAGO_DEFAULT_DIAS } from "@/lib/cobros.constants"
import {
  getResumenCobranzaBySurgeryId,
} from "@/lib/cobros.utils"
import type { ResumenCobranzaSurgery, FacturaCobranzaDetalle, CobroImputadoDetalle } from "@/lib/cobros.utils"

// ═══════════════════════════════════════════════════════════════
// Mock Data Factories — Argentine peso realistic amounts
// ═══════════════════════════════════════════════════════════════

function makeComprobante(overrides: Partial<Comprobante> = {}): Comprobante {
  return {
    id: "comp-1",
    surgeryId: "surg-1",
    type: "FV",
    number: "FV-001",
    date: "2025-01-15",
    client: "cliente-1",
    amount: 1850000, // $1.850.000 ARS
    toCollect: 1850000,
    concept: "Cirugía rodilla — prótesis",
    state: "Facturada",
    ...overrides,
  }
}

function makeCobroV2(overrides: Partial<CobroV2> = {}): CobroV2 {
  return {
    id: "cobro-1",
    fecha: "2025-02-10",
    clienteId: "cliente-1",
    clienteNombre: "Hospital Alemán",
    importe: 925000, // $925.000 ARS
    medioCobro: "transferencia",
    referencia: "TXN-20250210-001",
    observaciones: "",
    fechaRegistro: "2025-02-10",
    ...overrides,
  }
}

function makeImputacion(overrides: Partial<ImputacionCobro> = {}): ImputacionCobro {
  return {
    id: "imp-1",
    cobroId: "cobro-1",
    facturaId: "FV-001",
    importeImputado: 500000, // $500.000 ARS
    fechaImputacion: "2025-02-10",
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// CHATZAI-015  —  getResumenCobranzaBySurgeryId
// Unit tests matching QA functional scenarios
// ═══════════════════════════════════════════════════════════════

describe("getResumenCobranzaBySurgeryId", () => {

  // ───────────────────────────────────────────────────────────
  // Scenario 1: Surgery with no FV → empty resumen
  // ───────────────────────────────────────────────────────────
  describe("Scenario 1 — Surgery with no FV", () => {
    it("returns empty resumen when there are no comprobantes at all", () => {
      const result = getResumenCobranzaBySurgeryId("surg-1", [], [], [])

      expect(result).toEqual({
        totalFacturado: 0,
        totalCobrado: 0,
        saldoPendiente: 0,
        facturas: [],
      })
    })

    it("returns empty resumen when comprobantes exist but none are FV type", () => {
      const comprobantes = [
        makeComprobante({ id: "comp-1", type: "NC", number: "NC-001" }),
        makeComprobante({ id: "comp-2", type: "ND", number: "ND-001" }),
        makeComprobante({ id: "comp-3", type: "NR", number: "NR-001" }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      expect(result).toEqual({
        totalFacturado: 0,
        totalCobrado: 0,
        saldoPendiente: 0,
        facturas: [],
      })
    })

    it("returns empty resumen when FVs belong to a different surgeryId", () => {
      const comprobantes = [
        makeComprobante({ id: "comp-1", surgeryId: "surg-2", type: "FV", number: "FV-099" }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      expect(result).toEqual({
        totalFacturado: 0,
        totalCobrado: 0,
        saldoPendiente: 0,
        facturas: [],
      })
    })

    it("ignores cobros and imputaciones when there are no FVs for the surgery", () => {
      const cobros = [
        makeCobroV2({ id: "cobro-1", importe: 500000 }),
      ]
      const imputaciones = [
        makeImputacion({ id: "imp-1", cobroId: "cobro-1", facturaId: "FV-099", importeImputado: 500000 }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", [], cobros, imputaciones)

      expect(result).toEqual({
        totalFacturado: 0,
        totalCobrado: 0,
        saldoPendiente: 0,
        facturas: [],
      })
    })
  })

  // ───────────────────────────────────────────────────────────
  // Scenario 2: Surgery with FV but no cobros (sin_cobrar)
  // ───────────────────────────────────────────────────────────
  describe("Scenario 2 — FV sin cobros (sin_cobrar state)", () => {
    it("returns resumen with sin_cobrar estadoCobranza and full saldoPendiente", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-03-01",
          amount: 2350000, // $2.350.000 ARS
          toCollect: 2350000,
          expiry: "2025-04-01", // future so it's not vencida
        }),
      ]

      // Freeze time so expiry 2025-04-01 is still in the future
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-03-15T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      expect(result.totalFacturado).toBe(2350000)
      expect(result.totalCobrado).toBe(0)
      expect(result.saldoPendiente).toBe(2350000)
      expect(result.facturas).toHaveLength(1)

      const fv = result.facturas[0]
      expect(fv.facturaNumber).toBe("FV-001")
      expect(fv.totalFactura).toBe(2350000)
      expect(fv.totalCobrado).toBe(0)
      expect(fv.saldoPendiente).toBe(2350000)
      expect(fv.estadoCobranza).toBe("sin_cobrar")
      expect(fv.vencida).toBe(false)
      expect(fv.cobros).toEqual([])

      vi.useRealTimers()
    })

    it("returns vencida instead of sin_cobrar when expiry is past", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-002",
          date: "2025-01-10",
          amount: 1750000,
          toCollect: 1750000,
          // no explicit expiry → vencimiento = date + 30 days = 2025-02-09
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-06-15T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      expect(result.facturas[0].estadoCobranza).toBe("vencida")
      expect(result.facturas[0].vencida).toBe(true)

      vi.useRealTimers()
    })

    it("includes vencimiento date in factura detalle", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-003",
          date: "2025-03-10",
          amount: 1200000,
          toCollect: 1200000,
          expiry: "2025-04-10",
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-03-20T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      expect(result.facturas[0].vencimiento).toBe("2025-04-10")

      vi.useRealTimers()
    })
  })

  // ───────────────────────────────────────────────────────────
  // Scenario 3: FV partially cobrada (cobro_parcial)
  // ───────────────────────────────────────────────────────────
  describe("Scenario 3 — FV partially cobrada (cobro_parcial)", () => {
    it("returns cobro_parcial estadoCobranza with correct totals", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-04-01",
          amount: 3200000, // $3.200.000 ARS
          toCollect: 3200000,
          expiry: "2025-05-01",
        }),
      ]
      const cobros = [
        makeCobroV2({
          id: "cobro-1",
          fecha: "2025-04-15",
          clienteId: "cliente-1",
          importe: 1500000, // $1.500.000 ARS cobrado
          medioCobro: "transferencia",
          referencia: "TXN-20250415",
        }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 1500000,
          fechaImputacion: "2025-04-15",
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-04-20T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.totalFacturado).toBe(3200000)
      expect(result.totalCobrado).toBe(1500000)
      expect(result.saldoPendiente).toBe(1700000)
      expect(result.facturas).toHaveLength(1)

      const fv = result.facturas[0]
      expect(fv.estadoCobranza).toBe("cobro_parcial")
      expect(fv.totalCobrado).toBe(1500000)
      expect(fv.saldoPendiente).toBe(1700000)
      expect(fv.vencida).toBe(false)

      vi.useRealTimers()
    })

    it("includes cobro detail in factura cobros array", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-04-01",
          amount: 3200000,
          toCollect: 3200000,
          expiry: "2025-05-01",
        }),
      ]
      const cobros = [
        makeCobroV2({
          id: "cobro-1",
          fecha: "2025-04-15",
          importe: 1500000,
          medioCobro: "transferencia",
          referencia: "TXN-20250415",
          observaciones: "Primer cobro parcial",
        }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 1500000,
          fechaImputacion: "2025-04-15",
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-04-20T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      const fv = result.facturas[0]
      expect(fv.cobros).toHaveLength(1)
      expect(fv.cobros[0]).toEqual({
        cobroId: "cobro-1",
        fecha: "2025-04-15",
        medioCobro: "Transferencia",
        referencia: "TXN-20250415",
        importeImputado: 1500000,
        observaciones: "Primer cobro parcial",
      })

      vi.useRealTimers()
    })
  })

  // ───────────────────────────────────────────────────────────
  // Scenario 4: FV fully cobrada (cobrada)
  // ───────────────────────────────────────────────────────────
  describe("Scenario 4 — FV fully cobrada (cobrada)", () => {
    it("returns cobrada estadoCobranza when totalCobrado equals totalFactura", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-01-15",
          amount: 2780000, // $2.780.000 ARS
          toCollect: 2780000,
        }),
      ]
      const cobros = [
        makeCobroV2({
          id: "cobro-1",
          fecha: "2025-02-01",
          importe: 2780000,
          medioCobro: "deposito",
          referencia: "DEP-001",
        }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 2780000,
          fechaImputacion: "2025-02-01",
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.totalFacturado).toBe(2780000)
      expect(result.totalCobrado).toBe(2780000)
      expect(result.saldoPendiente).toBe(0)

      const fv = result.facturas[0]
      expect(fv.estadoCobranza).toBe("cobrada")
      expect(fv.totalCobrado).toBe(2780000)
      expect(fv.saldoPendiente).toBe(0)
      expect(fv.vencida).toBe(false) // saldo 0 → never vencida
    })

    it("returns cobrada even when expiry is in the past (saldo=0 overrides vencida)", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-002",
          date: "2025-01-15",
          amount: 1450000,
          toCollect: 1450000,
          expiry: "2025-02-15", // far in the past
        }),
      ]
      const cobros = [
        makeCobroV2({
          id: "cobro-2",
          importe: 1450000,
          medioCobro: "efectivo",
        }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-2",
          cobroId: "cobro-2",
          facturaId: "FV-002",
          importeImputado: 1450000,
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-06-15T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.facturas[0].estadoCobranza).toBe("cobrada")
      expect(result.facturas[0].vencida).toBe(false)

      vi.useRealTimers()
    })

    it("uses MedioCobro label for cobro detail", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-003",
          date: "2025-03-01",
          amount: 960000,
          toCollect: 960000,
        }),
      ]
      const cobros = [
        makeCobroV2({
          id: "cobro-3",
          importe: 960000,
          medioCobro: "cheque",
        }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-3",
          cobroId: "cobro-3",
          facturaId: "FV-003",
          importeImputado: 960000,
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.facturas[0].cobros[0].medioCobro).toBe("Cheque") // Label, not raw value
    })
  })

  // ───────────────────────────────────────────────────────────
  // Scenario 5: FV vencida (expiry in past + saldo > 0)
  // ───────────────────────────────────────────────────────────
  describe("Scenario 5 — FV vencida state", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-06-15T12:00:00"))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("returns vencida when explicit expiry is in the past and saldo > 0", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-01-10",
          amount: 4100000, // $4.100.000 ARS
          toCollect: 4100000,
          expiry: "2025-02-10", // past
        }),
      ]
      const cobros = [
        makeCobroV2({
          id: "cobro-1",
          importe: 1200000,
          medioCobro: "transferencia",
        }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 1200000, // partial → saldo = 2.900.000
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      const fv = result.facturas[0]
      expect(fv.estadoCobranza).toBe("vencida")
      expect(fv.vencida).toBe(true)
      expect(fv.saldoPendiente).toBe(2900000)
      expect(fv.vencimiento).toBe("2025-02-10")
    })

    it("returns vencida when date+PLAZO default is past and saldo > 0 (no explicit expiry)", () => {
      // date: 2025-01-10, no expiry → vencimiento = 2025-01-10 + 30 = 2025-02-09
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-004",
          date: "2025-01-10",
          amount: 1980000,
          toCollect: 1980000,
          // no expiry → uses default plazo
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      const fv = result.facturas[0]
      expect(fv.estadoCobranza).toBe("vencida")
      expect(fv.vencida).toBe(true)

      // vencimiento should be date + PLAZO_PAGO_DEFAULT_DIAS
      const expectedVenc = new Date("2025-01-10T00:00:00")
      expectedVenc.setDate(expectedVenc.getDate() + PLAZO_PAGO_DEFAULT_DIAS)
      const expectedVencStr = expectedVenc.toISOString().slice(0, 10)
      expect(fv.vencimiento).toBe(expectedVencStr)
    })

    it("does NOT mark as vencida when expiry is in the past but saldo = 0", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-005",
          date: "2025-01-10",
          amount: 2100000,
          toCollect: 2100000,
          expiry: "2025-02-10", // past
        }),
      ]
      const cobros = [
        makeCobroV2({ id: "cobro-5", importe: 2100000, medioCobro: "deposito" }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-5",
          cobroId: "cobro-5",
          facturaId: "FV-005",
          importeImputado: 2100000, // fully paid
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.facturas[0].estadoCobranza).toBe("cobrada")
      expect(result.facturas[0].vencida).toBe(false)
    })

    it("marks vencida for FV with no cobros and past expiry", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-006",
          date: "2025-01-05",
          amount: 550000,
          toCollect: 550000,
          expiry: "2025-01-20", // long past
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      expect(result.facturas[0].estadoCobranza).toBe("vencida")
      expect(result.facturas[0].vencida).toBe(true)
      expect(result.facturas[0].totalCobrado).toBe(0)
      expect(result.facturas[0].saldoPendiente).toBe(550000)
    })
  })

  // ───────────────────────────────────────────────────────────
  // Scenario 6: FV with multiple cobros (multiple imputaciones
  //             to same facturaId)
  // ───────────────────────────────────────────────────────────
  describe("Scenario 6 — FV with multiple cobros", () => {
    it("aggregates multiple imputaciones across different cobros into one FV", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-03-01",
          amount: 5400000, // $5.400.000 ARS
          toCollect: 5400000,
          expiry: "2025-04-01",
        }),
      ]
      const cobros = [
        makeCobroV2({
          id: "cobro-1",
          fecha: "2025-03-10",
          importe: 2000000, // $2.000.000
          medioCobro: "transferencia",
          referencia: "TXN-001",
          observaciones: "Primera cuota",
        }),
        makeCobroV2({
          id: "cobro-2",
          fecha: "2025-03-20",
          importe: 1900000, // $1.900.000
          medioCobro: "cheque",
          referencia: "CHQ-045",
          observaciones: "Segunda cuota",
        }),
        makeCobroV2({
          id: "cobro-3",
          fecha: "2025-03-28",
          importe: 1500000, // $1.500.000
          medioCobro: "deposito",
          referencia: "DEP-078",
        }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 2000000,
          fechaImputacion: "2025-03-10",
        }),
        makeImputacion({
          id: "imp-2",
          cobroId: "cobro-2",
          facturaId: "FV-001",
          importeImputado: 1900000,
          fechaImputacion: "2025-03-20",
        }),
        makeImputacion({
          id: "imp-3",
          cobroId: "cobro-3",
          facturaId: "FV-001",
          importeImputado: 1500000,
          fechaImputacion: "2025-03-28",
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-03-25T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.totalFacturado).toBe(5400000)
      expect(result.totalCobrado).toBe(5400000) // 2M + 1.9M + 1.5M
      expect(result.saldoPendiente).toBe(0)

      const fv = result.facturas[0]
      expect(fv.estadoCobranza).toBe("cobrada")
      expect(fv.cobros).toHaveLength(3)

      // Verify each cobro detail
      expect(fv.cobros[0]).toEqual({
        cobroId: "cobro-1",
        fecha: "2025-03-10",
        medioCobro: "Transferencia",
        referencia: "TXN-001",
        importeImputado: 2000000,
        observaciones: "Primera cuota",
      })
      expect(fv.cobros[1]).toEqual({
        cobroId: "cobro-2",
        fecha: "2025-03-20",
        medioCobro: "Cheque",
        referencia: "CHQ-045",
        importeImputado: 1900000,
        observaciones: "Segunda cuota",
      })
      expect(fv.cobros[2]).toEqual({
        cobroId: "cobro-3",
        fecha: "2025-03-28",
        medioCobro: "Depósito",
        referencia: "DEP-078",
        importeImputado: 1500000,
        observaciones: "",
      })

      vi.useRealTimers()
    })

    it("handles partial cobro with multiple imputaciones to the same FV", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-010",
          date: "2025-04-01",
          amount: 8750000,
          toCollect: 8750000,
          expiry: "2025-05-01",
        }),
      ]
      const cobros = [
        makeCobroV2({
          id: "cobro-a",
          fecha: "2025-04-10",
          importe: 3000000,
          medioCobro: "transferencia",
        }),
        makeCobroV2({
          id: "cobro-b",
          fecha: "2025-04-20",
          importe: 2750000,
          medioCobro: "efectivo",
        }),
      ]
      const imputaciones = [
        makeImputacion({
          id: "imp-a",
          cobroId: "cobro-a",
          facturaId: "FV-010",
          importeImputado: 3000000,
        }),
        makeImputacion({
          id: "imp-b",
          cobroId: "cobro-b",
          facturaId: "FV-010",
          importeImputado: 2750000,
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-04-25T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.totalCobrado).toBe(5750000)
      expect(result.saldoPendiente).toBe(3000000)
      expect(result.facturas[0].estadoCobranza).toBe("cobro_parcial")
      expect(result.facturas[0].cobros).toHaveLength(2)

      vi.useRealTimers()
    })
  })

  // ───────────────────────────────────────────────────────────
  // Scenario 7: Cobro distributed across multiple FVs
  // (one CobroV2 imputed to 2 different facturas — Expediente
  //  should show only the portion imputed to its FV)
  // ───────────────────────────────────────────────────────────
  describe("Scenario 7 — Cobro distributed across multiple FVs", () => {
    it("shows only the imputed portion per FV when one cobro covers two facturas of same surgery", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-02-01",
          amount: 3600000, // $3.600.000 ARS
          toCollect: 3600000,
          expiry: "2025-03-01",
        }),
        makeComprobante({
          id: "comp-2",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-002",
          date: "2025-02-15",
          amount: 2400000, // $2.400.000 ARS
          toCollect: 2400000,
          expiry: "2025-03-15",
        }),
      ]

      // One single cobro of $4.000.000 split across both FVs
      const cobros = [
        makeCobroV2({
          id: "cobro-1",
          fecha: "2025-02-20",
          importe: 4000000, // $4.000.000 total
          medioCobro: "transferencia",
          referencia: "TXN-COMBINED-001",
          observaciones: "Pago combinado FV-001 y FV-002",
        }),
      ]

      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 3000000, // $3.000.000 to FV-001
          fechaImputacion: "2025-02-20",
        }),
        makeImputacion({
          id: "imp-2",
          cobroId: "cobro-1",
          facturaId: "FV-002",
          importeImputado: 1000000, // $1.000.000 to FV-002
          fechaImputacion: "2025-02-20",
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-02-25T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      // Surgery-level totals
      expect(result.totalFacturado).toBe(6000000) // 3.6M + 2.4M
      expect(result.totalCobrado).toBe(4000000) // 3M + 1M
      expect(result.saldoPendiente).toBe(2000000) // 600K + 1.4M
      expect(result.facturas).toHaveLength(2)

      // FV-001: $3.600.000 facturada, $3.000.000 cobrada
      const fv001 = result.facturas.find((f) => f.facturaNumber === "FV-001")!
      expect(fv001.totalFactura).toBe(3600000)
      expect(fv001.totalCobrado).toBe(3000000) // Only the portion imputed to FV-001
      expect(fv001.saldoPendiente).toBe(600000)
      expect(fv001.estadoCobranza).toBe("cobro_parcial")
      expect(fv001.cobros).toHaveLength(1)
      expect(fv001.cobros[0].importeImputado).toBe(3000000) // Only FV-001's portion
      expect(fv001.cobros[0].cobroId).toBe("cobro-1")

      // FV-002: $2.400.000 facturada, $1.000.000 cobrada
      const fv002 = result.facturas.find((f) => f.facturaNumber === "FV-002")!
      expect(fv002.totalFactura).toBe(2400000)
      expect(fv002.totalCobrado).toBe(1000000) // Only the portion imputed to FV-002
      expect(fv002.saldoPendiente).toBe(1400000)
      expect(fv002.estadoCobranza).toBe("cobro_parcial")
      expect(fv002.cobros).toHaveLength(1)
      expect(fv002.cobros[0].importeImputado).toBe(1000000) // Only FV-002's portion
      expect(fv002.cobros[0].cobroId).toBe("cobro-1")

      vi.useRealTimers()
    })

    it("correctly handles cobro split across FVs of DIFFERENT surgeries (isolation)", () => {
      // Cobro-1 is imputed to FV-001 (surg-1) and FV-099 (surg-2)
      // getResumenCobranzaBySurgeryId("surg-1") should only see the FV-001 portion
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-03-01",
          amount: 2800000,
          toCollect: 2800000,
          expiry: "2025-04-01",
        }),
        makeComprobante({
          id: "comp-2",
          surgeryId: "surg-2", // Different surgery!
          type: "FV",
          number: "FV-099",
          date: "2025-03-05",
          amount: 1500000,
          toCollect: 1500000,
          expiry: "2025-04-05",
        }),
      ]

      const cobros = [
        makeCobroV2({
          id: "cobro-1",
          fecha: "2025-03-10",
          importe: 3500000, // $3.500.000 total cobro
          medioCobro: "transferencia",
          referencia: "TXN-SPLIT",
        }),
      ]

      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 2000000, // $2.000.000 to surg-1's FV
          fechaImputacion: "2025-03-10",
        }),
        makeImputacion({
          id: "imp-2",
          cobroId: "cobro-1",
          facturaId: "FV-099",
          importeImputado: 1500000, // $1.500.000 to surg-2's FV
          fechaImputacion: "2025-03-10",
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-03-20T12:00:00"))

      // Query only surg-1 — should see only its FV-001 portion
      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.facturas).toHaveLength(1)
      expect(result.totalFacturado).toBe(2800000) // Only FV-001's amount
      expect(result.totalCobrado).toBe(2000000) // Only the imputed portion for FV-001
      expect(result.saldoPendiente).toBe(800000)

      const fv = result.facturas[0]
      expect(fv.facturaNumber).toBe("FV-001")
      expect(fv.totalCobrado).toBe(2000000) // NOT 3.500.000 (the full cobro)
      expect(fv.cobros).toHaveLength(1)
      expect(fv.cobros[0].importeImputado).toBe(2000000)

      vi.useRealTimers()
    })

    it("handles cobro with multiple imputaciones to same FV and also to another FV", () => {
      // One cobro, 3 imputaciones: 2 to FV-001, 1 to FV-002
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-05-01",
          amount: 4000000,
          toCollect: 4000000,
          expiry: "2025-06-01",
        }),
        makeComprobante({
          id: "comp-2",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-002",
          date: "2025-05-10",
          amount: 2500000,
          toCollect: 2500000,
          expiry: "2025-06-10",
        }),
      ]

      const cobros = [
        makeCobroV2({
          id: "cobro-1",
          fecha: "2025-05-15",
          importe: 5000000,
          medioCobro: "cheque",
          referencia: "CHQ-BIG",
        }),
      ]

      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 2500000,
          fechaImputacion: "2025-05-15",
        }),
        makeImputacion({
          id: "imp-2",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 1000000, // second imputation to FV-001
          fechaImputacion: "2025-05-16",
        }),
        makeImputacion({
          id: "imp-3",
          cobroId: "cobro-1",
          facturaId: "FV-002",
          importeImputado: 1500000,
          fechaImputacion: "2025-05-16",
        }),
      ]

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-05-20T12:00:00"))

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      // FV-001: 2.5M + 1M = 3.5M cobrado, saldo 500K
      const fv001 = result.facturas.find((f) => f.facturaNumber === "FV-001")!
      expect(fv001.totalCobrado).toBe(3500000)
      expect(fv001.saldoPendiente).toBe(500000)
      expect(fv001.estadoCobranza).toBe("cobro_parcial")
      expect(fv001.cobros).toHaveLength(2) // two imputaciones, one per entry
      expect(fv001.cobros[0].importeImputado).toBe(2500000)
      expect(fv001.cobros[1].importeImputado).toBe(1000000)

      // FV-002: 1.5M cobrado, saldo 1M
      const fv002 = result.facturas.find((f) => f.facturaNumber === "FV-002")!
      expect(fv002.totalCobrado).toBe(1500000)
      expect(fv002.saldoPendiente).toBe(1000000)
      expect(fv002.cobros).toHaveLength(1)
      expect(fv002.cobros[0].importeImputado).toBe(1500000)

      // Surgery totals
      expect(result.totalFacturado).toBe(6500000)
      expect(result.totalCobrado).toBe(5000000)
      expect(result.saldoPendiente).toBe(1500000)

      vi.useRealTimers()
    })
  })

  // ───────────────────────────────────────────────────────────
  // Edge cases & integration
  // ───────────────────────────────────────────────────────────
  describe("Edge cases", () => {
    it("handles multiple FVs in the same surgery with mixed estados", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2025-06-15T12:00:00"))

      const comprobantes = [
        // FV-001: fully cobrada
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-01-15",
          amount: 1500000,
          toCollect: 1500000,
        }),
        // FV-002: cobro_parcial (not yet vencida)
        makeComprobante({
          id: "comp-2",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-002",
          date: "2025-06-01",
          amount: 3200000,
          toCollect: 3200000,
          expiry: "2025-07-01",
        }),
        // FV-003: vencida (sin cobros, past expiry)
        makeComprobante({
          id: "comp-3",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-003",
          date: "2025-02-01",
          amount: 980000,
          toCollect: 980000,
          expiry: "2025-03-01",
        }),
      ]

      const cobros = [
        makeCobroV2({ id: "cobro-1", importe: 1500000, medioCobro: "transferencia" }),
        makeCobroV2({ id: "cobro-2", importe: 1200000, medioCobro: "deposito" }),
      ]

      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-1",
          facturaId: "FV-001",
          importeImputado: 1500000,
        }),
        makeImputacion({
          id: "imp-2",
          cobroId: "cobro-2",
          facturaId: "FV-002",
          importeImputado: 1200000,
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      expect(result.facturas).toHaveLength(3)
      expect(result.totalFacturado).toBe(5680000) // 1.5M + 3.2M + 980K
      expect(result.totalCobrado).toBe(2700000) // 1.5M + 1.2M + 0
      expect(result.saldoPendiente).toBe(2980000) // 0 + 2M + 980K

      // FV-001: cobrada
      const fv001 = result.facturas.find((f) => f.facturaNumber === "FV-001")!
      expect(fv001.estadoCobranza).toBe("cobrada")

      // FV-002: cobro_parcial
      const fv002 = result.facturas.find((f) => f.facturaNumber === "FV-002")!
      expect(fv002.estadoCobranza).toBe("cobro_parcial")

      // FV-003: vencida
      const fv003 = result.facturas.find((f) => f.facturaNumber === "FV-003")!
      expect(fv003.estadoCobranza).toBe("vencida")

      vi.useRealTimers()
    })

    it("ignores non-FV comprobantes for the same surgeryId", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-03-01",
          amount: 1200000,
          toCollect: 1200000,
        }),
        makeComprobante({
          id: "comp-2",
          surgeryId: "surg-1",
          type: "NC",
          number: "NC-001",
          date: "2025-03-05",
          amount: 300000,
          toCollect: 300000,
        }),
        makeComprobante({
          id: "comp-3",
          surgeryId: "surg-1",
          type: "ND",
          number: "ND-001",
          date: "2025-03-10",
          amount: 150000,
          toCollect: 150000,
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      // Only FV-001 counted
      expect(result.facturas).toHaveLength(1)
      expect(result.totalFacturado).toBe(1200000)
      expect(result.facturas[0].facturaNumber).toBe("FV-001")
    })

    it("uses cobro fechaImputacion as fallback when cobroV2 not found", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-04-01",
          amount: 800000,
          toCollect: 800000,
        }),
      ]
      // Empty cobrosV2 array — the cobro referenced by the imputacion doesn't exist
      const cobros: CobroV2[] = []
      const imputaciones = [
        makeImputacion({
          id: "imp-1",
          cobroId: "cobro-phantom",
          facturaId: "FV-001",
          importeImputado: 800000,
          fechaImputacion: "2025-04-10",
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, cobros, imputaciones)

      const fv = result.facturas[0]
      expect(fv.totalCobrado).toBe(800000)
      expect(fv.estadoCobranza).toBe("cobrada")
      expect(fv.cobros).toHaveLength(1)
      expect(fv.cobros[0].fecha).toBe("2025-04-10") // fallback to fechaImputacion
      expect(fv.cobros[0].medioCobro).toBe("—") // fallback when cobroV2 not found
      expect(fv.cobros[0].referencia).toBeUndefined()
      expect(fv.cobros[0].observaciones).toBeUndefined()
    })

    it("computes vencimiento using date + PLAZO_PAGO_DEFAULT_DIAS when no explicit expiry", () => {
      const comprobantes = [
        makeComprobante({
          id: "comp-1",
          surgeryId: "surg-1",
          type: "FV",
          number: "FV-001",
          date: "2025-05-20",
          amount: 670000,
          toCollect: 670000,
          // no expiry
        }),
      ]

      const result = getResumenCobranzaBySurgeryId("surg-1", comprobantes, [], [])

      const expectedVenc = new Date("2025-05-20T00:00:00")
      expectedVenc.setDate(expectedVenc.getDate() + PLAZO_PAGO_DEFAULT_DIAS)
      const expectedVencStr = expectedVenc.toISOString().slice(0, 10)

      expect(result.facturas[0].vencimiento).toBe(expectedVencStr)
    })
  })
})
