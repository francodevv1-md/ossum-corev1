import { prisma as defaultPrisma } from "@/lib/prisma"

import { PrismaDigitalReceiptAccessRepository } from "./repositories/accesses.repository"
import { PrismaDigitalReceiptArtifactRepository } from "./repositories/artifacts.repository"
import { PrismaDigitalReceiptEventRepository } from "./repositories/events.repository"
import { PrismaDigitalReceiptRepository } from "./repositories/receipts.repository"
import { PrismaDigitalReceiptSnapshotRepository } from "./repositories/snapshots.repository"
import type { DigitalReceiptPrismaSource } from "./repositories/shared"

export type DigitalReceiptRepositories = ReturnType<typeof createDigitalReceiptRepositories>

export function createDigitalReceiptRepositories(prismaClient: DigitalReceiptPrismaSource = defaultPrisma) {
  return {
    receipts: new PrismaDigitalReceiptRepository(prismaClient),
    accesses: new PrismaDigitalReceiptAccessRepository(prismaClient),
    events: new PrismaDigitalReceiptEventRepository(prismaClient),
    snapshots: new PrismaDigitalReceiptSnapshotRepository(prismaClient),
    artifacts: new PrismaDigitalReceiptArtifactRepository(prismaClient),
  }
}

export const digitalReceiptRepositories = createDigitalReceiptRepositories()

export {
  PrismaDigitalReceiptRepository,
  PrismaDigitalReceiptAccessRepository,
  PrismaDigitalReceiptEventRepository,
  PrismaDigitalReceiptSnapshotRepository,
  PrismaDigitalReceiptArtifactRepository,
}
