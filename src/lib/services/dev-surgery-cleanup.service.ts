import type { PrismaClient } from "@prisma/client"

export const LEGACY_MOCK_SYNC_SOURCE_PREFIX = "legacy-mock-sync:"
export const DEV_SURGERY_HARD_DELETE_ENV_VAR = "OSSUM_ALLOW_DEV_SURGERY_HARD_DELETE"
export const DEV_SURGERY_HARD_DELETE_ENV_VALUE = "I_UNDERSTAND_SOFT_ARCHIVE_IS_PRODUCTION_POLICY"

export const DEV_SURGERY_CLEANUP_CRITERIA = [
  "legacy-mock-sync-source",
  "cx-dev-visible-number",
  "sgdevmock-id",
  "mock-source",
  "aut-visible-number-with-mock-marker",
] as const

export type DevSurgeryCleanupCriterion = (typeof DEV_SURGERY_CLEANUP_CRITERIA)[number]

type ContactLabelShape = {
  firstName: string | null
  lastName: string | null
  legalName: string | null
}

type SurgeryInventoryRow = {
  id: string
  visibleNumber: string | null
  source: string | null
  classification: string | null
  priority: string | null
  cxStatus: string
  prepStatus: string | null
  probableDate: Date | null
  scheduledDate: Date | null
  surgeryDate: Date | null
  performedDate: Date | null
  cancelledDate: Date | null
  createdAt: Date
  patient: ContactLabelShape
  doctor: ContactLabelShape | null
  institution: ContactLabelShape | null
  payer: ContactLabelShape | null
}

export type DevSurgeryCleanupReason = {
  criterion: DevSurgeryCleanupCriterion
  reason: string
}

export type DevSurgeryInventoryItem = {
  id: string
  visibleNumber: string | null
  source: string | null
  classification: string | null
  priority: string | null
  cxStatus: string
  prepStatus: string | null
  probableDate: string | null
  scheduledDate: string | null
  surgeryDate: string | null
  performedDate: string | null
  cancelledDate: string | null
  createdAt: string
  patientLabel: string | null
  doctorLabel: string | null
  institutionLabel: string | null
  payerLabel: string | null
  candidateCleanupReasons: DevSurgeryCleanupReason[]
}

export type DevSurgeryDependencyCounts = {
  surgeries: number
  auditEvents: number
  seguimientoEntries: number
  internalNotifications: number
  digitalReceipts: number
  contactAssignments: number
}

export type DevSurgeryInventorySummary = {
  companyId: string
  criteria: DevSurgeryCleanupCriterion[]
  surgeries: DevSurgeryInventoryItem[]
  candidateSurgeries: DevSurgeryInventoryItem[]
  counts: DevSurgeryDependencyCounts
  candidateCountsByCriterion: Record<DevSurgeryCleanupCriterion, number>
}

export type DevSurgeryCleanupResult = {
  mode: "dry-run" | "apply"
  summary: DevSurgeryInventorySummary
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

function ensureDevSurgeryHardDeleteAllowed() {
  if (process.env[DEV_SURGERY_HARD_DELETE_ENV_VAR] === DEV_SURGERY_HARD_DELETE_ENV_VALUE) {
    return
  }

  throw new Error(
    `Production surgery deletion policy is soft archive. This dev-only destructive cleanup performs hard deletes and apply mode requires ${DEV_SURGERY_HARD_DELETE_ENV_VAR}="${DEV_SURGERY_HARD_DELETE_ENV_VALUE}".`
  )
}

function normalizeCriteria(
  criteria?: readonly DevSurgeryCleanupCriterion[]
): DevSurgeryCleanupCriterion[] {
  const requested = criteria?.length ? [...criteria] : [...DEV_SURGERY_CLEANUP_CRITERIA]
  const seen = new Set<DevSurgeryCleanupCriterion>()

  for (const criterion of requested) {
    if (!DEV_SURGERY_CLEANUP_CRITERIA.includes(criterion)) {
      throw new Error(`Unsupported cleanup criterion: ${criterion}`)
    }

    seen.add(criterion)
  }

  return [...seen]
}

function formatDate(value: Date | null) {
  return value ? value.toISOString() : null
}

function formatContactLabel(contact: ContactLabelShape | null) {
  if (!contact) {
    return null
  }

  const legalName = contact.legalName?.trim()
  if (legalName) {
    return legalName
  }

  const fullName = [contact.firstName, contact.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")

  return fullName || null
}

function hasObviousMockSourceMarker(source: string | null) {
  if (!source) {
    return false
  }

  const normalized = source.trim().toLowerCase()
  return /(^|[:_-])(mock|test)([:_-]|$)/i.test(normalized)
}

function matchesLegacyMockSyncSource(source: string | null) {
  return source?.startsWith(LEGACY_MOCK_SYNC_SOURCE_PREFIX) ?? false
}

function matchesCxDevVisibleNumber(visibleNumber: string | null) {
  return visibleNumber?.startsWith("CX-DEV-") ?? false
}

function matchesSgDevMockId(id: string) {
  return id.toLowerCase().startsWith("sgdevmock")
}

function matchesAutVisibleNumberWithMockMarker(row: SurgeryInventoryRow) {
  if (!(row.visibleNumber?.startsWith("AUT-") ?? false)) {
    return false
  }

  return matchesSgDevMockId(row.id) || hasObviousMockSourceMarker(row.source) || matchesLegacyMockSyncSource(row.source)
}

function getCriterionReason(
  row: SurgeryInventoryRow,
  criterion: DevSurgeryCleanupCriterion
): string | null {
  switch (criterion) {
    case "legacy-mock-sync-source":
      return matchesLegacyMockSyncSource(row.source)
        ? `source starts with ${LEGACY_MOCK_SYNC_SOURCE_PREFIX}`
        : null
    case "cx-dev-visible-number":
      return matchesCxDevVisibleNumber(row.visibleNumber)
        ? `visibleNumber starts with CX-DEV- (${row.visibleNumber})`
        : null
    case "sgdevmock-id":
      return matchesSgDevMockId(row.id) ? `id starts with sgdevmock (${row.id})` : null
    case "mock-source":
      return !matchesLegacyMockSyncSource(row.source) && hasObviousMockSourceMarker(row.source)
        ? `source contains mock/test marker (${row.source})`
        : null
    case "aut-visible-number-with-mock-marker":
      return matchesAutVisibleNumberWithMockMarker(row)
        ? `visibleNumber starts with AUT- and source/id already has mock markers (${row.visibleNumber})`
        : null
  }
}

function toInventoryItem(
  row: SurgeryInventoryRow,
  criteria: readonly DevSurgeryCleanupCriterion[]
): DevSurgeryInventoryItem {
  const candidateCleanupReasons = criteria
    .map((criterion) => {
      const reason = getCriterionReason(row, criterion)
      return reason ? { criterion, reason } : null
    })
    .filter((value): value is DevSurgeryCleanupReason => value !== null)

  return {
    id: row.id,
    visibleNumber: row.visibleNumber,
    source: row.source,
    classification: row.classification,
    priority: row.priority,
    cxStatus: row.cxStatus,
    prepStatus: row.prepStatus,
    probableDate: formatDate(row.probableDate),
    scheduledDate: formatDate(row.scheduledDate),
    surgeryDate: formatDate(row.surgeryDate),
    performedDate: formatDate(row.performedDate),
    cancelledDate: formatDate(row.cancelledDate),
    createdAt: row.createdAt.toISOString(),
    patientLabel: formatContactLabel(row.patient),
    doctorLabel: formatContactLabel(row.doctor),
    institutionLabel: formatContactLabel(row.institution),
    payerLabel: formatContactLabel(row.payer),
    candidateCleanupReasons,
  }
}

async function countDependencies(
  prisma: PrismaClient,
  companyId: string,
  surgeryIds: string[]
): Promise<DevSurgeryDependencyCounts> {
  if (surgeryIds.length === 0) {
    return {
      surgeries: 0,
      auditEvents: 0,
      seguimientoEntries: 0,
      internalNotifications: 0,
      digitalReceipts: 0,
      contactAssignments: 0,
    }
  }

  const [auditEvents, seguimientoEntries, internalNotifications, digitalReceipts, contactAssignments] = await Promise.all([
    prisma.auditEvent.count({
      where: {
        companyId,
        entityType: { in: ["surgery", "Surgery"] },
        entityId: { in: surgeryIds },
      },
    }),
    prisma.seguimientoEntry.count({
      where: {
        companyId,
        surgeryId: { in: surgeryIds },
      },
    }),
    prisma.internalNotification.count({
      where: {
        companyId,
        surgeryId: { in: surgeryIds },
      },
    }),
    prisma.digitalReceipt.count({
      where: {
        companyId,
        surgeryId: { in: surgeryIds },
      },
    }),
    prisma.surgeryContactAssignment.count({
      where: {
        surgeryId: { in: surgeryIds },
      },
    }),
  ])

  return {
    surgeries: surgeryIds.length,
    auditEvents,
    seguimientoEntries,
    internalNotifications,
    digitalReceipts,
    contactAssignments,
  }
}

export async function reportBackendSurgeriesForCompany(
  prisma: PrismaClient,
  companyIdInput: string,
  options?: { criteria?: readonly DevSurgeryCleanupCriterion[] }
): Promise<DevSurgeryInventorySummary> {
  const companyId = ensureCompanyId(companyIdInput)
  const criteria = normalizeCriteria(options?.criteria)

  const rows = await prisma.surgery.findMany({
    where: { companyId },
    orderBy: [{ createdAt: "desc" }, { visibleNumber: "asc" }, { id: "asc" }],
    select: {
      id: true,
      visibleNumber: true,
      source: true,
      classification: true,
      priority: true,
      cxStatus: true,
      prepStatus: true,
      probableDate: true,
      scheduledDate: true,
      surgeryDate: true,
      performedDate: true,
      cancelledDate: true,
      createdAt: true,
      patient: {
        select: {
          firstName: true,
          lastName: true,
          legalName: true,
        },
      },
      doctor: {
        select: {
          firstName: true,
          lastName: true,
          legalName: true,
        },
      },
      institution: {
        select: {
          firstName: true,
          lastName: true,
          legalName: true,
        },
      },
      payer: {
        select: {
          firstName: true,
          lastName: true,
          legalName: true,
        },
      },
    },
  })

  const surgeries = rows.map((row) => toInventoryItem(row, criteria))
  const candidateSurgeries = surgeries.filter((surgery) => surgery.candidateCleanupReasons.length > 0)
  const counts = await countDependencies(
    prisma,
    companyId,
    candidateSurgeries.map((surgery) => surgery.id)
  )

  const candidateCountsByCriterion = DEV_SURGERY_CLEANUP_CRITERIA.reduce<Record<DevSurgeryCleanupCriterion, number>>(
    (acc, criterion) => {
      acc[criterion] = candidateSurgeries.filter((surgery) =>
        surgery.candidateCleanupReasons.some((reason) => reason.criterion === criterion)
      ).length
      return acc
    },
    {
      "legacy-mock-sync-source": 0,
      "cx-dev-visible-number": 0,
      "sgdevmock-id": 0,
      "mock-source": 0,
      "aut-visible-number-with-mock-marker": 0,
    }
  )

  return {
    companyId,
    criteria,
    surgeries,
    candidateSurgeries,
    counts,
    candidateCountsByCriterion,
  }
}

export async function cleanupBackendDevSurgeries(
  prisma: PrismaClient,
  companyIdInput: string,
  options?: {
    apply?: boolean
    criteria?: readonly DevSurgeryCleanupCriterion[]
  }
): Promise<DevSurgeryCleanupResult> {
  const companyId = ensureCompanyId(companyIdInput)
  const summary = await reportBackendSurgeriesForCompany(prisma, companyId, {
    criteria: options?.criteria,
  })
  const requestedMode: DevSurgeryCleanupResult["mode"] = options?.apply ? "apply" : "dry-run"

  if (!options?.apply || summary.candidateSurgeries.length === 0) {
    return {
      mode: requestedMode,
      summary,
      deleted: {
        auditEvents: 0,
        surgeries: 0,
      },
    }
  }

  ensureDevSurgeryHardDeleteAllowed()

  const surgeryIds = summary.candidateSurgeries.map((surgery) => surgery.id)
  const deleted = await prisma.$transaction(async (tx) => {
    const deletedAuditEvents = await tx.auditEvent.deleteMany({
      where: {
        companyId,
        entityType: { in: ["surgery", "Surgery"] },
        entityId: { in: surgeryIds },
      },
    })

    const deletedSurgeries = await tx.surgery.deleteMany({
      where: {
        companyId,
        id: { in: surgeryIds },
      },
    })

    return {
      auditEvents: deletedAuditEvents.count,
      surgeries: deletedSurgeries.count,
    }
  })

  return {
    mode: "apply",
    summary,
    deleted,
  }
}
