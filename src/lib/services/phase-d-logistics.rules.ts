import { Prisma } from "@prisma/client"
import { conflict } from "@/lib/api/errors"

const decimal = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value)

export function assertPhysicalCeiling(dispatched: Prisma.Decimal | string | number, finalized: readonly (Prisma.Decimal | string | number)[], requested: Prisma.Decimal | string | number) {
  const used = finalized.reduce<Prisma.Decimal>((sum, value) => sum.plus(decimal(value)), new Prisma.Decimal(0))
  if (used.plus(decimal(requested)).gt(decimal(dispatched))) throw conflict("Disposition exceeds net dispatched physical quantity", "phase_d_dispatch_ceiling_exceeded")
}

export function assertIdentifiedWhole(serial: string | null | undefined, identifiedCode: string | null | undefined, dispatched: Prisma.Decimal | string | number, requested: Prisma.Decimal | string | number) {
  if ((serial || identifiedCode) && (!decimal(dispatched).eq(1) || !decimal(requested).eq(1))) throw conflict("Identified physical units must be reconciled whole", "phase_d_identified_partial_forbidden")
}

export function reconciliationTotals(dispatched: readonly { id: string; quantity: Prisma.Decimal | string | number }[], operations: readonly { id?: string; sourceOperationId?: string | null; dispatchLineId: string | null; quantity: Prisma.Decimal | string | number; returnState: string | null }[]) {
  const resolved = new Set(operations.map(row => row.sourceOperationId).filter((id): id is string => !!id))
  const unidentified = operations.filter(row => row.returnState === "PENDING_IDENTIFICATION" && (!row.id || !resolved.has(row.id))).reduce<Prisma.Decimal>((sum, row) => sum.plus(decimal(row.quantity)), new Prisma.Decimal(0))
  const physical = dispatched.map(line => {
    const finalized = operations.filter(row => row.dispatchLineId === line.id && row.returnState !== "RECEIVED").reduce<Prisma.Decimal>((sum, row) => sum.plus(decimal(row.quantity)), new Prisma.Decimal(0))
    return { dispatchLineId: line.id, dispatched: decimal(line.quantity).toString(), finalized: finalized.toString(), pending: decimal(line.quantity).minus(finalized).toString() }
  })
  return { physical, unidentifiedPending: unidentified.toString(), closeEligible: unidentified.isZero() && physical.every(line => decimal(line.pending).isZero()) }
}
