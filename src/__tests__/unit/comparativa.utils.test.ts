/**
 * comparativa.utils.test.ts
 * Comprehensive unit tests for the Comparativa de Materiales utility functions (CHATZAI-024).
 * Tests the 12 required scenarios from the task specification.
 */
// @ts-nocheck

import { describe, it, expect } from "vitest"
import type {
  Presupuesto, PresupuestoItem, Remito, RemitoItem, Consumo, ConsumoItem, StockItem,
} from "@/types"

import {
  normalizarDescripcion,
  similitudDescripcion,
  mergePresupuestoItems,
  mergeRemitoItems,
  mergeConsumoItems,
  getEstadoLineaComparativa,
  getDeltaEconomicoEstimado,
  calcularDiferencias,
  getResumenComparativa,
  getComparativaMaterialesBySurgery,
} from "@/lib/comparativa.utils"

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

function makePresupuestoItem(overrides: Partial<PresupuestoItem> = {}): PresupuestoItem {
  return {
    stockItemId: "stk-1",
    name: "Tornillo Cortical",
    code: "ART-001",
    quantity: 5,
    unitPrice: 1500,
    subtotal: 7500,
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

function makeRemitoItem(overrides: Partial<RemitoItem> = {}): RemitoItem {
  return {
    stockItemId: "stk-1",
    name: "Tornillo Cortical",
    code: "ART-001",
    sentQuantity: 5,
    returnedQuantity: 0,
    consumedQuantity: 5,
    ...overrides,
  }
}

function makeRemito(overrides: Partial<Remito> = {}): Remito {
  return {
    id: "nr-1",
    surgeryId: "sx-1",
    boxId: "box-1",
    destination: "Hospital Italiano",
    date: "2024-01-17",
    state: "Enviado",
    items: [],
    ...overrides,
  }
}

function makeConsumoItem(overrides: Partial<ConsumoItem> = {}): ConsumoItem {
  return {
    stockItemId: "stk-1",
    name: "Tornillo Cortical",
    code: "ART-001",
    lot: "LOT-2024-001",
    department: "Depósito Central",
    rubro: "Implantes",
    brand: "Zimmer",
    consumed: 5,
    returned: 0,
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

// ═══════════════════════════════════════════════════════════════
// HELPER: build a full comparativa with common items
// ═══════════════════════════════════════════════════════════════

function buildComparativa(params: {
  prItems?: PresupuestoItem[] | null  // null = no presupuesto
  nrItems?: { remitoId?: string; items: RemitoItem[] }[]
  conItems?: ConsumoItem[] | null     // null = no consumo
  stockItems?: StockItem[]
}) {
  const presupuesto = params.prItems === null
    ? undefined
    : makePresupuesto({
        items: params.prItems ?? [],
        subtotal: (params.prItems ?? []).reduce((s, i) => s + i.subtotal, 0),
        total: (params.prItems ?? []).reduce((s, i) => s + i.subtotal, 0),
      })

  const remitos = (params.nrItems ?? []).map((nr, idx) =>
    makeRemito({
      id: nr.remitoId ?? `nr-${idx + 1}`,
      items: nr.items,
    })
  )

  const consumo = params.conItems === null
    ? undefined
    : makeConsumo({
        items: params.conItems ?? [],
      })

  const stockItems = params.stockItems ?? [
    makeStockItem({ id: "stk-1", code: "ART-001", unitPrice: 1500 }),
    makeStockItem({ id: "stk-2", code: "ART-002", unitPrice: 25000 }),
    makeStockItem({ id: "stk-3", code: "ART-003", unitPrice: 45000 }),
    makeStockItem({ id: "stk-z1", code: "Z-001", unitPrice: 80000 }),
  ]

  return getComparativaMaterialesBySurgery(presupuesto, remitos, consumo, stockItems)
}

// ═══════════════════════════════════════════════════════════════
// 1. NORMALIZATION & SIMILARITY
// ═══════════════════════════════════════════════════════════════

describe("normalizarDescripcion", () => {
  it("normalizes accents, case and special chars", () => {
    expect(normalizarDescripcion("Tornillo Cortical 3.5mm")).toBe("tornillo cortical 35mm")
    expect(normalizarDescripcion("  Implante   Especial  ")).toBe("implante especial")
    expect(normalizarDescripcion("Prótesis de Cadera")).toBe("protesis de cadera")
  })
})

describe("similitudDescripcion", () => {
  it("returns 1 for identical descriptions", () => {
    expect(similitudDescripcion("Tornillo Cortical", "Tornillo Cortical")).toBe(1)
  })

  it("returns 0 for empty strings", () => {
    expect(similitudDescripcion("", "algo")).toBe(0)
    expect(similitudDescripcion("algo", "")).toBe(0)
  })

  it("returns high similarity for similar descriptions", () => {
    const sim = similitudDescripcion("Implante especial rodilla", "Implante rodilla derecha")
    expect(sim).toBeGreaterThan(0.4)
  })

  it("returns low similarity for very different descriptions", () => {
    const sim = similitudDescripcion("Tornillo cortical", "Clavo intramedular")
    expect(sim).toBeLessThan(0.3)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. MERGE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe("mergePresupuestoItems", () => {
  it("aggregates items with same code", () => {
    const items = [
      makePresupuestoItem({ code: "ART-001", quantity: 5, unitPrice: 1500 }),
      makePresupuestoItem({ code: "ART-001", quantity: 3, unitPrice: 1500, stockItemId: "stk-1" }),
    ]
    const merged = mergePresupuestoItems(items)
    expect(merged.get("ART-001")?.quantity).toBe(8)
  })

  it("keeps separate items with different codes", () => {
    const items = [
      makePresupuestoItem({ code: "ART-001", stockItemId: "stk-1" }),
      makePresupuestoItem({ code: "ART-002", stockItemId: "stk-2" }),
    ]
    const merged = mergePresupuestoItems(items)
    expect(merged.size).toBe(2)
  })
})

describe("mergeRemitoItems", () => {
  it("consolidates items across multiple remitos by stockItemId", () => {
    const remitos = [
      makeRemito({
        id: "nr-1",
        items: [makeRemitoItem({ stockItemId: "stk-1", sentQuantity: 3 })],
      }),
      makeRemito({
        id: "nr-2",
        items: [makeRemitoItem({ stockItemId: "stk-1", sentQuantity: 2 })],
      }),
    ]
    const merged = mergeRemitoItems(remitos)
    expect(merged.get("stk-1")?.sentQuantity).toBe(5)
    expect(merged.get("stk-1")?.detalleRemitos).toHaveLength(2)
  })
})

describe("mergeConsumoItems", () => {
  it("aggregates consumo items by stockItemId", () => {
    const consumo = makeConsumo({
      items: [
        makeConsumoItem({ stockItemId: "stk-1", consumed: 3, returned: 1 }),
        makeConsumoItem({ stockItemId: "stk-1", consumed: 2, returned: 0 }),
      ],
    })
    const merged = mergeConsumoItems(consumo)
    expect(merged.get("stk-1")?.consumed).toBe(5)
    expect(merged.get("stk-1")?.returned).toBe(1)
  })

  it("returns empty map for undefined consumo", () => {
    const merged = mergeConsumoItems(undefined)
    expect(merged.size).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. ESTADO DE LÍNEA
// ═══════════════════════════════════════════════════════════════

describe("getEstadoLineaComparativa", () => {
  it("returns 'coincidente' when all quantities match and no returns", () => {
    expect(getEstadoLineaComparativa({
      presupuestado: 5, remitido: 5, consumido: 5, devuelto: 0, necesitaRevision: false,
    })).toBe("coincidente")
  })

  it("returns 'pendiente_remitir' when presupuestado > 0 and remitido = 0", () => {
    expect(getEstadoLineaComparativa({
      presupuestado: 5, remitido: 0, consumido: 0, devuelto: 0, necesitaRevision: false,
    })).toBe("pendiente_remitir")
  })

  it("returns 'remitido_de_mas' when remitido > presupuestado", () => {
    expect(getEstadoLineaComparativa({
      presupuestado: 5, remitido: 8, consumido: 8, devuelto: 0, necesitaRevision: false,
    })).toBe("remitido_de_mas")
  })

  it("returns 'consumido_de_mas' when consumido > remitido", () => {
    expect(getEstadoLineaComparativa({
      presupuestado: 5, remitido: 5, consumido: 7, devuelto: 0, necesitaRevision: false,
    })).toBe("consumido_de_mas")
  })

  it("returns 'consumido_de_menos' when consumido < remitido and consumido < presupuestado", () => {
    expect(getEstadoLineaComparativa({
      presupuestado: 5, remitido: 5, consumido: 3, devuelto: 0, necesitaRevision: false,
    })).toBe("consumido_de_menos")
  })

  it("returns 'devuelto' when devuelto > 0 and consumido < remitido", () => {
    expect(getEstadoLineaComparativa({
      presupuestado: 5, remitido: 5, consumido: 3, devuelto: 2, necesitaRevision: false,
    })).toBe("devuelto")
  })

  it("returns 'no_presupuestado' when presupuestado = 0 but has remito/consumo", () => {
    expect(getEstadoLineaComparativa({
      presupuestado: 0, remitido: 3, consumido: 3, devuelto: 0, necesitaRevision: false,
    })).toBe("no_presupuestado")
  })

  it("returns 'revision_manual' when necesitaRevision is true", () => {
    expect(getEstadoLineaComparativa({
      presupuestado: 5, remitido: 5, consumido: 5, devuelto: 0, necesitaRevision: true,
    })).toBe("revision_manual")
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. DELTA ECONÓMICO
// ═══════════════════════════════════════════════════════════════

describe("getDeltaEconomicoEstimado", () => {
  it("calculates positive delta when consumido > presupuestado", () => {
    expect(getDeltaEconomicoEstimado(8, 5, 1500)).toBe(3 * 1500) // +4500
  })

  it("calculates negative delta when consumido < presupuestado", () => {
    expect(getDeltaEconomicoEstimado(3, 5, 1500)).toBe(-2 * 1500) // -3000
  })

  it("returns 0 when consumido === presupuestado", () => {
    expect(getDeltaEconomicoEstimado(5, 5, 1500)).toBe(0)
  })

  it("returns 0 when precioBase is 0", () => {
    expect(getDeltaEconomicoEstimado(8, 5, 0)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. FULL COMPARATIVA SCENARIOS (12 required by task)
// ═══════════════════════════════════════════════════════════════

describe("getComparativaMaterialesBySurgery", () => {
  // Scenario 1: Comparativa sin diferencias
  it("scenario 1: no differences — all coincidente", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 5, returned: 0 })],
    })

    expect(resumen.totalLineas).toBe(1)
    expect(resumen.lineasCoincidentes).toBe(1)
    expect(resumen.lineasConDiferencia).toBe(0)
    expect(resumen.deltaEconomico).toBe(0)
    expect(resumen.lineas[0].estadoLinea).toBe("coincidente")
  })

  // Scenario 2: Presupuestado > Remitido
  it("scenario 2: presupuestado > remitido", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 3 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 3, returned: 0 })],
    })

    expect(resumen.lineas[0].presupuestado).toBe(5)
    expect(resumen.lineas[0].remitido).toBe(3)
    expect(resumen.lineas[0].difPrVsNr).toBe(2) // 5 - 3 = 2
  })

  // Scenario 3: Remitido > Presupuestado
  it("scenario 3: remitido > presupuestado", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 3, unitPrice: 1500, subtotal: 4500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 5, returned: 0 })],
    })

    expect(resumen.lineas[0].remitido).toBe(5)
    expect(resumen.lineas[0].presupuestado).toBe(3)
    expect(resumen.lineas[0].difPrVsNr).toBe(-2) // 3 - 5 = -2
    expect(resumen.lineas[0].estadoLinea).toBe("remitido_de_mas")
  })

  // Scenario 4: Consumido > Remitido
  it("scenario 4: consumido > remitido (inconsistency)", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 7, returned: 0 })],
    })

    expect(resumen.lineas[0].consumido).toBe(7)
    expect(resumen.lineas[0].remitido).toBe(5)
    expect(resumen.lineas[0].estadoLinea).toBe("consumido_de_mas")
  })

  // Scenario 5: Consumido < Remitido
  it("scenario 5: consumido < remitido", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 3, returned: 2 })],
    })

    expect(resumen.lineas[0].consumido).toBe(3)
    expect(resumen.lineas[0].devuelto).toBe(2)
    expect(resumen.lineas[0].estadoLinea).toBe("devuelto")
  })

  // Scenario 6: Ítem remitido no presupuestado
  it("scenario 6: item remitido pero no presupuestado", () => {
    const resumen = buildComparativa({
      prItems: [],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-3", code: "ART-003", sentQuantity: 2 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-3", code: "ART-003", consumed: 2, returned: 0 })],
    })

    const noPresupLine = resumen.lineas.find((l) => l.codigo === "ART-003")
    expect(noPresupLine).toBeDefined()
    expect(noPresupLine!.presupuestado).toBe(0)
    expect(noPresupLine!.estadoLinea).toBe("no_presupuestado")
  })

  // Scenario 7: Ítem consumido no presupuestado
  it("scenario 7: item consumido pero no presupuestado", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [
        makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 }),
        makeRemitoItem({ stockItemId: "stk-3", code: "ART-003", sentQuantity: 1 }),
      ] }],
      conItems: [
        makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 5, returned: 0 }),
        makeConsumoItem({ stockItemId: "stk-3", code: "ART-003", consumed: 1, returned: 0 }),
      ],
    })

    const noPresupLine = resumen.lineas.find((l) => l.codigo === "ART-003")
    expect(noPresupLine).toBeDefined()
    expect(noPresupLine!.presupuestado).toBe(0)
    expect(noPresupLine!.consumido).toBe(1)
    expect(noPresupLine!.estadoLinea).toBe("no_presupuestado")
  })

  // Scenario 8: Múltiples remitos consolidados
  it("scenario 8: multiple remitos consolidated", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [
        { remitoId: "nr-1", items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 3 })] },
        { remitoId: "nr-2", items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 2 })] },
      ],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 5, returned: 0 })],
    })

    const linea = resumen.lineas.find((l) => l.codigo === "ART-001")
    expect(linea).toBeDefined()
    expect(linea!.remitido).toBe(5) // 3 + 2 = 5 consolidated
    expect(linea!.detalleRemitos).toHaveLength(2)
    expect(linea!.detalleRemitos![0].remitoId).toBe("nr-1")
    expect(linea!.detalleRemitos![0].cantidad).toBe(3)
    expect(linea!.detalleRemitos![1].remitoId).toBe("nr-2")
    expect(linea!.detalleRemitos![1].cantidad).toBe(2)
    expect(linea!.estadoLinea).toBe("coincidente")
  })

  // Scenario 9: Artículo Z con revisión manual
  it("scenario 9: artículo Z requires manual review", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({
        stockItemId: "stk-z1", code: "Z-001", quantity: 1, unitPrice: 80000, subtotal: 80000,
        isArticuloZ: true, catalogItemId: "",
      })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-z1", code: "Z-001", sentQuantity: 1 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-z1", code: "Z-001", consumed: 1, returned: 0 })],
    })

    const zLine = resumen.lineas.find((l) => l.codigo === "Z-001")
    expect(zLine).toBeDefined()
    expect(zLine!.necesitaRevision).toBe(true)
    expect(zLine!.estadoLinea).toBe("revision_manual")
  })

  // Scenario 10: Delta económico estimado
  it("scenario 10: delta económico estimado", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 8, returned: 0 })],
    })

    // Delta = (8 - 5) * 1500 = 4500
    expect(resumen.lineas[0].deltaEconomico).toBe(4500)
    expect(resumen.deltaEconomico).toBe(4500)
    expect(resumen.consumosAdicionales).toBe(4500)
  })

  // Scenario 11: Resumen general correcto
  it("scenario 11: resumen general correcto", () => {
    const resumen = buildComparativa({
      prItems: [
        makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 }),
        makePresupuestoItem({ stockItemId: "stk-2", code: "ART-002", quantity: 2, unitPrice: 25000, subtotal: 50000 }),
      ],
      nrItems: [{ items: [
        makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 }),
        makeRemitoItem({ stockItemId: "stk-2", code: "ART-002", sentQuantity: 1 }),
      ] }],
      conItems: [
        makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 5, returned: 0 }),
        makeConsumoItem({ stockItemId: "stk-2", code: "ART-002", consumed: 1, returned: 0 }),
      ],
    })

    expect(resumen.tienePresupuesto).toBe(true)
    expect(resumen.tieneRemitos).toBe(true)
    expect(resumen.tieneConsumo).toBe(true)
    expect(resumen.totalLineas).toBe(2)
    expect(resumen.totalPresupuestado).toBe(5 * 1500 + 2 * 25000) // 7500 + 50000 = 57500
    expect(resumen.totalConsumidoValorizado).toBe(5 * 1500 + 1 * 25000) // 7500 + 25000 = 32500
    expect(resumen.surgeryId).toBe("sx-1")
  })

  // Scenario 12: Handles missing data gracefully
  it("scenario 12: handles missing data gracefully", () => {
    // No presupuesto
    const noPr = buildComparativa({
      prItems: null,
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 5 })],
    })
    expect(noPr.tienePresupuesto).toBe(false)
    expect(noPr.lineas[0].estadoLinea).toBe("no_presupuestado")

    // No remitos
    const noNr = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 5 })],
    })
    expect(noNr.tieneRemitos).toBe(false)

    // No consumo
    const noCon = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: null,
    })
    expect(noCon.tieneConsumo).toBe(false)
  })

  // QA Additional: No duplicate lines when secondary matching by code
  it("QA: no duplicate lines when PR matched to NR by code (secondary match)", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-pr-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-nr-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-nr-1", code: "ART-001", consumed: 5 })],
    })

    // Should have exactly 1 line for ART-001, not 2 (ghost line bug)
    const art001Lines = resumen.lineas.filter((l) => l.codigo === "ART-001")
    expect(art001Lines).toHaveLength(1)
    expect(art001Lines[0].presupuestado).toBe(5)
    expect(art001Lines[0].remitido).toBe(5)
    expect(art001Lines[0].consumido).toBe(5)
  })

  // QA Additional: metodoMatch uses stockItemId label correctly
  it("QA: metodoMatch is 'stockItemId' when matched by stockItemId", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-1", code: "ART-001", consumed: 5 })],
    })

    expect(resumen.lineas[0].metodoMatch).toBe("stockItemId")
  })

  // QA Additional: metodoMatch is 'codigo' when matched by code but different stockItemId
  it("QA: metodoMatch is 'codigo' when PR and NR share code but not stockItemId", () => {
    const resumen = buildComparativa({
      prItems: [makePresupuestoItem({ stockItemId: "stk-pr-1", code: "ART-001", quantity: 5, unitPrice: 1500, subtotal: 7500 })],
      nrItems: [{ items: [makeRemitoItem({ stockItemId: "stk-nr-1", code: "ART-001", sentQuantity: 5 })] }],
      conItems: [makeConsumoItem({ stockItemId: "stk-nr-1", code: "ART-001", consumed: 5 })],
    })

    expect(resumen.lineas[0].metodoMatch).toBe("codigo")
  })

  // QA Additional: stockItemId populated in DiferenciaComparativa
  it("QA: calcularDiferencias includes stockItemId from LineaComparativa", () => {
    const lineas = [
      {
        key: "1", codigo: "B", descripcion: "B", stockItemId: "stk-2",
        presupuestado: 0, remitido: 3, consumido: 3, devuelto: 0,
        difPrVsNr: -3, difNrVsConsumo: 0, difPrVsConsumo: -3,
        precioBase: 1000, deltaEconomico: 3000, estadoLinea: "no_presupuestado" as const,
        metodoMatch: "codigo" as const, necesitaRevision: false, remitoItemIds: [],
      },
    ]
    const difs = calcularDiferencias(lineas)
    expect(difs[0].stockItemId).toBe("stk-2")
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. DIFERENCIAS FOR FACTURACIÓN
// ═══════════════════════════════════════════════════════════════

describe("calcularDiferencias", () => {
  it("excludes coincidente lines", () => {
    const lineas = [
      {
        key: "1", codigo: "A", descripcion: "A", presupuestado: 5, remitido: 5,
        consumido: 5, devuelto: 0, difPrVsNr: 0, difNrVsConsumo: 0, difPrVsConsumo: 0,
        precioBase: 1000, deltaEconomico: 0, estadoLinea: "coincidente" as const,
        metodoMatch: "codigo" as const, necesitaRevision: false, remitoItemIds: [],
      },
    ]
    const difs = calcularDiferencias(lineas)
    expect(difs).toHaveLength(0)
  })

  it("includes non-coincidente lines with correct tipo", () => {
    const lineas = [
      {
        key: "2", codigo: "B", descripcion: "B", presupuestado: 0, remitido: 3,
        consumido: 3, devuelto: 0, difPrVsNr: -3, difNrVsConsumo: 0, difPrVsConsumo: -3,
        precioBase: 1000, deltaEconomico: 3000, estadoLinea: "no_presupuestado" as const,
        metodoMatch: "codigo" as const, necesitaRevision: false, remitoItemIds: [],
      },
    ]
    const difs = calcularDiferencias(lineas)
    expect(difs).toHaveLength(1)
    expect(difs[0].tipo).toBe("no_presupuestado")
    expect(difs[0].impactoMonetario).toBe(3000)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. RESUMEN COMPARATIVA
// ═══════════════════════════════════════════════════════════════

describe("getResumenComparativa", () => {
  it("computes all flags and totals correctly", () => {
    const lineas = [
      {
        key: "1", codigo: "A", descripcion: "A", presupuestado: 5, remitido: 5,
        consumido: 5, devuelto: 0, difPrVsNr: 0, difNrVsConsumo: 0, difPrVsConsumo: 0,
        precioBase: 1000, deltaEconomico: 0, estadoLinea: "coincidente" as const,
        metodoMatch: "codigo" as const, necesitaRevision: false, remitoItemIds: [],
      },
      {
        key: "2", codigo: "B", descripcion: "B", presupuestado: 0, remitido: 3,
        consumido: 3, devuelto: 0, difPrVsNr: -3, difNrVsConsumo: 0, difPrVsConsumo: -3,
        precioBase: 2000, deltaEconomico: 6000, estadoLinea: "no_presupuestado" as const,
        metodoMatch: "codigo" as const, necesitaRevision: false, remitoItemIds: [],
      },
      {
        key: "3", codigo: "C", descripcion: "C", presupuestado: 4, remitido: 4,
        consumido: 2, devuelto: 2, difPrVsNr: 0, difNrVsConsumo: 0, difPrVsConsumo: 2,
        precioBase: 500, deltaEconomico: -1000, estadoLinea: "devuelto" as const,
        metodoMatch: "codigo" as const, necesitaRevision: false, remitoItemIds: [],
      },
    ]

    const resumen = getResumenComparativa(lineas, "sx-1", true, true, true, "Validado")

    expect(resumen.totalLineas).toBe(3)
    expect(resumen.lineasCoincidentes).toBe(1)
    expect(resumen.lineasConDiferencia).toBe(2)
    expect(resumen.tieneItemsNoPresupuestados).toBe(true)
    expect(resumen.tieneDevoluciones).toBe(true)
    expect(resumen.tieneConsumosAdicionales).toBe(true) // line B: consumido > presupuestado
    expect(resumen.totalPresupuestado).toBe(5 * 1000 + 0 * 2000 + 4 * 500) // 7000
    expect(resumen.totalConsumidoValorizado).toBe(5 * 1000 + 3 * 2000 + 2 * 500) // 12000
    expect(resumen.deltaEconomico).toBe(0 + 6000 + (-1000)) // 5000
    expect(resumen.itemsDevueltos).toBe(2 * 500) // 1000
    expect(resumen.diferencias).toHaveLength(2) // non-coincidente lines
  })
})
