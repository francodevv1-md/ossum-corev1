import { describe, expect, it } from "vitest"

import {
  APPROVED_AUTHORITY_DIGEST,
  APPROVED_AUTHORITY_PATH,
  OVERLAY_FIXTURES,
  OVERLAY_ID_AUTHORITY_DIGEST,
  OVERLAY_MATRIX_DIGEST,
  OVERLAY_PACKAGE,
  LockStore,
  OverlayGuardError,
  buildEvidenceEvent,
  buildManifest,
  buildOperationLock,
  buildOverlayEnvelope,
  canonicalJson,
  classifyCreateFailure,
  evaluateActorAndTarget,
  evaluateOverlayOwnership,
  fixedRedactedProcessResult,
  overlayMetricDelta,
  parseRunnerArguments,
  readApprovedAuthority,
  selectOverlayKeys,
  validateEvidenceChain,
  type AuthorityReadPort,
  type EvidenceEvent,
  type LockFilePort,
  type OperationLock,
} from "@/lib/services/coordination-ezequiel-dev-overlay.service"

const ids = Array.from({ length: 24 }, (_, index) => `safe-id-${String(index).padStart(16, "0")}`)

function lock(overrides: Partial<OperationLock> = {}): OperationLock {
  return buildOperationLock({
    host: "host-a",
    pid: 100,
    processStartTime: "2026-07-21T10:00:00.000Z",
    runId: "run-0000000000000001",
    operation: "create",
    nonce: "nonce-00000000000001",
    timestamp: "2026-07-21T10:00:00.000Z",
    chainAnchor: null,
    ...overrides,
  })
}

class MemoryLockPort implements LockFilePort {
  files = new Map<string, string>()
  protectedPaths = new Set<string>()

  async ensureProtectedDirectory(path: string) { this.protectedPaths.add(path) }
  async writeExclusiveSynced(path: string, content: string) {
    if (this.files.has(path)) throw Object.assign(new Error("exists"), { code: "EEXIST" })
    this.files.set(path, content)
    this.protectedPaths.add(path)
  }
  async read(path: string) {
    const value = this.files.get(path)
    if (!value) throw Object.assign(new Error("missing"), { code: "ENOENT" })
    return value
  }
  async rename(path: string, destination: string) {
    const value = await this.read(path)
    if (this.files.has(destination)) throw Object.assign(new Error("exists"), { code: "EEXIST" })
    this.files.delete(path)
    this.files.set(destination, value)
    this.protectedPaths.add(destination)
  }
  async remove(path: string) { this.files.delete(path) }
  async exists(path: string) { return this.files.has(path) }
  async verifyProtectedAcl(path: string) { return this.protectedPaths.has(path) }
}

function manifest() {
  return buildManifest({
    runId: "run-0000000000000001",
    operationId: "operation-0000000001",
    projectRef: "project-ref",
    companyId: "company-id",
    actorUserId: "actor-id",
    targetContactId: "target-id",
    intendedAssignmentIds: ids.slice(8, 16),
    intendedAuditIds: ids.slice(16, 24),
    createdAt: "2026-07-21T12:00:00.000Z",
  })
}

function event(state: EvidenceEvent["state"], previousHash: string, source = manifest()) {
  return buildEvidenceEvent({
    event: state.startsWith("cleanup") || state === "cleaned" ? "cleanup" : "create",
    state,
    previousHash,
    nonce: "event-nonce",
    timestamp: "2026-07-21T12:00:01.000Z",
    operationTimestamp: source.createdAt,
    projectRef: source.projectRef,
    companyId: source.companyId,
    actorUserId: source.actorUserId,
    targetContactId: source.targetContactId,
    runId: source.runId,
    operationId: source.operationId,
    manifestHash: source.checksum,
    keys: source.keys,
    intendedIds: [...source.intendedSurgeryIds, ...source.intendedAssignmentIds],
    observedIds: [],
    auditRefs: [],
    outcome: state,
    errorCode: null,
  })
}

describe("coordination Ezequiel overlay T1", () => {
  it("freezes the exact A-H matrix, boundary time and metric/filter memberships", () => {
    expect(OVERLAY_FIXTURES.map((item) => item.key)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"])
    expect(OVERLAY_FIXTURES.map((item) => item.externalKey)).toEqual("ABCDEFGH".split("").map((key) => `coord-ezequiel-qa-002:${key}`))
    expect(OVERLAY_FIXTURES[0].assignmentAt).toBe("2026-07-19T12:00:00.000Z")
    expect(OVERLAY_FIXTURES[1].assignmentAt).toBe("2026-07-19T12:00:00.001Z")
    expect(overlayMetricDelta()).toEqual({ "Poner fecha": 2, "Fuera de plazo": 1, Coordinadas: 2, "En tránsito": 1 })
    expect(selectOverlayKeys((item) => item.metrics.includes("Poner fecha") && item.metrics.includes("Fuera de plazo"))).toEqual(["A"])
    expect(selectOverlayKeys((item) => item.metrics.includes("Coordinadas") && item.metrics.includes("En tránsito"))).toEqual(["D"])
    expect(selectOverlayKeys((item) => item.metrics.includes("Poner fecha") && item.metrics.includes("Coordinadas"))).toEqual([])
    expect(selectOverlayKeys((item) => item.metrics.includes("En tránsito") && item.institution === "Y")).toEqual([])
    expect(selectOverlayKeys((item) => item.cxDate === "2026-07-24" && item.institution === "X")).toEqual(["C", "D"])
    expect(OVERLAY_FIXTURES.slice(4).map((item) => item.pending)).toEqual([
      ["Documentación"], ["Consumo"], ["Documentación", "Consumo", "Facturación"], [],
    ])
    expect(OVERLAY_FIXTURES.map((item) => item.surgeryId)).toEqual([
      "c9590681-82d3-5430-833a-325739743862", "48b74ece-07b2-549a-941a-8d1fce013449",
      "9f408eac-a9d5-5153-b604-f8e29f51b32a", "7d243a45-c030-5b07-a28f-7d9b271cd6a5",
      "f6a783a6-2b26-5568-b9f7-949e7c42e515", "78173716-30b2-5367-b027-d87685f80c9d",
      "b318570e-2007-545c-9dd6-75182343c88f", "0d2ad460-cba6-540e-9ca3-521af69a21b6",
    ])
    expect(OVERLAY_FIXTURES.every((item) => item.lifecycle === "active")).toBe(true)
    expect(OVERLAY_ID_AUTHORITY_DIGEST).toBe("e742282463489eaaa3035be3a63a1b0c929b9b26916658e249f777cd94ae2e52")
    expect(OVERLAY_MATRIX_DIGEST).toHaveLength(64)
    const envelope = buildOverlayEnvelope(OVERLAY_FIXTURES[0], "company-dev", "target-dev")
    expect(JSON.stringify(envelope.value)).toBe(envelope.bytes)
    expect(envelope.value.checksum).toHaveLength(64)
  })

  it("reads only the exact approved immutable authority and fails closed on path, ACL, digest or schema drift", async () => {
    const authority = {
      schemaVersion: "1.0.0",
      approvalStatus: "candidate-unapproved",
      fixture: { setKey: "set", version: "2" },
      algorithm: { ordering: "x", assignmentPartition: "x", canonicalization: "x", digest: "x" },
      project: { ref: "project-ref", deploymentTier: "development" },
      company: { marker: "Districorr DEV", organizationMarker: "ossum-dev" },
      entries: Array.from({ length: 21 }, (_, index) => ({
        ordinal: index + 1,
        stableKey: `key-${index}`,
        surgeryId: `surgery-${index}`,
        source: "fixture",
        ownership: "fixture",
        expectedAssignee: { symbolicName: index < 8 ? "Nelson DEV" : index < 16 ? "Ezequiel DEV" : "", role: "coordinator" },
      })),
    }
    const exactBytes = new TextEncoder().encode(JSON.stringify(authority))
    const port: AuthorityReadPort = {
      readBytes: async () => exactBytes,
      inspect: async () => ({ isFile: true, isLink: false, realPath: APPROVED_AUTHORITY_PATH }),
      verifyProtectedAcl: async () => true,
    }
    await expect(readApprovedAuthority({ ...port, readBytes: async () => new Uint8Array() }, "project-ref")).rejects.toMatchObject({ code: "AUTHORITY_DIGEST_MISMATCH" })
    await expect(readApprovedAuthority(port, "project-ref", `${APPROVED_AUTHORITY_PATH}.other`)).rejects.toMatchObject({ code: "AUTHORITY_PATH_MISMATCH" })
    await expect(readApprovedAuthority({ ...port, verifyProtectedAcl: async () => false }, "project-ref")).rejects.toMatchObject({ code: "AUTHORITY_ACL_INVALID" })
    expect(APPROVED_AUTHORITY_DIGEST).toHaveLength(64)
  })

  it("SC02_reject_cardinality: accepts only one active operator access and one personal coordinator link", () => {
    const valid = {
      authenticatedSupabaseId: "auth-sensitive",
      companyId: "company-sensitive",
      operators: [{ userId: "actor-sensitive", supabaseAuthId: "auth-sensitive", isActive: true, accesses: [{ companyId: "company-sensitive", role: "admin", isActive: true }] }],
      targets: [{ contactId: "target-sensitive", isCompany: false, isActive: true, links: [{ companyId: "company-sensitive", role: "coordinator", isActive: true }] }],
    }
    expect(evaluateActorAndTarget(valid)).toMatchObject({ result: "PASS", errorCode: null })
    expect(evaluateActorAndTarget({ ...valid, operators: [] }).errorCode).toBe("OPERATOR_CARDINALITY_REJECTED")
    expect(evaluateActorAndTarget({ ...valid, operators: [...valid.operators, valid.operators[0]] }).errorCode).toBe("OPERATOR_CARDINALITY_REJECTED")
    expect(evaluateActorAndTarget({ ...valid, targets: [{ ...valid.targets[0], isCompany: true }] }).errorCode).toBe("TARGET_CARDINALITY_REJECTED")
    expect(JSON.stringify(evaluateActorAndTarget(valid))).not.toMatch(/sensitive/)
  })

  it("SC02_reject_ownership: distinguishes absent, exact, partial, collision and assignment duplication", () => {
    const target = "target-id"
    const exact = OVERLAY_FIXTURES.map((item, index) => ({
      externalKey: item.externalKey,
      surgeryId: item.surgeryId,
      assignmentIds: [`assignment-${index}`],
      assignmentContactIds: [target],
      ownershipPackage: OVERLAY_PACKAGE,
    }))
    expect(evaluateOverlayOwnership([], target).state).toBe("absent")
    expect(evaluateOverlayOwnership(exact, target).state).toBe("exact")
    expect(evaluateOverlayOwnership(exact.slice(0, 7), target).errorCode).toBe("OVERLAY_PARTIAL_REJECTED")
    expect(evaluateOverlayOwnership([...exact, exact[0]], target).errorCode).toBe("OVERLAY_OWNERSHIP_COLLISION")
    expect(evaluateOverlayOwnership([{ ...exact[0], assignmentIds: ["a", "b"], assignmentContactIds: [target, target] }, ...exact.slice(1)], target).errorCode).toBe("OVERLAY_ASSIGNMENT_CARDINALITY_REJECTED")
    expect(evaluateOverlayOwnership([{ ...exact[0], ownershipPackage: "foreign" }, ...exact.slice(1)], target).errorCode).toBe("OVERLAY_OWNER_REJECTED")
  })

  it("MANIFEST01_prepare_tx_finalize_failures: validates checksums, transitions and uncertainty classification", () => {
    const source = manifest()
    const prepared = event("prepared", source.checksum, source)
    const applied = event("applied", prepared.checksum, source)
    expect(validateEvidenceChain(source, [prepared, applied])).toEqual({ valid: true, errorCode: null })
    expect(validateEvidenceChain(source, [event("applied", source.checksum, source)]).errorCode).toBe("EVENT_TRANSITION_INVALID")
    expect(validateEvidenceChain(source, [{ ...prepared, previousHash: "tampered" }]).errorCode).toBe("EVENT_CHECKSUM_INVALID")
    expect(classifyCreateFailure({ preparedDurable: false, transactionStarted: false, transactionCommitted: false, finalized: false })).toBe("failed-zero")
    expect(classifyCreateFailure({ preparedDurable: true, transactionStarted: true, transactionCommitted: false, finalized: false })).toBe("failed-zero")
    expect(classifyCreateFailure({ preparedDurable: true, transactionStarted: true, transactionCommitted: null, finalized: false })).toBe("applied-unknown")
    expect(classifyCreateFailure({ preparedDurable: true, transactionStarted: true, transactionCommitted: true, finalized: false })).toBe("applied-unknown")
    expect(classifyCreateFailure({ preparedDurable: true, transactionStarted: true, transactionCommitted: true, finalized: true })).toBe("applied")
  })

  it("LOCK01_contention_stale_PID_starttime: serializes ownership and rejects unsafe recovery", async () => {
    const port = new MemoryLockPort()
    const path = "C:\\safe\\locks\\operation.lock"
    const store = new LockStore(port, path)
    const original = lock()
    await store.acquire(original)
    await expect(store.acquire(lock({ runId: "run-0000000000000002", nonce: "nonce-00000000000002" }))).rejects.toMatchObject({ code: "LOCK_CONTENDED" })
    await expect(store.release({ runId: original.runId, nonce: "wrong-000000000000" })).rejects.toMatchObject({ code: "LOCK_OWNER_MISMATCH" })
    await expect(store.recoverAndAcquire({
      replacement: lock({ operation: "reconcile", runId: "run-0000000000000002", nonce: "nonce-00000000000002", timestamp: "2026-07-21T12:00:00.000Z" }),
      now: new Date("2026-07-21T10:14:59.999Z"),
      processState: async () => "absent",
      operationRunExists: false,
      chainValid: true,
      nextTaskOutputExists: false,
      existingTaskEvidenceValid: true,
    })).rejects.toMatchObject({ code: "LOCK_TOO_YOUNG" })
    await expect(store.recoverAndAcquire({
      replacement: lock({ operation: "reconcile", runId: "run-0000000000000002", nonce: "nonce-00000000000002", timestamp: "2026-07-21T12:00:00.000Z" }),
      now: new Date("2026-07-21T12:00:00.000Z"),
      processState: async () => "same",
      operationRunExists: false,
      chainValid: true,
      nextTaskOutputExists: false,
      existingTaskEvidenceValid: true,
    })).rejects.toMatchObject({ code: "LOCK_OWNER_LIVE" })
  })

  it("LOCK01 recovers only a stale same-host create with absent OP_RUN and no chain, then acquires replacement", async () => {
    const port = new MemoryLockPort()
    const path = "C:\\safe\\locks\\operation.lock"
    const store = new LockStore(port, path)
    const original = lock()
    await store.acquire(original)
    const replacement = lock({ operation: "reconcile", runId: "run-0000000000000002", nonce: "nonce-00000000000002", timestamp: "2026-07-21T12:00:00.000Z" })
    const recovered = await store.recoverAndAcquire({
      replacement,
      now: new Date("2026-07-21T12:00:00.000Z"),
      processState: async () => "different",
      operationRunExists: false,
      chainValid: false,
      nextTaskOutputExists: false,
      existingTaskEvidenceValid: true,
    })
    expect(recovered).toContain(`recovered-operation-${original.runId}-${original.nonce}.json`)
    expect(JSON.parse(await port.read(path))).toMatchObject({ runId: replacement.runId, nonce: replacement.nonce })
    await store.release(replacement)
    expect(await port.exists(path)).toBe(false)
  })

  it("LOCK01 rejects create recovery with OP_RUN, foreign host, corrupt checksum or non-reconcile caller", async () => {
    const scenarios = [
      { mutate: (value: OperationLock) => value, replacement: lock({ operation: "create", runId: "run-0000000000000002", nonce: "nonce-00000000000002" }), operationRunExists: false, code: "LOCK_RECOVERY_MODE_REJECTED" },
      { mutate: (value: OperationLock) => value, replacement: lock({ operation: "reconcile", host: "host-b", runId: "run-0000000000000002", nonce: "nonce-00000000000002" }), operationRunExists: false, code: "LOCK_FOREIGN_HOST" },
      { mutate: (value: OperationLock) => value, replacement: lock({ operation: "reconcile", runId: "run-0000000000000002", nonce: "nonce-00000000000002" }), operationRunExists: true, code: "LOCK_CREATE_RECOVERY_REJECTED" },
    ]
    for (const scenario of scenarios) {
      const port = new MemoryLockPort()
      const path = "C:\\safe\\locks\\operation.lock"
      const store = new LockStore(port, path)
      await store.acquire(scenario.mutate(lock()))
      await expect(store.recoverAndAcquire({
        replacement: scenario.replacement,
        now: new Date("2026-07-21T12:00:00.000Z"),
        processState: async () => "absent",
        operationRunExists: scenario.operationRunExists,
        chainValid: true,
        nextTaskOutputExists: false,
        existingTaskEvidenceValid: true,
      })).rejects.toMatchObject({ code: scenario.code })
    }
  })

  it("LOCK01 removes its own newly-created lock when ACL verification fails", async () => {
    const port = new MemoryLockPort()
    port.verifyProtectedAcl = async () => false
    const path = "C:\\safe\\locks\\operation.lock"
    const store = new LockStore(port, path)
    await expect(store.acquire(lock())).rejects.toMatchObject({ code: "LOCK_ACL_INVALID" })
    expect(await port.exists(path)).toBe(false)
  })

  it("parses only strict bounded runner modes and emits fixed redacted process results", () => {
    expect(parseRunnerArguments(["--mode", "preflight", "--read-only", "--task-id", "TASK-1"])).toEqual({ mode: "preflight", readOnly: true, taskId: "TASK-1", host: null, port: null, buildRoot: null, stdoutOnly: false })
    expect(parseRunnerArguments(["--mode", "server-start", "--host", "127.0.0.1", "--port", "3000"])).toMatchObject({ mode: "server-start", host: "127.0.0.1", port: 3000 })
    expect(() => parseRunnerArguments(["--mode", "unknown"])).toThrowError(OverlayGuardError)
    expect(() => parseRunnerArguments(["--mode", "create", "--token", "secret"])).toThrowError(OverlayGuardError)
    expect(() => parseRunnerArguments(["--mode", "create", "--mode", "cleanup"])).toThrowError(OverlayGuardError)
    expect(parseRunnerArguments(["--mode", "bundle-scan", "--build-root", ".next", "--stdout-only"])).toMatchObject({ mode: "bundle-scan", buildRoot: ".next", stdoutOnly: true })
    expect(fixedRedactedProcessResult("T1_RUNTIME_DISABLED")).toBe(canonicalJson({ result: "FAIL", errorCode: "T1_RUNTIME_DISABLED" }))
  })
})
