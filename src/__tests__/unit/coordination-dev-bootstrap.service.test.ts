import { afterEach, describe, expect, it, vi } from "vitest"

import {
  classifyCoordinationBootstrapState,
  COORDINATION_BOOTSTRAP_NAMES,
  bootstrapCoordinationDevPreview,
} from "@/lib/services/coordination-dev-bootstrap.service"

const ids = Array.from({ length: 21 }, (_, index) => `surgery-${String(index + 1).padStart(2, "0")}`)

function finalSnapshot() {
  const contacts = COORDINATION_BOOTSTRAP_NAMES.map((legalName, index) => ({
    id: `contact-${index + 1}`,
    legalName,
    isCompany: false,
    isActive: true,
    companyLinks: [{ companyId: "company-dev", role: "coordinator", isActive: true }],
  }))
  return {
    eligibleLinks: contacts.map((contact) => ({
      contactId: contact.id,
      role: "coordinator",
      isActive: true,
      contact: { id: contact.id, legalName: contact.legalName, isCompany: false, isActive: true },
    })),
    exactNameContacts: contacts,
    coordinatorAssignments: ids.slice(0, 16).map((surgeryId, index) => ({
      surgeryId,
      contactId: index < 8 ? contacts[0].id : contacts[1].id,
      role: "coordinator",
      isPrimary: true,
    })),
  }
}

afterEach(() => {
  delete process.env.OSSUM_DEPLOYMENT_TIER
  delete process.env.OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID
})

describe("coordination DEV bootstrap state", () => {
  it("accepts only the exact empty baseline", () => {
    expect(classifyCoordinationBootstrapState({
      eligibleLinks: [], exactNameContacts: [], coordinatorAssignments: [],
    }, ids)).toEqual({ state: "empty" })
  })

  it("proves deterministic 8 / 8 / 5 final state and hypothetical rerun no-op", () => {
    const first = classifyCoordinationBootstrapState(finalSnapshot(), ids)
    const rerun = classifyCoordinationBootstrapState(finalSnapshot(), ids)
    expect(first.state).toBe("final")
    expect(rerun).toEqual(first)
  })

  it("returns an exact transactional no-op without any create/update/delete", async () => {
    process.env.OSSUM_DEPLOYMENT_TIER = "development"
    process.env.OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID = "company-dev"
    const snapshot = finalSnapshot()
    const tx = {
      company: {
        findUnique: vi.fn().mockResolvedValue({
          id: "company-dev",
          name: "Districorr DEV",
          isActive: true,
          organization: { slug: "ossum-dev", isActive: true },
        }),
      },
      surgery: { findMany: vi.fn().mockResolvedValue(ids.map((id) => ({ id }))) },
      contactCompanyLink: {
        findMany: vi.fn().mockResolvedValue(snapshot.eligibleLinks),
        create: vi.fn(),
      },
      contact: {
        findMany: vi.fn().mockResolvedValue(snapshot.exactNameContacts),
        create: vi.fn(),
      },
      surgeryContactAssignment: {
        findMany: vi.fn().mockResolvedValue(snapshot.coordinatorAssignments),
        createMany: vi.fn(),
      },
    }
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }

    const result = await bootstrapCoordinationDevPreview(prisma as never, {
      companyId: "company-dev",
      baselineSurgeryIds: ids,
    })

    expect(result).toEqual({
      outcome: "noop",
      aggregates: { contacts: 2, nelsonAssigned: 8, ezequielAssigned: 8, unassigned: 5 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.contact.create).not.toHaveBeenCalled()
    expect(tx.contactCompanyLink.create).not.toHaveBeenCalled()
    expect(tx.surgeryContactAssignment.createMany).not.toHaveBeenCalled()
  })

  it.each([
    ["wrong count", ids.slice(0, 20)],
    ["duplicate", [...ids.slice(0, 20), ids[0]]],
    ["unsorted", [ids[1], ids[0], ...ids.slice(2)]],
    ["empty", ["", ...ids.slice(1)]],
  ])("rejects a %s baseline", (_label, invalidIds) => {
    expect(() => classifyCoordinationBootstrapState({
      eligibleLinks: [], exactNameContacts: [], coordinatorAssignments: [],
    }, invalidIds)).toThrow("COORDINATION_BOOTSTRAP_MISMATCH")
  })

  it.each([
    ["partial assignment", (snapshot: ReturnType<typeof finalSnapshot>) => snapshot.coordinatorAssignments.pop()],
    ["changed partition", (snapshot: ReturnType<typeof finalSnapshot>) => { snapshot.coordinatorAssignments[0].contactId = "contact-2" }],
    ["wrong role", (snapshot: ReturnType<typeof finalSnapshot>) => { snapshot.coordinatorAssignments[0].role = "doctor" }],
    ["non-primary", (snapshot: ReturnType<typeof finalSnapshot>) => { snapshot.coordinatorAssignments[0].isPrimary = false }],
    ["duplicate identity", (snapshot: ReturnType<typeof finalSnapshot>) => { snapshot.exactNameContacts.push({ ...snapshot.exactNameContacts[0], id: "duplicate" }) }],
    ["foreign link", (snapshot: ReturnType<typeof finalSnapshot>) => { snapshot.exactNameContacts[0].companyLinks.push({ companyId: "foreign", role: "coordinator", isActive: true }) }],
  ])("rejects %s", (_label, mutate) => {
    const snapshot = finalSnapshot()
    mutate(snapshot)
    expect(() => classifyCoordinationBootstrapState(snapshot, ids)).toThrow("COORDINATION_BOOTSTRAP_MISMATCH")
  })
})
