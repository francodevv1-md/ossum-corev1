import type { Prisma } from "@prisma/client"

import type { ListDigitalReceiptsFilters } from "../contracts"
import type { DigitalReceipt, DigitalReceiptAggregate, DigitalReceiptActorRef, DigitalReceiptSignerRole, DigitalReceiptStatus } from "../types"
import {
  digitalReceiptAggregateInclude,
  mapDigitalReceipt,
  mapDigitalReceiptAggregate,
  type PrismaDigitalReceiptAggregateRow,
} from "./mappers"
import type { DateInput, DigitalReceiptPrismaClient, DigitalReceiptPrismaSource } from "./shared"
import { getDigitalReceiptDb, toDate, toInputJsonValue, toNullableDate } from "./shared"

export type CreateDigitalReceiptRecordInput = {
  receiptId?: string
  companyId: string
  surgeryId: string
  receiptNumber: string
  status: DigitalReceiptStatus
  issuedAt: DateInput
  issuedBy?: DigitalReceiptActorRef
  signedAt?: DateInput
  expiredAt?: DateInput
  revokedAt?: DateInput
  latestAccessVersion?: number
  activeAccessId?: string
  currentSignerRole: DigitalReceiptSignerRole
  signers: Array<Record<string, unknown>>
  latestSnapshotId?: string
  metadata?: Record<string, unknown>
}

export type UpdateDigitalReceiptRecordInput = {
  receiptNumber?: string
  status?: DigitalReceiptStatus
  issuedAt?: DateInput
  issuedBy?: DigitalReceiptActorRef | null
  signedAt?: DateInput | null
  expiredAt?: DateInput | null
  revokedAt?: DateInput | null
  latestAccessVersion?: number | null
  activeAccessId?: string | null
  currentSignerRole?: DigitalReceiptSignerRole
  signers?: Array<Record<string, unknown>>
  latestSnapshotId?: string | null
  metadata?: Record<string, unknown> | null
}

type ListReceiptRecordsOptions = ListDigitalReceiptsFilters & {
  take?: number
  skip?: number
}

export class PrismaDigitalReceiptRepository {
  private readonly prisma: DigitalReceiptPrismaClient

  constructor(prisma: DigitalReceiptPrismaSource) {
    this.prisma = getDigitalReceiptDb(prisma)
  }

  async create(input: CreateDigitalReceiptRecordInput): Promise<DigitalReceipt> {
    const record = await this.prisma.digitalReceipt.create({
      data: {
        ...(input.receiptId ? { id: input.receiptId } : {}),
        companyId: input.companyId,
        surgeryId: input.surgeryId,
        receiptNumber: input.receiptNumber,
        status: input.status,
        issuedAt: toDate(input.issuedAt),
        issuedBy: toInputJsonValue(input.issuedBy),
        signedAt: toNullableDate(input.signedAt),
        expiredAt: toNullableDate(input.expiredAt),
        revokedAt: toNullableDate(input.revokedAt),
        latestAccessVersion: input.latestAccessVersion,
        activeAccessId: input.activeAccessId,
        currentSignerRole: input.currentSignerRole,
        signers: input.signers as Prisma.InputJsonValue,
        latestSnapshotId: input.latestSnapshotId,
        metadata: toInputJsonValue(input.metadata),
      },
      include: digitalReceiptAggregateInclude,
    })

    return mapDigitalReceipt(record as PrismaDigitalReceiptAggregateRow)
  }

  async update(receiptId: string, input: UpdateDigitalReceiptRecordInput): Promise<DigitalReceipt> {
    const record = await this.prisma.digitalReceipt.update({
      where: { id: receiptId },
      data: {
        receiptNumber: input.receiptNumber,
        status: input.status,
        issuedAt: input.issuedAt ? toDate(input.issuedAt) : undefined,
        issuedBy: toInputJsonValue(input.issuedBy),
        signedAt: toNullableDate(input.signedAt),
        expiredAt: toNullableDate(input.expiredAt),
        revokedAt: toNullableDate(input.revokedAt),
        latestAccessVersion: input.latestAccessVersion,
        activeAccessId: input.activeAccessId,
        currentSignerRole: input.currentSignerRole,
        signers: input.signers ? (input.signers as Prisma.InputJsonValue) : undefined,
        latestSnapshotId: input.latestSnapshotId,
        metadata: toInputJsonValue(input.metadata),
      },
      include: digitalReceiptAggregateInclude,
    })

    return mapDigitalReceipt(record as PrismaDigitalReceiptAggregateRow)
  }

  async findById(companyId: string, receiptId: string): Promise<DigitalReceipt | null> {
    const record = await this.prisma.digitalReceipt.findFirst({
      where: {
        id: receiptId,
        companyId,
      },
      include: digitalReceiptAggregateInclude,
    })

    return record ? mapDigitalReceipt(record as PrismaDigitalReceiptAggregateRow) : null
  }

  async findByReceiptNumber(companyId: string, receiptNumber: string): Promise<DigitalReceipt | null> {
    const record = await this.prisma.digitalReceipt.findFirst({
      where: {
        companyId,
        receiptNumber,
      },
      include: digitalReceiptAggregateInclude,
    })

    return record ? mapDigitalReceipt(record as PrismaDigitalReceiptAggregateRow) : null
  }

  async getAggregate(companyId: string, receiptId: string): Promise<DigitalReceiptAggregate | null> {
    const record = await this.prisma.digitalReceipt.findFirst({
      where: {
        id: receiptId,
        companyId,
      },
      include: digitalReceiptAggregateInclude,
    })

    return record ? mapDigitalReceiptAggregate(record as PrismaDigitalReceiptAggregateRow) : null
  }

  async getAggregateById(receiptId: string): Promise<DigitalReceiptAggregate | null> {
    const record = await this.prisma.digitalReceipt.findUnique({
      where: { id: receiptId },
      include: digitalReceiptAggregateInclude,
    })

    return record ? mapDigitalReceiptAggregate(record as PrismaDigitalReceiptAggregateRow) : null
  }

  async list(filters: ListReceiptRecordsOptions): Promise<DigitalReceipt[]> {
    const { companyId, surgeryId, receiptId, status, accessStatus, signerRole, activeOnly, query, issuedFrom, issuedTo, take, skip } = filters

    const records = await this.prisma.digitalReceipt.findMany({
      where: {
        companyId,
        ...(surgeryId ? { surgeryId } : {}),
        ...(receiptId ? { id: receiptId } : {}),
        ...(status ? { status } : {}),
        ...(signerRole ? { currentSignerRole: signerRole } : {}),
        ...(activeOnly ? { revokedAt: null, expiredAt: null } : {}),
        ...(query
          ? {
              OR: [
                { receiptNumber: { contains: query, mode: "insensitive" } },
                { surgeryId: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(issuedFrom || issuedTo
          ? {
              issuedAt: {
                ...(issuedFrom ? { gte: new Date(issuedFrom) } : {}),
                ...(issuedTo ? { lte: new Date(issuedTo) } : {}),
              },
            }
          : {}),
        ...(accessStatus
          ? {
              accesses: {
                some: {
                  status: accessStatus,
                },
              },
            }
          : {}),
      },
      include: digitalReceiptAggregateInclude,
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      take,
      skip,
    })

    return (records as PrismaDigitalReceiptAggregateRow[]).map((record) => {
      const receipt = mapDigitalReceipt(record)
      const activeAccess = record.accesses.find((access) => access.id === record.activeAccessId)

      if (
        receipt.status === "issued" &&
        activeAccess?.status === "active" &&
        activeAccess.expiredAt &&
        activeAccess.expiredAt.getTime() <= Date.now()
      ) {
        return {
          ...receipt,
          status: "expired",
          expiredAt: activeAccess.expiredAt.toISOString(),
        }
      }

      return receipt
    })
  }
}
