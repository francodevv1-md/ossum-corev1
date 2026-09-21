import { beforeEach, describe, expect, it, vi } from "vitest"

const { createAuditEvent } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
}))

vi.mock("@/lib/audit", () => ({
  createAuditEvent,
}))

import { createSurgery } from "@/lib/services/surgery.service"

describe("createSurgery — T2.1B-A extras (materialShippingDate + coordinatorContactId)", () => {
  const tx = {
    $queryRaw: vi.fn(),
    surgery: {
      create: vi.fn(),
    },
    surgeryContactAssignment: {
      create: vi.fn(),
    },
  }

  const prismaMock = {
    userCompanyAccess: {
      findFirst: vi.fn(),
    },
    contactCompanyLink: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  }

  beforeEach(() => {
    createAuditEvent.mockReset()
    prismaMock.userCompanyAccess.findFirst.mockReset()
    prismaMock.contactCompanyLink.findMany.mockReset()
    prismaMock.contactCompanyLink.findFirst.mockReset()
    prismaMock.$transaction.mockReset()
    tx.$queryRaw.mockReset()
    tx.surgery.create.mockReset()
    tx.surgeryContactAssignment.create.mockReset()

    prismaMock.userCompanyAccess.findFirst.mockResolvedValue({ id: "access-1" })
    prismaMock.contactCompanyLink.findMany.mockResolvedValue([
      { contactId: "patient-1" },
      { contactId: "doctor-1" },
      { contactId: "institution-1" },
      { contactId: "payer-1" },
    ])
    prismaMock.$transaction.mockImplementation(
      async (callback: (value: typeof tx) => unknown) => callback(tx)
    )
    createAuditEvent.mockResolvedValue(undefined)

    tx.$queryRaw.mockResolvedValue([{ maxNumber: BigInt(9) }])
    tx.surgery.create.mockImplementation(
      async ({ data }: { data: { materialShippingDate?: Date | null } }) => ({
        id: "surgery-1",
        companyId: "company-1",
        branchId: null,
        visibleNumber: "CX-0010",
        patientId: "patient-1",
        doctorId: "doctor-1",
        institutionId: "institution-1",
        payerContactId: "payer-1",
        classification: null,
        description: null,
        priority: null,
        cxStatus: "pending",
        prepStatus: null,
        probableDate: null,
        scheduledDate: null,
        surgeryDate: null,
        materialShippingDate: data.materialShippingDate ?? null,
        performedDate: null,
        cancelledDate: null,
        source: "cirugias-ui:new-surgery-dialog",
        notes: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      })
    )
    tx.surgeryContactAssignment.create.mockResolvedValue({ id: "assignment-1" })
  })

  it("persists materialShippingDate when provided", async () => {
    const surgeryDate = new Date("2026-07-08T00:00:00.000Z")

    await createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      {
        patientId: "patient-1",
        doctorId: "doctor-1",
        institutionId: "institution-1",
        payerContactId: "payer-1",
        materialShippingDate: surgeryDate,
      }
    )

    expect(tx.surgery.create).toHaveBeenCalledTimes(1)
    const createArgs = tx.surgery.create.mock.calls[0]?.[0] as {
      data: { materialShippingDate: Date | null }
    }
    expect(createArgs.data.materialShippingDate).toBeInstanceOf(Date)
    expect(createArgs.data.materialShippingDate?.toISOString().slice(0, 10)).toBe("2026-07-08")
    expect(tx.surgeryContactAssignment.create).not.toHaveBeenCalled()
  })

  it("creates a SurgeryContactAssignment when coordinatorContactId is provided", async () => {
    prismaMock.contactCompanyLink.findFirst.mockResolvedValue({ contactId: "coordinator-1" })

    await createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      {
        patientId: "patient-1",
        doctorId: "doctor-1",
        institutionId: "institution-1",
        payerContactId: "payer-1",
        coordinatorContactId: "coordinator-1",
      }
    )

    expect(prismaMock.contactCompanyLink.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          contactId: "coordinator-1",
          isActive: true,
          role: "coordinator",
          contact: { isActive: true, isCompany: false },
        }),
      })
    )
    expect(tx.surgeryContactAssignment.create).toHaveBeenCalledTimes(1)
    expect(tx.surgeryContactAssignment.create).toHaveBeenCalledWith({
      data: {
        surgeryId: "surgery-1",
        contactId: "coordinator-1",
        role: "coordinator",
        isPrimary: true,
      },
    })
  })

  it("persists both materialShippingDate and coordinatorContactId together", async () => {
    prismaMock.contactCompanyLink.findFirst.mockResolvedValue({ contactId: "coordinator-1" })

    await createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      {
        patientId: "patient-1",
        doctorId: "doctor-1",
        institutionId: "institution-1",
        payerContactId: "payer-1",
        coordinatorContactId: "coordinator-1",
        materialShippingDate: new Date("2026-07-09T00:00:00.000Z"),
      }
    )

    const createArgs = tx.surgery.create.mock.calls[0]?.[0] as {
      data: { materialShippingDate: Date | null }
    }
    expect(createArgs.data.materialShippingDate?.toISOString().slice(0, 10)).toBe("2026-07-09")
    expect(tx.surgeryContactAssignment.create).toHaveBeenCalledWith({
      data: {
        surgeryId: "surgery-1",
        contactId: "coordinator-1",
        role: "coordinator",
        isPrimary: true,
      },
    })
  })

  it("rejects coordinatorContactId when the contact is not linked as coordinator", async () => {
    prismaMock.contactCompanyLink.findFirst.mockResolvedValue(null)

    await expect(
      createSurgery(
        prismaMock as never,
        { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
        {
          patientId: "patient-1",
          doctorId: "doctor-1",
          institutionId: "institution-1",
          payerContactId: "payer-1",
          coordinatorContactId: "ghost-coordinator",
        }
      )
    ).rejects.toThrow(/not linked as coordinator/i)

    expect(tx.surgery.create).not.toHaveBeenCalled()
    expect(tx.surgeryContactAssignment.create).not.toHaveBeenCalled()
  })

  it("does not create any SurgeryContactAssignment when coordinatorContactId is omitted", async () => {
    await createSurgery(
      prismaMock as never,
      { actorUserId: "user-1", companyId: "company-1", module: "surgery" },
      {
        patientId: "patient-1",
        doctorId: "doctor-1",
        institutionId: "institution-1",
        payerContactId: "payer-1",
      }
    )

    expect(prismaMock.contactCompanyLink.findFirst).not.toHaveBeenCalled()
    expect(tx.surgeryContactAssignment.create).not.toHaveBeenCalled()
  })
})
