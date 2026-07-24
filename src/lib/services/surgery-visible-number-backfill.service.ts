import type { Prisma, PrismaClient } from "@prisma/client"

const SURGERY_VISIBLE_NUMBER_PREFIX = "CX-"
const SURGERY_VISIBLE_NUMBER_PADDING = 4
const CANONICAL_SURGERY_VISIBLE_NUMBER_REGEX = /^CX-[0-9]+$/

type SurgeryVisibleNumberBackfillRow = {
  id: string
  companyId: string
  visibleNumber: string | null
  createdAt: Date
}

type SurgeryVisibleNumberBackfillClient = Pick<PrismaClient, "$transaction"> & {
  surgery: {
    findMany(args: {
      where: { companyId: string }
      select: {
        id: true
        companyId: true
        visibleNumber: true
        createdAt: true
      }
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    }): Promise<SurgeryVisibleNumberBackfillRow[]>
    updateMany(args: {
      where: { id: string; companyId: string; visibleNumber: string | null }
      data: { visibleNumber: string }
    }): Promise<{ count: number }>
  }
}

export type SurgeryVisibleNumberBackfillOptions = {
  apply?: boolean
}

export type SurgeryVisibleNumberBackfillPlannedChange = {
  id: string
  oldVisibleNumber: string | null
  newVisibleNumber: string
  createdAt: Date
}

export type SurgeryVisibleNumberBackfillConflict = {
  visibleNumber: string
  surgeryIds: string[]
}

export type SurgeryVisibleNumberBackfillResult = {
  mode: "dry-run" | "apply"
  companyId: string
  maxExistingSequence: number
  plannedChanges: SurgeryVisibleNumberBackfillPlannedChange[]
  conflicts: SurgeryVisibleNumberBackfillConflict[]
  updated: SurgeryVisibleNumberBackfillPlannedChange[]
}

function requireBackfillCompanyId(companyId: string): string {
  const scopedCompanyId = companyId.trim()

  if (!scopedCompanyId) {
    throw new Error("companyId is required for surgery visible number backfill")
  }

  return scopedCompanyId
}

export function isCanonicalSurgeryVisibleNumber(value: string | null): boolean {
  return typeof value === "string" && CANONICAL_SURGERY_VISIBLE_NUMBER_REGEX.test(value)
}

function parseCanonicalSurgeryVisibleNumber(value: string): number {
  return Number(value.slice(SURGERY_VISIBLE_NUMBER_PREFIX.length))
}

function formatSurgeryVisibleNumber(sequence: number): string {
  return `${SURGERY_VISIBLE_NUMBER_PREFIX}${String(sequence).padStart(
    SURGERY_VISIBLE_NUMBER_PADDING,
    "0"
  )}`
}

function isBackfillCandidate(value: string | null): boolean {
  if (value == null) {
    return true
  }

  return !isCanonicalSurgeryVisibleNumber(value)
}

function buildSurgeryVisibleNumberBackfillPlan(
  companyId: string,
  rows: SurgeryVisibleNumberBackfillRow[],
  mode: SurgeryVisibleNumberBackfillResult["mode"]
): SurgeryVisibleNumberBackfillResult {
  const validVisibleNumbers = new Map<string, string[]>()
  let maxExistingSequence = 0

  for (const row of rows) {
    const visibleNumber = row.visibleNumber

    if (!visibleNumber || !isCanonicalSurgeryVisibleNumber(visibleNumber)) {
      continue
    }

    validVisibleNumbers.set(visibleNumber, [
      ...(validVisibleNumbers.get(visibleNumber) ?? []),
      row.id,
    ])
    maxExistingSequence = Math.max(
      maxExistingSequence,
      parseCanonicalSurgeryVisibleNumber(visibleNumber)
    )
  }

  const conflicts = [...validVisibleNumbers.entries()]
    .filter(([, surgeryIds]) => surgeryIds.length > 1)
    .map(([visibleNumber, surgeryIds]) => ({ visibleNumber, surgeryIds }))

  const duplicateCanonicalReassignmentIds = new Set(
    conflicts.flatMap((conflict) => conflict.surgeryIds.slice(1))
  )

  let nextSequence = maxExistingSequence + 1
  const plannedChanges = rows
    .filter(
      (row) =>
        isBackfillCandidate(row.visibleNumber) ||
        duplicateCanonicalReassignmentIds.has(row.id)
    )
    .map((row) => ({
      id: row.id,
      oldVisibleNumber: row.visibleNumber,
      newVisibleNumber: formatSurgeryVisibleNumber(nextSequence++),
      createdAt: row.createdAt,
    }))

  return {
    mode,
    companyId,
    maxExistingSequence,
    plannedChanges,
    conflicts,
    updated: [],
  }
}

async function readSurgeryVisibleNumberRows(
  prisma: SurgeryVisibleNumberBackfillClient,
  companyId: string
): Promise<SurgeryVisibleNumberBackfillRow[]> {
  return prisma.surgery.findMany({
    where: { companyId },
    select: {
      id: true,
      companyId: true,
      visibleNumber: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
}

export async function backfillSurgeryVisibleNumbers(
  prisma: SurgeryVisibleNumberBackfillClient,
  companyId: string,
  options: SurgeryVisibleNumberBackfillOptions = {}
): Promise<SurgeryVisibleNumberBackfillResult> {
  const scopedCompanyId = requireBackfillCompanyId(companyId)
  const mode = options.apply ? "apply" : "dry-run"
  const rows = await readSurgeryVisibleNumberRows(prisma, scopedCompanyId)
  const plan = buildSurgeryVisibleNumberBackfillPlan(scopedCompanyId, rows, mode)

  if (!options.apply || plan.plannedChanges.length === 0) {
    return plan
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const appliedChanges: SurgeryVisibleNumberBackfillPlannedChange[] = []

    for (const change of plan.plannedChanges) {
      const result = await tx.surgery.updateMany({
        where: {
          id: change.id,
          companyId: scopedCompanyId,
          visibleNumber: change.oldVisibleNumber,
        },
        data: { visibleNumber: change.newVisibleNumber },
      })

      if (result.count !== 1) {
        throw new Error(
          `Surgery ${change.id} was not updated; visibleNumber may have changed concurrently`
        )
      }

      appliedChanges.push(change)
    }

    return appliedChanges
  })

  return {
    ...plan,
    updated,
  }
}
