import { randomUUID } from "node:crypto"
import { execFile, spawn } from "node:child_process"
import { link, lstat, mkdir, open, readFile, readdir, unlink } from "node:fs/promises"
import { createConnection, createServer } from "node:net"
import { dirname, join, relative, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"
import type { Prisma, PrismaClient } from "@prisma/client"
import { config as loadEnv } from "dotenv"

import {
  APPROVED_ROOT,
  OVERLAY_FIXTURE_DIGEST,
  OVERLAY_FIXTURES,
  OVERLAY_ID_AUTHORITY_DIGEST,
  OVERLAY_MATRIX_DIGEST,
  OVERLAY_PACKAGE,
  OVERLAY_SCHEMA_VERSION,
  LockStore,
  OverlayGuardError,
  authenticateRuntime,
  buildOverlayEnvelope,
  buildCustodyMarker,
  canonicalJson,
  checksumOf,
  createAuthorityReadPort,
  createNodeLockFilePort,
  evaluateOverlayOwnership,
  executeCleanup,
  executeCreate,
  executeReadOnlyPreflight,
  executeReconcile,
  fixedRedactedProcessResult,
  newLockIdentity,
  parseRunnerArguments,
  pathIsInside,
  readApprovedAuthority,
  sha256Hex,
  validateEvidenceChain,
  validateRuntimeEnvironment,
  type ApprovedAuthority,
  type AttestationRecord,
  type AuditEvidenceRecord,
  type CustodyMarker,
  type EvidenceEvent,
  type ManifestRecord,
  type OverlayDomainPort,
  type OverlayEvidencePort,
  type OverlayFixture,
  type OverlayRuntimeEnvironment,
  type ReconciliationRecord,
  type RunnerArguments,
  type RuntimeDomainSnapshot,
} from "../../src/lib/services/coordination-ezequiel-dev-overlay.service"

const execFileAsync = promisify(execFile)
const REPOSITORY_ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1")), "..", "..")
const ALLOWLIST = [
  "src/lib/services/coordination-ezequiel-dev-overlay.service.ts",
  "scripts/dev/coordination-ezequiel-dev-overlay.ts",
  "src/__tests__/unit/coordination-ezequiel-dev-overlay.service.test.ts",
  "src/__tests__/integration/coordination-ezequiel-dev-overlay.test.ts",
  "e2e/coordination-ezequiel-dev-qa.spec.ts",
  "src/__tests__/components/CoordinatorInboxView.test.tsx",
  "src/lib/api/surgery-adapter.ts",
  "src/components/coordinadores/coordination-filtering.ts",
  "src/components/coordinadores/CoordinatorInboxView.tsx",
  "src/__tests__/unit/backend-active-surgeries-adapter.test.ts",
  "src/__tests__/unit/coordination-filtering.test.ts",
] as const
const TASK_IDS = new Set([
  "COORDINATION-EZEQUIEL-DEV-QA-002-T3",
  "COORDINATION-EZEQUIEL-DEV-QA-002-T0B",
  "COORDINATION-EZEQUIEL-DEV-QA-002-T4",
  "COORDINATION-EZEQUIEL-DEV-QA-002-T5",
  "COORDINATION-EZEQUIEL-DEV-QA-002-T6",
  "COORDINATION-EZEQUIEL-DEV-QA-002-T7",
  "COORDINATION-EZEQUIEL-DEV-QA-002-T8",
])

type PrismaDomainClient = PrismaClient | Prisma.TransactionClient

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new OverlayGuardError("RUNTIME_ENVIRONMENT_MISSING")
  return value
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT"
}

function runtimeEnvironment(): OverlayRuntimeEnvironment {
  return {
    deploymentTier: process.env.OSSUM_DEPLOYMENT_TIER,
    previewEnabled: process.env.OSSUM_ENABLE_COORDINATOR_PREVIEW,
    expectedProjectRef: requireEnvironment("OSSUM_COORDINATION_EXPECTED_PROJECT_REF"),
    configuredCompanyId: requireEnvironment("OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID"),
    taskRunId: requireEnvironment("OSSUM_COORDINATION_RUN_ID"),
    operationRunId: process.env.OSSUM_COORDINATION_OPERATION_RUN_ID?.trim() || null,
  }
}

function taskRunPath(environment: OverlayRuntimeEnvironment): string {
  const path = join(APPROVED_ROOT, "runs", environment.taskRunId)
  if (!pathIsInside(join(APPROVED_ROOT, "runs"), path)) throw new OverlayGuardError("TASK_RUN_PATH_REJECTED")
  return path
}

function operationRunPath(environment: OverlayRuntimeEnvironment): string {
  if (!environment.operationRunId) throw new OverlayGuardError("OPERATION_RUN_ID_INVALID")
  const path = join(APPROVED_ROOT, "runs", environment.operationRunId)
  if (!pathIsInside(join(APPROVED_ROOT, "runs"), path)) throw new OverlayGuardError("OPERATION_RUN_PATH_REJECTED")
  return path
}

async function protectAcl(path: string): Promise<void> {
  const details = await lstat(path)
  const identity = [process.env.USERDOMAIN, process.env.USERNAME].filter(Boolean).join("\\")
  if (!identity) throw new OverlayGuardError("ACL_IDENTITY_MISSING")
  const inheritance = details.isDirectory() ? "(OI)(CI)F" : "F"
  await execFileAsync("icacls.exe", [path, "/inheritance:r", "/grant:r", `${identity}:${inheritance}`, "/grant:r", `SYSTEM:${inheritance}`], { windowsHide: true })
}

type AclSnapshot = { protected: boolean; owner: string; rules: Array<{ identity: string; type: string; inherited: boolean }> }

async function readAclSnapshot(path: string): Promise<AclSnapshot> {
  const command = "$a=Get-Acl -LiteralPath $env:OSSUM_ACL_PATH;[pscustomobject]@{protected=$a.AreAccessRulesProtected;owner=[string]$a.Owner;rules=@($a.Access|ForEach-Object{[pscustomobject]@{identity=[string]$_.IdentityReference;type=[string]$_.AccessControlType;inherited=[bool]$_.IsInherited}})}|ConvertTo-Json -Compress -Depth 4"
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    windowsHide: true,
    env: { ...process.env, OSSUM_ACL_PATH: path },
  })
  return JSON.parse(stdout) as AclSnapshot
}

async function verifyProtectedAcl(path: string): Promise<boolean> {
  try {
    const identity = [process.env.USERDOMAIN, process.env.USERNAME].filter(Boolean).join("\\").toLowerCase()
    if (!identity) return false
    const acl = await readAclSnapshot(path)
    const allowed = new Set([identity, "nt authority\\system"])
    const identities = new Set(acl.rules.map((rule) => rule.identity.toLowerCase()))
    return acl.protected && acl.owner.toLowerCase() === identity && acl.rules.length === 2 && acl.rules.every((rule) => rule.type === "Allow" && !rule.inherited && allowed.has(rule.identity.toLowerCase())) && [...allowed].every((item) => identities.has(item))
  } catch {
    return false
  }
}

async function verifyAuthorityAcl(path: string): Promise<boolean> {
  try {
    const identity = [process.env.USERDOMAIN, process.env.USERNAME].filter(Boolean).join("\\").toLowerCase()
    if (!identity) return false
    const acl = await readAclSnapshot(path)
    const allowed = new Set([identity, "nt authority\\system"])
    const identities = new Set(acl.rules.map((rule) => rule.identity.toLowerCase()))
    return acl.protected && acl.owner.toLowerCase() === identity && identities.has(identity) && acl.rules.every((rule) => rule.type === "Allow" && !rule.inherited && allowed.has(rule.identity.toLowerCase()))
  } catch {
    return false
  }
}

async function writeImmutable(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await protectAcl(dirname(path))
  const content = canonicalJson(value)
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    const handle = await open(temporary, "wx")
    try {
      await handle.writeFile(content, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await protectAcl(temporary)
    await link(temporary, path)
    await unlink(temporary)
    if ((await readFile(path, "utf8")) !== content || !(await verifyProtectedAcl(path))) {
      throw new OverlayGuardError("EVIDENCE_READBACK_REJECTED")
    }
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw error
  }
}

async function readJson<T>(path: string): Promise<T> {
  if (!(await verifyProtectedAcl(path))) throw new OverlayGuardError("EVIDENCE_ACL_INVALID")
  return JSON.parse(await readFile(path, "utf8")) as T
}

class FileEvidenceStore implements OverlayEvidencePort {
  constructor(private readonly operationPath: string, private readonly taskPath: string) {}

  async manifestExists() {
    try { await lstat(join(this.operationPath, "manifest.json")); return true } catch (error) { if (isMissingPathError(error)) return false; throw error }
  }
  async writeManifest(manifest: ManifestRecord) {
    await mkdir(this.operationPath, { recursive: false })
    await protectAcl(this.operationPath)
    await writeImmutable(join(this.operationPath, "manifest.json"), manifest)
  }
  readManifest() { return readJson<ManifestRecord>(join(this.operationPath, "manifest.json")) }
  async readEvents() {
    const directory = join(this.operationPath, "events")
    let names: string[]
    try { names = await readdir(directory) } catch (error) { if (isMissingPathError(error)) return []; throw error }
    if (names.some((name) => !/^\d{4}-[a-z-]+\.json$/.test(name))) throw new OverlayGuardError("EVENT_FILE_REJECTED")
    const sorted = names.sort()
    const events = await Promise.all(sorted.map((name) => readJson<EvidenceEvent>(join(directory, name))))
    events.forEach((event, index) => {
      const expectedName = `${String(index + 1).padStart(4, "0")}-${event.state}.json`
      if (sorted[index] !== expectedName) throw new OverlayGuardError("EVENT_SEQUENCE_REJECTED")
    })
    return events
  }
  async appendEvent(event: EvidenceEvent) {
    const events = await this.readEvents()
    const sequence = String(events.length + 1).padStart(4, "0")
    await writeImmutable(join(this.operationPath, "events", `${sequence}-${event.state}.json`), event)
  }
  writeAttestation(attestation: AttestationRecord) {
    const file = attestation.kind === "final-preflight-attestation" ? "final-preflight-attestation.json" : "preflight-attestation.json"
    return writeImmutable(join(this.taskPath, file), attestation)
  }
  writeReconciliation(record: ReconciliationRecord) { return writeImmutable(join(this.operationPath, "reconciliation", `${record.operation}.json`), record) }
  writeAuditEvidence(record: AuditEvidenceRecord) { return writeImmutable(join(this.operationPath, "audits", `${record.operation}.json`), record) }
  writeCustodyMarker(marker: CustodyMarker) { return writeImmutable(join(this.operationPath, `${marker.kind}.json`), marker) }
}

function fixtureState(fixture: OverlayFixture): string {
  if (fixture.state === "En tránsito") return "in transit"
  return "authorized"
}

class PrismaOverlayDomain implements OverlayDomainPort {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly authority: ApprovedAuthority,
    private readonly authUserId: string,
    private readonly environment: OverlayRuntimeEnvironment
  ) {}

  private async inspectWith(client: PrismaDomainClient, manifest?: ManifestRecord, additionalAuditRefs: readonly string[] = []): Promise<RuntimeDomainSnapshot> {
    const company = await client.company.findUnique({
      where: { id: this.environment.configuredCompanyId },
      select: { id: true, name: true, isActive: true, organization: { select: { slug: true, isActive: true } } },
    })
    const actors = await client.user.findMany({
      where: { supabaseAuthId: this.authUserId, isActive: true },
      select: { id: true, companyAccess: { where: { companyId: this.environment.configuredCompanyId, isActive: true }, select: { role: true } } },
    })
    const actor = actors.length === 1 && actors[0].companyAccess.length === 1 && ["admin", "operator"].includes(actors[0].companyAccess[0].role) ? actors[0] : null
    const targets = await client.contact.findMany({
      where: { legalName: "Ezequiel DEV", isActive: true, isCompany: false },
      select: { id: true, companyLinks: { where: { companyId: this.environment.configuredCompanyId, isActive: true, role: "coordinator" }, select: { id: true } } },
    })
    const target = targets.length === 1 && targets[0].companyLinks.length === 1 ? targets[0] : null
    const authorityIds = this.authority.entries.map((entry) => entry.surgeryId)
    const baselineRows = await client.surgery.findMany({
      where: { id: { in: authorityIds }, companyId: this.environment.configuredCompanyId, archivedAt: null },
      select: {
        id: true, companyId: true, patientId: true, institutionId: true, payerContactId: true, source: true, cxStatus: true, scheduledDate: true,
        contactAssignments: { where: { role: "coordinator" }, select: { id: true, contactId: true, role: true, notes: true, contact: { select: { legalName: true } } } },
      },
    })
    const baselineById = new Map(baselineRows.map((row) => [row.id, row]))
    const baselineValid = this.authority.entries.every((entry) => {
      const row = baselineById.get(entry.surgeryId)
      if (!row || row.source !== entry.source) return false
      const names = row.contactAssignments.map((assignment) => assignment.contact.legalName ?? "")
      return entry.expectedAssignee.symbolicName === "" ? names.length === 0 : names.length === 1 && names[0] === entry.expectedAssignee.symbolicName
    })
    const overlayKeys = OVERLAY_FIXTURES.map((fixture) => fixture.externalKey)
    const overlayRows = await client.surgery.findMany({
      where: { companyId: this.environment.configuredCompanyId, source: { in: overlayKeys }, archivedAt: null },
      select: { id: true, companyId: true, source: true, notes: true, contactAssignments: { where: { role: "coordinator" }, select: { id: true, contactId: true, notes: true } } },
    })
    const globalIdentityRows = await client.surgery.findMany({
      where: { id: { in: OVERLAY_FIXTURES.map((fixture) => fixture.surgeryId) } },
      select: { id: true, companyId: true, source: true },
    })
    const expectedAuditIds = manifest ? [...manifest.intendedAuditIds, ...additionalAuditRefs] : []
    const auditRows = expectedAuditIds.length > 0 ? await client.auditEvent.findMany({
      where: { id: { in: expectedAuditIds }, companyId: this.environment.configuredCompanyId, userId: actor?.id ?? "" },
      select: { id: true, entityId: true, action: true, metadata: true },
    }) : []
    const createAuditIds = new Set(manifest?.intendedAuditIds ?? [])
    const cleanupAuditIds = new Set(additionalAuditRefs)
    const intendedSurgeryIds = new Set(manifest?.intendedSurgeryIds ?? [])
    const auditRefs = auditRows.filter((row) => {
      const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : null
      const metadataValid = metadata?.package === OVERLAY_PACKAGE
        && metadata.manifestHash === manifest?.checksum
        && metadata.idAuthorityDigest === OVERLAY_ID_AUTHORITY_DIGEST
        && metadata.matrixDigest === OVERLAY_MATRIX_DIGEST
        && metadata.fixtureDigest === OVERLAY_FIXTURE_DIGEST
      return metadataValid && intendedSurgeryIds.has(row.entityId) && (
      (createAuditIds.has(row.id) && row.action === "coordination_dev_overlay_created")
      || (cleanupAuditIds.has(row.id) && row.action === "coordination_dev_overlay_cleaned")
      )
    }).map((row) => row.id)
    const activeSurgeries = await client.surgery.count({ where: { companyId: this.environment.configuredCompanyId, archivedAt: null } })
    const coordinatorAssignments = target ? await client.surgeryContactAssignment.count({ where: { contactId: target.id, role: "coordinator", surgery: { companyId: this.environment.configuredCompanyId, archivedAt: null } } }) : 0
    const expectedNelsonIds = this.authority.entries.filter((entry) => entry.expectedAssignee.symbolicName === "Nelson DEV").map((entry) => entry.surgeryId)
    const nelsonAssignments = await client.surgeryContactAssignment.count({ where: { surgeryId: { in: expectedNelsonIds }, role: "coordinator", contact: { legalName: "Nelson DEV" } } })
    const unassignedIds = this.authority.entries.filter((entry) => entry.expectedAssignee.symbolicName === "").map((entry) => entry.surgeryId)
    const unassignedWithRows = await client.surgeryContactAssignment.count({ where: { surgeryId: { in: unassignedIds }, role: "coordinator" } })
    const orderedRows = this.authority.entries.map((entry) => baselineById.get(entry.surgeryId)).filter((row): row is NonNullable<typeof row> => Boolean(row))
    const originalFingerprints = orderedRows.map((row) => sha256Hex(canonicalJson({
      id: row.id,
      patientId: row.patientId,
      institutionId: row.institutionId,
      payerContactId: row.payerContactId,
      source: row.source,
      cxStatus: row.cxStatus,
      scheduledDate: row.scheduledDate?.toISOString() ?? null,
      assignments: row.contactAssignments.map((assignment) => ({ id: assignment.id, contactId: assignment.contactId, role: assignment.role })),
    })))
    return {
      projectRef: this.environment.expectedProjectRef,
      companyId: this.environment.configuredCompanyId,
      actorUserId: actor?.id ?? "",
      targetContactId: target?.id ?? "",
      companyValid: Boolean(company?.isActive && company.name === "Districorr DEV" && company.organization.isActive && company.organization.slug === "ossum-dev"),
      actorValid: Boolean(actor),
      targetValid: Boolean(target),
      baselineValid,
      counts: { activeSurgeries, ezequielAssignments: coordinatorAssignments, nelsonAssignments, unassignedSurgeries: unassignedIds.length - unassignedWithRows },
      templates: orderedRows.map((row) => ({ patientId: row.patientId, institutionId: row.institutionId, payerContactId: row.payerContactId })),
      overlay: overlayRows.map((row) => ({
        externalKey: row.source ?? "",
        surgeryId: row.id,
        companyId: row.companyId,
        canonicalEnvelopeBytes: row.notes,
        assignmentIds: row.contactAssignments.map((assignment) => assignment.id),
        assignmentContactIds: row.contactAssignments.map((assignment) => assignment.contactId),
        ownershipPackage: row.contactAssignments.length === 1 ? row.contactAssignments[0].notes : null,
      })),
      globalIdentityRows: globalIdentityRows.map((row) => ({ surgeryId: row.id, companyId: row.companyId, source: row.source })),
      auditRefs,
      originalFingerprints,
    }
  }

  inspect(manifest?: ManifestRecord, additionalAuditRefs?: readonly string[]) { return this.inspectWith(this.prisma, manifest, additionalAuditRefs) }

  async createSerializable(input: Parameters<OverlayDomainPort["createSerializable"]>[0]) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.inspectWith(tx)
      if (!before.baselineValid || before.globalIdentityRows.length !== 0 || evaluateOverlayOwnership(before.overlay, before.targetContactId).state !== "absent") throw new OverlayGuardError("TX_CREATE_PREFLIGHT_REJECTED")
      const institutionIds = [...new Set(input.templates.map((item) => item.institutionId).filter((id): id is string => Boolean(id)))]
      const payerContactIds = [...new Set(input.templates.map((item) => item.payerContactId).filter((id): id is string => Boolean(id)))]
      if (institutionIds.length < 2 || payerContactIds.length < 2) throw new OverlayGuardError("TX_TEMPLATE_REJECTED")
      for (const [index, fixture] of input.fixtures.entries()) {
        const template = input.templates[index]
        if (!template?.patientId) throw new OverlayGuardError("TX_TEMPLATE_REJECTED")
        const envelope = buildOverlayEnvelope(fixture, input.manifest.companyId, input.manifest.targetContactId)
        if (input.manifest.fixtureAuthority[index]?.canonicalEnvelopeBytes !== envelope.bytes) throw new OverlayGuardError("TX_ENVELOPE_REJECTED")
        await tx.surgery.create({ data: {
          id: input.manifest.intendedSurgeryIds[index], companyId: input.manifest.companyId, patientId: template.patientId,
          institutionId: fixture.institution ? institutionIds[fixture.institution === "Y" ? 1 : 0] : null,
          payerContactId: fixture.client ? payerContactIds[fixture.client === "Y" ? 1 : 0] : null,
          visibleNumber: fixture.cxName, description: `Synthetic DEV ${fixture.key}`, source: fixture.externalKey, notes: envelope.bytes,
          cxStatus: fixtureState(fixture), scheduledDate: fixture.cxDate ? new Date(`${fixture.cxDate}T12:00:00.000Z`) : null,
          probableDate: fixture.availability ? new Date(`${fixture.availability}T12:00:00.000Z`) : null,
          performedDate: null,
        } })
        await tx.surgeryContactAssignment.create({ data: {
          id: input.manifest.intendedAssignmentIds[index], surgeryId: input.manifest.intendedSurgeryIds[index], contactId: input.manifest.targetContactId,
          role: "coordinator", isPrimary: true, notes: OVERLAY_PACKAGE, createdAt: fixture.assignmentAt ? new Date(fixture.assignmentAt) : new Date(input.manifest.createdAt),
        } })
        await tx.auditEvent.create({ data: {
          id: input.manifest.intendedAuditIds[index], companyId: input.manifest.companyId, userId: input.manifest.actorUserId,
          entityType: "Surgery", entityId: input.manifest.intendedSurgeryIds[index], action: "coordination_dev_overlay_created", module: "coordination",
          detail: "Synthetic DEV overlay created", metadata: { package: OVERLAY_PACKAGE, externalKey: fixture.externalKey, manifestHash: input.manifest.checksum, idAuthorityDigest: OVERLAY_ID_AUTHORITY_DIGEST, matrixDigest: OVERLAY_MATRIX_DIGEST, fixtureDigest: OVERLAY_FIXTURE_DIGEST },
        } })
      }
      const after = await this.inspectWith(tx, input.manifest)
      if (evaluateOverlayOwnership(after.overlay, after.targetContactId).state !== "exact" || after.counts.activeSurgeries !== 29 || after.counts.ezequielAssignments !== 16) {
        throw new OverlayGuardError("TX_CREATE_POSTCONDITION_REJECTED")
      }
      return { auditRefs: input.manifest.intendedAuditIds }
    }, { isolationLevel: "Serializable", timeout: 30_000 })
  }

  async cleanupSerializable(input: Parameters<OverlayDomainPort["cleanupSerializable"]>[0]) {
    return this.prisma.$transaction(async (tx) => {
      const before = await this.inspectWith(tx, input.manifest)
      if (evaluateOverlayOwnership(before.overlay, before.targetContactId).state !== "exact") throw new OverlayGuardError("TX_CLEANUP_PREFLIGHT_REJECTED")
      const assignmentDelete = await tx.surgeryContactAssignment.deleteMany({ where: { id: { in: [...input.assignmentIds] }, surgeryId: { in: [...input.surgeryIds] }, notes: OVERLAY_PACKAGE } })
      if (assignmentDelete.count !== 8) throw new OverlayGuardError("TX_CLEANUP_ASSIGNMENT_COUNT_REJECTED")
      const surgeryDelete = await tx.surgery.deleteMany({ where: { id: { in: [...input.surgeryIds] }, source: { in: OVERLAY_FIXTURES.map((fixture) => fixture.externalKey) } } })
      if (surgeryDelete.count !== 8) throw new OverlayGuardError("TX_CLEANUP_SURGERY_COUNT_REJECTED")
      for (const [index, auditId] of input.cleanupAuditIds.entries()) {
        await tx.auditEvent.create({ data: {
          id: auditId, companyId: input.manifest.companyId, userId: input.manifest.actorUserId,
          entityType: "Surgery", entityId: input.surgeryIds[index], action: "coordination_dev_overlay_cleaned", module: "coordination",
          detail: "Synthetic DEV overlay cleaned", metadata: { package: OVERLAY_PACKAGE, manifestHash: input.manifest.checksum, idAuthorityDigest: OVERLAY_ID_AUTHORITY_DIGEST, matrixDigest: OVERLAY_MATRIX_DIGEST, fixtureDigest: OVERLAY_FIXTURE_DIGEST },
        } })
      }
      const after = await this.inspectWith(tx, input.manifest, input.cleanupAuditIds)
      if (!after.baselineValid || after.counts.activeSurgeries !== 21 || after.counts.ezequielAssignments !== 8) throw new OverlayGuardError("TX_CLEANUP_POSTCONDITION_REJECTED")
      return { auditRefs: input.cleanupAuditIds }
    }, { isolationLevel: "Serializable", timeout: 30_000 })
  }
}

type InventoryRecord = { schemaVersion: string; taskId: string; capturedAt: string; files: Array<{ path: string; exists: boolean; sha256: string | null }>; checksum: string }

async function generatedTypeFiles(): Promise<string[]> {
  const root = join(REPOSITORY_ROOT, ".next", "types")
  const files: string[] = []
  async function visit(path: string): Promise<void> {
    let details
    try { details = await lstat(path) } catch (error) { if (isMissingPathError(error)) return; throw error }
    if (details.isSymbolicLink()) throw new OverlayGuardError("GENERATED_OUTPUT_LINK_REJECTED")
    if (details.isFile()) { files.push(relative(REPOSITORY_ROOT, path).replaceAll("\\", "/")); return }
    if (!details.isDirectory()) throw new OverlayGuardError("GENERATED_OUTPUT_TYPE_REJECTED")
    for (const name of (await readdir(path)).sort()) await visit(join(path, name))
  }
  await visit(root)
  return files
}

type BundleScanRecord = { path: string; sha256: string; artifactClass: "client" | "server" | "manifest" }

async function scanProductionBundle(args: RunnerArguments): Promise<{ scannedFiles: number; forbiddenOccurrences: number; scanDigest: string }> {
  if (args.buildRoot !== ".next") throw new OverlayGuardError("BUNDLE_SCAN_ROOT_REJECTED")
  if (args.stdoutOnly === Boolean(args.taskId)) throw new OverlayGuardError("BUNDLE_SCAN_OUTPUT_REJECTED")
  const buildRoot = resolve(REPOSITORY_ROOT, args.buildRoot)
  if (buildRoot !== resolve(REPOSITORY_ROOT, ".next")) throw new OverlayGuardError("BUNDLE_SCAN_ROOT_REJECTED")
  const markers = [
    OVERLAY_PACKAGE,
    "coord-ezequiel-qa-002:",
    "urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:",
    ...OVERLAY_FIXTURES.map((fixture) => fixture.surgeryId),
    OVERLAY_ID_AUTHORITY_DIGEST,
    OVERLAY_MATRIX_DIGEST,
    OVERLAY_FIXTURE_DIGEST,
    "idAuthorityDigest",
    "matrixDigest",
    "parseCoordinationEzequielDevEnvelope",
    "coordinationEzequielDevDiagnostic",
    "acceptCoordinationEzequielDevFacts",
  ]
  const records: BundleScanRecord[] = []
  let forbiddenOccurrences = 0
  async function visit(path: string, artifactClass: BundleScanRecord["artifactClass"]): Promise<void> {
    const details = await lstat(path)
    if (details.isSymbolicLink()) throw new OverlayGuardError("BUNDLE_SCAN_LINK_REJECTED")
    if (details.isDirectory()) {
      for (const name of (await readdir(path)).sort()) await visit(join(path, name), artifactClass)
      return
    }
    if (!details.isFile()) return
    const bytes = await readFile(path)
    const text = bytes.toString("utf8")
    let count = 0
    for (const marker of markers) count += text.split(marker).length - 1
    forbiddenOccurrences += count
    records.push({ path: relative(buildRoot, path).replaceAll("\\", "/"), sha256: sha256Hex(bytes), artifactClass })
  }
  for (const [directory, artifactClass] of [["static", "client"], ["server", "server"]] as const) {
    const path = join(buildRoot, directory)
    try { await visit(path, artifactClass) } catch (error) { if (!isMissingPathError(error)) throw error }
  }
  for (const name of (await readdir(buildRoot)).sort()) {
    if (!/\.(?:json|js|map|html|txt)$/.test(name)) continue
    await visit(join(buildRoot, name), "manifest")
  }
  if (records.length === 0) throw new OverlayGuardError("BUNDLE_SCAN_EMPTY")
  const scanDigest = sha256Hex(canonicalJson(records))
  if (forbiddenOccurrences !== 0) throw new OverlayGuardError("BUNDLE_SCAN_FORBIDDEN_MARKER")
  return { scannedFiles: records.length, forbiddenOccurrences, scanDigest }
}

async function captureInventory(taskId: string): Promise<InventoryRecord> {
  const inventoryPaths = [...ALLOWLIST, "next-env.d.ts", ...(await generatedTypeFiles())]
  const files = await Promise.all(inventoryPaths.map(async (relativePath) => {
    const path = join(REPOSITORY_ROOT, relativePath)
    try { const bytes = await readFile(path); return { path: relativePath, exists: true, sha256: sha256Hex(bytes) } } catch (error) { if (isMissingPathError(error)) return { path: relativePath, exists: false, sha256: null }; throw error }
  }))
  const unsigned = { schemaVersion: OVERLAY_SCHEMA_VERSION, taskId, capturedAt: new Date().toISOString(), files }
  return { ...unsigned, checksum: sha256Hex(canonicalJson(unsigned)) }
}

async function runInventory(args: RunnerArguments, environment: OverlayRuntimeEnvironment): Promise<void> {
  if (!args.taskId || !TASK_IDS.has(args.taskId)) throw new OverlayGuardError("TASK_ID_REJECTED")
  const runsPath = join(APPROVED_ROOT, "runs")
  await mkdir(runsPath, { recursive: true }); await protectAcl(runsPath)
  await mkdir(taskRunPath(environment), { recursive: false }); await protectAcl(taskRunPath(environment))
  await writeImmutable(join(taskRunPath(environment), "inventory", `${args.taskId}.json`), await captureInventory(args.taskId))
}

async function runHandoff(args: RunnerArguments, environment: OverlayRuntimeEnvironment): Promise<void> {
  if (!args.taskId || !TASK_IDS.has(args.taskId)) throw new OverlayGuardError("TASK_ID_REJECTED")
  const before = await readJson<InventoryRecord>(join(taskRunPath(environment), "inventory", `${args.taskId}.json`))
  if (before.taskId !== args.taskId || checksumOf(before) !== before.checksum) throw new OverlayGuardError("INVENTORY_EVIDENCE_REJECTED")
  const after = await captureInventory(args.taskId)
  const unsigned = { schemaVersion: OVERLAY_SCHEMA_VERSION, taskId: args.taskId, before, after, validations: ["inventory-checksum", "allowlist-reinventory"] }
  await writeImmutable(join(taskRunPath(environment), "handoffs", `${args.taskId}.json`), { ...unsigned, checksum: sha256Hex(canonicalJson(unsigned)) })
}

async function assertPortFree(port: number): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const server = createServer()
    server.once("error", () => reject(new OverlayGuardError("SERVER_PORT_OCCUPIED")))
    server.listen(port, "127.0.0.1", () => server.close(() => resolvePromise()))
  })
}

type ProcessIdentity = {
  pid: number
  parentPid: number
  startedAt: string
  executable: string
  commandLine: string
}

async function listProcessIdentities(): Promise<ProcessIdentity[]> {
  const command = "$rows=Get-CimInstance Win32_Process|ForEach-Object{[pscustomobject]@{pid=[int]$_.ProcessId;parentPid=[int]$_.ParentProcessId;startedAt=$_.CreationDate.ToUniversalTime().ToString('o');executable=[string]$_.ExecutablePath;commandLine=[string]$_.CommandLine}};$rows|ConvertTo-Json -Compress"
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 })
  if (!stdout.trim()) return []
  const parsed = JSON.parse(stdout) as ProcessIdentity | ProcessIdentity[]
  return Array.isArray(parsed) ? parsed : [parsed]
}

function processTree(all: readonly ProcessIdentity[], rootPid: number): ProcessIdentity[] {
  const found = new Map<number, ProcessIdentity>()
  const queue = [rootPid]
  while (queue.length > 0) {
    const parentPid = queue.shift()!
    const current = all.find((item) => item.pid === parentPid)
    if (current && !found.has(current.pid)) found.set(current.pid, current)
    for (const child of all.filter((item) => item.parentPid === parentPid)) {
      if (!found.has(child.pid)) queue.push(child.pid)
    }
  }
  return [...found.values()]
}

async function currentProcessStartTime(): Promise<string> {
  const current = (await listProcessIdentities()).find((item) => item.pid === process.pid)
  if (!current?.startedAt) throw new OverlayGuardError("PROCESS_IDENTITY_REJECTED")
  return current.startedAt
}

async function waitForPort(port: number, expectedOpen: boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const open = await new Promise<boolean>((resolvePromise) => {
      const socket = createConnection({ host: "127.0.0.1", port })
      socket.once("connect", () => { socket.destroy(); resolvePromise(true) })
      socket.once("error", () => resolvePromise(false))
      socket.setTimeout(200, () => { socket.destroy(); resolvePromise(false) })
    })
    if (open === expectedOpen) return
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200))
  }
  throw new OverlayGuardError(expectedOpen ? "SERVER_BIND_TIMEOUT" : "SERVER_SHUTDOWN_TIMEOUT")
}

async function runServerStart(args: RunnerArguments, environment: OverlayRuntimeEnvironment): Promise<void> {
  if (args.host !== "127.0.0.1" || args.port !== 3000) throw new OverlayGuardError("SERVER_ARGUMENT_REJECTED")
  await assertPortFree(3000)
  const browserPath = join(taskRunPath(environment), "browser")
  await mkdir(browserPath, { recursive: true }); await protectAcl(browserPath)
  const stdoutPath = join(browserPath, "server.stdout.log")
  const stderrPath = join(browserPath, "server.stderr.log")
  const stdout = await open(stdoutPath, "wx")
  let stderr: Awaited<ReturnType<typeof open>>
  try { stderr = await open(stderrPath, "wx") } catch (error) { await stdout.close(); throw error }
  await protectAcl(stdoutPath); await protectAcl(stderrPath)
  const executable = join(REPOSITORY_ROOT, "node_modules", ".bin", "next.cmd")
  const startedAt = new Date().toISOString()
  let child: ReturnType<typeof spawn>
  try {
    child = spawn(executable, ["dev", "--hostname", "127.0.0.1", "--port", "3000"], { cwd: REPOSITORY_ROOT, windowsHide: true, detached: false, stdio: ["ignore", stdout.fd, stderr.fd] })
  } finally {
    await stdout.close(); await stderr.close()
  }
  child.once("error", () => undefined)
  if (!child.pid) throw new OverlayGuardError("SERVER_START_FAILED")
  child.unref()
  try {
    await waitForPort(3000, true)
    const processes = processTree(await listProcessIdentities(), child.pid)
    if (processes.length === 0 || processes.some((item) => !item.executable || !item.commandLine)) throw new OverlayGuardError("SERVER_PROCESS_PROVENANCE_REJECTED")
    const unsigned = { schemaVersion: OVERLAY_SCHEMA_VERSION, parentPid: child.pid, startedAt, executable, cwd: REPOSITORY_ROOT, args: ["dev", "--hostname", "127.0.0.1", "--port", "3000"], host: "127.0.0.1", port: 3000, processes }
    await writeImmutable(join(browserPath, "server-ownership.json"), { ...unsigned, checksum: sha256Hex(canonicalJson(unsigned)) })
  } catch (error) {
    const owned = processTree(await listProcessIdentities(), child.pid)
    for (const process of owned.reverse()) {
      if (Number.isSafeInteger(process.pid) && process.pid > 0) await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Stop-Process -Id ${process.pid} -Force -ErrorAction SilentlyContinue`], { windowsHide: true })
    }
    await waitForPort(3000, false).catch(() => undefined)
    throw error
  }
}

async function runServerStop(args: RunnerArguments, environment: OverlayRuntimeEnvironment): Promise<void> {
  if (args.host !== "127.0.0.1" || args.port !== 3000) throw new OverlayGuardError("SERVER_ARGUMENT_REJECTED")
  const browserPath = join(taskRunPath(environment), "browser")
  const ownership = await readJson<{ schemaVersion: string; parentPid: number; executable: string; cwd: string; host: string; port: number; processes: ProcessIdentity[]; checksum: string }>(join(browserPath, "server-ownership.json"))
  if (checksumOf(ownership) !== ownership.checksum) throw new OverlayGuardError("SERVER_OWNERSHIP_CHECKSUM_REJECTED")
  if (!Number.isSafeInteger(ownership.parentPid) || ownership.parentPid <= 0 || ownership.processes.some((item) => !Number.isSafeInteger(item.pid) || item.pid <= 0)) throw new OverlayGuardError("SERVER_PID_REJECTED")
  if (ownership.cwd !== REPOSITORY_ROOT || ownership.executable !== join(REPOSITORY_ROOT, "node_modules", ".bin", "next.cmd")) throw new OverlayGuardError("SERVER_OWNER_REJECTED")
  const currentTree = processTree(await listProcessIdentities(), ownership.parentPid)
  const recorded = new Map(ownership.processes.map((item) => [item.pid, item]))
  for (const current of currentTree) {
    const expected = recorded.get(current.pid)
    if (!expected || expected.startedAt !== current.startedAt || expected.executable.toLowerCase() !== current.executable.toLowerCase()) {
      throw new OverlayGuardError("SERVER_PROCESS_IDENTITY_REJECTED")
    }
  }
  const depths = new Map<number, number>([[ownership.parentPid, 0]])
  for (let round = 0; round < currentTree.length; round += 1) {
    for (const process of currentTree) if (depths.has(process.parentPid)) depths.set(process.pid, (depths.get(process.parentPid) ?? 0) + 1)
  }
  for (const process of [...currentTree].sort((left, right) => (depths.get(right.pid) ?? 0) - (depths.get(left.pid) ?? 0))) {
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Stop-Process -Id ${process.pid} -Force -ErrorAction Stop`], { windowsHide: true })
  }
  await waitForPort(3000, false)
  const remaining = new Set((await listProcessIdentities()).map((item) => item.pid))
  if (ownership.processes.some((item) => remaining.has(item.pid))) throw new OverlayGuardError("SERVER_PROCESS_REMAINS")
  await assertPortFree(3000)
  const unsigned = { schemaVersion: OVERLAY_SCHEMA_VERSION, parentPid: ownership.parentPid, stoppedAt: new Date().toISOString(), portFree: true }
  await writeImmutable(join(browserPath, "server-shutdown.json"), { ...unsigned, checksum: sha256Hex(canonicalJson(unsigned)) })
}

async function createRuntime(args: RunnerArguments) {
  if (process.env.NODE_ENV !== "development") throw new OverlayGuardError("RUNTIME_NODE_ENV_REJECTED")
  const environment = runtimeEnvironment()
  validateRuntimeEnvironment(environment, args.mode)
  const supabaseUrl = new URL(requireEnvironment("SUPABASE_URL").replace(/\/rest\/v1\/?$/, ""))
  if (supabaseUrl.protocol !== "https:" || supabaseUrl.hostname.toLowerCase() !== `${environment.expectedProjectRef}.supabase.co`) {
    throw new OverlayGuardError("SUPABASE_PROJECT_REJECTED")
  }
  const databaseUrl = new URL(requireEnvironment("DATABASE_URL"))
  const databaseIdentity = `${databaseUrl.hostname}.${decodeURIComponent(databaseUrl.username)}`.toLowerCase().split(".")
  if (!databaseIdentity.includes(environment.expectedProjectRef.toLowerCase())) throw new OverlayGuardError("DATABASE_PROJECT_REJECTED")
  const authority = await readApprovedAuthority(createAuthorityReadPort(verifyAuthorityAcl), environment.expectedProjectRef)
  const { supabaseServerClient } = await import("../../src/lib/supabase/server")
  const token = process.env.OSSUM_COORDINATION_BEARER_TOKEN
  delete process.env.OSSUM_COORDINATION_BEARER_TOKEN
  const authenticated = await authenticateRuntime({
    async getUser(accessToken) {
      const { data, error } = await supabaseServerClient.auth.getUser(accessToken)
      return error || !data.user ? null : { id: data.user.id }
    },
  }, token)
  const taskPath = taskRunPath(environment)
  const operationPath = environment.operationRunId ? operationRunPath(environment) : taskRunPath(environment)
  let operationPathExists = false
  try { await lstat(operationPath); operationPathExists = true } catch (error) { if (isMissingPathError(error)) operationPathExists = false; else throw error }
  if (operationPathExists && !(await verifyProtectedAcl(operationPath))) throw new OverlayGuardError("RUN_DIRECTORY_ACL_REJECTED")
  if (taskPath !== operationPath) {
    try {
      await lstat(taskPath)
      if (!(await verifyProtectedAcl(taskPath))) throw new OverlayGuardError("TASK_RUN_DIRECTORY_ACL_REJECTED")
    } catch (error) {
      if (isMissingPathError(error)) throw new OverlayGuardError("TASK_RUN_DIRECTORY_MISSING")
      throw error
    }
  }
  const evidence = new FileEvidenceStore(operationPath, taskPath)
  if (args.mode === "create" && operationPathExists && !(await evidence.manifestExists())) throw new OverlayGuardError("OPERATION_RUN_CUSTODY_REJECTED")
  let chainAnchor: string | null = null
  if (operationPathExists && environment.operationRunId) {
    const manifest = await evidence.readManifest()
    const events = await evidence.readEvents()
    const chain = validateEvidenceChain(manifest, events)
    if (!chain.valid) throw new OverlayGuardError(chain.errorCode ?? "EVENT_CHAIN_INVALID")
    chainAnchor = events.at(-1)?.checksum ?? manifest.checksum
  }
  const [{ PrismaPg }, { PrismaClient: RuntimePrismaClient }, { Pool }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("pg"),
  ])
  const pool = new Pool({
    connectionString: databaseUrl.toString(),
    options: args.mode === "preflight" ? "-c default_transaction_read_only=on" : undefined,
  })
  const db = new RuntimePrismaClient({ adapter: new PrismaPg(pool) })
  const domain = new PrismaOverlayDomain(db, authority, authenticated.authUserId, environment)
  const lock = newLockIdentity(args.mode, environment.operationRunId ?? environment.taskRunId, await currentProcessStartTime(), chainAnchor)
  const lockStore = new LockStore(createNodeLockFilePort({ protectAcl, verifyProtectedAcl }))
  return {
    environment,
    domain,
    evidence,
    lock,
    lockStore,
    async dispose() {
      await db.$disconnect().catch(() => undefined)
      await pool.end().catch(() => undefined)
    },
  }
}

async function dispatch(args: RunnerArguments): Promise<Record<string, unknown> | void> {
  if (args.mode === "bundle-scan" && args.stdoutOnly) return scanProductionBundle(args)
  loadEnv({ path: ".env.local", override: false, quiet: true }); loadEnv({ path: ".env", override: false, quiet: true })
  const environment = runtimeEnvironment()
  if (["inventory", "handoff", "server-start", "server-stop", "bundle-scan"].includes(args.mode)) {
    validateRuntimeEnvironment(environment, args.mode)
    const lockStore = new LockStore(createNodeLockFilePort({ protectAcl, verifyProtectedAcl }))
    const lock = newLockIdentity(args.mode, environment.taskRunId, await currentProcessStartTime(), null)
    await lockStore.acquire(lock)
    try {
      if (args.mode === "inventory") await runInventory(args, environment)
      else if (args.mode === "handoff") await runHandoff(args, environment)
      else if (args.mode === "server-start") await runServerStart(args, environment)
      else if (args.mode === "server-stop") await runServerStop(args, environment)
      else {
        if (!args.taskId || !TASK_IDS.has(args.taskId)) throw new OverlayGuardError("TASK_ID_REJECTED")
        const scan = await scanProductionBundle(args)
        const unsigned = { schemaVersion: OVERLAY_SCHEMA_VERSION, taskId: args.taskId, ...scan }
        await writeImmutable(join(taskRunPath(environment), "bundle-scan", `${args.taskId}.json`), { ...unsigned, checksum: sha256Hex(canonicalJson(unsigned)) })
      }
    } finally {
      await lockStore.release(lock)
    }
    return
  }
  const runtime = await createRuntime(args)
  let lockAcquired = false
  try {
    try {
      await runtime.lockStore.acquire(runtime.lock)
      lockAcquired = true
    } catch (error) {
      if (!(error instanceof OverlayGuardError) || error.code !== "LOCK_CONTENDED" || args.mode !== "reconcile") throw error
      const stale = await readJson<{ runId: string }>(join(APPROVED_ROOT, "locks", "operation.lock"))
      const staleRunPath = join(APPROVED_ROOT, "runs", stale.runId)
      if (!pathIsInside(join(APPROVED_ROOT, "runs"), staleRunPath)) throw new OverlayGuardError("LOCK_RECOVERY_PATH_REJECTED")
      let operationRunExists = false
      try { await lstat(staleRunPath); operationRunExists = true } catch (error) { if (isMissingPathError(error)) operationRunExists = false; else throw error }
      let chainValid = false
      if (operationRunExists) {
        try {
          const staleEvidence = new FileEvidenceStore(staleRunPath, staleRunPath)
          const manifest = await staleEvidence.readManifest()
          const events = await staleEvidence.readEvents()
          chainValid = validateEvidenceChain(manifest, events).valid
        } catch { chainValid = false }
      }
      await runtime.lockStore.recoverAndAcquire({
        replacement: runtime.lock,
        now: new Date(),
        async processState(pid, processStartTime) {
          const process = (await listProcessIdentities()).find((item) => item.pid === pid)
          if (!process) return "absent"
          return process.startedAt === processStartTime ? "same" : "different"
        },
        operationRunExists,
        chainValid,
        nextTaskOutputExists: true,
        existingTaskEvidenceValid: false,
      })
      lockAcquired = true
    }
    if (args.mode === "preflight") {
      if (!args.readOnly || !args.taskId || !["COORDINATION-EZEQUIEL-DEV-QA-002-T0B", "COORDINATION-EZEQUIEL-DEV-QA-002-T8"].includes(args.taskId)) throw new OverlayGuardError("PREFLIGHT_ARGUMENT_REJECTED")
      await executeReadOnlyPreflight({ domain: runtime.domain, evidence: runtime.evidence, environment: runtime.environment, taskId: args.taskId, kind: args.taskId.endsWith("-T8") ? "final-preflight-attestation" : "preflight-attestation" })
    } else if (args.mode === "create") await executeCreate({ domain: runtime.domain, evidence: runtime.evidence, environment: runtime.environment })
    else if (args.mode === "reconcile") await executeReconcile({ domain: runtime.domain, evidence: runtime.evidence, environment: runtime.environment })
    else if (args.mode === "cleanup") await executeCleanup({ domain: runtime.domain, evidence: runtime.evidence, environment: runtime.environment })
    else if (args.mode === "custody-hold") {
      const manifest = await runtime.evidence.readManifest(); const snapshot = await runtime.domain.inspect()
      await runtime.evidence.writeCustodyMarker(buildCustodyMarker({ kind: "custody-hold", approvalRef: requireEnvironment("OSSUM_RETENTION_APPROVAL_REF"), runId: manifest.runId, manifestHash: manifest.checksum, counts: snapshot.counts, createdAt: new Date().toISOString() }))
    }
  } finally {
    try {
      if (lockAcquired) await runtime.lockStore.release(runtime.lock)
    } finally {
      await runtime.dispose()
    }
  }
}

export function inspectOverlayRunnerArguments(args: readonly string[]) { return parseRunnerArguments(args) }

async function main(): Promise<void> {
  try {
    const args = inspectOverlayRunnerArguments(process.argv.slice(2))
    const details = await dispatch(args)
    console.log(canonicalJson({ result: "PASS", mode: args.mode, ...details }))
  } catch (error) {
    const code = error instanceof OverlayGuardError ? error.code : "RUNTIME_FAILED"
    console.error(fixedRedactedProcessResult(code))
    process.exitCode = 2
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main()
