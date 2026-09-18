import prisma from "@/lib/prisma"
import { mailStage1Repository } from "./repository"

export type MailStage1SurgeryReferenceStatus =
  | "resolved_by_id"
  | "resolved_by_visible_number"
  | "orphaned"

export type MailStage1OrphanLinkReportItem = {
  linkId: string
  companyId: string
  surgeryId: string
  surgeryLabel: string
  linkStatus: "active" | "unlinked"
  linkedAt: string
  conversationKey: string
  surgeryReferenceStatus: MailStage1SurgeryReferenceStatus
  normalizedSurgeryId?: string
  matchedVisibleNumber?: string
  linkedByUserId: string
  eventCount: number
}

export type MailStage1OrphanLinkReport = {
  companyId: string
  generatedAt: string
  totals: {
    totalLinks: number
    activeLinks: number
    unlinkedLinks: number
    resolvedById: number
    resolvedByVisibleNumber: number
    orphaned: number
  }
  links: MailStage1OrphanLinkReportItem[]
}

export type BuildMailStage1OrphanLinkReportOptions = {
  includeUnlinked?: boolean
}

type SurgeryLookup = {
  id: string
  visibleNumber: string | null
}

function buildSurgeryLookupMaps(rows: SurgeryLookup[]) {
  const byId = new Map<string, SurgeryLookup>()
  const byVisibleNumber = new Map<string, SurgeryLookup>()

  for (const row of rows) {
    byId.set(row.id, row)

    if (row.visibleNumber) {
      byVisibleNumber.set(row.visibleNumber, row)
    }
  }

  return { byId, byVisibleNumber }
}

export async function buildMailStage1OrphanLinkReport(
  companyId: string,
  options: BuildMailStage1OrphanLinkReportOptions = {}
): Promise<MailStage1OrphanLinkReport> {
  const document = await mailStage1Repository.getCompanyDocument(companyId)
  const includeUnlinked = options.includeUnlinked ?? false
  const links = Object.values(document.links)
    .filter((link) => includeUnlinked || link.linkStatus === "active")
    .sort((a, b) => b.linkedAt.localeCompare(a.linkedAt))

  const surgeryRefs = [...new Set(links.map((link) => link.surgeryId.trim()).filter(Boolean))]
  const surgeries = surgeryRefs.length
    ? await prisma.surgery.findMany({
        where: {
          companyId,
          OR: [
            { id: { in: surgeryRefs } },
            { visibleNumber: { in: surgeryRefs } },
          ],
        },
        select: {
          id: true,
          visibleNumber: true,
        },
      })
    : []

  const lookup = buildSurgeryLookupMaps(surgeries)
  const reportLinks: MailStage1OrphanLinkReportItem[] = links.map((link) => {
    const matchedById = lookup.byId.get(link.surgeryId)

    if (matchedById) {
      return {
        linkId: link.linkId,
        companyId: link.companyId,
        surgeryId: link.surgeryId,
        surgeryLabel: link.surgeryLabel,
        linkStatus: link.linkStatus,
        linkedAt: link.linkedAt,
        conversationKey: link.conversationKey,
        surgeryReferenceStatus: "resolved_by_id",
        normalizedSurgeryId: matchedById.id,
        linkedByUserId: link.linkedByUserId,
        eventCount: link.eventCount,
      }
    }

    const matchedByVisibleNumber = lookup.byVisibleNumber.get(link.surgeryId)

    if (matchedByVisibleNumber) {
      return {
        linkId: link.linkId,
        companyId: link.companyId,
        surgeryId: link.surgeryId,
        surgeryLabel: link.surgeryLabel,
        linkStatus: link.linkStatus,
        linkedAt: link.linkedAt,
        conversationKey: link.conversationKey,
        surgeryReferenceStatus: "resolved_by_visible_number",
        normalizedSurgeryId: matchedByVisibleNumber.id,
        matchedVisibleNumber: matchedByVisibleNumber.visibleNumber ?? undefined,
        linkedByUserId: link.linkedByUserId,
        eventCount: link.eventCount,
      }
    }

    return {
      linkId: link.linkId,
      companyId: link.companyId,
      surgeryId: link.surgeryId,
      surgeryLabel: link.surgeryLabel,
      linkStatus: link.linkStatus,
      linkedAt: link.linkedAt,
      conversationKey: link.conversationKey,
      surgeryReferenceStatus: "orphaned",
      linkedByUserId: link.linkedByUserId,
      eventCount: link.eventCount,
    }
  })

  return {
    companyId,
    generatedAt: new Date().toISOString(),
    totals: {
      totalLinks: reportLinks.length,
      activeLinks: reportLinks.filter((link) => link.linkStatus === "active").length,
      unlinkedLinks: reportLinks.filter((link) => link.linkStatus === "unlinked").length,
      resolvedById: reportLinks.filter((link) => link.surgeryReferenceStatus === "resolved_by_id").length,
      resolvedByVisibleNumber: reportLinks.filter(
        (link) => link.surgeryReferenceStatus === "resolved_by_visible_number"
      ).length,
      orphaned: reportLinks.filter((link) => link.surgeryReferenceStatus === "orphaned").length,
    },
    links: reportLinks,
  }
}
