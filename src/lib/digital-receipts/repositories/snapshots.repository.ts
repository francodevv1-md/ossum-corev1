import type { DigitalReceiptActorRef, DigitalReceiptSnapshot } from "../types"
import type { DateInput, DigitalReceiptPrismaClient, DigitalReceiptPrismaSource } from "./shared"
import { mapDigitalReceiptSnapshot, type PrismaDigitalReceiptSnapshotRow } from "./mappers"
import { getDigitalReceiptDb, toDate, toInputJsonValue } from "./shared"

export type CreateDigitalReceiptSnapshotRecordInput = {
  snapshotId?: string
  receiptId: string
  version: number
  capturedAt: DateInput
  capturedBy?: DigitalReceiptActorRef
  checksum?: string
  payload: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export class PrismaDigitalReceiptSnapshotRepository {
  private readonly prisma: DigitalReceiptPrismaClient

  constructor(prisma: DigitalReceiptPrismaSource) {
    this.prisma = getDigitalReceiptDb(prisma)
  }

  async create(input: CreateDigitalReceiptSnapshotRecordInput): Promise<DigitalReceiptSnapshot> {
    const record = await this.prisma.digitalReceiptSnapshot.create({
      data: {
        ...(input.snapshotId ? { id: input.snapshotId } : {}),
        receiptId: input.receiptId,
        version: input.version,
        capturedAt: toDate(input.capturedAt),
        capturedBy: toInputJsonValue(input.capturedBy),
        checksum: input.checksum,
        payload: input.payload as Record<string, unknown>,
        metadata: toInputJsonValue(input.metadata),
      },
    })

    return mapDigitalReceiptSnapshot(record as PrismaDigitalReceiptSnapshotRow)
  }

  async findById(snapshotId: string): Promise<DigitalReceiptSnapshot | null> {
    const record = await this.prisma.digitalReceiptSnapshot.findUnique({
      where: { id: snapshotId },
    })

    return record ? mapDigitalReceiptSnapshot(record as PrismaDigitalReceiptSnapshotRow) : null
  }

  async listByReceiptId(receiptId: string): Promise<DigitalReceiptSnapshot[]> {
    const records = await this.prisma.digitalReceiptSnapshot.findMany({
      where: { receiptId },
      orderBy: [{ version: "asc" }, { capturedAt: "asc" }],
    })

    return (records as PrismaDigitalReceiptSnapshotRow[]).map(mapDigitalReceiptSnapshot)
  }

  async findLatestByReceiptId(receiptId: string): Promise<DigitalReceiptSnapshot | null> {
    const record = await this.prisma.digitalReceiptSnapshot.findFirst({
      where: { receiptId },
      orderBy: [{ version: "desc" }, { capturedAt: "desc" }],
    })

    return record ? mapDigitalReceiptSnapshot(record as PrismaDigitalReceiptSnapshotRow) : null
  }
}
