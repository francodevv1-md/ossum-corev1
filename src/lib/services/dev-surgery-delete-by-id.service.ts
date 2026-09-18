import type { PrismaClient } from "@prisma/client"

const DEV_SURGERY_HARD_DELETE_ENV_VAR = "OSSUM_ALLOW_DEV_SURGERY_HARD_DELETE"
const DEV_SURGERY_HARD_DELETE_ENV_VALUE = "I_UNDERSTAND_SOFT_ARCHIVE_IS_PRODUCTION_POLICY"

type ContactLabelShape = {
  firstName: string | null
  lastName: string | null
  legalName: string | null
}

type SelectedSurgeryRow = {
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

export type DevSurgeryDeleteByIdItem = {
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
}

export type DevSurgeryDeleteByIdDependencyCounts = {
  surgeries: number
  auditEvents: number
  seguimientoEntries: number
  internalNotifications: number
  digitalReceipts: number
  contactAssignments: number
}

export type DevSurgeryDeleteByIdSummary = {
  companyId: string
  requestedSurgeryIds: string[]
  selectedSurgeryIds: string[]
  missingSurgeryIds: string[]
  selectedSurgeries: DevSurgeryDeleteByIdItem[]
  counts: DevSurgeryDeleteByIdDependencyCounts
  canApplySafely: boolean
  forceDeleteRequired: boolean
}

export type DevSurgeryDeleteByIdResult = {
  mode: "dry-run" | "apply"
  force: boolean
  summary: DevSurgeryDeleteByIdSummary
  deleted: {
    auditEvents: number
    seguimientoEntries: number
    internalNotifications: number
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

function ensureSurgeryIds(surgeryIds: readonly string[]) {
  const normalized = surgeryIds.map((id) => id.trim()).filter(Boolean)
  const deduped = [...new Set(normalized)]

  if (deduped.length === 0) {
    throw new Error("At least one surgeryId is required")
  }

  return deduped
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

function toItem(row: SelectedSurgeryRow): DevSurgeryDeleteByIdItem {
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
  }
}

async function countDependencies(
  prisma: PrismaClient,
  companyId: string,
  surgeryIds: string[]
): Promise<DevSurgeryDeleteByIdDependencyCounts> {
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

  const seguimientoEntries = await prisma.seguimientoEntry.findMany({
    where: {
      companyId,
      surgeryId: { in: surgeryIds },
    },
    select: {
      id: true,
    },
  })

  const seguimientoEntryIds = seguimientoEntries.map((entry) => entry.id)

  const [auditEvents, internalNotifications, digitalReceipts, contactAssignments] = await Promise.all([
    prisma.auditEvent.count({
      where: {
        companyId,
        entityType: { in: ["surgery", "Surgery"] },
        entityId: { in: surgeryIds },
      },
    }),
    prisma.internalNotification.count({
      where: {
        companyId,
        OR: [
          { surgeryId: { in: surgeryIds } },
          ...(seguimientoEntryIds.length > 0 ? [{ sourceEntityId: { in: seguimientoEntryIds } }] : []),
        ],
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
    seguimientoEntries: seguimientoEntries.length,
    internalNotifications,
    digitalReceipts,
    contactAssignments,
  }
}

function hasBlockingDependencies(counts: DevSurgeryDeleteByIdDependencyCounts) {
  return (
    counts.seguimientoEntries > 0 ||
    counts.internalNotifications > 0 ||
    counts.digitalReceipts > 0 ||
    counts.contactAssignments > 0
  )
}

export async function reportBackendSurgeriesByIdForCompany(
  prisma: PrismaClient,
  companyIdInput: string,
  surgeryIdsInput: readonly string[]
): Promise<DevSurgeryDeleteByIdSummary> {
  const companyId = ensureCompanyId(companyIdInput)
  const requestedSurgeryIds = ensureSurgeryIds(surgeryIdsInput)

  const rows = await prisma.surgery.findMany({
    where: {
      companyId,
      id: { in: requestedSurgeryIds },
    },
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

  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const selectedSurgeries = requestedSurgeryIds
    .map((id) => rowsById.get(id))
    .filter((row): row is SelectedSurgeryRow => Boolean(row))
    .map((row) => toItem(row))

  const selectedSurgeryIds = selectedSurgeries.map((surgery) => surgery.id)
  const missingSurgeryIds = requestedSurgeryIds.filter((id) => !rowsById.has(id))
  const counts = await countDependencies(prisma, companyId, selectedSurgeryIds)

  return {
    companyId,
    requestedSurgeryIds,
    selectedSurgeryIds,
    missingSurgeryIds,
    selectedSurgeries,
    counts,
    canApplySafely: !hasBlockingDependencies(counts),
    forceDeleteRequired: hasBlockingDependencies(counts),
  }
}

export async function deleteBackendSurgeriesById(
  prisma: PrismaClient,
  companyIdInput: string,
  surgeryIdsInput: readonly string[],
  options?: { apply?: boolean; force?: boolean }
): Promise<DevSurgeryDeleteByIdResult> {
  const summary = await reportBackendSurgeriesByIdForCompany(prisma, companyIdInput, surgeryIdsInput)
  const requestedMode: DevSurgeryDeleteByIdResult["mode"] = options?.apply ? "apply" : "dry-run"
  const force = options?.force === true

  if (!options?.apply || summary.selectedSurgeryIds.length === 0) {
    return {
      mode: requestedMode,
      force,
      summary,
      deleted: {
        auditEvents: 0,
        seguimientoEntries: 0,
        internalNotifications: 0,
        surgeries: 0,
      },
    }
  }

  if (!summary.canApplySafely && !force) {
    throw new Error(
      `Cannot delete surgeries with blocking dependencies unless --force is used. seguimiento=${summary.counts.seguimientoEntries}, internalNotifications=${summary.counts.internalNotifications}, digitalReceipts=${summary.counts.digitalReceipts}, contactAssignments=${summary.counts.contactAssignments}`
    )
  }

  ensureDevSurgeryHardDeleteAllowed()

  const deleted = await prisma.$transaction(async (tx) => {
    const seguimientoEntries = await tx.seguimientoEntry.findMany({
      where: {
        companyId: summary.companyId,
        surgeryId: { in: summary.selectedSurgeryIds },
      },
      select: {
        id: true,
      },
    })

    const seguimientoEntryIds = seguimientoEntries.map((entry) => entry.id)

    const deletedInternalNotifications = force
      ? await tx.internalNotification.deleteMany({
          where: {
            companyId: summary.companyId,
            OR: [
              { surgeryId: { in: summary.selectedSurgeryIds } },
              ...(seguimientoEntryIds.length > 0 ? [{ sourceEntityId: { in: seguimientoEntryIds } }] : []),
            ],
          },
        })
      : { count: 0 }

    const deletedSeguimientoEntries = force
      ? await tx.seguimientoEntry.deleteMany({
          where: {
            companyId: summary.companyId,
            surgeryId: { in: summary.selectedSurgeryIds },
          },
        })
      : { count: 0 }

    const deletedAuditEvents = await tx.auditEvent.deleteMany({
      where: {
        companyId: summary.companyId,
        entityType: { in: ["surgery", "Surgery"] },
        entityId: { in: summary.selectedSurgeryIds },
      },
    })

    const deletedSurgeries = await tx.surgery.deleteMany({
      where: {
        companyId: summary.companyId,
        id: { in: summary.selectedSurgeryIds },
      },
    })

    return {
      auditEvents: deletedAuditEvents.count,
      seguimientoEntries: deletedSeguimientoEntries.count,
      internalNotifications: deletedInternalNotifications.count,
      surgeries: deletedSurgeries.count,
    }
  })

  return {
    mode: "apply",
    force,
    summary,
    deleted,
  }
}
