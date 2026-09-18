import prisma from "@/lib/prisma"
import {
  DEV_SURGERY_CLEANUP_CRITERIA,
  reportBackendSurgeriesForCompany,
  type DevSurgeryCleanupCriterion,
} from "@/lib/services/dev-surgery-cleanup.service"

type ParsedArgs = {
  companyId: string
  criteria?: DevSurgeryCleanupCriterion[]
}

function parseCriteria(value: string): DevSurgeryCleanupCriterion[] {
  if (value === "all") {
    return [...DEV_SURGERY_CLEANUP_CRITERIA]
  }

  return value
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
}

function parseArgs(argv: string[]): ParsedArgs {
  let companyId = ""
  let criteria: DevSurgeryCleanupCriterion[] | undefined

  for (const arg of argv) {
    if (arg.startsWith("--companyId=")) {
      companyId = arg.slice("--companyId=".length).trim()
      continue
    }

    if (arg.startsWith("--criteria=")) {
      criteria = parseCriteria(arg.slice("--criteria=".length).trim())
    }
  }

  if (!companyId) {
    throw new Error(
      "Usage: tsx scripts/dev/report-backend-surgeries.ts --companyId=<company-id> [--criteria=all|legacy-mock-sync-source,cx-dev-visible-number,...]"
    )
  }

  return { companyId, criteria }
}

async function main() {
  const { companyId, criteria } = parseArgs(process.argv.slice(2))
  const summary = await reportBackendSurgeriesForCompany(prisma, companyId, { criteria })

  console.log(
    JSON.stringify(
      {
        companyId: summary.companyId,
        criteria: summary.criteria,
        totalSurgeries: summary.surgeries.length,
        candidateSurgeries: summary.candidateSurgeries.length,
        counts: summary.counts,
        candidateCountsByCriterion: summary.candidateCountsByCriterion,
        surgeries: summary.surgeries,
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
