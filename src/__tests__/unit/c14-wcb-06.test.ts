import { describe, expect, it, vi } from "vitest"
import { C14RuntimeError, type Wcb06Command } from "@/lib/services/c14/bundles/private-writer-runtime"
import { execute } from "@/lib/services/c14/bundles/wcb-06"
import { validate } from "@/lib/validators/c14/bundles/wcb-06"
import { authorize, WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer"

const now = new Date("2026-08-13T12:00:00.000Z")
const command = () => ({
  companyId: "co1", commandId: "cmd1", actorId: "u1", resultEntityId: "dispatch1", completePayloadSha256: "a".repeat(64),
  authorizationProof: { bundleId: "WCB-06", companyId: "co1", actorId: "u1", contractIds: ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"], authorizationProofSha256: "b".repeat(64) },
  anchorIdentifiedUnitIds: ["unit1"],
  stockEvidenceHeader: { id: "stock1", kind: "DISPATCH", recordKind: "ORIGINAL", sourceDomain: "CAJAS", sourceEntityType: "CAJAS_DISPATCH", sourceEntityId: "dispatch1", sourceCheckpoint: "DISPATCH", activationBoundaryId: null, correctsEvidenceId: null, reversesEvidenceId: null, cause: null },
  stockEvidenceLines: [{ id: "stock-line1", evidenceId: "stock1", lineNumber: 1, articleId: "article1", fromPositionId: "position1", toPositionId: null, reservationId: "reservation1", quantity: "2.0000", stockUnit: "UNIT", scaleSnapshot: 0, lotCodeSnapshot: null, expirationDateSnapshot: null, serialNumberSnapshot: null, identifiedCodeSnapshot: null, sourceLineId: "item1", traceSnapshot: { schemaVersion: "C14-TRACE-SNAPSHOT-V1", mode: "NONE" } }],
  reservationEvidence: { id: "reservation-event1", reservationId: "reservation1", sequence: 2, kind: "APPLY_TO_DISPATCH", quantity: "2.0000", stockUnit: "UNIT", scaleSnapshot: 0, replacesEvidenceId: null, cause: null },
  dispatchHeader: { id: "dispatch1", assignmentId: "assignment1", remitoId: "remito1", sourceControlId: "control1", sequence: 1, recordKind: "ORIGINAL", correctsDispatchId: null, cause: null },
  dispatchLines: [{ id: "dispatch-line1", dispatchId: "dispatch1", assignmentId: "assignment1", remitoId: "remito1", lineNumber: 1, recordKind: "ORIGINAL", accountingSign: 1, neutralizesDispatchLineId: null, remitoItemId: "item1", sourceControlLineId: "control-line1", sourcePreparationId: "prep1", sourcePreparationLineId: "prep-line1", articleId: "article1", stockPositionId: "position1", quantity: "2.0000", stockUnit: "UNIT", scaleSnapshot: 0, skuSnapshot: null, descriptionSnapshot: null, lotCodeSnapshot: null, expirationDateSnapshot: null, serialNumberSnapshot: null, identifiedCodeSnapshot: null, traceabilitySnapshot: { schemaVersion: "C14-TRACE-SNAPSHOT-V1", mode: "NONE" }, stockEvidenceLineId: "stock-line1" }],
  reservationEffect: { id: "effect1", stockReservationEvidenceId: "reservation-event1" }, stockEffect: { id: "effect2", stockEvidenceId: "stock1" },
})
const approved = async () => {
  const value = command()
  value.authorizationProof = await authorize({ userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "m1", role: "admin", userId: "u1", companyId: "co1", isActive: true }) } } as never,
    { actorId: "u1", companyId: "co1", bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS })
  return value
}
const attempt = () => Object.freeze({ attemptId: crypto.randomUUID(), semanticKeySha256: "c".repeat(64) })
const withTwoReservations = () => {
  const input = command() as ReturnType<typeof command> & Pick<Wcb06Command, "reservationEvidences" | "reservationEffects">
  const reservation = { ...input.reservationEvidence, id: "reservation-event2", reservationId: "reservation2", quantity: "3.0000" }
  input.reservationEvidences = [input.reservationEvidence, reservation]
  input.reservationEffects = [input.reservationEffect, { id: "effect3", stockReservationEvidenceId: reservation.id }]
  input.stockEvidenceLines.push({ ...input.stockEvidenceLines[0], id: "stock-line2", lineNumber: 2, reservationId: reservation.reservationId, quantity: reservation.quantity })
  input.dispatchLines.push({ ...input.dispatchLines[0], id: "dispatch-line2", lineNumber: 2, stockEvidenceLineId: "stock-line2", quantity: reservation.quantity })
  return input
}

function mockTx(existing: unknown = null) {
  const order: string[] = []
  const create = (name: string) => vi.fn(async ({ data }) => { order.push(name); return data })
  const input = command()
  const acceptance = Object.assign({ id: "accepted1", auditEventId: "audit1", intentHash: "intent1", acceptedAt: now }, existing)
  const audit = { id: acceptance.auditEventId, companyId: "co1", userId: "u1", entityType: "CAJAS_DISPATCH", entityId: "dispatch1", action: "C14_COMMAND_ACCEPTED", detail: null, oldValue: null, newValue: { schemaVersion: "C14-CX08-CCT1-ACCEPTED-AUDIT-VALUE-V1", bundleId: "WCB-06", contractIds: ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"], commandAcceptanceId: acceptance.id, completePayloadSha256: input.completePayloadSha256, resultEntityType: "CAJAS_DISPATCH", resultEntityId: "dispatch1" }, module: "STOCK_CAJAS_C14", metadata: { authorizationProofSha256: "b".repeat(64) }, createdAt: acceptance.acceptedAt }
  const evidence = { ...input.stockEvidenceHeader, companyId: "co1", acceptedAt: acceptance.acceptedAt, acceptedById: "u1", commandAcceptanceId: acceptance.id, auditEventId: acceptance.auditEventId, createdAt: acceptance.acceptedAt, lines: input.stockEvidenceLines.map(({ traceSnapshot: _, ...line }) => ({ ...line, companyId: "co1", createdAt: acceptance.acceptedAt })) }
  const reservation = { ...input.reservationEvidence, companyId: "co1", acceptedAt: acceptance.acceptedAt, acceptedById: "u1", commandAcceptanceId: acceptance.id, auditEventId: acceptance.auditEventId, createdAt: acceptance.acceptedAt }
  const dispatch = { ...input.dispatchHeader, companyId: "co1", acceptedAt: acceptance.acceptedAt, acceptedById: "u1", commandAcceptanceId: acceptance.id, createdAt: acceptance.acceptedAt, lines: input.dispatchLines.map(line => ({ ...line, companyId: "co1", createdAt: acceptance.acceptedAt })) }
  const effects: any[] = [
    { id: input.stockEffect.id, companyId: "co1", commandAcceptanceId: acceptance.id, effectKey: "dispatch-stock", effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: "dispatch1", stockEvidenceId: "stock1", stockReservationEvidenceId: null, createdAt: acceptance.acceptedAt },
    { id: input.reservationEffect.id, companyId: "co1", commandAcceptanceId: acceptance.id, effectKey: "reservation-application", effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_RESERVATION_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: "dispatch1", stockEvidenceId: null, stockReservationEvidenceId: "reservation-event1", createdAt: acceptance.acceptedAt },
  ]
  const tx = {
    $queryRawUnsafe: vi.fn(async (sql: string) => sql.includes("transaction_timestamp") ? [{ now }] : [{ id: "anchor" }]),
    $executeRawUnsafe: vi.fn(async () => { order.push("deferred") }),
    auditEvent: { create: vi.fn(async ({ data }) => { order.push("audit"); const persisted = { ...data, oldValue: null }; Object.assign(audit, persisted); return persisted }), findUnique: vi.fn(async () => audit) },
    operationalCommandAcceptance: { findUnique: vi.fn().mockResolvedValueOnce(existing).mockResolvedValue(acceptance), create: vi.fn(async ({ data }) => { order.push("acceptance"); Object.assign(acceptance, data); return data }) },
    stockEvidence: { create: create("stock-header"), findUnique: vi.fn(async () => ({ ...evidence, commandAcceptanceId: acceptance.id, auditEventId: acceptance.auditEventId })) }, stockEvidenceLine: { create: create("stock-line") },
    stockReservationEvidence: { create: create("reservation"), findUnique: vi.fn(async () => ({ ...reservation, commandAcceptanceId: acceptance.id, auditEventId: acceptance.auditEventId })) }, cajasDispatch: { create: create("dispatch"), findFirst: vi.fn(async () => ({ ...dispatch, commandAcceptanceId: acceptance.id })), findUnique: vi.fn(async () => ({ ...dispatch, commandAcceptanceId: acceptance.id })) },
    cajasDispatchLine: { create: create("dispatch-line") }, operationalCommandEffect: { create: create("effect"), findMany: vi.fn(async () => [
      ...effects.map(effect => ({ ...effect, commandAcceptanceId: acceptance.id })),
    ]) },
  }
  return { tx, order }
}

function expectNoReplayWrites(tx: ReturnType<typeof mockTx>["tx"]) {
  expect(tx.auditEvent.create).not.toHaveBeenCalled()
  expect(tx.operationalCommandAcceptance.create).not.toHaveBeenCalled()
  expect(tx.stockEvidence.create).not.toHaveBeenCalled()
  expect(tx.stockEvidenceLine.create).not.toHaveBeenCalled()
  expect(tx.stockReservationEvidence.create).not.toHaveBeenCalled()
  expect(tx.cajasDispatch.create).not.toHaveBeenCalled()
  expect(tx.cajasDispatchLine.create).not.toHaveBeenCalled()
  expect(tx.operationalCommandEffect.create).not.toHaveBeenCalled()
}

describe("WCB-06 CX08 CCT1 runtime", () => {
  it("accepts the real producer's exact mixed reservation representation", () => {
    const input = command() as ReturnType<typeof command> & Pick<Wcb06Command, "reservationEvidences" | "reservationEffects">
    input.reservationEvidences = [{ ...input.reservationEvidence }]
    input.reservationEffects = [{ ...input.reservationEffect }]

    expect(() => validate(input)).not.toThrow()
  })

  it("accepts distinct reservations for one command and rejects a duplicate reservation before DML", () => {
    const input = withTwoReservations()
    expect(() => validate(input)).not.toThrow()
    input.reservationEvidences![1].reservationId = input.reservationEvidences![0].reservationId
    expect(() => validate(input)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID", httpStatus: 422 }))
  })

  it("keeps the tenant-scoped reservation key as an atomic forward migration artifact", async () => {
    const fs = await import("node:fs/promises")
    const [schema, migration] = await Promise.all([
      fs.readFile("prisma/schema.prisma", "utf8"),
      fs.readFile("prisma/migrations/20260921020000_stock_reservation_evidence_command_reservation_unique/migration.sql", "utf8"),
    ])
    expect(schema).toContain('@@unique([companyId, commandAcceptanceId, reservationId], map: "uq_sre_command_reservation")')
    expect(migration).toContain("index_definition.indisunique")
    expect(migration).not.toContain("IF EXISTS")
    expect(migration.indexOf('CREATE UNIQUE INDEX "uq_sre_command_reservation"')).toBeLessThan(migration.indexOf('DROP INDEX "public"."uq_sre_command"'))
  })

  it("rejects closed input, spoofed fields, missing paired lineage, non-bijection, totals and trace mismatches before DML", () => {
    for (const mutate of [
      (x: ReturnType<typeof command>) => Object.assign(x.stockEvidenceHeader, { acceptedAt: now }),
      (x: ReturnType<typeof command>) => { x.dispatchLines[0].stockEvidenceLineId = "wrong" },
      (x: ReturnType<typeof command>) => { x.reservationEvidence.quantity = "3.0000" },
      (x: ReturnType<typeof command>) => { x.dispatchLines[0].traceabilitySnapshot = { schemaVersion: "C14-TRACE-SNAPSHOT-V1", mode: "LOT" } },
      (x: ReturnType<typeof command>) => { x.stockEvidenceLines[0].sourceLineId = "wrong-item" },
      (x: ReturnType<typeof command>) => { Reflect.deleteProperty(x.stockEvidenceLines[0], "sourceLineId") },
      (x: ReturnType<typeof command>) => { Reflect.deleteProperty(x.dispatchLines[0], "remitoItemId") },
      (x: ReturnType<typeof command>) => { x.stockEvidenceLines[0].sourceLineId = ""; x.dispatchLines[0].remitoItemId = "" },
      (x: ReturnType<typeof command>) => Object.assign(x, { unexpected: true }),
      (x: ReturnType<typeof command>) => { const input = x as typeof x & Pick<Wcb06Command, "reservationEvidences" | "reservationEffects">; input.reservationEvidences = [{ ...input.reservationEvidence }]; input.reservationEffects = [{ ...input.reservationEffect }]; input.reservationEffect.id = "wrong-effect" },
      (x: ReturnType<typeof command>) => { const input = x as typeof x & Pick<Wcb06Command, "reservationEvidences" | "reservationEffects">; input.reservationEvidences = [{ ...input.reservationEvidence, contentHash: undefined }]; input.reservationEffects = [{ ...input.reservationEffect }] },
    ]) {
      const input = command(); mutate(input)
      expect(() => validate(input)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID", httpStatus: 422, attemptCount: 0 }))
    }
  })

  it("uses supplied TransactionClient, frozen lock order, exact prefix and seven sections", async () => {
    const { tx, order } = mockTx()
    const result = await execute(tx as never, await approved(), attempt())
    expect(result.replayed).toBe(false)
    expect((tx.$queryRawUnsafe.mock.calls as unknown[][]).filter(call => String(call[0]).includes("FOR UPDATE NOWAIT")).map(call => call[2])).toEqual(["unit1", "position1", "reservation1", "assignment1"])
    expect(order).toEqual(["audit", "acceptance", "stock-header", "stock-line", "reservation", "dispatch", "dispatch-line", "effect", "effect", "deferred", "deferred"])
    expect((tx.$executeRawUnsafe.mock.calls as unknown[][]).map(([sql]) => sql)).toEqual([
      'SET CONSTRAINTS "ctrg_cajas_dispatch_min_line_on_dispatch", "ctrg_cajas_dispatch_min_line_on_line" IMMEDIATE',
      'SET CONSTRAINTS "ctrg_cajas_dispatch_min_line_on_dispatch", "ctrg_cajas_dispatch_min_line_on_line" DEFERRED',
    ])
    expect(tx.stockEvidence.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "co1", acceptedAt: now, acceptedById: "u1" }) })
    expect(tx.stockEvidenceLine.create.mock.calls[0][0].data).not.toHaveProperty("traceSnapshot")
    expect(tx.operationalCommandEffect.create).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ effectKey: "reservation-application", resultEntityId: "dispatch1", createdAt: now }) })
  })

  it("returns same-intent replay without writes and rejects changed intent as 409", async () => {
    const first = mockTx({ id: "accepted1", intentHash: "bad", resultEntityId: "dispatch1" })
    await expect(execute(first.tx as never, await approved(), attempt())).rejects.toMatchObject({ code: "C14_INSERT_CONFLICT", httpStatus: 409 })
    const probe = mockTx(); const replayInput = await approved(); await execute(probe.tx as never, replayInput, attempt())
    const intentHash = probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data.intentHash
    const persistedAcceptance = probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data
    const replay = mockTx(persistedAcceptance)
    replay.tx.auditEvent.findUnique.mockResolvedValue({ ...probe.tx.auditEvent.create.mock.calls[0][0].data, oldValue: null })
    const replayResult = await execute(replay.tx as never, replayInput, attempt())
    expect(replayResult).toMatchObject({ commandAcceptanceId: persistedAcceptance.id, replayed: true, dispatch: { id: replayInput.resultEntityId, commandAcceptanceId: persistedAcceptance.id, lines: [{ id: replayInput.dispatchLines[0].id, stockEvidenceLineId: replayInput.stockEvidenceLines[0].id }] } })
    expect(replay.tx.cajasDispatch.findUnique).toHaveBeenCalledWith({ where: { id: "dispatch1" }, include: { lines: true } })
    expectNoReplayWrites(replay.tx)

    const otherCompany = mockTx({ id: "accepted1", intentHash, resultEntityId: "dispatch1" })
    otherCompany.tx.cajasDispatch.findUnique.mockResolvedValueOnce(null as never)
    await expect(execute(otherCompany.tx as never, await approved(), attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })

    const otherAcceptance = mockTx({ id: "accepted1", intentHash, resultEntityId: "dispatch1" })
    otherAcceptance.tx.cajasDispatch.findUnique.mockResolvedValueOnce(null as never)
    await expect(execute(otherAcceptance.tx as never, await approved(), attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })
  })

  it("rejects same-intent replay with missing persisted stock evidence", async () => {
    const probe = mockTx(); const input = await approved()
    await execute(probe.tx as never, input, attempt())
    const replay = mockTx(probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data)
    replay.tx.auditEvent.findUnique.mockResolvedValue({ ...probe.tx.auditEvent.create.mock.calls[0][0].data, oldValue: null })
    replay.tx.stockEvidence.findUnique.mockResolvedValueOnce(null as never)

    await expect(execute(replay.tx as never, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })
    expectNoReplayWrites(replay.tx)
  })

  it("rejects missing or extra persisted replay records without writes", async () => {
    const probe = mockTx(); const input = await approved()
    await execute(probe.tx as never, input, attempt())
    const persistedAcceptance = probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data
    const persistedAudit = { ...probe.tx.auditEvent.create.mock.calls[0][0].data, oldValue: null }
    for (const mutate of [
      (tx: ReturnType<typeof mockTx>["tx"]) => tx.auditEvent.findUnique.mockResolvedValueOnce(null as never),
      (tx: ReturnType<typeof mockTx>["tx"]) => tx.operationalCommandAcceptance.findUnique.mockReset().mockResolvedValueOnce(persistedAcceptance).mockResolvedValueOnce(null),
      (tx: ReturnType<typeof mockTx>["tx"]) => tx.stockReservationEvidence.findUnique.mockResolvedValueOnce(null as never),
      (tx: ReturnType<typeof mockTx>["tx"]) => tx.cajasDispatch.findUnique.mockResolvedValueOnce(null as never),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.cajasDispatch.findUnique.mockResolvedValueOnce({ ...await tx.cajasDispatch.findUnique(), lines: [] }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => { const dispatch = await tx.cajasDispatch.findUnique(); tx.cajasDispatch.findUnique.mockResolvedValueOnce({ ...dispatch, lines: [...dispatch.lines, { ...dispatch.lines[0], id: "extra-dispatch-line", lineNumber: 2 }] }) },
    ]) {
      const replay = mockTx(persistedAcceptance)
      replay.tx.auditEvent.findUnique.mockResolvedValue(persistedAudit)
      await mutate(replay.tx)
      await expect(execute(replay.tx as never, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })
      expectNoReplayWrites(replay.tx)
    }
  })

  it("rejects extra persisted evidence and extra or invalid effects without writes", async () => {
    const probe = mockTx(); const input = await approved()
    await execute(probe.tx as never, input, attempt())
    const persistedAcceptance = probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data
    const persistedAudit = { ...probe.tx.auditEvent.create.mock.calls[0][0].data, oldValue: null }
    for (const mutate of [
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.stockEvidence.findUnique.mockResolvedValueOnce({ ...await tx.stockEvidence.findUnique(), lines: [...(await tx.stockEvidence.findUnique()).lines, { ...(await tx.stockEvidence.findUnique()).lines[0], id: "extra-stock-line", lineNumber: 2 }] } as never),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.operationalCommandEffect.findMany.mockResolvedValueOnce([...(await tx.operationalCommandEffect.findMany()), { ...(await tx.operationalCommandEffect.findMany())[0], id: "extra-effect", effectKey: "extra" }]),
      async (tx: ReturnType<typeof mockTx>["tx"]) => { const effects = await tx.operationalCommandEffect.findMany(); tx.operationalCommandEffect.findMany.mockResolvedValueOnce([{ ...effects[0], effectType: "INVALID" }, effects[1]]) },
    ]) {
      const replay = mockTx(persistedAcceptance)
      replay.tx.auditEvent.findUnique.mockResolvedValue(persistedAudit)
      await mutate(replay.tx)
      await expect(execute(replay.tx as never, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })
      expectNoReplayWrites(replay.tx)
    }
  })

  it("rejects replay binding mismatches without writes", async () => {
    const probe = mockTx(); const input = await approved()
    await execute(probe.tx as never, input, attempt())
    const persistedAcceptance = probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data
    const persistedAudit = { ...probe.tx.auditEvent.create.mock.calls[0][0].data, oldValue: null }
    for (const mutate of [
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.auditEvent.findUnique.mockResolvedValueOnce({ ...persistedAudit, newValue: { ...persistedAudit.newValue, commandAcceptanceId: "wrong" } }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.operationalCommandAcceptance.findUnique.mockReset().mockResolvedValueOnce(persistedAcceptance).mockResolvedValue({ ...persistedAcceptance, auditEventId: "wrong" }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.stockReservationEvidence.findUnique.mockResolvedValueOnce({ ...await tx.stockReservationEvidence.findUnique(), commandAcceptanceId: "wrong" }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.cajasDispatch.findUnique.mockResolvedValueOnce({ ...await tx.cajasDispatch.findUnique(), commandAcceptanceId: "wrong" }),
    ]) {
      const replay = mockTx(persistedAcceptance)
      replay.tx.auditEvent.findUnique.mockResolvedValue(persistedAudit)
      await mutate(replay.tx)
      await expect(execute(replay.tx as never, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })
      expectNoReplayWrites(replay.tx)
    }
  })

  it("rejects replay records with an altered persisted company without writes", async () => {
    const probe = mockTx(); const input = await approved()
    await execute(probe.tx as never, input, attempt())
    const persistedAcceptance = probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data
    const persistedAudit = { ...probe.tx.auditEvent.create.mock.calls[0][0].data, oldValue: null }
    for (const mutate of [
      (tx: ReturnType<typeof mockTx>["tx"]) => tx.operationalCommandAcceptance.findUnique.mockReset().mockResolvedValueOnce(persistedAcceptance).mockResolvedValue({ ...persistedAcceptance, companyId: "co2" }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.stockEvidence.findUnique.mockResolvedValueOnce({ ...await tx.stockEvidence.findUnique(), companyId: "co2" } as never),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.cajasDispatch.findUnique.mockResolvedValueOnce({ ...await tx.cajasDispatch.findUnique(), companyId: "co2" }),
    ]) {
      const replay = mockTx(persistedAcceptance)
      replay.tx.auditEvent.findUnique.mockResolvedValue(persistedAudit)
      await mutate(replay.tx)
      await expect(execute(replay.tx as never, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })
      expectNoReplayWrites(replay.tx)
    }
  })

  it("rejects replay IDs and cross-links tampered after acceptance without writes", async () => {
    const probe = mockTx(); const input = await approved()
    await execute(probe.tx as never, input, attempt())
    const persistedAcceptance = probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data
    const persistedAudit = { ...probe.tx.auditEvent.create.mock.calls[0][0].data, oldValue: null }
    for (const mutate of [
      (tx: ReturnType<typeof mockTx>["tx"]) => tx.auditEvent.findUnique.mockResolvedValueOnce({ ...persistedAudit, id: "wrong" }),
      (tx: ReturnType<typeof mockTx>["tx"]) => tx.operationalCommandAcceptance.findUnique.mockReset().mockResolvedValueOnce(persistedAcceptance).mockResolvedValue({ ...persistedAcceptance, auditEventId: "wrong" }),
      (tx: ReturnType<typeof mockTx>["tx"]) => tx.operationalCommandAcceptance.findUnique.mockReset().mockResolvedValueOnce(persistedAcceptance).mockResolvedValue({ ...persistedAcceptance, resultEntityId: "wrong" }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.stockEvidence.findUnique.mockResolvedValueOnce({ ...await tx.stockEvidence.findUnique(), id: "wrong", commandAcceptanceId: "wrong", auditEventId: "wrong" } as never),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.stockReservationEvidence.findUnique.mockResolvedValueOnce({ ...await tx.stockReservationEvidence.findUnique(), id: "wrong", commandAcceptanceId: "wrong", auditEventId: "wrong" }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.cajasDispatch.findUnique.mockResolvedValueOnce({ ...await tx.cajasDispatch.findUnique(), id: "wrong", commandAcceptanceId: "wrong", lines: [{ ...(await tx.cajasDispatch.findUnique()).lines[0], id: "wrong", dispatchId: "wrong", stockEvidenceLineId: "wrong" }] }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => { const effects = await tx.operationalCommandEffect.findMany(); tx.operationalCommandEffect.findMany.mockResolvedValueOnce([{ ...effects[0], id: "wrong", commandAcceptanceId: "wrong", stockEvidenceId: "wrong" }, { ...effects[1], stockReservationEvidenceId: "wrong" }]) },
    ]) {
      const replay = mockTx(persistedAcceptance)
      replay.tx.auditEvent.findUnique.mockResolvedValue(persistedAudit)
      await mutate(replay.tx)
      await expect(execute(replay.tx as never, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })
      expectNoReplayWrites(replay.tx)
    }
  })

  it("rejects altered replay evidence, effects, timestamps, counts, and line lineage without writes", async () => {
    const probe = mockTx(); const input = await approved()
    await execute(probe.tx as never, input, attempt())
    const persistedAcceptance = probe.tx.operationalCommandAcceptance.create.mock.calls[0][0].data
    const persistedAudit = { ...probe.tx.auditEvent.create.mock.calls[0][0].data, oldValue: null }
    for (const mutate of [
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.stockEvidence.findUnique.mockResolvedValueOnce({ ...await tx.stockEvidence.findUnique(), cause: "altered" } as never),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.operationalCommandEffect.findMany.mockResolvedValueOnce((await tx.operationalCommandEffect.findMany()).slice(0, 1)),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.cajasDispatch.findUnique.mockResolvedValueOnce({ ...await tx.cajasDispatch.findUnique(), acceptedAt: new Date("2026-08-13T12:00:01.000Z") }),
      async (tx: ReturnType<typeof mockTx>["tx"]) => tx.cajasDispatch.findUnique.mockResolvedValueOnce({ ...await tx.cajasDispatch.findUnique(), lines: [{ ...(await tx.cajasDispatch.findUnique()).lines[0], stockEvidenceLineId: "altered" }] }),
    ]) {
      const replay = mockTx(persistedAcceptance)
      replay.tx.auditEvent.findUnique.mockResolvedValue(persistedAudit)
      await mutate(replay.tx)
      await expect(execute(replay.tx as never, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_FINAL_STATE_INVALID", httpStatus: 422 })
      expectNoReplayWrites(replay.tx)
    }
  })

  it("throws final-state 422 after forced constraints so the owner transaction rolls everything back", async () => {
    const { tx, order } = mockTx(); tx.operationalCommandEffect.findMany.mockResolvedValueOnce([])
    await expect(execute(tx as never, await approved(), attempt())).rejects.toBeInstanceOf(C14RuntimeError)
    expect(order.slice(-2)).toEqual(["deferred", "deferred"])
    expect(tx.cajasDispatch.findUnique).toHaveBeenCalledOnce()
  })

  it("keeps the single-use capability private and rejects forged attempt identity", async () => {
    const runtimeSource = await import("node:fs/promises").then(fs => fs.readFile("src/lib/services/c14/bundles/wcb-06.ts", "utf8"))
    const privateSource = await import("node:fs/promises").then(fs => fs.readFile("src/lib/services/c14/bundles/private-writer-runtime.ts", "utf8"))
    expect(runtimeSource).toContain("new WeakMap<object, CapabilityBinding>()")
    expect(runtimeSource).not.toMatch(/export\s+(?:const|function)\s+(?:mintCapability|consumeCapability)/)
    expect(privateSource).not.toContain("wcb06Runtime")
    expect(runtimeSource).toMatch(/capabilities\.delete\(capability\)[\s\S]*binding\.tx !== tx[\s\S]*binding\.attempt !== attempt/)
    expect(runtimeSource).toMatch(/binding\.payload !== command\.completePayloadSha256[\s\S]*binding\.semanticKey !== attempt\.semanticKeySha256/)
    expect(runtimeSource).toMatch(/binding\.authorizationProof !== command\.authorizationProof[\s\S]*binding\.anchorProof !== sha\("C14-WCB06-FROZEN-ANCHORS-V1", frozen\)/)
    await expect(execute(mockTx().tx as never, await approved(), { attemptId: "", semanticKeySha256: "forged" })).rejects.toMatchObject({ code: "C14_COMPANY_DENIED" })
  })
})
