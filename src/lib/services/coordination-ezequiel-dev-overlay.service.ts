import { createHash, randomUUID } from "node:crypto"
import { lstat, open, mkdir, readFile, realpath, rename, rm, stat } from "node:fs/promises"
import { hostname } from "node:os"
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path"
import { v5 as uuidv5 } from "uuid"

export const OVERLAY_PACKAGE = "coordination-ezequiel-dev-qa-002" as const
export const OVERLAY_SCHEMA_VERSION = "1.0.0" as const
export const OVERLAY_REFERENCE_TIME = "2026-07-21T12:00:00.000Z" as const
export const APPROVED_AUTHORITY_DIGEST = "c2221aa29cafa0cb0594da5b2a0638a892fc20ac9a9f50db9ff0929ec7d51782" as const
export const APPROVED_ROOT = "C:\\Users\\franc\\AppData\\Local\\Temp\\opencode\\coordination-ezequiel-dev-qa-002" as const
export const APPROVED_AUTHORITY_PATH = `${APPROVED_ROOT}\\authority\\baseline.v1.candidate.json` as const
export const RUNTIME_LOCK_PATH = `${APPROVED_ROOT}\\locks\\operation.lock` as const
export const OVERLAY_ID_AUTHORITY_DIGEST = "e742282463489eaaa3035be3a63a1b0c929b9b26916658e249f777cd94ae2e52" as const
export const OVERLAY_UUID_NAMESPACE = uuidv5.URL

export type OverlayKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"
export type PendingCategory = "Documentación" | "Consumo" | "Facturación"
export type OverlayMetric = "Poner fecha" | "Fuera de plazo" | "Coordinadas" | "En tránsito"

export type OverlayFixture = {
  key: OverlayKey
  surgeryId: string
  externalKey: `coord-ezequiel-qa-002:${OverlayKey}`
  cxName: `SYN-${OverlayKey}`
  lifecycle: "active"
  assignmentAt: string | null
  cxDate: string | null
  institution: "X" | "Y" | null
  client: "X" | "Y" | null
  availability: string | null
  state: "Autorizada" | "En tránsito"
  metrics: readonly OverlayMetric[]
  pending: readonly PendingCategory[]
}

const fixture = (
  key: OverlayKey,
  surgeryId: string,
  input: Omit<OverlayFixture, "key" | "surgeryId" | "externalKey" | "cxName">
): OverlayFixture => ({ key, surgeryId, externalKey: `coord-ezequiel-qa-002:${key}`, cxName: `SYN-${key}`, ...input })

export const OVERLAY_FIXTURES: readonly OverlayFixture[] = Object.freeze([
  fixture("A", "c9590681-82d3-5430-833a-325739743862", {
    lifecycle: "active",
    assignmentAt: "2026-07-19T12:00:00.000Z",
    cxDate: null,
    institution: "X",
    client: "X",
    availability: "2026-07-22",
    state: "Autorizada",
    metrics: ["Poner fecha", "Fuera de plazo"],
    pending: [],
  }),
  fixture("B", "48b74ece-07b2-549a-941a-8d1fce013449", {
    lifecycle: "active",
    assignmentAt: "2026-07-19T12:00:00.001Z",
    cxDate: null,
    institution: "Y",
    client: "X",
    availability: "2026-07-23",
    state: "Autorizada",
    metrics: ["Poner fecha"],
    pending: [],
  }),
  fixture("C", "9f408eac-a9d5-5153-b604-f8e29f51b32a", {
    lifecycle: "active",
    assignmentAt: null,
    cxDate: "2026-07-24",
    institution: "X",
    client: "Y",
    availability: "2026-07-25",
    state: "Autorizada",
    metrics: ["Coordinadas"],
    pending: [],
  }),
  fixture("D", "7d243a45-c030-5b07-a28f-7d9b271cd6a5", {
    lifecycle: "active",
    assignmentAt: null,
    cxDate: "2026-07-24",
    institution: "X",
    client: "X",
    availability: "2026-07-25",
    state: "En tránsito",
    metrics: ["Coordinadas", "En tránsito"],
    pending: [],
  }),
  fixture("E", "f6a783a6-2b26-5568-b9f7-949e7c42e515", { lifecycle: "active", assignmentAt: null, cxDate: null, institution: null, client: null, availability: null, state: "Autorizada", metrics: [], pending: ["Documentación"] }),
  fixture("F", "78173716-30b2-5367-b027-d87685f80c9d", { lifecycle: "active", assignmentAt: null, cxDate: null, institution: null, client: null, availability: null, state: "Autorizada", metrics: [], pending: ["Consumo"] }),
  fixture("G", "b318570e-2007-545c-9dd6-75182343c88f", { lifecycle: "active", assignmentAt: null, cxDate: null, institution: null, client: null, availability: null, state: "Autorizada", metrics: [], pending: ["Documentación", "Consumo", "Facturación"] }),
  fixture("H", "0d2ad460-cba6-540e-9ca3-521af69a21b6", { lifecycle: "active", assignmentAt: null, cxDate: null, institution: null, client: null, availability: null, state: "Autorizada", metrics: [], pending: [] }),
])

for (const item of OVERLAY_FIXTURES) {
  const name = `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:${item.key}`
  if (uuidv5(name, OVERLAY_UUID_NAMESPACE) !== item.surgeryId) throw new Error("OVERLAY_UUID_AUTHORITY_MISMATCH")
}

export function overlayMetricDelta(fixtures: readonly OverlayFixture[] = OVERLAY_FIXTURES): Record<OverlayMetric, number> {
  const result: Record<OverlayMetric, number> = { "Poner fecha": 0, "Fuera de plazo": 0, Coordinadas: 0, "En tránsito": 0 }
  for (const item of fixtures) for (const metric of item.metrics) result[metric] += 1
  return result
}

export function selectOverlayKeys(
  predicate: (item: OverlayFixture) => boolean,
  fixtures: readonly OverlayFixture[] = OVERLAY_FIXTURES
): OverlayKey[] {
  return fixtures.filter(predicate).map((item) => item.key)
}

type JsonScalar = string | number | boolean | null
export type JsonValue = JsonScalar | readonly JsonValue[] | { readonly [key: string]: JsonValue }

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    )
  }
  return value
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

export function checksumOf(value: object): string {
  const unsigned = { ...value } as Record<string, unknown>
  delete unsigned.checksum
  return sha256Hex(canonicalJson(unsigned))
}

const OVERLAY_MATRIX_AUTHORITY = OVERLAY_FIXTURES.map((item) => ({
  stableKey: item.key,
  surgeryId: item.surgeryId,
  source: item.externalKey,
  cxName: item.cxName,
  assignmentAt: item.assignmentAt,
  cxDate: item.cxDate,
  institution: item.institution,
  client: item.client,
  availabilityDate: item.availability,
  state: item.state,
  metrics: item.metrics,
  pending: item.pending,
}))

export const OVERLAY_MATRIX_DIGEST = sha256Hex(canonicalJson(OVERLAY_MATRIX_AUTHORITY))
export const OVERLAY_FIXTURE_DIGEST = sha256Hex(canonicalJson({
  idAuthorityDigest: OVERLAY_ID_AUTHORITY_DIGEST,
  matrixDigest: OVERLAY_MATRIX_DIGEST,
  entries: OVERLAY_MATRIX_AUTHORITY.map(({ stableKey, surgeryId, source }) => ({ stableKey, surgeryId, source })),
}))

export type OverlayEnvelope = {
  schemaVersion: typeof OVERLAY_SCHEMA_VERSION
  package: typeof OVERLAY_PACKAGE
  stableKey: OverlayKey
  surgeryId: string
  cxName: `SYN-${OverlayKey}`
  company: { id: string; marker: "Districorr DEV"; organizationMarker: "ossum-dev" }
  target: { contactId: string; label: "Ezequiel DEV"; role: "coordinator" }
  baselineDigest: typeof APPROVED_AUTHORITY_DIGEST
  idAuthorityDigest: typeof OVERLAY_ID_AUTHORITY_DIGEST
  matrixDigest: string
  metrics: readonly OverlayMetric[]
  availabilityDate: string | null
  pending: readonly PendingCategory[]
  checksum: string
}

export function buildOverlayEnvelope(fixture: OverlayFixture, companyId: string, targetContactId: string): { value: OverlayEnvelope; bytes: string; sha256: string } {
  const unsigned = {
    schemaVersion: OVERLAY_SCHEMA_VERSION,
    package: OVERLAY_PACKAGE,
    stableKey: fixture.key,
    surgeryId: fixture.surgeryId,
    cxName: fixture.cxName,
    company: { id: companyId, marker: "Districorr DEV" as const, organizationMarker: "ossum-dev" as const },
    target: { contactId: targetContactId, label: "Ezequiel DEV" as const, role: "coordinator" as const },
    baselineDigest: APPROVED_AUTHORITY_DIGEST,
    idAuthorityDigest: OVERLAY_ID_AUTHORITY_DIGEST,
    matrixDigest: OVERLAY_MATRIX_DIGEST,
    metrics: fixture.metrics,
    availabilityDate: fixture.availability,
    pending: fixture.pending,
  }
  const checksum = sha256Hex(JSON.stringify(unsigned))
  const value: OverlayEnvelope = { ...unsigned, checksum }
  const bytes = JSON.stringify(value)
  return { value, bytes, sha256: sha256Hex(bytes) }
}

export class OverlayGuardError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = "OverlayGuardError"
  }
}

type AuthorityEntry = {
  ordinal: number
  stableKey: string
  surgeryId: string
  source: string
  ownership: string
  expectedAssignee: { symbolicName: string; role: string }
}

export type ApprovedAuthority = {
  schemaVersion: "1.0.0"
  approvalStatus: "candidate-unapproved"
  fixture: { setKey: string; version: string }
  algorithm: {
    ordering: string
    assignmentPartition: string
    canonicalization: string
    digest: string
  }
  project: { ref: string; deploymentTier: "development" }
  company: { marker: "Districorr DEV"; organizationMarker: "ossum-dev" }
  entries: AuthorityEntry[]
}

export type AuthorityReadPort = {
  readBytes(path: string): Promise<Uint8Array>
  inspect(path: string): Promise<{ isFile: boolean; isLink: boolean; realPath: string }>
  verifyProtectedAcl(path: string): Promise<boolean>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function validateAuthorityShape(value: unknown, expectedProjectRef: string): asserts value is ApprovedAuthority {
  if (!isRecord(value) || value.schemaVersion !== "1.0.0" || value.approvalStatus !== "candidate-unapproved") {
    throw new OverlayGuardError("AUTHORITY_SCHEMA_INVALID")
  }
  const project = value.project
  const company = value.company
  const entries = value.entries
  if (!isRecord(project) || project.ref !== expectedProjectRef || project.deploymentTier !== "development") {
    throw new OverlayGuardError("AUTHORITY_PROJECT_MISMATCH")
  }
  if (!isRecord(company) || company.marker !== "Districorr DEV" || company.organizationMarker !== "ossum-dev") {
    throw new OverlayGuardError("AUTHORITY_COMPANY_MISMATCH")
  }
  if (!Array.isArray(entries) || entries.length !== 21) throw new OverlayGuardError("AUTHORITY_CARDINALITY_INVALID")
  const stableKeys = new Set<string>()
  const surgeryIds = new Set<string>()
  let nelson = 0
  let ezequiel = 0
  let unassigned = 0
  entries.forEach((entry, index) => {
    if (!isRecord(entry) || entry.ordinal !== index + 1 || typeof entry.stableKey !== "string" || !entry.stableKey || typeof entry.surgeryId !== "string" || !entry.surgeryId || typeof entry.source !== "string" || !entry.source || typeof entry.ownership !== "string" || !entry.ownership) {
      throw new OverlayGuardError("AUTHORITY_ENTRY_INVALID")
    }
    stableKeys.add(entry.stableKey)
    surgeryIds.add(entry.surgeryId)
    const assignee = entry.expectedAssignee
    if (!isRecord(assignee) || assignee.role !== "coordinator") throw new OverlayGuardError("AUTHORITY_ASSIGNMENT_INVALID")
    if (assignee.symbolicName === "Nelson DEV") nelson += 1
    else if (assignee.symbolicName === "Ezequiel DEV") ezequiel += 1
    else if (assignee.symbolicName === "") unassigned += 1
    else throw new OverlayGuardError("AUTHORITY_ASSIGNMENT_INVALID")
  })
  if (stableKeys.size !== 21 || surgeryIds.size !== 21 || nelson !== 8 || ezequiel !== 8 || unassigned !== 5) {
    throw new OverlayGuardError("AUTHORITY_BASELINE_INVALID")
  }
}

export async function readApprovedAuthority(
  port: AuthorityReadPort,
  expectedProjectRef: string,
  path: string = APPROVED_AUTHORITY_PATH
): Promise<ApprovedAuthority> {
  if (resolve(path).toLowerCase() !== resolve(APPROVED_AUTHORITY_PATH).toLowerCase()) {
    throw new OverlayGuardError("AUTHORITY_PATH_MISMATCH")
  }
  const inspected = await port.inspect(path)
  if (!inspected.isFile || inspected.isLink || resolve(inspected.realPath).toLowerCase() !== resolve(path).toLowerCase()) {
    throw new OverlayGuardError("AUTHORITY_FILE_INVALID")
  }
  if (!(await port.verifyProtectedAcl(path))) throw new OverlayGuardError("AUTHORITY_ACL_INVALID")
  const bytes = await port.readBytes(path)
  if (sha256Hex(bytes) !== APPROVED_AUTHORITY_DIGEST) throw new OverlayGuardError("AUTHORITY_DIGEST_MISMATCH")
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new OverlayGuardError("AUTHORITY_ENCODING_INVALID")
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  if (text.includes("\r") || text.includes("\n")) throw new OverlayGuardError("AUTHORITY_CANONICAL_INVALID")
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new OverlayGuardError("AUTHORITY_SCHEMA_INVALID")
  }
  if (JSON.stringify(parsed) !== text) throw new OverlayGuardError("AUTHORITY_CANONICAL_INVALID")
  validateAuthorityShape(parsed, expectedProjectRef)
  return parsed
}

export type OperatorCandidate = {
  userId: string
  supabaseAuthId: string | null
  isActive: boolean
  accesses: readonly { companyId: string; role: string; isActive: boolean }[]
}

export type TargetCandidate = {
  contactId: string
  isCompany: boolean
  isActive: boolean
  links: readonly { companyId: string; role: string | null; isActive: boolean }[]
}

export type RedactedPreflightDecision = {
  result: "PASS" | "FAIL"
  errorCode: string | null
  counts: { operators: number; operatorAccesses: number; targets: number; targetLinks: number }
}

export function evaluateActorAndTarget(input: {
  authenticatedSupabaseId: string
  companyId: string
  operators: readonly OperatorCandidate[]
  targets: readonly TargetCandidate[]
}): RedactedPreflightDecision {
  const operators = input.operators.filter((item) => item.isActive && item.supabaseAuthId === input.authenticatedSupabaseId)
  const accesses = operators.flatMap((item) => item.accesses.filter(
    (access) => access.companyId === input.companyId && access.isActive && (access.role === "admin" || access.role === "operator")
  ))
  const targets = input.targets.filter((item) => item.isActive && !item.isCompany)
  const targetLinks = targets.flatMap((item) => item.links.filter(
    (link) => link.companyId === input.companyId && link.isActive && link.role === "coordinator"
  ))
  const counts = { operators: operators.length, operatorAccesses: accesses.length, targets: targets.length, targetLinks: targetLinks.length }
  if (operators.length !== 1) return { result: "FAIL", errorCode: "OPERATOR_CARDINALITY_REJECTED", counts }
  if (accesses.length !== 1) return { result: "FAIL", errorCode: "OPERATOR_ACCESS_REJECTED", counts }
  if (targets.length !== 1) return { result: "FAIL", errorCode: "TARGET_CARDINALITY_REJECTED", counts }
  if (targetLinks.length !== 1) return { result: "FAIL", errorCode: "TARGET_LINK_REJECTED", counts }
  return { result: "PASS", errorCode: null, counts }
}

export type OwnedOverlayObservation = {
  externalKey: string
  surgeryId: string
  companyId?: string
  canonicalEnvelopeBytes?: string | null
  assignmentIds: readonly string[]
  assignmentContactIds: readonly string[]
  ownershipPackage: string | null
}

export type OwnershipDecision = {
  state: "absent" | "exact" | "rejected"
  errorCode: string | null
  observedRecords: number
  observedAssignments: number
}

export function evaluateOverlayOwnership(
  observations: readonly OwnedOverlayObservation[],
  targetContactId: string
): OwnershipDecision {
  if (observations.length === 0) return { state: "absent", errorCode: null, observedRecords: 0, observedAssignments: 0 }
  const expected = new Set<string>(OVERLAY_FIXTURES.map((item) => item.externalKey))
  const expectedIds = new Map<string, string>(OVERLAY_FIXTURES.map((item) => [item.externalKey, item.surgeryId]))
  const seenKeys = new Set<string>()
  const seenSurgeries = new Set<string>()
  let assignments = 0
  for (const item of observations) {
    assignments += item.assignmentIds.length
    if (!expected.has(item.externalKey) || item.surgeryId !== expectedIds.get(item.externalKey) || seenKeys.has(item.externalKey) || seenSurgeries.has(item.surgeryId)) {
      return { state: "rejected", errorCode: "OVERLAY_OWNERSHIP_COLLISION", observedRecords: observations.length, observedAssignments: assignments }
    }
    seenKeys.add(item.externalKey)
    seenSurgeries.add(item.surgeryId)
    if (item.ownershipPackage !== OVERLAY_PACKAGE) {
      return { state: "rejected", errorCode: "OVERLAY_OWNER_REJECTED", observedRecords: observations.length, observedAssignments: assignments }
    }
    if (item.assignmentIds.length !== 1 || item.assignmentContactIds.length !== 1 || item.assignmentContactIds[0] !== targetContactId) {
      return { state: "rejected", errorCode: "OVERLAY_ASSIGNMENT_CARDINALITY_REJECTED", observedRecords: observations.length, observedAssignments: assignments }
    }
  }
  if (seenKeys.size !== expected.size) {
    return { state: "rejected", errorCode: "OVERLAY_PARTIAL_REJECTED", observedRecords: observations.length, observedAssignments: assignments }
  }
  return { state: "exact", errorCode: null, observedRecords: observations.length, observedAssignments: assignments }
}

export type ManifestRecord = {
  schemaVersion: typeof OVERLAY_SCHEMA_VERSION
  package: typeof OVERLAY_PACKAGE
  runId: string
  operationId: string
  baselineDigest: typeof APPROVED_AUTHORITY_DIGEST
  projectRef: string
  companyId: string
  actorUserId: string
  targetContactId: string
  idAuthorityDigest: typeof OVERLAY_ID_AUTHORITY_DIGEST
  matrixDigest: string
  fixtureDigest: string
  keys: readonly string[]
  fixtureAuthority: readonly { stableKey: OverlayKey; source: string; canonicalEnvelopeBytes: string; sha256: string }[]
  intendedSurgeryIds: readonly string[]
  intendedAssignmentIds: readonly string[]
  intendedAuditIds: readonly string[]
  createdAt: string
  checksum: string
}

export function buildManifest(input: Omit<ManifestRecord, "schemaVersion" | "package" | "baselineDigest" | "idAuthorityDigest" | "matrixDigest" | "fixtureDigest" | "keys" | "fixtureAuthority" | "intendedSurgeryIds" | "checksum">): ManifestRecord {
  const envelopes = OVERLAY_FIXTURES.map((item) => buildOverlayEnvelope(item, input.companyId, input.targetContactId))
  const unsigned = {
    schemaVersion: OVERLAY_SCHEMA_VERSION,
    package: OVERLAY_PACKAGE,
    baselineDigest: APPROVED_AUTHORITY_DIGEST,
    idAuthorityDigest: OVERLAY_ID_AUTHORITY_DIGEST,
    matrixDigest: OVERLAY_MATRIX_DIGEST,
    fixtureDigest: OVERLAY_FIXTURE_DIGEST,
    keys: OVERLAY_FIXTURES.map((item) => item.externalKey),
    fixtureAuthority: OVERLAY_FIXTURES.map((item, index) => ({ stableKey: item.key, source: item.externalKey, canonicalEnvelopeBytes: envelopes[index].bytes, sha256: envelopes[index].sha256 })),
    intendedSurgeryIds: OVERLAY_FIXTURES.map((item) => item.surgeryId),
    ...input,
  }
  return { ...unsigned, checksum: checksumOf(unsigned) }
}

export type EvidenceState =
  | "rejected"
  | "prepared"
  | "applied"
  | "noop"
  | "failed-zero"
  | "applied-unknown"
  | "cleanup-prepared"
  | "cleaned"
  | "cleanup-unknown"

export type EvidenceEvent = {
  schemaVersion: typeof OVERLAY_SCHEMA_VERSION
  package: typeof OVERLAY_PACKAGE
  event: "create" | "reconcile" | "cleanup"
  state: EvidenceState
  previousHash: string
  nonce: string
  timestamp: string
  operationTimestamp: string
  projectRef: string
  companyId: string
  actorUserId: string
  targetContactId: string
  baselineDigest: typeof APPROVED_AUTHORITY_DIGEST
  runId: string
  operationId: string
  manifestHash: string
  keys: readonly string[]
  intendedIds: readonly string[]
  observedIds: readonly string[]
  auditRefs: readonly string[]
  outcome: string
  errorCode: string | null
  checksum: string
}

export function buildEvidenceEvent(input: Omit<EvidenceEvent, "schemaVersion" | "package" | "baselineDigest" | "checksum">): EvidenceEvent {
  const unsigned = { schemaVersion: OVERLAY_SCHEMA_VERSION, package: OVERLAY_PACKAGE, baselineDigest: APPROVED_AUTHORITY_DIGEST, ...input }
  return { ...unsigned, checksum: checksumOf(unsigned) }
}

const initialStates = new Set<EvidenceState>(["prepared", "rejected", "noop"])
const transitions: Partial<Record<EvidenceState, readonly EvidenceState[]>> = {
  prepared: ["applied", "failed-zero", "applied-unknown"],
  "applied-unknown": ["applied", "failed-zero"],
  applied: ["noop", "cleanup-prepared"],
  noop: ["noop", "cleanup-prepared"],
  "cleanup-prepared": ["cleaned", "cleanup-unknown"],
  "cleanup-unknown": ["cleaned"],
}

export function validateEvidenceChain(manifest: ManifestRecord, events: readonly EvidenceEvent[]): { valid: boolean; errorCode: string | null } {
  if (checksumOf(manifest) !== manifest.checksum) return { valid: false, errorCode: "MANIFEST_CHECKSUM_INVALID" }
  const manifestIds = [...manifest.intendedSurgeryIds, ...manifest.intendedAssignmentIds, ...manifest.intendedAuditIds]
  const expectedEnvelopes = OVERLAY_FIXTURES.map((item) => buildOverlayEnvelope(item, manifest.companyId, manifest.targetContactId))
  if (
    manifest.schemaVersion !== OVERLAY_SCHEMA_VERSION
    || manifest.package !== OVERLAY_PACKAGE
    || manifest.baselineDigest !== APPROVED_AUTHORITY_DIGEST
    || manifest.idAuthorityDigest !== OVERLAY_ID_AUTHORITY_DIGEST
    || manifest.matrixDigest !== OVERLAY_MATRIX_DIGEST
    || manifest.fixtureDigest !== OVERLAY_FIXTURE_DIGEST
    || !isSafeIdentifier(manifest.runId)
    || !manifest.operationId
    || !manifest.projectRef
    || !manifest.companyId
    || !manifest.actorUserId
    || !manifest.targetContactId
    || canonicalJson(manifest.keys) !== canonicalJson(OVERLAY_FIXTURES.map((item) => item.externalKey))
    || canonicalJson(manifest.intendedSurgeryIds) !== canonicalJson(OVERLAY_FIXTURES.map((item) => item.surgeryId))
    || manifest.fixtureAuthority.length !== 8
    || manifest.fixtureAuthority.some((entry, index) => entry.stableKey !== OVERLAY_FIXTURES[index].key
      || entry.source !== OVERLAY_FIXTURES[index].externalKey
      || entry.canonicalEnvelopeBytes !== expectedEnvelopes[index].bytes
      || entry.sha256 !== expectedEnvelopes[index].sha256)
    || manifest.intendedSurgeryIds.length !== 8
    || manifest.intendedAssignmentIds.length !== 8
    || manifest.intendedAuditIds.length !== 8
    || manifestIds.some((id) => !id)
    || new Set(manifestIds).size !== manifestIds.length
  ) return { valid: false, errorCode: "MANIFEST_SCHEMA_INVALID" }
  let previousHash = manifest.checksum
  let previousState: EvidenceState | null = null
  for (const event of events) {
    if (checksumOf(event) !== event.checksum) return { valid: false, errorCode: "EVENT_CHECKSUM_INVALID" }
    if (event.manifestHash !== manifest.checksum || event.previousHash !== previousHash) {
      return { valid: false, errorCode: "EVENT_CHAIN_INVALID" }
    }
    if (
      event.runId !== manifest.runId
      || event.operationId !== manifest.operationId
      || event.projectRef !== manifest.projectRef
      || event.companyId !== manifest.companyId
      || event.actorUserId !== manifest.actorUserId
      || event.targetContactId !== manifest.targetContactId
      || event.baselineDigest !== manifest.baselineDigest
      || event.operationTimestamp !== manifest.createdAt
      || canonicalJson(event.keys) !== canonicalJson(manifest.keys)
      || canonicalJson(event.intendedIds) !== canonicalJson([...manifest.intendedSurgeryIds, ...manifest.intendedAssignmentIds])
    ) {
      return { valid: false, errorCode: "EVENT_OWNERSHIP_INVALID" }
    }
    const allowed = previousState === null ? initialStates.has(event.state) : transitions[previousState]?.includes(event.state)
    if (!allowed) return { valid: false, errorCode: "EVENT_TRANSITION_INVALID" }
    previousHash = event.checksum
    previousState = event.state
  }
  return { valid: true, errorCode: null }
}

export function classifyCreateFailure(input: {
  preparedDurable: boolean
  transactionStarted: boolean
  transactionCommitted: boolean | null
  finalized: boolean
}): EvidenceState {
  if (!input.preparedDurable || !input.transactionStarted || input.transactionCommitted === false) return "failed-zero"
  if (input.transactionCommitted === true && input.finalized) return "applied"
  return "applied-unknown"
}

export type RuntimeOperation = "inventory" | "handoff" | "server-start" | "server-stop" | "bundle-scan" | "preflight" | "create" | "reconcile" | "cleanup" | "custody-hold"

export type OperationLock = {
  schemaVersion: typeof OVERLAY_SCHEMA_VERSION
  package: typeof OVERLAY_PACKAGE
  host: string
  pid: number
  processStartTime: string
  runId: string
  operation: RuntimeOperation
  nonce: string
  timestamp: string
  authorityDigest: typeof APPROVED_AUTHORITY_DIGEST
  chainAnchor: string | null
  checksum: string
}

export type LockFilePort = {
  ensureProtectedDirectory(path: string): Promise<void>
  writeExclusiveSynced(path: string, content: string): Promise<void>
  read(path: string): Promise<string>
  rename(path: string, destination: string): Promise<void>
  remove(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  verifyProtectedAcl(path: string): Promise<boolean>
}

export function buildOperationLock(input: Omit<OperationLock, "schemaVersion" | "package" | "authorityDigest" | "checksum">): OperationLock {
  if (!isSafeIdentifier(input.runId) || !isSafeIdentifier(input.nonce)) throw new OverlayGuardError("LOCK_IDENTIFIER_INVALID")
  const unsigned = { schemaVersion: OVERLAY_SCHEMA_VERSION, package: OVERLAY_PACKAGE, authorityDigest: APPROVED_AUTHORITY_DIGEST, ...input }
  return { ...unsigned, checksum: checksumOf(unsigned) }
}

function isSafeIdentifier(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/.test(value)
}

function parseOperationLock(content: string): OperationLock {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new OverlayGuardError("LOCK_INVALID")
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== OVERLAY_SCHEMA_VERSION || parsed.package !== OVERLAY_PACKAGE) {
    throw new OverlayGuardError("LOCK_INVALID")
  }
  const record = parsed as unknown as OperationLock
  if (checksumOf(record) !== record.checksum || !isSafeIdentifier(record.runId) || !isSafeIdentifier(record.nonce)) {
    throw new OverlayGuardError("LOCK_INVALID")
  }
  return record
}

export class LockStore {
  constructor(
    private readonly port: LockFilePort,
    private readonly lockPath: string = RUNTIME_LOCK_PATH,
    private readonly staleAfterMs = 15 * 60 * 1000
  ) {}

  async acquire(record: OperationLock): Promise<void> {
    await this.port.ensureProtectedDirectory(dirname(this.lockPath))
    try {
      await this.port.writeExclusiveSynced(this.lockPath, canonicalJson(record))
    } catch (error) {
      if (isNodeError(error) && error.code === "EEXIST") throw new OverlayGuardError("LOCK_CONTENDED")
      throw error
    }
    try {
      if (!(await this.port.verifyProtectedAcl(this.lockPath))) throw new OverlayGuardError("LOCK_ACL_INVALID")
      const readBack = parseOperationLock(await this.port.read(this.lockPath))
      if (readBack.checksum !== record.checksum) throw new OverlayGuardError("LOCK_READBACK_INVALID")
    } catch (error) {
      await this.port.remove(this.lockPath).catch(() => undefined)
      throw error
    }
  }

  async release(owner: Pick<OperationLock, "runId" | "nonce">): Promise<void> {
    const current = parseOperationLock(await this.port.read(this.lockPath))
    if (current.runId !== owner.runId || current.nonce !== owner.nonce) throw new OverlayGuardError("LOCK_OWNER_MISMATCH")
    await this.port.remove(this.lockPath)
  }

  async recoverAndAcquire(input: {
    replacement: OperationLock
    now: Date
    processState: (pid: number, processStartTime: string) => Promise<"absent" | "same" | "different">
    operationRunExists: boolean
    chainValid: boolean
    nextTaskOutputExists: boolean
    existingTaskEvidenceValid: boolean
  }): Promise<string> {
    if (input.replacement.operation !== "reconcile") throw new OverlayGuardError("LOCK_RECOVERY_MODE_REJECTED")
    if (!(await this.port.verifyProtectedAcl(this.lockPath))) throw new OverlayGuardError("LOCK_ACL_INVALID")
    const stale = parseOperationLock(await this.port.read(this.lockPath))
    if (stale.host !== input.replacement.host) throw new OverlayGuardError("LOCK_FOREIGN_HOST")
    const age = input.now.getTime() - Date.parse(stale.timestamp)
    if (!Number.isFinite(age) || age < this.staleAfterMs) throw new OverlayGuardError("LOCK_TOO_YOUNG")
    const processState = await input.processState(stale.pid, stale.processStartTime)
    if (processState === "same") throw new OverlayGuardError("LOCK_OWNER_LIVE")
    if (stale.operation === "create") {
      if (input.operationRunExists || stale.chainAnchor !== null) throw new OverlayGuardError("LOCK_CREATE_RECOVERY_REJECTED")
    } else if (["inventory", "handoff", "server-start", "server-stop", "preflight"].includes(stale.operation)) {
      if (input.nextTaskOutputExists || !input.existingTaskEvidenceValid) throw new OverlayGuardError("LOCK_EVIDENCE_RECOVERY_REJECTED")
    } else if (!input.chainValid) {
      throw new OverlayGuardError("LOCK_CHAIN_RECOVERY_REJECTED")
    }
    const recoveredPath = join(dirname(this.lockPath), `recovered-operation-${stale.runId}-${stale.nonce}.json`)
    if (await this.port.exists(recoveredPath)) throw new OverlayGuardError("LOCK_RECOVERY_COLLISION")
    await this.port.rename(this.lockPath, recoveredPath)
    if (parseOperationLock(await this.port.read(recoveredPath)).checksum !== stale.checksum) {
      throw new OverlayGuardError("LOCK_RECOVERY_READBACK_INVALID")
    }
    await this.acquire(input.replacement)
    return recoveredPath
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

export function createNodeLockFilePort(input: {
  protectAcl(path: string): Promise<void>
  verifyProtectedAcl(path: string): Promise<boolean>
}): LockFilePort {
  return {
    async ensureProtectedDirectory(path) {
      await mkdir(path, { recursive: true })
      await input.protectAcl(path)
    },
    async writeExclusiveSynced(path, content) {
      const handle = await open(path, "wx")
      try {
        await handle.writeFile(content, { encoding: "utf8" })
        await handle.sync()
      } finally {
        await handle.close()
      }
      await input.protectAcl(path)
      if ((await readFile(path, "utf8")) !== content) throw new OverlayGuardError("FILE_READBACK_INVALID")
    },
    read: (path) => readFile(path, "utf8"),
    rename,
    remove: (path) => rm(path, { force: false }),
    async exists(path) {
      try {
        await stat(path)
        return true
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") return false
        throw error
      }
    },
    verifyProtectedAcl: input.verifyProtectedAcl,
  }
}

export function createAuthorityReadPort(verifyProtectedAcl: (path: string) => Promise<boolean>): AuthorityReadPort {
  return {
    readBytes: readFile,
    async inspect(path) {
      const details = await lstat(path)
      return { isFile: details.isFile(), isLink: details.isSymbolicLink(), realPath: await realpath(path) }
    },
    verifyProtectedAcl,
  }
}

export function newLockIdentity(operation: RuntimeOperation, runId: string, processStartTime: string, chainAnchor: string | null): OperationLock {
  return buildOperationLock({
    host: hostname(),
    pid: process.pid,
    processStartTime,
    runId,
    operation,
    nonce: randomUUID(),
    timestamp: new Date().toISOString(),
    chainAnchor,
  })
}

export const RUNNER_MODES: readonly RuntimeOperation[] = ["inventory", "handoff", "server-start", "server-stop", "bundle-scan", "preflight", "create", "reconcile", "cleanup", "custody-hold"]

export type RunnerArguments = {
  mode: RuntimeOperation
  taskId: string | null
  readOnly: boolean
  host: string | null
  port: number | null
  buildRoot: string | null
  stdoutOnly: boolean
}

export function parseRunnerArguments(args: readonly string[]): RunnerArguments {
  const values = new Map<string, string | true>()
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index]
    if (!name.startsWith("--")) throw new OverlayGuardError("RUNNER_ARGUMENT_INVALID")
    if (values.has(name)) throw new OverlayGuardError("RUNNER_ARGUMENT_DUPLICATE")
    if (name === "--read-only" || name === "--stdout-only") {
      values.set(name, true)
      continue
    }
    const value = args[index + 1]
    if (!value || value.startsWith("--")) throw new OverlayGuardError("RUNNER_ARGUMENT_INVALID")
    values.set(name, value)
    index += 1
  }
  const allowed = new Set(["--mode", "--task-id", "--read-only", "--host", "--port", "--build-root", "--stdout-only"])
  if ([...values.keys()].some((key) => !allowed.has(key))) throw new OverlayGuardError("RUNNER_ARGUMENT_INVALID")
  const mode = values.get("--mode")
  if (typeof mode !== "string" || !RUNNER_MODES.includes(mode as RuntimeOperation)) throw new OverlayGuardError("RUNNER_MODE_INVALID")
  const portValue = values.get("--port")
  const port = typeof portValue === "string" ? Number(portValue) : null
  if (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)) throw new OverlayGuardError("RUNNER_PORT_INVALID")
  const taskId = values.get("--task-id")
  const host = values.get("--host")
  const buildRoot = values.get("--build-root")
  if (mode === "bundle-scan") {
    if (typeof buildRoot !== "string" || values.has("--read-only") || values.has("--host") || values.has("--port")) throw new OverlayGuardError("RUNNER_ARGUMENT_INVALID")
  } else if (values.has("--build-root") || values.has("--stdout-only")) {
    throw new OverlayGuardError("RUNNER_ARGUMENT_INVALID")
  }
  return {
    mode: mode as RuntimeOperation,
    taskId: typeof taskId === "string" ? taskId : null,
    readOnly: values.get("--read-only") === true,
    host: typeof host === "string" ? host : null,
    port,
    buildRoot: typeof buildRoot === "string" ? buildRoot : null,
    stdoutOnly: values.get("--stdout-only") === true,
  }
}

export function fixedRedactedProcessResult(code: string): string {
  if (!/^[A-Z0-9_]+$/.test(code)) throw new OverlayGuardError("OUTPUT_CODE_INVALID")
  return canonicalJson({ result: "FAIL", errorCode: code })
}

export function pathIsInside(parent: string, child: string): boolean {
  const nestedPath = relative(resolve(parent), resolve(child))
  return nestedPath.length > 0 && !nestedPath.startsWith("..") && !isAbsolute(nestedPath)
}

export function recoveredLockBasename(lock: OperationLock): string {
  return `recovered-operation-${lock.runId}-${lock.nonce}.json`
}

export function isOperationLockFile(path: string): boolean {
  return basename(path) === "operation.lock"
}

export type OverlayCounts = {
  activeSurgeries: number
  ezequielAssignments: number
  nelsonAssignments: number
  unassignedSurgeries: number
}

export type OverlayTemplate = {
  patientId: string
  institutionId: string | null
  payerContactId: string | null
}

export type RuntimeDomainSnapshot = {
  projectRef: string
  companyId: string
  actorUserId: string
  targetContactId: string
  companyValid: boolean
  actorValid: boolean
  targetValid: boolean
  baselineValid: boolean
  counts: OverlayCounts
  templates: readonly OverlayTemplate[]
  overlay: readonly OwnedOverlayObservation[]
  globalIdentityRows: readonly { surgeryId: string; companyId: string; source: string | null }[]
  auditRefs: readonly string[]
  originalFingerprints: readonly string[]
}

export type CreateTransactionInput = {
  manifest: ManifestRecord
  fixtures: readonly OverlayFixture[]
  templates: readonly OverlayTemplate[]
}

export type CleanupTransactionInput = {
  manifest: ManifestRecord
  surgeryIds: readonly string[]
  assignmentIds: readonly string[]
  cleanupAuditIds: readonly string[]
}

export type OverlayDomainPort = {
  inspect(manifest?: ManifestRecord, additionalAuditRefs?: readonly string[]): Promise<RuntimeDomainSnapshot>
  createSerializable(input: CreateTransactionInput): Promise<{ auditRefs: readonly string[] }>
  cleanupSerializable(input: CleanupTransactionInput): Promise<{ auditRefs: readonly string[] }>
}

export type AttestationRecord = {
  schemaVersion: typeof OVERLAY_SCHEMA_VERSION
  kind: "preflight-attestation" | "final-preflight-attestation"
  taskId: string
  runId: string
  actorUserId: string
  companyId: string
  projectRef: string
  deploymentTier: "development"
  baselineDigest: typeof APPROVED_AUTHORITY_DIGEST
  checkedAt: string
  checks: readonly string[]
  result: "PASS" | "FAIL"
  attestationDigest: string
}

export type ReconciliationRecord = {
  schemaVersion: typeof OVERLAY_SCHEMA_VERSION
  operation: "create" | "noop" | "cleanup" | "reconcile"
  runId: string
  manifestHash: string
  baselineDigest: typeof APPROVED_AUTHORITY_DIGEST
  checkedAt: string
  counts: OverlayCounts
  originalFingerprints: readonly string[]
  result: "PASS" | "FAIL"
  checksum: string
}

export type AuditEvidenceRecord = {
  schemaVersion: typeof OVERLAY_SCHEMA_VERSION
  operation: "create" | "cleanup"
  runId: string
  manifestHash: string
  auditRefs: readonly string[]
  checkedAt: string
  checksum: string
}

export type CustodyMarker = {
  schemaVersion: typeof OVERLAY_SCHEMA_VERSION
  kind: "custody-hold" | "custody-release"
  approvalRef: string
  runId: string
  manifestHash: string
  baselineDigest: typeof APPROVED_AUTHORITY_DIGEST
  counts: OverlayCounts
  createdAt: string
  checksum: string
}

export type OverlayEvidencePort = {
  manifestExists(): Promise<boolean>
  writeManifest(manifest: ManifestRecord): Promise<void>
  readManifest(): Promise<ManifestRecord>
  readEvents(): Promise<readonly EvidenceEvent[]>
  appendEvent(event: EvidenceEvent): Promise<void>
  writeAttestation(attestation: AttestationRecord): Promise<void>
  writeReconciliation(record: ReconciliationRecord): Promise<void>
  writeAuditEvidence(record: AuditEvidenceRecord): Promise<void>
  writeCustodyMarker(marker: CustodyMarker): Promise<void>
}

export type AuthenticatedRuntime = {
  authUserId: string
}

export type OverlayAuthPort = {
  getUser(accessToken: string): Promise<{ id: string } | null>
}

export type OverlayRuntimeEnvironment = {
  deploymentTier: string | undefined
  previewEnabled: string | undefined
  expectedProjectRef: string
  configuredCompanyId: string
  taskRunId: string
  operationRunId: string | null
}

export function validateRuntimeEnvironment(input: OverlayRuntimeEnvironment, operation: RuntimeOperation): void {
  if (input.deploymentTier !== "development" || input.previewEnabled !== "true") {
    throw new OverlayGuardError("RUNTIME_TIER_REJECTED")
  }
  if (!input.expectedProjectRef.trim() || !input.configuredCompanyId.trim()) {
    throw new OverlayGuardError("RUNTIME_PROVENANCE_MISSING")
  }
  if (!isSafeIdentifier(input.taskRunId)) throw new OverlayGuardError("TASK_RUN_ID_INVALID")
  const requiresOperationRun = ["create", "reconcile", "cleanup", "custody-hold"].includes(operation)
  if (requiresOperationRun && (!input.operationRunId || !isSafeIdentifier(input.operationRunId))) {
    throw new OverlayGuardError("OPERATION_RUN_ID_INVALID")
  }
  if (input.operationRunId && input.operationRunId === input.taskRunId) {
    throw new OverlayGuardError("RUN_ID_COLLISION")
  }
}

export async function authenticateRuntime(auth: OverlayAuthPort, accessToken: string | undefined): Promise<AuthenticatedRuntime> {
  const token = accessToken?.trim()
  if (!token) throw new OverlayGuardError("AUTH_TOKEN_MISSING")
  const user = await auth.getUser(token)
  if (!user?.id) throw new OverlayGuardError("AUTH_TOKEN_REJECTED")
  return { authUserId: user.id }
}

function preflightError(snapshot: RuntimeDomainSnapshot, expected: Pick<OverlayRuntimeEnvironment, "expectedProjectRef" | "configuredCompanyId">): string | null {
  if (snapshot.projectRef !== expected.expectedProjectRef) return "PROJECT_REJECTED"
  if (snapshot.companyId !== expected.configuredCompanyId || !snapshot.companyValid) return "COMPANY_REJECTED"
  if (!snapshot.actorValid) return "OPERATOR_REJECTED"
  if (!snapshot.targetValid) return "TARGET_REJECTED"
  if (!snapshot.baselineValid) return "BASELINE_REJECTED"
  const expectedIds = new Set(OVERLAY_FIXTURES.map((item) => item.surgeryId))
  if (snapshot.globalIdentityRows.some((row) => !expectedIds.has(row.surgeryId))) return "GLOBAL_IDENTITY_INVALID"
  if (snapshot.templates.length < OVERLAY_FIXTURES.length) return "TEMPLATE_CARDINALITY_REJECTED"
  if (new Set(snapshot.templates.map((item) => item.institutionId).filter((id): id is string => Boolean(id))).size < 2) return "INSTITUTION_TEMPLATE_REJECTED"
  if (new Set(snapshot.templates.map((item) => item.payerContactId).filter((id): id is string => Boolean(id))).size < 2) return "PAYER_TEMPLATE_REJECTED"
  return null
}

export function buildAttestation(input: {
  kind: AttestationRecord["kind"]
  taskId: string
  runId: string
  snapshot: RuntimeDomainSnapshot
  result: "PASS" | "FAIL"
  reason: string | null
  checkedAt: string
}): AttestationRecord {
  const unsigned = {
    schemaVersion: OVERLAY_SCHEMA_VERSION,
    kind: input.kind,
    taskId: input.taskId,
    runId: input.runId,
    actorUserId: input.snapshot.actorUserId,
    companyId: input.snapshot.companyId,
    projectRef: input.snapshot.projectRef,
    deploymentTier: "development" as const,
    baselineDigest: APPROVED_AUTHORITY_DIGEST,
    checkedAt: input.checkedAt,
    checks: ["project", "company", "operator", "target", "authority", "baseline", "overlay", ...(input.reason ? [`failure:${input.reason}`] : [])],
    result: input.result,
  }
  return { ...unsigned, attestationDigest: sha256Hex(canonicalJson(unsigned)) }
}

export async function executeReadOnlyPreflight(input: {
  domain: OverlayDomainPort
  evidence: OverlayEvidencePort
  environment: OverlayRuntimeEnvironment
  taskId: string
  kind?: AttestationRecord["kind"]
  now?: Date
}): Promise<AttestationRecord> {
  validateRuntimeEnvironment(input.environment, "preflight")
  const snapshot = await input.domain.inspect()
  const reason = preflightError(snapshot, input.environment)
  const ownership = evaluateOverlayOwnership(snapshot.overlay, snapshot.targetContactId)
  const overlayReason = ownership.state === "rejected"
    ? ownership.errorCode
    : snapshot.globalIdentityRows.length > 0
      ? "GLOBAL_IDENTITY_COLLISION"
    : ownership.state !== "absent"
      ? "OVERLAY_PRESENT_REJECTED"
      : !exactBaselineCounts(snapshot.counts)
        ? "BASELINE_COUNTS_REJECTED"
        : null
  const attestation = buildAttestation({
    kind: input.kind ?? "preflight-attestation",
    taskId: input.taskId,
    runId: input.environment.taskRunId,
    snapshot,
    result: reason || overlayReason ? "FAIL" : "PASS",
    reason: reason ?? overlayReason,
    checkedAt: (input.now ?? new Date()).toISOString(),
  })
  await input.evidence.writeAttestation(attestation)
  return attestation
}

function buildReconciliation(input: {
  operation: ReconciliationRecord["operation"]
  manifest: ManifestRecord
  snapshot: RuntimeDomainSnapshot
  result: "PASS" | "FAIL"
  checkedAt: string
}): ReconciliationRecord {
  const unsigned = {
    schemaVersion: OVERLAY_SCHEMA_VERSION,
    operation: input.operation,
    runId: input.manifest.runId,
    manifestHash: input.manifest.checksum,
    baselineDigest: APPROVED_AUTHORITY_DIGEST,
    checkedAt: input.checkedAt,
    counts: input.snapshot.counts,
    originalFingerprints: input.snapshot.originalFingerprints,
    result: input.result,
  }
  return { ...unsigned, checksum: checksumOf(unsigned) }
}

function buildAuditEvidence(input: {
  operation: AuditEvidenceRecord["operation"]
  manifest: ManifestRecord
  auditRefs: readonly string[]
  checkedAt: string
}): AuditEvidenceRecord {
  const unsigned = {
    schemaVersion: OVERLAY_SCHEMA_VERSION,
    operation: input.operation,
    runId: input.manifest.runId,
    manifestHash: input.manifest.checksum,
    auditRefs: input.auditRefs,
    checkedAt: input.checkedAt,
  }
  return { ...unsigned, checksum: checksumOf(unsigned) }
}

function eventFromManifest(input: {
  manifest: ManifestRecord
  previousHash: string
  state: EvidenceState
  event: EvidenceEvent["event"]
  observedIds?: readonly string[]
  auditRefs?: readonly string[]
  outcome: string
  errorCode?: string | null
  timestamp: string
}): EvidenceEvent {
  return buildEvidenceEvent({
    event: input.event,
    state: input.state,
    previousHash: input.previousHash,
    nonce: randomUUID(),
    timestamp: input.timestamp,
    operationTimestamp: input.manifest.createdAt,
    projectRef: input.manifest.projectRef,
    companyId: input.manifest.companyId,
    actorUserId: input.manifest.actorUserId,
    targetContactId: input.manifest.targetContactId,
    runId: input.manifest.runId,
    operationId: input.manifest.operationId,
    manifestHash: input.manifest.checksum,
    keys: input.manifest.keys,
    intendedIds: [...input.manifest.intendedSurgeryIds, ...input.manifest.intendedAssignmentIds],
    observedIds: input.observedIds ?? [],
    auditRefs: input.auditRefs ?? [],
    outcome: input.outcome,
    errorCode: input.errorCode ?? null,
  })
}

function exactOverlayCounts(counts: OverlayCounts): boolean {
  return counts.activeSurgeries === 29 && counts.ezequielAssignments === 16 && counts.nelsonAssignments === 8 && counts.unassignedSurgeries === 5
}

function exactBaselineCounts(counts: OverlayCounts): boolean {
  return counts.activeSurgeries === 21 && counts.ezequielAssignments === 8 && counts.nelsonAssignments === 8 && counts.unassignedSurgeries === 5
}

function validateManifestRuntime(
  manifest: ManifestRecord,
  snapshot: RuntimeDomainSnapshot,
  environment: OverlayRuntimeEnvironment
): void {
  if (
    manifest.runId !== environment.operationRunId ||
    manifest.projectRef !== environment.expectedProjectRef ||
    manifest.companyId !== environment.configuredCompanyId ||
    manifest.actorUserId !== snapshot.actorUserId ||
    manifest.targetContactId !== snapshot.targetContactId ||
    manifest.baselineDigest !== APPROVED_AUTHORITY_DIGEST
  ) {
    throw new OverlayGuardError("MANIFEST_RUNTIME_MISMATCH")
  }
}

function hasExactManifestOwnership(manifest: ManifestRecord, snapshot: RuntimeDomainSnapshot): boolean {
  if (snapshot.overlay.length !== OVERLAY_FIXTURES.length) return false
  return OVERLAY_FIXTURES.every((fixture, index) => {
    const observed = snapshot.overlay.find((item) => item.externalKey === fixture.externalKey)
    const expectedEnvelope = manifest.fixtureAuthority[index]
    return observed?.surgeryId === manifest.intendedSurgeryIds[index]
      && observed.companyId === manifest.companyId
      && observed.canonicalEnvelopeBytes === expectedEnvelope.canonicalEnvelopeBytes
      && observed.assignmentIds.length === 1
      && observed.assignmentIds[0] === manifest.intendedAssignmentIds[index]
      && observed.assignmentContactIds.length === 1
      && observed.assignmentContactIds[0] === manifest.targetContactId
      && observed.ownershipPackage === OVERLAY_PACKAGE
  })
}

function hasExactAuditRefs(snapshot: RuntimeDomainSnapshot, expected: readonly string[]): boolean {
  return snapshot.auditRefs.length === expected.length && expected.every((id) => snapshot.auditRefs.includes(id))
}

function globalIdentityMatches(snapshot: RuntimeDomainSnapshot, ownershipState: OwnershipDecision["state"]): boolean {
  if (ownershipState === "absent") return snapshot.globalIdentityRows.length === 0
  if (ownershipState !== "exact" || snapshot.globalIdentityRows.length !== OVERLAY_FIXTURES.length) return false
  return OVERLAY_FIXTURES.every((fixture) => snapshot.globalIdentityRows.some((row) =>
    row.surgeryId === fixture.surgeryId
    && row.companyId === snapshot.companyId
    && row.source === fixture.externalKey,
  ))
}

export async function executeCreate(input: {
  domain: OverlayDomainPort
  evidence: OverlayEvidencePort
  environment: OverlayRuntimeEnvironment
  now?: Date
  idFactory?: () => string
}): Promise<{ state: "applied" | "noop"; manifest: ManifestRecord }> {
  validateRuntimeEnvironment(input.environment, "create")
  const now = input.now ?? new Date()
  const idFactory = input.idFactory ?? randomUUID
  const snapshot = await input.domain.inspect()
  const rejection = preflightError(snapshot, input.environment)
  if (rejection) throw new OverlayGuardError(rejection)
  const ownership = evaluateOverlayOwnership(snapshot.overlay, snapshot.targetContactId)
  if (!globalIdentityMatches(snapshot, ownership.state)) throw new OverlayGuardError("GLOBAL_IDENTITY_COLLISION")
  if (ownership.state === "rejected") throw new OverlayGuardError(ownership.errorCode ?? "OVERLAY_REJECTED")

  if (ownership.state === "exact") {
    if (!(await input.evidence.manifestExists())) throw new OverlayGuardError("MANIFEST_MISSING")
    const manifest = await input.evidence.readManifest()
    const ownedSnapshot = await input.domain.inspect(manifest)
    validateManifestRuntime(manifest, ownedSnapshot, input.environment)
    const events = await input.evidence.readEvents()
    const chain = validateEvidenceChain(manifest, events)
    if (!chain.valid) throw new OverlayGuardError(chain.errorCode ?? "EVENT_CHAIN_INVALID")
    if (!hasExactManifestOwnership(manifest, ownedSnapshot) || !hasExactAuditRefs(ownedSnapshot, manifest.intendedAuditIds)) throw new OverlayGuardError("MANIFEST_OWNERSHIP_MISMATCH")
    const previousHash = events.at(-1)?.checksum ?? manifest.checksum
    await input.evidence.appendEvent(eventFromManifest({ manifest, previousHash, state: "noop", event: "create", observedIds: [...manifest.intendedSurgeryIds, ...manifest.intendedAssignmentIds], auditRefs: manifest.intendedAuditIds, outcome: "noop", timestamp: now.toISOString() }))
    await input.evidence.writeReconciliation(buildReconciliation({ operation: "noop", manifest, snapshot: ownedSnapshot, result: exactOverlayCounts(ownedSnapshot.counts) ? "PASS" : "FAIL", checkedAt: now.toISOString() }))
    if (!exactOverlayCounts(ownedSnapshot.counts)) throw new OverlayGuardError("NOOP_RECONCILIATION_REJECTED")
    return { state: "noop", manifest }
  }

  if (await input.evidence.manifestExists()) throw new OverlayGuardError("MANIFEST_COLLISION")
  const manifest = buildManifest({
    runId: input.environment.operationRunId!,
    operationId: idFactory(),
    projectRef: snapshot.projectRef,
    companyId: snapshot.companyId,
    actorUserId: snapshot.actorUserId,
    targetContactId: snapshot.targetContactId,
    intendedAssignmentIds: OVERLAY_FIXTURES.map(() => idFactory()),
    intendedAuditIds: OVERLAY_FIXTURES.map(() => idFactory()),
    createdAt: now.toISOString(),
  })
  await input.evidence.writeManifest(manifest)
  const prepared = eventFromManifest({ manifest, previousHash: manifest.checksum, state: "prepared", event: "create", outcome: "prepared", timestamp: now.toISOString() })
  await input.evidence.appendEvent(prepared)
  let transactionCommitted: boolean | null = null
  try {
    const transaction = await input.domain.createSerializable({ manifest, fixtures: OVERLAY_FIXTURES, templates: snapshot.templates })
    transactionCommitted = true
    const after = await input.domain.inspect(manifest)
    const afterOwnership = evaluateOverlayOwnership(after.overlay, after.targetContactId)
    const pass = afterOwnership.state === "exact" && globalIdentityMatches(after, afterOwnership.state) && hasExactManifestOwnership(manifest, after) && hasExactAuditRefs(after, manifest.intendedAuditIds) && exactOverlayCounts(after.counts) && canonicalJson(after.originalFingerprints) === canonicalJson(snapshot.originalFingerprints)
    await input.evidence.writeReconciliation(buildReconciliation({ operation: "create", manifest, snapshot: after, result: pass ? "PASS" : "FAIL", checkedAt: new Date().toISOString() }))
    await input.evidence.writeAuditEvidence(buildAuditEvidence({ operation: "create", manifest, auditRefs: transaction.auditRefs, checkedAt: new Date().toISOString() }))
    if (!pass) throw new OverlayGuardError("CREATE_RECONCILIATION_REJECTED")
    await input.evidence.appendEvent(eventFromManifest({
      manifest,
      previousHash: prepared.checksum,
      state: "applied",
      event: "create",
      observedIds: [...manifest.intendedSurgeryIds, ...manifest.intendedAssignmentIds],
      auditRefs: transaction.auditRefs,
      outcome: "applied",
      timestamp: new Date().toISOString(),
    }))
    return { state: "applied", manifest }
  } catch (error) {
    const failureState = classifyCreateFailure({ preparedDurable: true, transactionStarted: true, transactionCommitted, finalized: false })
    await input.evidence.appendEvent(eventFromManifest({
      manifest,
      previousHash: prepared.checksum,
      state: failureState,
      event: "create",
      outcome: failureState,
      errorCode: error instanceof OverlayGuardError ? error.code : "CREATE_FAILED",
      timestamp: new Date().toISOString(),
    }))
    throw error
  }
}

export async function executeReconcile(input: {
  domain: OverlayDomainPort
  evidence: OverlayEvidencePort
  environment: OverlayRuntimeEnvironment
  now?: Date
}): Promise<EvidenceState> {
  validateRuntimeEnvironment(input.environment, "reconcile")
  const manifest = await input.evidence.readManifest()
  const events = await input.evidence.readEvents()
  const chain = validateEvidenceChain(manifest, events)
  if (!chain.valid) throw new OverlayGuardError(chain.errorCode ?? "EVENT_CHAIN_INVALID")
  const unresolvedCleanupAuditRefs = events.findLast((event) => event.state === "cleanup-prepared" || event.state === "cleanup-unknown")?.auditRefs ?? []
  const snapshot = await input.domain.inspect(manifest, unresolvedCleanupAuditRefs)
  validateManifestRuntime(manifest, snapshot, input.environment)
  const rejection = preflightError(snapshot, input.environment)
  if (rejection) throw new OverlayGuardError(rejection)
  const ownership = evaluateOverlayOwnership(snapshot.overlay, snapshot.targetContactId)
  const last = events.at(-1)
  if (!last) throw new OverlayGuardError("EVENT_CHAIN_EMPTY")
  if (["applied", "failed-zero", "cleaned", "noop"].includes(last.state)) return last.state
  if (["cleanup-prepared", "cleanup-unknown"].includes(last.state)) {
    const cleanupResolved = ownership.state === "absent" && exactBaselineCounts(snapshot.counts) && hasExactAuditRefs(snapshot, [...manifest.intendedAuditIds, ...unresolvedCleanupAuditRefs])
    await input.evidence.writeReconciliation(buildReconciliation({ operation: "reconcile", manifest, snapshot, result: cleanupResolved ? "PASS" : "FAIL", checkedAt: (input.now ?? new Date()).toISOString() }))
    if (!cleanupResolved) throw new OverlayGuardError("CLEANUP_RECONCILIATION_UNRESOLVED")
    await input.evidence.appendEvent(eventFromManifest({ manifest, previousHash: last.checksum, state: "cleaned", event: "reconcile", auditRefs: unresolvedCleanupAuditRefs, outcome: "cleaned", timestamp: (input.now ?? new Date()).toISOString() }))
    return "cleaned"
  }
  const state: EvidenceState = ownership.state === "exact" && globalIdentityMatches(snapshot, ownership.state) && hasExactManifestOwnership(manifest, snapshot) && hasExactAuditRefs(snapshot, manifest.intendedAuditIds) && exactOverlayCounts(snapshot.counts) ? "applied" : ownership.state === "absent" && globalIdentityMatches(snapshot, ownership.state) && exactBaselineCounts(snapshot.counts) && snapshot.auditRefs.length === 0 ? "failed-zero" : "applied-unknown"
  await input.evidence.writeReconciliation(buildReconciliation({ operation: "reconcile", manifest, snapshot, result: state === "applied-unknown" ? "FAIL" : "PASS", checkedAt: (input.now ?? new Date()).toISOString() }))
  if (state === "applied-unknown") throw new OverlayGuardError("RECONCILIATION_UNRESOLVED")
  await input.evidence.appendEvent(eventFromManifest({ manifest, previousHash: last.checksum, state, event: "reconcile", observedIds: state === "applied" ? [...manifest.intendedSurgeryIds, ...manifest.intendedAssignmentIds] : [], auditRefs: state === "applied" ? manifest.intendedAuditIds : [], outcome: state, timestamp: (input.now ?? new Date()).toISOString() }))
  return state
}

export async function executeCleanup(input: {
  domain: OverlayDomainPort
  evidence: OverlayEvidencePort
  environment: OverlayRuntimeEnvironment
  now?: Date
  idFactory?: () => string
}): Promise<"cleaned"> {
  validateRuntimeEnvironment(input.environment, "cleanup")
  const now = input.now ?? new Date()
  const manifest = await input.evidence.readManifest()
  const events = await input.evidence.readEvents()
  const chain = validateEvidenceChain(manifest, events)
  if (!chain.valid) throw new OverlayGuardError(chain.errorCode ?? "EVENT_CHAIN_INVALID")
  const before = await input.domain.inspect(manifest)
  validateManifestRuntime(manifest, before, input.environment)
  const rejection = preflightError(before, input.environment)
  if (rejection) throw new OverlayGuardError(rejection)
  const ownership = evaluateOverlayOwnership(before.overlay, before.targetContactId)
  if (ownership.state !== "exact") throw new OverlayGuardError(ownership.errorCode ?? "CLEANUP_OWNERSHIP_REJECTED")
  if (!globalIdentityMatches(before, ownership.state)) throw new OverlayGuardError("GLOBAL_IDENTITY_COLLISION")
  if (!hasExactManifestOwnership(manifest, before)) throw new OverlayGuardError("MANIFEST_OWNERSHIP_MISMATCH")
  if (!hasExactAuditRefs(before, manifest.intendedAuditIds)) throw new OverlayGuardError("MANIFEST_AUDIT_MISMATCH")
  if (!exactOverlayCounts(before.counts)) throw new OverlayGuardError("CLEANUP_COUNTS_REJECTED")
  const last = events.at(-1)
  if (!last || !["applied", "noop"].includes(last.state)) throw new OverlayGuardError("CLEANUP_STATE_REJECTED")
  const cleanupAuditIds = OVERLAY_FIXTURES.map(() => (input.idFactory ?? randomUUID)())
  const prepared = eventFromManifest({ manifest, previousHash: last.checksum, state: "cleanup-prepared", event: "cleanup", auditRefs: cleanupAuditIds, outcome: "cleanup-prepared", timestamp: now.toISOString() })
  await input.evidence.appendEvent(prepared)
  let transaction: { auditRefs: readonly string[] }
  try {
    transaction = await input.domain.cleanupSerializable({
      manifest,
      surgeryIds: manifest.intendedSurgeryIds,
      assignmentIds: manifest.intendedAssignmentIds,
      cleanupAuditIds,
    })
  } catch (error) {
    await input.evidence.appendEvent(eventFromManifest({
      manifest,
      previousHash: prepared.checksum,
      state: "cleanup-unknown",
      event: "cleanup",
      auditRefs: cleanupAuditIds,
      outcome: "cleanup-unknown",
      errorCode: error instanceof OverlayGuardError ? error.code : "CLEANUP_FAILED",
      timestamp: new Date().toISOString(),
    }))
    throw error
  }
  const after = await input.domain.inspect(manifest, cleanupAuditIds)
  const afterOwnership = evaluateOverlayOwnership(after.overlay, after.targetContactId)
  const pass = afterOwnership.state === "absent" && globalIdentityMatches(after, afterOwnership.state) && hasExactAuditRefs(after, [...manifest.intendedAuditIds, ...cleanupAuditIds]) && exactBaselineCounts(after.counts) && canonicalJson(after.originalFingerprints) === canonicalJson(before.originalFingerprints)
  await input.evidence.writeReconciliation(buildReconciliation({ operation: "cleanup", manifest, snapshot: after, result: pass ? "PASS" : "FAIL", checkedAt: new Date().toISOString() }))
  await input.evidence.writeAuditEvidence(buildAuditEvidence({ operation: "cleanup", manifest, auditRefs: transaction.auditRefs, checkedAt: new Date().toISOString() }))
  if (!pass) {
    await input.evidence.appendEvent(eventFromManifest({ manifest, previousHash: prepared.checksum, state: "cleanup-unknown", event: "cleanup", auditRefs: cleanupAuditIds, outcome: "cleanup-unknown", errorCode: "CLEANUP_RECONCILIATION_REJECTED", timestamp: new Date().toISOString() }))
    throw new OverlayGuardError("CLEANUP_RECONCILIATION_REJECTED")
  }
  await input.evidence.appendEvent(eventFromManifest({ manifest, previousHash: prepared.checksum, state: "cleaned", event: "cleanup", observedIds: [...manifest.intendedSurgeryIds, ...manifest.intendedAssignmentIds], auditRefs: transaction.auditRefs, outcome: "cleaned", timestamp: new Date().toISOString() }))
  return "cleaned"
}

export function buildCustodyMarker(input: Omit<CustodyMarker, "schemaVersion" | "baselineDigest" | "checksum">): CustodyMarker {
  if (!input.approvalRef.trim()) throw new OverlayGuardError("RETENTION_APPROVAL_MISSING")
  const unsigned = { schemaVersion: OVERLAY_SCHEMA_VERSION, baselineDigest: APPROVED_AUTHORITY_DIGEST, ...input }
  return { ...unsigned, checksum: checksumOf(unsigned) }
}

export type BrowserMutationEvent = {
  channel: "fetch" | "xhr" | "availability" | "zustand" | "localStorage" | "sessionStorage" | "cookie" | "preference"
  operation: string
  target: string
}

export function isRelevantBrowserMutation(event: BrowserMutationEvent): boolean {
  if (["zustand", "localStorage", "sessionStorage", "cookie", "preference", "availability"].includes(event.channel)) return true
  return !["GET", "HEAD", "OPTIONS"].includes(event.operation.toUpperCase())
}
