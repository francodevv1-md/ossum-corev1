import type { Prisma, PrismaClient } from "@prisma/client"

export const COORDINATION_BOOTSTRAP_NAMES = ["Nelson DEV", "Ezequiel DEV"] as const
export const COORDINATION_BOOTSTRAP_ROLE = "coordinator"
export const COORDINATION_BOOTSTRAP_SURGERY_COUNT = 21

type BootstrapClient = PrismaClient | Prisma.TransactionClient

export type CoordinationBootstrapResult = {
  outcome: "created" | "noop"
  aggregates: {
    contacts: 2
    nelsonAssigned: 8
    ezequielAssigned: 8
    unassigned: 5
  }
}

type Snapshot = {
  eligibleLinks: Array<{
    contactId: string
    role: string | null
    isActive: boolean
    contact: {
      id: string
      legalName: string | null
      isCompany: boolean
      isActive: boolean
    }
  }>
  exactNameContacts: Array<{
    id: string
    legalName: string | null
    isCompany: boolean
    isActive: boolean
    companyLinks: Array<{ companyId: string; role: string | null; isActive: boolean }>
  }>
  coordinatorAssignments: Array<{
    surgeryId: string
    contactId: string
    role: string
    isPrimary: boolean
  }>
}

function fail(): never {
  throw new Error("COORDINATION_BOOTSTRAP_MISMATCH")
}

function canonicalIds(ids: readonly string[]) {
  if (
    ids.length !== COORDINATION_BOOTSTRAP_SURGERY_COUNT ||
    ids.some((id) => !id || id.trim() !== id) ||
    new Set(ids).size !== ids.length
  ) {
    fail()
  }

  const sorted = [...ids].sort((a, b) => a.localeCompare(b))
  if (sorted.some((id, index) => id !== ids[index])) {
    fail()
  }
  return sorted
}

function expectedMap(ids: readonly string[], contactIds: Record<(typeof COORDINATION_BOOTSTRAP_NAMES)[number], string>) {
  return new Map([
    ...ids.slice(0, 8).map((surgeryId) => [surgeryId, contactIds["Nelson DEV"]] as const),
    ...ids.slice(8, 16).map((surgeryId) => [surgeryId, contactIds["Ezequiel DEV"]] as const),
  ])
}

export function classifyCoordinationBootstrapState(snapshot: Snapshot, surgeryIdsInput: readonly string[]) {
  const surgeryIds = canonicalIds(surgeryIdsInput)
  const baselineSet = new Set(surgeryIds)

  if (snapshot.coordinatorAssignments.some((row) => !baselineSet.has(row.surgeryId))) {
    fail()
  }

  const empty =
    snapshot.eligibleLinks.length === 0 &&
    snapshot.exactNameContacts.length === 0 &&
    snapshot.coordinatorAssignments.length === 0
  if (empty) return { state: "empty" as const }

  if (snapshot.eligibleLinks.length !== 2 || snapshot.exactNameContacts.length !== 2) fail()

  const contactIds = {} as Record<(typeof COORDINATION_BOOTSTRAP_NAMES)[number], string>
  for (const name of COORDINATION_BOOTSTRAP_NAMES) {
    const contacts = snapshot.exactNameContacts.filter((contact) => contact.legalName === name)
    if (contacts.length !== 1) fail()
    const contact = contacts[0]
    const exactLinks = contact.companyLinks.filter(
      (link) => link.isActive && link.role === COORDINATION_BOOTSTRAP_ROLE
    )
    if (!contact.isActive || contact.isCompany || exactLinks.length !== 1 || contact.companyLinks.length !== 1) fail()
    const eligible = snapshot.eligibleLinks.filter(
      (link) => link.contactId === contact.id && link.contact.legalName === name
    )
    if (eligible.length !== 1) fail()
    contactIds[name] = contact.id
  }

  const expected = expectedMap(surgeryIds, contactIds)
  if (snapshot.coordinatorAssignments.length !== 16) fail()
  const seen = new Set<string>()
  for (const assignment of snapshot.coordinatorAssignments) {
    if (
      assignment.role !== COORDINATION_BOOTSTRAP_ROLE ||
      assignment.isPrimary !== true ||
      expected.get(assignment.surgeryId) !== assignment.contactId ||
      seen.has(assignment.surgeryId)
    ) {
      fail()
    }
    seen.add(assignment.surgeryId)
  }
  if (seen.size !== expected.size) fail()

  return { state: "final" as const, contactIds }
}

async function readSnapshot(tx: BootstrapClient, companyId: string, surgeryIds: readonly string[]): Promise<Snapshot> {
  const [eligibleLinks, exactNameContacts, coordinatorAssignments] = await Promise.all([
    tx.contactCompanyLink.findMany({
      where: {
        companyId,
        role: COORDINATION_BOOTSTRAP_ROLE,
        isActive: true,
        contact: { isActive: true, isCompany: false },
      },
      select: {
        contactId: true,
        role: true,
        isActive: true,
        contact: { select: { id: true, legalName: true, isCompany: true, isActive: true } },
      },
    }),
    tx.contact.findMany({
      where: { legalName: { in: [...COORDINATION_BOOTSTRAP_NAMES] } },
      select: {
        id: true,
        legalName: true,
        isCompany: true,
        isActive: true,
        companyLinks: { select: { companyId: true, role: true, isActive: true } },
      },
    }),
    tx.surgeryContactAssignment.findMany({
      where: { surgeryId: { in: [...surgeryIds] }, role: COORDINATION_BOOTSTRAP_ROLE },
      select: { surgeryId: true, contactId: true, role: true, isPrimary: true },
    }),
  ])
  return { eligibleLinks, exactNameContacts, coordinatorAssignments }
}

export async function bootstrapCoordinationDevPreview(
  prisma: PrismaClient,
  input: { companyId: string; baselineSurgeryIds: readonly string[] }
): Promise<CoordinationBootstrapResult> {
  const surgeryIds = canonicalIds(input.baselineSurgeryIds)
  if (
    process.env.OSSUM_DEPLOYMENT_TIER !== "development" ||
    !input.companyId ||
    process.env.OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID !== input.companyId
  ) {
    fail()
  }

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({
      where: { id: input.companyId },
      select: {
        id: true,
        name: true,
        isActive: true,
        organization: { select: { slug: true, isActive: true } },
      },
    })
    if (
      !company || company.id !== input.companyId || !company.isActive || company.name !== "Districorr DEV" ||
      !company.organization.isActive || company.organization.slug !== "ossum-dev"
    ) fail()

    const currentIds = (await tx.surgery.findMany({
      where: { companyId: input.companyId, archivedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })).map((row) => row.id)
    if (currentIds.length !== surgeryIds.length || currentIds.some((id, index) => id !== surgeryIds[index])) fail()

    const before = classifyCoordinationBootstrapState(await readSnapshot(tx, input.companyId, surgeryIds), surgeryIds)
    if (before.state === "final") {
      return {
        outcome: "noop",
        aggregates: { contacts: 2, nelsonAssigned: 8, ezequielAssigned: 8, unassigned: 5 },
      }
    }

    const contactIds = {} as Record<(typeof COORDINATION_BOOTSTRAP_NAMES)[number], string>
    for (const name of COORDINATION_BOOTSTRAP_NAMES) {
      const contact = await tx.contact.create({
        data: { legalName: name, isCompany: false, isActive: true },
        select: { id: true },
      })
      contactIds[name] = contact.id
      await tx.contactCompanyLink.create({
        data: { contactId: contact.id, companyId: input.companyId, role: COORDINATION_BOOTSTRAP_ROLE, isActive: true },
      })
    }

    const assignments = [...expectedMap(surgeryIds, contactIds)].map(([surgeryId, contactId]) => ({
      surgeryId,
      contactId,
      role: COORDINATION_BOOTSTRAP_ROLE,
      isPrimary: true,
    }))
    await tx.surgeryContactAssignment.createMany({ data: assignments })

    const after = classifyCoordinationBootstrapState(await readSnapshot(tx, input.companyId, surgeryIds), surgeryIds)
    if (after.state !== "final") fail()

    return {
      outcome: "created",
      aggregates: { contacts: 2, nelsonAssigned: 8, ezequielAssigned: 8, unassigned: 5 },
    }
  }, { isolationLevel: "Serializable" })
}
