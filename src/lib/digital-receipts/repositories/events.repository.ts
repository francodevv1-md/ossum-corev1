import type { DigitalReceiptActorRef, DigitalReceiptEventType } from "../types"
import type { DateInput, DigitalReceiptPrismaClient, DigitalReceiptPrismaSource } from "./shared"
import { mapDigitalReceiptEvent, type PrismaDigitalReceiptEventRow } from "./mappers"
import { getDigitalReceiptDb, toDate, toInputJsonValue } from "./shared"

import type { DigitalReceiptEvent } from "../types"

export type CreateDigitalReceiptEventRecordInput = {
  eventId?: string
  receiptId: string
  accessId?: string
  snapshotId?: string
  artifactId?: string
  type: DigitalReceiptEventType
  happenedAt: DateInput
  actor?: DigitalReceiptActorRef
  detail?: string
  metadata?: Record<string, unknown>
}

export class PrismaDigitalReceiptEventRepository {
  private readonly prisma: DigitalReceiptPrismaClient

  constructor(prisma: DigitalReceiptPrismaSource) {
    this.prisma = getDigitalReceiptDb(prisma)
  }

  async create(input: CreateDigitalReceiptEventRecordInput): Promise<DigitalReceiptEvent> {
    const record = await this.prisma.digitalReceiptEvent.create({
      data: {
        ...(input.eventId ? { id: input.eventId } : {}),
        receiptId: input.receiptId,
        accessId: input.accessId,
        snapshotId: input.snapshotId,
        artifactId: input.artifactId,
        type: input.type,
        happenedAt: toDate(input.happenedAt),
        actor: toInputJsonValue(input.actor),
        detail: input.detail,
        metadata: toInputJsonValue(input.metadata),
      },
    })

    return mapDigitalReceiptEvent(record as PrismaDigitalReceiptEventRow)
  }

  async listByReceiptId(receiptId: string): Promise<DigitalReceiptEvent[]> {
    const records = await this.prisma.digitalReceiptEvent.findMany({
      where: { receiptId },
      orderBy: [{ happenedAt: "asc" }, { createdAt: "asc" }],
    })

    return (records as PrismaDigitalReceiptEventRow[]).map(mapDigitalReceiptEvent)
  }
}
