import { Prisma } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"
import { runRemitoIssuanceTransaction, runSurgicalRemitoIssuanceTransaction } from "@/lib/remito-verification/repository"
import { createRemitoTokenKeyring } from "@/lib/remito-verification/token"
import { emitirRemito } from "@/lib/services/remito.service"

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(code, {
    code,
    clientVersion: "7.8.0",
    meta,
  })
}

describe("Remito issuance whole-transaction retry policy", () => {
  it("reruns the whole Serializable issuance with fresh private artifacts and ordered atomic writes", async () => {
    const executions: Array<Array<{ operation: string; data?: Record<string, unknown> }>> = []
    const committed: Array<{ operation: string; data?: Record<string, unknown> }> = []
    let active: Array<{ operation: string; data?: Record<string, unknown> }> = []
    const record = (operation: string) => vi.fn(async (input?: { data?: Record<string, unknown> }) => {
      active.push({ operation, data: input?.data })
      return input
    })
    const draft = {
      id: "remito-1", companyId: "company-1", branchId: "branch-1", issuedBranchId: "branch-1",
      documentType: "REMITO_SALIDA", state: "Borrador", createdById: "user-1",
    }
    const tx = {
      $executeRaw: record("lock"),
      $queryRaw: vi.fn(async () => { active.push({ operation: "visible-number" }); return [{ next: 7 }] }),
      remito: {
        findFirst: vi.fn(async () => { active.push({ operation: "draft-read" }); return draft }),
        update: vi.fn(async ({ data }) => {
          active.push({ operation: "remito-issued", data })
          return { ...draft, ...data, visibleNumber: 7 }
        }),
      },
      company: { findUnique: vi.fn(async () => {
        active.push({ operation: "company-snapshot" })
        return { name: "Distribuidora Ágil S.A.", taxId: "30-12345678-9" }
      }) },
      remitoScanLocator: { create: record("locator") },
      remitoVerificationPublication: { create: record("publication") },
      remitoVerificationAccess: { create: record("access") },
      auditEvent: { create: record("audit") },
    }
    let randomCall = 0, idCall = 0, timeCall = 0, transactionCall = 0
    const issuanceDependencies = {
      keyring: createRemitoTokenKeyring({
        activeTokenKeyVersion: 1,
        keys: { "1": Buffer.alloc(32, 9).toString("base64url") },
      }),
      randomBytes: (size: number) => Buffer.alloc(size, ++randomCall),
      randomId: () => `generated-${++idCall}`,
      now: () => new Date(1_800_000_000_000 + ++timeCall),
    }
    const prisma = {
      remito: { findFirst: vi.fn().mockResolvedValue({ surgeryId: null }) },
      $transaction: vi.fn(async (callback, options) => {
        expect(options).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
        active = []
        transactionCall += 1
        const result = await callback(tx)
        executions.push(active)
        if (transactionCall === 1) throw prismaError("P2002", { constraint: "pk_remito_scan_locator_locator" })
        committed.push(...active)
        return result
      }),
    }
    const result = await emitirRemito({
      companyId: "company-1", remitoId: "remito-1", updatedById: "user-1",
      prisma: prisma as never, issuanceDependencies,
    })
    expect(result.state).toBe("Emitido")
    expect(prisma.remito.findFirst).toHaveBeenCalledTimes(1)
    expect(executions).toHaveLength(2)
    const order = ["lock", "draft-read", "visible-number", "remito-issued", "company-snapshot", "locator", "publication", "access", "audit"]
    expect(executions.map((run) => run.map(({ operation }) => operation))).toEqual([order, order])
    const data = (run: number, operation: string) => executions[run].find((step) => step.operation === operation)!.data!
    expect(committed).toEqual(executions[1])
    expect(committed).not.toContain(executions[0][0])
    expect(data(0, "locator").locator).not.toBe(data(1, "locator").locator)
    expect(data(0, "access").tokenNonce).not.toBe(data(1, "access").tokenNonce)
    expect(data(0, "access").tokenHash).not.toBe(data(1, "access").tokenHash)
    expect(data(0, "publication").fingerprintSha256).not.toBe(data(1, "publication").fingerprintSha256)
    expect(data(0, "publication").id).not.toBe(data(1, "publication").id)
    expect(data(0, "access").id).not.toBe(data(1, "access").id)
    for (const [operation, fields] of [["remito-issued", ["issuedAt"]], ["locator", ["issuedAt", "createdAt"]],
      ["publication", ["publishedAt", "createdAt"]], ["access", ["issuedAt", "createdAt"]]] as const) {
      for (const field of fields) expect(data(0, operation)[field]).not.toEqual(data(1, operation)[field])
    }
    expect(data(0, "audit").newValue).not.toEqual(data(1, "audit").newValue)
    expect(data(0, "audit").metadata).not.toEqual(data(1, "audit").metadata)
    const auditText = JSON.stringify(executions.map((run) => run.find((step) => step.operation === "audit")!.data))
    for (const secret of [data(0, "locator").locator, data(1, "locator").locator,
      data(0, "access").tokenNonce, data(1, "access").tokenNonce,
      data(0, "access").tokenHash, data(1, "access").tokenHash]) {
      expect(auditText).not.toContain(String(secret))
    }
  })
  it("keeps a non-draft unchanged and creates no issuance artifacts", async () => {
    const tx = {
      $executeRaw: vi.fn(),
      remito: { findFirst: vi.fn().mockResolvedValue({
        id: "remito-1", companyId: "company-1", state: "Emitido",
      }), update: vi.fn() },
      remitoScanLocator: { create: vi.fn() },
      remitoVerificationPublication: { create: vi.fn() },
      remitoVerificationAccess: { create: vi.fn() },
      auditEvent: { create: vi.fn() },
    }
    const prisma = { remito: { findFirst: vi.fn().mockResolvedValue({ surgeryId: null }) }, $transaction: vi.fn(async (callback) => callback(tx)) }
    await expect(emitirRemito({
      companyId: "company-1", remitoId: "remito-1", prisma: prisma as never,
      issuanceDependencies: { keyring: createRemitoTokenKeyring({
        activeTokenKeyVersion: 1, keys: { "1": Buffer.alloc(32, 1).toString("base64url") },
      }) },
    })).rejects.toMatchObject({ code: "remito_not_borrador" })
    for (const write of [tx.remito.update, tx.remitoScanLocator.create,
      tx.remitoVerificationPublication.create, tx.remitoVerificationAccess.create, tx.auditEvent.create]) {
      expect(write).not.toHaveBeenCalled()
    }
  })
  it("retries only the named global locator collision and regenerates every execution", async () => {
    const attempts: string[] = []
    const execute = vi.fn(async () => {
      attempts.push(`fresh-${attempts.length + 1}`)
      if (attempts.length < 6) {
        throw prismaError("P2002", { constraint: "pk_remito_scan_locator_locator" })
      }
      return attempts.at(-1)
    })
    await expect(runRemitoIssuanceTransaction(execute)).resolves.toBe("fresh-6")
    expect(attempts).toEqual(["fresh-1", "fresh-2", "fresh-3", "fresh-4", "fresh-5", "fresh-6"])
  })
  it("aborts unrelated or ambiguous P2002 errors immediately", async () => {
    for (const meta of [undefined, {}, { target: ["tokenHash"] }, { constraint: "other_constraint" },
      { target: "pk_remito_scan_locator_locator", constraint: "pk_remito_scan_locator_locator" }]) {
      const execute = vi.fn().mockRejectedValue(prismaError("P2002", meta))
      await expect(runRemitoIssuanceTransaction(execute)).rejects.toMatchObject({ code: "P2002" })
      expect(execute).toHaveBeenCalledTimes(1)
    }
  })
  it("allows only three P2034 transaction attempts", async () => {
    const execute = vi.fn().mockRejectedValue(prismaError("P2034"))
    await expect(runRemitoIssuanceTransaction(execute)).rejects.toMatchObject({ code: "P2034" })
    expect(execute).toHaveBeenCalledTimes(3)
  })
  it("reports every rolled-back attempt and the real retry lifecycle once", async () => {
    const events: string[] = []
    await expect(runRemitoIssuanceTransaction(
      async () => { throw prismaError("P2034") },
      {
        maxExecutions: 3,
        onAttemptStart: async attempt => { events.push(`started:${attempt}`) },
        onAttemptFailed: async (attempt, _error, retry, exhausted) => { events.push(`rolled-back:${attempt}`); if (retry) events.push(`scheduled:${attempt}`); if (exhausted) events.push(`exhausted:${attempt}`) },
      },
    )).rejects.toMatchObject({ code: "P2034" })
    expect(events).toEqual(["started:1", "rolled-back:1", "scheduled:1", "started:2", "rolled-back:2", "scheduled:2", "started:3", "rolled-back:3", "exhausted:3"])
  })
  it("keeps retry counters independent and never exceeds eight executions", async () => {
    let execution = 0
    const execute = vi.fn(async () => {
      execution += 1
      if (execution <= 5) {
        throw prismaError("P2002", { target: "pk_remito_scan_locator_locator" })
      }
      throw prismaError("P2034")
    })
    await expect(runRemitoIssuanceTransaction(execute)).rejects.toMatchObject({ code: "P2034" })
    expect(execute).toHaveBeenCalledTimes(8)
  })
  it("surgically retries only rollback-confirmed SQLSTATE with deterministic 25/100ms backoff", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const execute = vi.fn().mockRejectedValueOnce({ sqlstate: "55P03" }).mockRejectedValueOnce({ meta: { sqlstate: "40P01" } }).mockResolvedValue("ok")
    await expect(runSurgicalRemitoIssuanceTransaction(execute, { sleep })).resolves.toBe("ok")
    expect(sleep.mock.calls).toEqual([[25], [100]])
    expect(execute).toHaveBeenCalledTimes(3)
    for (const error of [prismaError("P2034"), prismaError("P2002", { constraint: "pk_remito_scan_locator_locator" })]) {
      const bare = vi.fn().mockRejectedValue(error)
      await expect(runSurgicalRemitoIssuanceTransaction(bare, { sleep })).rejects.toBe(error)
      expect(bare).toHaveBeenCalledOnce()
    }
  })
  it("maps third rollback-confirmed surgical exhaustion after lifecycle evidence to C14 conflict", async () => {
    const events: string[] = []
    const execute = vi.fn().mockRejectedValue({ sqlstate: "40001" })
    await expect(runSurgicalRemitoIssuanceTransaction(execute, {
      sleep: vi.fn().mockResolvedValue(undefined),
      onAttemptFailed: async (attempt, _error, _sqlstate, _willRetry, exhausted) => {
        events.push(`rolled-back:${attempt}`)
        if (exhausted) events.push(`exhausted:${attempt}`)
      },
    })).rejects.toMatchObject({ code: "C14_INSERT_CONFLICT", status: 409, attemptCount: 3 })
    expect(events).toEqual(["rolled-back:1", "rolled-back:2", "rolled-back:3", "exhausted:3"])
    expect(execute).toHaveBeenCalledTimes(3)
  })
})
