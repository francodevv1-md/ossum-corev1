import { describe, expect, it, vi } from "vitest"

import {
  EZEQUIEL_DEV_AUTH_EMAIL,
  EzequielProvisioningError,
  classifyEzequielProvisioningState,
  provisionEzequielDevAuth,
  redactedProvisioningFailure,
  type EzequielProvisioningDependencies,
} from "@/lib/services/coordination-ezequiel-auth-provisioning.service"
import type { InspectorSnapshot } from "@/lib/services/coordination-ezequiel-auth-inspector.service"

const companyId = "company-dev-sensitive"
const contactId = "contact-sensitive"
const authId = "auth-sensitive"
const userId = "user-sensitive"
const password = "Aa1!temporary-password-sensitive-1234567890"
const surgeryIds = Array.from({ length: 21 }, (_, index) => `surgery-${String(index + 1).padStart(2, "0")}`)

function initialSnapshot(): InspectorSnapshot {
  const contact = {
    id: contactId,
    email: null,
    firstName: null,
    lastName: null,
    legalName: "Ezequiel DEV",
    isCompany: false,
    isActive: true,
    companyLinks: [{ companyId, role: "coordinator", isActive: true }],
  }
  return {
    configuredCompanyId: companyId,
    company: {
      id: companyId,
      name: "Districorr DEV",
      isActive: true,
      organization: { slug: "ossum-dev", isActive: true },
    },
    authIdentities: [],
    internalUsers: [],
    exactContacts: [contact],
    eligibleCoordinatorContacts: [contact],
    activeSurgeryIds: surgeryIds,
    assignments: surgeryIds.slice(8, 16).map((surgeryId) => ({
      surgeryId,
      contactId,
      role: "coordinator",
    })),
  }
}

function provisionedSnapshot(): InspectorSnapshot {
  const snapshot = initialSnapshot()
  snapshot.authIdentities = [{
    id: authId,
    email: EZEQUIEL_DEV_AUTH_EMAIL,
    firstName: "Ezequiel",
    lastName: "DEV",
    displayName: "Ezequiel DEV",
  }]
  snapshot.internalUsers = [{
    id: userId,
    supabaseAuthId: authId,
    email: EZEQUIEL_DEV_AUTH_EMAIL,
    firstName: "Ezequiel",
    lastName: "DEV",
    isActive: true,
    companyAccess: [{ companyId, role: "coordinator", isActive: true }],
  }]
  return snapshot
}

function dependencies(): EzequielProvisioningDependencies & {
  cleanup: ReturnType<typeof vi.fn>
} {
  const cleanup = vi.fn().mockResolvedValue(undefined)
  return {
    cleanup,
    generateTemporaryPassword: vi.fn(() => password),
    prepareCredential: vi.fn().mockResolvedValue({ cleanup }),
    createAuthIdentity: vi.fn().mockResolvedValue({ id: authId }),
    createInternalLink: vi.fn().mockResolvedValue(undefined),
    deleteAuthIdentity: vi.fn().mockResolvedValue(undefined),
  }
}

describe("Ezequiel DEV Auth provisioning", () => {
  it("creates one confirmed synthetic identity and one transactional internal link", async () => {
    const deps = dependencies()
    const result = await provisionEzequielDevAuth(initialSnapshot(), deps)

    expect(result).toEqual({
      outcome: "created",
      statusCode: "PROVISIONED",
      counts: {
        authIdentities: 1,
        internalUsers: 1,
        activeCoordinatorAccesses: 1,
        exactContacts: 1,
        canonicalAssignments: 8,
      },
    })
    expect(deps.createAuthIdentity).toHaveBeenCalledWith({
      email: EZEQUIEL_DEV_AUTH_EMAIL,
      password,
      emailConfirmed: true,
      metadata: { first_name: "Ezequiel", last_name: "DEV", full_name: "Ezequiel DEV" },
    })
    expect(deps.createInternalLink).toHaveBeenCalledWith(authId)
    expect(deps.deleteAuthIdentity).not.toHaveBeenCalled()
  })

  it("fails closed without writes when aggregate preflight differs", async () => {
    const snapshot = initialSnapshot()
    snapshot.assignments.pop()
    const deps = dependencies()

    await expect(provisionEzequielDevAuth(snapshot, deps)).rejects.toMatchObject({ statusCode: "PREFLIGHT_MISMATCH" })
    expect(deps.prepareCredential).not.toHaveBeenCalled()
    expect(deps.createAuthIdentity).not.toHaveBeenCalled()
  })

  it.each([
    ["duplicate contact", (snapshot: InspectorSnapshot) => snapshot.exactContacts.push({ ...snapshot.exactContacts[0], id: "duplicate" })],
    ["ambiguous resolver", (snapshot: InspectorSnapshot) => snapshot.eligibleCoordinatorContacts.push({ ...snapshot.eligibleCoordinatorContacts[0], id: "duplicate" })],
    ["duplicate auth", (snapshot: InspectorSnapshot) => snapshot.authIdentities.push(
      { id: "one", email: EZEQUIEL_DEV_AUTH_EMAIL, firstName: "Ezequiel", lastName: "DEV", displayName: null },
      { id: "two", email: EZEQUIEL_DEV_AUTH_EMAIL, firstName: "Ezequiel", lastName: "DEV", displayName: null }
    )],
  ])("rejects %s before mutation", async (_label, mutate) => {
    const snapshot = initialSnapshot()
    mutate(snapshot)
    const deps = dependencies()
    await expect(provisionEzequielDevAuth(snapshot, deps)).rejects.toBeInstanceOf(EzequielProvisioningError)
    expect(deps.createAuthIdentity).not.toHaveBeenCalled()
  })

  it("deletes only the newly created Auth identity and credential after DB failure", async () => {
    const deps = dependencies()
    deps.createInternalLink = vi.fn().mockRejectedValue(new Error("sensitive DB detail"))

    await expect(provisionEzequielDevAuth(initialSnapshot(), deps)).rejects.toMatchObject({ statusCode: "INTERNAL_LINK_FAILED" })
    expect(deps.deleteAuthIdentity).toHaveBeenCalledTimes(1)
    expect(deps.deleteAuthIdentity).toHaveBeenCalledWith(authId)
    expect(deps.cleanup).toHaveBeenCalledTimes(1)
  })

  it("removes the credential and performs no DB write when Auth creation fails", async () => {
    const deps = dependencies()
    deps.createAuthIdentity = vi.fn().mockRejectedValue(new Error("sensitive Auth detail"))

    await expect(provisionEzequielDevAuth(initialSnapshot(), deps)).rejects.toMatchObject({ statusCode: "AUTH_CREATE_FAILED" })
    expect(deps.cleanup).toHaveBeenCalledTimes(1)
    expect(deps.createInternalLink).not.toHaveBeenCalled()
    expect(deps.deleteAuthIdentity).not.toHaveBeenCalled()
  })

  it("stops before Auth or DB mutation when ACL/credential preparation fails", async () => {
    const deps = dependencies()
    deps.prepareCredential = vi.fn().mockRejectedValue(new Error("ACL verification detail"))

    await expect(provisionEzequielDevAuth(initialSnapshot(), deps)).rejects.toMatchObject({ statusCode: "CREDENTIAL_PREPARATION_FAILED" })
    expect(deps.createAuthIdentity).not.toHaveBeenCalled()
    expect(deps.createInternalLink).not.toHaveBeenCalled()
  })

  it("redacts passwords, IDs and underlying errors from failure output", () => {
    const output = JSON.stringify(redactedProvisioningFailure(new Error(`${password}:${authId}:${contactId}`)))
    expect(output).toBe('{"outcome":"failed","statusCode":"PREFLIGHT_MISMATCH","secretOutput":false}')
    expect(output).not.toContain(password)
    expect(output).not.toContain(authId)
    expect(output).not.toContain(contactId)
  })

  it("is a strict no-op on an exact provisioned rerun and never rotates credentials", async () => {
    const deps = dependencies()
    expect(classifyEzequielProvisioningState(provisionedSnapshot())).toBe("provisioned")
    const result = await provisionEzequielDevAuth(provisionedSnapshot(), deps)

    expect(result.outcome).toBe("noop")
    expect(result.statusCode).toBe("ALREADY_PROVISIONED")
    expect(deps.generateTemporaryPassword).not.toHaveBeenCalled()
    expect(deps.prepareCredential).not.toHaveBeenCalled()
    expect(deps.createAuthIdentity).not.toHaveBeenCalled()
    expect(deps.createInternalLink).not.toHaveBeenCalled()
  })
})
