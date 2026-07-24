import { describe, expect, it, vi } from "vitest"

import { backfillSurgeryVisibleNumbers } from "@/lib/services/surgery-visible-number-backfill.service"

function createPrismaMock() {
  return {
    surgery: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}

function surgeryRow(
  id: string,
  visibleNumber: string | null,
  createdAt: string,
  companyId = "company-1"
) {
  return {
    id,
    companyId,
    visibleNumber,
    createdAt: new Date(createdAt),
  }
}

describe("backfillSurgeryVisibleNumbers", () => {
  it("plans canonical CX numbers after current company max without mutating in dry-run", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      surgeryRow("valid-1", "CX-0007", "2026-01-01T00:00:00Z"),
      surgeryRow("missing-1", null, "2026-01-02T00:00:00Z"),
      surgeryRow("invalid-1", "AUT-001", "2026-01-03T00:00:00Z"),
      surgeryRow("valid-2", "CX-0010", "2026-01-04T00:00:00Z"),
      surgeryRow("invalid-2", "CX-DEV-2026-0001", "2026-01-05T00:00:00Z"),
    ])

    const result = await backfillSurgeryVisibleNumbers(prisma as never, "company-1")

    expect(prisma.surgery.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      select: { id: true, companyId: true, visibleNumber: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    expect(result.mode).toBe("dry-run")
    expect(result.maxExistingSequence).toBe(10)
    expect(result.plannedChanges).toEqual([
      expect.objectContaining({
        id: "missing-1",
        oldVisibleNumber: null,
        newVisibleNumber: "CX-0011",
      }),
      expect.objectContaining({
        id: "invalid-1",
        oldVisibleNumber: "AUT-001",
        newVisibleNumber: "CX-0012",
      }),
      expect.objectContaining({
        id: "invalid-2",
        oldVisibleNumber: "CX-DEV-2026-0001",
        newVisibleNumber: "CX-0013",
      }),
    ])
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("reports duplicate valid CX numbers as conflicts and plans repairs for non-kept duplicates", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      surgeryRow("valid-1", "CX-0007", "2026-01-01T00:00:00Z"),
      surgeryRow("valid-2", "CX-0007", "2026-01-02T00:00:00Z"),
      surgeryRow("invalid-1", "cmr123technical", "2026-01-03T00:00:00Z"),
    ])

    const result = await backfillSurgeryVisibleNumbers(prisma as never, "company-1")

    expect(result.conflicts).toEqual([
      { visibleNumber: "CX-0007", surgeryIds: ["valid-1", "valid-2"] },
    ])
    expect(result.plannedChanges).toEqual([
      expect.objectContaining({
        id: "valid-2",
        oldVisibleNumber: "CX-0007",
        newVisibleNumber: "CX-0008",
      }),
      expect.objectContaining({
        id: "invalid-1",
        oldVisibleNumber: "cmr123technical",
        newVisibleNumber: "CX-0009",
      }),
    ])
    expect(result.plannedChanges.map((change) => change.id)).not.toContain("valid-1")
  })

  it("keeps the earliest duplicate canonical CX number and plans the rest after max existing sequence", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      surgeryRow("surgery-1", "CX-0001", "2026-01-01T00:00:00Z"),
      surgeryRow("surgery-2", "CX-0001", "2026-01-02T00:00:00Z"),
      surgeryRow("surgery-3", "CX-0001", "2026-01-03T00:00:00Z"),
      surgeryRow("surgery-4", "CX-0001", "2026-01-04T00:00:00Z"),
      surgeryRow("surgery-5", "CX-0001", "2026-01-05T00:00:00Z"),
    ])

    const result = await backfillSurgeryVisibleNumbers(
      prisma as never,
      "codevdistricorr1000000000"
    )

    expect(result.maxExistingSequence).toBe(1)
    expect(result.conflicts).toEqual([
      {
        visibleNumber: "CX-0001",
        surgeryIds: ["surgery-1", "surgery-2", "surgery-3", "surgery-4", "surgery-5"],
      },
    ])
    expect(result.plannedChanges).toEqual([
      expect.objectContaining({
        id: "surgery-2",
        oldVisibleNumber: "CX-0001",
        newVisibleNumber: "CX-0002",
      }),
      expect.objectContaining({
        id: "surgery-3",
        oldVisibleNumber: "CX-0001",
        newVisibleNumber: "CX-0003",
      }),
      expect.objectContaining({
        id: "surgery-4",
        oldVisibleNumber: "CX-0001",
        newVisibleNumber: "CX-0004",
      }),
      expect.objectContaining({
        id: "surgery-5",
        oldVisibleNumber: "CX-0001",
        newVisibleNumber: "CX-0005",
      }),
    ])
    expect(result.plannedChanges.map((change) => change.id)).not.toContain("surgery-1")
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("applies only planned invalid records and includes old/new visible numbers", async () => {
    const prisma = createPrismaMock()
    prisma.surgery.findMany.mockResolvedValueOnce([
      surgeryRow("valid-1", "CX-0010", "2026-01-01T00:00:00Z"),
      surgeryRow("empty-1", "", "2026-01-02T00:00:00Z"),
      surgeryRow("invalid-1", "AUT-001", "2026-01-03T00:00:00Z"),
    ])
    prisma.$transaction.mockImplementationOnce(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma))
    prisma.surgery.updateMany.mockResolvedValue({ count: 1 })

    const result = await backfillSurgeryVisibleNumbers(prisma as never, "company-1", {
      apply: true,
    })

    expect(result.mode).toBe("apply")
    expect(prisma.surgery.updateMany).toHaveBeenCalledTimes(2)
    expect(prisma.surgery.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "empty-1", companyId: "company-1", visibleNumber: "" },
      data: { visibleNumber: "CX-0011" },
    })
    expect(prisma.surgery.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "invalid-1", companyId: "company-1", visibleNumber: "AUT-001" },
      data: { visibleNumber: "CX-0012" },
    })
    expect(result.updated).toEqual([
      expect.objectContaining({
        id: "empty-1",
        oldVisibleNumber: "",
        newVisibleNumber: "CX-0011",
      }),
      expect.objectContaining({
        id: "invalid-1",
        oldVisibleNumber: "AUT-001",
        newVisibleNumber: "CX-0012",
      }),
    ])
  })

  it("requires explicit company scope", async () => {
    const prisma = createPrismaMock()

    await expect(backfillSurgeryVisibleNumbers(prisma as never, " ")).rejects.toThrow(
      "companyId is required"
    )
    expect(prisma.surgery.findMany).not.toHaveBeenCalled()
  })
})
