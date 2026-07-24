import prisma from "@/lib/prisma"
import { deleteBackendSurgeriesById } from "@/lib/services/dev-surgery-delete-by-id.service"

type ParsedArgs = {
  companyId: string
  surgeryIds: string[]
  apply: boolean
  force: boolean
}

function parseSurgeryIds(value: string) {
  const surgeryIds = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  if (surgeryIds.length === 0) {
    throw new Error("At least one surgeryId is required")
  }

  return surgeryIds
}

function parseArgs(argv: string[]): ParsedArgs {
  let companyId = ""
  let surgeryIds: string[] | null = null
  let apply = false
  let force = false

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true
      continue
    }

    if (arg === "--force") {
      force = true
      continue
    }

    if (arg.startsWith("--companyId=")) {
      companyId = arg.slice("--companyId=".length).trim()
      continue
    }

    if (arg.startsWith("--surgeryIds=")) {
      surgeryIds = parseSurgeryIds(arg.slice("--surgeryIds=".length).trim())
    }
  }

  if (!companyId || !surgeryIds) {
    throw new Error(
      "Usage: tsx scripts/dev/delete-backend-surgeries-by-id.ts --companyId=<company-id> --surgeryIds=<id-1,id-2,...> [--apply] [--force]"
    )
  }

  return { companyId, surgeryIds, apply, force }
}

async function main() {
  const { companyId, surgeryIds, apply, force } = parseArgs(process.argv.slice(2))
  const result = await deleteBackendSurgeriesById(prisma, companyId, surgeryIds, { apply, force })

  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        force: result.force,
        companyId: result.summary.companyId,
        requestedSurgeryIds: result.summary.requestedSurgeryIds,
        selectedSurgeryIds: result.summary.selectedSurgeryIds,
        missingSurgeryIds: result.summary.missingSurgeryIds,
        counts: result.summary.counts,
        canApplySafely: result.summary.canApplySafely,
        forceDeleteRequired: result.summary.forceDeleteRequired,
        forceDeletesDependents: result.force
          ? {
              auditEvents: result.summary.counts.auditEvents,
              seguimientoEntries: result.summary.counts.seguimientoEntries,
              internalNotifications: result.summary.counts.internalNotifications,
              digitalReceiptsViaCascade: result.summary.counts.digitalReceipts,
              contactAssignmentsViaCascade: result.summary.counts.contactAssignments,
            }
          : null,
        deleted: result.deleted,
        surgeries: result.summary.selectedSurgeries,
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
