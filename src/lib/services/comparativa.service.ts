// OSSUM COR — Comparativa Operativa y Económica Service
// Projection service: Presupuesto ↔ Remitos ↔ Consumos ↔ Devoluciones ↔ Facturas por Cirugía.
// Read-only derived view. Zero Zustand, zero mocks.

import type { Prisma, PrismaClient } from "@prisma/client"
import { notFound } from "../api/errors"
import { similitudDescripcion } from "../comparativa.utils"

export type MetodoMatch = "catalogItemId" | "codigo" | "descripcion" | "sin_match"

export type EstadoLineaComparativa =
  | "coincidente"
  | "consumido_de_mas"
  | "consumido_de_menos"
  | "no_presupuestado"
  | "pendiente_remitir"
  | "remitido_de_mas"
  | "devuelto"
  | "pendiente_facturar"
  | "revision_manual"

export type LineaComparativaOperativa = {
  key: string
  catalogItemId?: string | null
  sku?: string | null
  codigo: string
  descripcion: string
  unit?: string | null
  metodoMatch: MetodoMatch
  necesitaRevision: boolean
  observaciones: string[]

  // Quantities
  presupuestado: number
  remitido: number
  consumido: number
  devuelto: number
  pendienteFisico: number
  facturado: number
  pendienteFacturar: number

  // Economics
  precioUnitario: number
  precioEstimado: boolean
  importePresupuestado: number
  importeConsumido: number
  importeFacturado: number
  deltaCantidad: number
  deltaEconomico: number

  // Status
  estadoLinea: EstadoLineaComparativa
  explicacion: string

  // Source IDs
  presupuestoItemIds: string[]
  remitoItemIds: string[]
  consumoItemIds: string[]
  devolucionItemIds: string[]
  invoiceItemIds: string[]
}

export type ComparativaSourcesInfo = {
  hasPresupuesto: boolean
  presupuestoId?: string | null
  presupuestoVisibleNumber?: number | null
  presupuestoState?: string | null
  hasRemitos: boolean
  remitosCount: number
  remitoNumbers: string[]
  hasConsumos: boolean
  consumosCount: number
  consumoNumbers: string[]
  hasDevoluciones: boolean
  devolucionesCount: number
  devolucionNumbers: string[]
  hasInvoices: boolean
  invoicesCount: number
  invoiceNumbers: string[]
  fuentesFaltantes: string[]
}

export type ComparativaSummary = {
  totalPresupuestado: number
  totalRemitido: number
  totalConsumido: number
  totalDevuelto: number
  totalFacturado: number
  totalPendienteFacturar: number

  totalUnidadesPresupuestadas: number
  totalUnidadesRemitidas: number
  totalUnidadesConsumidas: number
  totalUnidadesDevueltas: number
  totalUnidadesFacturadas: number
  totalUnidadesPendienteFacturar: number

  deltaEconomico: number
  deltaEconomicoEstimado: boolean

  lineasCount: number
  lineasCoincidentes: number
  lineasConDiferencia: number
  lineasRevisionManual: number
}

export type SurgeryComparativaResponse = {
  companyId: string
  surgeryId: string
  generatedAt: string
  sources: ComparativaSourcesInfo
  summary: ComparativaSummary
  lineas: LineaComparativaOperativa[]
}

export type GetSurgeryComparativaInput = {
  companyId: string
  surgeryId: string
  prisma: PrismaClient
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

type PresupuestoAccumulator = {
  id: string
  sku?: string | null
  description: string
  quantity: number
  unitPrice: number
  unit?: string | null
  isArticuloZ: boolean
  catalogItemId?: string | null
}

type RemitoItemAccumulator = {
  id: string
  remitoId: string
  sku?: string | null
  description: string
  quantity: number
  unit?: string | null
}

type ConsumoItemAccumulator = {
  id: string
  consumoId: string
  remitoItemId?: string | null
  sku?: string | null
  description: string
  consumedQuantity: number
  unit?: string | null
}

type DevolucionItemAccumulator = {
  id: string
  devolucionId: string
  remitoItemId?: string | null
  consumoItemId?: string | null
  sku?: string | null
  description: string
  returnedQuantity: number
  unit?: string | null
}

type InvoiceItemAccumulator = {
  id: string
  invoiceId: string
  sku?: string | null
  description: string
  quantity: number
  unitPrice: number
  unit?: string | null
}

export async function getSurgeryComparativa({
  companyId,
  surgeryId,
  prisma,
}: GetSurgeryComparativaInput): Promise<SurgeryComparativaResponse> {
  const surgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, companyId },
    select: { id: true },
  })

  if (!surgery) {
    throw notFound(`Cirugía con ID ${surgeryId} no encontrada en la empresa`)
  }

  // 1. Fetch Presupuestos for this surgery (prefer non-anulado, latest/aprobado)
  const presupuestos = await prisma.presupuesto.findMany({
    where: {
      companyId,
      surgeryId,
      state: { not: "Anulado" },
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [
      { versionNumber: "desc" },
      { createdAt: "desc" },
    ],
  })

  const activePresupuesto =
    presupuestos.find((p) => p.state === "Aprobado" || p.state === "Emitido") ??
    presupuestos[0] ??
    null

  // 2. Fetch Remitos
  const remitos = await prisma.remito.findMany({
    where: {
      companyId,
      surgeryId,
      state: { not: "Anulado" },
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // 3. Fetch Consumos
  const consumos = await prisma.consumo.findMany({
    where: {
      companyId,
      surgeryId,
      state: { not: "Anulado" },
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // 4. Fetch Devoluciones (only active / confirmed / pending)
  const devoluciones = await prisma.devolucion.findMany({
    where: {
      companyId,
      surgeryId,
      state: { in: ["Confirmada", "Pendiente", "Borrador"] },
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // 5. Fetch Invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      OR: [
        { surgeryId },
        ...(activePresupuesto ? [{ presupuestoId: activePresupuesto.id }] : []),
        ...(consumos.length > 0 ? [{ consumoId: { in: consumos.map((c) => c.id) } }] : []),
      ],
      state: { not: "Anulado" },
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Consolidate Items from Presupuesto
  const prItems: PresupuestoAccumulator[] = []
  if (activePresupuesto) {
    for (const item of activePresupuesto.items) {
      const meta = asRecord(item.metadata)
      const isZ = Boolean(meta?.isArticuloZ || meta?.descripcionLibre || item.sku?.toUpperCase().startsWith("Z-"))
      prItems.push({
        id: item.id,
        sku: item.sku,
        description: item.description,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        unit: item.unit,
        isArticuloZ: isZ,
        catalogItemId: (meta?.catalogItemId as string | undefined) ?? item.sku,
      })
    }
  }

  // Consolidate Items from Remitos
  const nrItems: RemitoItemAccumulator[] = []
  for (const r of remitos) {
    for (const item of r.items) {
      nrItems.push({
        id: item.id,
        remitoId: r.id,
        sku: item.sku ?? item.itemId,
        description: item.description,
        quantity: toNumber(item.quantity),
        unit: item.unit,
      })
    }
  }

  // Consolidate Items from Consumos
  const conItems: ConsumoItemAccumulator[] = []
  for (const c of consumos) {
    for (const item of c.items) {
      conItems.push({
        id: item.id,
        consumoId: c.id,
        remitoItemId: item.remitoItemId,
        sku: item.sku,
        description: item.description,
        consumedQuantity: toNumber(item.consumedQuantity),
        unit: item.unit,
      })
    }
  }

  // Consolidate Items from Devoluciones (weight confirmed higher)
  const devItems: DevolucionItemAccumulator[] = []
  for (const d of devoluciones) {
    for (const item of d.items) {
      devItems.push({
        id: item.id,
        devolucionId: d.id,
        remitoItemId: item.remitoItemId,
        consumoItemId: item.consumoItemId,
        sku: item.sku,
        description: item.description,
        returnedQuantity: toNumber(item.returnedQuantity),
        unit: item.unit,
      })
    }
  }

  // Consolidate Items from Invoices
  const invItems: InvoiceItemAccumulator[] = []
  for (const inv of invoices) {
    for (const item of inv.items) {
      invItems.push({
        id: item.id,
        invoiceId: inv.id,
        sku: item.sku,
        description: item.description,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        unit: item.unit,
      })
    }
  }

  // Build unified comparative lines
  type LineAccumulator = {
    key: string
    catalogItemId?: string | null
    sku?: string | null
    codigo: string
    descripcion: string
    unit?: string | null
    metodoMatch: MetodoMatch
    necesitaRevision: boolean
    observaciones: string[]
    isArticuloZ: boolean

    presupuestado: number
    remitido: number
    consumido: number
    devuelto: number
    facturado: number

    precioUnitario: number
    precioEstimado: boolean

    presupuestoItemIds: string[]
    remitoItemIds: string[]
    consumoItemIds: string[]
    devolucionItemIds: string[]
    invoiceItemIds: string[]
  }

  const linesMap = new Map<string, LineAccumulator>()

  const getOrCreateLine = (key: string, base: Partial<LineAccumulator>): LineAccumulator => {
    let line = linesMap.get(key)
    if (!line) {
      line = {
        key,
        catalogItemId: base.catalogItemId ?? null,
        sku: base.sku ?? null,
        codigo: base.codigo ?? "SIN-CODIGO",
        descripcion: base.descripcion ?? "Sin descripción",
        unit: base.unit ?? null,
        metodoMatch: base.metodoMatch ?? "sin_match",
        necesitaRevision: base.necesitaRevision ?? false,
        observaciones: base.observaciones ?? [],
        isArticuloZ: base.isArticuloZ ?? false,
        presupuestado: 0,
        remitido: 0,
        consumido: 0,
        devuelto: 0,
        facturado: 0,
        precioUnitario: base.precioUnitario ?? 0,
        precioEstimado: base.precioEstimado ?? true,
        presupuestoItemIds: [],
        remitoItemIds: [],
        consumoItemIds: [],
        devolucionItemIds: [],
        invoiceItemIds: [],
      }
      linesMap.set(key, line)
    }
    return line
  }

  // Step 1: Add Presupuesto Items
  for (const pr of prItems) {
    const key = pr.sku ? `sku:${pr.sku.toLowerCase()}` : `pr:${pr.id}`
    const line = getOrCreateLine(key, {
      catalogItemId: pr.catalogItemId,
      sku: pr.sku,
      codigo: pr.sku ?? pr.description,
      descripcion: pr.description,
      unit: pr.unit,
      metodoMatch: pr.sku ? "codigo" : "sin_match",
      isArticuloZ: pr.isArticuloZ,
      precioUnitario: pr.unitPrice,
      precioEstimado: pr.unitPrice <= 0,
    })
    line.presupuestado += pr.quantity
    if (pr.unitPrice > 0) {
      line.precioUnitario = pr.unitPrice
      line.precioEstimado = false
    }
    line.presupuestoItemIds.push(pr.id)
    if (pr.isArticuloZ) {
      line.necesitaRevision = true
      line.observaciones.push("Artículo Z / libre — revisar correspondencia")
    }
  }

  // Step 2: Match Remito Items
  for (const nr of nrItems) {
    let matchedKey: string | null = null

    if (nr.sku) {
      const directKey = `sku:${nr.sku.toLowerCase()}`
      if (linesMap.has(directKey)) {
        matchedKey = directKey
      }
    }

    if (!matchedKey) {
      // Try description match against existing lines (skip Z items)
      for (const [k, line] of linesMap.entries()) {
        if (line.isArticuloZ) continue
        const sim = similitudDescripcion(line.descripcion, nr.description)
        if (sim >= 0.6) {
          matchedKey = k
          if (line.metodoMatch === "sin_match") {
            line.metodoMatch = "descripcion"
            line.necesitaRevision = true
            line.observaciones.push(`Match por descripción similar (${Math.round(sim * 100)}%)`)
          }
          break
        }
      }
    }

    const key = matchedKey ?? (nr.sku ? `sku:${nr.sku.toLowerCase()}` : `nr:${nr.id}`)
    const line = getOrCreateLine(key, {
      sku: nr.sku,
      codigo: nr.sku ?? nr.description,
      descripcion: nr.description,
      unit: nr.unit,
      metodoMatch: matchedKey ? (nr.sku ? "codigo" : "descripcion") : "sin_match",
    })
    line.remitido += nr.quantity
    line.remitoItemIds.push(nr.id)
  }

  // Step 3: Match Consumo Items
  for (const con of conItems) {
    let matchedKey: string | null = null

    // First check if matched by remitoItemId in an existing line
    if (con.remitoItemId) {
      for (const [k, line] of linesMap.entries()) {
        if (line.remitoItemIds.includes(con.remitoItemId)) {
          matchedKey = k
          break
        }
      }
    }

    if (!matchedKey && con.sku) {
      const directKey = `sku:${con.sku.toLowerCase()}`
      if (linesMap.has(directKey)) {
        matchedKey = directKey
      }
    }

    if (!matchedKey) {
      for (const [k, line] of linesMap.entries()) {
        if (line.isArticuloZ) continue
        const sim = similitudDescripcion(line.descripcion, con.description)
        if (sim >= 0.6) {
          matchedKey = k
          if (line.metodoMatch === "sin_match") {
            line.metodoMatch = "descripcion"
            line.necesitaRevision = true
            line.observaciones.push(`Match consumo por descripción (${Math.round(sim * 100)}%)`)
          }
          break
        }
      }
    }

    const key = matchedKey ?? (con.sku ? `sku:${con.sku.toLowerCase()}` : `con:${con.id}`)
    const line = getOrCreateLine(key, {
      sku: con.sku,
      codigo: con.sku ?? con.description,
      descripcion: con.description,
      unit: con.unit,
      metodoMatch: matchedKey ? (con.sku ? "codigo" : "descripcion") : "sin_match",
    })
    line.consumido += con.consumedQuantity
    line.consumoItemIds.push(con.id)
  }

  // Step 4: Match Devolución Items
  for (const dev of devItems) {
    let matchedKey: string | null = null

    if (dev.remitoItemId) {
      for (const [k, line] of linesMap.entries()) {
        if (line.remitoItemIds.includes(dev.remitoItemId)) {
          matchedKey = k
          break
        }
      }
    }

    if (!matchedKey && dev.consumoItemId) {
      for (const [k, line] of linesMap.entries()) {
        if (line.consumoItemIds.includes(dev.consumoItemId)) {
          matchedKey = k
          break
        }
      }
    }

    if (!matchedKey && dev.sku) {
      const directKey = `sku:${dev.sku.toLowerCase()}`
      if (linesMap.has(directKey)) {
        matchedKey = directKey
      }
    }

    if (!matchedKey) {
      for (const [k, line] of linesMap.entries()) {
        if (line.isArticuloZ) continue
        const sim = similitudDescripcion(line.descripcion, dev.description)
        if (sim >= 0.6) {
          matchedKey = k
          break
        }
      }
    }

    const key = matchedKey ?? (dev.sku ? `sku:${dev.sku.toLowerCase()}` : `dev:${dev.id}`)
    const line = getOrCreateLine(key, {
      sku: dev.sku,
      codigo: dev.sku ?? dev.description,
      descripcion: dev.description,
      unit: dev.unit,
      metodoMatch: matchedKey ? (dev.sku ? "codigo" : "descripcion") : "sin_match",
    })
    line.devuelto += dev.returnedQuantity
    line.devolucionItemIds.push(dev.id)
  }

  // Step 5: Match Invoice Items
  for (const inv of invItems) {
    let matchedKey: string | null = null

    if (inv.sku) {
      const directKey = `sku:${inv.sku.toLowerCase()}`
      if (linesMap.has(directKey)) {
        matchedKey = directKey
      }
    }

    if (!matchedKey) {
      for (const [k, line] of linesMap.entries()) {
        if (line.isArticuloZ) continue
        const sim = similitudDescripcion(line.descripcion, inv.description)
        if (sim >= 0.6) {
          matchedKey = k
          break
        }
      }
    }

    const key = matchedKey ?? (inv.sku ? `sku:${inv.sku.toLowerCase()}` : `inv:${inv.id}`)
    const line = getOrCreateLine(key, {
      sku: inv.sku,
      codigo: inv.sku ?? inv.description,
      descripcion: inv.description,
      unit: inv.unit,
      metodoMatch: matchedKey ? (inv.sku ? "codigo" : "descripcion") : "sin_match",
      precioUnitario: inv.unitPrice,
      precioEstimado: inv.unitPrice <= 0,
    })
    line.facturado += inv.quantity
    if (line.precioUnitario <= 0 && inv.unitPrice > 0) {
      line.precioUnitario = inv.unitPrice
      line.precioEstimado = false
    }
    line.invoiceItemIds.push(inv.id)
  }

  // Final Pass: compute status, deltas, and explanations per line
  const finalLines: LineaComparativaOperativa[] = []

  for (const line of linesMap.values()) {
    // Skip empty lines with 0 in all counts
    if (
      line.presupuestado === 0 &&
      line.remitido === 0 &&
      line.consumido === 0 &&
      line.devuelto === 0 &&
      line.facturado === 0
    ) {
      continue
    }

    const pendienteFisico = Math.max(0, line.remitido - line.consumido - line.devuelto)
    const pendienteFacturar = Math.max(0, line.consumido - line.facturado)

    const importePresupuestado = line.presupuestado * line.precioUnitario
    const importeConsumido = line.consumido * line.precioUnitario
    const importeFacturado = line.facturado * line.precioUnitario
    const deltaCantidad = line.consumido - line.presupuestado
    const deltaEconomico = deltaCantidad * line.precioUnitario

    // Determine Estado Línea
    let estadoLinea: EstadoLineaComparativa = "coincidente"
    let explicacion = "Cantidades y movimientos coincidentes."

    if (line.necesitaRevision || line.metodoMatch === "sin_match") {
      estadoLinea = "revision_manual"
      explicacion = line.observaciones[0] ?? "Requiere revisión manual de concordancia."
    } else if (line.presupuestado === 0 && (line.remitido > 0 || line.consumido > 0)) {
      estadoLinea = "no_presupuestado"
      explicacion = `Material no presupuestado (${line.consumido > 0 ? `${line.consumido} consumidos` : `${line.remitido} remitidos`}).`
    } else if (line.presupuestado > 0 && line.remitido === 0) {
      estadoLinea = "pendiente_remitir"
      explicacion = `Presupuestado (${line.presupuestado} u.) pero nunca remitido.`
    } else if (line.consumido > line.remitido) {
      estadoLinea = "consumido_de_mas"
      explicacion = `Consumo (${line.consumido} u.) excede lo remitido (${line.remitido} u.).`
    } else if (line.consumido > line.presupuestado && line.presupuestado > 0) {
      estadoLinea = "consumido_de_mas"
      explicacion = `Consumo (${line.consumido} u.) supera lo presupuestado (${line.presupuestado} u.).`
    } else if (line.remitido > line.presupuestado && line.presupuestado > 0 && line.consumido === line.presupuestado && line.devuelto === 0) {
      estadoLinea = "remitido_de_mas"
      explicacion = `Remitido en exceso (${line.remitido} u. vs ${line.presupuestado} u. presup.).`
    } else if (line.devuelto > 0) {
      estadoLinea = "devuelto"
      explicacion = `Material devuelto (${line.devuelto} u.).`
    } else if (line.consumido < line.presupuestado && line.consumido > 0) {
      estadoLinea = "consumido_de_menos"
      explicacion = `Consumo menor al presupuestado (${line.consumido} u. de ${line.presupuestado} u.).`
    } else if (pendienteFacturar > 0) {
      estadoLinea = "pendiente_facturar"
      explicacion = `Pendiente de facturación (${pendienteFacturar} u.).`
    }

    finalLines.push({
      key: line.key,
      catalogItemId: line.catalogItemId,
      sku: line.sku,
      codigo: line.codigo,
      descripcion: line.descripcion,
      unit: line.unit,
      metodoMatch: line.metodoMatch,
      necesitaRevision: line.necesitaRevision,
      observaciones: line.observaciones,

      presupuestado: line.presupuestado,
      remitido: line.remitido,
      consumido: line.consumido,
      devuelto: line.devuelto,
      pendienteFisico,
      facturado: line.facturado,
      pendienteFacturar,

      precioUnitario: line.precioUnitario,
      precioEstimado: line.precioEstimado,
      importePresupuestado,
      importeConsumido,
      importeFacturado,
      deltaCantidad,
      deltaEconomico,

      estadoLinea,
      explicacion,

      presupuestoItemIds: line.presupuestoItemIds,
      remitoItemIds: line.remitoItemIds,
      consumoItemIds: line.consumoItemIds,
      devolucionItemIds: line.devolucionItemIds,
      invoiceItemIds: line.invoiceItemIds,
    })
  }

  // Sort final lines: differences and manual reviews first, then coincidentes
  const estadoRank: Record<EstadoLineaComparativa, number> = {
    revision_manual: 0,
    consumido_de_mas: 1,
    no_presupuestado: 2,
    pendiente_remitir: 3,
    remitido_de_mas: 4,
    consumido_de_menos: 5,
    pendiente_facturar: 6,
    devuelto: 7,
    coincidente: 8,
  }

  finalLines.sort((a, b) => {
    const rankDiff = (estadoRank[a.estadoLinea] ?? 9) - (estadoRank[b.estadoLinea] ?? 9)
    if (rankDiff !== 0) return rankDiff
    return a.codigo.localeCompare(b.codigo)
  })

  // Compute Summary Totals
  const totalPresupuestado = finalLines.reduce((sum, l) => sum + l.importePresupuestado, 0)
  const totalRemitido = finalLines.reduce((sum, l) => sum + l.remitido * l.precioUnitario, 0)
  const totalConsumido = finalLines.reduce((sum, l) => sum + l.importeConsumido, 0)
  const totalDevuelto = finalLines.reduce((sum, l) => sum + l.devuelto * l.precioUnitario, 0)
  const totalFacturado = finalLines.reduce((sum, l) => sum + l.importeFacturado, 0)
  const totalPendienteFacturar = finalLines.reduce((sum, l) => sum + l.pendienteFacturar * l.precioUnitario, 0)

  const totalUnidadesPresupuestadas = finalLines.reduce((sum, l) => sum + l.presupuestado, 0)
  const totalUnidadesRemitidas = finalLines.reduce((sum, l) => sum + l.remitido, 0)
  const totalUnidadesConsumidas = finalLines.reduce((sum, l) => sum + l.consumido, 0)
  const totalUnidadesDevueltas = finalLines.reduce((sum, l) => sum + l.devuelto, 0)
  const totalUnidadesFacturadas = finalLines.reduce((sum, l) => sum + l.facturado, 0)
  const totalUnidadesPendienteFacturar = finalLines.reduce((sum, l) => sum + l.pendienteFacturar, 0)

  const deltaEconomico = finalLines.reduce((sum, l) => sum + l.deltaEconomico, 0)
  const deltaEconomicoEstimado = finalLines.some((l) => l.precioEstimado)

  const lineasCount = finalLines.length
  const lineasCoincidentes = finalLines.filter((l) => l.estadoLinea === "coincidente").length
  const lineasConDiferencia = finalLines.filter((l) => l.estadoLinea !== "coincidente").length
  const lineasRevisionManual = finalLines.filter((l) => l.necesitaRevision || l.estadoLinea === "revision_manual").length

  // Build missing sources list
  const fuentesFaltantes: string[] = []
  if (!activePresupuesto) fuentesFaltantes.push("Presupuesto formal")
  if (remitos.length === 0) fuentesFaltantes.push("Remitos de entrega")
  if (consumos.length === 0) fuentesFaltantes.push("Consumos registrados")
  if (invoices.length === 0) fuentesFaltantes.push("Facturación operativa")

  const sources: ComparativaSourcesInfo = {
    hasPresupuesto: Boolean(activePresupuesto),
    presupuestoId: activePresupuesto?.id,
    presupuestoVisibleNumber: activePresupuesto?.visibleNumber,
    presupuestoState: activePresupuesto?.state,
    hasRemitos: remitos.length > 0,
    remitosCount: remitos.length,
    remitoNumbers: remitos.map((r) => r.visibleNumber ? `R-${String(r.visibleNumber).padStart(4, "0")}` : r.id),
    hasConsumos: consumos.length > 0,
    consumosCount: consumos.length,
    consumoNumbers: consumos.map((c) => c.visibleNumber ? `C-${String(c.visibleNumber).padStart(4, "0")}` : c.id),
    hasDevoluciones: devoluciones.length > 0,
    devolucionesCount: devoluciones.length,
    devolucionNumbers: devoluciones.map((d) => d.visibleNumber ? `D-${String(d.visibleNumber).padStart(4, "0")}` : d.id),
    hasInvoices: invoices.length > 0,
    invoicesCount: invoices.length,
    invoiceNumbers: invoices.map((i) => i.visibleNumber ? `F-${String(i.visibleNumber).padStart(4, "0")}` : i.id),
    fuentesFaltantes,
  }

  const summary: ComparativaSummary = {
    totalPresupuestado,
    totalRemitido,
    totalConsumido,
    totalDevuelto,
    totalFacturado,
    totalPendienteFacturar,
    totalUnidadesPresupuestadas,
    totalUnidadesRemitidas,
    totalUnidadesConsumidas,
    totalUnidadesDevueltas,
    totalUnidadesFacturadas,
    totalUnidadesPendienteFacturar,
    deltaEconomico,
    deltaEconomicoEstimado,
    lineasCount,
    lineasCoincidentes,
    lineasConDiferencia,
    lineasRevisionManual,
  }

  return {
    companyId,
    surgeryId,
    generatedAt: new Date().toISOString(),
    sources,
    summary,
    lineas: finalLines,
  }
}
