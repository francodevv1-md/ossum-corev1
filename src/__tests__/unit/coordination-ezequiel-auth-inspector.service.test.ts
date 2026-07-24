import { describe, expect, it } from "vitest"

import {
  EZEQUIEL_AUTH_INSPECTOR_PROJECT_REF,
  authIdentityMatchesTarget,
  evaluateEzequielInspectorProvenance,
  inspectEzequielAuthSnapshot,
  remoteReadFailureResult,
  type InspectorSnapshot,
} from "@/lib/services/coordination-ezequiel-auth-inspector.service"

const companyId = "company-dev"
const authId = "auth-id-sensitive"
const userId = "user-id-sensitive"
const contactId = "contact-id-sensitive"
const email = "ezequiel.private@example.test"
const surgeryIds = Array.from({ length: 21 }, (_, index) => `surgery-${String(index + 1).padStart(2, "0")}`)

function validSnapshot(): InspectorSnapshot {
  const exactContact = {
    id: contactId,
    email,
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
    authIdentities: [{
      id: authId,
      email,
      firstName: "Ezequiel",
      lastName: "DEV",
      displayName: null,
    }],
    internalUsers: [{
      id: userId,
      supabaseAuthId: authId,
      email,
      firstName: "Ezequiel",
      lastName: "DEV",
      isActive: true,
      companyAccess: [{ companyId, role: "coordinator", isActive: true }],
    }],
    exactContacts: [exactContact],
    eligibleCoordinatorContacts: [exactContact],
    activeSurgeryIds: surgeryIds,
    assignments: surgeryIds.slice(8, 16).map((surgeryId) => ({
      surgeryId,
      contactId,
      role: "coordinator",
    })),
  }
}

describe("Ezequiel DEV auth inspector", () => {
  it("fails closed before remote access when provenance is missing or mismatched", () => {
    const missing = evaluateEzequielInspectorProvenance({})
    expect(missing).toMatchObject({
      provenanceGate: "FAIL",
      remoteExecution: "NOT_RUN",
      decision: "NO-GO",
    })
    expect(missing.statusCodes).toContain("PROVENANCE_TIER_REJECTED")

    const mismatch = evaluateEzequielInspectorProvenance({
      OSSUM_DEPLOYMENT_TIER: "development",
      OSSUM_ENABLE_COORDINATOR_PREVIEW: "true",
      OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID: companyId,
      SUPABASE_URL: "https://wrong.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
      DATABASE_URL: "postgresql://postgres.wrong:secret@pooler.supabase.com/postgres",
    })
    expect(mismatch.statusCodes).toEqual(expect.arrayContaining([
      "PROVENANCE_SUPABASE_PROJECT_MISMATCH",
      "PROVENANCE_DATABASE_PROJECT_MISMATCH",
    ]))
    expect(mismatch.remoteExecution).toBe("NOT_RUN")
  })

  it("accepts only the exact approved DEV project mapping without disclosing values", () => {
    const result = evaluateEzequielInspectorProvenance({
      OSSUM_DEPLOYMENT_TIER: "development",
      OSSUM_ENABLE_COORDINATOR_PREVIEW: "true",
      OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID: companyId,
      SUPABASE_URL: `https://${EZEQUIEL_AUTH_INSPECTOR_PROJECT_REF}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: "secret-sensitive",
      DATABASE_URL: `postgresql://postgres.${EZEQUIEL_AUTH_INSPECTOR_PROJECT_REF}:password-sensitive@pooler.supabase.com/postgres`,
    })
    expect(result).toMatchObject({
      provenanceGate: "PASS",
      remoteExecution: "NOT_RUN",
      decision: "NO-GO",
      statusCodes: ["PROVENANCE_OK"],
    })
    const output = JSON.stringify(result)
    expect(output).not.toContain(companyId)
    expect(output).not.toContain("secret-sensitive")
    expect(output).not.toContain(EZEQUIEL_AUTH_INSPECTOR_PROJECT_REF)
  })

  it("returns GO only for the unique exact auth/user/access/contact/link/resolution/canonical-8 state", () => {
    const result = inspectEzequielAuthSnapshot(validSnapshot())
    expect(result).toMatchObject({
      provenanceGate: "PASS",
      remoteExecution: "COMPLETED",
      decision: "GO",
      counts: {
        authIdentities: 1,
        internalUsers: 1,
        activeExactAccesses: 1,
        exactContacts: 1,
        activeExactContactLinks: 1,
        personalResolutionMatches: 1,
        activeSurgeries: 21,
        activeCoordinatorAssignments: 8,
        expectedCoordinatorAssignments: 8,
      },
    })
    expect(result.statusCodes).toEqual(expect.arrayContaining([
      "AUTH_LINK_MATCH",
      "ACCESS_EXACT_ACTIVE_COORDINATOR",
      "PERSONAL_RESOLUTION_RESOLVED",
      "ASSIGNMENTS_CANONICAL_8",
    ]))
  })

  it.each([
    ["missing auth", (snapshot: InspectorSnapshot) => { snapshot.authIdentities = [] }, "AUTH_IDENTITY_MISSING"],
    ["duplicate auth", (snapshot: InspectorSnapshot) => { snapshot.authIdentities.push({ ...snapshot.authIdentities[0], id: "duplicate-auth" }) }, "AUTH_IDENTITY_MULTIPLE"],
    ["missing user", (snapshot: InspectorSnapshot) => { snapshot.internalUsers = [] }, "INTERNAL_USER_MISSING"],
    ["duplicate user", (snapshot: InspectorSnapshot) => { snapshot.internalUsers.push({ ...snapshot.internalUsers[0], id: "duplicate-user" }) }, "INTERNAL_USER_MULTIPLE"],
    ["auth mismatch", (snapshot: InspectorSnapshot) => { snapshot.internalUsers[0].supabaseAuthId = "other-auth" }, "AUTH_LINK_MISMATCH"],
    ["role mismatch", (snapshot: InspectorSnapshot) => { snapshot.internalUsers[0].companyAccess[0].role = "admin" }, "ACCESS_MISMATCH"],
    ["missing contact", (snapshot: InspectorSnapshot) => { snapshot.exactContacts = [] }, "CONTACT_MISSING"],
    ["duplicate contact", (snapshot: InspectorSnapshot) => { snapshot.exactContacts.push({ ...snapshot.exactContacts[0], id: "duplicate-contact" }) }, "CONTACT_MULTIPLE"],
    ["inactive contact", (snapshot: InspectorSnapshot) => { snapshot.exactContacts[0].isActive = false }, "CONTACT_MISMATCH"],
    ["unresolved personal identity", (snapshot: InspectorSnapshot) => { snapshot.internalUsers[0].email = "other@example.test"; snapshot.internalUsers[0].firstName = "Other" }, "PERSONAL_RESOLUTION_UNRESOLVED"],
    ["assignment mismatch", (snapshot: InspectorSnapshot) => { snapshot.assignments.pop() }, "ASSIGNMENTS_MISMATCH"],
  ])("fails closed for %s", (_label, mutate, code) => {
    const snapshot = validSnapshot()
    mutate(snapshot)
    const result = inspectEzequielAuthSnapshot(snapshot)
    expect(result.decision).toBe("NO-GO")
    expect(result.statusCodes).toContain(code)
  })

  it("detects exact normalized Auth metadata or internal email without exposing either", () => {
    expect(authIdentityMatchesTarget({
      id: authId,
      email: null,
      firstName: "Ezéquiel",
      lastName: "  DEV ",
      displayName: null,
    }, [])).toBe(true)
    expect(authIdentityMatchesTarget({
      id: authId,
      email: ` ${email.toUpperCase()} `,
      firstName: null,
      lastName: null,
      displayName: null,
    }, [email])).toBe(true)
  })

  it("redacts all PII, IDs, credentials and remote error details from every result", () => {
    const outputs = [
      inspectEzequielAuthSnapshot(validSnapshot()),
      remoteReadFailureResult(),
    ].map((result) => JSON.stringify(result)).join("\n")
    for (const sensitive of [authId, userId, contactId, companyId, email, "surgery-09"]) {
      expect(outputs).not.toContain(sensitive)
    }
    expect(outputs).toContain('"target":"Ezequiel DEV"')
    expect(outputs).toContain("REMOTE_READ_FAILED")
  })
})
