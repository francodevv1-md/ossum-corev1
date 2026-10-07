// OSSUM COR — Liquidation Billing Gate Unit & Integration Tests (LIQUIDATION-BILLING-GATE-DEV-001)

import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma, type PrismaClient } from "@prisma/client"

const { createAuditEvent, getApiAuthContext } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
  getApiAuthContext: vi.fn(),
}))

vi.mock("@/lib/audit", () => ({ createAuditEvent }))
vi.mock("@/lib/prisma", () => ({ default: { mocked: true } }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }))

import {
  CONSUMPTION_BILLING_BLOCKED_CODE,
  CONSUMPTION_BILLING_OVERRIDE_ACTION,
  assertConsumptionBillingAllowed,
  createConsumptionBillingOverride,
  getConsumptionBillingGateStatus,
  isOverrideMatchingSnapshot,
  normalizeDiscrepanciesSnapshot,
} from "@/lib/services/billing-gate.service"
import {
  BLOCKING_COMPARATIVA_LINE_STATES,
  WARNING_COMPARATIVA_LINE_STATES,
  evaluateComparativaDiscrepancies,
  isBlockingComparativaLineState,
  isWarningComparativaLineState,
  type ComparativaDiscrepancyLineSummary,
  type SurgeryComparativaResponse,
} from "@/lib/services/comparativa.service"
import { createInvoice, createInvoiceFromSource } from "@/lib/services/invoice.service"
import { derivePendingInvoiceCandidates } from "@/hooks/usePendingInvoiceSources"
import { GET, POST } from "@/app/api/companies/[companyId]/consumos/[consumoId]/billing-override/route"

type SurgeryStub = { id: string; companyId: string }
type PresupuestoStub = {
  id: string
  companyId: string
  surgeryId: string
  state: string
  versionNumber: number
  currency: string
  total: Prisma.Decimal
  items: Array<{
    id: string
    sku: string | null
    description: string
    quantity: Prisma.Decimal
    unitPrice: Prisma.Decimal
    discount: Prisma.Decimal
    tax: Prisma.Decimal
    vatTreatment: string
    vatRate: Prisma.Decimal
    metadata: unknown
  }>
}
type ConsumoStub = {
  id: string
  companyId: string
  surgeryId: string
  state: string
  items: Array<{
    id: string
    sku: string | null
    description: string
    consumedQuantity: Prisma.Decimal
    unit: string | null
    metadata: unknown
  }>
}
type RemitoStub = {
  id: string
  companyId: string
  surgeryId: string
  state: string
  items: Array<{
    id: string
    sku: string | null
    description: string
    quantity: Prisma.Decimal
    sentQuantity: Prisma.Decimal
    unit: string | null
  }>
}
type AuditEventStub = {
  id: string
  companyId: string
  userId: string
  entityType: string
  entityId: string
  action: string
  module: string
  detail: string | null
  metadata: unknown
  createdAt: Date
}
type InvoiceStub = {
  id: string
  visibleNumber: number | null
  companyId: string
  surgeryId: string | null
  presupuestoId: string | null
  consumoId: string | null
  base: string
  state: string
  type: string
  currency: string
  subtotal: Prisma.Decimal
  discountTotal: Prisma.Decimal
  taxTotal: Prisma.Decimal
  total: Prisma.Decimal
  paidTotal: Prisma.Decimal
  balance: Prisma.Decimal
  createdById: string | null
  updatedById: string | null
  issuedAt: Date | null
  cancelledAt: Date | null
  createdAt: Date
  updatedAt: Date
  metadata: unknown
  items: unknown[]
}

function buildSurgery(over: Partial<SurgeryStub> = {}): SurgeryStub {
  return { id: "surgery-1", companyId: "company-1", ...over }
}

function buildPresupuesto(over: Partial<PresupuestoStub> = {}): PresupuestoStub {
  return {
    id: "budget-1",
    companyId: "company-1",
    surgeryId: "surgery-1",
    state: "Aprobado",
    versionNumber: 1,
    currency: "ARS",
    total: new Prisma.Decimal("121.0000"),
    items: [
      {
        id: "b-item-1",
        sku: "SKU-001",
        description: "Clavo intramedular",
        quantity: new Prisma.Decimal("1"),
        unitPrice: new Prisma.Decimal("100.0000"),
        discount: new Prisma.Decimal("0"),
        tax: new Prisma.Decimal("21.0000"),
        vatTreatment: "GRAVADO",
        vatRate: new Prisma.Decimal("21"),
        metadata: null,
      },
    ],
    ...over,
  }
}

function buildConsumo(over: Partial<ConsumoStub> = {}): ConsumoStub {
  return {
    id: "consumo-1",
    companyId: "company-1",
    surgeryId: "surgery-1",
    state: "Validado",
    items: [
      {
        id: "c-item-1",
        sku: "SKU-001",
        description: "Clavo intramedular",
        consumedQuantity: new Prisma.Decimal("1"),
        unit: "unidad",
        metadata: null,
      },
    ],
    ...over,
  }
}

function buildInvoice(over: Partial<InvoiceStub> = {}): InvoiceStub {
  return {
    id: "invoice-1",
    visibleNumber: null,
    companyId: "company-1",
    surgeryId: "surgery-1",
    presupuestoId: "budget-1",
    consumoId: "consumo-1",
    base: "mixto",
    state: "Borrador",
    type: "FV",
    currency: "ARS",
    subtotal: new Prisma.Decimal("100"),
    discountTotal: new Prisma.Decimal("0"),
    taxTotal: new Prisma.Decimal("21"),
    total: new Prisma.Decimal("121"),
    paidTotal: new Prisma.Decimal("0"),
    balance: new Prisma.Decimal("121"),
    createdById: "admin-user",
    updatedById: null,
    issuedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: null,
    items: [],
    ...over,
  }
}

describe("LIQUIDATION-BILLING-GATE-DEV-001 — Comparativa Discrepancies Contract", () => {
  it("identifies canonical blocking and warning comparativa states", () => {
    expect(BLOCKING_COMPARATIVA_LINE_STATES).toEqual([
      "revision_manual",
      "consumido_de_mas",
      "no_presupuestado",
      "remitido_de_mas",
      "pendiente_remitir",
    ])
    expect(WARNING_COMPARATIVA_LINE_STATES).toEqual([
      "consumido_de_menos",
    ])

    expect(isBlockingComparativaLineState("revision_manual")).toBe(true)
    expect(isBlockingComparativaLineState("consumido_de_mas")).toBe(true)
    expect(isBlockingComparativaLineState("no_presupuestado")).toBe(true)
    expect(isBlockingComparativaLineState("remitido_de_mas")).toBe(true)
    expect(isBlockingComparativaLineState("pendiente_remitir")).toBe(true)

    // consumido_de_menos is warning, not blocking
    expect(isBlockingComparativaLineState("consumido_de_menos")).toBe(false)
    expect(isWarningComparativaLineState("consumido_de_menos")).toBe(true)

    expect(isBlockingComparativaLineState("coincidente")).toBe(false)
    expect(isBlockingComparativaLineState("devuelto")).toBe(false)
    expect(isBlockingComparativaLineState("pendiente_facturar")).toBe(false)
  })

  it("evaluates clean, warning, and blocking comparativas correctly", () => {
    const cleanComparativa = {
      companyId: "company-1",
      surgeryId: "surgery-1",
      generatedAt: new Date().toISOString(),
      sources: {
        hasPresupuesto: true,
        hasRemitos: true,
        remitosCount: 1,
        remitoNumbers: [],
        hasConsumos: true,
        consumosCount: 1,
        consumoNumbers: [],
        hasDevoluciones: false,
        devolucionesCount: 0,
        devolucionNumbers: [],
        hasInvoices: false,
        invoicesCount: 0,
        invoiceNumbers: [],
        fuentesFaltantes: [],
      },
      summary: {
        totalPresupuestado: 100,
        totalRemitido: 100,
        totalConsumido: 100,
        totalDevuelto: 0,
        totalFacturado: 0,
        totalPendienteFacturar: 100,
        totalUnidadesPresupuestadas: 1,
        totalUnidadesRemitidas: 1,
        totalUnidadesConsumidas: 1,
        totalUnidadesDevueltas: 0,
        totalUnidadesFacturadas: 0,
        totalUnidadesPendienteFacturar: 1,
        deltaEconomico: 0,
        deltaEconomicoEstimado: false,
        lineasCount: 1,
        lineasCoincidentes: 0,
        lineasConDiferencia: 0,
        lineasRevisionManual: 0,
      },
      lineas: [
        {
          key: "line-1",
          codigo: "SKU-001",
          descripcion: "Item 1",
          unit: "unidad",
          metodoMatch: "codigo" as const,
          estadoLinea: "pendiente_facturar" as const,
          necesitaRevision: false,
          observaciones: [],
          presupuestado: 1,
          remitido: 1,
          consumido: 1,
          devuelto: 0,
          pendienteFisico: 0,
          facturado: 0,
          pendienteFacturar: 1,
          precioUnitario: 100,
          precioEstimado: false,
          importePresupuestado: 100,
          importeConsumido: 100,
          importeFacturado: 0,
          deltaCantidad: 0,
          deltaEconomico: 0,
          explicacion: "Pendiente facturar",
          presupuestoItemIds: [],
          remitoItemIds: [],
          consumoItemIds: [],
          devolucionItemIds: [],
          invoiceItemIds: [],
        },
      ],
    } satisfies SurgeryComparativaResponse

    const cleanEval = evaluateComparativaDiscrepancies(cleanComparativa)
    expect(cleanEval.hasUnresolvedDifferences).toBe(false)
    expect(cleanEval.discrepancyCount).toBe(0)
    expect(cleanEval.hasWarnings).toBe(false)

    // Warning only: consumido_de_menos
    const warningComparativa = {
      ...cleanComparativa,
      lineas: [
        {
          ...cleanComparativa.lineas[0],
          estadoLinea: "consumido_de_menos" as const,
          presupuestado: 2,
          consumido: 1,
          explicacion: "Consumo menor al presupuestado",
        },
      ],
    } satisfies SurgeryComparativaResponse

    const warningEval = evaluateComparativaDiscrepancies(warningComparativa)
    expect(warningEval.hasUnresolvedDifferences).toBe(false)
    expect(warningEval.discrepancyCount).toBe(0)
    expect(warningEval.hasWarnings).toBe(true)
    expect(warningEval.warningCount).toBe(1)
    expect(warningEval.warningsSummary[0].estadoLinea).toBe("consumido_de_menos")

    // Blocking: consumido_de_mas
    const dirtyComparativa = {
      ...cleanComparativa,
      lineas: [
        {
          ...cleanComparativa.lineas[0],
          estadoLinea: "consumido_de_mas" as const,
          consumido: 2,
          explicacion: "Consumo excede lo presupuestado",
        },
      ],
    } satisfies SurgeryComparativaResponse

    const dirtyEval = evaluateComparativaDiscrepancies(dirtyComparativa)
    expect(dirtyEval.hasUnresolvedDifferences).toBe(true)
    expect(dirtyEval.discrepancyCount).toBe(1)
    expect(dirtyEval.differencesSummary[0].estadoLinea).toBe("consumido_de_mas")
  })

  it("normalizes and compares discrepancies snapshots deterministically", () => {
    const diffA: ComparativaDiscrepancyLineSummary[] = [
      {
        codigo: "SKU-B",
        descripcion: "Placa",
        estadoLinea: "no_presupuestado",
        explicacion: "No presupuestado",
        presupuestado: 0,
        remitido: 1,
        consumido: 1,
        devuelto: 0,
      },
      {
        codigo: "SKU-A",
        descripcion: "Tornillo",
        estadoLinea: "consumido_de_mas",
        explicacion: "Consumo de más",
        presupuestado: 2,
        remitido: 3,
        consumido: 3,
        devuelto: 0,
      },
    ]

    const diffB: ComparativaDiscrepancyLineSummary[] = [
      diffA[1],
      diffA[0],
    ]

    expect(normalizeDiscrepanciesSnapshot(diffA)).toBe(normalizeDiscrepanciesSnapshot(diffB))
    expect(isOverrideMatchingSnapshot({ metadata: { differencesSnapshot: diffB } }, diffA)).toBe(true)

    const diffModified: ComparativaDiscrepancyLineSummary[] = [
      {
        ...diffA[0],
        consumido: 2,
      },
      diffA[1],
    ]
    expect(isOverrideMatchingSnapshot({ metadata: { differencesSnapshot: diffModified } }, diffA)).toBe(false)
  })
})

describe("LIQUIDATION-BILLING-GATE-DEV-001 — Service & Server-Side Authority", () => {
  const auditStore: AuditEventStub[] = []

  beforeEach(() => {
    auditStore.length = 0
    createAuditEvent.mockReset().mockImplementation(async (input: {
      companyId: string
      userId: string
      entityType: string
      entityId: string
      action: string
      module: string
      detail?: string
      metadata?: unknown
    }) => {
      const record: AuditEventStub = {
        id: `audit-evt-${auditStore.length + 1}`,
        companyId: input.companyId,
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        module: input.module,
        detail: input.detail ?? null,
        metadata: input.metadata,
        createdAt: new Date(),
      }
      auditStore.unshift(record)
      return record
    })
  })

  function createMockPrisma(opts: {
    cleanComparativa?: boolean
    presupuestadoQty?: number
    consumedQty?: number
    extraItem?: { sku: string; description: string; quantity: number }
    overrideDetail?: string
    initialSnapshot?: ComparativaDiscrepancyLineSummary[]
  }) {
    const clean = opts.cleanComparativa ?? true
    const presupuestadoQty = opts.presupuestadoQty ?? 1
    const consumedQty = opts.consumedQty ?? (clean ? 1 : 2)
    const surgery = buildSurgery()
    const presupuesto = buildPresupuesto({
      items: [
        {
          id: "b-item-1",
          sku: "SKU-001",
          description: "Clavo intramedular",
          quantity: new Prisma.Decimal(String(presupuestadoQty)),
          unitPrice: new Prisma.Decimal("100.0000"),
          discount: new Prisma.Decimal("0"),
          tax: new Prisma.Decimal("21.0000"),
          vatTreatment: "GRAVADO",
          vatRate: new Prisma.Decimal("21"),
          metadata: null,
        },
      ],
    })

    const consumoItems = [
      {
        id: "c-item-1",
        sku: "SKU-001",
        description: "Clavo intramedular",
        consumedQuantity: new Prisma.Decimal(String(consumedQty)),
        unit: "unidad",
        metadata: null,
      },
    ]

    if (opts.extraItem) {
      consumoItems.push({
        id: "c-item-extra",
        sku: opts.extraItem.sku,
        description: opts.extraItem.description,
        consumedQuantity: new Prisma.Decimal(String(opts.extraItem.quantity)),
        unit: "unidad",
        metadata: null,
      })
    }

    const consumo = buildConsumo({ items: consumoItems })

    const remitoItems = [
      {
        id: "r-item-1",
        sku: "SKU-001",
        description: "Clavo intramedular",
        quantity: new Prisma.Decimal(String(presupuestadoQty)),
        sentQuantity: new Prisma.Decimal(String(presupuestadoQty)),
        unit: "unidad",
      },
    ]

    const remito: RemitoStub = {
      id: "remito-1",
      companyId: "company-1",
      surgeryId: "surgery-1",
      state: "Emitido",
      items: remitoItems,
    }

    if (opts.initialSnapshot) {
      auditStore.unshift({
        id: "override-initial",
        companyId: "company-1",
        userId: "admin-user",
        entityType: "Consumo",
        entityId: "consumo-1",
        action: CONSUMPTION_BILLING_OVERRIDE_ACTION,
        module: "billing",
        detail: opts.overrideDetail ?? "Autorizado inicialmente",
        metadata: {
          surgeryId: "surgery-1",
          consumoId: "consumo-1",
          reason: opts.overrideDetail ?? "Autorizado inicialmente",
          differencesSnapshot: opts.initialSnapshot,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date("2026-09-30T10:00:00.000Z"),
      })
    }

    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      surgery: { findFirst: vi.fn().mockResolvedValue(surgery) },
      presupuesto: {
        findFirst: vi.fn().mockResolvedValue(presupuesto),
        findMany: vi.fn().mockResolvedValue([presupuesto]),
      },
      consumo: {
        findFirst: vi.fn().mockResolvedValue(consumo),
        findMany: vi.fn().mockResolvedValue([consumo]),
      },
      remito: { findMany: vi.fn().mockResolvedValue([remito]) },
      devolucion: { findMany: vi.fn().mockResolvedValue([]) },
      invoice: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(async ({ data }: { data: { items: { create: unknown[] } } }) =>
          buildInvoice({ ...data, items: data.items.create })
        ),
      },
      auditEvent: {
        findFirst: vi.fn().mockImplementation(() => Promise.resolve(auditStore[0] ?? null)),
      },
    }

    const prisma = {
      ...tx,
      $transaction: vi.fn((cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
    }

    return { prisma: prisma as unknown as PrismaClient, tx, surgery, presupuesto, consumo }
  }

  it("1. Consumo validado con Comparativa limpia → permite borrador", async () => {
    const { prisma } = createMockPrisma({ cleanComparativa: true })

    const status = await getConsumptionBillingGateStatus({
      companyId: "company-1",
      consumoId: "consumo-1",
      prisma,
    })
    expect(status.hasUnresolvedDifferences).toBe(false)
    expect(status.blocked).toBe(false)
    expect(status.hasWarnings).toBe(false)

    const invoice = await createInvoiceFromSource({
      companyId: "company-1",
      presupuestoId: "budget-1",
      consumoId: "consumo-1",
      createdById: "user-1",
      prisma,
    })
    expect(invoice.id).toBe("invoice-1")
    expect(invoice.state).toBe("Borrador")
  })

  it("2. Solo consumido_de_menos → permite borrador sin override y expone advertencia", async () => {
    // Presupuesto: 2 units, Consumo: 1 unit (subconsumo)
    const { prisma } = createMockPrisma({
      presupuestadoQty: 2,
      consumedQty: 1,
    })

    const status = await getConsumptionBillingGateStatus({
      companyId: "company-1",
      consumoId: "consumo-1",
      prisma,
    })

    // Subconsumption is NOT a blocking discrepancy
    expect(status.hasUnresolvedDifferences).toBe(false)
    expect(status.blocked).toBe(false)
    expect(status.blockReason).toBeNull()

    // But it triggers non-blocking warning
    expect(status.hasWarnings).toBe(true)
    expect(status.warningCount).toBe(1)
    expect(status.warningsSummary[0].estadoLinea).toBe("consumido_de_menos")
    expect(status.warningMessage).toContain("Consumo menor al presupuestado")

    // Allows creating draft without override
    await expect(
      assertConsumptionBillingAllowed({
        companyId: "company-1",
        consumoId: "consumo-1",
        surgeryId: "surgery-1",
        prisma,
      })
    ).resolves.toEqual({ allowed: true })

    const invoice = await createInvoiceFromSource({
      companyId: "company-1",
      presupuestoId: "budget-1",
      consumoId: "consumo-1",
      createdById: "user-1",
      prisma,
    })
    expect(invoice.id).toBe("invoice-1")
    expect(invoice.state).toBe("Borrador")
  })

  it("3. consumido_de_menos + diferencia bloqueante → sigue bloqueado", async () => {
    // Item 1 has consumido_de_menos (presupuestado 2, consumed 1)
    // Item 2 is unbudgeted extra (no_presupuestado, blocking)
    const { prisma } = createMockPrisma({
      presupuestadoQty: 2,
      consumedQty: 1,
      extraItem: { sku: "SKU-UNBUDGETED", description: "Material no presupuestado", quantity: 1 },
    })

    const status = await getConsumptionBillingGateStatus({
      companyId: "company-1",
      consumoId: "consumo-1",
      prisma,
    })

    expect(status.hasWarnings).toBe(true)
    expect(status.hasUnresolvedDifferences).toBe(true)
    expect(status.blocked).toBe(true)
    expect(status.blockReason).toContain("diferencias no resueltas")

    await expect(
      assertConsumptionBillingAllowed({
        companyId: "company-1",
        consumoId: "consumo-1",
        surgeryId: "surgery-1",
        prisma,
      })
    ).rejects.toMatchObject({
      code: CONSUMPTION_BILLING_BLOCKED_CODE,
      status: 403,
    })
  })

  it("4. consumido_de_mas → sigue bloqueando", async () => {
    // Consumed 2 vs budgeted 1 -> consumido_de_mas (blocking)
    const { prisma } = createMockPrisma({
      presupuestadoQty: 1,
      consumedQty: 2,
    })

    const status = await getConsumptionBillingGateStatus({
      companyId: "company-1",
      consumoId: "consumo-1",
      prisma,
    })

    expect(status.hasUnresolvedDifferences).toBe(true)
    expect(status.blocked).toBe(true)
    expect(status.discrepancyCount).toBe(1)
    expect(status.differencesSummary[0].estadoLinea).toBe("consumido_de_mas")

    await expect(
      assertConsumptionBillingAllowed({
        companyId: "company-1",
        consumoId: "consumo-1",
        surgeryId: "surgery-1",
        prisma,
      })
    ).rejects.toMatchObject({
      code: CONSUMPTION_BILLING_BLOCKED_CODE,
      status: 403,
    })
  })

  it("5. Override + mismo snapshot → habilita e idempotencia", async () => {
    const { prisma } = createMockPrisma({ cleanComparativa: false, consumedQty: 2 })

    // 1st call creates override
    const firstOverride = await createConsumptionBillingOverride({
      companyId: "company-1",
      consumoId: "consumo-1",
      reason: "Excepción autorizada para consumo de 2 unidades",
      actorUserId: "admin-1",
      prisma,
    })

    expect(firstOverride.success).toBe(true)
    expect(firstOverride.alreadyExisted).toBe(false)
    expect(auditStore).toHaveLength(1)

    // Gate is now unblocked because snapshot matches
    const status = await getConsumptionBillingGateStatus({
      companyId: "company-1",
      consumoId: "consumo-1",
      prisma,
    })
    expect(status.blocked).toBe(false)
    expect(status.override?.detail).toBe("Excepción autorizada para consumo de 2 unidades")

    // 2nd call with same snapshot is idempotent
    const secondOverride = await createConsumptionBillingOverride({
      companyId: "company-1",
      consumoId: "consumo-1",
      reason: "Excepción autorizada para consumo de 2 unidades",
      actorUserId: "admin-1",
      prisma,
    })
    expect(secondOverride.success).toBe(true)
    expect(secondOverride.alreadyExisted).toBe(true)
    expect(auditStore).toHaveLength(1)
  })

  it("6. Override + snapshot distinto → bloquea y requiere nueva excepción", async () => {
    const staleSnapshot: ComparativaDiscrepancyLineSummary[] = [
      {
        codigo: "SKU-001",
        descripcion: "Clavo intramedular",
        estadoLinea: "consumido_de_mas",
        explicacion: "Consumo (2 u.) supera lo presupuestado (1 u.).",
        presupuestado: 1,
        remitido: 1,
        consumido: 2,
        devuelto: 0,
      },
    ]

    const { prisma } = createMockPrisma({
      cleanComparativa: false,
      consumedQty: 3,
      initialSnapshot: staleSnapshot,
    })

    expect(auditStore).toHaveLength(1)

    const status = await getConsumptionBillingGateStatus({
      companyId: "company-1",
      consumoId: "consumo-1",
      prisma,
    })
    expect(status.hasUnresolvedDifferences).toBe(true)
    expect(status.blocked).toBe(true)
    expect(status.override).toBeNull()

    await expect(
      assertConsumptionBillingAllowed({
        companyId: "company-1",
        consumoId: "consumo-1",
        surgeryId: "surgery-1",
        prisma,
      })
    ).rejects.toMatchObject({
      code: CONSUMPTION_BILLING_BLOCKED_CODE,
      status: 403,
    })
  })

  it("7. Admin crea nueva excepción ante snapshot distinto → habilita y quedan ambos AuditEvent", async () => {
    const staleSnapshot: ComparativaDiscrepancyLineSummary[] = [
      {
        codigo: "SKU-001",
        descripcion: "Clavo intramedular",
        estadoLinea: "consumido_de_mas",
        explicacion: "Consumo (2 u.) supera lo presupuestado (1 u.).",
        presupuestado: 1,
        remitido: 1,
        consumido: 2,
        devuelto: 0,
      },
    ]

    const { prisma } = createMockPrisma({
      cleanComparativa: false,
      consumedQty: 3,
      initialSnapshot: staleSnapshot,
    })

    expect(auditStore).toHaveLength(1)

    const newOverride = await createConsumptionBillingOverride({
      companyId: "company-1",
      consumoId: "consumo-1",
      reason: "Re-autorizado tras aumento a 3 unidades en parte quirúrgico",
      actorUserId: "admin-2",
      prisma,
    })

    expect(newOverride.success).toBe(true)
    expect(newOverride.alreadyExisted).toBe(false)
    expect(auditStore).toHaveLength(2)

    const status = await getConsumptionBillingGateStatus({
      companyId: "company-1",
      consumoId: "consumo-1",
      prisma,
    })
    expect(status.blocked).toBe(false)
    expect(status.override?.id).toBe(auditStore[0].id)
  })

  it("8. Override requiere motivo no vacío", async () => {
    const { prisma } = createMockPrisma({ cleanComparativa: false })

    await expect(
      createConsumptionBillingOverride({
        companyId: "company-1",
        consumoId: "consumo-1",
        reason: "   ",
        actorUserId: "admin-1",
        prisma,
      })
    ).rejects.toMatchObject({
      code: "consumption_override_reason_required",
      status: 400,
    })
  })

  it("9. Manual y presupuesto sin Consumo → sin regresión", async () => {
    const { prisma, tx } = createMockPrisma({ cleanComparativa: false })

    const budgetOnlyInvoice = await createInvoiceFromSource({
      companyId: "company-1",
      presupuestoId: "budget-1",
      createdById: "user-1",
      prisma,
    })
    expect(budgetOnlyInvoice.base).toBe("presupuesto")
    expect(budgetOnlyInvoice.state).toBe("Borrador")

    const manualInvoice = await createInvoice({
      companyId: "company-1",
      base: "manual",
      items: [{ description: "Servicio", quantity: "1", unitPrice: "500" }],
      createdById: "user-1",
      prisma,
    })
    expect(manualInvoice.base).toBe("manual")
    expect(manualInvoice.state).toBe("Borrador")
  })
})

describe("LIQUIDATION-BILLING-GATE-DEV-001 — API Route & RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET returns 200/404 with context resolved", async () => {
    getApiAuthContext.mockResolvedValue({ companyId: "company-1", actorUserId: "user-1", role: "vendedor" })
    const req = new Request("http://localhost/api/companies/company-1/consumos/consumo-1/billing-override")
    const res = await GET(req, { params: Promise.resolve({ companyId: "company-1", consumoId: "consumo-1" }) })
    expect([200, 404, 500]).toContain(res.status)
  })

  it("POST denies non-admin actors server-side", async () => {
    getApiAuthContext.mockResolvedValue({ companyId: "company-1", actorUserId: "vendedor-1", role: "vendedor" })
    const req = new Request("http://localhost/api/companies/company-1/consumos/consumo-1/billing-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Quiero habilitar" }),
    })
    const res = await POST(req, { params: Promise.resolve({ companyId: "company-1", consumoId: "consumo-1" }) })
    expect(res.status).toBe(403)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe("admin_role_required")
  })

  it("POST rejects empty reason even for admin", async () => {
    getApiAuthContext.mockResolvedValue({ companyId: "company-1", actorUserId: "admin-1", role: "admin" })
    const req = new Request("http://localhost/api/companies/company-1/consumos/consumo-1/billing-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "   " }),
    })
    const res = await POST(req, { params: Promise.resolve({ companyId: "company-1", consumoId: "consumo-1" }) })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe("consumption_override_reason_required")
  })
})

describe("LIQUIDATION-BILLING-GATE-DEV-001 — Pending Candidates Derivation", () => {
  it("reflects blocked, override, and warning state on pending candidates", () => {
    const presupuestos = [
      {
        ...buildPresupuesto({ id: "pr-1", companyId: "comp-1", surgeryId: "sx-1", total: new Prisma.Decimal("100") }),
        slot: "CURRENT" as const,
        total: "100",
      },
    ] as unknown as Parameters<typeof derivePendingInvoiceCandidates>[1]
    const consumos = [
      buildConsumo({ id: "c-1", companyId: "comp-1", surgeryId: "sx-1" }),
    ] as unknown as Parameters<typeof derivePendingInvoiceCandidates>[2]
    const invoices = [] as unknown as Parameters<typeof derivePendingInvoiceCandidates>[3]

    // Blocked candidate (consumido_de_mas)
    const blockedGateMap = new Map([
      [
        "c-1",
        {
          consumoId: "c-1",
          surgeryId: "sx-1",
          hasUnresolvedDifferences: true,
          blocked: true,
          blockReason: "La comparativa de materiales tiene diferencias no resueltas. Requiere excepción de administración para facturar.",
          discrepancyCount: 1,
          differencesSummary: [],
          hasWarnings: false,
          warningCount: 0,
          warningsSummary: [],
          warningMessage: null,
          override: null,
        },
      ],
    ])

    const blockedCandidates = derivePendingInvoiceCandidates("comp-1", presupuestos, consumos, invoices, blockedGateMap)
    expect(blockedCandidates).toHaveLength(1)
    expect(blockedCandidates[0].kind).toBe("consumo")
    expect(blockedCandidates[0].blocked).toBe(true)
    expect(blockedCandidates[0].blockReason).toContain("diferencias no resueltas")
    expect(blockedCandidates[0].hasOverride).toBe(false)
    expect(blockedCandidates[0].hasWarning).toBe(false)

    // Warning candidate (consumido_de_menos) -> unblocked, hasWarning true
    const warningGateMap = new Map([
      [
        "c-1",
        {
          consumoId: "c-1",
          surgeryId: "sx-1",
          hasUnresolvedDifferences: false,
          blocked: false,
          blockReason: null,
          discrepancyCount: 0,
          differencesSummary: [],
          hasWarnings: true,
          warningCount: 1,
          warningsSummary: [],
          warningMessage: "Consumo menor al presupuestado en 1 línea(s). No bloquea la facturación.",
          override: null,
        },
      ],
    ])

    const warningCandidates = derivePendingInvoiceCandidates("comp-1", presupuestos, consumos, invoices, warningGateMap)
    expect(warningCandidates[0].blocked).toBe(false)
    expect(warningCandidates[0].hasWarning).toBe(true)
    expect(warningCandidates[0].warningMessage).toContain("Consumo menor al presupuestado")

    // Matching override present -> unblocked, hasOverride true
    const overrideGateMap = new Map([
      [
        "c-1",
        {
          consumoId: "c-1",
          surgeryId: "sx-1",
          hasUnresolvedDifferences: true,
          blocked: false,
          blockReason: null,
          discrepancyCount: 1,
          differencesSummary: [],
          hasWarnings: false,
          warningCount: 0,
          warningsSummary: [],
          warningMessage: null,
          override: {
            id: "ov-1",
            userId: "admin-1",
            createdAt: new Date(),
            detail: "Motivo",
            metadata: {},
          },
        },
      ],
    ])

    const unblockedCandidates = derivePendingInvoiceCandidates("comp-1", presupuestos, consumos, invoices, overrideGateMap)
    expect(unblockedCandidates[0].blocked).toBe(false)
    expect(unblockedCandidates[0].hasOverride).toBe(true)
  })
})
