import {
  EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ACTIVE_SURGERIES,
  EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS,
  EZEQUIEL_AUTH_INSPECTOR_TARGET,
  inspectEzequielAuthSnapshot,
  type InspectorSnapshot,
} from "./coordination-ezequiel-auth-inspector.service"
import { resolvePersonalCoordinator } from "./personal-coordinator-resolver.service"

export const EZEQUIEL_DEV_AUTH_EMAIL = "ezequiel.dev@ossum.test" as const
export const EZEQUIEL_DEV_AUTH_FIRST_NAME = "Ezequiel" as const
export const EZEQUIEL_DEV_AUTH_LAST_NAME = "DEV" as const
export const EZEQUIEL_DEV_AUTH_ROLE = "coordinator" as const

export type EzequielProvisioningStatusCode =
  | "PROVISIONED"
  | "ALREADY_PROVISIONED"
  | "PREFLIGHT_MISMATCH"
  | "CREDENTIAL_PREPARATION_FAILED"
  | "AUTH_CREATE_FAILED"
  | "AUTH_CREATE_INVALID"
  | "INTERNAL_LINK_FAILED"
  | "COMPENSATION_FAILED"

export class EzequielProvisioningError extends Error {
  constructor(public readonly statusCode: EzequielProvisioningStatusCode) {
    super(statusCode)
    this.name = "EzequielProvisioningError"
  }
}

export type EzequielProvisioningResult = {
  outcome: "created" | "noop"
  statusCode: "PROVISIONED" | "ALREADY_PROVISIONED"
  counts: {
    authIdentities: 1
    internalUsers: 1
    activeCoordinatorAccesses: 1
    exactContacts: 1
    canonicalAssignments: typeof EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS
  }
}

export type PreparedCredential = { cleanup: () => Promise<void> }

export type EzequielProvisioningDependencies = {
  generateTemporaryPassword: () => string
  prepareCredential: (password: string) => Promise<PreparedCredential>
  createAuthIdentity: (input: {
    email: typeof EZEQUIEL_DEV_AUTH_EMAIL
    password: string
    emailConfirmed: true
    metadata: {
      first_name: typeof EZEQUIEL_DEV_AUTH_FIRST_NAME
      last_name: typeof EZEQUIEL_DEV_AUTH_LAST_NAME
      full_name: typeof EZEQUIEL_AUTH_INSPECTOR_TARGET
    }
  }) => Promise<{ id: string }>
  createInternalLink: (authId: string) => Promise<void>
  deleteAuthIdentity: (authId: string) => Promise<void>
}

function normalizedEmail(value: string | null): string {
  return value?.normalize("NFKC").trim().toLowerCase() ?? ""
}

function intendedIdentityResolvesExactly(snapshot: InspectorSnapshot): boolean {
  const exactContact = snapshot.exactContacts.length === 1 ? snapshot.exactContacts[0] : null
  if (!exactContact) return false
  const resolution = resolvePersonalCoordinator(
    {
      email: EZEQUIEL_DEV_AUTH_EMAIL,
      firstName: EZEQUIEL_DEV_AUTH_FIRST_NAME,
      lastName: EZEQUIEL_DEV_AUTH_LAST_NAME,
    },
    snapshot.eligibleCoordinatorContacts.map((contact) => ({
      contactId: contact.id,
      label: contact.legalName?.trim() || [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      legalName: contact.legalName,
    }))
  )
  return resolution.status === "resolved" && resolution.subject.contactId === exactContact.id
}

function exactInitialState(snapshot: InspectorSnapshot): boolean {
  const result = inspectEzequielAuthSnapshot(snapshot)
  return (
    result.provenanceGate === "PASS" &&
    result.remoteExecution === "COMPLETED" &&
    result.decision === "NO-GO" &&
    result.statusCodes.includes("COMPANY_EXACT_DEV_OK") &&
    result.statusCodes.includes("AUTH_IDENTITY_MISSING") &&
    result.statusCodes.includes("INTERNAL_USER_MISSING") &&
    result.statusCodes.includes("CONTACT_EXACT_ACTIVE_PERSONAL_UNIQUE") &&
    result.statusCodes.includes("CONTACT_LINK_EXACT_ACTIVE_COORDINATOR") &&
    result.statusCodes.includes("ACTIVE_SURGERY_BASELINE_21") &&
    result.statusCodes.includes("ASSIGNMENTS_CANONICAL_8") &&
    result.counts.authIdentities === 0 &&
    result.counts.internalUsers === 0 &&
    result.counts.activeExactAccesses === 0 &&
    result.counts.exactContacts === 1 &&
    result.counts.activeExactContactLinks === 1 &&
    result.counts.personalResolutionMatches === 0 &&
    intendedIdentityResolvesExactly(snapshot) &&
    result.counts.activeSurgeries === EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ACTIVE_SURGERIES &&
    result.counts.activeCoordinatorAssignments === EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS
  )
}

function exactProvisionedState(snapshot: InspectorSnapshot): boolean {
  const result = inspectEzequielAuthSnapshot(snapshot)
  const auth = snapshot.authIdentities.length === 1 ? snapshot.authIdentities[0] : null
  const user = snapshot.internalUsers.length === 1 ? snapshot.internalUsers[0] : null
  return Boolean(
    result.decision === "GO" &&
    auth &&
    user &&
    normalizedEmail(auth.email) === EZEQUIEL_DEV_AUTH_EMAIL &&
    normalizedEmail(user.email) === EZEQUIEL_DEV_AUTH_EMAIL &&
    auth.firstName === EZEQUIEL_DEV_AUTH_FIRST_NAME &&
    auth.lastName === EZEQUIEL_DEV_AUTH_LAST_NAME &&
    user.firstName === EZEQUIEL_DEV_AUTH_FIRST_NAME &&
    user.lastName === EZEQUIEL_DEV_AUTH_LAST_NAME
  )
}

export function classifyEzequielProvisioningState(snapshot: InspectorSnapshot): "initial" | "provisioned" {
  if (exactInitialState(snapshot)) return "initial"
  if (exactProvisionedState(snapshot)) return "provisioned"
  throw new EzequielProvisioningError("PREFLIGHT_MISMATCH")
}

function successfulResult(outcome: "created" | "noop"): EzequielProvisioningResult {
  return {
    outcome,
    statusCode: outcome === "created" ? "PROVISIONED" : "ALREADY_PROVISIONED",
    counts: {
      authIdentities: 1,
      internalUsers: 1,
      activeCoordinatorAccesses: 1,
      exactContacts: 1,
      canonicalAssignments: EZEQUIEL_AUTH_INSPECTOR_EXPECTED_ASSIGNMENTS,
    },
  }
}

export async function provisionEzequielDevAuth(
  snapshot: InspectorSnapshot,
  dependencies: EzequielProvisioningDependencies
): Promise<EzequielProvisioningResult> {
  const state = classifyEzequielProvisioningState(snapshot)
  if (state === "provisioned") return successfulResult("noop")

  const password = dependencies.generateTemporaryPassword()
  if (!password || password.length < 32) {
    throw new EzequielProvisioningError("CREDENTIAL_PREPARATION_FAILED")
  }

  let credential: PreparedCredential
  try {
    credential = await dependencies.prepareCredential(password)
  } catch {
    throw new EzequielProvisioningError("CREDENTIAL_PREPARATION_FAILED")
  }

  let authId: string
  try {
    const auth = await dependencies.createAuthIdentity({
      email: EZEQUIEL_DEV_AUTH_EMAIL,
      password,
      emailConfirmed: true,
      metadata: {
        first_name: EZEQUIEL_DEV_AUTH_FIRST_NAME,
        last_name: EZEQUIEL_DEV_AUTH_LAST_NAME,
        full_name: EZEQUIEL_AUTH_INSPECTOR_TARGET,
      },
    })
    if (!auth.id?.trim()) throw new EzequielProvisioningError("AUTH_CREATE_INVALID")
    authId = auth.id
  } catch (error) {
    await credential.cleanup().catch(() => undefined)
    if (error instanceof EzequielProvisioningError) throw error
    throw new EzequielProvisioningError("AUTH_CREATE_FAILED")
  }

  try {
    await dependencies.createInternalLink(authId)
  } catch {
    const compensation = await Promise.allSettled([
      dependencies.deleteAuthIdentity(authId),
      credential.cleanup(),
    ])
    if (compensation.some((item) => item.status === "rejected")) {
      throw new EzequielProvisioningError("COMPENSATION_FAILED")
    }
    throw new EzequielProvisioningError("INTERNAL_LINK_FAILED")
  }

  return successfulResult("created")
}

export function redactedProvisioningFailure(error: unknown): {
  outcome: "failed"
  statusCode: EzequielProvisioningStatusCode
  secretOutput: false
} {
  return {
    outcome: "failed",
    statusCode: error instanceof EzequielProvisioningError ? error.statusCode : "PREFLIGHT_MISMATCH",
    secretOutput: false,
  }
}
