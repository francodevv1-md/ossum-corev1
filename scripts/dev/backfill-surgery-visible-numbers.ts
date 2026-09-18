import { config as loadEnv } from "dotenv"

import { backfillSurgeryVisibleNumbers } from "@/lib/services/surgery-visible-number-backfill.service"

loadEnv({ path: ".env.local", override: false })
loadEnv({ path: ".env", override: false })

let disconnectPrisma: (() => Promise<void>) | undefined

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
    }
  }

  if (!companyId) {
    throw new Error(
      "Usage: tsx scripts/dev/backfill-surgery-visible-numbers.ts --companyId=<company-id> [--apply]"
    )
  }

  return { companyId, apply }
}

async function main() {
  const { companyId, apply } = parseArgs(process.argv.slice(2))
  const { default: prisma } = await import("@/lib/prisma")
  disconnectPrisma = () => prisma.$disconnect()
  const result = await backfillSurgeryVisibleNumbers(prisma, companyId, { apply })

  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        companyId: result.companyId,
        maxExistingSequence: result.maxExistingSequence,
        counts: {
          plannedChanges: result.plannedChanges.length,
          conflicts: result.conflicts.length,
          updated: result.updated.length,
        },
        conflicts: result.conflicts,
        plannedChanges: result.plannedChanges,
        updated: result.updated,
      },
      null,
      2
    )
  )

  if (!apply) {
    console.log("DRY-RUN only. Re-run with --apply only after explicit approval; --apply mutates DB.")
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma?.()
  })
