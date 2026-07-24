import type { PrismaClient } from "@prisma/client"

import { bootstrapCoordinationDevPreview } from "../../src/lib/services/coordination-dev-bootstrap.service"

export async function runCoordinationDevBootstrap(
  prisma: PrismaClient,
  baselineSurgeryIds: readonly string[]
) {
  const companyId = process.env.OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID
  if (!companyId) throw new Error("COORDINATION_BOOTSTRAP_REDACTED_FAILURE")
  return bootstrapCoordinationDevPreview(prisma, { companyId, baselineSurgeryIds })
}
