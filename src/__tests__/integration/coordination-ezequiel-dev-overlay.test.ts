import { describe, expect, it } from "vitest"

import {
  APPROVED_AUTHORITY_DIGEST,
  OVERLAY_FIXTURES,
  OVERLAY_PACKAGE,
  OverlayGuardError,
  buildAttestation,
  buildOverlayEnvelope,
  executeCleanup,
  executeCreate,
  executeReadOnlyPreflight,
  executeReconcile,
  validateEvidenceChain,
  validateRuntimeEnvironment,
  type AttestationRecord,
  type AuditEvidenceRecord,
  type CustodyMarker,
  type EvidenceEvent,
  type ManifestRecord,
  type OverlayDomainPort,
  type OverlayEvidencePort,
  type ReconciliationRecord,
  type RuntimeDomainSnapshot,
} from "@/lib/services/coordination-ezequiel-dev-overlay.service"

const environment = {
  deploymentTier: "development",
  previewEnabled: "true",
  expectedProjectRef: "project-ref",
  configuredCompanyId: "company-id",
  taskRunId: "task-run-0000000001",
  operationRunId: "operation-run-000001",
}

function baselineSnapshot(): RuntimeDomainSnapshot {
  return {
    projectRef: "project-ref",
    companyId: "company-id",
    actorUserId: "actor-id",
    targetContactId: "target-id",
    companyValid: true,
    actorValid: true,
    targetValid: true,
    baselineValid: true,
    counts: { activeSurgeries: 21, ezequielAssignments: 8, nelsonAssignments: 8, unassignedSurgeries: 5 },
    templates: OVERLAY_FIXTURES.map((item, index) => ({ patientId: `patient-${item.key}`, institutionId: `institution-${index % 2}`, payerContactId: `payer-${index % 2}` })),
    overlay: [],
    globalIdentityRows: [],
    auditRefs: [],
    originalFingerprints: Array.from({ length: 21 }, (_, index) => `original-${index}`),
  }
}

class MemoryEvidence implements OverlayEvidencePort {
  manifest: ManifestRecord | null = null
  events: EvidenceEvent[] = []
  attestations: AttestationRecord[] = []
  reconciliations: ReconciliationRecord[] = []
  audits: AuditEvidenceRecord[] = []
  custody: CustodyMarker[] = []

  async manifestExists() { return this.manifest !== null }
  async writeManifest(manifest: ManifestRecord) {
    if (this.manifest) throw new OverlayGuardError("MANIFEST_COLLISION")
    this.manifest = manifest
  }
  async readManifest() {
    if (!this.manifest) throw new OverlayGuardError("MANIFEST_MISSING")
    return this.manifest
  }
  async readEvents() { return this.events }
  async appendEvent(event: EvidenceEvent) { this.events.push(event) }
  async writeAttestation(attestation: AttestationRecord) { this.attestations.push(attestation) }
  async writeReconciliation(record: ReconciliationRecord) { this.reconciliations.push(record) }
  async writeAuditEvidence(record: AuditEvidenceRecord) { this.audits.push(record) }
  async writeCustodyMarker(marker: CustodyMarker) { this.custody.push(marker) }
}

class MemoryDomain implements OverlayDomainPort {
  snapshot = baselineSnapshot()
  createCalls = 0
  cleanupCalls = 0
  auditRefs: string[] = []

  async inspect() { return structuredClone(this.snapshot) }

  async createSerializable(input: Parameters<OverlayDomainPort["createSerializable"]>[0]) {
    this.createCalls += 1
    if (this.snapshot.overlay.length > 0) throw new OverlayGuardError("TX_OVERLAY_COLLISION")
    this.auditRefs = [...input.manifest.intendedAuditIds]
    this.snapshot = {
      ...this.snapshot,
      counts: { activeSurgeries: 29, ezequielAssignments: 16, nelsonAssignments: 8, unassignedSurgeries: 5 },
      overlay: input.fixtures.map((fixture, index) => ({
        externalKey: fixture.externalKey,
        surgeryId: input.manifest.intendedSurgeryIds[index],
        companyId: input.manifest.companyId,
        canonicalEnvelopeBytes: buildOverlayEnvelope(fixture, input.manifest.companyId, input.manifest.targetContactId).bytes,
        assignmentIds: [input.manifest.intendedAssignmentIds[index]],
        assignmentContactIds: [input.manifest.targetContactId],
        ownershipPackage: OVERLAY_PACKAGE,
      })),
      auditRefs: [...input.manifest.intendedAuditIds],
      globalIdentityRows: input.fixtures.map((fixture) => ({ surgeryId: fixture.surgeryId, companyId: input.manifest.companyId, source: fixture.externalKey })),
    }
    return { auditRefs: this.auditRefs }
  }

  async cleanupSerializable(input: Parameters<OverlayDomainPort["cleanupSerializable"]>[0]) {
    this.cleanupCalls += 1
    const ownedIds = new Set(this.snapshot.overlay.map((item) => item.surgeryId))
    if (input.surgeryIds.some((id) => !ownedIds.has(id))) throw new OverlayGuardError("TX_CLEANUP_OWNER_REJECTED")
    this.snapshot = { ...baselineSnapshot(), auditRefs: [...this.snapshot.auditRefs, ...input.cleanupAuditIds], originalFingerprints: this.snapshot.originalFingerprints }
    return { auditRefs: input.cleanupAuditIds }
  }
}

function deterministicIds() {
  let index = 0
  return () => `generated-${String(index += 1).padStart(16, "0")}`
}

describe("coordination Ezequiel overlay T2 integration", () => {
  it("SC01_exact_additive creates exactly A-H in one bounded transaction and reconciles 29/16/8/5", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    const result = await executeCreate({ domain, evidence, environment, idFactory: deterministicIds(), now: new Date("2026-07-21T12:00:00.000Z") })
    expect(result.state).toBe("applied")
    expect(domain.createCalls).toBe(1)
    expect(domain.snapshot.counts).toEqual({ activeSurgeries: 29, ezequielAssignments: 16, nelsonAssignments: 8, unassignedSurgeries: 5 })
    expect(domain.snapshot.overlay.map((item) => item.externalKey)).toEqual(OVERLAY_FIXTURES.map((item) => item.externalKey))
    expect(evidence.events.map((item) => item.state)).toEqual(["prepared", "applied"])
    expect(validateEvidenceChain(evidence.manifest!, evidence.events)).toEqual({ valid: true, errorCode: null })
    expect(evidence.reconciliations.at(-1)).toMatchObject({ operation: "create", result: "PASS" })
    expect(evidence.audits.at(-1)?.auditRefs).toHaveLength(8)
    expect(domain.snapshot.overlay.map((item) => item.surgeryId)).toEqual(OVERLAY_FIXTURES.map((item) => item.surgeryId))
  })

  it("SC01 rejects initial other-tenant/global frozen UUID collision without adopting or writing", async () => {
    const domain = new MemoryDomain()
    domain.snapshot.globalIdentityRows = [{ surgeryId: OVERLAY_FIXTURES[0].surgeryId, companyId: "foreign-company", source: "foreign" }]
    const evidence = new MemoryEvidence()
    await expect(executeCreate({ domain, evidence, environment })).rejects.toMatchObject({ code: "GLOBAL_IDENTITY_COLLISION" })
    expect(domain.createCalls).toBe(0)
    expect(evidence.manifest).toBeNull()
    expect(evidence.events).toEqual([])
  })

  it("SC02 rejected read-only preflight writes only a FAIL attestation and zero canonical events", async () => {
    const domain = new MemoryDomain()
    domain.snapshot.actorValid = false
    const evidence = new MemoryEvidence()
    const result = await executeReadOnlyPreflight({ domain, evidence, environment, taskId: "COORDINATION-EZEQUIEL-DEV-QA-002-T0B", now: new Date("2026-07-21T12:00:00.000Z") })
    expect(result).toMatchObject({ result: "FAIL" })
    expect(result.checks).toContain("failure:OPERATOR_REJECTED")
    expect(evidence.attestations).toHaveLength(1)
    expect(evidence.events).toHaveLength(0)
    expect(evidence.manifest).toBeNull()
  })

  it.each([
    ["project", (domain: MemoryDomain) => { domain.snapshot.projectRef = "foreign-project" }, "PROJECT_REJECTED"],
    ["company", (domain: MemoryDomain) => { domain.snapshot.companyValid = false }, "COMPANY_REJECTED"],
    ["baseline", (domain: MemoryDomain) => { domain.snapshot.baselineValid = false }, "BASELINE_REJECTED"],
    ["operator", (domain: MemoryDomain) => { domain.snapshot.actorValid = false }, "OPERATOR_REJECTED"],
    ["target", (domain: MemoryDomain) => { domain.snapshot.targetValid = false }, "TARGET_REJECTED"],
    ["collision", (domain: MemoryDomain) => {
      domain.snapshot.overlay = OVERLAY_FIXTURES.map((fixture, index) => ({
        externalKey: fixture.externalKey,
        surgeryId: `foreign-${index}`,
        assignmentIds: [`assignment-${index}`],
        assignmentContactIds: [domain.snapshot.targetContactId],
        ownershipPackage: index === 0 ? "foreign" : OVERLAY_PACKAGE,
      }))
    }, "OVERLAY_OWNERSHIP_COLLISION"],
  ])("SC02_reject_%s emits only sanitized FAIL attestation evidence", async (_variant, mutate, code) => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    mutate(domain)
    const result = await executeReadOnlyPreflight({ domain, evidence, environment, taskId: "COORDINATION-EZEQUIEL-DEV-QA-002-T0B" })
    expect(result).toMatchObject({ result: "FAIL" })
    expect(result.checks).toContain(`failure:${code}`)
    expect(evidence.events).toEqual([])
    expect(evidence.manifest).toBeNull()
  })

  it("SC02_reject_tier stops before writing evidence", async () => {
    const evidence = new MemoryEvidence()
    await expect(executeReadOnlyPreflight({ domain: new MemoryDomain(), evidence, environment: { ...environment, deploymentTier: "production" }, taskId: "COORDINATION-EZEQUIEL-DEV-QA-002-T0B" })).rejects.toMatchObject({ code: "RUNTIME_TIER_REJECTED" })
    expect(evidence.attestations).toEqual([])
  })

  it("SC03_terminal_rerun_noop performs no second transaction and appends owned no-op evidence", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    const result = await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    expect(result.state).toBe("noop")
    expect(domain.createCalls).toBe(1)
    expect(evidence.events.map((item) => item.state)).toEqual(["prepared", "applied", "noop"])
    expect(evidence.reconciliations.at(-1)).toMatchObject({ operation: "noop", result: "PASS" })
  })

  it("SC03 keeps repeated exact-overlay reruns as a valid no-op chain", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    expect(domain.createCalls).toBe(1)
    expect(evidence.events.map((item) => item.state)).toEqual(["prepared", "applied", "noop", "noop"])
    expect(validateEvidenceChain(evidence.manifest!, evidence.events)).toEqual({ valid: true, errorCode: null })
  })

  it("T0b rejects an already-present exact overlay instead of attesting the baseline", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    const result = await executeReadOnlyPreflight({ domain, evidence, environment, taskId: "COORDINATION-EZEQUIEL-DEV-QA-002-T0B" })
    expect(result).toMatchObject({ result: "FAIL" })
    expect(result.checks).toContain("failure:GLOBAL_IDENTITY_COLLISION")
  })

  it("SC06 cleanup rejects partial ownership before transaction and preserves evidence", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    domain.snapshot.overlay = domain.snapshot.overlay.slice(0, 7)
    await expect(executeCleanup({ domain, evidence, environment })).rejects.toMatchObject({ code: "OVERLAY_PARTIAL_REJECTED" })
    expect(domain.cleanupCalls).toBe(0)
    expect(evidence.events.at(-1)?.state).toBe("applied")
  })

  it.each([
    ["owner", (domain: MemoryDomain) => { domain.snapshot.overlay = [{ ...domain.snapshot.overlay[0], ownershipPackage: "foreign" }, ...domain.snapshot.overlay.slice(1)] }, "OVERLAY_OWNER_REJECTED"],
    ["identity", (domain: MemoryDomain) => { domain.snapshot.targetValid = false }, "TARGET_REJECTED"],
    ["partial", (domain: MemoryDomain) => { domain.snapshot.overlay = domain.snapshot.overlay.slice(0, 7) }, "OVERLAY_PARTIAL_REJECTED"],
    ["collision", (domain: MemoryDomain) => { domain.snapshot.overlay = [...domain.snapshot.overlay, domain.snapshot.overlay[0]] }, "OVERLAY_OWNERSHIP_COLLISION"],
    ["hash", (_domain: MemoryDomain, evidence: MemoryEvidence) => { evidence.manifest = { ...evidence.manifest!, checksum: "tampered" } }, "MANIFEST_CHECKSUM_INVALID"],
    ["chain", (_domain: MemoryDomain, evidence: MemoryEvidence) => { evidence.events[0] = { ...evidence.events[0], previousHash: "tampered" } }, "EVENT_CHECKSUM_INVALID"],
    ["ACL", (_domain: MemoryDomain, evidence: MemoryEvidence) => { evidence.readEvents = async () => { throw new OverlayGuardError("EVIDENCE_ACL_INVALID") } }, "EVIDENCE_ACL_INVALID"],
    ["bytes", (domain: MemoryDomain) => { domain.snapshot.overlay = [{ ...domain.snapshot.overlay[0], canonicalEnvelopeBytes: "tampered" }, ...domain.snapshot.overlay.slice(1)] }, "MANIFEST_OWNERSHIP_MISMATCH"],
    ["audit", (domain: MemoryDomain) => { domain.snapshot.auditRefs = domain.snapshot.auditRefs.slice(1) }, "MANIFEST_AUDIT_MISMATCH"],
  ])("SC06_cleanup_reject_%s fails before cleanup transaction", async (_variant, mutate, code) => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    mutate(domain, evidence)
    await expect(executeCleanup({ domain, evidence, environment })).rejects.toMatchObject({ code })
    expect(domain.cleanupCalls).toBe(0)
  })

  it("SC07_cleanup_21_8_recovery deletes only manifested ownership and reconciles exact baseline", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    await expect(executeCleanup({ domain, evidence, environment, idFactory: deterministicIds() })).resolves.toBe("cleaned")
    expect(domain.cleanupCalls).toBe(1)
    expect(domain.snapshot.counts).toEqual({ activeSurgeries: 21, ezequielAssignments: 8, nelsonAssignments: 8, unassignedSurgeries: 5 })
    expect(evidence.events.map((item) => item.state)).toEqual(["prepared", "applied", "cleanup-prepared", "cleaned"])
    expect(evidence.reconciliations.at(-1)).toMatchObject({ operation: "cleanup", result: "PASS" })
  })

  it("SC08_evidence_all_fields_and_refs keeps attributable fields and checksums without credentials", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    const manifest = evidence.manifest!
    expect(manifest).toMatchObject({
      schemaVersion: "1.0.0",
      package: OVERLAY_PACKAGE,
      projectRef: "project-ref",
      companyId: "company-id",
      actorUserId: "actor-id",
      targetContactId: "target-id",
      baselineDigest: APPROVED_AUTHORITY_DIGEST,
    })
    expect(manifest.keys).toHaveLength(8)
    expect(manifest.intendedSurgeryIds).toHaveLength(8)
    expect(manifest.intendedAssignmentIds).toHaveLength(8)
    expect(manifest.intendedAuditIds).toHaveLength(8)
    expect(JSON.stringify({ manifest, events: evidence.events })).not.toMatch(/token|credential|password|dsn/i)
  })

  it("MANIFEST01 reconciliation resolves prepared state only from observed exact DB state", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    evidence.events.pop()
    const result = await executeReconcile({ domain, evidence, environment })
    expect(result).toBe("applied")
    expect(evidence.events.at(-1)?.state).toBe("applied")
  })

  it("MANIFEST01 rejects observed overlay IDs that differ from the prepared manifest", async () => {
    const domain = new MemoryDomain()
    const evidence = new MemoryEvidence()
    await executeCreate({ domain, evidence, environment, idFactory: deterministicIds() })
    evidence.events.pop()
    domain.snapshot.overlay = [{ ...domain.snapshot.overlay[0], surgeryId: "foreign-surgery-id" }, ...domain.snapshot.overlay.slice(1)]
    await expect(executeReconcile({ domain, evidence, environment })).rejects.toMatchObject({ code: "RECONCILIATION_UNRESOLVED" })
  })

  it("SC09_scope_guards rejects production, disabled preview and colliding run IDs", () => {
    expect(() => validateRuntimeEnvironment({ ...environment, deploymentTier: "production" }, "create")).toThrowError(OverlayGuardError)
    expect(() => validateRuntimeEnvironment({ ...environment, previewEnabled: "false" }, "create")).toThrowError(OverlayGuardError)
    expect(() => validateRuntimeEnvironment({ ...environment, operationRunId: environment.taskRunId }, "create")).toThrowError(OverlayGuardError)
  })

  it("builds a deterministic sanitized attestation contract", () => {
    const attestation = buildAttestation({
      kind: "preflight-attestation",
      taskId: "task-id",
      runId: environment.taskRunId,
      snapshot: baselineSnapshot(),
      result: "PASS",
      reason: null,
      checkedAt: "2026-07-21T12:00:00.000Z",
    })
    expect(attestation.attestationDigest).toHaveLength(64)
    expect(attestation).not.toHaveProperty("state")
    expect(attestation).not.toHaveProperty("manifestHash")
    expect(attestation).not.toHaveProperty("previousHash")
  })
})
