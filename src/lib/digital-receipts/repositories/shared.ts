import { Prisma } from "@prisma/client"
import type { PrismaClient } from "@prisma/client"

export type DigitalReceiptPrismaSource = PrismaClient | Prisma.TransactionClient

export type DigitalReceiptPrismaClient = {
  digitalReceipt: {
    create(args: unknown): Promise<unknown>
    update(args: unknown): Promise<unknown>
    findFirst(args: unknown): Promise<unknown>
    findUnique(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<unknown>
  }
  digitalReceiptAccess: {
    create(args: unknown): Promise<unknown>
    update(args: unknown): Promise<unknown>
    findFirst(args: unknown): Promise<unknown>
    findUnique(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<unknown>
  }
  digitalReceiptEvent: {
    create(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<unknown>
  }
  digitalReceiptSnapshot: {
    create(args: unknown): Promise<unknown>
    findUnique(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<unknown>
    findFirst(args: unknown): Promise<unknown>
  }
  digitalReceiptArtifact: {
    create(args: unknown): Promise<unknown>
    findUnique(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<unknown>
  }
}

export function getDigitalReceiptDb(prismaClient: DigitalReceiptPrismaSource): DigitalReceiptPrismaClient {
  return prismaClient as unknown as DigitalReceiptPrismaClient
}

export type DateInput = string | Date

export function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

export function toNullableDate(value?: DateInput | null): Date | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  return toDate(value)
}

export function toInputJsonValue(value?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue
  }

  return value as Prisma.InputJsonValue
}
