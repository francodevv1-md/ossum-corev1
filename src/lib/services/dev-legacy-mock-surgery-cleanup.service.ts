import type { PrismaClient } from "@prisma/client"

import {
  cleanupBackendDevSurgeries,
  LEGACY_MOCK_SYNC_SOURCE_PREFIX,
} from "./dev-surgery-cleanup.service"

export type LegacyMockSurgeryCleanupSummary = {
  companyId: string
  sourcePrefix: string
  surgeries: Array<{
    id: string
    visibleNumber: string | null
    source: string | null
  }>
  counts: {
    surgeries: number
    auditEvents: number
    seguimientoEntries: number
    internalNotifications: number
    digitalReceipts: number
    contactAssignments: number
  }
}

export type LegacyMockSurgeryCleanupResult = {
  mode: "dry-run" | "apply"
  summary: LegacyMockSurgeryCleanupSummary
  deleted: {
    auditEvents: number
    surgeries: number
  }
}

function ensureCompanyId(companyId: string) {
  const normalized = companyId.trim()
  if (!normalized) {
    throw new Error("companyId is required")
  }

  return normalized
}

export async function cleanupLegacyMockSyncSurgeries(
  prisma: PrismaClient,
  companyIdInput: string,
  options?: { apply?: boolean }
): Promise<LegacyMockSurgeryCleanupResult> {
  const companyId = ensureCompanyId(companyIdInput)
  const result = await cleanupBackendDevSurgeries(prisma, companyId, {
    apply: options?.apply,
    criteria: ["legacy-mock-sync-source"],
  })

  return {
    mode: result.mode,
    summary: {
      companyId,
      sourcePrefix: LEGACY_MOCK_SYNC_SOURCE_PREFIX,
      surgeries: result.summary.candidateSurgeries.map((surgery) => ({
        id: surgery.id,
        visibleNumber: surgery.visibleNumber,
        source: surgery.source,
      })),
      counts: result.summary.counts,
    },
    deleted: result.deleted,
  }
}

export { LEGACY_MOCK_SYNC_SOURCE_PREFIX }
