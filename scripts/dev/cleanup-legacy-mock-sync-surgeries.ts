import prisma from "@/lib/prisma"
import {
  cleanupLegacyMockSyncSurgeries,
  LEGACY_MOCK_SYNC_SOURCE_PREFIX,
} from "@/lib/services/dev-legacy-mock-surgery-cleanup.service"

type ParsedArgs = {
  companyId: string
  apply: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  let companyId = ""
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
  }

  if (!companyId) {
    throw new Error("Usage: tsx scripts/dev/cleanup-legacy-mock-sync-surgeries.ts --companyId=<company-id> [--apply]")
  }

  return { companyId, apply }
}

async function main() {
  const { companyId, apply } = parseArgs(process.argv.slice(2))
  const result = await cleanupLegacyMockSyncSurgeries(prisma, companyId, { apply })

  const payload = {
    mode: result.mode,
    companyId: result.summary.companyId,
    sourcePrefix: LEGACY_MOCK_SYNC_SOURCE_PREFIX,
    counts: result.summary.counts,
    deleted: result.deleted,
    surgeries: result.summary.surgeries,
  }

  console.log(JSON.stringify(payload, null, 2))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
