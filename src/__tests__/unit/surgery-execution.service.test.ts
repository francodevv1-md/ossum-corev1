import { beforeEach, describe, expect, it, vi } from "vitest"

const { createAuditEvent } = vi.hoisted(() => ({ createAuditEvent: vi.fn() }))

vi.mock("@/lib/audit", () => ({ createAuditEvent }))

import { executeScheduledSurgery } from "@/lib/services/surgery.service"

const companyId = "company-1"
const actorUserId = "user-1"
const surgeryId = "surgery-1"

function surgery(cxStatus = "scheduled") {
  return {
    id: surgeryId,
    companyId,
    cxStatus,
    archivedAt: null,
    performedDate: null,
    createdAt: new Date("2026-07-16T10:00:00.000Z"),
    updatedAt: new Date("2026-07-16T10:00:00.000Z"),
  }
}

function prismaFor({ current = surgery(), deliveredRemitos = 1 }: { current?: ReturnType<typeof surgery> | null; deliveredRemitos?: number } = {}) {
  const tx = {
    surgery: {
      findFirst: vi.fn().mockResolvedValueOnce(current).mockResolvedValueOnce({ ...current, cxStatus: "performed", performedDate: new Date() }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    remito: { count: vi.fn().mockResolvedValue(deliveredRemitos) },
  }
  return {
    userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "access-1" }) },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    tx,
  }
}

beforeEach(() => {
  createAuditEvent.mockReset()
  createAuditEvent.mockResolvedValue(undefined)
})

describe("executeScheduledSurgery", () => {
  it("executes only scheduled surgery with a same-company delivered Remito and audits actor/time", async () => {
    const prisma = prismaFor()

    await executeScheduledSurgery(prisma as never, { companyId, actorUserId }, surgeryId)

    expect(prisma.tx.remito.count).toHaveBeenCalledWith({ where: { companyId, surgeryId, state: "Entregado" } })
    expect(prisma.tx.surgery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: surgeryId, companyId, cxStatus: "scheduled" }),
      data: expect.objectContaining({ cxStatus: "performed", performedDate: expect.any(Date) }),
    }))
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: actorUserId,
      action: "surgery.executed",
      metadata: expect.objectContaining({ performedAt: expect.any(String) }),
    }))
  })

  it("rejects a non-scheduled surgery before checking Remitos or mutating", async () => {
    const prisma = prismaFor({ current: surgery("authorized") })

    await expect(executeScheduledSurgery(prisma as never, { companyId, actorUserId }, surgeryId))
      .rejects.toMatchObject({ code: "surgery_not_scheduled", status: 409 })
    expect(prisma.tx.remito.count).not.toHaveBeenCalled()
    expect(prisma.tx.surgery.updateMany).not.toHaveBeenCalled()
  })

  it("rejects when no delivered Remito exists before mutation", async () => {
    const prisma = prismaFor({ deliveredRemitos: 0 })

    await expect(executeScheduledSurgery(prisma as never, { companyId, actorUserId }, surgeryId))
      .rejects.toMatchObject({ code: "surgery_execution_requires_delivered_remito", status: 409 })
    expect(prisma.tx.surgery.updateMany).not.toHaveBeenCalled()
  })

  it("does not mutate a surgery outside the requested company", async () => {
    const prisma = prismaFor({ current: null })

    await expect(executeScheduledSurgery(prisma as never, { companyId, actorUserId }, "foreign-surgery"))
      .rejects.toMatchObject({ code: "surgery_not_found", status: 400 })
    expect(prisma.tx.surgery.updateMany).not.toHaveBeenCalled()
  })

  it("rejects an actor without active company mutation access before opening a transaction", async () => {
    const prisma = prismaFor()
    prisma.userCompanyAccess.findFirst.mockResolvedValue(null)

    await expect(executeScheduledSurgery(prisma as never, { companyId, actorUserId }, surgeryId))
      .rejects.toThrow("is not allowed to mutate surgeries")
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.tx.surgery.updateMany).not.toHaveBeenCalled()
  })
})
