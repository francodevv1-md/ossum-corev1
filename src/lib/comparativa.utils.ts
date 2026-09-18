/**
 * comparativa.utils.ts
 * Funciones de cálculo puras para la Comparativa de Materiales.
 * CHATZAI-024: Implementación V1.
 *
 * Decisiones implementadas:
 * - DCOMP-001: Comparativa transversal por cirugía
 * - DCOMP-004: Múltiples remitos se consolidan
 * - DCOMP-005: Match por catalogItemId → código → descripción → sin match
 * - DCOMP-006: Artículos Z no se unifican automáticamente sin certeza
 * - DCOMP-007: Diferencias visibles pero no bloqueantes
 * - DCOMP-008: Se calcula delta económico estimado
 */

import type {
  Presupuesto, PresupuestoItem, Remito, Consumo,
  StockItem, ConsumoState,
  LineaComparativa, ResumenComparativaMateriales, DiferenciaComparativa,
  EstadoLineaComparativa, MetodoMatchComparativa,
} from "@/types"

// ═══════════════════════════════════════════════════════════════
// NORMALIZATION & SIMILARITY
// ═══════════════════════════════════════════════════════════════

/** Normalize description: lowercase, trim, collapse spaces, remove special chars */
export function normalizarDescripcion(desc: string): string {
  return desc
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "") // remove special chars
    .replace(/\s+/g, " ")
    .trim()
}

/** Simple word-based Jaccard similarity between two strings */
export function similitudDescripcion(a: string, b: string): number {
  const na = normalizarDescripcion(a)
  const nb = normalizarDescripcion(b)
  if (na === nb) return 1
  if (!na || !nb) return 0

  const wordsA = new Set(na.split(" "))
  const wordsB = new Set(nb.split(" "))
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])

  return union.size === 0 ? 0 : intersection.size / union.size
}

const SIMILARITY_THRESHOLD = 0.6

// ═══════════════════════════════════════════════════════════════
// MERGE FUNCTIONS (consolidate items from each source)
// ═══════════════════════════════════════════════════════════════

export interface PresupuestoMerged {
  quantity: number
  unitPrice: number
  catalogItemId?: string
  stockItemId: string
  presupuestoItemId: string
  isArticuloZ: boolean
  name: string
  code: string
}

/** Merge presupuesto items by code (each code is unique in a presupuesto) */
export function mergePresupuestoItems(items: PresupuestoItem[]): Map<string, PresupuestoMerged> {
  const map = new Map<string, PresupuestoMerged>()
  for (const item of items) {
    const key = item.code
    const existing = map.get(key)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      // DCOMP-006: isArticuloZ is explicit or derived from descripcionLibre.
      // Having no catalogItemId but having a valid stockItemId does NOT make it Z.
      const isZ = item.isArticuloZ === true || !!item.descripcionLibre
      map.set(key, {
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        catalogItemId: item.catalogItemId || undefined,
        stockItemId: item.stockItemId,
        presupuestoItemId: item.stockItemId, // Using stockItemId as key since we don't have a separate ID
        isArticuloZ: isZ,
        name: item.name,
        code: item.code,
      })
    }
  }
  return map
}

export interface RemitoMerged {
  sentQuantity: number
  stockItemId: string
  name: string
  code: string
  remitoItemIds: string[]
  detalleRemitos: { remitoId: string; cantidad: number; estado: string }[]
}

/** Merge remito items across multiple remitos, consolidating by stockItemId */
export function mergeRemitoItems(remitos: Remito[]): Map<string, RemitoMerged> {
  const map = new Map<string, RemitoMerged>()
  for (const remito of remitos) {
    for (const item of remito.items) {
      const key = item.stockItemId
      const existing = map.get(key)
      if (existing) {
        existing.sentQuantity += item.sentQuantity
        existing.remitoItemIds.push(item.stockItemId)
        existing.detalleRemitos.push({
          remitoId: remito.id,
          cantidad: item.sentQuantity,
          estado: remito.state,
        })
      } else {
        map.set(key, {
          sentQuantity: item.sentQuantity,
          stockItemId: item.stockItemId,
          name: item.name,
          code: item.code,
          remitoItemIds: [item.stockItemId],
          detalleRemitos: [{
            remitoId: remito.id,
            cantidad: item.sentQuantity,
            estado: remito.state,
          }],
        })
      }
    }
  }
  return map
}

export interface ConsumoMerged {
  consumed: number
  returned: number
  stockItemId: string
  name: string
  code: string
}

/** Merge consumo items by stockItemId */
export function mergeConsumoItems(consumo: Consumo | undefined): Map<string, ConsumoMerged> {
  const map = new Map<string, ConsumoMerged>()
  if (!consumo) return map

  for (const item of consumo.items) {
    const key = item.stockItemId
    const existing = map.get(key)
    if (existing) {
      existing.consumed += item.consumed
      existing.returned += item.returned
    } else {
      map.set(key, {
        consumed: item.consumed,
        returned: item.returned,
        stockItemId: item.stockItemId,
        name: item.name,
        code: item.code,
      })
    }
  }
  return map
}

// ═══════════════════════════════════════════════════════════════
// ESTADO DE LÍNEA (DCOMP-010)
// ═══════════════════════════════════════════════════════════════

/** Determine the visual state of a comparativa line based on quantities */
export function getEstadoLineaComparativa(linea: {
  presupuestado: number
  remitido: number
  consumido: number
  devuelto: number
  necesitaRevision: boolean
}): EstadoLineaComparativa {
  const { presupuestado, remitido, consumido, devuelto, necesitaRevision } = linea

  // Revision manual takes precedence
  if (necesitaRevision) return "revision_manual"

  // Coincidente: all quantities match
  if (presupuestado > 0 && presupuestado === remitido && presupuestado === consumido && devuelto === 0) {
    return "coincidente"
  }

  // Coincidente with returns (presupuestado = remitido, consumido + devuelto = remitido)
  if (presupuestado > 0 && presupuestado === remitido && consumido + devuelto === remitido && consumido === presupuestado && devuelto > 0) {
    return "devuelto"
  }

  // No presupuestado but has remito or consumo
  if (presupuestado === 0 && (remitido > 0 || consumido > 0)) {
    return "no_presupuestado"
  }

  // Presupuestado but never remitido
  if (presupuestado > 0 && remitido === 0) {
    return "pendiente_remitir"
  }

  // Consumido > remitido (inconsistency)
  if (consumido > remitido) {
    return "consumido_de_mas"
  }

  // Remitido > presupuestado
  if (remitido > presupuestado && presupuestado > 0) {
    return "remitido_de_mas"
  }

  // Devuelto > 0
  if (devuelto > 0 && consumido < remitido) {
    return "devuelto"
  }

  // Consumido de menos
  if (consumido < presupuestado && consumido < remitido && consumido > 0) {
    return "consumido_de_menos"
  }

  // Coincidente with no presupuesto but matched
  if (presupuestado > 0 && consumido === presupuestado && devuelto > 0) {
    return "devuelto"
  }

  // Default: coincidente if all match, otherwise revision
  if (presupuestado === consumido && remitido >= consumido) {
    return devuelto > 0 ? "devuelto" : "coincidente"
  }

  return "revision_manual"
}

// ═══════════════════════════════════════════════════════════════
// ECONOMIC DELTA (DCOMP-008)
// ═══════════════════════════════════════════════════════════════

/** Calculate economic delta: (consumido - presupuestado) × precioBase */
export function getDeltaEconomicoEstimado(
  consumido: number,
  presupuestado: number,
  precioBase: number,
): number {
  return (consumido - presupuestado) * precioBase
}

// ═══════════════════════════════════════════════════════════════
// DIFERENCIAS FOR FACTURACIÓN (DCOMP-003)
// ═══════════════════════════════════════════════════════════════

/** Extract differences for facturación from comparativa lines */
export function calcularDiferencias(lineas: LineaComparativa[]): DiferenciaComparativa[] {
  const diferencias: DiferenciaComparativa[] = []

  for (const linea of lineas) {
    if (linea.estadoLinea === "coincidente") continue

    let tipo: DiferenciaComparativa["tipo"]
    const diff = linea.consumido - linea.presupuestado

    if (linea.necesitaRevision && linea.estadoLinea === "revision_manual") {
      tipo = "sin_match"
    } else if (linea.presupuestado === 0 && linea.consumido > 0) {
      tipo = "no_presupuestado"
    } else if (linea.presupuestado > 0 && linea.consumido === 0) {
      tipo = "no_consumido"
    } else if (linea.estadoLinea === "revision_manual" && linea.metodoMatch === "sin_match") {
      tipo = "articulo_z"
    } else if (diff !== 0) {
      tipo = "cantidad"
    } else {
      // No cantidad diff but has other differences (e.g., remitido de mas, devuelto)
      tipo = "cantidad"
    }

    diferencias.push({
      tipo,
      stockItemId: linea.stockItemId,
      codigo: linea.codigo,
      descripcion: linea.descripcion,
      cantPresupuestada: linea.presupuestado,
      cantConsumida: linea.consumido,
      precioUnitario: linea.precioBase,
      diferencia: diff,
      impactoMonetario: linea.deltaEconomico,
    })
  }

  return diferencias
}

// ═══════════════════════════════════════════════════════════════
// RESUMEN COMPARATIVA
// ═══════════════════════════════════════════════════════════════

/** Compute the full ResumenComparativaMateriales from lines */
export function getResumenComparativa(
  lineas: LineaComparativa[],
  surgeryId: string,
  tienePresupuesto: boolean,
  tieneRemitos: boolean,
  tieneConsumo: boolean,
  consumoEstado?: ConsumoState,
): ResumenComparativaMateriales {
  const lineasCoincidentes = lineas.filter((l) => l.estadoLinea === "coincidente").length
  const lineasConDiferencia = lineas.filter((l) => l.estadoLinea !== "coincidente").length
  const lineasRevisionManual = lineas.filter((l) => l.necesitaRevision).length

  const totalPresupuestado = lineas.reduce((sum, l) => sum + l.presupuestado * l.precioBase, 0)
  const totalRemitido = lineas.reduce((sum, l) => sum + l.remitido * l.precioBase, 0)
  const totalConsumidoValorizado = lineas.reduce((sum, l) => sum + l.consumido * l.precioBase, 0)
  const deltaEconomico = lineas.reduce((sum, l) => sum + l.deltaEconomico, 0)

  const consumosAdicionales = lineas
    .filter((l) => l.consumido > l.presupuestado)
    .reduce((sum, l) => sum + (l.consumido - l.presupuestado) * l.precioBase, 0)

  const itemsNoConsumidos = lineas
    .filter((l) => l.consumido < l.presupuestado && l.presupuestado > 0)
    .reduce((sum, l) => sum + (l.presupuestado - l.consumido) * l.precioBase, 0)

  const itemsDevueltos = lineas
    .filter((l) => l.devuelto > 0)
    .reduce((sum, l) => sum + l.devuelto * l.precioBase, 0)

  const itemsNuncaRemitidos = lineas
    .filter((l) => l.presupuestado > 0 && l.remitido === 0)
    .reduce((sum, l) => sum + l.presupuestado * l.precioBase, 0)

  return {
    surgeryId,
    tienePresupuesto,
    tieneRemitos,
    tieneConsumo,
    consumoEstado,
    totalLineas: lineas.length,
    lineasCoincidentes,
    lineasConDiferencia,
    lineasRevisionManual,
    totalPresupuestado,
    totalRemitido,
    totalConsumidoValorizado,
    deltaEconomico,
    consumosAdicionales,
    itemsNoConsumidos,
    itemsDevueltos,
    itemsNuncaRemitidos,
    tieneItemsNoPresupuestados: lineas.some((l) => l.estadoLinea === "no_presupuestado"),
    tieneItemsNoRemitidos: lineas.some((l) => l.estadoLinea === "pendiente_remitir"),
    tieneConsumosAdicionales: lineas.some((l) => l.consumido > l.presupuestado),
    tieneDevoluciones: lineas.some((l) => l.devuelto > 0),
    diferencias: calcularDiferencias(lineas),
    lineas,
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN BUILDER: getComparativaMaterialesBySurgery
// ═══════════════════════════════════════════════════════════════

/**
 * Main function: builds the complete Comparativa for a surgery.
 * Takes data from the three sources, performs matching, calculates differences and delta.
 */
export function getComparativaMaterialesBySurgery(
  presupuesto: Presupuesto | undefined,
  remitos: Remito[],
  consumo: Consumo | undefined,
  stockItems: StockItem[],
): ResumenComparativaMateriales {
  const tienePresupuesto = !!presupuesto
  const tieneRemitos = remitos.length > 0
  const tieneConsumo = !!consumo

  // Build price map from stock
  const stockPriceMap = new Map<string, number>()
  for (const s of stockItems) {
    stockPriceMap.set(s.id, s.unitPrice)
  }

  // Merge items from each source
  const prMerged = mergePresupuestoItems(presupuesto?.items ?? [])
  const nrMerged = mergeRemitoItems(remitos)
  const conMerged = mergeConsumoItems(consumo)

  // Collect all unique keys (stockItemId or code)
  const allKeys = new Set<string>()
  // Map from key → { pr?, nr?, con? }
  interface KeySources {
    pr?: PresupuestoMerged
    nr?: RemitoMerged
    con?: ConsumoMerged
  }
  const keySources = new Map<string, KeySources>()

  // Add presupuesto items by code
  for (const [code, pr] of prMerged) {
    const key = pr.stockItemId || code
    allKeys.add(key)
    const existing = keySources.get(key) || {}
    existing.pr = pr
    keySources.set(key, existing)
  }

  // Add remito items by stockItemId
  for (const [stockItemId, nr] of nrMerged) {
    allKeys.add(stockItemId)
    const existing = keySources.get(stockItemId) || {}
    existing.nr = nr
    keySources.set(stockItemId, existing)
  }

  // Add consumo items by stockItemId
  for (const [stockItemId, con] of conMerged) {
    allKeys.add(stockItemId)
    const existing = keySources.get(stockItemId) || {}
    existing.con = con
    keySources.set(stockItemId, existing)
  }

  // Attempt secondary matching: presupuesto items that weren't matched by stockItemId
  // Try matching PR items with NR/CON items by code or description.
  // When a PR is successfully matched to another entry, remove it from its
  // original code-keyed entry to prevent duplicate ghost lines.
  const matchedPrKeys = new Set<string>() // track PR codes that got secondary-matched

  for (const [code, pr] of prMerged) {
    const primaryKey = pr.stockItemId || code
    const sources = keySources.get(primaryKey)
    // Already matched by stockItemId (primary pass) — skip
    if (sources?.pr && sources?.nr) continue
    if (sources?.pr && sources?.con) continue

    // Try to find NR or CON item with matching code
    let secondaryMatched = false

    for (const [nrKey, nr] of nrMerged) {
      if (nr.code === code) {
        const existing = keySources.get(nrKey) || {}
        if (!existing.pr) {
          existing.pr = pr
          keySources.set(nrKey, existing)
          secondaryMatched = true
          matchedPrKeys.add(primaryKey)
        }
        break
      }
    }

    if (!secondaryMatched) {
      for (const [conKey, con] of conMerged) {
        if (con.code === code) {
          const existing = keySources.get(conKey) || {}
          if (!existing.pr) {
            existing.pr = pr
            keySources.set(conKey, existing)
            secondaryMatched = true
            matchedPrKeys.add(primaryKey)
          }
          break
        }
      }
    }
  }

  // Remove PR-only ghost entries that were secondary-matched elsewhere
  for (const ghostKey of matchedPrKeys) {
    const entry = keySources.get(ghostKey)
    if (entry?.pr && !entry.nr && !entry.con) {
      keySources.delete(ghostKey)
      allKeys.delete(ghostKey)
    }
  }

  // Build LineaComparativa for each consolidated key
  const lineas: LineaComparativa[] = []

  for (const key of allKeys) {
    const sources = keySources.get(key)
    if (!sources) continue

    const pr = sources.pr
    const nr = sources.nr
    const con = sources.con

    // Skip items with zero quantities in all sources
    const prQty = pr?.quantity ?? 0
    const nrQty = nr?.sentQuantity ?? 0
    const conQty = con?.consumed ?? 0
    const devQty = con?.returned ?? 0

    if (prQty === 0 && nrQty === 0 && conQty === 0 && devQty === 0) continue

    // Determine price base
    const precioBase = pr?.unitPrice ?? stockPriceMap.get(nr?.stockItemId ?? con?.stockItemId ?? "") ?? 0

    // Determine code and description (prefer PR, then NR, then CON)
    const codigo = pr?.code || nr?.code || con?.code || ""
    const descripcion = pr?.name || nr?.name || con?.name || ""

    // Determine matching method
    let metodoMatch: MetodoMatchComparativa = "sin_match"
    let necesitaRevision = false
    const observaciones: string[] = []

    if (pr && nr && pr.stockItemId === nr.stockItemId) {
      metodoMatch = "stockItemId"
      // DCOMP-006: Z articles still need manual review even when matched by stockItemId
      if (pr.isArticuloZ) {
        necesitaRevision = true
        observaciones.push("Artículo Z/libre — verificar correspondencia manual")
      }
    } else if (pr && con && pr.stockItemId === con.stockItemId) {
      metodoMatch = "stockItemId"
      // DCOMP-006: Z articles still need manual review even when matched by stockItemId
      if (pr.isArticuloZ) {
        necesitaRevision = true
        observaciones.push("Artículo Z/libre — verificar correspondencia manual")
      }
    } else if (pr && (nr || con) && pr.code === (nr?.code || con?.code)) {
      metodoMatch = "codigo"
      if (pr.isArticuloZ) {
        necesitaRevision = true
        observaciones.push("Artículo Z/libre — verificar correspondencia manual")
      }
    } else if (pr && (nr || con)) {
      // Try description match
      const descToMatch = nr?.name || con?.name || ""
      if (descToMatch) {
        const sim = similitudDescripcion(pr.name, descToMatch)
        if (sim >= SIMILARITY_THRESHOLD) {
          metodoMatch = "descripcion"
          necesitaRevision = true
          observaciones.push(`Match por descripción (${Math.round(sim * 100)}%) — verificar`)
        } else {
          metodoMatch = "sin_match"
          necesitaRevision = true
          observaciones.push("Sin match automático — revisión manual requerida")
        }
      } else {
        metodoMatch = "sin_match"
        necesitaRevision = true
        observaciones.push("Sin match automático — revisión manual requerida")
      }
    } else if (!pr) {
      // Item exists in NR or CON but not in PR — no match needed for PR side
      metodoMatch = nr && con && nr.code === con.code ? "codigo" : "sin_match"
      if (metodoMatch === "sin_match" && nr && con) {
        const sim = similitudDescripcion(nr.name, con.name)
        if (sim >= SIMILARITY_THRESHOLD) {
          metodoMatch = "descripcion"
          necesitaRevision = true
          observaciones.push(`Match por descripción (${Math.round(sim * 100)}%) — verificar`)
        }
      }
    }

    // If no PR item but has NR and CON, still needs a match between them
    if (!pr && nr && con && nr.stockItemId !== con.stockItemId && nr.code !== con.code) {
      if (metodoMatch === "sin_match") {
        necesitaRevision = true
        observaciones.push("NR y CON no coinciden — revisión manual requerida")
      }
    }

    // Calculate differences
    const difPrVsNr = prQty - nrQty
    const difNrVsConsumo = nrQty - conQty - devQty
    const difPrVsConsumo = prQty - conQty
    const deltaEconomico = getDeltaEconomicoEstimado(conQty, prQty, precioBase)

    // Determine state
    const estadoLinea = getEstadoLineaComparativa({
      presupuestado: prQty,
      remitido: nrQty,
      consumido: conQty,
      devuelto: devQty,
      necesitaRevision,
    })

    const linea: LineaComparativa = {
      key: `${key}-${codigo}`,
      catalogItemId: pr?.catalogItemId,
      codigo,
      descripcion,
      stockItemId: nr?.stockItemId || con?.stockItemId || pr?.stockItemId || "",
      presupuestado: prQty,
      remitido: nrQty,
      consumido: conQty,
      devuelto: devQty,
      difPrVsNr,
      difNrVsConsumo,
      difPrVsConsumo,
      precioBase,
      deltaEconomico,
      estadoLinea,
      metodoMatch,
      necesitaRevision,
      presupuestoItemId: pr?.presupuestoItemId,
      remitoItemIds: nr?.remitoItemIds ?? [],
      consumoItemId: con?.stockItemId,
      observaciones: observaciones.length > 0 ? observaciones : undefined,
      detalleRemitos: nr?.detalleRemitos,
    }

    lineas.push(linea)
  }

  // Sort: differences first (by severity), then coincidentes
  const estadoOrder: Record<EstadoLineaComparativa, number> = {
    consumido_de_mas: 0,
    no_presupuestado: 1,
    revision_manual: 2,
    pendiente_remitir: 3,
    remitido_de_mas: 4,
    consumido_de_menos: 5,
    devuelto: 6,
    coincidente: 7,
  }

  lineas.sort((a, b) => {
    const orderDiff = (estadoOrder[a.estadoLinea] ?? 9) - (estadoOrder[b.estadoLinea] ?? 9)
    if (orderDiff !== 0) return orderDiff
    return a.codigo.localeCompare(b.codigo)
  })

  // Build surgeryId from first available data
  const surgeryId = consumo?.surgeryId ?? remitos[0]?.surgeryId ?? presupuesto?.surgeryId ?? ""

  return getResumenComparativa(
    lineas,
    surgeryId,
    tienePresupuesto,
    tieneRemitos,
    tieneConsumo,
    consumo?.state,
  )
}
