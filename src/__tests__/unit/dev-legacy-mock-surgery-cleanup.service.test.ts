import { afterEach, describe, expect, it, vi } from "vitest"

import {
  cleanupLegacyMockSyncSurgeries,
  LEGACY_MOCK_SYNC_SOURCE_PREFIX,
} from "@/lib/services/dev-legacy-mock-surgery-cleanup.service"
import {
  DEV_SURGERY_HARD_DELETE_ENV_VALUE,
  DEV_SURGERY_HARD_DELETE_ENV_VAR,
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

describe("cleanupLegacyMockSyncSurgeries", () => {
  it("devuelve resumen en dry-run sin borrar registros", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: `${LEGACY_MOCK_SYNC_SOURCE_PREFIX}cx-0001`,
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
        patient: { firstName: "Ana", lastName: "Uno", legalName: null },
        doctor: null,
        institution: null,
        payer: null,
      },
      {
        id: "surg-2",
        visibleNumber: "CX-0002",
        source: `${LEGACY_MOCK_SYNC_SOURCE_PREFIX}cx-0002`,
        classification: null,
        priority: null,
        cxStatus: "pending",
        prepStatus: null,
        probableDate: null,
        scheduledDate: null,
        surgeryDate: null,
        performedDate: null,
        cancelledDate: null,
        createdAt: new Date("2026-06-01T11:00:00Z"),
        patient: { firstName: "Ana", lastName: "Dos", legalName: null },
        doctor: null,
        institution: null,
        payer: null,
      },
    ])
    prisma.auditEvent.count.mockResolvedValueOnce(3)
    prisma.seguimientoEntry.count.mockResolvedValueOnce(2)
    prisma.internalNotification.count.mockResolvedValueOnce(1)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(4)

    const result = await cleanupLegacyMockSyncSurgeries(prisma as never, "company-1")

    expect(result).toEqual({
      mode: "dry-run",
      summary: {
        companyId: "company-1",
        sourcePrefix: LEGACY_MOCK_SYNC_SOURCE_PREFIX,
        surgeries: [
          { id: "surg-1", visibleNumber: "CX-0001", source: `${LEGACY_MOCK_SYNC_SOURCE_PREFIX}cx-0001` },
          { id: "surg-2", visibleNumber: "CX-0002", source: `${LEGACY_MOCK_SYNC_SOURCE_PREFIX}cx-0002` },
        ],
        counts: {
          surgeries: 2,
          auditEvents: 3,
          seguimientoEntries: 2,
          internalNotifications: 1,
          digitalReceipts: 0,
          contactAssignments: 4,
        },
      },
      deleted: {
        auditEvents: 0,
        surgeries: 0,
      },
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("borra audit events explícitos y luego cirugías al aplicar", async () => {
    process.env[DEV_SURGERY_HARD_DELETE_ENV_VAR] = DEV_SURGERY_HARD_DELETE_ENV_VALUE
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      {
        id: "surg-1",
        visibleNumber: "CX-0001",
        source: `${LEGACY_MOCK_SYNC_SOURCE_PREFIX}cx-0001`,
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
        patient: { firstName: "Ana", lastName: "Uno", legalName: null },
        doctor: null,
        institution: null,
        payer: null,
      },
    ])
    prisma.auditEvent.count.mockResolvedValueOnce(2)
    prisma.seguimientoEntry.count.mockResolvedValueOnce(1)
    prisma.internalNotification.count.mockResolvedValueOnce(0)
    prisma.digitalReceipt.count.mockResolvedValueOnce(0)
    prisma.surgeryContactAssignment.count.mockResolvedValueOnce(0)
    prisma.$transaction.mockImplementationOnce(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma))
    prisma.auditEvent.deleteMany.mockResolvedValueOnce({ count: 2 })
    prisma.surgery.deleteMany.mockResolvedValueOnce({ count: 1 })

    const result = await cleanupLegacyMockSyncSurgeries(prisma as never, "company-1", { apply: true })

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
    expect(result.deleted).toEqual({
      auditEvents: 2,
      surgeries: 1,
    })
    expect(result.mode).toBe("apply")
  })
})
