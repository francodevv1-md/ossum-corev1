import { beforeEach, describe, expect, it, vi } from "vitest"

import { archiveSurgery } from "@/lib/services/surgery.service"

const baseDate = new Date("2026-07-08T01:00:00.000Z")

function mockSurgery(overrides: Record<string, unknown> = {}) {
  return {
    id: "surgery-1",
    companyId: "company-1",
    branchId: null,
    visibleNumber: "CX-0042",
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
    source: null,
    notes: null,
    archivedAt: null,
    archivedById: null,
    archiveReason: null,
    archivePolicySnapshot: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    patient: { firstName: "Ada", lastName: "Lovelace", legalName: null },
    institution: null,
    ...overrides,
  }
}

function buildPrismaMock() {
  const tx = {
    surgery: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn().mockResolvedValue(mockSurgery({ archivedAt: new Date("2026-07-08T02:00:00.000Z") })),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
  }

  return {
    tx,
    prisma: {
      userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "access-1" }) },
      surgery: { findFirst: vi.fn() },
      presupuesto: { count: vi.fn().mockResolvedValue(0) },
      remito: { count: vi.fn().mockResolvedValue(0) },
      consumo: { count: vi.fn().mockResolvedValue(0) },
      devolucion: { count: vi.fn().mockResolvedValue(0) },
      invoice: { count: vi.fn().mockResolvedValue(0) },
      payment: { count: vi.fn().mockResolvedValue(0) },
      digitalReceipt: { count: vi.fn().mockResolvedValue(0) },
      seguimientoEntry: { count: vi.fn().mockResolvedValue(0) },
      internalNotification: { count: vi.fn().mockResolvedValue(0) },
      $transaction: vi.fn(async (callback) => callback(tx)),
    },
  }
}

const context = {
  companyId: "company-1",
  actorUserId: "user-1",
  module: "surgery" as const,
}

describe("archiveSurgery", () => {
  let prismaMock: ReturnType<typeof buildPrismaMock>

  beforeEach(() => {
    prismaMock = buildPrismaMock()
    prismaMock.prisma.surgery.findFirst
      .mockResolvedValueOnce(mockSurgery())
      .mockResolvedValueOnce(mockSurgery())
  })

  it("requires exact confirmation text", async () => {
    await expect(
      archiveSurgery(prismaMock.prisma as never, context, "surgery-1", {
        confirmationText: "confirmo",
        reason: "Duplicada",
      })
    ).rejects.toMatchObject({ code: "invalid_archive_confirmation" })
  })

  it("requires non-empty reason", async () => {
    await expect(
      archiveSurgery(prismaMock.prisma as never, context, "surgery-1", {
        confirmationText: "confirmo eliminar",
        reason: " ",
      })
    ).rejects.toMatchObject({ code: "archive_reason_required" })
  })

  it("blocks invoices and payments", async () => {
    prismaMock.prisma.invoice.count.mockResolvedValue(1)
    prismaMock.prisma.payment.count.mockResolvedValue(1)

    await expect(
      archiveSurgery(prismaMock.prisma as never, context, "surgery-1", {
        confirmationText: "confirmo eliminar",
        reason: "Duplicada",
      })
    ).rejects.toMatchObject({ code: "surgery_archive_blocked_by_fiscal_documents" })
  })

  it("sets archive fields and writes audit event", async () => {
    const result = await archiveSurgery(prismaMock.prisma as never, context, "surgery-1", {
      confirmationText: "confirmo eliminar",
      reason: "Duplicada por carga inicial",
    })

    expect(prismaMock.tx.surgery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "surgery-1", companyId: "company-1", archivedAt: null },
        data: expect.objectContaining({
          archivedById: "user-1",
          archiveReason: "Duplicada por carga inicial",
          archivePolicySnapshot: expect.objectContaining({
            policy: expect.objectContaining({ canArchive: true }),
          }),
        }),
      })
    )
    expect(prismaMock.tx.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "surgery.archived" }),
      })
    )
    expect(result?.archivedAt).toBeInstanceOf(Date)
  })
})
