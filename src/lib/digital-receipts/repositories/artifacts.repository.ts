import type { DigitalReceiptActorRef, DigitalReceiptArtifact, DigitalReceiptArtifactType } from "../types"
import type { DigitalReceiptPrismaClient, DigitalReceiptPrismaSource } from "./shared"
import { mapDigitalReceiptArtifact, type PrismaDigitalReceiptArtifactRow } from "./mappers"
import { getDigitalReceiptDb, toInputJsonValue } from "./shared"

export type CreateDigitalReceiptArtifactRecordInput = {
  artifactId?: string
  receiptId: string
  snapshotId?: string
  accessId?: string
  type: DigitalReceiptArtifactType
  createdBy?: DigitalReceiptActorRef
  fileName?: string
  mimeType?: string
  storageKey?: string
  checksum?: string
  metadata?: Record<string, unknown>
}

export class PrismaDigitalReceiptArtifactRepository {
  private readonly prisma: DigitalReceiptPrismaClient

  constructor(prisma: DigitalReceiptPrismaSource) {
    this.prisma = getDigitalReceiptDb(prisma)
  }

  async create(input: CreateDigitalReceiptArtifactRecordInput): Promise<DigitalReceiptArtifact> {
    const record = await this.prisma.digitalReceiptArtifact.create({
      data: {
        ...(input.artifactId ? { id: input.artifactId } : {}),
        receiptId: input.receiptId,
        snapshotId: input.snapshotId,
        accessId: input.accessId,
        type: input.type,
        createdBy: toInputJsonValue(input.createdBy),
        fileName: input.fileName,
        mimeType: input.mimeType,
        storageKey: input.storageKey,
        checksum: input.checksum,
        metadata: toInputJsonValue(input.metadata),
      },
    })

    return mapDigitalReceiptArtifact(record as PrismaDigitalReceiptArtifactRow)
  }

  async findById(artifactId: string): Promise<DigitalReceiptArtifact | null> {
    const record = await this.prisma.digitalReceiptArtifact.findUnique({
      where: { id: artifactId },
    })

    return record ? mapDigitalReceiptArtifact(record as PrismaDigitalReceiptArtifactRow) : null
  }

  async listByReceiptId(receiptId: string): Promise<DigitalReceiptArtifact[]> {
    const records = await this.prisma.digitalReceiptArtifact.findMany({
      where: { receiptId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })

    return (records as PrismaDigitalReceiptArtifactRow[]).map(mapDigitalReceiptArtifact)
  }
}
