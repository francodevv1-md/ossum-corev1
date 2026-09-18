export const EZEQUIEL_AUTH_INSPECTOR_TARGET = "Ezequiel DEV" as const
export const EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS = 8 as const
export const EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ACTIVE_SURGERIES = 21 as const
export const EZEQUIEL_AUTH_INSPECTOR_PROJECT_REF = "yywqcdromnmmelijvspi" as const

type InspectorEnvironment = {
  OSSUM_DEPLOYMENT_TIER?: string
  OSSUM_ENABLE_COORDINATOR_PREVIEW?: string
  OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  DATABASE_URL?: string
}

export type InspectorAuthIdentity = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  displayName: string | null
}

export type InspectorInternalUser = {
  id: string
  supabaseAuthId: string | null
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  companyAccess: Array<{ companyId: string; role: string; isActive: boolean }>
}

export type InspectorContact = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  legalName: string | null
  isCompany: boolean
  isActive: boolean
  companyLinks: Array<{ companyId: string; role: string | null; isActive: boolean }>
}

export type InspectorAssignment = {
  surgeryId: string
  contactId: string
  role: string
}

export type InspectorSnapshot = {
  configuredCompanyId: string
  company: {
    id: string
    name: string
    isActive: boolean
    organization: { slug: string; isActive: boolean }
  } | null
  authIdentities: InspectorAuthIdentity[]
  internalUsers: InspectorInternalUser[]
  exactContacts: InspectorContact[]
  eligibleCoordinatorContacts: InspectorContact[]
  activeSurgeryIds: string[]
  assignments: InspectorAssignment[]
}

export type InspectorStatusCode =
  | "PROVENANCE_OK"
  | "PROVENANCE_TIER_REJECTED"
  | "PROVENANCE_PREVIEW_REJECTED"
  | "PROVENANCE_COMPANY_ID_MISSING"
  | "PROVENANCE_SUPABASE_CREDENTIAL_MISSING"
  | "PROVENANCE_SUPABASE_PROJECT_MISMATCH"
  | "PROVENANCE_DATABASE_CREDENTIAL_MISSING"
  | "PROVENANCE_DATABASE_PROJECT_MISMATCH"
  | "COMPANY_EXACT_DEV_OK"
  | "COMPANY_EXACT_DEV_MISMATCH"
  | "AUTH_IDENTITY_UNIQUE"
  | "AUTH_IDENTITY_MISSING"
  | "AUTH_IDENTITY_MULTIPLE"
  | "INTERNAL_USER_UNIQUE"
  | "INTERNAL_USER_MISSING"
  | "INTERNAL_USER_MULTIPLE"
  | "INTERNAL_USER_ACTIVE"
  | "INTERNAL_USER_INACTIVE"
  | "AUTH_LINK_MATCH"
  | "AUTH_LINK_MISMATCH"
  | "ACCESS_EXACT_ACTIVE_COORDINATOR"
  | "ACCESS_MISMATCH"
  | "CONTACT_EXACT_ACTIVE_PERSONAL_UNIQUE"
  | "CONTACT_MISSING"
  | "CONTACT_MULTIPLE"
  | "CONTACT_MISMATCH"
  | "CONTACT_LINK_EXACT_ACTIVE_COORDINATOR"
  | "CONTACT_LINK_MISMATCH"
  | "PERSONAL_RESOLUTION_RESOLVED"
  | "PERSONAL_RESOLUTION_UNRESOLVED"
  | "PERSONAL_RESOLUTION_AMBIGUOUS"
  | "ACTIVE_SURGERY_BASELINE_21"
  | "ACTIVE_SURGERY_BASELINE_MISMATCH"
  | "ASSIGNMENTS_CANONICAL_8"
  | "ASSIGNMENTS_MISMATCH"
  | "REMOTE_READ_FAILED"

export type RedactedInspectorResult = {
  target: typeof EZEQUIEL_AUTH_INSPECTOR_TARGET
  provenanceGate: "PASS" | "FAIL"
  remoteExecution: "NOT_RUN" | "COMPLETED" | "FAILED"
  decision: "GO" | "NO-GO"
  statusCodes: InspectorStatusCode[]
  counts: {
    authIdentities: number | null
    internalUsers: number | null
    activeExactAccesses: number | null
    exactContacts: number | null
    activeExactContactLinks: number | null
    personalResolutionMatches: number | null
    activeSurgeries: number | null
    activeCoordinatorAssignments: number | null
    expectedCoordinatorAssignments: typeof EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS
  }
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es-AR")
    .trim()
    .replace(/\s+/g, " ")
}

function normalizeEmail(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase()
}

function joinedName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].map((part) => part?.trim()).filter(Boolean).join(" ")
}

function contactLabel(contact: InspectorContact): string {
  return contact.legalName?.trim() || joinedName(contact.firstName, contact.lastName)
}

function emptyCounts(): RedactedInspectorResult["counts"] {
  return {
    authIdentities: null,
    internalUsers: null,
    activeExactAccesses: null,
    exactContacts: null,
    activeExactContactLinks: null,
    personalResolutionMatches: null,
    activeSurgeries: null,
    activeCoordinatorAssignments: null,
    expectedCoordinatorAssignments: EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS,
  }
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function databaseTargetsProject(databaseUrl: string, projectRef: string): boolean {
  const parsed = safeUrl(databaseUrl)
  if (!parsed || !["postgres:", "postgresql:"].includes(parsed.protocol)) return false
  const hostParts = parsed.hostname.toLowerCase().split(".")
  const userParts = decodeURIComponent(parsed.username).toLowerCase().split(".")
  return hostParts.includes(projectRef) || userParts.includes(projectRef)
}

export function evaluateEzequielInspectorProvenance(
  env: InspectorEnvironment
): RedactedInspectorResult {
  const statusCodes: InspectorStatusCode[] = []
  const companyId = env.OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID?.trim()
  const supabaseUrl = env.SUPABASE_URL?.trim()
  const databaseUrl = env.DATABASE_URL?.trim()

  if (env.OSSUM_DEPLOYMENT_TIER !== "development") statusCodes.push("PROVENANCE_TIER_REJECTED")
  if (env.OSSUM_ENABLE_COORDINATOR_PREVIEW !== "true") statusCodes.push("PROVENANCE_PREVIEW_REJECTED")
  if (!companyId) statusCodes.push("PROVENANCE_COMPANY_ID_MISSING")
  if (!supabaseUrl || !env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    statusCodes.push("PROVENANCE_SUPABASE_CREDENTIAL_MISSING")
  } else {
    const parsed = safeUrl(supabaseUrl.replace(/\/rest\/v1\/?$/, ""))
    if (
      !parsed ||
      parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== `${EZEQUIEL_AUTH_INSPECTOR_PROJECT_REF}.supabase.co`
    ) {
      statusCodes.push("PROVENANCE_SUPABASE_PROJECT_MISMATCH")
    }
  }
  if (!databaseUrl) {
    statusCodes.push("PROVENANCE_DATABASE_CREDENTIAL_MISSING")
  } else if (!databaseTargetsProject(databaseUrl, EZEQUIEL_AUTH_INSPECTOR_PROJECT_REF)) {
    statusCodes.push("PROVENANCE_DATABASE_PROJECT_MISMATCH")
  }

  if (statusCodes.length === 0) statusCodes.push("PROVENANCE_OK")
  return {
    target: EZEQUIEL_AUTH_INSPECTOR_TARGET,
    provenanceGate: statusCodes[0] === "PROVENANCE_OK" ? "PASS" : "FAIL",
    remoteExecution: "NOT_RUN",
    decision: "NO-GO",
    statusCodes,
    counts: emptyCounts(),
  }
}

export function authIdentityMatchesTarget(
  identity: InspectorAuthIdentity,
  internalTargetEmails: readonly string[]
): boolean {
  const target = normalizeText(EZEQUIEL_AUTH_INSPECTOR_TARGET)
  const identityNames = [joinedName(identity.firstName, identity.lastName), identity.displayName]
    .filter((value): value is string => Boolean(value))
    .map(normalizeText)
  const emails = new Set(internalTargetEmails.map(normalizeEmail))
  return identityNames.includes(target) || Boolean(identity.email && emails.has(normalizeEmail(identity.email)))
}

export function inspectEzequielAuthSnapshot(snapshot: InspectorSnapshot): RedactedInspectorResult {
  const statusCodes: InspectorStatusCode[] = ["PROVENANCE_OK"]
  const companyOk = Boolean(
    snapshot.company &&
    snapshot.company.id === snapshot.configuredCompanyId &&
    snapshot.company.isActive &&
    snapshot.company.name === "Districorr DEV" &&
    snapshot.company.organization.isActive &&
    snapshot.company.organization.slug === "ossum-dev"
  )
  statusCodes.push(companyOk ? "COMPANY_EXACT_DEV_OK" : "COMPANY_EXACT_DEV_MISMATCH")

  statusCodes.push(
    snapshot.authIdentities.length === 0
      ? "AUTH_IDENTITY_MISSING"
      : snapshot.authIdentities.length === 1
        ? "AUTH_IDENTITY_UNIQUE"
        : "AUTH_IDENTITY_MULTIPLE"
  )
  statusCodes.push(
    snapshot.internalUsers.length === 0
      ? "INTERNAL_USER_MISSING"
      : snapshot.internalUsers.length === 1
        ? "INTERNAL_USER_UNIQUE"
        : "INTERNAL_USER_MULTIPLE"
  )

  const auth = snapshot.authIdentities.length === 1 ? snapshot.authIdentities[0] : null
  const user = snapshot.internalUsers.length === 1 ? snapshot.internalUsers[0] : null
  const userActive = Boolean(user?.isActive)
  statusCodes.push(userActive ? "INTERNAL_USER_ACTIVE" : "INTERNAL_USER_INACTIVE")
  const authLinkMatches = Boolean(auth && user && user.supabaseAuthId === auth.id)
  statusCodes.push(authLinkMatches ? "AUTH_LINK_MATCH" : "AUTH_LINK_MISMATCH")

  const exactAccesses = user
    ? user.companyAccess.filter((access) =>
      access.companyId === snapshot.configuredCompanyId && access.isActive && access.role === "coordinator"
    )
    : []
  const accessOk = exactAccesses.length === 1 && user?.companyAccess.length === 1
  statusCodes.push(accessOk ? "ACCESS_EXACT_ACTIVE_COORDINATOR" : "ACCESS_MISMATCH")

  const contact = snapshot.exactContacts.length === 1 ? snapshot.exactContacts[0] : null
  const contactOk = Boolean(
    contact && contact.isActive && !contact.isCompany && contact.legalName === EZEQUIEL_AUTH_INSPECTOR_TARGET
  )
  statusCodes.push(
    snapshot.exactContacts.length === 0
      ? "CONTACT_MISSING"
      : snapshot.exactContacts.length > 1
        ? "CONTACT_MULTIPLE"
        : contactOk
          ? "CONTACT_EXACT_ACTIVE_PERSONAL_UNIQUE"
          : "CONTACT_MISMATCH"
  )
  const exactContactLinks = contact
    ? contact.companyLinks.filter((link) =>
      link.companyId === snapshot.configuredCompanyId && link.isActive && link.role === "coordinator"
    )
    : []
  const contactLinkOk = exactContactLinks.length === 1 && contact?.companyLinks.length === 1
  statusCodes.push(contactLinkOk ? "CONTACT_LINK_EXACT_ACTIVE_COORDINATOR" : "CONTACT_LINK_MISMATCH")

  const resolutionMatches = new Set<string>()
  if (user) {
    const email = normalizeEmail(user.email)
    const fullName = normalizeText(joinedName(user.firstName, user.lastName))
    for (const candidate of snapshot.eligibleCoordinatorContacts) {
      const candidateEmail = candidate.email ? normalizeEmail(candidate.email) : ""
      const candidateName = normalizeText(contactLabel(candidate))
      if ((email && candidateEmail === email) || (fullName && candidateName === fullName)) {
        resolutionMatches.add(candidate.id)
      }
    }
  }
  const resolutionOk = Boolean(contact && resolutionMatches.size === 1 && resolutionMatches.has(contact.id))
  statusCodes.push(
    resolutionOk
      ? "PERSONAL_RESOLUTION_RESOLVED"
      : resolutionMatches.size > 1
        ? "PERSONAL_RESOLUTION_AMBIGUOUS"
        : "PERSONAL_RESOLUTION_UNRESOLVED"
  )

  const activeSurgeryIds = [...snapshot.activeSurgeryIds].sort((left, right) => left.localeCompare(right))
  const surgeryBaselineOk =
    activeSurgeryIds.length === EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ACTIVE_SURGERIES &&
    new Set(activeSurgeryIds).size === activeSurgeryIds.length
  statusCodes.push(surgeryBaselineOk ? "ACTIVE_SURGERY_BASELINE_21" : "ACTIVE_SURGERY_BASELINE_MISMATCH")
  const expectedIds = new Set(activeSurgeryIds.slice(8, 16))
  const targetAssignments = contact
    ? snapshot.assignments.filter((assignment) => assignment.contactId === contact.id)
    : []
  const assignmentIds = new Set(targetAssignments.map((assignment) => assignment.surgeryId))
  const assignmentsOk = Boolean(
    contact &&
    surgeryBaselineOk &&
    targetAssignments.length === EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS &&
    assignmentIds.size === EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS &&
    targetAssignments.every(
      (assignment) => assignment.role === "coordinator" && expectedIds.has(assignment.surgeryId)
    )
  )
  statusCodes.push(assignmentsOk ? "ASSIGNMENTS_CANONICAL_8" : "ASSIGNMENTS_MISMATCH")

  const go = Boolean(
    companyOk &&
    auth &&
    user &&
    userActive &&
    authLinkMatches &&
    accessOk &&
    contactOk &&
    contactLinkOk &&
    resolutionOk &&
    assignmentsOk
  )

  return {
    target: EZEQUIEL_AUTH_INSPECTOR_TARGET,
    provenanceGate: "PASS",
    remoteExecution: "COMPLETED",
    decision: go ? "GO" : "NO-GO",
    statusCodes,
    counts: {
      authIdentities: snapshot.authIdentities.length,
      internalUsers: snapshot.internalUsers.length,
      activeExactAccesses: exactAccesses.length,
      exactContacts: snapshot.exactContacts.length,
      activeExactContactLinks: exactContactLinks.length,
      personalResolutionMatches: resolutionMatches.size,
      activeSurgeries: activeSurgeryIds.length,
      activeCoordinatorAssignments: targetAssignments.length,
      expectedCoordinatorAssignments: EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS,
    },
  }
}

export function remoteReadFailureResult(): RedactedInspectorResult {
  return {
    target: EZEQUIEL_AUTH_INSPECTOR_TARGET,
    provenanceGate: "PASS",
    remoteExecution: "FAILED",
    decision: "NO-GO",
    statusCodes: ["PROVENANCE_OK", "REMOTE_READ_FAILED"],
    counts: emptyCounts(),
  }
}
