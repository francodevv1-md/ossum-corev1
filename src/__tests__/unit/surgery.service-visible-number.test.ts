import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

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

  it("allocates beyond int32 and JavaScript safe integers without truncation", async () => {
    tx.$queryRaw.mockResolvedValue([{ maxNumber: "999999999999999999999999" }])
    tx.surgery.create.mockImplementation(async ({ data }: { data: { visibleNumber: string | null } }) => buildCreatedSurgery(data.visibleNumber))

    const surgery = await createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      { patientId: "patient-1", source: "PRESUPUESTO_AUTHORITY_S7_2" }
    )

    expect(surgery.visibleNumber).toBe("CX-1000000000000000000000000")
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

  it("retries a generated visible number rejected by the company uniqueness constraint", async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([{ maxNumber: BigInt(4) }])
      .mockResolvedValueOnce([{ maxNumber: BigInt(5) }])
    tx.surgery.create
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Duplicate visible number", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["companyId", "visibleNumber"] },
      }))
      .mockImplementationOnce(async ({ data }: { data: { visibleNumber: string | null } }) => buildCreatedSurgery(data.visibleNumber))

    const surgery = await createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      { patientId: "patient-1", source: "PRESUPUESTO_AUTHORITY_S7_2" }
    )

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
    expect(tx.surgery.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ visibleNumber: "CX-0005" }) }))
    expect(tx.surgery.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ visibleNumber: "CX-0006" }) }))
    expect(surgery.visibleNumber).toBe("CX-0006")
  })

  it("retries the adapter-pg P2002 shape used by Prisma 7", async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([{ maxNumber: BigInt(4) }])
      .mockResolvedValueOnce([{ maxNumber: BigInt(5) }])
    tx.surgery.create
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Duplicate visible number", {
        code: "P2002",
        clientVersion: "test",
        meta: {
          driverAdapterError: {
            cause: { constraint: { fields: ['"companyId"', '"visibleNumber"'] } },
          },
        },
      }))
      .mockImplementationOnce(async ({ data }: { data: { visibleNumber: string | null } }) => buildCreatedSurgery(data.visibleNumber))

    const surgery = await createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      { patientId: "patient-1", source: "PRESUPUESTO_AUTHORITY_S7_2" }
    )

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
    expect(surgery.visibleNumber).toBe("CX-0006")
  })

  it("still retries serialization failures for explicit legacy numbers", async () => {
    tx.surgery.create
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Serialization failure", {
        code: "P2034",
        clientVersion: "test",
      }))
      .mockImplementationOnce(async ({ data }: { data: { visibleNumber: string | null } }) => buildCreatedSurgery(data.visibleNumber))

    const surgery = await createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      { patientId: "patient-1", visibleNumber: "CX-LEGACY-42", source: "legacy-surgery-sync" }
    )

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
    expect(surgery.visibleNumber).toBe("CX-LEGACY-42")
  })

  it("does not retry unrelated uniqueness conflicts", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ maxNumber: BigInt(4) }])
    tx.surgery.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Duplicate id", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["id"] },
    }))

    await expect(createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      { patientId: "patient-1", source: "PRESUPUESTO_AUTHORITY_S7_2" }
    )).rejects.toMatchObject({ code: "P2002" })

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })
})
