import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DEV_SURGERY_HARD_DELETE_ENV_VALUE,
  DEV_SURGERY_HARD_DELETE_ENV_VAR,
  cleanupBackendDevSurgeries,
  reportBackendSurgeriesForCompany,
} from "@/lib/services/dev-surgery-cleanup.service"

afterEach(() => {
  delete process.env[DEV_SURGERY_HARD_DELETE_ENV_VAR]
})

function createPrismaMock() {
  return {
    surgery: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditEvent: {
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    seguimientoEntry: {
      count: vi.fn(),
    },
    internalNotification: {
      count: vi.fn(),
    },
    digitalReceipt: {
      count: vi.fn(),
    },
    surgeryContactAssignment: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}

describe("reportBackendSurgeriesForCompany", () => {
  it("clasifica candidatos y expone labels + razones", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "sgdevmock-alpha",
        visibleNumber: "AUT-001",
        source: "seed-mock",
        classification: "trauma",
        priority: "normal",
        cxStatus: "pending",
        prepStatus: null,
        probableDate: null,
        scheduledDate: new Date("2026-06-20T10:00:00Z"),
        surgeryDate: null,
        performedDate: null,
        cancelledDate: null,
        createdAt: new Date("2026-06-01T10:00:00Z"),
        patient: { firstName: "Ana", lastName: "Pérez", legalName: null },
        doctor: { firstName: null, lastName: null, legalName: "Dr. House" },
        institution: { firstName: null, lastName: null, legalName: "Sanatorio Norte" },
        payer: { firstName: null, lastName: null, legalName: "OSDE" },
      },
      {
        id: "surg-real-1",
        visibleNumber: "CX-0021",
        source: "cirugias-ui:create",
        classification: "columna",
        priority: "alta",
        cxStatus: "scheduled",
        prepStatus: "ready",
        probableDate: null,
        scheduledDate: new Date("2026-07-01T08:00:00Z"),
        surgeryDate: null,
        performedDate: null,
        cancelledDate: null,
        createdAt: new Date("2026-06-02T11:00:00Z"),
        patient: { firstName: "Luis", lastName: "Gómez", legalName: null },
        doctor: null,
        institution: null,
        payer: null,
      },
    ])
    prisma.auditEvent.count.mockResolvedValueOnce(4)
    prisma.seguimientoEntry.count.mockResolvedValueOnce(1)
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(2)

    const summary = await reportBackendSurgeriesForCompany(prisma as never, "company-1")

    expect(summary.surgeries).toHaveLength(2)
    expect(summary.candidateSurgeries).toHaveLength(1)
    expect(summary.candidateSurgeries[0]).toMatchObject({
      id: "sgdevmock-alpha",
      patientLabel: "Ana Pérez",
      doctorLabel: "Dr. House",
      institutionLabel: "Sanatorio Norte",
      payerLabel: "OSDE",
    })
    expect(summary.candidateSurgeries[0].candidateCleanupReasons).toEqual([
      {
        criterion: "sgdevmock-id",
        reason: "id starts with sgdevmock (sgdevmock-alpha)",
      },
      {
        criterion: "mock-source",
        reason: "source contains mock/test marker (seed-mock)",
      },
      {
        criterion: "aut-visible-number-with-mock-marker",
        reason: "visibleNumber starts with AUT- and source/id already has mock markers (AUT-001)",
      },
    ])
    expect(summary.counts).toEqual({
      surgeries: 1,
      auditEvents: 4,
      seguimientoEntries: 1,
      internalNotifications: 0,
      digitalReceipts: 0,
      contactAssignments: 2,
    })
  })
})

describe("cleanupBackendDevSurgeries", () => {
  it("en dry-run no borra y filtra por criterio explícito", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-dev-1",
        visibleNumber: "CX-DEV-2026-0001",
        source: "seed",
        classification: null,
        priority: null,
        cxStatus: "pending",
        prepStatus: null,
        probableDate: null,
        scheduledDate: null,
        surgeryDate: null,
        performedDate: null,
        cancelledDate: null,
        createdAt: new Date("2026-06-01T10:00:00Z"),
        patient: { firstName: "Ana", lastName: "Pérez", legalName: null },
        doctor: null,
        institution: null,
        payer: null,
      },
      {
        id: "surg-real-1",
        visibleNumber: "CX-0021",
        source: "cirugias-ui:create",
        classification: null,
        priority: null,
        cxStatus: "pending",
        prepStatus: null,
        probableDate: null,
        scheduledDate: null,
        surgeryDate: null,
        performedDate: null,
        cancelledDate: null,
        createdAt: new Date("2026-06-01T10:00:00Z"),
        patient: { firstName: "Luis", lastName: "Gómez", legalName: null },
        doctor: null,
        institution: null,
        payer: null,
      },
    ])
    prisma.auditEvent.count.mockResolvedValueOnce(1)
    prisma.seguimientoEntry.count.mockResolvedValueOnce(0)
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)

    const result = await cleanupBackendDevSurgeries(prisma as never, "company-1", {
      criteria: ["cx-dev-visible-number"],
    })

    expect(result.mode).toBe("dry-run")
    expect(result.summary.candidateSurgeries.map((surgery) => surgery.id)).toEqual(["surg-dev-1"])
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("al aplicar borra audit events surgery/Surgery y luego cirugías candidatas", async () => {
    process.env[DEV_SURGERY_HARD_DELETE_ENV_VAR] = DEV_SURGERY_HARD_DELETE_ENV_VALUE
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "sgdevmock-alpha",
        visibleNumber: "AUT-001",
        source: "seed-mock",
        classification: null,
        priority: null,
        cxStatus: "pending",
        prepStatus: null,
        probableDate: null,
        scheduledDate: null,
        surgeryDate: null,
        performedDate: null,
        cancelledDate: null,
        createdAt: new Date("2026-06-01T10:00:00Z"),
        patient: { firstName: "Ana", lastName: "Pérez", legalName: null },
        doctor: null,
        institution: null,
        payer: null,
      },
    ])
    prisma.auditEvent.count.mockResolvedValueOnce(2)
    prisma.seguimientoEntry.count.mockResolvedValueOnce(0)
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)
    prisma.$transaction.mockImplementationOnce(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma))
    prisma.auditEvent.deleteMany.mockResolvedValueOnce({ count: 2 })
    prisma.surgery.deleteMany.mockResolvedValueOnce({ count: 1 })

    const result = await cleanupBackendDevSurgeries(prisma as never, "company-1", {
      apply: true,
      criteria: ["sgdevmock-id"],
    })

    expect(prisma.auditEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        entityType: { in: ["surgery", "Surgery"] },
        entityId: { in: ["sgdevmock-alpha"] },
      },
    })
    expect(prisma.surgery.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        id: { in: ["sgdevmock-alpha"] },
      },
    })
    expect(result.deleted).toEqual({
      auditEvents: 2,
      surgeries: 1,
    })
  })

  it("bloquea apply sin env var deliberada antes de borrar", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "sgdevmock-alpha",
        visibleNumber: "AUT-001",
        source: "seed-mock",
        classification: null,
        priority: null,
        cxStatus: "pending",
        prepStatus: null,
        probableDate: null,
        scheduledDate: null,
        surgeryDate: null,
        performedDate: null,
        cancelledDate: null,
        createdAt: new Date("2026-06-01T10:00:00Z"),
        patient: { firstName: "Ana", lastName: "Pérez", legalName: null },
        doctor: null,
        institution: null,
        payer: null,
      },
    ])
    prisma.auditEvent.count.mockResolvedValueOnce(2)
    prisma.seguimientoEntry.count.mockResolvedValueOnce(0)
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)

    await expect(
      cleanupBackendDevSurgeries(prisma as never, "company-1", {
        apply: true,
        criteria: ["sgdevmock-id"],
      })
    ).rejects.toThrow("Production surgery deletion policy is soft archive")
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.surgery.deleteMany).not.toHaveBeenCalled()
  })
})
