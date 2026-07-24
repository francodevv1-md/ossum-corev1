import { beforeEach, describe, expect, it, vi } from "vitest"

import { getSurgeryDeletionPreview } from "@/lib/services/surgery.service"

function buildPrismaMock() {
  return {
    surgery: {
      findFirst: vi.fn(),
    },
    presupuesto: { count: vi.fn() },
    remito: { count: vi.fn() },
    consumo: { count: vi.fn() },
    devolucion: { count: vi.fn() },
    invoice: { count: vi.fn() },
    payment: { count: vi.fn() },
    digitalReceipt: { count: vi.fn() },
    seguimientoEntry: { count: vi.fn() },
    internalNotification: { count: vi.fn() },
  }
}

function mockSurgery() {
  return {
    id: "surgery-1",
    visibleNumber: "CX-0042",
    archivedAt: null,
    patient: {
      firstName: "Ada",
      lastName: "Lovelace",
      legalName: null,
    },
    institution: {
      firstName: null,
      lastName: null,
      legalName: "Hospital Central",
    },
  }
}

describe("getSurgeryDeletionPreview", () => {
  let prismaMock: ReturnType<typeof buildPrismaMock>

  beforeEach(() => {
    prismaMock = buildPrismaMock()
    prismaMock.surgery.findFirst.mockResolvedValue(mockSurgery())

    for (const delegate of [
      prismaMock.presupuesto,
      prismaMock.remito,
      prismaMock.consumo,
      prismaMock.devolucion,
      prismaMock.invoice,
      prismaMock.payment,
      prismaMock.digitalReceipt,
      prismaMock.seguimientoEntry,
      prismaMock.internalNotification,
    ]) {
      delegate.count.mockResolvedValue(0)
    }
  })

  it("allows delete when the surgery has no linked documents", async () => {
    const preview = await getSurgeryDeletionPreview(
      prismaMock as never,
      { companyId: "company-1" },
      "surgery-1"
    )

    expect(prismaMock.surgery.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "surgery-1", companyId: "company-1" },
      })
    )
    expect(preview?.surgery).toEqual({
      id: "surgery-1",
      visibleNumber: "CX-0042",
      patientName: "Ada Lovelace",
      institutionName: "Hospital Central",
    })
    expect(preview?.policy).toEqual({
      recommendedAction: "delete",
      canDelete: true,
      canArchive: true,
      blockedReasons: [],
      requiresHighPrivilege: false,
      hasFiscalDocuments: false,
      hasOperationalDocuments: false,
      confirmationText: "confirmo eliminar",
    })
  })

  it("recommends archive when operational documents exist without fiscal documents", async () => {
    prismaMock.remito.count.mockResolvedValue(2)
    prismaMock.seguimientoEntry.count.mockResolvedValue(1)

    const preview = await getSurgeryDeletionPreview(
      prismaMock as never,
      { companyId: "company-1" },
      "surgery-1"
    )

    expect(preview?.dependencies.remitos).toBe(2)
    expect(preview?.dependencies.seguimientoEntries).toBe(1)
    expect(preview?.policy).toEqual(
      expect.objectContaining({
        recommendedAction: "archive",
        canDelete: false,
        canArchive: true,
        requiresHighPrivilege: false,
        hasFiscalDocuments: false,
        hasOperationalDocuments: true,
      })
    )
  })

  it("blocks delete and archive when fiscal documents exist", async () => {
    prismaMock.invoice.count.mockResolvedValue(1)
    prismaMock.payment.count.mockResolvedValue(1)

    const preview = await getSurgeryDeletionPreview(
      prismaMock as never,
      { companyId: "company-1" },
      "surgery-1"
    )

    expect(preview?.policy).toEqual(
      expect.objectContaining({
        recommendedAction: "blocked",
        canDelete: false,
        canArchive: false,
        requiresHighPrivilege: true,
        hasFiscalDocuments: true,
      })
    )
    expect(preview?.policy.blockedReasons).toEqual([
      "La cirugía tiene facturas vinculadas.",
      "La cirugía tiene cobros vinculados.",
    ])
  })

  it("blocks delete and archive when surgery is already archived", async () => {
    prismaMock.surgery.findFirst.mockResolvedValue({
      ...mockSurgery(),
      archivedAt: new Date("2026-07-08T01:00:00.000Z"),
    })

    const preview = await getSurgeryDeletionPreview(
      prismaMock as never,
      { companyId: "company-1" },
      "surgery-1"
    )

    expect(preview?.policy).toEqual(
      expect.objectContaining({
        recommendedAction: "blocked",
        canDelete: false,
        canArchive: false,
      })
    )
    expect(preview?.policy.blockedReasons).toContain("La cirugía ya está archivada.")
  })
})
