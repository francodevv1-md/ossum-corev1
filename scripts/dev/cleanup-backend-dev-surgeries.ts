import prisma from "@/lib/prisma"
import {
  DEV_SURGERY_CLEANUP_CRITERIA,
  cleanupBackendDevSurgeries,
  type DevSurgeryCleanupCriterion,
} from "@/lib/services/dev-surgery-cleanup.service"

type ParsedArgs = {
  companyId: string
  criteria: DevSurgeryCleanupCriterion[]
  apply: boolean
}

function parseCriteria(value: string): DevSurgeryCleanupCriterion[] {
  if (value === "all") {
    return [...DEV_SURGERY_CLEANUP_CRITERIA]
  }

  const criteria = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (!DEV_SURGERY_CLEANUP_CRITERIA.includes(item as DevSurgeryCleanupCriterion)) {
        throw new Error(
          `Unsupported criterion: ${item}. Allowed: ${DEV_SURGERY_CLEANUP_CRITERIA.join(", ")}, all`
        )
      }

      return item as DevSurgeryCleanupCriterion
    })

  if (criteria.length === 0) {
    throw new Error("At least one cleanup criterion is required")
  }

  return criteria
}

function parseArgs(argv: string[]): ParsedArgs {
  let companyId = ""
  let criteria: DevSurgeryCleanupCriterion[] | null = null
  let apply = false

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true
      continue
    }

    if (arg.startsWith("--companyId=")) {
      companyId = arg.slice("--companyId=".length).trim()
      continue
    }

    if (arg.startsWith("--criteria=")) {
      criteria = parseCriteria(arg.slice("--criteria=".length).trim())
    }
  }

  if (!companyId || !criteria) {
    throw new Error(
      "Usage: tsx scripts/dev/cleanup-backend-dev-surgeries.ts --companyId=<company-id> --criteria=all|legacy-mock-sync-source,cx-dev-visible-number,... [--apply]"
    )
  }

  return { companyId, criteria, apply }
}

async function main() {
  const { companyId, criteria, apply } = parseArgs(process.argv.slice(2))
  const result = await cleanupBackendDevSurgeries(prisma, companyId, { apply, criteria })

  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        companyId: result.summary.companyId,
        criteria: result.summary.criteria,
        counts: result.summary.counts,
        candidateCountsByCriterion: result.summary.candidateCountsByCriterion,
        deleted: result.deleted,
        surgeries: result.summary.candidateSurgeries,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
