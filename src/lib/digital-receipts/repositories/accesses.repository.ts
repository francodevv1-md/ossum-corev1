import type { DigitalReceiptAccessStatus, DigitalReceiptActorRef, DigitalReceiptDeliveryChannel, DigitalReceiptSignerRole } from "../types"
import type { DateInput, DigitalReceiptPrismaClient, DigitalReceiptPrismaSource } from "./shared"
import { mapDigitalReceiptAccess, type PrismaDigitalReceiptAccessRow } from "./mappers"
import { getDigitalReceiptDb, toDate, toInputJsonValue, toNullableDate } from "./shared"

import type { DigitalReceiptAccess } from "../types"

export type CreateDigitalReceiptAccessRecordInput = {
  accessId?: string
  receiptId: string
  version: number
  status: DigitalReceiptAccessStatus
  tokenHash: string
  tokenLastFour?: string
  channel?: DigitalReceiptDeliveryChannel
  recipientEmail?: string
  recipientPhone?: string
  signerRole: DigitalReceiptSignerRole
  signerId?: string
  issuedAt: DateInput
  activatedAt?: DateInput
  firstOpenedAt?: DateInput
  lastOpenedAt?: DateInput
  consumedAt?: DateInput
  expiredAt?: DateInput
  revokedAt?: DateInput
  supersededByAccessId?: string
  metadata?: Record<string, unknown>
}

export type UpdateDigitalReceiptAccessRecordInput = {
  version?: number
  status?: DigitalReceiptAccessStatus
  tokenHash?: string
  tokenLastFour?: string | null
  channel?: DigitalReceiptDeliveryChannel | null
  recipientEmail?: string | null
  recipientPhone?: string | null
  signerRole?: DigitalReceiptSignerRole
  signerId?: string | null
  issuedAt?: DateInput
  activatedAt?: DateInput | null
  firstOpenedAt?: DateInput | null
  lastOpenedAt?: DateInput | null
  consumedAt?: DateInput | null
  expiredAt?: DateInput | null
  revokedAt?: DateInput | null
  supersededByAccessId?: string | null
  metadata?: Record<string, unknown> | null
}

export class PrismaDigitalReceiptAccessRepository {
  private readonly prisma: DigitalReceiptPrismaClient

  constructor(prisma: DigitalReceiptPrismaSource) {
    this.prisma = getDigitalReceiptDb(prisma)
  }

  async create(input: CreateDigitalReceiptAccessRecordInput): Promise<DigitalReceiptAccess> {
    const record = await this.prisma.digitalReceiptAccess.create({
      data: {
        ...(input.accessId ? { id: input.accessId } : {}),
        receiptId: input.receiptId,
        version: input.version,
        status: input.status,
        tokenHash: input.tokenHash,
        tokenLastFour: input.tokenLastFour,
        channel: input.channel,
        recipientEmail: input.recipientEmail,
        recipientPhone: input.recipientPhone,
        signerRole: input.signerRole,
        signerId: input.signerId,
        issuedAt: toDate(input.issuedAt),
        activatedAt: toNullableDate(input.activatedAt),
        firstOpenedAt: toNullableDate(input.firstOpenedAt),
        lastOpenedAt: toNullableDate(input.lastOpenedAt),
        consumedAt: toNullableDate(input.consumedAt),
        expiredAt: toNullableDate(input.expiredAt),
        revokedAt: toNullableDate(input.revokedAt),
        supersededByAccessId: input.supersededByAccessId,
        metadata: toInputJsonValue(input.metadata),
      },
    })

    return mapDigitalReceiptAccess(record as PrismaDigitalReceiptAccessRow)
  }

  async update(accessId: string, input: UpdateDigitalReceiptAccessRecordInput): Promise<DigitalReceiptAccess> {
    const record = await this.prisma.digitalReceiptAccess.update({
      where: { id: accessId },
      data: {
        version: input.version,
        status: input.status,
        tokenHash: input.tokenHash,
        tokenLastFour: input.tokenLastFour,
        channel: input.channel,
        recipientEmail: input.recipientEmail,
        recipientPhone: input.recipientPhone,
        signerRole: input.signerRole,
        signerId: input.signerId,
        issuedAt: input.issuedAt ? toDate(input.issuedAt) : undefined,
        activatedAt: toNullableDate(input.activatedAt),
        firstOpenedAt: toNullableDate(input.firstOpenedAt),
        lastOpenedAt: toNullableDate(input.lastOpenedAt),
        consumedAt: toNullableDate(input.consumedAt),
        expiredAt: toNullableDate(input.expiredAt),
        revokedAt: toNullableDate(input.revokedAt),
        supersededByAccessId: input.supersededByAccessId,
        metadata: toInputJsonValue(input.metadata),
      },
    })

    return mapDigitalReceiptAccess(record as PrismaDigitalReceiptAccessRow)
  }

  async findById(companyId: string, accessId: string): Promise<DigitalReceiptAccess | null> {
    const record = await this.prisma.digitalReceiptAccess.findFirst({
      where: {
        id: accessId,
        receipt: {
          companyId,
        },
      },
    })

    return record ? mapDigitalReceiptAccess(record as PrismaDigitalReceiptAccessRow) : null
  }

  async findByTokenHash(tokenHash: string): Promise<DigitalReceiptAccess | null> {
    const record = await this.prisma.digitalReceiptAccess.findUnique({
      where: { tokenHash },
    })

    return record ? mapDigitalReceiptAccess(record as PrismaDigitalReceiptAccessRow) : null
  }

  async listByReceiptId(receiptId: string): Promise<DigitalReceiptAccess[]> {
    const records = await this.prisma.digitalReceiptAccess.findMany({
      where: { receiptId },
      orderBy: [{ version: "asc" }, { issuedAt: "asc" }],
    })

    return (records as PrismaDigitalReceiptAccessRow[]).map(mapDigitalReceiptAccess)
  }

  async findActiveByReceiptId(receiptId: string): Promise<DigitalReceiptAccess | null> {
    const record = await this.prisma.digitalReceiptAccess.findFirst({
      where: {
        receiptId,
        status: "active",
      },
      orderBy: [{ version: "desc" }, { issuedAt: "desc" }],
    })

    return record ? mapDigitalReceiptAccess(record as PrismaDigitalReceiptAccessRow) : null
  }
}
