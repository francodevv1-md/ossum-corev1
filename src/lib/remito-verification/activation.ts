export const REMITO_ACTIVATION_FLAGS = [
  "remitoLocatorIssuanceWrites",
  "remitoInternalScanRead",
  "remitoPublicPublicationWrites",
  "remitoPublicCompatibilityRead",
  "remitoPrintCodes",
] as const

export type RemitoActivationFlag = (typeof REMITO_ACTIVATION_FLAGS)[number]
export type RemitoActivationFlags = Record<RemitoActivationFlag, boolean>

export type RemitoActivationConfig = {
  flags: RemitoActivationFlags
  cohort: { companyIds: readonly string[]; cohortStart: Date }
}

export type DistributedEvidenceReader = {
  hasDistributedPrintCodeEvidence(): Promise<boolean>
}

export type RemitoCohortCompletenessRepository = {
  countIncompleteEligibleRemitos(input: {
    companyIds: readonly string[]
    cohortStart: Date
  }): Promise<number>
}

export type RemitoCohortCompleteness = {
  eligible: boolean
  incompleteCount: number | null
  complete: boolean
}

export type RemitoActivationGate = {
  configured: boolean
  flags: RemitoActivationFlags
  cohort: RemitoActivationConfig["cohort"] | null
  hasDistributedEvidence: boolean
  isCompanyDateEligible(companyId: string, issuedAt: Date): boolean
  evaluateCompleteness(repository: RemitoCohortCompletenessRepository): Promise<RemitoCohortCompleteness>
}

const ALL_OFF: RemitoActivationFlags = {
  remitoLocatorIssuanceWrites: false,
  remitoInternalScanRead: false,
  remitoPublicPublicationWrites: false,
  remitoPublicCompatibilityRead: false,
  remitoPrintCodes: false,
}

function validCohort(config: RemitoActivationConfig): boolean {
  const ids = config.cohort.companyIds
  return ids.length > 0
    && ids.every((id) => typeof id === "string" && id.trim() === id && id.length > 0)
    && new Set(ids).size === ids.length
    && config.cohort.cohortStart instanceof Date
    && Number.isFinite(config.cohort.cohortStart.getTime())
}

function dependenciesAreMonotonic(flags: RemitoActivationFlags): boolean {
  return REMITO_ACTIVATION_FLAGS.every((flag, index) => !flags[flag]
    || index === 0
    || flags[REMITO_ACTIVATION_FLAGS[index - 1]])
}

export async function createRemitoActivationGate(
  config: RemitoActivationConfig | null | undefined,
  evidenceReader?: DistributedEvidenceReader,
): Promise<RemitoActivationGate> {
  const distributed = evidenceReader
    ? await evidenceReader.hasDistributedPrintCodeEvidence().catch(() => true)
    : false
  const configured = Boolean(config && validCohort(config) && dependenciesAreMonotonic(config.flags))
  const flags = configured ? { ...config!.flags } : { ...ALL_OFF }
  if (distributed) flags.remitoPublicCompatibilityRead = true
  const cohort = configured
    ? { companyIds: [...config!.cohort.companyIds], cohortStart: new Date(config!.cohort.cohortStart) }
    : null

  return {
    configured,
    flags,
    cohort,
    hasDistributedEvidence: distributed,
    isCompanyDateEligible(companyId, issuedAt) {
      return Boolean(cohort && cohort.companyIds.includes(companyId)
        && issuedAt instanceof Date && issuedAt.getTime() >= cohort.cohortStart.getTime())
    },
    async evaluateCompleteness(repository) {
      if (!configured || !flags.remitoPrintCodes || !cohort) {
        return { eligible: false, incompleteCount: null, complete: false }
      }
      const incompleteCount = await repository.countIncompleteEligibleRemitos(cohort)
      if (!Number.isSafeInteger(incompleteCount) || incompleteCount < 0) {
        return { eligible: true, incompleteCount: null, complete: false }
      }
      return { eligible: true, incompleteCount, complete: incompleteCount === 0 }
    },
  }
}

// Back the runtime on globalThis so that state installed by instrumentation.ts
// (which runs in its own module graph under Next.js dev/Turbopack) is visible
// to API route handlers that import a different instance of this module.
// Same pattern as src/lib/prisma.ts (globalForPrisma).
const globalForRemitoActivation = globalThis as unknown as {
  __remitoActivationRuntime?: Promise<RemitoActivationGate> | null
}

export function installRemitoActivationRuntime(
  config: RemitoActivationConfig | null,
  evidenceReader?: DistributedEvidenceReader,
): void {
  globalForRemitoActivation.__remitoActivationRuntime = createRemitoActivationGate(config, evidenceReader)
}

export function getRemitoActivationGate(): Promise<RemitoActivationGate> {
  return globalForRemitoActivation.__remitoActivationRuntime ?? createRemitoActivationGate(null)
}
