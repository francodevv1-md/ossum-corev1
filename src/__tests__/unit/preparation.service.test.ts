import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { createHash } from "node:crypto"

const { createAuditEvent } = vi.hoisted(() => ({ createAuditEvent: vi.fn() }))
vi.mock("@/lib/audit", () => ({ createAuditEvent }))

import { createPreparation, reservePreparation } from "@/lib/services/preparation.service"

describe("preparation.service", () => {
  beforeEach(() => createAuditEvent.mockReset().mockResolvedValue({ id: "audit-1" }))

  it("lets Prisma infer companyId for nested preparation lines", async () => {
    const tx = { surgeryPreparation: { create: vi.fn().mockResolvedValue({ id: "prep-1", lines: [] }) } }
    const db = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1" }) },
      article: { findMany: vi.fn().mockResolvedValue([{ id: "article-1" }]) },
      $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
    }

    await createPreparation(db as never, "company-1", "surgery-1", "user-1", {
      lines: [{ articleId: "article-1", requestedQuantity: "1", stockUnit: "u" }],
    })

    expect(tx.surgeryPreparation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lines: { create: [expect.not.objectContaining({ companyId: expect.anything() })] } }),
    }))
  })

  it("rejects a reused preparation key with a different intent", async () => {
    const db = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1" }) },
      article: { findMany: vi.fn().mockResolvedValue([{ id: "article-1" }]) },
      surgeryPreparation: { findFirst: vi.fn().mockResolvedValue({ id: "prep-1", surgeryId: "other-surgery", cajasAssignmentId: null, lines: [{ articleId: "article-1", requestedQuantity: new Prisma.Decimal(1), stockUnit: "u" }] }) },
    }

    await expect(createPreparation(db as never, "company-1", "surgery-1", "user-1", {
      idempotencyKey: "prepare-1", lines: [{ articleId: "article-1", requestedQuantity: "1", stockUnit: "u" }],
    })).rejects.toMatchObject({ code: "idempotency_key_reused" })
  })

  it("replays preparation after a concurrent idempotency-key insert", async () => {
    const replay = { id: "prep-1", surgeryId: "surgery-1", cajasAssignmentId: null, lines: [{ articleId: "article-1", requestedQuantity: new Prisma.Decimal(1), stockUnit: "u" }] }
    const db = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1" }) },
      article: { findMany: vi.fn().mockResolvedValue([{ id: "article-1" }]) },
      surgeryPreparation: { findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(replay) },
      $transaction: vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" })),
    }

    await expect(createPreparation(db as never, "company-1", "surgery-1", "user-1", {
      idempotencyKey: "prepare-1", lines: [{ articleId: "article-1", requestedQuantity: "1", stockUnit: "u" }],
    })).resolves.toBe(replay)
  })

  it("uses a supplied transaction client without attempting a nested transaction", async () => {
    const tx = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1" }) },
      article: { findMany: vi.fn().mockResolvedValue([{ id: "article-1" }]) },
      surgeryPreparation: { create: vi.fn().mockResolvedValue({ id: "prep-1", lines: [] }) },
    }

    await expect(createPreparation(tx as never, "company-1", "surgery-1", "user-1", {
      lines: [{ articleId: "article-1", requestedQuantity: "1", stockUnit: "u" }],
    })).resolves.toMatchObject({ id: "prep-1" })
  })

  it("writes the canonical line scope and reservation id", async () => {
    const tx = {
      surgeryPreparation: { findFirst: vi.fn().mockResolvedValue({ id: "prep-1", surgeryId: "surgery-1" }) },
      surgeryPreparationLine: {
        findFirst: vi.fn().mockResolvedValue({ id: "line-1", requestedQuantity: new Prisma.Decimal(1), preparedQuantity: new Prisma.Decimal(0), stockUnit: "u", articleId: "article-1", preparation: { id: "prep-1" } }),
        update: vi.fn(),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ id: "line-1" }]),
      stockPosition: { findFirst: vi.fn().mockResolvedValue({ id: "position-1", articleId: "article-1", identifiedUnitId: null, quantityScale: 4, positionProjection: {} }) },
      stockPositionProjection: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      stockReservation: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }) => data) },
      stockReservationEvidence: { create: vi.fn() },
      stockReservationProjection: { create: vi.fn() },
      operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "command-1" }) },
    }
    const db = { $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)) }

    await reservePreparation(db as never, "company-1", "surgery-1", "prep-1", "user-1", {
      lineId: "line-1", positionId: "position-1", quantity: "1", idempotencyKey: "reserve-1",
    })

    const reservation = tx.stockReservation.create.mock.calls[0][0].data
    expect(reservation).toMatchObject({ id: expect.any(String), sourceScopeKind: "LINE", sourceScopeKey: "L:line-1" })
    expect(tx.operationalCommandAcceptance.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ resultEntityId: reservation.id }) }))
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
  })

  it("rejects a reused reservation key with a different intent", async () => {
    const tx = {
      surgeryPreparation: { findFirst: vi.fn().mockResolvedValue({ id: "prep-1", surgeryId: "surgery-1" }) },
      operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue({ intentHash: "different", resultEntityId: "reservation-1" }) },
      stockReservation: { findFirst: vi.fn() },
    }
    const db = { $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)) }

    await expect(reservePreparation(db as never, "company-1", "surgery-1", "prep-1", "user-1", {
      lineId: "line-1", positionId: "position-1", quantity: "1", idempotencyKey: "reserve-1",
    })).rejects.toMatchObject({ code: "idempotency_key_reused" })
    expect(tx.stockReservation.findFirst).not.toHaveBeenCalled()
  })

  it("replays a reservation that wins while waiting for the line lock", async () => {
    const reservation = { id: "reservation-1" }
    const expectedIntent = createHash("sha256").update(JSON.stringify({ preparationId: "prep-1", lineId: "line-1", positionId: "position-1", quantity: "1" })).digest("hex")
    const tx = {
      surgeryPreparation: { findFirst: vi.fn().mockResolvedValue({ id: "prep-1", surgeryId: "surgery-1" }) },
      operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ intentHash: expectedIntent, resultEntityId: reservation.id }) },
      stockReservation: { findFirst: vi.fn().mockResolvedValue(reservation) },
      surgeryPreparationLine: { findFirst: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([{ id: "line-1" }]),
    }
    const db = { $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)) }

    await expect(reservePreparation(db as never, "company-1", "surgery-1", "prep-1", "user-1", {
      lineId: "line-1", positionId: "position-1", quantity: "1", idempotencyKey: "reserve-1",
    })).resolves.toBe(reservation)
    expect(tx.surgeryPreparationLine.findFirst).not.toHaveBeenCalled()
  })

  it("turns a concurrent semantic-key P2002 into an intent conflict without retrying stock", async () => {
    const reservation = { id: "reservation-1" }
    const acceptedIntent = createHash("sha256").update(JSON.stringify({ preparationId: "prep-1", lineId: "line-1", positionId: "position-1", quantity: "1" })).digest("hex")
    const collision = new Prisma.PrismaClientKnownRequestError("duplicate semantic command", {
      code: "P2002",
      clientVersion: "test",
      meta: { driverAdapterError: { cause: { constraint: { fields: ['"companyId"', "domain", '"sourceOperationId"', "checkpoint", '"scopeKey"'] } } } },
    })
    const db = {
      $transaction: vi.fn().mockResolvedValueOnce(reservation).mockRejectedValueOnce(collision),
      operationalCommandAcceptance: { findFirst: vi.fn().mockResolvedValue({ intentHash: acceptedIntent, resultEntityId: reservation.id }) },
      stockReservation: { findFirst: vi.fn() },
    }

    const [winner, loser] = await Promise.allSettled([
      reservePreparation(db as never, "company-1", "surgery-1", "prep-1", "user-1", { lineId: "line-1", positionId: "position-1", quantity: "1", idempotencyKey: "shared-key" }),
      reservePreparation(db as never, "company-1", "surgery-1", "prep-1", "user-1", { lineId: "line-2", positionId: "position-2", quantity: "1", idempotencyKey: "shared-key" }),
    ])

    expect(winner).toEqual({ status: "fulfilled", value: reservation })
    expect(loser).toMatchObject({ status: "rejected", reason: { code: "idempotency_key_reused" } })
    expect(db.$transaction).toHaveBeenCalledTimes(2)
    expect(db.stockReservation.findFirst).not.toHaveBeenCalled()
  })
})
