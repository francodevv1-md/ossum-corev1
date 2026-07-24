import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCompanyDocument, findMany } = vi.hoisted(() => ({
  getCompanyDocument: vi.fn(),
  findMany: vi.fn(),
}))

vi.mock("@/lib/mail-stage1/repository", () => ({
  mailStage1Repository: {
    getCompanyDocument,
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    surgery: {
      findMany,
    },
  },
}))

import { buildMailStage1OrphanLinkReport } from "@/lib/mail-stage1/orphan-link-report"

describe("buildMailStage1OrphanLinkReport", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("classifies active links by canonical id, legacy visible number, and orphan state", async () => {
    getCompanyDocument.mockResolvedValue({
      version: 1,
      companyId: "company-1",
      conversations: {},
      links: {
        "link-id": {
          linkId: "link-id",
          companyId: "company-1",
          surgeryId: "surg-1",
          surgeryLabel: "Case 1",
          conversationKey: "conv-1",
          linkedAt: "2026-01-01T00:00:00.000Z",
          linkedByUserId: "user-1",
          linkStatus: "active",
          warningAcknowledged: false,
          knownLinkedSurgeryIdsAtLinkTime: [],
          eventLog: [],
          eventCount: 0,
        },
        "link-visible": {
          linkId: "link-visible",
          companyId: "company-1",
          surgeryId: "CX-9006",
          surgeryLabel: "Legacy visible number",
          conversationKey: "conv-2",
          linkedAt: "2026-01-02T00:00:00.000Z",
          linkedByUserId: "user-2",
          linkStatus: "active",
          warningAcknowledged: false,
          knownLinkedSurgeryIdsAtLinkTime: [],
          eventLog: [],
          eventCount: 1,
        },
        orphaned: {
          linkId: "orphaned",
          companyId: "company-1",
          surgeryId: "missing-case",
          surgeryLabel: "Missing case",
          conversationKey: "conv-3",
          linkedAt: "2026-01-03T00:00:00.000Z",
          linkedByUserId: "user-3",
          linkStatus: "active",
          warningAcknowledged: false,
          knownLinkedSurgeryIdsAtLinkTime: [],
          eventLog: [],
          eventCount: 2,
        },
      },
    })

    findMany.mockResolvedValue([
      { id: "surg-1", visibleNumber: null },
      { id: "surg-real-9006", visibleNumber: "CX-9006" },
    ])

    const report = await buildMailStage1OrphanLinkReport("company-1")

    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        companyId: "company-1",
      },
      select: {
        id: true,
        visibleNumber: true,
      },
    })

    const whereClause = findMany.mock.calls[0]?.[0]?.where as {
      OR: Array<{ id?: { in: string[] }; visibleNumber?: { in: string[] } }>
    }
    expect(whereClause.OR[0]?.id?.in).toEqual(expect.arrayContaining(["surg-1", "CX-9006", "missing-case"]))
    expect(whereClause.OR[1]?.visibleNumber?.in).toEqual(expect.arrayContaining(["surg-1", "CX-9006", "missing-case"]))

    expect(report.totals).toEqual({
      totalLinks: 3,
      activeLinks: 3,
      unlinkedLinks: 0,
      resolvedById: 1,
      resolvedByVisibleNumber: 1,
      orphaned: 1,
    })

    expect(report.links.map((link) => [link.linkId, link.surgeryReferenceStatus, link.normalizedSurgeryId])).toEqual([
      ["orphaned", "orphaned", undefined],
      ["link-visible", "resolved_by_visible_number", "surg-real-9006"],
      ["link-id", "resolved_by_id", "surg-1"],
    ])
  })

  it("skips unlinked links by default and can include them on demand", async () => {
    getCompanyDocument.mockResolvedValue({
      version: 1,
      companyId: "company-1",
      conversations: {},
      links: {
        active: {
          linkId: "active",
          companyId: "company-1",
          surgeryId: "surg-1",
          surgeryLabel: "Active case",
          conversationKey: "conv-1",
          linkedAt: "2026-01-01T00:00:00.000Z",
          linkedByUserId: "user-1",
          linkStatus: "active",
          warningAcknowledged: false,
          knownLinkedSurgeryIdsAtLinkTime: [],
          eventLog: [],
          eventCount: 0,
        },
        unlinked: {
          linkId: "unlinked",
          companyId: "company-1",
          surgeryId: "ghost",
          surgeryLabel: "Old case",
          conversationKey: "conv-2",
          linkedAt: "2026-01-02T00:00:00.000Z",
          linkedByUserId: "user-2",
          linkStatus: "unlinked",
          warningAcknowledged: false,
          knownLinkedSurgeryIdsAtLinkTime: [],
          eventLog: [],
          eventCount: 0,
        },
      },
    })

    findMany.mockResolvedValue([{ id: "surg-1", visibleNumber: null }])

    const activeOnlyReport = await buildMailStage1OrphanLinkReport("company-1")
    const fullReport = await buildMailStage1OrphanLinkReport("company-1", { includeUnlinked: true })

    expect(activeOnlyReport.links).toHaveLength(1)
    expect(activeOnlyReport.totals.unlinkedLinks).toBe(0)
    expect(fullReport.links).toHaveLength(2)
    expect(fullReport.totals.unlinkedLinks).toBe(1)
    expect(fullReport.links[0]).toMatchObject({
      linkId: "unlinked",
      surgeryReferenceStatus: "orphaned",
      linkStatus: "unlinked",
    })
  })
})
