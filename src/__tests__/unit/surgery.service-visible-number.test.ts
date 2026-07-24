import { beforeEach, describe, expect, it, vi } from "vitest"

const { createAuditEvent } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
}))

vi.mock("@/lib/audit", () => ({
  createAuditEvent,
}))

import { createSurgery } from "@/lib/services/surgery.service"

function buildCreatedSurgery(visibleNumber: string | null) {
  return {
    id: "surgery-1",
    companyId: "company-1",
    branchId: null,
    visibleNumber,
    patientId: "patient-1",
    doctorId: null,
    institutionId: null,
    payerContactId: null,
    classification: null,
    description: null,
    priority: null,
    cxStatus: "pending",
    prepStatus: null,
    probableDate: null,
    scheduledDate: null,
    surgeryDate: null,
    performedDate: null,
    cancelledDate: null,
    source: "cirugias-ui:new-surgery-dialog",
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  }
}

describe("createSurgery visible number allocation", () => {
  const tx = {
    $queryRaw: vi.fn(),
    surgery: {
      create: vi.fn(),
    },
  }

  const prismaMock = {
    userCompanyAccess: {
      findFirst: vi.fn(),
    },
    contactCompanyLink: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }

  beforeEach(() => {
    createAuditEvent.mockReset()
    prismaMock.userCompanyAccess.findFirst.mockReset()
    prismaMock.contactCompanyLink.findMany.mockReset()
    prismaMock.$transaction.mockReset()
    tx.$queryRaw.mockReset()
    tx.surgery.create.mockReset()

    prismaMock.userCompanyAccess.findFirst.mockResolvedValue({ id: "access-1" })
    prismaMock.contactCompanyLink.findMany.mockResolvedValue([{ contactId: "patient-1" }])
    prismaMock.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx))
    createAuditEvent.mockResolvedValue(undefined)
  })

  it("generates the next sequential CX visible number for UI-created surgeries", async () => {
    tx.$queryRaw.mockResolvedValue([{ maxNumber: BigInt(9) }])
    tx.surgery.create.mockImplementation(async ({ data }: { data: { visibleNumber: string | null } }) => buildCreatedSurgery(data.visibleNumber))

    const surgery = await createSurgery(
      prismaMock as never,
      {
        actorUserId: "user-1",
        companyId: "company-1",
        module: "surgery",
        source: "cirugias-ui:new-surgery-dialog",
      },
      {
        patientId: "patient-1",
        visibleNumber: "CX-RANDOM-FRONTEND",
        source: "cirugias-ui:new-surgery-dialog",
      }
    )

    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" })
    )
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
    expect(tx.surgery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibleNumber: "CX-0010",
          createdById: "user-1",
        }),
      })
    )
    expect(surgery.visibleNumber).toBe("CX-0010")
  })

  it("preserves explicit visible numbers for legacy sync callers", async () => {
    tx.surgery.create.mockImplementation(async ({ data }: { data: { visibleNumber: string | null } }) => buildCreatedSurgery(data.visibleNumber))

    const surgery = await createSurgery(
      prismaMock as never,
      {
        actorUserId: "user-1",
        companyId: "company-1",
        module: "surgery",
        source: "legacy-surgery-sync",
      },
      {
        patientId: "patient-1",
        visibleNumber: "CX-LEGACY-42",
        source: "legacy-surgery-sync",
      }
    )

    expect(tx.$queryRaw).not.toHaveBeenCalled()
    expect(tx.surgery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ visibleNumber: "CX-LEGACY-42" }),
      })
    )
    expect(surgery.visibleNumber).toBe("CX-LEGACY-42")
  })
})
