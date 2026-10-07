// OSSUM COR — Billing Gate & Override Service (LIQUIDATION-BILLING-GATE-DEV-001)
// Backend-authoritative gate: Consumo-derived invoice drafts require a clean Comparativa
// or an active admin override whose snapshot exactly matches current blocking differences.

import type { Prisma, PrismaClient } from "@prisma/client"
import { badRequest, forbidden, notFound } from "../api/errors"
import { createAuditEvent } from "../audit"
import {
  evaluateComparativaDiscrepancies,
  getSurgeryComparativa,
  type ComparativaDiscrepancyLineSummary,
  type ComparativaEvaluationResult,
} from "./comparativa.service"

export const CONSUMPTION_BILLING_OVERRIDE_ACTION = "billing.consumption_override" as const
export const CONSUMPTION_BILLING_BLOCKED_CODE = "consumption_comparativa_blocked" as const
export const CONSUMPTION_BILLING_BLOCKED_MESSAGE =
  "La comparativa de materiales tiene diferencias no resueltas. Requiere excepción de administración para facturar."

export type ConsumptionBillingGateStatus = {
  consumoId: string
  surgeryId: string
  hasUnresolvedDifferences: boolean
  blocked: boolean
  blockReason: string | null
  discrepancyCount: number
  differencesSummary: ComparativaEvaluationResult["differencesSummary"]
  hasWarnings: boolean
  warningCount: number
  warningsSummary: ComparativaEvaluationResult["warningsSummary"]
  warningMessage: string | null
  override: {
    id: string
    userId: string
    createdAt: Date
    detail: string | null
    metadata: unknown
  } | null
}

export function normalizeDiscrepanciesSnapshot(
  differences: readonly ComparativaDiscrepancyLineSummary[]
): string {
  const sorted = [...differences].sort((a, b) => {
    const codeDiff = a.codigo.localeCompare(b.codigo)
    if (codeDiff !== 0) return codeDiff
    return a.estadoLinea.localeCompare(b.estadoLinea)
  })

  return JSON.stringify(
    sorted.map((d) => ({
      codigo: d.codigo,
      descripcion: d.descripcion,
      estadoLinea: d.estadoLinea,
      explicacion: d.explicacion,
      presupuestado: d.presupuestado,
      remitido: d.remitido,
      consumido: d.consumido,
      devuelto: d.devuelto,
    }))
  )
}

function extractSnapshotFromMetadata(metadata: unknown): ComparativaDiscrepancyLineSummary[] | null {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "differencesSnapshot" in metadata &&
    Array.isArray((metadata as Record<string, unknown>).differencesSnapshot)
  ) {
    const arr = (metadata as Record<string, unknown>).differencesSnapshot as unknown[]
    const parsed: ComparativaDiscrepancyLineSummary[] = []
    for (const item of arr) {
      if (typeof item === "object" && item !== null) {
        const rec = item as Record<string, unknown>
        if (
          typeof rec.codigo === "string" &&
          typeof rec.descripcion === "string" &&
          typeof rec.estadoLinea === "string"
        ) {
          parsed.push({
            codigo: rec.codigo,
            descripcion: rec.descripcion,
            estadoLinea: rec.estadoLinea as ComparativaDiscrepancyLineSummary["estadoLinea"],
            explicacion: typeof rec.explicacion === "string" ? rec.explicacion : "",
            presupuestado: Number(rec.presupuestado ?? 0),
            remitido: Number(rec.remitido ?? 0),
            consumido: Number(rec.consumido ?? 0),
            devuelto: Number(rec.devuelto ?? 0),
          })
        }
      }
    }
    return parsed
  }
  return null
}

export function isOverrideMatchingSnapshot(
  override: { metadata: unknown } | null,
  currentDifferences: readonly ComparativaDiscrepancyLineSummary[]
): boolean {
  if (!override) return false
  const snapshot = extractSnapshotFromMetadata(override.metadata)
  if (!snapshot) return false
  return normalizeDiscrepanciesSnapshot(snapshot) === normalizeDiscrepanciesSnapshot(currentDifferences)
}

export async function findConsumptionBillingOverride(input: {
  companyId: string
  consumoId: string
  prisma: PrismaClient | Prisma.TransactionClient
}) {
  return input.prisma.auditEvent.findFirst({
    where: {
      companyId: input.companyId,
      entityType: "Consumo",
      entityId: input.consumoId,
      action: CONSUMPTION_BILLING_OVERRIDE_ACTION,
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      detail: true,
      metadata: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getConsumptionBillingGateStatus(input: {
  companyId: string
  consumoId: string
  prisma: PrismaClient | Prisma.TransactionClient
}): Promise<ConsumptionBillingGateStatus> {
  const consumo = await input.prisma.consumo.findFirst({
    where: { id: input.consumoId, companyId: input.companyId },
    select: { id: true, surgeryId: true, state: true },
  })

  if (!consumo) {
    throw notFound(`Consumo ${input.consumoId} no encontrado en la empresa`, "consumo_not_found")
  }

  if (!consumo.surgeryId) {
    throw badRequest("El consumo no está vinculado a una cirugía", "consumo_surgery_missing")
  }

  const comparativa = await getSurgeryComparativa({
    companyId: input.companyId,
    surgeryId: consumo.surgeryId,
    prisma: input.prisma as PrismaClient,
  })

  const evaluation = evaluateComparativaDiscrepancies(comparativa)
  const latestOverride = await findConsumptionBillingOverride({
    companyId: input.companyId,
    consumoId: input.consumoId,
    prisma: input.prisma,
  })

  const activeOverride = isOverrideMatchingSnapshot(latestOverride, evaluation.differencesSummary)
    ? latestOverride
    : null

  const blocked = evaluation.hasUnresolvedDifferences && !activeOverride
  const warningMessage = evaluation.hasWarnings
    ? `Consumo menor al presupuestado en ${evaluation.warningCount} línea(s). No bloquea la facturación.`
    : null

  return {
    consumoId: consumo.id,
    surgeryId: consumo.surgeryId,
    hasUnresolvedDifferences: evaluation.hasUnresolvedDifferences,
    blocked,
    blockReason: blocked ? CONSUMPTION_BILLING_BLOCKED_MESSAGE : null,
    discrepancyCount: evaluation.discrepancyCount,
    differencesSummary: evaluation.differencesSummary,
    hasWarnings: evaluation.hasWarnings,
    warningCount: evaluation.warningCount,
    warningsSummary: evaluation.warningsSummary,
    warningMessage,
    override: activeOverride,
  }
}

export async function createConsumptionBillingOverride(input: {
  companyId: string
  consumoId: string
  reason: string
  actorUserId: string
  prisma: PrismaClient | Prisma.TransactionClient
}) {
  if (typeof input.reason !== "string" || input.reason.trim().length === 0) {
    throw badRequest("El motivo de la excepción es obligatorio", "consumption_override_reason_required")
  }

  const trimmedReason = input.reason.trim()

  const gateStatus = await getConsumptionBillingGateStatus({
    companyId: input.companyId,
    consumoId: input.consumoId,
    prisma: input.prisma,
  })

  // Idempotent: return existing active override if one matching the current snapshot is already present
  if (gateStatus.override) {
    return {
      success: true,
      override: gateStatus.override,
      alreadyExisted: true,
    }
  }

  const created = await createAuditEvent({
    prisma: input.prisma,
    companyId: input.companyId,
    userId: input.actorUserId,
    entityType: "Consumo",
    entityId: input.consumoId,
    action: CONSUMPTION_BILLING_OVERRIDE_ACTION,
    module: "billing",
    detail: trimmedReason,
    metadata: {
      surgeryId: gateStatus.surgeryId,
      consumoId: input.consumoId,
      reason: trimmedReason,
      differencesSnapshot: gateStatus.differencesSummary,
      timestamp: new Date().toISOString(),
    },
  })

  return {
    success: true,
    override: {
      id: created.id,
      userId: created.userId,
      createdAt: created.createdAt,
      detail: created.detail,
      metadata: created.metadata,
    },
    alreadyExisted: false,
  }
}

export async function assertConsumptionBillingAllowed(input: {
  companyId: string
  consumoId: string
  surgeryId: string
  prisma: PrismaClient | Prisma.TransactionClient
}): Promise<{ allowed: true }> {
  const gateStatus = await getConsumptionBillingGateStatus({
    companyId: input.companyId,
    consumoId: input.consumoId,
    prisma: input.prisma,
  })

  if (gateStatus.blocked) {
    throw forbidden(CONSUMPTION_BILLING_BLOCKED_MESSAGE, CONSUMPTION_BILLING_BLOCKED_CODE)
  }

  return { allowed: true }
}
