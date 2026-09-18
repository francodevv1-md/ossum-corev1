/**
 * facturacion.utils.test.ts
 * Comprehensive unit tests for the Facturación utility functions (CHATZAI-010).
 */

import { describe, it, expect } from "vitest"
import type {
  Consumo,
  Presupuesto,
  StockItem,
  Comprobante,
  ImputacionCobro,
  Surgery,
  DocumentStatus,
  ConsumoState,
  BaseFacturacion,
} from "@/types"

import {
  getConsumoValorizado,
  getDiferenciasPresupuestoConsumo,
  getMontoFacturable,
  getSaldoPendiente,
  getEstadoFacturacion,
  getEstadoFacturacionWithFV,
  suggestBaseFacturacion,
} from "@/lib/facturacion.utils"

// ═══════════════════════════════════════════════════════════════
// MOCK DATA FACTORIES
// ═══════════════════════════════════════════════════════════════

function makeStockItem(overrides: Partial<StockItem> = {}): StockItem {
  return {
    id: "stk-1",
    code: "ART-001",
    name: "Tornillo Cortical",
    description: "Tornillo cortical 3.5mm",
    category: "Osteosíntesis",
    section: "Tornillos",
    rubro: "Implantes",
    department: "Depósito Central",
    brand: "Zimmer",
    supplier: "Zimmer Biomet",
    lot: "LOT-2024-001",
    serial: undefined,
    expiry: "2026-12-31",
    quantity: 50,
    minStock: 10,
    location: "Estante A-3",
    deposit: "Central",
    sterilized: false,
    unitPrice: 1500,
    ingresoComprobante: undefined,
    ...overrides,
  }
}

function makePresupuesto(overrides: Partial<Presupuesto> = {}): Presupuesto {
  return {
    id: "pr-1",
    surgeryId: "sx-1",
    client: "Hospital Italiano",
    obraSocial: "OSDE",
    financiador: "OSDE 210",
    vendedor: "Juan Pérez",
    patient: "María García",
    institution: "Hospital Italiano",
    concepto: undefined,
    fechaEmision: "2024-01-15",
    vigencia: "30 días",
    listaPrecios: "LP-2024-01",
    condicionPago: "30 días",
    descuento: undefined,
    items: [],
    subtotal: 0,
    total: 0,
    state: "Aprobado",
    createdAt: "2024-01-15",
    approvedAt: "2024-01-16",
    observaciones: undefined,
    bloqueado: false,
    version: 1,
    versionStatus: "vigente",
    parentPresupuestoId: undefined,
    revisorInternoId: undefined,
    fechaRevisionInterna: undefined,
    aprobadoInternamente: undefined,
    ...overrides,
  }
}

function makeConsumo(overrides: Partial<Consumo> = {}): Consumo {
  return {
    id: "con-1",
    surgeryId: "sx-1",
    boxId: "box-1",
    items: [],
    validatedBy: "user-1",
    validatedAt: "2024-01-20",
    state: "Validado",
    ...overrides,
  }
}

function makeSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "sx-1",
    patient: "María García",
    patientDni: "12345678",
    surgeon: "Dr. López",
    institution: "Hospital Italiano",
    institutionCity: "CABA",
    procedure: "Prótesis de cadera",
    date: "2024-01-18",
    time: "08:00",
    state: "Realizada",
    client: "Hospital Italiano",
    classification: "Prótesis de cadera",
    preparationState: "Retirado",
    facturado: false,
    autorizado: false,
    urgente: false,
    leyendaDestacada: false,
    referenciasAdministrativas: [],
    ...overrides,
  }
}

function makeComprobante(overrides: Partial<Comprobante> = {}): Comprobante {
  return {
    id: "cmp-1",
    surgeryId: "sx-1",
    type: "FV",
    number: "FV-0001-00000001",
    date: "2024-01-25",
    client: "Hospital Italiano",
    amount: 100000,
    toCollect: 100000,
    concept: "Prótesis de cadera",
    state: "Emitida",
    ...overrides,
  }
}

function makeImputacion(overrides: Partial<ImputacionCobro> = {}): ImputacionCobro {
  return {
    id: "imp-1",
    cobroId: "cobro-1",
    facturaId: "FV-0001-00000001",
    importeImputado: 50000,
    fechaImputacion: "2024-02-01",
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. getConsumoValorizado()
// ═══════════════════════════════════════════════════════════════

describe("getConsumoValorizado", () => {
  it("retorna { items: [], total: 0, itemsSinPrecio: [] } cuando consumo está vacío", () => {
    const result = getConsumoValorizado(undefined, undefined, [])
    expect(result).toEqual({ items: [], total: 0, itemsSinPrecio: [] })
  })

  it("retorna { items: [], total: 0, itemsSinPrecio: [] } cuando consumo tiene items vacíos", () => {
    const consumo = makeConsumo({ items: [] })
    const result = getConsumoValorizado(consumo, undefined, [])
    expect(result).toEqual({ items: [], total: 0, itemsSinPrecio: [] })
  })

  it("usa precios de presupuesto cuando los ítems consumidos están presupuestados", () => {
    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
        {
          stockItemId: "stk-2",
          name: "Placa LCP",
          code: "ART-002",
          lot: "LOT-2024-002",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Synthes",
          consumed: 2,
          returned: 0,
        },
      ],
    })

    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          quantity: 5,
          unitPrice: 1500,
          subtotal: 7500,
          isArticuloZ: false,
        },
        {
          stockItemId: "stk-2",
          name: "Placa LCP",
          code: "ART-002",
          quantity: 2,
          unitPrice: 25000,
          subtotal: 50000,
          isArticuloZ: false,
        },
      ],
      subtotal: 57500,
      total: 57500,
    })

    const result = getConsumoValorizado(consumo, presupuesto, [])

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(5 * 1500 + 2 * 25000) // 7500 + 50000 = 57500
    expect(result.itemsSinPrecio).toEqual([])

    // Verify presupuesto price origin
    expect(result.items[0].precioOrigen).toBe("presupuesto")
    expect(result.items[0].unitPrice).toBe(1500)
    expect(result.items[0].subtotal).toBe(7500)

    expect(result.items[1].precioOrigen).toBe("presupuesto")
    expect(result.items[1].unitPrice).toBe(25000)
    expect(result.items[1].subtotal).toBe(50000)
  })

  it("usa precio de stock para ítems consumidos no presupuestados", () => {
    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-3",
          name: "Clavo Intramedular",
          code: "ART-003",
          lot: "LOT-2024-003",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Stryker",
          consumed: 1,
          returned: 0,
        },
      ],
    })

    // Presupuesto does NOT include ART-003
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          quantity: 5,
          unitPrice: 1500,
          subtotal: 7500,
        },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const stockItems = [
      makeStockItem({ id: "stk-3", code: "ART-003", name: "Clavo Intramedular", unitPrice: 45000 }),
    ]

    const result = getConsumoValorizado(consumo, presupuesto, stockItems)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].precioOrigen).toBe("stock")
    expect(result.items[0].unitPrice).toBe(45000)
    expect(result.items[0].subtotal).toBe(45000)
    expect(result.total).toBe(45000)
    expect(result.itemsSinPrecio).toEqual([])
  })

  it("marca ítems sin precio en itemsSinPrecio con unitPrice: 0", () => {
    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-4",
          name: "Instrumental Especial",
          code: "ART-004",
          lot: "LOT-2024-004",
          department: "Depósito Central",
          rubro: "Instrumental",
          brand: "Custom",
          consumed: 3,
          returned: 0,
        },
      ],
    })

    // No presupuesto, no stock with price
    const stockItems = [
      makeStockItem({ id: "stk-4", code: "ART-004", name: "Instrumental Especial", unitPrice: 0 }),
    ]

    const result = getConsumoValorizado(consumo, undefined, stockItems)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].unitPrice).toBe(0)
    expect(result.items[0].subtotal).toBe(0)
    expect(result.items[0].precioOrigen).toBe("manual")
    expect(result.itemsSinPrecio).toEqual(["Instrumental Especial"])
    expect(result.total).toBe(0)
  })

  it("ignora ítems consumidos con consumed <= 0", () => {
    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 0,
          returned: 5,
        },
      ],
    })

    const result = getConsumoValorizado(consumo, undefined, [])
    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. getDiferenciasPresupuestoConsumo()
// ═══════════════════════════════════════════════════════════════

describe("getDiferenciasPresupuestoConsumo", () => {
  it("retorna [] cuando no hay presupuesto ni consumo", () => {
    const result = getDiferenciasPresupuestoConsumo(undefined, undefined)
    expect(result).toEqual([])
  })

  it("retorna todos como 'no_consumido' cuando hay presupuesto sin consumo", () => {
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          quantity: 5,
          unitPrice: 1500,
          subtotal: 7500,
        },
        {
          stockItemId: "stk-2",
          name: "Placa LCP",
          code: "ART-002",
          quantity: 2,
          unitPrice: 25000,
          subtotal: 50000,
        },
      ],
      subtotal: 57500,
      total: 57500,
    })

    const result = getDiferenciasPresupuestoConsumo(presupuesto, undefined)

    expect(result).toHaveLength(2)
    expect(result[0].tipo).toBe("no_consumido")
    expect(result[0].cantPresupuestada).toBe(5)
    expect(result[0].cantConsumida).toBe(0)
    expect(result[0].diferencia).toBe(-5)
    expect(result[0].impactoMonetario).toBe(-5 * 1500)

    expect(result[1].tipo).toBe("no_consumido")
    expect(result[1].cantPresupuestada).toBe(2)
    expect(result[1].cantConsumida).toBe(0)
    expect(result[1].diferencia).toBe(-2)
  })

  it("retorna [] cuando hay consumo pero no presupuesto", () => {
    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
      ],
    })

    const result = getDiferenciasPresupuestoConsumo(undefined, consumo)
    expect(result).toEqual([])
  })

  it("detecta diferencia positiva cuando consumo tiene más cantidad que presupuesto", () => {
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          quantity: 5,
          unitPrice: 1500,
          subtotal: 7500,
        },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 8,
          returned: 0,
        },
      ],
    })

    const result = getDiferenciasPresupuestoConsumo(presupuesto, consumo)

    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe("cantidad")
    expect(result[0].cantPresupuestada).toBe(5)
    expect(result[0].cantConsumida).toBe(8)
    expect(result[0].diferencia).toBe(3) // 8 - 5 = +3
    expect(result[0].impactoMonetario).toBe(3 * 1500) // 4500
  })

  it("detecta diferencia negativa cuando consumo tiene menos cantidad que presupuesto", () => {
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          quantity: 5,
          unitPrice: 1500,
          subtotal: 7500,
        },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 3,
          returned: 2,
        },
      ],
    })

    const result = getDiferenciasPresupuestoConsumo(presupuesto, consumo)

    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe("cantidad")
    expect(result[0].diferencia).toBe(-2) // 3 - 5 = -2
    expect(result[0].impactoMonetario).toBe(-2 * 1500) // -3000
  })

  it("detecta ítems consumidos no presupuestados como 'no_presupuestado'", () => {
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          quantity: 5,
          unitPrice: 1500,
          subtotal: 7500,
        },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
        {
          stockItemId: "stk-3",
          name: "Clavo Intramedular",
          code: "ART-003",
          lot: "LOT-2024-003",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Stryker",
          consumed: 1,
          returned: 0,
        },
      ],
    })

    const result = getDiferenciasPresupuestoConsumo(presupuesto, consumo)

    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe("no_presupuestado")
    expect(result[0].name).toBe("Clavo Intramedular")
    expect(result[0].cantPresupuestada).toBe(0)
    expect(result[0].cantConsumida).toBe(1)
    expect(result[0].diferencia).toBe(1)
  })

  it("detecta artículos Z como tipo 'articulo_z'", () => {
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-z1",
          name: "Implante Z Custom",
          code: "Z-001",
          quantity: 1,
          unitPrice: 80000,
          subtotal: 80000,
          isArticuloZ: true,
        },
      ],
      subtotal: 80000,
      total: 80000,
    })

    // Sin consumo → articulo_z tipo
    const result = getDiferenciasPresupuestoConsumo(presupuesto, undefined)

    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe("articulo_z")
    expect(result[0].cantPresupuestada).toBe(1)
    expect(result[0].cantConsumida).toBe(0)
    expect(result[0].diferencia).toBe(-1)
  })

  it("detecta artículo Z con diferencia de cantidad como 'articulo_z'", () => {
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-z1",
          name: "Implante Z Custom",
          code: "Z-001",
          quantity: 1,
          unitPrice: 80000,
          subtotal: 80000,
          isArticuloZ: true,
        },
      ],
      subtotal: 80000,
      total: 80000,
    })

    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-z1",
          name: "Implante Z Custom",
          code: "Z-001",
          lot: "LOT-Z-2024",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Custom",
          consumed: 2,
          returned: 0,
        },
      ],
    })

    const result = getDiferenciasPresupuestoConsumo(presupuesto, consumo)

    expect(result).toHaveLength(1)
    expect(result[0].tipo).toBe("articulo_z")
    expect(result[0].diferencia).toBe(1) // 2 - 1
  })

  it("no genera diferencias cuando consumo coincide con presupuesto", () => {
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          quantity: 5,
          unitPrice: 1500,
          subtotal: 7500,
        },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo Cortical",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
      ],
    })

    const result = getDiferenciasPresupuestoConsumo(presupuesto, consumo)
    expect(result).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. getMontoFacturable()
// ═══════════════════════════════════════════════════════════════

describe("getMontoFacturable", () => {
  const stockItems = [
    makeStockItem({ id: "stk-1", code: "ART-001", unitPrice: 1500 }),
    makeStockItem({ id: "stk-2", code: "ART-002", unitPrice: 25000 }),
  ]

  it("base presupuesto → totalAFacturar = presupuesto.total", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const result = getMontoFacturable(presupuesto, undefined, stockItems, "presupuesto")

    expect(result.totalPresupuestado).toBe(7500)
    expect(result.totalConsumidoValorizado).toBe(0)
    expect(result.totalAFacturar).toBe(7500)
  })

  it("base consumo → totalAFacturar = consumoValorizado", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
        {
          stockItemId: "stk-2",
          name: "Placa LCP",
          code: "ART-002",
          lot: "LOT-2024-002",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Synthes",
          consumed: 1,
          returned: 0,
        },
      ],
    })

    const result = getMontoFacturable(presupuesto, consumo, stockItems, "consumo")

    // consumo valorizado = 5*1500 (presupuesto price) + 1*25000 (presupuesto price) = 32500
    expect(result.totalConsumidoValorizado).toBe(32500)
    expect(result.totalAFacturar).toBe(32500)
  })

  it("base mixto → totalAFacturar = max(presupuesto, consumo)", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 },
        { stockItemId: "stk-2", name: "Placa", code: "ART-002", quantity: 2, unitPrice: 25000, subtotal: 50000 },
      ],
      subtotal: 57500,
      total: 57500,
    })

    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
      ],
    })

    const result = getMontoFacturable(presupuesto, consumo, stockItems, "mixto")

    // presupuesto total = 57500, consumo valorizado = 5*1500 = 7500
    // max = 57500
    expect(result.totalAFacturar).toBe(57500)
  })

  it("base mixto con consumo mayor → totalAFacturar = consumoValorizado", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 1, unitPrice: 1500, subtotal: 1500 },
      ],
      subtotal: 1500,
      total: 1500,
    })

    const consumo = makeConsumo({
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito Central",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 10,
          returned: 0,
        },
      ],
    })

    const result = getMontoFacturable(presupuesto, consumo, stockItems, "mixto")

    // presupuesto = 1500, consumo valorizado = 10*1500 = 15000
    // max = 15000
    expect(result.totalAFacturar).toBe(15000)
  })

  it("con diferenciasAceptadas → totalAFacturar = totalBase + diferenciasAceptadas", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const result = getMontoFacturable(presupuesto, undefined, stockItems, "presupuesto", 3000)

    expect(result.totalAFacturar).toBe(7500 + 3000) // 10500
  })

  it("sin presupuesto ni consumo → totalAFacturar = 0", () => {
    const result = getMontoFacturable(undefined, undefined, [], "presupuesto")

    expect(result.totalPresupuestado).toBe(0)
    expect(result.totalConsumidoValorizado).toBe(0)
    expect(result.totalAFacturar).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. getSaldoPendiente()
// ═══════════════════════════════════════════════════════════════

describe("getSaldoPendiente", () => {
  it("sin cobros → saldo = amount", () => {
    const comprobante = makeComprobante({ amount: 100000 })
    const result = getSaldoPendiente(comprobante, [])
    expect(result).toBe(100000)
  })

  it("cobro parcial → saldo = amount - cobros", () => {
    const comprobante = makeComprobante({ amount: 100000, number: "FV-0001-00000001" })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-0001-00000001", importeImputado: 40000 }),
      makeImputacion({ id: "imp-2", facturaId: "FV-0001-00000001", importeImputado: 35000 }),
    ]

    const result = getSaldoPendiente(comprobante, imputaciones)
    expect(result).toBe(100000 - 40000 - 35000) // 25000
  })

  it("cobro total → saldo = 0", () => {
    const comprobante = makeComprobante({ amount: 100000, number: "FV-0001-00000001" })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-0001-00000001", importeImputado: 60000 }),
      makeImputacion({ id: "imp-2", facturaId: "FV-0001-00000001", importeImputado: 40000 }),
    ]

    const result = getSaldoPendiente(comprobante, imputaciones)
    expect(result).toBe(0)
  })

  it("ignora cobros de otras facturas", () => {
    const comprobante = makeComprobante({ amount: 100000, number: "FV-0001-00000001" })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-0001-00000001", importeImputado: 50000 }),
      makeImputacion({ id: "imp-2", facturaId: "FV-0001-00000099", importeImputado: 30000 }), // different factura
    ]

    const result = getSaldoPendiente(comprobante, imputaciones)
    expect(result).toBe(50000) // Only 50000 from matching facturaId
  })

  it("nunca retorna saldo negativo (cobros excedentes → 0)", () => {
    const comprobante = makeComprobante({ amount: 100000, number: "FV-0001-00000001" })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-0001-00000001", importeImputado: 120000 }),
    ]

    const result = getSaldoPendiente(comprobante, imputaciones)
    expect(result).toBe(0) // Math.max(0, ...)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. getEstadoFacturacion() and getEstadoFacturacionWithFV()
// ═══════════════════════════════════════════════════════════════

describe("getEstadoFacturacion", () => {
  it("cirugía no facturada, no autorizada → 'sin_facturar'", () => {
    const surgery = makeSurgery({ facturado: false, autorizado: false })
    const result = getEstadoFacturacion(surgery, "Incompleta", undefined, false, [])
    expect(result).toBe("sin_facturar")
  })

  it("facturada sin cobros → 'factura_sin_cobrar'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const fv = makeComprobante({ amount: 100000, number: "FV-001" })
    const result = getEstadoFacturacion(surgery, "Apta para facturar", "Facturado", true, [], fv)
    expect(result).toBe("factura_sin_cobrar")
  })

  it("facturada con cobro parcial → 'factura_cobrada_parcialmente'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const fv = makeComprobante({ amount: 100000, number: "FV-001" })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-001", importeImputado: 50000 }),
    ]
    const result = getEstadoFacturacion(surgery, "Apta para facturar", "Facturado", true, imputaciones, fv)
    expect(result).toBe("factura_cobrada_parcialmente")
  })

  it("facturada con cobro total → 'factura_cobrada'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const fv = makeComprobante({ amount: 100000, number: "FV-001" })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-001", importeImputado: 100000 }),
    ]
    const result = getEstadoFacturacion(surgery, "Apta para facturar", "Facturado", true, imputaciones, fv)
    expect(result).toBe("factura_cobrada")
  })

  it("no facturada, no autorizada → 'sin_facturar'", () => {
    const surgery = makeSurgery({ facturado: false, autorizado: false })
    const result = getEstadoFacturacion(surgery, "Incompleta", undefined, false, [])
    expect(result).toBe("sin_facturar")
  })

  it("documentación incompleta → 'pendiente_sin_documentacion'", () => {
    const surgery = makeSurgery({ facturado: false, autorizado: true })
    const result = getEstadoFacturacion(surgery, "Incompleta", undefined, true, [])
    expect(result).toBe("pendiente_sin_documentacion")
  })

  it("autorizado, doc apta, consumo validado, con presupuesto → 'listo_para_facturar'", () => {
    const surgery = makeSurgery({ facturado: false, autorizado: true })
    const result = getEstadoFacturacion(surgery, "Apta para facturar", "Validado", true, [])
    expect(result).toBe("listo_para_facturar")
  })

  it("autorizado, doc apta, consumo no validado → 'autorizado_para_facturar'", () => {
    const surgery = makeSurgery({ facturado: false, autorizado: true })
    const result = getEstadoFacturacion(surgery, "Apta para facturar", "Pendiente", true, [])
    expect(result).toBe("autorizado_para_facturar")
  })
})

describe("getEstadoFacturacionWithFV", () => {
  it("no facturada, no autorizada → 'sin_facturar'", () => {
    const surgery = makeSurgery({ facturado: false, autorizado: false })
    const result = getEstadoFacturacionWithFV(surgery, "Incompleta", undefined, false, undefined, [])
    expect(result).toBe("sin_facturar")
  })

  it("no facturada, autorizada, doc incompleta → 'pendiente_sin_documentacion'", () => {
    const surgery = makeSurgery({ facturado: false, autorizado: true })
    const result = getEstadoFacturacionWithFV(surgery, "Incompleta", undefined, true, undefined, [])
    expect(result).toBe("pendiente_sin_documentacion")
  })

  it("facturada sin cobros → 'factura_sin_cobrar'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const fv = makeComprobante({ amount: 100000, number: "FV-0001-00000001" })
    const result = getEstadoFacturacionWithFV(surgery, "Apta para facturar", "Facturado", true, fv, [])
    expect(result).toBe("factura_sin_cobrar")
  })

  it("facturada con cobro parcial → 'factura_cobrada_parcialmente'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const fv = makeComprobante({ amount: 100000, number: "FV-0001-00000001" })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-0001-00000001", importeImputado: 60000 }),
    ]
    const result = getEstadoFacturacionWithFV(surgery, "Apta para facturar", "Facturado", true, fv, imputaciones)
    expect(result).toBe("factura_cobrada_parcialmente")
  })

  it("facturada con cobro total → 'factura_cobrada'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const fv = makeComprobante({ amount: 100000, number: "FV-0001-00000001" })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-0001-00000001", importeImputado: 100000 }),
    ]
    const result = getEstadoFacturacionWithFV(surgery, "Apta para facturar", "Facturado", true, fv, imputaciones)
    expect(result).toBe("factura_cobrada")
  })

  it("FV vencida con saldo → 'vencida'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const fv = makeComprobante({
      amount: 100000,
      number: "FV-0001-00000001",
      expiry: "2020-01-01", // Past date
    })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-0001-00000001", importeImputado: 30000 }),
    ]
    const result = getEstadoFacturacionWithFV(surgery, "Apta para facturar", "Facturado", true, fv, imputaciones)
    expect(result).toBe("vencida")
  })

  it("FV vencida sin saldo → 'factura_cobrada'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const fv = makeComprobante({
      amount: 100000,
      number: "FV-0001-00000001",
      expiry: "2020-01-01", // Past date
    })
    const imputaciones = [
      makeImputacion({ facturaId: "FV-0001-00000001", importeImputado: 100000 }),
    ]
    const result = getEstadoFacturacionWithFV(surgery, "Apta para facturar", "Facturado", true, fv, imputaciones)
    expect(result).toBe("factura_cobrada")
  })

  it("documentación incompleta → 'pendiente_sin_documentacion'", () => {
    const surgery = makeSurgery({ facturado: false, autorizado: true })
    const result = getEstadoFacturacionWithFV(surgery, "Pendiente", undefined, true, undefined, [])
    expect(result).toBe("pendiente_sin_documentacion")
  })

  it("facturada sin FV comprobante → 'facturado'", () => {
    const surgery = makeSurgery({ facturado: true, autorizado: true })
    const result = getEstadoFacturacionWithFV(surgery, "Apta para facturar", "Facturado", true, undefined, [])
    expect(result).toBe("facturado")
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. suggestBaseFacturacion()
// ═══════════════════════════════════════════════════════════════

describe("suggestBaseFacturacion", () => {
  it("sin presupuesto ni consumo → forced presupuesto (sin_base)", () => {
    const result = suggestBaseFacturacion(undefined, undefined, [])
    expect(result.base).toBe("presupuesto")
    expect(result.reason).toBe("sin_base")
    expect(result.forced).toBe(true)
  })

  it("solo consumo (sin presupuesto) → forced consumo (sin_presupuesto)", () => {
    const consumo = makeConsumo({
      state: "Validado",
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
      ],
    })

    const result = suggestBaseFacturacion(undefined, consumo, [])
    expect(result.base).toBe("consumo")
    expect(result.reason).toBe("sin_presupuesto")
    expect(result.forced).toBe(true)
  })

  it("solo presupuesto (sin consumo validado) → forced presupuesto (sin_consumo)", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const result = suggestBaseFacturacion(presupuesto, undefined, [])
    expect(result.base).toBe("presupuesto")
    expect(result.reason).toBe("sin_consumo")
    expect(result.forced).toBe(true)
  })

  it("solo presupuesto con consumo Pendiente (no validado) → forced presupuesto (sin_consumo)", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const consumo = makeConsumo({
      state: "Pendiente", // Not Validado or Facturado
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
      ],
    })

    const result = suggestBaseFacturacion(presupuesto, consumo, [])
    expect(result.base).toBe("presupuesto")
    expect(result.reason).toBe("sin_consumo")
    expect(result.forced).toBe(true)
  })

  it("sin diferencia significativa → presupuesto, not forced (sin_diferencia)", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 },
      ],
      subtotal: 7500,
      total: 7500,
    })

    const consumo = makeConsumo({
      state: "Validado",
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 5,
          returned: 0,
        },
      ],
    })

    const stockItems = [makeStockItem({ id: "stk-1", code: "ART-001", unitPrice: 1500 })]

    const result = suggestBaseFacturacion(presupuesto, consumo, stockItems)

    // Both have same total (7500), delta < 1
    expect(result.base).toBe("presupuesto")
    expect(result.reason).toBe("sin_diferencia")
    expect(result.forced).toBe(false)
  })

  it("consumo > presupuesto → consumo (consumo_mayor)", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 2, unitPrice: 1500, subtotal: 3000 },
      ],
      subtotal: 3000,
      total: 3000,
    })

    const consumo = makeConsumo({
      state: "Validado",
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 10,
          returned: 0,
        },
      ],
    })

    const stockItems = [makeStockItem({ id: "stk-1", code: "ART-001", unitPrice: 1500 })]

    const result = suggestBaseFacturacion(presupuesto, consumo, stockItems)

    // Consumo valorizado = 10*1500 = 15000, Presupuesto = 3000, delta = 12000 > 0
    expect(result.base).toBe("consumo")
    expect(result.reason).toBe("consumo_mayor")
    expect(result.forced).toBe(false)
  })

  it("artículos Z → presupuesto (articulos_z)", () => {
    const presupuesto = makePresupuesto({
      items: [
        {
          stockItemId: "stk-z1",
          name: "Implante Z Custom",
          code: "Z-001",
          quantity: 1,
          unitPrice: 80000,
          subtotal: 80000,
          isArticuloZ: true,
        },
      ],
      subtotal: 80000,
      total: 80000,
    })

    const consumo = makeConsumo({
      state: "Validado",
      items: [
        {
          stockItemId: "stk-z1",
          name: "Implante Z Custom",
          code: "Z-001",
          lot: "LOT-Z-2024",
          department: "Depósito",
          rubro: "Implantes",
          brand: "Custom",
          consumed: 2, // More than budgeted
          returned: 0,
        },
      ],
    })

    const stockItems = [makeStockItem({ id: "stk-z1", code: "Z-001", unitPrice: 80000 })]

    const result = suggestBaseFacturacion(presupuesto, consumo, stockItems)

    expect(result.base).toBe("presupuesto")
    expect(result.reason).toBe("articulos_z")
    expect(result.forced).toBe(false)
  })

  it("consumo < presupuesto → presupuesto (consumo_menor)", () => {
    const presupuesto = makePresupuesto({
      items: [
        { stockItemId: "stk-1", name: "Tornillo", code: "ART-001", quantity: 10, unitPrice: 1500, subtotal: 15000 },
      ],
      subtotal: 15000,
      total: 15000,
    })

    const consumo = makeConsumo({
      state: "Validado",
      items: [
        {
          stockItemId: "stk-1",
          name: "Tornillo",
          code: "ART-001",
          lot: "LOT-2024-001",
          department: "Depósito",
          rubro: "Implantes",
          brand: "Zimmer",
          consumed: 3,
          returned: 7,
        },
      ],
    })

    const stockItems = [makeStockItem({ id: "stk-1", code: "ART-001", unitPrice: 1500 })]

    const result = suggestBaseFacturacion(presupuesto, consumo, stockItems)

    // Consumo valorizado = 3*1500 = 4500, Presupuesto = 15000, delta = -10500 < 0
    expect(result.base).toBe("presupuesto")
    expect(result.reason).toBe("consumo_menor")
    expect(result.forced).toBe(false)
  })
})
