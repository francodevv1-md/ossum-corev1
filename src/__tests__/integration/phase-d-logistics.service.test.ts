/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"
import { closeReconciliation, receiveReturn, recordConsumption, registerReturn, registerUnidentifiedReturn, reopenReconciliation, resolveUnidentifiedReturn } from "@/lib/services/phase-d-logistics.service"

function fixture(options: { serial?: string; failAudit?: boolean; dispatchCompanyId?: string; dispatchSurgeryId?: string } = {}) {
  let rows: any[] = [], commands = new Map<string, any>(); const events: any[] = []
  const operation = {
    findFirst: vi.fn(async ({ where }: any) => where.commandKey ? commands.get(where.commandKey) ?? null : where.id ? rows.find(row => row.id === where.id) ?? null : null),
    findMany: vi.fn(async () => rows),
    create: vi.fn(async ({ data }: any) => { if (commands.has(data.commandKey)) { const error = new Error("duplicate") as Error & { code: string }; error.code = "P2002"; throw error }; const saved = { ...data, id: `op-${rows.length + 1}` }; rows.push(saved); commands.set(saved.commandKey, saved); return saved }),
  }
  const tx = {
    $queryRawUnsafe: vi.fn(async () => [{ id: "line-1" }]), cajasPhaseDOperation: operation,
    cajasDispatch: { findFirst: vi.fn(async ({ where }: any) => where.id === "dispatch-1" && where.companyId === (options.dispatchCompanyId ?? "company-1") ? { remitoId: "remito-1", remito: { surgeryId: options.dispatchSurgeryId ?? "surgery-1" } } : null) },
    cajasDispatchLine: { findFirst: vi.fn(async () => ({ id: "line-1", companyId: "company-1", dispatchId: "dispatch-1", quantity: new Prisma.Decimal(1), articleId: "article-1", stockPositionId: "position-1", stockUnit: "UNIT", scaleSnapshot: 0, serialNumberSnapshot: options.serial ?? null, identifiedCodeSnapshot: null, lotCodeSnapshot: "lot-1", expirationDateSnapshot: null, dispatch: { remitoId: "remito-1" } })), findMany: vi.fn(async () => [{ id: "line-1", quantity: new Prisma.Decimal(1) }]) },
    remito: { findFirst: vi.fn(async () => ({ surgeryId: "surgery-1" })) },
    auditEvent: { create: vi.fn(async () => { if (options.failAudit) throw new Error("audit failed"); return { id: "audit-1" } }) },
    operationalCommandAcceptance: { create: vi.fn(async () => ({ id: "acceptance-1" })) },
    stockEvidence: { create: vi.fn(async () => ({ id: "evidence-1" })) },
    stockEvidenceLine: { create: vi.fn(async () => ({ id: "evidence-line-1" })) },
    stockPositionProjection: { updateMany: vi.fn(async () => ({ count: 1 })) },
    cajasPhaseDReconciliationEvent: { findFirst: vi.fn(async ({ where }: any) => where.commandKey ? events.find(event => event.commandKey === where.commandKey) ?? null : events.at(-1) ?? null), create: vi.fn(async ({ data }: any) => { const event = { ...data, id: `event-${events.length + 1}` }; events.push(event); return event }) },
  }
  const prisma = {
    cajasPhaseDActionGrant: { findFirst: vi.fn(async () => ({ id: "grant-1" })) },
    cajasPhaseDOperation: operation,
    $transaction: vi.fn(async (run: any) => { const before = rows.slice(), beforeCommands = new Map(commands); try { return await run(tx) } catch (error: any) { if (error?.code !== "P2002") { rows = before; commands = beforeCommands }; throw error } }),
  }
  return { prisma, get rows() { return rows }, get events() { return events }, writes: { audit: tx.auditEvent.create, acceptance: tx.operationalCommandAcceptance.create, reconciliation: tx.cajasPhaseDReconciliationEvent.create } }
}

const input = (commandKey: string, quantity: number | string = 1) => ({ commandKey, dispatchId: "dispatch-1", dispatchLineId: "line-1", quantity })
const context = (prisma: any) => ({ companyId: "company-1", actorId: "user-1", role: "operator", surgeryId: "surgery-1", prisma })

describe("Phase D consumption command", () => {
  it("uses immutable dispatch lineage, replays same key, and rejects changed intent", async () => {
    const db = fixture()
    await expect(recordConsumption(context(db.prisma), input("same"))).resolves.toMatchObject({ replayed: false, operation: { bundleId: "WCB-08", stockPositionId: "position-1", lotCodeSnapshot: "lot-1" } })
    await expect(recordConsumption(context(db.prisma), input("same"))).resolves.toMatchObject({ replayed: true })
    await expect(recordConsumption(context(db.prisma), input("same", 0.5))).rejects.toMatchObject({ code: "phase_d_idempotency_conflict" })
    expect(db.rows).toHaveLength(1)
  })

  it("blocks ceiling and partial serial disposition, and rolls back an incomplete command", async () => {
    const ceiling = fixture(); await recordConsumption(context(ceiling.prisma), input("first")); await expect(recordConsumption(context(ceiling.prisma), input("second"))).rejects.toMatchObject({ code: "phase_d_dispatch_ceiling_exceeded" })
    const serial = fixture({ serial: "serial-1" }); await expect(recordConsumption(context(serial.prisma), input("partial", 0.5))).rejects.toMatchObject({ code: "phase_d_identified_partial_forbidden" })
    const failed = fixture({ failAudit: true }); await expect(recordConsumption(context(failed.prisma), input("rollback"))).rejects.toThrow("audit failed"); expect(failed.rows).toHaveLength(0)
  })

  it("keeps registration unavailable until human FIT control accepts traced re-entry", async () => {
    const db = fixture()
    const registered = await registerReturn(context(db.prisma), input("return-1"))
    await expect(receiveReturn(context(db.prisma), { commandKey: "receive-1", dispatchId: "dispatch-1", quantity: 1, sourceOperationId: registered.operation.id, receiptOutcome: "FIT" })).resolves.toMatchObject({ availableStockChanged: true })
    expect(db.prisma.$transaction).toHaveBeenCalledTimes(2)
  })

  it("keeps non-FIT and unidentified returns unavailable through audited append-only resolution", async () => {
    const db = fixture()
    const identified = await registerReturn(context(db.prisma), input("return-observed"))
    await expect(receiveReturn(context(db.prisma), { commandKey: "observed", dispatchId: "dispatch-1", quantity: 1, sourceOperationId: identified.operation.id, receiptOutcome: "OBSERVED" })).resolves.toMatchObject({ availableStockChanged: false })
    expect(db.rows).toHaveLength(2)
    const pending = await registerUnidentifiedReturn(context(db.prisma), { commandKey: "pending", dispatchId: "dispatch-1", quantity: 1, sourceOperationId: "return-record-1" })
    await expect(resolveUnidentifiedReturn(context(db.prisma), { commandKey: "incident", dispatchId: "dispatch-1", quantity: 1, sourceOperationId: pending.operation.id, receiptOutcome: "DAMAGED", reason: "Physical incident" })).resolves.toMatchObject({ availableStockChanged: false })
    expect(db.rows.at(-1)).toMatchObject({ sourceOperationId: pending.operation.id, receiptOutcome: "DAMAGED", returnState: "RECEIVED" })
    expect(db.rows.some(row => row.returnState === "PENDING_IDENTIFICATION")).toBe(true)
  })

  it("denies every command when its explicit action grant is absent", async () => {
    const db = fixture(); db.prisma.cajasPhaseDActionGrant.findFirst.mockResolvedValue(null as never)
    await expect(recordConsumption(context(db.prisma), input("denied"))).rejects.toMatchObject({ code: "phase_d_action_denied" })
    await expect(closeReconciliation(context(db.prisma), { dispatchId: "dispatch-1", commandKey: "denied-close" })).rejects.toMatchObject({ code: "phase_d_action_denied" })
    expect(db.rows).toHaveLength(0)
    expect(db.events).toHaveLength(0)
  })

  it("closes only an eligible snapshot, replays it, and permits an audited admin reopen", async () => {
    const db = fixture(); await recordConsumption(context(db.prisma), input("final"))
    await expect(closeReconciliation(context(db.prisma), { dispatchId: "dispatch-1", commandKey: "close" })).resolves.toMatchObject({ replayed: false, snapshot: { closeEligible: true } })
    await expect(closeReconciliation(context(db.prisma), { dispatchId: "dispatch-1", commandKey: "close" })).resolves.toMatchObject({ replayed: true })
    await expect(reopenReconciliation({ ...context(db.prisma), role: "operator" }, { dispatchId: "dispatch-1", commandKey: "reopen", reason: "correction" })).rejects.toMatchObject({ code: "phase_d_reopen_denied" })
    await expect(reopenReconciliation({ ...context(db.prisma), role: "admin" }, { dispatchId: "dispatch-1", commandKey: "reopen", reason: "correction" })).resolves.toMatchObject({ replayed: false })
    expect(db.events).toHaveLength(2)
  })

  it("rejects reconciliation commands outside the route surgery or company before any write", async () => {
    const otherSurgery = fixture({ dispatchSurgeryId: "surgery-2" })
    await expect(closeReconciliation(context(otherSurgery.prisma), { dispatchId: "dispatch-1", commandKey: "other-surgery" })).rejects.toMatchObject({ code: "phase_d_dispatch_surgery_not_found" })
    await expect(reopenReconciliation({ ...context(otherSurgery.prisma), role: "admin" }, { dispatchId: "dispatch-1", commandKey: "other-surgery-reopen", reason: "correction" })).rejects.toMatchObject({ code: "phase_d_dispatch_surgery_not_found" })
    expect(otherSurgery.events).toHaveLength(0)
    expect(otherSurgery.writes.audit).not.toHaveBeenCalled()
    expect(otherSurgery.writes.acceptance).not.toHaveBeenCalled()

    const otherCompany = fixture({ dispatchCompanyId: "company-2" })
    await expect(closeReconciliation(context(otherCompany.prisma), { dispatchId: "dispatch-1", commandKey: "other-company" })).rejects.toMatchObject({ code: "phase_d_dispatch_surgery_not_found" })
    await expect(reopenReconciliation({ ...context(otherCompany.prisma), role: "admin" }, { dispatchId: "dispatch-1", commandKey: "other-company-reopen", reason: "correction" })).rejects.toMatchObject({ code: "phase_d_dispatch_surgery_not_found" })
    expect(otherCompany.events).toHaveLength(0)
    expect(otherCompany.writes.reconciliation).not.toHaveBeenCalled()
  })

  it("uses immutable return snapshots, caps aggregate returns, and accepts one concurrent same key", async () => {
    const db = fixture(); const first = await registerReturn(context(db.prisma), input("return-cap")); const captured = { ...first.operation }
    await expect(registerReturn(context(db.prisma), input("return-cap-2"))).rejects.toMatchObject({ code: "phase_d_dispatch_ceiling_exceeded" })
    expect(captured).toMatchObject({ stockPositionId: "position-1", lotCodeSnapshot: "lot-1" })
    const race = fixture(); await expect(Promise.all([recordConsumption(context(race.prisma), input("race")), recordConsumption(context(race.prisma), input("race"))])).resolves.toHaveLength(2)
    expect(race.rows).toHaveLength(1)
  })
})
