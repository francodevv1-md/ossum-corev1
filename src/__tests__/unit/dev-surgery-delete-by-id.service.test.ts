import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DEV_SURGERY_HARD_DELETE_ENV_VALUE,
  DEV_SURGERY_HARD_DELETE_ENV_VAR,
} from "@/lib/services/dev-surgery-cleanup.service"

import {
  deleteBackendSurgeriesById,
  reportBackendSurgeriesByIdForCompany,
} from "@/lib/services/dev-surgery-delete-by-id.service"

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
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    internalNotification: {
      count: vi.fn(),
      deleteMany: vi.fn(),
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

describe("reportBackendSurgeriesByIdForCompany", () => {
  it("resume solo ids explícitos, preserva orden y marca faltantes", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-2",
        visibleNumber: "CX-0002",
        source: "manual",
        classification: "trauma",
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
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: "manual",
        classification: "columna",
        priority: "normal",
        cxStatus: "pending",
        prepStatus: null,
        probableDate: null,
        scheduledDate: null,
        surgeryDate: null,
        performedDate: null,
        cancelledDate: null,
        createdAt: new Date("2026-06-01T10:00:00Z"),
        patient: { firstName: "Ana", lastName: "Pérez", legalName: null },
        doctor: { firstName: null, lastName: null, legalName: "Dr. House" },
        institution: null,
        payer: null,
      },
    ])
    prisma.auditEvent.count.mockResolvedValueOnce(2)
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([])
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)

    const summary = await reportBackendSurgeriesByIdForCompany(prisma as never, "company-1", [
      "surg-1",
      "missing-1",
      "surg-2",
    ])

    expect(summary.requestedSurgeryIds).toEqual(["surg-1", "missing-1", "surg-2"])
    expect(summary.selectedSurgeryIds).toEqual(["surg-1", "surg-2"])
    expect(summary.missingSurgeryIds).toEqual(["missing-1"])
    expect(summary.selectedSurgeries).toMatchObject([
      {
        id: "surg-1",
        patientLabel: "Ana Pérez",
        doctorLabel: "Dr. House",
      },
      {
        id: "surg-2",
        patientLabel: "Luis Gómez",
      },
    ])
    expect(summary.counts).toEqual({
      surgeries: 2,
      auditEvents: 2,
      seguimientoEntries: 0,
      internalNotifications: 0,
      digitalReceipts: 0,
      contactAssignments: 0,
    })
    expect(summary.canApplySafely).toBe(true)
    expect(summary.forceDeleteRequired).toBe(false)
  })

  it("cuenta notificaciones ligadas por surgeryId o sourceEntityId de seguimiento", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: "manual",
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
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([{ id: "seg-1" }, { id: "seg-2" }])
    prisma.auditEvent.count.mockResolvedValueOnce(1)
    prisma.internalNotification.count.mockResolvedValueOnce(3)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)

    const summary = await reportBackendSurgeriesByIdForCompany(prisma as never, "company-1", ["surg-1"])

    expect(prisma.internalNotification.count).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        OR: [{ surgeryId: { in: ["surg-1"] } }, { sourceEntityId: { in: ["seg-1", "seg-2"] } }],
      },
    })
    expect(summary.counts.seguimientoEntries).toBe(2)
    expect(summary.counts.internalNotifications).toBe(3)
    expect(summary.forceDeleteRequired).toBe(true)
  })
})

describe("deleteBackendSurgeriesById", () => {
  it("en dry-run no borra y devuelve impacto", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: "manual",
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
    prisma.auditEvent.count.mockResolvedValueOnce(1)
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([])
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)

    const result = await deleteBackendSurgeriesById(prisma as never, "company-1", ["surg-1"])

    expect(result.mode).toBe("dry-run")
    expect(result.force).toBe(false)
    expect(result.summary.selectedSurgeryIds).toEqual(["surg-1"])
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("al aplicar borra audit events y luego solo esas cirugías", async () => {
    process.env[DEV_SURGERY_HARD_DELETE_ENV_VAR] = DEV_SURGERY_HARD_DELETE_ENV_VALUE
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: "manual",
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
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([])
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)
    prisma.$transaction.mockImplementationOnce(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma))
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([])
    prisma.auditEvent.deleteMany.mockResolvedValueOnce({ count: 2 })
    prisma.surgery.deleteMany.mockResolvedValueOnce({ count: 1 })

    const result = await deleteBackendSurgeriesById(prisma as never, "company-1", ["surg-1"], {
      apply: true,
    })

    expect(prisma.auditEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        entityType: { in: ["surgery", "Surgery"] },
        entityId: { in: ["surg-1"] },
      },
    })
    expect(prisma.surgery.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        id: { in: ["surg-1"] },
      },
    })
    expect(prisma.internalNotification.deleteMany).not.toHaveBeenCalled()
    expect(prisma.seguimientoEntry.deleteMany).not.toHaveBeenCalled()
    expect(result.deleted).toEqual({
      auditEvents: 2,
      seguimientoEntries: 0,
      internalNotifications: 0,
      surgeries: 1,
    })
  })

  it("bloquea apply si hay dependencias no seguras y no se pasa force", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: "manual",
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
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([{ id: "seg-1" }, { id: "seg-2" }, { id: "seg-3" }])
    prisma.auditEvent.count.mockResolvedValueOnce(1)
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(1)

    await expect(
      deleteBackendSurgeriesById(prisma as never, "company-1", ["surg-1"], {
        apply: true,
      })
    ).rejects.toThrow(
      "Cannot delete surgeries with blocking dependencies unless --force is used. seguimiento=3, internalNotifications=0, digitalReceipts=0, contactAssignments=1"
    )
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("con force borra dependencias conocidas en orden seguro antes de la cirugía", async () => {
    process.env[DEV_SURGERY_HARD_DELETE_ENV_VAR] = DEV_SURGERY_HARD_DELETE_ENV_VALUE
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: "manual",
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
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([{ id: "seg-1" }])
    prisma.auditEvent.count.mockResolvedValueOnce(1)
    prisma.internalNotification.count.mockResolvedValueOnce(2)
    prisma.digitalReceipt.count.mockResolvedValueOnce(1)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(1)
    prisma.$transaction.mockImplementationOnce(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma))
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([{ id: "seg-1" }])
    prisma.internalNotification.deleteMany.mockResolvedValueOnce({ count: 2 })
    prisma.seguimientoEntry.deleteMany.mockResolvedValueOnce({ count: 1 })
    prisma.auditEvent.deleteMany.mockResolvedValueOnce({ count: 1 })
    prisma.surgery.deleteMany.mockResolvedValueOnce({ count: 1 })

    const result = await deleteBackendSurgeriesById(prisma as never, "company-1", ["surg-1"], {
      apply: true,
      force: true,
    })

    expect(prisma.internalNotification.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        OR: [{ surgeryId: { in: ["surg-1"] } }, { sourceEntityId: { in: ["seg-1"] } }],
      },
    })
    expect(prisma.seguimientoEntry.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        surgeryId: { in: ["surg-1"] },
      },
    })
    expect(result.force).toBe(true)
    expect(result.deleted).toEqual({
      auditEvents: 1,
      seguimientoEntries: 1,
      internalNotifications: 2,
      surgeries: 1,
    })
  })

  it("bloquea apply sin env var deliberada antes de borrar", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: "manual",
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
    prisma.seguimientoEntry.findMany.mockResolvedValueOnce([])
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)

    await expect(
      deleteBackendSurgeriesById(prisma as never, "company-1", ["surg-1"], {
        apply: true,
      })
    ).rejects.toThrow("Production surgery deletion policy is soft archive")
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.surgery.deleteMany).not.toHaveBeenCalled()
  })
})
